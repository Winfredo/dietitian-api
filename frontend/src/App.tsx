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

const STEPS: { label: string }[] = [
  { label: "Upload" },
  { label: "Analyze" },
  { label: "Your plan" },
];

function currentStepIndex(stage: Stage): number {
  if (stage === "idle") return 0;
  if (stage === "uploading" || stage === "processing") return 1;
  return 2;
}

function Stepper({ stage }: { stage: Stage }) {
  const activeIndex = currentStepIndex(stage);
  const hasError = stage === "failed" || stage === "error";

  return (
    <ol className="stepper" aria-label="Progress">
      {STEPS.map((step, index) => {
        let status: "done" | "active" | "upcoming" = "upcoming";
        if (index < activeIndex) status = "done";
        else if (index === activeIndex) status = "active";
        const isErrored = hasError && index === activeIndex;

        return (
          <li
            key={step.label}
            className={`stepper-item ${status}${isErrored ? " errored" : ""}`}
          >
            <span className="stepper-dot" aria-hidden="true">
              {status === "done" && !isErrored ? "✓" : index + 1}
            </span>
            <span className="stepper-label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

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

  function handleReset() {
    setStage("idle");
    setErrorMessage(null);
    setPlan(null);
  }

  const isBusy = stage === "uploading" || stage === "processing";

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            🥗
          </span>
          <div>
            <h1>AI Dietitian</h1>
            <p className="brand-subtitle">
              Personalized nutrition guidance from your medical history
            </p>
          </div>
        </div>
      </header>

      <DisclaimerBanner />

      <main className="app-main">
        <div className="card intake-card">
          <Stepper stage={stage} />

          {stage !== "analyzed" && (
            <IntakeForm onSubmit={handleSubmit} disabled={isBusy} stage={stage} />
          )}

          {stage === "processing" && (
            <div className="status status-processing" role="status">
              <span className="spinner" aria-hidden="true" />
              <div>
                <p className="status-title">Analyzing your document</p>
                <p className="status-detail">
                  This usually takes under a minute. Hang tight…
                </p>
              </div>
            </div>
          )}

          {stage === "failed" && (
            <div className="status status-error" role="alert">
              <span className="status-icon" aria-hidden="true">
                ⚠️
              </span>
              <div>
                <p className="status-title">Analysis failed</p>
                <p className="status-detail">
                  We couldn't process that file. Please try uploading again.
                </p>
              </div>
              <button className="btn-ghost" type="button" onClick={handleReset}>
                Try again
              </button>
            </div>
          )}

          {stage === "error" && (
            <div className="status status-error" role="alert">
              <span className="status-icon" aria-hidden="true">
                ⚠️
              </span>
              <div>
                <p className="status-title">Something went wrong</p>
                <p className="status-detail">{errorMessage}</p>
              </div>
              <button className="btn-ghost" type="button" onClick={handleReset}>
                Try again
              </button>
            </div>
          )}
        </div>

        {stage === "analyzed" && plan && (
          <>
            <PlanDisplay plan={plan} />
            <div className="reset-row">
              <button className="btn-secondary" type="button" onClick={handleReset}>
                Analyze another document
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
