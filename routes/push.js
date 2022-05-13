const { apiPathPrefix } = require('../config');
const { prepareMessages } = require('../notifications/message');
const { sendMessages, readReceipts } = require('../notifications/expo');
const {
  addNotifications,
  getPushResults,
  getPushResultsForNotification
} = require('../data/notification');
const { addTickets, getTickets, removeTickets } = require('../data/ticket');
const { addReceipts } = require('../data/receipt');

const pushRoutes = (app) => {
  const pushPathPrefix = apiPathPrefix.concat('push');
  const uuidRE =
    '([a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12})';

  // /push/send
  app
    .route(pushPathPrefix.concat('/send'))
    .post(
      [prepareMessages, sendMessages, addTickets, addNotifications],
      (req, res) => {
        // console.log("send push notification...", req.route.path);
        res.send();
      }
    );

  // /push/read/receipts
  app
    .route(pushPathPrefix.concat('/read/receipts'))
    .post(
      [getTickets, readReceipts, addReceipts, removeTickets],
      (req, res) => {
        // console.log("read receipts...", req.route.path);
        res.send();
      }
    );

  // /push/results
  app
    .route(pushPathPrefix.concat('/results'))
    .get([getPushResults], (req, res) => {
      // console.log("get push results...", req.route.path);
      res.send();
    });

  // /push/results/:notificationId
  app
    .route(pushPathPrefix.concat('/results/:notificationId').concat(uuidRE))
    .get([getPushResultsForNotification], (req, res) => {
      res.send();
    });
};

module.exports = pushRoutes;
