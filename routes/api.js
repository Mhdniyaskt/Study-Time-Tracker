import express from "express";
import {
  getDashboard,
  getStatistics,
  getHistory,
  getSettings,
  updateSettings,
  createSession,
  getSessionById,
  updateSession,
  deleteSession,
  saveTimerSession,
} from "../controllers/studyController.js";

const router = express.Router();

// Dashboard data
router.get("/dashboard", getDashboard);

// Statistics data
router.get("/statistics", getStatistics);

// History data
router.get("/history", getHistory);

// Settings
router.get("/settings", getSettings);
router.post("/settings", updateSettings);

// Study Sessions CRUD
router.post("/study", createSession);
router.get("/study/:id", getSessionById);
router.put("/study/:id", updateSession);
router.post("/study/:id/edit", updateSession);
router.delete("/study/:id", deleteSession);

// Timer Save
router.post("/timer/save", saveTimerSession);

export default router;
