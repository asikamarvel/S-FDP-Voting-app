"""
Campaign API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from app.database import get_db
from app.models.campaign import Campaign
from app.models.post import Post
from app.models.follower import Follower
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignResponse, CampaignList

router = APIRouter()


@router.post("/", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    campaign: CampaignCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new campaign"""
    db_campaign = Campaign(**campaign.model_dump())
    db.add(db_campaign)
    await db.commit()
    await db.refresh(db_campaign)
    
    return CampaignResponse(
        **campaign.model_dump(),
        id=db_campaign.id,
        created_at=db_campaign.created_at,
        post_count=0,
        follower_count=0
    )


@router.get("/", response_model=CampaignList)
async def list_campaigns(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List all campaigns with counts"""
    # Get campaigns with post and follower counts
    result = await db.execute(
        select(Campaign).offset(skip).limit(limit)
    )
    campaigns = result.scalars().all()
    
    # Get counts for each campaign
    campaign_responses = []
    for campaign in campaigns:
        # Count posts
        post_count_result = await db.execute(
            select(func.count(Post.id)).where(Post.campaign_id == campaign.id)
        )
        post_count = post_count_result.scalar() or 0
        
        # Count followers
        follower_count_result = await db.execute(
            select(func.count(Follower.id)).where(Follower.campaign_id == campaign.id)
        )
        follower_count = follower_count_result.scalar() or 0
        
        campaign_responses.append(CampaignResponse(
            id=campaign.id,
            name=campaign.name,
            platform=campaign.platform,
            official_account_id=campaign.official_account_id,
            official_account_username=campaign.official_account_username,
            description=campaign.description,
            created_at=campaign.created_at,
            updated_at=campaign.updated_at,
            post_count=post_count,
            follower_count=follower_count
        ))
    
    # Get total count
    total_result = await db.execute(select(func.count(Campaign.id)))
    total = total_result.scalar() or 0
    
    return CampaignList(campaigns=campaign_responses, total=total)


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific campaign"""
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign with id {campaign_id} not found"
        )
    
    # Get counts
    post_count_result = await db.execute(
        select(func.count(Post.id)).where(Post.campaign_id == campaign.id)
    )
    post_count = post_count_result.scalar() or 0
    
    follower_count_result = await db.execute(
        select(func.count(Follower.id)).where(Follower.campaign_id == campaign.id)
    )
    follower_count = follower_count_result.scalar() or 0
    
    return CampaignResponse(
        id=campaign.id,
        name=campaign.name,
        platform=campaign.platform,
        official_account_id=campaign.official_account_id,
        official_account_username=campaign.official_account_username,
        description=campaign.description,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        post_count=post_count,
        follower_count=follower_count
    )


@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: int,
    campaign_update: CampaignUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a campaign"""
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign with id {campaign_id} not found"
        )
    
    # Update only provided fields
    update_data = campaign_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(campaign, field, value)
    
    from datetime import datetime
    campaign.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(campaign)
    
    # Get counts
    post_count_result = await db.execute(
        select(func.count(Post.id)).where(Post.campaign_id == campaign.id)
    )
    post_count = post_count_result.scalar() or 0
    
    follower_count_result = await db.execute(
        select(func.count(Follower.id)).where(Follower.campaign_id == campaign.id)
    )
    follower_count = follower_count_result.scalar() or 0
    
    return CampaignResponse(
        id=campaign.id,
        name=campaign.name,
        platform=campaign.platform,
        official_account_id=campaign.official_account_id,
        official_account_username=campaign.official_account_username,
        description=campaign.description,
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
        post_count=post_count,
        follower_count=follower_count
    )


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a campaign and all related data"""
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign with id {campaign_id} not found"
        )
    
    await db.delete(campaign)
    await db.commit()
