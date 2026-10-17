// ScamRadar LK · UI language (English / සිංහල / தமிழ்)
// Citizen-facing text (header, alert banner, Check page) is translated here.
// Analyst pages (Drift Monitor, Review Queue) stay in English.
import React, { createContext, useContext, useEffect, useState } from 'react';

export const LANGS = [
  { code: 'en', short: 'EN', name: 'English' },
  { code: 'si', short: 'සිං', name: 'සිංහල' },
  { code: 'ta', short: 'தமி', name: 'தமிழ்' },
];

const STRINGS = {
  // Header
  'nav.check': { en: 'Check Message', si: 'පරීක්ෂා කරන්න', ta: 'சரிபார்க்க' },
  'nav.monitor': { en: 'Drift Monitor', si: 'Drift නිරීක්ෂණය', ta: 'Drift கண்காணிப்பு' },
  'nav.review': { en: 'Review Queue', si: 'සමාලෝචනය', ta: 'மதிப்பாய்வு' },
  'brand.tagline': { en: 'AI Scam Guardian for Sri Lanka', si: 'ශ්‍රී ලංකාව සඳහා AI වංචා ආරක්ෂකයා', ta: 'இலங்கைக்கான AI மோசடி பாதுகாவலர்' },
  'theme.toLight': { en: 'Switch to Light Mode', si: 'ආලෝක මාදිලියට මාරු වන්න', ta: 'ஒளி பயன்முறைக்கு மாறவும்' },
  'theme.toDark': { en: 'Switch to Dark Mode', si: 'අඳුරු මාදිලියට මාරු වන්න', ta: 'இருண்ட பயன்முறைக்கு மாறவும்' },
  'lang.label': { en: 'Language', si: 'භාෂාව', ta: 'மொழி' },

  // Drift alert banner
  'banner.badge': { en: 'DRIFT DETECTED · FALLBACK ACTIVE', si: 'වෙනසක් හඳුනාගෙන ඇත · ආරක්ෂිත මාදිලිය ක්‍රියාත්මකයි', ta: 'மாற்றம் கண்டறியப்பட்டது · பாதுகாப்பு முறை இயக்கத்தில்' },
  'banner.title': { en: 'New scam pattern detected:', si: 'නව වංචා රටාවක් හඳුනාගෙන ඇත:', ta: 'புதிய மோசடி முறை கண்டறியப்பட்டது:' },
  'banner.sub': {
    en: 'The system identified a significant divergence from baseline patterns. Safe fallback is redirecting unfamiliar messages to the review queue.',
    si: 'පද්ධතියේ මෑත අනාවැකි baseline රටාවෙන් සැලකිය යුතු ලෙස වෙනස් වී ඇත. හුරු නැති පණිවිඩ සමාලෝචන පෝලිමට යොමු කෙරේ.',
    ta: 'அமைப்பின் சமீபத்திய கணிப்புகள் அடிப்படை முறையிலிருந்து குறிப்பிடத்தக்க அளவில் வேறுபடுகின்றன. பழக்கமில்லாத செய்திகள் மதிப்பாய்வு வரிசைக்கு அனுப்பப்படுகின்றன.',
  },
  'banner.reviewBtn': { en: 'Review Queue →', si: 'සමාලෝචන පෝලිම →', ta: 'மதிப்பாய்வு வரிசை →' },
  'banner.close': { en: 'Close alert banner', si: 'අනතුරු ඇඟවීම වසන්න', ta: 'எச்சரிக்கையை மூடு' },
  'sig.mean_confidence': { en: 'Average confidence is falling', si: 'සාමාන්‍ය විශ්වාසය අඩු වෙමින් පවතී', ta: 'சராசரி நம்பிக்கை குறைகிறது' },
  'sig.low_conf_share': { en: 'More low-confidence predictions', si: 'අඩු විශ්වාස අනාවැකි වැඩි වී ඇත', ta: 'குறைந்த நம்பிக்கை கணிப்புகள் அதிகரித்துள்ளன' },
  'sig.novelty_rate': { en: 'Many messages unlike the training data', si: 'පුහුණු දත්තවලට අසමාන පණිවිඩ බොහොමයක්', ta: 'பயிற்சி தரவைப் போலல்லாத பல செய்திகள்' },
  'sig.language_psi': { en: 'Language mix has shifted', si: 'භාෂා මිශ්‍රණය වෙනස් වී ඇත', ta: 'மொழிக் கலவை மாறியுள்ளது' },

  // Check page: input
  'hero.badge': { en: 'Multilingual Threat Intelligence • Sri Lanka', si: 'බහුභාෂා වංචා හඳුනාගැනීම • ශ්‍රී ලංකාව', ta: 'பன்மொழி மோசடி கண்டறிதல் • இலங்கை' },
  'hero.title': { en: 'Verify Suspicious Messages Instantly', si: 'සැක සහිත පණිවිඩ ක්ෂණිකව පරීක්ෂා කරන්න', ta: 'சந்தேகமான செய்திகளை உடனே சரிபார்க்கவும்' },
  'hero.desc': {
    en: 'Paste any SMS or WhatsApp message received on your phone. ScamRadar analyzes Sinhala, Tamil, Singlish, and English to flag fake bank alerts, lottery fraud, Aswesuma scams, and malicious links.',
    si: 'ඔබේ දුරකථනයට ලැබුණු ඕනෑම SMS හෝ WhatsApp පණිවිඩයක් මෙහි අලවන්න. ScamRadar සිංහල, දෙමළ, Singlish සහ English පණිවිඩ විශ්ලේෂණය කර ව්‍යාජ බැංකු පණිවිඩ, ලොතරැයි වංචා, අස්වැසුම වංචා සහ අනතුරුදායක links හඳුනා ගනී.',
    ta: 'உங்கள் தொலைபேசிக்கு வந்த எந்த SMS அல்லது WhatsApp செய்தியையும் இங்கே ஒட்டவும். ScamRadar சிங்களம், தமிழ், Singlish மற்றும் English செய்திகளை ஆய்வு செய்து போலி வங்கி செய்திகள், லாட்டரி மோசடிகள், அஸ்வெசும மோசடிகள் மற்றும் ஆபத்தான இணைப்புகளைக் கண்டறிகிறது.',
  },
  'presets.label': { en: 'Synthetic Test Examples:', si: 'පරීක්ෂණ උදාහරණ (කෘත්‍රිම):', ta: 'சோதனை எடுத்துக்காட்டுகள் (செயற்கை):' },
  'presets.hint': { en: 'Click any sample to populate', si: 'උදාහරණයක් තෝරන්න', ta: 'ஒரு எடுத்துக்காட்டைத் தேர்ந்தெடுக்கவும்' },
  'presets.tag': { en: 'Synthetic', si: 'කෘත්‍රිම', ta: 'செயற்கை' },
  'input.placeholder': {
    en: 'Paste SMS or WhatsApp text here... (e.g. "Lanka Pragathi Bank: Your account has been suspended. Click https://bit.ly/3x9...")',
    si: 'SMS හෝ WhatsApp පණිවිඩය මෙහි අලවන්න...',
    ta: 'SMS அல்லது WhatsApp செய்தியை இங்கே ஒட்டவும்...',
  },
  'input.chars': { en: '{n} / 2000 characters', si: 'අකුරු {n} / 2000', ta: '{n} / 2000 எழுத்துகள்' },
  'input.clear': { en: 'Clear', si: 'මකන්න', ta: 'அழி' },
  'source.label': { en: 'Message Source:', si: 'පණිවිඩය ලැබුණේ:', ta: 'செய்தி வந்த வழி:' },
  'source.OTHER': { en: 'OTHER', si: 'වෙනත්', ta: 'மற்றவை' },
  'analyze.btn': { en: 'Analyze Message', si: 'පණිවිඩය පරීක්ෂා කරන්න', ta: 'செய்தியைச் சரிபார்க்கவும்' },
  'analyze.busy': { en: 'Scanning Threat Vectors...', si: 'පරීක්ෂා කරමින්...', ta: 'சரிபார்க்கிறது...' },
  'offline.notice': {
    en: 'Local Heuristic Fallback Active: Backend service is updating. Showing client-side rule evaluation.',
    si: 'Backend සේවාවට සම්බන්ධ විය නොහැක. තාවකාලිකව browser එකේ නීති මගින් පරීක්ෂා කරයි.',
    ta: 'Backend சேவையுடன் இணைக்க முடியவில்லை. தற்காலிகமாக உலாவியில் உள்ள விதிகள் மூலம் சரிபார்க்கிறது.',
  },

  // Check page: verdict
  'verdict.tag.Scam': { en: 'High Risk Scam', si: 'ඉහළ අවදානම් වංචාවකි', ta: 'அதிக ஆபத்துள்ள மோசடி' },
  'verdict.tag.Suspicious': { en: 'Suspicious Pattern', si: 'සැක සහිතයි', ta: 'சந்தேகத்திற்குரியது' },
  'verdict.tag.Safe': { en: 'Verified Legitimate', si: 'ආරක්ෂිතයි', ta: 'பாதுகாப்பானது' },
  'verdict.checkedIn': { en: 'Checked in {t}', si: '{t} කින් පරීක්ෂා කළා', ta: '{t} இல் சரிபார்க்கப்பட்டது' },
  'verdict.title.Scam': { en: 'Critical Threat Probability: {p}%', si: 'වංචාවක් වීමේ සම්භාවිතාව: {p}%', ta: 'மோசடி நிகழ்தகவு: {p}%' },
  'verdict.title.Suspicious': { en: 'Unverified / Suspicious Threat: {p}%', si: 'සැක සහිත අවදානම: {p}%', ta: 'சந்தேகமான ஆபத்து: {p}%' },
  'verdict.title.Safe': { en: 'Legitimate Transaction Notice: {p}% Safe', si: 'ආරක්ෂිත බව: {p}%', ta: 'பாதுகாப்பு நம்பிக்கை: {p}%' },
  'donut.confidence': { en: 'Confidence', si: 'විශ්වාසය', ta: 'நம்பிக்கை' },
  'donut.threat': { en: 'Threat Level', si: 'අවදානම් මට්ටම', ta: 'ஆபத்து நிலை' },
  'donut.status.Scam': { en: 'Immediate Hazard', si: 'ක්ෂණික අනතුරක්', ta: 'உடனடி ஆபத்து' },
  'donut.status.Suspicious': { en: 'Uncertain Pattern', si: 'තහවුරු නැත', ta: 'உறுதியில்லை' },
  'donut.status.Safe': { en: 'No Threat Found', si: 'අවදානමක් හමු නොවීය', ta: 'ஆபத்து எதுவும் இல்லை' },
  'detail.script': { en: 'Detected Script', si: 'හඳුනාගත් භාෂාව', ta: 'கண்டறியப்பட்ட மொழி' },
  'detail.type': { en: 'Threat Classification', si: 'වංචා වර්ගය', ta: 'மோசடி வகை' },
  'detail.indicator': { en: 'Threat Indicator', si: 'අවදානම් ලකුණ', ta: 'ஆபத்து அறிகுறி' },
  'domain.link.title': { en: 'Unverified Domain Link', si: 'තහවුරු නොකළ link එකක්', ta: 'சரிபார்க்கப்படாத இணைப்பு' },
  'domain.none.title': { en: 'No Suspicious Links Included', si: 'සැක සහිත links නැත', ta: 'சந்தேகமான இணைப்புகள் இல்லை' },
  'domain.none.sub': { en: 'Safe plain-text SMS without phishing hyperlinks', si: 'Phishing links නැති සාමාන්‍ය පණිවිඩයකි', ta: 'Phishing இணைப்புகள் இல்லாத சாதாரண செய்தி' },
  'domain.direct.title': { en: 'Credential / Direct Threat', si: 'තොරතුරු ඉල්ලීමක් / සෘජු තර්ජනයක්', ta: 'தகவல் கோரிக்கை / நேரடி அச்சுறுத்தல்' },
  'domain.direct.sub': { en: 'Demands direct action or sensitive authentication codes', si: 'ක්ෂණික ක්‍රියාවක් හෝ රහස් කේත ඉල්ලයි', ta: 'உடனடி நடவடிக்கை அல்லது ரகசிய குறியீடுகளைக் கேட்கிறது' },
  'breakdown.title': { en: 'Citizen Safety Breakdown • AI Explanation', si: 'ඇයි මේ තීරණය? • පැහැදිලි කිරීම', ta: 'ஏன் இந்த முடிவு? • விளக்கம்' },
  'safe.r1.title': { en: 'No Red Flags Found:', si: 'අනතුරු ලකුණු හමු නොවීය:', ta: 'ஆபத்து அறிகுறிகள் இல்லை:' },
  'safe.r1.text': {
    en: 'No links, urgency, fees, prizes or account threats were detected.',
    si: 'Links, හදිසි බව, ගාස්තු, ත්‍යාග හෝ ගිණුම් තර්ජන හමු නොවීය.',
    ta: 'இணைப்புகள், அவசரம், கட்டணம், பரிசு அல்லது கணக்கு அச்சுறுத்தல் எதுவும் கண்டறியப்படவில்லை.',
  },
  'safe.r2.title': { en: 'No Credentials Demanded:', si: 'රහස් තොරතුරු ඉල්ලන්නේ නැත:', ta: 'ரகசிய தகவல் கோரப்படவில்லை:' },
  'safe.r2.text': {
    en: 'Does not request card details, PINs, or One-Time Passwords (OTPs).',
    si: 'Card විස්තර, PIN හෝ OTP ඉල්ලන්නේ නැත.',
    ta: 'அட்டை விவரங்கள், PIN அல்லது OTP கேட்கப்படவில்லை.',
  },
  'action.title': { en: 'What should you do now?', si: 'දැන් ඔබ කළ යුත්තේ කුමක්ද?', ta: 'இப்போது நீங்கள் என்ன செய்ய வேண்டும்?' },
  'advice.Scam': {
    si: 'පිළිතුරු දෙන්න, links ඔබන්න හෝ OTP දෙන්න එපා. මෙය වාර්තා කර, ඔබේ බැංකුවේ නිල දුරකථන අංකයට අමතන්න.',
    ta: 'பதில் அளிக்கவோ, இணைப்புகளைக் கிளிக் செய்யவோ, OTP பகிரவோ வேண்டாம். இதைப் புகாரளித்து, உங்கள் வங்கியின் அதிகாரப்பூர்வ எண்ணை அழைக்கவும்.',
  },
  'advice.Suspicious': {
    si: 'මෙය අසාමාන්‍ය පණිවිඩයකි. කිසිවක් කිරීමට පෙර නිල hotline එක හෝ website එක හරහා තහවුරු කරගන්න.',
    ta: 'இது வழக்கத்திற்கு மாறான செய்தி. எதையும் செய்வதற்கு முன் அதிகாரப்பூர்வ hotline அல்லது இணையதளம் மூலம் சரிபார்க்கவும்.',
  },
  'advice.Safe': {
    si: 'වංචා ලකුණු හමු නොවීය. එසේ වුවද OTP හෝ මුරපද කිසිවෙකුට දෙන්න එපා.',
    ta: 'மோசடி அறிகுறிகள் எதுவும் இல்லை. இருந்தாலும் OTP அல்லது கடவுச்சொற்களை யாருடனும் பகிர வேண்டாம்.',
  },
  'action.copy': { en: 'Copy Summary', si: 'සාරාංශය copy කරන්න', ta: 'சுருக்கத்தை நகலெடு' },
  'action.copied': { en: 'Copied!', si: 'Copy කළා!', ta: 'நகலெடுக்கப்பட்டது!' },
  'action.call': { en: 'Call CERT 101', si: 'CERT 101 අමතන්න', ta: 'CERT 101 ஐ அழைக்கவும்' },
  'header.cert': { en: 'CERT 101', si: 'CERT 101', ta: 'CERT 101' },
  'header.certTitle': { en: 'Sri Lanka CERT hotline (101) for scams and cyber incidents', si: 'වංචා සහ සයිබර් සිදුවීම් සඳහා ශ්‍රී ලංකා CERT hotline (101)', ta: 'மோசடி மற்றும் சைபர் சம்பவங்களுக்கான இலங்கை CERT hotline (101)' },
  'footer.tagline': { en: 'Multilingual scam checker · built by Team Paradox on synthetic data', si: 'බහුභාෂා වංචා පරීක්ෂකය · Team Paradox විසින් කෘත්‍රිම දත්ත මත සාදන ලදී', ta: 'பன்மொழி மோசடி சரிபார்ப்பு · செயற்கை தரவில் Team Paradox உருவாக்கியது' },
  'footer.report': { en: 'Report scams: Sri Lanka CERT 101 · cert.gov.lk', si: 'වංචා වාර්තා කරන්න: ශ්‍රී ලංකා CERT 101 · cert.gov.lk', ta: 'மோசடிகளைப் புகாரளிக்க: இலங்கை CERT 101 · cert.gov.lk' },
  'footer.model': { en: 'Model', si: 'Model', ta: 'Model' },
  'ctx.model': { en: 'Model Checkpoint', si: 'Model සංස්කරණය', ta: 'Model பதிப்பு' },
  'ctx.rule': { en: 'Safety Rule', si: 'ආරක්ෂක නීතිය', ta: 'பாதுகாப்பு விதி' },
  'ctx.ruleValue': { en: 'Unfamiliar messages are never marked Safe', si: 'හුරු නැති පණිවිඩ කිසිවිටෙක ආරක්ෂිත ලෙස සලකුණු නොකෙරේ', ta: 'பழக்கமில்லாத செய்திகள் ஒருபோதும் பாதுகாப்பானவை எனக் குறிக்கப்படாது' },
  'ctx.report': { en: 'Report A Scam', si: 'වංචාවක් වාර්තා කරන්න', ta: 'மோசடியைப் புகாரளிக்க' },
  'ctx.reportValue': { en: 'Sri Lanka CERT · 101 · cert.gov.lk', si: 'ශ්‍රී ලංකා CERT · 101 · cert.gov.lk', ta: 'இலங்கை CERT · 101 · cert.gov.lk' },

  // Red flags (API sends English reasons; translated here by flag name)
  'flag.link': { en: 'Link', si: 'Link එකක්', ta: 'இணைப்பு' },
  'flag.otp_request': { en: 'OTP request', si: 'OTP ඉල්ලීම', ta: 'OTP கோரிக்கை' },
  'flag.urgency': { en: 'Urgency', si: 'හදිසි බව', ta: 'அவசரம்' },
  'flag.money_request': { en: 'Money request', si: 'මුදල් ඉල්ලීම', ta: 'பணக் கோரிக்கை' },
  'flag.prize': { en: 'Prize', si: 'ත්‍යාග', ta: 'பரிசு' },
  'flag.account_threat': { en: 'Account threat', si: 'ගිණුම් තර්ජනය', ta: 'கணக்கு அச்சுறுத்தல்' },
  'flag.phone_number': { en: 'Phone number', si: 'දුරකථන අංකය', ta: 'தொலைபேசி எண்' },
  'reason.link': {
    si: 'Link එකක් අඩංගුයි. බැංකු සහ රජයේ ආයතන කිසිවිටෙක SMS link එකක් හරහා login වීමට නොකියයි.',
    ta: 'இணைப்பு உள்ளது. வங்கிகளும் அரசு அலுவலகங்களும் SMS இணைப்பு மூலம் login செய்யச் சொல்லுவதில்லை.',
  },
  'reason.otp_request': {
    si: 'OTP, PIN හෝ මුරපදයක් ඉල්ලයි. මේවා කිසිවෙකුට දෙන්න එපා.',
    ta: 'OTP, PIN அல்லது கடவுச்சொல்லைக் கேட்கிறது. இவற்றை யாருடனும் பகிர வேண்டாம்.',
  },
  'reason.urgency': {
    si: "කාල පීඩනයක් ඇති කරයි (උදා: 'පැය 24ක් ඇතුළත', 'වහාම').",
    ta: "நேர அழுத்தத்தை உருவாக்குகிறது (உதா: '24 மணி நேரத்திற்குள்', 'உடனே').",
  },
  'reason.money_request': {
    si: 'යමක් ලබා ගැනීමට ගාස්තුවක් ගෙවන්න හෝ මුදල් එවන්න කියයි.',
    ta: 'எதையாவது பெற கட்டணம் செலுத்த அல்லது பணம் அனுப்பச் சொல்கிறது.',
  },
  'reason.prize': {
    si: 'ඔබ සහභාගී නොවූ ත්‍යාගයක්, ලොතරැයි ජයග්‍රහණයක් හෝ තෑග්ගක් පොරොන්දු වෙයි.',
    ta: 'நீங்கள் பங்கேற்காத பரிசு, லாட்டரி வெற்றி அல்லது வெகுமதியை உறுதியளிக்கிறது.',
  },
  'reason.account_threat': {
    si: 'ඔබේ ගිණුම, SIM එක හෝ හැඳුනුම්පත අවහිර කරන බවට තර්ජනය කරයි.',
    ta: 'உங்கள் கணக்கு, SIM அல்லது அடையாள அட்டை முடக்கப்படும் என்று அச்சுறுத்துகிறது.',
  },
  'reason.phone_number': {
    si: 'නොදන්නා අංකයකට call හෝ WhatsApp කරන්න කියයි.',
    ta: 'தெரியாத எண்ணை அழைக்க அல்லது WhatsApp செய்யச் சொல்கிறது.',
  },

  // Detected script (name + description)
  'lang.si.name': { en: 'Sinhala Script', si: 'සිංහල අකුරු', ta: 'சிங்கள எழுத்து' },
  'lang.si.sub': { en: 'Native Sinhala Unicode markers detected', si: 'සිංහල Unicode අකුරු හඳුනාගත්තා', ta: 'சிங்கள Unicode எழுத்துகள் கண்டறியப்பட்டன' },
  'lang.ta.name': { en: 'Tamil Script', si: 'දෙමළ අකුරු', ta: 'தமிழ் எழுத்து' },
  'lang.ta.sub': { en: 'Native Tamil Unicode typography detected', si: 'දෙමළ Unicode අකුරු හඳුනාගත්තා', ta: 'தமிழ் Unicode எழுத்துகள் கண்டறியப்பட்டன' },
  'lang.singlish.name': { en: 'Singlish / Sinhala Romanized', si: 'Singlish (ඉංග්‍රීසි අකුරින් සිංහල)', ta: 'Singlish (ஆங்கில எழுத்தில் சிங்களம்)' },
  'lang.singlish.sub': { en: 'Dual-channel lexer matched colloquial Sinhala in Latin text', si: 'ඉංග්‍රීසි අකුරින් ලියූ සිංහල වචන හඳුනාගත්තා', ta: 'ஆங்கில எழுத்தில் எழுதப்பட்ட சிங்கள சொற்கள் கண்டறியப்பட்டன' },
  'lang.tanglish.name': { en: 'Tanglish / Tamil Romanized', si: 'Tanglish (ඉංග්‍රීසි අකුරින් දෙමළ)', ta: 'Tanglish (ஆங்கில எழுத்தில் தமிழ்)' },
  'lang.tanglish.sub': { en: 'Dual-channel lexer matched vernacular Tamil in Latin text', si: 'ඉංග්‍රීසි අකුරින් ලියූ දෙමළ වචන හඳුනාගත්තා', ta: 'ஆங்கில எழுத்தில் எழுதப்பட்ட தமிழ் சொற்கள் கண்டறியப்பட்டன' },
  'lang.en.name': { en: 'English (Formal)', si: 'ඉංග්‍රීසි', ta: 'ஆங்கிலம்' },
  'lang.en.sub': { en: 'Standard Latin grammar and institutional terminology', si: 'සම්මත ඉංග්‍රීසි පාඨය', ta: 'நிலையான ஆங்கில உரை' },
  'lang.mixed.name': { en: 'Mixed Script Vernacular', si: 'මිශ්‍ර භාෂා', ta: 'கலப்பு மொழி' },
  'lang.mixed.sub': { en: 'Multilingual hybrid text across Sinhala, Tamil, and English', si: 'සිංහල, දෙමළ සහ ඉංග්‍රීසි මිශ්‍ර පාඨය', ta: 'சிங்களம், தமிழ் மற்றும் ஆங்கிலம் கலந்த உரை' },

  // Scam types (name + description)
  'type.welfare_scam.name': { en: 'Welfare & Cash Grant Lure', si: 'සුබසාධන / මුදල් ප්‍රදාන වංචාව', ta: 'நலன்புரி / பண உதவி மோசடி' },
  'type.welfare_scam.sub': { en: 'Impersonates Aswesuma Welfare Board & Government relief', si: 'අස්වැසුම හෝ රජයේ සහන ලෙස පෙනී සිටියි', ta: 'அஸ்வெசும அல்லது அரசு நிவாரணம் போல் நடிக்கிறது' },
  'type.bank_impersonation.name': { en: 'Bank Impersonation Phish', si: 'ව්‍යාජ බැංකු පණිවිඩය', ta: 'போலி வங்கிச் செய்தி' },
  'type.bank_impersonation.sub': { en: 'Impersonates commercial bank security or card division', si: 'බැංකුවක ආරක්ෂක හෝ card අංශය ලෙස පෙනී සිටියි', ta: 'வங்கியின் பாதுகாப்பு அல்லது அட்டைப் பிரிவு போல் நடிக்கிறது' },
  'type.fake_prize.name': { en: 'Advance Fee & Lottery Scam', si: 'ත්‍යාග / ලොතරැයි වංචාව', ta: 'பரிசு / லாட்டரி மோசடி' },
  'type.fake_prize.sub': { en: 'Promises cash prizes or gifts contingent on advance fee deposits', si: 'කලින් ගාස්තුවක් ගෙවුවොත් ත්‍යාග ලැබෙන බව පොරොන්දු වෙයි', ta: 'முன்கட்டணம் செலுத்தினால் பரிசு கிடைக்கும் என உறுதியளிக்கிறது' },
  'type.digital_id_scam.name': { en: 'SL-UDI Digital ID Impersonation', si: 'SL-UDI ඩිජිටල් හැඳුනුම්පත් වංචාව', ta: 'SL-UDI டிஜிட்டல் அடையாள மோசடி' },
  'type.digital_id_scam.sub': { en: 'Harvests National Identity Card & biometric activation credentials', si: 'හැඳුනුම්පත් අංකය සහ සක්‍රිය කිරීමේ තොරතුරු සොරකම් කරයි', ta: 'அடையாள அட்டை எண் மற்றும் செயல்படுத்தல் தகவல்களைத் திருடுகிறது' },
  'type.parcel_fee.name': { en: 'Courier & Customs Clearance Scam', si: 'පාර්සල් / රේගු ගාස්තු වංචාව', ta: 'பார்சல் / சுங்கக் கட்டண மோசடி' },
  'type.parcel_fee.sub': { en: 'Claims an overseas parcel requires upfront release fees', si: 'පාර්සලයක් නිදහස් කිරීමට ගාස්තුවක් ඉල්ලයි', ta: 'பார்சலை விடுவிக்க கட்டணம் கேட்கிறது' },
  'type.fake_job.name': { en: 'Employment / Deposit Scam', si: 'ව්‍යාජ රැකියා වංචාව', ta: 'போலி வேலை மோசடி' },
  'type.fake_job.sub': { en: 'Demands advance registration fees for work-from-home offers', si: 'නිවසේ සිට රැකියාවකට ලියාපදිංචි ගාස්තුවක් ඉල්ලයි', ta: 'வீட்டிலிருந்து வேலைக்கு பதிவுக் கட்டணம் கேட்கிறது' },
  'type.loan_app.name': { en: 'Predatory Instant Loan Fraud', si: 'ව්‍යාජ ක්ෂණික ණය වංචාව', ta: 'போலி உடனடி கடன் மோசடி' },
  'type.loan_app.sub': { en: 'Promotes unverified APK apps seeking device access', si: 'තහවුරු නොකළ ණය apps ස්ථාපනය කිරීමට කියයි', ta: 'சரிபார்க்கப்படாத கடன் apps-ஐ நிறுவச் சொல்கிறது' },
  'type.investment_scheme.name': { en: 'Pyramid / Double-Money Fraud', si: 'පිරමිඩ / මුදල් දෙගුණ කිරීමේ වංචාව', ta: 'பிரமிட் / இரட்டிப்பு பண மோசடி' },
  'type.investment_scheme.sub': { en: 'Guarantees unrealistic returns on informal crypto or pyramid tiers', si: 'යථාර්ථවාදී නොවන ප්‍රතිලාභ සහතික කරයි', ta: 'நம்பமுடியாத வருமானத்தை உறுதியளிக்கிறது' },
  'type.legit.name': { en: 'Standard Transaction Alert', si: 'සාමාන්‍ය ගනුදෙනු දැනුම්දීම', ta: 'சாதாரண பரிவர்த்தனை அறிவிப்பு' },
  'type.legit.sub': { en: 'Looks like a normal notification; no scam pattern matched', si: 'සාමාන්‍ය දැනුම්දීමක් ලෙස පෙනේ; වංචා රටාවක් හමු නොවීය', ta: 'சாதாரண அறிவிப்பு போல் தெரிகிறது; மோசடி முறை எதுவும் பொருந்தவில்லை' },
  'type.unknown.name': { en: 'Potential Threat', si: 'හැකි අවදානමක්', ta: 'சாத்தியமான அச்சுறுத்தல்' },
  'type.unknown.sub': { en: 'Pattern matched against threat intelligence taxonomy', si: 'දන්නා වංචා රටා සමඟ සසඳා ඇත', ta: 'அறியப்பட்ட மோசடி முறைகளுடன் ஒப்பிடப்பட்டது' },
};

function readSaved() {
  try {
    const v = window.localStorage.getItem('scamradar-lang');
    return LANGS.some((l) => l.code === v) ? v : 'en';
  } catch {
    return 'en';
  }
}

const LangContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => k, has: () => false });

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(readSaved);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem('scamradar-lang', lang);
    } catch {
      // storage unavailable: language still works for this session
    }
  }, [lang]);

  // t('key', { n: 5 }) → translated string with {n} filled in; falls back to English, then the key
  const t = (key, vars) => {
    const entry = STRINGS[key];
    let s = entry ? (entry[lang] ?? entry.en ?? key) : key;
    if (vars) Object.entries(vars).forEach(([k, v]) => { s = s.replaceAll(`{${k}}`, String(v)); });
    return s;
  };
  // has('key') → true if the key has text for the current language
  const has = (key) => Boolean(STRINGS[key] && STRINGS[key][lang]);

  return <LangContext.Provider value={{ lang, setLang, t, has }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
