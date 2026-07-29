import { Router } from "express";
import { apiKeyAuth } from "../middleware/apiKeyAuth";
import {
  getNutritionPlan,
  regenerateNutritionPlan,
} from "../controllers/nutrition.controller";

const router = Router();

router.get("/:patientId/plan", apiKeyAuth, getNutritionPlan);
router.post("/plan", apiKeyAuth, regenerateNutritionPlan);

export default router;
