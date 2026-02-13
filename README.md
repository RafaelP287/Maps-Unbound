# Maps-Unbound
Description


### How to Start

For the server, start with going to the `server/` directory and install all of the associated npm packages. Then, run the server using either of the following commands:

```bash
node server.js    # This will run the server once
nodemon server.js # This will allow hot-reloading of the server (restart on save)
```

In addition, you must use the Dungeons and Dragons 5e 2014 api (recommended run locally), as found here: [5e-srd-api](https://github.com/5e-bits/5e-srd-api). Preferably, run it on a port separate from the server's port.

Then, you can test API calls to the server (more info on testing and etc. can be found [here](server/TESTING.md))

also use the `config.js` file to set stuff (server api, 5e api, etc)
