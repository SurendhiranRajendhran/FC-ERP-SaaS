import { useState, useEffect, useCallback } from 'react';

// ─── Utility: API call ───────────────────────────────────────────────────────
const api = async (url, opts = {}) => {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) };
  const fullUrl = url.startsWith('http') ? url : `http://localhost:5000${url}`;
  const r = await fetch(fullUrl, { ...opts, headers });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || `HTTP ${r.status}`); }
  return r.json();
};

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().split('T')[0];

// ─── Star Rating Component ────────────────────────────────────────────────────
function StarRating({ value, onChange, size = 24 }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ fontSize: size, cursor: onChange ? 'pointer' : 'default', color: (hover || value) >= s ? '#f59e0b' : '#374151' }}
          onClick={() => onChange && onChange(s)} onMouseEnter={() => onChange && setHover(s)} onMouseLeave={() => setHover(0)}>★</span>
      ))}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function Badge({ v }) {
  const colors = { sent: '#10b981', simulated: '#6366f1', failed: '#ef4444', pending: '#f59e0b', draft: '#6b7280', scheduled: '#3b82f6', sending: '#8b5cf6' };
  return <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: (colors[v] || '#374151') + '33', color: colors[v] || '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{v}</span>;
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryMsg, setSummaryMsg] = useState('');

  const load = useCallback(async () => {
    try { setData(await api('/api/notifications/overview')); } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendSummary = async () => {
    setSummaryLoading(true); setSummaryMsg('');
    try { const r = await api('/api/notifications/daily-summary', { method: 'POST' }); setSummaryMsg('✅ Daily summary sent!'); }
    catch(e) { setSummaryMsg('❌ ' + e.message); }
    setSummaryLoading(false);
  };

  if (loading) return <div style={{ color: '#9ca3af', padding: 40, textAlign: 'center' }}>Loading overview...</div>;

  const c = data?.customers || {};
  const f = data?.feedback || {};
  const n = data?.notifications || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
        {[
          { label: 'Total Customers', value: c.total_customers || 0, icon: '👥', color: '#3b82f6' },
          { label: 'Loyalty Members', value: c.loyalty_members || 0, icon: '⭐', color: '#f59e0b' },
          { label: 'Points Outstanding', value: c.total_points_outstanding || 0, icon: '🎁', color: '#10b981' },
          { label: 'Avg Feedback Rating', value: Number(f.avg_rating || 0).toFixed(1) + ' / 5', icon: '💬', color: '#8b5cf6' },
          { label: 'Notifications Today', value: n.sent_today || 0, icon: '🔔', color: '#ec4899' },
        ].map(s => (
          <div key={s.label} style={{ background: '#1f2937', borderRadius: 12, padding: '20px 24px', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginTop: 8 }}>{s.value}</div>
            <div style={{ color: '#9ca3af', fontSize: 13, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Low stock + daily summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Low Stock */}
        <div style={{ background: '#1f2937', borderRadius: 12, padding: 20 }}>
          <h3 style={{ color: '#ef4444', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}><span>⚠️</span> Low Stock Items</h3>
          {data?.low_stock_items?.length === 0
            ? <div style={{ color: '#10b981', fontSize: 14 }}>✅ All materials well stocked</div>
            : (data?.low_stock_items || []).map(i => (
              <div key={i.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #374151', fontSize: 13 }}>
                <span style={{ color: '#f9fafb' }}>{i.name}</span>
                <span style={{ color: '#ef4444' }}>{i.stock_level} / {i.min_stock} {i.unit}</span>
              </div>
            ))
          }
        </div>

        {/* Daily Summary */}
        <div style={{ background: '#1f2937', borderRadius: 12, padding: 20 }}>
          <h3 style={{ color: '#10b981', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}><span>📊</span> Daily Summary</h3>
          <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 16px' }}>Manually send today's end-of-day summary to the owner via WhatsApp/Email.</p>
          <button id="crm-send-daily-summary" onClick={sendSummary} disabled={summaryLoading} style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', width: '100%' }}>
            {summaryLoading ? '⏳ Sending...' : '📤 Send Daily Summary Now'}
          </button>
          {summaryMsg && <div style={{ marginTop: 12, color: summaryMsg.startsWith('✅') ? '#10b981' : '#ef4444', fontSize: 13 }}>{summaryMsg}</div>}
        </div>
      </div>

      {/* Recent notification logs */}
      <div style={{ background: '#1f2937', borderRadius: 12, padding: 20 }}>
        <h3 style={{ color: '#d1d5db', margin: '0 0 12px' }}>🕐 Recent Notifications</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #374151' }}>
              {['Time','Type','Channel','Recipient','Status'].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#6b7280', fontWeight: 600 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {(data?.recent_logs || []).map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid #374151' }}>
                <td style={{ padding: '8px 10px', color: '#9ca3af' }}>{new Date(l.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                <td style={{ padding: '8px 10px', color: '#d1d5db' }}>{l.type.replace(/_/g,' ')}</td>
                <td style={{ padding: '8px 10px' }}><Badge v={l.channel} /></td>
                <td style={{ padding: '8px 10px', color: '#9ca3af' }}>{l.recipient_name || l.recipient || '—'}</td>
                <td style={{ padding: '8px 10px' }}><Badge v={l.status} /></td>
              </tr>
            ))}
            {!data?.recent_logs?.length && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>No notifications yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Loyalty Tab ──────────────────────────────────────────────────────────────
function LoyaltyTab() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [redeem, setRedeem] = useState({ show: false, points: '', cid: null });
  const [edit, setEdit] = useState({ show: false, data: {} });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api(`/api/notifications/loyalty?search=${encodeURIComponent(search)}&limit=50`);
      setCustomers(r.customers); setTotal(r.total);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [search]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const viewHistory = async (c) => {
    setSelected(c);
    const r = await api(`/api/notifications/loyalty/${c.id}/history`);
    setHistory(r.transactions || []);
  };

  const doRedeem = async () => {
    setMsg('');
    try {
      const r = await api('/api/notifications/loyalty/redeem', { method: 'POST', body: JSON.stringify({ customer_id: redeem.cid, points: parseInt(redeem.points) }) });
      setMsg(`✅ Redeemed ${redeem.points} pts = ₹${r.discount} discount. New balance: ${r.newBalance} pts`);
      setRedeem({ show: false, points: '', cid: null });
      load();
    } catch(e) { setMsg('❌ ' + e.message); }
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

  const openEdit = (c) => {
    setEdit({ show: true, data: { id: c.id, name: c.name || '', phone: c.phone || '', email: c.email || '', whatsapp_opt_in: !!c.whatsapp_opt_in, sms_opt_in: !!c.sms_opt_in } });
  };

  const doSaveEdit = async () => {
    setMsg('');
    try {
      await api(`/api/customers/${edit.data.id}`, { method: 'PUT', body: JSON.stringify(edit.data) });
      setMsg(`✅ Customer "${edit.data.name}" updated successfully.`);
      setEdit({ show: false, data: {} });
      load();
    } catch(e) { setMsg('❌ ' + e.message); }
  };

  const inputStyle = { width: '100%', padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search customer name or phone..." style={{ flex: 1, padding: '10px 16px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14 }} />
        <span style={{ color: '#6b7280', fontSize: 13 }}>{total} customers</span>
      </div>

      {msg && <div style={{ padding: 12, borderRadius: 8, background: msg.startsWith('✅') ? '#10b98122' : '#ef444422', color: msg.startsWith('✅') ? '#10b981' : '#ef4444', fontSize: 13 }}>{msg}</div>}

      <div style={{ background: '#1f2937', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#111827' }}>
              {['Name','Phone','Email','Loyalty Points','Total Spent','Last Visit','Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>Loading...</td></tr>
              : customers.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #374151' }}>
                <td style={{ padding: '12px 16px', color: '#f9fafb', fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: '12px 16px', color: '#9ca3af' }}>{c.phone || '—'}</td>
                <td style={{ padding: '12px 16px', color: c.email ? '#9ca3af' : '#ef4444', fontSize: 12 }}>{c.email || 'Not set'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: '#f59e0b22', color: '#f59e0b', padding: '3px 10px', borderRadius: 12, fontWeight: 700 }}>⭐ {c.loyalty_points || 0}</span>
                </td>
                <td style={{ padding: '12px 16px', color: '#10b981' }}>₹{fmt(c.total_spent)}</td>
                <td style={{ padding: '12px 16px', color: '#9ca3af' }}>{c.last_visit ? new Date(c.last_visit).toLocaleDateString('en-IN') : '-'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(c)} style={{ padding: '4px 10px', background: '#f59e0b22', color: '#f59e0b', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Edit</button>
                    <button onClick={() => viewHistory(c)} style={{ padding: '4px 10px', background: '#3b82f622', color: '#3b82f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>History</button>
                    <button onClick={() => setRedeem({ show: true, cid: c.id, points: '', name: c.name, balance: c.loyalty_points })} style={{ padding: '4px 10px', background: '#10b98122', color: '#10b981', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Redeem</button>
                    <button onClick={() => doDelete(c)} style={{ padding: '4px 10px', background: '#ef444422', color: '#ef4444', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && customers.length === 0 && <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>No customers found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Edit Customer Modal */}
      {edit.show && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000088', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1f2937', borderRadius: 16, padding: 28, width: 440, border: '1px solid #374151' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#fff', margin: 0 }}>✏️ Edit Customer Profile</h3>
              <button onClick={() => setEdit({ show: false, data: {} })} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Customer Name *</label>
                <input value={edit.data.name} onChange={e => setEdit(p => ({ ...p, data: { ...p.data, name: e.target.value } }))} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Phone</label>
                  <input value={edit.data.phone} onChange={e => setEdit(p => ({ ...p, data: { ...p.data, phone: e.target.value } }))} placeholder="e.g. 9876543210" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Email</label>
                  <input type="email" value={edit.data.email} onChange={e => setEdit(p => ({ ...p, data: { ...p.data, email: e.target.value } }))} placeholder="e.g. name@email.com" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '12px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#d1d5db', fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={edit.data.whatsapp_opt_in} onChange={e => setEdit(p => ({ ...p, data: { ...p.data, whatsapp_opt_in: e.target.checked } }))} />
                  WhatsApp Opt-in
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#d1d5db', fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={edit.data.sms_opt_in} onChange={e => setEdit(p => ({ ...p, data: { ...p.data, sms_opt_in: e.target.checked } }))} />
                  SMS Opt-in
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={doSaveEdit} disabled={!edit.data.name} style={{ flex: 1, padding: '10px', background: !edit.data.name ? '#374151' : 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: edit.data.name ? 'pointer' : 'not-allowed' }}>Save Changes</button>
              <button onClick={() => setEdit({ show: false, data: {} })} style={{ flex: 1, padding: '10px', background: '#374151', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* History drawer */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000088', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: '#111827', width: 400, height: '100%', overflow: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: '#fff', margin: 0 }}>⭐ {selected.name}'s Points History</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#1f2937', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>{selected.loyalty_points || 0}</div>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>Current Balance</div>
              </div>
              <div style={{ background: '#1f2937', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>₹{fmt(selected.total_spent)}</div>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>Total Spent</div>
              </div>
            </div>
            {history.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #374151', fontSize: 13 }}>
                <div>
                  <div style={{ color: '#f9fafb', fontWeight: 600 }}>{t.note}</div>
                  <div style={{ color: '#6b7280', fontSize: 11 }}>{new Date(t.created_at).toLocaleString('en-IN')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, color: t.type === 'earn' ? '#10b981' : '#ef4444' }}>
                    {t.type === 'earn' ? '+' : ''}{t.points} pts
                  </div>
                  {t.order_cost != null && (
                    <div style={{ color: '#9ca3af', fontSize: 11 }}>Order: ₹{Number(t.order_cost).toFixed(2)}</div>
                  )}
                </div>
              </div>
            ))}
            {history.length === 0 && <div style={{ color: '#6b7280', textAlign: 'center', padding: 20 }}>No transactions yet</div>}
          </div>
        </div>
      )}

      {/* Redeem modal */}
      {redeem.show && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000088', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1f2937', borderRadius: 16, padding: 32, width: 380 }}>
            <h3 style={{ color: '#fff', marginTop: 0 }}>🎁 Redeem Points</h3>
            <p style={{ color: '#9ca3af', fontSize: 13 }}>Customer: <strong style={{ color: '#fff' }}>{redeem.name}</strong> | Balance: <strong style={{ color: '#f59e0b' }}>⭐ {redeem.balance}</strong></p>
            <input type="number" value={redeem.points} onChange={e => setRedeem(p => ({ ...p, points: e.target.value }))} placeholder="Points to redeem" style={{ width: '100%', padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box', marginBottom: 16 }} />
            <p style={{ color: '#10b981', fontSize: 13, margin: '0 0 20px' }}>Discount: ₹{redeem.points || 0}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={doRedeem} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>Confirm Redeem</button>
              <button onClick={() => setRedeem({ show: false, points: '', cid: null })} style={{ flex: 1, padding: '10px', background: '#374151', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Broadcasts Tab ───────────────────────────────────────────────────────────
function BroadcastsTab() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', message: '', channel: 'whatsapp', target_segment: 'all', scheduled_at: '' });
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(null);
  const [recipients, setRecipients] = useState({ show: false, data: [], campaignName: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try { setCampaigns(await api('/api/notifications/broadcasts')); } catch(e) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setMsg('');
    try {
      await api('/api/notifications/broadcasts', { method: 'POST', body: JSON.stringify(form) });
      setMsg('✅ Campaign created!'); setShowForm(false);
      setForm({ name: '', message: '', channel: 'whatsapp', target_segment: 'all', scheduled_at: '' });
      load();
    } catch(e) { setMsg('❌ ' + e.message); }
  };

  const send = async (id, name) => {
    if (!confirm(`Send broadcast "${name}" now?`)) return;
    setSending(id); setMsg('');
    try {
      const r = await api(`/api/notifications/broadcasts/${id}/send`, { method: 'POST' });
      setMsg(`✅ "${name}" sent to ${r.total} recipients (${r.sent} sent, ${r.failed} failed)`);
      load();
    } catch(e) { setMsg('❌ ' + e.message); }
    setSending(null);
  };

  const del = async (id) => {
    if (!confirm('Delete this draft campaign?')) return;
    await api(`/api/notifications/broadcasts/${id}`, { method: 'DELETE' });
    load();
  };

  const viewRecipients = async (id, name) => {
    const data = await api(`/api/notifications/broadcasts/${id}/recipients`);
    setRecipients({ show: true, data, campaignName: name });
  };

  const segments = [{ v: 'all', l: 'All Registered Customers' }, { v: 'high_value', l: 'VIP / High Value (Spent ₹500+)' }, { v: 'inactive', l: 'At-Risk / Inactive (No visits in 30 days)' }, { v: 'loyalty', l: 'Customers with Unspent Points' }];
  const channels = [{ v: 'whatsapp', l: '💬 WhatsApp' }, { v: 'sms', l: '📱 SMS' }, { v: 'email', l: '📧 Email' }];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: '#d1d5db', margin: 0 }}>📣 Broadcast Campaigns</h3>
        <button id="crm-new-broadcast" onClick={() => setShowForm(true)} style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer' }}>+ New Broadcast</button>
      </div>

      {msg && <div style={{ padding: 12, borderRadius: 8, background: msg.startsWith('✅') ? '#10b98122' : '#ef444422', color: msg.startsWith('✅') ? '#10b981' : '#ef4444', fontSize: 13 }}>{msg}</div>}

      {showForm && (
        <div style={{ background: '#1f2937', borderRadius: 12, padding: 24, border: '1px solid #374151' }}>
          <h4 style={{ color: '#fff', marginTop: 0 }}>Create Broadcast</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Campaign Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={{ width: '100%', padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Channel</label>
              <select value={form.channel} onChange={e => setForm(p => ({ ...p, channel: e.target.value }))} style={{ width: '100%', padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' }}>
                {channels.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Target Audience</label>
              <select value={form.target_segment} onChange={e => setForm(p => ({ ...p, target_segment: e.target.value }))} style={{ width: '100%', padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' }}>
                {segments.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Schedule (optional)</label>
              <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))} style={{ width: '100%', padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Message *</label>
            <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={5} placeholder="Type your broadcast message here..." style={{ width: '100%', padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button onClick={save} style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>Save Draft</button>
            <button onClick={() => setShowForm(false)} style={{ background: '#374151', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ background: '#1f2937', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#111827' }}>
              {['Campaign','Channel','Target','Schedule','Status','Recipients','Sent','Failed','Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={9} style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>Loading...</td></tr>
              : campaigns.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #374151' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ color: '#f9fafb', fontWeight: 600 }}>{c.name}</div>
                  <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>{new Date(c.created_at).toLocaleDateString('en-IN')}</div>
                </td>
                <td style={{ padding: '12px 16px', color: '#9ca3af' }}>{c.channel}</td>
                <td style={{ padding: '12px 16px', color: '#9ca3af' }}>{c.target_segment}</td>
                <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 12 }}>{c.scheduled_at ? new Date(c.scheduled_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                <td style={{ padding: '12px 16px' }}><Badge v={c.status} /></td>
                <td style={{ padding: '12px 16px', color: '#d1d5db' }}>{c.total_recipients}</td>
                <td style={{ padding: '12px 16px', color: '#10b981' }}>{c.total_sent}</td>
                <td style={{ padding: '12px 16px', color: '#ef4444' }}>{c.total_failed}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {c.status === 'sent' && <button onClick={() => viewRecipients(c.id, c.name)} style={{ padding: '4px 8px', background: '#3b82f622', color: '#3b82f6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>Report</button>}
                    {['draft','failed'].includes(c.status) && <>
                      <button onClick={() => send(c.id, c.name)} disabled={sending === c.id} style={{ padding: '4px 8px', background: '#8b5cf622', color: '#8b5cf6', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>{sending === c.id ? '...' : 'Send'}</button>
                      <button onClick={() => del(c.id)} style={{ padding: '4px 8px', background: '#ef444422', color: '#ef4444', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>Delete</button>
                    </>}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && campaigns.length === 0 && <tr><td colSpan={8} style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>No campaigns yet. Create your first broadcast!</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Recipients report modal */}
      {recipients.show && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000088', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1f2937', borderRadius: 16, padding: 24, width: 600, maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ color: '#fff', margin: 0 }}>📊 Delivery Report: {recipients.campaignName}</h3>
              <button onClick={() => setRecipients({ show: false, data: [], campaignName: '' })} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: '#111827' }}>{['Customer','Phone','Status','Sent At'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280' }}>{h}</th>)}</tr></thead>
              <tbody>
                {recipients.data.map(r => <tr key={r.id} style={{ borderBottom: '1px solid #374151' }}>
                  <td style={{ padding: '8px 12px', color: '#f9fafb' }}>{r.customer_name}</td>
                  <td style={{ padding: '8px 12px', color: '#9ca3af' }}>{r.phone}</td>
                  <td style={{ padding: '8px 12px' }}><Badge v={r.status} /></td>
                  <td style={{ padding: '8px 12px', color: '#9ca3af' }}>{r.sent_at ? new Date(r.sent_at).toLocaleString('en-IN') : '—'}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Feedback Tab ─────────────────────────────────────────────────────────────
function FeedbackTab() {
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState({});
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 100, ...(filter !== 'all' ? { filter } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) });
      const r = await api('/api/notifications/feedback?' + params);
      setFeedback(r.feedback); setTotal(r.total); setStats(r.stats || {});
    } catch(e) {}
    setLoading(false);
  }, [filter, from, to]);

  useEffect(() => { load(); }, [load]);

  const ratingColor = (r) => r >= 4 ? '#10b981' : r >= 3 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        {[
          { label: 'Avg Rating', value: Number(stats.avg_rating||0).toFixed(1) + ' ⭐', color: '#f59e0b' },
          { label: 'Total Reviews', value: stats.total_feedback || 0, color: '#3b82f6' },
          { label: 'Negative Feedback', value: stats.negative_count || 0, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ background: '#1f2937', borderRadius: 12, padding: '16px 20px', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ color: '#9ca3af', fontSize: 13 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {[{ v: 'all', l: 'All Feedback' }, { v: 'negative', l: '⚠️ Negative Only' }].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)} style={{ padding: '7px 16px', borderRadius: 20, border: 'none', background: filter === f.v ? '#ef4444' : '#374151', color: '#fff', cursor: 'pointer', fontWeight: filter === f.v ? 700 : 400, fontSize: 13 }}>{f.l}</button>
        ))}
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ padding: '7px 12px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <span style={{ color: '#6b7280' }}>to</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ padding: '7px 12px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <span style={{ color: '#6b7280', fontSize: 13 }}>{total} records</span>
      </div>

      <div style={{ background: '#1f2937', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ background: '#111827' }}>
                {['Date','Customer','Order','Overall','Food','Service','Speed','Comment','Alerted'].map(h => <th key={h} style={{ textAlign: 'left', padding: '12px 12px', color: '#6b7280', fontWeight: 600, fontSize: 11 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={9} style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>Loading...</td></tr>
                : feedback.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid #374151', background: f.rating <= 2 ? '#ef444408' : 'transparent' }}>
                  <td style={{ padding: '10px 12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{new Date(f.created_at).toLocaleDateString('en-IN')}</td>
                  <td style={{ padding: '10px 12px', color: '#f9fafb' }}>{f.customer_name || '—'}</td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>#{f.order_id || '—'}</td>
                  <td style={{ padding: '10px 12px' }}><span style={{ fontWeight: 800, color: ratingColor(f.rating) }}>{'★'.repeat(f.rating)}{'☆'.repeat(5-f.rating)}</span></td>
                  <td style={{ padding: '10px 12px', color: ratingColor(f.food_rating || f.rating) }}>{f.food_rating || f.rating}/5</td>
                  <td style={{ padding: '10px 12px', color: ratingColor(f.service_rating || f.rating) }}>{f.service_rating || f.rating}/5</td>
                  <td style={{ padding: '10px 12px', color: ratingColor(f.speed_rating || f.rating) }}>{f.speed_rating || f.rating}/5</td>
                  <td style={{ padding: '10px 12px', color: '#9ca3af', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.comments || '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{f.is_negative_alerted ? <span style={{ color: '#ef4444', fontSize: 11 }}>✅ Alerted</span> : <span style={{ color: '#6b7280', fontSize: 11 }}>—</span>}</td>
                </tr>
              ))}
              {!loading && feedback.length === 0 && <tr><td colSpan={9} style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>No feedback found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Logs Tab ─────────────────────────────────────────────────────────────────
function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ type: '', channel: '', status: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) });
      const r = await api('/api/notifications/logs?' + p);
      setLogs(r.logs); setTotal(r.total);
    } catch(e) {}
    setLoading(false);
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const types = ['', 'low_stock', 'daily_summary', 'order_ready', 'broadcast', 'feedback_alert', 'loyalty_earned', 'loyalty_redeemed'];
  const channels = ['', 'whatsapp', 'sms', 'email', 'simulated'];
  const statuses = ['', 'sent', 'failed', 'simulated', 'pending'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { label: 'Type', key: 'type', options: types },
          { label: 'Channel', key: 'channel', options: channels },
          { label: 'Status', key: 'status', options: statuses },
        ].map(f => (
          <select key={f.key} value={filters[f.key]} onChange={e => { setFilters(p => ({ ...p, [f.key]: e.target.value })); setPage(1); }} style={{ padding: '8px 12px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 13 }}>
            <option value="">All {f.label}s</option>
            {f.options.filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        <input type="date" value={filters.from} onChange={e => { setFilters(p => ({ ...p, from: e.target.value })); setPage(1); }} style={{ padding: '8px 12px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <input type="date" value={filters.to} onChange={e => { setFilters(p => ({ ...p, to: e.target.value })); setPage(1); }} style={{ padding: '8px 12px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 13 }} />
        <span style={{ color: '#6b7280', fontSize: 13 }}>{total} records</span>
      </div>

      <div style={{ background: '#1f2937', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ background: '#111827' }}>
            {['Date/Time','Type','Channel','Recipient','Message','Status'].map(h => <th key={h} style={{ textAlign: 'left', padding: '12px 14px', color: '#6b7280', fontWeight: 600 }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>Loading...</td></tr>
              : logs.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid #374151' }}>
                <td style={{ padding: '10px 14px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{new Date(l.created_at).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px', color: '#d1d5db' }}>{l.type.replace(/_/g, ' ')}</td>
                <td style={{ padding: '10px 14px' }}><Badge v={l.channel} /></td>
                <td style={{ padding: '10px 14px', color: '#9ca3af' }}>{l.recipient_name || l.recipient || '—'}</td>
                <td style={{ padding: '10px 14px', color: '#6b7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.message}</td>
                <td style={{ padding: '10px 14px' }}><Badge v={l.status} /></td>
              </tr>
            ))}
            {!loading && logs.length === 0 && <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#6b7280' }}>No logs found</td></tr>}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {total > LIMIT && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
          <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} style={{ padding: '6px 14px', background: '#374151', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>← Prev</button>
          <span style={{ color: '#9ca3af', fontSize: 13 }}>Page {page} of {Math.ceil(total/LIMIT)}</span>
          <button onClick={() => setPage(p => p+1)} disabled={page >= Math.ceil(total/LIMIT)} style={{ padding: '6px 14px', background: '#374151', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Next →</button>
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab({ userRole }) {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState('');
  const [msg, setMsg] = useState('');
  const [testMsg, setTestMsg] = useState('');

  const load = async () => {
    try { setSettings(await api('/api/notifications/settings')); } catch(e) {}
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      await api('/api/notifications/settings', { method: 'PUT', body: JSON.stringify(settings) });
      setMsg('✅ Settings saved successfully!');
    } catch(e) { setMsg('❌ ' + e.message); }
    setSaving(false);
  };

  const test = async (channel, recipient) => {
    setTesting(channel); setTestMsg('');
    try {
      const r = await api('/api/notifications/test', { method: 'POST', body: JSON.stringify({ channel, recipient }) });
      setTestMsg(`✅ ${channel.toUpperCase()} test: ${r.result?.status || 'sent'}`);
    } catch(e) { setTestMsg('❌ ' + e.message); }
    setTesting('');
  };

  const [showFieldPassword, setShowFieldPassword] = useState({});
  const Field = ({ label, k, type = 'text', placeholder = '' }) => {
    const isPassword = type === 'password';
    const visible = showFieldPassword[k] || false;
    return (
      <div>
        <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>{label}</label>
        <div style={{ position: 'relative' }}>
          <input type={isPassword ? (visible ? 'text' : 'password') : type} value={settings?.[k] || ''} onChange={e => setSettings(p => ({ ...p, [k]: e.target.value }))} placeholder={placeholder}
            style={{ width: '100%', padding: '10px 14px', paddingRight: isPassword ? '40px' : '14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
          {isPassword && (
            <button type="button" onClick={() => setShowFieldPassword(p => ({ ...p, [k]: !p[k] }))} style={{position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', padding:'4px', color:'#64748b', display:'flex', alignItems:'center'}}>
              {visible ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  const Toggle = ({ label, k, note }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #374151' }}>
      <div>
        <div style={{ color: '#f9fafb', fontSize: 14 }}>{label}</div>
        {note && <div style={{ color: '#6b7280', fontSize: 12 }}>{note}</div>}
      </div>
      <button onClick={() => setSettings(p => ({ ...p, [k]: p[k] ? 0 : 1 }))} style={{ padding: '6px 20px', borderRadius: 20, border: 'none', background: settings?.[k] ? '#10b981' : '#374151', color: '#fff', cursor: 'pointer', fontWeight: 700, minWidth: 64, transition: 'background 0.2s' }}>
        {settings?.[k] ? 'ON' : 'OFF'}
      </button>
    </div>
  );

  if (!settings) return <div style={{ color: '#9ca3af', padding: 40, textAlign: 'center' }}>Loading settings...</div>;

  const Section = ({ title, icon, children }) => (
    <div style={{ background: '#1f2937', borderRadius: 12, padding: 24, marginBottom: 16 }}>
      <h4 style={{ color: '#d1d5db', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}><span>{icon}</span>{title}</h4>
      {children}
    </div>
  );

  return (
    <div style={{ maxWidth: 800 }}>
      {msg && <div style={{ padding: 12, borderRadius: 8, background: msg.startsWith('✅') ? '#10b98122' : '#ef444422', color: msg.startsWith('✅') ? '#10b981' : '#ef4444', fontSize: 13, marginBottom: 16 }}>{msg}</div>}
      {testMsg && <div style={{ padding: 12, borderRadius: 8, background: testMsg.startsWith('✅') ? '#10b98122' : '#ef444422', color: testMsg.startsWith('✅') ? '#10b981' : '#ef4444', fontSize: 13, marginBottom: 16 }}>{testMsg}</div>}

      <Section title="Owner Alert Config" icon="👤">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Owner WhatsApp Number" k="owner_whatsapp" placeholder="+91XXXXXXXXXX" />
          <Field label="Owner Email" k="owner_email" placeholder="owner@example.com" />
          <div>
            <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Daily Summary Time (IST)</label>
            <input type="time" value={settings.daily_summary_time || '22:00'} onChange={e => setSettings(p => ({ ...p, daily_summary_time: e.target.value }))} style={{ width: '100%', padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
        </div>
      </Section>

      <Section title="Loyalty Program" icon="⭐">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Points per ₹100 spent</label>
            <input type="number" step="0.5" value={settings.loyalty_points_per_100 || 1} onChange={e => setSettings(p => ({ ...p, loyalty_points_per_100: e.target.value }))} style={{ width: '100%', padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>Minimum points to redeem</label>
            <input type="number" value={settings.loyalty_min_redeem || 50} onChange={e => setSettings(p => ({ ...p, loyalty_min_redeem: e.target.value }))} style={{ width: '100%', padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 4 }}>₹ per point (redemption)</label>
            <input type="number" step="0.5" value={settings.loyalty_redeem_ratio || 1} onChange={e => setSettings(p => ({ ...p, loyalty_redeem_ratio: e.target.value }))} style={{ width: '100%', padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
        </div>
        <Toggle label="Loyalty Program Enabled" k="loyalty_enabled" note="Points earned/redeemable at checkout" />
      </Section>

      <Section title="Alert Controls" icon="🔔">
        <Toggle label="Low Stock WhatsApp Alert" k="low_stock_alert_enabled" note="Alert owner when ingredient drops below minimum" />
        <div style={{ padding: '12px 0', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#f9fafb', fontSize: 14 }}>Low Stock Alert Throttle (hours)</div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>Don't re-alert for same item within this window</div>
          </div>
          <input type="number" value={settings.low_stock_throttle_hours || 4} onChange={e => setSettings(p => ({ ...p, low_stock_throttle_hours: e.target.value }))} style={{ width: 80, padding: '8px 12px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', textAlign: 'center' }} />
        </div>
        <Toggle label="Order Ready - SMS" k="order_ready_sms" note="SMS to customer when kitchen marks order Ready" />
        <Toggle label="Order Ready - WhatsApp" k="order_ready_whatsapp" note="WhatsApp to customer when order is Ready" />
        <Toggle label="Daily Summary Auto-Send" k="daily_summary_enabled" note="Automatically send at configured time" />
        <div style={{ padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#f9fafb', fontSize: 14 }}>Negative Feedback Threshold</div>
            <div style={{ color: '#6b7280', fontSize: 12 }}>Alert manager when rating is ≤ this value</div>
          </div>
          <input type="number" min={1} max={5} value={settings.negative_feedback_threshold || 2} onChange={e => setSettings(p => ({ ...p, negative_feedback_threshold: e.target.value }))} style={{ width: 80, padding: '8px 12px', background: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', textAlign: 'center' }} />
        </div>
      </Section>

      <button id="crm-save-settings" onClick={save} disabled={saving} style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 40px', fontWeight: 700, fontSize: 15, cursor: 'pointer', width: '100%' }}>
        {saving ? '⏳ Saving...' : '💾 Save All Settings'}
      </button>
    </div>
  );
}

// ─── Main CRM & Notifications Component ──────────────────────────────────────
export default function CrmNotifications({ userRole }) {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: '📊 Overview', roles: ['Owner','Manager','Admin'] },
    { id: 'loyalty', label: '⭐ Loyalty', roles: ['Owner','Manager','Cashier','Admin'] },
    { id: 'broadcasts', label: '📣 Broadcasts', roles: ['Owner','Manager','Admin'] },
    { id: 'feedback', label: '💬 Feedback', roles: ['Owner','Manager','Admin'] },
    { id: 'logs', label: '📋 Logs', roles: ['Owner','Manager','Admin'] },
    { id: 'settings', label: '⚙️ Settings', roles: ['Owner','Admin'] },
  ].filter(t => !userRole || t.roles.includes(userRole));

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', padding: '24px 28px', fontFamily: "'Inter',sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>🔔 CRM & Notifications Engine</h2>
        <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Manage loyalty, alerts, broadcasts, and customer feedback all in one place.</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: '#1f2937', padding: 6, borderRadius: 12, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} id={`crm-tab-${t.id}`} onClick={() => setActiveTab(t.id)}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
              background: activeTab === t.id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
              color: activeTab === t.id ? '#fff' : '#9ca3af' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'loyalty' && <LoyaltyTab />}
        {activeTab === 'broadcasts' && <BroadcastsTab />}
        {activeTab === 'feedback' && <FeedbackTab />}
        {activeTab === 'logs' && <LogsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}
