import React, { useEffect, useRef } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import Hls from "hls.js";
import "../styles/player.css";

async function detectVideoCapabilities() {
  const h264 = MediaSource.isTypeSupported(`video/mp4; codecs="avc1.640033"`);

  let hevc = false;
  let hdr = false;

  if (navigator.mediaCapabilities) {
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

  return { h264, hevc, hdr };
}

const VjsMenuItem = videojs.getComponent("MenuItem");
const VjsMenuButton = videojs.getComponent("MenuButton");

class TrackMenuItem extends VjsMenuItem {
  constructor(player, options) {
    super(player, {
      label: options.label,
      selectable: true,
      selected: options.selected || false,
    });
    this.trackValue = options.trackValue;
    this.eventName = options.eventName;
  }

  handleClick() {
    this.player().trigger(this.eventName, { value: this.trackValue });
  }
}

class TrackMenuButton extends VjsMenuButton {
  constructor(player, options) {
    super(player, options);
    this.addClass(options.className || "");
    this.controlText(options.title || "");
    const el = this.el().querySelector(".vjs-icon-placeholder");
    if (el) el.textContent = options.buttonLabel || "";
  }

  createItems() {
    return (this.options_.trackItems || []).map(
      (item) =>
        new TrackMenuItem(this.player(), {
          label: item.label,
          trackValue: item.value,
          selected: item.selected,
          eventName: this.options_.eventName,
        })
    );
  }
}

videojs.registerComponent("TrackMenuButton", TrackMenuButton);

const VideoPlayer = ({ video }) => {
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (playerRef.current) return;

    const src = `https://api.hakserver.cc/api/media/hls/${video}/master.m3u8`;

    const videoElement = document.createElement("video-js");
    videoElement.classList.add("vjs-big-play-centered");
    containerRef.current.appendChild(videoElement);

    const player = videojs(videoElement, {
      controls: true,
      fluid: true,
      responsive: true,
    });

    const videoEl = player.tech({ IWillNotUseThisInPlugins: true }).el();
    const controlBar = player.getChild("controlBar");

    if (Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: (xhr) => {
          const token = localStorage.getItem("token");
          if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        },
      });

      hls.loadSource(src);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, async () => {
        const caps = await detectVideoCapabilities();
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

        if (!supported.includes(hls.currentLevel) && supported.length > 0) {
          hls.currentLevel = supported[0];
        }

        const qualityItems = [
          { label: "Auto", value: -1, selected: true },
          ...supported.map((i) => ({
            label: `${allLevels[i].height}p ${allLevels[i].videoRange === "PQ" ? "HDR" : "SDR"}`,
            value: i,
            selected: false,
          })),
        ];

        const fsToggle = controlBar.getChild("fullscreenToggle");
        const fsIndex = controlBar.children().indexOf(fsToggle);

        controlBar.addChild("TrackMenuButton", {
          trackItems: qualityItems,
          eventName: "qualitychange",
          title: "Quality",
          buttonLabel: "HD",
          className: "vjs-quality-selector",
        }, fsIndex);

        videoEl.play();
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
        const tracks = data.audioTracks.filter(
          (track) => !track.url.includes("dolby")
        );

        const stereo = tracks.find((t) => t.name.includes("Stereo"));
        if (stereo) hls.audioTrack = stereo.id;

        if (tracks.length > 1) {
          const audioItems = tracks.map((t) => ({
            label: t.name,
            value: t.id,
            selected: t.id === hls.audioTrack,
          }));

          const fsToggle = controlBar.getChild("fullscreenToggle");
          const fsIndex = controlBar.children().indexOf(fsToggle);

          controlBar.addChild("TrackMenuButton", {
            trackItems: audioItems,
            eventName: "audiochange",
            title: "Audio",
            buttonLabel: "Audio",
            className: "vjs-audio-selector",
          }, fsIndex);
        }
      });

      player.on("qualitychange", (_, data) => {
        hls.currentLevel = data.value;
        const qs = controlBar.children().find(
          (c) => c.hasClass && c.hasClass("vjs-quality-selector")
        );
        if (qs && qs.items) {
          qs.items.forEach((item) => item.selected(item.trackValue === data.value));
        }
      });

      player.on("audiochange", (_, data) => {
        hls.audioTrack = data.value;
        const as = controlBar.children().find(
          (c) => c.hasClass && c.hasClass("vjs-audio-selector")
        );
        if (as && as.items) {
          as.items.forEach((item) => item.selected(item.trackValue === data.value));
        }
      });

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
        if (data.subtitleTracks.length > 0) {
          const subItems = [
            { label: "Off", value: -1, selected: true },
            ...data.subtitleTracks.map((t) => ({
              label: t.name,
              value: t.id,
              selected: false,
            })),
          ];

          const fsToggle = controlBar.getChild("fullscreenToggle");
          const fsIndex = controlBar.children().indexOf(fsToggle);

          controlBar.addChild("TrackMenuButton", {
            trackItems: subItems,
            eventName: "subtitlechange",
            title: "Subtitles",
            buttonLabel: "CC",
            className: "vjs-subtitle-selector",
          }, fsIndex);
        }
      });

      player.on("subtitlechange", (_, data) => {
        hls.subtitleTrack = data.value;
        hls.subtitleDisplay = data.value !== -1;
        const ss = controlBar.children().find(
          (c) => c.hasClass && c.hasClass("vjs-subtitle-selector")
        );
        if (ss && ss.items) {
          ss.items.forEach((item) => item.selected(item.trackValue === data.value));
        }
      });

      playerRef.current = player;
      playerRef.current._hls = hls;

    } else if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
      videoEl.src = src;
      videoEl.addEventListener("loadedmetadata", () => videoEl.play());
      playerRef.current = player;
    }

    const activityInterval = setInterval(() => {
      if (videoEl && !videoEl.paused) {
        window.dispatchEvent(new Event("media-activity"));
      }
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(activityInterval);
      if (playerRef.current) {
        if (playerRef.current._hls) playerRef.current._hls.destroy();
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [video]);

  return <div ref={containerRef} data-vjs-player />;
};

export default VideoPlayer;
