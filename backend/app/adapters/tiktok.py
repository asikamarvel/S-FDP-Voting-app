"""
TikTok Platform Adapter
Uses TikTok API for Business (Research API)
Note: TikTok API is unstable - comment-based validation preferred
"""
import httpx
from typing import List, AsyncGenerator, Optional
import asyncio
from datetime import datetime

from app.adapters.base import BasePlatformAdapter, NormalizedUser, NormalizedEngagement
from app.config import settings


class TikTokAdapter(BasePlatformAdapter):
    """
    TikTok adapter.
    WARNING: TikTok's API access is limited and changes frequently.
    Comment-based validation is recommended.
    """
    
    BASE_URL = "https://open.tiktokapis.com/v2"
    
    def __init__(self):
        self.access_token = settings.tiktok_access_token
        
    @property
    def platform_name(self) -> str:
        return "tiktok"
    
    @property
    def supports_follower_list(self) -> bool:
        return False  # TikTok API has limited support
    
    @property
    def supports_likes(self) -> bool:
        return False  # TikTok doesn't expose who liked a video
    
    @property
    def supports_comments(self) -> bool:
        return True  # Best available option for TikTok
    
    async def _make_request(self, endpoint: str, params: dict = None, method: str = "GET") -> dict:
        """Make an authenticated request to the TikTok API"""
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            if method == "GET":
                response = await client.get(
                    f"{self.BASE_URL}/{endpoint}",
                    params=params or {},
                    headers=headers,
                    timeout=30.0
                )
            else:
                response = await client.post(
                    f"{self.BASE_URL}/{endpoint}",
                    json=params or {},
                    headers=headers,
                    timeout=30.0
                )
            response.raise_for_status()
            return response.json()
    
    async def fetch_followers(
        self,
        account_id: str,
        max_results: Optional[int] = None
    ) -> AsyncGenerator[List[NormalizedUser], None]:
        """
        TikTok doesn't reliably expose follower lists via API.
        This is a placeholder for potential future API support.
        """
        # TikTok's API doesn't provide follower lists for most use cases
        # Alternative: Use comment-based validation only
        return
        yield
    
    async def fetch_post_likes(
        self,
        post_id: str,
        max_results: Optional[int] = None
    ) -> AsyncGenerator[List[NormalizedEngagement], None]:
        """
        TikTok doesn't expose who liked a video.
        """
        return
        yield
    
    async def fetch_post_comments(
        self,
        post_id: str,
        max_results: Optional[int] = None
    ) -> AsyncGenerator[List[NormalizedEngagement], None]:
        """
        Fetch comments on a TikTok video.
        Note: API availability may vary based on account type and permissions.
        """
        cursor = 0
        fetched = 0
        batch_size = min(50, max_results or 50)  # TikTok typically limits to 50
        
        while True:
            params = {
                "video_id": post_id,
                "max_count": batch_size,
                "cursor": cursor
            }
            
            try:
                # Note: This endpoint structure may change
                # TikTok's API is known to be unstable
                data = await self._make_request("video/comment/list/", params, method="POST")
                
                engagements = []
                for comment in data.get("data", {}).get("comments", []):
                    # TikTok uses unique user IDs
                    user = comment.get("user", {})
                    
                    timestamp = None
                    if "create_time" in comment:
                        try:
                            timestamp = datetime.fromtimestamp(comment["create_time"])
                        except:
                            pass
                    
                    engagements.append(NormalizedEngagement(
                        platform_user_id=user.get("unique_id") or user.get("id", ""),
                        username=user.get("unique_id") or user.get("nickname"),
                        engagement_type="comment",
                        comment_text=comment.get("text"),
                        engaged_at=timestamp
                    ))
                
                if engagements:
                    yield engagements
                    fetched += len(engagements)
                
                # Check pagination
                has_more = data.get("data", {}).get("has_more", False)
                cursor = data.get("data", {}).get("cursor", 0)
                
                if not has_more or (max_results and fetched >= max_results):
                    break
                
                # Rate limiting
                await asyncio.sleep(1)
                
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    # Rate limited
                    await asyncio.sleep(60)
                    continue
                elif e.response.status_code in (401, 403):
                    # API access issue - log and stop
                    break
                raise
            except Exception:
                # TikTok API can be unreliable - fail gracefully
                break
