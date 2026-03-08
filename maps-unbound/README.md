# Maps-Unbound Frontend

React + Vite client for Maps-Unbound.

## Quick Start

```bash
# from repository root
cd maps-unbound
npm install --legacy-peer-deps
npm run dev
```

Frontend URL: `http://localhost:5173`

## Prerequisites

- Node.js 18+
- Backend running locally

## Environment

Frontend reads `VITE_API_URL` from the root `.env` file.

Example:

```env
VITE_API_URL=http://localhost:5001
```

## Install

```bash
npm install --legacy-peer-deps
```

(`--legacy-peer-deps` is currently needed because of existing ESLint peer dependency constraints.)

## Run

```bash
npm run dev
```

Default URL: `http://localhost:5173`

## Real-time Lobby (Socket.io)

Lobby hookup is in:
- `src/features/player/Lobby.jsx`

Flow:
1. Connect to backend socket server.
2. Emit `join-room` with `{ campaignId, userId }`.
3. Listen for:
	- `room-joined`
	- `player-joined`

## Build

```bash
npm run build
npm run preview
```
