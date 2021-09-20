const { apiPathPrefix } = require('../config');
const { retrieveLatestNotifications } = require('../data/notification');

const notificationRoutes = (app) => {
  const notificationsPathPrefix = apiPathPrefix.concat('notifications');
  const tokenRE = '(\\b\\S{22}\\b)'; // i.e. 22 length, non-whitespace id between [] in ExponentPushToken[...]

  // /notifications/:token
  app
    .route(notificationsPathPrefix.concat('/:token').concat(tokenRE))
    .get([retrieveLatestNotifications], (req, res) => {
      res.send();
    });
};

module.exports = notificationRoutes;
