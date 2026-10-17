"""Generate the synthetic ScamRadar LK dataset (no real personal data).

    python -m ml.make_data

Writes data/processed/{train,test,shifted,shifted_eval}.csv.
- train and test use DIFFERENT core phrasings, openers and closers, so the held-out score is honest.
- shifted/shifted_eval contain a NEW tactic (SL-UDI digital ID scams), more Tanglish and obfuscated links.
All banks, couriers, links and numbers are fictional; phone numbers are masked as 07X-XXX-XXXX.
Method: hand-written phrase banks (Sinhala, Tamil, Singlish, Tanglish, English, mixed) combined by templates.
"""
import csv
import random
from pathlib import Path

BANKS = ["Lanka Pragathi Bank", "Ruhunu Saviya Bank", "Ceylon Udaya Bank", "Isuru Finance"]
COURIERS = ["SpeedLanka Express", "Dakuna Post", "IslandGo Courier"]
LINKS = ["http://lpb-verify.xyz/login", "http://saviya-secure.top/acc", "bit.ly/3kQ9xLp", "tinyurl.com/lk-reward",
         "http://parcel-lk.info/pay", "http://quick-loan-lk.xyz", "http://welfare-pay.top/claim"]
PHONE = "07X-XXX-XXXX"
AMOUNTS = ["Rs. 1,500", "Rs. 2,750", "Rs. 4,900", "Rs. 500,000", "Rs. 25,000"]

# CORE[label][lang] = (train phrasings, test phrasings)
CORE = {
 "bank_impersonation": {
  "en": (["Your {bank} account has been suspended due to unusual activity. Verify your details at {link} and enter the OTP sent to you.",
          "Dear customer, your {bank} card will be blocked today. Confirm your PIN at {link}."],
         ["{bank} security alert: we stopped a payment. Share the 6-digit code you just received to keep your account active."]),
  "si": (["ඔබගේ {bank} ගිණුම අත්හිටුවා ඇත. {link} වෙත ගොස් ඔබට ලැබුණු OTP අංකය ඇතුළත් කරන්න.",
          "ඔබගේ {bank} කාඩ්පත අද අවහිර වේ. {link} හරහා ඔබගේ PIN අංකය තහවුරු කරන්න."],
         ["{bank}: සැක සහිත ගනුදෙනුවක් නැවැත්වූවා. ඔබට ලැබුණු ඉලක්කම් 6 කේතය අපට එවන්න."]),
  "ta": (["உங்கள் {bank} கணக்கு முடக்கப்பட்டுள்ளது. {link} இல் சென்று உங்களுக்கு வந்த OTP ஐ உள்ளிடவும்.",
          "உங்கள் {bank} அட்டை இன்று முடக்கப்படும். {link} இல் உங்கள் PIN ஐ உறுதிப்படுத்தவும்."],
         ["{bank} எச்சரிக்கை: ஒரு பரிவர்த்தனை நிறுத்தப்பட்டது. உங்களுக்கு வந்த 6 இலக்க குறியீட்டை அனுப்புங்கள்."]),
  "singlish": (["oyage {bank} account eka suspend karala, {link} ekata gihin OTP eka denna",
                "oyage {bank} card eka ada block wenawa, {link} eken PIN eka confirm karanna"],
               ["{bank} eken: payment ekak nawaththuwa, oyata awa digits 6 code eka ewanna"]),
  "tanglish": (["unga {bank} account suspend aagiduchu, {link} la poi OTP ah kudunga",
                "unga {bank} card innaiku block aagum, {link} la PIN confirm pannunga"],
               ["{bank}: oru payment niruthitom, unga phone ku vandha 6 digit code ah anuppunga"]),
 },
 "fake_prize": {
  "en": (["Congratulations! You have won {amount} in the National Mobile Lucky Draw. Pay a processing fee to claim your prize.",
          "You are our lucky winner of a new smartphone. Claim your reward at {link} today."],
         ["Your number was selected for a {amount} cash gift. Send the release charge to receive it."]),
  "si": (["සුබ පැතුම්! ඔබ ජාතික ලොතරැයියෙන් {amount}ක් දිනුම් කර ඇත. ත්‍යාගය ලබා ගැනීමට ගාස්තු ගෙවන්න.",
          "ඔබ නව ස්මාර්ට් දුරකථනයක ත්‍යාගලාභියා වී ඇත. අදම {link} වෙත ගොස් ලබාගන්න."],
         ["ඔබගේ අංකයට {amount} මුදල් තෑග්ගක් ලැබී ඇත. එය නිදහස් කිරීමට ගාස්තුව එවන්න."]),
  "ta": (["வாழ்த்துக்கள்! தேசிய லாட்டரியில் நீங்கள் {amount} வென்றுள்ளீர்கள். பரிசைப் பெற கட்டணம் செலுத்துங்கள்.",
          "நீங்கள் புதிய ஸ்மார்ட்போன் பரிசை வென்றுள்ளீர்கள். இன்றே {link} இல் பெறுங்கள்."],
         ["உங்கள் எண்ணுக்கு {amount} பணப் பரிசு கிடைத்துள்ளது. அதைப் பெற கட்டணத்தை அனுப்புங்கள்."]),
  "singlish": (["suba pathum! oya lottery eken {amount} dinala, thagga ganna gana gewanna",
                "oya aluth phone ekak dinala, ada {link} eken ganna"],
               ["oyage number ekata {amount} gift ekak awa, eka ganna charge eka ewanna"]),
  "tanglish": (["vaazhthukkal! lottery la neenga {amount} jeyichirukeenga, parisu vaanga fee kattunga",
                "neenga pudhu phone parisu jeyichirukeenga, innaike {link} la vaangunga"],
               ["unga number ku {amount} gift vandhirukku, adha vaanga charge anuppunga"]),
 },
 "parcel_fee": {
  "en": (["{courier}: your parcel is held at customs. Pay {amount} at {link} within 24 hours or it will be returned.",
          "We tried to deliver your package. Update your address and pay the redelivery fee at {link}."],
         ["Your shipment is waiting at the warehouse. A small clearance charge is needed before dispatch."]),
  "si": (["{courier}: ඔබගේ පාර්සලය රේගුවේ රඳවා ඇත. පැය 24ක් ඇතුළත {link} හරහා {amount} ගෙවන්න.",
          "ඔබගේ පැකේජය බෙදාහැරීමට නොහැකි විය. {link} හරහා ලිපිනය යාවත්කාලීන කර ගාස්තු ගෙවන්න."],
         ["ඔබගේ භාණ්ඩය ගබඩාවේ තිබේ. යැවීමට පෙර කුඩා නිෂ්කාශන ගාස්තුවක් අවශ්‍යයි."]),
  "ta": (["{courier}: உங்கள் பார்சல் சுங்கத்தில் உள்ளது. 24 மணி நேரத்தில் {link} இல் {amount} செலுத்துங்கள்.",
          "உங்கள் பொதியை வழங்க முடியவில்லை. {link} இல் முகவரியை புதுப்பித்து கட்டணம் செலுத்துங்கள்."],
         ["உங்கள் பொருள் கிடங்கில் காத்திருக்கிறது. அனுப்புவதற்கு முன் சிறிய கட்டணம் தேவை."]),
  "singlish": (["{courier}: oyage parcel eka customs eke, paya 24k athule {link} eken {amount} gewanna",
                "oyage package eka deliver karanna bari una, {link} eken address eka danna saha fee eka gewanna"],
               ["oyage item eka warehouse eke, yawanna kalin podi charge ekak gewanna one"]),
  "tanglish": (["{courier}: unga parcel customs la irukku, 24 mani neram kulla {link} la {amount} kattunga",
                "unga package deliver panna mudiyala, {link} la address update panni fee kattunga"],
               ["unga item warehouse la irukku, anuppa munnadi chinna charge venum"]),
 },
 "fake_job": {
  "en": (["Work from home and earn {amount} per day by liking videos. Pay a registration fee to start.",
          "Urgent hiring for jobs in Dubai. Send a visa processing fee to {phone} to reserve your seat."],
         ["Part-time online task job: complete simple tasks and get daily income after a small joining deposit."]),
  "si": (["ගෙදර ඉඳන් වීඩියෝ like කරලා දිනකට {amount} උපයන්න. පටන් ගැනීමට ලියාපදිංචි ගාස්තුවක් ගෙවන්න.",
          "ඩුබායි රැකියා සඳහා හදිසි බඳවා ගැනීම්. ඔබගේ ස්ථානය වෙන් කිරීමට වීසා ගාස්තුව {phone} වෙත එවන්න."],
         ["අර්ධකාලීන ඔන්ලයින් රැකියාව: සරල කාර්යයන් කර දිනපතා ආදායම ලබන්න, පළමුව කුඩා තැන්පතුවක් කරන්න."]),
  "ta": (["வீட்டிலிருந்தே வீடியோக்களை லைக் செய்து நாளுக்கு {amount} சம்பாதியுங்கள். தொடங்க பதிவுக் கட்டணம் செலுத்துங்கள்.",
          "துபாய் வேலைகளுக்கு அவசர ஆட்சேர்ப்பு. இடத்தை உறுதிப்படுத்த விசா கட்டணத்தை {phone} க்கு அனுப்புங்கள்."],
         ["பகுதி நேர ஆன்லைன் வேலை: எளிய பணிகளைச் செய்து தினசரி வருமானம் பெறுங்கள், முதலில் சிறிய வைப்பு செலுத்துங்கள்."]),
  "singlish": (["gedara indan video like karala dawasata {amount} hoyanna, patan ganna registration fee eka gewanna",
                "dubai job walata ikmanin ganna, visa fee eka {phone} ekata ewanna"],
               ["part time online job ekak, podi deposit ekak dala dawasema salli hoyanna"]),
  "tanglish": (["veetla irundhe video like panni naal ku {amount} sambaadhinga, start panna registration fee kattunga",
                "dubai job ku urgent hiring, visa fee ah {phone} ku anuppunga"],
               ["part time online velai, chinna deposit potta daily income varum"]),
 },
 "investment_scheme": {
  "en": (["Invest {amount} today and get double returns in 7 days. Guaranteed profit, limited slots.",
          "Join our crypto trading group and earn 30% weekly. Bring two friends to unlock bonus income."],
         ["Our gold savings plan pays fixed high returns every week with zero risk. Deposit now to secure your share."]),
  "si": (["අද {amount} ආයෝජනය කර දින 7කින් දෙගුණයක් ලබාගන්න. සහතික ලාභයක්, සීමිත ඉඩ ප්‍රමාණයක්.",
          "අපේ ක්‍රිප්ටෝ කණ්ඩායමට එක්වී සතියකට 30%ක් උපයන්න. යාළුවන් දෙදෙනෙක් එක්කළොත් බෝනස්."],
         ["අපේ රන් ඉතුරුම් සැලැස්ම අවදානමක් නැතිව සතිපතා ඉහළ ප්‍රතිලාභ ගෙවයි. ඔබේ කොටස වෙන්කරගන්න දැන්ම තැන්පත් කරන්න."]),
  "ta": (["இன்று {amount} முதலீடு செய்து 7 நாளில் இரட்டிப்பு பெறுங்கள். உத்தரவாத லாபம், குறைந்த இடங்கள்.",
          "எங்கள் கிரிப்டோ குழுவில் சேர்ந்து வாரம் 30% சம்பாதியுங்கள். இரண்டு நண்பர்களை சேர்த்தால் போனஸ்."],
         ["எங்கள் தங்க சேமிப்பு திட்டம் ஆபத்து இல்லாமல் வாராந்திர அதிக வருமானம் தரும். இப்போதே வைப்பு செய்யுங்கள்."]),
  "singlish": (["ada {amount} invest karala dawas 7n dennama ganna, sure profit, slots tikai",
                "ape crypto group ekata join wela sathiyata 30% hoyanna, yaluwo dennek gaththoth bonus"],
               ["ape gold savings plan eken risk nathuwa sathiyata loku profit, dan deposit karanna"]),
  "tanglish": (["innaiku {amount} invest panni 7 naal la double vaangunga, guaranteed profit, konja slots dhaan",
                "enga crypto group la join panni vaaram 30% sambaadhinga, rendu friends ah serthaa bonus"],
               ["enga gold savings plan risk illama vaaram vaaram adhiga laabam, ippove deposit pannunga"]),
 },
 "loan_app": {
  "en": (["Your instant loan of {amount} is approved. Pay the insurance fee at {link} to receive the money.",
          "Get a loan in 5 minutes without documents. Download our app from {link} and allow contacts access."],
         ["Loan sanctioned without guarantor. A one-time activation charge releases the amount to your wallet."]),
  "si": (["ඔබගේ {amount} ක්ෂණික ණය අනුමත වී ඇත. මුදල ලබා ගැනීමට {link} හරහා රක්ෂණ ගාස්තුව ගෙවන්න.",
          "ලේඛන නැතිව විනාඩි 5කින් ණයක්. {link} වෙතින් අපේ ඇප් එක බාගෙන contacts වලට අවසර දෙන්න."],
         ["ඇපකරුවෙක් නැතිව ණය අනුමතයි. එක් වරක සක්‍රිය කිරීමේ ගාස්තුවකින් මුදල ඔබගේ පසුම්බියට."]),
  "ta": (["உங்கள் {amount} உடனடி கடன் அங்கீகரிக்கப்பட்டது. பணத்தைப் பெற {link} இல் காப்பீட்டு கட்டணம் செலுத்துங்கள்.",
          "ஆவணங்கள் இல்லாமல் 5 நிமிடத்தில் கடன். {link} இலிருந்து எங்கள் செயலியை பதிவிறக்குங்கள்."],
         ["உத்தரவாததாரர் இல்லாமல் கடன் அனுமதிக்கப்பட்டது. ஒரு முறை கட்டணம் செலுத்தினால் தொகை உங்கள் வாலட்டுக்கு வரும்."]),
  "singlish": (["oyage {amount} instant loan eka approve una, salli ganna {link} eken insurance fee eka gewanna",
                "documents nathuwa winadi 5n loan ekak, {link} eken app eka download karala contacts allow karanna"],
               ["guarantor nathuwa loan eka approve, activation charge ekak gewwama salli wallet ekata"]),
  "tanglish": (["unga {amount} instant loan approve aagiduchu, panam vaanga {link} la insurance fee kattunga",
                "documents illama 5 nimisham la loan, {link} la app download panni contacts allow pannunga"],
               ["guarantor illama loan approve, oru activation charge kattinaa amount wallet ku varum"]),
 },
 "welfare_scam": {
  "en": (["Your Aswesuma payment of {amount} is pending. Update your bank details at {link} to receive it today.",
          "Pension arrears approved. Send your account number and the OTP to {phone} to release the payment."],
         ["Welfare office notice: your monthly allowance is on hold until you confirm your card number by reply."]),
  "si": (["ඔබගේ අස්වැසුම {amount} ගෙවීම පොරොත්තුවෙන්. අදම ලබාගැනීමට {link} හරහා බැංකු විස්තර යාවත්කාලීන කරන්න.",
          "විශ්‍රාම වැටුප් හිඟ මුදල් අනුමතයි. මුදල නිදහස් කිරීමට ගිණුම් අංකය සහ OTP එක {phone} වෙත එවන්න."],
         ["සුබසාධන කාර්යාල දැනුම්දීම: ඔබගේ කාඩ් අංකය පිළිතුරෙන් තහවුරු කරන තුරු මාසික දීමනාව නවතා ඇත."]),
  "ta": (["உங்கள் அஸ்வெசும {amount} கொடுப்பனவு நிலுவையில் உள்ளது. இன்றே பெற {link} இல் வங்கி விவரங்களை புதுப்பியுங்கள்.",
          "ஓய்வூதிய நிலுவை அனுமதிக்கப்பட்டது. பணம் பெற கணக்கு எண் மற்றும் OTP ஐ {phone} க்கு அனுப்புங்கள்."],
         ["நலன்புரி அலுவலக அறிவிப்பு: உங்கள் அட்டை எண்ணை உறுதிப்படுத்தும் வரை மாதாந்திர கொடுப்பனவு நிறுத்தப்பட்டுள்ளது."]),
  "singlish": (["oyage aswesuma {amount} payment eka pending, ada ganna {link} eken bank details update karanna",
                "pension hinga salli approve una, salli ganna account number ekai OTP ekai {phone} ekata ewanna"],
               ["welfare office eken: card number eka reply karala confirm karanakam allowance eka nawaththala"]),
  "tanglish": (["unga aswesuma {amount} payment pending, innaike vaanga {link} la bank details update pannunga",
                "pension arrears approve aachu, panam vaanga account number um OTP um {phone} ku anuppunga"],
               ["welfare office: unga card number reply la confirm pannura varai monthly allowance nikkudhu"]),
 },
}

LEGIT = {
 "en": (["Your {bank} OTP is 482915. Do not share this code with anyone, including bank staff.",
         "Rs. 2,500 has been credited to your {bank} account. Available balance updated.",
         "{courier}: your parcel will be delivered tomorrow between 10am and 2pm.",
         "Hi, I'll reach home around 7. Shall I buy bread?",
         "Reminder: team meeting moved to 3pm today.",
         "Your electricity bill for this month is ready. Pay through your usual banking app."],
        ["Thank you for your payment. Your receipt number is 88213.",
         "Dinner at aunty's place on Sunday, don't forget!",
         "Your appointment at the clinic is confirmed for Monday 9am."]),
 "si": (["ඔබගේ {bank} OTP අංකය 482915. මෙම කේතය බැංකු නිලධාරීන් ඇතුළු කිසිවෙකුට ලබා නොදෙන්න.",
         "ඔබගේ {bank} ගිණුමට රු. 2,500ක් බැර විය.",
         "{courier}: ඔබගේ පාර්සලය හෙට පෙ.ව. 10 සිට ප.ව. 2 අතර ලැබෙනු ඇත.",
         "අම්මේ, මම හතට විතර ගෙදර එනවා. පාන් ගේන්නද?",
         "හෙට පන්තිය උදේ 8ට තියෙනවා."],
        ["ඔබගේ ගෙවීමට ස්තූතියි. රිසිට්පත් අංකය 88213.",
         "ඉරිදා නැන්දලාගේ ගෙදර කෑමට යමු, අමතක කරන්න එපා.",
         "සඳුදා උදේ 9ට සායනයේ ඔබගේ වේලාව තහවුරුයි."]),
 "ta": (["உங்கள் {bank} OTP 482915. வங்கி ஊழியர்கள் உட்பட யாருடனும் பகிர வேண்டாம்.",
         "உங்கள் {bank} கணக்கில் ரூ. 2,500 வரவு வைக்கப்பட்டது.",
         "{courier}: உங்கள் பார்சல் நாளை காலை 10 முதல் மதியம் 2 வரை வழங்கப்படும்.",
         "அம்மா, நான் ஏழு மணிக்கு வீட்டுக்கு வருவேன். பாண் வாங்கட்டுமா?",
         "நாளை வகுப்பு காலை 8 மணிக்கு."],
        ["உங்கள் கட்டணத்திற்கு நன்றி. ரசீது எண் 88213.",
         "ஞாயிறு அத்தை வீட்டில் சாப்பாடு, மறக்க வேண்டாம்.",
         "திங்கள் காலை 9 மணிக்கு கிளினிக் சந்திப்பு உறுதி."]),
 "singlish": (["amma mama hathata witara gedara enawa, paan ganna one da",
               "machan heta class eka ude 8ta thiyenawa ne",
               "{courier}: oyage parcel eka heta deliver karanawa",
               "oya kaawada? mama bus eke inne"],
              ["ane ada match eka balanna yamu",
               "ithin mage phone eka charge na, passe call karannam",
               "iridha nanda lage gedara kaama yamu"]),
 "tanglish": (["amma naan ezhu mani ku veetuku varen, bread vaangava",
               "machan naalaiku class kaalai 8 ku irukku",
               "{courier}: unga parcel naalaiku deliver aagum",
               "saapteengala? naan bus la irukken"],
              ["innaiku match paakka polaama",
               "en phone charge illa, apram call panren",
               "sunday aththai veetla saapadu"]),
}


# Extra legit messages used ONLY in train (test keeps its own unseen legit phrasings).
LEGIT_EXTRA = {
 "en": ["Payment of Rs. 3,200 received for your water bill. Thank you.", "Your {bank} statement for September is ready in the app.",
        "Your order #4471 has been packed and will ship today.", "Class is cancelled tomorrow, please read chapter 4 instead.",
        "Happy birthday putha! Call me when you are free.", "The doctor's appointment is at 4.30pm on Friday.",
        "Your mobile reload of Rs. 500 was successful.", "Bus is late, I will be there in 20 minutes.",
        "Thank you for shopping with us. Your receipt total is Rs. 1,850.", "Reminder: parent-teacher meeting on Monday at 2pm.",
        "Your {courier} parcel was delivered and signed for.", "Can you send me the photos from yesterday?"],
 "si": ["ඔබගේ ජල බිල්පතට රු. 3,200ක ගෙවීම ලැබුණි. ස්තූතියි.", "ඔබගේ ඇණවුම අද යවනු ලැබේ.",
        "හෙට පන්තිය නැහැ, හතරවෙනි පාඩම කියවන්න.", "සුබ උපන්දිනයක් පුතේ! නිදහස් වුණාම කතා කරන්න.",
        "සිකුරාදා හවස 4.30ට වෛද්‍යවරයා හමුවීමට වේලාව තියෙනවා.", "ඔබගේ රු. 500 රීලෝඩ් එක සාර්ථකයි.",
        "බස් එක පරක්කුයි, විනාඩි 20කින් එනවා.", "ඊයේ ෆොටෝ ටික එවන්න පුළුවන්ද?",
        "සඳුදා දෙකට දෙමාපිය රැස්වීම තියෙනවා.", "ඔබගේ පාර්සලය භාර දෙන ලදී."],
 "ta": ["உங்கள் தண்ணீர் கட்டணம் ரூ. 3,200 பெறப்பட்டது. நன்றி.", "உங்கள் ஆர்டர் இன்று அனுப்பப்படும்.",
        "நாளை வகுப்பு இல்லை, நான்காம் பாடத்தைப் படியுங்கள்.", "பிறந்தநாள் வாழ்த்துக்கள் மகனே! நேரம் கிடைக்கும் போது அழை.",
        "வெள்ளிக்கிழமை மாலை 4.30க்கு மருத்துவர் சந்திப்பு.", "உங்கள் ரூ. 500 ரீலோட் வெற்றிகரமாக முடிந்தது.",
        "பஸ் தாமதம், 20 நிமிடத்தில் வருவேன்.", "நேற்றைய புகைப்படங்களை அனுப்ப முடியுமா?",
        "திங்கள் மதியம் 2 மணிக்கு பெற்றோர் கூட்டம்.", "உங்கள் பார்சல் ஒப்படைக்கப்பட்டது."],
 "singlish": ["water bill eka gewwa, rs 3200 ne", "oyage order eka ada yawanawa", "heta class eka na, 4 weni paadama kiyawanna",
              "suba upandinayak putha! free unama call karanna", "sikurada 4.30ta doctor appointment eka thiyenawa",
              "bus eka parakku, winadi 20kin ennam", "iye photos tika ewanna puluwanda", "sanduda dekata parents meeting eka"],
 "tanglish": ["water bill kattiten, rs 3200", "unga order innaiku anuppuvanga", "naalaiku class illa, 4th lesson padinga",
              "happy birthday thambi! free aanaa call pannu", "velli kizhamai 4.30 ku doctor appointment",
              "bus late, 20 nimisham la varen", "nethu photos anuppa mudiyuma", "monday 2 mani ku parents meeting"],
}

OPENERS = {"en": (["Dear Customer,", "ALERT:", "Hello,"], ["Notice:", "Hi sir/madam,", "IMPORTANT"]),
           "si": (["හිතවත් පාරිභෝගිකය,", "දැනුම්දීමයි:"], ["වැදගත්:", "ආයුබෝවන්,"]),
           "ta": (["அன்புள்ள வாடிக்கையாளரே,", "அறிவிப்பு:"], ["முக்கியம்:", "வணக்கம்,"]),
           "singlish": (["ayubowan,", "dear customer,"], ["wadagath:", "hello,"]),
           "tanglish": (["vanakkam,", "dear customer,"], ["mukkiyam:", "hello,"])}
CLOSERS = {"en": (["Call {phone} for help.", "Act now."], ["Reply YES to continue.", "Offer ends tonight."]),
           "si": (["උදව් සඳහා {phone} අමතන්න.", "වහාම ක්‍රියා කරන්න."], ["දිගටම යාමට YES ලෙස පිළිතුරු දෙන්න."]),
           "ta": (["உதவிக்கு {phone} அழைக்கவும்.", "உடனே செயல்படுங்கள்."], ["தொடர YES என பதிலளிக்கவும்."]),
           "singlish": (["udaw ona nam {phone} ekata call karanna", "ikmanin karanna"], ["YES kiyala reply karanna"]),
           "tanglish": (["udhavi ku {phone} ku call pannunga", "udane seiyunga"], ["YES nu reply pannunga"])}

LANG_SHARE = {"en": 0.3, "si": 0.2, "ta": 0.15, "singlish": 0.2, "tanglish": 0.08, "mixed": 0.07}


def fill(t, rng):
    return t.format(bank=rng.choice(BANKS), courier=rng.choice(COURIERS), link=rng.choice(LINKS),
                    phone=PHONE, amount=rng.choice(AMOUNTS))


def mixify(text, rng):
    """Code-mixed native-script text: swap a few words for English, like real mixed messages."""
    for a, b in [("ගිණුම", "account එක"), ("ගෙවන්න", "pay කරන්න"), ("කාඩ්පත", "card එක"),
                 ("கணக்கு", "account"), ("செலுத்துங்கள்", "pay பண்ணுங்க"), ("அட்டை", "card")]:
        text = text.replace(a, b)
    return text + rng.choice([" please", " urgent", " ok", " pls reply"])


def _halves(t):
    """Split a phrasing into (hook, action) at the first sentence or clause break."""
    for sep in [". ", "। ", ", ", ": "]:
        if sep in t:
            a, b = t.split(sep, 1)
            return a + sep.strip(), b
    return t, ""


def combos(label, lang, split):
    """Train and test use DIFFERENT hook/action combinations; every piece is still real scam wording."""
    pool = CORE[label][lang][0] + CORE[label][lang][1]
    hooks, actions = zip(*[_halves(t) for t in pool])
    pairs = [(i, j) for i in range(len(hooks)) for j in range(len(actions))]
    keep = [(i, j) for i, j in pairs if ((i + j) % 2 == 0) == (split == "train")]
    return [(hooks[i] + " " + actions[j]).strip() for i, j in keep]


def message(label, lang, split, rng):
    base_lang = rng.choice(["si", "ta"]) if lang == "mixed" else lang
    s = 0 if split == "train" else 1
    if label == "legit":
        pool = LEGIT[base_lang][0] + LEGIT[base_lang][1]
        pool = pool[::2] + LEGIT_EXTRA[base_lang] if s == 0 else pool[1::2]
        core = fill(rng.choice(pool), rng)
        parts = [core]
    else:
        core = fill(rng.choice(combos(label, base_lang, split)), rng)
        parts = [core]
        if rng.random() < 0.5:
            parts.insert(0, rng.choice(OPENERS[base_lang][s]))
        if rng.random() < 0.5:
            parts.append(fill(rng.choice(CLOSERS[base_lang][s]), rng))
    text = " ".join(parts)
    if lang == "mixed":
        text = mixify(text, rng)
    return text


def build(n, split, seed):
    rng = random.Random(seed)
    labels = ["legit"] * 6 + list(CORE)  # about 46% legit
    langs, weights = zip(*LANG_SHARE.items())
    rows = []
    for _ in range(n):
        label, lang = rng.choice(labels), rng.choices(langs, weights)[0]
        rows.append({"text": message(label, lang, split, rng), "label": label, "language": lang,
                     "channel": rng.choice(["sms", "sms", "whatsapp"])})
    return rows


SHIFT = {
 "en": ["SL-UDI: your new digital ID is not activated. Complete verification within 24 hours at {link} or your NIC will be cancelled.",
        "Govt notice: link your SL-UDI digital identity to your bank now. Enter the OTP at {link}."],
 "si": ["SL-UDI: ඔබගේ නව ඩිජිටල් හැඳුනුම්පත සක්‍රිය නැත. පැය 24ක් ඇතුළත {link} හරහා තහවුරු කරන්න, නැතහොත් හැඳුනුම්පත අවලංගු වේ.",
        "රජයේ දැනුම්දීම: ඔබගේ SL-UDI ඩිජිටල් හැඳුනුම්පත බැංකුවට සම්බන්ධ කරන්න. {link} හි OTP ඇතුළත් කරන්න."],
 "ta": ["SL-UDI: உங்கள் புதிய டிஜிட்டல் அடையாள அட்டை செயல்படுத்தப்படவில்லை. 24 மணி நேரத்தில் {link} இல் சரிபார்க்கவும்.",
        "அரசு அறிவிப்பு: உங்கள் SL-UDI டிஜிட்டல் அடையாளத்தை வங்கியுடன் இணைக்கவும். {link} இல் OTP ஐ உள்ளிடவும்."],
 "singlish": ["SL-UDI digital ID eka activate wela na, paya 24k athule {link} eken verify karanna nathnam ID eka cancel",
              "aanduwen: oyage SL-UDI ID eka bank ekata link karanna, {link} eke OTP eka danna"],
 "tanglish": ["SL-UDI digital ID activate aagala, 24 mani neram kulla {link} la verify pannunga illana ID cancel",
              "arasaangam: unga SL-UDI ID ah bank oda link pannunga, {link} la OTP podunga",
              "unga pudhu digital ID ready, activate panna {link} la NIC number um OTP um kudunga seekiram"],
}
OBFUSCATED = ["http://sl-ud1-verify.top", "b1t.ly/UDl-lk", "http://dig1tal-id.xyz/l0gin", "tinyurl.com/sludi-act"]


def build_shifted(n, seed):
    rng = random.Random(seed)
    shares = {"tanglish": 0.35, "singlish": 0.2, "si": 0.2, "ta": 0.15, "en": 0.1}
    langs, weights = zip(*shares.items())
    rows = []
    for _ in range(n):
        if rng.random() < 0.15:  # some normal traffic still flows during the wave
            r = build(1, "test", rng.random())[0]
            rows.append(r)
            continue
        lang = rng.choices(langs, weights)[0]
        text = rng.choice(SHIFT[lang]).format(link=rng.choice(OBFUSCATED))
        rows.append({"text": text, "label": "digital_id_scam", "language": lang,
                     "channel": rng.choice(["sms", "whatsapp", "whatsapp"])})
    return rows


def write(rows, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["text", "label", "language", "channel"])
        w.writeheader()
        w.writerows(rows)
    print(f"{path}: {len(rows)} rows")


if __name__ == "__main__":
    out = Path("data/processed")
    write(build(3000, "train", 1), out / "train.csv")
    write(build(600, "test", 2), out / "test.csv")
    write(build_shifted(300, 3), out / "shifted.csv")
    write(build_shifted(100, 4), out / "shifted_eval.csv")
