import React, { useState } from 'react';
import Footer from './Footer.jsx';

const PLANS = [
  {
    id: 'Canteen Basic',
    name: 'Canteen Basic',
    badge: 'School / College Counters',
    price: '₹12,000',
    period: '/ year',
    description: 'Essential billing, daily menu toggles, and cash/UPI POS for institutional single counters.',
    features: [
      'Daily Menu Toggle & Pricing Control',
      'Basic Stock Ledger (Manual counts & consumption)',
      'Counter POS & Instant Cash/UPI Billing',
      'Daily Closing Summary via WhatsApp Alerts',
      'Standard MIS Daily Sales & Itemized Reports',
      'Single Counter / Express Terminal Access'
    ],
    color: '#3b82f6',
    trialAvailable: true
  },
  {
    id: 'Canteen Pro',
    name: 'Canteen Pro',
    badge: 'Corporate & Hospital Dining',
    price: '₹20,000',
    period: '/ year',
    popular: true,
    description: 'Full kitchen automation, live KDS screens, QR ordering & RFID meal cards for high-volume canteens.',
    features: [
      'Everything included in Canteen Basic',
      'Real-Time Kitchen Display System (KDS)',
      'Customer QR Code Mobile Self-Ordering',
      'Recipe Formulations & Auto-Stock Deductions',
      'Contactless RFID Meal Cards & Prepaid Wallets',
      'Mess Subscription Meal Plans & Monthly Passes',
      'HR Management, Staff Shifts & Biometric Payroll'
    ],
    color: '#8b5cf6',
    trialAvailable: true
  },
  {
    id: 'Food Court',
    name: 'Food Court',
    badge: 'Malls & Multi-Vendor Parks',
    price: '₹40,000',
    period: '/ year',
    description: 'Multi-stall operations with consolidated split POS, automated commission splits, and vendor payouts.',
    features: [
      'Everything included in Canteen Pro',
      'Multi-Vendor & Multi-Stall Partitioned Architecture',
      'Stall-Level Performance Insights & Live Revenue',
      'Automated Platform Commission & Split Rules',
      'Vendor Settlement Payout Ledgers & Vouchers',
      'Consolidated Central Cashier POS Terminal',
      'Individual Stall Manager Dashboards'
    ],
    color: '#10b981',
    trialAvailable: true
  },
  {
    id: 'Enterprise',
    name: 'Enterprise',
    badge: 'Canteen Chains & Fleet Parks',
    price: '₹75,000+',
    period: '/ year',
    description: 'Centralized corporate governance, multi-branch fleet networking, custom ERP APIs, and priority SLAs.',
    features: [
      'Everything in Food Court & Pro Suites',
      'Multi-Branch Enterprise Fleet Hierarchy',
      'High-Throughput Dedicated WhatsApp Gateway',
      'Dedicated Technical Account Manager & 24/7 SLA',
      'Custom ERP, SAP & Biometric API Integrations',
      'White-Glove Assisted Onboarding & Hardware Setup'
    ],
    color: '#f59e0b',
    trialAvailable: false
  }
];

export default function SignUpPage() {
  const [selectedPlan, setSelectedPlan] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const requestedPlan = params.get('plan');
      if (requestedPlan) {
        const match = PLANS.find(
          p => p.id.toLowerCase() === requestedPlan.toLowerCase() || p.name.toLowerCase() === requestedPlan.toLowerCase()
        );
        if (match) return match.id;
      }
    } catch {
      // fallback
    }
    return 'Canteen Pro';
  });

  const [subscriptionType, setSubscriptionType] = useState('trial'); // 'trial' or 'annual'
  const [paymentReference, setPaymentReference] = useState('');
  const [formData, setFormData] = useState({
    foodCourtName: '',
    ownerName: '',
    email: '',
    phone: '',
    city: '',
    countersCount: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const activePlanObj = PLANS.find(p => p.id === selectedPlan) || PLANS[1];

  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId);
    if (planId === 'Enterprise') {
      setSubscriptionType('annual');
    }
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (subscriptionType === 'annual' && selectedPlan !== 'Enterprise' && !paymentReference.trim()) {
      setError('Please provide your Bank Payment Transaction ID / UTR number for annual subscription verification.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foodCourtName: formData.foodCourtName,
          ownerName: formData.ownerName,
          email: formData.email,
          phone: formData.phone,
          city: formData.city,
          message: [
            formData.countersCount ? `Counters/Stalls: ${formData.countersCount}` : '',
            formData.message ? formData.message : ''
          ].filter(Boolean).join(' | '),
          planName: selectedPlan,
          subscriptionType: subscriptionType,
          paymentReference: paymentReference.trim() || null,
          paymentAmount: subscriptionType === 'trial' ? 0 : (activePlanObj.price.replace(/[^\d]/g, '') || 0)
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Failed to submit registration. Please try again.');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fc-signup-root">
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          overflow-x: hidden;
          overflow-y: auto !important;
          background: #030712;
          min-height: 100vh;
        }
        .fc-signup-root {
          background-color: #030712;
          color: #f8fafc;
          font-family: 'Outfit', system-ui, -apple-system, sans-serif;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* Top Bar */
        .fc-signup-navbar {
          height: 74px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(3, 7, 18, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 5%;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .fc-signup-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: #f8fafc;
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .fc-signup-brand img {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        }
        .fc-signup-version {
          font-size: 0.68rem;
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
          border: 1px solid rgba(99, 102, 241, 0.3);
          padding: 2px 7px;
          border-radius: 12px;
          font-weight: 700;
        }
        .fc-signup-nav-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .fc-nav-back-link {
          color: #94a3b8;
          text-decoration: none;
          font-size: 0.92rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: color 0.2s;
        }
        .fc-nav-back-link:hover {
          color: #f8fafc;
        }
        .fc-nav-signin-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #cbd5e1;
          padding: 7px 16px;
          border-radius: 8px;
          font-size: 0.88rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
        }
        .fc-nav-signin-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }

        /* Main Container */
        .fc-signup-main {
          flex: 1;
          max-width: 1240px;
          width: 100%;
          margin: 0 auto;
          padding: 40px 24px 70px;
        }
        .fc-signup-heading {
          text-align: center;
          margin-bottom: 36px;
        }
        .fc-signup-heading h1 {
          font-size: clamp(2rem, 3.5vw, 2.8rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 10px;
          color: #f8fafc;
        }
        .fc-signup-heading p {
          color: #94a3b8;
          font-size: 1.05rem;
          max-width: 640px;
          margin: 0 auto;
        }

        /* 2-Column Layout */
        .fc-signup-grid {
          display: grid;
          grid-template-columns: 1.05fr 1.35fr;
          gap: 32px;
          align-items: start;
        }
        @media (max-width: 960px) {
          .fc-signup-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Left Column: Plan Selector & Perks */
        .fc-plan-col {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .fc-plan-selector-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 5px;
          border-radius: 14px;
          gap: 4px;
        }
        @media (max-width: 600px) {
          .fc-plan-selector-bar {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .fc-plan-tab-btn {
          background: transparent;
          border: none;
          padding: 10px 8px;
          border-radius: 10px;
          color: #94a3b8;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          text-align: center;
          white-space: nowrap;
        }
        .fc-plan-tab-btn.active {
          background: rgba(99, 102, 241, 0.2);
          color: #f8fafc;
          border: 1px solid rgba(99, 102, 241, 0.4);
          box-shadow: 0 2px 10px rgba(79, 70, 229, 0.25);
        }

        /* Active Plan Spotlight Card */
        .fc-plan-spotlight {
          background: linear-gradient(180deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          position: relative;
          overflow: hidden;
        }
        .fc-plan-spotlight::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: ${activePlanObj.color};
        }
        .fc-spotlight-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .fc-spotlight-name {
          font-size: 1.5rem;
          font-weight: 800;
          color: #f8fafc;
        }
        .fc-spotlight-badge {
          font-size: 0.78rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          color: ${activePlanObj.color};
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .fc-spotlight-price {
          font-size: 2.2rem;
          font-weight: 800;
          color: #f8fafc;
          margin-bottom: 12px;
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .fc-spotlight-price span {
          font-size: 0.9rem;
          font-weight: 500;
          color: #64748b;
        }
        .fc-spotlight-desc {
          font-size: 0.92rem;
          color: #94a3b8;
          line-height: 1.5;
          margin-bottom: 22px;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .fc-features-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #cbd5e1;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 14px;
        }
        .fc-features-checklist {
          list-style: none;
          padding: 0;
          margin: 0 0 24px;
          display: flex;
          flex-direction: column;
          gap: 11px;
        }
        .fc-features-checklist li {
          font-size: 0.9rem;
          color: #cbd5e1;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          line-height: 1.45;
        }
        .fc-feat-icon {
          color: #10b981;
          font-weight: 800;
          font-size: 0.95rem;
          flex-shrink: 0;
        }

        /* Trust Badges */
        .fc-trust-box {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .fc-trust-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.86rem;
          color: #94a3b8;
        }
        .fc-trust-item span:first-child {
          font-size: 1.15rem;
        }

        /* Right Column: Registration Card */
        .fc-form-card {
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 36px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        @media (max-width: 600px) {
          .fc-form-card {
            padding: 24px 18px;
          }
        }
        .fc-form-step-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .fc-step-num {
          background: rgba(99, 102, 241, 0.2);
          color: #818cf8;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 800;
        }

        /* Activation Segment Options */
        .fc-mode-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }
        @media (max-width: 540px) {
          .fc-mode-selector {
            grid-template-columns: 1fr;
          }
        }
        .fc-mode-card {
          padding: 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .fc-mode-card:hover {
          border-color: rgba(99, 102, 241, 0.3);
          background: rgba(255, 255, 255, 0.04);
        }
        .fc-mode-card.selected {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.12);
          box-shadow: 0 4px 18px rgba(79, 70, 229, 0.15);
        }
        .fc-mode-card input[type="radio"] {
          margin-top: 3px;
          accent-color: #6366f1;
          cursor: pointer;
        }
        .fc-mode-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 4px;
        }
        .fc-mode-desc {
          font-size: 0.8rem;
          color: #94a3b8;
          line-height: 1.4;
        }

        /* Bank Payment Box */
        .fc-bank-box {
          background: rgba(59, 130, 246, 0.07);
          border: 1px solid rgba(59, 130, 246, 0.25);
          border-radius: 12px;
          padding: 18px;
          margin-bottom: 24px;
        }
        .fc-bank-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .fc-bank-header strong {
          color: #60a5fa;
          font-size: 0.92rem;
        }
        .fc-bank-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          font-size: 0.82rem;
          color: #cbd5e1;
          margin-bottom: 14px;
        }
        @media (max-width: 500px) {
          .fc-bank-grid {
            grid-template-columns: 1fr;
          }
        }
        .fc-bank-grid div {
          background: rgba(0, 0, 0, 0.25);
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        /* Form Inputs */
        .fc-input-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        @media (max-width: 560px) {
          .fc-input-row {
            grid-template-columns: 1fr;
          }
        }
        .fc-field {
          margin-bottom: 16px;
        }
        .fc-field-label {
          display: block;
          font-size: 0.86rem;
          font-weight: 600;
          color: #cbd5e1;
          margin-bottom: 6px;
        }
        .fc-text-input, .fc-textarea {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(3, 7, 18, 0.7);
          color: #f8fafc;
          font-family: inherit;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .fc-text-input:focus, .fc-textarea:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }
        .fc-textarea {
          min-height: 80px;
          resize: vertical;
        }

        /* Submit Button */
        .fc-reg-submit-btn {
          width: 100%;
          padding: 15px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #4f46e5 0%, #2563eb 100%);
          color: #ffffff;
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          box-shadow: 0 4px 20px rgba(79, 70, 229, 0.4);
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .fc-reg-submit-btn:hover {
          background: linear-gradient(135deg, #4338ca 0%, #1d4ed8 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(79, 70, 229, 0.5);
        }
        .fc-reg-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
        }
        .fc-form-error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 0.88rem;
          margin-top: 16px;
        }

        /* Success Panel */
        .fc-success-box {
          text-align: center;
          padding: 50px 20px;
        }
        .fc-success-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin: 0 auto 20px;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
      `}</style>

      {/* Top Navbar */}
      <nav className="fc-signup-navbar">
        <a href="/" className="fc-signup-brand">
          <img src="/favicon.svg" alt="FC-ERP Logo" />
          <span>FC-ERP</span>
          <span className="fc-signup-version">v1.1.4</span>
        </a>
        <div className="fc-signup-nav-right">
          <a href="/" className="fc-nav-back-link">
            <span>←</span>
            <span>Back to Website</span>
          </a>
          <a href="/signin" className="fc-nav-signin-btn">
            Sign In
          </a>
        </div>
      </nav>

      {/* Main Registration Content */}
      <div className="fc-signup-main">
        <div className="fc-signup-heading">
          <h1>Register Your Food Court or Canteen</h1>
          <p>
            Choose your facility edition, enter your management credentials, and get your workspace live on the FC-ERP cloud network.
          </p>
        </div>

        {!success ? (
          <div className="fc-signup-grid">
            {/* Left Column: Plan Selection & What's Included */}
            <div className="fc-plan-col">
              {/* Quick Tab Selector */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                  Select Subscription Edition:
                </div>
                <div className="fc-plan-selector-bar">
                  {PLANS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className={`fc-plan-tab-btn ${selectedPlan === p.id ? 'active' : ''}`}
                      onClick={() => handlePlanSelect(p.id)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spotlight Plan Card */}
              <div className="fc-plan-spotlight">
                <div className="fc-spotlight-top">
                  <div>
                    <div className="fc-spotlight-name">{activePlanObj.name}</div>
                    <div className="fc-spotlight-badge">{activePlanObj.badge}</div>
                  </div>
                  {activePlanObj.popular && (
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                      color: '#fff',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      textTransform: 'uppercase'
                    }}>
                      Most Popular
                    </span>
                  )}
                </div>

                <div className="fc-spotlight-price">
                  {activePlanObj.price}
                  <span>{activePlanObj.period}</span>
                </div>

                <p className="fc-spotlight-desc">
                  {activePlanObj.description}
                </p>

                <div className="fc-features-label">What's included in {activePlanObj.name}:</div>
                <ul className="fc-features-checklist">
                  {activePlanObj.features.map((feat, idx) => (
                    <li key={idx}>
                      <span className="fc-feat-icon">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trust Guarantees */}
              <div className="fc-trust-box">
                <div className="fc-trust-item">
                  <span>🔒</span>
                  <div>
                    <strong style={{ color: '#f8fafc' }}>Zero Data Leakage:</strong> Strict tenant and vendor query isolation.
                  </div>
                </div>
                <div className="fc-trust-item">
                  <span>📱</span>
                  <div>
                    <strong style={{ color: '#f8fafc' }}>Zero Hardware Lock-In:</strong> Works on standard tablets, PCs &amp; thermal printers.
                  </div>
                </div>
                <div className="fc-trust-item">
                  <span>⚡</span>
                  <div>
                    <strong style={{ color: '#f8fafc' }}>Instant Activation:</strong> Credentials sent to your email immediately upon review.
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Registration Form */}
            <div className="fc-form-card">
              <form onSubmit={handleSubmit}>
                {/* 1. Activation Mode */}
                <div className="fc-form-step-title">
                  <span className="fc-step-num">1</span>
                  <span>Select Activation Mode</span>
                </div>

                {selectedPlan === 'Enterprise' ? (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    fontSize: '0.88rem',
                    color: '#fbbf24',
                    lineHeight: '1.5',
                    marginBottom: '24px'
                  }}>
                    🏢 <strong>Enterprise Fleet Protocol:</strong> Enterprise deployments include multi-branch fleet coordination, dedicated account managers, and custom SLA agreements. Submit your details below to schedule an onboarding consultation.
                  </div>
                ) : (
                  <div className="fc-mode-selector">
                    <div
                      className={`fc-mode-card ${subscriptionType === 'trial' ? 'selected' : ''}`}
                      onClick={() => setSubscriptionType('trial')}
                    >
                      <input
                        type="radio"
                        name="subscriptionType"
                        checked={subscriptionType === 'trial'}
                        onChange={() => setSubscriptionType('trial')}
                      />
                      <div>
                        <div className="fc-mode-title">7-Day Free Trial</div>
                        <div className="fc-mode-desc">Zero upfront payment. Immediate full-featured sandbox testing.</div>
                      </div>
                    </div>

                    <div
                      className={`fc-mode-card ${subscriptionType === 'annual' ? 'selected' : ''}`}
                      onClick={() => setSubscriptionType('annual')}
                    >
                      <input
                        type="radio"
                        name="subscriptionType"
                        checked={subscriptionType === 'annual'}
                        onChange={() => setSubscriptionType('annual')}
                      />
                      <div>
                        <div className="fc-mode-title">Annual License</div>
                        <div className="fc-mode-desc">{activePlanObj.price}/yr. Direct 12-month production activation.</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Annual Payment Transfer Info */}
                {subscriptionType === 'annual' && selectedPlan !== 'Enterprise' && (
                  <div className="fc-bank-box">
                    <div className="fc-bank-header">
                      <strong>💳 Bank Payment Information ({activePlanObj.price}/yr)</strong>
                      <span style={{ fontSize: '0.75rem', color: '#93c5fd' }}>Verified Corporate Account</span>
                    </div>
                    <div className="fc-bank-grid">
                      <div>
                        <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Beneficiary Name</div>
                        <strong>RAD Group of Company Private Limited</strong>
                      </div>
                      <div>
                        <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Corporate UPI ID</div>
                        <strong>radgroup@icici</strong>
                      </div>
                      <div>
                        <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Bank / Branch</div>
                        <strong>ICICI Bank, Chennai Main</strong>
                      </div>
                      <div>
                        <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Account &amp; IFSC</div>
                        <strong>A/C: 000905001234 · ICIC0000009</strong>
                      </div>
                    </div>

                    <div className="fc-field" style={{ marginBottom: 0 }}>
                      <label className="fc-field-label">Payment UTR / Transaction Reference ID *</label>
                      <input
                        type="text"
                        required
                        className="fc-text-input"
                        placeholder="e.g. 423589201948 or UPI Ref Number"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* 2. Facility Details */}
                <div className="fc-form-step-title" style={{ marginTop: '20px' }}>
                  <span className="fc-step-num">2</span>
                  <span>Facility &amp; Management Information</span>
                </div>

                <div className="fc-input-row">
                  <div className="fc-field">
                    <label className="fc-field-label">Food Court / Canteen Name *</label>
                    <input
                      type="text"
                      required
                      name="foodCourtName"
                      className="fc-text-input"
                      placeholder="e.g. SRM Central Canteen"
                      value={formData.foodCourtName}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="fc-field">
                    <label className="fc-field-label">Administrator / In-Charge Name *</label>
                    <input
                      type="text"
                      required
                      name="ownerName"
                      className="fc-text-input"
                      placeholder="e.g. Rajesh Kumar"
                      value={formData.ownerName}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="fc-input-row">
                  <div className="fc-field">
                    <label className="fc-field-label">Official Work Email *</label>
                    <input
                      type="email"
                      required
                      name="email"
                      className="fc-text-input"
                      placeholder="e.g. admin@institution.edu"
                      value={formData.email}
                      onChange={handleChange}
                    />
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                      Login credentials and tenant keys will be dispatched to this email.
                    </div>
                  </div>
                  <div className="fc-field">
                    <label className="fc-field-label">Contact Phone Number *</label>
                    <input
                      type="tel"
                      required
                      pattern="^\\+?\\d{10,15}$"
                      name="phone"
                      className="fc-text-input"
                      placeholder="e.g. 9876543210"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                      Used for automated WhatsApp daily closing summaries.
                    </div>
                  </div>
                </div>

                <div className="fc-input-row">
                  <div className="fc-field">
                    <label className="fc-field-label">City / Location *</label>
                    <input
                      type="text"
                      required
                      name="city"
                      className="fc-text-input"
                      placeholder="e.g. Chennai, Tamil Nadu"
                      value={formData.city}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="fc-field">
                    <label className="fc-field-label">Number of Counters / Stalls (Optional)</label>
                    <input
                      type="text"
                      name="countersCount"
                      className="fc-text-input"
                      placeholder="e.g. 4 stalls, 2 billing counters"
                      value={formData.countersCount}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="fc-field">
                  <label className="fc-field-label">Special Requirements / Notes (Optional)</label>
                  <textarea
                    name="message"
                    className="fc-textarea"
                    placeholder="Describe any existing POS setup, thermal printer models, or specific dining workflows..."
                    value={formData.message}
                    onChange={handleChange}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="fc-reg-submit-btn"
                >
                  {loading ? (
                    <span>Submitting Registration...</span>
                  ) : subscriptionType === 'trial' ? (
                    <span>Submit {activePlanObj.name} (Start 7-Day Free Trial) →</span>
                  ) : (
                    <span>Register {activePlanObj.name} ({activePlanObj.price}/yr) →</span>
                  )}
                </button>

                {error && <div className="fc-form-error">{error}</div>}
              </form>
            </div>
          </div>
        ) : (
          <div className="fc-form-card" style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div className="fc-success-box">
              <div className="fc-success-icon">✓</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px' }}>Registration Submitted!</h2>
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '12px',
                padding: '18px 24px',
                textAlign: 'left',
                margin: '20px 0',
                fontSize: '0.92rem',
                lineHeight: '1.6',
                color: '#cbd5e1'
              }}>
                <div><strong>Selected Plan:</strong> <span style={{ color: activePlanObj.color, fontWeight: 700 }}>{selectedPlan}</span></div>
                <div><strong>Activation Mode:</strong> {subscriptionType === 'trial' ? '7-Day Full Access Trial' : `Annual License (${activePlanObj.price}/yr)`}</div>
                {paymentReference && <div><strong>Payment Ref / UTR:</strong> {paymentReference}</div>}
                <div><strong>Facility:</strong> {formData.foodCourtName} ({formData.city})</div>
                <div><strong>Dispatch Email:</strong> {formData.email}</div>
              </div>

              <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '28px' }}>
                Your food court registration has been routed to the Super Admin desk. Once verified, your workspace credentials and active plan entitlements will be dispatched to <strong>{formData.email}</strong>.
              </p>

              <button
                type="button"
                className="fc-reg-submit-btn"
                style={{ maxWidth: '240px', margin: '0 auto' }}
                onClick={() => window.location.href = '/'}
              >
                Return to Website
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Unified Corporate Footer */}
      <Footer />
    </div>
  );
}
