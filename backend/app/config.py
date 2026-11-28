import json
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore", protected_namespaces=())

    database_url: str = "sqlite+aiosqlite:///./phoenix.db"
    cors_origins: str = "http://localhost:3000,http://localhost:5173,https://localhost"  # https://localhost = the Android app

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

    # Video call between the two people in a conversation (WebRTC). STUN finds each browser's public
    # address; a TURN relay helps when strict networks block a direct link. JSON list of RTCIceServer,
    # e.g. [{"urls":"turn:turn.example.org:3478","username":"u","credential":"p"}]. Empty = public STUN.
    chat_ice_servers: str = ""

    stt_engine: Literal["whisper", "gemini", "auto"] = "auto"  # whisper | gemini | auto (Gemini if GEMINI_API_KEY is set, Whisper as backup)
    stt_model: str = "small"
    stt_device: str = "cpu"
    stt_compute_type: str = "int8"

    gemini_api_key: str = ""
    gemini_models: str = "gemini-3.5-flash,gemini-flash-latest,gemini-flash-lite-latest"  # STT; tried in order
    gemini_sentence_models: str = "gemini-flash-lite-latest,gemini-3.5-flash"  # short task: fast model first
    gemini_timeout_s: float = 30.0
    smooth_by_default: bool = True  # WS final includes a Gemini sentence unless the client opts out

    # Sign-in (website + mobile app). All optional: with nothing set, sign-in is off and everything works as before.
    auth_config_path: str = "config/auth.json"  # committed public client IDs; the env vars below win
    google_client_ids: str = ""  # OAuth "Web application" client ID(s) a Google ID token must be issued for
    github_client_id: str = ""  # OAuth App client ID (device flow enabled); shown to the app, not secret
    github_client_secret: str = ""  # secret: needed for the website's GitHub redirect sign-in (.env / Colab secret only)
    google_client_secret: str = ""  # secret of the Google "Web application" client: needed for the website's redirect sign-in
    # Website addresses Google/GitHub may send people back to after sign-in (exactly as registered with them),
    # comma-separated. Empty = taken from config/auth.json "web_redirect_uris".
    auth_redirect_uris: str = ""
    session_days: int = 60

    upload_dir: str = "uploads"
    # Website served at "/" by the same server (one URL for the Colab tunnel). Empty = ../frontend next to backend/.
    frontend_dir: str = ""
    serve_frontend: bool = True
    load_models: bool = True

    @property
    def sentence_model_list(self) -> list[str]:
        return [m.strip() for m in self.gemini_sentence_models.split(",") if m.strip()]

    def model_post_init(self, _ctx) -> None:
        """Fill sign-in client IDs from config/auth.json when the environment does not set them."""
        path = Path(self.auth_config_path)
        if not path.is_absolute():
            path = Path(__file__).resolve().parents[1] / path
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return
        if not self.google_client_ids:
            self.google_client_ids = str(data.get("google_web_client_id") or "")
        if not self.github_client_id:
            self.github_client_id = str(data.get("github_client_id") or "")
        if not self.auth_redirect_uris:
            uris = data.get("web_redirect_uris") or []
            self.auth_redirect_uris = ",".join(str(u) for u in uris) if isinstance(uris, list) else str(uris)

    @property
    def google_client_id_list(self) -> list[str]:
        return [c.strip() for c in self.google_client_ids.split(",") if c.strip()]

    @property
    def auth_redirect_uri_list(self) -> list[str]:
        return [u.strip() for u in self.auth_redirect_uris.split(",") if u.strip()]

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
