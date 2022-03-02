const db = require('./db');
const JsonDB = require('./JsonDB');
const { getNotificationIdsByReceiptId } = require('./ticket');
const { env } = require('../config');
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

const addReceipts = async (req, res, next) => {
  const { expoPushNotificationReceipts } = req;
  if (
    !isNil(expoPushNotificationReceipts) &&
    expoPushNotificationReceipts.length > 0
  ) {
    const receipts = [];
    for (const expoReceipt of expoPushNotificationReceipts) {
      const notificationIds = await getNotificationIdsByReceiptId(
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
      receipts.push(
        receipt(expoReceipt.receiptId, expoReceiptData, notificationIds, now())
      );
    }
    for (const receipt of receipts) {
      if (!isNil(receipt.receiptId)) {
        if (env === 'DEV') {
          JsonDB.add(dataPathRoot.concat(receipt.receiptId), receipt);
        } else {
          try {
            const insertText = `INSERT INTO receipts (receipt_id, receipt, notification_ids, created) VALUES ($1, $2, $3, $4) RETURNING *`;
            const insertValues = [
              receipt.receiptId,
              receipt.receipt,
              receipt.notificationIds,
              receipt.created
            ];
            await db.query(insertText, insertValues);
          } catch (error) {
            console.warn(
              'WARN [' + now() + '] - Unable to add receipt:',
              JSON.stringify(receipt)
            );
          }
        }
      }
    }
  }
  next();
};

module.exports = {
  addReceipts
};
