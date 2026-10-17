"""Train the scam classifier, evaluate it, and save the model bundle used by the API.

    python -m ml.train                       # train on data/processed/train.csv
    python -m ml.train --include-reviewed --gate   # retrain with human-reviewed labels; promote only if better

CSV columns: text, label (legit or a scam type), optional language, channel.
"""
import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.preprocessing import normalize

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from backend.app.textutils import detect_language  # noqa: E402

LANGS = ["si", "ta", "mixed", "en", "singlish", "tanglish"]
CONF_THRESHOLD = 0.55


def load(path: Path) -> pd.DataFrame | None:
    if not path.exists():
        return None
    df = pd.read_csv(path, keep_default_na=False)
    if "language" not in df or (df["language"] == "").any():
        df["language"] = [l or detect_language(t) for t, l in zip(df["text"], df.get("language", [""] * len(df)))]
    return df


def build() -> Pipeline:
    features = FeatureUnion([
        ("word", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, min_df=1)),
        ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True, min_df=2)),
    ])
    return Pipeline([("features", features),
                     ("clf", LogisticRegression(max_iter=3000, class_weight="balanced", C=5.0))])


def scores(pipe, nn, df) -> dict:
    proba = pipe.predict_proba(df["text"])
    pred = pipe.classes_[proba.argmax(1)]
    x = normalize(pipe.named_steps["features"].transform(df["text"]))
    novelty = 1.0 - np.asarray((x @ nn.T).max(1).todense()).ravel()
    y = df["label"].values
    is_scam, pred_scam = y != "legit", pred != "legit"
    by_lang = {l: round(float(accuracy_score(y[df.language == l], pred[df.language == l])), 4)
               for l in LANGS if (df.language == l).any()}
    return {
        "n": int(len(df)),
        "accuracy": round(float(accuracy_score(y, pred)), 4),
        "macro_f1": round(float(f1_score(y, pred, average="macro")), 4),
        "scam_recall": round(float((pred_scam & is_scam).sum() / max(1, is_scam.sum())), 4),
        "false_alarm_rate": round(float((pred_scam & ~is_scam).sum() / max(1, (~is_scam).sum())), 4),
        "accuracy_by_language": by_lang,
        "_confidence": proba.max(1), "_novelty": novelty,
    }


def public(s: dict) -> dict:
    return {k: v for k, v in s.items() if not k.startswith("_")}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data/processed")
    ap.add_argument("--out", default="models/model.joblib")
    ap.add_argument("--include-reviewed", action="store_true")
    ap.add_argument("--gate", action="store_true", help="promote only if the new model passes the gate")
    a = ap.parse_args()
    data = Path(a.data)
    train, test = load(data / "train.csv"), load(data / "test.csv")
    # shifted_eval.csv is kept apart from the shifted stream that analysts review, so the gate is honest
    shifted = load(data / "shifted_eval.csv")
    if shifted is None:
        shifted = load(data / "shifted.csv")
    if train is None or test is None:
        sys.exit("need data/processed/train.csv and test.csv")

    if a.include_reviewed:
        from backend.app import db
        rev = pd.DataFrame(db.reviewed())
        if len(rev):
            rev = rev.rename(columns={"review_label": "label"})
            rev["language"] = [detect_language(t) for t in rev["text"]]
            train = pd.concat([train, rev[["text", "label", "language"]]], ignore_index=True)
            print(f"added {len(rev)} human-reviewed examples")

    pipe = build().fit(train["text"], train["label"])
    nn = normalize(pipe.named_steps["features"].transform(train["text"]))
    s_test = scores(pipe, nn, test)
    novelty_threshold = float(np.percentile(s_test["_novelty"], 95))
    baseline = {
        "mean_confidence": float(s_test["_confidence"].mean()),
        "low_conf_share": float((s_test["_confidence"] < CONF_THRESHOLD).mean()),
        "novelty_rate": float((s_test["_novelty"] > novelty_threshold).mean()),
        "language_mix": {l: float((test.language == l).mean()) for l in LANGS},
    }
    s_shift = scores(pipe, nn, shifted) if shifted is not None else None
    version = "tfidf-" + hashlib.sha1(str(len(train)).encode() + str(time.time()).encode()).hexdigest()[:8]
    report = {"version": version, "trained_on": int(len(train)), "test": public(s_test),
              "shifted": public(s_shift) if s_shift else None,
              "thresholds": {"confidence": CONF_THRESHOLD, "novelty": round(novelty_threshold, 4)}}
    print(json.dumps(report, indent=1, ensure_ascii=False))

    out = Path(a.out)
    if a.gate and out.exists():
        old = json.loads(Path("reports/metrics.json").read_text()) if Path("reports/metrics.json").exists() else None
        if old:
            keeps_test = report["test"]["macro_f1"] >= old["test"]["macro_f1"] - 0.01
            better_shift = (s_shift is None or old.get("shifted") is None
                            or report["shifted"]["accuracy"] >= old["shifted"]["accuracy"])
            report["gate"] = {"held_out_not_worse": keeps_test, "shifted_not_worse": better_shift,
                              "previous_version": old["version"]}
            if not (keeps_test and better_shift):
                print("GATE FAILED: keeping the current model")
                Path("reports/gate_rejected.json").write_text(json.dumps(report, indent=1, ensure_ascii=False))
                sys.exit(1)

    out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"version": version, "pipeline": pipe, "nn_matrix": nn, "novelty_threshold": novelty_threshold,
                 "confidence_threshold": CONF_THRESHOLD, "baseline": baseline}, out)
    Path("reports").mkdir(exist_ok=True)
    Path("reports/metrics.json").write_text(json.dumps(report, indent=1, ensure_ascii=False))
    with Path("reports/history.jsonl").open("a", encoding="utf-8") as f:
        f.write(json.dumps({"ts": time.time(), **report}, ensure_ascii=False) + "\n")
    print(f"saved {out} ({version})")


if __name__ == "__main__":
    main()
