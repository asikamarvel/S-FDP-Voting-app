"""Facebook Platform Adapter - Graph API"""
import httpx
from typing import List, AsyncGenerator, Optional
import asyncio
from datetime import datetime

from app.adapters.base import BasePlatformAdapter, NormalizedUser, NormalizedEngagement
from app.config import settings


class FacebookAdapter(BasePlatformAdapter):
    BASE_URL = "https://graph.facebook.com/v18.0"
    
    def __init__(self):
        self.access_token = settings.facebook_access_token or settings.instagram_access_token
        self.page_id = settings.facebook_page_id
        
    @property
    def platform_name(self) -> str:
        return "facebook"
    
    @property
    def supports_follower_list(self) -> bool:
        return False
    
    @property
    def supports_likes(self) -> bool:
        return True
    
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
                "fields": "id,message,created_time,shares,reactions.summary(true),comments.summary(true)"
            })
            
            return {
                "id": data.get("id"),
                "message": data.get("message"),
                "created_time": data.get("created_time"),
                "shares_count": data.get("shares", {}).get("count", 0),
                "reactions_count": data.get("reactions", {}).get("summary", {}).get("total_count", 0),
                "comments_count": data.get("comments", {}).get("summary", {}).get("total_count", 0)
            }
        except Exception as e:
            return {"message": None, "reactions_count": 0, "error": str(e)}
    
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
        cursor = None
        fetched = 0
        batch_size = 100
        
        while True:
            params = {"limit": batch_size}
            if cursor:
                params["after"] = cursor
            
            try:
                data = await self._make_request(f"{post_id}/reactions", params)
                
                engagements = []
                for reaction in data.get("data", []):
                    engagements.append(NormalizedEngagement(
                        platform_user_id=reaction.get("id", ""),
                        username=reaction.get("name"),
                        engagement_type="like",
                        engaged_at=datetime.utcnow()
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
                "fields": "id,from,message,created_time",
                "limit": batch_size
            }
            if cursor:
                params["after"] = cursor
            
            try:
                data = await self._make_request(f"{post_id}/comments", params)
                
                engagements = []
                for comment in data.get("data", []):
                    from_user = comment.get("from", {})
                    
                    timestamp = None
                    if "created_time" in comment:
                        try:
                            timestamp = datetime.fromisoformat(comment["created_time"].replace("Z", "+00:00"))
                        except:
                            pass
                    
                    engagements.append(NormalizedEngagement(
                        platform_user_id=from_user.get("id", comment.get("id", "")),
                        username=from_user.get("name"),
                        engagement_type="comment",
                        comment_text=comment.get("message"),
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
