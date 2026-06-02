import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api.jsx";
import "../styles/game-stream.css";

const WS_BASE = "wss://api.hakserver.cc/api/gaming/stream";

export default function GameStreamPage() {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const wsRef = useRef(null);
    const sessionIdRef = useRef(null);
    const frameCountRef = useRef(0);

    const [status, setStatus] = useState("connecting");
    const [fps, setFps] = useState(0);

    // FPS counter - every second, read how many frames arrived and reset
    useEffect(() => {
        const interval = setInterval(() => {
            setFps(frameCountRef.current);
            frameCountRef.current = 0;
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Create session and connect WebSocket
    useEffect(() => {
        let canceled = false;
        let ws = null;

        async function start() {
            try {
                // Step 1: Ask the backend to create a game session
                const res = await api.post("/gaming/sessions", { game_id: gameId });
                if (canceled) return;

                const { session_id } = res.data;
                sessionIdRef.current = session_id;

                // Step 2: Open WebSocket with JWT in query param
                const token = localStorage.getItem("token");
                ws = new WebSocket(`${WS_BASE}/${session_id}?token=${token}`);
                ws.binaryType = "arraybuffer";
                wsRef.current = ws;

                ws.onopen = () => {
                    if (!canceled) setStatus("connected");
                };

                ws.onclose = () => {
                    if (!canceled) setStatus("disconnected");
                };

                ws.onerror = () => {
                    if (!canceled) setStatus("error");
                };

                // Step 3: Each message is a binary JPEG frame
                ws.onmessage = (evt) => {
                    if (evt.data instanceof ArrayBuffer) {
                        renderFrame(evt.data);
                        frameCountRef.current++;
                    }
                };
            } catch (err) {
                if (!canceled) setStatus("error");
            }
        }

        start();

        const activityInterval = setInterval(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                window.dispatchEvent(new Event("media-activity"));
            }
        }, 5 * 60 * 1000)

        // Cleanup: close WebSocket and stop session when leaving the page
        return () => {
            canceled = true;
            clearInterval(activityInterval);
            if (ws) ws.close();
            if (sessionIdRef.current) {
                api.delete(`/gaming/sessions/${sessionIdRef.current}`).catch(() => {});
            }
        };
    }, [gameId]);

    // Render a JPEG frame onto the canvas
    const renderFrame = useCallback((arrayBuffer) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const blob = new Blob([arrayBuffer], { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        const img = new Image();

        img.onload = () => {
            const ctx = canvas.getContext("2d");
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
        };

        img.onerror = () => URL.revokeObjectURL(url);
        img.src = url;
    }, []);

    // Send an input event JSON over the WebSocket
    const sendInput = useCallback((evt) => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(evt));
        }
    }, []);

    // Keyboard handlers - capture all keys while on this page
    useEffect(() => {
        const handleKeyDown = (e) => {
            e.preventDefault();
            sendInput({ type: "keydown", key: e.key });
        };
        const handleKeyUp = (e) => {
            e.preventDefault();
            sendInput({ type: "keyup", key: e.key });
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [sendInput]);

    // Convert mouse position to game coordinates
    const getCanvasCoords = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: Math.round((e.clientX - rect.left) * scaleX),
            y: Math.round((e.clientY - rect.top) * scaleY),
        };
    }, []);

    const handleMouseMove = useCallback(
        (e) => {
            const { x, y } = getCanvasCoords(e);
            sendInput({ type: "mousemove", x, y });
        },
        [getCanvasCoords, sendInput]
    );

    const handleMouseDown = useCallback(
        (e) => {
            const { x, y } = getCanvasCoords(e);
            sendInput({ type: "mousedown", x, y, button: e.button });
        },
        [getCanvasCoords, sendInput]
    );

    const handleMouseUp = useCallback(
        (e) => {
            const { x, y } = getCanvasCoords(e);
            sendInput({ type: "mouseup", x, y, button: e.button });
        },
        [getCanvasCoords, sendInput]
    );

    // Stop button handler
    const handleStop = async () => {
        if (wsRef.current) wsRef.current.close();
        if (sessionIdRef.current) {
            await api.delete(`/gaming/sessions/${sessionIdRef.current}`).catch(() => {});
        }
        navigate("/games");
    };

    return (
        <div className="streamPage">
            <div className="streamHeader">
                <div className="streamInfo">
                    <span className={`streamStatus streamStatus--${status}`}>
                        {status}
                    </span>
                    <span className="streamFps">{fps} FPS</span>
                </div>
                <button className="btn btn--danger" onClick={handleStop}>
                    Stop
                </button>
            </div>

            <div className="streamContainer">
                <canvas
                ref={canvasRef}
                className="streamCanvas"
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onContextMenu={(e) => e.preventDefault()}
                />
                {status === "connecting" && (
                    <div className="streamOverlay">Starting game session...</div>
                )}
                {status == "error" && (
                    <div className="streamOverlay streamOverlay--error">
                        Failed to connect. <button onClick={() => navigate("/games")}>Back to Games</button>
                    </div>
                )}
                {status === "disconnected" && (
                    <div className="streamOverlay">
                        Session ended. <button onClick={() => navigate("/games")}>Back to Games</button>
                    </div>
                )}
            </div>
        </div>
    );
}