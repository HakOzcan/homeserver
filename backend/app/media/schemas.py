"""
@file schemas.py
@brief Pydantic models for media API request/response validation.
@details Defines the shape of data going in and out of the media endpoints.
         Pydantic validates incoming data and serializes outgoing responses.
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class GenreSchema(BaseModel):
    """@brief A single genre entry from TMDB."""
    id: int
    name: str


class CastMemberSchema(BaseModel):
    """@brief A single cast member with their role."""
    name: str
    character: Optional[str] = None
    profile_path: Optional[str] = None


class ContentResponse(BaseModel):
    """
    @brief Full content metadata returned to the frontend.
    @details Used for cards, detail modals, and hero banner.
    """
    id: int
    tmdb_id: int
    title: str
    overview: Optional[str] = None
    genres: Optional[List[GenreSchema]] = None
    cast: Optional[List[CastMemberSchema]] = None
    rating: Optional[float] = None
    release_year: Optional[int] = None
    runtime: Optional[int] = None
    content_type: str
    added_at: datetime

    class Config:
        from_attributes = True


class ContentWithProgressResponse(ContentResponse):
    """
    @brief Content metadata plus the user's watch progress.
    @details Used in the "Continue Watching" row to show progress bars on cards.
    """
    position_seconds: float = 0
    duration_seconds: float = 0
    progress_percent: float = 0


class LibraryResponse(BaseModel):
    """
    @brief The full library page payload returned by GET /media/library.
    @details Single API call gives the frontend everything it needs:
             hero banner, continue watching, recently added, and genre rows.
    """
    hero: Optional[ContentResponse] = None
    continue_watching: List[ContentWithProgressResponse] = []
    recently_added: List[ContentResponse] = []
    genre_rows: dict = {}  ## {"Action": [ContentResponse, ...], "Drama": [...]}


class ProgressUpdate(BaseModel):
    """
    @brief Request body for POST /media/progress.
    @details Sent by the player every 10 seconds and on pause/exit.
    """
    content_id: int
    position_seconds: float
    duration_seconds: float


class ProgressResponse(BaseModel):
    """
    @brief Response for GET /media/progress/{content_id}.
    @details Used by the player on mount to resume from last position.
    """
    position_seconds: float
    duration_seconds: float
    completed: bool
    updated_at: datetime

class EpisodeResponse(BaseModel):
    """
    @brief A single TV episode available on disk.
    @details Combines filesystem discovery (season/episode numbers)
             with TMDB metadata (title, overview) when available.
    """
    season_number: int
    episode_number: int
    title: Optional[str] = None
    overview: Optional[str] = None
    runtime: Optional[int] = None

class SeasonsResponse(BaseModel):
    """
    @brief All seasons and their episodes for a TV show.
    @details Keys are season numbers as strings, values are episode lists.
    """
    seasons: dict  ## {"1": [EpisodeResponse, ...], "2": [...]}