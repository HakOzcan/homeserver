"""
@file tmdb_service.py
@brief Service module for interacting with The Movie Database (TMDB) API.
@details Handles searching for content, fetching full details (cast, genres, ratings),
         and storing metadata in the database. Images and metadata.json are expected
         to already exist in /mnt/cache/movies-tv/{tmdb_id}/ (placed there during encoding on Windows).
         TMDB API is only called as a fallback if no cached metadata is found.
"""

import os
import re
import json
import httpx
from typing import Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.models import Content

## @brief Root directories for HLS content by type.
STREAMING_ROOTS = {
    "movie": "/mnt/streaming/movies",
    "tv": "/mnt/streaming/tv",
}

## @brief SSD cache directories for metadata and images, mirroring streaming structure.
CACHE_ROOTS = {
    "movie": "/mnt/cache/streaming/movies",
    "tv": "/mnt/cache/streaming/tv",
}

def parse_filename(name: str) -> Tuple[str, Optional[int]]:
    """
    @brief Extract a human-readable title and optional year from a filename.
    @details Handles common naming patterns like:
             - "Movie.Name.2024.Bluray.2160p" -> ("Movie Name", 2024)
             - "Movie Name (2024)" -> ("Movie Name", 2024)
             - "Movie_Name" -> ("Movie Name", None)
    @param name The raw folder name.
    @return Tuple of (title, year) where year may be None if not found.
    """
    year_match = re.search(r"[\.\s_\-\(]((?:19|20)\d{2})[\)\.\s_\-]?", name)
    year = int(year_match.group(1)) if year_match else None

    if year_match:
        title = name[:year_match.start()]
    else:
        title = name
    
    title = re.sub(r"[\._\-]", " ", title).strip()
    return title, year

def load_cached_metadata(tmdb_id: int, content_type: str) -> Optional[dict]:
    """
    @brief Check if metadata already exists in the SSD cache.
    @details During encoding on Windows, metadata.json, poster.jpg, and backdrop.jpg
             are fetched from TMDB and SCP'd to /mnt/cache/streaming/{type}/{tmdb_id}/.
    @param tmdb_id The TMDB content ID (used as folder name in cache).
    @param content_type Either "movie" or "tv" to locate the correct cache folder.
    @return Parsed metadata dict if found, None otherwise.
    """
    cache_dir = CACHE_ROOTS.get(content_type)
    if not cache_dir:
        return None

    metadata_path = os.path.join(cache_dir, str(tmdb_id), "metadata.json")

    if not os.path.isfile(metadata_path):
        return None

    with open(metadata_path, "r", encoding="utf-8") as f:
        return json.load(f)

async def search_multi(query: str, year: Optional[int] = None) -> Optional[dict]:
    """
    @brief Search TMDB for any content type (movie or TV) by title and optional year.
    @details Uses /search/multi endpoint which returns both movies and TV shows
             with a media_type field to search for.
    @param query The content title to search for.
    @param year Optional release year to narrow results.
    @return The best matching result dict (includes media_type), or None if no results.
    """
    params = {
        "api_key": settings.TMDB_API_KEY,
        "query": query,
    }
    if year:
        params["year"] = year
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{settings.TMDB_BASE_URL}/search/multi", params=params)
        response.raise_for_status()
        data = response.json()
    
    ## Filter to only movie and tv results as multi can also return "person".
    results = [r for r in data.get("results", []) if r.get("media_type") in ("movie", "tv")]

    if results:
        return results[0]
    return None

async def get_movie_details(tmdb_id: int) -> dict:
    """
    @brief Fetch full movie details from TMDB including cast.
    @param tmdb_id The TMDB movie ID.
    @return Full movie details dict including credits.
    """
    params = {
    "api_key": settings.TMDB_API_KEY,
    "append_to_response": "credits",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(f"{settings.TMDB_BASE_URL}/movie/{tmdb_id}", params=params)
        response.raise_for_status()

    return response.json()

async def get_tv_details(tmdb_id: int) -> dict:
    """
    @brief Fetch full TV show details from TMDB including cast.
    @param tmdb_id The TMDB TV show ID.
    @return Full TV details dict including credits.
    """
    params = {
        "api_key": settings.TMDB_API_KEY,
        "append_to_response": "credits",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(f"{settings.TMDB_BASE_URL}/tv/{tmdb_id}", params=params)
        response.raise_for_status()

    return response.json()

async def download_image(tmdb_id: int, content_type: str, image_type: str, tmdb_path: str) -> bool:
    """
    @brief Download an image from TMDB's CDN and save it to the cache folder.
    @details Constructs the save path from the known cache structure.
             Only used as a fallback when images weren't pre-cached during encoding.
    @param tmdb_id The TMDB content ID.
    @param content_type Either "movie" or "tv".
    @param image_type Either "poster" or "backdrop".
    @param tmdb_path The TMDB image path (e.g. "/abc123.jpg").
    @return True if download succeeded, False otherwise.
    """
    size = "w500" if image_type == "poster" else "w1280"
    url = f"{settings.TMDB_IMAGE_BASE}/{size}{tmdb_path}"

    cache_dir = os.path.join(CACHE_ROOTS[content_type], str(tmdb_id))
    os.makedirs(cache_dir, exist_ok=True)
    save_path = os.path.join(cache_dir, f"{image_type}.jpg")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()

        with open(save_path, "wb") as f:
            f.write(response.content)
        return True
    except Exception:
        return False

async def fetch_from_tmdb(tmdb_id: int, content_type: str) -> Optional[dict]:
    """
    @brief Fallback: fetch metadata directly from TMDB API when cache is empty.
    @details Called only when /mnt/cache/streaming/{type}/{tmdb_id}/metadata.json doesn't exist.
             Also downloads poster and backdrop images to the cache folder.
    @param tmdb_id The TMDB content ID.
    @param content_type Either "movie" or "tv".
    @return Parsed metadata dict matching the same format as cached metadata.json.
    """
    if content_type == "movie":
        details = await get_movie_details(tmdb_id)
        release_year = int(details["release_date"][:4]) if details.get("release_date") else None
    else:
        details = await get_tv_details(tmdb_id)
        release_year = int(details["first_air_date"][:4]) if details.get("first_air_date") else None

    title = details.get("title") or details.get("name", "Unknown")
    overview = details.get("overview")
    genres = [{"id": g["id"], "name": g["name"]} for g in details.get("genres", [])]
    rating = details.get("vote_average")
    runtime = details.get("runtime")
    if not runtime and details.get("episode_run_time"):
        runtime = details["episode_run_time"][0]

    credits = details.get("credits", {})
    cast = [
        {
            "name": member["name"],
            "character": member.get("character"),
            "profile_path": member.get("profile_path"),
        }
        for member in credits.get("cast", [])[:10]
    ]

    ## Download images to cache
    cache_dir = os.path.join(CACHE_ROOTS[content_type], str(tmdb_id))
    os.makedirs(cache_dir, exist_ok=True)

    poster_path = details.get("poster_path")
    if poster_path:
        await download_image(tmdb_id, content_type, "poster", poster_path)

    backdrop_path = details.get("backdrop_path")
    if backdrop_path:
        await download_image(tmdb_id, content_type, "backdrop", backdrop_path)

    ## Build and save metadata.json
    metadata = {
        "tmdb_id": tmdb_id,
        "title": title,
        "overview": overview,
        "genres": genres,
        "cast": cast,
        "rating": rating,
        "release_year": release_year,
        "runtime": runtime,
        "content_type": content_type,
    }

    with open(os.path.join(cache_dir, "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    return metadata

async def store_content(tmdb_id: int, content_type: str, original_filename: str, db: Session) -> Optional[Content]:
    """
    @brief Main entry point: load metadata (cache-first) and insert/update DB.
    @details Orchestrates the full flow:
             1. Check /mnt/cache/streaming/{type}/{tmdb_id}/metadata.json — use if exists
             2. If not cached, fall back to TMDB API and save to cache
             3. Insert or update the Content row in the database
    @param tmdb_id The TMDB content ID.
    @param content_type Either "movie" or "tv" (determined by which folder it's in).
    @param original_filename The original filename before matching.
    @param db SQLAlchemy database session.
    @return The created/updated Content object, or None on failure.
    """
    ## Step 1: Try loading from cache (fastest path)
    metadata = load_cached_metadata(tmdb_id, content_type)

    ## Step 2: If not cached, fetch from TMDB
    if metadata is None:
        metadata = await fetch_from_tmdb(tmdb_id, content_type)
        if metadata is None:
            return None

    ## Step 3: Insert or update database
    existing = db.query(Content).filter(Content.tmdb_id == tmdb_id).first()

    if existing:
        existing.title = metadata["title"]
        existing.overview = metadata.get("overview")
        existing.genres = metadata.get("genres")
        existing.cast = metadata.get("cast")
        existing.rating = metadata.get("rating")
        existing.release_year = metadata.get("release_year")
        existing.runtime = metadata.get("runtime")
        existing.content_type = content_type
        existing.original_filename = original_filename
        content = existing
    else:
        content = Content(
            tmdb_id=tmdb_id,
            title=metadata["title"],
            overview=metadata.get("overview"),
            genres=metadata.get("genres"),
            cast=metadata.get("cast"),
            rating=metadata.get("rating"),
            release_year=metadata.get("release_year"),
            runtime=metadata.get("runtime"),
            content_type=content_type,
            original_filename=original_filename,
            folder_name=str(tmdb_id),
            added_at=datetime.now(timezone.utc),
        )
        db.add(content)

    db.commit()
    db.refresh(content)
    return content