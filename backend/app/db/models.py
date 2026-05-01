"""
@file models.py
@brief SQLAlchemy ORM models defining the database schema.
@details Contains all table definitions: users, content metadata, and watch progress.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base

class User(Base):
    """@brief User accounts for authentication and access control."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True, nullable=False)
    email = Column(String, index=True, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=False)
    email_verified = Column(Boolean, nullable=False, default=False)
    last_verification_email_sent_at = Column(DateTime(timezone=True), nullable=True)

    ## @brief All watch progress entries belonging to this user.
    watch_progress = relationship("WatchProgress", back_populates="user")

class Content(Base):
    """
    @brief Media content metadata fetched from TMDB.
    @details Each row represents one movie/show stored on disk.
             The folder_name matches the directory under /mnt/streaming/movies/
             which is the TMDB ID used for organized storage.
    """
    __tablename__ = "content"

    id = Column(Integer, primary_key=True, index=True)

    ## @brief TMDB's unique identifier for this movie/show.
    tmdb_id = Column(Integer, unique=True, index=True, nullable=False)
    
    title = Column(String, nullable=False)
    
    ## @brief Full plot summary from TMDB.
    overview = Column(Text, nullable=True)
    
    ## @brief Genre list as JSON array, e.g. [{"id": 28, "name": "Action"}].
    genres = Column(JSON, nullable=True)
    
    ## @brief Top cast members as JSON array, e.g. [{"name": "...", "character": "..."}].
    cast = Column(JSON, nullable=True)

    ## @brief TMDB rating (vote_average) on a 0-10 scale.
    rating = Column(Float, nullable=True)
    
    release_year = Column(Integer, nullable=True)
    
    ## @brief Movie runtime in minutes.
    runtime = Column(Integer, nullable=True)
    
    ## @brief Original filename before TMDB matching — kept as backup mapping.
    original_filename = Column(String, nullable=True)
    
    ## @brief Directory name on disk (the TMDB ID as string).
    folder_name = Column(String, nullable=False)
    
    ## @brief When this content was added to the library.
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    ## @brief All watch progress entries for this content.
    watch_progress = relationship("WatchProgress", back_populates="content")

class WatchProgress(Base):
    """
    @brief Tracks per-user playback position for resume functionality.
    @details Stores the last known playback time so users can pick up where
             they left off. One row per user+content combination (upserted on update).
    """
    __tablename__ = "watch_progress"

    id = Column(Integer, primary_key=True, index=True)

    ## @brief The user who watched this content.
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    ## @brief The content that was being watched.
    content_id = Column(Integer, ForeignKey("content.id"), nullable=False)

    ## @brief Current playback position in seconds.
    position_seconds = Column(Float, default=0, nullable=False)

    ## @brief Total duration of the content in seconds.
    duration_seconds = Column(Float, default=0, nullable=False)

    ## @brief True if user watched >= 90% — removes from "continue watching" row.
    completed = Column(Boolean, default=False, nullable=False)

    ## @brief Last time progress was updated (used for sorting "continue watching").
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    ## @brief Relationship back to the Content row.
    content = relationship("Content", back_populates="watch_progress")

    ## @brief Relationship back to the User row.
    user = relationship("User", back_populates="watch_progress")

    ## @brief Ensures only one progress row exists per user+content pair.
    __table_args__ = (
        UniqueConstraint("user_id", "content_id", name="uq_user_content_progress"),
    )