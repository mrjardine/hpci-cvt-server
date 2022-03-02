const express = require('express');
const { devDbFile, devDbPath, env, port } = require('./config');
const db = require('./data/db');

const app = express();

// load up node's built in file system helper library
const fs = require('fs');

if (env === 'DEV') {
  // using jsonDB
  // log notice and return if jsonDB.json cannot be accessed
  const dbPath = devDbPath.concat(devDbFile);
  fs.access(dbPath, fs.F_OK, (error) => {
    if (error) {
      console.error(
        'ERROR - Unable to access ' +
          dbPath +
          ". The file's initial contents should match jsonDB.initial."
      );
      return;
    }
  });
} else {
  // using postgres
  // log notice and return if db cannot be accessed
  let dbchk;
  db.query('SELECT now()')
    .then((results) => {
      dbchk = JSON.stringify(results.rows[0]);
      console.log(`env: ${env}, checking db connection: ${dbchk}.`);
    })
    .catch((error) => {
      console.error('ERROR - Unable to access database.', error);
      return;
    });
}

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
