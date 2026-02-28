"""
Enum Types for the application
"""
import enum


class PlatformType(str, enum.Enum):
    INSTAGRAM = "instagram"
    TWITTER = "twitter"
    YOUTUBE = "youtube"
    TIKTOK = "tiktok"
    FACEBOOK = "facebook"


class EngagementType(str, enum.Enum):
    LIKE = "like"
    COMMENT = "comment"
