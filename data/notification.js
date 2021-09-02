const JsonDB = require('./JsonDB');
const { v4: uuidv4 } = require('uuid');
const { lang } = require('../constants/constants');
const { isNil } = require('../utils/util');
const { now } = require('../utils/day');

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
    data: data, // {} with nid and/or link, null
    created: created
  };
};

const addNotifications = (req, res, next) => {
  const { sentNotifications } = req;
  // console.log('Sent notifications: ', sentNotifications);
  const maxTokensToStore = 10; // if >, assume en, fr or all devices
  if (!isNil(sentNotifications)) {
    const notifications = sentNotifications.map((sentNotification) => {
      return notification(
        Array.isArray(sentNotification.to) && sentNotification.to.length
          > maxTokensToStore
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
      !isNil(notification.created) &&
        JsonDB.add(dataPathRoot.concat(uuidv4()), notification);
    });
  }
  next();
};

module.exports = {
  addNotifications
};
