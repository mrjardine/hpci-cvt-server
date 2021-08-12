const { checkTokenExists, checkTokensExist } = require('../data/device');
const { isNil } = require('../utils/util');

const isInvalid = (message) => {
  const { to, title, body } = message;
  try {
    if (
      !isNil(to) &&
      !isNil(title) &&
      !isNil(body) &&
      title.trim() !== '' &&
      body.trim() !== ''
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
    throw 'Invalid message (to, title, and body are required, and token(s) must be registered and stored).';
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
      const { to } = message;
      switch (to) {
        case 'all':
          message.to = req.deviceTokens;
          break;
        case 'en':
          message.to = req.deviceTokensForEn;
          break;
        case 'fr':
          message.to = req.deviceTokensForFr;
          break;
        default:
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
