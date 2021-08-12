const JsonDB = require('./JsonDB');
const { isNil } = require('../utils/util');
const { now, isBeforeAnHourAgo } = require('../utils/day');

const dataPathRoot = '/tickets/';

const ticket = (
  status,
  expoToken = null,
  message = null,
  details = null,
  receiptId = null,
  created = null
) => {
  return {
    status: status, // text
    expoToken: expoToken, // text
    message: message, // text, null
    details: details, // text, null
    receiptId: receiptId, // uuid, null?
    created: created
  };
};

const addTickets = (req, res, next) => {
  const { expoTickets, expoTokens } = req;
  // console.log('Expo tickets: ', expoTickets);
  // console.log('Sent expo tokens:', expoTokens);
  if (!isNil(expoTickets)) {
    const tickets = expoTickets.map((expoTicket, index) => {
      return ticket(
        expoTicket.status,
        expoTokens[index],
        !isNil(expoTicket.message) ? expoTicket.message : null,
        !isNil(expoTicket.details) ? expoTicket.details : null,
        !isNil(expoTicket.id) ? expoTicket.id : null,
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
  removeTickets
};
