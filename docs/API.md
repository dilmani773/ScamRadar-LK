# ScamRadar LK API contract

Base URL (local): `http://localhost:8000`. All bodies are JSON. The frontend can build against these
examples before the real model exists; the API already runs with a rules-only fallback.

## GET /health
```json
{"status": "ok", "model_version": "tfidf-bc6edb9b", "model_loaded": true}
```

## POST /api/check
Request:
```json
{"text": "Your account will be blocked. Send OTP to 071 234 5678 within 24 hours http://x.xyz", "channel": "sms"}
```
`channel` is `sms`, `whatsapp` or `other`.

Response:
```json
{
  "id": 1,
  "verdict": "Scam",
  "scam_type": "bank_impersonation",
  "risk": 0.93,
  "confidence": 0.71,
  "novelty": 0.42,
  "needs_review": true,
  "language": "en",
  "red_flags": [
    {"flag": "link", "reason": "Contains a link. Banks and government offices never ask you to log in through an SMS link."},
    {"flag": "otp_request", "reason": "Asks for an OTP, PIN or password. Never share these with anyone."}
  ],
  "advice": "Do not reply, click links or share OTPs. Report it and contact your bank through its official number.",
  "model_version": "tfidf-bc6edb9b"
}
```
`verdict`: `Scam` (red), `Suspicious` (amber), `Safe` (green). `language`: `si`, `ta`, `mixed`, `en`, `singlish`, `tanglish`.
When `needs_review` is true and the risk is not high, the verdict is `Suspicious` (safe fallback, never `Safe`).

## GET /api/monitor
```json
{
  "window": 50,
  "drift": true,
  "response": "Fallback active: unfamiliar messages are marked Suspicious and sent to human review. Label the review queue, then retrain.",
  "current": {"n": 50, "mean_confidence": 0.44, "low_conf_share": 0.98, "novelty_rate": 1.0,
              "scam_share": 0.9, "language_mix": {"si": 0.5, "ta": 0, "mixed": 0, "en": 0, "singlish": 0, "tanglish": 0.5}},
  "baseline": {"mean_confidence": 0.93, "low_conf_share": 0.0, "novelty_rate": 0.05,
               "language_mix": {"si": 0.33, "ta": 0, "mixed": 0, "en": 0.4, "singlish": 0.27, "tanglish": 0}},
  "signals": [
    {"signal": "mean_confidence", "value": 0.44, "baseline": 0.93, "status": "alert", "message": "Average confidence is falling"},
    {"signal": "low_conf_share", "value": 0.98, "baseline": 0.0, "status": "alert", "message": "More low-confidence predictions"},
    {"signal": "novelty_rate", "value": 1.0, "baseline": 0.05, "status": "alert", "message": "Many messages unlike the training data"},
    {"signal": "language_psi", "value": 4.1, "baseline": 0.0, "status": "alert", "message": "Language mix has shifted"}
  ]
}
```
Before a model exists, `baseline` is `null` and `signals` is empty.

## GET /api/monitor/history?limit=200
List of the latest predictions, oldest first, for charts:
```json
[{"id": 17, "ts": 1792200000.1, "confidence": 0.45, "novelty": 0.69, "verdict": "Scam", "language": "tanglish",
  "source": "simulate:shifted", "model_version": "tfidf-bc6edb9b"}]
```

## GET /api/alerts
```json
[{"id": 1, "ts": 1792200000.2, "signal": "novelty_rate", "value": 1.0, "baseline": 0.05,
  "message": "Many messages unlike the training data", "model_version": "tfidf-bc6edb9b"}]
```

## GET /api/review
Messages waiting for a human label:
```json
[{"id": 56, "ts": 1792200000.3, "text": "ඔබගේ SL-UDI ...", "language": "si", "verdict": "Scam",
  "scam_type": "bank_impersonation", "confidence": 0.43, "novelty": 0.64}]
```

## POST /api/review/{id}
```json
{"label": "digital_id_scam"}
```
→ `{"id": 56, "label": "digital_id_scam"}`. Labels: `legit` or a scam type (see `ml/LABELS.md`).

## POST /api/simulate (drift demo)
```json
{"dataset": "shifted", "n": 50}
```
`dataset`: `test` (normal traffic) or `shifted` (new scam wave). Returns `{"dataset", "n", "accuracy", "monitor"}`.

## POST /api/retrain · GET /api/retrain
POST starts retraining with the reviewed labels in the background (`{"status": "started"}`; 409 if already running).
GET returns `{"status": "idle|running|done|failed", "started", "finished", "log", "model_version"}`.
The new model is promoted only if it passes the evaluation gate.

## POST /api/admin/reset-log
Clears predictions and alerts before a live demo.
