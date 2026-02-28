from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///socialvote.db"
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
