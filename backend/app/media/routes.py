"""
@file routes.py
@brief Media API endpoints for library browsing, HLS streaming, and watch progress.
@details Serves the library page data (hero, continue watching, genre rows),
         streams HLS content, tracks watch progress, and provides admin scanning.
"""

import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from app.auth.dependencies import get_current_user, require_active_user, require_admin
from app.db.database import get_db
from app.db.models import Content, WatchProgress
from app.media.schemas import (
    ContentResponse,
    ContentWithProgressResponse,
    LibraryResponse,
    ProgressUpdate,
    ProgressResponse,
)
from app.media.tmdb_service import store_content, STREAMING_ROOTS, CACHE_ROOTS

router = APIRouter(prefix="/media", tags=["Media"])

## @brief Chunk size in bytes for streaming segment responses.
CHUNK_SIZE = 1024 * 1024

## @brief Maps file extensions to their MIME types for HLS content.
CONTENT_TYPES = {
    ".m3u8": "application/vnd.apple.mpegurl",
    ".m4s": "video/iso.segment",
    ".mp4": "video/mp4",
    ".vtt": "text/vtt",
}

@router.get("/library")
async def get_library(user=Depends(require_active_user), db: Session = Depends(get_db)):
    """
    @brief Returns the full library page payload in a single API call.
    @details Assembles hero banner (most recent), continue watching (per user),
             recently added, and genre-grouped rows. One request gives the
             frontend everything it needs to render the Netflix/Prime-style UI.
    @param user The authenticated active user (needed for continue watching).
    @param db Database session.
    @return LibraryResponse with all sections populated.
    """
    ## Recently added: latest 20 items
    all_content = db.query(Content).order_by(Content.added_at.desc()).limit(20).all()

    ## Hero: most recently added
    hero = all_content[0] if all_content else None

    ## Continue watching: user's in-progress items
    ## position > 120s (2 mins) and not completed, ordered by most recently watched
    progress_rows = (
        db.query(WatchProgress, Content)
        .join(Content, WatchProgress.content_id == Content.id)
        .filter(
            WatchProgress.user_id == user.id,
            WatchProgress.completed == False,
            WatchProgress.position_seconds > 120,
        )
        .order_by(WatchProgress.updated_at.desc())
        .limit(20)
        .all()
    )

    continue_watching = []
    for progress, content in progress_rows:
        percent = (progress.position_seconds / progress.duration_seconds * 100) if progress.duration_seconds > 0 else 0
        item = ContentWithProgressResponse(
            id=content.id,
            tmdb_id=content.tmdb_id,
            title=content.title,
            overview=content.overview,
            genres=content.genres,
            cast=content.cast,
            rating=content.rating,
            release_year=content.release_year,
            runtime=content.runtime,
            content_type=content.content_type,
            added_at=content.added_at,
            position_seconds=progress.position_seconds,
            duration_seconds=progress.duration_seconds,
            progress_percent=round(percent, 1),
        )
        continue_watching.append(item)
    
    ## Genre rows: group content by genre
    genre_rows = {}
    all_for_genres = db.query(Content).order_by(Content.added_at.desc()).all()
    for content in all_for_genres:
        if not content.genres:
            continue
        for genre in content.genres:
            genre_name = genre["name"]
            if genre_name not in genre_rows:
                genre_rows[genre_name] = []
            if len(genre_rows[genre_name]) < 20:
                genre_rows[genre_name].append(ContentResponse.model_validate(content))
    
    return LibraryResponse(
        hero=ContentResponse.model_validate(hero) if hero else None,
        continue_watching=continue_watching,
        recently_added=[ContentResponse.model_validate(c) for c in all_content],
        genre_rows=genre_rows,
    )

@router.post("/progress")
async def update_progress(
    body: ProgressUpdate,
    user=Depends(require_active_user),
    db: Session = Depends(get_db),
):
    """
    @brief Update watch progress for a user+content paid.
    @details Called by the player every 10 seconds and on pause/exit.
             Upserts the progress row. Marks as completed if >= 90% watched.
    @param body Contains content_id, position_seconds, duration_seconds.
    @param user The authenticated active user.
    @param db Database session.
    """
    ## Verify the content exists.
    content = db.query(Content).filter(Content.id == body.content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    ## Find existing progress or create new one.
    progress = (
        db.query(WatchProgress)
        .filter(
            WatchProgress.user_id == user.id,
            WatchProgress.content_id == body.content_id,
        )
        .first()
    )

    ## Determine if completed (>= 90% watched)
    completed = False
    if body.duration_seconds > 0:
        completed = (body.position_seconds / body.duration_seconds) >= 0.9
    
    if progress:
        progress.position_seconds = body.position_seconds
        progress.duration_seconds = body.duration_seconds
        progress.completed = completed
    else:
        progress = WatchProgress(
            user_id=user.id,
            content_id=body.content_id,
            position_seconds=body.position_seconds,
            duration_seconds=body.duration_seconds,
            completed=completed,
        )
        db.add(progress)
    
    db.commit()
    return {"status": "ok"}

@router.get("/progress/{content_id}")
async def get_progress(
    content_id: int,
    user=Depends(require_active_user),
    db: Session = Depends(get_db),
):
    """
    @brief Get the user's watch progress for a specific content.
    @details Used by the player on mount to resume from last position.
    @param content_id The Content row ID.
    @param user The authenticated active user.
    @param db Database session.
    @return Progress data or emtpy state if no progress exists.
    """
    progress = (
        db.query(WatchProgress)
        .filter(
            WatchProgress.user_id == user.id,
            WatchProgress.content_id == content_id,
        )
        .first()
    )

    if not progress:
        return ProgressResponse(
            position_seconds=0,
            duration_seconds=0,
            completed=False,
            updated_at=None,
        )
    
    return ProgressResponse(
        position_seconds=progress.position_seconds,
        duration_seconds=progress.duration_seconds,
        completed=progress.completed,
        updated_at=progress.updated_at,
    )

async def _scan_library(db: Session) -> dict:
    """
    @brief Walk streaming folders, find new content, and populate the database.
    @details Shared logic used by both the admin endpoint and the periodic background task.
    @param db Database session.
    @return Summary dict with added, skipped, and errors counts.
    """
    added = 0
    skipped = 0
    errors = []

    for content_type, root in STREAMING_ROOTS.items():
        if not os.path.isdir(root):
            continue

        for folder in sorted(os.listdir(root)):
            folder_path = os.path.join(root, folder)

            if not os.path.isdir(folder_path):
                continue
            if not os.path.isfile(os.path.join(folder_path, "master.m3u8")):
                continue

            if not folder.isdigit():
                errors.append(f"Non-numeric folder skipped: {content_type}/{folder}")
                continue

            tmdb_id = int(folder)

            existing = db.query(Content).filter(Content.tmdb_id == tmdb_id).first()
            if existing:
                skipped += 1
                continue

            try:
                result = await store_content(tmdb_id, content_type, folder, db)
                if result:
                    added += 1
                else:
                    errors.append(f"Failed to fetch metadata: {content_type}/{folder}")
            except Exception as e:
                errors.append(f"Error processing {content_type}/{folder}: {str(e)}")

    return {"added": added, "skipped": skipped, "errors": errors}

@router.post("/scan")
async def scan_content(user=Depends(require_admin), db: Session = Depends(get_db)):
    """
    @brief Admin endpoint to manually trigger a library scan.
    """   
    return await _scan_library(db)

@router.get("/image/{content_type}/{tmdb_id}/{filename}")
async def serve_image(content_type: str, tmdb_id: str, filename: str, user=Depends(get_current_user)):
    """
    @brief Serve poster/backdrop images from the SSD cache.
    @details Images are stored at /mnt/cache/streaming/{type}/{tmdb_id}/poster.jpg or backdrop.jpg.
             Served locally to avoid hitting TMDB CDN on every library page load.
    @param content_type Either "movie" or "tv".
    @param tmdb_id The TMDB content ID.
    @param filename Either "poster.jpg" or "backdrop.jpg".
    @param user Authenticated user.
    """
    ## Validate content_type
    if content_type not in CACHE_ROOTS:
        raise HTTPException(status_code=400, detail="Invalid content type")

    ## Only allow specific filenames to prevent path traversal
    if filename not in ("poster.jpg", "backdrop.jpg"):
        raise HTTPException(status_code=400, detail="Invalid filename")

    file_path = os.path.join(CACHE_ROOTS[content_type], tmdb_id, filename)

    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Image not found")

    return FileResponse(file_path, media_type="image/jpeg")

@router.get("/hls/{path:path}")
async def serve_hls(path: str, user=Depends(get_current_user)):
    """
    @brief Serve any file from an HLS content bundle.
    @details Resolves the requested path under streaming roots and streams the file
             with the appropriate Content-Type header. Rejects path traversal attempts.
    @param path Relative path to the file (e.g. "movies/12345/master.m3u8").
    @param user Authenticated user.
    """
    if ".." in path:
        raise HTTPException(status_code=403, detail="Path traversal not allowed")

    ## Try to resolve against /mnt/streaming/
    file_path = os.path.join("/mnt/streaming", path)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    ext = os.path.splitext(file_path)[1].lower()
    content_type = CONTENT_TYPES.get(ext, "application/octet-stream")

    if ext in (".m4s", ".mp4"):
        def iterfile():
            """@brief Generator that yields file content in chunks."""
            with open(file_path, "rb") as f:
                while chunk := f.read(CHUNK_SIZE):
                    yield chunk
        return StreamingResponse(iterfile(), media_type=content_type)

    return FileResponse(file_path, media_type=content_type)