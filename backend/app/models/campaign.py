"""
Campaign Model
"""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    platform = Column(String(50), nullable=False)  # Changed from Enum to String for compatibility
    official_account_id = Column(String(255), nullable=False)
    official_account_username = Column(String(255), nullable=True)
    description = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    posts = relationship("Post", back_populates="campaign", cascade="all, delete-orphan")
    followers = relationship("Follower", back_populates="campaign", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Campaign(id={self.id}, name='{self.name}', platform='{self.platform}')>"
