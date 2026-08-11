from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Postgres connection string, e.g.:
    # postgresql://user:password@host:5432/dbname
    database_url: str

    # JWT
    secret_key: str            # generate with: openssl rand -hex 32
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    class Config:
        env_file = ".env"


settings = Settings()