# Live Studio

A browser-based live production studio for streamers (Twitch, Kick, YouTube). Host remote live video sessions with multiple guests—like OBS + Zoom + StreamYard in one.

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES modules)
- **Real-time:** WebRTC (mesh), Firebase (Auth, Firestore, Hosting, Cloud Functions)
- **Real-time messaging:** Firestore listeners for chat, participants, signaling

## Project Structure

```
live-studio-app/
├── public/
│   ├── index.html      # Landing: create or join room
│   ├── join.html       # Guest: enter room ID, devices, preview, join backstage
│   └── studio.html     # Studio: stage canvas, backstage, chat, layout
├── css/
│   ├── main.css        # Global + landing + join
│   ├── layout.css      # Video grid layouts (1–12)
│   └── studio.css      # Studio dashboard, panels, controls
├── js/
│   ├── firebase.js     # Firebase init, rooms, participants, chat, signaling
│   ├── webrtc.js       # getUserMedia, RTCPeerConnection, ICE/offer/answer
│   ├── app.js          # Landing + join page logic
│   ├── studio-controller.js  # Studio init, signaling, layout, scenes
│   ├── participants.js # Backstage list, add to stage, mute, remove
│   ├── chat.js         # Real-time chat
│   ├── drag-layout.js  # Drag-and-drop video slot reorder
│   ├── screen-share.js # getDisplayMedia, share to peers
│   ├── recording.js    # Stage canvas capture, MediaRecorder, download
│   └── virtual-background.js # Blur / custom image background
├── firebase/
│   └── config.js       # Your Firebase config (replace with real values)
├── functions/
│   ├── index.js        # Optional: onRoomCreate, cleanupOldRooms
│   └── package.json
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
└── README.md
```

## Setup

1. **Create a Firebase project** at [Firebase Console](https://console.firebase.google.com).

2. **Enable**
   - Authentication → Sign-in method → Anonymous
   - Firestore Database
   - Hosting
   - Cloud Functions (optional)

3. **Configure**
   - Copy your project’s config into `firebase/config.js`:
   - Replace `YOUR_API_KEY`, `YOUR_PROJECT_ID`, etc.

4. **Firestore indexes**  
   If the console asks for indexes, create them (or use the ones in `firestore.indexes.json`). For signaling, you may need a single-field index on `at` for the subcollection under `rooms/{roomId}/signaling/{peerA}/{peerB}`.

5. **Run locally**
   - Host the app over HTTPS (required for getUserMedia). For example:
     - `npx serve public -l 3000` then use a tunnel (e.g. ngrok), or
     - `firebase serve` (serves `public` via Hosting).
   - Open the root URL (e.g. `https://your-tunnel.ngrok.io/` or `http://localhost:5000`).

6. **Deploy**
   ```bash
   firebase deploy
   ```
   - Hosting will serve `public/`. Set your Firebase config in `firebase/config.js` before deploying.

## Features

- **Room creation:** Host creates a room; unique link like `/studio/84XKS9`.
- **Guest join:** Join page → room ID → camera/mic/name → preview → Join Backstage.
- **Backstage:** Guests wait off-camera; host sees list and can “Add to stage”, “Remove”, “Mute”, “Disable camera”.
- **Live stage:** Up to 12 video feeds; layouts: 1, 2, 3, 4, 6, 9, 12.
- **Drag-and-drop:** Host can reorder video slots (swap positions).
- **Screen share:** Tab/screen/window with optional audio; shared to all on stage.
- **Camera controls:** Each participant: cam on/off, mute; host can force mute/disable camera/remove.
- **Scenes:** Presets (Default, Host only, Interview, Panel, Screen share); switch instantly.
- **Chat:** Real-time Firestore-based chat for host, guests, backstage.
- **Recording:** Record the live stage (video grid) to a WebM file; download when stopped.
- **Virtual backgrounds:** Blur your camera, or use a custom image (you appear in a rounded frame on the image).

## Firebase Data Model

- **rooms/{roomId}:** `host`, `createdAt`, `layout`, `scene`, `stageOrder` (array of user IDs).
- **rooms/{roomId}/participants/{userId}:** `name`, `role`, `status` (backstage | on_stage | left), `mic`, `cam`, `order`.
- **rooms/{roomId}/chat:** messages with `userId`, `name`, `text`, `timestamp`.
- **rooms/{roomId}/signaling/{peerA}/{peerB}:** WebRTC signaling docs: `from`, `to`, `type` (offer | answer | ice), `payload`, `at`.

## WebRTC Flow

1. User joins room and appears in participants (backstage or on_stage).
2. For each peer on stage, clients create an RTCPeerConnection and exchange offer/answer/ICE via Firestore signaling.
3. Local and remote streams are attached to the video grid; host can change layout and reorder slots.

## License

MIT.
