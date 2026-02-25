"""
Export Schemas
"""
from pydantic import BaseModel
from typing import Optional, List


class ExportRequest(BaseModel):
    campaign_id: int
    post_ids: Optional[List[int]] = None  # If None, export all posts in campaign
    include_invalid: bool = True  # Include invalid votes in export


class ExportRow(BaseModel):
    platform: str
    post_id: str
    username: str
    engagement_type: str
    is_valid: str  # "TRUE" or "FALSE" as per spec
