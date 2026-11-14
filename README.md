<div align="center">

# 🌸 AcolheMulher — Rede Aberta de Apoio e Serviços por CEP
### Plataforma Web • Aplicativo Mobile PWA • Widget Integrável para ONGs
**Acesso imediato, gratuito e 100% sem necessidade de cadastro para mulheres em vulnerabilidade**

[🚀 Acessar Plataforma Online](https://ais-dev-r2gpsznwryzoskbbumntwb-755060135040.us-west2.run.app) · [📦 Repositório GitHub](https://github.com/karolcastro/Reprograma_IA_Agente_de_Projetos) · [📱 Instalar App PWA](#como-instalar-como-app-pwa) · [🔌 Gerador de Widget](#widget-para-ongs)

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwindcss&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa&logoColor=white)
![Licença](https://img.shields.io/badge/Licen%C3%A7a-MIT-green)
![Status](https://img.shields.io/badge/Status-Produção_Prática-E11D48)

</div>

---

## 🎯 Sobre o Projeto
O **AcolheMulher** é uma plataforma e aplicativo mobile prático desenvolvido para superar a principal barreira de acesso às políticas públicas para mulheres no Brasil: **a fragmentação federativa e a burocracia digital**.

Muitos serviços públicos de apoio psicológico, jurídico, de saúde e capacitação já existem gratuitamente, porém estão espalhados em dezenas de sites governamentais que exigem senhas do Gov.br, biometrias ou preenchimento de cadastros longos. Para mulheres em vulnerabilidade ou risco de violência doméstica (onde muitas vezes o aparelho celular é monitorado pelo agressor), exigir login representa uma porta fechada.

Esta plataforma resolve esse desafio com uma premissa clara: **Zero Cadastro, Acesso em menos de 10 segundos e Geolocalização apenas por CEP**.

---

## 🌟 Principais Recursos

### 1. 🔍 Localização Territorial por CEP sem Cadastro
- Digite apenas o CEP (com integração assíncrona ao **ViaCEP**).
- A plataforma identifica automaticamente bairro, município e estado, filtrando equipamentos públicos daquela localidade e da rede nacional.
- Nenhuma coleta de CPF, nome, e-mail ou telefone.

### 2. 🗂️ Divisão Limpa por Assunto
- ⚖️ **Apoio Jurídico:** Defensoria Pública (NUDEM), medidas protetivas de urgência, divórcio e pensão alimentícia.
- 🧠 **Psicológico & Emocional:** Clínicas-escola gratuitas de universidades, Centros de Referência (CRAM/CEAM) e apoio confidencial CVV (188).
- 🏥 **Saúde da Mulher & SUS:** Postos de saúde (UBS), pré-natal, exames preventivos e profilaxia de urgência sem exigência de boletim de ocorrência.
- 🎓 **Cursos Gratuitos & Renda:** Programa Mulheres Mil dos Institutos Federais, capacitação do Sebrae Delas e cursos de tecnologia.
- 🚨 **Emergência 24h:** Casa da Mulher Brasileira, Delegacias Especializadas da Mulher (DEAM), Ligue 180 e Polícia 190.

### 3. 🛡️ Trauma-Informed Tech & Segurança Doméstica
- **Botão "Sair Rápido" (Tecla ESC):** Fecha a página imediatamente e redireciona para o Google, limpando o histórico de sessão.
- **Modo Camuflagem Culinária:** Converte a tela com 1 clique para uma receita inofensiva de bolo de cenoura para proteção caso alguém se aproxime.

### 4. 📱 Plataforma + App Mobile (PWA)
- Não depende de lojas de aplicativos (Google Play ou App Store).
- Não deixa registro em extratos de contas compartilhadas.
- Pesa menos de 2 MB e funciona offline para números vitais (180, 190, 188).
- Permite "Adicionar à Tela de Início" como aplicativo nativo.

### 5. 🔌 Widget Embutível para ONGs e Sites Parceiros
- Qualquer organização sem fins lucrativos ou blog pode embutir o buscador de serviços no seu site com **1 linha de código HTML/iFrame**.
- Multiplica o alcance social do serviço de forma descentralizada.

---

## 🏗️ Arquitetura da Solução

```mermaid
flowchart TD
    subgraph Usuária Final (Privacidade Absoluta)
        A[Navegador Web / Mobile PWA] -->|Informa apenas o CEP| B[ViaCEP API]
        B -->|Retorna Bairro, Cidade e UF| A
        A -->|Filtra Catálogo Local e Nacional| C[Interface Limpa por Assunto]
    end

    subgraph Segurança e Proteção
        D[Botão Sair Rápido - ESC] -->|Limpa Storage e Redireciona| E[Google.com]
        F[Modo Disfarçar] -->|Exibe Receita Inofensiva| G[Tela de Culinária]
    end

    subgraph Integração em Rede
        H[Sites de ONGs / Portais] -->|Embed iFrame em 1 Linha| I[Widget AcolheMulher]
        I -->|Consulta Direta| C
    end
```

---

## 💻 Tecnologias Utilizadas

| Camada | Tecnologia | Finalidade |
| :--- | :--- | :--- |
| **Linguagem** | **TypeScript 5** | Tipagem estrita e segurança em tempo de compilação |
| **Framework** | **React 19** | Arquitetura modular e componentização moderna |
| **Estilização** | **Tailwind CSS v4** | Design responsivo, tokens de cores e microinterações |
| **Ícones** | **Lucide React** | Identidade visual intuitiva e acessível |
| **Geolocalização** | **ViaCEP REST API** | Consulta instantânea e normalização de endereços |
| **Mobile** | **PWA (Progressive Web App)** | Instalação nativa em Android/iOS e modo offline |
| **Integração Externa** | **Web Component / iFrame** | Widget aberto para ONGs e sites parceiros |

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js 18+ instalado
- npm ou yarn

### Passo a passo
```bash
# 1. Clone o repositório
git clone https://github.com/karolcastro/Reprograma_IA_Agente_de_Projetos.git

# 2. Acesse a pasta do projeto
cd Reprograma_IA_Agente_de_Projetos

# 3. Instale as dependências
npm install

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`.

---

## 👩‍💻 Autora & Conexão de Portfólio

Projeto desenvolvido por **Karol Castro** no âmbito da formação da **{reprograma}**.

- **GitHub:** [@karolcastro](https://github.com/karolcastro)
- **Repositório do Projeto:** [karolcastro/Reprograma_IA_Agente_de_Projetos](https://github.com/karolcastro/Reprograma_IA_Agente_de_Projetos)
- **Portfólio de Projetos:** Governança com IA, arquitetura orientada a serviços e impacto social.

---

## 📄 Licença
Distribuído sob a licença **MIT**. Consulte `LICENSE` para mais informações.
