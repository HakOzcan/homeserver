import React, {useEffect,useRef} from "react";
import axios from "axios";

const VideoPlayer = ({ video, onBack }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const getSignedURL = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(
                `https://api.hakserver.cc/api/media/play/${video}`,
                {
                    headers: { Authorization: `Bearer ${token} `},
                }
            );
            videoRef.current.src = res.data.url;
        } catch (err) {
            console.error("Error loading video: ", err);
        }
    };
    getSignedURL();
  }, [video]);

  return (
    <div style={{ textAlign: "center" }}>
      <h2>{video}</h2>
      <video
        ref={videoRef}
        controls
        autoPlay
        style={{
          width: "100%",
          maxWidth: "900px",
          borderRadius: "12px",
          boxShadow: "0 0 10px rgba(0,0,0,0.3)",
        }}
      />
      <br />
      <button onClick={onBack} style={{ marginTop: "1rem" }}>
        ← Back to Library
      </button>
    </div>
  );
};

export default VideoPlayer;
