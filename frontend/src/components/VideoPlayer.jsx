import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

function detectVideoCapabilities() {
  const h264 = MediaSource.isTypeSupported('video/mp4; codecs="avc1.640033"');
  const hevc = MediaSource.isTypeSupported('video/mp4; codecs="hvc1.2.4.L150.B0"');
  return { h264, hevc, hdr: hevc };
}

const VideoPlayer = ({ video, onBack }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [audioTracks, setAudioTracks] = useState([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState(-1);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1);
  const [supportedLevelIndices, setSupportedLevelIndices] = useState([]);

  useEffect(() => {
    const videoEl = videoRef.current;
    const token = localStorage.getItem("token");
    const src = `https://api.hakserver.cc/api/media/hls/${video}/master.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: (xhr) => {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        },
      });

      hls.loadSource(src);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const caps = detectVideoCapabilities();
        const allLevels = hls.levels;

        const supported = [];
        allLevels.forEach((level, i) => {
          const isHevc = level.codecs?.toLowerCase().includes("hvc1");
          const isHdr = level.videoRange === "PQ";

          if (isHevc && isHdr) {
            if (caps.hdr) supported.push(i);
          } else if (isHevc) {
            if (caps.hevc) supported.push(i);
          } else {
            supported.push(i);
          }
        });

        setSupportedLevelIndices(supported);
        setLevels(allLevels);

        if (!supported.includes(hls.currentLevel) && supported.length > 0) {
          hls.currentLevel = supported[0];
        }

        setCurrentLevel(hls.currentLevel);
        setCurrentAudioTrack(hls.audioTrack);
        videoEl.play();
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
        const supported = data.audioTracks.filter((track) => {
          if (track.url.includes("eac3")) {
            return MediaSource.isTypeSupported(`audio/mp4; codecs="ec-3"`);
          }
          return true;
        });
        setAudioTracks(supported);

        const stereo = supported.find((t) => t.name.includes("Stereo"));
        if (stereo) {
          hls.audioTrack = stereo.id;
        }
      });

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
        setSubtitleTracks(data.subtitleTracks);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentLevel(data.level);
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
        setCurrentAudioTrack(data.id);
      });

      hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_, data) => {
        setCurrentSubtitleTrack(data.id);
      });

      hlsRef.current = hls;

      return () => {
        hls.destroy();
      };
    } else if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
      videoEl.src = src;
      videoEl.addEventListener("loadedmetadata", () => videoEl.play());
    }
  }, [video]);

  const onQualityChange = (e) => {
    const level = parseInt(e.target.value);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setCurrentLevel(level);
    }
  };

  const onAudioChange = (e) => {
    const track = parseInt(e.target.value);
    if (hlsRef.current) {
      hlsRef.current.audioTrack = track;
    }
  };

  const onSubtitleChange = (e) => {
    const track = parseInt(e.target.value);
    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = track;
      hlsRef.current.subtitleDisplay = track !== -1;
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h2>{video}</h2>
      <video 
        ref={videoRef}
        controls
        style={{
          width: "100%",
          maxWidth: "1200px",
          borderRadius: "12px",
          boxShadow: "0 0 10px rgba(0,0,0,0.3)",
        }}
      />

      <div style ={{ marginTop: "1rem", display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap"  }}>
        <label>
          Quality:
          <select value={currentLevel} onChange={onQualityChange} style={{ marginLeft: "0.5rem" }}>
            <option value={-1}>Auto</option>
            {levels.map((level, i) => {
              if (!supportedLevelIndices.includes(i)) return null;
              return (
                <option key={i} value={i}>
                  {level.height}p {level.videoRange === "PQ" ? "HDR" : "SDR"}
                </option>
              );
            })}
          </select>
        </label>

        <label>
          Audio:
          <select value={currentAudioTrack} onChange={onAudioChange} style={{ marginLeft: "0.5rem" }}>
            {audioTracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Subtitles:
          <select value={currentSubtitleTrack} onChange={onSubtitleChange} style={{ marginLeft: "0.5rem" }}>
            <option value={-1}>Off</option>
            {subtitleTracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <br />
      <button onClick={onBack} style={{ marginTop: "1rem" }}>
        ← Back to Library
      </button>
    </div>
  );
};

export default VideoPlayer;
