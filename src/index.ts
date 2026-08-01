import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import medicalHistoryRoutes from "./routes/medicalHistory.routes";
import nutritionRoutes from "./routes/nutrition.routes";

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://d1qwbnlcdfjl6r.cloudfront.net",
  ],
}));

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/medical-history", medicalHistoryRoutes);
app.use("/nutrition", nutritionRoutes);

app.use(errorHandler);

export default app;

async function start() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected to MongoDB");

app.listen(env.PORT, () => console.log(`Server running on port ${env.PORT}`));}

if (require.main === module) {
  start().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}