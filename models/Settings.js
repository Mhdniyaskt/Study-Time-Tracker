import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  dailyGoal: {
    type: Number,
    required: true,
    default: 120, // 2 hours in minutes
  },
  // Pomodoro / Focus Mode Settings
  focusDuration: {
    type: Number,
    default: 25, // in minutes
  },
  shortBreakDuration: {
    type: Number,
    default: 5, // in minutes
  },
  longBreakDuration: {
    type: Number,
    default: 15, // in minutes
  },
  roundsUntilLongBreak: {
    type: Number,
    default: 4,
  },
  disableShortBreaks: {
    type: Boolean,
    default: false,
  },
  disableLongBreaks: {
    type: Boolean,
    default: false,
  },
  autoStartWork: {
    type: Boolean,
    default: false,
  },
  autoStartBreaks: {
    type: Boolean,
    default: false,
  },
  countdownDial: {
    type: Boolean,
    default: true,
  },
  theme: {
    type: String,
    enum: ['dark', 'light', 'system'],
    default: 'dark',
  },
  timerStyle: {
    type: String,
    enum: ['circular', 'minimal'],
    default: 'circular',
  },
  notificationsEnabled: {
    type: Boolean,
    default: true,
  },
});

export default mongoose.model("Settings", settingsSchema);
