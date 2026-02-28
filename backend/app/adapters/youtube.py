"""YouTube Platform Adapter - Data API v3"""
import httpx
from typing import List, AsyncGenerator, Optional
import asyncio
from datetime import datetime

from app.adapters.base import BasePlatformAdapter, NormalizedUser, NormalizedEngagement
from app.config import settings


class YouTubeAdapter(BasePlatformAdapter):
    BASE_URL = "https://www.googleapis.com/youtube/v3"
    
    def __init__(self):
        self.api_key = settings.youtube_api_key
        
    @property
    def platform_name(self) -> str:
        return "youtube"
    
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
        params["key"] = self.api_key
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{endpoint}",
                params=params,
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    
    async def fetch_video_details(self, video_id: str) -> dict:
        try:
            data = await self._make_request("videos", {
                "part": "snippet,statistics",
                "id": video_id
            })
            
            items = data.get("items", [])
            if not items:
                return {"title": None, "comment_count": 0}
            
            item = items[0]
            snippet = item.get("snippet", {})
            statistics = item.get("statistics", {})
            
            return {
                "title": snippet.get("title"),
                "description": snippet.get("description"),
                "channel_title": snippet.get("channelTitle"),
                "published_at": snippet.get("publishedAt"),
                "comment_count": int(statistics.get("commentCount", 0)),
                "view_count": int(statistics.get("viewCount", 0)),
                "like_count": int(statistics.get("likeCount", 0))
            }
        except Exception as e:
            return {"title": None, "comment_count": 0, "error": str(e)}
    
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
        page_token = None
        fetched = 0
        batch_size = min(100, max_results or 100)
        
        while True:
            params = {
                "part": "snippet",
                "videoId": post_id,
                "maxResults": batch_size,
                "textFormat": "plainText"
            }
            if page_token:
                params["pageToken"] = page_token
            
            try:
                data = await self._make_request("commentThreads", params)
                
                engagements = []
                for item in data.get("items", []):
                    snippet = item.get("snippet", {}).get("topLevelComment", {}).get("snippet", {})
                    channel_id = snippet.get("authorChannelId", {}).get("value", "")
                    
                    timestamp = None
                    if "publishedAt" in snippet:
                        try:
                            timestamp = datetime.fromisoformat(snippet["publishedAt"].replace("Z", "+00:00"))
                        except:
                            pass
                    
                    engagements.append(NormalizedEngagement(
                        platform_user_id=channel_id,
                        username=snippet.get("authorDisplayName"),
                        engagement_type="comment",
                        comment_text=snippet.get("textDisplay"),
                        engaged_at=timestamp
                    ))
                
                if engagements:
                    yield engagements
                    fetched += len(engagements)
                
                page_token = data.get("nextPageToken")
                
                if not page_token or (max_results and fetched >= max_results):
                    break
                
                await asyncio.sleep(0.5)
                
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    await asyncio.sleep(60)
                    continue
                raise
    
    async def fetch_channel_subscribers_who_commented(
        self,
        channel_id: str,
        post_id: str
    ) -> AsyncGenerator[List[NormalizedEngagement], None]:
        async for batch in self.fetch_post_comments(post_id):
            yield batch
