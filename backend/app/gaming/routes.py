"""
@file routes.py
@brief Gaming proxy routes - thin layer wiring auth to game-runner calls.

Each route authenticates the user, calls the appropriate service function,
and converts exceptions into HTTP errors. Streaming itself happens over
WebRTC directly between browser and game-runner; the backend only relays
the SDP offer/answer signaling exchange.
"""

import httpx
from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import require_active_user, require_admin
from app.gaming import service
from app.gaming.schemas import SessionCreate, WebRTCOffer

## @brief Router for all gaming proxy endpoints, mounted at /gaming
router = APIRouter(prefix="/gaming", tags=["gaming"])

@router.get("/catalog")
async def get_catalog(user=Depends(require_active_user)):
    """
    @brief Get the list of available games.
    @return Game catalog from game-runner.
    """        
    return await service.get_catalog()

@router.get("/covers/{game_id}")
async def get_cover(game_id: str, user=Depends(require_active_user)):
    """
    @brief Get the cover image of a specific game.
    @param game_id The id specific to the game cover image belongs to.
    @return Cover image in binary format.
    """
    try:
        return await service.get_cover(game_id)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="Cover image not found")
    except Exception:
        raise HTTPException(status_code=503, detail="Game-runner unavailable")

@router.post("/sessions")
async def create_session(data: SessionCreate, user=Depends(require_active_user)):
    """
    @brief Start a new game session.
    @param data Contains game_id only.
    @param user Injected by auth - user.id is forwarded to game-runner.
    @return Dict with session_id and status.

    Catches HTTPStatusError (game-runner rejected it, e.g. game not fount)
    and generic exceptions (game-runner is down).
    """
    try:
        result = await service.create_session(data.game_id, user.id)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="Failed to create session")
    except Exception:
        raise HTTPException(status_code=503, detail="Game runner unavailable")
    return result

@router.delete("/sessions/{session_id}")
async def stop_session(session_id: str, user=Depends(require_active_user)):
    """
    @brief Stop a running game session.
    @param session_id UUID of the session to stop.
    @return Confirmation from game-runner.
    """
    try:
        return await service.stop_session(session_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Session not found")

@router.get("/sessions")
async def list_sessions(user=Depends(require_active_user)):
    """
    @brief List all active sessions (admin only).
    @return List of session metadata from game-runner.

    This is restricted to admins because it shows all users' sessions,
    not just the requesting user's.
    """
    return await service.get_sessions()

@router.post("/webrtc/offer/{session_id}")
async def webrtc_offer(session_id: str, offer: WebRTCOffer, user=Depends(require_active_user)):
    """
    @brief Relay the browser's WebRTC SDP offer to game-runner (signaling).
    @param session_id UUID of the session to stream.
    @param offer The browser's SDP offer ({"sdp": ..., "type": "offer"}).
    @param user Injected by auth - a regular Authorization header works here,
                unlike the old WebSocket proxy which needed ?token= in the URL.
    @return Game-runner's SDP answer for the browser's setRemoteDescription().

    This is the backend's only involvement in streaming: after this single
    offer/answer exchange, video and input flow directly between the
    browser and game-runner over the negotiated WebRTC connection.
    """
    try:
        return await service.send_webrtc_offer(session_id, offer.model_dump())
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="Failed to establish stream")
    except Exception:
        raise HTTPException(status_code=503, detail="Game runner unavailable")