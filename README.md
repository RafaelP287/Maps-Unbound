# Maps-Unbound

### Quickstart the Entire Application

For the server, start with going to the `server/` directory and install all of the associated npm packages. Then, run the backend and frontend separately using either of the following commands from root:

```bash
cd maps-unbound && npm i && npm run dev
cd backend && npm i && npm run dev
```

- The port will default to http://localhost:5001 for the server api, but this can be configured by adding a `PORT` environment variable in `backend/.env`.

In addition, you must use the Dungeons and Dragons 5e 2014 api (recommended run locally), as found here: [5e-srd-api](https://github.com/5e-bits/5e-srd-api). Preferably, run it separately from the server (if you're running both on the same device, configure to different ports), and configure the root url to the api under the `backend/.env` `API_5E` environment variable.
- To run the DnD api, you must have Docker Desktop running, and run `docker-compose up --build` when in the repository listed above.

#### Environment Variables
- Create an `backend/.env` file using the following as a template.
```sh
MONGO_URI=
PORT=5001
API_5E=http://localhost:3001
API_SERVER=http://localhost:5001
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION=u
AWS_S3_BUCKET_NAME=
JWT_SECRET=
```
For JWT_SECRET, use a generated string from:
`node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- Create an `maps-unbound/.env` file using `maps-unbound/env.example` as a template.
```sh
PORT=5001
VITE_API_SERVER=http://localhost:5001
VITE_API_5E=http://localhost:3001
VITE_DDDICE_API_KEY=
REACT_APP_DDDICE_API_KEY=
```
Note: You have to create an account on dddice.com, and once you get the API key, you can input that api key as an .env variable, and utilize the engine.
1. Sign into dddice.com
2. Click on your profile on the top right
3. Go to the Developers tab
4. Click on Create API key
5. Copy and paste that key as VITE_DDDICE_API_KEY and REACT_APP_DDDICE_API_KEY.
