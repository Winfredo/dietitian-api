import { useCallback, useEffect, useRef, useState } from "react";
import { DisclaimerBanner } from "./DisclaimerBanner";
import { IntakeForm } from "./IntakeForm";
import { PlanDisplay } from "./PlanDisplay";
import { getNutritionPlan, getPatient, uploadMedicalHistory } from "./api";
import type { NutritionPlan } from "./types";
import "./App.css";

type Stage =
  | "idle"
  | "uploading"
  | "processing"
  | "analyzed"
  | "failed"
  | "error";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30;

function App() {
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const pollTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) window.clearTimeout(pollTimer.current);
    };
  }, []);

  const pollForResult = useCallback((patientId: string, attempt = 0) => {
    if (attempt >= MAX_POLL_ATTEMPTS) {
      setStage("error");
      setErrorMessage("Timed out waiting for the analysis to finish.");
      return;
    }

    getPatient(patientId)
      .then(async (patient) => {
        if (patient.status === "analyzed") {
          const nutritionPlan = await getNutritionPlan(patientId);
          setPlan(nutritionPlan);
          setStage("analyzed");
          return;
        }
        if (patient.status === "failed") {
          setStage("failed");
          return;
        }
        pollTimer.current = window.setTimeout(
          () => pollForResult(patientId, attempt + 1),
          POLL_INTERVAL_MS
        );
      })
      .catch((err: Error) => {
        setStage("error");
        setErrorMessage(err.message);
      });
  }, []);

  async function handleSubmit(fullName: string, file: File) {
    setStage("uploading");
    setErrorMessage(null);
    setPlan(null);

    try {
      const { patientId } = await uploadMedicalHistory(fullName, file);
      setStage("processing");
      pollForResult(patientId);
    } catch (err) {
      setStage("error");
      setErrorMessage(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  const isBusy = stage === "uploading" || stage === "processing";

  return (
    <div className="app">
      <DisclaimerBanner />
      <h1> Winfred AI Dietitian</h1>

      <IntakeForm onSubmit={handleSubmit} disabled={isBusy} />

      {stage === "processing" && (
        <p className="status">Analyzing your document, this can take a bit...</p>
      )}
      {stage === "failed" && (
        <p className="status status-error">
          Analysis failed. Please try uploading again.
        </p>
      )}
      {stage === "error" && (
        <p className="status status-error">{errorMessage}</p>
      )}
      {stage === "analyzed" && plan && <PlanDisplay plan={plan} />}
    </div>
  );
}

export default App;
