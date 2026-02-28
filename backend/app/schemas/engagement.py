"""
Engagement Schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.enums import EngagementType


class EngagementBase(BaseModel):
    platform_user_id: str
    username: Optional[str] = None
    engagement_type: EngagementType


class EngagementResponse(EngagementBase):
    id: int
    post_id: int
    comment_text: Optional[str] = None
    engaged_at: Optional[datetime] = None
    synced_at: datetime
    
    class Config:
        from_attributes = True
