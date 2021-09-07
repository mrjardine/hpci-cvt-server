const { lang } = require('../constants/constants');
const { checkTokenExists, checkTokensExist } = require('../data/device');
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
        (!isNil(data) && (!isNil(data.nid) || !isNil(data.link)))) &&
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
    throw 'Invalid message (to, title, and body are required, token(s) must be registered and stored, and data must include nid and/or link if provided).';
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
          message.language = lang.all;
          break;
        case 'en':
          message.to = req.deviceTokensForEn;
          message.language = lang.english;
          break;
        case 'fr':
          message.to = req.deviceTokensForFr;
          message.language = lang.french;
          break;
        default:
          message.language = isNil(message.language)
            ? lang.english
            : message.language;
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
