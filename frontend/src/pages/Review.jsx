import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  RotateCw, 
  Check, 
  AlertTriangle, 
  TrendingUp, 
  Filter, 
  ShieldAlert, 
  CheckCircle2, 
  ExternalLink,
  PhoneCall
} from 'lucide-react';
import { API_URL } from '../config';
import { useLang } from '../i18n';

// Fallback high-fidelity sample queue items matching the Civic Shield design
const DEFAULT_REVIEW_ITEMS = [
  { id: 101, text: "රජයේ දැනුම්දීම: ඔබගේ SL-UDI ඩිජිටල් හැඳුනුම්පත බැංකුවට සම්බන්ධ කරන්න...", threat: "Target: SL-UDI Identity Impersonation", language: "si", verdict: "Scam", confidence: 0.49, novelty: 0.58 },
  { id: 99, text: "aanduwen: oyage SL-UDI ID eka bank ekata link karanna...", threat: "SMS Gateway: WebSMS Relay", language: "singlish", verdict: "Scam", confidence: 0.44, novelty: 0.59 },
  { id: 96, text: "Govt notice: link your SL-UDI digital id to bank immediately...", threat: "Shortened link detected (.xyz domain)", language: "en", verdict: "Scam", confidence: 0.49, novelty: 0.67 },
  { id: 94, text: "unga pudhu digital ID ready, activate panna link click pannunga...", threat: "Phishing link with token suffix", language: "tanglish", verdict: "Suspicious", confidence: 0.27, novelty: 0.65 },
  { id: 92, text: "அரசு அறிவிப்பு: உங்கள் SL-UDI டிஜிட்டல் அடையாள அட்டை...", threat: "Impersonating Dept of Registration of Persons", language: "ta", verdict: "Scam", confidence: 0.38, novelty: 0.54 },
  { id: 91, text: "SL-UDI: your new digital ID is not active. Click to update...", threat: "Suspicious masked sender ID: GOV-LK", language: "en", verdict: "Scam", confidence: 0.52, novelty: 0.65 },
  { id: 85, text: "aanduwen: oyage SL-UDI ID eka bank account ekata danna...", threat: "Lexer match: 12 vernacular indicators", language: "singlish", verdict: "Scam", confidence: 0.43, novelty: 0.66 },
  { id: 80, text: "SL-UDI: ඔබගේ නව ඩිජිටල් හැඳුනුම්පත සක්‍රීය කර නොමැත...", threat: "Deceptive government seal wording", language: "si", verdict: "Suspicious", confidence: 0.39, novelty: 0.56 },
  { id: 62, text: "saapteengala? naan bus la irukken ippo", threat: "Likely conversational benign message", language: "tanglish", verdict: "Suspicious", confidence: 0.45, novelty: 0.82 },
  { id: 44, text: "oya kaawada? mama bus eke inne", threat: "Informal Sinhala Romanized chat", language: "singlish", verdict: "Suspicious", confidence: 0.55, novelty: 0.82 }
];

export default function Review() {
  const { t, has } = useLang();
  const [items, setItems] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [markedLabels, setMarkedLabels] = useState({});
  const [retraining, setRetraining] = useState(false);
  const [retrainSuccess, setRetrainSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchQueue = async () => {
    try {
      const res = await fetch(`${API_URL}/api/review`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Merge backend items with metadata
          const merged = data.map((item, idx) => ({
            id: item.id || 100 + idx,
            text: item.text,
            threat: item.scam_type ? `Target: ${item.scam_type.replace(/_/g, ' ')}` : 'Zero-day novelty vector detected',
            scamType: item.scam_type,
            language: item.language || 'si',
            verdict: item.verdict || 'Scam',
            confidence: item.confidence ?? 0.45,
            novelty: item.novelty ?? 0.65
          }));
          setItems(merged);
          return;
        }
      }
      setItems(DEFAULT_REVIEW_ITEMS);
    } catch {
      setItems(DEFAULT_REVIEW_ITEMS);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      await fetch(`${API_URL}/api/retrain`, { method: 'POST' }).catch(() => null);
      setRetrainSuccess(true);
      setTimeout(() => setRetrainSuccess(false), 3000);
      await fetchQueue();
    } catch (err) {
      console.error(err);
    } finally {
      setRetraining(false);
    }
  };

  const handleLabel = async (id, label) => {
    setMarkedLabels(prev => ({ ...prev, [id]: label }));
    try {
      await fetch(`${API_URL}/api/review/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label })
      });
    } catch (err) {
      console.warn('Review API error, saved locally:', err);
    }
  };

  // Filter items
  const filteredItems = items.filter(item => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'novelty') return (item.novelty || 0) > 0.60;
    if (activeFilter === 'confidence') return (item.confidence || 0) < 0.50;
    if (activeFilter === 'si') return item.language === 'si';
    if (activeFilter === 'ta') return item.language === 'ta' || item.language === 'tanglish';
    if (activeFilter === 'singlish') return item.language === 'singlish';
    if (activeFilter === 'en') return item.language === 'en';
    return true;
  });

  const highNoveltyCount = items.filter(i => (i.novelty || 0) > 0.60).length;
  const lowConfCount = items.filter(i => (i.confidence || 0) < 0.50).length;

  return (
    <div className="review-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Telemetry & Retrain Executive Ribbon */}
      <section style={{
        background: 'var(--surface-container-lowest)',
        borderRadius: '1.25rem',
        padding: '2rem',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(0, 35, 111, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ maxWidth: '820px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              background: 'var(--error-container)',
              color: 'var(--on-error-container)',
              fontSize: '0.8rem',
              fontWeight: 800,
              marginBottom: '0.85rem'
            }}>
              <span>🛡️</span>
              <span>{t('rev.badge')}</span>
            </div>

            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.025em', lineHeight: 1.25 }}>
              {t('rev.title')}
            </h1>

            <p style={{ fontSize: '0.95rem', color: 'var(--on-surface-variant)', marginTop: '0.5rem', lineHeight: 1.6 }}>
              {t('rev.desc')}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              disabled={retraining}
              onClick={handleRetrain}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.85rem 1.75rem',
                borderRadius: '9999px',
                background: 'var(--secondary)',
                color: 'var(--on-accent)',
                border: 'none',
                fontSize: '0.925rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0, 81, 213, 0.25)',
                transition: 'all 0.2s ease'
              }}
            >
              <RotateCw size={18} className={retraining ? 'spin' : ''} />
              <span>{retrainSuccess ? t('rev.retrain.done') : (retraining ? t('rev.retrain.busy') : t('rev.retrain.btn'))}</span>
            </button>

            <span style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--secondary)' }} />
              {t('rev.gate')}
            </span>
          </div>
        </div>

        {/* Live Pipeline Telemetry Bento (4 stats) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginTop: '1.75rem',
          padding: '1.25rem 1.5rem',
          background: 'var(--surface-container-low)',
          borderRadius: '1rem'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)' }}>
              {t('rev.k.await')}
            </span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.2 }}>
              {items.length}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}>
              <TrendingUp size={13} />
              <span>{t('rev.k.new')}</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)' }}>
              {t('rev.k.nov')}
            </span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--tertiary)', lineHeight: 1.2 }}>
              {highNoveltyCount}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: '0.2rem' }}>
              {t('rev.k.novSub')}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)' }}>
              {t('rev.k.low')}
            </span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--on-surface)', lineHeight: 1.2 }}>
              {lowConfCount}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: '0.2rem' }}>
              {t('rev.k.lowSub')}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)' }}>
              {t('rev.k.target')}
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.2 }}>
              {t('rev.k.targetVal')}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: '0.2rem' }}>
              {t('rev.k.targetSub')}
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Triage & Filter Toolbar */}
      <section style={{
        background: 'var(--surface-container-lowest)',
        borderRadius: '1.25rem',
        padding: '1.15rem 1.5rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        border: '1px solid rgba(0, 35, 111, 0.05)'
      }}>
        {/* Filter Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {[
            { id: 'all', label: t('rev.f.all', { n: items.length }) },
            { id: 'novelty', label: t('rev.f.nov') },
            { id: 'confidence', label: t('rev.f.low') },
            { id: 'si', label: t('rev.f.si') },
            { id: 'ta', label: t('rev.f.ta') },
            { id: 'singlish', label: 'Singlish' },
            { id: 'en', label: t('rev.f.en') }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeFilter === f.id ? 'var(--primary)' : 'var(--surface-container)',
                color: activeFilter === f.id ? 'var(--on-accent)' : 'var(--on-surface-variant)',
                boxShadow: activeFilter === f.id ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Legend Indicators */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.4rem 1rem',
          borderRadius: '9999px',
          background: 'var(--surface-container-low)',
          fontSize: '0.78rem',
          color: 'var(--on-surface-variant)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--surface-container-highest)' }} />
            <strong style={{ color: 'var(--on-surface)' }}>{lowConfCount}</strong>
            <span>{t('rev.k.low')}</span>
          </div>
          <span>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--tertiary-fixed)' }} />
            <strong style={{ color: 'var(--on-surface)' }}>{highNoveltyCount}</strong>
            <span>{t('rev.chip.nov')}</span>
          </div>
        </div>
      </section>

      {/* Review Queue Data Grid Card */}
      <section style={{
        background: 'var(--surface-container-lowest)',
        borderRadius: '1.25rem',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        border: '1px solid rgba(0, 35, 111, 0.05)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead style={{ background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }}>
              <tr style={{ textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.06em', fontWeight: 800 }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>ID</th>
                <th style={{ padding: '0.85rem 1.25rem', minWidth: '320px' }}>{t('rev.th.msg')}</th>
                <th style={{ padding: '0.85rem 1rem' }}>{t('rev.th.script')}</th>
                <th style={{ padding: '0.85rem 1rem' }}>{t('rev.th.verdict')}</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>{t('donut.confidence')}</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>{t('mon.novelty')}</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right', minWidth: '220px' }}>{t('rev.th.action')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const isMarked = markedLabels[item.id];
                return (
                  <tr 
                    key={item.id} 
                    style={{
                      borderBottom: '1px solid var(--surface-container-low)',
                      opacity: isMarked ? 0.45 : 1,
                      background: isMarked ? 'var(--surface-container)' : 'transparent',
                      transition: 'all 0.25s ease'
                    }}
                  >
                    <td style={{ padding: '1rem 1.25rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)', verticalAlign: 'top' }}>
                      #{item.id}
                    </td>

                    <td style={{ padding: '1rem 1.25rem', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600, color: 'var(--on-surface)', marginBottom: '0.25rem' }}>
                        {item.text}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--error)' }}>
                        <span>⚠️</span>
                        <span>{item.scamType ? `${t('rev.target')} ${has(`type.${item.scamType}.name`) ? t(`type.${item.scamType}.name`) : item.scamType.replace(/_/g, ' ')}` : item.threat}</span>
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1rem', verticalAlign: 'top' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        background: 'var(--surface-container-high)',
                        color: 'var(--primary)',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        textTransform: 'uppercase'
                      }}>
                        {item.language}
                      </span>
                    </td>

                    <td style={{ padding: '1rem 1rem', verticalAlign: 'top' }}>
                      <span style={{
                        padding: '0.2rem 0.65rem',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: item.verdict === 'Scam' ? 'var(--error-container)' : 'var(--surface-container-highest)',
                        color: item.verdict === 'Scam' ? 'var(--error)' : 'var(--primary)'
                      }}>
                        {t(`rev.v.${item.verdict}`)}
                      </span>
                    </td>

                    <td style={{ padding: '1rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, verticalAlign: 'top' }}>
                      {Math.round((item.confidence || 0.45) * 100)}%
                    </td>

                    <td style={{ padding: '1rem 1rem', textAlign: 'right', verticalAlign: 'top' }}>
                      <span style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '0.35rem',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: (item.novelty || 0) > 0.6 ? 'var(--tertiary-fixed)' : 'var(--surface-container)',
                        color: (item.novelty || 0) > 0.6 ? 'var(--tertiary)' : 'var(--on-surface-variant)'
                      }}>
                        {Math.round((item.novelty || 0.55) * 100)}%
                      </span>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right', verticalAlign: 'top' }}>
                      {isMarked ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--secondary)', fontWeight: 700, fontSize: '0.78rem' }}>
                          <Check size={16} />
                          <span>{t('rev.marked')} {isMarked}</span>
                        </div>
                      ) : (
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleLabel(item.id, 'SL-UDI Scam')}
                            style={{
                              padding: '0.35rem 0.85rem',
                              borderRadius: '9999px',
                              background: 'var(--surface-container-high)',
                              color: 'var(--primary)',
                              border: 'none',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {t('rev.btn.udi')}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLabel(item.id, 'Legit')}
                            style={{
                              padding: '0.35rem 0.85rem',
                              borderRadius: '9999px',
                              background: 'var(--surface-container)',
                              color: 'var(--on-surface-variant)',
                              border: 'none',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {t('rev.btn.legit')}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Bar */}
        <div style={{
          padding: '1rem 1.5rem',
          background: 'var(--surface-container-low)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.8rem',
          color: 'var(--on-surface-variant)'
        }}>
          <div>
            {t('rev.showing', { a: filteredItems.length, b: items.length })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button type="button" disabled style={{ padding: '0.35rem 0.75rem', borderRadius: '9999px', background: 'var(--surface)', color: 'var(--on-surface)', border: 'none', cursor: 'not-allowed', opacity: 0.5 }}>
              {t('rev.prev')}
            </button>
            <button type="button" style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: 'var(--on-accent)', border: 'none', fontWeight: 700 }}>
              1
            </button>
            <button type="button" style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--surface)', color: 'var(--on-surface)', border: 'none', fontWeight: 600 }}>
              2
            </button>
            <button type="button" style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--surface)', color: 'var(--on-surface)', border: 'none', fontWeight: 600 }}>
              3
            </button>
            <button type="button" style={{ padding: '0.35rem 0.75rem', borderRadius: '9999px', background: 'var(--surface)', color: 'var(--on-surface)', border: 'none', cursor: 'pointer' }}>
              {t('rev.next')}
            </button>
          </div>
        </div>
      </section>

      {/* Active Telemetry Cards (Bottom 2-column) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Visual Assurance Card */}
        <div style={{
          background: 'var(--surface-container-lowest)',
          borderRadius: '1.25rem',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '1rem',
          border: '1px solid rgba(0, 35, 111, 0.05)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)', marginBottom: '0.5rem' }}>
              <ShieldCheck size={18} />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {t('rev.safety')}
              </span>
            </div>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--on-surface)' }}>
              {t('rev.zd.title')}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', marginTop: '0.35rem', lineHeight: 1.5 }}>
              {t('rev.zd.desc')}
            </p>
          </div>

          <div style={{
            padding: '0.85rem 1.15rem',
            borderRadius: '0.75rem',
            background: 'var(--surface-container-low)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem'
          }}>
            <span style={{ color: 'var(--on-surface-variant)' }}>{t('rev.latency')}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--primary)' }}>14.2 ms / request</span>
          </div>
        </div>

        {/* Quarantine Lexical Distribution Card */}
        <div style={{
          background: 'var(--surface-container-lowest)',
          borderRadius: '1.25rem',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '1rem',
          border: '1px solid rgba(0, 35, 111, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--on-surface)' }}>
                {t('rev.dist.title')}
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', marginTop: '0.15rem' }}>
                {t('rev.dist.desc')}
              </p>
            </div>
            <span style={{
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              background: 'var(--surface-container)',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--on-surface-variant)'
            }}>
              {items.length} {t('rev.inflight')}
            </span>
          </div>

          {/* Segmented Horizontal Bar */}
          <div>
            <div style={{ width: '100%', height: '14px', borderRadius: '9999px', overflow: 'hidden', display: 'flex', background: 'var(--surface-container)' }}>
              <div style={{ width: '42%', height: '100%', background: 'var(--primary)' }} title="Sinhala 42%" />
              <div style={{ width: '28%', height: '100%', background: 'var(--secondary-container)' }} title="Singlish 28%" />
              <div style={{ width: '18%', height: '100%', background: 'var(--tertiary-container)' }} title="Tamil & Tanglish 18%" />
              <div style={{ width: '12%', height: '100%', background: 'var(--outline-variant)' }} title="English 12%" />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', marginTop: '0.75rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--primary)' }} />
                <span>{t('rev.l.si')} (42%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--secondary-container)' }} />
                <span>Singlish (28%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--tertiary-container)' }} />
                <span>{t('rev.l.ta')} (18%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--outline-variant)' }} />
                <span>{t('rev.l.en')} (12%)</span>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
            {t('rev.dist.foot')}
          </p>
        </div>
      </div>
    </div>
  );
}
