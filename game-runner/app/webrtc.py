"""
@file webrtc.py
@brief WebRTC endpoint for real-time game streaming and input.

Replaces the old WebSocket streaming (ws.py) with a WebRTC peer:
- Server → Client: VP8 video track fed from the FFmpeg raw capture
- Client → Server: JSON input events over a DataChannel named "input"

Signaling is a single REST exchange: the browser POSTs an SDP offer
(relayed by the backend for auth) and receives the SDP answer in the
response. aiortc gathers all ICE candidates before answering
(non-trickle), so no further signaling round-trips are needed.
"""

import asyncio
import json
import logging

from aiortc import (
    RTCConfiguration,
    RTCIceServer,
    RTCPeerConnection,
    RTCSessionDescription,
    VideoStreamTrack,
)
from av import VideoFrame
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.session import session_manager

logger = logging.getLogger(__name__)

router = APIRouter()

## @brief STUN server used to discover our public IP:port.
## @details Without this, the answer only contains LAN/host candidates and
##          browsers outside the local network could never reach us.
ICE_SERVERS = [RTCIceServer(urls="stun:stun.l.google.com:19302")]

## @brief Active peer connections keyed by session_id.
## @details One peer per session. Lets a re-offer (page refresh) replace a
##          stale connection, and lets stop_session close the peer.
_pcs: dict[str, RTCPeerConnection] = {}


class Offer(BaseModel):
    """
    @brief SDP offer sent by the browser (via the backend relay).
    @details Mirrors the shape of RTCPeerConnection.localDescription
             in the browser: {"sdp": "...", "type": "offer"}.
    """
    sdp: str
    type: str


class CaptureVideoTrack(VideoStreamTrack):
    """
    @brief Media track that feeds captured game frames into WebRTC.

    aiortc calls recv() every time it wants a frame to encode.
    next_timestamp() (from the base class) paces recv() at ~30fps and
    provides the presentation timestamp, so this class only needs to
    hand over the most recent captured frame.
    """

    def __init__(self, capture):
        """
        @brief Wrap a FrameCapture as a WebRTC video source.
        @param capture The session's FrameCapture (raw yuv420p frames).
        """
        super().__init__()
        self.capture = capture

    async def recv(self) -> VideoFrame:
        """
        @brief Return the next video frame to encode and send.
        @return An av.VideoFrame in yuv420p format with pts/time_base set.

        If capture hasn't produced a frame yet (FFmpeg still starting up),
        waits briefly instead of failing - the first frame usually arrives
        within a few hundred milliseconds.
        """
        pts, time_base = await self.next_timestamp()

        frame_data = self.capture.get_frame()
        while frame_data is None:
            await asyncio.sleep(0.05)
            frame_data = self.capture.get_frame()

        frame = VideoFrame.from_ndarray(frame_data, format="yuv420p")
        frame.pts = pts
        frame.time_base = time_base
        return frame


@router.post("/webrtc/offer/{session_id}")
async def webrtc_offer(session_id: str, offer: Offer):
    """
    @brief Accept an SDP offer and return the SDP answer (signaling).
    @param session_id UUID of the running game session to stream.
    @param offer The browser's SDP offer, relayed by the backend.
    @return Dict with "sdp" and "type" - the answer the browser applies
            via setRemoteDescription().

    Workflow:
    1. Validate that the session exists and is running
    2. Create an RTCPeerConnection with the session's video track
    3. Wire the "input" DataChannel to the session's input injector
    4. Answer the offer; setLocalDescription() blocks until all ICE
       candidates are gathered, so the returned SDP is complete
    """
    session = session_manager.get_session(session_id)
    if not session or session.status != "running":
        raise HTTPException(status_code=404, detail="Session not found or not running")

    ## One peer per session: a re-offer (e.g. page refresh) replaces the old one
    old_pc = _pcs.pop(session_id, None)
    if old_pc:
        await old_pc.close()

    pc = RTCPeerConnection(RTCConfiguration(iceServers=ICE_SERVERS))
    _pcs[session_id] = pc

    pc.addTrack(CaptureVideoTrack(session.capture))

    @pc.on("datachannel")
    def on_datachannel(channel):
        """@brief Browser opened its DataChannel - wire messages to input injection."""

        @channel.on("message")
        def on_message(message):
            try:
                event = json.loads(message)
            except (json.JSONDecodeError, TypeError):
                logger.warning(f"[{session_id}] Ignoring malformed input event")
                return
            session.input_injector.handle_event(event)

    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        """
        @brief Clean up when the peer dies.

        WebRTC has no explicit close message from the browser; when the
        user leaves, the connection transitions to "failed" after consent
        checks time out. Mirrors the old WebSocket behavior of stopping
        the session on disconnect.
        """
        logger.info(f"[{session_id}] WebRTC connection state: {pc.connectionState}")
        if pc.connectionState in ("failed", "closed"):
            _pcs.pop(session_id, None)
            await pc.close()
            await session_manager.stop_session(session_id)

    await pc.setRemoteDescription(RTCSessionDescription(sdp=offer.sdp, type=offer.type))
    answer = await pc.createAnswer()
    ## Blocks until ICE gathering completes - answer includes all candidates
    await pc.setLocalDescription(answer)

    logger.info(f"[{session_id}] WebRTC answer created")
    return {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}


async def close_peer(session_id: str):
    """
    @brief Close and forget the peer connection for a session, if any.
    @param session_id UUID of the session being stopped.

    Called by the DELETE /sessions/{id} endpoint so an explicit stop
    tears down the WebRTC connection immediately instead of waiting
    for the consent timeout.
    """
    pc = _pcs.pop(session_id, None)
    if pc:
        await pc.close()
