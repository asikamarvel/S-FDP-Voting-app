from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache
import os


# HARDCODED: This is the Postgres with all the data - ignore any Railway-injected vars
_POSTGRES_URL = "postgresql+asyncpg://postgres:NQbOTAjbYphvWLKloIDSuKgjKhAwngOb@crossover.proxy.rlwy.net:55987/railway"


class Settings(BaseSettings):
    # Exclude from env loading so Railway can't override it
    database_url: str = Field(default=_POSTGRES_URL, exclude=True)
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
