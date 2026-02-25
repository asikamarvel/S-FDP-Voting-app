"""
Application Configuration
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    # Database (SQLite for easy development)
    database_url: str = "sqlite+aiosqlite:///socialvote.db"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # Instagram API
    instagram_access_token: str = ""
    instagram_business_account_id: str = ""
    
    # Twitter/X API
    twitter_bearer_token: str = ""
    twitter_user_id: str = ""
    twitter_api_key: str = ""
    twitter_api_secret: str = ""
    
    # YouTube API
    youtube_api_key: str = ""
    
    # Facebook API
    facebook_access_token: str = ""
    facebook_page_id: str = ""
    
    # TikTok API
    tiktok_access_token: str = ""
    
    # App Settings
    secret_key: str = "your-secret-key-change-in-production"
    debug: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
