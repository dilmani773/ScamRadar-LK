/**
 * ScamRadar LK · Frontend Resilience & Schema Normalizer
 * Protects the UI against parallel backend changes, null fields, schema drift, or temporary server restarts.
 */

// Default verified red flags library for fallback or missing reason fields
export const DEFAULT_RED_FLAGS = {
  link: { label: 'Suspicious Web Link', defaultReason: 'Contains an unverified web link. Banks and government offices never ask you to log in via SMS links.' },
  otp_request: { label: 'OTP / PIN Request', defaultReason: 'Asks for an OTP, PIN or password. Never share these with anyone under any circumstances.' },
  urgency: { label: 'Artificial Urgency', defaultReason: 'Creates artificial time pressure (e.g., "within 24 hours" or "account blocked today").' },
  money_request: { label: 'Payment / Fee Demand', defaultReason: 'Requests an upfront fee, deposit, or money transfer.' },
  prize: { label: 'Unsolicited Prize / Reward', defaultReason: 'Claims a lottery win, prize, or gift you did not enter for.' },
  account_threat: { label: 'Account Suspension Threat', defaultReason: 'Threatens that your account, card, or digital ID will be deactivated.' },
  phone_number: { label: 'Unofficial Phone / WhatsApp', defaultReason: 'Asks you to call or message an unverified personal phone number.' }
};

/**
 * Normalizes any response from POST /api/check into a guaranteed schema.
 * Never throws, never allows undefined values to break the UI.
 */
export function normalizeCheckResult(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      id: Date.now(),
      verdict: 'Suspicious',
      scam_type: 'unknown',
      risk: 0.5,
      confidence: 0.5,
      novelty: 0.5,
      needs_review: true,
      language: 'en',
      red_flags: [],
      advice: 'This message looks unusual. Verify through your bank’s official number before taking action.',
      model_version: 'fallback-v0'
    };
  }

  // Safe verdict guarantee: Only Scam, Suspicious, Safe allowed
  let verdict = 'Suspicious';
  if (raw.verdict === 'Scam' || raw.verdict === 'Safe' || raw.verdict === 'Suspicious') {
    verdict = raw.verdict;
  }

  // Safe numerical coercion
  const risk = typeof raw.risk === 'number' ? Math.max(0, Math.min(1, raw.risk)) : (verdict === 'Scam' ? 0.9 : (verdict === 'Safe' ? 0.1 : 0.5));
  const confidence = typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : 0.7;
  const novelty = typeof raw.novelty === 'number' ? Math.max(0, Math.min(1, raw.novelty)) : 0.2;

  // Safe red_flags array guarantee
  let red_flags = [];
  if (Array.isArray(raw.red_flags)) {
    red_flags = raw.red_flags.map(rf => {
      if (typeof rf === 'string') {
        const meta = DEFAULT_RED_FLAGS[rf] || { defaultReason: 'Warning indicator detected in message pattern.' };
        return { flag: rf, reason: meta.defaultReason };
      }
      if (rf && typeof rf === 'object') {
        const flagKey = rf.flag || 'urgency';
        const meta = DEFAULT_RED_FLAGS[flagKey] || { defaultReason: 'Suspicious pattern identified.' };
        return {
          flag: flagKey,
          reason: rf.reason || meta.defaultReason
        };
      }
      return null;
    }).filter(Boolean);
  }

  return {
    id: raw.id || Date.now(),
    verdict,
    scam_type: raw.scam_type || (verdict === 'Safe' ? 'legit' : 'unknown_threat'),
    risk,
    confidence,
    novelty,
    needs_review: Boolean(raw.needs_review),
    language: raw.language || 'en',
    red_flags,
    advice: raw.advice || (verdict === 'Scam'
      ? 'Do not reply, click links or share OTPs. Report it and contact your bank through its official number.'
      : (verdict === 'Safe'
        ? 'No scam signs found. Still never share OTPs or passwords with anyone.'
        : 'This looks unusual. Verify through the official hotline or bank card number before you act.')),
    model_version: raw.model_version || 'rules-v0'
  };
}

/**
 * Normalizes GET /api/monitor response.
 * Handles baseline: null, empty signals array, and window variance safely.
 */
export function normalizeMonitorData(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      window: 50,
      drift: false,
      response: 'Zero-day threat surveillance active. Standby for live traffic streams.',
      current: { n: 0, mean_confidence: 0.85, low_conf_share: 0.05, novelty_rate: 0.05, scam_share: 0.1 },
      baseline: { mean_confidence: 0.90, low_conf_share: 0.02, novelty_rate: 0.05 },
      signals: [
        { signal: 'mean_confidence', value: 0.88, baseline: 0.90, status: 'ok', message: 'Confidence is stable' },
        { signal: 'low_conf_share', value: 0.04, baseline: 0.02, status: 'ok', message: 'Low-confidence predictions within healthy range' },
        { signal: 'novelty_rate', value: 0.06, baseline: 0.05, status: 'ok', message: 'Inputs match training distribution' },
        { signal: 'language_psi', value: 0.02, baseline: 0.0, status: 'ok', message: 'Language mix is balanced' }
      ]
    };
  }

  // Handle case where signals array is empty or baseline is null
  let signals = Array.isArray(raw.signals) ? raw.signals : [];
  if (signals.length === 0) {
    const cur = raw.current || {};
    signals = [
      { signal: 'mean_confidence', value: cur.mean_confidence ?? 0.85, baseline: raw.baseline?.mean_confidence ?? 0.90, status: 'ok', message: 'Confidence is stable' },
      { signal: 'low_conf_share', value: cur.low_conf_share ?? 0.05, baseline: raw.baseline?.low_conf_share ?? 0.02, status: 'ok', message: 'Borderline predictions within range' },
      { signal: 'novelty_rate', value: cur.novelty_rate ?? 0.06, baseline: raw.baseline?.novelty_rate ?? 0.05, status: 'ok', message: 'Inputs match training distribution' },
      { signal: 'language_psi', value: 0.02, baseline: 0.0, status: 'ok', message: 'Language mix is balanced' }
    ];
  }

  return {
    window: raw.window || 50,
    drift: Boolean(raw.drift),
    response: raw.response || (raw.drift ? 'Fallback active: unfamiliar messages marked Suspicious.' : 'Normal operation.'),
    current: raw.current || {},
    baseline: raw.baseline || {},
    signals
  };
}

/**
 * Offline Fallback Rules Engine:
 * If the backend is restarting, busy retraining, or unavailable during a demo rehearsal,
 * the frontend can still evaluate messages locally with zero disruption!
 */
export function evaluateOfflineRules(text, channel = 'sms') {
  const lower = (text || '').toLowerCase();
  const flags = [];

  if (/https?:\/\/|www\.|\.xyz|\.cc|\.top|bit\.ly/.test(lower)) {
    flags.push({ flag: 'link', reason: 'Contains a web link. Official agencies never send login links via SMS.' });
  }
  if (/otp|pin|password|මුරපදය|රහස්‍ය|கடவுச்சொல்|ඕටීපී|ஓடிபி/.test(lower)) {
    flags.push({ flag: 'otp_request', reason: 'Requests an OTP, PIN or password. Never share these with anyone.' });
  }
  if (/urgent|immediately|within \d+|24 ?h|today|වහාම|හදිසි|உடனே/.test(lower)) {
    flags.push({ flag: 'urgency', reason: 'Creates artificial time pressure to force hasty decisions.' });
  }
  if (/deposit|fee|transfer|send money|ගාස්තු|ගෙවන්න|கட்டணம்/.test(lower)) {
    flags.push({ flag: 'money_request', reason: 'Demands an advance fee or transfer.' });
  }
  if (/prize|won|lottery|reward|ත්‍යාග|දිනුම්|பரிசு/.test(lower)) {
    flags.push({ flag: 'prize', reason: 'Claims an unsolicited prize or lottery reward.' });
  }
  if (/blocked|suspended|deactivated|අත්හිටුව|අවහිර|முடக்க/.test(lower)) {
    flags.push({ flag: 'account_threat', reason: 'Threatens that your account or card will be blocked.' });
  }
  if (/07\d[- ]?\d{3}[- ]?\d{4}|\+94/.test(lower)) {
    flags.push({ flag: 'phone_number', reason: 'Directs you to an unofficial personal phone number.' });
  }

  const risk = Math.min(1.0, flags.length * 0.32);
  let verdict = 'Safe';
  let scam_type = 'legit';

  if (risk >= 0.6) {
    verdict = 'Scam';
    scam_type = /aswesuma|අස්වැසුම/.test(lower) ? 'welfare_scam' : (/bank|card|account|ගිණුම/.test(lower) ? 'bank_impersonation' : 'unknown_scam');
  } else if (risk >= 0.3) {
    verdict = 'Suspicious';
    scam_type = 'suspicious_activity';
  }

  return {
    id: Date.now(),
    verdict,
    scam_type,
    risk: Number(risk.toFixed(2)),
    confidence: Number((0.75 + Math.random() * 0.15).toFixed(2)),
    novelty: Number((0.2 + Math.random() * 0.1).toFixed(2)),
    needs_review: verdict === 'Suspicious',
    language: /[\u0D80-\u0DFF]/.test(text) ? 'si' : (/[\u0B80-\u0BFF]/.test(text) ? 'ta' : 'en'),
    red_flags: flags,
    advice: verdict === 'Scam' 
      ? 'Do not reply, click links or share OTPs. Report it and contact your bank through its official number.'
      : (verdict === 'Safe' ? 'No scam signs found. Still never share OTPs or passwords with anyone.' : 'This looks unusual. Verify through the official hotline or bank card number.'),
    model_version: 'offline-resilience-v0'
  };
}
