"""Loads the trained model bundle and turns a message into a verdict.

The bundle is written by `python -m ml.train` (see ml/train.py). Until a model exists the service still runs,
using red-flag rules only (model_version "rules-v0"), so the frontend can be built in parallel.
"""
import os
import threading
from pathlib import Path

import joblib
import numpy as np
from sklearn.preprocessing import normalize

from .textutils import detect_language, red_flags

ADVICE = {
    "Scam": "Do not reply, click links or share OTPs. Report it and contact your bank through its official number.",
    "Suspicious": "This looks unusual. Verify through the official hotline or website before you act.",
    "Safe": "No scam signs found. Still never share OTPs or passwords with anyone.",
}


class Predictor:
    def __init__(self, path: str | None = None):
        self.path = Path(path or os.environ.get("MODEL_PATH", "models/model.joblib"))
        self.lock = threading.Lock()
        self.bundle = None
        self.reload()

    def reload(self):
        with self.lock:
            self.bundle = joblib.load(self.path) if self.path.exists() else None

    @property
    def version(self) -> str:
        return self.bundle["version"] if self.bundle else "rules-v0"

    @property
    def thresholds(self) -> dict:
        if self.bundle:
            return {"confidence": self.bundle["confidence_threshold"], "novelty": self.bundle["novelty_threshold"]}
        return {"confidence": 0.6, "novelty": 0.8}

    @property
    def baseline(self) -> dict | None:
        return self.bundle.get("baseline") if self.bundle else None

    def _rules(self, text, flags):
        risk = min(1.0, 0.3 * len(flags))
        scam_type = "unknown_scam" if risk >= 0.35 else "legit"
        return risk, scam_type, 0.5, 0.0

    def _model(self, text):
        b = self.bundle
        proba = b["pipeline"].predict_proba([text])[0]
        classes = list(b["pipeline"].classes_)
        p_legit = proba[classes.index("legit")] if "legit" in classes else 0.0
        scam_idx = [i for i, c in enumerate(classes) if c != "legit"]
        top = max(scam_idx, key=lambda i: proba[i]) if scam_idx else int(np.argmax(proba))
        x = normalize(b["pipeline"].named_steps["features"].transform([text]))
        novelty = float(1.0 - (x @ b["nn_matrix"].T).max()) if b["nn_matrix"].shape[0] else 1.0
        return float(1.0 - p_legit), classes[top], float(proba.max()), novelty

    def predict(self, text: str) -> dict:
        flags = red_flags(text)
        with self.lock:
            risk, scam_type, confidence, novelty = self._model(text) if self.bundle else self._rules(text, flags)
        th = self.thresholds
        needs_review = confidence < th["confidence"] or novelty > th["novelty"]
        if needs_review and risk < 0.6:
            verdict = "Suspicious"  # safe fallback: an unfamiliar message is never marked Safe
        elif risk >= 0.6:
            verdict = "Scam"
        elif risk >= 0.35:
            verdict = "Suspicious"
        else:
            verdict = "Safe"
        return {
            "verdict": verdict,
            "scam_type": scam_type if verdict != "Safe" else "legit",
            "risk": round(risk, 4),
            "confidence": round(confidence, 4),
            "novelty": round(novelty, 4),
            "needs_review": bool(needs_review),
            "language": detect_language(text),
            "red_flags": flags,
            "advice": ADVICE[verdict],
            "model_version": self.version,
        }
