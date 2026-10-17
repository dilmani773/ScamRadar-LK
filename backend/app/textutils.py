"""Language-group detection and plain-language red flags (shared by training and serving)."""
import re

SINHALA = re.compile(r"[\u0D80-\u0DFF]")
TAMIL = re.compile(r"[\u0B80-\u0BFF]")
LATIN = re.compile(r"[A-Za-z]")
URL = re.compile(r"https?://\S+|www\.\S+|\b[\w-]+\.(?:com|lk|xyz|top|info|net|cc|ly|org)\b\S*", re.I)

# Common words in Sinhala written with English letters (Singlish)
SINGLISH_WORDS = {
    "eka", "ekak", "ekai", "eke", "eken", "ekata", "mage", "mama", "mata", "oya", "oyage", "oyata", "oba", "obe",
    "obage", "obata", "ape", "api", "apita", "karanna", "karala", "karanawa", "karanakam", "kalin", "thiyenawa",
    "tiyenawa", "thiyena", "nathnam", "nathi", "nathuwa", "naha", "nehe", "nadda", "denna", "dennam", "ganna",
    "gaththa", "salli", "mudal", "ikmanin", "heta", "ada", "iye", "kiyala", "kiyanna", "wenawa", "wena", "wenna",
    "una", "unama", "yanna", "yamu", "giya", "gihin", "enna", "ennam", "enawa", "ewanna", "yawanna", "gewanna",
    "gewwa", "bawa", "danwamu", "danna", "dala", "saha", "witara", "walata", "athule", "ithuru", "iwarai", "ona",
    "oney", "epa", "puluwan", "puluwanda", "hondai", "hari", "ehenam", "ane", "aluth", "loku", "podi", "tika",
    "gedara", "parakku", "winadi", "dawas", "dawasata", "suba", "thagga", "dinum", "labenawa", "labaganna", "udaw",
    "kohomada", "mokakda", "monawada", "kawda", "wage", "nawaththala", "nawaththuwa", "hoyanna", "balanna",
    "kiyawanna", "sathiyata", "patan", "paya", "wela", "welawe", "lage", "nanda", "iridha", "sikurada", "sanduda",
}
# Common words in Tamil written with English letters (Tanglish)
TANGLISH_WORDS = {
    "unga", "ungal", "ungalukku", "ungaluku", "neenga", "naan", "naanga", "panna", "pannunga", "pannu", "panni",
    "pannitaanga", "enna", "illa", "illai", "illana", "illama", "irukku", "irukkum", "irundhu", "irundhe", "vandhu",
    "vandha", "vanthu", "vaanga", "venum", "vendum", "panam", "kaasu", "seekiram", "udane", "kudunga", "kudu",
    "anuppa", "anuppunga", "anuppavum", "aachu", "aagum", "aagala", "romba", "sollunga", "sollu", "innaiku",
    "innaike", "inniki", "naalaiku", "naalaikku", "nethu", "adichurukku", "adichirukku", "podunga", "mudiyum",
    "mudiyala", "mudiyuma", "enga", "inga", "eppadi", "epdi", "ippo", "ippove", "appo", "machan", "thambi",
    "kattunga", "kattinaa", "kattiten", "velai", "varum", "varen", "veetla", "veetuku", "chinna", "konja", "oru",
    "neram", "naal", "nimisham", "parisu", "udhavi", "vanakkam", "vaazhthukkal", "pudhu", "laabam", "seiyunga",
    "padinga", "kulla", "munnadi", "dhaan", "aagiduchu", "jeyichirukeenga",
}


def detect_language(text: str) -> str:
    """Return one of: si, ta, mixed, en, singlish, tanglish."""
    si, ta, lat = len(SINHALA.findall(text)), len(TAMIL.findall(text)), len(LATIN.findall(text))
    if si or ta:
        native = si + ta
        return "mixed" if lat > native * 0.5 else ("si" if si >= ta else "ta")
    words = re.findall(r"[a-z]+", URL.sub(" ", text.lower()))
    uniq = set(words)
    s, t = len(uniq & SINGLISH_WORDS), len(uniq & TANGLISH_WORDS)
    short = len(words) <= 6  # one clear romanised word is enough in a very short message
    if s > t and (s >= 2 or short):
        return "singlish"
    if t > s and (t >= 2 or short):
        return "tanglish"
    if s == t and s >= 2:
        return "singlish"
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
