# Maps-Unbound
Description


### Quickstart the Entire Application

For the server, start with going to the `server/` directory and install all of the associated npm packages. Then, run the server and frontend using either of the following commands:

```bash
cd maps-unbound && npm run dev
cd backend && npm run dev
```

- The port will default to http://localhost:5001 for the server api, but this can be configured by adding a `PORT` environment variable in `backend/.env`.

In addition, you must use the Dungeons and Dragons 5e 2014 api (recommended run locally), as found here: [5e-srd-api](https://github.com/5e-bits/5e-srd-api). Preferably, run it separately from the server (if you're running both on the same device, configure to different ports), and configure the root url to the api under the `backend/.env` `API_5E` environment variable.
- To run the DnD api, you must have Docker Desktop running, and run `docker-compose up --build`.

#### Environment Variables
- Create an `backend/.env` file using `backend/env.example` as a template.
- Create an `maps-unbound/.env` file using `maps-unbound/env.example` as a template.
