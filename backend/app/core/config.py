"""
backend/app/core/config.py
Pydantic Settings — all secrets come from environment / .env file.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Backend
    cors_origins: str = "http://localhost:5173"

    # App
    app_env: str = "development"
    log_level: str = "INFO"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def is_development(self) -> bool:
        return self.app_env.lower() == "development"


settings = Settings()
