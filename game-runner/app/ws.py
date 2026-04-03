"""
@file ws.py
@brief WebSocket endpoint for real-time game streaming and input.

Defines a single WebSocket route that handles bidirectional communication:
- Server → Client: JPEG frames as binary messages at 30fps
- Client → Server: JSON input events (keyboard/mouse) as text messages

Each WebSocket connection is tied to one game session. When the connection
closes (user leaves or game exits), the session is automatically cleaned up.
"""

import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.session import session_manager

router = APIRouter()

## @brief Target frame interval in seconds (1/30 ~ 33ms per frame)
FRAME_INTERVAL = 1 / 30

@router.websocket("/stream/{session_id}")
async def stream_game(ws: WebSocket, session_id: str):
    """
    @brief WebSocket endpoint that streams a game session to the client.
    @param ws The FastAPI WebSocket connection.
    @param session_id UUID of the game session to stream.

    Workflow:
    1. Validate that the session exists and is running
    2. Accept the WebSocket connection
    3. Spawn two concurrent tasks (send frames + receive input)
    4. Wait until either task ends (disconnect or game exit)
    5. Cancel the remaining task and clean up the session
    """
    ## Validate session before accepting the connection
    session = session_manager.get_session(session_id)
    if not session or session.status != "running":
        await ws.close(code=4004, reason="Session not found or not running")
        return
    
    await ws.accept()

    async def send_frames():
        """
        @brief Continuously send captured frames to the browser.

        Runs at ~30fps. If no frame is available yet (capture just started),
        it skips that tick. Stops when the game process exits or the
        WebSocket disconnects.
        """
        try:
            while session.is_alive():
                frame = await session.capture.get_frame()
                if frame:
                    await ws.send_bytes(frame)
                await asyncio.sleep(FRAME_INTERVAL)
        except (WebSocketDisconnect, asyncio.CancelledError):
            pass
    
    async def receive_input():
        """
        @brief Listen for input events from the browser and inject them.

        Expects JSON text messages with at minimum a "type" field.
        Runs until the WebSocket disconnects or the task is cancelled.
        """
        try:
            while True:
                data = await ws.receive_text()
                event = json.loads(data)
                session.input_injector.handle_event(event)
        except (WebSocketDisconnect, asyncio.CancelledError):
            pass
    
    ## Run both tasks concurrently
    send_task = asyncio.create_task(send_frames())
    recv_task = asyncio.create_task(receive_input())

    try:
        ## Wait until either task finishes (user disconnects or game exits)
        done, pending = await asyncio.wait(
            [send_task, recv_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
        ## Cancel whichever task is still running
        for task in pending:
            task.cancel()
    finally:
        ## Always clean up the session when the WebSocket closes
        await session_manager.stop_session(session_id)
