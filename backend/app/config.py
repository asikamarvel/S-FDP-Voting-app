from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache
import os


# Force the correct Postgres URL - Railway auto-injects conflicting vars
_POSTGRES_URL = os.environ.get(
    "POSTGRES_URL",
    os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:NQbOTAjbYphvWLKloIDSuKgjKhAwngOb@crossover.proxy.rlwy.net:55987/railway"
    )
)
# Ensure asyncpg driver
if _POSTGRES_URL.startswith("postgres://"):
    _POSTGRES_URL = _POSTGRES_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif _POSTGRES_URL.startswith("postgresql://") and "+asyncpg" not in _POSTGRES_URL:
    _POSTGRES_URL = _POSTGRES_URL.replace("postgresql://", "postgresql+asyncpg://", 1)


class Settings(BaseSettings):
    database_url: str = _POSTGRES_URL
    redis_url: str = "redis://localhost:6379/0"
    
    instagram_access_token: str = ""
    instagram_business_account_id: str = ""
    
    twitter_bearer_token: str = ""
    twitter_user_id: str = ""
    twitter_api_key: str = ""
    twitter_api_secret: str = ""
    
    youtube_api_key: str = ""
    
    facebook_access_token: str = ""
    facebook_page_id: str = ""
    
    tiktok_access_token: str = ""
    
    secret_key: str = "change-in-production"
    debug: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
