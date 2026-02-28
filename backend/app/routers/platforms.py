"""
Platform Sync API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.database import get_db
from app.models.campaign import Campaign
from app.enums import PlatformType
from app.models.post import Post
from app.adapters import get_adapter
from app.services.sync_service import SyncService

router = APIRouter()


@router.get("/{platform}/sync-followers/{campaign_id}")
async def sync_followers(
    platform: PlatformType,
    campaign_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Sync followers from a platform for a campaign.
    Runs synchronously and returns the count.
    """
    # Verify campaign exists and matches platform
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign with id {campaign_id} not found"
        )
    
    if campaign.platform != platform:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Campaign platform ({campaign.platform}) does not match requested platform ({platform})"
        )
    
    # Get the appropriate adapter
    try:
        adapter = get_adapter(platform)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Run sync synchronously
    sync_service = SyncService(db, adapter)
    try:
        result = await sync_service.sync_followers(campaign)
        if result.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error syncing followers: {result.get('message', 'Unknown error')}"
            )
        removed = result.get("removed", 0)
        removed_msg = f", {removed} removed (unfollowed)" if removed > 0 else ""
        total = result.get("total", 0)
        return {
            "message": f"Synced {total} followers{removed_msg} for campaign {campaign.name}",
            "campaign_id": campaign_id,
            "platform": platform.value,
            "follower_count": total,
            "removed": removed,
            "status": "completed"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error syncing followers: {str(e)}"
        )


@router.get("/{platform}/sync-engagements/{post_id}")
async def sync_engagements(
    platform: PlatformType,
    post_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Sync engagements (likes and comments) for a specific post.
    Runs synchronously and returns the count.
    """
    # Get post with campaign
    result = await db.execute(
        select(Post).where(Post.id == post_id)
    )
    post = result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Post with id {post_id} not found"
        )
    
    # Get campaign
    campaign_result = await db.execute(
        select(Campaign).where(Campaign.id == post.campaign_id)
    )
    campaign = campaign_result.scalar_one_or_none()
    
    if campaign.platform != platform:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Campaign platform ({campaign.platform}) does not match requested platform ({platform})"
        )
    
    # Get the appropriate adapter
    try:
        adapter = get_adapter(platform)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # For Twitter, fetch and update tweet metrics
    twitter_like_count = None
    twitter_retweet_count = None
    if platform == PlatformType.TWITTER:
        try:
            tweet_details = await adapter.fetch_tweet_details(post.platform_post_id)
            if tweet_details.get("text") and not post.caption:
                text = tweet_details.get("text", "")
                post.caption = text[:100] + "..." if len(text) > 100 else text
            twitter_like_count = tweet_details.get("like_count", 0)
            twitter_retweet_count = tweet_details.get("retweet_count", 0)
            # Save API-reported counts
            post.likes_count = twitter_like_count
            post.shares_count = twitter_retweet_count  # Retweets as shares
            post.comments_count = tweet_details.get("reply_count", 0)  # Replies as comments
            await db.commit()
        except Exception:
            pass  # Don't fail sync if metrics fetch fails
    
    # For YouTube, fetch and update video title if not already set
    video_comment_count = None
    video_like_count = None
    video_view_count = None
    if platform == PlatformType.YOUTUBE:
        try:
            video_details = await adapter.fetch_video_details(post.platform_post_id)
            if video_details.get("title") and not post.caption:
                post.caption = video_details.get("title")
            video_comment_count = video_details.get("comment_count", 0)
            video_like_count = video_details.get("like_count", 0)
            video_view_count = video_details.get("view_count", 0)
            # Save API-reported counts
            post.likes_count = video_like_count
            post.comments_count = video_comment_count
            post.views_count = video_view_count
            await db.commit()
        except Exception:
            pass  # Don't fail sync if title fetch fails
    
    # For Instagram, fetch and update post caption if not already set
    ig_comment_count = None
    ig_like_count = None
    if platform == PlatformType.INSTAGRAM:
        try:
            post_details = await adapter.fetch_post_details(post.platform_post_id)
            if post_details.get("caption") and not post.caption:
                # Truncate caption for display (first 100 chars)
                caption = post_details.get("caption", "")
                post.caption = caption[:100] + "..." if len(caption) > 100 else caption
            ig_comment_count = post_details.get("comments_count", 0)
            ig_like_count = post_details.get("like_count", 0)
            # Save API-reported counts to post
            post.likes_count = ig_like_count
            post.comments_count = ig_comment_count
            await db.commit()
        except Exception:
            pass  # Don't fail sync if caption fetch fails
    
    # For Facebook, fetch and update post message if not already set
    fb_comment_count = None
    fb_like_count = None
    fb_shares_count = None
    if platform == PlatformType.FACEBOOK:
        try:
            post_details = await adapter.fetch_post_details(post.platform_post_id)
            if post_details.get("message") and not post.caption:
                # Truncate message for display (first 100 chars)
                message = post_details.get("message", "")
                post.caption = message[:100] + "..." if len(message) > 100 else message
            fb_comment_count = post_details.get("comments_count", 0)
            fb_like_count = post_details.get("reactions_count", 0)
            fb_shares_count = post_details.get("shares_count", 0)
            # Save API-reported counts to post
            post.likes_count = fb_like_count
            post.comments_count = fb_comment_count
            post.shares_count = fb_shares_count
            await db.commit()
        except Exception:
            pass  # Don't fail sync if message fetch fails
    
    # Run sync synchronously
    sync_service = SyncService(db, adapter)
    try:
        result = await sync_service.sync_engagements(post)
        if result.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error syncing engagements: {result.get('message', 'Unknown error')}"
            )
        removed = result.get("removed", 0)
        removed_msg = f", {removed} removed" if removed > 0 else ""
        
        # Set engagement label based on platform
        if platform in [PlatformType.YOUTUBE, PlatformType.INSTAGRAM]:
            engagement_label = "comments"
        elif platform == PlatformType.FACEBOOK:
            engagement_label = "reactions"
        else:
            engagement_label = "retweets"
        
        response_data = {
            "message": f"Synced {result.get('total', 0)} unique {engagement_label}{removed_msg} for post {post.platform_post_id}",
            "post_id": post_id,
            "platform": platform.value,
            "engagement_count": result.get("total", 0),
            "likes": result.get("synced_likes", 0),
            "comments": result.get("synced_comments", 0),
            "removed": removed,
            "status": "completed",
            "likes_count": post.likes_count or 0,
            "comments_count": post.comments_count or 0,
            "shares_count": post.shares_count or 0,
            "views_count": post.views_count or 0
        }
        
        # Add Twitter-specific info
        if platform == PlatformType.TWITTER:
            response_data["twitter_total_likes"] = twitter_like_count or 0
            response_data["twitter_total_retweets"] = twitter_retweet_count or 0
            response_data["note"] = "Tracking retweeters as votes (likers not accessible via API)"
        
        # Add YouTube-specific info
        if platform == PlatformType.YOUTUBE:
            response_data["youtube_total_likes"] = video_like_count or 0
            response_data["youtube_total_comments"] = video_comment_count or 0
            response_data["youtube_total_views"] = video_view_count or 0
            response_data["note"] = "YouTube does not expose who liked - only commenters can be tracked"
        
        # Add Instagram-specific info
        if platform == PlatformType.INSTAGRAM and ig_comment_count is not None:
            response_data["instagram_total_comments"] = ig_comment_count
            response_data["instagram_total_likes"] = ig_like_count or 0
            response_data["note"] = "Instagram API does not expose liker identities - only commenters can be tracked"
        
        # Add Facebook-specific info
        if platform == PlatformType.FACEBOOK:
            response_data["facebook_total_reactions"] = fb_like_count or 0
            response_data["facebook_total_comments"] = fb_comment_count or 0
            response_data["facebook_total_shares"] = fb_shares_count or 0
            response_data["note"] = "Only reactions from users with public profiles can be tracked"
        
        return response_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error syncing engagements: {str(e)}"
        )


@router.get("/{platform}/sync-all/{campaign_id}")
async def sync_all_campaign(
    platform: PlatformType,
    campaign_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Sync all followers and engagements for an entire campaign.
    """
    # Verify campaign
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign with id {campaign_id} not found"
        )
    
    if campaign.platform != platform:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Campaign platform mismatch"
        )
    
    # Get adapter
    try:
        adapter = get_adapter(platform)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Run full sync synchronously
    sync_service = SyncService(db, adapter)
    try:
        # For YouTube, also fetch video titles for all posts
        if platform == PlatformType.YOUTUBE:
            posts_result = await db.execute(
                select(Post).where(Post.campaign_id == campaign_id)
            )
            posts = posts_result.scalars().all()
            for post in posts:
                try:
                    video_details = await adapter.fetch_video_details(post.platform_post_id)
                    if video_details.get("title"):
                        post.caption = video_details.get("title")
                except Exception:
                    pass
            await db.commit()
        
        result = await sync_service.sync_campaign_full(campaign)
        follower_count = result.get("followers", {}).get("synced", 0) if result.get("followers") else 0
        engagement_count = sum(p.get("total", 0) for p in result.get("posts", []))
        return {
            "message": f"Successfully completed full sync for campaign {campaign.name}",
            "campaign_id": campaign_id,
            "platform": platform.value,
            "follower_count": follower_count,
            "engagement_count": engagement_count,
            "posts_synced": len(result.get("posts", [])),
            "status": "completed"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during full sync: {str(e)}"
        )


@router.get("/youtube/refresh-titles/{campaign_id}")
async def refresh_youtube_titles(
    campaign_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh video titles for all YouTube posts in a campaign.
    """
    # Verify campaign is YouTube
    result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Campaign with id {campaign_id} not found"
        )
    
    if campaign.platform != PlatformType.YOUTUBE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint is only for YouTube campaigns"
        )
    
    # Get all posts
    posts_result = await db.execute(
        select(Post).where(Post.campaign_id == campaign_id)
    )
    posts = posts_result.scalars().all()
    
    from app.adapters.youtube import YouTubeAdapter
    adapter = YouTubeAdapter()
    
    updated = []
    for post in posts:
        try:
            video_details = await adapter.fetch_video_details(post.platform_post_id)
            if video_details.get("title"):
                post.caption = video_details.get("title")
                updated.append({
                    "post_id": post.id,
                    "video_id": post.platform_post_id,
                    "title": video_details.get("title")
                })
        except Exception as e:
            updated.append({
                "post_id": post.id,
                "video_id": post.platform_post_id,
                "error": str(e)
            })
    
    await db.commit()
    
    return {
        "message": f"Refreshed titles for {len(updated)} videos",
        "campaign_id": campaign_id,
        "videos": updated
    }
