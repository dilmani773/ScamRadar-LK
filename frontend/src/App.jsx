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
import { LanguageProvider, useLang, LANGS } from './i18n';

export default function App() {
  return (
    <LanguageProvider>
      <AppShell />
    </LanguageProvider>
  );
}

function AppShell() {
  const { lang, setLang, t } = useLang();
  const [activeTab, setActiveTab] = useState('check');
  const [theme, setTheme] = useState('light'); // Default to Civic Shield Light mode
  const [health, setHealth] = useState({ model_version: 'tfidf-7c2b6d2d', model_loaded: true });
  const [reviewCount, setReviewCount] = useState(0);

  // Sync theme with DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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
              <span>{t('brand.tagline')}</span>
            </div>
          </div>

          {/* Center Pill Nav */}
          <nav className="nav-tabs">
            <button
              type="button"
              className={`nav-tab ${activeTab === 'check' ? 'active' : ''}`}
              onClick={() => setActiveTab('check')}
            >
              {t('nav.check')}
            </button>
            <button
              type="button"
              className={`nav-tab ${activeTab === 'monitor' ? 'active' : ''}`}
              onClick={() => setActiveTab('monitor')}
            >
              {t('nav.monitor')}
            </button>
            <button
              type="button"
              className={`nav-tab ${activeTab === 'review' ? 'active' : ''}`}
              onClick={() => setActiveTab('review')}
            >
              {t('nav.review')} {reviewCount > 0 ? `(${reviewCount})` : ''}
            </button>
          </nav>

          {/* Right Controls */}
          <div className="header-controls">
            {/* Active Model Pill */}
            <div className="model-pill-badge" title="Active Model Checkpoint">
              <span className="pulse-dot" />
              <span>{health.model_version || 'tfidf-7c2b6d2d'}</span>
            </div>

            {/* Sri Lanka CERT hotline (101) */}
            <a href="tel:101" className="cert-pill" title={t('header.certTitle')}>
              <Phone size={13} />
              <span>{t('header.cert')}</span>
            </a>

            {/* Language switcher: English / සිංහල / தமிழ் */}
            <div className="lang-switch" role="group" aria-label={t('lang.label')}>
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  lang={l.code}
                  className={`lang-switch-btn ${lang === l.code ? 'active' : ''}`}
                  onClick={() => setLang(l.code)}
                  aria-pressed={lang === l.code}
                  title={l.name}
                >
                  {l.short}
                </button>
              ))}
            </div>

            {/* Theme toggle */}
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
              aria-label={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
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
            <span>{t('footer.tagline')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
              {t('footer.model')}: {health.model_version || 'tfidf-7c2b6d2d'}
            </span>
            <span>{t('footer.report')}</span>
            <span>© 2026 Team Paradox · MIT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
