import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
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
  const signalMsg = activeAlert ? activeAlert.message : (driftStatus?.response || 'Safe fallback active: Unfamiliar messages marked Suspicious and sent to human review.');

  return (
    <aside className="scamradar-alert-banner" role="alert" aria-live="assertive">
      <div className="alert-content-container">
        <div className="alert-badge-group">
          <span className="pulse-indicator"></span>
          <span className="alert-badge">⚠️ DRIFT DETECTED · FALLBACK ACTIVE</span>
          <span className="signal-tag">{signalName}</span>
        </div>

        <div className="alert-message-text">
          <p className="main-warning">
            <strong>නව වංචා රටාවක් හඳුනාගෙන ඇත:</strong> {signalMsg}
          </p>
          <p className="sub-warning">
            The system identified a significant divergence from baseline patterns. Safe fallback is redirecting unfamiliar messages to the review queue.
          </p>
        </div>

        <div className="alert-action-group">
          {onNavigateReview ? (
            <button 
              type="button" 
              className="alert-review-btn"
              onClick={onNavigateReview}
            >
              සමාලෝචන පෝලිම (Review Queue) →
            </button>
          ) : (
            <a href="#review" className="alert-review-btn">
              Review Queue →
            </a>
          )}
          <button 
            type="button" 
            className="alert-dismiss-btn"
            onClick={() => setIsDismissed(true)}
            aria-label="Close Alert Banner"
          >
            ✕
          </button>
        </div>
      </div>
    </aside>
  );
}
