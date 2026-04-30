from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "backend"
    env: str = "dev"
    log_level: str = "INFO"

    api_host: str = "0.0.0.0"
    api_port: int = 8000

    database_url: str = "sqlite:////workspace/backend/.data/app.db"
    redis_url: str = "redis://localhost:6379/0"

    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    analysis_confidence_threshold: float = 0.7
    analysis_repeat_window_days: int = 30
    analysis_repeat_threshold: int = 2
    analysis_model_version: str = "rule-v1"

    workorder_warning_hours: int = 24
    workorder_auto_return_on_satisfaction_fail: bool = True
    satisfaction_good_min_score: int = 9
    satisfaction_ok_min_score: int = 7


@lru_cache
def get_settings() -> Settings:
    return Settings()
