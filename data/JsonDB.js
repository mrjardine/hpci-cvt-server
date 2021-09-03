const { JsonDB: NodeJsonDB } = require('node-json-db');
const { Config } = require('node-json-db/dist/lib/JsonDBConfig');
const { devDbFile, devDbPath } = require('../config');

class JsonDB {
  static instance;

  constructor() {
    if (!this.instance) {
      this.instance = this;
      // console.log('starting JsonDB...'); // single instance
      // https://github.com/Belphemur/node-json-db
      this.db = new NodeJsonDB(
        new Config(devDbPath.concat(devDbFile), true, true, '/')
      );
    }
    return this.instance;
  }

  add(datapath, data) {
    this.db.push(datapath, data, false);
  }

  retrieve(dataPath) {
    let data = null;
    try {
      data = this.db.getData(dataPath);
    } catch (error) {
      // The error will tell you where the DataPath stopped.
      console.log(error);
    }
    return data;
  }

  delete(dataPath) {
    this.db.delete(dataPath);
  }

  reload() {
    // use if exterior changes need to be reloaded
    this.db.reload();
  }

  save() {
    // use if saveOnPush is disabled
    this.db.save();
  }
}

const jsonDB = new JsonDB();

module.exports = jsonDB;
