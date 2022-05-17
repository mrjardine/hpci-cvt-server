const db = require('./db');
const JsonDB = require('./JsonDB');
const { env } = require('../config');
const {
  lang,
  expoPNTokenPrefix,
  expoPNTokenSuffix
} = require('../constants/constants');
const { isNil, isBoolean } = require('../utils/util');
const { now } = require('../utils/day');

const dataPathRoot = '/devices/';

const device = (
  token,
  language = lang.english,
  notifications,
  bookmarks = []
) => {
  return {
    token: expoPNTokenPrefix.concat(token).concat(expoPNTokenSuffix), // token param is 22 length deviceId, i.e. non-whitespace id between [] in ExponentPushToken[...] (Expo token)
    language: language === 'fr' ? lang.french : lang.english,
    notifications: {
      enabled: notifications.enabled,
      newProducts: notifications.newProducts,
      bookmarkedProducts: notifications.bookmarkedProducts
    },
    bookmarks: bookmarks && bookmarks.map((x) => x),
    updated: now()
  };
};

const isValid = (token, language, notifications, bookmarks) => {
  return (
    !isNil(token) &&
    token.length === 22 &&
    (language === lang.english || language === lang.french) &&
    !isNil(notifications) &&
    isBoolean(notifications.enabled) &&
    isBoolean(notifications.newProducts) &&
    isBoolean(notifications.bookmarkedProducts) &&
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
  let notifications =
    !isNil(data) && !isNil(data.notifications)
      ? data.notifications
      : { enabled: true, newProducts: true, bookmarkedProducts: true };
  let bookmarks = !isNil(data) && !isNil(data.bookmarks) ? data.bookmarks : [];
  req.validDevice = isValid(token, languagePref, notifications, bookmarks);
  if (req.validDevice) {
    req.userDevice = device(token, languagePref, notifications, bookmarks);
    req.enabledDevice = notifications.enabled;
  }
  next();
};

const addDevice = async (req, res, next) => {
  const { params, validDevice, userDevice, enabledDevice } = req;
  const { data } = req.body;
  if (validDevice && enabledDevice) {
    // override bookmarks if provided, else merge (i.e. can change language without providing bookmarks)
    const override = !isNil(data) && !isNil(data.bookmarks);
    if (env === 'DEV') {
      JsonDB.add(dataPathRoot.concat(params.token), userDevice, override);
      //res.send(userDevice);
      res.status(200);
    } else {
      let updateOverrideText, updateOverrideValues; // updates bookmarks
      let updateText, updateValues; // does not update bookmarks
      let updateResult;
      let insertText, insertValues;
      try {
        if (override) {
          updateOverrideText = `UPDATE devices SET token = $2, language = $3, notifications = $4, bookmarks = $5, updated = $6 WHERE device_id = $1 RETURNING *`;
          updateOverrideValues = [
            params.token,
            userDevice.token,
            userDevice.language,
            userDevice.notifications,
            userDevice.bookmarks,
            userDevice.updated
          ];
          updateResult = await db.query(
            updateOverrideText,
            updateOverrideValues
          );
        } else {
          updateText = `UPDATE devices SET token = $2, language = $3, notifications = $4, updated = $5 WHERE device_id = $1 RETURNING *`;
          updateValues = [
            params.token,
            userDevice.token,
            userDevice.language,
            userDevice.notifications,
            userDevice.updated
          ];
          updateResult = await db.query(updateText, updateValues);
        }
        if (updateResult.rowCount === 0) {
          insertText = `INSERT INTO devices (device_id, token, language, notifications, bookmarks) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
          insertValues = [
            params.token,
            userDevice.token,
            userDevice.language,
            userDevice.notifications,
            userDevice.bookmarks
          ];
          await db.query(insertText, insertValues);
          //const insertResult = await db.query(insertText, insertValues);
          //res.send(insertResult.rows[0]);
          //} else {
          //res.send(updateResult.rows[0]);
        }
        res.status(200);
      } catch (error) {
        console.warn(
          'WARN [' + now() + '] - Unable to add device:',
          JSON.stringify(userDevice)
        );
        res.status(400);
      }
    }
  } else {
    res.status(400);
  }
  next();
};

const retrieveDevice = async (req, res, next) => {
  const token = req.params.token;
  const language = !isNil(req.params.language) ? req.params.language : '';
  let device;
  if (env === 'DEV') {
    device = JsonDB.retrieve(dataPathRoot.concat(token));
  } else {
    try {
      const result = await db.query(
        `SELECT token, language, notifications, bookmarks, updated FROM devices WHERE device_id = $1`,
        [token]
      );
      if (result.rowCount === 1) {
        device = result.rows[0];
      }
    } catch (error) {
      device = null;
    }
  }
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

const deleteDevice = async (req, res, next) => {
  const { params, enabledDevice } = req;
  const token = params.token;
  if (token.length === 22 && (isNil(enabledDevice) || !enabledDevice)) {
    if (env === 'DEV') {
      JsonDB.delete(dataPathRoot.concat(token));
    } else {
      try {
        await db.query(`DELETE FROM devices WHERE device_id = $1`, [token]);
      } catch (error) {
        console.warn('WARN [' + now() + '] - Unable delete device:', token);
      }
    }
    // console.log(`Deleted device: ${token}`);
    res.status(200);
  }
  next();
};

const retrieveDevices = async (language = null) => {
  let devices = [];
  if (env === 'DEV') {
    devices = Object.values(JsonDB.retrieve(dataPathRoot));
  } else {
    try {
      let result;
      if (
        !isNil(language) &&
        (language === lang.english || language === lang.french)
      ) {
        result = await db.query(
          `SELECT token, language, notifications, bookmarks, updated FROM devices WHERE language = $1`,
          [language]
        );
      } else {
        result = await db.query(
          `SELECT token, language, notifications, bookmarks, updated FROM devices`
        );
      }
      if (result.rowCount > 0) {
        result.rows.forEach((row) => {
          devices.push(row);
        });
      }
    } catch (error) {
      devices = [];
    }
  }
  return devices;
};

const deviceTokens = async (language) => {
  const deviceTokens = [];
  const devices = await retrieveDevices(language);
  devices.forEach((device) => {
    // must have notifications enabled
    if (device.notifications.enabled) {
      if (device.language === language || language === lang.all) {
        deviceTokens.push(device.token);
      }
    }
  });
  return deviceTokens;
};

const deviceTokensForEn = async (req, res, next) => {
  req.deviceTokensForEn = await deviceTokens(lang.english);
  next();
};

const deviceTokensForFr = async (req, res, next) => {
  req.deviceTokensForFr = await deviceTokens(lang.french);
  next();
};

const deviceTokensForAll = async (req, res, next) => {
  const { deviceTokensForEn, deviceTokensForFr } = req;
  const deviceTokens = [];
  deviceTokensForEn.forEach((deviceToken) => {
    deviceTokens.push(deviceToken);
  });
  deviceTokensForFr.forEach((deviceToken) => {
    deviceTokens.push(deviceToken);
  });
  req.deviceTokensForAll = deviceTokens;
  next();
};

const countDevices = (req, res, next) => {
  const language = !isNil(req.params.language) ? req.params.language : '';
  const { deviceTokensForEn, deviceTokensForFr, deviceTokensForAll } = req;
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

const parseDeviceId = (token) => {
  // parse deviceId from token
  return token.length === 22
    ? token
    : token.replace(expoPNTokenPrefix, '').replace(expoPNTokenSuffix, '');
};

const checkTokenExists = async (token) => {
  const deviceId = parseDeviceId(token);
  let device;
  if (env === 'DEV') {
    device = JsonDB.retrieve(dataPathRoot.concat(deviceId));
  } else {
    try {
      const result = await db.query(
        `SELECT token FROM devices WHERE device_id = $1`,
        [deviceId]
      );
      if (result.rowCount === 1) {
        device = result.rows[0];
      }
    } catch (error) {
      device = null;
    }
  }
  if (!isNil(device) && !isNil(device.token)) {
    return true;
  }
  return false;
};

const checkTokensExist = async (tokens) => {
  if (!isNil(tokens) && Array.isArray(tokens) && tokens.length > 0) {
    let exists = true;
    for (const token of tokens) {
      exists = exists && (await checkTokenExists(token));
    }
    return exists;
  }
  return false;
};

const retrieveTokenBookmarks = async (token) => {
  const deviceId = parseDeviceId(token);
  const tokenBookmarks = [];
  let bookmarks;
  if (env === 'DEV') {
    bookmarks = JsonDB.retrieve(
      dataPathRoot.concat(parseDeviceId(token).concat('/bookmarks'))
    );
  } else {
    try {
      const result = await db.query(
        `SELECT bookmarks FROM devices WHERE device_id = $1`,
        [deviceId]
      );
      if (result.rowCount === 1) {
        bookmarks = result.rows[0].bookmarks;
      }
    } catch (error) {
      bookmarks = null;
    }
  }
  if (!isNil(bookmarks) && Array.isArray(bookmarks)) {
    for (const bookmark of bookmarks) {
      tokenBookmarks.push(bookmark);
    }
  }
  return tokenBookmarks;
};

const retrieveTokenNotificationsPrefs = async (token) => {
  const deviceId = parseDeviceId(token);
  let notificationsPrefs;
  if (env === 'DEV') {
    notificationsPrefs = JsonDB.retrieve(
      dataPathRoot.concat(deviceId.concat('/notifications'))
    );
  } else {
    try {
      const result = await db.query(
        `SELECT notifications FROM devices WHERE device_id = $1`,
        [deviceId]
      );
      if (result.rowCount === 1) {
        notificationsPrefs = result.rows[0].notifications;
      }
    } catch (error) {
      notificationsPrefs = null;
    }
  }
  return !isNil(notificationsPrefs) && notificationsPrefs.enabled
    ? notificationsPrefs
    : { enabled: false, newProducts: false, bookmarkedProducts: false };
};

const removeDevice = async (token) => {
  const deviceId = parseDeviceId(token);
  if (deviceId.length === 22) {
    if (env === 'DEV') {
      JsonDB.delete(dataPathRoot.concat(deviceId));
    } else {
      try {
        await db.query(`DELETE FROM devices WHERE device_id = $1`, [deviceId]);
      } catch (error) {
        console.warn(
          'WARN [' + now() + '] - Unable to delete device:',
          deviceId
        );
      }
    }
    console.log('Removed device:', deviceId);
  }
};

module.exports = {
  prepareDevice,
  addDevice,
  retrieveDevice,
  deleteDevice,
  deviceTokensForEn,
  deviceTokensForFr,
  deviceTokensForAll,
  countDevices,
  reloadDevices,
  checkTokenExists,
  checkTokensExist,
  retrieveTokenBookmarks,
  retrieveTokenNotificationsPrefs,
  removeDevice
};
