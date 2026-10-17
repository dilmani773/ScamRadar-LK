# ScamRadar LK · Frontend Execution Work Plan (Didulana)
> **Mode:** Starting Now (T = 0) · Execution-Driven & Milestone-Based  
> **Assignee:** Didulana (Frontend Lead & UI/UX Specialist)  
> **Strict Git Ownership:** `frontend/package.json`, `frontend/src/App.jsx` (routing & layout shell), `frontend/src/pages/Check*`, `frontend/src/pages/Monitor*`, `frontend/src/styles/`

---

## 1. Codebase Progress Audit (Current State)

| Component / Track | Owner | Current Status in Codebase | Readiness for Frontend |
|---|---|---|---|
| **Backend API** | Hiyumi | **Ready (`rules-v0` fallback active)**<br>FastAPI in `backend/app/main.py` is fully implemented with CORS, SQLite logging, drift calculation, and mock/rules fallback. | ✅ **100% Ready:** Frontend can start calling `POST /api/check`, `GET /health`, `GET /api/monitor`, `GET /api/alerts` immediately. |
| **ML & Data** | Kaveesha | **Pending training data**<br>`ml/train.py` is ready, but `data/processed/*.csv` and `models/model.joblib` are not yet committed. | ⚠️ **Non-blocking:** Backend's `Predictor._rules()` handles all 7 red flags & returns verdicts without the trained model. |
| **Review Page** | Hareen | **Not started**<br>`frontend/src/pages/Review*` and `components/AlertBanner*` are not yet created. | ℹ️ **Independent:** App shell will provide placeholder routing slot for Hareen. |
| **Frontend (Didulana)** | Didulana | **Not initialized (0%)**<br>No `package.json`, no Vite scaffold, no React components yet. Only documentation files exist. | 🚀 **Starting Now (T = 0)** |

---

## 2. Milestone-Driven Work Plan (Elapsed Time from T = 0)

### Milestone 1: Project Scaffold & Design System (T+0 to T+25 min)
* **Goal:** Initialize Vite React app, install dependencies, establish typography, and define global design tokens.
* **Tasks:**
  1. Scaffold React app inside `frontend/`:
     ```bash
     cd frontend
     npm create vite@latest . -- --template react
     npm install
     npm install recharts lucide-react
     ```
  2. Configure Google Fonts (`Inter`, `Noto Sans Sinhala`, `Noto Sans Tamil`, `JetBrains Mono`) in `index.html`.
  3. Define custom CSS design tokens in `src/index.css`:
     - Surfaces: Dark theme default (`#0B0F19`, `#111827`, `#1F2937`) with glassmorphism overlays.
     - Verdict colors: Scam Red (`#EF4444`), Suspicious Amber (`#F59E0B`), Safe Green (`#10B981`), Accent Blue (`#3B82F6`).
  4. Setup `src/App.jsx` with tabbed navigation:
     - `Check Message` (Didulana)
     - `Drift Monitor` (Didulana)
     - `Review Queue` (Slot reserved for Hareen's component)
* **Done When:** App runs cleanly at `http://localhost:5173` with responsive nav shell.

---

### Milestone 2: Check Page & Synthetic Presets (T+25 to T+60 min)
* **Goal:** Build the citizen-facing scam inspection interface with instant synthetic presets.
* **Tasks:**
  1. Build `src/pages/Check.jsx`:
     - Message textarea with live character counter (0/2000) and `Clear` button.
     - Channel selector pill group: `SMS` (default), `WhatsApp`, `Other`.
     - 4 One-click synthetic presets:
       - 🏷️ `Aswesuma Scam (Sinhala)`
       - 🏷️ `Bank Phishing (English)` (*Lanka Pragathi Bank*, `07X-XXX-XXXX`)
       - 🏷️ `Prize & Fee (Tanglish)`
       - 🏷️ `Legit Alert (Safe)`
  2. Implement **Verdict Card UX** with 3 distinct visual variants:
     - **Scam (Red):** `🚨 High Scam Probability Detected` + Sinhala/Tamil titles.
     - **Suspicious (Amber):** `⚠️ Suspicious / Unverified Message` (Safe fallback).
     - **Safe (Green):** `🛡️ Likely Legitimate Message`.
  3. Render separated metric badges: `"Risk {risk}% · Confidence {confidence}%"`.
  4. Build the **7 API Red Flags component** (`link`, `otp_request`, `urgency`, `money_request`, `prize`, `account_threat`, `phone_number`) rendering the exact `reason` from the backend.
  5. Add verified safety advice box: *"Call the official number on the back of your bank card"* + `1919`.
* **Done When:** User can click presets or paste text and see an interactive verdict card with red flags.

---

### Milestone 3: Real Backend Connection & Resilience (T+60 to T+90 min)
* **Goal:** Connect `POST /api/check` to the live FastAPI backend with shimmer loading and offline error handling.
* **Tasks:**
  1. Create `src/config.js` reading `VITE_API_URL` (defaulting to `http://localhost:8000`).
  2. Wire `POST /api/check`:
     ```javascript
     const res = await fetch(`${API_URL}/api/check`, {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ text, channel }),
     });
     ```
  3. Implement **Shimmer Loading Skeleton** while awaiting API response.
  4. Implement **Resilient Error State**:
     - Friendly notification: *"Can’t reach the ScamRadar service. Check your connection and retry."*
     - Retry CTA button.
* **Done When ("Golden Rule Milestone"):** Typing/pasting a Sinhala scam into the UI returns a live verdict from the backend.

---

### Milestone 4: Drift Monitoring Dashboard (T+90 to T+150 min)
* **Goal:** Build the real-time surveillance dashboard demonstrating model drift, automated safe-fallback, and retraining recovery.
* **Tasks:**
  1. Build `src/pages/Monitor.jsx`:
     - Top Drift Alert Banner (Visible when `drift === true`):
       - `"⚠️ DRIFT DETECTED · FALLBACK ACTIVE: Unfamiliar messages marked Suspicious & routed to review queue."`
     - Two simulation trigger buttons:
       - `[🧪 Simulate Normal Traffic]` -> `POST /api/simulate {"dataset": "test", "n": 50}`
       - `[🚨 Simulate New Scam Wave]` -> `POST /api/simulate {"dataset": "shifted", "n": 50}`
  2. Build **4 Metric Signal Cards Grid (`GET /api/monitor`)**:
     1. *Average Confidence* (`mean_confidence` — Alert if drops > 0.10)
     2. *Low-Confidence Share* (`low_conf_share` — Alert if > 10% and 2x baseline)
     3. *Unfamiliar Message Rate* (`novelty_rate` — Alert if > 10% unfamiliar)
     4. *Language Mix Drift* (`language_psi` — Alert if PSI ≥ 0.20)
     - Visual state: Green `OK` pill vs. Pulsing Red/Amber `DRIFT ALERT` badge.
  3. Build **Live Trend Chart (`GET /api/monitor/history?limit=100`)**:
     - Dual-axis `recharts` Area/Line chart:
       - Line 1: `confidence` (Blue/Emerald)
       - Line 2: `novelty` (Coral/Purple)
     - Custom tooltip showing message preview, language tag, and verdict.
* **Done When:** Clicking "Simulate New Scam Wave" flips signal cards to Alert and spikes novelty on the chart.

---

### Milestone 5: UI Polish & Demo Rehearsal (T+150 to T+190 min)
* **Goal:** Fine-tune aesthetics, test responsive mobile layouts, and record the walkthrough.
* **Tasks:**
  1. Header enhancements:
     - Active model version pill (`tfidf-...` or `rules-v0`) from `GET /health`.
     - Dark / Light mode toggle.
  2. Mobile responsiveness test (ensure 375px viewport on small devices works seamlessly).
  3. Demo run-through:
     - Reset logs: `POST /api/admin/reset-log`.
     - Test Citizen flow: Paste Sinhala Aswesuma SMS -> Check verdict -> Show advice.
     - Test Analyst flow: Show normal monitor -> Trigger scam wave -> Show drift alert & safe fallback -> Hiyumi/Hareen retrains -> Recovery.
  4. Assist with screen recording for the 3–5 minute pitch video.
* **Done When:** Complete walkthrough validated end-to-end without errors.

---

## 3. Git Safety Rules for Didulana
1. Only touch your owned files (`frontend/package.json`, `frontend/src/App.jsx`, `frontend/src/pages/Check*`, `frontend/src/pages/Monitor*`).
2. Never commit `node_modules/`, `.env`, or `.db`.
3. Commit every milestone:
   ```bash
   git status
   git add frontend/package.json frontend/src/...
   git commit -m "UI: <milestone description>"
   git pull --rebase
   git push
   ```
