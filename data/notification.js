const JsonDB = require('./JsonDB');
const { v4: uuidv4 } = require('uuid');
const {
  retrieveTokenBookmarks,
  retrieveTokenNotifications
} = require('./device');
const {
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
  to,
  language,
  title,
  body,
  data = null,
  created = null
) => {
  return {
    to: to, // text
    language: language, // text: en, fr or all
    title: title, // text
    body: body, // text
    data: data, // {} with messageType, products and/or link, null
    created: created
  };
};

const addNotifications = (req, res, next) => {
  const { sentNotifications } = req;
  // console.log('Sent notifications: ', sentNotifications);
  if (!isNil(sentNotifications)) {
    const notifications = sentNotifications.map((sentNotification) => {
      return notification(
        Array.isArray(sentNotification.to) &&
          sentNotification.to.length > maxTokensToStore // if >, assume en, fr or all devices
          ? sentNotification.language
          : sentNotification.to.toString(),
        sentNotification.language,
        sentNotification.title,
        sentNotification.body,
        !isNil(sentNotification.data) ? sentNotification.data : null,
        now()
      );
    });
    // console.log('Notifications: ', notifications);
    notifications.forEach((notification) => {
      // save notification even if to.length > 0 (e.g. for language changes)
      !isNil(notification.created) &&
        JsonDB.add(dataPathRoot.concat(uuidv4()), notification);
    });
  }
  next();
};

const retrieveNotifications = () => {
  return Object.values(JsonDB.retrieve(dataPathRoot));
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

const retrieveLatestNotifications = (req, res, next) => {
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
    const tokenBookmarks = retrieveTokenBookmarks(token);
    const tokenNotifications = retrieveTokenNotifications(token);
    // retrieve notifications and filter by language and within window, and filter as appropriate (per above notes)
    const notifications = retrieveNotifications().filter((notification) => {
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
      recentNotifications.push(notifications[i]);
      i++;
    }
    recentNotifications.forEach((notification) => {
      delete notification.to;
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

module.exports = {
  addNotifications,
  retrieveLatestNotifications,
  isProductsInNotification,
  productsInNotification
};
