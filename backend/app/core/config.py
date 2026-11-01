"""Settings read from environment variables (.env.example lists them all).

Business rules that staff tune at runtime (retention, gate, audit) live in the settings table, not here.
"""

from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "dev"
    database_url: str = "postgresql+psycopg://hybrid:hybrid@localhost:5432/hybrid_checkout"
    redis_url: str = "redis://localhost:6379/0"

    jwt_secret: SecretStr = SecretStr("change-me")
    access_token_minutes: int = 15
    refresh_token_hours: int = 12
    cors_origins: list[str] = ["http://localhost:5173"]

    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "minio"
    s3_secret_key: SecretStr = SecretStr("minio12345")
    s3_bucket_prefix: str = "hybrid"

    inference_url: str = "http://localhost:9100"
    inference_token: SecretStr = SecretStr("change-me")
    tray_check_timeout_seconds: float = 2.5


@lru_cache
def get_settings() -> Settings:
    return Settings()
