"""
@file capture.py
@brief FFmpeg-based frame capture from a virtual X11 display.

Uses FFmpeg's x11grab to capture a virtual Xvfb display and outputs
an MJPEG stream to stdout. Frames are parsed by detecting JPEG SOI/EOI
markers (0xFFD8 / 0xFFD9) in the raw byte stream.
"""

import asyncio
import logging

logger = logging.getLogger(__name__)

class FrameCapture:
    """
    @brief Captures frames from an X11 display via FFmpeg subprocess.

    Spawns FFmpeg as an async subprocess that grabs a virtual display
    and outputs JPEG frames to stdout. A background task continuously
    reads the stream and stores the latest frame for retrieval.

    @note Only the most recent frame is kept — older frames are discarded.
          This is intentional: if the WebSocket consumer is slow, we skip
          frames rather than building up a backlog.
    """

    def __init__(self, display_number: int, width: int, height: int, fps: int = 30):
        """
        @brief Initialize capture parameters (does not start FFmpeg yet).
        @param display_number The X11 display number to capture (e.g. 99 → ":99").
        @param width Capture width in pixels.
        @param height Capture height in pixels.
        @param fps Target frame rate for capture (default: 30).
        """
        self.display_number = display_number
        self.width = width
        self.height = height
        self.fps = fps
        self.process = None
        self.current_frame = None
        self._read_task = None
    
    async def start(self):
        """
        @brief Launch FFmpeg and begin capturing frames in the background.

        Starts FFmpeg with x11grab input and MJPEG output piped to stdout.
        Spawns two background tasks:
        - _read_frames: parses JPEG frames from stdout
        - _log_stderr: logs FFmpeg diagnostic output
        """
        cmd = [
            "ffmpeg",
            "-f", "x11grab",                                ## Input format: X11 screen capture
            "-framerate", str(self.fps),                    ## Capture frame rate
            "-video_size", f"{self.width}x{self.height}",   ## Resolution to grab
            "-i", f":{self.display_number}",                 ## Which display to capture (e.g. ":99")
            "-f", "image2pipe",                             ## Output format: pipe individual images
            "-vcodec", "mjpeg",                             ## Encode each frame as JPEG
            "-q:v", "5",                                    ## JPEG quality (2=best, 31=worst)
            "--fflags", "nobuffer",                         ## Minimize output buffering for lower latency
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
        @brief Continuously read FFmpeg stdout and extract JPEG frames.

        Reads raw bytes into a buffer, then scans for JPEG SOI (0xFFD8)
        and EOI (0xFFD9) markers. Each complete SOI→EOI range is one
        JPEG frame. The latest frame is stored in _current_frame.

        @note The buffer is trimmed after each extracted frame to prevent
        unbounded memory growth.
        """
        buffer = bytearray()
        SOI = b"\xff\xd8"   ## JPEG Start of Image marker
        EOI = b"\xff\xd9"   ## JPEG End of Image marker

        try:
            while True:
                chunk = await self.process.stdout.read(4096)
                if not chunk:
                    break

                buffer.extend(chunk)

                while True:
                    soi_idx = buffer.find(SOI)
                    if  soi_idx == -1:
                        buffer.clear()
                        break

                    eoi_idx = buffer.find(EOI, soi_idx + 2)
                    if eoi_idx == -1:
                        ## Have SOI but no EOI yet - trim junk before SOI and wait
                        if soi_idx > 0:
                            del buffer[:soi_idx]
                        break

                    ## Extract complete JPEG frame (SOI through EOI inclusive)
                    frame = bytes(buffer[soi_idx:eoi_idx + 2])
                    self._current_frame = frame
                    del buffer[:eoi_idx + 2]
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
    
    async def get_frame(self) -> bytes | None:
        """
        @brief Return the most recent captured frame.
        @return The latest JPEG frame as bytes, or None if no frame captured yet.
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