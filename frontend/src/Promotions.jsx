import React, { useState, useEffect } from 'react';

const API_BASE = '/api';

function Promotions({ user }) {
  const [activeSubTab, setActiveSubTab] = useState('coupons'); // 'coupons' | 'pin'

  // --- Promo Codes State ---
  const [coupons, setCoupons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    code: '',
    discount_type: 'Percentage',
    value: '',
    min_order_amount: '',
    is_active: true
  });

  // --- Cancellation PIN State ---
  const [pinData, setPinData] = useState(null);
  const [loadingPins, setLoadingPins] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);
  const [pinFeedback, setPinFeedback] = useState(null);
  const [showPinDigits, setShowPinDigits] = useState(true); // visible by default as requested

  // Central Admin editing a specific stall's PIN
  const [editingStallId, setEditingStallId] = useState(null);
  const [editingStallPin, setEditingStallPin] = useState('');
  const [savingStallPin, setSavingStallPin] = useState(false);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  useEffect(() => {
    if (activeSubTab === 'coupons') {
      fetchCoupons();
    } else if (activeSubTab === 'pin') {
      fetchPins();
    }
  }, [activeSubTab]);

  // ==========================================
  // PROMO CODES HANDLERS
  // ==========================================
  const fetchCoupons = async () => {
    try {
      const res = await fetch(`${API_BASE}/coupons`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCoupons(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setForm({ code: '', discount_type: 'Percentage', value: '', min_order_amount: '', is_active: true });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEditCoupon = (c) => {
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      value: parseFloat(c.value),
      min_order_amount: parseFloat(c.min_order_amount),
      is_active: !!c.is_active
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleSubmitCoupon = async (e) => {
    e.preventDefault();
    try {
      const url = editingId ? `${API_BASE}/coupons/${editingId}` : `${API_BASE}/coupons`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify({
          ...form,
          value: parseFloat(form.value) || 0,
          min_order_amount: parseFloat(form.min_order_amount) || 0
        })
      });
      if (res.ok) {
        resetForm();
        fetchCoupons();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save coupon');
      }
    } catch (err) {
      console.error(err);
      alert(`Error saving coupon: ${err.message}`);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      const res = await fetch(`${API_BASE}/coupons/${id}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (res.ok) {
        fetchCoupons();
      }
    } catch (err) {
      alert('Error updating status');
    }
  };

  const deleteCoupon = async (id) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) return;
    try {
      const res = await fetch(`${API_BASE}/coupons/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        fetchCoupons();
      }
    } catch (err) {
      alert('Error deleting coupon');
    }
  };

  // ==========================================
  // CANCELLATION PIN HANDLERS
  // ==========================================
  const fetchPins = async () => {
    setLoadingPins(true);
    setPinFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/cancellation-pins`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPinData(data);
      } else {
        const err = await res.json();
        setPinFeedback({ type: 'error', message: err.error || 'Failed to fetch cancellation PIN' });
      }
    } catch (err) {
      setPinFeedback({ type: 'error', message: 'Network error fetching PIN: ' + err.message });
    } finally {
      setLoadingPins(false);
    }
  };

  const handleSaveStallPin = async (e) => {
    e.preventDefault();
    setPinFeedback(null);

    const cleanPin = newPin.trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      setPinFeedback({ type: 'error', message: 'PIN must be 4 to 6 numeric digits (e.g. 1234).' });
      return;
    }
    if (cleanPin !== confirmPin.trim()) {
      setPinFeedback({ type: 'error', message: 'PINs do not match. Please re-enter.' });
      return;
    }

    setSavingPin(true);
    try {
      const res = await fetch(`${API_BASE}/cancellation-pins/stall`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ pin: cleanPin })
      });
      const data = await res.json();
      if (res.ok) {
        setPinFeedback({ type: 'success', message: `✅ Cancellation PIN updated successfully! Active PIN: ${cleanPin}` });
        setNewPin('');
        setConfirmPin('');
        fetchPins();
      } else {
        setPinFeedback({ type: 'error', message: data.error || 'Failed to update PIN.' });
      }
    } catch (err) {
      setPinFeedback({ type: 'error', message: 'Error updating PIN: ' + err.message });
    } finally {
      setSavingPin(false);
    }
  };

  const handleSaveCentralPin = async (e) => {
    e.preventDefault();
    setPinFeedback(null);

    const cleanPin = newPin.trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      setPinFeedback({ type: 'error', message: 'PIN must be 4 to 6 numeric digits (e.g. 1234).' });
      return;
    }
    if (cleanPin !== confirmPin.trim()) {
      setPinFeedback({ type: 'error', message: 'PINs do not match. Please re-enter.' });
      return;
    }

    setSavingPin(true);
    try {
      const res = await fetch(`${API_BASE}/cancellation-pins/central`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ pin: cleanPin })
      });
      const data = await res.json();
      if (res.ok) {
        setPinFeedback({ type: 'success', message: `✅ Central Counter Cancellation PIN updated successfully! Active PIN: ${cleanPin}` });
        setNewPin('');
        setConfirmPin('');
        fetchPins();
      } else {
        setPinFeedback({ type: 'error', message: data.error || 'Failed to update Central Counter PIN.' });
      }
    } catch (err) {
      setPinFeedback({ type: 'error', message: 'Error updating PIN: ' + err.message });
    } finally {
      setSavingPin(false);
    }
  };

  const handleSaveStallPinByAdmin = async (vendorId) => {
    const cleanPin = editingStallPin.trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      alert('PIN must be 4 to 6 numeric digits.');
      return;
    }

    setSavingStallPin(true);
    try {
      const res = await fetch(`${API_BASE}/cancellation-pins/stall`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ vendor_id: vendorId, pin: cleanPin })
      });
      const data = await res.json();
      if (res.ok) {
        setEditingStallId(null);
        setEditingStallPin('');
        fetchPins();
        setPinFeedback({ type: 'success', message: `✅ Updated PIN for stall successfully.` });
      } else {
        alert(data.error || 'Failed to update stall PIN.');
      }
    } catch (err) {
      alert('Error updating stall PIN: ' + err.message);
    } finally {
      setSavingStallPin(false);
    }
  };

  return (
    <div className="module-container" style={{ padding: '20px', color: '#e2e8f0' }}>
      {/* Module Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
            {user.vendor_id ? 'Stall Management & Promotions' : 'Central Admin Promotions & Security'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Manage promo discounts, coupons, and manager authorization PINs.
          </p>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '22px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
        <button
          type="button"
          className={`btn ${activeSubTab === 'coupons' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setActiveSubTab('coupons')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: activeSubTab === 'coupons' ? '600' : '400',
            boxShadow: activeSubTab === 'coupons' ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
          }}
        >
          🎟️ Promo Codes
        </button>
        <button
          type="button"
          className={`btn ${activeSubTab === 'pin' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setActiveSubTab('pin')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: activeSubTab === 'pin' ? '600' : '400',
            boxShadow: activeSubTab === 'pin' ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
          }}
        >
          🔒 Set Cancellation PIN
        </button>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: PROMO CODES                                    */}
      {/* ========================================================= */}
      {activeSubTab === 'coupons' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
              {user.vendor_id ? 'My Stall Promo Codes' : 'Central Food Court Promo Codes'}
            </h3>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (showForm) {
                  resetForm();
                } else {
                  setEditingId(null);
                  setForm({ code: '', discount_type: 'Percentage', value: '', min_order_amount: '', is_active: true });
                  setShowForm(true);
                }
              }}
            >
              {showForm ? 'Cancel' : '➕ Create Promo Code'}
            </button>
          </div>

          {showForm && (
            <div style={{ background: '#1e1e24', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ marginBottom: '15px' }}>{editingId ? '✏️ Edit Promo Code' : 'Create New Promo Code'}</h3>
              <form onSubmit={handleSubmitCoupon} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '5px' }}>Code *</label>
                  <input required type="text" className="input-field" placeholder="e.g. SUMMER20" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '5px' }}>Discount Type *</label>
                  <select required className="input-field" value={form.discount_type} onChange={e => setForm({...form, discount_type: e.target.value})}>
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '5px' }}>Discount Value *</label>
                  <input required type="number" min="1" step="0.01" className="input-field" placeholder={form.discount_type === 'Percentage' ? 'e.g. 15' : 'e.g. 50'} value={form.value} onChange={e => setForm({...form, value: e.target.value})} />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '5px' }}>Min. Order Amount (₹)</label>
                  <input type="number" min="0" step="0.01" className="input-field" placeholder="0.00" value={form.min_order_amount} onChange={e => setForm({...form, min_order_amount: e.target.value})} />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-success">{editingId ? 'Update Promo Code' : 'Save Promo Code'}</button>
                  {editingId && <button type="button" className="btn btn-outline-primary" onClick={resetForm}>Cancel Edit</button>}
                </div>
              </form>
            </div>
          )}

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Min. Order</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.length > 0 ? (
                  coupons.map(c => (
                    <tr key={c.id}>
                      <td><strong>{c.code}</strong></td>
                      <td>{c.discount_type}</td>
                      <td>{c.discount_type === 'Percentage' ? `${parseFloat(c.value)}%` : `₹${parseFloat(c.value).toFixed(2)}`}</td>
                      <td>₹{parseFloat(c.min_order_amount).toFixed(2)}</td>
                      <td>
                        <span className={`badge ${c.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ display: 'flex', gap: '8px' }}>
                        <button type="button" className="btn btn-xs btn-outline-primary" onClick={() => handleEditCoupon(c)}>Edit</button>
                        <button type="button" className={`btn btn-xs ${c.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`} onClick={() => toggleStatus(c.id, c.is_active)}>
                          {c.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button type="button" className="btn btn-xs btn-outline-danger" onClick={() => deleteCoupon(c.id)}>Delete</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No promo codes created yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: SET CANCELLATION PIN                           */}
      {/* ========================================================= */}
      {activeSubTab === 'pin' && (
        <div>
          {/* Feedback Alert */}
          {pinFeedback && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '10px',
                marginBottom: '20px',
                background: pinFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${pinFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                color: pinFeedback.type === 'success' ? '#34d399' : '#f87171',
                fontSize: '0.92rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>{pinFeedback.message}</span>
              <button
                type="button"
                onClick={() => setPinFeedback(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          )}

          {loadingPins ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔄</div>
              <div>Loading Cancellation PIN details...</div>
            </div>
          ) : (
            <>
              {/* CASE 1: STALL MANAGER */}
              {pinData?.mode === 'stall' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                  {/* Left Column: Current PIN Display */}
                  <div
                    style={{
                      background: '#1e1e24',
                      padding: '24px',
                      borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', fontWeight: 600 }}>
                        Stall Identifier
                      </span>
                      <span style={{ fontSize: '0.75rem', padding: '3px 8px', background: '#3b82f6', color: '#fff', borderRadius: '4px', fontWeight: 600 }}>
                        {pinData.stall.stall_number || 'Stall POS'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 8px 0' }}>
                      🏪 {pinData.stall.name}
                    </h3>

                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '20px' }}>
                      Cashiers at your stall POS terminal must enter this Manager PIN to authorize order cancellations.
                    </p>

                    {/* PIN Visual Card */}
                    <div
                      style={{
                        background: '#111827',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        textAlign: 'center',
                        position: 'relative'
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Active Manager Cancellation PIN
                      </div>

                      <div
                        style={{
                          fontSize: '2.5rem',
                          fontWeight: 700,
                          letterSpacing: showPinDigits ? '12px' : '8px',
                          color: '#38bdf8',
                          fontFamily: 'monospace',
                          padding: '10px 0'
                        }}
                      >
                        {showPinDigits ? (pinData.stall.cancel_pin || '0000') : '••••'}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setShowPinDigits(!showPinDigits)}
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#e2e8f0',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          {showPinDigits ? '👁️ Hide Digits' : '👁️ Show Digits'}
                        </button>

                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: pinData.stall.is_custom ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: pinData.stall.is_custom ? '#34d399' : '#fbbf24',
                            fontWeight: 600
                          }}
                        >
                          {pinData.stall.is_custom ? '✓ Custom PIN Active' : '⚠️ Default PIN (0000)'}
                        </span>
                      </div>
                    </div>

                    {!pinData.stall.is_custom && (
                      <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', color: '#fbbf24', fontSize: '0.8rem' }}>
                        💡 <strong>Security Tip:</strong> You are currently using the default PIN (0000). Set a custom 4-digit PIN using the form on the right to secure your stall.
                      </div>
                    )}
                  </div>

                  {/* Right Column: Update PIN Form */}
                  <div
                    style={{
                      background: '#1e1e24',
                      padding: '24px',
                      borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                    }}
                  >
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 6px 0' }}>
                      🔑 Create / Update Cancellation PIN
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>
                      Enter a 4-digit numeric code that only stall managers know.
                    </p>

                    <form onSubmit={handleSaveStallPin}>
                      <div style={{ marginBottom: '16px' }}>
                        <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.88rem' }}>
                          New Cancellation PIN (4 Digits) *
                        </label>
                        <input
                          required
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]{4,6}"
                          maxLength={6}
                          placeholder="e.g. 5432"
                          className="input-field"
                          value={newPin}
                          onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                          style={{
                            fontSize: '1.2rem',
                            letterSpacing: '4px',
                            textAlign: 'center',
                            fontFamily: 'monospace'
                          }}
                        />
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Must be 4 to 6 digits. Numbers only.</span>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label className="form-label" style={{ display: 'block', marginBottom: '6px', fontSize: '0.88rem' }}>
                          Confirm New PIN *
                        </label>
                        <input
                          required
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]{4,6}"
                          maxLength={6}
                          placeholder="Re-enter PIN"
                          className="input-field"
                          value={confirmPin}
                          onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                          style={{
                            fontSize: '1.2rem',
                            letterSpacing: '4px',
                            textAlign: 'center',
                            fontFamily: 'monospace'
                          }}
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={savingPin || !newPin || !confirmPin}
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          borderRadius: '8px'
                        }}
                      >
                        {savingPin ? 'Saving PIN...' : '💾 Save Cancellation PIN'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* CASE 2: CENTRAL ADMIN / OWNER */}
              {pinData?.mode === 'central' && (
                <div>
                  {/* Top Section: Central Counter PIN Management */}
                  <div
                    style={{
                      background: '#1e1e24',
                      padding: '24px',
                      borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      marginBottom: '28px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'center' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.75rem', padding: '3px 8px', background: '#8b5cf6', color: '#fff', borderRadius: '4px', fontWeight: 600 }}>
                            Central Food Court Counter
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 6px 0' }}>
                          🖥️ Central Counter Cancellation PIN
                        </h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                          Cashiers at the Central Counter POS must enter this PIN to authorize cancellations for Central orders.
                        </p>

                        <div
                          style={{
                            background: '#111827',
                            padding: '16px 20px',
                            borderRadius: '10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '16px',
                            border: '1px solid rgba(139, 92, 246, 0.3)'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                              Current Active PIN
                            </div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '6px', color: '#a78bfa', fontFamily: 'monospace' }}>
                              {showPinDigits ? (pinData.central?.cancel_pin || '0000') : '••••'}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowPinDigits(!showPinDigits)}
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.15)',
                              color: '#e2e8f0',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            {showPinDigits ? '👁️ Hide' : '👁️ Show'}
                          </button>

                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '4px 8px',
                              borderRadius: '20px',
                              background: pinData.central?.is_custom ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: pinData.central?.is_custom ? '#34d399' : '#fbbf24',
                              fontWeight: 600
                            }}
                          >
                            {pinData.central?.is_custom ? '✓ Custom PIN' : '⚠️ Default (0000)'}
                          </span>
                        </div>
                      </div>

                      {/* Central Form */}
                      <div style={{ background: '#17171c', padding: '18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 12px 0' }}>
                          Update Central Counter PIN
                        </h4>
                        <form onSubmit={handleSaveCentralPin}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                            <div>
                              <input
                                required
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]{4,6}"
                                maxLength={6}
                                placeholder="New PIN"
                                className="input-field"
                                value={newPin}
                                onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                                style={{ textAlign: 'center', letterSpacing: '3px', fontFamily: 'monospace' }}
                              />
                            </div>
                            <div>
                              <input
                                required
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]{4,6}"
                                maxLength={6}
                                placeholder="Confirm PIN"
                                className="input-field"
                                value={confirmPin}
                                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                                style={{ textAlign: 'center', letterSpacing: '3px', fontFamily: 'monospace' }}
                              />
                            </div>
                          </div>
                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={savingPin || !newPin || !confirmPin}
                            style={{ width: '100%', padding: '8px', fontSize: '0.88rem' }}
                          >
                            {savingPin ? 'Updating...' : '💾 Update Central Counter PIN'}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section: All Stalls Overview & Management */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
                          🏪 Stall Cancellation PINs (Food Court Overview)
                        </h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                          Each stall manager sets their own PIN. Central Admin can view and override stall PINs here.
                        </p>
                      </div>
                    </div>

                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Stall Name</th>
                            <th>Stall #</th>
                            <th>Active Cancellation PIN</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pinData?.stalls && pinData.stalls.length > 0 ? (
                            pinData.stalls.map(s => (
                              <tr key={s.id}>
                                <td>
                                  <strong>🏪 {s.name}</strong>
                                </td>
                                <td>
                                  <span style={{ fontSize: '0.8rem', padding: '2px 8px', background: '#374151', borderRadius: '4px', color: '#d1d5db' }}>
                                    {s.stall_number || 'N/A'}
                                  </span>
                                </td>
                                <td>
                                  {editingStallId === s.id ? (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]{4,6}"
                                        maxLength={6}
                                        placeholder="New PIN"
                                        className="input-field"
                                        value={editingStallPin}
                                        onChange={e => setEditingStallPin(e.target.value.replace(/\D/g, ''))}
                                        style={{ width: '120px', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '2px' }}
                                      />
                                      <button
                                        type="button"
                                        className="btn btn-xs btn-success"
                                        disabled={savingStallPin || !editingStallPin}
                                        onClick={() => handleSaveStallPinByAdmin(s.id)}
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-xs btn-outline-primary"
                                        onClick={() => { setEditingStallId(null); setEditingStallPin(''); }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span
                                        style={{
                                          fontSize: '1.2rem',
                                          fontWeight: 700,
                                          fontFamily: 'monospace',
                                          letterSpacing: '4px',
                                          color: '#38bdf8',
                                          background: '#111827',
                                          padding: '4px 12px',
                                          borderRadius: '6px',
                                          border: '1px solid rgba(56, 189, 248, 0.2)'
                                        }}
                                      >
                                        {showPinDigits ? s.cancel_pin : '••••'}
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <span
                                    className={`badge ${s.is_custom ? 'badge-success' : 'badge-warning'}`}
                                    style={{
                                      background: s.is_custom ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                      color: s.is_custom ? '#34d399' : '#fbbf24',
                                      border: `1px solid ${s.is_custom ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                                    }}
                                  >
                                    {s.is_custom ? '✓ Custom PIN' : '⚠️ Default (0000)'}
                                  </span>
                                </td>
                                <td>
                                  {editingStallId !== s.id && (
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-outline-primary"
                                      onClick={() => {
                                        setEditingStallId(s.id);
                                        setEditingStallPin(s.cancel_pin === '0000' ? '' : s.cancel_pin);
                                      }}
                                    >
                                      ✏️ Change PIN
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                No stalls configured yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Promotions;
