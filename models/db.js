import Datastore from '@seald-io/nedb';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let studySessionsDB = null;
let settingsDB = null;
let isInitialized = false;
let initPromise = null;
let currentDataDir = null;

/**
 * Resolves the persistent data directory for Study Time Tracker.
 * Priority:
 * 1. process.env.STUDY_TRACKER_DATA_PATH (injected by electron-main.js)
 * 2. Windows %APPDATA%\Study Time Tracker\data
 * 3. Fallback to local project ./data directory
 */
export function resolveDataDir() {
  if (process.env.STUDY_TRACKER_DATA_PATH) {
    return process.env.STUDY_TRACKER_DATA_PATH;
  }
  if (process.platform === 'win32' && process.env.APPDATA) {
    return join(process.env.APPDATA, 'Study Time Tracker', 'data');
  }
  return join(__dirname, '..', 'data');
}

/**
 * Probe local MongoDB and migrate legacy data if available.
 * Non-blocking, 1.5s timeout.
 */
async function migrateFromLegacyMongo(dataDir) {
  const migrationMarker = join(dataDir, '.migration_completed');
  if (existsSync(migrationMarker)) {
    return;
  }

  console.log('ℹ️  Checking for legacy MongoDB data on 127.0.0.1:27017...');

  try {
    // Dynamic import to avoid hard dependency failure if mongoose isn't running
    const mongoose = (await import('mongoose')).default;

    const mongoUri = process.env.LEGACY_MONGODB_URI || 'mongodb://127.0.0.1:27017/study_tracker';
    const conn = await Promise.race([
      mongoose.createConnection(mongoUri, { serverSelectionTimeoutMS: 1500 }).asPromise(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('MongoDB connection timeout')), 1600))
    ]);

    const mongoSessionsColl = conn.collection('studysessions');
    const mongoSettingsColl = conn.collection('settings');

    const legacySessions = await mongoSessionsColl.find({}).toArray();
    const legacySettings = await mongoSettingsColl.findOne({});

    await conn.close();

    const backupsDir = join(dirname(dataDir), 'backups');
    if (!existsSync(backupsDir)) mkdirSync(backupsDir, { recursive: true });

    const backupFile = join(backupsDir, `pre_migration_backup_${Date.now()}.json`);
    writeFileSync(backupFile, JSON.stringify({
      migratedAt: new Date().toISOString(),
      sessionsCount: legacySessions.length,
      settings: legacySettings,
      sessions: legacySessions,
    }, null, 2), 'utf8');
    console.log(`✓ Created pre-migration backup at: ${backupFile}`);

    // Migrate sessions
    if (legacySessions && legacySessions.length > 0) {
      for (const s of legacySessions) {
        const cleanDoc = {
          _id: s._id ? String(s._id) : undefined,
          subject: s.subject,
          duration: s.duration,
          durationSeconds: s.durationSeconds ?? null,
          date: s.date ? new Date(s.date) : new Date(),
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
        };
        if (s.sessionId) {
          cleanDoc.sessionId = String(s.sessionId);
        }
        try {
          await studySessionsDB.insertAsync(cleanDoc);
        } catch (insertErr) {
          console.warn(`Could not migrate session ${s._id}:`, insertErr.message);
        }
      }
      console.log(`✓ Successfully migrated ${legacySessions.length} sessions from MongoDB.`);
    }

    // Migrate settings
    if (legacySettings) {
      const { _id, __v, ...rest } = legacySettings;
      await settingsDB.updateAsync(
        {},
        { $set: { ...rest, updatedAt: new Date() } },
        { upsert: true }
      );
      console.log('✓ Successfully migrated settings from MongoDB.');
    }

    writeFileSync(migrationMarker, JSON.stringify({
      migratedAt: new Date().toISOString(),
      migratedSessions: legacySessions.length,
      source: mongoUri,
    }, null, 2), 'utf8');

  } catch (err) {
    console.log(`ℹ️  No legacy MongoDB to migrate or server offline (${err.message}). Starting fresh standalone datastore.`);
    try {
      writeFileSync(migrationMarker, JSON.stringify({
        migratedAt: new Date().toISOString(),
        freshStart: true,
      }, null, 2), 'utf8');
    } catch (_) {}
  }
}

/**
 * Perform rolling backup of the embedded database
 */
export async function createDatabaseBackup() {
  if (!currentDataDir) return;
  try {
    const backupsDir = join(dirname(currentDataDir), 'backups');
    if (!existsSync(backupsDir)) mkdirSync(backupsDir, { recursive: true });

    const allSessions = await studySessionsDB.find({}).sort({ date: -1 }).execAsync();
    const settings = await settingsDB.findOneAsync({});

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupsDir, `study_tracker_backup_${timestamp}.json`);

    writeFileSync(backupPath, JSON.stringify({
      backupDate: new Date().toISOString(),
      settings,
      sessions: allSessions,
    }, null, 2), 'utf8');

    // Keep only last 7 backups
    const files = readdirSync(backupsDir)
      .filter(f => f.startsWith('study_tracker_backup_') && f.endsWith('.json'))
      .sort();

    while (files.length > 7) {
      const oldest = files.shift();
      try {
        unlinkSync(join(backupsDir, oldest));
      } catch (_) {}
    }
  } catch (err) {
    console.warn('Database backup failed:', err.message);
  }
}

/**
 * Initializes the embedded local database
 */
export async function initDatabase(customDir = null) {
  if (isInitialized) {
    return { studySessionsDB, settingsDB };
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    currentDataDir = customDir || resolveDataDir();
    if (!existsSync(currentDataDir)) {
      mkdirSync(currentDataDir, { recursive: true });
    }

    console.log(`📁 Local Database Directory: ${currentDataDir}`);

    const sessionsFilePath = join(currentDataDir, 'study_sessions.db');
    const settingsFilePath = join(currentDataDir, 'settings.db');

    studySessionsDB = new Datastore({
      filename: sessionsFilePath,
      autoload: true,
    });

    settingsDB = new Datastore({
      filename: settingsFilePath,
      autoload: true,
    });

    // Create Indexes
    await studySessionsDB.ensureIndex({ fieldName: 'sessionId', unique: true, sparse: true });
    await studySessionsDB.ensureIndex({ fieldName: 'date' });
    await studySessionsDB.ensureIndex({ fieldName: 'subject' });

    // Enable auto-compaction every 30 minutes
    studySessionsDB.setAutocompactionInterval(30 * 60 * 1000);
    settingsDB.setAutocompactionInterval(30 * 60 * 1000);

    // Run legacy MongoDB migration check
    await migrateFromLegacyMongo(currentDataDir);

    // Initial backup on startup (non-blocking)
    createDatabaseBackup().catch(() => {});

    isInitialized = true;
    console.log('✓ Embedded Local Database initialized successfully.');

    return { studySessionsDB, settingsDB };
  })();

  return initPromise;
}

export function getDatastores() {
  if (!isInitialized || !studySessionsDB || !settingsDB) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return { studySessionsDB, settingsDB };
}

export async function closeDatabase() {
  if (studySessionsDB) {
    await studySessionsDB.persistence.compactDatafileAsync();
  }
  if (settingsDB) {
    await settingsDB.persistence.compactDatafileAsync();
  }
  isInitialized = false;
  initPromise = null;
}
