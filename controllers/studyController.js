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
    const settings = await Settings.findOne();
    const dailyGoal = settings ? settings.dailyGoal : 120;
    return res.json({ success: true, dailyGoal, dailyGoalHours: dailyGoal / 60 });
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
    const dailyGoalHours = parseFloat(sanitizeInput(req.body.dailyGoalHours)) || 3;
    if (dailyGoalHours < 0.5 || dailyGoalHours > 24) {
      return res.status(400).json({ success: false, error: "Daily goal must be between 0.5 and 24 hours." });
    }
    const dailyGoal = Math.round(dailyGoalHours * 60);
    const settings = await Settings.findOneAndUpdate(
      {},
      { dailyGoal },
      { upsert: true, returnDocument: 'after' }
    );
    return res.json({ success: true, dailyGoal: settings.dailyGoal, dailyGoalHours: settings.dailyGoal / 60 });
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

    const durationSeconds = elapsedSeconds;
    const duration = Math.floor(elapsedSeconds / 60);

    const session = new StudySession({
      subject,
      duration,
      durationSeconds,
    });
    await session.save();

    return res.json({
      success: true,
      session,
      duration,
      durationSeconds,
      elapsedSeconds,
    });
  } catch (err) {
    console.error("API timer save error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
