const { apiPathPrefix } = require('../config');
const {
  retrieveNotifications
} = require('../data/notification');

const notificationRoutes = (app) => {
  const notificationsPathPrefix = apiPathPrefix.concat('notifications');
  const langRE = '(en|fr)';
  const tokenRE = '(\\b\\S{22}\\b)'; // i.e. 22 length, non-whitespace id between [] in ExponentPushToken[...]
  // TODO: dateRE (fmt: yyyy-mm-dd, valid, optional), retrieveBookmarks

  // /notifications/:token/:language/:date?
  app
    .route(
      notificationsPathPrefix
        .concat('/:token')
        .concat(tokenRE)
        .concat('/:language'.concat(langRE))
        .concat('/:date?')
    )
    .get([retrieveNotifications], (req, res) => {
      res.send();
    });

};

module.exports = notificationRoutes;
