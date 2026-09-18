import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

function Promotions({ user }) {
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

  useEffect(() => {
    fetchCoupons();
  }, []);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

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

  return (
    <div className="module-container" style={{ padding: '20px', color: '#e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f8fafc' }}>
          {user.vendor_id ? 'My Stall Promo Codes' : 'Central Promo Codes'}
        </h2>
        <button className="btn btn-primary" onClick={() => { if (showForm) { resetForm(); } else { setEditingId(null); setForm({ code: '', discount_type: 'Percentage', value: '', min_order_amount: '', is_active: true }); setShowForm(true); } }}>
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
    </div>
  );
}

export default Promotions;
