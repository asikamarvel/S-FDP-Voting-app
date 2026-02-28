"""Platform Adapters"""
from app.adapters.base import BasePlatformAdapter
from app.adapters.instagram import InstagramAdapter
from app.adapters.twitter import TwitterAdapter
from app.adapters.youtube import YouTubeAdapter
from app.adapters.tiktok import TikTokAdapter
from app.adapters.facebook import FacebookAdapter
from app.enums import PlatformType


def get_adapter(platform: PlatformType) -> BasePlatformAdapter:
    adapters = {
        PlatformType.INSTAGRAM: InstagramAdapter,
        PlatformType.TWITTER: TwitterAdapter,
        PlatformType.YOUTUBE: YouTubeAdapter,
        PlatformType.TIKTOK: TikTokAdapter,
        PlatformType.FACEBOOK: FacebookAdapter,
    }
    
    adapter_class = adapters.get(platform)
    if not adapter_class:
        raise ValueError(f"No adapter for platform: {platform}")
    
    return adapter_class()


__all__ = [
    "BasePlatformAdapter",
    "InstagramAdapter", 
    "TwitterAdapter",
    "YouTubeAdapter",
    "TikTokAdapter",
    "FacebookAdapter",
    "get_adapter"
]
