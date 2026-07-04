"""
@file schemas.py
@brief Pydantic models for the gaming module.

Defines request/response shapes for game sessions and input events.
These are used by routes.py for request validation and by the frontend
to know what data to send/expect.
"""

from pydantic import BaseModel

class GameInfo(BaseModel):
    """
    @brief Schema representing a single game in the catalog.
    @details Matches the structure of entries in games.json.
    """
    id: str
    name: str
    type: str
    description: str
    cover: str
    resolution: str

class SessionCreate(BaseModel):
    """
    @brief Request body for creating a game session.
    @details Only game_id is needed - user_id is injected server-side
             from the authenticated user's JWT.
    """
    game_id: str

class SessionResponse(BaseModel):
    """
    @brief Response returned after creating a session.
    @details session_id is a UUID the frontend uses to negotiate the WebRTC stream.
    """
    session_id: str
    status: str

class WebRTCOffer(BaseModel):
    """
    @brief SDP offer/answer payload for WebRTC signaling.
    @details Matches the browser's RTCSessionDescription shape:
             sdp is the session description text, type is "offer"
             (from the browser) or "answer" (from game-runner).
    """
    sdp: str
    type: str

class InputEvent(BaseModel):
    """
    @brief Schema for input events sent over the WebRTC DataChannel.
    @details The frontend sends these as JSON messages directly to
             game-runner (the backend never sees them).
             type determines which fields are relevant:
             - keydown/keyup: uses key
             - mousemove: uses x, y
             - mousedown/mouseup: uses x, y, button
    """
    type: str # keydown, keyup, mousemove, mousedown, mouseup
    key: str | None = None
    x: float | None = None
    y: float | None = None
    button: int | None = None