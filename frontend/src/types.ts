export interface FoodItem {
  item: string;
  reason: string;
  relatedCondition?: string;
}

export interface NutritionPlan {
  _id: string;
  patientId: string;
  summary: string;
  foodsToAvoid: FoodItem[];
  nutrientsToLimit: FoodItem[];
  foodsToEat: FoodItem[];
  nutrientsToIncrease: FoodItem[];
  healthTips: string[];
  disclaimer: string;
  createdAt: string;
}

export interface Patient {
  _id: string;
  fullName: string;
  status: "processing" | "analyzed" | "failed";
  originalFilename: string;
  uploadedAt: string;
}
