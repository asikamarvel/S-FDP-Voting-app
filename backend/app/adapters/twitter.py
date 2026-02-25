"""
Twitter/X Platform Adapter
Uses Twitter API v2
"""
import httpx
from typing import List, AsyncGenerator, Optional
import asyncio
from datetime import datetime

from app.adapters.base import BasePlatformAdapter, NormalizedUser, NormalizedEngagement
from app.config import settings


class TwitterAdapter(BasePlatformAdapter):
    """
    Twitter/X adapter using API v2.
    Note: Some endpoints may require paid API tiers.
    """
    
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
        return True  # Using retweeters as "likes" since liking_users requires OAuth User Context
    
    @property
    def supports_comments(self) -> bool:
        return True  # Replies/Quote tweets
    
    async def _make_request(self, endpoint: str, params: dict = None) -> dict:
        """Make an authenticated request to the Twitter API"""
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
        """
        Fetch followers for a Twitter account.
        Uses GET /2/users/:id/followers
        """
        pagination_token = None
        fetched = 0
        batch_size = min(1000, max_results or 1000)  # Twitter max is 1000
        
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
                
                # Check pagination
                meta = data.get("meta", {})
                pagination_token = meta.get("next_token")
                
                if not pagination_token or (max_results and fetched >= max_results):
                    break
                
                # Rate limiting - Twitter has strict limits
                await asyncio.sleep(1)
                
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    # Rate limited - wait 15 minutes (Twitter reset window)
                    await asyncio.sleep(900)
                    continue
                raise
    
    async def fetch_post_likes(
        self,
        post_id: str,
        max_results: Optional[int] = None
    ) -> AsyncGenerator[List[NormalizedEngagement], None]:
        """
        Fetch users who retweeted a tweet (using retweets since likes require OAuth User Context).
        Uses GET /2/tweets/:id/retweeted_by
        
        Note: Twitter's liking_users endpoint requires OAuth 2.0 User Context.
        We use retweeters instead, which works with Bearer Token.
        """
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
                        engagement_type="like",  # Treating retweets as engagement votes
                        engaged_at=datetime.utcnow()
                    ))
                
                if engagements:
                    yield engagements
                    fetched += len(engagements)
                
                # Check pagination
                meta = data.get("meta", {})
                pagination_token = meta.get("next_token")
                
                if not pagination_token or (max_results and fetched >= max_results):
                    break
                
                await asyncio.sleep(1)
                
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    await asyncio.sleep(900)
                    continue
                # No data is fine - just means no retweets
                if e.response.status_code == 404:
                    break
                raise
    
    async def fetch_post_comments(
        self,
        post_id: str,
        max_results: Optional[int] = None
    ) -> AsyncGenerator[List[NormalizedEngagement], None]:
        """
        Fetch replies to a tweet.
        Uses Search API to find replies to the tweet.
        """
        pagination_token = None
        fetched = 0
        batch_size = min(100, max_results or 100)
        
        while True:
            # Search for replies to this tweet
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
                
                # Build user lookup from includes
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
                
                # Check pagination
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
        """
        Look up a Twitter user by their username.
        Uses GET /2/users/by/username/:username
        """
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
        """
        Fetch tweet details including public metrics (likes, retweets, etc).
        Uses GET /2/tweets/:id with tweet.fields=public_metrics
        """
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
