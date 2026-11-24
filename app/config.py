from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", protected_namespaces=())

    database_url: str = "sqlite+aiosqlite:///./phoenix.db"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    # Sign languages/models: see config/sign_languages.json
    sign_languages_path: str = "config/sign_languages.json"
    sign_languages_enabled: str = ""  # e.g. "rsl" to load only Russian; empty = all in the file
    sign_variants: str = ""  # e.g. "rsl=mvit16-4,asl=signflow-a"; empty = each language's default
    sign_stride: int = 8  # model-rate frames between inferences
    sign_min_confidence: float = 0.5  # default; a language can override it in the JSON
    sign_max_backlog_frames: int = 64
    max_concurrent_inferences: int = 4
    max_ws_connections: int = 100
    ws_idle_timeout_s: float = 30.0
    ws_frame_rate_slack: float = 2.0  # frames/s above declared fps x this are skipped

    max_concurrent_stt: int = 2

    stt_model: str = "small"
    stt_device: str = "cpu"
    stt_compute_type: str = "int8"

    upload_dir: str = "uploads"
    load_models: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
