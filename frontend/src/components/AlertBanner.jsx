import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { useLang } from '../i18n';
import './AlertBanner.css';

/**
 * AlertBanner Component
 * Displays system drift alerts and active fallback mode across the app.
 * Adheres to ScamRadar LK UX Copy Deck by Didulana & Hareen.
 */
export default function AlertBanner({ apiBaseUrl = API_URL, onNavigateReview }) {
  const [alerts, setAlerts] = useState([]);
  const [driftStatus, setDriftStatus] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t, has } = useLang();

  const fetchAlerts = async () => {
    try {
      const [alertsRes, monitorRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/alerts`).then(r => r.ok ? r.json() : []),
        fetch(`${apiBaseUrl}/api/monitor`).then(r => r.ok ? r.json() : null)
      ]);
      setAlerts(alertsRes || []);
      setDriftStatus(monitorRes);
    } catch (err) {
      // Offline fallback mock state for UI testing
      setDriftStatus({
        drift: false,
        response: 'Normal operation.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, [apiBaseUrl]);

  const hasDrift = driftStatus?.drift || alerts.length > 0;
  if (!hasDrift || isDismissed || loading) {
    return null;
  }

  const activeAlert = alerts[0];
  const signalName = activeAlert ? activeAlert.signal.replace(/_/g, ' ').toUpperCase() : 'NOVEL TACTIC DETECTED';
  const signalKey = activeAlert ? `sig.${activeAlert.signal}` : null;
  const signalMsg = signalKey && has(signalKey)
    ? t(signalKey)
    : (activeAlert ? activeAlert.message : (driftStatus?.response || 'Safe fallback active: Unfamiliar messages marked Suspicious and sent to human review.'));

  return (
    <aside className="scamradar-alert-banner" role="alert" aria-live="assertive">
      <div className="alert-content-container">
        <div className="alert-badge-group">
          <span className="pulse-indicator"></span>
          <span className="alert-badge">⚠️ {t('banner.badge')}</span>
          <span className="signal-tag">{signalName}</span>
        </div>

        <div className="alert-message-text">
          <p className="main-warning">
            <strong>{t('banner.title')}</strong> {signalMsg}
          </p>
          <p className="sub-warning">
            {t('banner.sub')}
          </p>
        </div>

        <div className="alert-action-group">
          {onNavigateReview ? (
            <button 
              type="button" 
              className="alert-review-btn"
              onClick={onNavigateReview}
            >
              {t('banner.reviewBtn')}
            </button>
          ) : (
            <a href="#review" className="alert-review-btn">
              {t('banner.reviewBtn')}
            </a>
          )}
          <button 
            type="button" 
            className="alert-dismiss-btn"
            onClick={() => setIsDismissed(true)}
            aria-label={t('banner.close')}
          >
            ✕
          </button>
        </div>
      </div>
    </aside>
  );
}
