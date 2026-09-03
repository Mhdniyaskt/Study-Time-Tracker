import mongoose from "mongoose";

const studySessionSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true, // stored in total minutes
  },
  date: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("StudySession", studySessionSchema);
