# Labels and data files

| Label | Meaning | In train/test? |
|---|---|---|
| `legit` | Real-looking normal messages: bank OTP notices, delivery updates, family/friends, welfare payment notices | yes (about 40%) |
| `bank_impersonation` | Fake bank / card / account-blocked messages asking for OTP, PIN or login | yes |
| `fake_prize` | Lottery, prize, reward or gift you did not enter for | yes |
| `parcel_fee` | Fake courier / customs fee to release a parcel | yes |
| `fake_job` | Work-from-home, part-time or overseas job asking for a fee | yes |
| `investment_scheme` | Pyramid, crypto, "double your money" schemes | yes |
| `loan_app` | Instant loan apps, fake loan approvals asking for a fee | yes |
| `welfare_scam` | Fake Aswesuma / welfare / pension payment messages | yes |
| `digital_id_scam` | SL-UDI digital ID activation / registration scams | **shifted only** (the new tactic) |

Files in `data/processed/` (columns: `text,label,language,channel`):

- `train.csv` about 3,000 rows, all six language forms (`si, ta, mixed, en, singlish, tanglish`)
- `test.csv` about 600 rows, **held out, written in a different style or with a different prompt than train**
- `shifted.csv` about 300 rows: the new scam wave (SL-UDI scams, more Tanglish, obfuscated links like `b1t.ly`, `l0gin`) used in the live drift demo and labelled in the review queue
- `shifted_eval.csv` about 100 rows from the same wave, never reviewed, used only by the retraining gate

Rules: no real phone numbers (use `07X-XXX-XXXX`), no real NIC or account numbers, no real people. Fictional bank
and courier names, clearly labelled synthetic. Record how each file was made in the README data table.
