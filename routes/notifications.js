const { apiPathPrefix } = require('../config');
const { retrieveNotifications } = require('../data/notification');

const notificationRoutes = (app) => {
  const notificationsPathPrefix = apiPathPrefix.concat('notifications');
  const langRE = '(en|fr)';
  const tokenRE = '(\\b\\S{22}\\b)'; // i.e. 22 length, non-whitespace id between [] in ExponentPushToken[...]
  const dateRE = '(\\d{4}-\\d{2}-\\d{2})';

  // TODO: process request (e.g. token exists, date is valid and within last x days, retrieveBookmarks...)

  // /notifications/:token/:language/:date
  app
    .route(
      notificationsPathPrefix
        .concat('/:token')
        .concat(tokenRE)
        .concat('/:language'.concat(langRE))
        .concat('/:date'.concat(dateRE))
    )
    .get([retrieveNotifications], (req, res) => {
      res.send();
    });
};

module.exports = notificationRoutes;
