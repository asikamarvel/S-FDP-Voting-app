"""
Engagement Model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Engagement(Base):
    __tablename__ = "engagements"
    
    id = Column(Integer, primary_key=True, index=True)
    platform_user_id = Column(String(255), nullable=False, index=True)
    username = Column(String(255), nullable=True)
    engagement_type = Column(String(50), nullable=False)  # Changed from Enum to String
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    comment_text = Column(String(2000), nullable=True)  # For comment engagements
    engaged_at = Column(DateTime(timezone=True), nullable=True)
    synced_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    post = relationship("Post", back_populates="engagements")
    
    # Unique constraint: one engagement type per user per post
    __table_args__ = (
        UniqueConstraint('platform_user_id', 'post_id', 'engagement_type', name='uq_engagement_user_post_type'),
    )
    
    def __repr__(self):
        return f"<Engagement(id={self.id}, username='{self.username}', type='{self.engagement_type}')>"
