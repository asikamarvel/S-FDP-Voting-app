"""
Post Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class PostBase(BaseModel):
    platform_post_id: str = Field(..., min_length=1, max_length=255)
    post_url: Optional[str] = None
    caption: Optional[str] = None


class PostCreate(PostBase):
    campaign_id: int


class PostResponse(PostBase):
    id: int
    campaign_id: int
    created_at: datetime
    last_synced_at: Optional[datetime] = None
    engagement_count: Optional[int] = 0
    valid_vote_count: Optional[int] = 0
    invalid_vote_count: Optional[int] = 0
    likes_count: Optional[int] = 0  # API-reported likes/reactions count
    comments_count: Optional[int] = 0  # API-reported comments count
    shares_count: Optional[int] = 0  # Retweets/Shares count
    views_count: Optional[int] = 0   # Views count (YouTube)
    
    class Config:
        from_attributes = True


class PostList(BaseModel):
    posts: List[PostResponse]
    total: int
