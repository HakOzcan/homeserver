"""
@file routes.py
@brief HLS media streaming endpoints for serving movies via adaptive bitrate streaming.
"""

import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse, StreamingResponse
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/media", tags=["Media"])

## @brief Root directory for HLS movie bundles on the streaming volume.
MOVIES_ROOT = "/mnt/streaming/movies"

## @brief Chunk size in bytes for streaming segment responses.
CHUNK_SIZE = 1024 * 1024

## @brief Maps file extensions to their MIME types for HLS content.
CONTENT_TYPES = {
    ".m3u8": "application/vdn.apple.mpegurl",
    ".m4s": "video/iso.segment",
    ".mp4": "video/mp4",
    ".vtt": "text/vtt",
}

@router.get("/movies")
async def list_movies(user=Depends(get_current_user)):
    """
    @brief List all available HLS movies.
    @details Scans MOVIES_ROOT for directories containing a master.m3u8 playlist.
    @param user Authenticated user from JWT token.
    @return JSON object with a list of movie directory names.
    """
    movies = []
    for entry in sorted(os.listdir(MOVIES_ROOT)):
        movie_dir = os.path.join(MOVIES_ROOT, entry)
        if os.path.isdir(movie_dir) and os.path.isfile(os.path.join(movie_dir, "master.m3u8")):
            movies.append(entry)
    return {"movies": movies}

@router.get("/hls/{path:path}")
async def serve_hls(path: str, user=Depends(get_current_user)):
    """
    @brief Serve any file from an HLS movie bundle.
    @details Resolves the requested path under MOVIES_ROOT and streams the file
             with the appropriate Content-Type header. Rejects path traversal attempts.
    @param path Relative path to the file within MOVIES_ROOT (e.g. "example_movie/master.m3u8").
    @return StreamingResponse for segments (.m4s/.mp4), FileResponse for playlists and subtitles.
    """
    if ".." in path:
        raise HTTPException(status_code=403, detail="Path traversal not allowed")
    
    file_path = os.path.join(MOVIES_ROOT, path)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    ext = os.path.split(file_path)[1].lower()
    content_type = CONTENT_TYPES.get(ext, "application/octet-stream")

    if ext in (".m4s", ".mp4"):
        def iterfile():
            """@brief Generator that yields file content in chunks."""
            with open(file_path, "rb") as f:
                while chunk := f.read(CHUNK_SIZE):
                    yield chunk
        return StreamingResponse(iterfile(), media_type=content_type)
    
    return FileResponse(file_path, media_type=content_type)