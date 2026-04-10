"""
@file service.py
@brief HTTP client calls to the internal game-runner service.

This module isolates all httpx calls to the game-runner container.
Routes.py calls these functions and handles errors/auth seperately,
keeping a clean separation between "how to talk to game-runner"
and "how to handle the web request".
"""

import httpx

GAME_RUNNER_URL = "http://game-runner:9000"

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