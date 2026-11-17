-- ============================================================================
-- AcolheMulher — Banco Completo em MySQL 8.0+ (UTF-8 utf8mb4)
-- Arquitetura: Normalizacao Estrita 1FN/2FN/3FN + Star Schema + Voz Relacional
-- Regra Absoluta: ZERO acentos e ZERO caracteres especiais em todo o banco
-- Seguranca: Isolamento por Linha (Views DEFINER + Triggers + Procedures + Roles)
-- ============================================================================
-- Regras aplicadas neste script:
-- 1. UTF-8 integral (utf8mb4 / utf8mb4_unicode_ci) em banco, tabelas e colunas.
-- 2. ZERO acentos E ZERO caracteres especiais em todas as tabelas e colunas
--    descritivas/chaves (somente A-Z, a-z, 0-9 e espaco; URLs ASCII validas em website).
-- 3. 100% Normalizado (zero arrays/JSON denormalizados — listas viram tabelas 1FN/N:N).
-- 4. Star Schema completo:
--    - Fatos: fact_search_demand, fact_voice_searches, fact_voice_search_keywords
--    - Dimensoes: dim_dates, dim_categories, dim_subcategories, dim_regions,
--                 dim_access_channels, dim_access_modes, dim_organizations,
--                 dim_ngo_areas, dim_voice_intents, dim_voice_keywords, dim_tags
-- 5. Voz -> Relacional: sp_record_voice_search_relational limpa digitos de CEP,
--    remove acentos e simbolos, extrai intencao e palavras-chave nas dimensoes.
-- 6. Seguranca equivalente ao RLS do PostgreSQL para MySQL 8.0+:
--    - Constraints CHECK ASCII estritas em TODAS as tabelas
--    - Triggers BEFORE INSERT/UPDATE sanitizando automaticamente qualquer entrada
--    - Views SQL SECURITY DEFINER para leitura publica + Procedures DEFINER
-- ============================================================================

CREATE DATABASE IF NOT EXISTS acolhemulher
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE acolhemulher;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ----------------------------------------------------------------------------
-- 0. Funcoes Utilitarias UTF-8 Estritas (Zero Acentos e Zero Especiais)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_strip_accents_utf8mb4;
DROP FUNCTION IF EXISTS fn_sanitize_ascii_text;
DROP FUNCTION IF EXISTS fn_normalize_key_ascii;
DROP FUNCTION IF EXISTS fn_sanitize_digits_space;
DROP FUNCTION IF EXISTS fn_sanitize_ascii_url;
DROP FUNCTION IF EXISTS fn_normalize_ngo_domain;

DELIMITER $$

CREATE FUNCTION fn_strip_accents_utf8mb4(p_text TEXT)
RETURNS TEXT
DETERMINISTIC
NO SQL
BEGIN
  DECLARE v TEXT;
  SET v = TRIM(COALESCE(p_text, ''));

  -- Maiusculas acentuadas -> ASCII puro
  SET v = REPLACE(v, 'Á', 'A'); SET v = REPLACE(v, 'À', 'A'); SET v = REPLACE(v, 'Â', 'A'); SET v = REPLACE(v, 'Ã', 'A'); SET v = REPLACE(v, 'Ä', 'A'); SET v = REPLACE(v, 'Å', 'A');
  SET v = REPLACE(v, 'É', 'E'); SET v = REPLACE(v, 'È', 'E'); SET v = REPLACE(v, 'Ê', 'E'); SET v = REPLACE(v, 'Ë', 'E');
  SET v = REPLACE(v, 'Í', 'I'); SET v = REPLACE(v, 'Ì', 'I'); SET v = REPLACE(v, 'Î', 'I'); SET v = REPLACE(v, 'Ï', 'I');
  SET v = REPLACE(v, 'Ó', 'O'); SET v = REPLACE(v, 'Ò', 'O'); SET v = REPLACE(v, 'Ô', 'O'); SET v = REPLACE(v, 'Õ', 'O'); SET v = REPLACE(v, 'Ö', 'O'); SET v = REPLACE(v, 'Ø', 'O');
  SET v = REPLACE(v, 'Ú', 'U'); SET v = REPLACE(v, 'Ù', 'U'); SET v = REPLACE(v, 'Û', 'U'); SET v = REPLACE(v, 'Ü', 'U');
  SET v = REPLACE(v, 'Ç', 'C'); SET v = REPLACE(v, 'Ñ', 'N'); SET v = REPLACE(v, 'Ý', 'Y');

  -- Minusculas acentuadas -> ASCII puro
  SET v = REPLACE(v, 'á', 'a'); SET v = REPLACE(v, 'à', 'a'); SET v = REPLACE(v, 'â', 'a'); SET v = REPLACE(v, 'ã', 'a'); SET v = REPLACE(v, 'ä', 'a'); SET v = REPLACE(v, 'å', 'a');
  SET v = REPLACE(v, 'é', 'e'); SET v = REPLACE(v, 'è', 'e'); SET v = REPLACE(v, 'ê', 'e'); SET v = REPLACE(v, 'ë', 'e');
  SET v = REPLACE(v, 'í', 'i'); SET v = REPLACE(v, 'ì', 'i'); SET v = REPLACE(v, 'î', 'i'); SET v = REPLACE(v, 'ï', 'i');
  SET v = REPLACE(v, 'ó', 'o'); SET v = REPLACE(v, 'ò', 'o'); SET v = REPLACE(v, 'ô', 'o'); SET v = REPLACE(v, 'õ', 'o'); SET v = REPLACE(v, 'ö', 'o'); SET v = REPLACE(v, 'ø', 'o');
  SET v = REPLACE(v, 'ú', 'u'); SET v = REPLACE(v, 'ù', 'u'); SET v = REPLACE(v, 'û', 'u'); SET v = REPLACE(v, 'ü', 'u');
  SET v = REPLACE(v, 'ç', 'c'); SET v = REPLACE(v, 'ñ', 'n');
  SET v = REPLACE(v, 'ý', 'y'); SET v = REPLACE(v, 'ÿ', 'y');
  SET v = REPLACE(v, 'ª', 'a'); SET v = REPLACE(v, 'º', 'o');

  RETURN v;
END$$

CREATE FUNCTION fn_sanitize_ascii_text(p_text TEXT)
RETURNS TEXT
DETERMINISTIC
NO SQL
BEGIN
  DECLARE v TEXT;
  SET v = fn_strip_accents_utf8mb4(p_text);
  SET v = REGEXP_REPLACE(v, '[^A-Za-z0-9 ]+', ' ');
  SET v = REGEXP_REPLACE(TRIM(v), '\\s+', ' ');
  RETURN v;
END$$

CREATE FUNCTION fn_normalize_key_ascii(p_text TEXT)
RETURNS VARCHAR(255)
DETERMINISTIC
NO SQL
BEGIN
  DECLARE v TEXT;
  SET v = fn_strip_accents_utf8mb4(p_text);
  SET v = REGEXP_REPLACE(v, '\\([^)]*\\)', ' ');
  SET v = LOWER(REGEXP_REPLACE(v, '[^A-Za-z0-9 ]+', ' '));
  SET v = REGEXP_REPLACE(TRIM(v), '\\s+', ' ');
  RETURN LEFT(v, 255);
END$$

CREATE FUNCTION fn_sanitize_digits_space(p_text TEXT)
RETURNS VARCHAR(40)
DETERMINISTIC
NO SQL
BEGIN
  DECLARE v VARCHAR(80);
  SET v = REGEXP_REPLACE(COALESCE(p_text, ''), '[^0-9 ]+', ' ');
  SET v = REGEXP_REPLACE(TRIM(v), '\\s+', ' ');
  IF v = '' THEN
    RETURN NULL;
  END IF;
  RETURN LEFT(v, 40);
END$$

CREATE FUNCTION fn_sanitize_ascii_url(p_url VARCHAR(500), p_fallback VARCHAR(300))
RETURNS VARCHAR(300)
DETERMINISTIC
NO SQL
BEGIN
  DECLARE v VARCHAR(500);
  SET v = fn_strip_accents_utf8mb4(p_url);
  SET v = REGEXP_REPLACE(v, '[^A-Za-z0-9._:/?=&-]+', '');
  IF v REGEXP '^https?://[A-Za-z0-9._-]+([:/?=&A-Za-z0-9._-]*)$' THEN
    RETURN LEFT(v, 300);
  END IF;
  RETURN p_fallback;
END$$

CREATE FUNCTION fn_normalize_ngo_domain(p_url VARCHAR(500))
RETURNS VARCHAR(255)
DETERMINISTIC
NO SQL
BEGIN
  DECLARE v VARCHAR(500);
  SET v = LOWER(TRIM(fn_strip_accents_utf8mb4(COALESCE(p_url, ''))));
  IF v = '' OR v = 'nao informado' THEN
    RETURN NULL;
  END IF;

  SET v = REGEXP_REPLACE(v, '^https?://', '');
  SET v = REGEXP_REPLACE(v, '^www\\.', '');
  SET v = SUBSTRING_INDEX(v, '/', 1);
  SET v = SUBSTRING_INDEX(v, '?', 1);
  SET v = SUBSTRING_INDEX(v, '#', 1);
  SET v = SUBSTRING_INDEX(v, ':', 1);
  SET v = REGEXP_REPLACE(TRIM(v), '[^a-z0-9.-]+', '');

  IF v = '' OR INSTR(v, '.') = 0 THEN
    RETURN NULL;
  END IF;

  RETURN LEFT(v, 255);
END$$

DELIMITER ;

-- ----------------------------------------------------------------------------
-- 1. DIMENSOES DO STAR SCHEMA (100% Sem Acentos e Sem Caracteres Especiais)
-- ----------------------------------------------------------------------------

-- 1.1 Dimensao Temporal (dim_dates)
CREATE TABLE IF NOT EXISTS dim_dates (
  date_sk INT PRIMARY KEY,
  full_date DATE NOT NULL UNIQUE,
  year_num SMALLINT NOT NULL,
  quarter_num TINYINT NOT NULL,
  month_num TINYINT NOT NULL,
  month_key_ascii VARCHAR(16) NOT NULL,
  day_of_month TINYINT NOT NULL,
  day_of_week TINYINT NOT NULL,
  is_weekend TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT chk_dim_dates_quarter CHECK (quarter_num BETWEEN 1 AND 4),
  CONSTRAINT chk_dim_dates_month CHECK (month_num BETWEEN 1 AND 12),
  CONSTRAINT chk_dim_dates_day CHECK (day_of_month BETWEEN 1 AND 31),
  CONSTRAINT chk_dim_dates_dow CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT chk_dim_dates_mkey_ascii CHECK (month_key_ascii COLLATE utf8mb4_bin REGEXP '^[a-z]+$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.2 Dimensao Categorias / Assuntos (dim_categories)
CREATE TABLE IF NOT EXISTS dim_categories (
  category_sk SMALLINT AUTO_INCREMENT PRIMARY KEY,
  category_key VARCHAR(32) NOT NULL UNIQUE,
  label_utf8 VARCHAR(120) NOT NULL,
  label_normalized VARCHAR(120) NOT NULL,
  description_utf8 VARCHAR(300) NOT NULL,
  priority_order SMALLINT NOT NULL DEFAULT 10,
  is_emergency TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT chk_dim_categories_key CHECK (
    category_key IN (
      'emergencia', 'psicologico', 'juridico', 'saude',
      'cursos', 'ongs_apoio', 'social', 'geral'
    )
  ),
  CONSTRAINT chk_dim_categories_label_ascii CHECK (label_utf8 COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$'),
  CONSTRAINT chk_dim_categories_norm_ascii CHECK (label_normalized COLLATE utf8mb4_bin REGEXP '^[a-z0-9 ]+$'),
  CONSTRAINT chk_dim_categories_desc_ascii CHECK (description_utf8 COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO dim_categories (category_key, label_utf8, label_normalized, description_utf8, priority_order, is_emergency)
VALUES
  ('emergencia', 'Protecao 24h e Emergencia', 'protecao 24h e emergencia', 'Delegacias da Mulher Casa da Mulher Brasileira abrigos 180 e 190', 1, 1),
  ('psicologico', 'Apoio Psicologico', 'apoio psicologico', 'Escuta acolhedora clinicas escola e atendimento sigiloso gratuito', 2, 0),
  ('juridico', 'Advogada Gratuita e Direitos', 'advogada gratuita e direitos', 'Defensoria Publica medidas protetivas guarda pensao e divorcio', 3, 0),
  ('saude', 'Saude Exames e Parto Humanizado', 'saude exames e parto humanizado', 'Casas de parto humanizado ONGs de exames gratuitos e SUS', 4, 0),
  ('cursos', 'Cursos Gratuitos e Renda', 'cursos gratuitos e renda', 'Capacitacao profissional gratuita tecnologia e geracao de renda', 5, 0),
  ('ongs_apoio', 'ONGs que Ajudam', 'ongs que ajudam', 'Coletivos e projetos sociais liderados por voluntarias e especialistas', 6, 0),
  ('social', 'Assistencia Social e Acolhimento', 'assistencia social e acolhimento', 'CRAS CREAS e redes de assistencia social gratuitas', 7, 0),
  ('geral', 'Busca Geral por Regiao', 'busca geral por regiao', 'Exploracao geral de servicos proximos em ate 30 km', 8, 0)
ON DUPLICATE KEY UPDATE
  label_utf8 = VALUES(label_utf8),
  label_normalized = VALUES(label_normalized),
  description_utf8 = VALUES(description_utf8),
  priority_order = VALUES(priority_order),
  is_emergency = VALUES(is_emergency);

-- 1.3 Dimensao Subcategorias de Servico (dim_subcategories)
CREATE TABLE IF NOT EXISTS dim_subcategories (
  subcategory_sk INT AUTO_INCREMENT PRIMARY KEY,
  subcategory_normalized VARCHAR(160) NOT NULL UNIQUE,
  subcategory_label VARCHAR(160) NOT NULL,
  CONSTRAINT chk_dim_subcat_norm_ascii CHECK (subcategory_normalized COLLATE utf8mb4_bin REGEXP '^[a-z0-9 ]+$'),
  CONSTRAINT chk_dim_subcat_label_ascii CHECK (subcategory_label COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.4 Dimensao Modos de Acesso (dim_access_modes)
CREATE TABLE IF NOT EXISTS dim_access_modes (
  access_mode_sk TINYINT AUTO_INCREMENT PRIMARY KEY,
  access_mode_key VARCHAR(40) NOT NULL UNIQUE,
  access_mode_label VARCHAR(80) NOT NULL,
  CONSTRAINT chk_dim_am_key_ascii CHECK (access_mode_key COLLATE utf8mb4_bin REGEXP '^[a-z0-9_]+$'),
  CONSTRAINT chk_dim_am_label_ascii CHECK (access_mode_label COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO dim_access_modes (access_mode_key, access_mode_label)
VALUES
  ('livre_demanda', 'Livre Demanda Porta Aberta'),
  ('agendamento_previo', 'Agendamento Previo'),
  ('online_imediato', 'Online Imediato'),
  ('plantao_24h', 'Plantao 24h')
ON DUPLICATE KEY UPDATE
  access_mode_label = VALUES(access_mode_label);

-- 1.5 Dimensao Canais de Acesso / Origem da Busca (dim_access_channels)
CREATE TABLE IF NOT EXISTS dim_access_channels (
  channel_sk TINYINT AUTO_INCREMENT PRIMARY KEY,
  channel_key VARCHAR(32) NOT NULL UNIQUE,
  channel_label VARCHAR(80) NOT NULL,
  CONSTRAINT chk_dim_access_channels_key CHECK (
    channel_key IN (
      'web_cep', 'web_voice', 'triage_agent', 'category_card',
      'category_filter', 'ongs_directory', 'pwa_offline', 'widget_ngo'
    )
  ),
  CONSTRAINT chk_dim_access_channels_label_ascii CHECK (channel_label COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO dim_access_channels (channel_key, channel_label)
VALUES
  ('web_cep', 'Busca por CEP ou Cidade'),
  ('web_voice', 'Busca por Voz'),
  ('triage_agent', 'Agente de Acolhimento'),
  ('category_card', 'Card de Categoria ou Menu'),
  ('category_filter', 'Subfiltro na Categoria'),
  ('ongs_directory', 'Diretorio de ONGs'),
  ('pwa_offline', 'Aplicativo PWA Offline'),
  ('widget_ngo', 'Widget em Site Parceiro')
ON DUPLICATE KEY UPDATE
  channel_label = VALUES(channel_label);

-- 1.6 Dimensao Geografica Normalizada (dim_regions — Zero-PII: nunca guarda CEP)
CREATE TABLE IF NOT EXISTS dim_regions (
  region_sk BIGINT AUTO_INCREMENT PRIMARY KEY,
  state_code CHAR(2) NOT NULL,
  state_name_normalized VARCHAR(60) NOT NULL,
  macro_region VARCHAR(30) NOT NULL,
  city_name VARCHAR(100) NOT NULL,
  city_normalized VARCHAR(100) NOT NULL,
  CONSTRAINT uq_dim_regions_state_city UNIQUE (state_code, city_normalized),
  CONSTRAINT chk_dim_regions_state CHECK (state_code COLLATE utf8mb4_bin REGEXP '^[A-Z]{2}$'),
  CONSTRAINT chk_dim_regions_sname_ascii CHECK (state_name_normalized COLLATE utf8mb4_bin REGEXP '^[a-z ]+$'),
  CONSTRAINT chk_dim_regions_macro CHECK (
    macro_region IN ('Norte', 'Nordeste', 'Centro Oeste', 'Sudeste', 'Sul', 'Nacional')
  ),
  CONSTRAINT chk_dim_regions_cname_ascii CHECK (city_name COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$'),
  CONSTRAINT chk_dim_regions_cnorm_ascii CHECK (city_normalized COLLATE utf8mb4_bin REGEXP '^[a-z0-9 ]+$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_dim_regions_state_city ON dim_regions (state_code, city_normalized);

-- 1.7 Dimensao Organizacoes Mantenedoras de ONGs (dim_organizations — 3FN)
CREATE TABLE IF NOT EXISTS dim_organizations (
  organization_sk INT AUTO_INCREMENT PRIMARY KEY,
  organization_normalized VARCHAR(180) NOT NULL UNIQUE,
  organization_name VARCHAR(180) NOT NULL,
  CONSTRAINT chk_dim_orgs_norm_ascii CHECK (organization_normalized COLLATE utf8mb4_bin REGEXP '^[a-z0-9 ]+$'),
  CONSTRAINT chk_dim_orgs_name_ascii CHECK (organization_name COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.8 Dimensao Areas de Atuacao de ONGs (dim_ngo_areas — 3FN)
CREATE TABLE IF NOT EXISTS dim_ngo_areas (
  ngo_area_sk TINYINT AUTO_INCREMENT PRIMARY KEY,
  area_key VARCHAR(32) NOT NULL UNIQUE,
  area_label VARCHAR(80) NOT NULL,
  area_normalized VARCHAR(80) NOT NULL,
  CONSTRAINT chk_dim_ngo_areas_key CHECK (
    area_key IN ('saude_parto', 'psicologico_juridico', 'acolhimento_protecao', 'cursos_renda')
  ),
  CONSTRAINT chk_dim_ngo_areas_label_ascii CHECK (area_label COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$'),
  CONSTRAINT chk_dim_ngo_areas_norm_ascii CHECK (area_normalized COLLATE utf8mb4_bin REGEXP '^[a-z0-9 ]+$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO dim_ngo_areas (area_key, area_label, area_normalized)
VALUES
  ('psicologico_juridico', 'Psicologia e Juridico', 'psicologia e juridico'),
  ('acolhimento_protecao', 'Acolhimento e Protecao', 'acolhimento e protecao'),
  ('saude_parto', 'Saude Parto e Exames', 'saude parto e exames'),
  ('cursos_renda', 'Cursos e Renda', 'cursos e renda')
ON DUPLICATE KEY UPDATE
  area_label = VALUES(area_label),
  area_normalized = VALUES(area_normalized);

-- 1.9 Dimensao Intencoes de Busca por Voz (dim_voice_intents — Voz -> Relacional)
CREATE TABLE IF NOT EXISTS dim_voice_intents (
  intent_sk SMALLINT AUTO_INCREMENT PRIMARY KEY,
  intent_key VARCHAR(40) NOT NULL UNIQUE,
  intent_label_normalized VARCHAR(100) NOT NULL,
  category_sk SMALLINT NOT NULL,
  CONSTRAINT chk_dvi_key_ascii CHECK (intent_key COLLATE utf8mb4_bin REGEXP '^[a-z0-9_]+$'),
  CONSTRAINT chk_dvi_label_ascii CHECK (intent_label_normalized COLLATE utf8mb4_bin REGEXP '^[a-z0-9 ]+$'),
  CONSTRAINT fk_voice_intent_category FOREIGN KEY (category_sk) REFERENCES dim_categories(category_sk)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO dim_voice_intents (intent_key, intent_label_normalized, category_sk)
SELECT v.intent_key, v.intent_label, c.category_sk
FROM (
  SELECT 'emergencia_protecao' AS intent_key, 'pedido de protecao urgente ou delegacia' AS intent_label, 'emergencia' AS cat_key
  UNION ALL SELECT 'apoio_psicologico', 'pedido de escuta ou psicologa gratuita', 'psicologico'
  UNION ALL SELECT 'orientacao_juridica', 'pedido de advogada gratuita ou medida protetiva', 'juridico'
  UNION ALL SELECT 'saude_exames_parto', 'pedido de ubs hospital parto ou exames gratuitos', 'saude'
  UNION ALL SELECT 'cursos_autonomia', 'pedido de cursos gratuitos ou geracao de renda', 'cursos'
  UNION ALL SELECT 'busca_ongs_mulheres', 'busca por ongs voltadas para mulheres', 'ongs_apoio'
  UNION ALL SELECT 'busca_local_voz', 'busca por cep ou cidade falada por voz', 'geral'
) v
JOIN dim_categories c ON c.category_key = v.cat_key
ON DUPLICATE KEY UPDATE
  intent_label_normalized = VALUES(intent_label_normalized),
  category_sk = VALUES(category_sk);

-- 1.10 Dimensao Palavras-Chave Relacionais de Voz (dim_voice_keywords — 1FN, sem acento)
CREATE TABLE IF NOT EXISTS dim_voice_keywords (
  keyword_sk INT AUTO_INCREMENT PRIMARY KEY,
  keyword_normalized VARCHAR(64) NOT NULL UNIQUE,
  CONSTRAINT chk_dvk_ascii CHECK (keyword_normalized COLLATE utf8mb4_bin REGEXP '^[a-z0-9 ]+$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.11 Dimensao Tags Normalizadas (dim_tags — 1FN, zero acento e zero simbolo)
CREATE TABLE IF NOT EXISTS dim_tags (
  tag_id INT AUTO_INCREMENT PRIMARY KEY,
  tag_slug VARCHAR(80) NOT NULL UNIQUE,
  tag_label VARCHAR(80) NOT NULL,
  CONSTRAINT chk_dim_tags_slug_ascii CHECK (tag_slug COLLATE utf8mb4_bin REGEXP '^[a-z0-9 ]+$'),
  CONSTRAINT chk_dim_tags_label_ascii CHECK (tag_label COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. TABELAS OPERACIONAIS NORMALIZADAS (3FN + Constraints ASCII Estritas)
-- ----------------------------------------------------------------------------

-- 2.1 Perfis de Parceiras e Admins
CREATE TABLE IF NOT EXISTS partner_profiles (
  id CHAR(36) PRIMARY KEY,
  organization_name VARCHAR(180) NOT NULL,
  role ENUM('admin', 'verified_ngo') NOT NULL DEFAULT 'verified_ngo',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_partner_org_ascii CHECK (organization_name COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.2 Servicos Publicos e Sociais Gratuitos (100% 3FN, FKs para Dimensoes)
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  name_normalized VARCHAR(200) NOT NULL UNIQUE,
  category_sk SMALLINT NOT NULL,
  subcategory_sk INT NOT NULL,
  region_sk BIGINT NOT NULL,
  access_mode_sk TINYINT NOT NULL,
  description VARCHAR(1000) NOT NULL,
  is_national_online TINYINT(1) NOT NULL DEFAULT 0,
  neighborhood VARCHAR(120) NULL,
  address VARCHAR(280) NULL,
  cep VARCHAR(8) NULL,
  lat DOUBLE NULL,
  lng DOUBLE NULL,
  phone VARCHAR(40) NULL,
  whatsapp VARCHAR(40) NULL,
  website VARCHAR(300) NULL,
  hours VARCHAR(180) NOT NULL,
  requires_registration TINYINT(1) NOT NULL DEFAULT 0,
  free_confirmation VARCHAR(300) NOT NULL,
  tips_for_woman VARCHAR(400) NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  owner_id CHAR(36) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_services_id_ascii CHECK (id COLLATE utf8mb4_bin REGEXP '^[a-z0-9_-]+$'),
  CONSTRAINT chk_services_name_ascii CHECK (name COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$'),
  CONSTRAINT chk_services_namenorm_ascii CHECK (name_normalized COLLATE utf8mb4_bin REGEXP '^[a-z0-9 ]+$'),
  CONSTRAINT chk_services_desc_ascii CHECK (description COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$'),
  CONSTRAINT chk_services_neigh_ascii CHECK (neighborhood IS NULL OR neighborhood COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$'),
  CONSTRAINT chk_services_addr_ascii CHECK (address IS NULL OR address COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$'),
  CONSTRAINT chk_services_cep_digits CHECK (cep IS NULL OR cep COLLATE utf8mb4_bin REGEXP '^[0-9]{8}$'),
  CONSTRAINT chk_services_phone_digits CHECK (phone IS NULL OR phone COLLATE utf8mb4_bin REGEXP '^[0-9 ]+$'),
  CONSTRAINT chk_services_wa_digits CHECK (whatsapp IS NULL OR whatsapp COLLATE utf8mb4_bin REGEXP '^[0-9]+$'),
  CONSTRAINT chk_services_web_ascii CHECK (website IS NULL OR website COLLATE utf8mb4_bin REGEXP '^https?://[A-Za-z0-9._:/?=&-]+$'),
  CONSTRAINT chk_services_hours_ascii CHECK (hours COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$'),
  CONSTRAINT chk_services_free_ascii CHECK (free_confirmation COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$'),
  CONSTRAINT chk_services_tips_ascii CHECK (tips_for_woman IS NULL OR tips_for_woman COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$'),
  CONSTRAINT fk_services_category FOREIGN KEY (category_sk) REFERENCES dim_categories(category_sk),
  CONSTRAINT fk_services_subcategory FOREIGN KEY (subcategory_sk) REFERENCES dim_subcategories(subcategory_sk),
  CONSTRAINT fk_services_region FOREIGN KEY (region_sk) REFERENCES dim_regions(region_sk),
  CONSTRAINT fk_services_access_mode FOREIGN KEY (access_mode_sk) REFERENCES dim_access_modes(access_mode_sk),
  CONSTRAINT fk_services_owner FOREIGN KEY (owner_id) REFERENCES partner_profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_services_region_cat ON services (region_sk, category_sk, is_active, is_verified, requires_registration);
CREATE INDEX idx_services_geo ON services (lat, lng);

-- 2.3 Tabela Associativa N:N service_tags (1FN)
CREATE TABLE IF NOT EXISTS service_tags (
  service_id VARCHAR(100) NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (service_id, tag_id),
  CONSTRAINT fk_st_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  CONSTRAINT fk_st_tag FOREIGN KEY (tag_id) REFERENCES dim_tags(tag_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.4 ONGs Voltadas para Mulheres (100% 3FN + Anti-Duplicidade + ASCII Estrito)
CREATE TABLE IF NOT EXISTS ngos (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  name_normalized VARCHAR(180) NOT NULL,
  organization_sk INT NOT NULL,
  ngo_area_sk TINYINT NOT NULL,
  region_sk BIGINT NOT NULL,
  coverage VARCHAR(160) NOT NULL,
  summary VARCHAR(800) NOT NULL,
  access_channel VARCHAR(200) NOT NULL,
  website_url VARCHAR(300) NOT NULL,
  website_domain_normalized VARCHAR(255) NULL,
  privacy_note VARCHAR(300) NOT NULL DEFAULT 'Atendimento gratuito sem exposicao publica de dados',
  featured TINYINT(1) NOT NULL DEFAULT 0,
  source_type ENUM('curated', 'partner_form', 'osm_discovery') NOT NULL DEFAULT 'curated',
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  owner_id CHAR(36) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_ngos_id_ascii CHECK (id COLLATE utf8mb4_bin REGEXP '^[a-z0-9_-]+$'),
  CONSTRAINT chk_ngos_name_ascii CHECK (name COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$'),
  CONSTRAINT chk_ngos_namenorm_ascii CHECK (name_normalized COLLATE utf8mb4_bin REGEXP '^[a-z0-9 ]+$'),
  CONSTRAINT chk_ngos_cov_ascii CHECK (coverage COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$'),
  CONSTRAINT chk_ngos_sum_ascii CHECK (summary COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$'),
  CONSTRAINT chk_ngos_ch_ascii CHECK (access_channel COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$'),
  CONSTRAINT chk_ngos_web_ascii CHECK (website_url = 'nao informado' OR website_url COLLATE utf8mb4_bin REGEXP '^https?://[A-Za-z0-9._:/?=&-]+$'),
  CONSTRAINT chk_ngos_dom_ascii CHECK (website_domain_normalized IS NULL OR website_domain_normalized COLLATE utf8mb4_bin REGEXP '^[a-z0-9.-]+$'),
  CONSTRAINT chk_ngos_priv_ascii CHECK (privacy_note COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$'),
  CONSTRAINT fk_ngos_org FOREIGN KEY (organization_sk) REFERENCES dim_organizations(organization_sk),
  CONSTRAINT fk_ngos_area FOREIGN KEY (ngo_area_sk) REFERENCES dim_ngo_areas(ngo_area_sk),
  CONSTRAINT fk_ngos_region FOREIGN KEY (region_sk) REFERENCES dim_regions(region_sk),
  CONSTRAINT fk_ngos_owner FOREIGN KEY (owner_id) REFERENCES partner_profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_ngos_name_normalized UNIQUE (name_normalized),
  CONSTRAINT uq_ngos_domain_region UNIQUE (website_domain_normalized, region_sk)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.5 Itens de Ajuda da ONG em 1FN (ngo_help_items)
CREATE TABLE IF NOT EXISTS ngo_help_items (
  ngo_id VARCHAR(100) NOT NULL,
  item_order TINYINT NOT NULL,
  help_description VARCHAR(240) NOT NULL,
  help_normalized VARCHAR(240) NOT NULL,
  PRIMARY KEY (ngo_id, item_order),
  CONSTRAINT chk_nhi_desc_ascii CHECK (help_description COLLATE utf8mb4_bin REGEXP '^[A-Za-z0-9 ]+$'),
  CONSTRAINT chk_nhi_norm_ascii CHECK (help_normalized COLLATE utf8mb4_bin REGEXP '^[a-z0-9 ]+$'),
  CONSTRAINT fk_nhi_ngo FOREIGN KEY (ngo_id) REFERENCES ngos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.6 Relacionamento N:N ONGs x Categorias (ngo_categories)
CREATE TABLE IF NOT EXISTS ngo_categories (
  ngo_id VARCHAR(100) NOT NULL,
  category_sk SMALLINT NOT NULL,
  PRIMARY KEY (ngo_id, category_sk),
  CONSTRAINT fk_nc_ngo FOREIGN KEY (ngo_id) REFERENCES ngos(id) ON DELETE CASCADE,
  CONSTRAINT fk_nc_cat FOREIGN KEY (category_sk) REFERENCES dim_categories(category_sk) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. TABELAS FATO DO STAR SCHEMA (Buscas Gerais + Pesquisas de Voz Relacionais)
-- ----------------------------------------------------------------------------

-- 3.1 Fato Central de Demanda por Buscas
CREATE TABLE IF NOT EXISTS fact_search_demand (
  fact_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  date_sk INT NOT NULL,
  category_sk SMALLINT NOT NULL,
  region_sk BIGINT NOT NULL,
  channel_sk TINYINT NOT NULL,
  search_count INT NOT NULL DEFAULT 1,
  CONSTRAINT uq_fact_search_grain UNIQUE (date_sk, category_sk, region_sk, channel_sk),
  CONSTRAINT chk_fact_search_count CHECK (search_count > 0),
  CONSTRAINT fk_fsd_date FOREIGN KEY (date_sk) REFERENCES dim_dates(date_sk),
  CONSTRAINT fk_fsd_cat FOREIGN KEY (category_sk) REFERENCES dim_categories(category_sk),
  CONSTRAINT fk_fsd_reg FOREIGN KEY (region_sk) REFERENCES dim_regions(region_sk),
  CONSTRAINT fk_fsd_ch FOREIGN KEY (channel_sk) REFERENCES dim_access_channels(channel_sk)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_fsd_date_count ON fact_search_demand (date_sk DESC, search_count DESC);
CREATE INDEX idx_fsd_region_cat ON fact_search_demand (region_sk, category_sk);

-- 3.2 Fato de Pesquisas por Voz Transformadas em Dados Relacionais (Zero-PII)
CREATE TABLE IF NOT EXISTS fact_voice_searches (
  voice_fact_sk BIGINT AUTO_INCREMENT PRIMARY KEY,
  date_sk INT NOT NULL,
  intent_sk SMALLINT NOT NULL,
  category_sk SMALLINT NOT NULL,
  region_sk BIGINT NOT NULL,
  channel_sk TINYINT NOT NULL,
  utterance_normalized VARCHAR(160) NOT NULL,
  had_cep_spoken TINYINT(1) NOT NULL DEFAULT 0,
  word_count TINYINT NOT NULL DEFAULT 1,
  search_count INT NOT NULL DEFAULT 1,
  CONSTRAINT uq_fact_voice_grain UNIQUE (date_sk, intent_sk, category_sk, region_sk, utterance_normalized),
  CONSTRAINT chk_fvs_utt_ascii CHECK (utterance_normalized COLLATE utf8mb4_bin REGEXP '^[a-z0-9 ]+$'),
  CONSTRAINT chk_fvs_count CHECK (search_count > 0),
  CONSTRAINT fk_fvs_date FOREIGN KEY (date_sk) REFERENCES dim_dates(date_sk),
  CONSTRAINT fk_fvs_intent FOREIGN KEY (intent_sk) REFERENCES dim_voice_intents(intent_sk),
  CONSTRAINT fk_fvs_cat FOREIGN KEY (category_sk) REFERENCES dim_categories(category_sk),
  CONSTRAINT fk_fvs_reg FOREIGN KEY (region_sk) REFERENCES dim_regions(region_sk),
  CONSTRAINT fk_fvs_ch FOREIGN KEY (channel_sk) REFERENCES dim_access_channels(channel_sk)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.3 Ponte Relacional N:N entre Pesquisas por Voz e Palavras-Chave
CREATE TABLE IF NOT EXISTS fact_voice_search_keywords (
  voice_fact_sk BIGINT NOT NULL,
  keyword_sk INT NOT NULL,
  hit_count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (voice_fact_sk, keyword_sk),
  CONSTRAINT fk_fvsk_fact FOREIGN KEY (voice_fact_sk) REFERENCES fact_voice_searches(voice_fact_sk) ON DELETE CASCADE,
  CONSTRAINT fk_fvsk_kw FOREIGN KEY (keyword_sk) REFERENCES dim_voice_keywords(keyword_sk) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. HELPERS & STORED PROCEDURES (SQL SECURITY DEFINER = Camada Segura + RLS)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_ensure_dim_date;
DROP FUNCTION IF EXISTS fn_ensure_dim_region;
DROP FUNCTION IF EXISTS fn_ensure_dim_organization;
DROP FUNCTION IF EXISTS fn_ensure_dim_subcategory;
DROP PROCEDURE IF EXISTS sp_record_star_search_demand;
DROP PROCEDURE IF EXISTS sp_record_voice_search_relational;
DROP PROCEDURE IF EXISTS sp_register_ngo_candidate;

DELIMITER $$

CREATE FUNCTION fn_ensure_dim_date(p_date DATE)
RETURNS INT
DETERMINISTIC
MODIFIES SQL DATA
SQL SECURITY DEFINER
BEGIN
  DECLARE v_date DATE;
  DECLARE v_date_sk INT;
  DECLARE v_m TINYINT;
  DECLARE v_dow TINYINT;
  DECLARE v_month_key VARCHAR(16);

  SET v_date = COALESCE(p_date, CURRENT_DATE());
  SET v_date_sk = CAST(DATE_FORMAT(v_date, '%Y%m%d') AS UNSIGNED);
  SET v_m = MONTH(v_date);
  SET v_dow = DAYOFWEEK(v_date) - 1;
  SET v_month_key = ELT(v_m,
    'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  );

  INSERT IGNORE INTO dim_dates (
    date_sk, full_date, year_num, quarter_num, month_num,
    month_key_ascii, day_of_month, day_of_week, is_weekend
  )
  VALUES (
    v_date_sk, v_date, YEAR(v_date), QUARTER(v_date), v_m,
    v_month_key, DAY(v_date), v_dow, IF(v_dow IN (0, 6), 1, 0)
  );

  RETURN v_date_sk;
END$$

CREATE FUNCTION fn_ensure_dim_region(p_state VARCHAR(10), p_city VARCHAR(120))
RETURNS BIGINT
DETERMINISTIC
MODIFIES SQL DATA
SQL SECURITY DEFINER
BEGIN
  DECLARE v_uf CHAR(2);
  DECLARE v_state_norm VARCHAR(60);
  DECLARE v_macro VARCHAR(30);
  DECLARE v_city VARCHAR(100);
  DECLARE v_city_norm VARCHAR(100);
  DECLARE v_region_sk BIGINT DEFAULT NULL;

  SET v_uf = UPPER(LEFT(REGEXP_REPLACE(COALESCE(p_state, ''), '[^A-Za-z]', ''), 2));
  IF LENGTH(v_uf) <> 2 THEN
    SET v_uf = 'BR';
  END IF;

  CASE v_uf
    WHEN 'AC' THEN SET v_state_norm = 'acre'; SET v_macro = 'Norte';
    WHEN 'AP' THEN SET v_state_norm = 'amapa'; SET v_macro = 'Norte';
    WHEN 'AM' THEN SET v_state_norm = 'amazonas'; SET v_macro = 'Norte';
    WHEN 'PA' THEN SET v_state_norm = 'para'; SET v_macro = 'Norte';
    WHEN 'RO' THEN SET v_state_norm = 'rondonia'; SET v_macro = 'Norte';
    WHEN 'RR' THEN SET v_state_norm = 'roraima'; SET v_macro = 'Norte';
    WHEN 'TO' THEN SET v_state_norm = 'tocantins'; SET v_macro = 'Norte';
    WHEN 'AL' THEN SET v_state_norm = 'alagoas'; SET v_macro = 'Nordeste';
    WHEN 'BA' THEN SET v_state_norm = 'bahia'; SET v_macro = 'Nordeste';
    WHEN 'CE' THEN SET v_state_norm = 'ceara'; SET v_macro = 'Nordeste';
    WHEN 'MA' THEN SET v_state_norm = 'maranhao'; SET v_macro = 'Nordeste';
    WHEN 'PB' THEN SET v_state_norm = 'paraiba'; SET v_macro = 'Nordeste';
    WHEN 'PE' THEN SET v_state_norm = 'pernambuco'; SET v_macro = 'Nordeste';
    WHEN 'PI' THEN SET v_state_norm = 'piaui'; SET v_macro = 'Nordeste';
    WHEN 'RN' THEN SET v_state_norm = 'rio grande do norte'; SET v_macro = 'Nordeste';
    WHEN 'SE' THEN SET v_state_norm = 'sergipe'; SET v_macro = 'Nordeste';
    WHEN 'DF' THEN SET v_state_norm = 'distrito federal'; SET v_macro = 'Centro Oeste';
    WHEN 'GO' THEN SET v_state_norm = 'goias'; SET v_macro = 'Centro Oeste';
    WHEN 'MT' THEN SET v_state_norm = 'mato grosso'; SET v_macro = 'Centro Oeste';
    WHEN 'MS' THEN SET v_state_norm = 'mato grosso do sul'; SET v_macro = 'Centro Oeste';
    WHEN 'ES' THEN SET v_state_norm = 'espirito santo'; SET v_macro = 'Sudeste';
    WHEN 'MG' THEN SET v_state_norm = 'minas gerais'; SET v_macro = 'Sudeste';
    WHEN 'RJ' THEN SET v_state_norm = 'rio de janeiro'; SET v_macro = 'Sudeste';
    WHEN 'SP' THEN SET v_state_norm = 'sao paulo'; SET v_macro = 'Sudeste';
    WHEN 'PR' THEN SET v_state_norm = 'parana'; SET v_macro = 'Sul';
    WHEN 'RS' THEN SET v_state_norm = 'rio grande do sul'; SET v_macro = 'Sul';
    WHEN 'SC' THEN SET v_state_norm = 'santa catarina'; SET v_macro = 'Sul';
    ELSE SET v_uf = 'BR'; SET v_state_norm = 'brasil'; SET v_macro = 'Nacional';
  END CASE;

  SET v_city = LEFT(fn_sanitize_ascii_text(REGEXP_REPLACE(COALESCE(p_city, ''), '[0-9]+', ' ')), 100);
  IF v_city = '' THEN
    SET v_city = IF(v_uf = 'BR', 'Nacional', 'Todo o estado');
  END IF;

  SET v_city_norm = LEFT(fn_normalize_key_ascii(v_city), 100);
  IF v_city_norm = '' THEN
    SET v_city_norm = IF(v_uf = 'BR', 'nacional', 'todo o estado');
  END IF;

  SELECT region_sk INTO v_region_sk
  FROM dim_regions
  WHERE state_code = v_uf AND city_normalized = v_city_norm
  LIMIT 1;

  IF v_region_sk IS NULL THEN
    INSERT INTO dim_regions (state_code, state_name_normalized, macro_region, city_name, city_normalized)
    VALUES (v_uf, v_state_norm, v_macro, v_city, v_city_norm);
    SET v_region_sk = LAST_INSERT_ID();
  END IF;

  RETURN v_region_sk;
END$$

CREATE FUNCTION fn_ensure_dim_organization(p_org_name VARCHAR(180))
RETURNS INT
DETERMINISTIC
MODIFIES SQL DATA
SQL SECURITY DEFINER
BEGIN
  DECLARE v_name VARCHAR(180);
  DECLARE v_norm VARCHAR(180);
  DECLARE v_sk INT DEFAULT NULL;

  SET v_name = LEFT(COALESCE(NULLIF(fn_sanitize_ascii_text(p_org_name), ''), 'Organizacao Parceira'), 180);
  SET v_norm = LEFT(COALESCE(NULLIF(fn_normalize_key_ascii(v_name), ''), 'organizacao parceira'), 180);

  SELECT organization_sk INTO v_sk
  FROM dim_organizations
  WHERE organization_normalized = v_norm
  LIMIT 1;

  IF v_sk IS NULL THEN
    INSERT INTO dim_organizations (organization_normalized, organization_name)
    VALUES (v_norm, v_name);
    SET v_sk = LAST_INSERT_ID();
  END IF;

  RETURN v_sk;
END$$

CREATE FUNCTION fn_ensure_dim_subcategory(p_sub VARCHAR(160))
RETURNS INT
DETERMINISTIC
MODIFIES SQL DATA
SQL SECURITY DEFINER
BEGIN
  DECLARE v_label VARCHAR(160);
  DECLARE v_norm VARCHAR(160);
  DECLARE v_sk INT DEFAULT NULL;

  SET v_label = LEFT(COALESCE(NULLIF(fn_sanitize_ascii_text(p_sub), ''), 'Servico Gratuito'), 160);
  SET v_norm = LEFT(COALESCE(NULLIF(fn_normalize_key_ascii(v_label), ''), 'servico gratuito'), 160);

  SELECT subcategory_sk INTO v_sk
  FROM dim_subcategories
  WHERE subcategory_normalized = v_norm
  LIMIT 1;

  IF v_sk IS NULL THEN
    INSERT INTO dim_subcategories (subcategory_normalized, subcategory_label)
    VALUES (v_norm, v_label);
    SET v_sk = LAST_INSERT_ID();
  END IF;

  RETURN v_sk;
END$$

-- Grava busca anonima no Star Schema (fact_search_demand)
CREATE PROCEDURE sp_record_star_search_demand(
  IN p_topic_key VARCHAR(32),
  IN p_state VARCHAR(10),
  IN p_city VARCHAR(120),
  IN p_channel_key VARCHAR(32)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_topic VARCHAR(32);
  DECLARE v_channel VARCHAR(32);
  DECLARE v_date_sk INT;
  DECLARE v_cat_sk SMALLINT;
  DECLARE v_reg_sk BIGINT;
  DECLARE v_ch_sk TINYINT;

  SET v_topic = LOWER(REGEXP_REPLACE(COALESCE(p_topic_key, 'geral'), '[^a-z_]', ''));
  IF v_topic = 'social' THEN SET v_topic = 'ongs_apoio'; END IF;

  SELECT category_sk INTO v_cat_sk FROM dim_categories WHERE category_key = v_topic LIMIT 1;
  IF v_cat_sk IS NULL THEN
    SELECT category_sk INTO v_cat_sk FROM dim_categories WHERE category_key = 'geral' LIMIT 1;
  END IF;

  SET v_channel = LOWER(REGEXP_REPLACE(COALESCE(p_channel_key, 'web_cep'), '[^a-z_]', ''));
  SELECT channel_sk INTO v_ch_sk FROM dim_access_channels WHERE channel_key = v_channel LIMIT 1;
  IF v_ch_sk IS NULL THEN
    SELECT channel_sk INTO v_ch_sk FROM dim_access_channels WHERE channel_key = 'web_cep' LIMIT 1;
  END IF;

  SET v_date_sk = fn_ensure_dim_date(CURRENT_DATE());
  SET v_reg_sk = fn_ensure_dim_region(p_state, p_city);

  INSERT INTO fact_search_demand (date_sk, category_sk, region_sk, channel_sk, search_count)
  VALUES (v_date_sk, v_cat_sk, v_reg_sk, v_ch_sk, 1)
  ON DUPLICATE KEY UPDATE
    search_count = search_count + 1;
END$$

-- Transforma pesquisa de voz sanitizada (Zero-PII) em dados relacionais no Star Schema
CREATE PROCEDURE sp_record_voice_search_relational(
  IN p_raw_utterance VARCHAR(300),
  IN p_detected_topic VARCHAR(32),
  IN p_state VARCHAR(10),
  IN p_city VARCHAR(120)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_clean TEXT;
  DECLARE v_had_cep TINYINT(1) DEFAULT 0;
  DECLARE v_intent_key VARCHAR(40);
  DECLARE v_topic VARCHAR(32);
  DECLARE v_date_sk INT;
  DECLARE v_intent_sk SMALLINT;
  DECLARE v_cat_sk SMALLINT;
  DECLARE v_reg_sk BIGINT;
  DECLARE v_ch_sk TINYINT;
  DECLARE v_voice_fact_sk BIGINT;
  DECLARE v_word_count TINYINT;
  DECLARE v_rest TEXT;
  DECLARE v_tok VARCHAR(64);
  DECLARE v_kw_sk INT;

  IF p_raw_utterance REGEXP '[0-9]{4,}' THEN
    SET v_had_cep = 1;
  END IF;

  SET v_clean = LOWER(fn_strip_accents_utf8mb4(COALESCE(p_raw_utterance, '')));
  SET v_clean = REGEXP_REPLACE(v_clean, '[0-9]{2,}', ' ');
  SET v_clean = REGEXP_REPLACE(v_clean, '[^a-z0-9 ]+', ' ');
  SET v_clean = LEFT(REGEXP_REPLACE(TRIM(v_clean), '\\s+', ' '), 160);
  IF v_clean = '' THEN
    SET v_clean = IF(v_had_cep = 1, 'busca por cep falado', 'busca por voz');
  END IF;

  SET v_topic = LOWER(REGEXP_REPLACE(COALESCE(p_detected_topic, ''), '[^a-z_]', ''));
  IF v_topic = '' OR v_topic = 'todos' THEN
    IF v_clean REGEXP '\\b(emergencia|socorro|perigo|delegacia|deam|violencia|abrigo|policia|denuncia)\\b' THEN SET v_topic = 'emergencia';
    ELSEIF v_clean REGEXP '\\b(psicolog|emocional|terapia|cvv|ansiedade|escuta|depress)\\b' THEN SET v_topic = 'psicologico';
    ELSEIF v_clean REGEXP '\\b(advogad|juridic|defensoria|protetiva|pensao|divorcio|guarda)\\b' THEN SET v_topic = 'juridico';
    ELSEIF v_clean REGEXP '\\b(saude|parto|exame|mamografia|papanicolau|sus|hospital|ubs|posto|medico)\\b' THEN SET v_topic = 'saude';
    ELSEIF v_clean REGEXP '\\b(curso|capacitacao|renda|emprego|trabalho|tecnologia)\\b' THEN SET v_topic = 'cursos';
    ELSEIF v_clean REGEXP '\\b(ong|ongs|voluntari|coletivo)\\b' THEN SET v_topic = 'ongs_apoio';
    ELSE SET v_topic = 'geral';
    END IF;
  END IF;

  SET v_intent_key = CASE v_topic
    WHEN 'emergencia' THEN 'emergencia_protecao'
    WHEN 'psicologico' THEN 'apoio_psicologico'
    WHEN 'juridico' THEN 'orientacao_juridica'
    WHEN 'saude' THEN 'saude_exames_parto'
    WHEN 'cursos' THEN 'cursos_autonomia'
    WHEN 'ongs_apoio' THEN 'busca_ongs_mulheres'
    ELSE 'busca_local_voz'
  END;

  SELECT intent_sk, category_sk INTO v_intent_sk, v_cat_sk
  FROM dim_voice_intents WHERE intent_key = v_intent_key LIMIT 1;

  IF v_cat_sk IS NULL THEN
    SELECT category_sk INTO v_cat_sk FROM dim_categories WHERE category_key = 'geral' LIMIT 1;
  END IF;

  SELECT channel_sk INTO v_ch_sk FROM dim_access_channels WHERE channel_key = 'web_voice' LIMIT 1;
  SET v_date_sk = fn_ensure_dim_date(CURRENT_DATE());
  SET v_reg_sk = fn_ensure_dim_region(p_state, p_city);
  SET v_word_count = LEAST(255, 1 + LENGTH(v_clean) - LENGTH(REPLACE(v_clean, ' ', '')));

  INSERT INTO fact_voice_searches (
    date_sk, intent_sk, category_sk, region_sk, channel_sk,
    utterance_normalized, had_cep_spoken, word_count, search_count
  )
  VALUES (
    v_date_sk, v_intent_sk, v_cat_sk, v_reg_sk, v_ch_sk,
    v_clean, v_had_cep, v_word_count, 1
  )
  ON DUPLICATE KEY UPDATE
    search_count = search_count + 1,
    voice_fact_sk = LAST_INSERT_ID(voice_fact_sk);

  SET v_voice_fact_sk = LAST_INSERT_ID();

  SET v_rest = CONCAT(v_clean, ' ');
  WHILE LENGTH(v_rest) > 0 DO
    SET v_tok = SUBSTRING_INDEX(v_rest, ' ', 1);
    SET v_rest = SUBSTRING(v_rest, LENGTH(v_tok) + 2);
    IF LENGTH(v_tok) >= 3 AND v_tok NOT IN ('para', 'com', 'que', 'uma', 'por', 'dos', 'das', 'meu', 'sua', 'nao', 'cep', 'preciso', 'quero', 'onde', 'tem') THEN
      INSERT IGNORE INTO dim_voice_keywords (keyword_normalized) VALUES (v_tok);
      SELECT keyword_sk INTO v_kw_sk FROM dim_voice_keywords WHERE keyword_normalized = v_tok LIMIT 1;
      IF v_kw_sk IS NOT NULL THEN
        INSERT INTO fact_voice_search_keywords (voice_fact_sk, keyword_sk, hit_count)
        VALUES (v_voice_fact_sk, v_kw_sk, 1)
        ON DUPLICATE KEY UPDATE hit_count = hit_count + 1;
      END IF;
    END IF;
  END WHILE;

  CALL sp_record_star_search_demand(v_topic, p_state, p_city, 'web_voice');
END$$

-- Cadastro seguro de ONG sem duplicidade, sem acento e sem caracteres especiais
CREATE PROCEDURE sp_register_ngo_candidate(
  IN p_name VARCHAR(180),
  IN p_organization VARCHAR(180),
  IN p_area_key VARCHAR(32),
  IN p_coverage VARCHAR(160),
  IN p_state VARCHAR(10),
  IN p_city VARCHAR(100),
  IN p_summary VARCHAR(800),
  IN p_access_channel VARCHAR(200),
  IN p_website_url VARCHAR(300),
  IN p_privacy_note VARCHAR(300),
  IN p_is_free_confirmed TINYINT(1),
  IN p_source_type VARCHAR(20),
  OUT p_status VARCHAR(20),
  OUT p_ngo_id VARCHAR(100),
  OUT p_message VARCHAR(300)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE v_name VARCHAR(180);
  DECLARE v_org VARCHAR(180);
  DECLARE v_name_norm VARCHAR(180);
  DECLARE v_domain_norm VARCHAR(255);
  DECLARE v_reg_sk BIGINT;
  DECLARE v_org_sk INT;
  DECLARE v_area_sk TINYINT;
  DECLARE v_existing_id VARCHAR(100) DEFAULT NULL;
  DECLARE v_verified TINYINT(1);
  DECLARE v_url VARCHAR(300);

  SET v_name = LEFT(fn_sanitize_ascii_text(p_name), 180);
  SET v_org = LEFT(COALESCE(NULLIF(fn_sanitize_ascii_text(p_organization), ''), v_name), 180);
  SET v_url = fn_sanitize_ascii_url(p_website_url, 'nao informado');

  IF COALESCE(p_is_free_confirmed, 0) <> 1 THEN
    SET p_status = 'invalid';
    SET p_ngo_id = NULL;
    SET p_message = 'Apenas ONGs 100 por cento gratuitas podem ser cadastradas';
  ELSEIF CHAR_LENGTH(v_name) < 4 THEN
    SET p_status = 'invalid';
    SET p_ngo_id = NULL;
    SET p_message = 'Nome da ONG obrigatorio minimo 4 caracteres';
  ELSEIF LOWER(CONCAT_WS(' ', v_name, v_org, fn_sanitize_ascii_text(p_summary))) REGEXP '(mensalidade|plano de saude|convenio|particular|privado|privada|unimed|hapvida|amil|bradesco saude|sulamerica|consulta paga)' THEN
    SET p_status = 'invalid';
    SET p_ngo_id = NULL;
    SET p_message = 'Servicos pagos ou planos de saude nao sao permitidos';
  ELSE
    SET v_name_norm = LEFT(fn_normalize_key_ascii(v_name), 180);
    SET v_domain_norm = fn_normalize_ngo_domain(v_url);
    SET v_reg_sk = fn_ensure_dim_region(p_state, p_city);

    SELECT id INTO v_existing_id
    FROM ngos
    WHERE name_normalized = v_name_norm
       OR (v_domain_norm IS NOT NULL AND website_domain_normalized = v_domain_norm AND region_sk = v_reg_sk)
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      SET p_status = 'duplicate';
      SET p_ngo_id = v_existing_id;
      SET p_message = 'Esta ONG ja esta cadastrada no banco de dados sem duplicidade';
    ELSE
      SET v_org_sk = fn_ensure_dim_organization(v_org);
      SELECT ngo_area_sk INTO v_area_sk FROM dim_ngo_areas WHERE area_key = COALESCE(p_area_key, 'acolhimento_protecao') LIMIT 1;
      IF v_area_sk IS NULL THEN
        SELECT ngo_area_sk INTO v_area_sk FROM dim_ngo_areas WHERE area_key = 'acolhimento_protecao' LIMIT 1;
      END IF;

      SET p_ngo_id = CONCAT('ngo-', LEFT(REPLACE(v_name_norm, ' ', '-'), 44), '-', SUBSTRING(MD5(CONCAT(v_name_norm, UUID())), 1, 6));
      SET v_verified = IF(p_source_type = 'partner_form', 1, 0);

      INSERT INTO ngos (
        id, name, name_normalized, organization_sk, ngo_area_sk, region_sk,
        coverage, summary, access_channel, website_url, website_domain_normalized,
        privacy_note, featured, source_type, is_verified, is_active, owner_id
      )
      VALUES (
        p_ngo_id,
        v_name,
        v_name_norm,
        v_org_sk,
        v_area_sk,
        v_reg_sk,
        LEFT(COALESCE(NULLIF(fn_sanitize_ascii_text(p_coverage), ''), 'Brasil'), 160),
        LEFT(COALESCE(NULLIF(fn_sanitize_ascii_text(p_summary), ''), 'Atendimento gratuito para mulheres'), 800),
        LEFT(COALESCE(NULLIF(fn_sanitize_ascii_text(p_access_channel), ''), 'Atendimento gratuito pelo site'), 200),
        v_url,
        v_domain_norm,
        LEFT(COALESCE(NULLIF(fn_sanitize_ascii_text(p_privacy_note), ''), 'Atendimento gratuito e sigiloso'), 300),
        0,
        IF(p_source_type = 'osm_discovery', 'osm_discovery', 'partner_form'),
        v_verified,
        1,
        @current_partner_uid
      );

      SET p_status = 'inserted';
      SET p_message = 'ONG gravada no banco sem acentos sem caracteres especiais e sem duplicidade';
    END IF;
  END IF;
END$$

-- ----------------------------------------------------------------------------
-- 5. TRIGGERS DE SANITIZACAO ESTRITA + ISOLAMENTO POR LINHA ("RLS" NO MYSQL)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_services_bi_guard$$
DROP TRIGGER IF EXISTS trg_services_bu_guard$$
DROP TRIGGER IF EXISTS trg_ngos_bi_guard$$
DROP TRIGGER IF EXISTS trg_ngos_bu_guard$$
DROP TRIGGER IF EXISTS trg_ngo_help_bi_sanitize$$

CREATE TRIGGER trg_services_bi_guard
BEFORE INSERT ON services
FOR EACH ROW
BEGIN
  DECLARE v_cep VARCHAR(20);
  SET NEW.name = COALESCE(NULLIF(fn_sanitize_ascii_text(NEW.name), ''), 'Servico Publico Gratuito');
  SET NEW.name_normalized = COALESCE(NULLIF(fn_normalize_key_ascii(NEW.name), ''), 'servico publico gratuito');
  SET NEW.description = COALESCE(NULLIF(fn_sanitize_ascii_text(NEW.description), ''), 'Atendimento gratuito');
  SET NEW.neighborhood = NULLIF(fn_sanitize_ascii_text(NEW.neighborhood), '');
  SET NEW.address = NULLIF(fn_sanitize_ascii_text(NEW.address), '');
  SET v_cep = REGEXP_REPLACE(COALESCE(NEW.cep, ''), '[^0-9]', '');
  SET NEW.cep = IF(LENGTH(v_cep) = 8, v_cep, NULL);
  SET NEW.phone = fn_sanitize_digits_space(NEW.phone);
  SET NEW.whatsapp = NULLIF(REGEXP_REPLACE(COALESCE(NEW.whatsapp, ''), '[^0-9]', ''), '');
  SET NEW.website = fn_sanitize_ascii_url(NEW.website, NULL);
  SET NEW.hours = COALESCE(NULLIF(fn_sanitize_ascii_text(NEW.hours), ''), 'Consultar atendimento');
  SET NEW.free_confirmation = COALESCE(NULLIF(fn_sanitize_ascii_text(NEW.free_confirmation), ''), '100 por cento gratuito');
  SET NEW.tips_for_woman = NULLIF(fn_sanitize_ascii_text(NEW.tips_for_woman), '');

  IF COALESCE(@current_partner_role, '') <> 'admin' THEN
    IF NEW.owner_id IS NULL OR NEW.owner_id <> COALESCE(@current_partner_uid, '') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'RLS MySQL apenas parceiras autenticadas podem inserir seus servicos';
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_services_bu_guard
BEFORE UPDATE ON services
FOR EACH ROW
BEGIN
  DECLARE v_cep VARCHAR(20);
  SET NEW.name = COALESCE(NULLIF(fn_sanitize_ascii_text(NEW.name), ''), 'Servico Publico Gratuito');
  SET NEW.name_normalized = COALESCE(NULLIF(fn_normalize_key_ascii(NEW.name), ''), 'servico publico gratuito');
  SET NEW.description = COALESCE(NULLIF(fn_sanitize_ascii_text(NEW.description), ''), 'Atendimento gratuito');
  SET NEW.neighborhood = NULLIF(fn_sanitize_ascii_text(NEW.neighborhood), '');
  SET NEW.address = NULLIF(fn_sanitize_ascii_text(NEW.address), '');
  SET v_cep = REGEXP_REPLACE(COALESCE(NEW.cep, ''), '[^0-9]', '');
  SET NEW.cep = IF(LENGTH(v_cep) = 8, v_cep, NULL);
  SET NEW.phone = fn_sanitize_digits_space(NEW.phone);
  SET NEW.whatsapp = NULLIF(REGEXP_REPLACE(COALESCE(NEW.whatsapp, ''), '[^0-9]', ''), '');
  SET NEW.website = fn_sanitize_ascii_url(NEW.website, NULL);
  SET NEW.hours = COALESCE(NULLIF(fn_sanitize_ascii_text(NEW.hours), ''), 'Consultar atendimento');
  SET NEW.free_confirmation = COALESCE(NULLIF(fn_sanitize_ascii_text(NEW.free_confirmation), ''), '100 por cento gratuito');
  SET NEW.tips_for_woman = NULLIF(fn_sanitize_ascii_text(NEW.tips_for_woman), '');

  IF COALESCE(@current_partner_role, '') <> 'admin' THEN
    IF OLD.owner_id IS NULL OR OLD.owner_id <> COALESCE(@current_partner_uid, '') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'RLS MySQL permissao negada para alterar servico de outra organizacao';
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_ngos_bi_guard
BEFORE INSERT ON ngos
FOR EACH ROW
BEGIN
  SET NEW.name = LEFT(COALESCE(NULLIF(fn_sanitize_ascii_text(NEW.name), ''), 'ONG Parceira'), 180);
  SET NEW.name_normalized = LEFT(COALESCE(NULLIF(fn_normalize_key_ascii(NEW.name), ''), 'ong parceira'), 180);
  SET NEW.coverage = LEFT(COALESCE(NULLIF(fn_sanitize_ascii_text(NEW.coverage), ''), 'Todo o Brasil'), 160);
  SET NEW.summary = LEFT(COALESCE(NULLIF(fn_sanitize_ascii_text(NEW.summary), ''), 'Atendimento gratuito para mulheres'), 800);
  SET NEW.access_channel = LEFT(COALESCE(NULLIF(fn_sanitize_ascii_text(NEW.access_channel), ''), 'Atendimento gratuito pelo site'), 200);
  SET NEW.website_url = fn_sanitize_ascii_url(NEW.website_url, 'nao informado');
  SET NEW.website_domain_normalized = fn_normalize_ngo_domain(NEW.website_url);
  SET NEW.privacy_note = LEFT(COALESCE(NULLIF(fn_sanitize_ascii_text(NEW.privacy_note), ''), 'Atendimento gratuito sem exposicao publica de dados'), 300);

  IF COALESCE(@current_partner_role, '') <> 'admin' THEN
    IF NEW.owner_id IS NULL OR NEW.owner_id <> COALESCE(@current_partner_uid, '') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'RLS MySQL apenas parceiras autenticadas podem inserir ONGs';
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_ngos_bu_guard
BEFORE UPDATE ON ngos
FOR EACH ROW
BEGIN
  SET NEW.name = LEFT(COALESCE(NULLIF(fn_sanitize_ascii_text(NEW.name), ''), 'ONG Parceira'), 180);
  SET NEW.name_normalized = LEFT(COALESCE(NULLIF(fn_normalize_key_ascii(NEW.name), ''), 'ong parceira'), 180);
  SET NEW.coverage = LEFT(COALESCE(NULLIF(fn_sanitize_ascii_text(NEW.coverage), ''), 'Todo o Brasil'), 160);
  SET NEW.summary = LEFT(COALESCE(NULLIF(fn_sanitize_ascii_text(NEW.summary), ''), 'Atendimento gratuito para mulheres'), 800);
  SET NEW.access_channel = LEFT(COALESCE(NULLIF(fn_sanitize_ascii_text(NEW.access_channel), ''), 'Atendimento gratuito pelo site'), 200);
  SET NEW.website_url = fn_sanitize_ascii_url(NEW.website_url, 'nao informado');
  SET NEW.website_domain_normalized = fn_normalize_ngo_domain(NEW.website_url);
  SET NEW.privacy_note = LEFT(COALESCE(NULLIF(fn_sanitize_ascii_text(NEW.privacy_note), ''), 'Atendimento gratuito sem exposicao publica de dados'), 300);

  IF COALESCE(@current_partner_role, '') <> 'admin' THEN
    IF OLD.owner_id IS NULL OR OLD.owner_id <> COALESCE(@current_partner_uid, '') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'RLS MySQL permissao negada para alterar ONG de outra organizacao';
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_ngo_help_bi_sanitize
BEFORE INSERT ON ngo_help_items
FOR EACH ROW
BEGIN
  SET NEW.help_description = LEFT(COALESCE(NULLIF(fn_sanitize_ascii_text(NEW.help_description), ''), 'Apoio gratuito para mulheres'), 240);
  SET NEW.help_normalized = LEFT(COALESCE(NULLIF(fn_normalize_key_ascii(NEW.help_description), ''), 'apoio gratuito para mulheres'), 240);
END$$

DELIMITER ;

-- ----------------------------------------------------------------------------
-- 6. VIEWS ANALITICAS E PUBLICAS COM SQL SECURITY DEFINER ("RLS DE LEITURA")
-- ----------------------------------------------------------------------------
CREATE OR REPLACE SQL SECURITY DEFINER VIEW vw_public_services_star AS
SELECT
  s.id,
  s.name,
  s.name_normalized,
  c.category_key,
  c.label_utf8 AS category_label,
  sc.subcategory_label,
  sc.subcategory_normalized,
  am.access_mode_label,
  r.state_code,
  r.state_name_normalized,
  r.macro_region,
  r.city_name,
  r.city_normalized,
  s.is_national_online,
  s.neighborhood,
  s.address,
  s.cep,
  s.lat,
  s.lng,
  s.phone,
  s.whatsapp,
  s.website,
  s.hours,
  s.free_confirmation,
  s.tips_for_woman
FROM services s
JOIN dim_categories c ON c.category_sk = s.category_sk
JOIN dim_subcategories sc ON sc.subcategory_sk = s.subcategory_sk
JOIN dim_access_modes am ON am.access_mode_sk = s.access_mode_sk
JOIN dim_regions r ON r.region_sk = s.region_sk
WHERE s.is_active = 1
  AND s.is_verified = 1
  AND s.requires_registration = 0;

CREATE OR REPLACE SQL SECURITY DEFINER VIEW vw_public_ngos_star AS
SELECT
  n.id,
  n.name,
  n.name_normalized,
  o.organization_name,
  o.organization_normalized,
  a.area_key,
  a.area_label,
  a.area_normalized,
  r.state_code,
  r.city_name,
  r.city_normalized,
  r.macro_region,
  n.coverage,
  n.summary,
  n.access_channel,
  n.website_url,
  n.website_domain_normalized,
  n.privacy_note,
  n.featured,
  n.source_type
FROM ngos n
JOIN dim_organizations o ON o.organization_sk = n.organization_sk
JOIN dim_ngo_areas a ON a.ngo_area_sk = n.ngo_area_sk
JOIN dim_regions r ON r.region_sk = n.region_sk
WHERE n.is_active = 1
  AND n.is_verified = 1;

CREATE OR REPLACE SQL SECURITY DEFINER VIEW vw_star_search_demand AS
SELECT
  f.fact_id,
  d.date_sk,
  d.full_date AS demand_date,
  d.year_num,
  d.quarter_num,
  d.month_num,
  d.month_key_ascii,
  c.category_key AS topic_key,
  c.label_normalized AS topic_label_normalized,
  r.state_code,
  r.state_name_normalized,
  r.macro_region,
  r.city_name,
  r.city_normalized,
  ch.channel_key,
  ch.channel_label,
  f.search_count
FROM fact_search_demand f
JOIN dim_dates d ON d.date_sk = f.date_sk
JOIN dim_categories c ON c.category_sk = f.category_sk
JOIN dim_regions r ON r.region_sk = f.region_sk
JOIN dim_access_channels ch ON ch.channel_sk = f.channel_sk;

CREATE OR REPLACE SQL SECURITY DEFINER VIEW vw_star_voice_searches AS
SELECT
  v.voice_fact_sk,
  d.full_date AS search_date,
  vi.intent_key,
  vi.intent_label_normalized,
  c.category_key,
  r.state_code,
  r.city_normalized,
  r.macro_region,
  v.utterance_normalized,
  v.had_cep_spoken,
  v.word_count,
  v.search_count
FROM fact_voice_searches v
JOIN dim_dates d ON d.date_sk = v.date_sk
JOIN dim_voice_intents vi ON vi.intent_sk = v.intent_sk
JOIN dim_categories c ON c.category_sk = v.category_sk
JOIN dim_regions r ON r.region_sk = v.region_sk;

-- ----------------------------------------------------------------------------
-- 7. SEED NORMALIZADO SEM ACENTOS E SEM CARACTERES ESPECIAIS (SERVICOS + 14 ONGS)
-- ----------------------------------------------------------------------------
SET @current_partner_role = 'admin';

INSERT INTO services (
  id, name, name_normalized, category_sk, subcategory_sk, region_sk, access_mode_sk,
  description, is_national_online, neighborhood, address, cep, lat, lng,
  phone, whatsapp, website, hours, requires_registration, free_confirmation, is_verified, is_active
)
SELECT
  s.id,
  s.name,
  fn_normalize_key_ascii(s.name),
  (SELECT category_sk FROM dim_categories WHERE category_key = s.cat_key LIMIT 1),
  fn_ensure_dim_subcategory(s.subcat),
  fn_ensure_dim_region(s.uf, s.city),
  (SELECT access_mode_sk FROM dim_access_modes WHERE access_mode_key = s.am_key LIMIT 1),
  s.descr,
  s.nat_online,
  s.neigh,
  s.addr,
  s.cep,
  s.lat,
  s.lng,
  s.phone,
  s.wa,
  s.web,
  s.hrs,
  0,
  s.free_conf,
  1,
  1
FROM (
  SELECT 'ligue-180' AS id, 'Central de Atendimento a Mulher Ligue 180' AS name, 'emergencia' AS cat_key, 'Plantao Nacional de Acolhimento e Denuncia' AS subcat, 'BR' AS uf, 'Nacional' AS city, 'plantao_24h' AS am_key, 'Escuta qualificada orientacao juridica e encaminhamento para a rede local 24h' AS descr, 1 AS nat_online, NULL AS neigh, NULL AS addr, NULL AS cep, NULL AS lat, NULL AS lng, '180' AS phone, '556196100180' AS wa, 'https://www.gov.br/mulheres/pt-br/central-de-atendimento-a-mulher-ligue-180' AS web, '24 horas por dia 7 dias por semana' AS hrs, 'Ligacao 100 por cento gratuita funciona mesmo sem creditos' AS free_conf
  UNION ALL SELECT 'policia-190', 'Policia Militar Emergencia 190', 'emergencia', 'Socorro Imediato', 'BR', 'Nacional', 'plantao_24h', 'Atendimento imediato em risco iminente ou descumprimento de Medida Protetiva', 1, NULL, NULL, NULL, NULL, NULL, '190', NULL, NULL, '24 horas ininterruptas', 'Chamada publica gratuita'
  UNION ALL SELECT 'americas-amigas-exames', 'ONG Americas Amigas Mamografias e Exames Gratuitos', 'saude', 'ONG Exames Gratuitos de Mama', 'BR', 'Nacional', 'online_imediato', 'ONG que custeia gratuitamente mamografias ultrassons de mama e biopsias para mulheres de baixa renda', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://americasamigas.org.br', 'Solicitacao online', '100 por cento gratuito'
  UNION ALL SELECT 'sesc-saude-mulher', 'Sesc Saude da Mulher Carretas de Exames Gratuitos', 'saude', 'Unidade Movel Mamografia e Papanicolau', 'BR', 'Nacional', 'livre_demanda', 'Carretas moveis que realizam gratuitamente exames de mamografia e preventivo do colo do utero', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://www.sesc.com.br/atuacoes/saude/sesc-saude-mulher/', 'Calendario municipal', '100 por cento gratuito'
  UNION ALL SELECT 'sp-casa-angela', 'Casa Angela Centro de Parto Humanizado ONG Monte Azul', 'saude', 'ONG Casa de Parto Humanizado Gratuito', 'SP', 'Sao Paulo', 'livre_demanda', 'Organizacao sem fins lucrativos referencia em parto humanizado gratuito pre natal e pos parto', 0, 'Jardim Monte Azul', 'Rua Dr Luis da Fonseca Galvao 248 Jardim Monte Azul Sao Paulo SP', '04914050', -23.6795, -46.7521, '11 5852 5332', NULL, 'https://casaangela.org.br', 'Plantao 24h para partos', '100 por cento gratuito via parceria ONG e SUS'
  UNION ALL SELECT 'rj-casa-parto-david-capistrano', 'Casa de Parto David Capistrano Filho', 'saude', 'Casa de Parto Humanizado Gratuito', 'RJ', 'Rio de Janeiro', 'livre_demanda', 'Centro de parto normal humanizado em Realengo com pre natal e pos parto gratuitos', 0, 'Realengo', 'Av Pontalina s n Realengo Rio de Janeiro RJ', '21741400', -22.8781, -43.4317, '21 3331 1899', NULL, NULL, '24 horas para partos', '100 por cento gratuito'
  UNION ALL SELECT 'ba-cpn-mansao-caminho', 'Centro de Parto Normal Marieta de Souza Pereira Mansao do Caminho', 'saude', 'Instituicao Social Parto Humanizado Gratuito', 'BA', 'Salvador', 'livre_demanda', 'Centro de parto humanizado mantido pela obra social Mansao do Caminho gratuitamente', 0, 'Pau da Lima', 'Rua Jayme Vieira Lima 104 Pau da Lima Salvador BA', '41235000', -12.9277, -38.4316, '71 3393 1910', NULL, NULL, '24 horas', '100 por cento gratuito'
  UNION ALL SELECT 'mg-hospital-sofia-feldman', 'Hospital Sofia Feldman Casa de Parto e Saude da Mulher', 'saude', 'Instituicao Filantropica Parto Humanizado Gratuito', 'MG', 'Belo Horizonte', 'livre_demanda', 'Instituicao filantropica referencia nacional em parto humanizado 100 por cento gratuito com doulas', 0, 'Tupi', 'Rua Antonio Bandeira 1060 Tupi Belo Horizonte MG', '31844130', -19.8407, -43.9163, '31 3408 2200', NULL, NULL, '24 horas', '100 por cento gratuito'
) s
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  hours = VALUES(hours),
  free_confirmation = VALUES(free_confirmation),
  is_verified = 1,
  is_active = 1;

INSERT INTO ngos (
  id, name, name_normalized, organization_sk, ngo_area_sk, region_sk,
  coverage, summary, access_channel, website_url, website_domain_normalized,
  privacy_note, featured, source_type, is_verified, is_active
)
SELECT
  s.id,
  s.name,
  fn_normalize_key_ascii(s.name),
  fn_ensure_dim_organization(s.org_name),
  (SELECT ngo_area_sk FROM dim_ngo_areas WHERE area_key = s.area_key LIMIT 1),
  fn_ensure_dim_region(s.uf, s.city),
  s.coverage,
  s.summary,
  s.access_channel,
  s.website_url,
  fn_normalize_ngo_domain(s.website_url),
  s.privacy_note,
  s.featured,
  'curated',
  1,
  1
FROM (
  SELECT 'ngo-nova-mulher-sp-zn' AS id, 'ONG Nova Mulher Centro Psicossocial Zona Norte SP' AS name, 'ONG Nova Mulher' AS org_name, 'psicologico_juridico' AS area_key, 'SP' AS uf, 'Sao Paulo' AS city, 'Sao Paulo SP Zona Norte' AS coverage, 'Atendimento psicossocial gratuito com psicologas e assistentes sociais para mulheres na Zona Norte de Sao Paulo' AS summary, 'Presencial e WhatsApp 11 98641 0956' AS access_channel, 'https://ongnovamulher.org' AS website_url, 'Rua Adolfo Kurt Bohem 43 Vila Nova Cachoeirinha Sao Paulo SP' AS privacy_note, 1 AS featured
  UNION ALL SELECT 'ngo-fala-mulher-sp', 'Associacao Fala Mulher', 'Associacao Fala Mulher', 'psicologico_juridico', 'SP', 'Sao Paulo', 'Sao Paulo e Grande SP', 'Organizacao que administra Centros de Defesa e de Convivencia da Mulher com atendimento psicologico social e juridico gratuitos', 'Canais oficiais', 'https://falamulher.ong.br', 'Atendimento gratuito sem exigir boletim de ocorrencia', 1
  UNION ALL SELECT 'ngo-mapa-acolhimento', 'Mapa do Acolhimento', 'Rede NOSSAS', 'psicologico_juridico', 'BR', 'Nacional', 'Todo o Brasil Online e Presencial', 'Conecta gratuitamente mulheres que sofrem ou sofreram violencia a psicologas e advogadas voluntarias', 'Cadastro rapido online', 'https://www.mapadoacolhimento.org', 'Atendimento sigiloso conduzido por voluntarias verificadas', 1
  UNION ALL SELECT 'ngo-justiceiras', 'Projeto Justiceiras', 'Instituto Justiceiras', 'acolhimento_protecao', 'BR', 'Nacional', 'Todo o Brasil Online', 'Equipe multidisciplinar voluntaria para orientacao juridica psicologica medica e assistencial', 'WhatsApp e Formulario Web', 'https://justiceiras.org.br', 'Prefira navegar em aba anonima se houver risco', 1
  UNION ALL SELECT 'ngo-odara-ba', 'Odara Instituto da Mulher Negra Salvador e Chapada Diamantina', 'Instituto Odara', 'acolhimento_protecao', 'BA', 'Salvador e Chapada Diamantina', 'Bahia Salvador Chapada Diamantina e interior', 'Organizacao feminista baiana com atuacao em Salvador e interior da Chapada Diamantina para saude e enfrentamento a violencia', 'Projetos territoriais e site', 'https://institutoodara.org.br', 'Atuacao sem fins lucrativos na Bahia', 1
  UNION ALL SELECT 'ngo-tamojuntas', 'Organizacao TamoJuntas', 'Coletivo Nacional TamoJuntas', 'psicologico_juridico', 'BR', 'Nacional', 'Bahia Nordeste e todo o Brasil', 'Assessoria gratuita juridica psicologica e assistencial feita por mulheres', 'Solicitacao pelo site', 'https://tamojuntas.org.br', 'Acolhimento interseccional em linguagem simples', 1
  UNION ALL SELECT 'ngo-americas-amigas', 'ONG Americas Amigas', 'Americas Amigas', 'saude_parto', 'BR', 'Nacional', 'Todo o Brasil', 'ONG que doa e realiza gratuitamente exames de mamografia ultrassom de mama e biopsias', 'Solicitacao pelo site', 'https://americasamigas.org.br', 'Atendimento gratuito para mulheres sem plano', 0
  UNION ALL SELECT 'ngo-instituto-protea', 'Instituto Protea', 'ONG Instituto Protea', 'saude_parto', 'BR', 'Nacional', 'Sao Paulo e redes parceiras', 'Custeia gratuitamente consultas exames de imagem biopsias e tratamento de cancer de mama', 'Encaminhamento via site', 'https://institutoprotea.org.br', 'Voltado a mulheres sem plano privado', 0
  UNION ALL SELECT 'ngo-casa-angela', 'Casa Angela Centro de Parto Humanizado', 'Associacao Comunitaria Monte Azul', 'saude_parto', 'SP', 'Sao Paulo', 'Sao Paulo SP SUS e apoio social', 'Casa de parto sem fins lucrativos que oferece pre natal e parto humanizado gratuito', 'Grupos gratuitos e presencial', 'https://casaangela.org.br', 'Atendimento gratuito para gestantes', 0
  UNION ALL SELECT 'ngo-rede-feminina-cancer', 'Rede Feminina de Combate ao Cancer', 'Federacao Nacional das Redes Femininas', 'saude_parto', 'BR', 'Nacional', 'Todo o Brasil Nucleos regionais', 'Realiza exames preventivos Papanicolau e mama e acolhe mulheres gratuitamente', 'Presencial nas sedes regionais', 'https://redefemininanacional.org.br', 'Atendimento direto sem burocracia', 0
  UNION ALL SELECT 'ngo-penhas-azmina', 'Instituto AzMina Rede PenhaS', 'Revista AzMina', 'acolhimento_protecao', 'BR', 'Nacional', 'Nacional App e Portal', 'Informacao clara sobre violencia contra a mulher rede de apoio e botao de alerta', 'Plataforma digital', 'https://penhas.com.br', 'Leitura aberta sem cadastro', 1
  UNION ALL SELECT 'ngo-instituto-maria-da-penha', 'Instituto Maria da Penha IMP', 'ONG Instituto Maria da Penha', 'acolhimento_protecao', 'BR', 'Nacional', 'Nacional Fortaleza e Recife', 'Guias gratuitos sobre os 5 tipos de violencia Lei Maria da Penha e denuncias', 'Guias abertos no site', 'https://www.institutomariadapenha.org.br', 'Material aberto e gratuito', 0
  UNION ALL SELECT 'ngo-reprograma', 'Reprograma', 'Iniciativa de Impacto Social em Tecnologia', 'cursos_renda', 'BR', 'Nacional', 'Todo o Brasil Turmas Online', 'Bolsas 100 por cento gratuitas de formacao em programacao e tecnologia para mulheres', 'Editais gratuitos', 'https://reprograma.com.br', '100 por cento gratuito com foco em autonomia', 0
  UNION ALL SELECT 'ngo-rme', 'Rede Mulher Empreendedora Instituto RME', 'Instituto Rede Mulher Empreendedora', 'cursos_renda', 'BR', 'Nacional', 'Todo o Brasil Online Programas Ela Pode Ela Modo IA e nucleos regionais', 'Principal rede brasileira de apoio ao empreendedorismo feminino oferecendo cursos gratuitos de gestao financas vendas e Inteligencia Artificial aplicada a pequenos negocios', 'Capacitacoes e trilhas gratuitas no site oficial', 'https://rme.net.br', 'Programas gratuitos voltados para mulheres em vulnerabilidade socioeconomica', 1
  UNION ALL SELECT 'ngo-programaria', 'PrograMaria', 'PrograMaria Impacto Social em Tecnologia', 'cursos_renda', 'SP', 'Sao Paulo', 'Todo o Brasil Online e eventos presenciais em Sao Paulo SP', 'Organizacao de impacto social que oferece bolsas de estudo 100 por cento gratuitas e cursos de introducao a programacao desenvolvimento web analise de dados e IA para mulheres', 'Editais gratuitos de bolsas e eventos no site oficial', 'https://www.programaria.org', 'Programas e editais gratuitos voltados a inclusao de mulheres na tecnologia', 1
  UNION ALL SELECT 'ngo-ai-girls', 'AI Girls IA Girls Brasil', 'Comunidade AI Girls BR', 'cursos_renda', 'BR', 'Nacional', 'Todo o Brasil Online Comunidade Nacional', 'Comunidade brasileira criada por mulheres para fortalecer o protagonismo feminino em Inteligencia Artificial e Ciencia de Dados com workshops mentorias e grupos gratuitos', 'Workshops meetups e grupos de estudo gratuitos', 'https://aigirlsbr.github.io', 'Iniciativa comunitaria gratuita e sem fins lucrativos voltada a mulheres em IA', 1
  UNION ALL SELECT 'ngo-womakerscode', 'WoMakersCode Mais Mulheres Tech', 'ONG WoMakersCode', 'cursos_renda', 'BR', 'Nacional', 'Todo o Brasil Online e encontros presenciais em SP RJ MG BA PE PR RS e DF', 'Uma das maiores ONGs e comunidades da America Latina voltada a inclusao de mulheres na tecnologia oferecendo bootcamps gratuitos em IA Cloud Dados DevOps e programacao', 'Plataforma Mais Mulheres Tech e bootcamps gratuitos', 'https://womakerscode.org', 'Organizacao sem fins lucrativos com capacitacoes gratuitas por inscricao nos editais', 1
  UNION ALL SELECT 'ngo-tech-girls', 'Projeto Tech Girls', 'ONG Tech Girls Inclusao Digital', 'cursos_renda', 'PR', 'Curitiba', 'Curitiba PR Presencial Joinville SC Sao Paulo SP e Online', 'Projeto social criado em Curitiba que capacita mulheres em vulnerabilidade social em tecnologia manutencao de hardware software empreendedorismo digital e reaproveitamento de lixo eletronico', 'Turmas presenciais e inscricao gratuita pelo site oficial', 'https://techgirls.com.br', 'Projeto social sem fins lucrativos focado na autonomia digital e profissional de mulheres', 1
  UNION ALL SELECT 'ngo-minas-programam', 'Instituto Minas Programam', 'Instituto Minas Programam', 'cursos_renda', 'SP', 'Sao Paulo', 'Todo o Brasil Online ao vivo e acoes presenciais em Sao Paulo SP', 'Instituto que combate desigualdades de genero e raca na computacao oferecendo cursos gratuitos de logica HTML CSS JavaScript e fundamentos tech para mulheres negras e indigenas', 'Editais gratuitos de formacao pelo site oficial', 'https://minasprogramam.com', 'Formacao 100 por cento gratuita sem exigencia de conhecimento previo', 0
  UNION ALL SELECT 'ngo-pretalab', 'PretaLab Olabi', 'Olabi Iniciativa PretaLab', 'cursos_renda', 'RJ', 'Rio de Janeiro', 'Todo o Brasil Online Sede no Rio de Janeiro RJ', 'Plataforma que conecta mulheres negras e indigenas ao mercado de tecnologia por meio de ciclos formativos gratuitos em programacao analise de dados e Inteligencia Artificial', 'Ciclos formativos gratuitos online pelo site', 'https://www.pretalab.com', 'Iniciativa gratuita focada no protagonismo e empregabilidade de mulheres negras e indigenas', 0
  UNION ALL SELECT 'ngo-elas-programam', 'Elas Programam', 'Comunidade Elas Programam', 'cursos_renda', 'BR', 'Nacional', 'Todo o Brasil Online', 'Plataforma e comunidade feminina dedicada a conectar mulheres a bolsas integrais bootcamps gratuitos de programacao Inteligencia Artificial e oportunidades de carreira em tecnologia', 'Portal de bolsas e comunidade online gratuita', 'https://www.elasprogramam.com.br', 'Acesso gratuito a conteudos comunidades e chamadas de bolsas', 0
  UNION ALL SELECT 'ngo-pyladies-brasil', 'PyLadies Brasil', 'Comunidade PyLadies Brasil', 'cursos_renda', 'BR', 'Nacional', 'Presencial em capitais SP RJ MG BA PE CE PR RS DF AM PA e Online', 'Comunidade com capitulos ativos em dezenas de cidades brasileiras que realiza oficinas praticas gratuitas de programacao Python ciencia de dados e mentoria para mulheres', 'Capitulos regionais presenciais e eventos gratuitos', 'https://brasil.pyladies.com', 'Atividades gratuitas e abertas conduzidas por capitulos voluntarios regionais', 0
  UNION ALL SELECT 'ngo-infopreta', 'InfoPreta', 'InfoPreta Tecnologia e Inclusao Digital', 'cursos_renda', 'SP', 'Sao Paulo', 'Sao Paulo SP Presencial e acoes online', 'Negocio de impacto social liderado por mulheres negras em Sao Paulo que realiza oficinas gratuitas de tecnologia manutencao de computadores e inclusao digital', 'Oficinas sociais e projetos pelo site oficial', 'https://www.infopreta.com.br', 'Projetos sociais gratuitos em parceria com comunidades de Sao Paulo', 0
  UNION ALL SELECT 'ngo-cruzando-historias', 'Cruzando Historias', 'Associacao Cruzando Historias', 'cursos_renda', 'SP', 'Sao Paulo', 'Todo o Brasil Online e presencial em Sao Paulo SP', 'ONG dedicada a recolocacao profissional e acolhimento de mulheres desempregadas ou em vulnerabilidade com cursos gratuitos de curriculo LinkedIn IA e apoio psicologico', 'Inscricoes gratuitas no programa Impulsione sua Carreira', 'https://www.cruzandohistorias.org', 'Atendimento 100 por cento gratuito focado em mulheres em busca de recolocacao', 0
  UNION ALL SELECT 'ngo-mulher-em-construcao', 'Instituto Mulher em Construcao IMEC', 'ONG Instituto Mulher em Construcao', 'cursos_renda', 'RS', 'Canoas', 'Canoas Porto Alegre RS e acoes itinerantes presenciais', 'ONG gaucha pioneira que capacita gratuitamente mulheres de baixa renda em oficinas presenciais de construcao civil eletrica hidraulica pintura e pequenos reparos', 'Oficinas presenciais gratuitas e inscricao pelo site', 'https://www.mulheremconstrucao.org.br', 'Oficinas gratuitas voltadas para mulheres em vulnerabilidade socioeconomica', 0
  UNION ALL SELECT 'ngo-instituto-dona-de-si', 'Instituto Dona de Si', 'Instituto Dona de Si', 'cursos_renda', 'RJ', 'Rio de Janeiro', 'Rio de Janeiro RJ Presencial e Todo o Brasil Online', 'Instituto fundado no Rio de Janeiro que promove capacitacao gratuita em empreendedorismo feminino gestao vendas e aceleracao de talentos para autonomia financeira', 'Editais gratuitos de formacao e aceleracao no site', 'https://institutodonadesi.com.br', 'Programas gratuitos mantidos por parcerias sociais sem cobranca', 0
  UNION ALL SELECT 'ngo-alianca-empreendedora', 'Alianca Empreendedora', 'Alianca Empreendedora Negocios de Baixa Renda', 'cursos_renda', 'PR', 'Curitiba', 'Curitiba PR Sede Presencial e Todo o Brasil Online', 'Organizacao social com sede em Curitiba e atuacao nacional que capacita gratuitamente microempreendedoras em vendas precificacao financas e formalizacao de negocios', 'Cursos gratuitos online e projetos presenciais locais', 'https://aliancaempreendedora.org.br', 'Conteudos e capacitacoes gratuitas voltadas a inclusao produtiva', 0
  UNION ALL SELECT 'ngo-humana-elas-maris-ba', 'Projeto Elas MARIS Humana Brasil BA', 'Humana Brasil Desenvolvimento Social', 'cursos_renda', 'BA', 'Salvador', 'Salvador e Lauro de Freitas BA Presencial', 'Iniciativa social na Bahia com cursos presenciais gratuitos de corte e costura marketing digital e gestao para impulsionar o empreendedorismo feminino', 'Turmas presenciais comunitarias e contato pelo site', 'https://humanabrasil.org', 'Projeto social gratuito voltado a mulheres em vulnerabilidade social na Bahia', 0
  UNION ALL SELECT 'ngo-instituto-alianca-pe', 'Escola Social do Varejo Instituto Alianca PE', 'Instituto Alianca', 'cursos_renda', 'PE', 'Recife', 'Recife PE Salvador BA Fortaleza CE e Sao Paulo SP Presencial e Hibrido', 'Organizacao sem fins lucrativos com atuacao no Nordeste oferecendo qualificacao profissional gratuita para o varejo vendas habilidades digitais e insercao no trabalho', 'Inscricoes gratuitas e editais regionais pelo site', 'https://institutoalianca.org.br', 'Capacitacao gratuita voltada a inclusao produtiva de mulheres e jovens', 0
  UNION ALL SELECT 'ngo-casa-marina-mg', 'Casa Marina Instituto Marina e Flavio Guimaraes MG', 'Instituto Marina e Flavio Guimaraes', 'cursos_renda', 'MG', 'Belo Horizonte', 'Belo Horizonte MG Regiao Central Presencial', 'Espaco social em Belo Horizonte com cursos praticos presenciais e gratuitos voltados a mulheres em vulnerabilidade abrangendo cultura digital smartphone e design de moda', 'Inscricoes presenciais gratuitas em Belo Horizonte', 'https://institutomfg.com.br', 'Atendimento presencial 100 por cento gratuito em Minas Gerais', 0
  UNION ALL SELECT 'ngo-das-pretas-es', 'Instituto Das Pretas ES e Online', 'Instituto Das Pretas Tecnologia Social', 'cursos_renda', 'ES', 'Vitoria', 'Vitoria ES Presencial e EAD Online em todo o Brasil', 'Organizacao capixaba afro centrada de tecnologia social que oferece oficinas presenciais em Vitoria e cursos gratuitos em plataforma propria para mulheres', 'Plataforma EAD e oficinas presenciais pelo site', 'https://daspretas.com.br', 'Iniciativa sem fins lucrativos voltada a formacao e inclusao produtiva', 0
  UNION ALL SELECT 'ngo-casa-preta-amazonia-pa', 'Casa Preta Amazonia Belem PA e Norte', 'Casa Preta Amazonia', 'cursos_renda', 'PA', 'Belem', 'Belem PA Presencial e Plataforma Online na Amazonia e Brasil', 'Organizacao amazonida sediada em Belem do Para que promove formacoes presenciais e cursos online gratuitos de protagonismo digital cultura e geracao de renda para mulheres', 'Oficinas presenciais em Belem e ambiente virtual de cursos', 'https://casapretaamazonia.org', 'Projeto social gratuito de base comunitaria na Amazonia', 0
) s
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  summary = VALUES(summary),
  coverage = VALUES(coverage),
  website_url = VALUES(website_url),
  privacy_note = VALUES(privacy_note),
  is_verified = 1,
  is_active = 1;

SET @current_partner_role = NULL;

-- ----------------------------------------------------------------------------
-- 8. ISOLAMENTO DE PRIVILEGIOS POR ROLES (EQUIVALENTE AO RLS PARA MYSQL 8.0+)
-- ----------------------------------------------------------------------------
-- Em producao, conceda apenas leitura nas views DEFINER e execucao nas
-- stored procedures validadas ao usuario publico da aplicacao:
--
-- CREATE ROLE IF NOT EXISTS 'app_anon_role', 'app_partner_role';
-- GRANT SELECT ON acolhemulher.vw_public_services_star TO 'app_anon_role';
-- GRANT SELECT ON acolhemulher.vw_public_ngos_star TO 'app_anon_role';
-- GRANT SELECT ON acolhemulher.vw_star_search_demand TO 'app_anon_role';
-- GRANT SELECT ON acolhemulher.vw_star_voice_searches TO 'app_anon_role';
-- GRANT EXECUTE ON PROCEDURE acolhemulher.sp_record_star_search_demand TO 'app_anon_role';
-- GRANT EXECUTE ON PROCEDURE acolhemulher.sp_record_voice_search_relational TO 'app_anon_role';
-- GRANT EXECUTE ON PROCEDURE acolhemulher.sp_register_ngo_candidate TO 'app_anon_role';
-- ============================================================================

