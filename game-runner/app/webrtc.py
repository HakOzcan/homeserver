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
import base64
import hashlib
import hmac
import json
import logging
import os
import time

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

## aiortc's VP8 defaults (~0.5-1.5 Mbps cap) are tuned for video calls;
## at 800x600@30 they starve the encoder, which then refreshes the image
## in coarse quantization passes - visible as waves rolling down the
## screen. Raise the ceiling: we serve few peers on LAN / a local relay.
## Best-effort: the module path is aiortc internals (pinned to 1.14.0 in
## requirements.txt), not public API, so a change must never take the
## whole service down - degrade to default bitrate with a warning instead.
try:
    from aiortc.codecs import vpx as _vpx

    if hasattr(_vpx, "MIN_BITRATE") and hasattr(_vpx, "MAX_BITRATE"):
        ## The floor is the load-bearing one: the sender obeys the browser's
        ## REMB bandwidth estimate, and since aiortc never sends probing
        ## traffic the estimate stays absurdly low (~120 kbps measured).
        ## Every REMB update is clamped to [MIN, MAX], so MIN is our
        ## guaranteed quality level.
        _vpx.MIN_BITRATE = 2_000_000
        _vpx.DEFAULT_BITRATE = 3_000_000
        _vpx.MAX_BITRATE = 6_000_000
        logger.info("VP8 bitrate range pinned to 2-6 Mbps (default 3)")
    else:
        logger.warning(
            "aiortc.codecs.vpx bitrate constants moved - "
            "running with default (low) encoder bitrate"
        )
    ## Force a keyframe every ~3s. VP8 otherwise sends keyframes only on
    ## receiver request, and inter-frame prediction leaves ghost trails of
    ## vanished content (e.g. "GAME OVER" text) on static regions until
    ## something redraws them. A periodic full refresh caps ghost lifetime.
    if hasattr(_vpx, "Vp8Encoder") and hasattr(_vpx.Vp8Encoder, "encode"):
        KEYFRAME_INTERVAL = 90  ## frames (~3s at 30fps)
        _original_encode = _vpx.Vp8Encoder.encode

        def _encode_with_periodic_keyframes(self, frame, force_keyframe=False):
            count = getattr(self, "_kf_frame_count", 0)
            self._kf_frame_count = count + 1
            if count % KEYFRAME_INTERVAL == 0:
                force_keyframe = True
            return _original_encode(self, frame, force_keyframe)

        _vpx.Vp8Encoder.encode = _encode_with_periodic_keyframes
        logger.info("VP8 periodic keyframes enabled (every %d frames)", KEYFRAME_INTERVAL)
except ImportError:
    logger.warning(
        "aiortc.codecs.vpx not found in this aiortc version - "
        "running with default (low) encoder bitrate"
    )

router = APIRouter()

## @brief Shared secret matching coturn's --static-auth-secret (from .env).
TURN_SECRET = os.getenv("TURN_SECRET", "")

## @brief Address game-runner reaches coturn at. Must be the LAN IP, not the
##        public hostname: sending to our own public IP would need router
##        hairpin NAT (which fails), and the relay must bind on the LAN
##        interface so its advertised external-ip candidate is forwardable.
TURN_LOCAL_HOST = os.getenv("SERVER_LAN_IP", "127.0.0.1")


def build_ice_servers() -> list[RTCIceServer]:
    """
    @brief Build the ICE server list for one peer connection.
    @return STUN server plus, if configured, the local TURN relay with a
            freshly minted ephemeral credential.

    The relay candidate allocated on the local coturn advertises the
    router's public IP on a forwarded port - that's what makes remote
    (non-LAN) browsers able to reach us, since our host/srflx candidates
    require hairpin NAT from outside. Credentials are computed per
    connection because they expire (coturn REST auth mechanism, same
    HMAC scheme the backend uses for browsers).
    """
    servers = [RTCIceServer(urls="stun:stun.l.google.com:19302")]
    if TURN_SECRET:
        expiry = int(time.time()) + 3600
        username = f"{expiry}:game-runner"
        digest = hmac.new(TURN_SECRET.encode(), username.encode(), hashlib.sha1).digest()
        servers.append(
            RTCIceServer(
                urls=[f"turn:{TURN_LOCAL_HOST}:3478?transport=udp"],
                username=username,
                credential=base64.b64encode(digest).decode(),
            )
        )
    return servers

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

    pc = RTCPeerConnection(RTCConfiguration(iceServers=build_ice_servers()))
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
        @brief Start the game when the peer arrives, clean up when it dies.

        The game process is launched only once the connection is up, so
        the player sees it from its first frame instead of joining a game
        that has been running unwatched through ICE negotiation.

        WebRTC has no explicit close message from the browser; when the
        user leaves, the connection transitions to "failed" after consent
        checks time out. Mirrors the old WebSocket behavior of stopping
        the session on disconnect.
        """
        logger.info(f"[{session_id}] WebRTC connection state: {pc.connectionState}")
        if pc.connectionState == "connected":
            try:
                await session.start_game()
            except Exception:
                logger.exception(f"[{session_id}] Game failed to start")
                await _teardown()
        elif pc.connectionState in ("failed", "closed"):
            await _teardown()

    async def _teardown():
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
