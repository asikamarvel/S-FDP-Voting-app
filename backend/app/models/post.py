"""
Post Model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Post(Base):
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    platform_post_id = Column(String(255), nullable=False, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    post_url = Column(Text, nullable=True)
    caption = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    
    # API-reported engagement counts (may be higher than tracked due to privacy)
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    shares_count = Column(Integer, default=0)  # Retweets for Twitter, Shares for Facebook
    views_count = Column(Integer, default=0)   # Views for YouTube
    
    # Relationships
    campaign = relationship("Campaign", back_populates="posts")
    engagements = relationship("Engagement", back_populates="post", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="post", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Post(id={self.id}, platform_post_id='{self.platform_post_id}')>"
