import React from "react";

const VideoPlayer = ({ video, onBack }) => {
  if (!video) return null;

  return (
    <div style={{ textAlign: "center" }}>
      <h2>{video}</h2>
      <video
        controls
        autoPlay
        style={{
          width: "100%",
          maxWidth: "900px",
          borderRadius: "12px",
          boxShadow: "0 0 10px rgba(0,0,0,0.3)",
        }}
        src={`https://api.hakserver.cc/api/media/stream/${video}`}
      />
      <br />
      <button onClick={onBack} style={{ marginTop: "1rem" }}>
        ← Back to Library
      </button>
    </div>
  );
};

export default VideoPlayer;
