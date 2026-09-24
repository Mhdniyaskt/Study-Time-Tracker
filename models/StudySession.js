import mongoose from "mongoose";

const studySessionSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true, // stored in total minutes (for backward compatibility)
  },
  durationSeconds: {
    type: Number,
    default: null, // exact seconds, null for legacy sessions
  },
  date: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  sessionId: {
    type: String,
    default: null,
    sparse: true,
  },
});

studySessionSchema.index({ date: -1 });
studySessionSchema.index({ subject: 1 });
studySessionSchema.index({ sessionId: 1 }, { sparse: true, unique: true });

export default mongoose.model("StudySession", studySessionSchema);
