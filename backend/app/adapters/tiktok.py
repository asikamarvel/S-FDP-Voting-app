"""TikTok Platform Adapter - API v2 (Placeholder)"""
from typing import List, AsyncGenerator, Optional

from app.adapters.base import BasePlatformAdapter, NormalizedUser, NormalizedEngagement


class TikTokAdapter(BasePlatformAdapter):
    def __init__(self):
        pass
        
    @property
    def platform_name(self) -> str:
        return "tiktok"
    
    @property
    def supports_follower_list(self) -> bool:
        return False
    
    @property
    def supports_likes(self) -> bool:
        return False
    
    @property
    def supports_comments(self) -> bool:
        return False
    
    async def fetch_followers(
        self,
        account_id: str,
        max_results: Optional[int] = None
    ) -> AsyncGenerator[List[NormalizedUser], None]:
        return
        yield
    
    async def fetch_post_likes(
        self,
        post_id: str,
        max_results: Optional[int] = None
    ) -> AsyncGenerator[List[NormalizedEngagement], None]:
        return
        yield
    
    async def fetch_post_comments(
        self,
        post_id: str,
        max_results: Optional[int] = None
    ) -> AsyncGenerator[List[NormalizedEngagement], None]:
        return
        yield
