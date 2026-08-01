# AI Dietitian — Project Documentation

## Overview

A backend service that accepts a patient's medical history (PDF, image, or CSV), extracts structured medical data using a multimodal LLM, and returns a personalized nutrition plan — foods/nutrients to avoid, foods/nutrients to favor, and general health tips. Includes a simple React frontend for uploading files and viewing the generated plan.

**Disclaimer surfaced in-product:** the app makes clear this is general nutrition information, not medical advice, and prompts the user to consult a registered dietitian or physician before making dietary changes.

---

## Live Links

| Environment | Component | URL |
|---|---|---|
| Dev | Backend API | `http://ai-dietitian-dev.eba-nhnktemu.eu-west-1.elasticbeanstalk.com` |
| Prod | Backend API | `http://ai-dietitian-prod.eba-tgn3uspm.eu-west-1.elasticbeanstalk.com` |
| Dev | Frontend | `https://d1qwbnlcdfjl6r.cloudfront.net` |

All API endpoints require an `x-api-key` header. Contact me for the demo key.

---

## Architecture

```
Frontend (React, S3 + CloudFront)
        │  HTTPS (x-api-key header)
        ▼
Elastic Beanstalk (EC2, Node.js 20)
  Express app
   - apiKeyAuth middleware
   - POST /medical-history/upload
   - GET  /medical-history/:id
   - POST /nutrition/plan
   - GET  /nutrition/:patientId/plan
   - GET  /health
        │              │
        ▼              ▼
   MongoDB Atlas    AWS S3 (raw uploaded files)
        │
        ▼
  LangChain.js pipeline (Zod-validated structured output)
        │
        ▼
  Google Gemini (multimodal: PDF / image / CSV-as-text)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (Node.js 20) |
| API Framework | Express |
| Database | MongoDB Atlas (via Mongoose) |
| LLM Orchestration | LangChain.js, structured output validated with Zod |
| LLM Provider | Google Gemini (multimodal), OpenAI path implemented but not exercised — see Deviations |
| Auth | API key (header-based, timing-safe comparison, fails closed if unconfigured) |
| File Storage | AWS S3 (private, versioned) |
| Tests | Jest (unit + integration), Supertest, mongodb-memory-server |
| Backend Hosting | AWS Elastic Beanstalk (Node.js platform), separate dev and prod environments |
| Frontend Hosting | AWS S3 + CloudFront (Origin Access Control, private bucket) |
| CI/CD | GitHub Actions (test gate, dev + prod) and AWS CodePipeline (build + deploy, dev + prod, backend + frontend) |
| Secrets | AWS Secrets Manager (dev + prod secrets created); deployed app reads config via EB environment properties — see Deviations |

---

## Repository Structure

```
dietitian-api/
├── src/
│   ├── index.ts
│   ├── config/env.ts
│   ├── middleware/       (apiKeyAuth, errorHandler)
│   ├── models/           (Patient, NutritionPlan)
│   ├── schemas/          (Zod: medicalHistorySchema, nutritionPlanSchema)
│   ├── routes/
│   ├── controllers/
│   └── services/         (s3.service, llm.service, fileParsing.service)
├── tests/                (unit + integration)
├── frontend/             (React + TypeScript UI, own buildspec.yml)
├── .github/workflows/    (dev.yml, prod.yml — test gates)
├── buildspec.yml         (CodeBuild — backend)
├── Procfile
└── .ebignore
```

---

## CI/CD Pipeline

**Backend** — two independent pipelines, one per environment:
- Push to `develop` → GitHub Actions runs tests → AWS CodePipeline builds (CodeBuild, Node 20) and deploys to the dev Elastic Beanstalk environment
- Push to `main` → same flow, deploying to the prod Elastic Beanstalk environment

**Frontend** — one pipeline (dev):
- Push to `develop` → CodePipeline builds the React app (CodeBuild) and syncs the output to the frontend S3 bucket, served via CloudFront

All pipelines gate on tests passing before deploying — a failing test blocks the deploy.

---

## Testing

- 9 test suites, 48 tests, all passing
- Unit tests mock S3, the LLM service, and external calls
- Integration tests run against a real in-memory MongoDB (`mongodb-memory-server`) with the LLM and S3 layers mocked
- Run locally: `npm test -- --coverage`

---

## Deliberate Deviations from the Original Spec

Documented here for transparency, each with the reasoning behind it:

1. **Elastic Beanstalk platform: Node.js, not Docker.**
   Per direction to prioritize the GitHub Actions / CodePipeline deployment path; the Docker-based deploy was dropped in favor of EB's native Node.js runtime, which removed an entire class of container-startup issues.

2. **LLM provider: developed and tested against Gemini, not OpenAI.**
   The `getLLM(provider)` abstraction supports both providers identically — the OpenAI code path is implemented and would work with a funded API key. Development and testing were done against Gemini's free tier specifically to avoid incurring API costs during iteration.

3. **Secrets delivery: EB environment properties, not live Secrets Manager fetch.**
   Both dev and prod secrets exist in AWS Secrets Manager as specified. However, the deployed app currently reads its configuration via Elastic Beanstalk's environment properties rather than fetching from Secrets Manager at container startup — a simplification appropriate for the Node.js (non-Docker) platform, where the original Docker-startup-script approach for fetching secrets doesn't directly apply.

4. **Dev environment: single-instance EB tier, not load-balanced.**
   Chosen for cost and simplicity in a dev/demo context. The application logic is unaffected either way; switching to a load-balanced, auto-scaling tier would be a straightforward infrastructure change (recreating the environment with that tier selected) if required for production traffic handling.

5. **Backend CodePipeline vs. GitHub Actions redundancy.**
   The original spec listed both CodePipeline and GitHub Actions as backend deploy mechanisms. Both are implemented: GitHub Actions serves as the test gate, and CodePipeline handles the actual build and deploy — a clean division of responsibility rather than two overlapping deploy paths.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string (separate database per environment) |
| `GEMINI_API_KEY` | Gemini API access |
| `OPENAI_API_KEY` | OpenAI API access (unused in current deployment) |
| `API_KEY` | Client authentication key (separate per environment) |
| `S3_BUCKET` | Upload storage bucket |
| `AWS_REGION` | `eu-west-1` |
| `PORT` | Express listen port |
