"""
@file service.py
@brief HTTP client calls to the internal game-runner service.

This module isolates all httpx calls to the game-runner container.
Routes.py calls these functions and handles errors/auth seperately,
keeping a clean separation between "how to talk to game-runner"
and "how to handle the web request".
"""

import os

import httpx
from fastapi import Response

## Overridable because game-runner runs with host networking (WebRTC needs
## direct UDP), so the backend may need to reach it via the host gateway
## instead of the compose service name.
GAME_RUNNER_URL = os.getenv("GAME_RUNNER_URL", "http://game-runner:9000")

async def get_catalog() -> list[dict]:
    """
    @brief Fetch the full game catalog from game-runner.
    @return List of game dictionaries from games.json.
    @throws httpx.HTTPStatusError if game-runner returns an error status.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{GAME_RUNNER_URL}/catalog")
        resp.raise_for_status()
        return resp.json()

async def get_cover(game_id: str) -> Response:
    """
    @brief Fetch a game's cover image from game-runner.
    @param game_id The game that its cover image requested.
    @return This returns binary image bytes with Response, not parsed JSON.
    @throws httpx.HTTPStatusError if game-runner returns an error status.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{GAME_RUNNER_URL}/covers/{game_id}")
        resp.raise_for_status()
        content_type = resp.headers.get("content-type", "image/svg+xml")
        return Response(content=resp.content, media_type=content_type)

async def create_session(game_id: str, user_id: str) -> dict:
    """
    @brief Request game-runner to start a new game session.
    @param game_id The game to launch (from the catalog).
    @param user_id Authenticated user's ID (injected by routes, never from client).
    @return Dict with session_id (UUID) and status.
    @throws httpx.HTTPStatusError if game-runner rejects the request.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{GAME_RUNNER_URL}/sessions",
            json={"game_id": game_id, "user_id": user_id},
        )
        resp.raise_for_status()
        return resp.json()

async def stop_session(session_id: str) -> dict:
    """
    @brief Tell game-runner to stop a session and release resources.
    @param session_id UUID of the session to stop.
    @return Confirmation dict from game-runner.
    @throws httpx.HTTPStatusError if session not found or already stopped.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.delete(f"{GAME_RUNNER_URL}/sessions/{session_id}")
        resp.raise_for_status()
        return resp.json()

async def send_webrtc_offer(session_id: str, offer: dict) -> dict:
    """
    @brief Relay a WebRTC SDP offer to game-runner and return its answer.
    @param session_id UUID of the session the browser wants to stream.
    @param offer Dict with "sdp" and "type" from the browser's offer.
    @return Dict with "sdp" and "type" - game-runner's SDP answer.
    @throws httpx.HTTPStatusError if the session is unknown or not running.

    Timeout is generous (30s vs the 5s default) because game-runner
    gathers all ICE candidates before answering, which includes a
    STUN round-trip to discover its public address.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{GAME_RUNNER_URL}/webrtc/offer/{session_id}",
            json=offer,
        )
        resp.raise_for_status()
        return resp.json()

async def get_sessions() -> list[dict]:
    """
    @brief Fetch all currently active sessions from game-runner.
    @return List of session metadata dicts.
    @throws httpx.HTTPStatusError if game-runner returns an error status.
    """
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{GAME_RUNNER_URL}/sessions")
        resp.raise_for_status()
        return resp.json()