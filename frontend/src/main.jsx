import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import QRMenu from './QRMenu.jsx'

import HomePage from './HomePage.jsx'
import SignUpPage from './SignUpPage.jsx'
import CookieConsent from './CookieConsent.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught runtime exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          fontFamily: "'Outfit', sans-serif",
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '480px',
            backgroundColor: '#1e293b',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '32px 24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0', color: '#f87171' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              An unexpected error occurred while loading this view. You can reload the page or return to sign in.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                ↻ Reload Application
              </button>
              <button
                onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
                style={{
                  padding: '10px 18px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Sign In Again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const path = window.location.pathname;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      {path === '/' || path === '/about' || path === '/contact' ? (
        <HomePage />
      ) : path === '/signup' ? (
        <SignUpPage />
      ) : path.startsWith('/menu') ? (
        <QRMenu />
      ) : (
        <App />
      )}
      <CookieConsent />
    </ErrorBoundary>
  </StrictMode>,
)
