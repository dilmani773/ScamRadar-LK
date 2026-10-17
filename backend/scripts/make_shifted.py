"""Generate the shifted datasets for the drift demo: data/processed/shifted.csv and shifted_eval.csv.

The "new scam wave" differs from the training data on purpose:
  - a new impersonation target: the SL-UDI digital ID (label digital_id_scam, never in train/test)
  - more Tanglish and code-mixed messages (language-mix shift)
  - obfuscated links such as b1t.ly and l0gin (novel tokens)
  - legit SL-UDI notices too, so the model must learn the difference rather than "SL-UDI = scam"

All messages are synthetic and template-based. No real phone numbers (07X-XXX-XXXX), NIC or account numbers.
shifted.csv is replayed in the live demo and labelled in the review queue; shifted_eval.csv is never reviewed and
is used only by the retraining gate. The two files share no identical text.

    python backend/scripts/make_shifted.py            # from the repo root
"""
import csv
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from backend.app.textutils import detect_language  # noqa: E402

SEED = 2026
N_SHIFTED, N_EVAL = 300, 100
OUT = ROOT / "data" / "processed"

LINKS = ["b1t.ly/udi-{r}", "sl-udi-verify.top/l0gin?id={r}", "gov-lk-udi.xyz/activate/{r}",
         "udi-reg1ster.info/{r}", "tinyurl.com/slud1{r}", "my-udi-lk.net/verify/{r}", "slud1.top/{r}"]
FEES = ["350", "500", "750", "1,200", "1,500"]
HOURS = ["12", "24", "48", "6"]
PHONE = "07X-XXX-XXXX"

# label -> list of (template, channel weight for whatsapp)
T = {
    "digital_id_scam": [
        # en
        "Your SL-UDI digital ID is not activated. Activate within {hours} hours or your welfare payments will stop: {link}",
        "SL-UDI notice: biometric verification pending. Pay Rs. {fee} processing fee at {link} to avoid suspension.",
        "Final reminder: Unique Digital Identity registration closes today. Verify your NIC and the code we sent at {link}",
        "Dear citizen, your digital ID card is ready. Pay the delivery charge Rs. {fee} via {link} Ref {ref}",
        "SL-UDI: a mismatch was found in your NIC record. Confirm with the code sent to your phone at {link}",
        # si
        "ඔබගේ SL-UDI ඩිජිටල් හැඳුනුම්පත තවමත් සක්‍රිය කර නැත. පැය {hours} ඇතුළත සක්‍රිය නොකළහොත් අස්වැසුම දීමනාව නවතිනු ඇත. {link}",
        "ඩිජිටල් හැඳුනුම්පත් ලියාපදිංචිය අද අවසන් වේ. ඔබගේ ජාතික හැඳුනුම්පත් අංකය සහ ලැබෙන කේතය මෙහි ඇතුළත් කරන්න {link}",
        "ඔබගේ නව ඩිජිටල් හැඳුනුම්පත සූදානම්. බෙදාහැරීමේ ගාස්තුව රු. {fee} ගෙවන්න {link}",
        "SL-UDI දැනුම්දීම: ඔබගේ ජෛවමිතික තොරතුරු තහවුරු කර නැත. වහාම {phone} අංකයට අමතන්න.",
        # ta
        "உங்கள் SL-UDI டிஜிட்டல் அடையாள அட்டை இன்னும் செயல்படுத்தப்படவில்லை. {hours} மணி நேரத்திற்குள் செயல்படுத்தாவிட்டால் உங்கள் நலன்புரி கொடுப்பனவு நிறுத்தப்படும். {link}",
        "டிஜிட்டல் அடையாள பதிவு இன்று முடிவடைகிறது. உங்கள் தேசிய அடையாள அட்டை எண் மற்றும் வரும் குறியீட்டை இங்கே உள்ளிடவும் {link}",
        "உங்கள் புதிய டிஜிட்டல் அடையாள அட்டை தயார். விநியோக கட்டணம் ரூ. {fee} செலுத்தவும் {link}",
        "SL-UDI அறிவிப்பு: உங்கள் பயோமெட்ரிக் சரிபார்ப்பு நிலுவையில் உள்ளது. உடனே {phone} அழைக்கவும்.",
        # mixed
        "SL-UDI digital ID එක activate කරලා නැහැ. Account suspend වෙනවා. Verify now {link}",
        "ඔයාගේ Digital ID registration pending. Rs. {fee} fee එක pay කරන්න {link} today only",
        "உங்கள் Digital ID activation pending. Welfare payment stop ஆகும். Verify now {link}",
        "SL-UDI update: உங்கள் NIC details confirm பண்ணுங்க {link} within {hours} hours",
        # singlish
        "Oyage SL-UDI digital ID eka activate karala naha. Ikmanin {link} eke verify karanna nathnam salli nawathinawa",
        "Digital ID eka ready. Delivery fee Rs. {fee} gewanna ona. Ada ithuru {link}",
        "Mage nama Ruwan, SL-UDI office eken. Oyage NIC number eka saha OTP eka denna, heta ID eka block wenawa",
        "SL-UDI registration ada iwarai. Oyage details {link} eke danna, {hours}h athule karanna",
        # tanglish (weighted heavier below)
        "Unga SL-UDI digital ID innum activate aagala. Seekiram {link} la verify pannunga illana welfare panam stop aagum",
        "Unga Digital ID ready irukku. Delivery fee Rs. {fee} pay pannunga {link}",
        "Naan SL-UDI office la irundhu pesuren. Unga NIC number and OTP kudunga, illana ID block aagum",
        "SL-UDI registration inniki last day. Unga details {link} la podunga, {hours} hours la seekiram pannunga",
        "Unga biometric verification pending irukku. Udane {phone} ku call pannunga, romba urgent",
        "Unga digital ID la mistake irukku. Correct panna Rs. {fee} venum, {link} la pay pannunga",
    ],
    "bank_impersonation": [
        "Security alert: unusual l0gin on your account. Confirm your identity at {link} or your card will be deactivated",
        "Unga bank account la suspicious login irukku. OTP kudunga illana account block aagum {link}",
        "Oyage bank account eke unusual login ekak. OTP eka denna nathnam account eka block wenawa {link}",
        "ඔබගේ බැංකු ගිණුමට අසාමාන්‍ය පිවිසුමක් හඳුනාගෙන ඇත. ලැබුණු කේතය මෙහි ඇතුළත් කරන්න {link}",
    ],
    "welfare_scam": [
        "Unga Aswesuma payment pending irukku. Rs. {fee} fee pay pannunga {link} la seekiram",
        "உங்கள் அஸ்வெசும கொடுப்பனவு நிலுவையில் உள்ளது. பெற {link} இல் விவரங்களை உள்ளிடவும்",
        "ඔබගේ අස්වැසුම දීමනාව ලබා ගැනීමට {link} හරහා තොරතුරු යාවත්කාලීන කරන්න",
    ],
    "parcel_fee": [
        "Unga parcel customs la irukku. Release panna Rs. {fee} kudunga {link}",
        "Your parcel is on hold. Pay Rs. {fee} redelivery fee at {link} within {hours} hours",
    ],
    "legit": [
        "SL-UDI registration is free. Visit your Divisional Secretariat with your NIC. Never share OTPs with anyone. Ref DS-{ref}",
        "Reminder: Digital ID biometric enrolment at the Divisional Secretariat on Saturday, 9am to 3pm. No fee. Ref {ref}",
        "ඩිජිටල් හැඳුනුම්පත් ලියාපදිංචිය නොමිලේ. ඔබගේ ප්‍රාදේශීය ලේකම් කාර්යාලයට ජාතික හැඳුනුම්පත සමඟ පැමිණෙන්න. යොමු අංකය {ref}",
        "டிஜிட்டல் அடையாள பதிவு இலவசம். உங்கள் பிரதேச செயலகத்திற்கு தேசிய அடையாள அட்டையுடன் வரவும். குறிப்பு {ref}",
        "Unga Digital ID appointment confirm aachu. Divisional Secretariat ku NIC kondu vaanga, fee illa. Ref {ref}",
        "Naan office la irukken, evening vandhu pesuren. Amma kitta sollunga, order no {ref} vandhuduchu",
        "Mage digital ID eka ada DS office eken ganna yanna one. Oya heta enawada? Token {ref}",
        "Ammi mama ada late wenawa, kema hadanna epa. Bus eka {ref} ta enawa",
        "Digital ID registration එක free. DS office එකට NIC එක අරන් යන්න. Token {ref}",
        "Your Aswesuma payment for this month has been credited to your bank account. Ref {ref}",
    ],
}

LABEL_WEIGHTS = {"digital_id_scam": 0.55, "legit": 0.25, "bank_impersonation": 0.08,
                 "welfare_scam": 0.07, "parcel_fee": 0.05}
# extra weight for Tanglish / code-mixed templates, to create a language-mix shift
LANG_BOOST = {"tanglish": 3.0, "mixed": 2.0}


def fill(tpl: str, rnd: random.Random) -> str:
    r = "".join(rnd.choice("abcdefghjkmnpqrstuvwxyz23456789") for _ in range(5))
    return tpl.format(link=rnd.choice(LINKS).format(r=r), fee=rnd.choice(FEES), hours=rnd.choice(HOURS),
                      phone=PHONE, ref=rnd.randint(10000, 99999))


def main():
    rnd = random.Random(SEED)
    pools = {lab: [(t, LANG_BOOST.get(detect_language(fill(t, random.Random(0))), 1.0)) for t in tpls]
             for lab, tpls in T.items()}
    labels, lw = zip(*LABEL_WEIGHTS.items())
    seen, rows = set(), []
    while len(rows) < N_SHIFTED + N_EVAL:
        lab = rnd.choices(labels, lw)[0]
        tpls, w = zip(*pools[lab])
        text = fill(rnd.choices(tpls, w)[0], rnd)
        if text in seen:
            continue
        seen.add(text)
        lang = detect_language(text)
        channel = "whatsapp" if lang in ("tanglish", "singlish", "mixed") and rnd.random() < 0.6 else "sms"
        rows.append({"text": text, "label": lab, "language": lang, "channel": channel})
    rnd.shuffle(rows)
    OUT.mkdir(parents=True, exist_ok=True)
    for name, part in (("shifted.csv", rows[:N_SHIFTED]), ("shifted_eval.csv", rows[N_SHIFTED:])):
        with (OUT / name).open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["text", "label", "language", "channel"])
            w.writeheader()
            w.writerows(part)
        langs, labs = {}, {}
        for r in part:
            langs[r["language"]] = langs.get(r["language"], 0) + 1
            labs[r["label"]] = labs.get(r["label"], 0) + 1
        print(f"{name}: {len(part)} rows | labels {labs} | languages {langs}")


if __name__ == "__main__":
    main()
