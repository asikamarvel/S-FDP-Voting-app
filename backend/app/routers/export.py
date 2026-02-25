"""
CSV Export API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import pandas as pd
from io import StringIO
from typing import Optional, List

from app.database import get_db
from app.models.campaign import Campaign
from app.models.post import Post
from app.models.vote import Vote
from app.schemas.export import ExportRequest

router = APIRouter()


@router.get("/csv/{campaign_id}")
async def export_campaign_csv(
    campaign_id: int,
    post_ids: Optional[str] = None,  # Comma-separated post IDs
    include_invalid: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """
    Export validation results as CSV.
    
    Format:
    platform,post_id,username,engagement_type,is_valid
    """
    # Get campaign
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign with id {campaign_id} not found"
        )
    
    # Get posts
    if post_ids:
        post_id_list = [int(pid.strip()) for pid in post_ids.split(",")]
        posts_result = await db.execute(
            select(Post).where(
                Post.campaign_id == campaign_id,
                Post.id.in_(post_id_list)
            )
        )
    else:
        posts_result = await db.execute(
            select(Post).where(Post.campaign_id == campaign_id)
        )
    
    posts = posts_result.scalars().all()
    
    if not posts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No posts found for export"
        )
    
    # Create post lookup
    post_lookup = {p.id: p.platform_post_id for p in posts}
    post_ids_to_query = list(post_lookup.keys())
    
    # Get votes
    vote_query = select(Vote).where(Vote.post_id.in_(post_ids_to_query))
    if not include_invalid:
        vote_query = vote_query.where(Vote.is_valid == True)
    
    votes_result = await db.execute(vote_query)
    votes = votes_result.scalars().all()
    
    # Build CSV data
    csv_data = []
    for vote in votes:
        csv_data.append({
            "platform": campaign.platform.value,
            "post_id": post_lookup.get(vote.post_id, ""),
            "username": vote.username or vote.platform_user_id,
            "engagement_type": vote.engagement_type.value,
            "is_valid": "TRUE" if vote.is_valid else "FALSE"
        })
    
    # Create DataFrame and export
    df = pd.DataFrame(csv_data)
    
    # Handle empty results
    if df.empty:
        df = pd.DataFrame(columns=["platform", "post_id", "username", "engagement_type", "is_valid"])
    
    # Convert to CSV
    csv_buffer = StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)
    
    # Generate filename
    filename = f"socialvote_{campaign.name.replace(' ', '_')}_{campaign.platform.value}.csv"
    
    return StreamingResponse(
        iter([csv_buffer.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.post("/csv")
async def export_csv_with_options(
    export_request: ExportRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Export CSV with custom options (POST method for complex requests).
    """
    # Get campaign
    result = await db.execute(
        select(Campaign).where(Campaign.id == export_request.campaign_id)
    )
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign with id {export_request.campaign_id} not found"
        )
    
    # Get posts
    if export_request.post_ids:
        posts_result = await db.execute(
            select(Post).where(
                Post.campaign_id == export_request.campaign_id,
                Post.id.in_(export_request.post_ids)
            )
        )
    else:
        posts_result = await db.execute(
            select(Post).where(Post.campaign_id == export_request.campaign_id)
        )
    
    posts = posts_result.scalars().all()
    
    if not posts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No posts found for export"
        )
    
    # Create post lookup
    post_lookup = {p.id: p.platform_post_id for p in posts}
    post_ids_to_query = list(post_lookup.keys())
    
    # Get votes
    vote_query = select(Vote).where(Vote.post_id.in_(post_ids_to_query))
    if not export_request.include_invalid:
        vote_query = vote_query.where(Vote.is_valid == True)
    
    votes_result = await db.execute(vote_query)
    votes = votes_result.scalars().all()
    
    # Build CSV data
    csv_data = []
    for vote in votes:
        csv_data.append({
            "platform": campaign.platform.value,
            "post_id": post_lookup.get(vote.post_id, ""),
            "username": vote.username or vote.platform_user_id,
            "engagement_type": vote.engagement_type.value,
            "is_valid": "TRUE" if vote.is_valid else "FALSE"
        })
    
    # Create DataFrame
    df = pd.DataFrame(csv_data)
    
    if df.empty:
        df = pd.DataFrame(columns=["platform", "post_id", "username", "engagement_type", "is_valid"])
    
    # Convert to CSV
    csv_buffer = StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)
    
    filename = f"socialvote_{campaign.name.replace(' ', '_')}_{campaign.platform.value}.csv"
    
    return StreamingResponse(
        iter([csv_buffer.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
