const db = require('./db');
const JsonDB = require('./JsonDB');
const {
  retrieveTokenBookmarks,
  retrieveTokenNotificationsPrefs
} = require('./device');
const {
  env,
  maxTokensToStore,
  maxViewableLatestNotifications,
  maxWindowInDaysLatestNotifications
} = require('../config');
const {
  expoPNTokenPrefix,
  expoPNTokenSuffix,
  lang,
  messageType
} = require('../constants/constants');
const { isNil } = require('../utils/util');
const { isAfterDaysAgo, now } = require('../utils/day');

const dataPathRoot = '/notifications/';

const notification = (
  notificationId,
  to,
  toCount,
  language,
  title,
  body,
  data = null,
  created = null
) => {
  return {
    notificationId: notificationId, // uuid
    to: to, // text
    toCount: toCount, // integer
    language: language, // text: en, fr or all
    title: title, // text
    body: body, // text
    data: data, // {} with messageType, products and/or link, null
    created: created
  };
};

const addNotifications = async (req, res, next) => {
  const { sentNotifications } = req;
  if (!isNil(sentNotifications)) {
    const notifications = sentNotifications.map((sentNotification) => {
      return notification(
        sentNotification.id,
        Array.isArray(sentNotification.to) &&
          sentNotification.to.length > maxTokensToStore // if >, assume en, fr or all devices
          ? sentNotification.language
          : sentNotification.to.toString(),
        sentNotification.toCount,
        sentNotification.language,
        sentNotification.title,
        sentNotification.body,
        !isNil(sentNotification.data) ? sentNotification.data : null,
        now()
      );
    });
    for (const notification of notifications) {
      // save notification even if to.length = 0 (e.g. for language changes)
      if (!isNil(notification.created)) {
        if (env === 'DEV') {
          JsonDB.add(
            dataPathRoot.concat(notification.notificationId),
            notification
          );
        } else {
          try {
            const insertText = `INSERT INTO notifications (notification_id, "to", to_count, language, title, body, data, created) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
            const insertValues = [
              notification.notificationId,
              notification.to,
              notification.toCount,
              notification.language,
              notification.title,
              notification.body,
              notification.data,
              notification.created
            ];
            await db.query(insertText, insertValues);
          } catch (error) {
            console.warn(
              'WARN [' + now() + '] - Unable to add notification:',
              JSON.stringify(notification)
            );
          }
        }
      }
    }
  }
  next();
};

const retrieveNotifications = async () => {
  let notifications = [];
  if (env === 'DEV') {
    notifications = Object.values(JsonDB.retrieve(dataPathRoot));
  } else {
    try {
      const maxDays = maxWindowInDaysLatestNotifications;
      const maxNotifications = maxViewableLatestNotifications * 2; // include potential for en and fr
      const text = `SELECT notification_id as "notificationId", "to", to_count as "toCount", language, title, body, data, created FROM notifications WHERE id > (select max(n2.id) - ${maxNotifications} from notifications n2) AND created > current_date - interval '${maxDays} days'`;
      const result = await db.query(text);
      if (result.rowCount > 0) {
        result.rows.forEach((row) => {
          notifications.push(row);
        });
      }
    } catch (error) {
      notifications = [];
    }
  }
  return notifications;
};

const retrieveRecentNotificationsWithPushResults = async () => {
  let notifications = [];
  if (env === 'DEV') {
    // not implemented
  } else {
    try {
      const maxDays = maxWindowInDaysLatestNotifications;
      const maxNotifications = maxViewableLatestNotifications * 2; // include potential for en and fr
      const text = `select n.created, n.language, substring(n.title, 1, 64) as "title", substring(n.body, 1, 128) as "body", n.data, n.notification_id as "notificationId", n.to_count as "toCount", ((select count(1) from tickets t where (n.notification_id) = any (t.notification_ids)) = 0) as "ticketsProcessed", ((select count(1) from receipts r where (n.notification_id) = any (r.notification_ids)) - (select count(1) from receipts r2 where (n.notification_id) = any (r2.notification_ids) and receipt ->> 'status' = 'ok'))::int as "receiptsStatusNotOkCount" from notifications n where n.id > (select max(n2.id) - ${maxNotifications} from notifications n2) and n.created > current_date - interval '${maxDays} days' and n.to_count > 0 order by n.id`;
      const result = await db.query(text);
      if (result.rowCount > 0) {
        result.rows.forEach((row) => {
          notifications.push(row);
        });
      }
    } catch (error) {
      notifications = [];
    }
  }
  return notifications;
};

const isProductsInNotification = (notification) => {
  return !isNil(notification.data) && !isNil(notification.data.products);
};

const productsInNotification = (notification) => {
  let products = [];
  if (isProductsInNotification(notification)) {
    if (Array.isArray(notification.data.products)) {
      products = notification.data.products;
    } else {
      products.push(notification.data.products);
    }
  }
  return products;
};

const createdComparator = (a, b) => {
  return a.created < b.created ? 1 : -1;
};

const retrieveLatestNotifications = async (req, res, next) => {
  // get most recent notifications within last x days
  // notes:
  //   if :token has notifications disabled, response status will be 404
  //   if :token has newProducts pref disabled, new product messages will be filtered out
  //   if :token has bookmarkedProducts pref disabled, all product updates will be filtered out, else, unrelated product updates will be filtered out
  const { token } = req.params;
  const { deviceTokensForAll, deviceTokensForFr } = req;
  const tokenFormatted = expoPNTokenPrefix
    .concat(token)
    .concat(expoPNTokenSuffix);
  if (deviceTokensForAll.includes(tokenFormatted)) {
    const language = deviceTokensForFr.includes(tokenFormatted)
      ? lang.french
      : lang.english;
    const tokenBookmarks = await retrieveTokenBookmarks(token);
    const tokenNotifications = await retrieveTokenNotificationsPrefs(token);
    // retrieve notifications and filter by language and within window, and filter as appropriate (per above notes)
    const result = await retrieveNotifications();
    const notifications = result.filter((notification) => {
      const { messageType: msgType } = notification.data;
      const products = productsInNotification(notification);
      return (
        (notification.language === language ||
          notification.language === lang.all) &&
        isAfterDaysAgo(
          notification.created,
          maxWindowInDaysLatestNotifications
        ) &&
        (msgType === messageType.general ||
          (msgType === messageType.newProduct &&
            tokenNotifications.newProducts) ||
          (msgType === messageType.productUpdate &&
            tokenNotifications.bookmarkedProducts &&
            tokenBookmarks.length > 0 &&
            products.length > 0 &&
            tokenBookmarks.some((bookmark) => products.includes(bookmark))))
      );
    });
    // sort desc, and return top maxViewableLatestNotifications
    notifications.sort(createdComparator);
    const recentNotifications = [];
    let i = 0;
    while (i < notifications.length && i < maxViewableLatestNotifications) {
      // deep copy so fields can be removed from response
      recentNotifications.push(JSON.parse(JSON.stringify(notifications[i])));
      i++;
    }
    recentNotifications.forEach((notification) => {
      delete notification.notificationId;
      delete notification.to;
      delete notification.toCount;
    });
    if (recentNotifications.length > 0) {
      res.status(200).send(recentNotifications);
    } else {
      res.status(200).send([]); // no recent notifications
    }
  } else {
    res.status(404); // notifications disabled
  }
  next();
};

const getPushResults = async (req, res, next) => {
  // get most recent notifications within last x days with results (toCount, ticketsProcessed, receiptsStatusNotOkCount
  if (env === 'DEV') {
    res.status(501); // not implemented (i.e. postgres only)
  } else {
    const recentNotifications = [];
    const results = await retrieveRecentNotificationsWithPushResults();
    results.forEach((result) => {
      if (
        !isNil(result.notificationId) &&
        !isNil(result.toCount) &&
        result.toCount > 0
      ) {
        recentNotifications.push(result);
      }
    });
    if (recentNotifications.length > 0) {
      res.status(200).send(recentNotifications);
    } else {
      res.status(200).send([]); // no recent notifications
    }
  }
  next();
};

const getPushResultsForNotification = async (req, res, next) => {
  const notificationId = req.params.notificationId;
  let notification;
  if (env === 'DEV') {
    res.status(501); // not implemented (i.e. postgres only)
  } else {
    try {
      const result = await db.query(
        `select jsonb_build_object('created', n.created, 'language', n.language, 'title', n.title, 'body', n.body, 'data', n.data, 'notificationId', n.notification_id, 'toCount', n.to_count, 'ticketsProcessed', ((select count(1) from tickets t where (n.notification_id) = any (t.notification_ids)) = 0), 'receiptsStatusNotOk', (select coalesce(jsonb_agg(jsonb_build_object('receiptId', r.receipt_id, 'created', r.created, 'receipt', r.receipt, 'notification_ids', r.notification_ids)), '[]'::jsonb) from receipts r where (n.notification_id) = any (r.notification_ids) and receipt ->> 'status' <> 'ok')) as "notification" from notifications n where n.notification_id = $1::uuid`,
        [notificationId]
      );
      if (result.rowCount === 1) {
        notification = result.rows[0];
      }
    } catch (error) {
      notification = null;
    }
  }
  if (!isNil(notification) && !isNil(notification.notification)) {
    res.status(200).send(notification);
  } else {
    res.status(404);
  }
  next();
};

module.exports = {
  addNotifications,
  retrieveLatestNotifications,
  isProductsInNotification,
  productsInNotification,
  getPushResults,
  getPushResultsForNotification
};
