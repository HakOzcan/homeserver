"""
@file main.py
@brief FastAPI application entry point for the game-runner service.

Configures logging, creates the FastAPI app, mounts the WebSocket router,
and defines REST API endpoints for health checks, game catalog,
and session management. This is the file Uvicorn runs inside the container
"""

import logging

## Configure logging before importing app modules so their loggers inherit this config
logging.basicConfig(level=logging.INFO)

from fastapi import FastAPI
from app.registry import registry
from app.session import session_manager
from app.ws import router as ws_router

## @brief FastAPI application instance.
## @details docs_url/redoc_url/openapi_url are disabled - this is internal
##          service called only by the backend, not by end users directly
app = FastAPI(title="Game Runner", docs_url=None, redoc_url=None, openapi_url=None)

## Mount the WebSocket router (provides/stream/{session_id})
app.include_router(ws_router)

@app.get("/health")
async def health():
    """
    @brief Health check endpoint.
    @return Simple JSON confirming the service is up.

    Used by Docker Compose healthcheck and the backend to verify
    the game-runner container is alive.
    """
    return {"status": "ok"}

@app.get("/catalog")
async def get_catalog():
    """
    @brief Return the full game catalog.
    @return List of all game dictionaries from games.json.

    Called by the backend to populate the games page in the frontend.
    """
    return registry.get_all_games()

@app.post("/sessions")
async def create_sessions(data: dict):
    """
    @brief Create a new game session.
    @param data JSON body with "game_id" and "user_id" fields.
    @return JSON with session_id and status, or error if game not found.

    This triggers the full startup sequence: Xvfb -> game -> FFmpeg -> input.
    The returned session_id is what the frontend uses to open the WebSocket.
    """
    game_id = data["game_id"]
    user_id = data["user_id"]

    game = registry.get_game(game_id)
    if not game:
        return {"error": "Game not found"}, 404
    
    session =  await session_manager.create_session(game, user_id)
    return {"session_id": session.session_id, "status": session.status}

@app.delete("/sessions/{session_id}")
async def stop_session(session_id: str):
    """
    @brief Stop a running game session and release its resources.
    @param session_id UUID of the session to stop.
    @return JSON confirming stopped status, or error if not found.
    """
    success = await session_manager.stop_session(session_id)
    if not success:
        return{"error": "Session not found"}
    return {"session": "stopped"}

@app.get("/sessions")
async def list_sessions():
    """
    @brief List all currently active game sessions.
    @return List of session metadata dictionaries.
    """
    return session_manager.get_active_sessions()
