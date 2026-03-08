# Maps-Unbound

Full-stack app with:
- Express + MongoDB backend
- React + Vite frontend
- Socket.io real-time lobby sessions

## Quick Start

1) Create root `.env`:

```env
MONGO_URI=your_mongodb_connection_string
PORT=5001
CLIENT_URL=http://localhost:5173
VITE_API_URL=http://localhost:5001
JWT_SECRET=your_jwt_secret
```

2) Install dependencies:

```bash
cd backend && npm install
cd ../maps-unbound && npm install --legacy-peer-deps
```

3) Run both apps:

```bash
# terminal A
cd backend && npm run dev

# terminal B
cd maps-unbound && npm run dev
```

4) Open:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5001`

## Project Structure

- `backend/` API server
- `maps-unbound/` React client

## 1) Environment Setup

Create a root `.env` file at the repository root:

```env
MONGO_URI=your_mongodb_connection_string
PORT=5001
CLIENT_URL=http://localhost:5173
VITE_API_URL=http://localhost:5001
JWT_SECRET=your_jwt_secret
```

Notes:
- `CLIENT_URL` is used by backend Socket.io CORS.
- `VITE_API_URL` is used by frontend socket/API connections.

## 2) Install Dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd maps-unbound
npm install --legacy-peer-deps
```

## 3) Run in Development (2 terminals)

Terminal A (backend):

```bash
cd backend
npm run dev
```

Terminal B (frontend):

```bash
cd maps-unbound
npm run dev
```

- Backend: `http://localhost:5001`
- Frontend: `http://localhost:5173`

## 4) Auth Endpoints

Existing REST auth routes:
- `POST /api/auth/signup`
- `POST /api/auth/login`

JWT is returned/used as implemented in backend auth routes.

## 5) Socket.io Lobby Flow

### Client emits
- `join-room` with payload:

```json
{
	"campaignId": "<campaign-id>",
	"userId": "<user-id>"
}
```

### Server emits
- `room-joined` (to joining socket)
- `player-joined` (broadcast to other users in same campaign room)

Room naming convention:
- `campaign:<campaignId>`

## 6) dddice Setup (optional)

Create a `dddice.com` account and generate an API key from:

Profile → Developers → Create API Key

Then wire that key into your client-side dice integration.
