const JsonDB = require('./JsonDB');
const { isNil } = require('../utils/util');
const { isBeforeAnHourAgo, now } = require('../utils/day');

const dataPathRoot = '/tickets/';

// ticketId = receiptId (and = ticket root for JsonDB)

const ticket = (
  ticketId,
  status,
  expoToken = null,
  message = null,
  details = null,
  receiptId = null,
  notificationIds = null,
  created = null
) => {
  return {
    ticketId: ticketId, // uuid
    status: status, // text
    expoToken: expoToken, // text
    message: message, // text
    details: details, // {}
    receiptId: receiptId, // uuid
    notificationIds: notificationIds, // [uuid]
    created: created
  };
};

const addTickets = (req, res, next) => {
  const { expoTickets, expoTokens, sentNotifications } = req;
  // console.log('Expo tickets: ', expoTickets);
  // console.log('Sent expo tokens:', expoTokens);
  if (!isNil(expoTickets)) {
    const notificationIds = [];
    sentNotifications.forEach((notification) => {
      notificationIds.push(notification.id);
    });
    if (expoTickets.length !== expoTokens.length) {
      // lengths should match, read receipts could be affected if not (e.g. when handling errors)
      console.warn(
        `Mismatch between number of tickets received from Expo (${expoTickets.length}) and associated tokens (${expoTokens.length}) for notifications ${sentNotifications}.`
      );
    }
    const tickets = expoTickets.map((expoTicket, index) => {
      return ticket(
        expoTicket.id,
        expoTicket.status,
        expoTokens[index],
        !isNil(expoTicket.message) ? expoTicket.message : null,
        !isNil(expoTicket.details) ? expoTicket.details : null,
        !isNil(expoTicket.id) ? expoTicket.id : null,
        !isNil(notificationIds) ? notificationIds : null,
        now()
      );
    });
    // console.log('tickets: ', tickets);
    tickets.forEach((ticket) => {
      !isNil(ticket.receiptId) &&
        JsonDB.add(dataPathRoot.concat(ticket.receiptId), ticket);
    });
  }
  next();
};

const retrieveTickets = () => {
  return Object.values(JsonDB.retrieve(dataPathRoot));
};

const getTickets = (req, res, next) => {
  const receiptIds = [];
  try {
    const tickets = retrieveTickets();
    tickets.forEach((ticket) => {
      if (!isNil(ticket.receiptId) && isBeforeAnHourAgo(ticket.created)) {
        receiptIds.push(ticket.receiptId);
      }
    });
  } catch (error) {
    console.log(error);
  }
  req.receiptIds = receiptIds;
  // console.log('getTickets: ', receiptIds);
  next();
};

const getExpoTokenByReceiptId = (receiptId) => {
  const ticket = JsonDB.retrieve(dataPathRoot.concat(receiptId));
  if (!isNil(ticket) && !isNil(ticket.expoToken)) {
    return ticket.expoToken;
  }
  return null;
};

const getNotificationIdsByReceiptId = (receiptId) => {
  const ticket = JsonDB.retrieve(dataPathRoot.concat(receiptId));
  if (!isNil(ticket) && !isNil(ticket.notificationIds)) {
    return ticket.notificationIds;
  }
  return [];
};

const removeTickets = async (req, res, next) => {
  const { receiptIds } = req;
  receiptIds.forEach((receiptId) => {
    JsonDB.delete(dataPathRoot.concat(receiptId));
    // console.log(`Deleted ticket: ${receiptId}`);
  });
  next();
};

module.exports = {
  addTickets,
  getTickets,
  getExpoTokenByReceiptId,
  getNotificationIdsByReceiptId,
  removeTickets
};
