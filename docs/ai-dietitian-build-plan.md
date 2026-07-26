# AI Dietitian — Build & Deploy Plan (6 Days, First-Time AWS)

## Sequencing philosophy
Build and prove the whole thing **locally first** (Mongo Atlas + local Express + real LLM calls + S3 with a personal IAM user). Only touch Elastic Beanstalk / CodePipeline / ALB once the app already works end to end. Debugging LLM prompts and Zod schemas on EC2 logs is miserable — do that part on your laptop where you can iterate in seconds.

Rough split: **Days 1–3 = code, working locally. Days 4–5 = AWS infra + CI/CD deploy. Day 6 = buffer, prod, polish.**

---

## Day 0 — DONE ✅ (repo + CI/CD foundations)

- [x] Repo created, connected to GitHub, `main`/`develop` branch strategy set up
- [x] `.gitignore` in place before any secrets existed
- [x] TypeScript config split: `tsconfig.json` (editor + tests, includes `src/` and `tests/`) and `tsconfig.build.json` (extends it, `rootDir: ./src`, `outDir: ./dist`, clean build output)
- [x] Minimal Express app (`src/index.ts`) with `GET /health` → 200
- [x] Jest + ts-jest + supertest working, `tests/health.test.ts` passing locally
- [x] `package.json` scripts fixed (`dev`, `build -p tsconfig.build.json`, `test`)
- [x] `.github/workflows/dev.yml` — triggers on push to `develop`, runs checkout → setup-node → `npm ci` → `npm run build` → `npm test` — **confirmed green on GitHub Actions**
- [x] Understand: branch strategy (feature → develop → main), why tests gate CI, what CI automates vs. what stays manual, PR vs. direct merge, why `main` isn't touched yet

**Not merging to `main` yet** — no `prod.yml`, no AWS environment to deploy to, and nothing worth calling "production" yet. First merge to `main` is planned for end of Day 3.

---

## Day 1 — Mongo, models, auth middleware, AWS + S3 upload

Picks up the rest of the original "Day 1" scope, plus AWS account/S3 setup.

### Mongo + models + middleware
- [x] MongoDB Atlas: free M0 cluster, get connection string, put in `.env` as `MONGODB_URI`
- [x] `Patient.ts` and `NutritionPlan.ts` Mongoose models (Section 4 of spec)
- [ ] `apiKeyAuth.ts` middleware (Section 8) — generate a key with `openssl rand -hex 32`, store in `.env`
- [ ] `errorHandler.ts` — basic catch-all
- [x] Confirm Mongo connects locally on `npm run dev`

### AWS account + S3 (first real AWS console work — go slow here)
- [ ] Create AWS account if needed
- [ ] IAM → Users → create `ai-dietitian-dev` → attach `AmazonS3FullAccess` for now
- [ ] Create an access key for that user (IAM → Users → Security credentials → Create access key → "Application running outside AWS")
- [ ] Save keys in `.env` as `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — **local dev only**, EB will use an instance role instead (Day 4)
- [ ] S3 console → Create bucket `ai-dietitian-uploads-dev` → keep "Block all public access" checked → enable versioning → SSE-S3 encryption for now → pick one region, use it everywhere from here on

### Code
- [ ] `s3.service.ts` (Section 9) — `uploadFile`, `getPresignedUrl`
- [ ] `medicalHistory.routes.ts` + controller (Section 7) with `multer` memory storage
- [ ] `POST /medical-history/upload` — test with Postman, confirm file lands in S3, Patient doc created with status `processing`
- [ ] `GET /medical-history/:id`
- [ ] Tests for the above (route + service), same pattern as `health.test.ts`

**End of day check:** upload a real PDF via Postman → appears in S3 → Patient doc in Mongo → tests green → push to `develop`, CI passes.

---

## Day 2 — LLM extraction (LangChain + Zod)

Most likely to eat unexpected time — full day dedicated to it on purpose.

- [ ] OpenAI API key (platform.openai.com) — `gpt-4o` needs a funded account, a few dollars is enough
- [ ] Gemini API key (aistudio.google.com) — free tier fine for dev
- [ ] `medicalHistorySchema.ts`, `nutritionPlanSchema.ts` (Section 5) — usable as-is from spec
- [ ] `llm.service.ts` — `extractMedicalHistory`, `getLLM(provider)`
- [ ] `fileParsing.service.ts` — not fully spec'd, branch by mimetype:
  - **Images** → base64, `image_url` — works as written in spec
  - **PDFs** → pass as native PDF file input to the SDK (OpenAI/Gemini both support this) — don't rasterize pages to images unless this route gives trouble
  - **CSV** → not multimodal at all; parse with `papaparse`/`csv-parse` into plain text/table, send as a text-only prompt through the same extraction path
- [ ] Manually test extraction against 2–3 sample files per type — tune the prompt here
- [ ] Unit tests: mock the LLM client, assert your service correctly shapes/validates the response

**End of day check:** all three file types produce valid `MedicalHistory` JSON that passes the Zod schema.

---

## Day 3 — Nutrition plan, full wiring, tests, UI start, first merge to `main`

- [ ] `generateNutritionPlan` in `llm.service.ts`
- [ ] Wire `processHistoryAsync` — upload → extract → generate plan → save → status `analyzed`
- [ ] `GET /nutrition/:patientId/plan`, `POST /nutrition/plan`
- [ ] Integration tests: full upload→extract→plan flow with `supertest` + `mongodb-memory-server`, LLM mocked
- [ ] `npm test -- --coverage` — aim for 80% now, while it's still cheap to hit
- [ ] Start the React UI (Vite + TS): intake form + plan display screen, disclaimer banner built in from the start, not bolted on later
- [ ] **First merge to `main`**: open a PR from `develop` → `main`, review the diff yourself, merge. (No `prod.yml` yet, so this merge won't deploy anything — that's fine, it's just establishing `main` as "the real one" ahead of Day 5's deploy setup.)

**End of day check:** full flow works locally end to end, upload → wait → see avoid/eat plan in the UI, tests green, `main` updated.

---

## Day 4 — AWS infra (Secrets Manager, Elastic Beanstalk, ALB)

### Secrets Manager
- [ ] Store secret `ai-dietitian/dev/app-secrets`: `OPENAI_API_KEY`, `GEMINI_API_KEY`, `MONGODB_URI`, `API_KEY`
- [ ] Repeat for `ai-dietitian/prod/app-secrets`
- [ ] `scripts/load-secrets.js` — fetches the secret at container startup via `@aws-sdk/client-secrets-manager`, sets `process.env` before the app boots

### IAM role for EC2/EB (different from your Day 1 personal dev user)
- [ ] IAM → Roles → Create role → trusted entity EC2 → attach `AWSElasticBeanstalkWebTier` + inline policy scoped to `secretsmanager:GetSecretValue` on just those two ARNs + `s3:PutObject`/`s3:GetObject` on the upload buckets → name `ai-dietitian-eb-instance-role`
- [ ] This is what EB instances use — no access keys involved, unlike your local `.env` setup from Day 1

### Elastic Beanstalk
- [ ] Create application `ai-dietitian`, Platform: Docker
- [ ] Create environment (web server, load-balanced) — min 1/max 1 is fine for dev to save cost
- [ ] Set EC2 instance profile to `ai-dietitian-eb-instance-role`
- [ ] Confirm ALB + ASG are provisioned automatically by EB (you don't create these separately)
- [ ] Health check path → `/health`
- [ ] Repeat for a `ai-dietitian-prod` environment
- [ ] HTTPS/ACM needs a domain — skip it and use the default `.elasticbeanstalk.com` URL over HTTP unless you already own a domain; don't burn a day on Route 53 this week

**End of day check:** EB dev environment healthy, `/health` responds over its public URL.

---

## Day 5 — CI/CD deploy steps + frontend

### GitHub Actions deploy step
- [ ] Store AWS credentials as GitHub secrets (OIDC role if time allows, access key pair if not)
- [ ] Extend `dev.yml` and add `prod.yml` (Section 12) with the `beanstalk-deploy` action, gated behind the existing test step
- [ ] Push to `develop` → confirm it now deploys to `ai-dietitian-dev`, not just tests
- [ ] Push to `main` → confirm `prod.yml` deploys to `ai-dietitian-prod`

### Frontend
- [ ] `npm run build` → `dist/`
- [ ] S3 bucket `ai-dietitian-frontend-dev`, private, no static website hosting
- [ ] CloudFront distribution → origin = that bucket via Origin Access Control
- [ ] CodePipeline: Source (GitHub) → Build (CodeBuild: `npm ci && npm run build`) → Deploy (S3 sync + CloudFront invalidation)

**End of day check:** push to `main` → GH Actions deploys backend, CodePipeline deploys frontend, CloudFront URL loads the real UI talking to the real API.

---

## Day 6 — Buffer, prod pass, polish

- [ ] Fix whatever broke on Day 5 (CORS between CloudFront and EB is the most likely culprit — add the CloudFront URL to your Express CORS allowlist)
- [ ] Confirm prod, not just dev, works end to end
- [ ] If time remains: backend CodePipeline (Section 11.6, the redundant path — confirm with assessor first), SSE-KMS on S3, access logging
- [ ] Re-run the Section 16 checklist against what you actually built
- [ ] Record a short demo showing upload → wait → plan output, disclaimer visible

---

## If you fall behind, cut in this order
1. Backend CodePipeline (redundant with GH Actions — confirm with assessor)
2. HTTPS/ACM/custom domain (use default HTTP URLs)
3. CSV support (get image + PDF solid first — more impressive demo anyway)
4. Test coverage beyond ~60–70% (still ship the test files, just don't chase every branch)
5. Autoscaling tuning (min 1/max 1 is fine for a demo)

Don't cut: API key auth, the disclaimer in the UI, or the S3 bucket being private.