import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:5000/api';

function StallInsights({ user }) {
  const [activeSubTab, setActiveSubTab] = useState('central_orders');
  const isStallManager = !!user.vendor_id;

  // --- Central Orders State ---
  const [centralOrders, setCentralOrders] = useState([]);
  const [ledgerItems, setLedgerItems] = useState(null);  // { vendorId, vendorName, orders: [...] }

  // --- Common Expenses State ---
  const [expenses, setExpenses] = useState([]);

  // --- Dues to Admin State (stall manager only) ---
  const [myDues, setMyDues] = useState([]);

  // --- Performance State ---
  const [myStats, setMyStats] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [performanceStartDate, setPerformanceStartDate] = useState('');
  const [performanceEndDate, setPerformanceEndDate] = useState('');

  // --- Digital Receivables State ---
  const [digitalReceivables, setDigitalReceivables] = useState([]);
  const [receivablesLedger, setReceivablesLedger] = useState(null);  // { payment_mode, items: [...] }

  // Load initial data
  useEffect(() => {
    fetchCentralOrders();
    fetchExpenses();
    if (isStallManager) {
      fetchMyStats();
      fetchMyDues();
    } else {
      fetchPerformance();
    }
  }, []);

  // --- API Calls ---

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  const fetchCentralOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/vendors/central-settlements/pending`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (isStallManager) {
          // Filter to only show the logged-in stall's data
          const myData = data.filter(co => co.id === user.vendor_id);
          setCentralOrders(myData);
        } else {
          setCentralOrders(data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLedgerItems = async (vendorId, vendorName) => {
    try {
      const res = await fetch(`${API_BASE}/vendors/central-settlements/pending/${vendorId}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLedgerItems({ vendorId, vendorName, orders: data });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const settleVendorOrders = async (vendorId) => {
    if (!ledgerItems || ledgerItems.vendorId !== vendorId) return;
    const orderItemIds = ledgerItems.orders.map(o => o.order_item_id);
    const amount = ledgerItems.orders.reduce((sum, o) => sum + parseFloat(o.total_price || (o.quantity * o.price)), 0);

    try {
      const res = await fetch(`${API_BASE}/vendors/central-settlements/settle`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ vendorId, orderItemIds, amount })
      });
      if (res.ok) {
        alert('Settled successfully!');
        setLedgerItems(null);
        fetchCentralOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExpenses = async () => {
    try {
      const res = await fetch(`${API_BASE}/vendors/expenses`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyDues = async () => {
    try {
      const res = await fetch(`${API_BASE}/vendors/settlements/my-dues`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMyDues(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPerformance = async () => {
    try {
      const res = await fetch(`${API_BASE}/vendors/performance`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPerformanceData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyStats = async () => {
    try {
      let url = `${API_BASE}/vendors/performance/my-stats`;
      if (performanceStartDate && performanceEndDate) {
        url += `?startDate=${performanceStartDate}&endDate=${performanceEndDate}`;
      }
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMyStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDigitalReceivables = async () => {
    try {
      const res = await fetch(`${API_BASE}/digital-settlements/summary?vendor_id=${user.vendor_id}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDigitalReceivables(data);
      }
    } catch (e) { console.error(e); }
  };

  const fetchReceivablesLedger = async (payment_mode) => {
    try {
      const res = await fetch(`${API_BASE}/digital-settlements/pending/${user.vendor_id}?payment_mode=${encodeURIComponent(payment_mode)}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setReceivablesLedger({ payment_mode, items: data });
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (activeSubTab === 'digital_receivables') {
      fetchDigitalReceivables();
      setReceivablesLedger(null);
    }
  }, [activeSubTab]);

  // --- Render Helpers ---

  const tabStyle = (tabName) => ({
    background: activeSubTab === tabName ? 'rgba(139, 92, 246, 0.2)' : 'transparent', 
    color: activeSubTab === tabName ? '#a78bfa' : '#94a3b8',
    border: activeSubTab === tabName ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid transparent',
    padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500
  });

  const tableHeaderStyle = { padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const tableCellStyle = { padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0' };

  // --- Stat Card ---
  const StatCard = ({ icon, label, value, color, subtext }) => (
    <div style={{
      background: 'linear-gradient(135deg, rgba(30,30,36,0.9), rgba(40,40,50,0.9))',
      border: `1px solid ${color}33`,
      borderRadius: '12px',
      padding: '20px',
      flex: 1,
      minWidth: '180px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '4rem', opacity: 0.06 }}>{icon}</div>
      <div style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>{label}</div>
      <div style={{ color, fontSize: '1.8rem', fontWeight: 700 }}>{value}</div>
      {subtext && <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>{subtext}</div>}
    </div>
  );



  // ============================================================
  // RENDER: CENTRAL ORDERS
  // ============================================================
  const renderCentralOrders = () => {
    if (ledgerItems) {
      // Ledger detail view
      const totalPending = ledgerItems.orders.reduce((s, o) => s + parseFloat(o.total_price || (o.quantity * o.price)), 0);
      return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ color: '#e2e8f0', margin: 0 }}>
                📋 Unsettled Ledger — <span style={{ color: '#a78bfa' }}>{ledgerItems.vendorName}</span>
              </h3>
              <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                {ledgerItems.orders.length} item(s) pending settlement
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setLedgerItems(null)} style={{
                background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.2)',
                padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500
              }}>← Back</button>
              {!isStallManager && (
                <button onClick={() => settleVendorOrders(ledgerItems.vendorId)} style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
                  border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
                  boxShadow: '0 2px 10px rgba(16,185,129,0.3)'
                }}>✓ Settle ₹{totalPending.toFixed(2)}</button>
              )}
            </div>
          </div>

          {/* Summary banner for stall managers */}
          {isStallManager && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px', padding: '16px 20px', marginBottom: '20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <span style={{ color: '#fca5a5', fontSize: '0.85rem' }}>Total Unsettled Amount</span>
                <div style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 700 }}>₹{totalPending.toFixed(2)}</div>
              </div>
              <div style={{ color: '#fca5a5', fontSize: '0.8rem' }}>
                These items were sold via Central POS / QR orders.<br/>Admin will settle the dues.
              </div>
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(139,92,246,0.05)' }}>
                <th style={tableHeaderStyle}>Order #</th>
                <th style={tableHeaderStyle}>Date & Time</th>
                <th style={tableHeaderStyle}>Source</th>
                <th style={tableHeaderStyle}>Items</th>
                <th style={tableHeaderStyle}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const grouped = ledgerItems.orders.reduce((acc, o) => {
                  if (!acc[o.order_id]) {
                    acc[o.order_id] = {
                      order_id: o.order_id,
                      token_number: o.token_number,
                      order_date: o.order_date,
                      order_source: o.order_source,
                      items: [],
                      total_price: 0
                    };
                  }
                  acc[o.order_id].items.push(`${o.item_name} (x${o.quantity})`);
                  acc[o.order_id].total_price += parseFloat(o.total_price || (o.quantity * o.price));
                  return acc;
                }, {});
                return Object.values(grouped).sort((a,b) => new Date(b.order_date) - new Date(a.order_date)).map((o, idx) => (
                  <tr key={idx} style={{ transition: 'background 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(139,92,246,0.05)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={tableCellStyle}>#{o.token_number || o.order_id}</td>
                    <td style={{...tableCellStyle, fontSize: '0.85rem'}}>{o.order_date ? new Date(o.order_date).toLocaleString() : '-'}</td>
                    <td style={tableCellStyle}>
                      <span style={{
                        background: o.order_source === 'QR' ? 'rgba(6,182,212,0.15)' : 'rgba(139,92,246,0.15)',
                        color: o.order_source === 'QR' ? '#06b6d4' : '#a78bfa',
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem'
                      }}>{o.order_source || 'POS'}</span>
                    </td>
                    <td style={{...tableCellStyle, fontSize: '0.85rem', maxWidth: '250px', whiteSpace: 'normal'}}>{o.items.join(', ')}</td>
                    <td style={{...tableCellStyle, color: '#ef4444', fontWeight: 600}}>₹{o.total_price.toFixed(2)}</td>
                  </tr>
                ));
              })()}
              {ledgerItems.orders.length === 0 && (
                <tr><td colSpan="5" style={{...tableCellStyle, textAlign: 'center', color: '#64748b'}}>No unsettled items found</td></tr>
              )}
            </tbody>
            {ledgerItems.orders.length > 0 && (
              <tfoot>
                <tr style={{ background: 'rgba(239,68,68,0.05)' }}>
                  <td colSpan="4" style={{...tableCellStyle, textAlign: 'right', fontWeight: 600, color: '#fca5a5'}}>TOTAL PENDING</td>
                  <td style={{...tableCellStyle, color: '#ef4444', fontWeight: 700, fontSize: '1.1rem'}}>₹{totalPending.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      );
    }

    return (
      <div>        {/* ===== CENTRAL ORDERS TABLE ===== */}
        <h3 style={{ color: '#e2e8f0', marginBottom: '8px' }}>
          {isStallManager ? '💰 My Pending Settlements (Admin → You)' : '💰 Pending Central Settlements'}
        </h3>
        {isStallManager && (
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '15px' }}>
            Amount owed <strong style={{color:'#a78bfa'}}>to your stall</strong> from orders placed via Central POS / QR system.
          </p>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(139,92,246,0.05)' }}>
              {!isStallManager && <th style={tableHeaderStyle}>Stall #</th>}
              <th style={tableHeaderStyle}>{isStallManager ? 'My Stall' : 'Vendor Name'}</th>
              <th style={tableHeaderStyle}>Pending Amount</th>
              <th style={tableHeaderStyle}>Ledger</th>
            </tr>
          </thead>
          <tbody>
            {centralOrders.length === 0 ? (
              <tr><td colSpan={isStallManager ? 3 : 4} style={{...tableCellStyle, textAlign: 'center', color: '#64748b'}}>
                {isStallManager ? '🎉 No pending settlements — you\'re all settled up!' : 'No pending settlements'}
              </td></tr>
            ) : (
              centralOrders.map(co => (
                <tr key={co.id} style={{ transition: 'background 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(139,92,246,0.05)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  {!isStallManager && <td style={tableCellStyle}>{co.stall_number || '-'}</td>}
                  <td style={tableCellStyle}><strong>{co.name}</strong></td>
                  <td style={{...tableCellStyle, fontWeight: 600, color: parseFloat(co.pending_amount) > 0 ? '#ef4444' : '#10b981'}}>
                    ₹{parseFloat(co.pending_amount).toFixed(2)}
                  </td>
                  <td style={tableCellStyle}>
                    {parseFloat(co.pending_amount) > 0 ? (
                      <button onClick={() => fetchLedgerItems(co.id, co.name)} style={{
                        background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa',
                        border: '1px solid rgba(139, 92, 246, 0.4)', padding: '6px 14px',
                        borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem',
                        transition: 'all 0.2s'
                      }}>📋 Ledger</button>
                    ) : (
                      <span style={{ color: '#10b981', fontSize: '0.85rem' }}>✓ Settled</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // ============================================================
  // RENDER: DIGITAL RECEIVABLES
  // ============================================================
  const renderDigitalReceivables = () => {
    // If a ledger is open, show the item-level detail view
    if (receivablesLedger) {
      const totalPending = receivablesLedger.items.reduce((s, o) => s + parseFloat(o.total_price || (o.quantity * o.price)), 0);
      return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ color: '#e2e8f0', margin: 0 }}>
                📋 Unsettled Items — <span style={{ color: '#a78bfa' }}>{receivablesLedger.payment_mode}</span>
              </h3>
              <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                {receivablesLedger.items.length} item(s) pending settlement by Central Admin
              </p>
            </div>
            <button onClick={() => setReceivablesLedger(null)} style={{
              background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.2)',
              padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500
            }}>← Back</button>
          </div>

          {/* Summary banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px', padding: '16px 20px', marginBottom: '20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <span style={{ color: '#fca5a5', fontSize: '0.85rem' }}>Total Unsettled Amount</span>
              <div style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 700 }}>₹{totalPending.toFixed(2)}</div>
            </div>
            <div style={{ color: '#fca5a5', fontSize: '0.8rem' }}>
              These items were paid via {receivablesLedger.payment_mode}.<br/>Central Admin will settle the dues.
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(139,92,246,0.05)' }}>
                <th style={tableHeaderStyle}>Order #</th>
                <th style={tableHeaderStyle}>Date & Time</th>
                <th style={tableHeaderStyle}>Source</th>
                <th style={tableHeaderStyle}>Items</th>
                <th style={tableHeaderStyle}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const grouped = receivablesLedger.items.reduce((acc, o) => {
                  if (!acc[o.order_id]) {
                    acc[o.order_id] = {
                      order_id: o.order_id,
                      token_number: o.token_number,
                      order_date: o.order_date,
                      order_source: o.order_source,
                      items: [],
                      total_price: 0
                    };
                  }
                  acc[o.order_id].items.push(`${o.item_name} (x${o.quantity})`);
                  acc[o.order_id].total_price += parseFloat(o.total_price || (o.quantity * o.price));
                  return acc;
                }, {});
                return Object.values(grouped).sort((a,b) => new Date(b.order_date) - new Date(a.order_date)).map((o, idx) => (
                  <tr key={idx} style={{ transition: 'background 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(139,92,246,0.05)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={tableCellStyle}>#{o.token_number || o.order_id}</td>
                    <td style={{...tableCellStyle, fontSize: '0.85rem'}}>{o.order_date ? new Date(o.order_date).toLocaleString() : '-'}</td>
                    <td style={tableCellStyle}>
                      <span style={{
                        background: o.order_source === 'QR' ? 'rgba(6,182,212,0.15)' : 'rgba(139,92,246,0.15)',
                        color: o.order_source === 'QR' ? '#06b6d4' : '#a78bfa',
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem'
                      }}>{o.order_source || 'POS'}</span>
                    </td>
                    <td style={{...tableCellStyle, fontSize: '0.85rem', maxWidth: '250px', whiteSpace: 'normal'}}>{o.items.join(', ')}</td>
                    <td style={{...tableCellStyle, color: '#ef4444', fontWeight: 600}}>₹{o.total_price.toFixed(2)}</td>
                  </tr>
                ));
              })()}
              {receivablesLedger.items.length === 0 && (
                <tr><td colSpan="5" style={{...tableCellStyle, textAlign: 'center', color: '#64748b'}}>No unsettled items found</td></tr>
              )}
            </tbody>
            {receivablesLedger.items.length > 0 && (
              <tfoot>
                <tr style={{ background: 'rgba(239,68,68,0.05)' }}>
                  <td colSpan="4" style={{...tableCellStyle, textAlign: 'right', fontWeight: 600, color: '#fca5a5'}}>TOTAL PENDING</td>
                  <td style={{...tableCellStyle, color: '#ef4444', fontWeight: 700, fontSize: '1.1rem'}}>₹{totalPending.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      );
    }

    // Default: summary table
    return (
      <div>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: '#f8fafc' }}>💳 Digital Receivables</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '15px' }}>
          Amount owed <strong style={{color:'#a78bfa'}}>to your stall</strong> from digital payment transactions (Credit, RFID, Mess Plan).
        </p>
        <div style={{ background: '#16161e', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                <th style={tableHeaderStyle}>Payment Mode</th>
                <th style={tableHeaderStyle}>Pending Receivables</th>
                <th style={tableHeaderStyle}>Ledger</th>
              </tr>
            </thead>
            <tbody>
              {digitalReceivables.length === 0 ? (
                <tr><td colSpan="3" style={{...tableCellStyle, textAlign: 'center', color: '#64748b'}}>🎉 No pending receivables — all settled!</td></tr>
              ) : (
                digitalReceivables.map((r, i) => (
                  <tr key={i} style={{ transition: 'background 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(139,92,246,0.05)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={tableCellStyle}>
                      <span style={{
                        background: r.payment_mode === 'Credit' ? 'rgba(245,158,11,0.15)' : r.payment_mode === 'RFID Wallet' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                        color: r.payment_mode === 'Credit' ? '#f59e0b' : r.payment_mode === 'RFID Wallet' ? '#3b82f6' : '#10b981',
                        padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600
                      }}>
                        {r.payment_mode}
                      </span>
                    </td>
                    <td style={{...tableCellStyle, color: '#ef4444', fontWeight: 700, fontSize: '1rem'}}>
                      ₹{parseFloat(r.pending_settlement).toFixed(2)}
                    </td>
                    <td style={tableCellStyle}>
                      {parseFloat(r.pending_settlement) > 0 ? (
                        <button onClick={() => fetchReceivablesLedger(r.payment_mode)} style={{
                          background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa',
                          border: '1px solid rgba(139, 92, 246, 0.4)', padding: '6px 14px',
                          borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem',
                          transition: 'all 0.2s'
                        }}>📋 Ledger</button>
                      ) : (
                        <span style={{ color: '#10b981', fontSize: '0.85rem' }}>✓ Settled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER: COMMON EXPENSES (Read-only for stall managers)
  // ============================================================
  const renderCommonExpenses = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div>
          <h3 style={{ color: '#e2e8f0', margin: 0 }}>📊 Common Expenses History</h3>
          {isStallManager && (
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              These common expenses are shared across all stalls and managed by Central Admin.
            </p>
          )}
        </div>
      </div>

      <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#1e1e24' }}>
            <tr style={{ background: 'rgba(139,92,246,0.05)' }}>
              <th style={tableHeaderStyle}>Date</th>
              <th style={tableHeaderStyle}>Category</th>
              <th style={tableHeaderStyle}>Description</th>
              <th style={tableHeaderStyle}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr><td colSpan="4" style={{...tableCellStyle, textAlign: 'center', color: '#64748b'}}>No common expenses recorded</td></tr>
            ) : (
              expenses.map(ex => (
                <tr key={ex.id} style={{ transition: 'background 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(139,92,246,0.05)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={tableCellStyle}>{new Date(ex.expense_date).toLocaleDateString()}</td>
                  <td style={tableCellStyle}>
                    <span style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                      {ex.category}
                    </span>
                  </td>
                  <td style={tableCellStyle}>{ex.description || '-'}</td>
                  <td style={{...tableCellStyle, color: '#ef4444', fontWeight: 600}}>₹{parseFloat(ex.amount).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ===== DUES TO ADMIN TABLE (stall managers only) ===== */}
      {isStallManager && (
        <div style={{ marginTop: '36px' }}>
          <h3 style={{ color: '#e2e8f0', marginBottom: '6px' }}>🧾 Shared Costs & Commission Dues (You → Admin)</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '16px' }}>
            Settlements calculated by Admin — includes your share of common expenses + commission owed.
          </p>
          {myDues.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '32px', color: '#64748b',
              background: 'rgba(255,255,255,0.02)', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              🎉 No dues to Admin — nothing owed right now!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
                <thead>
                  <tr style={{ background: 'rgba(239,68,68,0.06)' }}>
                    <th style={tableHeaderStyle}>Billing Period</th>
                    <th style={tableHeaderStyle}>Split Common Expenses</th>
                    <th style={tableHeaderStyle}>Commission Owed</th>
                    <th style={tableHeaderStyle}>Total Owed</th>
                    <th style={tableHeaderStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myDues.map(d => {
                    const isPending = d.status === 'Pending';
                    return (
                      <tr key={d.id}
                          style={{ transition: 'background 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.04)'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={tableCellStyle}>
                          <div style={{ fontWeight: 500 }}>
                            {new Date(d.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            → {new Date(d.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td style={{...tableCellStyle, color: '#fca5a5'}}>
                          ₹{parseFloat(d.common_area_cost).toFixed(2)}
                        </td>
                        <td style={{...tableCellStyle, color: '#fca5a5'}}>
                          ₹{parseFloat(d.commission_amount).toFixed(2)}
                        </td>
                        <td style={{...tableCellStyle, color: '#ef4444', fontWeight: 700, fontSize: '1rem'}}>
                          ₹{parseFloat(d.dues_to_admin).toFixed(2)}
                        </td>
                        <td style={tableCellStyle}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background: isPending ? 'rgba(251,146,60,0.15)' : 'rgba(16,185,129,0.15)',
                            color: isPending ? '#fb923c' : '#10b981',
                            border: `1px solid ${isPending ? 'rgba(251,146,60,0.4)' : 'rgba(16,185,129,0.4)'}`
                          }}>
                            {isPending ? '⏳ Pending' : '✅ Settled'}
                          </span>
                          {!isPending && d.settled_at && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                              Paid on {new Date(d.settled_at).toLocaleDateString('en-IN')}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'rgba(239,68,68,0.06)' }}>
                    <td colSpan="3" style={{...tableCellStyle, textAlign: 'right', fontWeight: 600, color: '#fca5a5'}}>TOTAL PENDING DUES</td>
                    <td style={{...tableCellStyle, color: '#ef4444', fontWeight: 700, fontSize: '1.05rem'}}>
                      ₹{myDues.filter(d => d.status === 'Pending').reduce((s, d) => s + parseFloat(d.dues_to_admin || 0), 0).toFixed(2)}
                    </td>
                    <td style={tableCellStyle}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ============================================================
  // RENDER: MY PERFORMANCE (Interactive Charts for Stall Managers)
  // ============================================================
  const renderMyPerformance = () => {
    if (isStallManager) {
      // Stall Manager: Rich interactive dashboard
      if (!myStats) {
        return <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Loading your performance data...</div>;
      }

      const { summary } = myStats;

      return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#e2e8f0', margin: 0 }}>
              📈 My Performance — <span style={{ color: '#a78bfa' }}>{summary.name || 'My Stall'}</span>
              {summary.stall_number && <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '8px' }}>Stall #{summary.stall_number}</span>}
            </h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input type="date" className="form-control" style={{ width: 'auto', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} value={performanceStartDate} onChange={(e) => setPerformanceStartDate(e.target.value)} />
              <span style={{ color: '#94a3b8' }}>to</span>
              <input type="date" className="form-control" style={{ width: 'auto', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} value={performanceEndDate} onChange={(e) => setPerformanceEndDate(e.target.value)} />
              <button className="btn btn-primary" onClick={fetchMyStats}>Filter</button>
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap' }}>
            <StatCard icon="🛒" label="Total Orders" value={summary.footfall || 0} color="#8b5cf6" subtext={myStats.dateFiltered ? "In selected period" : "Lifetime orders"} />
            <StatCard icon="💰" label="Total Revenue" value={`₹${parseFloat(summary.total_sales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} color="#10b981" subtext={myStats.dateFiltered ? "In selected period" : "Lifetime revenue"} />
            <StatCard icon="📊" label="Avg Order Value" value={`₹${parseFloat(summary.aov || 0).toFixed(2)}`} color="#06b6d4" subtext={myStats.dateFiltered ? "In selected period" : "Per order average"} />
            <StatCard icon="🍽️" label="Menu Items" value={summary.total_menu_items || 0} color="#f59e0b" subtext="Active menu items" />
          </div>
        </div>
      );
    }

    // Central Admin: Show all vendors table
    return (
      <div>
        <h3 style={{ color: '#e2e8f0', marginBottom: '15px' }}>📈 All Vendor Performance Analytics</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(139,92,246,0.05)' }}>
              <th style={tableHeaderStyle}>Vendor Name</th>
              <th style={tableHeaderStyle}>Stall #</th>
              <th style={tableHeaderStyle}>Total Footfall</th>
              <th style={tableHeaderStyle}>Total Sales</th>
              <th style={tableHeaderStyle}>Avg Order Value (AOV)</th>
            </tr>
          </thead>
          <tbody>
            {performanceData.length === 0 ? (
              <tr><td colSpan="5" style={{...tableCellStyle, textAlign: 'center'}}>No performance data available</td></tr>
            ) : (
              performanceData.map(pd => (
                <tr key={pd.id}>
                  <td style={tableCellStyle}>{pd.name}</td>
                  <td style={tableCellStyle}>{pd.stall_number || '-'}</td>
                  <td style={tableCellStyle}>{pd.footfall} orders</td>
                  <td style={{...tableCellStyle, color: '#10b981', fontWeight: 600}}>₹{parseFloat(pd.total_sales).toFixed(2)}</td>
                  <td style={tableCellStyle}>₹{parseFloat(pd.aov).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="module-container" style={{ padding: '20px', color: '#e2e8f0' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '20px', color: '#f8fafc' }}>
        Stall Insights
      </h2>
      
      {/* Sub-tab navigation */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
        <button onClick={() => setActiveSubTab('central_orders')} style={tabStyle('central_orders')}>
          Central Orders
        </button>
        <button onClick={() => setActiveSubTab('digital_receivables')} style={tabStyle('digital_receivables')}>
          Digital Receivables
        </button>
        <button onClick={() => setActiveSubTab('common_expenses')} style={tabStyle('common_expenses')}>
          Common Expenses
        </button>
        <button onClick={() => setActiveSubTab('my_performance')} style={tabStyle('my_performance')}>
          My Performance
        </button>
      </div>

      {/* Content Area */}
      <div style={{ background: '#1e1e24', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        {activeSubTab === 'central_orders' && renderCentralOrders()}
        {activeSubTab === 'digital_receivables' && renderDigitalReceivables()}
        {activeSubTab === 'common_expenses' && renderCommonExpenses()}
        {activeSubTab === 'my_performance' && renderMyPerformance()}
      </div>
    </div>
  );
}

export default StallInsights;
