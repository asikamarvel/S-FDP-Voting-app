"""
Campaign Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.enums import PlatformType


class CampaignBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    platform: PlatformType
    official_account_id: str = Field(..., min_length=1, max_length=255)
    official_account_username: Optional[str] = None
    description: Optional[str] = None


class CampaignCreate(CampaignBase):
    pass


class CampaignUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    official_account_id: Optional[str] = Field(None, min_length=1, max_length=255)
    official_account_username: Optional[str] = None
    description: Optional[str] = None


class CampaignResponse(CampaignBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    post_count: Optional[int] = 0
    follower_count: Optional[int] = 0
    
    class Config:
        from_attributes = True


class CampaignList(BaseModel):
    campaigns: List[CampaignResponse]
    total: int
