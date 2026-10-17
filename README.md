# ScamRadar LK 🛡️

Multilingual (Sinhala, Tamil, Singlish, Tanglish, English) SMS and WhatsApp scam detector that protects first-time
mobile-banking users and welfare recipients in Sri Lanka, notices when scammers change tactics, and responds with an
alert, a safe fallback, a human-review queue and gated retraining.

> TensorForge 2.0 Final-Forge · Team Paradox · built on 17 October 2026 within the 6-hour window.

---

## Problem and Users

In June 2026, the **Central Bank of Sri Lanka (CBSL)** launched the nationwide **"Be Scam Proof"** initiative in response to surging digital fraud, illegal micro-loan applications, and unauthorized OTP harvesting.

### Who is Protected?
- **1.25 Million Aswesuma Welfare Beneficiaries & Rural Pensioners:** Low-income families receiving direct digital government disbursements who are frequently targeted by fake payment-release notices and upfront processing fee demands.
- **4.8 Million First-Time Mobile Banking Users:** Sri Lankan citizens adopting mobile payment apps (LankaQR, CEFT) who struggle to differentiate legitimate bank notifications from deceptive spoofing attempts.
- **Citizens Enrolling in SL-UDI:** With Sri Lanka accelerating the rollout of the **Unique Digital Identity (SL-UDI)** framework, scammers have launched zero-day phishing campaigns claiming citizen digital IDs will be revoked unless biometrics are confirmed on deceptive phishing portals.

### The Technical Challenge
Standard spam filters fail silently in Sri Lanka because:
1. Scammers switch seamlessly between Sinhala, Tamil, English, and Romanized vernacular (**Singlish** and **Tanglish**).
2. Threat patterns drift rapidly when new national programs launch. Static models trained only on old data will quietly degrade, exposing vulnerable users to catastrophic loss.

---

## Architecture

![ScamRadar LK Architecture](docs/architecture.svg)

```
Message ──► Language Detection + Red Flags ──► Classifier (TF-IDF Baseline + Multilingual E5) ──► Verdict
                                                                                                      │
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┘
▼
Prediction Log (SQLite) ──► Drift Monitor (Confidence, Low-Confidence Share, Novelty Rate, Language PSI)
                                    │
                                    ▼ (When Drift Alert Fires)
Response Engine ──► Active Alert Banner ──► Safe Fallback (Suspicious) ──► Human Review Queue
                                                                                   │
                                                                                   ▼
                                                             Gated Retraining (Gate: ΔF1 ≥ -0.01) ──► v1 Promoted
```

Detailed architectural breakdowns, mathematical formulas, and metric derivations are documented in [`docs/ANALYTICS.md`](docs/ANALYTICS.md) and the [`docs/IMPACT_STATEMENT.md`](docs/IMPACT_STATEMENT.md).

---

## Run it

### Local Setup (Windows / Linux / macOS)
```powershell
# 1. Activate virtual environment
.\.venv\Scripts\Activate.ps1    # On Linux/macOS: source .venv/bin/activate

# 2. Install pinned dependencies
pip install -r requirements.txt

# 3. Train the baseline model (generates models/ and reports/metrics.json)
python -m ml.train

# 4. Start the FastAPI backend
uvicorn backend.app.main:app --reload --port 8000
```

### Docker
```bash
docker build -t scamradar .
docker run -p 8000:8000 scamradar
```

### Frontend
See [`frontend/README.md`](frontend/README.md). API contract: [`docs/API.md`](docs/API.md).

---

## Data Sources and Licences

All datasets were generated during the 6-hour build window and strictly adhere to Sri Lanka's **Personal Data Protection Act (PDPA No. 9 of 2022)**. No real phone numbers, NIC numbers, or identifiable financial records are contained. Synthetic phone numbers follow the fictional format `07X-XXX-XXXX`.

| File | Rows | Description & Generation Method | Licence |
|---|---|---|---|
| `data/processed/train.csv` | 3,000 | Synthetic trilingual dataset covering all 8 initial categories (`legit`, `bank_impersonation`, `fake_prize`, `parcel_fee`, `fake_job`, `investment_scheme`, `loan_app`, `welfare_scam`) across 6 language forms (`si`, `ta`, `mixed`, `en`, `singlish`, `tanglish`). Created via expert seed templates expanded with LLMs (Claude 3.5 Sonnet). | CC BY 4.0 |
| `data/processed/test.csv` | 600 | **Held-out test set** with distinct linguistic styles, diverse sentence lengths, and novel edge cases not present in training. | CC BY 4.0 |
| `data/processed/shifted.csv` | 300 | **Novel scam wave (Drift Demo)**: Simulates a zero-day attack campaign featuring fake **SL-UDI Digital ID** verification messages, heavy Tanglish vernacular, and character-obfuscated links (`l0gin`, `b1t.ly`). | CC BY 4.0 |
| `data/processed/shifted_eval.csv` | 100 | Unreviewed validation partition from the shifted wave, reserved exclusively for the automated MLOps retraining evaluation gate. | CC BY 4.0 |

---

## Evaluation Results (Held-Out Test Set)

Sourced directly from [`reports/metrics.json`](reports/metrics.json):

* **Trained on:** 3,000 samples
* **Held-out Test Size:** 600 samples
* **Overall Accuracy:** **88.67%**
* **Macro F1-Score:** **0.9108**
* **Scam Recall:** **100.0%** (Zero scams mistakenly classified as Safe)
* **False Alarm Rate:** **24.91%**

### Accuracy by Language Form
| Language Form | Accuracy |
|---|---|
| **Sinhala (`si`)** | 87.88% |
| **Tamil (`ta`)** | 95.05% |
| **Code-Mixed (`mixed`)** | 97.37% |
| **English (`en`)** | 86.71% |
| **Singlish (`singlish`)** | 83.85% |
| **Tanglish (`tanglish`)** | 90.24% |

---

## Monitoring and Drift Response

ScamRadar LK tracks four production signals over a sliding window ($W = 50$ requests) comparing live inputs to the test baseline:

| Signal | Mathematical Trigger | Meaning & Operational Impact |
|---|---|---|
| **Mean Confidence** | $\mu_{\text{conf}} < \mu_{\text{base}} - 0.10$ | Average prediction certainty is degrading due to rephrased scam patterns. |
| **Low-Confidence Share** | $> 10\%$ and $> 2\times$ Baseline | Clustering of predictions near the decision boundary ($\text{conf} < 0.55$). |
| **Novelty Rate** | $> 10\%$ and $> 2\times$ Baseline | Inputs exhibit large semantic embedding distance from training centroids. |
| **Language Mix (PSI)** | $\text{PSI} \ge 0.20$ | Population Stability Index indicates an influx of unrepresented language/script forms. |

### Drift Demonstration Numbers (Before vs. After Retraining)
When the novel SL-UDI scam wave is replayed through the baseline model without drift protection:
- **Baseline Accuracy on Shifted Data:** Plummets to **11.00%** (Catastrophic Failure).
- **False Alarm Rate:** Escalates to **57.14%**.
- **Automated Defense Engaged:** The drift monitor fires `novelty_rate` and `language_psi` alerts, automatically falling back to `Suspicious` and routing messages to the human review queue.
- **Post-Retrain Recovery:** After labelling 20 samples in `Review.jsx` and passing the retraining gate ($\Delta \text{Macro-F1} \ge -0.01$), the promoted model restores accuracy on the shifted wave to **>92.5%**.

---

## AI Tools Declared

In compliance with Rule 3 of TensorForge 2.0:
- **Google Antigravity / Claude 3.5 Sonnet:** Architecture planning, synthetic dataset expansion, documentation, and frontend UI design system.
- All code, logic, MLOps gates, and drift mathematics are fully understood and can be defended by every team member in the viva.

## Templates Reused
- Minimal FastAPI scaffold and starter Dockerfile declared at repository initialization.

## Licence
MIT License · Team Paradox 2026.
