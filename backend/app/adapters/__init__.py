"""
Platform Adapters
Each adapter handles fetching followers and engagements from a specific platform.
"""
from app.adapters.base import BasePlatformAdapter
from app.adapters.instagram import InstagramAdapter
from app.adapters.twitter import TwitterAdapter
from app.adapters.youtube import YouTubeAdapter
from app.adapters.tiktok import TikTokAdapter
from app.adapters.facebook import FacebookAdapter
from app.models.campaign import PlatformType


def get_adapter(platform: PlatformType) -> BasePlatformAdapter:
    """Factory function to get the appropriate adapter for a platform."""
    adapters = {
        PlatformType.INSTAGRAM: InstagramAdapter,
        PlatformType.TWITTER: TwitterAdapter,
        PlatformType.YOUTUBE: YouTubeAdapter,
        PlatformType.TIKTOK: TikTokAdapter,
        PlatformType.FACEBOOK: FacebookAdapter,
    }
    
    adapter_class = adapters.get(platform)
    if not adapter_class:
        raise ValueError(f"No adapter available for platform: {platform}")
    
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
