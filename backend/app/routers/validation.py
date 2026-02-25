"""
Vote Validation API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List

from app.database import get_db
from app.models.campaign import Campaign
from app.models.post import Post
from app.models.vote import Vote
from app.schemas.vote import VoteResponse, ValidationResult, ValidationSummary
from app.services.validation_service import ValidationService

router = APIRouter()


@router.post("/votes/{post_id}", response_model=ValidationResult)
async def validate_post_votes(
    post_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Validate all engagements for a specific post.
    Compares engagements against the campaign's follower list.
    """
    # Get post
    result = await db.execute(
        select(Post).where(Post.id == post_id)
    )
    post = result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Post with id {post_id} not found"
        )
    
    # Run validation
    validation_service = ValidationService(db)
    validation_result = await validation_service.validate_post(post)
    
    return validation_result


@router.post("/campaign/{campaign_id}")
async def validate_campaign_votes(
    campaign_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Validate all posts in a campaign.
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
    
    # Get all posts
    posts_result = await db.execute(
        select(Post).where(Post.campaign_id == campaign_id)
    )
    posts = posts_result.scalars().all()
    
    if not posts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No posts found in this campaign"
        )
    
    # Validate each post
    validation_service = ValidationService(db)
    results = []
    
    for post in posts:
        result = await validation_service.validate_post(post)
        results.append(result)
    
    # Calculate totals
    total_engagements = sum(r.total_engagements for r in results)
    total_valid = sum(r.valid_votes for r in results)
    total_invalid = sum(r.invalid_votes for r in results)
    
    return {
        "campaign_id": campaign_id,
        "campaign_name": campaign.name,
        "platform": campaign.platform.value,
        "total_posts": len(posts),
        "total_engagements": total_engagements,
        "total_valid_votes": total_valid,
        "total_invalid_votes": total_invalid,
        "overall_validation_rate": (total_valid / total_engagements * 100) if total_engagements > 0 else 0,
        "post_results": results
    }


@router.get("/results/{post_id}", response_model=List[VoteResponse])
async def get_validation_results(
    post_id: int,
    valid_only: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Get validation results for a post.
    """
    query = select(Vote).where(Vote.post_id == post_id)
    
    if valid_only is not None:
        query = query.where(Vote.is_valid == valid_only)
    
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    votes = result.scalars().all()
    
    return [VoteResponse(
        id=v.id,
        platform_user_id=v.platform_user_id,
        username=v.username,
        post_id=v.post_id,
        engagement_type=v.engagement_type,
        is_valid=v.is_valid,
        reason=v.reason,
        validated_at=v.validated_at
    ) for v in votes]


@router.get("/summary/{campaign_id}", response_model=ValidationSummary)
async def get_campaign_summary(
    campaign_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a summary of validation results for a campaign.
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
    
    # Get post IDs for this campaign
    posts_result = await db.execute(
        select(Post.id).where(Post.campaign_id == campaign_id)
    )
    post_ids = [p for p in posts_result.scalars().all()]
    
    if not post_ids:
        return ValidationSummary(
            campaign_id=campaign_id,
            campaign_name=campaign.name,
            platform=campaign.platform.value,
            total_posts=0,
            total_engagements=0,
            total_valid_votes=0,
            total_invalid_votes=0,
            overall_validation_rate=0
        )
    
    # Count votes
    valid_count_result = await db.execute(
        select(func.count(Vote.id)).where(
            Vote.post_id.in_(post_ids),
            Vote.is_valid == True
        )
    )
    valid_count = valid_count_result.scalar() or 0
    
    invalid_count_result = await db.execute(
        select(func.count(Vote.id)).where(
            Vote.post_id.in_(post_ids),
            Vote.is_valid == False
        )
    )
    invalid_count = invalid_count_result.scalar() or 0
    
    total = valid_count + invalid_count
    
    return ValidationSummary(
        campaign_id=campaign_id,
        campaign_name=campaign.name,
        platform=campaign.platform.value,
        total_posts=len(post_ids),
        total_engagements=total,
        total_valid_votes=valid_count,
        total_invalid_votes=invalid_count,
        overall_validation_rate=(valid_count / total * 100) if total > 0 else 0
    )
