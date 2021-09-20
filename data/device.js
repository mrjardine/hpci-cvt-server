const { env } = require('../config');
const {
  lang,
  expoPNTokenPrefix,
  expoPNTokenSuffix
} = require('../constants/constants');
const JsonDB = require('./JsonDB');
const { isNil } = require('../utils/util');
const { now } = require('../utils/day');

const dataPathRoot = '/devices/';

const device = (token, language = lang.english, bookmarks = []) => {
  return {
    token: expoPNTokenPrefix.concat(token).concat(expoPNTokenSuffix), // token: 22 length, non-whitespace id between [] in ExponentPushToken[...]
    language: language === 'fr' ? lang.french : lang.english,
    bookmarks: bookmarks && bookmarks.map((x) => x),
    updated: now()
  };
};

const isValid = (token, language, bookmarks) => {
  return (
    !isNil(token) &&
    token.length === 22 &&
    (language === lang.english || language === lang.french) &&
    (isNil(bookmarks) || Array.isArray(bookmarks))
  );
};

const prepareDevice = (req, res, next) => {
  const { token, language } = req.params;
  const { data } = req.body;
  let languagePref = language;
  if (isNil(languagePref) && !isNil(data) && !isNil(data.language)) {
    languagePref = data.language;
  } else {
    languagePref = !isNil(languagePref) ? languagePref : lang.english; // reset to en if language is not provided
  }
  let bookmarks = !isNil(data) && !isNil(data.bookmarks) ? data.bookmarks : [];
  req.validDevice = isValid(token, languagePref, bookmarks);
  if (req.validDevice) {
    req.userDevice = device(token, languagePref, bookmarks);
  }
  next();
};

const addDevice = (req, res, next) => {
  const { params, validDevice, userDevice } = req;
  const { data } = req.body;
  if (validDevice) {
    // override bookmarks if provided, else merge (i.e. can change language without providing bookmarks)
    const override = !isNil(data) && !isNil(data.bookmarks);
    JsonDB.add(dataPathRoot.concat(params.token), userDevice, override);
    res.status(200);
    // console.log('device: ', userDevice);
    //res.send(userDevice);
  } else {
    res.status(400);
  }
  next();
};

const retrieveDevice = (req, res, next) => {
  const token = req.params.token;
  const language = !isNil(req.params.language) ? req.params.language : '';
  const device = JsonDB.retrieve(dataPathRoot.concat(token));
  if (
    !isNil(device) &&
    !isNil(device.token) &&
    (language === '' || device.language === language)
  ) {
    res.status(200).send(device);
  } else {
    res.status(404);
  }
  next();
};

const deleteDevice = (req, res, next) => {
  const token = req.params.token;
  if (token.length === 22) {
    JsonDB.delete(dataPathRoot.concat(token));
    res.status(200);
  }
  next();
};

const retrieveDevices = () => {
  return Object.values(JsonDB.retrieve(dataPathRoot));
};

const deviceTokens = (language) => {
  const deviceTokens = [];
  const devices = retrieveDevices();
  devices.forEach((device) => {
    if (device.language === language || language === lang.all) {
      deviceTokens.push(device.token);
    }
  });
  return deviceTokens;
};

const deviceTokensForAll = (req, res, next) => {
  req.deviceTokensForAll = deviceTokens(lang.all);
  next();
};

const deviceTokensForEn = (req, res, next) => {
  req.deviceTokensForEn = deviceTokens(lang.english);
  next();
};

const deviceTokensForFr = (req, res, next) => {
  req.deviceTokensForFr = deviceTokens(lang.french);
  next();
};

const countDevices = (req, res, next) => {
  const language = !isNil(req.params.language) ? req.params.language : '';
  const { deviceTokensForAll, deviceTokensForEn, deviceTokensForFr } = req;
  try {
    let count = 0;
    let message = 'total devices';
    switch (language) {
      case lang.english:
        count = deviceTokensForEn.length;
        message = message.concat(' with en language preference');
        break;
      case lang.french:
        count = deviceTokensForFr.length;
        message = message.concat(' with fr language preference');
        break;
      default:
        count = deviceTokensForAll.length;
    }
    res
      .status(200)
      .send(
        JSON.parse('{"'.concat(message).concat('": ').concat(count).concat('}'))
      );
  } catch (error) {
    // console.log(error);
    res.status(404);
  }
  next();
};

const reloadDevices = (req, res, next) => {
  if (env === 'DEV') {
    JsonDB.reload();
    res.status(200);
  } else {
    res.status(404); // restart server
  }
  next();
};

const parseToken = (token) => {
  return token.length === 22
    ? token
    : token.replace(expoPNTokenPrefix, '').replace(expoPNTokenSuffix, '');
};

const checkTokenExists = (token) => {
  const device = JsonDB.retrieve(dataPathRoot.concat(parseToken(token)));
  if (!isNil(device) && !isNil(device.token)) {
    return true;
  }
  return false;
};

const checkTokensExist = (tokens) => {
  if (!isNil(tokens) && Array.isArray(tokens) && tokens.length > 0) {
    let exists = true;
    tokens.forEach((token) => {
      exists = exists && checkTokenExists(token);
    });
    return exists;
  }
  return false;
};

const retrieveTokenBookmarks = (token) => {
  const tokenBookmarks = [];
  const bookmarks = JsonDB.retrieve(
    dataPathRoot.concat(parseToken(token).concat('/bookmarks'))
  );
  bookmarks.forEach((bookmark) => {
    tokenBookmarks.push(bookmark);
  });
  return tokenBookmarks;
};

const removeDevice = (exponentPushToken) => {
  const token = parseToken(exponentPushToken);
  if (token.length === 22) {
    JsonDB.delete(dataPathRoot.concat(token));
    console.log('Removed device: ', exponentPushToken);
  }
};

module.exports = {
  prepareDevice,
  addDevice,
  retrieveDevice,
  deleteDevice,
  deviceTokensForAll,
  deviceTokensForEn,
  deviceTokensForFr,
  countDevices,
  reloadDevices,
  checkTokenExists,
  checkTokensExist,
  retrieveTokenBookmarks,
  removeDevice
};
