"""
@file routes.py
@brief Gaming proxy routes - thin layer wiring auth to game-runner calls.

Each route authenticates the user, calls the appropriate service function,
and converts exceptions into HTTP errors. The Websocket endpoint handles
auth via query param since browsers can't set headers on WebSocket connections.
"""

import asyncio
import httpx
import websockets
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from app.auth.dependencies import require_active_user, require_admin
from app.gaming import service
from app.gaming.schemas import SessionCreate
from app.core.security import verify_access_token

## @brief Router for all gaming proxy endpoints, mounted at /gaming
router = APIRouter(prefix="/gaming", tags=["gaming"])

GAME_RUNNER_WS = "ws://game-runner:9000"

@router.get("/catalog")
async def get_catalog(user=Depends(require_active_user)):
    """
    @brief Get the list of available games.
    @return Game catalog from game-runner.
    """        
    return await service.get_catalog()

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

@router.websocket("/stream/{session_id}")
async def stream_proxy(ws: WebSocket, session_id: str, token: str = ""):
    """
    @brief Bidirectional WebSocket proxy between browser and game-runner.
    @param ws The client WebSocket connection from the browser.
    @param session_id UUID of the session to stream.
    @param token JWT passed as query param (?token=...) for authentication.

    Two concurrent tasks relay traffic:
    - forward_frames: game-runner sends binary JPEG frames to browser
    - forward_input: browser send JSON input events to game-runner
    When either side disconnects, the other task is cancelled.
    """
    # --- Step 1: Authenticate via query param ---
    # Browser WebSocket API cannot set Authorization headers,
    # so the frontend passes the JWT as ?token=<jwt>
    try:
        payload = verify_access_token(token)
        if payload is None:
            await ws.close(code=4001, reason="Invalid token")
            return
    except Exception:
        await ws.close(code=4001, reason="Invalid token")
        return
    
    # --- Step 2: Accept the client connection ---
    await ws.accept()

    # --- Step 3: Connect to game-runner's WebSocket ---
    runner_ws_url = f"{GAME_RUNNER_WS}/stream/{session_id}"
    try:
        async with websockets.connect(runner_ws_url) as runner_ws:
            async def forward_frames():
                """@brief Relay binary JPEG frames from game-runner to browser"""
                try:
                    async for message in runner_ws:
                        if isinstance(message, bytes):
                            await ws.send_bytes(message)
                except (WebSocketDisconnect, websockets.ConnectionClosed, asyncio.CancelledError):
                    pass
            
            async def forward_input():
                """@brief Relay JSON input events from browser to game-runner."""
                try:
                    while True:
                        data = await ws.receive_text()
                        await runner_ws.send(data)
                except (WebSocketDisconnect, websockets.ConnectionClosed, asyncio.CancelledError):
                    pass
            
            # --- Step 4: Run both directions concurrently ---
            send_task = asyncio.create_task(forward_frames())
            recv_task = asyncio.create_task(forward_input())

            # Wait until one side disconnects, then cancel the other
            done, pending = await asyncio.wait(
                [send_task, recv_task],
                return_when=asyncio.FIRST_COMPLETED,
            )
            for task in pending:
                task.cancel()
    except (ConnectionRefusedError, OSError):
        await ws.close(code=4003, reason="Game runner unavailable")