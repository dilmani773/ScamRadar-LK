import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Send, 
  Trash2, 
  PhoneCall, 
  Sparkles,
  Link2,
  KeyRound,
  Clock,
  Coins,
  Gift,
  ShieldX,
  Phone,
  WifiOff
} from 'lucide-react';
import { API_URL } from '../config';
import { normalizeCheckResult, evaluateOfflineRules } from '../utils/apiResilience';

// Verified 7 Red Flag Mappings aligned directly with API contract
const RED_FLAG_META = {
  link: { label: 'Suspicious Web Link', icon: Link2, color: '#ef4444' },
  otp_request: { label: 'OTP / PIN Request', icon: KeyRound, color: '#ef4444' },
  urgency: { label: 'Artificial Urgency', icon: Clock, color: '#f59e0b' },
  money_request: { label: 'Payment / Fee Demand', icon: Coins, color: '#ef4444' },
  prize: { label: 'Unsolicited Prize / Reward', icon: Gift, color: '#f59e0b' },
  account_threat: { label: 'Account Threat / Suspension', icon: ShieldX, color: '#ef4444' },
  phone_number: { label: 'Unofficial Phone / WhatsApp', icon: Phone, color: '#f59e0b' }
};

// Compliant Synthetic Presets (Rule 2.4 & 5.5: 07X-XXX-XXXX, fictional banks)
const SYNTHETIC_PRESETS = [
  {
    id: 'aswesuma',
    title: 'Aswesuma Scam (Sinhala)',
    channel: 'sms',
    text: 'ඔබගේ අස්වැසුම සුබසාධන මුදල් ලබා ගැනීමට වහාම මෙම ලින්ක් එක ක්ලික් කර ඔබගේ OTP අංකය ලබා දෙන්න http://aswesuma-lk.xyz'
  },
  {
    id: 'bank_phish',
    title: 'Bank Phishing (English)',
    channel: 'sms',
    text: 'Lanka Pragathi Bank Alert: Your debit card has been blocked due to suspicious activity. Verify immediately at http://pragathi-verify.cc/login or call 07X-XXX-XXXX'
  },
  {
    id: 'tanglish_prize',
    title: 'Prize & Fee (Tanglish)',
    channel: 'whatsapp',
    text: 'Congratulations! Ungalukku 500,000 LKR prize kidachirukku. Release panna fee deposit pannunga WhatsApp 07X-XXX-XXXX'
  },
  {
    id: 'legit_bank',
    title: 'Legit Alert (Safe)',
    channel: 'sms',
    text: 'Lanka Pragathi Bank: Your account XXXXX1234 has been credited with LKR 15,000.00 on 17/10/2026. Ref: SALARY-OCT.'
  }
];

export default function Check() {
  const [text, setText] = useState('');
  const [channel, setChannel] = useState('sms');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [offlineNotice, setOfflineNotice] = useState(false);

  const handlePresetClick = (preset) => {
    setText(preset.text);
    setChannel(preset.channel);
    setOfflineNotice(false);
  };

  const handleClear = () => {
    setText('');
    setResult(null);
    setOfflineNotice(false);
  };

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setOfflineNotice(false);

    try {
      // Set an 8-second timeout so a lagging or retraining server never freezes the UI
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${API_URL}/api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          channel: channel
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      // Pass through our schema normalizer to guarantee layout integrity
      setResult(normalizeCheckResult(data));
      setOfflineNotice(false);
    } catch (err) {
      console.warn('API Check failed or offline, activating resilient fallback engine:', err);
      // Seamlessly evaluate using local rules engine so the demo never breaks
      const fallbackResult = evaluateOfflineRules(text, channel);
      setResult(fallbackResult);
      setOfflineNotice(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="check-page">
      {/* Hero Header */}
      <section className="hero">
        <div className="hero-pill">
          <Sparkles size={14} />
          <span>Multilingual Threat Intelligence · Sri Lanka</span>
        </div>
        <h2>Verify Suspicious Messages Instantly</h2>
        <p>
          Paste any SMS or WhatsApp message received on your phone. ScamRadar checks for fake bank alerts, lottery fraud, Aswesuma scams, and malicious links.
        </p>
      </section>

      {/* Form Card */}
      <div className="card form-card">
        {/* Synthetic Presets */}
        <div className="presets-container">
          <div className="presets-label">
            <span>Synthetic Test Examples:</span>
          </div>
          <div className="presets-grid">
            {SYNTHETIC_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="preset-chip"
                onClick={() => handlePresetClick(p)}
              >
                <span>{p.title}</span>
                <span className="synthetic-tag">Synthetic</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAnalyze}>
          <div className="textarea-wrapper">
            <textarea
              className="scam-textarea"
              placeholder='Paste SMS or WhatsApp text here... (e.g. "Lanka Pragathi Bank: Your account has been suspended...")'
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
              rows={5}
            />
            <div className="textarea-footer">
              <span>{text.length} / 2000 characters</span>
              {text && (
                <button 
                  type="button" 
                  onClick={handleClear}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Trash2 size={13} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Channel Selector */}
          <div className="channel-group">
            <span className="channel-label">Message Source:</span>
            <div className="channel-pills">
              {['sms', 'whatsapp', 'other'].map((ch) => (
                <button
                  key={ch}
                  type="button"
                  className={`channel-pill ${channel === ch ? 'active' : ''}`}
                  onClick={() => setChannel(ch)}
                >
                  {ch.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !text.trim()}
            >
              <Send size={16} />
              <span>{loading ? 'Analyzing Message...' : 'Analyze Message'}</span>
            </button>
            {result && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleClear}
              >
                Reset
              </button>
            )}
          </div>
        </form>

        {/* Resilient Fallback Notice */}
        {offlineNotice && (
          <div style={{
            marginTop: '1rem',
            padding: '0.65rem 1rem',
            borderRadius: '8px',
            background: 'var(--color-suspicious-bg)',
            border: '1px solid var(--color-suspicious-border)',
            color: 'var(--text-primary)',
            fontSize: '0.825rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <WifiOff size={16} color="var(--color-suspicious)" />
            <span>
              <strong>Local Rules Fallback Active:</strong> Backend service is updating or unreachable. Displaying client-side heuristic evaluation.
            </span>
          </div>
        )}

        {/* Shimmer Loading Skeleton */}
        {loading && (
          <div className="skeleton-card">
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="skeleton-shimmer" style={{ width: '48px', height: '48px', borderRadius: '12px' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-shimmer" style={{ width: '60%', height: '24px', marginBottom: '8px' }} />
                <div className="skeleton-shimmer" style={{ width: '35%', height: '16px' }} />
              </div>
            </div>
            <div className="skeleton-shimmer" style={{ width: '100%', height: '60px', marginBottom: '1rem' }} />
            <div className="skeleton-shimmer" style={{ width: '80%', height: '40px' }} />
          </div>
        )}

        {/* Interactive Verdict Card */}
        {result && !loading && (
          <div className={`verdict-card ${result.verdict}`}>
            {/* Header with localized title */}
            <div className="verdict-header">
              <div className="verdict-badge-row">
                <div className="verdict-icon">
                  {result.verdict === 'Scam' && <ShieldAlert size={28} />}
                  {result.verdict === 'Suspicious' && <AlertTriangle size={28} />}
                  {result.verdict === 'Safe' && <ShieldCheck size={28} />}
                </div>
                <div className="verdict-titles">
                  <h3>
                    {result.verdict === 'Scam' && 'High Scam Probability Detected'}
                    {result.verdict === 'Suspicious' && 'Suspicious / Unverified Message'}
                    {result.verdict === 'Safe' && 'Likely Legitimate Message'}
                  </h3>
                  <div className="sub-title">
                    {result.verdict === 'Scam' && 'අවවාදයයි: මෙය වංචනික පණිවිඩයකි · எச்சரிக்கை: மோசடி செய்தி'}
                    {result.verdict === 'Suspicious' && 'සැකකටයුතු හෝ සනාථ නොකළ පණිවිඩයකි · சந்தேகத்திற்கிடமான செய்தி'}
                    {result.verdict === 'Safe' && 'ආරක්ෂිත පණිවිඩයක් විය හැක · பாதுகாப்பான செய்தி'}
                  </div>
                </div>
              </div>

              {/* Separated Metric Badges */}
              <div className="verdict-metrics">
                <span className="metric-pill">
                  Risk: {Math.round((result.risk || 0) * 100)}%
                </span>
                <span className="metric-pill">
                  Confidence: {Math.round((result.confidence || 0) * 100)}%
                </span>
                {result.scam_type && result.scam_type !== 'legit' && (
                  <span className="scam-type-pill">
                    {result.scam_type.replace(/_/g, ' ')}
                  </span>
                )}
                {result.language && (
                  <span className="metric-pill" style={{ textTransform: 'uppercase' }}>
                    {result.language}
                  </span>
                )}
              </div>
            </div>

            {/* Red Flags List (Exact 7 API flags) */}
            {result.red_flags && result.red_flags.length > 0 && (
              <div className="red-flags-section">
                <div className="red-flags-title">
                  <ShieldAlert size={16} color="var(--color-scam)" />
                  <span>Detected Warning Signs ({result.red_flags.length}):</span>
                </div>
                <div className="flags-grid">
                  {result.red_flags.map((rf, idx) => {
                    const meta = RED_FLAG_META[rf.flag] || { label: rf.flag, icon: AlertTriangle };
                    const IconComp = meta.icon;
                    return (
                      <div key={idx} className="flag-item">
                        <div className="flag-icon" style={{ color: meta.color || 'var(--color-scam)' }}>
                          <IconComp size={18} />
                        </div>
                        <div className="flag-content">
                          <strong>{meta.label}</strong>
                          <p>{rf.reason}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actionable Advice & Emergency Hotlines */}
            <div className="advice-box">
              <div className="advice-header">
                <PhoneCall size={18} />
                <span>Recommended Safety Action:</span>
              </div>
              <p className="advice-text">{result.advice}</p>

              {/* Verified Hotlines */}
              <div className="hotlines-grid">
                <div className="hotline-item">
                  <span className="hotline-badge">Emergency</span>
                  <span>Call official phone number on the back of your bank card.</span>
                </div>
                <div className="hotline-item">
                  <span className="hotline-badge">1919</span>
                  <span>Government Information Centre (GIC) / Aswesuma Inquiries</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
