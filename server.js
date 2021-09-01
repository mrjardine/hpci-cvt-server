const express = require('express');
const { devDbFile, devDbPath, env, port } = require('./config');

const app = express();

// load up node's built in file system helper library
const fs = require('fs');

if (env === 'DEV') {
  // log notice if jsonDB.json cannot be accessed
  const dbPath = devDbPath.concat(devDbFile);
  fs.access(dbPath, fs.F_OK, (error) => {
    if (error) {
      console.log(
        'Unable to access ' +
          dbPath +
          ". The file's initial contents should match jsonDB.initial. (optional)"
      );
      return;
    }
  });
}
// TODO: else use postgres for PROD?  e.g. if DEV use node-json-db, else use PostgreSQL, extra security, etc.

// configure express instance, including handling JSON data
app.disable('x-powered-by');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// handle routes
// eslint-disable-next-line no-unused-vars
const routes = require('./routes/routes.js')(app);

// launch server on port.
const server = app.listen(port, () => {
  console.log('listening on port %s...', server.address().port);
});
