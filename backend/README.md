# Maps-Unbound Backend

Express + MongoDB API with JWT auth and Socket.io real-time lobby support.

## Quick Start

```bash
# from repository root
cd backend
npm install
npm run dev
```

Server URL: `http://localhost:5001`

## Environment

Backend reads values from the root `.env` file.

Required:

```env
MONGO_URI=your_mongodb_connection_string
PORT=5001
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
```

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Server URL: `http://localhost:5001`

## REST Endpoints

Auth routes:
- `POST /api/auth/signup`
- `POST /api/auth/login`

Other routes:
- `/api/campaigns`
- `/api/characters`

## Socket.io Events

### Incoming
- `join-room`
  - Payload: `{ campaignId, userId }`
  - Joins room: `campaign:<campaignId>`

### Outgoing
- `room-joined`
  - Sent to the joining socket after successful room join
- `player-joined`
  - Broadcast to all other sockets in the same campaign room

## Notes

- Socket server is initialized in `server.js` via HTTP server wrapping (`http.createServer(app)`).
- CORS origin for Socket.io is controlled by `CLIENT_URL`.
