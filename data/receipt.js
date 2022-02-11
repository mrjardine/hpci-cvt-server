const JsonDB = require('./JsonDB');
const { v4: uuidv4 } = require('uuid');
const { getNotificationIdsByReceiptId } = require('./ticket');
const { isNil } = require('../utils/util');
const { now } = require('../utils/day');

const dataPathRoot = '/receipts/';

const receipt = (
  receiptId,
  receipt = null,
  notificationIds = null,
  created = null
) => {
  return {
    receiptId: receiptId, // uuid
    receipt: receipt, // {}
    notificationIds: notificationIds, // [uuid]
    created: created
  };
};

const addReceipts = (req, res, next) => {
  const { expoPushNotificationReceipts } = req;
  // console.log('Expo pn receipts: ', expoPushNotificationReceipts);
  if (
    !isNil(expoPushNotificationReceipts) &&
    expoPushNotificationReceipts.length > 0
  ) {
    const receipts = expoPushNotificationReceipts.map((expoReceipt, index) => {
      const notificationIds = getNotificationIdsByReceiptId(
        expoReceipt.receiptId
      );
      const expoReceiptData = {
        status: expoReceipt.status
      };
      if (!isNil(expoReceipt.message)) {
        expoReceiptData.message = expoReceipt.message;
      }
      if (!isNil(expoReceipt.details)) {
        expoReceiptData.details = expoReceipt.details;
      }
      return receipt(
        expoReceipt.receiptId,
        expoReceiptData,
        notificationIds,
        now()
      );
    });
    // console.log('receipts: ', receipts);
    receipts.forEach((receipt) => {
      !isNil(receipt.receiptId) &&
        JsonDB.add(dataPathRoot.concat(uuidv4()), receipt);
    });
  }
  next();
};

module.exports = {
  addReceipts
};
