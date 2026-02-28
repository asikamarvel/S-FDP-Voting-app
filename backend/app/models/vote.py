"""
Vote Model - Validated engagement results
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Vote(Base):
    __tablename__ = "votes"
    
    id = Column(Integer, primary_key=True, index=True)
    platform_user_id = Column(String(255), nullable=False, index=True)
    username = Column(String(255), nullable=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    engagement_type = Column(String(50), nullable=False)  # Changed from Enum to String
    is_valid = Column(Boolean, nullable=False, default=False)
    reason = Column(String(500), nullable=True)  # Explanation for validity
    validated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    post = relationship("Post", back_populates="votes")
    
    # Unique constraint: one vote result per user per post per engagement type
    __table_args__ = (
        UniqueConstraint('platform_user_id', 'post_id', 'engagement_type', name='uq_vote_user_post_type'),
    )
    
    def __repr__(self):
        return f"<Vote(id={self.id}, username='{self.username}', is_valid={self.is_valid})>"
