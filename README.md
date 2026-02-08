## Setup

1) Install frontend deps:

```
cd maps-unbound
npm install
```

2) Install backend deps:

```
cd ../backend
npm install
```

## Environment

Create or update the root .env file:

```
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/mapsunbound?appName=MapsUnbound
PORT=5000
```

## Run (two terminals)

Terminal 1 (backend):

```
cd backend
npm run dev
```

Terminal 2 (frontend):

```
cd maps-unbound
npm run dev
```
