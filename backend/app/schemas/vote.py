"""
Vote Schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.engagement import EngagementType


class VoteBase(BaseModel):
    platform_user_id: str
    username: Optional[str] = None
    engagement_type: EngagementType
    is_valid: bool
    reason: Optional[str] = None


class VoteResponse(VoteBase):
    id: int
    post_id: int
    validated_at: datetime
    
    class Config:
        from_attributes = True


class ValidationResult(BaseModel):
    post_id: int
    total_engagements: int
    valid_votes: int
    invalid_votes: int
    validation_rate: float  # Percentage of valid votes
    votes: List[VoteResponse]


class ValidationSummary(BaseModel):
    campaign_id: int
    campaign_name: str
    platform: str
    total_posts: int
    total_engagements: int
    total_valid_votes: int
    total_invalid_votes: int
    overall_validation_rate: float
