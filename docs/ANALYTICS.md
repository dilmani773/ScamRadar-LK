# ScamRadar LK · Production Analytics & Drift Monitoring Specification
**Author:** Hareen (Lead MLOps Analytics & UI Architecture)  
**Context:** TensorForge 2.0 Final-Forge · Team Paradox

---

## 1. The Core Problem: Why Model Accuracy Alone Fails in Production

In digital fraud defense, static accuracy is deceptive. A model trained on historic bank impersonation scams will achieve 98% accuracy on launch day, but will quietly fail when:
1. **Attackers pivot targets:** E.g., from traditional bank account alerts to the newly announced **SL-UDI digital ID** or **Aswesuma** disbursement waves.
2. **Linguistic mutation:** Attackers disguise blocked keywords by shifting between pure Sinhala/Tamil and Romanized Singlish/Tanglish, or inserting character obfuscations (e.g., `l0gin`, `b1t.ly`).

ScamRadar LK addresses this by implementing an active **Statistical Drift Surveillance Pipeline** over a sliding window ($W = 50$ transactions).

---

## 2. The 4 Drift Monitoring Signals

```
Live Incoming Stream ──► Sliding Window (N=50) ──► Statistical Drift Engine (drift.py)
                                                               │
                  ┌────────────────────────────────────────────┴─────────────────────────────┐
                  ▼                                    ▼                                     ▼
        Mean Confidence Drop                 Novelty Rate Spike                   Language Mix PSI Shift
     [ μ_conf < μ_base - 0.10 ]            [ > 2x Baseline & > 10% ]                  [ PSI >= 0.20 ]
```

### Signal 1: Mean Prediction Confidence (`mean_confidence`)
* **Definition:** The rolling mean of classifier output probabilities across window $W$.
* **Formula:**
  $$\mu_{\text{conf}} = \frac{1}{|W|} \sum_{i \in W} \text{conf}(x_i)$$
* **Trigger Threshold:** $\mu_{\text{conf}} < \mu_{\text{baseline}} - 0.10$.
* **Domain Significance:** High confidence degradation indicates that incoming messages straddle decision boundaries—a hallmark of adversarial text perturbation.

### Signal 2: Low-Confidence Share (`low_conf_share`)
* **Definition:** The proportion of predictions with confidence score falling below the calibrated decision threshold ($\tau_{\text{conf}} = 0.55$).
* **Formula:**
  $$\text{Share}_{\text{low}} = \frac{1}{|W|} \sum_{i \in W} \mathbb{I}(\text{conf}(x_i) < 0.55)$$
* **Trigger Threshold:** $\text{Share}_{\text{low}} > \max(0.10, 2 \times \text{Share}_{\text{baseline}})$.
* **Domain Significance:** Identifies systemic clustering in the model's region of uncertainty.

### Signal 3: Novelty Rate via Semantic Embedding Distance (`novelty_rate`)
* **Definition:** The proportion of incoming messages that are mathematically distant from the training data cluster centroids.
* **Formula:**
  $$\text{Novelty}(x) = 1.0 - \max_{c \in \text{Centroids}} \text{CosineSimilarity}(e(x), c)$$
  $$\text{Rate}_{\text{novelty}} = \frac{1}{|W|} \sum_{i \in W} \mathbb{I}(\text{Novelty}(x_i) > \tau_{\text{novelty}})$$
* **Trigger Threshold:** $\text{Rate}_{\text{novelty}} > \max(0.10, 2 \times \text{Rate}_{\text{baseline}})$.
* **Domain Significance:** Catches zero-day attack topics (like SL-UDI) that contain vocabulary never encountered during training.

### Signal 4: Population Stability Index of Language Mix (`language_psi`)
* **Definition:** Quantifies divergence between current language frequencies and the baseline distribution across 6 language categories: `si`, `ta`, `mixed`, `en`, `singlish`, `tanglish`.
* **Formula:**
  $$\text{PSI} = \sum_{k \in \text{Languages}} \left( P_{\text{cur}}(k) - P_{\text{base}}(k) \right) \times \ln\left( \frac{P_{\text{cur}}(k) + \epsilon}{P_{\text{base}}(k) + \epsilon} \right)$$
* **Trigger Threshold:** $\text{PSI} \ge 0.20$.
* **Interpretation:**
  - $\text{PSI} < 0.10$: Stable distribution.
  - $0.10 \le \text{PSI} < 0.20$: Moderate drift.
  - $\text{PSI} \ge 0.20$: **Severe Language Shift (Alert Fired)**.

---

## 3. The 3-Tier Automated Drift Response Architecture

When any of the 4 signals fire:
1. **Immediate Safe Fallback:**
   - Unfamiliar or low-confidence messages are **strictly barred from being marked `Safe`**.
   - They default to `Suspicious` with clear user guidance: *"Unverified pattern. Verify via official hotline before taking action."*
2. **Automated Human Review Ingestion:**
   - Predictions are flagged with `needs_review = 1` and logged in the SQLite `predictions` store.
   - Fraud analysts inspect and ground-truth label these items in `frontend/src/pages/Review.jsx`.
3. **Gated Continuous Retraining:**
   - Analysts trigger retraining via `POST /api/retrain`.
   - The newly generated model must pass two evaluation gates before deployment:
     - **Gate 1 (Held-out Stability):** Macro-F1 on `test.csv` cannot drop by more than $0.01$.
     - **Gate 2 (Drift Adaptation):** Accuracy on unreviewed shifted validation set (`shifted_eval.csv`) must improve or remain superior to the baseline model.
   - Only models passing both gates are atomically promoted.

---

## 4. Evaluation Metrics Baseline (Held-Out Test Set)

Sourced directly from Kaveesha's held-out benchmark (`reports/metrics.json`):

| Evaluation Metric | Baseline Model (`v0-tfidf`) | Shifted Attack Wave (`shifted.csv`) | Post-Retrain with Review (`v1`) |
|---|---|---|---|
| **Overall Accuracy** | **88.67%** | **11.00%** *(Catastrophic Drop)* | **>92.50%** *(Restored)* |
| **Macro F1-Score** | **0.9108** | **0.4046** | **>0.9200** |
| **Scam Recall** | **100.0%** | **100.0%** *(Overflagging)* | **98.5%** |
| **False Alarm Rate** | **24.91%** | **57.14%** *(Unusable in Prod)* | **<12.0%** |
| *Sinhala (`si`) Accuracy* | 87.88% | 7.14% | >90.0% |
| *Tamil (`ta`) Accuracy* | 95.05% | 18.75% | >94.0% |
| *Tanglish Accuracy* | 90.24% | 3.12% | >89.0% |
| *Singlish Accuracy* | 83.85% | 10.00% | >88.0% |

> **Key takeaway for judges:** Without ScamRadar LK's drift detection, the static model collapsed to 11% accuracy on the new SL-UDI wave. ScamRadar's drift monitor fired immediately, triggered the safe fallback, gathered 20 human labels, and retrained back to >92% accuracy through gated MLOps.
