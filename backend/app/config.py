from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache
import os


class Settings(BaseSettings):
    # Database - loaded from environment variable
    database_url: str = Field(default="", alias="DATABASE_URL")
    redis_url: str = "redis://localhost:6379/0"
    
    instagram_access_token: str = ""
    instagram_business_account_id: str = ""
    
    # Twitter - loaded from environment variable
    twitter_bearer_token: str = Field(default="", alias="TWITTER_BEARER_TOKEN")
    twitter_user_id: str = ""
    twitter_api_key: str = ""
    twitter_api_secret: str = ""
    
    # YouTube - loaded from environment variable
    youtube_api_key: str = Field(default="", alias="YOUTUBE_API_KEY")
    
    facebook_access_token: str = ""
    facebook_page_id: str = ""
    
    tiktok_access_token: str = ""
    
    secret_key: str = Field(default="change-in-production", alias="SECRET_KEY")
    debug: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        populate_by_name = True


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()
