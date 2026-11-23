from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    AI_PROVIDER: str = "mock"
    MODEL_PATH: str = "/app/model"
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
