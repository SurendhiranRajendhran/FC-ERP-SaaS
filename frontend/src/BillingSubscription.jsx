import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { formatISTDateTime, formatISTDate, parseISTDate } from './dateUtils';

export default function BillingSubscription({ user, currentPlan, isFeaturePermitted, onPlanUpdated }) {
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Upgrade / Checkout Modal States
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [targetPlan, setTargetPlan] = useState(null);
  const [quote, setQuote] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  // Order & Payment States
  const [orderData, setOrderData] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Receipt Modal & Tooltip State
  const [viewingReceipt, setViewingReceipt] = useState(null);
  const [renewTooltipTarget, setRenewTooltipTarget] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchCurrentSubscription();
    fetchInvoices();
  }, []);

  const fetchCurrentSubscription = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/subscription/current', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubscriptionInfo(data);
      }
    } catch (err) {
      console.error('Failed to load subscription info:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const res = await fetch('/api/subscription/invoices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleOpenUpgrade = async (plan) => {
    if (hasPendingRequest) {
      alert(`You already have a payment verification request (${pendingInvoice?.invoice_number} for ${pendingInvoice?.to_plan}) pending Super Admin review. You cannot submit another request until the existing one is approved or rejected.`);
      return;
    }

    if (isHighestTier && plan?.name === currentPlanName && subStatus === 'active' && !isWithinLastMonth) {
      alert(renewLockedMessage);
      return;
    }

    setTargetPlan(plan);
    setShowCheckoutModal(true);
    setQuote(null);
    setOrderData(null);
    setQrDataUrl('');
    setPaymentReference('');
    setPaymentError('');
    setPaymentSuccess(null);
    setLoadingQuote(true);
    setQuoteError('');

    try {
      const res = await fetch(`/api/subscription/quote?to_plan=${encodeURIComponent(plan.name)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setQuote(data);
        setOrderData(data);
        if (data.upi_uri) {
          const qrUrl = await QRCode.toDataURL(data.upi_uri, {
            width: 200,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
          });
          setQrDataUrl(qrUrl);
        }
      } else {
        setQuoteError(data.error || 'Failed to calculate upgrade quote');
      }
    } catch (err) {
      setQuoteError('Network error while calculating quote');
    } finally {
      setLoadingQuote(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (hasPendingRequest) {
      setPaymentError(`A payment verification request (${pendingInvoice?.invoice_number}) is already pending Super Admin review.`);
      return;
    }

    const cleanRef = (paymentReference || '').trim();
    const amountDue = Number(quote?.final_amount ?? orderData?.final_amount ?? 0);
    if (!cleanRef && amountDue > 0) {
      setPaymentError('Please enter your 12-digit UTR / Bank Transaction Reference Number');
      return;
    }

    setSubmittingPayment(true);
    setPaymentError('');

    try {
      const res = await fetch('/api/subscription/submit-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to_plan: targetPlan?.name,
          invoice_number: quote?.invoice_number || orderData?.invoice_number,
          payment_reference: cleanRef
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPaymentSuccess(data);
        fetchCurrentSubscription();
        fetchInvoices();
        if (onPlanUpdated) onPlanUpdated();
      } else {
        setPaymentError(data.error || 'Failed to submit payment reference');
      }
    } catch (err) {
      setPaymentError('Network error submitting payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const copyUpiId = () => {
    const upiId = orderData?.merchant_upi?.upi_id || subscriptionInfo?.merchant_upi?.upi_id || 'info@radinfotec.com';
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const formatCurrency = (amount) => {
    return '₹' + Number(amount || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    });
  };

  const getStatusBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'active':
        return <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>Active</span>;
      case 'trial':
        return <span style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#fbbf24', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>Free Trial</span>;
      case 'expired':
        return <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>Expired</span>;
      case 'approved':
        return <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>Approved</span>;
      case 'pending':
        return <span style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#fbbf24', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>Pending Review</span>;
      case 'rejected':
        return <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>Rejected</span>;
      default:
        return <span style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>{status}</span>;
    }
  };

  const getPlanBadgeColor = (planName) => {
    const p = (planName || '').toLowerCase();
    if (p.includes('basic')) return { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' };
    if (p.includes('pro')) return { bg: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: 'rgba(139, 92, 246, 0.3)' };
    if (p.includes('enterprise')) return { bg: 'rgba(234, 179, 8, 0.15)', color: '#fbbf24', border: 'rgba(234, 179, 8, 0.3)' };
    return { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
  };

  const plans = subscriptionInfo?.plans || [
    {
      id: 'Canteen Basic',
      name: 'Canteen Basic',
      price_annual: 12000,
      headline: 'Essential Single-Facility Canteen',
      description: 'Single-counter school, college, or hostel cafeterias requiring rapid billing & menu control.',
      features: ['Daily Menu & Pricing Schedule', 'Counter POS Billing (Cash, UPI, Card)', 'Basic Raw Stock & Ingredient Tracking', 'WhatsApp Order Alerts', 'Daily Sales & Shift Settlement Reports', 'Single Facility Terminology']
    },
    {
      id: 'Canteen Pro',
      name: 'Canteen Pro',
      price_annual: 20000,
      badge: 'Most Popular',
      headline: 'Advanced Canteen with Student RFID & QR Ordering',
      description: 'The complete digital canteen suite featuring student RFID meal cards, QR ordering, and KDS.',
      features: ['Everything in Canteen Basic', 'Dine-in & Takeaway QR Table Ordering', 'Live Kitchen Display Screen (KDS)', 'Student/Staff RFID Card & Digital Wallet', 'Monthly Mess Meal Subscriptions', 'Full Recipe & Batch Stock Control', 'HR & Payroll (Shifts, Roster, Attendance)', 'Promotions & Discounts Engine']
    },
    {
      id: 'Food Court',
      name: 'Food Court',
      price_annual: 40000,
      headline: 'Multi-Vendor Food Court Platform',
      description: 'For food courts with partitioned vendor stalls, manager logins, and revenue split settlements.',
      features: ['Everything in Canteen Pro', 'Multi-Vendor Partitioned Stall Management', 'Stall Managers & Role Permissions', 'Automated Revenue & Commission Payouts', 'Central Cancellation PIN Protection', 'Unified Multi-Stall QR Menu & Cart', 'Stall Insights & Vendor Analytics']
    },
    {
      id: 'Enterprise',
      name: 'Enterprise',
      price_annual: 75000,
      badge: 'Enterprise Tier',
      headline: 'Multi-Branch Campus & Corporate Dining Network',
      description: 'Centralized group oversight, unlimited POS terminals, priority WhatsApp API, and dedicated SLA.',
      features: ['Everything in Food Court', 'Multi-Branch & Multi-Campus Central Hub', 'Unlimited QR Tables & POS Terminals', 'Priority WhatsApp Business API Gateway', 'Inter-Branch Stock Transfers & Ledgers', 'Custom ERP Integrations & API Access', '24/7 Dedicated Account Manager & SLA']
    }
  ];

  const currentPlanName = subscriptionInfo?.current_plan || currentPlan || 'Food Court';
  const subStatus = subscriptionInfo?.subscription_status || 'active';
  const daysRemaining = subscriptionInfo?.days_remaining !== undefined ? subscriptionInfo.days_remaining : 365;
  const expiresAt = subscriptionInfo?.subscription_expires_at;
  const pendingInvoice = subscriptionInfo?.pending_invoice || invoices.find(inv => inv.status === 'pending') || null;
  const hasPendingRequest = Boolean(pendingInvoice);

  const isHighestTier = currentPlanName === 'Enterprise';
  const getOneMonthBeforeDate = (expVal) => {
    const exp = parseISTDate(expVal);
    if (!exp || isNaN(exp.getTime())) return null;
    const targetMonth = exp.getMonth() - 1;
    const unlock = new Date(exp.getTime());
    unlock.setMonth(targetMonth);
    if (unlock.getMonth() !== ((targetMonth + 12) % 12)) {
      unlock.setDate(0);
    }
    return unlock;
  };
  const renewalUnlockDate = subscriptionInfo?.renewal_unlock_date
    ? new Date(subscriptionInfo.renewal_unlock_date)
    : getOneMonthBeforeDate(expiresAt);
  const isWithinLastMonth = subscriptionInfo?.can_renew !== undefined
    ? Boolean(subscriptionInfo.can_renew)
    : (subStatus === 'trial' || subStatus === 'expired' || (renewalUnlockDate ? Date.now() >= renewalUnlockDate.getTime() : daysRemaining <= 30));
  const isEnterpriseRenewLocked = isHighestTier && subStatus === 'active' && !isWithinLastMonth;
  const renewLockedMessage = renewalUnlockDate
    ? `Renew Subscription will be enabled 1 month before the expiry date (from ${formatISTDate(renewalUnlockDate)}).`
    : 'Renew Subscription will be enabled 1 month before the expiry date.';

  const renderLockedRenewButton = (targetKey, variant = 'overview') => {
    const isOverview = variant === 'overview';
    return (
      <div
        style={{ width: '100%', position: 'relative' }}
        title={renewLockedMessage}
        onMouseEnter={() => setRenewTooltipTarget(targetKey)}
        onMouseLeave={() => setRenewTooltipTarget(null)}
      >
        <button
          disabled={true}
          aria-label={renewLockedMessage}
          style={{
            width: '100%',
            padding: isOverview ? '12px 20px' : '10px 16px',
            background: 'rgba(148, 163, 184, 0.14)',
            color: '#94a3b8',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            borderRadius: isOverview ? '10px' : '8px',
            fontWeight: isOverview ? 700 : 600,
            fontSize: isOverview ? '0.95rem' : '0.88rem',
            cursor: 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>🔄</span>
          <span>Renew Subscription</span>
        </button>
        {renewTooltipTarget === targetKey && (
          <div
            role="tooltip"
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              right: isOverview ? 0 : 'auto',
              left: isOverview ? 'auto' : '50%',
              transform: isOverview ? 'none' : 'translateX(-50%)',
              width: 'max-content',
              maxWidth: '280px',
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid rgba(251, 191, 36, 0.5)',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.76rem',
              lineHeight: 1.45,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
              zIndex: 60,
              pointerEvents: 'none',
              textAlign: 'center'
            }}
          >
            {renewLockedMessage}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="view-panel active" style={{ padding: '24px 28px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* 1. Header with Breadcrumbs & Live Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.75rem' }}>💳</span> Billing & Subscription Management
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
            Manage your annual SaaS plan, view proration credits, upgrade tiers, and track official tax invoices.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => { fetchCurrentSubscription(); fetchInvoices(); }}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              padding: '8px 14px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* 2. Current Plan Overview Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '32px',
        position: 'relative',
        overflow: 'visible',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', alignItems: 'center' }}>
          
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Current Subscription</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                {currentPlanName}
              </h3>
              {getStatusBadge(subStatus)}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px', marginBottom: 0 }}>
              {subStatus === 'trial' ? '7-Day Free Trial Active' : 'Official Radinfotec Annual License'}
            </p>
          </div>

          <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '20px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Cycle Validity</span>
            <div style={{ marginTop: '6px' }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 700, color: daysRemaining <= 7 ? '#f87171' : daysRemaining <= 30 ? '#fbbf24' : '#34d399' }}>
                {subStatus === 'expired' ? 'Expired' : `${daysRemaining} Days Left`}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px', marginBottom: 0 }}>
              {expiresAt ? `Valid through ${formatISTDate(expiresAt)}` : 'Lifetime / Managed Tier'}
            </p>
          </div>

          <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '20px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Billing Cycle</span>
            <div style={{ marginTop: '6px' }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>
                Annual (365 Days)
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px', marginBottom: 0 }}>
              Prorated value credits apply on upgrade
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', justifyContent: 'center' }}>
            {hasPendingRequest ? (
              <div style={{ width: '100%' }}>
                <button
                  disabled={true}
                  style={{
                    width: '100%',
                    padding: '12px 18px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>⏳</span>
                  <span>Verification in Progress</span>
                </button>
                <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '6px', textAlign: 'center' }}>
                  Awaiting Super Admin approval
                </div>
              </div>
            ) : subStatus === 'trial' || subStatus === 'expired' || (isHighestTier ? isWithinLastMonth : daysRemaining <= 30) ? (
              <button
                onClick={() => {
                  const target = plans.find(p => p.name === currentPlanName) || plans[1];
                  handleOpenUpgrade(target);
                }}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.2s'
                }}
              >
                {subStatus === 'trial' ? '🌟 Activate Paid Plan Now' : subStatus === 'expired' ? '🚨 Renew Subscription' : isHighestTier ? '🔄 Renew Subscription' : '🔄 Renew Current Plan'}
              </button>
            ) : isEnterpriseRenewLocked ? (
              renderLockedRenewButton('overview', 'overview')
            ) : (
              <button
                onClick={() => {
                  // Suggest next tier upgrade
                  const nextTier = currentPlanName === 'Canteen Basic' ? plans[1] :
                                   currentPlanName === 'Canteen Pro' ? plans[2] : plans[3];
                  handleOpenUpgrade(nextTier);
                }}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
                  transition: 'all 0.2s'
                }}
              >
                ⚡ Upgrade Plan Tier
              </button>
            )}
          </div>

        </div>

        {/* Pending Verification Notice Banner */}
        {hasPendingRequest && (
          <div style={{
            marginTop: '20px',
            padding: '14px 18px',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.6rem' }}>⏳</span>
              <div>
                <strong style={{ color: '#fbbf24', fontSize: '0.92rem' }}>
                  Payment Verification Pending Approval ({pendingInvoice.to_plan}):
                </strong>
                <div style={{ color: '#cbd5e1', fontSize: '0.84rem', marginTop: '3px' }}>
                  Invoice <strong>{pendingInvoice.invoice_number}</strong> with UTR <strong>{pendingInvoice.payment_reference}</strong> was submitted on {formatISTDateTime(pendingInvoice.created_at)} and is currently being reviewed by Super Admin.
                </div>
              </div>
            </div>
            <span style={{
              fontSize: '0.8rem',
              background: 'rgba(245, 158, 11, 0.2)',
              color: '#fbbf24',
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: 700,
              border: '1px solid rgba(245, 158, 11, 0.3)'
            }}>
              🔒 New Requests Locked
            </span>
          </div>
        )}
      </div>

      {/* 3. Four-Tier Plan Grid */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
            Available Subscription Tiers
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
            Choose a plan that fits your facility's scale. Upgrades deduct the remaining days value from your current plan and reset a fresh 365-day subscription cycle.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {plans.map((p) => {
            const isCurrent = p.name === currentPlanName;
            const badgeStyle = getPlanBadgeColor(p.name);
            const isEnterprise = p.name === 'Enterprise';

            return (
              <div
                key={p.name}
                style={{
                  background: isCurrent ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.03)',
                  border: isCurrent
                    ? '2px solid #10b981'
                    : p.badge
                    ? '2px solid rgba(139, 92, 246, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
              >
                {/* Badge if Popular / Enterprise / Current */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: badgeStyle.bg,
                    color: badgeStyle.color,
                    border: `1px solid ${badgeStyle.border}`
                  }}>
                    {p.name}
                  </span>

                  {isCurrent && (
                    <span style={{ background: '#10b981', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px' }}>
                      ✓ Active Tier
                    </span>
                  )}
                  {!isCurrent && p.badge && (
                    <span style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px' }}>
                      ★ {p.badge}
                    </span>
                  )}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
                      {formatCurrency(p.price_annual)}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/ year</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '6px', minHeight: '36px' }}>
                    {p.description}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', marginBottom: '24px', flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '10px' }}>
                    Included Capabilities:
                  </span>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {p.features.map((f, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                        <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  {hasPendingRequest ? (
                    <button
                      disabled={true}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#94a3b8',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'not-allowed'
                      }}
                    >
                      Pending Verification
                    </button>
                  ) : isCurrent ? (
                    isEnterpriseRenewLocked ? (
                      renderLockedRenewButton('card', 'card')
                    ) : (
                      <button
                        onClick={() => handleOpenUpgrade(p)}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid #10b981',
                          color: '#34d399',
                          borderRadius: '8px',
                          fontWeight: 600,
                          fontSize: '0.88rem',
                          cursor: 'pointer'
                        }}
                      >
                        {subStatus === 'expired' ? 'Renew Expired Plan' : isEnterprise ? '🔄 Renew Subscription' : 'Renew 1-Year Cycle'}
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handleOpenUpgrade(p)}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        background: p.badge ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      {subStatus === 'trial' ? `Subscribe to ${p.name}` : `Upgrade to ${p.name}`}
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Invoices & Billing History Table */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
              Billing & Payment History
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              Official records of all plan upgrades, renewals, and UTR transaction references.
            </p>
          </div>
        </div>

        {loadingInvoices ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '6px' }}>No payment invoices yet</p>
            <p style={{ fontSize: '0.85rem' }}>When you upgrade or renew your plan, invoices and tax receipts will appear here.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px' }}>Invoice #</th>
                  <th style={{ padding: '12px 14px' }}>Date</th>
                  <th style={{ padding: '12px 14px' }}>Type</th>
                  <th style={{ padding: '12px 14px' }}>Plan</th>
                  <th style={{ padding: '12px 14px' }}>Base Price</th>
                  <th style={{ padding: '12px 14px' }}>Prorated Credit</th>
                  <th style={{ padding: '12px 14px' }}>Amount Paid</th>
                  <th style={{ padding: '12px 14px' }}>UTR / Reference</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#fff' }}>
                      {inv.invoice_number}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                      {formatISTDate(inv.created_at)}
                    </td>
                    <td style={{ padding: '12px 14px', textTransform: 'capitalize' }}>
                      {inv.type ? inv.type.replace('_', ' ') : 'Upgrade'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontWeight: 600, color: '#60a5fa' }}>{inv.to_plan}</span>
                      {inv.from_plan && inv.from_plan !== inv.to_plan && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
                          from {inv.from_plan}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                      {formatCurrency(inv.base_amount)}
                    </td>
                    <td style={{ padding: '12px 14px', color: Number(inv.prorated_credit) > 0 ? '#34d399' : 'var(--text-muted)' }}>
                      {Number(inv.prorated_credit) > 0 ? `-${formatCurrency(inv.prorated_credit)}` : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#fff' }}>
                      {formatCurrency(inv.final_amount)}
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#cbd5e1' }}>
                      {inv.payment_reference || '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {getStatusBadge(inv.status)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        onClick={() => setViewingReceipt(inv)}
                        style={{
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          color: '#60a5fa',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.78rem'
                        }}
                      >
                        View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. CHECKOUT & UPGRADE MODAL WITH DYNAMIC UPI QR */}
      {showCheckoutModal && targetPlan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            maxWidth: '640px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowCheckoutModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem'
              }}
            >
              ✕
            </button>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: '0 0 6px 0' }}>
              {quote?.type === 'renewal' ? 'Renew Subscription' : `Upgrade to ${targetPlan.name}`}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 20px 0' }}>
              Transparent Proration Engine: Deducting unused days value from your current plan.
            </p>

            {loadingQuote ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Calculating proration credit & generating payment gateway...
              </div>
            ) : quoteError ? (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '14px', borderRadius: '8px', marginBottom: '20px' }}>
                {quoteError}
              </div>
            ) : paymentSuccess ? (
              /* Success confirmation view */
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '2rem', color: '#10b981' }}>
                  ✓
                </div>
                <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', margin: '0 0 8px 0' }}>
                  {paymentSuccess.activated ? 'Plan Activated Successfully!' : 'Payment Submitted for Verification'}
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
                  {paymentSuccess.message}
                </p>
                <button
                  onClick={() => setShowCheckoutModal(false)}
                  style={{
                    padding: '10px 24px',
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Done & Return to Dashboard
                </button>
              </div>
            ) : (
              <div>
                {/* Proration Breakdown Table */}
                <div style={{ background: 'rgba(0, 0, 0, 0.25)', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.88rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>New Plan Annual Price ({targetPlan.name}):</span>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{formatCurrency(quote?.base_amount)}</span>
                  </div>

                  {Number(quote?.prorated_credit) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.88rem', color: '#34d399' }}>
                      <span>
                        Prorated Credit ({quote?.days_remaining} unused days on {quote?.from_plan}):
                      </span>
                      <span style={{ fontWeight: 700 }}>-{formatCurrency(quote?.prorated_credit)}</span>
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '10px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>Total Amount Payable:</span>
                    <span style={{ fontWeight: 800, color: '#10b981', fontSize: '1.4rem' }}>{formatCurrency(quote?.final_amount)}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    * Starts a fresh full 365-day subscription cycle expiring on {formatISTDate(quote?.new_expiry_preview)}.
                  </div>
                </div>

                {/* Dynamic UPI QR Section */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', padding: '20px', textAlign: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Scan with any UPI App (GPay, PhonePe, Paytm, BHIM)
                  </span>

                  <div style={{ margin: '14px 0', display: 'flex', justifyContent: 'center' }}>
                    {qrDataUrl ? (
                      <div style={{ padding: '8px', background: '#fff', borderRadius: '12px', display: 'inline-block' }}>
                        <img src={qrDataUrl} alt="UPI QR Code" style={{ width: '180px', height: '180px', display: 'block' }} />
                      </div>
                    ) : (
                      <div style={{ width: '180px', height: '180px', background: '#334155', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        Generating QR...
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 0, 0, 0.3)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>UPI ID:</span>
                    <strong style={{ fontSize: '0.88rem', color: '#60a5fa' }}>{subscriptionInfo?.merchant_upi?.upi_id || 'info@radinfotec.com'}</strong>
                    <button
                      onClick={copyUpiId}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: copiedUpi ? '#34d399' : '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        padding: '2px 6px',
                        textDecoration: 'underline'
                      }}
                    >
                      {copiedUpi ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* UTR Input Section */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Enter 12-Digit Bank UTR / Transaction Reference ID:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 432156789012"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.95rem',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box'
                    }}
                  />
                  {paymentError && (
                    <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '6px', marginBottom: 0 }}>
                      {paymentError}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={handleSubmitPayment}
                    disabled={submittingPayment}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: submittingPayment ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    {submittingPayment ? 'Submitting Reference...' : 'Submit Payment for Admin Verification'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. RECEIPT MODAL */}
      {viewingReceipt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#fff',
            color: '#0f172a',
            borderRadius: '16px',
            maxWidth: '560px',
            width: '100%',
            padding: '32px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            position: 'relative',
            fontFamily: 'Inter, sans-serif'
          }}>
            <button
              onClick={() => setViewingReceipt(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#f1f5f9',
                border: 'none',
                color: '#64748b',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              ✕
            </button>

            <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px 0', color: '#0f172a' }}>
                  Radinfotec ERP
                </h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                  Official SaaS Subscription Tax Invoice
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{viewingReceipt.invoice_number}</span>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>{formatISTDateTime(viewingReceipt.created_at)}</p>
              </div>
            </div>

            <div style={{ marginBottom: '20px', fontSize: '0.88rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Billed To:</span>
                <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{subscriptionInfo?.tenant_name || user?.name}</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{subscriptionInfo?.owner_email || user?.email}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Payment Method:</span>
                <p style={{ margin: '2px 0 0', fontWeight: 600 }}>UPI (UTR: {viewingReceipt.payment_reference || 'N/A'})</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Status: {viewingReceipt.status.toUpperCase()}</p>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '16px 0', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                <span>Annual License: {viewingReceipt.to_plan}</span>
                <span>{formatCurrency(viewingReceipt.base_amount)}</span>
              </div>
              {Number(viewingReceipt.prorated_credit) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', color: '#16a34a' }}>
                  <span>Prorated Credit Applied:</span>
                  <span>-{formatCurrency(viewingReceipt.prorated_credit)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', paddingTop: '8px', borderTop: '1px dashed #e2e8f0' }}>
                <span>Total Paid:</span>
                <span>{formatCurrency(viewingReceipt.final_amount)}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => window.print()}
                style={{
                  padding: '8px 20px',
                  background: '#0f172a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                🖨️ Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
