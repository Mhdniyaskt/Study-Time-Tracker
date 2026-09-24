import { initDatabase, getDatastores } from './db.js';

class StudySessionQuery {
  constructor(queryPromise) {
    this.queryPromise = queryPromise;
    this._sort = null;
    this._skip = null;
    this._limit = null;
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  skip(n) {
    this._skip = n;
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  lean() {
    return this;
  }

  async exec() {
    const { db, query } = await this.queryPromise;
    let cursor = db.find(query);
    if (this._sort) cursor = cursor.sort(this._sort);
    if (this._skip != null) cursor = cursor.skip(this._skip);
    if (this._limit != null) cursor = cursor.limit(this._limit);
    return cursor.execAsync();
  }

  // Makes StudySessionQuery awaitable directly: await StudySession.find()
  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

class StudySession {
  constructor(data = {}) {
    this.subject = data.subject || '';
    this.duration = Number(data.duration) || 0;
    this.durationSeconds = data.durationSeconds != null ? Number(data.durationSeconds) : null;
    this.date = data.date ? new Date(data.date) : new Date();
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.sessionId = data.sessionId ? String(data.sessionId).trim() : null;
    if (data._id) {
      this._id = String(data._id);
    }
  }

  static async getDB() {
    await initDatabase();
    return getDatastores().studySessionsDB;
  }

  async save() {
    const db = await StudySession.getDB();

    const cleanDoc = {
      subject: this.subject,
      duration: this.duration,
      durationSeconds: this.durationSeconds,
      date: this.date instanceof Date ? this.date : new Date(this.date),
      createdAt: this.createdAt instanceof Date ? this.createdAt : new Date(this.createdAt),
    };

    // For sparse unique index to allow multiple null/free sessions in NeDB:
    // Only set sessionId if it is a non-empty string.
    if (this.sessionId) {
      cleanDoc.sessionId = this.sessionId;
    }

    if (this._id) {
      await db.updateAsync({ _id: this._id }, { $set: cleanDoc });
      return this;
    } else {
      const inserted = await db.insertAsync(cleanDoc);
      this._id = inserted._id;
      return this;
    }
  }

  static find(query = {}) {
    const promise = (async () => {
      const db = await StudySession.getDB();
      return { db, query };
    })();
    return new StudySessionQuery(promise);
  }

  static async findOne(query = {}) {
    const db = await StudySession.getDB();
    const doc = await db.findOneAsync(query);
    return doc || null;
  }

  static async findById(id) {
    if (!id) return null;
    const db = await StudySession.getDB();
    const doc = await db.findOneAsync({ _id: String(id) });
    return doc || null;
  }

  static async findByIdAndUpdate(id, update = {}, options = {}) {
    if (!id) return null;
    const db = await StudySession.getDB();
    const fieldsToSet = update.$set ? { ...update.$set } : { ...update };
    delete fieldsToSet._id;

    const res = await db.updateAsync(
      { _id: String(id) },
      { $set: fieldsToSet },
      { returnUpdatedDocs: true }
    );

    if (res.affectedDocuments) {
      return res.affectedDocuments;
    }
    return await db.findOneAsync({ _id: String(id) });
  }

  static async findByIdAndDelete(id) {
    if (!id) return null;
    const db = await StudySession.getDB();
    const existing = await db.findOneAsync({ _id: String(id) });
    if (!existing) return null;

    await db.removeAsync({ _id: String(id) }, {});
    return existing;
  }

  static async countDocuments(query = {}) {
    const db = await StudySession.getDB();
    return db.countAsync(query);
  }

  static async create(data = {}) {
    const session = new StudySession(data);
    await session.save();
    return session;
  }
}

export default StudySession;
