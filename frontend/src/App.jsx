import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Radar, 
  CheckSquare, 
  Sun, 
  Moon, 
  Phone,
  User,
  Cpu
} from 'lucide-react';
import Check from './pages/Check';
import Monitor from './pages/Monitor';
import Review from './pages/Review';
import AlertBanner from './components/AlertBanner';
import { API_URL } from './config';

export default function App() {
  const [activeTab, setActiveTab] = useState('check');
  const [theme, setTheme] = useState('light'); // Default to Civic Shield Light mode
  const [health, setHealth] = useState({ model_version: 'tfidf-7c2b6d2d', model_loaded: true });
  const [reviewCount, setReviewCount] = useState(0);

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
      // Keep healthy fallback
    }
  };

  // Fetch review count for badge
  const fetchReviewCount = async () => {
    try {
      const res = await fetch(`${API_URL}/api/review`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setReviewCount(data.length);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchReviewCount();
    const interval = setInterval(() => {
      fetchHealth();
      fetchReviewCount();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="app-container">
      {/* Sticky Civic Header */}
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

          {/* Center Pill Nav */}
          <nav className="nav-tabs">
            <button
              type="button"
              className={`nav-tab ${activeTab === 'check' ? 'active' : ''}`}
              onClick={() => setActiveTab('check')}
            >
              Check Message
            </button>
            <button
              type="button"
              className={`nav-tab ${activeTab === 'monitor' ? 'active' : ''}`}
              onClick={() => setActiveTab('monitor')}
            >
              Drift Monitor
            </button>
            <button
              type="button"
              className={`nav-tab ${activeTab === 'review' ? 'active' : ''}`}
              onClick={() => setActiveTab('review')}
            >
              Review Queue {reviewCount > 0 ? `(${reviewCount})` : ''}
            </button>
          </nav>

          {/* Right Controls */}
          <div className="header-controls">
            {/* Active Model Pill */}
            <div className="model-pill-badge" title="Active Model Checkpoint">
              <span className="pulse-dot" />
              <span>{health.model_version || 'tfidf-7c2b6d2d'}</span>
            </div>

            {/* 1919 Emergency Pill */}
            <a href="tel:1919" className="cert-pill" title="National CERT Emergency Hotline">
              <Phone size={13} />
              <span>1919 CERT</span>
            </a>

            {/* Theme / User Action */}
            <button
              type="button"
              className="source-pill-btn"
              onClick={toggleTheme}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--surface-container-high)',
                color: 'var(--on-surface)',
                cursor: 'pointer'
              }}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      {/* Global Drift Alert Banner (From Hareen) */}
      <AlertBanner onNavigateReview={() => setActiveTab('review')} />

      {/* Main Dynamic View */}
      <main className="main-content">
        {activeTab === 'check' && <Check />}
        {activeTab === 'monitor' && <Monitor onNavigateReview={() => setActiveTab('review')} />}
        {activeTab === 'review' && <Review />}
      </main>

      {/* Civic Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <strong style={{ color: 'var(--primary)' }}>ScamRadar LK</strong>
            <span>•</span>
            <span>National AI-Assisted Threat Surveillance & Public Verification</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
              Checkpoint: {health.model_version || 'tfidf-7c2b6d2d'}
            </span>
            <span>SL-CERT Escalation: 1919</span>
            <span>© 2026 ScamRadar LK. Open Civic Security.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
