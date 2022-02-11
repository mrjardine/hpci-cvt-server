const { v4: uuidv4 } = require('uuid');
const { lang, messageType } = require('../constants/constants');
const {
  checkTokenExists,
  checkTokensExist,
  retrieveTokenBookmarks,
  retrieveTokenNotificationsPrefs
} = require('../data/device');
const {
  isProductsInNotification,
  productsInNotification
} = require('../data/notification');
const { isNil } = require('../utils/util');

const isInvalid = (message) => {
  const { to, title, body, data, language } = message;
  try {
    if (
      !isNil(to) &&
      !isNil(title) &&
      !isNil(body) &&
      title.trim() !== '' &&
      body.trim() !== '' &&
      (isNil(data) ||
        (!isNil(data) &&
          ((!isNil(data.messageType) &&
            [
              messageType.general,
              messageType.newProduct,
              messageType.productUpdate
            ].indexOf(data.messageType) >= 0) ||
            !isNil(data.products) ||
            !isNil(data.link)))) &&
      (isNil(language) ||
        (!isNil(language) &&
          [lang.english, lang.french, lang.all].indexOf(language) >= 0))
    ) {
      if (to === 'all' || to === 'en' || to === 'fr') {
        return false;
      } else if (Array.isArray(to)) {
        if (checkTokensExist(to)) {
          return false;
        }
      } else if (to.startsWith('Expo')) {
        if (checkTokenExists(to)) {
          return false;
        }
      }
    }
    throw 'Invalid message (to, title, and body are required, token(s) must be registered and stored, and data must include messageType, products and/or link if provided).';
  } catch (error) {
    console.log(error, message);
    return true;
  }
};

const isValid = (messages) => {
  let inValidMessages = false;
  messages.some((message) => {
    if (isInvalid(message)) {
      inValidMessages = true;
      return true;
    } else {
      return false;
    }
  });
  return !inValidMessages;
};

const deviceTokensInMessage = (message) => {
  let deviceTokens = [];
  const { to } = message;
  if (Array.isArray(to)) {
    deviceTokens = to;
  } else {
    deviceTokens.push(to);
  }
  return deviceTokens;
};

// Message Type         Device Settings                Notes
// ---------------------------------------------------------------------------------------------------------------------
// general (default)    enabled                        user will receive general notifications
// newProduct           enabled, newProducts           user will receive notifications for new products
// productUpdate        enabled, bookmarkedProducts    user will receive notifications for products they have bookmarked
const prepareMessages = (req, res, next) => {
  // console.log('req.body: ', req.body);
  let messages = [];
  if (Array.isArray(req.body)) {
    messages = req.body.map((message) => {
      return message;
    });
  } else {
    messages.push(req.body);
  }
  const validMessages = isValid(messages);
  if (validMessages) {
    messages.forEach((message) => {
      let deviceTokens = [];
      let filteredDeviceTokens = [];
      message.id = uuidv4();
      const { to } = message;
      switch (to) {
        case 'all':
          message.language = lang.all;
          deviceTokens = req.deviceTokensForAll;
          break;
        case 'en':
          message.language = lang.english;
          deviceTokens = req.deviceTokensForEn;
          break;
        case 'fr':
          message.language = lang.french;
          deviceTokens = req.deviceTokensForFr;
          break;
        default:
          message.language = isNil(message.language)
            ? lang.english
            : message.language;
          deviceTokens = deviceTokensInMessage(message);
          break;
      }
      if (isNil(message.data)) {
        message.data = {};
      }
      if (isNil(message.data.messageType)) {
        message.data.messageType = messageType.general;
      }
      const { messageType: msgType } = message.data;
      switch (msgType) {
        case messageType.general:
          message.to = deviceTokens;
          message.toCount = deviceTokens.length;
          break;
        case messageType.newProduct:
          deviceTokens.forEach((deviceToken) => {
            const notificationsPrefs =
              retrieveTokenNotificationsPrefs(deviceToken);
            if (notificationsPrefs.newProducts) {
              filteredDeviceTokens.push(deviceToken);
            }
          });
          message.to = filteredDeviceTokens;
          message.toCount = filteredDeviceTokens.length;
          break;
        case messageType.productUpdate:
          if (isProductsInNotification(message)) {
            const products = productsInNotification(message);
            // include tokens only if any of the products are bookmarked...
            deviceTokens.forEach((deviceToken) => {
              const notificationsPrefs =
                retrieveTokenNotificationsPrefs(deviceToken);
              if (notificationsPrefs.bookmarkedProducts) {
                const bookmarks = retrieveTokenBookmarks(deviceToken);
                if (bookmarks.some((bookmark) => products.includes(bookmark))) {
                  filteredDeviceTokens.push(deviceToken);
                }
              }
            });
          } else {
            console.log(
              'Message - productUpdate message should identify updated product(s), message: ',
              message
            );
          }
          message.to = filteredDeviceTokens;
          message.toCount = filteredDeviceTokens.length;
          break;
      }
    });
  }
  req.messagesToSend = messages;
  req.validMessages = validMessages;
  next();
};

module.exports = {
  prepareMessages
};
