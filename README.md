# Home Server

A self-hosted cloud platform running on a Mac Mini (Ubuntu): media streaming,
cloud storage, and browser-based **cloud gaming over WebRTC** — playable by
anyone with the link, nothing to install.

Live at `hakserver.cc` (private instance).

## Services

| Service | Tech | Role |
|---|---|---|
| `frontend` | React + Vite, served by nginx | SPA for all features |
| `backend` | FastAPI + PostgreSQL | Auth (JWT + server-side sessions), media/storage APIs, gaming proxy & WebRTC signaling |
| `game-runner` | FastAPI + Xvfb + FFmpeg + aiortc | Runs game sessions and streams them over WebRTC |
| `coturn` | coturn | TURN relay so remote (non-LAN) players can connect |
| `db` | PostgreSQL 16 | Users, sessions, app data |
| `nginx-proxy` + `acme-companion` | jwilder/nginx-proxy | Reverse proxy with automatic Let's Encrypt certificates |
| `cloudflare-ddns` | oznu/cloudflare-ddns | Keeps the domain pointed at the home connection's dynamic IP |

## Android TV client

`androidtv/` — a native Kotlin app for Android TV and Fire TV, talking to the same
FastAPI backend as the web SPA (`api.hakserver.cc`).

| Area | Implementation |
|---|---|
| UI | Jetpack Compose for TV (`androidx.tv.material3`) — D-pad navigation with
explicit initial-focus handling per screen |
| Playback | Media3 / ExoPlayer via `HlsMediaSource`, with every manifest, segment
and subtitle fetched through the authenticated OkHttp client |
| Quality selector | Relabels media3's raw `1920x1080, 2.5 Mb` renditions as `1080p
HEVC` / `1080p H.264`, disambiguating same-height tracks from the multi-codec HLS
ladder |
| Architecture | MVVM — five ViewModels over `AuthRepository` / `MediaRepository`,
manual DI through `AppContainer` |
| Auth | Transparent access-token refresh via an OkHttp `Authenticator` |

minSdk 28. Developed and tested against real Fire TV hardware.

## Cloud gaming architecture

Games run server-side, each session isolated on its own virtual X11 display.
The video is encoded to VP8 and delivered over WebRTC; player input travels
back over a WebRTC DataChannel.

```
Browser                        Backend                      Game-runner (host network)
   │                              │                              │
   │ 1. POST /gaming/sessions ──> │ ───────────────────────────> │  Xvfb + FFmpeg capture start
   │ 2. GET  /webrtc/ice-config > │  (mints ephemeral            │
   │                              │   TURN credentials)          │
   │ 3. POST /webrtc/offer ─────> │ ───────────────────────────> │  aiortc answers (SDP + ICE)
   │                              │                              │
   │ 4. <═════════ VP8 video over UDP (direct or via TURN) ════> │  game launches on connect
   │    <═════════ input events over DataChannel ══════════════> │  xdotool → X11 display
```

**Media path** (per session): `game process → Xvfb :99+ → FFmpeg x11grab
(raw yuv420p) → numpy → aiortc VP8 encoder → RTP/UDP → browser <video>`.
The backend is only involved in the signaling exchange (steps 1–3); media
and input flow directly between browser and game-runner.

### Design decisions

- **WebRTC instead of WebSocket streaming** (the original implementation
  sent JPEG frames over a WebSocket): UDP transport tolerates loss without
  head-of-line blocking, and VP8 encodes inter-frame differences instead of
  full JPEGs — lower latency and far better quality per bit.
- **game-runner is the WebRTC peer**, not the backend: no relay hop on the
  LAN fast path. It runs with `network_mode: host` because ICE advertises
  real socket addresses — Docker bridge NAT would publish unreachable
  container IPs.
- **Self-hosted TURN (coturn) for remote players.** Home NATs don't hairpin
  and aiortc's ports are dynamic, so port-forwarding alone can't cover
  remote play. game-runner allocates a relay on the local coturn; the relay
  candidate advertises the router's public IP on a forwarded port, which
  remote browsers can reach directly. This is the same STUN + TURN fallback
  architecture used by production WebRTC products.
- **Ephemeral TURN credentials** (coturn's REST mechanism): the backend
  mints `expiry:user_id` + `base64(HMAC-SHA1(secret, username))` per
  authenticated user. Nothing long-lived is ever exposed to the browser,
  and coturn validates statelessly from the shared secret.
- **The game process launches only when the peer connection reaches
  "connected"** — otherwise the game plays unwatched through the seconds of
  ICE negotiation.
- **Encoder tuning** (measured via `chrome://webrtc-internals`): aiortc
  obeys the browser's REMB bandwidth estimate, which stays near its floor
  because aiortc never sends probe traffic — the stream starved at
  ~120 kbps. Fixed with a 2 Mbps bitrate floor (6 Mbps ceiling) plus a
  forced keyframe every ~3 s so inter-frame prediction residue ("ghost
  trails" on static regions) gets wiped promptly.

## Deployment

```bash
git clone <repo> && cd homeserver
cp .env.example .env   # fill in values; see below
docker compose up -d --build
```

### Required `.env` additions for gaming

| Variable | Value |
|---|---|
| `TURN_SECRET` | Output of `openssl rand -hex 32`. **Must be the generated value** — `.env` files are not shell, `$(...)` is not evaluated |
| `SERVER_LAN_IP` | The server's LAN address (give it a DHCP reservation in the router) |
| `TURN_HOST` | Public hostname browsers reach the relay at (defaults to `hakserver.cc`) |

### Firewall (ufw) — two walls, both must open

Traffic must pass the router *and* the host firewall. On the host:

```bash
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp                  # web
sudo ufw allow from 172.16.0.0/12 to any port 9000 proto tcp     # backend -> host-networked game-runner
sudo ufw allow from 192.168.2.0/24 proto udp                     # webrtc media from LAN peers
sudo ufw allow 3478                                              # turn control (tcp+udp)
sudo ufw allow 49160:49200/udp                                   # turn relay range
```

### Router port forwarding (identity-mapped: external port N → internal port N)

| Ports | Protocol | Purpose |
|---|---|---|
| 80, 443 | TCP | Web + Let's Encrypt |
| 3478 | TCP + UDP | TURN control / STUN |
| 49160–49200 | UDP | TURN relay allocations (matches coturn's `--min-port/--max-port`) |

The relay range must be identity-mapped — the port number *is* the address
of a specific media session, so external 49165 has to land on internal 49165.

## Known limitations

- **No sender-side bandwidth probing** (aiortc limitation): the bitrate
  floor guarantees quality but will cause packet loss instead of graceful
  degradation on links that genuinely can't carry 2 Mbps.
- **coturn detects the public IP only at container start** — if the ISP
  reassigns it, `docker restart homeserver-coturn` (the DDNS updates DNS
  automatically, but coturn's advertised relay address is baked at boot).
- **No TURN-over-TLS** (`turns:` on 5349): networks that block outbound UDP
  *and* nonstandard TCP ports can't connect (port 443 is occupied by the
  web reverse proxy).
- **No audio track yet** and **no touch input** — the stream page sends
  mouse/keyboard events only.
- Connection setup takes a few seconds: ICE candidates are fully gathered
  before the answer (non-trickle). Trickle ICE would cut this down.

## Development workflow

- Always work on a branch; push every change
- Merge to `main` only when verified working
- `docker compose up -d --build <service>` to rebuild a single service
