"""Language-group detection and plain-language red flags (shared by training and serving)."""
import re

SINHALA = re.compile(r"[\u0D80-\u0DFF]")
TAMIL = re.compile(r"[\u0B80-\u0BFF]")
LATIN = re.compile(r"[A-Za-z]")
SINGLISH_WORDS = {"eka", "ekak", "mage", "oya", "oyage", "karanna", "thiyenawa", "nam", "ne", "nehe", "naha",
                  "denna", "ganna", "salli", "ikmanin", "ada", "heta", "kiyala", "wenawa", "una", "yanna", "giya"}
TANGLISH_WORDS = {"illa", "panna", "pannunga", "enna", "naan", "unga", "ungal", "irukku", "vandhu", "venum",
                  "panam", "seekiram", "kudunga", "pannitaanga", "aachu", "romba", "sollunga"}


def detect_language(text: str) -> str:
    """Return one of: si, ta, mixed, en, singlish, tanglish."""
    si, ta, lat = len(SINHALA.findall(text)), len(TAMIL.findall(text)), len(LATIN.findall(text))
    if si or ta:
        native = si + ta
        return "mixed" if lat > native * 0.5 else ("si" if si >= ta else "ta")
    words = set(re.findall(r"[a-z]+", text.lower()))
    s, t = len(words & SINGLISH_WORDS), len(words & TANGLISH_WORDS)
    if s >= 2 and s >= t:
        return "singlish"
    if t >= 2:
        return "tanglish"
    return "en"


LANGUAGE_GROUP = {"si": "native", "ta": "native", "mixed": "native", "en": "english",
                  "singlish": "roman", "tanglish": "roman"}

# (flag name, plain-language reason, pattern)
_FLAGS = [
    ("link", "Contains a link. Banks and government offices never ask you to log in through an SMS link.",
     r"(https?://|www\.|bit\.ly|tinyurl|\b[a-z0-9-]+\.(com|lk|xyz|top|info|net)\b)"),
    ("otp_request", "Asks for an OTP, PIN or password. Never share these with anyone.",
     r"(\botp\b|\bpin\b|password|ඕටීපී|මුරපදය|ஓடிபி|கடவுச்சொல்)"),
    ("urgency", "Creates time pressure (for example 'within 24 hours' or 'immediately').",
     r"(urgent|immediately|within \d+ ?(hours|hrs)|24 ?h|today only|ikmanin|හදිසි|වහාම|පැය ?\d+|அவசர|உடனே)"),
    ("money_request", "Asks you to pay a fee or send money to receive something.",
     r"(fee|deposit|pay now|transfer|send money|gewanna|ගාස්තු|ගෙවන්න|මුදල් එවන්න|கட்டணம்|பணம் அனுப்)"),
    ("prize", "Promises a prize, lottery win or reward you did not enter for.",
     r"(\bwon\b|winner|prize|lottery|reward|jackpot|thagga|dinum|දිනුම්|ත්‍යාග|ලොතරැයි|பரிசு|வென்ற)"),
    ("account_threat", "Threatens that your account, SIM or ID will be blocked.",
     r"(blocked|suspended|deactivated|will be closed|block wenawa|අත්හිටුව|අවහිර|முடக்க)"),
    ("phone_number", "Asks you to call or WhatsApp an unknown number.",
     r"(\b0\d{2}[- ]?\d{3}[- ]?\d{4}\b|\+94\s?\d{2})"),
]
_COMPILED = [(n, r, re.compile(p, re.IGNORECASE)) for n, r, p in _FLAGS]


def red_flags(text: str) -> list[dict]:
    return [{"flag": n, "reason": r} for n, r, p in _COMPILED if p.search(text)]
