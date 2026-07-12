# 🎬 Watch Together

Watch any video in perfect sync with friends — no sign-up, no backend, no
database. Share a room code, paste a video link, and press play together.
Everything runs entirely in the browser using WebRTC peer-to-peer
connections.

## Features

- **No backend required** — rooms are peer-to-peer via [PeerJS](https://peerjs.com/) (WebRTC data channels), using PeerJS's free public signaling broker only to help peers find each other.
- **Multi-source video** — direct MP4/WebM/Ogg files, YouTube, and Vimeo (where the video owner allows embedding).
- **Full sync** — play, pause, seek, playback speed, and video changes all sync instantly across everyone in the room. New joiners snap to the host's current position automatically.
- **Live chat** — with timestamps, sender names, emoji picker, and auto-scroll.
- **Participants list** — see who's connected, spot the host badge, and get join/leave notifications.
- **Persistence** — your name, theme, last room code, recent video URLs, volume, and playback speed are all remembered via `localStorage`.
- **Modern glassmorphism UI** — dark/light mode, responsive from mobile to desktop, toast notifications, loading states.

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- PeerJS (WebRTC data channels)
- `@vimeo/player` for Vimeo embeds, the official YouTube IFrame API for YouTube
- `localStorage` for all persistence — zero servers, zero databases

## Getting Started

```bash
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`) in **two
different browser windows** (or two devices) to try the sync features —
one window will host, the other will join.

### Build for production

```bash
npm run build
npm run preview   # optional local check of the production build
```

## Deploying to Vercel

This project needs zero configuration to deploy:

1. Push the project to a GitHub/GitLab/Bitbucket repo.
2. Import it in [Vercel](https://vercel.com/new).
3. Vercel auto-detects the Vite framework preset — just click **Deploy**.

Or from the CLI:

```bash
npm i -g vercel
vercel
```

## How the sync works

Watch Together uses a **star topology**: whoever creates a room becomes the
host, and every other participant connects directly to the host over a
WebRTC data channel (guests never connect to each other). The host is the
single source of truth for playback state:

1. A guest's play/pause/seek/speed/video-load action is sent to the host.
2. The host applies it locally and rebroadcasts it to every other guest.
3. Every ~6 seconds the host also sends a "heartbeat" with its current
   playback time so any client that has drifted more than ~1.5 seconds
   re-syncs automatically.
4. When someone joins mid-session, the host immediately sends them the
   current video, playback position, chat history, and participant list.

Because there's no application server, **if the host closes their tab, the
room ends** for everyone else (there's no host hand-off in this version) —
guests will see a friendly notice that the room disconnected.

## Supported video sources

| Source | Notes |
|---|---|
| Direct file link (`.mp4`, `.webm`, `.ogg`, `.mov`, `.m4v`) | Played with a native `<video>` element |
| YouTube (`youtube.com/watch?v=…`, `youtu.be/…`, Shorts) | Played via the official YouTube IFrame API |
| Vimeo (`vimeo.com/…`) | Played via the official Vimeo Player SDK |

If a link isn't one of these, or the video owner has disabled embedding,
you'll see a friendly inline error instead of a broken player.

## Known limitations

- **No host migration.** If the host leaves, the room ends for everyone.
- **Some videos block embedding.** YouTube/Vimeo creators can disable
  embedding entirely; there's no way around this from the browser.
- **Autoplay-with-sound policies.** Browsers may block unmuted autoplay on
  the very first play action until the user interacts with the page —
  this is a browser policy, not a bug in the app.
- **PeerJS's public broker** is used only to help two browsers discover
  each other's network address (signaling). No video, audio, or chat data
  ever passes through it — everything flows directly between browsers
  once connected.

## Project structure

```
src/
  components/
    players/            # NativeVideoEngine, YouTubeEngine, VimeoEngine
    Header.jsx
    RoomPanel.jsx
    VideoPlayer.jsx
    Chat.jsx
    Participants.jsx
    Toast.jsx
  context/
    ToastContext.jsx     # toast notification provider
  hooks/
    useRoom.js           # all PeerJS room / sync logic
    useLocalStorage.js
    useTheme.js
  lib/
    peer.js              # room code + PeerJS id helpers
    videoParsers.js       # URL → { type, id } detection
    storage.js            # localStorage read/write helpers
    youtubeApi.js         # lazy YouTube IFrame API loader
  App.jsx
  main.jsx
  index.css
```

## Accessibility & performance notes

- Visible keyboard focus rings throughout; `prefers-reduced-motion` is
  respected globally.
- Route-independent: everything is a single page, so there's no router
  overhead.
- Large third-party libraries (`peerjs`, `@vimeo/player`) are split into
  their own lazy-loadable chunks in the production build.
- The YouTube IFrame API script is only injected the first time a YouTube
  link is actually loaded.
