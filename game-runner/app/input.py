"""
@file input.py
@brief Translates browser input events into X11 commands via xdotool.
The browser captures keyboard and mouse events and sends them as JSON
over WebSocket. This module maps browser event names to X11 keysym names
and uses xdotool to inject them into the correct virtual display.
"""

import subprocess

## @brief Mapping from browser KeyboardEvent.key names to X11 keysym names.
## @details Browser and X11 use different naming conventions for special keys.
##          Single-character keys (letters, numbers, punctuation) map directly
##          and don't need an entry here.
KEY_MAP = {
    "ArrowUp": "Up",
    "ArrowDown": "Down",
    "ArrowLeft": "Left",
    "ArrowRight": "Right",
    "Enter": "Return",
    "Escape": "Escape",
    " ": "space",
    "Backspace": "BackSpace",
    "Tab": "Tab",
    "Shift": "Shift_L",
    "Control": "Control_L",
    "Alt": "Alt_L",
}

## @brief Mapping from browser MouseEvent.button numbers to X11 button numbers.
## @details Browser uses 0/1/2 for left/middle/right,
##          X11 uses 1/2/3.
MOUSE_BUTTON_MAP = {
    0: 1,   #left
    1: 2,   #middle
    2: 3,   #right
}

class InputInjector:
    """
    @brief Injects keyboard and mouse events into a virtual X11 display.

    Uses xdotool to send input commands to a specific Xvfb display.
    Each game session gets its own InputInjector pointed at its own display,
    so inputs are isolated between sessions.
    """

    def __init__(self, display_number: int):
        """
        @brief Initialize the injector for a specific X11 display.
        @param display_number The display number (e.g. 99 → DISPLAY=":99").
        """
        self.display = f"{display_number}"
        ## xdotool reads DISPLAY from the environment to know which display to target
        self.env = {"DISPLAY": self.display}

    def _run_xdotool(self, args: list[str]):
        """
        @brief Execute an xdotool command targeting the configured display.
        @param args List of xdotool arguments (e.g. ["keydown", "Up"]).

        @note Uses Popen (fire-and-forget) instead of subprocess.run so we
              don't block the async event loop waiting for xdotool to finish.
              Errors are silently ignored — a dropped input event is preferable
              to crashing the session.
        """
        try:
            subprocess.Popen(
                ["xdotool"] + args,
                env=self.env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except Exception:
            pass
    
    def handle_event(self, event: dict):
        """
        @brief Route a browser input event to the appropriate xdotool command.
        @param event Dictionary from the browser with at minimum a "type" field.
               Keyboard events include "key", mouse events include "x", "y", "button".

        Supported event types:
        - keydown / keyup → xdotool keydown/keyup <keysym>
        - mousemove       → xdotool mousemove --screen 0 <x> <y>
        - mousedown / mouseup → xdotool mousedown/mouseup <button>
        """ 
        event_type = event.get("type")

        if event_type == "keydown":
            key = self._map_key(event.get("key", ""))
            if key:
                self._run_xdotool(["keydown", key])
        elif event_type == "keyup":
            key = self._map_key(event.get("key", ""))
            if key:
                self._run_xdotool(["keyup", key])
        elif event_type == "mousemove":
            x = int(event.get("x", 0))
            y = int(event.get("y", 0))
            self._run_xdotool(["mousemove", "--screen", "0", str(x), str(y)])
        elif event_type == "mousedown":
            button = MOUSE_BUTTON_MAP.get(event.get("button", 0), 1)
            self._run_xdotool(["mousedown", str(button)])
        elif event_type == "mouseup":
            button = MOUSE_BUTTON_MAP.get(event.get("button", 0), 1)
            self._run_xdotool(["mouseup", str(button)])
    
    def _map_key(self, key: str) -> str | None:
        """
        @brief Convert a browser key name to an X11 keysym name.
        @param key The KeyboardEvent.key value from the browser.
        @return The X11 keysym string, or None if unmappable.

        @details Special keys are looked up in KEY_MAP. Single-character keys
                 (letters, digits, punctuation) pass through directly since
                 xdotool accepts them as-is.
        """
        if key in KEY_MAP:
            return KEY_MAP[key]
        ## Single character keys (a-z, 0-9, etc.) map directly to xdotool
        if len(key) == 1:
            return key
        return None