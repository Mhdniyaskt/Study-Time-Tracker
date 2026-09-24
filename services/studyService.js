import StudySession from "../models/StudySession.js";
import Settings from "../models/Settings.js";

/**
 * Sanitizes user input to prevent NoSQL injection
 * Removes any objects, arrays, or dangerous characters
 * @param {any} input - User input to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string' && typeof input !== 'number') {
    return '';
  }
  return String(input).trim();
}

/**
 * Normalizes a Date or date string to local YYYY-MM-DD
 * @param {Date|string|number} date
 * @returns {string} YYYY-MM-DD
 */
export function toLocalDateString(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates current and longest study streaks based on daily goal and exact seconds.
 * 
 * Rules:
 * 1. A day counts toward streak ONLY when daily total >= daily goal.
 * 2. Uses exact stored durationSeconds when available, falling back to duration * 60.
 * 3. Today Rule: If today has not met the goal yet, do not destroy yesterday's streak
 *    while today is still in progress. Current streak preserves yesterday's streak.
 * 4. Once today meets the goal, today counts and current streak increments.
 * 5. Longest streak tracks the maximum historical consecutive days meeting the daily goal.
 * 
 * @param {Array} sessions - Array of StudySession documents/objects
 * @param {number} [dailyGoalMinutes=120] - Daily goal in minutes
 * @param {Date} [now=new Date()] - Reference date for "today"
 * @returns {{
 *   currentStreak: number,
 *   longestStreak: number,
 *   todayGoalCompleted: boolean,
 *   todayTotalSeconds: number,
 *   dailyGoalSeconds: number,
 *   dailyTotalsSecondsMap: Record<string, number>
 * }}
 */
export function calculateStreak(sessions = [], dailyGoalMinutes = 120, now = new Date()) {
  const dailyGoalSeconds = Math.round(Number(dailyGoalMinutes || 120) * 60);
  const todayStr = toLocalDateString(now);

  const getSessionDurationSeconds = (session) => {
    if (session.durationSeconds != null && !isNaN(Number(session.durationSeconds))) {
      return Number(session.durationSeconds);
    }
    return Number(session.duration || 0) * 60;
  };

  const dailyTotalsSecondsMap = {};
  for (const session of sessions) {
    if (!session || !session.date) continue;
    const dateStr = toLocalDateString(session.date);
    const secs = getSessionDurationSeconds(session);
    dailyTotalsSecondsMap[dateStr] = (dailyTotalsSecondsMap[dateStr] || 0) + secs;
  }

  const meetsGoal = (dateStr) => {
    const totalSecs = dailyTotalsSecondsMap[dateStr] || 0;
    return totalSecs >= dailyGoalSeconds;
  };

  const todayTotalSeconds = dailyTotalsSecondsMap[todayStr] || 0;
  const isTodayGoalCompleted = meetsGoal(todayStr);

  // 1. Current Streak:
  // If today meets the goal: count today and consecutive completed days backwards.
  // If today has not reached goal yet: preserve yesterday's streak while today is in progress.
  let currentStreak = 0;
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);

  if (isTodayGoalCompleted) {
    while (meetsGoal(toLocalDateString(cursor))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  } else {
    // Check backwards starting from yesterday
    cursor.setDate(cursor.getDate() - 1);
    while (meetsGoal(toLocalDateString(cursor))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // 2. Longest Streak:
  // Historical maximum consecutive sequence of completed-goal days.
  const completedDates = Object.keys(dailyTotalsSecondsMap)
    .filter((dateStr) => dailyTotalsSecondsMap[dateStr] >= dailyGoalSeconds)
    .sort();

  let longestStreak = 0;
  let currentRun = 0;
  let prevDate = null;

  for (const dateStr of completedDates) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const currentDate = new Date(y, m - 1, d, 12, 0, 0);

    if (prevDate === null) {
      currentRun = 1;
    } else {
      const diffMs = currentDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentRun++;
      } else {
        currentRun = 1;
      }
    }

    if (currentRun > longestStreak) {
      longestStreak = currentRun;
    }

    prevDate = currentDate;
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  return {
    currentStreak,
    longestStreak,
    todayGoalCompleted: isTodayGoalCompleted,
    todayTotalSeconds,
    dailyGoalSeconds,
    dailyTotalsSecondsMap,
  };
}

/**
 * Validates subject + hours/minutes for a study session.
 * Returns an array of human-readable error strings (empty = valid).
 */
export function validateSession(subject, hours, minutes) {
  const errors = [];

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

/**
 * Validates if an ID is valid (supports both 24-hex MongoDB ObjectIds and NeDB IDs)
 */
export function isValidObjectId(id) {
  if (typeof id !== 'string' && typeof id !== 'number') return false;
  const str = String(id).trim();
  return str.length >= 8 && str.length <= 64 && /^[a-zA-Z0-9_-]+$/.test(str);
}

/**
 * Calculates all data needed for the Dashboard view
 */
export async function calculateDashboardData() {
  const sessions = await StudySession.find().sort({ date: -1 });
  const now = new Date();
  const todayStr = toLocalDateString(now);

  // Today's total: filter sessions with today's date
  const todayTotal = sessions
    .filter((s) => toLocalDateString(s.date) === todayStr)
    .reduce((sum, s) => sum + s.duration, 0);

  const totalStudyTime = sessions.reduce((sum, s) => sum + s.duration, 0);

  // Daily goal — load from Settings, fall back to 120 mins (2h)
  const settings = await Settings.findOne();
  const dailyGoal = settings ? settings.dailyGoal : 120;
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

  // Current month: first day 00:00 to last day 23:59
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartStr = toLocalDateString(monthStart);

  const monthSessions = sessions.filter((s) => toLocalDateString(s.date) >= monthStartStr);
  const monthlyTotal = monthSessions.reduce((sum, s) => sum + s.duration, 0);
  const monthlySessions = monthSessions.length;

  // Calculate streaks and today's goal completion using exact seconds
  const streakInfo = calculateStreak(sessions, dailyGoal, now);
  const currentStreak = streakInfo.currentStreak;
  const longestStreak = streakInfo.longestStreak;
  const todayGoalCompleted = streakInfo.todayGoalCompleted;
  const todayTotalSeconds = streakInfo.todayTotalSeconds;
  const dailyGoalSeconds = streakInfo.dailyGoalSeconds;

  // Group sessions by calendar date (formatted date string, newest date first)
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

  // Time formatting helper
  const formatHM = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  // Today's subject-wise stats: filter sessions with today's date
  const todaySessions = sessions.filter((s) => toLocalDateString(s.date) === todayStr);
  const todaySubjectMap = {};
  for (const session of todaySessions) {
    const key = session.subject.trim();
    if (!todaySubjectMap[key]) {
      todaySubjectMap[key] = { totalMinutes: 0, totalSeconds: 0, count: 0 };
    }
    todaySubjectMap[key].totalMinutes += session.duration;
    todaySubjectMap[key].totalSeconds += (session.durationSeconds != null ? session.durationSeconds : session.duration * 60);
    todaySubjectMap[key].count += 1;
  }
  const todaySubjectStats = Object.entries(todaySubjectMap)
    .map(([subject, data]) => ({
      subject,
      totalMinutes: data.totalMinutes,
      totalSeconds: data.totalSeconds,
      count: data.count,
      formattedTime: formatHM(data.totalMinutes),
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  // Subject-wise stats: group by subject, sum duration, sort descending
  const subjectMap = {};
  for (const session of sessions) {
    const key = session.subject.trim();
    if (!subjectMap[key]) {
      subjectMap[key] = { totalMinutes: 0, totalSeconds: 0, count: 0 };
    }
    subjectMap[key].totalMinutes += session.duration;
    subjectMap[key].totalSeconds += (session.durationSeconds != null ? session.durationSeconds : session.duration * 60);
    subjectMap[key].count += 1;
  }
  const subjectStats = Object.entries(subjectMap)
    .map(([subject, data]) => ({
      subject,
      totalMinutes: data.totalMinutes,
      totalSeconds: data.totalSeconds,
      count: data.count,
      formattedTime: formatHM(data.totalMinutes),
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  // Weekly chart data & horizontal day bars: Mon-Sun for current week
  const weeklyChartData = [];
  const weeklyDayTotals = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateStr = toLocalDateString(date);

    const daySessions = sessions.filter((s) => toLocalDateString(s.date) === dateStr);
    const dayTotal = daySessions.reduce((sum, s) => sum + s.duration, 0);
    const dayTotalSeconds = daySessions.reduce((sum, s) => sum + (s.durationSeconds != null ? s.durationSeconds : s.duration * 60), 0);

    const hoursNum = Number((dayTotal / 60).toFixed(2));
    weeklyChartData.push(hoursNum);

    weeklyDayTotals.push({
      dayName: dayNames[i],
      dateStr,
      totalMinutes: dayTotal,
      totalSeconds: dayTotalSeconds,
      hours: hoursNum,
      formattedTime: formatHM(dayTotal),
      isToday: dateStr === todayStr,
    });
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
    monthlyChartData.push(Number((dayTotal / 60).toFixed(2)));
  }

  return {
    sessions,
    groupedSessions,
    subjectStats,
    todaySubjectStats,
    todayTotal,
    todayTotalSeconds,
    totalStudyTime,
    weeklyTotal,
    weeklyDayTotals,
    monthlyTotal,
    monthlySessions,
    currentStreak,
    longestStreak,
    todayGoalCompleted,
    dailyGoal,
    dailyGoalSeconds,
    dailyProgress,
    dailyGoalHours: dailyGoal / 60,
    weeklyChartData,
    weeklyChartLabels: dayNames,
    monthlyChartData,
    monthlyChartLabels,
  };
}

/**
 * Calculates all data needed for the Statistics view
 */
export async function calculateStatisticsData({ period = 'all-time', startDate = '', endDate = '' }) {
  const now = new Date();
  const todayStr = toLocalDateString(now);

  let filterStart = null;
  let filterEnd = null;
  let periodLabel = 'All Time';

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
    if (new Date(startDate) > new Date(endDate)) {
      throw new Error('Start date cannot be after end date');
    }
    filterStart = startDate;
    filterEnd = endDate;
    periodLabel = `${startDate} to ${endDate}`;
  } else {
    periodLabel = 'All Time';
  }

  const allSessions = await StudySession.find().sort({ date: -1 });

  let sessions = allSessions;
  if (filterStart && filterEnd) {
    sessions = allSessions.filter((s) => {
      const sessionDate = toLocalDateString(s.date);
      return sessionDate >= filterStart && sessionDate <= filterEnd;
    });
  }

  const totalStudyTime = sessions.reduce((sum, s) => sum + s.duration, 0);
  const numberOfSessions = sessions.length;

  let averageStudyTimePerDay = 0;
  if (sessions.length > 0) {
    let totalDaysInPeriod = 1;
    if (filterStart && filterEnd && filterStart !== filterEnd) {
      const start = new Date(filterStart);
      const end = new Date(filterEnd);
      totalDaysInPeriod = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    } else if (!filterStart && !filterEnd) {
      // For all-time: calculate average across active study days
      const uniqueDays = new Set(sessions.map((s) => toLocalDateString(s.date))).size;
      totalDaysInPeriod = Math.max(1, uniqueDays);
    }
    averageStudyTimePerDay = Math.round(totalStudyTime / totalDaysInPeriod);
  }

  const subjectMap = {};
  for (const session of sessions) {
    const key = session.subject.trim();
    if (!subjectMap[key]) subjectMap[key] = 0;
    subjectMap[key] += session.duration;
  }
  const subjectStats = Object.entries(subjectMap)
    .map(([subject, totalMinutes]) => ({ subject, totalMinutes }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  const dailyTotalsMap = {};
  for (const session of sessions) {
    const dateStr = toLocalDateString(session.date);
    if (!dailyTotalsMap[dateStr]) dailyTotalsMap[dateStr] = 0;
    dailyTotalsMap[dateStr] += session.duration;
  }
  const dailyTotals = Object.entries(dailyTotalsMap)
    .map(([date, minutes]) => ({ date, minutes }))
    .sort((a, b) => b.date.localeCompare(a.date));

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

  const chartLabels = [];
  const chartData = [];

  if (filterStart && filterEnd) {
    const startDateObj = new Date(filterStart);
    const endDateObj = new Date(filterEnd);

    for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
      const dateStr = toLocalDateString(d);
      const displayDate = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric"
      });

      chartLabels.push(displayDate);
      const dayTotal = sessions
        .filter(s => toLocalDateString(s.date) === dateStr)
        .reduce((sum, s) => sum + s.duration, 0);

      chartData.push(Number((dayTotal / 60).toFixed(2)));
    }
  } else {
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

  const subjectChartLabels = subjectStats.map(stat => stat.subject);
  const subjectChartData = subjectStats.map(stat => Number((stat.totalMinutes / 60).toFixed(2)));
  const subjectChartColors = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
  ];

  const calendarEvents = [];
  for (const session of allSessions) {
    const sessionDate = toLocalDateString(session.date);

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

  calendarEvents.forEach(event => {
    const hours = Math.floor(event.duration / 60);
    const minutes = event.duration % 60;
    event.title = `${hours}h ${minutes}m`;
    event.displayTitle = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  });

  return {
    period,
    periodLabel,
    startDate,
    endDate,
    totalStudyTime,
    numberOfSessions,
    averageStudyTimePerDay,
    subjectStats,
    dailyTotals,
    groupedSessions,
    sessions,
    chartLabels,
    chartData,
    subjectChartLabels,
    subjectChartData,
    subjectChartColors: subjectChartColors.slice(0, subjectStats.length),
    calendarEvents,
  };
}

/**
 * Calculates all data needed for the History view
 */
export async function calculateHistoryData({
  period = 'all-time',
  startDate = '',
  endDate = '',
  page = 1,
  limit = 10,
}) {
  const now = new Date();
  const todayStr = toLocalDateString(now);

  let filterStart = null;
  let filterEnd = null;
  let periodLabel = 'All Time';
  let startOfDay = null;
  let endOfDay = null;

  if (period === 'today') {
    filterStart = filterEnd = todayStr;
    periodLabel = 'Today';
    startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (period === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    filterStart = filterEnd = toLocalDateString(yesterday);
    periodLabel = 'Yesterday';
    startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
    endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
  } else if (period === 'this-week') {
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMonday);
    filterStart = toLocalDateString(weekStart);
    filterEnd = todayStr;
    periodLabel = 'This Week';
    startOfDay = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(), 0, 0, 0, 0);
    endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
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
    startOfDay = new Date(lastWeekStart.getFullYear(), lastWeekStart.getMonth(), lastWeekStart.getDate(), 0, 0, 0, 0);
    endOfDay = new Date(lastWeekEnd.getFullYear(), lastWeekEnd.getMonth(), lastWeekEnd.getDate(), 23, 59, 59, 999);
  } else if (period === 'this-month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    filterStart = toLocalDateString(monthStart);
    filterEnd = todayStr;
    periodLabel = 'This Month';
    startOfDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (period === 'last-month') {
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    filterStart = toLocalDateString(lastMonthStart);
    filterEnd = toLocalDateString(lastMonthEnd);
    periodLabel = 'Last Month';
    startOfDay = new Date(lastMonthStart.getFullYear(), lastMonthStart.getMonth(), 1, 0, 0, 0, 0);
    endOfDay = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), lastMonthEnd.getDate(), 23, 59, 59, 999);
  } else if (period === 'custom' && startDate && endDate) {
    if (new Date(startDate) > new Date(endDate)) {
      throw new Error('Start date cannot be after end date');
    }
    filterStart = startDate;
    filterEnd = endDate;
    periodLabel = `${startDate} to ${endDate}`;
    const [sY, sM, sD] = startDate.split('-').map(Number);
    const [eY, eM, eD] = endDate.split('-').map(Number);
    startOfDay = new Date(sY, sM - 1, sD, 0, 0, 0, 0);
    endOfDay = new Date(eY, eM - 1, eD, 23, 59, 59, 999);
  } else {
    periodLabel = 'All Time';
  }

  const mongoFilter = {};
  if (startOfDay && endOfDay) {
    mongoFilter.date = { $gte: startOfDay, $lte: endOfDay };
  }

  // Load all matching sessions for stats and pagination
  const allFilteredSessions = await StudySession.find(mongoFilter).sort({ date: -1 });
  const total = allFilteredSessions.length;
  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, parseInt(page, 10) || 1), totalPages);
  const skip = (safePage - 1) * safeLimit;

  // Query ONLY the requested page's records for display
  const paginatedSessions = allFilteredSessions.slice(skip, skip + safeLimit);

  // Calculate statistics for the filtered period
  const totalStudyTime = allFilteredSessions.reduce((sum, s) => sum + s.duration, 0);
  const numberOfSessions = total;

  const subjectMap = {};
  for (const session of allFilteredSessions) {
    const key = (session.subject || '').trim();
    if (!subjectMap[key]) subjectMap[key] = 0;
    subjectMap[key] += session.duration;
  }
  const subjectStats = Object.entries(subjectMap)
    .map(([subject, totalMinutes]) => ({ subject, totalMinutes }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  const dailyTotalsMap = {};
  for (const session of allFilteredSessions) {
    const dateStr = toLocalDateString(session.date);
    if (!dailyTotalsMap[dateStr]) dailyTotalsMap[dateStr] = 0;
    dailyTotalsMap[dateStr] += session.duration;
  }
  const dailyTotals = Object.entries(dailyTotalsMap)
    .map(([date, minutes]) => ({ date, minutes }))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Group ONLY the paginated sessions for display in this page's view
  const groupsMap = {};
  for (const session of paginatedSessions) {
    const d = new Date(session.date);
    const key = d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groupsMap[key]) {
      groupsMap[key] = { label: key, sessions: [], total: 0 };
    }
    groupsMap[key].sessions.push(session);
    groupsMap[key].total += session.duration;
  }
  const groupedSessions = Object.values(groupsMap);

  return {
    period,
    periodLabel,
    startDate,
    endDate,
    totalStudyTime,
    numberOfSessions,
    subjectStats,
    dailyTotals,
    groupedSessions,
    sessions: paginatedSessions,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}
