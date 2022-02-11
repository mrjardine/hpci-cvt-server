const { apiPathPrefix } = require('../config');
const { prepareMessages } = require('../notifications/message');
const { sendMessages, readReceipts } = require('../notifications/expo');
const { addNotifications } = require('../data/notification');
const { addTickets, getTickets, removeTickets } = require('../data/ticket');
const { addReceipts } = require('../data/receipt');

const pushRoutes = (app) => {
  const pushPathPrefix = apiPathPrefix.concat('push');

  // /push/send
  app
    .route(pushPathPrefix.concat('/send'))
    .post(
      [prepareMessages, sendMessages, addTickets, addNotifications],
      (req, res) => {
        // console.log("send push notification... ", req.route.path);
        res.send();
      }
    );

  // /push/read/receipts
  app
    .route(pushPathPrefix.concat('/read/receipts'))
    .post(
      [getTickets, readReceipts, addReceipts, removeTickets],
      (req, res) => {
        // console.log("read receipts... ", req.route.path);
        res.send();
      }
    );
};

module.exports = pushRoutes;
