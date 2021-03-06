const { apiPathPrefix } = require('../config');
const {
  deviceTokensForAll,
  deviceTokensForEn,
  deviceTokensForFr,
  prepareDevice,
  addDevice,
  retrieveDevice,
  deleteDevice,
  countDevices,
  reloadDevices
} = require('../data/device');

const deviceRoutes = (app) => {
  const devicesPathPrefix = apiPathPrefix.concat('devices');
  const langRE = '(en|fr)';
  const tokenRE = '(\\b\\S{22}\\b)'; // i.e. 22 length, non-whitespace id between [] in ExponentPushToken[...]

  // middleware
  app.use(deviceTokensForEn);
  app.use(deviceTokensForFr);
  app.use(deviceTokensForAll);

  // /devices/:token.:language
  app
    .route(
      devicesPathPrefix
        .concat('/:token')
        .concat(tokenRE)
        .concat('.:language'.concat(langRE))
    )
    .get([retrieveDevice], (req, res) => {
      res.send();
    })
    .post([prepareDevice, addDevice, deleteDevice], (req, res) => {
      res.send();
    });

  // /devices/:token
  app
    .route(devicesPathPrefix.concat('/:token').concat(tokenRE))
    .get([retrieveDevice], (req, res) => {
      res.send();
    })
    .post([prepareDevice, addDevice, deleteDevice], (req, res) => {
      res.send();
    })
    .delete([deleteDevice], (req, res) => {
      res.send();
    });

  // /devices/count
  app
    .route(devicesPathPrefix.concat('/count'))
    .get([countDevices], (req, res) => {
      // console.log("devices count:", req.route.path);
      res.send();
    });

  // /devices/count/:language
  app
    .route(devicesPathPrefix.concat('/count/:language'.concat(langRE)))
    .get([countDevices], (req, res) => {
      res.send();
    });

  // /devices/reload
  app
    .route(devicesPathPrefix.concat('/reload'))
    .get([reloadDevices], (req, res) => {
      res.send();
    });
};

module.exports = deviceRoutes;
