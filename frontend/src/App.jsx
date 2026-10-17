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
import Review from './pages/Review';
import AlertBanner from './components/AlertBanner';
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

      {/* Global Drift Alert Banner */}
      <AlertBanner onNavigateReview={() => setActiveTab('review')} />

      {/* Main Dynamic View */}
      <main className="main-content">
        {activeTab === 'check' && <Check />}
        {activeTab === 'monitor' && <Monitor />}
        {activeTab === 'review' && <Review />}
      </main>
    </div>
  );
}
