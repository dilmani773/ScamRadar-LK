import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  CheckCircle2, 
  RotateCcw, 
  AlertTriangle, 
  ArrowRight, 
  SlidersHorizontal, 
  LineChart as LineChartIcon, 
  ShieldCheck, 
  Cpu, 
  Activity, 
  Info, 
  TrendingUp, 
  FileEdit, 
  Play 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';
import { API_URL } from '../config';
import { normalizeMonitorData } from '../utils/apiResilience';

export default function Monitor({ onNavigateReview }) {
  const [monitorData, setMonitorData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [activeFeed, setActiveFeed] = useState('SL-UDI Zero-Day Batch (Synthetic)');

  const fetchData = async () => {
    try {
      const [monRes, histRes] = await Promise.all([
        fetch(`${API_URL}/api/monitor`).catch(() => null),
        fetch(`${API_URL}/api/monitor/history?limit=75`).catch(() => null)
      ]);

      if (monRes && monRes.ok) {
        const monJson = await monRes.json();
        setMonitorData(normalizeMonitorData(monJson));
      } else {
        setMonitorData(prev => prev || normalizeMonitorData(null));
      }

      if (histRes && histRes.ok) {
        const histJson = await histRes.json();
        setHistoryData(Array.isArray(histJson) ? histJson : []);
      }
    } catch (err) {
      console.warn('Monitor fetch error:', err);
      setMonitorData(prev => prev || normalizeMonitorData(null));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateNormal = async () => {
    setSimulating(true);
    setActiveFeed('Baseline Traffic (test.csv)');
    try {
      await fetch(`${API_URL}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset: 'test', n: 50 })
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleSimulateWave = async () => {
    setSimulating(true);
    setActiveFeed('SL-UDI Zero-Day Phishing Wave (shifted.csv)');
    try {
      await fetch(`${API_URL}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset: 'shifted', n: 50 })
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleResetLog = async () => {
    try {
      await fetch(`${API_URL}/api/admin/reset-log`, { method: 'POST' }).catch(() => null);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Format historical series for dual-axis area chart
  const chartData = historyData.length > 0 ? historyData.map((d, i) => ({
    tick: `T-${historyData.length - i}`,
    confidence: Number(((d.confidence ?? 0.75) * 100).toFixed(1)),
    novelty: Number(((d.novelty ?? 0.15) * 100).toFixed(1)),
    verdict: d.verdict,
    language: d.language?.toUpperCase() || 'EN',
    id: d.id
  })) : [
    { tick: 'T-60', confidence: 84, novelty: 12 },
    { tick: 'T-45', confidence: 82, novelty: 15 },
    { tick: 'T-30', confidence: 78, novelty: 20 },
    { tick: 'T-15 (Wave)', confidence: 52, novelty: 72 },
    { tick: 'T-0 (Now)', confidence: 48, novelty: 84 }
  ];

  // Extract signals safely
  const signals = monitorData?.signals || [];
  const meanConf = signals.find(s => s.signal === 'mean_confidence') || { value: 0.57, baseline: 0.79, status: 'alert' };
  const lowConf = signals.find(s => s.signal === 'low_conf_share') || { value: 0.52, baseline: 0.19, status: 'alert' };
  const noveltyRate = signals.find(s => s.signal === 'novelty_rate') || { value: 0.02, baseline: 0.04, status: 'ok' };
  const langPsi = signals.find(s => s.signal === 'language_psi') || { value: 0.65, baseline: 0.00, status: 'alert' };

  const isDrift = monitorData?.drift ?? true;

  return (
    <div className="monitor-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Hero Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.85rem',
            borderRadius: '9999px',
            background: 'var(--error-container)',
            color: 'var(--on-error-container)',
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.04em'
          }}>
            <Zap size={14} className="animate-pulse" />
            Real-time Threat Surveillance • Active Drift Detection
          </span>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            background: 'var(--surface-container)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--on-surface-variant)',
            fontWeight: 600
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--secondary)' }} />
            Window: Last {monitorData?.window || 500} Inferences
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
              System Drift & Threat Surveillance
            </h1>
            <p style={{ fontSize: '1.05rem', color: 'var(--on-surface-variant)', marginTop: '0.5rem', maxWidth: '780px' }}>
              Continuous monitoring of model certainty, novelty distance, and language mix shifts across Sinhala, Tamil, Singlish, and English civic streams.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--outline)' }}>
              Surveillance Mode
            </span>
            <span style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              color: isDrift ? 'var(--error)' : 'var(--safe)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <FileEdit size={18} />
              {isDrift ? 'Gated Fallback' : 'Normal Baseline'}
            </span>
          </div>
        </div>
      </section>

      {/* Prominent Fallback Alert Banner */}
      {isDrift && (
        <section style={{
          background: 'var(--error-container)',
          color: 'var(--on-error-container)',
          borderRadius: '1.25rem',
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.5rem',
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1 }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--error)',
              color: 'var(--on-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                  DRIFT DETECTED • FALLBACK ACTIVE
                </span>
                <span style={{
                  padding: '0.15rem 0.6rem',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.85)',
                  color: 'var(--error)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  Rule: P(Conf &lt; 0.55) &gt; 10%
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', marginTop: '0.35rem', opacity: 0.95, lineHeight: 1.5 }}>
                Unfamiliar messages are automatically routed to <strong>Suspicious</strong> and quarantined to human review. Label the queue to trigger gated retraining for model checkpoint <strong>tfidf-7c2b6d2d</strong>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateReview && onNavigateReview()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '9999px',
              background: 'var(--error)',
              color: 'var(--on-accent)',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <span>Go to Review Queue</span>
            <ArrowRight size={17} />
          </button>
        </section>
      )}

      {/* Simulation Controls Section */}
      <section style={{
        background: 'var(--surface-container-lowest)',
        borderRadius: '1.25rem',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid rgba(0, 35, 111, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--secondary)' }}>⚙️</span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>
                Live Drift Simulation Controls
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', marginTop: '0.2rem' }}>
              Simulate incoming traffic streams to demonstrate automated drift detection & safe-fallback quarantine.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--secondary)' }} />
            <span>Active Feed: <strong style={{ color: 'var(--on-surface)' }}>{activeFeed}</strong></span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
          {/* Button 1: Normal Traffic */}
          <button
            type="button"
            disabled={simulating}
            onClick={handleSimulateNormal}
            style={{
              padding: '1.1rem 1.25rem',
              borderRadius: '1rem',
              background: 'var(--surface-container-low)',
              border: '1px solid transparent',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--surface-container-lowest)',
                color: 'var(--secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800
              }}>
                ✓
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.925rem', color: 'var(--on-surface)' }}>
                  Simulate Normal Traffic
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                  Baseline dataset (test.csv)
                </span>
              </div>
            </div>
            <Play size={18} color="var(--on-surface-variant)" />
          </button>

          {/* Button 2: Scam Wave (Highlighted Alert) */}
          <button
            type="button"
            disabled={simulating}
            onClick={handleSimulateWave}
            style={{
              padding: '1.1rem 1.25rem',
              borderRadius: '1rem',
              background: 'var(--error-container)',
              color: 'var(--on-error-container)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--error)',
                color: 'var(--on-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Zap size={18} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.925rem', color: 'var(--on-error-container)', fontWeight: 800 }}>
                  Simulate New Scam Wave
                </strong>
                <span style={{ fontSize: '0.75rem', opacity: 0.85, fontFamily: 'var(--font-mono)' }}>
                  SL-UDI Identity Phishing
                </span>
              </div>
            </div>
            <Zap size={20} color="var(--error)" />
          </button>

          {/* Button 3: Reset Buffer */}
          <button
            type="button"
            disabled={simulating}
            onClick={handleResetLog}
            style={{
              padding: '1.1rem 1.25rem',
              borderRadius: '1rem',
              background: 'var(--surface-container-low)',
              border: '1px solid transparent',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--surface-container-lowest)',
                color: 'var(--on-surface-variant)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <RotateCcw size={16} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.925rem', color: 'var(--on-surface)' }}>
                  Reset / Refresh Stream
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                  Flush 500-sample sliding buffer
                </span>
              </div>
            </div>
            <RotateCcw size={16} color="var(--on-surface-variant)" />
          </button>
        </div>
      </section>

      {/* 4 Metric Signal Cards Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {/* Metric 1: Average Confidence */}
        <div style={{
          background: 'var(--surface-container-lowest)',
          borderRadius: '1rem',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          border: '1px solid rgba(0, 35, 111, 0.05)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>
                Average Confidence
              </span>
              <span style={{
                padding: '0.15rem 0.55rem',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontWeight: 800,
                background: meanConf.status === 'alert' ? 'var(--error-container)' : 'var(--surface-container)',
                color: meanConf.status === 'alert' ? 'var(--error)' : 'var(--primary)'
              }}>
                {meanConf.status === 'alert' ? 'DRIFT ALERT' : 'HEALTHY'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: meanConf.status === 'alert' ? 'var(--error)' : 'var(--primary)' }}>
                {Number(meanConf.value).toFixed(2)}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
                baseline: <strong style={{ color: 'var(--on-surface)' }}>{Number(meanConf.baseline).toFixed(2)}</strong>
              </span>
            </div>

            <div style={{ width: '100%', height: '6px', background: 'var(--surface-container-high)', borderRadius: '9999px', marginTop: '0.75rem', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, meanConf.value * 100)}%`, height: '100%', background: meanConf.status === 'alert' ? 'var(--error)' : 'var(--secondary)' }} />
            </div>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--surface-container-low)' }}>
            Monitors whether the model is losing certainty across incoming traffic.
          </p>
        </div>

        {/* Metric 2: Low-Confidence Share */}
        <div style={{
          background: 'var(--surface-container-lowest)',
          borderRadius: '1rem',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          border: '1px solid rgba(0, 35, 111, 0.05)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>
                Low-Confidence Share
              </span>
              <span style={{
                padding: '0.15rem 0.55rem',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontWeight: 800,
                background: lowConf.status === 'alert' ? 'var(--error-container)' : 'var(--surface-container)',
                color: lowConf.status === 'alert' ? 'var(--error)' : 'var(--primary)'
              }}>
                {lowConf.status === 'alert' ? 'DRIFT ALERT' : 'HEALTHY'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: lowConf.status === 'alert' ? 'var(--error)' : 'var(--primary)' }}>
                {Number(lowConf.value).toFixed(2)}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
                baseline: <strong style={{ color: 'var(--on-surface)' }}>{Number(lowConf.baseline).toFixed(2)}</strong>
              </span>
            </div>

            <div style={{ width: '100%', height: '6px', background: 'var(--surface-container-high)', borderRadius: '9999px', marginTop: '0.75rem', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, lowConf.value * 100)}%`, height: '100%', background: lowConf.status === 'alert' ? 'var(--error)' : 'var(--secondary)' }} />
            </div>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--surface-container-low)' }}>
            Triggers alert when borderline predictions exceed 10% and double baseline.
          </p>
        </div>

        {/* Metric 3: Zero-Day Novelty Rate */}
        <div style={{
          background: 'var(--surface-container-lowest)',
          borderRadius: '1rem',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          border: '1px solid rgba(0, 35, 111, 0.05)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>
                Zero-Day Novelty Rate
              </span>
              <span style={{
                padding: '0.15rem 0.55rem',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontWeight: 800,
                background: noveltyRate.status === 'alert' ? 'var(--error-container)' : 'var(--surface-container)',
                color: noveltyRate.status === 'alert' ? 'var(--error)' : 'var(--primary)'
              }}>
                {noveltyRate.status === 'alert' ? 'DRIFT ALERT' : 'HEALTHY'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: noveltyRate.status === 'alert' ? 'var(--error)' : 'var(--primary)' }}>
                {Number(noveltyRate.value).toFixed(2)}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
                baseline: <strong style={{ color: 'var(--on-surface)' }}>{Number(noveltyRate.baseline).toFixed(2)}</strong>
              </span>
            </div>

            <div style={{ width: '100%', height: '6px', background: 'var(--surface-container-high)', borderRadius: '9999px', marginTop: '0.75rem', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.max(15, noveltyRate.value * 100))}%`, height: '100%', background: 'var(--secondary)' }} />
            </div>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--surface-container-low)' }}>
            Measures mathematical distance from training embeddings (novel scam indicator).
          </p>
        </div>

        {/* Metric 4: Language Mix PSI */}
        <div style={{
          background: 'var(--surface-container-lowest)',
          borderRadius: '1rem',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          border: '1px solid rgba(0, 35, 111, 0.05)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>
                Language Mix (PSI)
              </span>
              <span style={{
                padding: '0.15rem 0.55rem',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontWeight: 800,
                background: langPsi.status === 'alert' ? 'var(--error-container)' : 'var(--surface-container)',
                color: langPsi.status === 'alert' ? 'var(--error)' : 'var(--primary)'
              }}>
                {langPsi.status === 'alert' ? 'DRIFT ALERT' : 'HEALTHY'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: langPsi.status === 'alert' ? 'var(--error)' : 'var(--primary)' }}>
                {Number(langPsi.value).toFixed(2)}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
                baseline: <strong style={{ color: 'var(--on-surface)' }}>{Number(langPsi.baseline).toFixed(2)}</strong>
              </span>
            </div>

            <div style={{ width: '100%', height: '6px', background: 'var(--surface-container-high)', borderRadius: '9999px', marginTop: '0.75rem', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.max(10, langPsi.value * 80))}%`, height: '100%', background: langPsi.status === 'alert' ? 'var(--error)' : 'var(--secondary)' }} />
            </div>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--surface-container-low)' }}>
            Population Stability Index tracking sudden influx of Tanglish or mixed scripts.
          </p>
        </div>
      </section>

      {/* Dual Area Stream Chart */}
      <section style={{
        background: 'var(--surface-container-lowest)',
        borderRadius: '1.25rem',
        padding: '1.75rem',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid rgba(0, 35, 111, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} color="var(--secondary)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                Confidence vs. Novelty Stream (Recent Traffic)
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', marginTop: '0.2rem' }}>
              Dual telemetry time-series across sliding inferences. Novelty spikes coincide with model confidence breakdown.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'var(--surface-container-low)', padding: '0.4rem 1.15rem', borderRadius: '9999px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--secondary)' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Confidence (%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--error)' }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Novelty (%)</span>
            </div>
          </div>
        </div>

        <div style={{ width: '100%', height: 320, position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0051d5" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0051d5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorNov" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ba1a1a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ba1a1a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#dae2fd" vertical={false} />
              <XAxis dataKey="tick" stroke="var(--outline)" fontSize={11} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="var(--outline)" fontSize={11} tickLine={false} unit="%" />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div style={{
                        background: 'var(--surface-container-lowest)',
                        color: 'var(--on-surface)',
                        border: '1px solid var(--outline-variant)',
                        borderRadius: '0.75rem',
                        padding: '0.75rem 1rem',
                        boxShadow: 'var(--shadow-md)',
                        fontSize: '0.8rem'
                      }}>
                        <strong style={{ display: 'block', color: 'var(--primary)', marginBottom: '4px' }}>
                          Stream {d.tick} ({d.language})
                        </strong>
                        <p style={{ color: 'var(--secondary)' }}>Confidence: <strong>{d.confidence}%</strong></p>
                        <p style={{ color: 'var(--error)' }}>Novelty: <strong>{d.novelty}%</strong></p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={75} stroke="var(--error)" strokeDasharray="4 4" label={{ value: 'Novelty Ceiling (75%)', fill: 'var(--error)', fontSize: 10, position: 'insideTopLeft' }} />
              <ReferenceLine y={55} stroke="var(--on-surface-variant)" strokeDasharray="4 4" label={{ value: 'Confidence Floor (55%)', fill: 'var(--on-surface-variant)', fontSize: 10, position: 'insideTopLeft' }} />
              <Area type="monotone" dataKey="confidence" stroke="#0051d5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorConf)" />
              <Area type="monotone" dataKey="novelty" stroke="#ba1a1a" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNov)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{
          marginTop: '1rem',
          padding: '0.85rem 1.15rem',
          background: 'var(--surface-container-low)',
          borderRadius: '0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.825rem',
          color: 'var(--on-surface-variant)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={16} color="var(--secondary)" />
            <span>Novelty distance spikes to 0.84 following romanized vernacular tokens <code style={{ color: 'var(--primary)', fontWeight: 700 }}>"Aswesuma-UDI salli labaganna"</code>.</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
            Anomaly Score: 9.42 / 10.0
          </span>
        </div>
      </section>

      {/* Model Retraining & Gate Readiness Card */}
      <section style={{
        background: 'var(--surface-container-lowest)',
        borderRadius: '1.25rem',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.5rem',
        flexWrap: 'wrap',
        border: '1px solid rgba(0, 35, 111, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1 }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '0.75rem',
            background: 'var(--secondary-fixed)',
            color: 'var(--on-secondary-fixed-variant)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                Model Quarantine Status: Safe Fallback Engaged
              </h3>
              <span style={{
                padding: '0.15rem 0.6rem',
                borderRadius: '9999px',
                background: 'var(--secondary-fixed)',
                color: 'var(--on-secondary-fixed-variant)',
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                Gate: HELD
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>
              <strong>Unlabelled drift samples</strong> pending human validation before TF-IDF & sentence transformer re-fit. The new model is promoted only if held-out macro-F1 stays within 0.01 of the current model and accuracy on the never-reviewed shifted_eval set does not drop.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateReview && onNavigateReview()}
          style={{
            padding: '0.8rem 1.75rem',
            borderRadius: '9999px',
            background: 'var(--primary)',
            color: 'var(--on-accent)',
            border: 'none',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            flexShrink: 0
          }}
        >
          Inspect Flagged Samples
        </button>
      </section>

      {/* Where to report scams */}
      <section style={{
        padding: '1.25rem 1.5rem',
        borderRadius: '1rem',
        background: 'var(--surface-container)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--surface-container-lowest)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--primary)' }}>
              Report scams to Sri Lanka CERT
            </strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>
              Hotline 101 or cert.gov.lk. ScamRadar does not send any data to CERT automatically.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--on-surface-variant)' }}>
          <a href="tel:101" style={{ background: 'var(--surface-container-lowest)', padding: '0.2rem 0.6rem', borderRadius: '0.35rem', fontWeight: 700, color: 'var(--on-surface)', textDecoration: 'none' }}>
            CERT 101
          </a>
        </div>
      </section>
    </div>
  );
}
