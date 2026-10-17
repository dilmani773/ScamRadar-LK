"""ScamRadar LK API. Run: uvicorn backend.app.main:app --reload --port 8000"""
import csv
import logging
import os
import random
import subprocess
import sys
import threading
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import db, drift
from .model import Predictor

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("scamradar")

app = FastAPI(title="ScamRadar LK", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
                   allow_methods=["*"], allow_headers=["*"])

db.init()
predictor = Predictor()
RETRAIN = {"status": "idle", "started": None, "finished": None, "log": ""}


class CheckIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    channel: str = Field(default="sms", pattern="^(sms|whatsapp|other)$")


class ReviewIn(BaseModel):
    label: str = Field(min_length=1, max_length=40)  # "legit" or a scam type


class SimulateIn(BaseModel):
    dataset: str = Field(default="test", pattern="^(test|shifted)$")
    n: int = Field(default=50, ge=1, le=500)


def _check(text: str, channel: str, source: str) -> dict:
    out = predictor.predict(text)
    out["id"] = db.log_prediction({**out, "text": text, "channel": channel, "source": source})
    log.info("prediction id=%s verdict=%s type=%s conf=%.2f novelty=%.2f lang=%s",
             out["id"], out["verdict"], out["scam_type"], out["confidence"], out["novelty"], out["language"])
    return out


@app.get("/health")
def health():
    return {"status": "ok", "model_version": predictor.version, "model_loaded": predictor.bundle is not None}


@app.post("/api/check")
def check(body: CheckIn):
    return _check(body.text, body.channel, "user")


@app.get("/api/monitor")
def monitor():
    return drift.check(predictor)


@app.get("/api/monitor/history")
def history(limit: int = 200):
    rows = db.recent(min(limit, 2000))
    return [{"id": r["id"], "ts": r["ts"], "confidence": r["confidence"], "novelty": r["novelty"],
             "verdict": r["verdict"], "language": r["language"], "source": r["source"],
             "model_version": r["model_version"]} for r in rows]


@app.get("/api/alerts")
def alerts():
    return db.alerts()


@app.get("/api/review")
def review_queue():
    return db.review_queue()


@app.post("/api/review/{pid}")
def review(pid: int, body: ReviewIn):
    if not db.set_review(pid, body.label):
        raise HTTPException(404, "prediction not found")
    return {"id": pid, "label": body.label}


@app.post("/api/simulate")
def simulate(body: SimulateIn):
    """Replay messages from data/processed/<dataset>.csv through the live model (drift demo)."""
    path = Path("data/processed") / f"{body.dataset}.csv"
    if not path.exists():
        raise HTTPException(404, f"{path} not found")
    rows = list(csv.DictReader(path.open(encoding="utf-8")))
    sample = random.sample(rows, min(body.n, len(rows)))
    results = [_check(r["text"], r.get("channel") or "sms", f"simulate:{body.dataset}") for r in sample]
    correct = sum((r["scam_type"] == s["label"]) or (s["label"] == "legit" and r["verdict"] == "Safe")
                  for r, s in zip(results, sample))
    return {"dataset": body.dataset, "n": len(sample), "accuracy": round(correct / len(sample), 4),
            "monitor": drift.check(predictor)}


def _run_retrain():
    RETRAIN.update(status="running", started=time.time(), finished=None, log="")
    proc = subprocess.run([sys.executable, "-m", "ml.train", "--include-reviewed", "--gate"],
                          capture_output=True, text=True)
    RETRAIN["log"] = (proc.stdout + proc.stderr)[-4000:]
    predictor.reload()
    RETRAIN.update(status="done" if proc.returncode == 0 else "failed", finished=time.time())
    log.info("retrain finished status=%s model=%s", RETRAIN["status"], predictor.version)


@app.post("/api/retrain")
def retrain():
    if RETRAIN["status"] == "running":
        raise HTTPException(409, "retraining already running")
    threading.Thread(target=_run_retrain, daemon=True).start()
    return {"status": "started"}


@app.get("/api/retrain")
def retrain_status():
    return {**RETRAIN, "model_version": predictor.version}


@app.post("/api/admin/reset-log")
def reset_log():
    """Demo helper: clear predictions and alerts before a live demo."""
    db.reset()
    return {"status": "cleared"}
