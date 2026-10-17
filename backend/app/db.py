"""SQLite prediction log, alerts and human-review labels."""
import os
import sqlite3
import threading
import time
from pathlib import Path

_LOCK = threading.Lock()


def _path() -> str:
    p = os.environ.get("DB_PATH", "runtime/scamradar.db")
    Path(p).parent.mkdir(parents=True, exist_ok=True)
    return p


def connect():
    con = sqlite3.connect(_path(), check_same_thread=False)
    con.row_factory = sqlite3.Row
    return con


def init():
    with _LOCK, connect() as con:
        con.executescript("""
        CREATE TABLE IF NOT EXISTS predictions(
          id INTEGER PRIMARY KEY AUTOINCREMENT, ts REAL, text TEXT, channel TEXT, language TEXT,
          verdict TEXT, scam_type TEXT, risk REAL, confidence REAL, novelty REAL, needs_review INTEGER,
          model_version TEXT, source TEXT, review_label TEXT, reviewed_ts REAL);
        CREATE TABLE IF NOT EXISTS alerts(
          id INTEGER PRIMARY KEY AUTOINCREMENT, ts REAL, signal TEXT, value REAL, baseline REAL,
          message TEXT, model_version TEXT);
        """)


def log_prediction(row: dict) -> int:
    with _LOCK, connect() as con:
        cur = con.execute(
            "INSERT INTO predictions(ts,text,channel,language,verdict,scam_type,risk,confidence,novelty,"
            "needs_review,model_version,source) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            (time.time(), row["text"], row.get("channel"), row["language"], row["verdict"], row["scam_type"],
             row["risk"], row["confidence"], row["novelty"], int(row["needs_review"]), row["model_version"],
             row.get("source", "user")))
        return cur.lastrowid


def recent(n: int) -> list[dict]:
    with connect() as con:
        rows = con.execute("SELECT * FROM predictions ORDER BY id DESC LIMIT ?", (n,)).fetchall()
    return [dict(r) for r in rows][::-1]


def add_alert(signal, value, baseline, message, model_version):
    with _LOCK, connect() as con:
        last = con.execute("SELECT ts FROM alerts WHERE signal=? ORDER BY id DESC LIMIT 1", (signal,)).fetchone()
        if last and time.time() - last["ts"] < 60:  # at most one alert per signal per minute
            return
        con.execute("INSERT INTO alerts(ts,signal,value,baseline,message,model_version) VALUES(?,?,?,?,?,?)",
                    (time.time(), signal, value, baseline, message, model_version))


def alerts(limit=20) -> list[dict]:
    with connect() as con:
        return [dict(r) for r in con.execute("SELECT * FROM alerts ORDER BY id DESC LIMIT ?", (limit,))]


def review_queue(limit=50) -> list[dict]:
    with connect() as con:
        rows = con.execute("SELECT id,ts,text,language,verdict,scam_type,confidence,novelty FROM predictions "
                           "WHERE needs_review=1 AND review_label IS NULL ORDER BY id DESC LIMIT ?", (limit,))
        return [dict(r) for r in rows]


def set_review(pid: int, label: str) -> bool:
    with _LOCK, connect() as con:
        cur = con.execute("UPDATE predictions SET review_label=?, reviewed_ts=? WHERE id=?", (label, time.time(), pid))
        return cur.rowcount == 1


def reviewed() -> list[dict]:
    with connect() as con:
        return [dict(r) for r in con.execute("SELECT text, review_label FROM predictions WHERE review_label IS NOT NULL")]


def reset():
    with _LOCK, connect() as con:
        con.executescript("DELETE FROM predictions; DELETE FROM alerts;")
