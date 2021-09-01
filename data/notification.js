const JsonDB = require('./JsonDB');
const { v4: uuidv4 } = require('uuid');
const { isNil } = require('../utils/util');
const { now } = require('../utils/day');

const dataPathRoot = '/notifications/';

const notification = (
  to,
  title,
  body,
  data = null,
  created = null
) => {
  return {
    to: to, // [text]
    title: title, // text
    body: body, // text
    data: data, // {} with nid and/or link, null
    created: created
  };
};

const addNotifications = (req, res, next) => {
  const { sentNotifications } = req;
  // console.log('Sent notifications: ', sentNotifications);
  if (!isNil(sentNotifications)) {
    const notifications = sentNotifications.map((sentNotification) => {
      return notification(
        sentNotification.to,
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
