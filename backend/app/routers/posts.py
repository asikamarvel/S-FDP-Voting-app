"""
Post API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from app.database import get_db
from app.models.post import Post
from app.models.campaign import Campaign
from app.models.engagement import Engagement
from app.models.vote import Vote
from app.schemas.post import PostCreate, PostResponse, PostList

router = APIRouter()


@router.post("/", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    post: PostCreate,
    db: AsyncSession = Depends(get_db)
):
    """Add a post to track for a campaign"""
    # Verify campaign exists
    campaign_result = await db.execute(
        select(Campaign).where(Campaign.id == post.campaign_id)
    )
    campaign = campaign_result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign with id {post.campaign_id} not found"
        )
    
    # Check if post already exists
    existing_result = await db.execute(
        select(Post).where(
            Post.platform_post_id == post.platform_post_id,
            Post.campaign_id == post.campaign_id
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Post already exists in this campaign"
        )
    
    db_post = Post(**post.model_dump())
    db.add(db_post)
    await db.commit()
    await db.refresh(db_post)
    
    return PostResponse(
        id=db_post.id,
        platform_post_id=db_post.platform_post_id,
        campaign_id=db_post.campaign_id,
        post_url=db_post.post_url,
        caption=db_post.caption,
        created_at=db_post.created_at,
        last_synced_at=db_post.last_synced_at,
        engagement_count=0,
        valid_vote_count=0,
        invalid_vote_count=0,
        likes_count=0,
        comments_count=0,
        shares_count=0,
        views_count=0
    )


@router.get("/", response_model=PostList)
async def list_posts(
    campaign_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List posts, optionally filtered by campaign"""
    query = select(Post)
    if campaign_id:
        query = query.where(Post.campaign_id == campaign_id)
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    posts = result.scalars().all()
    
    # Build response with counts
    post_responses = []
    for post in posts:
        # Count engagements
        engagement_count_result = await db.execute(
            select(func.count(Engagement.id)).where(Engagement.post_id == post.id)
        )
        engagement_count = engagement_count_result.scalar() or 0
        
        # Count valid votes
        valid_count_result = await db.execute(
            select(func.count(Vote.id)).where(
                Vote.post_id == post.id,
                Vote.is_valid == True
            )
        )
        valid_count = valid_count_result.scalar() or 0
        
        # Count invalid votes
        invalid_count_result = await db.execute(
            select(func.count(Vote.id)).where(
                Vote.post_id == post.id,
                Vote.is_valid == False
            )
        )
        invalid_count = invalid_count_result.scalar() or 0
        
        post_responses.append(PostResponse(
            id=post.id,
            platform_post_id=post.platform_post_id,
            campaign_id=post.campaign_id,
            post_url=post.post_url,
            caption=post.caption,
            created_at=post.created_at,
            last_synced_at=post.last_synced_at,
            engagement_count=engagement_count,
            valid_vote_count=valid_count,
            invalid_vote_count=invalid_count,
            likes_count=post.likes_count or 0,
            comments_count=post.comments_count or 0,
            shares_count=post.shares_count or 0,
            views_count=post.views_count or 0
        ))
    
    # Get total
    count_query = select(func.count(Post.id))
    if campaign_id:
        count_query = count_query.where(Post.campaign_id == campaign_id)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    return PostList(posts=post_responses, total=total)


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific post"""
    result = await db.execute(
        select(Post).where(Post.id == post_id)
    )
    post = result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Post with id {post_id} not found"
        )
    
    # Get counts
    engagement_count_result = await db.execute(
        select(func.count(Engagement.id)).where(Engagement.post_id == post.id)
    )
    engagement_count = engagement_count_result.scalar() or 0
    
    valid_count_result = await db.execute(
        select(func.count(Vote.id)).where(
            Vote.post_id == post.id,
            Vote.is_valid == True
        )
    )
    valid_count = valid_count_result.scalar() or 0
    
    invalid_count_result = await db.execute(
        select(func.count(Vote.id)).where(
            Vote.post_id == post.id,
            Vote.is_valid == False
        )
    )
    invalid_count = invalid_count_result.scalar() or 0
    
    return PostResponse(
        id=post.id,
        platform_post_id=post.platform_post_id,
        campaign_id=post.campaign_id,
        post_url=post.post_url,
        caption=post.caption,
        created_at=post.created_at,
        last_synced_at=post.last_synced_at,
        engagement_count=engagement_count,
        valid_vote_count=valid_count,
        invalid_vote_count=invalid_count,
        likes_count=post.likes_count or 0,
        comments_count=post.comments_count or 0,
        shares_count=post.shares_count or 0,
        views_count=post.views_count or 0
    )


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a post and all related data"""
    result = await db.execute(
        select(Post).where(Post.id == post_id)
    )
    post = result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Post with id {post_id} not found"
        )
    
    await db.delete(post)
    await db.commit()
