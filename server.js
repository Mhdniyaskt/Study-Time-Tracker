import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import methodOverride from "method-override";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import ejs from "ejs"; // explicit import so pkg statically traces and snapshots the ejs module
import StudySession from "./models/StudySession.js";
import Settings from "./models/Settings.js";

// Get the directory where the executable or script is located.
// esbuild (CJS) defines __dirname automatically; in ESM dev mode we derive it.
const __appDir = (typeof __dirname !== 'undefined')
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));

// Determine if we're running from a packaged executable
const isPackaged = process.pkg !== undefined;

// Determine if we're running inside Electron
const isElectron = process.versions && process.versions.electron !== undefined;

// Load .env — priority order:
//   1. ELECTRON_ENV_PATH injected by electron-main.js (packaged Electron)
//   2. process.cwd()/.env when running as a pkg-packaged executable
//   3. Project root when running normally with `node server.js`
const envPath = process.env.ELECTRON_ENV_PATH
  ? process.env.ELECTRON_ENV_PATH
  : isPackaged
    ? join(process.cwd(), '.env')
    : join(__appDir, '.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Opens the default browser to the specified URL
 * Works on Windows, macOS, and Linux
 * Uses shell: true for Windows to ensure 'start' command works in packaged executables
 * @param {string} url - The URL to open
 */
function openBrowser(url) {
  let command;
  let options = {};
  
  if (process.platform === 'win32') {
    // Windows: Use cmd.exe with /c to execute the start command
    // This ensures it works both in development and in packaged .exe
    command = `cmd.exe /c start "" "${url}"`;
    options = { shell: true, windowsHide: true };
  } else if (process.platform === 'darwin') {
    command = `open "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }
  
  exec(command, options, (error) => {
    if (error) {
      console.log(`Browser not auto-opened. Please visit: ${url}`);
    } else {
      console.log(`✓ Browser opened to ${url}`);
    }
  });
}

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// View engine
app.set("view engine", "ejs");
// In packaged exe, views must be read from the real filesystem at dist/views
// In dev, views are at <project-root>/views
const viewsPath = isPackaged ? join(process.cwd(), "views") : join(__appDir, "views");
app.set("views", viewsPath);

// ---------------------------------------------------------------------------
// Shared validation helper
// ---------------------------------------------------------------------------

/**
 * Sanitizes user input to prevent NoSQL injection
 * Removes any objects, arrays, or dangerous characters
 * @param {any} input - User input to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeInput(input) {
  // Only accept strings and numbers
  if (typeof input !== 'string' && typeof input !== 'number') {
    return '';
  }
  // Convert to string and trim
  return String(input).trim();
}

/**
 * Validates subject + hours/minutes for a study session.
 * Returns an array of human-readable error strings (empty = valid).
 */
function validateSession(subject, hours, minutes) {
  const errors = [];

  // Sanitize inputs first to prevent NoSQL injection
  subject = sanitizeInput(subject);
  hours = sanitizeInput(hours);
  minutes = sanitizeInput(minutes);

  // --- subject ---
  const subjectTrimmed = subject.trim();
  if (!subjectTrimmed) {
    errors.push("Subject is required.");
  } else if (subjectTrimmed.length < 2) {
    errors.push("Subject must be at least 2 characters.");
  } else if (subjectTrimmed.length > 50) {
    errors.push("Subject must be 50 characters or fewer.");
  }

  // --- hours ---
  const h = parseInt(hours, 10);
  if (hours !== '' && hours != null && (isNaN(h) || h < 0)) {
    errors.push("Hours must be a non-negative whole number.");
  }

  // --- minutes ---
  const m = parseInt(minutes, 10);
  if (minutes !== '' && minutes != null && (isNaN(m) || m < 0 || m > 59)) {
    errors.push("Minutes must be between 0 and 59.");
  }

  // --- duration must be > 0 ---
  const safeH = isNaN(h) ? 0 : h;
  const safeM = isNaN(m) ? 0 : m;
  if (errors.length === 0 && safeH === 0 && safeM === 0) {
    errors.push("Please enter a duration greater than 0 (hours and minutes cannot both be 0).");
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Helper: Validate MongoDB ObjectId
// ---------------------------------------------------------------------------

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ---------------------------------------------------------------------------
// Helper: Render error page
// ---------------------------------------------------------------------------

/**
 * Renders the error page with appropriate status code and message
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @param {string} devError - Developer error details (optional)
 */
function renderError(res, statusCode, title, message, devError = null) {
  res.status(statusCode).render("error", {
    statusCode,
    title,
    message,
    showBack: statusCode === 404,
    devError: isDevelopment ? devError : null,
    isDevelopment // Pass flag instead of process.env
  });
}

// Routes
app.get("/", async (req, res) => {
  try {
    const sessions = await StudySession.find().sort({ date: -1 });

    // Helper function to normalize dates to YYYY-MM-DD format (local date only)
    const toLocalDateString = (date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const now = new Date();
    const todayStr = toLocalDateString(now);

    // Today's total: filter sessions with today's date
    const todayTotal = sessions
      .filter((s) => toLocalDateString(s.date) === todayStr)
      .reduce((sum, s) => sum + s.duration, 0);

    const totalStudyTime = sessions.reduce((sum, s) => sum + s.duration, 0);

    // Daily goal — load from Settings, fall back to 180 mins (3h)
    const settings = await Settings.findOne();
    const dailyGoal = settings ? settings.dailyGoal : 180;
    const dailyProgress = Math.min(100, Math.round((todayTotal / dailyGoal) * 100));

    // Current week: Monday 00:00 to Sunday 23:59
    const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon … 6 = Sat
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekStartStr = toLocalDateString(weekStart);
    const weeklyTotal = sessions
      .filter((s) => toLocalDateString(s.date) >= weekStartStr)
      .reduce((sum, s) => sum + s.duration, 0);

    const weeklyGoal = 21 * 60; // 21 hours in minutes

    // Current month: first day 00:00 to last day 23:59
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = toLocalDateString(monthStart);

    const monthSessions = sessions.filter((s) => toLocalDateString(s.date) >= monthStartStr);
    const monthlyTotal = monthSessions.reduce((sum, s) => sum + s.duration, 0);
    const monthlySessions = monthSessions.length;

    // Current streak: consecutive days ending today with at least one session
    // Build a Set of date strings "YYYY-MM-DD" that have sessions
    const studiedDays = new Set(
      sessions.map((s) => toLocalDateString(s.date))
    );

    const hasStudiedOn = (dateStr) => studiedDays.has(dateStr);

    let currentStreak = 0;
    const cursor = new Date(now);
    cursor.setHours(0, 0, 0, 0);

    // Streak only starts if today has a session
    let cursorStr = toLocalDateString(cursor);
    if (hasStudiedOn(cursorStr)) {
      while (hasStudiedOn(cursorStr)) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
        cursorStr = toLocalDateString(cursor);
      }
    }

    // Group sessions by calendar date (YYYY-MM-DD key, newest date first)
    const groupsMap = {};
    for (const session of sessions) {
      const d = new Date(session.date);
      const key = d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groupsMap[key]) {
        groupsMap[key] = { label: key, sessions: [], total: 0 };
      }
      groupsMap[key].sessions.push(session);
      groupsMap[key].total += session.duration;
    }
    const groupedSessions = Object.values(groupsMap);

    // Subject-wise stats: group by subject, sum duration, sort descending
    const subjectMap = {};
    for (const session of sessions) {
      const key = session.subject.trim();
      if (!subjectMap[key]) subjectMap[key] = 0;
      subjectMap[key] += session.duration;
    }
    const subjectStats = Object.entries(subjectMap)
      .map(([subject, totalMinutes]) => ({ subject, totalMinutes }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    // Weekly chart data: Mon-Sun for current week
    const weeklyChartData = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = toLocalDateString(date);
      
      const dayTotal = sessions
        .filter((s) => toLocalDateString(s.date) === dateStr)
        .reduce((sum, s) => sum + s.duration, 0);
      
      // Convert minutes to hours (with decimals)
      weeklyChartData.push(Number((dayTotal / 60).toFixed(2)));
    }

    // Monthly chart data: day 1 to last day of current month
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysInMonth = monthEnd.getDate();
    const monthlyChartData = [];
    const monthlyChartLabels = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(now.getFullYear(), now.getMonth(), day);
      const dateStr = toLocalDateString(date);
      
      const dayTotal = sessions
        .filter((s) => toLocalDateString(s.date) === dateStr)
        .reduce((sum, s) => sum + s.duration, 0);
      
      monthlyChartLabels.push(day);
      // Convert minutes to hours (with decimals)
      monthlyChartData.push(Number((dayTotal / 60).toFixed(2)));
    }

    res.render("index", { 
      sessions, 
      groupedSessions, 
      subjectStats, 
      todayTotal, 
      totalStudyTime, 
      weeklyTotal, 
      weeklyGoal, 
      monthlyTotal, 
      monthlySessions, 
      currentStreak, 
      dailyGoal, 
      dailyProgress, 
      dailyGoalHours: dailyGoal / 60,
      weeklyChartData,
      weeklyChartLabels: dayNames,
      monthlyChartData,
      monthlyChartLabels,
      formErrors: [],
      formValues: null,
    });
  } catch (err) {
    console.error("Failed to fetch sessions:", err.message);
    res.render("index", { 
      sessions: [], 
      groupedSessions: [], 
      subjectStats: [], 
      todayTotal: 0, 
      totalStudyTime: 0, 
      weeklyTotal: 0, 
      weeklyGoal: 21 * 60, 
      monthlyTotal: 0, 
      monthlySessions: 0, 
      currentStreak: 0, 
      dailyGoal: 180, 
      dailyProgress: 0, 
      dailyGoalHours: 3,
      weeklyChartData: [0, 0, 0, 0, 0, 0, 0],
      weeklyChartLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      monthlyChartData: [],
      monthlyChartLabels: [],
      formErrors: [],
      formValues: null,
    });
  }
});

app.post("/study", async (req, res, next) => {
  try {
    const { subject, hours, minutes } = req.body;

    // Validate before touching the DB
    const errors = validateSession(subject, hours, minutes);
    if (errors.length > 0) {
      // Re-render the dashboard with the errors and the user's input preserved
      try {
        const sessions = await StudySession.find().sort({ date: -1 });

        const toLocalDateString = (date) => {
          const d = new Date(date);
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        };

        const now      = new Date();
        const todayStr = toLocalDateString(now);

        const todayTotal     = sessions.filter(s => toLocalDateString(s.date) === todayStr).reduce((sum,s)=>sum+s.duration,0);
        const totalStudyTime = sessions.reduce((sum,s)=>sum+s.duration,0);

        const settings    = await Settings.findOne();
        const dailyGoal   = settings ? settings.dailyGoal : 180;
        const dailyProgress = Math.min(100, Math.round((todayTotal / dailyGoal) * 100));

        const dayOfWeek     = now.getDay();
        const diffToMonday  = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart     = new Date(now);
        weekStart.setDate(now.getDate() + diffToMonday);
        weekStart.setHours(0,0,0,0);
        const weekStartStr  = toLocalDateString(weekStart);
        const weeklyTotal   = sessions.filter(s=>toLocalDateString(s.date)>=weekStartStr).reduce((sum,s)=>sum+s.duration,0);
        const weeklyGoal    = 21 * 60;

        const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthStartStr = toLocalDateString(monthStart);
        const monthSessions = sessions.filter(s=>toLocalDateString(s.date)>=monthStartStr);
        const monthlyTotal  = monthSessions.reduce((sum,s)=>sum+s.duration,0);
        const monthlySessions = monthSessions.length;

        const studiedDays = new Set(sessions.map(s=>toLocalDateString(s.date)));
        let currentStreak = 0;
        const cursor = new Date(now); cursor.setHours(0,0,0,0);
        let cursorStr = toLocalDateString(cursor);
        if (studiedDays.has(cursorStr)) {
          while (studiedDays.has(cursorStr)) {
            currentStreak++;
            cursor.setDate(cursor.getDate()-1);
            cursorStr = toLocalDateString(cursor);
          }
        }

        const groupsMap = {};
        for (const s of sessions) {
          const key = new Date(s.date).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
          if (!groupsMap[key]) groupsMap[key] = { label:key, sessions:[], total:0 };
          groupsMap[key].sessions.push(s);
          groupsMap[key].total += s.duration;
        }

        const subjectMap = {};
        for (const s of sessions) { const k=s.subject.trim(); subjectMap[k]=(subjectMap[k]||0)+s.duration; }
        const subjectStats = Object.entries(subjectMap).map(([subject,totalMinutes])=>({subject,totalMinutes})).sort((a,b)=>b.totalMinutes-a.totalMinutes);

        const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
        const weeklyChartData = dayNames.map((_,i)=>{
          const d = new Date(weekStart); d.setDate(weekStart.getDate()+i);
          return Number((sessions.filter(s=>toLocalDateString(s.date)===toLocalDateString(d)).reduce((sum,s)=>sum+s.duration,0)/60).toFixed(2));
        });

        const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0);
        const monthlyChartLabels = [], monthlyChartData = [];
        for (let day=1; day<=monthEnd.getDate(); day++) {
          const d = new Date(now.getFullYear(), now.getMonth(), day);
          monthlyChartLabels.push(day);
          monthlyChartData.push(Number((sessions.filter(s=>toLocalDateString(s.date)===toLocalDateString(d)).reduce((sum,s)=>sum+s.duration,0)/60).toFixed(2)));
        }

        return res.render("index", {
          sessions,
          groupedSessions: Object.values(groupsMap),
          subjectStats,
          todayTotal, totalStudyTime, weeklyTotal, weeklyGoal,
          monthlyTotal, monthlySessions, currentStreak,
          dailyGoal, dailyProgress, dailyGoalHours: dailyGoal/60,
          weeklyChartData, weeklyChartLabels: dayNames,
          monthlyChartData, monthlyChartLabels,
          // validation feedback
          formErrors: errors,
          formValues: { subject: (subject||'').trim(), hours: hours||'', minutes: minutes||'' },
        });
      } catch (fetchErr) {
        console.error("Failed to re-render after validation:", fetchErr.message);
        if (isDevelopment) console.error(fetchErr.stack);
        return next(fetchErr); // Pass to error handler
      }
    }

    // Validation passed — save to DB
    // Sanitize inputs before saving
    const sanitizedSubject = sanitizeInput(subject).trim();
    const sanitizedHours = parseInt(sanitizeInput(hours), 10);
    const sanitizedMinutes = parseInt(sanitizeInput(minutes), 10);
    const duration = sanitizedHours * 60 + sanitizedMinutes;
    
    const session = new StudySession({ subject: sanitizedSubject, duration });
    await session.save();
    res.redirect("/");
  } catch (err) {
    console.error("Failed to save study session:", err.message);
    if (isDevelopment) console.error(err.stack);
    next(err); // Pass to global error handler
  }
});

app.delete("/study/:id", async (req, res, next) => {
  try {
    // Validate ObjectId
    if (!isValidObjectId(req.params.id)) {
      console.warn("Delete rejected — invalid ID:", req.params.id);
      return renderError(res, 404, "Session Not Found", "The study session you're trying to delete does not exist.");
    }

    const deleted = await StudySession.findByIdAndDelete(req.params.id);
    
    if (!deleted) {
      console.warn("Delete failed — session not found:", req.params.id);
      return renderError(res, 404, "Session Not Found", "The study session you're trying to delete does not exist.");
    }

    res.redirect("/");
  } catch (err) {
    console.error("Failed to delete study session:", err.message);
    if (isDevelopment) console.error(err.stack);
    next(err);
  }
});

app.get("/study/:id/edit", async (req, res, next) => {
  try {
    // Validate ObjectId
    if (!isValidObjectId(req.params.id)) {
      console.warn("Edit GET rejected — invalid ID:", req.params.id);
      return renderError(res, 404, "Session Not Found", "The study session you're trying to edit does not exist.");
    }

    const session = await StudySession.findById(req.params.id);
    
    if (!session) {
      console.warn("Edit GET failed — session not found:", req.params.id);
      return renderError(res, 404, "Session Not Found", "The study session you're trying to edit does not exist.");
    }

    const hours   = Math.floor(session.duration / 60);
    const minutes = session.duration % 60;

    res.render("edit", { session, hours, minutes, formErrors: [], formValues: null });
  } catch (err) {
    console.error("Failed to load edit page:", err.message);
    if (isDevelopment) console.error(err.stack);
    next(err);
  }
});

app.post("/study/:id/edit", async (req, res, next) => {
  try {
    // Validate ObjectId
    if (!isValidObjectId(req.params.id)) {
      console.warn("Edit POST rejected — invalid ID:", req.params.id);
      return renderError(res, 404, "Session Not Found", "The study session you're trying to update does not exist.");
    }

    const { subject, hours, minutes } = req.body;

    // Validate before touching the DB
    const errors = validateSession(subject, hours, minutes);
    if (errors.length > 0) {
      try {
        const session = await StudySession.findById(req.params.id);
        if (!session) {
          return renderError(res, 404, "Session Not Found", "The study session you're trying to update does not exist.");
        }

        return res.render("edit", {
          session,
          // Keep whatever the user typed so they don't lose their work
          hours:   hours   !== undefined ? hours   : Math.floor(session.duration / 60),
          minutes: minutes !== undefined ? minutes : session.duration % 60,
          formErrors: errors,
          formValues: { subject: (subject||'').trim(), hours: hours||'', minutes: minutes||'' },
        });
      } catch (fetchErr) {
        console.error("Failed to re-render edit after validation:", fetchErr.message);
        if (isDevelopment) console.error(fetchErr.stack);
        return next(fetchErr);
      }
    }

    // Validation passed — update DB
    // Sanitize inputs before saving
    const sanitizedSubject = sanitizeInput(subject).trim();
    const sanitizedHours = parseInt(sanitizeInput(hours), 10);
    const sanitizedMinutes = parseInt(sanitizeInput(minutes), 10);
    const duration = sanitizedHours * 60 + sanitizedMinutes;
    
    const updated = await StudySession.findByIdAndUpdate(
      req.params.id, 
      { subject: sanitizedSubject, duration },
      { new: true }
    );

    if (!updated) {
      return renderError(res, 404, "Session Not Found", "The study session you're trying to update does not exist.");
    }

    res.redirect("/");
  } catch (err) {
    console.error("Failed to update study session:", err.message);
    if (isDevelopment) console.error(err.stack);
    next(err);
  }
});

app.post("/settings", async (req, res, next) => {
  try {
    // Sanitize input to prevent NoSQL injection
    const dailyGoalHours = parseFloat(sanitizeInput(req.body.dailyGoalHours)) || 3;
    
    // Validate range
    if (dailyGoalHours < 0 || dailyGoalHours > 24) {
      console.warn("Invalid daily goal hours:", dailyGoalHours);
      return res.redirect("/");
    }
    
    const dailyGoal = Math.round(dailyGoalHours * 60);

    // Update existing settings doc or create one if none exists
    await Settings.findOneAndUpdate(
      {},
      { dailyGoal },
      { upsert: true, returnDocument: 'after' }
    );

    res.redirect("/");
  } catch (err) {
    console.error("Failed to save settings:", err.message);
    if (isDevelopment) console.error(err.stack);
    next(err);
  }
});

app.get("/statistics", async (req, res) => {
  try {
    const { period = 'all-time', startDate, endDate } = req.query;

    // Helper function to normalize dates
    const toLocalDateString = (date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const now = new Date();
    const todayStr = toLocalDateString(now);
    
    let filterStart = null;
    let filterEnd = null;
    let periodLabel = 'All Time';

    // Calculate date range based on selected period
    if (period === 'today') {
      filterStart = filterEnd = todayStr;
      periodLabel = 'Today';
    } else if (period === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      filterStart = filterEnd = toLocalDateString(yesterday);
      periodLabel = 'Yesterday';
    } else if (period === 'this-week') {
      const dayOfWeek = now.getDay();
      const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + diffToMonday);
      filterStart = toLocalDateString(weekStart);
      filterEnd = todayStr;
      periodLabel = 'This Week';
    } else if (period === 'last-week') {
      const dayOfWeek = now.getDay();
      const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() + diffToMonday);
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(thisWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
      filterStart = toLocalDateString(lastWeekStart);
      filterEnd = toLocalDateString(lastWeekEnd);
      periodLabel = 'Last Week';
    } else if (period === 'this-month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filterStart = toLocalDateString(monthStart);
      filterEnd = todayStr;
      periodLabel = 'This Month';
    } else if (period === 'last-month') {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      filterStart = toLocalDateString(lastMonthStart);
      filterEnd = toLocalDateString(lastMonthEnd);
      periodLabel = 'Last Month';
    } else if (period === 'custom' && startDate && endDate) {
      // Validate dates for custom range
      if (new Date(startDate) > new Date(endDate)) {
        throw new Error('Start date cannot be after end date');
      }
      filterStart = startDate;
      filterEnd = endDate;
      periodLabel = `${startDate} to ${endDate}`;
    } else {
      periodLabel = 'All Time';
    }

    // Fetch all sessions, sorted by date (newest first)
    const allSessions = await StudySession.find().sort({ date: -1 });

    // Filter sessions based on selected period
    let sessions = allSessions;
    if (filterStart && filterEnd) {
      sessions = allSessions.filter((s) => {
        const sessionDate = toLocalDateString(s.date);
        return sessionDate >= filterStart && sessionDate <= filterEnd;
      });
    }

    // Calculate statistics
    const totalStudyTime = sessions.reduce((sum, s) => sum + s.duration, 0);
    const numberOfSessions = sessions.length;

    // Calculate average study time per day
    let averageStudyTimePerDay = 0;
    if (sessions.length > 0) {
      // Get unique study days in the period
      const studiedDaysSet = new Set();
      sessions.forEach(s => {
        studiedDaysSet.add(toLocalDateString(s.date));
      });
      
      // Calculate days in the selected period
      let totalDaysInPeriod = 1;
      if (filterStart && filterEnd && filterStart !== filterEnd) {
        const startDate = new Date(filterStart);
        const endDate = new Date(filterEnd);
        totalDaysInPeriod = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      }
      
      averageStudyTimePerDay = totalStudyTime / totalDaysInPeriod;
    }

    // Study time by subject
    const subjectMap = {};
    for (const session of sessions) {
      const key = session.subject.trim();
      if (!subjectMap[key]) subjectMap[key] = 0;
      subjectMap[key] += session.duration;
    }
    const subjectStats = Object.entries(subjectMap)
      .map(([subject, totalMinutes]) => ({ subject, totalMinutes }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    // Daily study totals (grouped by date)
    const dailyTotalsMap = {};
    for (const session of sessions) {
      const dateStr = toLocalDateString(session.date);
      if (!dailyTotalsMap[dateStr]) dailyTotalsMap[dateStr] = 0;
      dailyTotalsMap[dateStr] += session.duration;
    }
    const dailyTotals = Object.entries(dailyTotalsMap)
      .map(([date, minutes]) => ({ date, minutes }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Group sessions by date for display
    const groupsMap = {};
    for (const session of sessions) {
      const d = new Date(session.date);
      const key = d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groupsMap[key]) {
        groupsMap[key] = { label: key, sessions: [], total: 0 };
      }
      groupsMap[key].sessions.push(session);
      groupsMap[key].total += session.duration;
    }
    const groupedSessions = Object.values(groupsMap);

    // Prepare chart data for Daily Study Time (Bar Chart)
    const chartLabels = [];
    const chartData = [];
    
    if (filterStart && filterEnd) {
      // Create all dates in the range
      const startDate = new Date(filterStart);
      const endDate = new Date(filterEnd);
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = toLocalDateString(d);
        const displayDate = d.toLocaleDateString("en-US", { 
          month: "short", 
          day: "numeric" 
        });
        
        chartLabels.push(displayDate);
        
        // Find sessions for this date
        const dayTotal = sessions
          .filter(s => toLocalDateString(s.date) === dateStr)
          .reduce((sum, s) => sum + s.duration, 0);
        
        // Convert to hours (with decimals)
        chartData.push(Number((dayTotal / 60).toFixed(2)));
      }
    } else {
      // For "All Time", use the dailyTotals we already calculated
      dailyTotals.slice(0, 30).reverse().forEach(daily => {
        const date = new Date(daily.date + 'T12:00:00');
        const displayDate = date.toLocaleDateString("en-US", { 
          month: "short", 
          day: "numeric" 
        });
        chartLabels.push(displayDate);
        chartData.push(Number((daily.minutes / 60).toFixed(2)));
      });
    }

    // Prepare chart data for Study by Subject (Doughnut Chart)
    const subjectChartLabels = subjectStats.map(stat => stat.subject);
    const subjectChartData = subjectStats.map(stat => Number((stat.totalMinutes / 60).toFixed(2)));
    const subjectChartColors = [
      '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
    ];

    // Prepare calendar events data
    const calendarEvents = [];
    for (const session of allSessions) {
      const sessionDate = toLocalDateString(session.date);
      
      // Find or create event for this date
      let existingEvent = calendarEvents.find(e => e.date === sessionDate);
      if (!existingEvent) {
        existingEvent = {
          date: sessionDate,
          title: '',
          duration: 0,
          sessions: []
        };
        calendarEvents.push(existingEvent);
      }
      
      existingEvent.duration += session.duration;
      existingEvent.sessions.push({
        subject: session.subject,
        duration: session.duration
      });
    }
    
    // Format calendar events
    calendarEvents.forEach(event => {
      const hours = Math.floor(event.duration / 60);
      const minutes = event.duration % 60;
      event.title = `${hours}h ${minutes}m`;
      event.displayTitle = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    });

    res.render("statistics", {
      period,
      periodLabel,
      startDate: startDate || '',
      endDate: endDate || '',
      totalStudyTime,
      numberOfSessions,
      averageStudyTimePerDay,
      subjectStats,
      dailyTotals,
      groupedSessions,
      sessions,
      dateRangeError: null,
      // Chart data
      chartLabels,
      chartData,
      subjectChartLabels,
      subjectChartData,
      subjectChartColors: subjectChartColors.slice(0, subjectStats.length),
      // Calendar data
      calendarEvents: JSON.stringify(calendarEvents)
    });
  } catch (err) {
    console.error("Failed to fetch statistics:", err.message);
    
    // Handle date range validation errors specifically
    const dateRangeError = err.message === 'Start date cannot be after end date' ? err.message : null;
    
    res.render("statistics", {
      period: req.query.period || 'all-time',
      periodLabel: 'All Time',
      startDate: req.query.startDate || '',
      endDate: req.query.endDate || '',
      totalStudyTime: 0,
      numberOfSessions: 0,
      averageStudyTimePerDay: 0,
      subjectStats: [],
      dailyTotals: [],
      groupedSessions: [],
      sessions: [],
      dateRangeError,
      // Chart data
      chartLabels: [],
      chartData: [],
      subjectChartLabels: [],
      subjectChartData: [],
      subjectChartColors: [],
      // Calendar data
      calendarEvents: JSON.stringify([])
    });
  }
});

app.get("/history", async (req, res) => {
  try {
    const { period = 'all-time', startDate, endDate } = req.query;

    // Helper function to normalize dates
    const toLocalDateString = (date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const now = new Date();
    const todayStr = toLocalDateString(now);
    
    let filterStart = null;
    let filterEnd = null;
    let periodLabel = 'All Time';

    // Calculate date range based on selected period
    if (period === 'today') {
      filterStart = filterEnd = todayStr;
      periodLabel = 'Today';
    } else if (period === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      filterStart = filterEnd = toLocalDateString(yesterday);
      periodLabel = 'Yesterday';
    } else if (period === 'this-week') {
      const dayOfWeek = now.getDay();
      const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + diffToMonday);
      filterStart = toLocalDateString(weekStart);
      filterEnd = todayStr;
      periodLabel = 'This Week';
    } else if (period === 'last-week') {
      const dayOfWeek = now.getDay();
      const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() + diffToMonday);
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(thisWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
      filterStart = toLocalDateString(lastWeekStart);
      filterEnd = toLocalDateString(lastWeekEnd);
      periodLabel = 'Last Week';
    } else if (period === 'this-month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filterStart = toLocalDateString(monthStart);
      filterEnd = todayStr;
      periodLabel = 'This Month';
    } else if (period === 'last-month') {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      filterStart = toLocalDateString(lastMonthStart);
      filterEnd = toLocalDateString(lastMonthEnd);
      periodLabel = 'Last Month';
    } else if (period === 'custom' && startDate && endDate) {
      // Validate dates for custom range
      if (new Date(startDate) > new Date(endDate)) {
        throw new Error('Start date cannot be after end date');
      }
      filterStart = startDate;
      filterEnd = endDate;
      periodLabel = `${startDate} to ${endDate}`;
    } else {
      periodLabel = 'All Time';
    }

    // Fetch all sessions, sorted by date (newest first)
    const allSessions = await StudySession.find().sort({ date: -1 });

    // Filter sessions based on selected period
    let sessions = allSessions;
    if (filterStart && filterEnd) {
      sessions = allSessions.filter((s) => {
        const sessionDate = toLocalDateString(s.date);
        return sessionDate >= filterStart && sessionDate <= filterEnd;
      });
    }

    // Calculate statistics
    const totalStudyTime = sessions.reduce((sum, s) => sum + s.duration, 0);
    const numberOfSessions = sessions.length;

    // Study time by subject
    const subjectMap = {};
    for (const session of sessions) {
      const key = session.subject.trim();
      if (!subjectMap[key]) subjectMap[key] = 0;
      subjectMap[key] += session.duration;
    }
    const subjectStats = Object.entries(subjectMap)
      .map(([subject, totalMinutes]) => ({ subject, totalMinutes }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    // Daily study totals (grouped by date)
    const dailyTotalsMap = {};
    for (const session of sessions) {
      const dateStr = toLocalDateString(session.date);
      if (!dailyTotalsMap[dateStr]) dailyTotalsMap[dateStr] = 0;
      dailyTotalsMap[dateStr] += session.duration;
    }
    const dailyTotals = Object.entries(dailyTotalsMap)
      .map(([date, minutes]) => ({ date, minutes }))
      .sort((a, b) => b.date.localeCompare(a.date));

    // Group sessions by date for display
    const groupsMap = {};
    for (const session of sessions) {
      const d = new Date(session.date);
      const key = d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groupsMap[key]) {
        groupsMap[key] = { label: key, sessions: [], total: 0 };
      }
      groupsMap[key].sessions.push(session);
      groupsMap[key].total += session.duration;
    }
    const groupedSessions = Object.values(groupsMap);

    res.render("history", {
      period,
      periodLabel,
      startDate: startDate || '',
      endDate: endDate || '',
      totalStudyTime,
      numberOfSessions,
      subjectStats,
      dailyTotals,
      groupedSessions,
      sessions
    });
  } catch (err) {
    console.error("Failed to fetch history:", err.message);
    res.render("history", {
      period: 'all-time',
      periodLabel: 'All Time',
      startDate: '',
      endDate: '',
      totalStudyTime: 0,
      numberOfSessions: 0,
      subjectStats: [],
      dailyTotals: [],
      groupedSessions: [],
      sessions: []
    });
  }
});

// ---------------------------------------------------------------------------
// 404 Handler - Must be after all routes
// ---------------------------------------------------------------------------

app.use((req, res, next) => {
  console.warn("404 - Route not found:", req.method, req.url);
  renderError(res, 404, "Page Not Found", "The page you're looking for doesn't exist. It may have been moved or deleted.");
});

// ---------------------------------------------------------------------------
// Global Error Handler - Must be last
// ---------------------------------------------------------------------------

app.use((err, req, res, next) => {
  // Log the error
  console.error("Unhandled error:", err.message);
  if (isDevelopment) {
    console.error(err.stack);
  }

  // Don't expose sensitive error details in production
  const statusCode = err.statusCode || err.status || 500;
  const title = statusCode === 500 ? "Something Went Wrong" : "Error";
  const message = isDevelopment 
    ? err.message 
    : "We're sorry, but something went wrong. Please try again later.";

  // Prepare developer error details (only in development)
  const devError = isDevelopment ? `${err.name}: ${err.message}\n\nStack:\n${err.stack}` : null;

  // Check if response has already been sent
  if (res.headersSent) {
    console.error("Error occurred after response was sent. Cannot render error page.");
    return next(err);
  }

  renderError(res, statusCode, title, message, devError);
});

// ---------------------------------------------------------------------------
// MongoDB Connection
// ---------------------------------------------------------------------------

/*
 * MONGODB CONFIGURATION REQUIREMENTS
 * 
 * This application requires a running MongoDB instance to function.
 * MongoDB is NOT packaged with this application and must be set up separately.
 * 
 * OPTION 1: Local MongoDB (Recommended for Development)
 * -----------------------------------------------------
 * 1. Download MongoDB Community Server from:
 *    https://www.mongodb.com/try/download/community
 * 
 * 2. Install with default settings (MongoDB service starts automatically)
 * 
 * 3. Verify MongoDB is running:
 *    - Windows: Check Services for "MongoDB" (should be "Running")
 *    - Or test connection: mongosh "mongodb://localhost:27017"
 * 
 * 4. Set environment variable in .env file:
 *    MONGODB_URI=mongodb://localhost:27017/study_tracker
 * 
 * OPTION 2: MongoDB Atlas (Cloud Database)
 * -----------------------------------------
 * 1. Create free account at: https://www.mongodb.com/cloud/atlas/register
 * 
 * 2. Create a cluster and get your connection string
 * 
 * 3. Update .env file with Atlas connection string:
 *    MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/study_tracker
 * 
 * IMPORTANT NOTES:
 * - The MONGODB_URI environment variable is REQUIRED
 * - Connection string must be in .env file (not hardcoded)
 * - Application will exit if MongoDB connection fails
 * - For packaged .exe: .env file must be in same directory as executable
 */

// Validate required environment variables
if (!process.env.MONGODB_URI) {
  const msg = [
    "❌ MONGODB_URI is not set in environment variables",
    `Checked for .env file at: ${envPath}`,
    "Please create a .env file in the same directory as the application with:",
    "  MONGODB_URI=mongodb://localhost:27017/study_tracker",
    "See .env.example for reference",
  ].join('\n');
  console.error(msg);
  // In Electron we throw so the main process can show a dialog rather than killing the app
  if (isElectron) {
    throw new Error(msg);
  }
  process.exit(1);
}

// Log startup information
console.log("=".repeat(60));
console.log("Study Time Tracker - Starting...");
console.log("=".repeat(60));
if (isPackaged) {
  console.log("Running from: Packaged executable");
  console.log(`Working directory: ${process.cwd()}`);
  console.log(`Loading .env from: ${envPath}`);
} else {
  console.log("Running from: Development (node)");
}
console.log("=".repeat(60));

// Handle MongoDB connection errors
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
  if (isDevelopment) console.error(err.stack);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected successfully.');
});

// Connect to MongoDB, then start server
// Connect to MongoDB, then start server
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
    app.listen(PORT, () => {
      const serverUrl = `http://localhost:${PORT}`;
      console.log(`Server running at ${serverUrl}`);
      console.log(`Environment: ${isDevelopment ? 'Development' : 'Production'}`);
      
      // Auto-open browser after server is ready (but not when running in Electron)
      if (!isElectron) {
        console.log("Opening browser...");
        openBrowser(serverUrl);
      } else {
        console.log("Running inside Electron - browser launch skipped");
      }
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    if (isDevelopment) {
      console.error("Connection string pattern:", process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@') : 'NOT SET');
      console.error(err.stack);
    }
    console.error("Please check:");
    console.error("  1. MongoDB is running");
    console.error("  2. MONGODB_URI is set correctly in .env file");
    console.error("  3. Network connection is available");
    console.error("\nExiting...");
    // In Electron we must not call process.exit() — Electron handles shutdown
    if (!isElectron) {
      process.exit(1);
    }
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  if (isDevelopment) {
    console.error('Promise:', promise);
  }
  // Don't exit in production or inside Electron, just log it
  if (isDevelopment && !isElectron) {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  if (isDevelopment) {
    console.error(err.stack);
  }
  // In Electron we must not exit the process — let Electron handle it
  if (!isElectron) {
    console.error('Server will shut down...');
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing server gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received. Closing server gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});
