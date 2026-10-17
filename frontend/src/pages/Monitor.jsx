import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Play, 
  RefreshCw, 
  Sliders, 
  TrendingDown, 
  TrendingUp, 
  Zap,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  ReferenceLine 
} from 'recharts';
import { API_URL } from '../config';
import { normalizeMonitorData } from '../utils/apiResilience';

const SIGNAL_TITLES = {
  mean_confidence: 'Average Prediction Confidence',
  low_conf_share: 'Low-Confidence Share (< threshold)',
  novelty_rate: 'Unfamiliar / Zero-Day Scam Rate',
  language_psi: 'Language Mix Drift (PSI)'
};

const SIGNAL_DESCRIPTIONS = {
  mean_confidence: 'Monitors whether the model is losing certainty across incoming traffic.',
  low_conf_share: 'Triggers alert when borderline predictions exceed 10% and double baseline.',
  novelty_rate: 'Measures mathematical distance from training embeddings (novel scam wave indicator).',
  language_psi: 'Population Stability Index tracking sudden influx of Tanglish, Singlish, or mixed scripts.'
};

export default function Monitor() {
  const [monitorData, setMonitorData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const [monRes, histRes] = await Promise.all([
        fetch(`${API_URL}/api/monitor`).catch(() => null),
        fetch(`${API_URL}/api/monitor/history?limit=100`).catch(() => null)
      ]);

      if (monRes && monRes.ok) {
        const monJson = await monRes.json();
        setMonitorData(normalizeMonitorData(monJson));
      } else {
        // Safe fallback monitor data if backend is restarting or retraining
        setMonitorData(prev => prev || normalizeMonitorData(null));
      }

      if (histRes && histRes.ok) {
        const histJson = await histRes.json();
        setHistoryData(Array.isArray(histJson) ? histJson : []);
      }
      setError(null);
    } catch (err) {
      console.warn('Monitor Fetch Error:', err);
      setMonitorData(prev => prev || normalizeMonitorData(null));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulate = async (dataset) => {
    setSimulating(true);
    try {
      const res = await fetch(`${API_URL}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset, n: 50 })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Simulation Error:', err);
    } finally {
      setSimulating(false);
    }
  };

  const formattedHistory = historyData.map((item, idx) => ({
    index: idx + 1,
    id: item.id || idx + 1,
    confidence: Number(((item.confidence ?? 0.7) * 100).toFixed(1)),
    novelty: Number(((item.novelty ?? 0.2) * 100).toFixed(1)),
    verdict: item.verdict || 'Suspicious',
    language: item.language || 'en',
    source: item.source || 'live'
  }));

  return (
    <div className="monitor-page">
      {/* Page Title */}
      <div className="monitor-header">
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem' }}>
          System Drift & Threat Surveillance
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Real-time monitoring of model certainty, novel embedding distance, and language mix shifts.
        </p>
      </div>

      {/* Drift Status Banner */}
      {monitorData && (
        <div className={`drift-banner ${monitorData.drift ? 'alert' : 'normal'}`}>
          <span className="drift-badge">
            {monitorData.drift ? '⚠️ DRIFT DETECTED · FALLBACK ACTIVE' : '✅ NORMAL OPERATION'}
          </span>
          <p style={{ fontSize: '0.9rem', flex: 1 }}>
            {monitorData.response}
          </p>
        </div>
      )}

      {/* Simulation Controls Card */}
      <div className="card sim-controls-card">
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.2rem' }}>
            Live Drift Simulation Controls
          </h3>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Simulate incoming traffic streams to demonstrate automated drift detection & fallback.
          </p>
        </div>

        <div className="sim-buttons">
          <button
            type="button"
            className="btn-sim-normal"
            disabled={simulating}
            onClick={() => handleSimulate('test')}
          >
            <CheckCircle2 size={16} />
            <span>Simulate Normal Traffic (test.csv)</span>
          </button>

          <button
            type="button"
            className="btn-sim-wave"
            disabled={simulating}
            onClick={() => handleSimulate('shifted')}
          >
            <Zap size={16} />
            <span>Simulate New Scam Wave (SL-UDI)</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={fetchData}
            style={{ padding: '0.5rem 0.8rem' }}
            title="Refresh monitor"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* 4 Signals Grid */}
      {monitorData?.signals && (
        <div className="signals-grid">
          {monitorData.signals.map((sig, idx) => {
            const isAlert = sig.status === 'alert';
            const title = SIGNAL_TITLES[sig.signal] || sig.signal;
            const desc = SIGNAL_DESCRIPTIONS[sig.signal] || sig.message;

            return (
              <div key={idx} className={`signal-card ${isAlert ? 'alert' : ''}`}>
                <div className="signal-card-header">
                  <span className="signal-title">{title}</span>
                  <span className={`signal-status-tag ${sig.status}`}>
                    {sig.status === 'alert' ? 'DRIFT ALERT' : 'HEALTHY'}
                  </span>
                </div>

                <div className="signal-value-row">
                  <span className="signal-current" style={{ color: isAlert ? 'var(--color-scam)' : 'var(--text-primary)' }}>
                    {typeof sig.value === 'number' ? sig.value.toFixed(2) : sig.value}
                  </span>
                  <span className="signal-baseline">
                    baseline: {typeof sig.baseline === 'number' ? sig.baseline.toFixed(2) : sig.baseline}
                  </span>
                </div>

                <p className="signal-desc">{desc}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Time-Series Trend Chart */}
      <div className="card chart-card">
        <div className="chart-header">
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Confidence vs. Novelty Stream (Recent Traffic)
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Dual-axis stream showing drop in confidence and spike in novelty when unfamiliar scam waves hit.
            </p>
          </div>

          <div className="chart-legend">
            <div>
              <span className="legend-dot" style={{ background: '#10b981' }} />
              <span>Confidence (%)</span>
            </div>
            <div>
              <span className="legend-dot" style={{ background: '#ef4444' }} />
              <span>Novelty (%)</span>
            </div>
          </div>
        </div>

        <div style={{ width: '100%', height: 320 }}>
          {formattedHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedHistory} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis 
                  dataKey="index" 
                  stroke="var(--text-muted)" 
                  fontSize={12} 
                  tickLine={false}
                />
                <YAxis 
                  stroke="var(--text-muted)" 
                  fontSize={12} 
                  domain={[0, 100]} 
                  unit="%" 
                  tickLine={false}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div style={{
                          background: 'rgba(16, 22, 38, 0.95)',
                          border: '1px solid var(--border-medium)',
                          padding: '0.75rem 1rem',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          color: '#fff',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.5)'
                        }}>
                          <p style={{ fontWeight: 700, marginBottom: '4px' }}>
                            Prediction #{d.id} ({d.language?.toUpperCase() || 'EN'})
                          </p>
                          <p style={{ color: '#10b981' }}>Confidence: {d.confidence}%</p>
                          <p style={{ color: '#ef4444' }}>Novelty: {d.novelty}%</p>
                          <p style={{ color: '#94a3b8', marginTop: '4px' }}>Verdict: <strong>{d.verdict}</strong></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={55} stroke="rgba(245, 158, 11, 0.5)" strokeDasharray="3 3" label={{ value: 'Confidence Floor', fill: '#f59e0b', fontSize: 10 }} />
                <ReferenceLine y={80} stroke="rgba(239, 68, 68, 0.5)" strokeDasharray="3 3" label={{ value: 'Novelty Ceiling', fill: '#ef4444', fontSize: 10 }} />
                <Line 
                  type="monotone" 
                  dataKey="confidence" 
                  stroke="#10b981" 
                  strokeWidth={2.5} 
                  dot={false}
                  activeDot={{ r: 5 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="novelty" 
                  stroke="#ef4444" 
                  strokeWidth={2.5} 
                  dot={false}
                  activeDot={{ r: 5 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No prediction logs recorded yet. Run a check or simulate traffic.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
