"""
@file session.py
@brief Game session lifecycle management.

Orchestrates the full lifecycle of a cloud gaming session:
Xvfb virtual display → game process → FFmpeg frame capture → input injection.
Also manages concurrent sessions with display number allocation.
"""
import asyncio
import logging
import os
import subprocess
import uuid
from datetime import datetime
from app.capture import FrameCapture
from app.input import InputInjector

logger = logging.getLogger(__name__)

## @brief Maximum number of concurrent game sessions.
## @details Limited by Mac Mini's CPU - each session runs Xvfb + FFmpeg + a game.
MAX_SESSIONS = 3

## @brief Starting X11 display number for session allocation.
## @details Sessions get display ::99, ::100, ::101. Display :0 is typically
##          the real display(if any, which there is not), so we start high to avoid conflicts.
BASE_DISPLAY = 99

class GameSession:
    """
    @brief Represent a single running game session.

    Manages the complete lifecycle of one game instance:
    starting the virtual display, launching the game process,
    capturing frames, and injecting the input. Each session is
    isolated on its own X11 display number
    """

    def __init__(self, session_id: str, game: dict, user_id: str, display_number: int):
        """
        @brief Initialize session metadata and parse game resolution.
        @param session_id Unique UUID string identifying this session.
        @param game Game dictionary from the registry (has id, type, executable, resolution, etc.).
        @param user_id ID of the user who started this session.
        @param display_number Allocated X11 display number (e.g. 99).
        """
        self.session_id = session_id
        self.game = game
        self.user_id = user_id
        self.display_number = display_number
        self.status = "starting"
        self.created_at = datetime.utcnow().isoformat()

        self.xvfb_process = None
        self.game_process = None
        self.capture = None
        self.input_injector = None

        ## Parse resolution string "800x600" into width and height integers
        resolution = game.get("resolution", "800x600")
        self.width, self.height = (int(x) for x in resolution.split("x"))

    async def start(self):
        """
        @brief Start all session components in sequence.

        Launch order matters — each step depends on the previous:
        1. Xvfb must be running before anything can use the display
        2. Game process needs the display to render to
        3. FFmpeg needs something on the display to capture
        4. InputInjector needs the display to send events to

        @throws RuntimeError If Xvfb or the game process fails to start.
        """
        display = f":{self.display_number}"

        ## --- Step 1: Start Xvfb (virtual framebuffer) ---
        logger.info(f"[{self.session_id}] Starting Xvfb on display {display} ({self.width}x{self.height})")
        self.xvfb_process = subprocess.Popen(
            [
                "Xvfb", display,
                "-screen", "0", f"{self.width}x{self.height}x24", ## 24-bit color depth
                "-nolisten", "tcp", ## Security: no remote X connections
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        ## Give Xvfb a moment to initialize
        await asyncio.sleep(0.5)

        ## Check if Xvfb crashed during startup
        if self.xvfb_process.poll() is not None:
            stderr = self.xvfb_process.stderr.read().decode()
            logger.error(f"[{self.session_id}] Xvfb failed to start: {stderr}")
            raise RuntimeError(f"Xvfb failed: {stderr}")
        logger.info(f"[{self.session_id}] Xvfb started (pid={self.xvfb_process.pid})")

        ## --- Step 2: Launch the game process ---
        env = {
            **os.environ,
            "DISPLAY": display,                 ## Tell the game which virtual display to use
            "SDL_AUDIODRIVER": "dummy",         ## No audio hardware in Docker (for now) - use dommy driver
            "GAME_WIDTH": str(self.width),      ## Pass resolution to the game script
            "GAME_HEIGHT": str(self.height),
        }

        game_type = self.game.get("type", "python")
        executable = self.game["executable"]

        if game_type == "python":
            cmd = ["python", executable]
        elif game_type == "unity":
            ## Unity Linux builds need software rendering (no GPU in container)
            env["LIBGL_ALWAYS_SOFTWARE"] = "1"
            cmd = [
                f"./{executable}",
                "-screen-width", str(self.width),
                "-screen-height", str(self.height),
                "-screen-fullscreen", "0",
            ]
        else:
            raise ValueError(f"Unknown game type: {game_type}")

        logger.info(f"[{self.session_id}] Starting game: {cmd}")
        self.game_process = subprocess.Popen(
            cmd,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        await asyncio.sleep(0.5)

        ## Check if the game crashed immediately
        if self.game_process.poll() is not None:
            stderr = self.game_process.stderr.read().decode()
            stdout = self.game_process.stdout.read().decode()
            logger.error(f"[{self.session_id}] Game exited immediately. stderr: {stderr} stdout: {stdout}")
            raise RuntimeError(f"Game failed to start: {stderr}")
        logger.info(f"[{self.session_id}] Game started (pid={self.game_process.pid})")

        ## --- Step 3: Start frame capture ---
        self.capture = FrameCapture(self.display_number, self.width, self.height)
        await self.capture.start()
        logger.info(f"[{self.session_id}] FFmpeg capture started")

        ## --- Step 4: Set up input injection ---
        self.input_injector = InputInjector(self.display_number)

        self.status = "running"
        logger.info(f"[{self.session_id}] Session is now running")
    
    async def stop(self):
        """
        @brief Gracefully stop all session components and clean up processes.

        Stops in reverse order: capture first (no more FFmpeg), then game,
        then Xvfb. Each process gets 3 seconds to terminate gracefully
        before being force-killed.
        """
        self.status = "stopping"

        ## Stop FFmpeg capture first
        if self.capture:
            await self.capture.stop()
        
        ## Terminate game and Xvfb processes
        for proc in [self.game_process, self.xvfb_process]:
            if proc and proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    proc.kill()
        
        self.status = "stopped"
    
    def is_alive(self) -> bool:
        """
        @brief Check if the session is still running.
        @return True if the game process is alive and status is "running".
        """
        if self.game_process and self.game_process.poll() is not None:
            return False
        return self.status == "running"
    
    def to_dict(self) -> dict:
        """
        @brief Serialize session metadata to a dictionary for API responses.
        @return Dictionary with session_id, game info, user_id, status, and created_at.
        """
        return {
            "session_id": self.session_id,
            "game_id": self.game["id"],
            "game_name": self.game["name"],
            "user_id": self.user_id,
            "status": self.status,
            "created_at": self.created_at,
        }

class SessionManager:
    """
    @brief Manages all active game sessions and allocates display numbers.

    Acts as the central coordinator for session lifecycle. Ensures we don't
    exceed MAX_SESSIONS, assigns unique display numbers, and handles cleanup
    when sessions end (whether normally or due to errors).
    """

    def __init__(self):
        """
        @brief Initialize with empty session tracking.
        """
        self.sessions:dict[str, GameSession] = {}
        self._used_displays: set[int] = set()
    
    def _allocate_display(self) -> int | None:
        """
        @brief Find the next available X11 display number.
        @return An available display number (99-101), or None if all are in use.
        """
        for i in range(BASE_DISPLAY, BASE_DISPLAY + MAX_SESSIONS):
            if i not in self._used_displays:
                self._used_displays.add(i)
                return i
        return None
    
    async def create_session(self, game: dict, user_id: str) -> GameSession:
        """
        @brief Create and start a new game session.
        @param game Game dictionary from the registry.
        @param user_id ID of the user requesting the session.
        @return The started GameSession instance.
        @throws RuntimeError If max sessions reached, no displays available,
                or session fails to start.

        @note If start() fails, the display and session are cleaned up
              automatically so we don't leak resources.
        """
        if len(self.sessions) >= MAX_SESSIONS:
            raise RuntimeError("Maximum concurrent sessions reached")
        
        display = self._allocate_display()
        if display is None:
            raise RuntimeError("No available displays")
        
        session_id = str(uuid.uuid4())
        session = GameSession(session_id, game, user_id, display)
        self.sessions[session_id] = session

        try:
            await session.start()
        except Exception:
            ## Clean up on failure - don't leak the display number or session entry
            self._used_displays.discard(display)
            del self.sessions[session_id]
            raise

        return session
    
    async def stop_session(self, session_id: str) -> bool:
        """
        @brief Stop a session and release its resources.
        @param session_id The UUID of the session to stop.
        @return True if session was found and stopped, False if not found.
        """
        session = self.sessions.get(session_id)
        if not session:
            return False
        
        await session.stop()
        self._used_displays.discard(session.display_number)
        self.sessions.pop(session_id, None)
        return True
    
    def get_session(self, session_id: str) -> GameSession | None:
        """
        @brief Look up a session by its ID.
        @param session_id The UUID string.
        @return The GameSession if found, None otherwise.
        """
        return self.sessions.get(session_id)
    
    def get_active_sessions(self) -> list[dict]:
        """
        @brief Return metadata for all active sessions.
        @return List of session dictionaries (via GameSession.to_dict()).
        """
        return [s.to_dict() for s in self.sessions.values()]

### @brief Module-level singleton - shared across the entire app.
### @details Imported by main.py and ws.py so all routes use the same manager
session_manager = SessionManager()