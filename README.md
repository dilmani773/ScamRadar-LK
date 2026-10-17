# ScamRadar LK

Multilingual (Sinhala, Tamil, Singlish, Tanglish, English) SMS and WhatsApp scam detector that protects first-time
mobile-banking users and welfare recipients in Sri Lanka, notices when scammers change tactics, and responds with an
alert, a safe fallback, a human-review queue and gated retraining.

> TensorForge 2.0 Final-Forge · Team Paradox · built on 17 October 2026 within the 6-hour window.

## Problem and users
TODO (Hareen): who is protected, how they are scammed, why now (CBSL "Be Scam Proof", SL-UDI).

## Architecture
TODO: diagram (`docs/architecture.png`).

Message → language detection + red flags → classifier (TF-IDF baseline, multilingual embeddings) → verdict →
prediction log (SQLite) → drift monitor (confidence, low-confidence share, novelty rate, language mix) →
response (alert, Suspicious fallback, review queue, retraining with an evaluation gate) → dashboard.

## Run it
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m ml.train                         # trains on data/processed, writes models/ and reports/metrics.json
uvicorn backend.app.main:app --reload --port 8000
```
Docker:
```bash
docker build -t scamradar .
docker run -p 8000:8000 scamradar
```
Frontend: see `frontend/README.md`. API contract: `docs/API.md`.

## Data sources and licences
| File | Rows | How it was made | Licence |
|---|---|---|---|
| `data/processed/train.csv` | TODO | TODO (hand-written / LLM-generated, prompts in `data/raw/`) | own, CC BY 4.0 |
| `data/processed/test.csv` | TODO | TODO (different prompt/style from train) | own |
| `data/processed/shifted.csv` | TODO | TODO (new tactic: SL-UDI) | own |
| `data/processed/shifted_eval.csv` | TODO | TODO | own |

No real personal data: no real phone numbers, NIC numbers, bank details or screenshots. Synthetic scam messages are
for training and testing only and are never sent to anyone.

## Evaluation results (held-out test set)
TODO: copy from `reports/metrics.json` (accuracy, macro-F1, scam recall, false alarm rate, per language).

## Monitoring and drift response
| Signal | Fires when |
|---|---|
| Mean confidence | Falls more than 0.10 below the held-out baseline |
| Low-confidence share | More than 2x baseline and above 10% |
| Novelty rate (distance from training data) | More than 2x baseline and above 10% |
| Language mix (PSI) | Above 0.20 |

Response: alert in the dashboard and `alerts` table; messages that are unfamiliar or low-confidence are never marked
Safe (fallback to Suspicious with "verify via the official hotline"); they go to the human review queue; reviewed
labels trigger retraining (`POST /api/retrain`), and the new model is promoted only if held-out macro-F1 does not drop
by more than 0.01 and accuracy on `shifted_eval.csv` does not fall.

TODO: before/after numbers from the drift demo.

## AI tools used
Claude (Anthropic) as a coding and writing assistant; LLM-generated synthetic data (see data table). Every team
member can explain the code.

## Templates reused
None yet. TODO: declare any personal templates (Dockerfile, Caddy config) if reused.

## Licence
MIT
