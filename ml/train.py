"""Train the scam classifier, evaluate it, and save the model bundle used by the API.

    python -m ml.train                         # v0: TF-IDF + Logistic Regression
    python -m ml.train --v1                    # v1: TF-IDF + frozen multilingual-e5-small embeddings,
                                               #     language-aware blend weights
    python -m ml.train --include-reviewed --gate   # retrain with human-reviewed labels (keeps the current kind);
                                                   # promote only if the gate passes

CSV columns: text, label (legit or a scam type), optional language, channel.
Blend weights are tuned on a 15% split of TRAIN, never on the held-out test set.
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
from sklearn.model_selection import train_test_split
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.preprocessing import normalize

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from backend.app.textutils import LANGUAGE_GROUP, detect_language  # noqa: E402

LANGS = ["si", "ta", "mixed", "en", "singlish", "tanglish"]
GROUPS = ["native", "english", "roman"]
CONF_THRESHOLD = 0.55
GRID = [0.0, 0.25, 0.5, 0.75, 1.0]  # weight of TF-IDF; embeddings get 1 - w


def load(path: Path) -> pd.DataFrame | None:
    if not path.exists():
        return None
    df = pd.read_csv(path, keep_default_na=False)
    if "language" not in df:
        df["language"] = ""
    df["language"] = [l or detect_language(t) for t, l in zip(df["text"], df["language"])]
    return df


def build_tfidf() -> Pipeline:
    features = FeatureUnion([
        ("word", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, min_df=1)),
        ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True, min_df=2)),
    ])
    return Pipeline([("features", features),
                     ("clf", LogisticRegression(max_iter=3000, class_weight="balanced", C=5.0))])


def build_emb_clf() -> LogisticRegression:
    return LogisticRegression(max_iter=3000, class_weight="balanced", C=10.0)


# ---------------- inference for a trained bundle (same maths as backend/app/model.py) ----------------
def bundle_proba(b: dict, texts, langs):
    p_t = b["pipeline"].predict_proba(texts)
    if b.get("kind") != "ensemble":
        x = normalize(b["pipeline"].named_steps["features"].transform(texts))
        novelty = 1.0 - np.asarray((x @ b["nn_matrix"].T).max(1).todense()).ravel()
        return p_t, novelty
    from ml.embed import encode
    e = encode(texts)
    p_e = b["emb_clf"].predict_proba(e)
    w = np.array([b["weights"][LANGUAGE_GROUP[l]] for l in langs])[:, None]
    novelty = 1.0 - (e @ b["nn_emb"].T).max(1)
    return w * p_t + (1 - w) * p_e, novelty


def scores(b, df) -> dict:
    proba, novelty = bundle_proba(b, list(df["text"]), list(df["language"]))
    classes = b["pipeline"].classes_
    pred = classes[proba.argmax(1)]
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


def public(s):
    return {k: v for k, v in s.items() if not k.startswith("_")} if s else None


def fit_bundle(train: pd.DataFrame, v1: bool) -> dict:
    pipe = build_tfidf().fit(train["text"], train["label"])
    b = {"kind": "tfidf", "pipeline": pipe,
         "nn_matrix": normalize(pipe.named_steps["features"].transform(train["text"]))}
    if not v1:
        return b
    from ml.embed import encode, model_name
    # 1) tune language-aware weights on a split of TRAIN
    tr, va = train_test_split(train, test_size=0.15, random_state=0, stratify=train["label"])
    p_t = build_tfidf().fit(tr["text"], tr["label"]).predict_proba(va["text"])
    e_tr, e_va = encode(tr["text"]), encode(va["text"])
    p_e = build_emb_clf().fit(e_tr, tr["label"]).predict_proba(e_va)
    classes = np.array(sorted(train["label"].unique()))
    y_va, g_va = va["label"].values, np.array([LANGUAGE_GROUP[l] for l in va["language"]])
    weights = {}
    for g in GROUPS:
        m = g_va == g
        if not m.any():
            weights[g] = 0.5
            continue
        acc = {w: accuracy_score(y_va[m], classes[(w * p_t[m] + (1 - w) * p_e[m]).argmax(1)]) for w in GRID}
        best = max(acc.values())
        weights[g] = min((w for w in GRID if acc[w] == best), key=lambda w: abs(w - 0.5))
    print("language-aware TF-IDF weights:", weights)
    # 2) refit everything on the full training set
    e_all = encode(train["text"])
    b.update(kind="ensemble", emb_clf=build_emb_clf().fit(e_all, train["label"]), nn_emb=e_all,
             weights=weights, embed_model=model_name().split("/")[-1].split("\\")[-1])
    return b


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data/processed")
    ap.add_argument("--out", default="models/model.joblib")
    ap.add_argument("--v1", action="store_true", help="add multilingual-e5-small embeddings (ensemble)")
    ap.add_argument("--include-reviewed", action="store_true")
    ap.add_argument("--gate", action="store_true", help="promote only if the new model passes the gate")
    a = ap.parse_args()
    data, out = Path(a.data), Path(a.out)
    train, test = load(data / "train.csv"), load(data / "test.csv")
    shifted = load(data / "shifted_eval.csv")  # kept apart from the reviewed stream, so the gate is honest
    if shifted is None:
        shifted = load(data / "shifted.csv")
    if train is None or test is None:
        sys.exit("need data/processed/train.csv and test.csv")

    v1 = a.v1
    if a.include_reviewed:
        if out.exists() and joblib.load(out).get("kind") == "ensemble":
            v1 = True  # retraining keeps the current model kind
        from backend.app import db
        rev = pd.DataFrame(db.reviewed())
        if len(rev):
            rev = rev.rename(columns={"review_label": "label"})
            rev["language"] = [detect_language(t) for t in rev["text"]]
            train = pd.concat([train, rev[["text", "label", "language"]]], ignore_index=True)
            print(f"added {len(rev)} human-reviewed examples")

    b = fit_bundle(train, v1)
    s_test = scores(b, test)
    nov_thr = float(np.percentile(s_test["_novelty"], 95))
    baseline = {
        "mean_confidence": float(s_test["_confidence"].mean()),
        "low_conf_share": float((s_test["_confidence"] < CONF_THRESHOLD).mean()),
        "novelty_rate": float((s_test["_novelty"] > nov_thr).mean()),
        "language_mix": {l: float((test.language == l).mean()) for l in LANGS},
    }
    s_shift = scores(b, shifted) if shifted is not None else None
    prefix = "e5ens" if b["kind"] == "ensemble" else "tfidf"
    version = prefix + "-" + hashlib.sha1(f"{len(train)}{time.time()}".encode()).hexdigest()[:8]
    report = {"version": version, "kind": b["kind"], "trained_on": int(len(train)), "test": public(s_test),
              "shifted": public(s_shift), "weights": b.get("weights"),
              "thresholds": {"confidence": CONF_THRESHOLD, "novelty": round(nov_thr, 4)}}
    print(json.dumps(report, indent=1, ensure_ascii=False))

    if a.gate and out.exists() and Path("reports/metrics.json").exists():
        old = json.loads(Path("reports/metrics.json").read_text(encoding="utf-8"))
        keeps_test = report["test"]["macro_f1"] >= old["test"]["macro_f1"] - 0.01
        better_shift = (s_shift is None or old.get("shifted") is None
                        or report["shifted"]["accuracy"] >= old["shifted"]["accuracy"])
        report["gate"] = {"held_out_not_worse": keeps_test, "shifted_not_worse": better_shift,
                          "previous_version": old["version"]}
        if not (keeps_test and better_shift):
            print("GATE FAILED: keeping the current model")
            Path("reports/gate_rejected.json").write_text(json.dumps(report, indent=1, ensure_ascii=False),
                                                          encoding="utf-8")
            sys.exit(1)

    out.parent.mkdir(parents=True, exist_ok=True)
    b.update(version=version, novelty_threshold=nov_thr, confidence_threshold=CONF_THRESHOLD, baseline=baseline)
    joblib.dump(b, out)
    Path("reports").mkdir(exist_ok=True)
    Path("reports/metrics.json").write_text(json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")
    with Path("reports/history.jsonl").open("a", encoding="utf-8") as f:
        f.write(json.dumps({"ts": time.time(), **report}, ensure_ascii=False) + "\n")
    print(f"saved {out} ({version})")


if __name__ == "__main__":
    main()
