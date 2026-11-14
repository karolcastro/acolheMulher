"""
Limitador de taxa (Rate Limiter) com anonimização criptográfica efêmera.

Protege o backend contra ataques de negação de serviço (DoS) e varredura
automatizada, mas SEM armazenar endereços IP reais das usuárias em memória:
a chave do cliente é convertida em um hash HMAC-SHA256 com segredo efêmero
que existe apenas enquanto o processo estiver ativo.
"""

from collections import deque
import hashlib
import hmac
import threading
import time

from backend.domain.exceptions import RateLimitExceededError


class EphemeralRateLimiter:
    """Controlador de janela deslizante (Sliding Window) thread-safe e sem rastreamento."""

    def __init__(
        self,
        ephemeral_secret: str,
        max_requests: int = 60,
        window_seconds: int = 60,
    ) -> None:
        self._secret = ephemeral_secret.encode("utf-8")
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        self._buckets: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def _anonymize_key(self, raw_identifier: str) -> str:
        """Converte o identificador de rede em hash irreversível por sessão."""
        return hmac.new(
            self._secret,
            raw_identifier.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def check_and_record(self, raw_identifier: str) -> None:
        """
        Verifica se a origem anônima ainda possui cota na janela atual.
        Se exceder o limite, lança RateLimitExceededError.
        """
        anon_key = self._anonymize_key(raw_identifier or "anonymous")
        now = time.monotonic()
        window_start = now - self._window_seconds

        with self._lock:
            timestamps = self._buckets.setdefault(anon_key, deque())

            # Remove registros expirados fora da janela de tempo
            while timestamps and timestamps[0] < window_start:
                timestamps.popleft()

            if len(timestamps) >= self._max_requests:
                raise RateLimitExceededError()

            timestamps.append(now)

            # Higienização preventiva para evitar crescimento indefinido de memória
            if len(self._buckets) > 10_000:
                expired_keys = [
                    key for key, queue in self._buckets.items()
                    if not queue or queue[-1] < window_start
                ]
                for key in expired_keys:
                    del self._buckets[key]
