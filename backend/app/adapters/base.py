"""
Base Platform Adapter - Abstract interface for all platform adapters
"""
from abc import ABC, abstractmethod
from typing import List, AsyncGenerator, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class NormalizedUser:
    """Normalized user representation across platforms"""
    platform_user_id: str
    username: Optional[str] = None
    display_name: Optional[str] = None


@dataclass
class NormalizedEngagement:
    """Normalized engagement representation"""
    platform_user_id: str
    engagement_type: str  # 'like' or 'comment'
    username: Optional[str] = None
    comment_text: Optional[str] = None
    engaged_at: Optional[datetime] = None


class BasePlatformAdapter(ABC):
    """
    Abstract base class for platform adapters.
    Each platform must implement these methods.
    """
    
    @property
    @abstractmethod
    def platform_name(self) -> str:
        """Return the platform name"""
        pass
    
    @property
    @abstractmethod
    def supports_follower_list(self) -> bool:
        """Whether this platform supports fetching follower lists"""
        pass
    
    @property
    @abstractmethod
    def supports_likes(self) -> bool:
        """Whether this platform supports fetching who liked a post"""
        pass
    
    @property
    @abstractmethod
    def supports_comments(self) -> bool:
        """Whether this platform supports fetching commenters"""
        pass
    
    @abstractmethod
    async def fetch_followers(
        self, 
        account_id: str,
        max_results: Optional[int] = None
    ) -> AsyncGenerator[List[NormalizedUser], None]:
        """
        Fetch followers for an account.
        Yields batches of normalized users for pagination handling.
        """
        pass
    
    @abstractmethod
    async def fetch_post_likes(
        self,
        post_id: str,
        max_results: Optional[int] = None
    ) -> AsyncGenerator[List[NormalizedEngagement], None]:
        """
        Fetch users who liked a post.
        Yields batches of normalized engagements.
        """
        pass
    
    @abstractmethod
    async def fetch_post_comments(
        self,
        post_id: str,
        max_results: Optional[int] = None
    ) -> AsyncGenerator[List[NormalizedEngagement], None]:
        """
        Fetch users who commented on a post.
        Yields batches of normalized engagements.
        """
        pass
    
    async def fetch_all_engagements(
        self,
        post_id: str,
        max_results: Optional[int] = None
    ) -> AsyncGenerator[List[NormalizedEngagement], None]:
        """
        Fetch all engagements (likes + comments) for a post.
        Default implementation combines likes and comments.
        """
        if self.supports_likes:
            async for batch in self.fetch_post_likes(post_id, max_results):
                yield batch
        
        if self.supports_comments:
            async for batch in self.fetch_post_comments(post_id, max_results):
                yield batch
