"""
Contestant Submission API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models.campaign import Campaign
from app.models.post import Post
from app.models.follower import Follower
from app.models.engagement import Engagement, EngagementType
from app.models.vote import Vote
from app.config import settings
from app.adapters import get_adapter

router = APIRouter()


class SubmissionRequest(BaseModel):
    username: str  # Twitter handle without @
    post_id: int
    

class SubmissionResponse(BaseModel):
    success: bool
    is_follower: bool
    username: str
    message: str
    vote_counted: bool


@router.post("/submit", response_model=SubmissionResponse)
async def submit_vote(
    submission: SubmissionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Public endpoint for contestants to submit their vote.
    Verifies if the username is a follower of the campaign account.
    """
    # Get post and campaign
    post_result = await db.execute(
        select(Post).where(Post.id == submission.post_id)
    )
    post = post_result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    campaign_result = await db.execute(
        select(Campaign).where(Campaign.id == post.campaign_id)
    )
    campaign = campaign_result.scalar_one_or_none()
    
    # Clean up username (remove @ if present)
    username = submission.username.lstrip('@').lower()
    
    # Try to look up user on Twitter to get their ID
    adapter = get_adapter(campaign.platform)
    
    try:
        user_info = await adapter.lookup_user_by_username(username)
        if not user_info:
            return SubmissionResponse(
                success=False,
                is_follower=False,
                username=username,
                message=f"Could not find Twitter user @{username}",
                vote_counted=False
            )
        
        platform_user_id = user_info.platform_user_id
        display_name = user_info.display_name
        
    except Exception as e:
        return SubmissionResponse(
            success=False,
            is_follower=False,
            username=username,
            message=f"Error looking up user: {str(e)}",
            vote_counted=False
        )
    
    # Check if user is in followers list
    follower_result = await db.execute(
        select(Follower).where(
            Follower.campaign_id == campaign.id,
            Follower.platform_user_id == platform_user_id
        )
    )
    follower = follower_result.scalar_one_or_none()
    
    is_follower = follower is not None
    
    if not is_follower:
        return SubmissionResponse(
            success=True,
            is_follower=False,
            username=username,
            message=f"@{username} is not following @{campaign.official_account_username or 'the official account'}. Vote not counted.",
            vote_counted=False
        )
    
    # User is a follower - create/update their engagement record
    stmt = insert(Engagement).values(
        platform_user_id=platform_user_id,
        username=username,
        engagement_type=EngagementType.LIKE,  # Treating submission as a "like"
        post_id=post.id,
        engaged_at=datetime.utcnow(),
        synced_at=datetime.utcnow()
    ).on_conflict_do_update(
        index_elements=['platform_user_id', 'post_id', 'engagement_type'],
        set_={
            'username': username,
            'synced_at': datetime.utcnow()
        }
    )
    await db.execute(stmt)
    
    # Create vote record
    vote_stmt = insert(Vote).values(
        platform_user_id=platform_user_id,
        username=username,
        post_id=post.id,
        engagement_type=EngagementType.LIKE,
        is_valid=True,
        reason="Verified follower via submission",
        validated_at=datetime.utcnow()
    ).on_conflict_do_update(
        index_elements=['platform_user_id', 'post_id', 'engagement_type'],
        set_={
            'username': username,
            'is_valid': True,
            'reason': "Verified follower via submission",
            'validated_at': datetime.utcnow()
        }
    )
    await db.execute(vote_stmt)
    await db.commit()
    
    return SubmissionResponse(
        success=True,
        is_follower=True,
        username=username,
        message=f"Vote counted! @{username} is a verified follower.",
        vote_counted=True
    )


@router.get("/check/{post_id}/{username}")
async def check_voter_status(
    post_id: int,
    username: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if a username has already voted and their status.
    """
    username = username.lstrip('@').lower()
    
    # Get post
    post_result = await db.execute(
        select(Post).where(Post.id == post_id)
    )
    post = post_result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check for existing vote
    vote_result = await db.execute(
        select(Vote).where(
            Vote.post_id == post_id,
            Vote.username == username
        )
    )
    vote = vote_result.scalar_one_or_none()
    
    if vote:
        return {
            "has_voted": True,
            "is_valid": vote.is_valid,
            "username": username,
            "reason": vote.reason
        }
    
    return {
        "has_voted": False,
        "is_valid": None,
        "username": username,
        "reason": "No vote submitted yet"
    }


@router.get("/posts/{campaign_id}")
async def get_active_posts(
    campaign_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all posts for a campaign that can accept votes.
    """
    result = await db.execute(
        select(Post).where(Post.campaign_id == campaign_id)
    )
    posts = result.scalars().all()
    
    return {
        "posts": [
            {
                "id": p.id,
                "platform_post_id": p.platform_post_id,
                "post_url": p.post_url,
                "caption": p.caption
            }
            for p in posts
        ]
    }
