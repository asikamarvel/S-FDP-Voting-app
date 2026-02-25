"""
Sync Service - Handles syncing followers and engagements from platforms
"""
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from sqlalchemy.dialects.sqlite import insert

from app.models.campaign import Campaign
from app.models.post import Post
from app.models.follower import Follower
from app.models.engagement import Engagement, EngagementType
from app.models.vote import Vote
from app.adapters.base import BasePlatformAdapter


class SyncService:
    """
    Handles synchronization of data from social media platforms.
    """
    
    def __init__(self, db: AsyncSession, adapter: BasePlatformAdapter):
        self.db = db
        self.adapter = adapter
    
    async def sync_followers(self, campaign: Campaign) -> dict:
        """
        Sync followers for a campaign's official account.
        Does a FULL SYNC - removes users who unfollowed.
        Returns sync statistics.
        """
        if not self.adapter.supports_follower_list:
            return {
                "status": "unsupported",
                "message": f"Platform {self.adapter.platform_name} does not support follower lists",
                "synced": 0,
                "total": 0
            }
        
        synced_count = 0
        removed_count = 0
        current_follower_ids = set()
        
        try:
            # Fetch and upsert all current followers
            async for batch in self.adapter.fetch_followers(campaign.official_account_id):
                for user in batch:
                    current_follower_ids.add(user.platform_user_id)
                    # Upsert follower - SQLite uses index_elements, not constraint
                    stmt = insert(Follower).values(
                        platform_user_id=user.platform_user_id,
                        username=user.username,
                        display_name=user.display_name,
                        campaign_id=campaign.id,
                        synced_at=datetime.utcnow()
                    ).on_conflict_do_update(
                        index_elements=['platform_user_id', 'campaign_id'],
                        set_={
                            'username': user.username,
                            'display_name': user.display_name,
                            'synced_at': datetime.utcnow()
                        }
                    )
                    await self.db.execute(stmt)
                    synced_count += 1
                
                # Commit in batches
                await self.db.commit()
            
            # Remove followers that no longer exist (unfollowed)
            existing_followers_result = await self.db.execute(
                select(Follower.id, Follower.platform_user_id).where(
                    Follower.campaign_id == campaign.id
                )
            )
            existing_followers = existing_followers_result.all()
            
            for follower_id, user_id in existing_followers:
                if user_id not in current_follower_ids:
                    # Delete the follower
                    await self.db.execute(
                        delete(Follower).where(Follower.id == follower_id)
                    )
                    removed_count += 1
            
            await self.db.commit()
            
            # Get actual count from database
            count_result = await self.db.execute(
                select(func.count(Follower.id)).where(Follower.campaign_id == campaign.id)
            )
            total_count = count_result.scalar() or 0
            
            return {
                "status": "success",
                "synced": synced_count,
                "removed": removed_count,
                "total": total_count,
                "campaign_id": campaign.id
            }
            
        except Exception as e:
            await self.db.rollback()
            return {
                "status": "error",
                "message": str(e),
                "synced": synced_count,
                "total": 0
            }
    
    async def sync_engagements(self, post: Post) -> dict:
        """
        Sync engagements (retweets/likes and comments) for a post.
        Does a FULL SYNC - removes engagements that no longer exist (e.g., unretweets).
        Returns sync statistics.
        """
        synced_likes = 0
        synced_comments = 0
        removed_count = 0
        
        try:
            # Collect all current engagers from platform
            current_like_users = set()
            current_comment_users = set()
            
            # Sync likes/retweets
            if self.adapter.supports_likes:
                async for batch in self.adapter.fetch_post_likes(post.platform_post_id):
                    for engagement in batch:
                        current_like_users.add(engagement.platform_user_id)
                        stmt = insert(Engagement).values(
                            platform_user_id=engagement.platform_user_id,
                            username=engagement.username,
                            engagement_type=EngagementType.LIKE,
                            post_id=post.id,
                            engaged_at=engagement.engaged_at,
                            synced_at=datetime.utcnow()
                        ).on_conflict_do_update(
                            index_elements=['platform_user_id', 'post_id', 'engagement_type'],
                            set_={
                                'username': engagement.username,
                                'synced_at': datetime.utcnow()
                            }
                        )
                        await self.db.execute(stmt)
                        synced_likes += 1
                
                # Remove engagements that no longer exist (unretweets)
                existing_likes_result = await self.db.execute(
                    select(Engagement.id, Engagement.platform_user_id).where(
                        Engagement.post_id == post.id,
                        Engagement.engagement_type == EngagementType.LIKE
                    )
                )
                existing_likes = existing_likes_result.all()
                
                for eng_id, user_id in existing_likes:
                    if user_id not in current_like_users:
                        # Delete the engagement
                        await self.db.execute(
                            delete(Engagement).where(Engagement.id == eng_id)
                        )
                        # Also delete any associated vote
                        await self.db.execute(
                            delete(Vote).where(
                                Vote.post_id == post.id,
                                Vote.platform_user_id == user_id
                            )
                        )
                        removed_count += 1
                
                await self.db.commit()
            
            # Sync comments
            if self.adapter.supports_comments:
                async for batch in self.adapter.fetch_post_comments(post.platform_post_id):
                    for engagement in batch:
                        current_comment_users.add(engagement.platform_user_id)
                        stmt = insert(Engagement).values(
                            platform_user_id=engagement.platform_user_id,
                            username=engagement.username,
                            engagement_type=EngagementType.COMMENT,
                            post_id=post.id,
                            comment_text=engagement.comment_text,
                            engaged_at=engagement.engaged_at,
                            synced_at=datetime.utcnow()
                        ).on_conflict_do_update(
                            index_elements=['platform_user_id', 'post_id', 'engagement_type'],
                            set_={
                                'username': engagement.username,
                                'comment_text': engagement.comment_text,
                                'synced_at': datetime.utcnow()
                            }
                        )
                        await self.db.execute(stmt)
                        synced_comments += 1
                    
                    await self.db.commit()
            
            # Update post last_synced_at
            post.last_synced_at = datetime.utcnow()
            await self.db.commit()
            
            # Get actual count from database (not processed count)
            actual_count_result = await self.db.execute(
                select(func.count(Engagement.id)).where(Engagement.post_id == post.id)
            )
            actual_count = actual_count_result.scalar() or 0
            
            return {
                "status": "success",
                "post_id": post.id,
                "synced_likes": synced_likes,
                "synced_comments": synced_comments,
                "removed": removed_count,
                "total": actual_count  # Return actual database count
            }
            
        except Exception as e:
            await self.db.rollback()
            return {
                "status": "error",
                "message": str(e),
                "synced_likes": synced_likes,
                "synced_comments": synced_comments
            }
    
    async def sync_campaign_full(self, campaign: Campaign) -> dict:
        """
        Full sync: followers + all posts' engagements for a campaign.
        """
        results = {
            "campaign_id": campaign.id,
            "followers": None,
            "posts": []
        }
        
        # Sync followers
        results["followers"] = await self.sync_followers(campaign)
        
        # Get all posts for this campaign
        posts_result = await self.db.execute(
            select(Post).where(Post.campaign_id == campaign.id)
        )
        posts = posts_result.scalars().all()
        
        # Sync each post
        for post in posts:
            post_result = await self.sync_engagements(post)
            results["posts"].append(post_result)
        
        return results
