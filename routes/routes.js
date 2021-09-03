const { apiPathPrefix } = require('../config');
const deviceRoutes = require('./devices');
const notificationRoutes = require('./notifications');
const pushRoutes = require('./push');

const appRouter = (app) => {
  // default route to handle empty routes at the base API url
  app.get('/', (req, res) => {
    res.send('Welcome to the HPCI CVT API server.');
  });

  app.get(apiPathPrefix.concat('alive'), (req, res) => {
    res.send({
      alive: 'yes'
    });
  });

  // run route modules here to complete the wire up
  deviceRoutes(app);
  notificationRoutes(app);
  pushRoutes(app);
};

module.exports = appRouter;
