import StudySession from "../models/StudySession.js";
import Settings from "../models/Settings.js";
import {
  calculateDashboardData,
  calculateStatisticsData,
  calculateHistoryData,
  validateSession,
  sanitizeInput,
  isValidObjectId,
} from "../services/studyService.js";

/**
 * GET /api/dashboard
 */
export async function getDashboard(req, res) {
  try {
    const data = await calculateDashboardData();
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error("API /api/dashboard error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/statistics
 */
export async function getStatistics(req, res) {
  try {
    const { period = 'all-time', startDate, endDate } = req.query;
    const data = await calculateStatisticsData({ period, startDate, endDate });
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error("API /api/statistics error:", err.message);
    const dateRangeError = err.message === 'Start date cannot be after end date' ? err.message : null;
    return res.status(dateRangeError ? 400 : 500).json({ 
      success: false, 
      error: err.message,
      dateRangeError 
    });
  }
}

/**
 * GET /api/history
 */
export async function getHistory(req, res) {
  try {
    const { period = 'all-time', startDate, endDate, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));

    const data = await calculateHistoryData({
      period,
      startDate,
      endDate,
      page: pageNum,
      limit: limitNum,
    });
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error("API /api/history error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/settings
 */
export async function getSettings(req, res) {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    const dailyGoal = settings.dailyGoal ?? 120;
    return res.json({
      success: true,
      dailyGoal,
      dailyGoalHours: dailyGoal / 60,
      focusDuration: settings.focusDuration ?? 25,
      shortBreakDuration: settings.shortBreakDuration ?? 5,
      longBreakDuration: settings.longBreakDuration ?? 15,
      roundsUntilLongBreak: settings.roundsUntilLongBreak ?? 4,
      disableShortBreaks: !!settings.disableShortBreaks,
      disableLongBreaks: !!settings.disableLongBreaks,
      autoStartWork: !!settings.autoStartWork,
      autoStartBreaks: !!settings.autoStartBreaks,
      countdownDial: settings.countdownDial !== false,
      theme: settings.theme || 'dark',
      timerStyle: settings.timerStyle || 'circular',
      notificationsEnabled: settings.notificationsEnabled !== false,
    });
  } catch (err) {
    console.error("API /api/settings GET error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/settings
 */
export async function updateSettings(req, res) {
  try {
    const update = {};

    if (req.body.dailyGoalHours !== undefined) {
      const dailyGoalHours = parseFloat(sanitizeInput(req.body.dailyGoalHours));
      if (isNaN(dailyGoalHours) || dailyGoalHours < 0.5 || dailyGoalHours > 24) {
        return res.status(400).json({ success: false, error: "Daily goal must be between 0.5 and 24 hours." });
      }
      update.dailyGoal = Math.round(dailyGoalHours * 60);
    } else if (req.body.dailyGoal !== undefined) {
      const dailyGoal = parseInt(sanitizeInput(req.body.dailyGoal), 10);
      if (isNaN(dailyGoal) || dailyGoal < 30 || dailyGoal > 1440) {
        return res.status(400).json({ success: false, error: "Daily goal must be between 30 and 1440 minutes." });
      }
      update.dailyGoal = dailyGoal;
    }

    if (req.body.focusDuration !== undefined) {
      const focusDuration = parseInt(sanitizeInput(req.body.focusDuration), 10);
      if (isNaN(focusDuration) || focusDuration < 1 || focusDuration > 180) {
        return res.status(400).json({ success: false, error: "Focus duration must be between 1 and 180 minutes." });
      }
      update.focusDuration = focusDuration;
    }

    if (req.body.shortBreakDuration !== undefined) {
      const shortBreakDuration = parseInt(sanitizeInput(req.body.shortBreakDuration), 10);
      if (isNaN(shortBreakDuration) || shortBreakDuration < 1 || shortBreakDuration > 60) {
        return res.status(400).json({ success: false, error: "Short break duration must be between 1 and 60 minutes." });
      }
      update.shortBreakDuration = shortBreakDuration;
    }

    if (req.body.longBreakDuration !== undefined) {
      const longBreakDuration = parseInt(sanitizeInput(req.body.longBreakDuration), 10);
      if (isNaN(longBreakDuration) || longBreakDuration < 1 || longBreakDuration > 90) {
        return res.status(400).json({ success: false, error: "Long break duration must be between 1 and 90 minutes." });
      }
      update.longBreakDuration = longBreakDuration;
    }

    if (req.body.roundsUntilLongBreak !== undefined) {
      const rounds = parseInt(sanitizeInput(req.body.roundsUntilLongBreak), 10);
      if (isNaN(rounds) || rounds < 1 || rounds > 12) {
        return res.status(400).json({ success: false, error: "Rounds until long break must be between 1 and 12." });
      }
      update.roundsUntilLongBreak = rounds;
    }

    if (req.body.disableShortBreaks !== undefined) {
      update.disableShortBreaks = Boolean(req.body.disableShortBreaks);
    }
    if (req.body.disableLongBreaks !== undefined) {
      update.disableLongBreaks = Boolean(req.body.disableLongBreaks);
    }
    if (req.body.autoStartWork !== undefined) {
      update.autoStartWork = Boolean(req.body.autoStartWork);
    }
    if (req.body.autoStartBreaks !== undefined) {
      update.autoStartBreaks = Boolean(req.body.autoStartBreaks);
    }
    if (req.body.countdownDial !== undefined) {
      update.countdownDial = Boolean(req.body.countdownDial);
    }
    if (req.body.notificationsEnabled !== undefined) {
      update.notificationsEnabled = Boolean(req.body.notificationsEnabled);
    }
    if (req.body.theme !== undefined) {
      const theme = sanitizeInput(req.body.theme).toLowerCase();
      if (['dark', 'light', 'system'].includes(theme)) {
        update.theme = theme;
      }
    }
    if (req.body.timerStyle !== undefined) {
      const style = sanitizeInput(req.body.timerStyle).toLowerCase();
      if (['circular', 'minimal'].includes(style)) {
        update.timerStyle = style;
      }
    }

    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: update },
      { upsert: true, returnDocument: 'after' }
    );

    return res.json({
      success: true,
      dailyGoal: settings.dailyGoal,
      dailyGoalHours: settings.dailyGoal / 60,
      focusDuration: settings.focusDuration,
      shortBreakDuration: settings.shortBreakDuration,
      longBreakDuration: settings.longBreakDuration,
      roundsUntilLongBreak: settings.roundsUntilLongBreak,
      disableShortBreaks: settings.disableShortBreaks,
      disableLongBreaks: settings.disableLongBreaks,
      autoStartWork: settings.autoStartWork,
      autoStartBreaks: settings.autoStartBreaks,
      countdownDial: settings.countdownDial,
      theme: settings.theme,
      timerStyle: settings.timerStyle,
      notificationsEnabled: settings.notificationsEnabled,
    });
  } catch (err) {
    console.error("API /api/settings POST error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/study
 */
export async function createSession(req, res) {
  try {
    let { subject, hours, minutes, duration } = req.body;
    if (hours === undefined && minutes === undefined && duration !== undefined) {
      const dur = parseInt(duration, 10) || 0;
      hours = Math.floor(dur / 60);
      minutes = dur % 60;
    }

    const errors = validateSession(subject, hours, minutes);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const sanitizedSubject = sanitizeInput(subject).trim();
    const sanitizedHours = parseInt(sanitizeInput(hours), 10) || 0;
    const sanitizedMinutes = parseInt(sanitizeInput(minutes), 10) || 0;
    const totalDuration = sanitizedHours * 60 + sanitizedMinutes;

    const sessionData = {
      subject: sanitizedSubject,
      duration: totalDuration,
    };
    if (req.body.durationSeconds !== undefined && req.body.durationSeconds !== null) {
      sessionData.durationSeconds = parseInt(req.body.durationSeconds, 10);
    }
    if (req.body.date) {
      sessionData.date = new Date(req.body.date);
    }

    const session = new StudySession(sessionData);
    await session.save();
    return res.status(201).json({ success: true, session });
  } catch (err) {
    console.error("API /api/study error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/study/:id
 */
export async function getSessionById(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, error: "Session Not Found" });
    }
    const session = await StudySession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, error: "Session Not Found" });
    }
    const hours = Math.floor(session.duration / 60);
    const minutes = session.duration % 60;
    return res.json({ success: true, session, hours, minutes });
  } catch (err) {
    console.error("API /api/study/:id GET error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PUT /api/study/:id and POST /api/study/:id/edit
 */
export async function updateSession(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, error: "Session Not Found" });
    }
    let { subject, hours, minutes, duration } = req.body;
    if (hours === undefined && minutes === undefined && duration !== undefined) {
      const dur = parseInt(duration, 10) || 0;
      hours = Math.floor(dur / 60);
      minutes = dur % 60;
    }

    const errors = validateSession(subject, hours, minutes);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const sanitizedSubject = sanitizeInput(subject).trim();
    const sanitizedHours = parseInt(sanitizeInput(hours), 10) || 0;
    const sanitizedMinutes = parseInt(sanitizeInput(minutes), 10) || 0;
    const totalDuration = sanitizedHours * 60 + sanitizedMinutes;

    const updated = await StudySession.findByIdAndUpdate(
      req.params.id,
      { subject: sanitizedSubject, duration: totalDuration },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: "Session Not Found" });
    }
    return res.json({ success: true, session: updated });
  } catch (err) {
    console.error("API /api/study/:id PUT error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * DELETE /api/study/:id
 */
export async function deleteSession(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, error: "Session Not Found" });
    }
    const deleted = await StudySession.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Session Not Found" });
    }
    return res.json({ success: true, message: "Session deleted successfully" });
  } catch (err) {
    console.error("API /api/study/:id DELETE error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// In-memory concurrency guard for simultaneous in-flight saves with the same sessionId
const pendingSessionSaves = new Map();

/**
 * POST /timer/save and POST /api/timer/save
 */
export async function saveTimerSession(req, res) {
  try {
    const rawSubject = sanitizeInput(req.body.subject);
    const rawSeconds = req.body.elapsedSeconds ?? req.body.durationSeconds;

    const subject = rawSubject.trim();
    if (!subject || subject.length < 2 || subject.length > 50) {
      return res.status(400).json({ error: "Subject must be between 2 and 50 characters." });
    }

    const elapsedSeconds = parseInt(sanitizeInput(String(rawSeconds ?? 0)), 10);
    if (isNaN(elapsedSeconds) || elapsedSeconds < 1) {
      return res.status(400).json({ error: "Timer has not recorded any time yet." });
    }

    const rawSessionId = req.body.sessionId || req.body.completionId;
    const sessionId = rawSessionId ? String(sanitizeInput(String(rawSessionId))).trim() : null;

    if (sessionId) {
      // 1. Check if already persisted
      const existing = await StudySession.findOne({ sessionId });
      if (existing) {
        console.log(`[FOCUS] Backend: Duplicate session save rejected for sessionId: ${sessionId}`);
        return res.json({
          success: true,
          duplicate: true,
          session: existing,
          duration: existing.duration,
          durationSeconds: existing.durationSeconds,
          elapsedSeconds: existing.durationSeconds,
        });
      }

      // 2. Check if identical sessionId save is already in-flight (concurrent requests)
      if (pendingSessionSaves.has(sessionId)) {
        console.log(`[FOCUS] Backend: In-flight save detected, awaiting for sessionId: ${sessionId}`);
        try {
          const inFlightSession = await pendingSessionSaves.get(sessionId);
          return res.json({
            success: true,
            duplicate: true,
            session: inFlightSession,
            duration: inFlightSession.duration,
            durationSeconds: inFlightSession.durationSeconds,
            elapsedSeconds: inFlightSession.durationSeconds,
          });
        } catch (_) {}
      }
    }

    const durationSeconds = elapsedSeconds;
    const duration = Math.floor(elapsedSeconds / 60);

    const session = new StudySession({
      subject,
      duration,
      durationSeconds,
      sessionId: sessionId || null,
    });

    const savePromise = session.save();
    if (sessionId) {
      pendingSessionSaves.set(sessionId, savePromise);
    }

    try {
      await savePromise;
    } finally {
      if (sessionId) {
        pendingSessionSaves.delete(sessionId);
      }
    }

    console.log(`[FOCUS] Backend: Save accepted for sessionId: ${sessionId || 'none'} (${duration}m / ${durationSeconds}s)`);

    return res.json({
      success: true,
      session,
      duration,
      durationSeconds,
      elapsedSeconds,
    });
  } catch (err) {
    // Check for MongoDB duplicate key error on sessionId (E11000)
    if (err.code === 11000 && req.body && (req.body.sessionId || req.body.completionId)) {
      const dupId = String(req.body.sessionId || req.body.completionId);
      console.log(`[FOCUS] Backend: Duplicate key race condition caught for sessionId: ${dupId}`);
      try {
        const existing = await StudySession.findOne({ sessionId: dupId });
        if (existing) {
          return res.json({
            success: true,
            duplicate: true,
            session: existing,
            duration: existing.duration,
            durationSeconds: existing.durationSeconds,
            elapsedSeconds: existing.durationSeconds,
          });
        }
      } catch (_) {}
    }
    console.error("API timer save error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
