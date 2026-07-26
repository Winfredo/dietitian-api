import { Router } from "express";
import multer from "multer";
import { apiKeyAuth } from "../middleware/apiKeyAuth";
import {
  uploadMedicalHistory,
  getPatient,
} from "../controllers/medicalHistory.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.post("/upload", apiKeyAuth, upload.single("file"), uploadMedicalHistory);
router.get("/:id", apiKeyAuth, getPatient);

export default router;