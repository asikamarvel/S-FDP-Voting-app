"""Instagram Platform Adapter - Graph API"""
import httpx
from typing import List, AsyncGenerator, Optional
import asyncio
from datetime import datetime

from app.adapters.base import BasePlatformAdapter, NormalizedUser, NormalizedEngagement
from app.config import settings


class InstagramAdapter(BasePlatformAdapter):
    BASE_URL = "https://graph.facebook.com/v18.0"
    
    def __init__(self):
        self.access_token = settings.instagram_access_token
        self.business_account_id = settings.instagram_business_account_id
        
    @property
    def platform_name(self) -> str:
        return "instagram"
    
    @property
    def supports_follower_list(self) -> bool:
        return False
    
    @property
    def supports_likes(self) -> bool:
        return False
    
    @property
    def supports_comments(self) -> bool:
        return True
    
    async def _make_request(self, endpoint: str, params: dict = None) -> dict:
        if params is None:
            params = {}
        params["access_token"] = self.access_token
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{endpoint}",
                params=params,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    
    async def fetch_post_details(self, post_id: str) -> dict:
        try:
            data = await self._make_request(post_id, {
                "fields": "id,caption,timestamp,like_count,comments_count,permalink"
            })
            
            return {
                "id": data.get("id"),
                "caption": data.get("caption"),
                "timestamp": data.get("timestamp"),
                "like_count": data.get("like_count", 0),
                "comments_count": data.get("comments_count", 0),
                "permalink": data.get("permalink")
            }
        except Exception as e:
            return {"caption": None, "comments_count": 0, "error": str(e)}
    
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
        cursor = None
        fetched = 0
        batch_size = 100
        
        while True:
            params = {
                "fields": "id,username,text,timestamp",
                "limit": batch_size
            }
            if cursor:
                params["after"] = cursor
            
            try:
                data = await self._make_request(f"{post_id}/comments", params)
                
                engagements = []
                for comment in data.get("data", []):
                    timestamp = None
                    if "timestamp" in comment:
                        try:
                            timestamp = datetime.fromisoformat(comment["timestamp"].replace("Z", "+00:00"))
                        except:
                            pass
                    
                    engagements.append(NormalizedEngagement(
                        platform_user_id=comment.get("from", {}).get("id", comment.get("id", "")),
                        username=comment.get("username"),
                        engagement_type="comment",
                        comment_text=comment.get("text"),
                        engaged_at=timestamp
                    ))
                
                if engagements:
                    yield engagements
                    fetched += len(engagements)
                
                paging = data.get("paging", {})
                cursor = paging.get("cursors", {}).get("after")
                
                if not cursor or (max_results and fetched >= max_results):
                    break
                
                await asyncio.sleep(0.5)
                
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    await asyncio.sleep(60)
                    continue
                raise
