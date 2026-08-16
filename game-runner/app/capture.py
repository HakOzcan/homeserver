"""
@file capture.py
@brief FFmpeg-based raw frame capture from a virtual X11 display.

Uses FFmpeg's x11grab to capture a virtual Xvfb display and outputs
raw yuv420p frames to stdout. Every frame has a fixed byte size
(width * height * 3/2), so frames are read with exact-size reads —
no marker parsing needed. The latest frame is stored as a numpy array
shaped for aiortc's VideoFrame.from_ndarray(format="yuv420p").
"""

import asyncio
import logging

import numpy as np

logger = logging.getLogger(__name__)

class FrameCapture:
    """
    @brief Captures raw video frames from an X11 display via FFmpeg subprocess.

    Spawns FFmpeg as an async subprocess that grabs a virtual display
    and outputs raw yuv420p frames to stdout. A background task continuously
    reads the stream and stores the latest frame for retrieval.

    @note Only the most recent frame is kept — older frames are discarded.
          This is intentional: if the WebRTC consumer is slow, we skip
          frames rather than building up a backlog.
    """

    def __init__(self, display_number: int, width: int, height: int, fps: int = 30):
        """
        @brief Initialize capture parameters (does not start FFmpeg yet).
        @param display_number The X11 display number to capture (e.g. 99 → ":99").
        @param width Capture width in pixels (must be even for yuv420p).
        @param height Capture height in pixels (must be even for yuv420p).
        @param fps Target frame rate for capture (default: 30).
        """
        self.display_number = display_number
        self.width = width
        self.height = height
        self.fps = fps
        self.process = None
        self._current_frame: np.ndarray | None = None
        self._read_task = None
        ## yuv420p: full-res Y plane + quarter-res U and V planes
        self._frame_size = width * height * 3 // 2

    async def start(self):
        """
        @brief Launch FFmpeg and begin capturing frames in the background.

        Starts FFmpeg with x11grab input and raw yuv420p output piped to
        stdout. Spawns two background tasks:
        - _read_frames: reads fixed-size raw frames from stdout
        - _log_stderr: logs FFmpeg diagnostic output
        """
        cmd = [
            "ffmpeg",
            "-f", "x11grab",                                ## Input format: X11 screen capture
            "-framerate", str(self.fps),                    ## Capture frame rate
            "-video_size", f"{self.width}x{self.height}",   ## Resolution to grab
            "-i", f":{self.display_number}",                ## Which display to capture (e.g. ":99")
            "-f", "rawvideo",                               ## Output format: raw frames, no container
            "-pix_fmt", "yuv420p",                          ## Pixel format video encoders expect
            "-fflags", "nobuffer",                          ## Minimize output buffering for lower latency
            "-an",                                          ## No audio for now
            "pipe:1",
        ]

        logger.info(f"FFmpeg cmd: {' '.join(cmd)}")
        self.process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        ## Log FFmpeg stderr in background (diagnostics, warnings, etc.)
        asyncio.create_task(self._log_stderr())

        ## Start reading frames from stdout
        self._read_task = asyncio.create_task(self._read_frames())

    async def _read_frames(self):
        """
        @brief Continuously read fixed-size raw frames from FFmpeg stdout.

        Each frame is exactly _frame_size bytes (yuv420p is uncompressed),
        so readexactly() yields one complete frame per call. The frame is
        reshaped to (height * 3/2, width) — the layout that
        av.VideoFrame.from_ndarray(format="yuv420p") expects.
        """
        try:
            while True:
                raw = await self.process.stdout.readexactly(self._frame_size)
                self._current_frame = np.frombuffer(raw, dtype=np.uint8).reshape(
                    (self.height * 3 // 2, self.width)
                )
        except asyncio.IncompleteReadError:
            logger.info("FFmpeg stdout closed - capture ended")
        except asyncio.CancelledError:
            pass

    async def _log_stderr(self):
        """
        @brief Read and log FFmpeg's stderr output for diagnostics.

        FFmpeg writes progress info, warnings, and errors to stderr.
        This task runs in the background so stderr doesn't fill up
        and block the process.
        """
        try:
            while True:
                line = await self.process.stderr.readline()
                if not line:
                    break
                logger.info(f"FFmpeg: {line.decode().rstrip()}")
        except asyncio.CancelledError:
            pass

    def get_frame(self) -> np.ndarray | None:
        """
        @brief Return the most recent captured frame.
        @return Latest frame as a (height*3/2, width) uint8 yuv420p array,
                or None if no frame has been captured yet.
        """
        return self._current_frame

    async def stop(self):
        """
        @brief Stop FFmpeg and clean up resources.

        Cancels the frame-reading task, then terminates FFmpeg gracefully.
        If FFmpeg doesn't exit within 3 seconds, it is force-killed.
        """
        if self._read_task:
            self._read_task.cancel()
            try:
                await self._read_task
            except asyncio.CancelledError:
                pass

        if self.process and self.process.returncode is None:
            self.process.terminate()
            try:
                await asyncio.wait_for(self.process.wait(), timeout=3)
            except asyncio.TimeoutError:
                self.process.kill()
