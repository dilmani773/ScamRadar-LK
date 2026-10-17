import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Send, 
  RotateCcw, 
  Phone, 
  Copy, 
  Check as CheckIcon, 
  Languages, 
  Gavel, 
  Link2Off, 
  BrainCircuit, 
  Cpu, 
  Activity, 
  Sparkles,
  Shield,
  XCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { API_URL } from '../config';
import { normalizeCheckResult, evaluateOfflineRules } from '../utils/apiResilience';
import { useLang } from '../i18n';

// Compliant Synthetic Presets (with 07X-XXX-XXXX & fictional institutions)
const SYNTHETIC_PRESETS = [
  {
    id: 'aswesuma',
    title: 'Aswesuma Scam (Sinhala)',
    channel: 'SMS',
    text: 'Aswesuma 2nd stage relief fund approved. Your NIC has been selected to claim Rs. 15,000 cash grant directly to your bank. Confirm details now: https://aswesuma-gov-claim.xyz/portal'
  },
  {
    id: 'bank',
    title: 'Bank Phishing (English)',
    channel: 'SMS',
    text: 'Lanka Pragathi Bank Security Alert: Your debit card ending in 4921 has been restricted due to 3 suspicious transactions. Reactivate immediately via https://pragathi-verify-online.cc/secure or call 07X-XXX-XXXX.'
  },
  {
    id: 'prize',
    title: 'Prize & Fee (Tanglish)',
    channel: 'WHATSAPP',
    text: 'Ungalukku Lanka Super Prize adichurukku! Rs. 250,000 claim panna processing fee 2,500 ezCash anuppavum. Contact WhatsApp agent: 07X-XXX-XXXX immediately.'
  },
  {
    id: 'safe',
    title: 'Legit Alert (Safe)',
    channel: 'SMS',
    text: 'Lanka Pragathi Bank: Your account 0038XXXX has been credited LKR 45,000.00 on 24-FEB-2026 at 14:32. Ref: SALARY-FEB26. Available bal: LKR 102,400.50. Call bank card hotline if dispute.'
  },
  {
    id: 'digitalId',
    title: 'SL-UDI Digital ID (Singlish)',
    channel: 'SMS',
    text: 'Obe Digital National Identity (SL-UDI) verification kalin karanna. Click karanna: https://sl-identity-renew.net/login. Nathnam ID temporary block wena bawa danwamu.'
  }
];

const LANGUAGE_LABELS = {
  si: { name: 'Sinhala Script', subtext: 'Native Sinhala Unicode markers detected' },
  ta: { name: 'Tamil Script', subtext: 'Native Tamil Unicode typography detected' },
  singlish: { name: 'Singlish / Sinhala Romanized', subtext: 'Dual-channel lexer matched colloquial Sinhala in Latin text' },
  tanglish: { name: 'Tanglish / Tamil Romanized', subtext: 'Dual-channel lexer matched vernacular Tamil in Latin text' },
  en: { name: 'English (Formal)', subtext: 'Standard Latin grammar and institutional terminology' },
  mixed: { name: 'Mixed Script Vernacular', subtext: 'Multilingual hybrid text across Sinhala, Tamil, and English' }
};

const SCAM_TYPE_LABELS = {
  welfare_scam: { name: 'Welfare & Cash Grant Lure', subtext: 'Impersonates Aswesuma Welfare Board & Government relief' },
  bank_impersonation: { name: 'Bank Impersonation Phish', subtext: 'Impersonates commercial bank security or card division' },
  fake_prize: { name: 'Advance Fee & Lottery Scam', subtext: 'Promises cash prizes or gifts contingent on advance fee deposits' },
  digital_id_scam: { name: 'SL-UDI Digital ID Impersonation', subtext: 'Harvests National Identity Card & biometric activation credentials' },
  parcel_fee: { name: 'Courier & Customs Clearance Scam', subtext: 'Claims an overseas parcel requires upfront release fees' },
  fake_job: { name: 'Employment / Deposit Scam', subtext: 'Demands advance registration fees for work-from-home offers' },
  loan_app: { name: 'Predatory Instant Loan Fraud', subtext: 'Promotes unverified APK apps seeking device access' },
  investment_scheme: { name: 'Pyramid / Double-Money Fraud', subtext: 'Guarantees unrealistic returns on informal crypto or pyramid tiers' },
  legit: { name: 'Standard Transaction Alert', subtext: 'Looks like a normal notification; no scam pattern matched' }
};

export default function Check() {
  const { lang, t, has } = useLang();
  const [text, setText] = useState(
    'Aswesuma 2nd stage relief fund approved. Your NIC has been selected to claim Rs. 15,000 cash grant directly to your bank. Confirm details now: https://aswesuma-gov-claim.xyz/portal'
  );
  const [channel, setChannel] = useState('SMS');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [latency, setLatency] = useState('0.14s');
  const [copied, setCopied] = useState(false);
  const [offlineFallback, setOfflineFallback] = useState(false);

  const handlePresetSelect = (preset) => {
    setText(preset.text);
    setChannel(preset.channel);
    setOfflineFallback(false);
  };

  const handleClear = () => {
    setText('');
    setResult(null);
    setOfflineFallback(false);
  };

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${API_URL}/api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          channel: channel.toLowerCase()
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      setLatency(`${elapsed}s`);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      setResult(normalizeCheckResult(data));
      setOfflineFallback(false);
    } catch (err) {
      console.warn('API Check offline, engaging heuristic fallback:', err);
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      setLatency(`${elapsed}s`);
      setResult(evaluateOfflineRules(text, channel.toLowerCase()));
      setOfflineFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (!result) return;
    const summary = `ScamRadar LK Analysis Summary:\nVerdict: ${result.verdict}\nClassification: ${result.scam_type}\nRisk: ${Math.round(result.risk * 100)}%\nAdvice: ${result.advice}\nReport scams: Sri Lanka CERT hotline 101 / cert.gov.lk`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Derive dynamic display attributes
  const isScam = result?.verdict === 'Scam';
  const isSuspicious = result?.verdict === 'Suspicious';
  const isSafe = result?.verdict === 'Safe';

  const score = result 
    ? Math.round((isSafe ? (result.confidence || 0.95) : (result.risk || 0.9)) * 100) 
    : 0;

  const langMeta = LANGUAGE_LABELS[result?.language]
    ? { name: t(`lang.${result.language}.name`), subtext: t(`lang.${result.language}.sub`) }
    : {
      name: (result?.language || 'English').toUpperCase(),
      subtext: 'Linguistic patterns evaluated across national vernaculars'
    };

  const scamTypeMeta = SCAM_TYPE_LABELS[result?.scam_type]
    ? { name: t(`type.${result.scam_type}.name`), subtext: t(`type.${result.scam_type}.sub`) }
    : (lang === 'en'
      ? {
        name: (result?.scam_type || 'Potential Threat').replace(/_/g, ' '),
        subtext: 'Pattern matched against threat intelligence taxonomy'
      }
      : { name: t('type.unknown.name'), subtext: t('type.unknown.sub') });

  // Red-flag reasons and advice come from the API in English; show local text for සිංහල / தமிழ்
  const flagReason = (flag) => (lang !== 'en' && has(`reason.${flag.flag}`) ? t(`reason.${flag.flag}`) : flag.reason);
  const flagTitle = (flag) => (lang === 'en'
    ? flag.flag.replace(/_/g, ' ').toUpperCase()
    : (has(`flag.${flag.flag}`) ? t(`flag.${flag.flag}`) : flag.flag.replace(/_/g, ' ')));
  const adviceText = result && lang !== 'en' && has(`advice.${result.verdict}`) ? t(`advice.${result.verdict}`) : result?.advice;

  // Detect link indicator in text or flags
  const linkFlag = result?.red_flags?.find(f => f.flag === 'link');
  const domainMeta = linkFlag 
    ? { title: t('domain.link.title'), subtext: flagReason(linkFlag), isThreat: true }
    : (isSafe 
      ? { title: t('domain.none.title'), subtext: t('domain.none.sub'), isThreat: false }
      : { title: t('domain.direct.title'), subtext: t('domain.direct.sub'), isThreat: true });

  return (
    <div className="check-page-wrapper">
      {/* Ambient Civic Glow Backgrounds */}
      <div className="ambient-glow-top" />
      <div className="ambient-glow-right" />
      <div className="ambient-glow-left" />

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-pill-badge">
          <Shield size={16} className="hero-badge-icon" />
          <span>{t('hero.badge')}</span>
        </div>
        <h1>{t('hero.title')}</h1>
        <p>{t('hero.desc')}</p>
      </section>

      {/* Main Verification Card */}
      <div className="verification-card">
        {/* Synthetic Test Examples */}
        <div className="presets-header">
          <span className="presets-label">{t('presets.label')}</span>
          <span className="presets-hint">{t('presets.hint')}</span>
        </div>

        <div className="presets-chips-row">
          {SYNTHETIC_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="preset-chip-btn"
              onClick={() => handlePresetSelect(p)}
            >
              <span>{p.title}</span>
              <span className="synthetic-tag">{t('presets.tag')}</span>
            </button>
          ))}
        </div>

        {/* Textarea Container */}
        <div className="textarea-container">
          <textarea
            className="message-textarea"
            placeholder={t('input.placeholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            rows={5}
          />
          <div className="textarea-bottom-bar">
            <span>{t('input.chars', { n: text.length })}</span>
            {text.length > 0 && (
              <button 
                type="button" 
                className="clear-btn"
                onClick={handleClear}
              >
                <RotateCcw size={13} />
                <span>{t('input.clear')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Controls Row */}
        <div className="controls-row">
          {/* Source Toggle */}
          <div className="source-toggle-group">
            <span className="source-label">{t('source.label')}</span>
            <div className="source-pills">
              {['SMS', 'WHATSAPP', 'OTHER'].map((src) => (
                <button
                  key={src}
                  type="button"
                  className={`source-pill-btn ${channel === src ? 'active' : ''}`}
                  onClick={() => setChannel(src)}
                >
                  {src === 'OTHER' ? t('source.OTHER') : src}
                </button>
              ))}
            </div>
          </div>

          {/* Analyze CTA */}
          <button
            type="button"
            className="btn-analyze"
            disabled={loading || !text.trim()}
            onClick={handleAnalyze}
          >
            <Send size={17} className={loading ? 'spin' : ''} />
            <span>{loading ? t('analyze.busy') : t('analyze.btn')}</span>
          </button>
        </div>
      </div>

      {/* Offline Notice if backend is updating */}
      {offlineFallback && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '0.75rem 1.25rem',
          borderRadius: '1rem',
          background: 'var(--warning-container)',
          color: 'var(--on-warning)',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={18} />
          <span>{t('offline.notice')}</span>
        </div>
      )}

      {/* Dynamic Interactive Verdict Section (Only shown when analyzed) */}
      {result && !loading && (
        <div className="verdict-container">
          <div className="verdict-main-card">
            {/* Top Verdict Banner */}
            <div className={`verdict-banner ${result.verdict}`}>
              <div className="verdict-banner-left">
                <div className="verdict-icon-box">
                  {isScam && <AlertTriangle size={26} />}
                  {isSuspicious && <AlertCircle size={26} />}
                  {isSafe && <ShieldCheck size={26} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="verdict-tag">
                      {t(`verdict.tag.${result.verdict}`)}
                    </span>
                    <span className="verdict-latency">{t('verdict.checkedIn', { t: latency })}</span>
                  </div>
                  <h3 className="verdict-banner-title">
                    {isScam && t('verdict.title.Scam', { p: Math.round(result.risk * 100) })}
                    {isSuspicious && t('verdict.title.Suspicious', { p: Math.round(result.risk * 100) })}
                    {isSafe && t('verdict.title.Safe', { p: Math.round((result.confidence || 0.98) * 100) })}
                  </h3>
                </div>
              </div>

              {/* Circular Donut Meter */}
              <div className="verdict-donut-wrapper">
                <div className="donut-svg-box">
                  <svg className="donut-svg" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="var(--surface-container-high)"
                      strokeWidth="3.5"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={isScam ? 'var(--error)' : (isSuspicious ? 'var(--warning)' : 'var(--secondary)')}
                      strokeDasharray={`${score}, 100`}
                      strokeLinecap="round"
                      strokeWidth="3.5"
                    />
                  </svg>
                  <span className="donut-number">{score}%</span>
                </div>
                <div className="donut-info">
                  <span className="donut-label">
                    {isSafe ? t('donut.confidence') : t('donut.threat')}
                  </span>
                  <span className="donut-status">
                    {t(`donut.status.${result.verdict}`)}
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Detail Cards Grid */}
            <div className="detail-grid">
              {/* Detected Script */}
              <div className="detail-card">
                <div className="detail-card-top">
                  <span className="detail-label">{t('detail.script')}</span>
                  <Languages size={18} color="var(--secondary)" />
                </div>
                <div>
                  <p className="detail-value">{langMeta.name}</p>
                  <p className="detail-desc">{langMeta.subtext}</p>
                </div>
              </div>

              {/* Threat Classification */}
              <div className="detail-card">
                <div className="detail-card-top">
                  <span className="detail-label">{t('detail.type')}</span>
                  <Gavel size={18} color={isSafe ? 'var(--secondary)' : 'var(--error)'} />
                </div>
                <div>
                  <p className="detail-value">{scamTypeMeta.name}</p>
                  <p className="detail-desc">{scamTypeMeta.subtext}</p>
                </div>
              </div>

              {/* Domain / Threat Indicator */}
              <div className="detail-card">
                <div className="detail-card-top">
                  <span className="detail-label">{t('detail.indicator')}</span>
                  <Link2Off size={18} color={domainMeta.isThreat ? 'var(--error)' : 'var(--secondary)'} />
                </div>
                <div>
                  <p className="detail-value" style={{ color: domainMeta.isThreat ? 'var(--error)' : 'var(--on-surface)' }}>
                    {domainMeta.title}
                  </p>
                  <p className="detail-desc">{domainMeta.subtext}</p>
                </div>
              </div>
            </div>

            {/* AI Explanation Breakdown Section */}
            <div className="ai-breakdown-card">
              <div className="ai-breakdown-header">
                <BrainCircuit size={19} />
                <span>{t('breakdown.title')}</span>
              </div>
              <ul className="ai-reasons-list">
                {result.red_flags && result.red_flags.length > 0 ? (
                  result.red_flags.map((flag, idx) => (
                    <li key={idx} className="ai-reason-item">
                      <XCircle size={18} color="var(--error)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>
                        <strong>{flagTitle(flag)}: </strong>
                        {flagReason(flag)}
                      </span>
                    </li>
                  ))
                ) : (
                  <>
                    <li className="ai-reason-item">
                      <CheckCircle2 size={18} color="var(--safe)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>
                        <strong>{t('safe.r1.title')}</strong> {t('safe.r1.text')}
                      </span>
                    </li>
                    <li className="ai-reason-item">
                      <CheckCircle2 size={18} color="var(--safe)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span>
                        <strong>{t('safe.r2.title')}</strong> {t('safe.r2.text')}
                      </span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Citizen Safety Protocol Bar */}
            <div className="action-protocol-bar">
              <div className="action-protocol-left">
                <div className="action-shield-icon">
                  <Shield size={20} />
                </div>
                <div className="action-protocol-text">
                  <h5>{t('action.title')}</h5>
                  <p>{adviceText}</p>
                </div>
              </div>

              <div className="action-protocol-buttons">
                <button
                  type="button"
                  className="btn-copy-summary"
                  onClick={handleCopySummary}
                >
                  {copied ? <CheckIcon size={16} color="var(--safe)" /> : <Copy size={16} />}
                  <span>{copied ? t('action.copied') : t('action.copy')}</span>
                </button>

                <a href="tel:101" className="btn-call-cert">
                  <Phone size={16} />
                  <span>{t('action.call')}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Recent Threats Context Bar */}
          <div className="threats-context-bar">
            <div className="context-box">
              <div className="context-box-icon">
                <Cpu size={20} />
              </div>
              <div className="context-box-text">
                <span className="context-box-label">{t('ctx.model')}</span>
                <p>{result.model_version || 'tfidf-7c2b6d2d'} (Production)</p>
              </div>
            </div>

            <div className="context-box">
              <div className="context-box-icon" style={{ color: 'var(--secondary)' }}>
                <Activity size={20} />
              </div>
              <div className="context-box-text">
                <span className="context-box-label">{t('ctx.rule')}</span>
                <p>{t('ctx.ruleValue')}</p>
              </div>
            </div>

            <div className="context-box">
              <div className="context-box-icon" style={{ color: 'var(--tertiary)' }}>
                <Sparkles size={20} />
              </div>
              <div className="context-box-text">
                <span className="context-box-label">{t('ctx.report')}</span>
                <p>{t('ctx.reportValue')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
