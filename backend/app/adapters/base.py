"""Base Platform Adapter"""
from abc import ABC, abstractmethod
from typing import List, AsyncGenerator, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class NormalizedUser:
    platform_user_id: str
    username: Optional[str] = None
    display_name: Optional[str] = None


@dataclass
class NormalizedEngagement:
    platform_user_id: str
    username: Optional[str] = None
    engagement_type: str = "like"
    comment_text: Optional[str] = None
    engaged_at: Optional[datetime] = None


class BasePlatformAdapter(ABC):
    @property
    @abstractmethod
    def platform_name(self) -> str:
        pass
    
    @property
    @abstractmethod
    def supports_follower_list(self) -> bool:
        pass
    
    @property
    @abstractmethod
    def supports_likes(self) -> bool:
        pass
    
    @property
    @abstractmethod
    def supports_comments(self) -> bool:
        pass
    
    @abstractmethod
    async def fetch_followers(
        self,
        account_id: str,
        max_results: Optional[int] = None
    ) -> AsyncGenerator[List[NormalizedUser], None]:
        pass
    
    @abstractmethod
    async def fetch_post_likes(
        self,
        post_id: str,
        max_results: Optional[int] = None
    ) -> AsyncGenerator[List[NormalizedEngagement], None]:
        pass
    
    @abstractmethod
    async def fetch_post_comments(
        self,
        post_id: str,
        max_results: Optional[int] = None
    ) -> AsyncGenerator[List[NormalizedEngagement], None]:
        pass
