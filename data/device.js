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

const addDevice = (req, res, next) => {
  const token = req.params.token;
  const language = !isNil(req.params.language)
    ? req.params.language
    : lang.english;
  // TODO: bookmarks
  if (token.length === 22) {
    const userDevice = device(token, language);
    JsonDB.add(dataPathRoot.concat(token), userDevice);
    res.status(200);
    // console.log('device: ', userDevice);
    //res.send(userDevice);
  }
  next();
};

const retrieveDevice = (req, res, next) => {
  const token = req.params.token;
  const language = !isNil(req.params.language) ? req.params.language : '';
  // TODO: bookmarks
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

const countDevices = (req, res, next) => {
  const language = !isNil(req.params.language) ? req.params.language : '';
  // TODO: bookmarks
  try {
    const devices = retrieveDevices();
    let count = 0;
    let message = 'total device tokens stored';
    if (language === '') {
      count = devices.length;
    } else {
      for (var i = 0; i < devices.length; i++) {
        if ('language' in devices[i] && devices[i].language === language)
          count++;
      }
      message =
        'total device tokens stored with ' + language + ' language preference';
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
  }
  res.status(200);
  next();
};

const deviceTokens = (req, res, next) => {
  const deviceTokens = [];
  const devices = retrieveDevices();
  devices.forEach((device) => {
    deviceTokens.push(device.token);
  });
  req.deviceTokens = deviceTokens;
  next();
};

const deviceTokensForLanguage = (language) => {
  const deviceTokens = [];
  const devices = retrieveDevices();
  devices.forEach((device) => {
    if (device.language === language) {
      deviceTokens.push(device.token);
    }
  });
  return deviceTokens;
};

const deviceTokensForEn = (req, res, next) => {
  req.deviceTokensForEn = deviceTokensForLanguage(lang.english);
  next();
};

const deviceTokensForFr = (req, res, next) => {
  req.deviceTokensForFr = deviceTokensForLanguage(lang.french);
  next();
};

const checkTokenExists = (token) => {
  const device = JsonDB.retrieve(
    dataPathRoot.concat(
      token.replace(expoPNTokenPrefix, '').replace(expoPNTokenSuffix, '')
    )
  );
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

const removeDevice = (exponentPushToken) => {
  const token = exponentPushToken
    .replace(expoPNTokenPrefix, '')
    .replace(expoPNTokenSuffix, '');
  if (token.length === 22) {
    JsonDB.delete(dataPathRoot.concat(token));
    console.log('Removed device: ', exponentPushToken);
  }
};

module.exports = {
  addDevice,
  retrieveDevice,
  deleteDevice,
  countDevices,
  reloadDevices,
  deviceTokens,
  deviceTokensForEn,
  deviceTokensForFr,
  checkTokenExists,
  checkTokensExist,
  removeDevice
};
