import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:5000/api';

const api = async (path, opts = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/api') ? path.slice(4) : path}`;
  const r = await fetch(url, { ...opts, headers });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || `HTTP ${r.status}`); }
  return r.json();
};

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function WalletManagement({ userRole, refreshCustomers }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  
  // Modals state
  const [showRfid, setShowRfid] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const [rfidInput, setRfidInput] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [registerForm, setRegisterForm] = useState({ name: '', phone: '', email: '' });

  const handleRegisterCustomer = async (e) => {
    e.preventDefault(); setMsg('');
    try {
      await api('/api/customers', { method: 'POST', body: JSON.stringify(registerForm) });
      setMsg('✅ Customer Registered Successfully!');
      setShowRegister(false);
      setRegisterForm({ name: '', phone: '', email: '' });
      load();
      if (refreshCustomers) refreshCustomers();
    } catch(err) { setMsg('❌ ' + err.message); }
  };
  const [topupForm, setTopupForm] = useState({ amount: '', meals: '', type: 'cash', desc: '', paymentMode: 'Cash' });
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Reusing the loyalty endpoint for customer list since it returns customers with pagination/search
      const r = await api(`/api/notifications/loyalty?search=${encodeURIComponent(search)}&limit=50`);
      setCustomers(r.customers || []);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [search]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const handleAssignRfid = async (e) => {
    e.preventDefault(); setMsg('');
    try {
      await api('/api/wallet/assign-rfid', { method: 'PUT', body: JSON.stringify({ customer_id: selected.id, rfid_tag: rfidInput }) });
      setMsg('✅ RFID Tag Assigned Successfully!');
      setShowRfid(false); setRfidInput(''); load();
    } catch(err) { setMsg('❌ ' + err.message); }
  };

  const handleTopup = async (e) => {
    e.preventDefault(); setMsg('');
    try {
      const isCash = topupForm.type === 'cash';
      await api('/api/wallet/topup', { method: 'POST', body: JSON.stringify({
        customer_id: selected.id,
        amount: isCash ? topupForm.amount : 0,
        transaction_amount: topupForm.amount,
        meals_count: isCash ? 0 : topupForm.meals,
        description: topupForm.desc || (isCash ? 'Wallet Recharge' : 'Mess Subscription Purchase'),
        paymentMode: topupForm.paymentMode
      })});
      setMsg('✅ Top-up Successful!');
      setShowTopup(false); setTopupForm({ amount: '', meals: '', type: 'cash', desc: '', paymentMode: 'Cash' }); load();
    } catch(err) { setMsg('❌ ' + err.message); }
  };

  const loadHistory = async (c) => {
    setSelected(c); setShowHistory(true);
    try { setHistory(await api(`/api/wallet/history/${c.id}`)); } catch(e) {}
  };

  const doDelete = async (c) => {
    if (!window.confirm(`Remove customer "${c.name}"? This action cannot be undone.`)) return;
    setMsg('');
    try {
      await api(`/api/customers/${c.id}`, { method: 'DELETE' });
      setMsg(`✅ Customer "${c.name}" removed successfully.`);
      load();
    } catch(e) { setMsg('❌ ' + e.message); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', padding: '24px 28px', fontFamily: "'Inter',sans-serif" }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>💳 RFID & Prepaid Wallets</h2>
        <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Issue RFID meal cards, recharge wallets, and manage mess subscriptions.</p>
      </div>

      {msg && <div style={{ padding: '12px 16px', borderRadius: 8, background: msg.startsWith('✅') ? '#10b98122' : '#ef444422', color: msg.startsWith('✅') ? '#10b981' : '#ef4444', fontSize: 14, marginBottom: 16 }}>{msg}</div>}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search customer name or phone..." style={{ flex: 1, maxWidth: 400, padding: '10px 16px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#fff' }} />
        <button onClick={() => setShowRegister(true)} style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>+ Register Customer</button>
      </div>

      <div style={{ background: '#1f2937', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#111827' }}>
              {['Customer','Phone','RFID Tag','Wallet Balance','Mess Plan','Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: '#6b7280', fontWeight: 600 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>Loading...</td></tr> : customers.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #374151' }}>
                <td style={{ padding: '12px 16px', color: '#f9fafb', fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: '12px 16px', color: '#9ca3af' }}>{c.phone || '—'}</td>
                <td style={{ padding: '12px 16px', color: c.rfid_tag ? '#3b82f6' : '#6b7280' }}>{c.rfid_tag || 'Not Assigned'}</td>
                <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 700 }}>₹{fmt(c.wallet_balance)}</td>
                <td style={{ padding: '12px 16px' }}>
                  {c.is_mess_subscriber ? (
                    <span style={{ color: '#f59e0b', background: '#f59e0b22', padding: '2px 8px', borderRadius: 12 }}>{c.mess_meals_left} Meals Left</span>
                  ) : <span style={{ color: '#6b7280' }}>Inactive</span>}
                </td>
                <td style={{ padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => { setSelected(c); setRfidInput(c.rfid_tag||''); setShowRfid(true); }} style={{ padding: '6px 12px', background: '#3b82f622', color: '#3b82f6', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Assign RFID</button>
                  <button onClick={() => { setSelected(c); setShowTopup(true); }} style={{ padding: '6px 12px', background: '#10b98122', color: '#10b981', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Top-up</button>
                  <button onClick={() => loadHistory(c)} style={{ padding: '6px 12px', background: '#8b5cf622', color: '#8b5cf6', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Ledger</button>
                  <button onClick={() => doDelete(c)} style={{ padding: '6px 12px', background: '#ef444422', color: '#ef4444', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Remove</button>
                </td>
              </tr>
            ))}
            {!loading && customers.length === 0 && <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>No customers found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* RFID Modal */}
      {showRfid && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1f2937', padding: 24, borderRadius: 12, width: 400 }}>
            <h3 style={{ color: '#fff', marginTop: 0 }}>Scan RFID Card</h3>
            <p style={{ color: '#9ca3af', fontSize: 13 }}>Click the input below and tap the card on the reader for <b>{selected.name}</b>.</p>
            <form onSubmit={handleAssignRfid}>
              <input autoFocus value={rfidInput} onChange={e=>setRfidInput(e.target.value)} placeholder="Scanning..." style={{ width: '100%', padding: '12px', background: '#111827', border: '2px solid #3b82f6', borderRadius: 8, color: '#fff', fontSize: 16, textAlign: 'center', boxSizing: 'border-box', marginBottom: 20 }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" style={{ flex: 1, padding: 10, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Save Tag</button>
                <button type="button" onClick={() => setShowRfid(false)} style={{ flex: 1, padding: 10, background: '#374151', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Topup Modal */}
      {showTopup && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1f2937', padding: 24, borderRadius: 12, width: 400 }}>
            <h3 style={{ color: '#fff', marginTop: 0 }}>Wallet & Mess Top-up</h3>
            <p style={{ color: '#9ca3af', fontSize: 13 }}>Adding funds to <b>{selected.name}</b>.</p>
            
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <button onClick={()=>setTopupForm(p=>({...p, type:'cash'}))} style={{ flex:1, padding: 8, borderRadius: 6, border: 'none', background: topupForm.type==='cash' ? '#10b981' : '#374151', color: '#fff', cursor: 'pointer' }}>Cash Wallet</button>
              <button onClick={()=>setTopupForm(p=>({...p, type:'mess'}))} style={{ flex:1, padding: 8, borderRadius: 6, border: 'none', background: topupForm.type==='mess' ? '#f59e0b' : '#374151', color: '#fff', cursor: 'pointer' }}>Mess Plan</button>
            </div>

            <form onSubmit={handleTopup}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Amount Paid (₹)</label>
                <input type="number" required value={topupForm.amount} onChange={e=>setTopupForm(p=>({...p, amount: e.target.value}))} style={{ width: '100%', padding: '10px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', boxSizing: 'border-box' }} />
              </div>
              
              {topupForm.type === 'mess' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Number of Meals</label>
                  <input type="number" required value={topupForm.meals} onChange={e=>setTopupForm(p=>({...p, meals: e.target.value}))} style={{ width: '100%', padding: '10px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', boxSizing: 'border-box' }} />
                </div>
              )}
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Payment Mode</label>
                <select value={topupForm.paymentMode} onChange={e=>setTopupForm(p=>({...p, paymentMode: e.target.value}))} style={{ width: '100%', padding: '10px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', boxSizing: 'border-box', outline: 'none' }}>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Description / Reference</label>
                <input value={topupForm.desc} onChange={e=>setTopupForm(p=>({...p, desc: e.target.value}))} placeholder="e.g., Paid via UPI" style={{ width: '100%', padding: '10px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" style={{ flex: 1, padding: 10, background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Confirm Recharge</button>
                <button type="button" onClick={() => setShowTopup(false)} style={{ flex: 1, padding: 10, background: '#374151', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {showHistory && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: '#111827', width: 450, height: '100%', overflow: 'auto', padding: 24, borderLeft: '1px solid #374151' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ color: '#fff', margin: 0 }}>📜 {selected?.name}'s Ledger</h3>
              <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            
            {history.length === 0 ? <div style={{ color: '#6b7280', textAlign: 'center', padding: 20 }}>No transactions yet</div> : 
              history.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #1f2937', fontSize: 13 }}>
                <div>
                  <div style={{ color: '#f9fafb', fontWeight: 600 }}>{t.description}</div>
                  <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>
                    {new Date(t.created_at).toLocaleString('en-IN')} 
                    {t.reference_id && ` • Ref: ${t.reference_id}`}
                  </div>
                  {t.transaction_amount > 0 && t.type === 'credit' && (
                    <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 4 }}>
                      Amount Paid: ₹{fmt(t.transaction_amount)} {t.payment_mode && `(${t.payment_mode})`}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  {t.amount != 0 && (
                    <div style={{ fontWeight: 800, color: t.type === 'credit' ? '#10b981' : '#ef4444' }}>
                      {t.type === 'credit' ? '+' : '-'}₹{fmt(t.amount)}
                    </div>
                  )}
                  {t.meals_count != 0 && (
                    <div style={{ fontWeight: 800, color: t.type === 'credit' ? '#f59e0b' : '#ef4444' }}>
                      {t.type === 'credit' ? '+' : ''}{t.meals_count} meals
                    </div>
                  )}
                  <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>
                    Bal: ₹{fmt(t.balance_after)} | {t.meals_after} meals
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    
      {/* Register Customer Modal */}
      {showRegister && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1f2937', padding: 24, borderRadius: 12, width: 400 }}>
            <h3 style={{ color: '#fff', marginTop: 0 }}>Register New Customer</h3>
            <form onSubmit={handleRegisterCustomer}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Full Name</label>
                <input required value={registerForm.name} onChange={e=>setRegisterForm(p=>({...p, name: e.target.value}))} style={{ width: '100%', padding: '10px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Phone Number</label>
                <input required value={registerForm.phone} onChange={e=>setRegisterForm(p=>({...p, phone: e.target.value}))} style={{ width: '100%', padding: '10px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Email (Optional)</label>
                <input type="email" value={registerForm.email} onChange={e=>setRegisterForm(p=>({...p, email: e.target.value}))} style={{ width: '100%', padding: '10px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" style={{ flex: 1, padding: 10, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Register</button>
                <button type="button" onClick={() => setShowRegister(false)} style={{ flex: 1, padding: 10, background: '#374151', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

</div>
  );
}
