const { Expo } = require('expo-server-sdk');
const { getExpoTokenByReceiptId } = require('../data/ticket');
const { removeDevice } = require('../data/device');
const { isNil } = require('../utils/util');

// https://github.com/expo/expo-server-sdk-node

const sendNotifications = async (expo, messages) => {
  // The Expo push notification service accepts batches of notifications so
  // that you don't need to send 1000 requests to send 1000 notifications. We
  // recommend you batch your notifications to reduce the number of requests
  // and to compress them (notifications with similar content will get
  // compressed).
  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];
  // Send the chunks to the Expo push notification service. There are
  // different strategies you could use. A simple one is to send one chunk at a
  // time, which nicely spreads the load out over time:
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
      // NOTE: If a ticket contains an error code in ticket.details.error, you
      // must handle it appropriately (see readReceipts). The error codes are listed in the Expo
      // documentation:
      // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
    } catch (error) {
      console.log('Error sending notifications:', error);
    }
  }
  return tickets;
};

const sendMessages = async (req, res, next) => {
  const { validMessages, messagesToSend } = req;
  if (validMessages) {
    // create a new Expo SDK client
    // let expo = new Expo();
    // expo push security: provide the access token
    let expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
    const expoTokens = [];
    const messages = [];
    messagesToSend.forEach((message) => {
      const { to, title, body, data, sound, badge } = message;
      let tokens = [];
      if (Array.isArray(to)) {
        tokens = to.slice();
      } else {
        tokens.push(to);
      }
      for (let i = tokens.length - 1; i >= 0; --i) {
        if (!Expo.isExpoPushToken(tokens[i])) {
          tokens.splice(i, 1); // remove non-Expo push tokens
        }
      }
      if (tokens.length > 0) {
        const notification = {
          to: tokens,
          title: title,
          body: body
        };
        if (!isNil(data)) notification.data = data;
        if (!isNil(sound)) notification.sound = sound;
        if (!isNil(badge)) notification.badge = badge;
        messages.push(notification);
        for (let i = 0; i < tokens.length; i++) {
          expoTokens.push(tokens[i]);
        }
      }
    });
    if (messages.length > 0) {
      console.log(
        'expo.sendMessages: Messages to send to Expo:',
        JSON.stringify(messages)
      );
      try {
        req.expoTickets = await sendNotifications(expo, messages);
        req.expoTokens = expoTokens;
        req.sentNotifications = messagesToSend;
      } catch (error) {
        console.log('Error sending notifications:', error);
      }
    }
    res.status(200);
  } else {
    res.status(400);
  }
  next();
};

// ...
// Later, after the Expo push notification service has delivered the
// notifications to Apple or Google (usually quickly, but allow the the service
// up to 30 minutes when under load), a "receipt" for each notification is
// created. The receipts will be available for at least a day; stale receipts
// are deleted.
//
// The ID of each receipt is sent back in the response "ticket" for each
// notification. In summary, sending a notification produces a ticket, which
// contains a receipt ID you later use to get the receipt.
//
// Note:
// The receipts may contain error codes to which you must respond. In
// particular, Apple or Google may block apps that continue to send
// notifications to devices that have blocked notifications or have uninstalled
// your app. Expo does not control this policy and sends back the feedback from
// Apple and Google so you can handle it appropriately.

const readReceipts = async (req, res, next) => {
  const { receiptIds } = req;
  if (receiptIds.length > 0) {
    const expoPushNotificationReceipts = [];
    // create a new Expo SDK client
    // let expo = new Expo();
    // expo push security: provide the access token
    let expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    // Like sending notifications, there are different strategies you could use
    // to retrieve batches of receipts from the Expo service.
    for (let chunk of receiptIdChunks) {
      try {
        let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
        // console.log('Receipts from Expo:', receipts);

        // The receipts specify whether Apple or Google successfully received the
        // notification and information about an error, if one occurred.
        for (let receiptId in receipts) {
          let { status, message, details } = receipts[receiptId];
          expoPushNotificationReceipts.push({
            receiptId: receiptId,
            status: status,
            message: message,
            details: details
          });
          console.log(
            `expo.readReceipts: Expo push notification receipt ${receiptId}:`,
            receipts[receiptId]
          );
          if (status === 'ok') {
            continue;
          } else if (status === 'error') {
            console.log(
              `There was an error sending a notification: ${message}`
            );
            if (details && details.error) {
              // The error codes are listed in the Expo documentation:
              // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
              // You must handle the errors appropriately.
              console.log(`The error code is ${details.error}`);
              if (details.error === 'DeviceNotRegistered') {
                // TODO: Read Handling Errors section for this part
                const token = await getExpoTokenByReceiptId(receiptId);
                if (!isNil(token)) {
                  removeDevice(token);
                }
              } else {
                // TODO: Handle others? Use switch...
              }
            }
          }
        }
      } catch (error) {
        console.log('Error in expo.readReceipts:', error);
      }
    }
    req.expoPushNotificationReceipts = expoPushNotificationReceipts;
    // console.log(`readReceipts: Processed ${receiptIds.length} tickets.`);
    res
      .status(200)
      .send(
        JSON.parse(
          '{"tickets processed": '.concat(receiptIds.length).concat('}')
        )
      );
  } else {
    // console.log('readReceipts: There are no tickets to process.');
    res.status(200).send(JSON.parse('{"tickets processed": 0}'));
  }
  next();
};

module.exports = {
  sendMessages,
  readReceipts
};
