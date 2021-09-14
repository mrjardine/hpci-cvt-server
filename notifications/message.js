const { lang } = require('../constants/constants');
const {
  checkTokenExists,
  checkTokensExist,
  retrieveTokenBookmarks
} = require('../data/device');
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
        (!isNil(data) && (!isNil(data.products) || !isNil(data.link)))) &&
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
    throw 'Invalid message (to, title, and body are required, token(s) must be registered and stored, and data must include products and/or link if provided).';
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

const isProductsInMessage = (message) => {
  return !isNil(message.data) && !isNil(message.data.products);
};

const productsInMessage = (message) => {
  let products = [];
  if (isProductsInMessage(message)) {
    if (Array.isArray(message.data.products)) {
      products = message.data.products;
    } else {
      products.push(message.data.products);
    }
  }
  return products;
};

// 1. deviceToken and language are stored: user has notifications enabled
// 2. deviceToken has no bookmarks: user will receive all notifications
// 3. deviceToken has bookmarks: user will receive notifications with no products (general)
// 4.                            user will receive notifications for bookmarked products
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
  if (isValid) {
    messages.forEach((message) => {
      let deviceTokens = [];
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
          break;
      }
      if (['all', 'en', 'fr'].includes(to)) {
        if (isProductsInMessage(message)) {
          const toDeviceTokens = [];
          const products = productsInMessage(message);
          // include tokens only if there are no bookmarks or if any of the products are bookmarked...
          deviceTokens.forEach((deviceToken) => {
            const bookmarks = retrieveTokenBookmarks(deviceToken);
            if (
              bookmarks.length === 0 ||
              bookmarks.some((bookmark) => products.includes(bookmark))
            ) {
              toDeviceTokens.push(deviceToken);
            }
          });
          message.to = toDeviceTokens;
        } else {
          message.to = deviceTokens;
        }
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
