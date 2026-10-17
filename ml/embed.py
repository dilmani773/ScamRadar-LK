"""Frozen multilingual sentence embeddings (public model, used as-is, not fine-tuned).

Model: intfloat/multilingual-e5-small (Hugging Face, MIT licence).
Set E5_MODEL to a local folder to load offline, e.g.  $env:E5_MODEL = "C:\\Users\\WW\\Desktop\\e5-small"
Otherwise it downloads from Hugging Face on first use. E5 expects the prefix "query: " on every text.
"""
import hashlib
import os

import numpy as np

_MODEL = None


def model_name() -> str:
    return os.environ.get("E5_MODEL", "intfloat/multilingual-e5-small")


def _fake(texts):
    """Test-only stand-in (SCAMRADAR_FAKE_EMBED=1): deterministic hashed character trigrams, 384-dim."""
    out = np.zeros((len(texts), 384), dtype=np.float32)
    for i, t in enumerate(texts):
        t = t.lower()
        for j in range(len(t) - 2):
            out[i, int(hashlib.md5(t[j:j + 3].encode()).hexdigest(), 16) % 384] += 1
    return out / np.maximum(np.linalg.norm(out, axis=1, keepdims=True), 1e-9)


def encode(texts, batch_size: int = 64) -> np.ndarray:
    global _MODEL
    texts = list(texts)
    if os.environ.get("SCAMRADAR_FAKE_EMBED"):
        return _fake(texts)
    if _MODEL is None:
        from sentence_transformers import SentenceTransformer
        _MODEL = SentenceTransformer(model_name(), device="cpu")
    return _MODEL.encode(["query: " + t for t in texts], batch_size=batch_size,
                         normalize_embeddings=True, show_progress_bar=False)
