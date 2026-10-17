# ScamRadar LK · UI Content Specification Summary
> Full comprehensive specification: [scamradar_ui_content_design_system.md](file:///Users/test/.gemini/antigravity-ide/brain/836dd195-dbc2-4ec1-a871-0f60d5cc9fcf/scamradar_ui_content_design_system.md)

## 1. Verdict Color & Microcopy Tokens
- **Scam (Red `#EF4444`):** "🚨 High Scam Probability Detected / අවවාදයයි: මෙය වංචනික පණිවිඩයකි / எச்சரிக்கை: இது ஒரு மோசடி செய்தி"
  - *Metric badge format:* `"Risk 93% · Confidence 71%"` (Metrics separated clearly)
- **Suspicious (Amber `#F59E0B`):** "⚠️ Suspicious / Unverified Message / සැකකටයුතු හෝ සනාථ නොකළ පණිවිඩයකි / சந்தேகத்திற்கிடமான செய்தி" *(Safe fallback for novel/unfamiliar messages)*
- **Safe (Green `#10B981`):** "🛡️ Likely Legitimate Message / ආරක්ෂිත පණිවිඩයක් විය හැක / பாதுகாப்பான செய்தி"

## 2. Red Flag Catalog (Aligned to 7 API IDs)
*Icons & Labels for the 7 API Red Flags (descriptions come directly from API `reason` field):*
1. `link`: 🔗 **Unverified Web Link**
2. `otp_request`: 🔑 **OTP / PIN Request**
3. `urgency`: ⏳ **Artificial Urgency / Short Deadline**
4. `money_request`: 💸 **Payment / Advance Fee Demand**
5. `prize`: 🎁 **Unsolicited Prize / Reward**
6. `account_threat`: 🛑 **Account Suspension Threat**
7. `phone_number`: 📱 **Suspicious / Unofficial Phone Number**

## 3. Presets (Synthetic & Compliant)
*All presets use `07X-XXX-XXXX`, fictional bank names (*Lanka Pragathi Bank*), and include a **"Synthetic example"** label:*
1. **Aswesuma Fake SMS (Sinhala) · [Synthetic example]:**
   `"ඔබගේ අස්වැසුම සුබසාධන මුදල් ලබා ගැනීමට වහාම මෙම ලින්ක් එක ක්ලික් කර ඔබගේ OTP අංකය ලබා දෙන්න http://aswesuma-lk.xyz"`
2. **Bank Phishing Alert (English) · [Synthetic example]:**
   `"Lanka Pragathi Bank Alert: Your debit card has been blocked due to suspicious activity. Verify immediately at http://pragathi-verify.cc/login or call 07X-XXX-XXXX"`
3. **Lottery / Prize Scam (Tanglish) · [Synthetic example]:**
   `"Congratulations! Ungalukku 500,000 LKR prize kidachirukku. Release panna fee deposit pannunga WhatsApp 07X-XXX-XXXX"`
4. **Legit Bank Notification (Safe) · [Synthetic example]:**
   `"Lanka Pragathi Bank: Your account XXXXX1234 has been credited with LKR 15,000.00 on 17/10/2026. Ref: SALARY-OCT."`

## 4. Emergency Contacts & Safety Advice
- 💳 **Primary Advice:** "Call the official number printed on the back of your bank card."
- 📞 **1919**: Government Information Centre (GIC) — Official inquiries for government services and Aswesuma welfare.

## 5. System States & Fallback Messages
- **Loading:** *"Scanning message for scam patterns & threat indicators..."*
- **Empty:** *"Ready to analyze. Select a synthetic preset above or paste any SMS / WhatsApp message."*
- **Error (Service Unreachable):** *"Can’t reach the ScamRadar service. Check your connection and retry."*

## 6. The 4 Monitoring Signals
1. **Mean Confidence**: Alert if drops > 0.10 from baseline
2. **Low-Confidence Share**: Alert if > 10% and 2x baseline
3. **Novelty Rate (Embedding distance)**: Alert if > 10% unfamiliar
4. **Language Mix (PSI)**: Alert if PSI >= 0.20
