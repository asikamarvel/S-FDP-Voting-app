"""
Vote Validation Service - Core business logic for validating votes
"""
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert
from typing import Set

from app.models.campaign import Campaign
from app.models.post import Post
from app.models.follower import Follower
from app.models.engagement import Engagement
from app.models.vote import Vote
from app.schemas.vote import VoteResponse, ValidationResult


class ValidationService:
    """
    Core validation engine.
    
    RULE: A vote is VALID if and only if:
    - The account has engaged (like or comment) with the post
    - AND that account exists in the official account's follower list
    
    Otherwise, VALID = FALSE
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def _get_follower_ids(self, campaign_id: int) -> Set[str]:
        """
        Get all follower IDs for a campaign as a set for O(1) lookup.
        """
        result = await self.db.execute(
            select(Follower.platform_user_id).where(
                Follower.campaign_id == campaign_id
            )
        )
        return set(result.scalars().all())
    
    async def validate_post(self, post: Post) -> ValidationResult:
        """
        Validate all engagements for a single post.
        
        Returns ValidationResult with counts and individual vote results.
        """
        # Get campaign for this post
        campaign_result = await self.db.execute(
            select(Campaign).where(Campaign.id == post.campaign_id)
        )
        campaign = campaign_result.scalar_one()
        
        # Get follower IDs as a set for fast lookup
        follower_ids = await self._get_follower_ids(campaign.id)
        
        # Get all engagements for this post
        engagements_result = await self.db.execute(
            select(Engagement).where(Engagement.post_id == post.id)
        )
        engagements = engagements_result.scalars().all()
        
        votes = []
        valid_count = 0
        invalid_count = 0
        
        for engagement in engagements:
            # CORE VALIDATION LOGIC
            is_valid = engagement.platform_user_id in follower_ids
            
            # Determine reason
            if is_valid:
                reason = "User is a verified follower"
            else:
                reason = "User is not in follower list"
            
            # Upsert vote result
            stmt = insert(Vote).values(
                platform_user_id=engagement.platform_user_id,
                username=engagement.username,
                post_id=post.id,
                engagement_type=engagement.engagement_type,
                is_valid=is_valid,
                reason=reason,
                validated_at=datetime.utcnow()
            ).on_conflict_do_update(
                index_elements=['platform_user_id', 'post_id', 'engagement_type'],
                set_={
                    'username': engagement.username,
                    'is_valid': is_valid,
                    'reason': reason,
                    'validated_at': datetime.utcnow()
                }
            ).returning(Vote)
            
            result = await self.db.execute(stmt)
            vote = result.scalar_one()
            
            votes.append(VoteResponse(
                id=vote.id,
                platform_user_id=vote.platform_user_id,
                username=vote.username,
                post_id=vote.post_id,
                engagement_type=vote.engagement_type,
                is_valid=vote.is_valid,
                reason=vote.reason,
                validated_at=vote.validated_at
            ))
            
            if is_valid:
                valid_count += 1
            else:
                invalid_count += 1
        
        await self.db.commit()
        
        total = valid_count + invalid_count
        validation_rate = (valid_count / total * 100) if total > 0 else 0
        
        return ValidationResult(
            post_id=post.id,
            total_engagements=total,
            valid_votes=valid_count,
            invalid_votes=invalid_count,
            validation_rate=round(validation_rate, 2),
            votes=votes
        )
    
    async def validate_engagement(
        self, 
        engagement: Engagement, 
        follower_ids: Set[str]
    ) -> Vote:
        """
        Validate a single engagement against follower list.
        """
        is_valid = engagement.platform_user_id in follower_ids
        reason = "User is a verified follower" if is_valid else "User is not in follower list"
        
        # Create or update vote
        stmt = insert(Vote).values(
            platform_user_id=engagement.platform_user_id,
            username=engagement.username,
            post_id=engagement.post_id,
            engagement_type=engagement.engagement_type,
            is_valid=is_valid,
            reason=reason,
            validated_at=datetime.utcnow()
        ).on_conflict_do_update(
            constraint='uq_vote_user_post_type',
            set_={
                'is_valid': is_valid,
                'reason': reason,
                'validated_at': datetime.utcnow()
            }
        ).returning(Vote)
        
        result = await self.db.execute(stmt)
        return result.scalar_one()
