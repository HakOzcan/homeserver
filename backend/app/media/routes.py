import os
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import StreamingResponse
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/media", tags=["Media"])

# Your mounted media path from docker-compose
MEDIA_ROOT = "/mnt/streaming"
CHUNK_SIZE = 1024 * 1024  # 1 MB


@router.get("/stream/{path:path}")
async def stream_video(
    path: str,
    request: Request,
    user=Depends(get_current_user),  # require valid JWT
):
    """
    Stream a video file in chunks with HTTP range support.
    Only logged-in users can access this route.
    """

    file_path = os.path.join(MEDIA_ROOT, path)

    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("range")
    start = 0
    end = file_size - 1

    if range_header:
        try:
            bytes_range = range_header.replace("bytes=", "").split("-")
            start = int(bytes_range[0]) if bytes_range[0] else 0
            if bytes_range[1]:
                end = int(bytes_range[1])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid Range header")

    # Prepare generator
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
        "Content-Type": "video/mp4",  # adjust dynamically later if needed
        "Accept-Ranges": "bytes",
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Content-Length": str(end - start + 1),
    }

    return StreamingResponse(
        iterfile(start, end),
        status_code=206,
        headers=headers,
    )


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
