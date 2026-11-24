from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", protected_namespaces=())

    database_url: str = "sqlite+aiosqlite:///./phoenix.db"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    sign_model_path: str = "models/mvit32-2.onnx"
    sign_model_name: str = "mvit32-2"
    sign_classes_path: str = "data/rsl_classes.json"
    sign_target_fps: int = 15
    sign_stride: int = 8
    sign_min_confidence: float = 0.5
    sign_max_backlog_frames: int = 64
    max_concurrent_inferences: int = 4

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
