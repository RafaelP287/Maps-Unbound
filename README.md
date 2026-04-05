# Maps-Unbound

Create .env file in root folder for database connection

> MONGO_URI=your_mongodb_connection_string_here
>
> PORT=5000
>
> JWT_SECRET=random_string

Dependencies

Running Server

<<<<<<< Updated upstream

> run server.js and then test the outputs on the api_tests.rest
> =======

## Environment

Create or update the root .env file:

```
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/mapsunbound?appName=MapsUnbound
PORT=5000
```

For JWT_SECRET use a generated string from:
`node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

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

## Running the dice

Create a account on dddice.com

and once you create get a API key to initiallize the engine

# dddice API Key

add a .env to maps-unbound

use both vite and react just incase 

# Vite projects use VITE_ prefix

VITE_DDDICE_API_KEY=yourdddiceAPIkey

# If you use Create React App instead, use this line instead of the one above:

REACT_APP_DDDICE_API_KEY=yourdddiceAPIkey
