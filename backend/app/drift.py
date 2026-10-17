"""Drift monitor: compares the latest window of logged predictions with the baseline from the held-out test set.

Signals
  mean_confidence   falls by more than 0.10
  low_conf_share    share of predictions below the confidence threshold, more than 2x baseline (and > 0.10)
  novelty_rate      share of inputs far from the training data, more than 2x baseline (and > 0.10)
  language_psi      population stability index of the language mix (add-one smoothed), above 0.25
"""
import math
import os

from . import db

LANGS = ["si", "ta", "mixed", "en", "singlish", "tanglish"]


def _psi(cur: dict, base: dict, n: int) -> float:
    """PSI with add-one smoothing, so a language missing from a small window does not cause a false alarm."""
    total = 0.0
    for k in LANGS:
        a = (cur.get(k, 0) * n + 1) / (n + len(LANGS))
        b = max(base.get(k, 0), 1e-3)
        total += (a - b) * math.log(a / b)
    return total


def window_stats(rows: list[dict], conf_thr: float, nov_thr: float) -> dict:
    n = len(rows)
    if not n:
        return {"n": 0}
    mix = {k: sum(r["language"] == k for r in rows) / n for k in LANGS}
    return {
        "n": n,
        "mean_confidence": sum(r["confidence"] for r in rows) / n,
        "low_conf_share": sum(r["confidence"] < conf_thr for r in rows) / n,
        "novelty_rate": sum(r["novelty"] > nov_thr for r in rows) / n,
        "language_mix": mix,
        "scam_share": sum(r["verdict"] == "Scam" for r in rows) / n,
    }


def check(predictor, window: int | None = None) -> dict:
    window = window or int(os.environ.get("DRIFT_WINDOW", 50))
    th = predictor.thresholds
    cur = window_stats(db.recent(window), th["confidence"], th["novelty"])
    base = predictor.baseline
    signals = []
    if base and cur.get("n", 0) >= 10:
        rules = [
            ("mean_confidence", cur["mean_confidence"], base["mean_confidence"],
             cur["mean_confidence"] < base["mean_confidence"] - 0.10, "Average confidence is falling"),
            ("low_conf_share", cur["low_conf_share"], base["low_conf_share"],
             cur["low_conf_share"] > max(0.10, 2 * base["low_conf_share"]), "More low-confidence predictions"),
            ("novelty_rate", cur["novelty_rate"], base["novelty_rate"],
             cur["novelty_rate"] > max(0.10, 2 * base["novelty_rate"]), "Many messages unlike the training data"),
            ("language_psi", _psi(cur["language_mix"], base["language_mix"], cur["n"]), 0.0,
             _psi(cur["language_mix"], base["language_mix"], cur["n"]) > 0.25, "Language mix has shifted"),
        ]
        for name, value, baseline, fired, msg in rules:
            signals.append({"signal": name, "value": round(value, 4), "baseline": round(baseline, 4),
                            "status": "alert" if fired else "ok", "message": msg})
            if fired:
                db.add_alert(name, value, baseline, msg, predictor.version)
    drifting = any(s["status"] == "alert" for s in signals)
    return {"window": window, "current": cur, "baseline": base, "signals": signals, "drift": drifting,
            "response": ("Fallback active: unfamiliar messages are marked Suspicious and sent to human review. "
                         "Label the review queue, then retrain.") if drifting else "Normal operation."}