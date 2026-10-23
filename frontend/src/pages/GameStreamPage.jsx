import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api.jsx";
import "../styles/game-stream.css";

// Wait until the peer connection has gathered all its ICE candidates,
// so the offer we POST is complete and no trickle signaling is needed.
// The timeout is a safety net: a partial candidate list usually still works.
function waitForIceGathering(pc, timeoutMs = 3000) {
    if (pc.iceGatheringState === "complete") return Promise.resolve();
    return new Promise((resolve) => {
        const timeout = setTimeout(resolve, timeoutMs);
        pc.addEventListener("icegatheringstatechange", () => {
            if (pc.iceGatheringState === "complete") {
                clearTimeout(timeout);
                resolve();
            }
        });
    });
}

export default function GameStreamPage() {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const pcRef = useRef(null);
    const channelRef = useRef(null);
    const sessionIdRef = useRef(null);

    const [status, setStatus] = useState("connecting");
    const [fps, setFps] = useState(0);

    // FPS counter - WebRTC tracks decode stats internally, so instead of
    // counting messages we read framesPerSecond from the stats API.
    useEffect(() => {
        const interval = setInterval(async () => {
            const pc = pcRef.current;
            if (!pc || pc.connectionState !== "connected") return;
            const stats = await pc.getStats();
            stats.forEach((report) => {
                if (report.type === "inbound-rtp" && report.kind === "video") {
                    setFps(Math.round(report.framesPerSecond || 0));
                }
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Create session and negotiate the WebRTC connection
    useEffect(() => {
        let canceled = false;
        let pc = null;

        async function start() {
            try {
                // Step 1: Ask the backend to create a game session, and fetch
                // the ICE config (STUN + TURN with ephemeral credentials) -
                // connection infrastructure is decided server-side.
                const [res, iceRes] = await Promise.all([
                    api.post("/gaming/sessions", { game_id: gameId }),
                    api.get("/gaming/webrtc/ice-config"),
                ]);
                
                const { session_id } = res.data;
                if (canceled) {
                    // We left the page while the session was being created, so the cleanup ran before this id existed - stop it here.
                    api.delete(`/gaming/sessions/${session_id}`).catch(() => {});
                    return;
                }
                sessionIdRef.current = session_id;

                // Step 2: Build the peer connection. Everything that must be
                // negotiated has to exist before createOffer().
                pc = new RTCPeerConnection(iceRes.data);
                pcRef.current = pc;

                // Receive-only video from game-runner
                const transceiver = pc.addTransceiver("video", { direction: "recvonly" });

                // Prefer VP8 - reorders the codec list in our offer so
                // game-runner's answer picks VP8 first.
                if (transceiver.setCodecPreferences) {
                    const codecs = RTCRtpReceiver.getCapabilities("video").codecs;
                    const vp8 = codecs.filter((c) => c.mimeType === "video/VP8");
                    const rest = codecs.filter((c) => c.mimeType !== "video/VP8");
                    if (vp8.length) transceiver.setCodecPreferences([...vp8, ...rest]);
                }

                // Input events travel over this DataChannel (same UDP
                // connection as the video, no separate socket).
                const channel = pc.createDataChannel("input");
                channelRef.current = channel;

                // When the video track arrives, hand it to the <video> element
                pc.ontrack = (evt) => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = new MediaStream([evt.track]);
                    }
                };

                pc.onconnectionstatechange = () => {
                    if (canceled) return;
                    switch (pc.connectionState) {
                        case "connected":
                            setStatus("connected");
                            break;
                        case "failed":
                            setStatus("error");
                            break;
                        case "disconnected":
                        case "closed":
                            setStatus("disconnected");
                            break;
                        default:
                            break;
                    }
                };

                // Step 3: Offer/answer signaling through the backend.
                // JWT auth rides on the normal Authorization header now -
                // no more token in the URL like the WebSocket needed.
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                await waitForIceGathering(pc);
                if (canceled) return;

                const answerRes = await api.post(`/gaming/webrtc/offer/${session_id}`, {
                    sdp: pc.localDescription.sdp,
                    type: pc.localDescription.type,
                });
                if (canceled) return;

                // Step 4: Apply the answer - ICE takes over from here and
                // the connection goes live without further signaling.
                await pc.setRemoteDescription(answerRes.data);
            } catch (err) {
                if (!canceled) setStatus("error");
            }
        }

        start();

        const activityInterval = setInterval(() => {
            const pc = pcRef.current;
            if (pc && pc.connectionState === "connected") {
                window.dispatchEvent(new Event("media-activity"));
            }
        }, 5 * 60 * 1000)

        // Cleanup: close the peer connection and stop session when leaving
        return () => {
            canceled = true;
            clearInterval(activityInterval);
            if (pc) pc.close();
            if (sessionIdRef.current) {
                api.delete(`/gaming/sessions/${sessionIdRef.current}`).catch(() => {});
            }
        };
    }, [gameId]);

    // Send an input event JSON over the DataChannel
    const sendInput = useCallback((evt) => {
        const channel = channelRef.current;
        if (channel && channel.readyState === "open") {
            channel.send(JSON.stringify(evt));
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

    // Convert mouse position to game coordinates. videoWidth/videoHeight
    // are the stream's intrinsic resolution (the game's Xvfb size).
    const getVideoCoords = useCallback((e) => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return { x: 0, y: 0 };
        const rect = video.getBoundingClientRect();
        const scaleX = video.videoWidth / rect.width;
        const scaleY = video.videoHeight / rect.height;
        return {
            x: Math.round((e.clientX - rect.left) * scaleX),
            y: Math.round((e.clientY - rect.top) * scaleY),
        };
    }, []);

    const handleMouseMove = useCallback(
        (e) => {
            const { x, y } = getVideoCoords(e);
            sendInput({ type: "mousemove", x, y });
        },
        [getVideoCoords, sendInput]
    );

    const handleMouseDown = useCallback(
        (e) => {
            const { x, y } = getVideoCoords(e);
            sendInput({ type: "mousedown", x, y, button: e.button });
        },
        [getVideoCoords, sendInput]
    );

    const handleMouseUp = useCallback(
        (e) => {
            const { x, y } = getVideoCoords(e);
            sendInput({ type: "mouseup", x, y, button: e.button });
        },
        [getVideoCoords, sendInput]
    );

    // Stop button handler
    const handleStop = async () => {
        if (pcRef.current) pcRef.current.close();
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
                <video
                ref={videoRef}
                className="streamCanvas"
                autoPlay
                playsInline
                muted
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
