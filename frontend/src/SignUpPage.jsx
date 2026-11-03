// Clean SignUpPage component with Plan Entitlements & Pricing Selection
import React, { useState } from 'react';

const PLANS = [
  {
    id: 'Canteen Basic',
    name: 'Canteen Basic',
    badge: 'School / College',
    price: '₹12,000',
    period: '/ year',
    description: 'Essential billing and menu management for institutional single counters.',
    features: [
      'Daily Menu Toggle & Pricing',
      'Basic Stock Ledger (Manual counts)',
      'Counter POS & Instant Cash/UPI Billing',
      'Daily Closing Summary via WhatsApp',
      'MIS Daily Sales Reports'
    ],
    color: '#3b82f6',
    trialAvailable: true
  },
  {
    id: 'Canteen Pro',
    name: 'Canteen Pro',
    badge: 'Corporate / Hospital',
    price: '₹20,000',
    period: '/ year',
    popular: true,
    description: 'Full kitchen automation, QR ordering & RFID meal cards for high-volume canteens.',
    features: [
      'All Basic Canteen Features',
      'Real-Time Kitchen Display System (KDS)',
      'Customer QR Code Self-Ordering',
      'Recipe Formulations & Auto-Deductions',
      'RFID Meal Cards & Prepaid Wallets',
      'Mess Subscription Plans',
      'HR, Staff Attendance & Payroll'
    ],
    color: '#8b5cf6',
    trialAvailable: true
  },
  {
    id: 'Food Court',
    name: 'Food Court',
    badge: 'Mall Food Courts & Parks',
    price: '₹40,000',
    period: '/ year',
    description: 'Multi-stall operations with automatic revenue splitting and vendor settlements.',
    features: [
      'All Canteen Pro Features',
      'Multi-Vendor & Multiple Stall Management',
      'Stall-Level Performance Insights',
      'Commission Tracking & Automated Splits',
      'Vendor Settlement Payout Ledgers',
      'Consolidated Food Court POS'
    ],
    color: '#10b981',
    trialAvailable: true
  },
  {
    id: 'Enterprise',
    name: 'Enterprise',
    badge: 'Canteen Chains & Fleets',
    price: '₹75,000+',
    period: '/ year',
    description: 'Centralized governance, multi-branch fleet networking, and priority SLAs.',
    features: [
      'All Food Court & Pro Features',
      'Multi-Branch Fleet Hierarchy',
      'Priority WhatsApp Gateway Routing',
      'Dedicated Account Manager & SLA',
      'Custom ERP & API Integrations',
      'Guided Enterprise Onboarding'
    ],
    color: '#f59e0b',
    trialAvailable: false
  }
];

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    foodCourtName: '',
    ownerName: '',
    email: '',
    phone: '',
    city: '',
    message: ''
  });
  const [selectedPlan, setSelectedPlan] = useState('Canteen Pro');
  const [subscriptionType, setSubscriptionType] = useState('trial'); // 'trial' or 'annual'
  const [paymentReference, setPaymentReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const activePlanObj = PLANS.find(p => p.id === selectedPlan) || PLANS[1];

  const theme = {
    bg: '#0a0a0f',
    card: '#111118',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    textPrimary: '#e2e8f0',
    textSecondary: '#94a3b8',
    accent: '#8b5cf6',
    accentHover: '#7c3aed',
    inputBg: '#1a1a2e',
    inputBorder: '#2d2d44',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
    error: '#ef4444',
    success: '#10b981'
  };

  const styles = {
    container: {
      backgroundColor: theme.bg,
      color: theme.textPrimary,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '60px',
      paddingBottom: '60px',
      paddingLeft: '16px',
      paddingRight: '16px',
      boxSizing: 'border-box'
    },
    header: {
      width: '100%',
      maxWidth: '860px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '28px'
    },
    backLink: {
      color: theme.textSecondary,
      textDecoration: 'none',
      cursor: 'pointer',
      fontSize: '0.95rem',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    mainCard: {
      background: theme.card,
      border: `1px solid ${theme.cardBorder}`,
      borderRadius: '20px',
      padding: '40px',
      width: '100%',
      maxWidth: '860px',
      boxSizing: 'border-box',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
    },
    logo: {
      fontSize: '1.8rem',
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: '6px'
    },
    subtitle: {
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: '32px',
      fontSize: '1.05rem'
    },
    sectionTitle: {
      fontSize: '1.1rem',
      fontWeight: '700',
      color: '#f8fafc',
      margin: '0 0 14px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    planGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
      gap: '14px',
      marginBottom: '28px'
    },
    planCard: (isSelected, color, isPopular) => ({
      position: 'relative',
      background: isSelected ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
      border: isSelected ? `2px solid ${color}` : '1px solid rgba(255, 255, 255, 0.07)',
      borderRadius: '14px',
      padding: '16px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxShadow: isSelected ? `0 0 20px ${color}25` : 'none'
    }),
    planBadge: (color) => ({
      fontSize: '0.7rem',
      fontWeight: '700',
      color: color,
      background: `${color}18`,
      border: `1px solid ${color}35`,
      padding: '3px 8px',
      borderRadius: '12px',
      alignSelf: 'flex-start',
      marginBottom: '8px'
    }),
    planPopularBadge: {
      position: 'absolute',
      top: '-10px',
      right: '12px',
      background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
      color: '#fff',
      fontSize: '0.65rem',
      fontWeight: '700',
      padding: '2px 8px',
      borderRadius: '10px',
      letterSpacing: '0.5px'
    },
    planName: {
      fontSize: '1.05rem',
      fontWeight: '700',
      margin: '0 0 4px 0',
      color: '#f8fafc'
    },
    planPrice: (color) => ({
      fontSize: '1.25rem',
      fontWeight: '800',
      color: color,
      margin: '0 0 10px 0'
    }),
    planDesc: {
      fontSize: '0.75rem',
      color: theme.textSecondary,
      lineHeight: '1.4',
      margin: 0
    },
    billingToggleBox: {
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.07)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '28px'
    },
    billingOptions: {
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap'
    },
    billingChoice: (isSelected) => ({
      flex: '1',
      minWidth: '200px',
      padding: '12px 16px',
      borderRadius: '10px',
      background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
      border: isSelected ? '1px solid #8b5cf6' : '1px solid rgba(255, 255, 255, 0.08)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }),
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '16px',
      marginBottom: '20px'
    },
    input: {
      background: theme.inputBg,
      border: `1px solid ${theme.inputBorder}`,
      color: theme.textPrimary,
      borderRadius: '8px',
      padding: '12px 14px',
      fontSize: '0.95rem',
      outline: 'none',
      transition: 'border-color 0.2s',
      width: '100%',
      boxSizing: 'border-box'
    },
    textarea: {
      background: theme.inputBg,
      border: `1px solid ${theme.inputBorder}`,
      color: theme.textPrimary,
      borderRadius: '8px',
      padding: '12px 14px',
      fontSize: '0.95rem',
      outline: 'none',
      transition: 'border-color 0.2s',
      width: '100%',
      minHeight: '80px',
      resize: 'vertical',
      boxSizing: 'border-box'
    },
    paymentInfoBox: {
      background: 'rgba(59, 130, 246, 0.06)',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      borderRadius: '12px',
      padding: '16px',
      marginTop: '14px',
      marginBottom: '20px'
    },
    submitBtn: {
      background: theme.gradient,
      color: '#fff',
      border: 'none',
      padding: '14px 24px',
      borderRadius: '10px',
      fontSize: '1.05rem',
      fontWeight: 'bold',
      cursor: 'pointer',
      width: '100%',
      transition: 'opacity 0.2s',
      boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
    },
    errorMsg: {
      color: theme.error,
      marginTop: '16px',
      textAlign: 'center',
      fontSize: '0.9rem'
    },
    successPanel: {
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      padding: '20px 0'
    },
    successIcon: {
      fontSize: '3.5rem'
    },
    successTitle: {
      fontSize: '1.8rem',
      fontWeight: 'bold',
      margin: 0
    },
    successDesc: {
      color: theme.textSecondary,
      lineHeight: '1.6',
      maxWidth: '540px',
      margin: '0 auto 10px auto'
    },
    homeBtn: {
      background: 'rgba(255, 255, 255, 0.08)',
      color: theme.textPrimary,
      border: '1px solid rgba(255, 255, 255, 0.15)',
      padding: '12px 28px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: 'bold'
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId);
    if (planId === 'Enterprise') {
      setSubscriptionType('annual');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (subscriptionType === 'annual' && selectedPlan !== 'Enterprise' && !paymentReference.trim()) {
      setError('Please provide your Payment Transaction ID / UTR number for annual subscription verification.');
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
          message: formData.message,
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
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.backLink} onClick={() => window.location.href = '/'}>
          ← Back to Home
        </span>
        <span style={{ fontSize: '0.85rem', color: theme.textSecondary }}>
          Already have an account?{' '}
          <a href="/signin" style={{ color: '#8b5cf6', textDecoration: 'none', fontWeight: 600 }}>
            Sign In
          </a>
        </span>
      </div>

      <div style={styles.mainCard}>
        {!success ? (
          <>
            <div style={styles.logo}>
              <span style={{ verticalAlign: 'middle' }}>🍽️ FC-ERP</span>
              <span style={{
                fontSize: '0.65rem',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: '600',
                letterSpacing: '0.5px',
                marginLeft: '12px',
                verticalAlign: 'middle'
              }}>v1.1.4</span>
            </div>
            <div style={styles.subtitle}>Register your Food Court or Canteen</div>

            <form onSubmit={handleSubmit}>
              {/* 1. PLAN SELECTION */}
              <div>
                <div style={styles.sectionTitle}>
                  <span>1. Choose Subscription Tier</span>
                </div>
                <div style={styles.planGrid}>
                  {PLANS.map(plan => {
                    const isSelected = selectedPlan === plan.id;
                    return (
                      <div
                        key={plan.id}
                        style={styles.planCard(isSelected, plan.color, plan.popular)}
                        onClick={() => handlePlanSelect(plan.id)}
                      >
                        {plan.popular && <span style={styles.planPopularBadge}>POPULAR</span>}
                        <div>
                          <div style={styles.planBadge(plan.color)}>{plan.badge}</div>
                          <div style={styles.planName}>{plan.name}</div>
                          <div style={styles.planPrice(plan.color)}>
                            {plan.price}
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: theme.textSecondary }}>
                              {plan.period}
                            </span>
                          </div>
                          <p style={styles.planDesc}>{plan.description}</p>
                        </div>

                        <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: isSelected ? plan.color : theme.textSecondary,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {isSelected ? '✓ Selected' : 'Select Plan'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. BILLING SELECTION */}
              <div style={styles.billingToggleBox}>
                <div style={{ ...styles.sectionTitle, fontSize: '0.98rem', marginBottom: '10px' }}>
                  <span>2. Select Activation Mode for {selectedPlan}</span>
                </div>

                {selectedPlan === 'Enterprise' ? (
                  <div style={{ fontSize: '0.85rem', color: '#fbbf24', lineHeight: '1.5' }}>
                    🏢 <b>Enterprise Tier Deployment:</b> Enterprise subscriptions include dedicated multi-branch fleet networking, custom SLA, and priority support. Submit your registration below and our enterprise onboarding team will provision your environment.
                  </div>
                ) : (
                  <div style={styles.billingOptions}>
                    <div
                      style={styles.billingChoice(subscriptionType === 'trial')}
                      onClick={() => setSubscriptionType('trial')}
                    >
                      <input
                        type="radio"
                        name="subscriptionType"
                        checked={subscriptionType === 'trial'}
                        onChange={() => setSubscriptionType('trial')}
                        style={{ accentColor: '#8b5cf6', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                          Start 7-Day Free Trial
                        </div>
                        <div style={{ fontSize: '0.78rem', color: theme.textSecondary }}>
                          Zero upfront payment. Instant full feature testing upon admin approval.
                        </div>
                      </div>
                    </div>

                    <div
                      style={styles.billingChoice(subscriptionType === 'annual')}
                      onClick={() => setSubscriptionType('annual')}
                    >
                      <input
                        type="radio"
                        name="subscriptionType"
                        checked={subscriptionType === 'annual'}
                        onChange={() => setSubscriptionType('annual')}
                        style={{ accentColor: '#8b5cf6', cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                          Annual Subscription ({activePlanObj.price}/yr)
                        </div>
                        <div style={{ fontSize: '0.78rem', color: theme.textSecondary }}>
                          Pay via UPI / NEFT and submit transaction reference for 1-year activation.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment instructions if annual paid plan is selected */}
                {subscriptionType === 'annual' && selectedPlan !== 'Enterprise' && (
                  <div style={styles.paymentInfoBox}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: '0.9rem' }}>
                        💳 Payment Transfer Details ({activePlanObj.name}: {activePlanObj.price}/yr)
                      </span>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(59,130,246,0.15)', color: '#93c5fd', padding: '2px 8px', borderRadius: '8px' }}>
                        Bank & UPI
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.6', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                      <div>
                        <b>Beneficiary:</b> Radinfotec Solutions<br />
                        <b>A/C No:</b> 50200087654321<br />
                        <b>IFSC Code:</b> HDFC0001234
                      </div>
                      <div>
                        <b>Bank:</b> HDFC Bank<br />
                        <b>UPI ID:</b> info@radinfotec.com<br />
                        <b>Account Type:</b> Current
                      </div>
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      <label style={{ fontSize: '0.8rem', color: '#93c5fd', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                        Payment Transaction ID / UTR Number <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        style={{ ...styles.input, background: '#111827', borderColor: '#3b82f6' }}
                        placeholder="e.g. UPI Ref 412345678901 or NEFT UTR No."
                        value={paymentReference}
                        onChange={e => setPaymentReference(e.target.value)}
                        required={subscriptionType === 'annual'}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. BUSINESS & OWNER DETAILS */}
              <div>
                <div style={styles.sectionTitle}>
                  <span>3. Food Court & Canteen Information</span>
                </div>
                <div style={styles.formGrid}>
                  <input
                    style={styles.input}
                    type="text"
                    name="foodCourtName"
                    placeholder="Food Court / Canteen Name *"
                    required
                    value={formData.foodCourtName}
                    onChange={handleChange}
                  />
                  <input
                    style={styles.input}
                    type="text"
                    name="ownerName"
                    placeholder="Owner / Manager Name *"
                    required
                    value={formData.ownerName}
                    onChange={handleChange}
                  />
                  <input
                    style={styles.input}
                    type="email"
                    name="email"
                    placeholder="Owner Login Email *"
                    required
                    pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                    title="Enter a valid email address (e.g., name@domain.com)"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  <input
                    style={styles.input}
                    type="tel"
                    name="phone"
                    placeholder="Phone Number (10-15 digits) *"
                    required
                    pattern="^\+?\d{10,15}$"
                    title="Phone number must contain 10-15 digits"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                  <input
                    style={styles.input}
                    type="text"
                    name="city"
                    placeholder="City / Location *"
                    required
                    value={formData.city}
                    onChange={handleChange}
                  />
                  <textarea
                    style={styles.textarea}
                    name="message"
                    placeholder="Special requirements / Number of counters or stalls (Optional)"
                    value={formData.message}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  ...styles.submitBtn,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
                disabled={loading}
              >
                {loading
                  ? 'Submitting Request...'
                  : subscriptionType === 'trial'
                  ? `Submit ${selectedPlan} (Start 7-Day Free Trial)`
                  : `Submit ${selectedPlan} Registration (${activePlanObj.price}/yr)`}
              </button>

              {error && <div style={styles.errorMsg}>{error}</div>}
            </form>
          </>
        ) : (
          <div style={styles.successPanel}>
            <div style={styles.successIcon}>🎉</div>
            <h2 style={styles.successTitle}>Registration Submitted!</h2>
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '16px 24px',
              maxWidth: '520px',
              textAlign: 'left',
              color: '#f8fafc',
              fontSize: '0.9rem',
              lineHeight: '1.6'
            }}>
              <div><b>Selected Plan:</b> <span style={{ color: activePlanObj.color }}>{selectedPlan}</span></div>
              <div><b>Billing Mode:</b> {subscriptionType === 'trial' ? '7-Day Free Trial' : `Paid Annual (${activePlanObj.price}/yr)`}</div>
              {paymentReference && <div><b>Payment Ref / UTR:</b> {paymentReference}</div>}
              <div><b>Contact Email:</b> {formData.email}</div>
            </div>

            <p style={styles.successDesc}>
              Your subscription request has been submitted to the Super Admin for verification. Once approved, your login credentials and active plan entitlements will be dispatched to <b>{formData.email}</b>.
            </p>
            <button style={styles.homeBtn} onClick={() => window.location.href = '/'}>
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
