"""
Facebook Platform Adapter
Uses Facebook Graph API for Page posts
"""
import httpx
from typing import List, AsyncGenerator, Optional
import asyncio
from datetime import datetime

from app.adapters.base import BasePlatformAdapter, NormalizedUser, NormalizedEngagement
from app.config import settings


class FacebookAdapter(BasePlatformAdapter):
    """
    Facebook adapter using the Graph API.
    Requires a Facebook Page with proper permissions.
    
    LIMITATIONS:
    - Follower list NOT accessible via API
    - Reactions list limited to users who have public settings or authorized the app
    - Comments ARE accessible with user info
    """
    
    BASE_URL = "https://graph.facebook.com/v18.0"
    
    def __init__(self):
        self.user_access_token = settings.facebook_access_token
        self.page_id = settings.facebook_page_id
        self._page_token = None
        
    @property
    def platform_name(self) -> str:
        return "facebook"
    
    @property
    def supports_follower_list(self) -> bool:
        return False  # Facebook doesn't expose follower/fan lists
    
    @property
    def supports_likes(self) -> bool:
        return True  # Reactions are accessible (limited by privacy)
    
    @property
    def supports_comments(self) -> bool:
        return True
    
    async def _get_page_token(self) -> str:
        """Get Page Access Token from User Access Token"""
        if self._page_token:
            return self._page_token
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/me/accounts",
                params={
                    "fields": "id,access_token",
                    "access_token": self.user_access_token
                },
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            
            for page in data.get("data", []):
                if page["id"] == self.page_id:
                    self._page_token = page["access_token"]
                    return self._page_token
            
            # Fallback to user token if page not found
            self._page_token = self.user_access_token
            return self._page_token
    
    async def _make_request(self, endpoint: str, params: dict = None) -> dict:
        """Make an authenticated request to the Graph API using Page token"""
        if params is None:
            params = {}
        
        page_token = await self._get_page_token()
        params["access_token"] = page_token
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{endpoint}",
                params=params,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    
    async def fetch_post_details(self, post_id: str) -> dict:
        """
        Fetch post details including message and engagement counts.
        """
        try:
            data = await self._make_request(post_id, {
                "fields": "id,message,created_time,shares,reactions.summary(true),comments.summary(true)"
            })
            
            reactions_count = data.get("reactions", {}).get("summary", {}).get("total_count", 0)
            comments_count = data.get("comments", {}).get("summary", {}).get("total_count", 0)
            shares_count = data.get("shares", {}).get("count", 0) if data.get("shares") else 0
            
            return {
                "id": data.get("id"),
                "message": data.get("message"),
                "created_time": data.get("created_time"),
                "reactions_count": reactions_count,
                "comments_count": comments_count,
                "shares_count": shares_count,
                "total_engagement": reactions_count + comments_count + shares_count
            }
        except Exception as e:
            return {"message": None, "reactions_count": 0, "error": str(e)}
    
    async def fetch_followers(
        self,
        account_id: str,
        max_results: Optional[int] = None
    ) -> AsyncGenerator[List[NormalizedUser], None]:
        """
        Facebook does NOT expose follower/fan lists via API.
        This method exists for interface compatibility but yields nothing.
        """
        return
        yield  # Make this a generator
    
    async def fetch_post_likes(
        self,
        post_id: str,
        max_results: Optional[int] = None
    ) -> AsyncGenerator[List[NormalizedEngagement], None]:
        """
        Fetch users who reacted to a Facebook post.
        Note: Only returns users with public privacy settings or who authorized the app.
        """
        cursor = None
        fetched = 0
        batch_size = 100
        
        while True:
            params = {
                "fields": "id,name,type",
                "limit": batch_size
            }
            if cursor:
                params["after"] = cursor
            
            try:
                data = await self._make_request(f"{post_id}/reactions", params)
                
                engagements = []
                for reaction in data.get("data", []):
                    engagements.append(NormalizedEngagement(
                        platform_user_id=reaction["id"],
                        username=reaction.get("name"),  # Facebook uses name, not username
                        engagement_type="like",  # Treat all reactions as likes for voting
                        engaged_at=datetime.utcnow()
                    ))
                
                if engagements:
                    yield engagements
                    fetched += len(engagements)
                
                # Check pagination
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
        """
        Fetch users who commented on a Facebook post.
        """
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
                            timestamp = datetime.fromisoformat(comment["created_time"].replace("Z", "+00:00").replace("+0000", "+00:00"))
                        except:
                            pass
                    
                    engagements.append(NormalizedEngagement(
                        platform_user_id=from_user.get("id", comment.get("id", "")),
                        username=from_user.get("name"),  # Facebook uses name
                        engagement_type="comment",
                        comment_text=comment.get("message"),
                        engaged_at=timestamp
                    ))
                
                if engagements:
                    yield engagements
                    fetched += len(engagements)
                
                # Check pagination
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
