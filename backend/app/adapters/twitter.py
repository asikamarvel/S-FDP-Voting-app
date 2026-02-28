"""Twitter/X Platform Adapter - API v2"""
import httpx
from typing import List, AsyncGenerator, Optional
import asyncio
from datetime import datetime

from app.adapters.base import BasePlatformAdapter, NormalizedUser, NormalizedEngagement
from app.config import settings


class TwitterAdapter(BasePlatformAdapter):
    BASE_URL = "https://api.twitter.com/2"
    
    def __init__(self):
        self.bearer_token = settings.twitter_bearer_token
        
    @property
    def platform_name(self) -> str:
        return "twitter"
    
    @property
    def supports_follower_list(self) -> bool:
        return True
    
    @property
    def supports_likes(self) -> bool:
        return True
    
    @property
    def supports_comments(self) -> bool:
        # Do not treat replies as engagements for validation; only retweets are tracked
        return False
    
    async def _make_request(self, endpoint: str, params: dict = None) -> dict:
        headers = {
            "Authorization": f"Bearer {self.bearer_token}",
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{endpoint}",
                params=params or {},
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
        pagination_token = None
        fetched = 0
        batch_size = min(1000, max_results or 1000)
        
        while True:
            params = {
                "user.fields": "id,username,name",
                "max_results": batch_size
            }
            if pagination_token:
                params["pagination_token"] = pagination_token
            
            try:
                data = await self._make_request(f"users/{account_id}/followers", params)
                
                users = []
                for follower in data.get("data", []):
                    users.append(NormalizedUser(
                        platform_user_id=follower["id"],
                        username=follower.get("username"),
                        display_name=follower.get("name")
                    ))
                
                if users:
                    yield users
                    fetched += len(users)
                
                meta = data.get("meta", {})
                pagination_token = meta.get("next_token")
                
                if not pagination_token or (max_results and fetched >= max_results):
                    break
                
                await asyncio.sleep(1)
                
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    await asyncio.sleep(900)
                    continue
                raise
    
    async def fetch_post_likes(
        self,
        post_id: str,
        max_results: Optional[int] = None
    ) -> AsyncGenerator[List[NormalizedEngagement], None]:
        pagination_token = None
        fetched = 0
        batch_size = min(100, max_results or 100)
        
        while True:
            params = {
                "user.fields": "id,username,name",
                "max_results": batch_size
            }
            if pagination_token:
                params["pagination_token"] = pagination_token
            
            try:
                data = await self._make_request(f"tweets/{post_id}/retweeted_by", params)
                
                engagements = []
                for user in data.get("data", []):
                    engagements.append(NormalizedEngagement(
                        platform_user_id=user["id"],
                        username=user.get("username"),
                        engagement_type="like",
                        engaged_at=datetime.utcnow()
                    ))
                
                if engagements:
                    yield engagements
                    fetched += len(engagements)
                
                meta = data.get("meta", {})
                pagination_token = meta.get("next_token")
                
                if not pagination_token or (max_results and fetched >= max_results):
                    break
                
                await asyncio.sleep(1)
                
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    await asyncio.sleep(900)
                    continue
                if e.response.status_code == 404:
                    break
                raise
    
    async def fetch_post_comments(
        self,
        post_id: str,
        max_results: Optional[int] = None
    ) -> AsyncGenerator[List[NormalizedEngagement], None]:
        pagination_token = None
        fetched = 0
        batch_size = min(100, max_results or 100)
        
        while True:
            params = {
                "query": f"conversation_id:{post_id}",
                "tweet.fields": "author_id,created_at,text",
                "expansions": "author_id",
                "user.fields": "id,username,name",
                "max_results": batch_size
            }
            if pagination_token:
                params["next_token"] = pagination_token
            
            try:
                data = await self._make_request("tweets/search/recent", params)
                
                user_lookup = {}
                for user in data.get("includes", {}).get("users", []):
                    user_lookup[user["id"]] = user
                
                engagements = []
                for tweet in data.get("data", []):
                    author_id = tweet.get("author_id")
                    user = user_lookup.get(author_id, {})
                    
                    timestamp = None
                    if "created_at" in tweet:
                        try:
                            timestamp = datetime.fromisoformat(tweet["created_at"].replace("Z", "+00:00"))
                        except:
                            pass
                    
                    engagements.append(NormalizedEngagement(
                        platform_user_id=author_id,
                        username=user.get("username"),
                        engagement_type="comment",
                        comment_text=tweet.get("text"),
                        engaged_at=timestamp
                    ))
                
                if engagements:
                    yield engagements
                    fetched += len(engagements)
                
                meta = data.get("meta", {})
                pagination_token = meta.get("next_token")
                
                if not pagination_token or (max_results and fetched >= max_results):
                    break
                
                await asyncio.sleep(1)
                
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    await asyncio.sleep(900)
                    continue
                raise

    async def lookup_user_by_username(self, username: str) -> Optional[NormalizedUser]:
        try:
            data = await self._make_request(
                f"users/by/username/{username}",
                params={"user.fields": "id,username,name"}
            )
            
            user_data = data.get("data")
            if not user_data:
                return None
            
            return NormalizedUser(
                platform_user_id=user_data["id"],
                username=user_data.get("username"),
                display_name=user_data.get("name")
            )
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            raise

    async def fetch_tweet_details(self, tweet_id: str) -> dict:
        try:
            data = await self._make_request(
                f"tweets/{tweet_id}",
                params={
                    "tweet.fields": "public_metrics,created_at,text",
                    "expansions": "author_id",
                    "user.fields": "username"
                }
            )
            
            tweet_data = data.get("data", {})
            metrics = tweet_data.get("public_metrics", {})
            
            return {
                "id": tweet_data.get("id"),
                "text": tweet_data.get("text"),
                "created_at": tweet_data.get("created_at"),
                "like_count": metrics.get("like_count", 0),
                "retweet_count": metrics.get("retweet_count", 0),
                "reply_count": metrics.get("reply_count", 0),
                "quote_count": metrics.get("quote_count", 0),
                "impression_count": metrics.get("impression_count", 0)
            }
        except Exception as e:
            return {"like_count": 0, "retweet_count": 0, "error": str(e)}
