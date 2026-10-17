"""Extra training data: normal (legit) bank transaction alerts.

Why: train.csv had almost no real-looking credit / debit / ATM / salary alerts, so the model read normal bank
alerts as bank_impersonation. These messages fill that gap. They contain no links, no OTP requests, no fee requests
and no phone numbers, like real alerts. All banks, places, names and numbers are fictional.

Writes data/processed/train_alerts.csv (TRAINING ONLY; test.csv and shifted files are not touched).
ml/train.py adds this file to train.csv automatically when it exists.

    python -m ml.legit_alerts
"""
import csv
import random
from pathlib import Path

SEED = 17
N = 300
OUT = Path("data/processed/train_alerts.csv")

BANKS = ["Lanka Pragathi Bank", "Ruhunu Saviya Bank", "Isuru Finance", "Ceylon Udaya Bank", "Mahaweli Bank"]
PLACES = ["City Mart Colombo", "Fuel Station Kandy", "Pharmacy Galle", "Super Saver Matara", "Book Shop Jaffna",
          "Food City Kurunegala", "Online Store", "Hardware Negombo"]
BILLS = ["electricity", "water", "mobile", "internet", "insurance"]
NAMES = ["K. PERERA", "S. KUMAR", "N. FERNANDO", "R. SILVA", "M. RAHMAN", "T. SIVA"]
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

T = {
    "en": [
        "{bank}: Your account {acct} has been credited with LKR {amt} on {date}. Avl bal: LKR {bal}.",
        "{bank}: LKR {amt} debited from A/C {acct} at {place} on {date}. Balance LKR {bal}.",
        "{bank}: Cash withdrawal of LKR {amt} at ATM {place} on {date}. Avl bal LKR {bal}.",
        "{bank}: Salary of LKR {amt} credited to your account {acct}. Ref {ref}.",
        "{bank}: Your {bill} bill payment of LKR {amt} was successful. Ref {ref}.",
        "{bank}: Transfer of LKR {amt} received from {name} to A/C {acct} on {date}.",
        "{bank}: Card {acct} used for LKR {amt} at {place}. If this was not you, call the number on the back of your card.",
        "{bank}: Your loan installment of LKR {amt} was paid on {date}. Thank you.",
    ],
    "si": [
        "{bank}: ඔබගේ ගිණුම {acct} වෙත රු. {amt} බැර කර ඇත. {date}. ශේෂය රු. {bal}.",
        "{bank}: ඔබගේ ගිණුමෙන් රු. {amt} හර කර ඇත ({place}). {date}. ශේෂය රු. {bal}.",
        "{bank}: ATM මගින් රු. {amt} මුදල් ලබා ගන්නා ලදී. {date}. ශේෂය රු. {bal}.",
        "{bank}: ඔබගේ වැටුප රු. {amt} ගිණුමට බැර විය. යොමු අංකය {ref}.",
        "{bank}: ඔබගේ {bill_si} බිල්පත රු. {amt} සාර්ථකව ගෙවා ඇත. යොමු අංකය {ref}.",
    ],
    "ta": [
        "{bank}: உங்கள் கணக்கு {acct} இல் ரூ. {amt} வரவு வைக்கப்பட்டது. {date}. இருப்பு ரூ. {bal}.",
        "{bank}: உங்கள் கணக்கிலிருந்து ரூ. {amt} பற்று வைக்கப்பட்டது ({place}). {date}. இருப்பு ரூ. {bal}.",
        "{bank}: ATM மூலம் ரூ. {amt} எடுக்கப்பட்டது. {date}. இருப்பு ரூ. {bal}.",
        "{bank}: உங்கள் சம்பளம் ரூ. {amt} கணக்கில் வரவு வைக்கப்பட்டது. குறிப்பு {ref}.",
        "{bank}: உங்கள் {bill_ta} கட்டணம் ரூ. {amt} வெற்றிகரமாக செலுத்தப்பட்டது. குறிப்பு {ref}.",
    ],
    "singlish": [
        "{bank}: oyage account {acct} ekata LKR {amt} credit una. {date}. Balance LKR {bal}.",
        "{bank}: oyage card eken LKR {amt} ka payment ekak una ({place}). Balance LKR {bal}.",
        "{bank}: oyage salary LKR {amt} account ekata awa. Ref {ref}.",
    ],
    "tanglish": [
        "{bank}: unga account {acct} la LKR {amt} credit aagiduchu. {date}. Balance LKR {bal}.",
        "{bank}: unga card la LKR {amt} payment aachu ({place}). Balance LKR {bal}.",
        "{bank}: unga salary LKR {amt} account la vandhuduchu. Ref {ref}.",
    ],
    "mixed": [
        "{bank}: ඔබගේ account {acct} එකට LKR {amt} credit වුණා. Balance LKR {bal}.",
        "{bank}: உங்கள் account {acct} இல் LKR {amt} credit ஆனது. Balance LKR {bal}.",
    ],
}
LANG_WEIGHT = {"en": 0.35, "si": 0.2, "ta": 0.15, "singlish": 0.12, "tanglish": 0.1, "mixed": 0.08}
BILL_SI = {"electricity": "විදුලි", "water": "ජල", "mobile": "ජංගම දුරකථන", "internet": "අන්තර්ජාල", "insurance": "රක්ෂණ"}
BILL_TA = {"electricity": "மின்சார", "water": "நீர்", "mobile": "கைபேசி", "internet": "இணைய", "insurance": "காப்பீட்டு"}


def money(rnd, lo, hi):
    return f"{rnd.randint(lo, hi) * 10:,}.{rnd.choice(['00', '50', '25', '75'])}"


def fill(tpl, rnd):
    bill = rnd.choice(BILLS)
    date = (f"{rnd.randint(1, 28):02d}-{rnd.choice(MONTHS)}-2026 {rnd.randint(6, 22):02d}:{rnd.randint(0, 59):02d}"
            if rnd.random() < 0.5 else f"2026-{rnd.randint(1, 12):02d}-{rnd.randint(1, 28):02d}")
    acct = rnd.choice(["XXXX{:04d}", "****{:04d}", "{:04d}XXXX"]).format(rnd.randint(1000, 9999))
    return tpl.format(bank=rnd.choice(BANKS), acct=acct, amt=money(rnd, 50, 25000), bal=money(rnd, 1000, 90000),
                      date=date, place=rnd.choice(PLACES), ref=f"{rnd.choice(['SAL', 'TRF', 'BIL', 'REF'])}{rnd.randint(10000, 99999)}",
                      bill=bill, bill_si=BILL_SI[bill], bill_ta=BILL_TA[bill], name=rnd.choice(NAMES))


def main():
    rnd = random.Random(SEED)
    langs, weights = zip(*LANG_WEIGHT.items())
    seen, rows = set(), []
    while len(rows) < N:
        lang = rnd.choices(langs, weights)[0]
        text = fill(rnd.choice(T[lang]), rnd)
        if text in seen:
            continue
        seen.add(text)
        rows.append({"text": text, "label": "legit", "language": lang, "channel": "sms"})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["text", "label", "language", "channel"])
        w.writeheader()
        w.writerows(rows)
    print(f"wrote {OUT} ({len(rows)} legit transaction alerts)")


if __name__ == "__main__":
    main()
