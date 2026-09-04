import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  dailyGoal: {
    type: Number,
    required: true,
    default: 120, // 2 hours in minutes
  },
});

export default mongoose.model("Settings", settingsSchema);
