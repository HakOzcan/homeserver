import React, {useEffect, useRef} from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "../styles/player.css";

async function detectVideoCapabilities() {
  const h264 = MediaSource.isTypeSupported(`video/mp4; codecs="avc1.640033"`);

  let hevc = false;
  let hdr = false;

  if (navigator.mediaCapabilities){
    try {
      const hevcResult = await navigator.mediaCapabilities.decodingInfo({
        type: `media-source`,
        video: {
          contentType: `video/mp4; codecs="hvc1.2.4.L153.B0"`,
          width: 3840,
          height: 2160,
          bitrate: 20000000,
          framerate: 24,
        },
      });
      hevc = hevcResult.supported;
    } catch {
      hevc = false;
    }

    if (hevc) {
      try {
        const hdrResult = await navigator.mediaCapabilities.decodingInfo({
          type: `media-source`,
          video: {
            contentType: `video/mp4; codecs="hvc1.2.4.L153.B0"`,
            width: 3840,
            height: 2160,
            bitrate: 40000000,
            framerate: 24,
            transferFunction: `pq`,
          },
        });
        hdr = hdrResult.supported;
      } catch {
        hdr = false;
      }
    }
  } else {
    const hevcStrings = [
      `video/mp4; codecs="hvc1.2.4.L153.B0"`,
      `video/mp4; codecs="hvc1.2.4.L150.B0"`,
      `video/mp4; codecs="hvc1.2.4.L153.B0"`,
    ];
    hevc = hevcStrings.some((s) => MediaSource.isTypeSupported(s));
    hdr = hevc;
  }

  return {h264, hevc, hdr};
}

const VideoPlayer = ({ video }) => {
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (playerRef.current) return;

    const src = `https://api.hakserver.cc/api/media/hls/${video}/master.m3u8`;

    const videoElement = document.createElement("video-js");
    videoElement.classList.add("vjs-big-play-centered");
    containerRef.current.appendChild(videoElement);

    videojs.Vhs.xhr.beforeRequest = (options) => {
      const token = localStorage.getItem("token");
      if (token) {
        options.headers = options.headers || {};
        options.headers.Authorization = `Bearer ${token}`;
      }
      return options;
    };

    const player = videojs(videoElement, {
      controls: true,
      autoplay: true,
      fluid: true,
      responsive: true,
      html5: {
        vhs: {
          overrideNative: true,
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false,
        nativeTextTracks: false,
      },
      sources: [{ src, type: "application/x-mpegURL" }],
    });

    const qualityLevels = player.qualityLevels();

    detectVideoCapabilities().then((caps) => {
      qualityLevels.on("addqualitylevel", (event) => {
        const level = event.qualityLevel;
        const codecs = (level.codecs || "").toLowerCase();
        const isHevc = codecs.includes("hvc1") || codecs.includes("hev1");

        if (isHevc && !caps.hevc) {
          level.enabled = false;
        }
        if (isHevc && codecs.includes("hvc1.2") && !caps.hdr) {
          level.enabled = false;
        }
      });
    });

    player.ready(() => {
      const audioTracks = player.audioTracks();

      const filterAudio = () => {
        let stereoIndex = -1;
        for (let i = 0; i < audioTracks.length; i++) {
          const track = audioTracks[i];
          if (track.label && track.label.toLowerCase().includes("dolby")) {
            track.enabled = false;
          }
          if (track.label && track.label.includes("Stereo") && stereoIndex === -1) {
            stereoIndex = i;
          }
        }
        if (stereoIndex !== -1) {
          audioTracks[stereoIndex].enabled = true;
        }
      };

      audioTracks.on("addtrack", filterAudio);
    });

    const activityInterval = setInterval(() => {
      if (player && !player.paused()) {
        window.dispatchEvent(new Event("media-activity"));
      }
    }, 5 * 60 * 1000);

    playerRef.current = player;

    return () => {
      clearInterval(activityInterval);
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [video]);

  return <div ref={containerRef} data-vjs-player />;
};

export default VideoPlayer;