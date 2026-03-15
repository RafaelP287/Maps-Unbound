# Maps-Unbound

Full-stack app with:
- Express + MongoDB backend
- React + Vite frontend
- Socket.io real-time lobby sessions

## Environment

Create a root .env file:

```env
MONGO_URI=your_mongodb_connection_string
PORT=5001
CLIENT_URL=http://localhost:5173
VITE_API_URL=http://localhost:5001
JWT_SECRET=your_jwt_secret
```

## Install

```bash
cd backend && npm install
cd ../maps-unbound && npm install --legacy-peer-deps
```

## Run (2 terminals)

Terminal A:

```bash
cd backend && npm run dev
```

Terminal B:

```bash
cd maps-unbound && npm run dev
```

## URLs

- Frontend: http://localhost:5173
- Backend: http://localhost:5001

## dddice setup (optional)

Create an account on dddice.com and generate an API key under:

Profile → Developers → Create API Key
>>
