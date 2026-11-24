from pathlib import Path

from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent.parent


class Settings(BaseSettings):
    AI_PROVIDER: str = "local"
    MODEL_PATH: str = str(BASE_DIR / "models")
    DATA_DIR: str = str(BASE_DIR / "data")
    UPLOAD_DIR: str = str(BASE_DIR.parent / "api" / "uploads")
    LOG_LEVEL: str = "INFO"
    VISION_WEIGHT: float = 0.60
    SYMPTOM_WEIGHT: float = 0.40
    IMAGE_TIMEOUT: float = 10.0
    MAX_IMAGES: int = 4

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def model_dir(self) -> Path:
        path = Path(self.MODEL_PATH)
        return path if path.is_absolute() else (BASE_DIR / path)

    @property
    def data_dir(self) -> Path:
        path = Path(self.DATA_DIR)
        return path if path.is_absolute() else (BASE_DIR / path)

    @property
    def upload_dir(self) -> Path:
        path = Path(self.UPLOAD_DIR)
        return path if path.is_absolute() else (BASE_DIR / path)


settings = Settings()
