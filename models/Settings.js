import { initDatabase, getDatastores } from './db.js';

const DEFAULT_SETTINGS = {
  dailyGoal: 120,
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  roundsUntilLongBreak: 4,
  disableShortBreaks: false,
  disableLongBreaks: false,
  autoStartWork: false,
  autoStartBreaks: false,
  countdownDial: true,
  theme: 'dark',
  timerStyle: 'circular',
  notificationsEnabled: true,
};

class SettingsModel {
  static async getDB() {
    await initDatabase();
    return getDatastores().settingsDB;
  }

  static async findOne(query = {}) {
    const db = await this.getDB();
    let doc = await db.findOneAsync(query);
    if (!doc) {
      doc = await this.create({});
    }
    return { ...DEFAULT_SETTINGS, ...doc };
  }

  static async create(data = {}) {
    const db = await this.getDB();
    const newDoc = {
      ...DEFAULT_SETTINGS,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const saved = await db.insertAsync(newDoc);
    return { ...DEFAULT_SETTINGS, ...saved };
  }

  static async findOneAndUpdate(query = {}, update = {}, options = {}) {
    const db = await this.getDB();
    const fieldsToSet = update.$set ? { ...update.$set } : { ...update };
    delete fieldsToSet._id;
    fieldsToSet.updatedAt = new Date();

    const result = await db.updateAsync(
      query,
      { $set: fieldsToSet },
      { upsert: true, returnUpdatedDocs: true }
    );

    const doc = result.affectedDocuments || (await db.findOneAsync(query)) || DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...doc };
  }
}

export default SettingsModel;
