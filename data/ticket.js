const db = require('./db');
const JsonDB = require('./JsonDB');
const { env } = require('../config');
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

const addTickets = async (req, res, next) => {
  const { expoTickets, expoTokens, sentNotifications } = req;
  if (!isNil(expoTickets)) {
    const notificationIds = [];
    sentNotifications.forEach((notification) => {
      notificationIds.push(notification.id);
    });
    if (expoTickets.length !== expoTokens.length) {
      // lengths should match, read receipts could be affected if not (e.g. when handling errors)
      console.warn(
        `WARN [${now()}] - Mismatch between number of tickets received from Expo (${
          expoTickets.length
        }) and associated tokens (${
          expoTokens.length
        }) for notifications ${sentNotifications}.`
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
    for (const ticket of tickets) {
      if (!isNil(ticket.receiptId)) {
        if (env === 'DEV') {
          JsonDB.add(dataPathRoot.concat(ticket.receiptId), ticket);
        } else {
          try {
            const insertText = `INSERT INTO tickets (ticket_id, status, expo_token, message, details, receipt_id, notification_ids, created) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
            const insertValues = [
              ticket.ticketId,
              ticket.status,
              ticket.expoToken,
              ticket.message,
              ticket.details,
              ticket.receiptId,
              ticket.notificationIds,
              ticket.created
            ];
            await db.query(insertText, insertValues);
          } catch (error) {
            console.warn(
              'WARN [' + now() + '] - Unable to add ticket:',
              JSON.stringify(ticket)
            );
          }
        }
      }
    }
  }
  next();
};

const retrieveTickets = async () => {
  let tickets = [];
  if (env === 'DEV') {
    tickets = Object.values(JsonDB.retrieve(dataPathRoot));
  } else {
    try {
      const result = await db.query(
        `SELECT ticket_id as "ticketId", status, expo_token as "expoToken", message, details, receipt_id as "receiptId", notification_ids as "notificationIds", created FROM tickets WHERE created < now() - interval '1 hour'`
      );
      if (result.rowCount > 0) {
        result.rows.forEach((row) => {
          tickets.push(row);
        });
      }
    } catch (error) {
      tickets = [];
    }
  }
  return tickets;
};

const getTickets = async (req, res, next) => {
  const receiptIds = [];
  try {
    const tickets = await retrieveTickets();
    tickets.forEach((ticket) => {
      if (!isNil(ticket.receiptId) && isBeforeAnHourAgo(ticket.created)) {
        receiptIds.push(ticket.receiptId);
      }
    });
  } catch (error) {
    console.warn(
      'WARN [' + now() + '] - Error getting tickets from DB:',
      error
    );
  }
  req.receiptIds = receiptIds;
  next();
};

const getExpoTokenByReceiptId = async (receiptId) => {
  let expoToken = null;
  if (env === 'DEV') {
    const ticket = JsonDB.retrieve(dataPathRoot.concat(receiptId));
    if (!isNil(ticket) && !isNil(ticket.expoToken)) {
      expoToken = ticket.expoToken;
    }
  } else {
    try {
      const result = await db.query(
        `SELECT expo_token as "expoToken" FROM tickets WHERE receipt_id = $1`,
        [receiptId]
      );
      if (result.rowCount === 1) {
        expoToken = result.rows[0].expoToken;
      }
    } catch (error) {
      expoToken = null;
    }
  }
  return expoToken;
};

const getNotificationIdsByReceiptId = async (receiptId) => {
  const ticketNotificationIds = [];
  let notificationIds;
  if (env === 'DEV') {
    const ticket = JsonDB.retrieve(dataPathRoot.concat(receiptId));
    if (!isNil(ticket) && !isNil(ticket.notificationIds)) {
      notificationIds = ticket.notificationIds;
    }
  } else {
    try {
      const result = await db.query(
        `SELECT notification_ids as "notificationIds" FROM tickets WHERE receipt_id = $1`,
        [receiptId]
      );
      if (result.rowCount === 1) {
        notificationIds = result.rows[0].notificationIds;
      }
    } catch (error) {
      notificationIds = null;
    }
  }
  if (!isNil(notificationIds) && Array.isArray(notificationIds)) {
    for (const notificationId of notificationIds) {
      ticketNotificationIds.push(notificationId);
    }
  }
  // console.log(`Ticket receiptId ${receiptId} notificationIds: ${ticketNotificationIds}`);
  return ticketNotificationIds;
};

const removeTickets = async (req, res, next) => {
  const { receiptIds } = req;
  for (const receiptId of receiptIds) {
    if (env === 'DEV') {
      JsonDB.delete(dataPathRoot.concat(receiptId));
    } else {
      try {
        await db.query(`DELETE FROM tickets WHERE receipt_id = $1`, [
          receiptId
        ]);
      } catch (error) {
        console.warn(
          'WARN [' + now() + '] - Unable to delete ticket:',
          receiptId
        );
      }
    }
    // console.log(`Deleted ticket: ${receiptId}`);
  }
  next();
};

module.exports = {
  addTickets,
  getTickets,
  getExpoTokenByReceiptId,
  getNotificationIdsByReceiptId,
  removeTickets
};
