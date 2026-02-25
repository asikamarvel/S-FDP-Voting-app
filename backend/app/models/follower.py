"""
Follower Model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Follower(Base):
    __tablename__ = "followers"
    
    id = Column(Integer, primary_key=True, index=True)
    platform_user_id = Column(String(255), nullable=False, index=True)
    username = Column(String(255), nullable=True)
    display_name = Column(String(255), nullable=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    synced_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    campaign = relationship("Campaign", back_populates="followers")
    
    # Unique constraint: one follower per campaign
    __table_args__ = (
        UniqueConstraint('platform_user_id', 'campaign_id', name='uq_follower_campaign'),
    )
    
    def __repr__(self):
        return f"<Follower(id={self.id}, username='{self.username}')>"
