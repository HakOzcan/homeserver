import os
from fastapi import APIRouter, Request, HTTPException, Depends, Query
from fastapi.responses import JSONResponse, StreamingResponse
from app.auth.dependencies import get_current_user
from app.core.config import settings
from datetime import datetime, timedelta
from jose import jwt

router = APIRouter(prefix="/media", tags=["Media"])

# Your mounted media path from docker-compose
MEDIA_ROOT = "/mnt/streaming"
CHUNK_SIZE = 1024 * 1024  # 1 MB

SIGN_EXPIRATION_MINUTES = 2  # playback link valid for 2 minutes

@router.get("/play/{path:path}")
async def get_signed_stream_url(
    path: str,
    user=Depends(get_current_user)
):
    """
    Returns a short-lived signed URL to stream a video file.
    """
    expire = datetime.utcnow() + timedelta(minutes=SIGN_EXPIRATION_MINUTES)
    token_data = {"sub": user["sub"], "path": path, "exp": expire}
    signed_token = jwt.encode(token_data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    signed_url = f"https://api.hakserver.cc/api/media/stream/{path}?token={signed_token}"
    return {"url": signed_url}

@router.get("/stream/{path:path}")
async def stream_video(request: Request, path: str, token: str = Query(None)):
    """
    Stream a video file if a valid signed token is provided.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("path") != path:
            raise HTTPException(status_code=403, detail="Invalid token path")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=403, detail="Invalid token")

    file_path = os.path.join(MEDIA_ROOT, path)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("range")
    start = 0
    end = file_size - 1

    if range_header:
        bytes_range = range_header.replace("bytes=", "").split("-")
        start = int(bytes_range[0]) if bytes_range[0] else 0
        if bytes_range[1]:
            end = int(bytes_range[1])

    def iterfile(start_pos, end_pos):
        with open(file_path, "rb") as f:
            f.seek(start_pos)
            remaining = end_pos - start_pos + 1
            while remaining > 0:
                chunk = f.read(min(CHUNK_SIZE, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk

    headers = {
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Content-Length": str(end - start + 1),
    }

    return StreamingResponse(iterfile(start, end), status_code=206, headers=headers)



@router.get("/list")
async def list_videos(user=Depends(get_current_user)):
    """
    Return a simple list of video files available in MEDIA_ROOT.
    Useful for populating frontend gallery.
    """
    video_files = []
    for root, _, files in os.walk(MEDIA_ROOT):
        for f in files:
            if f.lower().endswith((".mp4", ".mkv", ".mov")):
                rel_path = os.path.relpath(os.path.join(root, f), MEDIA_ROOT)
                video_files.append(rel_path)
    return {"videos": video_files}
