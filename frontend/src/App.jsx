import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Radar, 
  CheckSquare, 
  Sun, 
  Moon, 
  RefreshCw,
  ExternalLink,
  Cpu
} from 'lucide-react';
import Check from './pages/Check';
import Monitor from './pages/Monitor';
import { API_URL } from './config';

export default function App() {
  const [activeTab, setActiveTab] = useState('check');
  const [theme, setTheme] = useState('dark');
  const [health, setHealth] = useState({ model_version: 'connecting...', model_loaded: false });
  const [reviewItems, setReviewItems] = useState([]);
  const [retrainStatus, setRetrainStatus] = useState(null);
  const [retraining, setRetraining] = useState(false);

  // Sync theme with DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Fetch model health and active version
  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_URL}/health`);
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch {
      setHealth({ model_version: 'offline', model_loaded: false });
    }
  };

  // Fetch review items when on review tab
  const fetchReviewQueue = async () => {
    try {
      const res = await fetch(`${API_URL}/api/review`);
      if (res.ok) {
        const data = await res.json();
        setReviewItems(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'review') {
      fetchReviewQueue();
    }
  }, [activeTab]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      const res = await fetch(`${API_URL}/api/retrain`, { method: 'POST' });
      const data = await res.json();
      setRetrainStatus(data);
      await fetchHealth();
    } catch {
      // ignore
    } finally {
      setRetraining(false);
    }
  };

  const handleLabel = async (id, label) => {
    try {
      await fetch(`${API_URL}/api/review/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label })
      });
      fetchReviewQueue();
    } catch {
      // ignore
    }
  };

  return (
    <div className="app-container">
      {/* Sticky Navigation Bar */}
      <header className="navbar">
        <div className="navbar-inner">
          {/* Brand */}
          <div className="brand">
            <div className="brand-icon-wrapper">
              <Shield size={22} />
            </div>
            <div className="brand-text">
              <h1>ScamRadar LK</h1>
              <span>AI Scam Guardian for Sri Lanka</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="nav-tabs">
            <button
              type="button"
              className={`nav-tab ${activeTab === 'check' ? 'active' : ''}`}
              onClick={() => setActiveTab('check')}
            >
              <Shield size={16} />
              <span>Check Message</span>
            </button>
            <button
              type="button"
              className={`nav-tab ${activeTab === 'monitor' ? 'active' : ''}`}
              onClick={() => setActiveTab('monitor')}
            >
              <Radar size={16} />
              <span>Drift Monitor</span>
            </button>
            <button
              type="button"
              className={`nav-tab ${activeTab === 'review' ? 'active' : ''}`}
              onClick={() => setActiveTab('review')}
            >
              <CheckSquare size={16} />
              <span>Review Queue {reviewItems.length > 0 && `(${reviewItems.length})`}</span>
            </button>
          </nav>

          {/* Right Header Controls */}
          <div className="header-controls">
            <div className="model-badge" title="Active Model Bundle Version">
              <span className="status-dot" style={{ background: health.model_loaded ? 'var(--color-safe)' : 'var(--color-suspicious)' }} />
              <Cpu size={13} />
              <span>{health.model_version}</span>
            </div>

            <button
              type="button"
              className="theme-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Dynamic View */}
      <main className="main-content">
        {activeTab === 'check' && <Check />}
        {activeTab === 'monitor' && <Monitor />}
        
        {/* Review Queue Tab (Collaborative slot for Hareen / Analyst) */}
        {activeTab === 'review' && (
          <div className="review-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Human-in-the-Loop Review Queue</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  Messages flagged by the safe-fallback due to novelty or low confidence. Label them to retrain and adapt the model.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={handleRetrain}
                disabled={retraining}
              >
                <RefreshCw size={16} className={retraining ? 'spin' : ''} />
                <span>{retraining ? 'Retraining Model...' : 'Retrain & Gate Model'}</span>
              </button>
            </div>

            {retrainStatus && (
              <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--color-safe)' }}>
                <strong>Retraining Triggered:</strong> Status: {retrainStatus.status}
              </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {reviewItems.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <tr>
                        <th style={{ padding: '0.85rem 1rem' }}>ID</th>
                        <th style={{ padding: '0.85rem 1rem' }}>Message Text</th>
                        <th style={{ padding: '0.85rem 1rem' }}>Lang</th>
                        <th style={{ padding: '0.85rem 1rem' }}>Verdict</th>
                        <th style={{ padding: '0.85rem 1rem' }}>Confidence</th>
                        <th style={{ padding: '0.85rem 1rem' }}>Novelty</th>
                        <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Quick Label</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewItems.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)' }}>#{item.id}</td>
                          <td style={{ padding: '0.85rem 1rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.text}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textTransform: 'uppercase' }}>{item.language}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{ 
                              padding: '0.2rem 0.5rem', 
                              borderRadius: '9999px', 
                              fontSize: '0.75rem', 
                              fontWeight: 700,
                              background: item.verdict === 'Scam' ? 'var(--color-scam-bg)' : 'var(--color-suspicious-bg)',
                              color: item.verdict === 'Scam' ? 'var(--color-scam)' : 'var(--color-suspicious)'
                            }}>
                              {item.verdict}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)' }}>{item.confidence ? (item.confidence * 100).toFixed(0) + '%' : '-'}</td>
                          <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)' }}>{item.novelty ? (item.novelty * 100).toFixed(0) + '%' : '-'}</td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                                onClick={() => handleLabel(item.id, 'digital_id_scam')}
                              >
                                SL-UDI Scam
                              </button>
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                                onClick={() => handleLabel(item.id, 'legit')}
                              >
                                Legit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Review queue is currently empty.</p>
                  <p style={{ fontSize: '0.85rem' }}>Simulate a new scam wave from the Drift Monitor to populate items requiring analyst labeling.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
