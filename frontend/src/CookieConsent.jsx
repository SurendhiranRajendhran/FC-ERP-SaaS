import React, { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('fc_cookie_consent');
      if (!consent) {
        const timer = setTimeout(() => {
          setVisible(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore if localStorage unavailable
    }
  }, []);

  const handleConsent = (level) => {
    try {
      localStorage.setItem('fc_cookie_consent', level);
      localStorage.setItem('fc_cookie_consent_date', new Date().toISOString());
    } catch {
      // Storage fallback
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fc-cookie-wrapper" role="dialog" aria-labelledby="fc-cookie-title">
      <style>{`
        .fc-cookie-wrapper {
          position: fixed;
          bottom: 24px;
          right: 24px;
          max-width: 460px;
          width: calc(100% - 48px);
          z-index: 9999;
          animation: fcCookieSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          font-family: 'Outfit', system-ui, -apple-system, sans-serif;
        }
        @keyframes fcCookieSlideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (max-width: 640px) {
          .fc-cookie-wrapper {
            bottom: 12px;
            right: 12px;
            left: 12px;
            width: calc(100% - 24px);
            max-width: none;
          }
        }
        .fc-cookie-card {
          background: rgba(15, 23, 42, 0.94);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(99, 102, 241, 0.2);
          border-radius: 18px;
          padding: 22px 24px;
          color: #e2e8f0;
        }
        .fc-cookie-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .fc-cookie-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #f8fafc;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .fc-cookie-badge {
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: 6px;
          font-weight: 600;
        }
        .fc-cookie-text {
          font-size: 0.88rem;
          line-height: 1.55;
          color: #94a3b8;
          margin-bottom: 16px;
        }
        .fc-cookie-details {
          background: rgba(0, 0, 0, 0.25);
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 16px;
          font-size: 0.8rem;
          display: flex;
          flex-direction: column;
          gap: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .fc-cookie-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .fc-cookie-row span {
          color: #cbd5e1;
        }
        .fc-cookie-status {
          color: #10b981;
          font-weight: 600;
          font-size: 0.75rem;
        }
        .fc-cookie-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .fc-cookie-btn-primary {
          flex: 1;
          min-width: 120px;
          background: #4f46e5;
          color: #ffffff;
          border: none;
          padding: 10px 16px;
          border-radius: 9px;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .fc-cookie-btn-primary:hover {
          background: #4338ca;
        }
        .fc-cookie-btn-ghost {
          flex: 1;
          min-width: 110px;
          background: rgba(255, 255, 255, 0.06);
          color: #cbd5e1;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 10px 14px;
          border-radius: 9px;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .fc-cookie-btn-ghost:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }
        .fc-cookie-customize {
          background: transparent;
          border: none;
          color: #818cf8;
          font-size: 0.8rem;
          cursor: pointer;
          text-decoration: underline;
          padding: 4px 6px;
          font-family: inherit;
        }
      `}</style>

      <div className="fc-cookie-card">
        <div className="fc-cookie-header">
          <div className="fc-cookie-title" id="fc-cookie-title">
            <span>🛡️</span>
            <span>Privacy &amp; Data Storage</span>
          </div>
          <span className="fc-cookie-badge">Security</span>
        </div>

        <p className="fc-cookie-text">
          FC-ERP utilizes secure local storage and essential session identifiers to isolate tenant workspaces, authenticate POS terminals, and enable offline-resilient cashier caching. We do not use third-party advertising cookies.
        </p>

        {showDetails && (
          <div className="fc-cookie-details">
            <div className="fc-cookie-row">
              <span>Authentication &amp; JWT Token</span>
              <span className="fc-cookie-status">Strictly Required</span>
            </div>
            <div className="fc-cookie-row">
              <span>Tenant &amp; Vendor Isolation State</span>
              <span className="fc-cookie-status">Strictly Required</span>
            </div>
            <div className="fc-cookie-row">
              <span>POS Offline Cart &amp; Menu Cache</span>
              <span className="fc-cookie-status">Functional</span>
            </div>
          </div>
        )}

        <div className="fc-cookie-actions">
          <button
            type="button"
            className="fc-cookie-btn-primary"
            onClick={() => handleConsent('all')}
          >
            Accept All
          </button>
          <button
            type="button"
            className="fc-cookie-btn-ghost"
            onClick={() => handleConsent('essential')}
          >
            Essential Only
          </button>
          <button
            type="button"
            className="fc-cookie-customize"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide Details' : 'View Details'}
          </button>
        </div>
      </div>
    </div>
  );
}
