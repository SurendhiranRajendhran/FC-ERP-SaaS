import re

file_path = r'c:\Users\surendhiran.R\Desktop\ERP\frontend\src\App.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add handleKdsStart next to handleKdsStatusUpdate
handle_start_func = """  const handleKdsStart = async (orderId) => {
    try {
      let targetVendorId;
      if (user && user.role !== 'Owner' && user.role !== 'Super Admin') {
        targetVendorId = user.vendor_id ? String(user.vendor_id) : 'null';
      } else {
        targetVendorId = (selectedVendorId !== 'all') ? String(selectedVendorId) : 'all';
      }
      const res = await fetch(`${API_BASE}/kds/orders/${orderId}/start`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: targetVendorId })
      });
      if (res.ok) {
        showToast('Preparation started', 'success');
        fetchKdsOrders();
        if (kdsShowHistory) fetchKdsHistory();
        fetchOrders();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to start preparation', 'error');
      }
    } catch (err) {
      showToast('API communication failed', 'error');
    }
  };

  const handleKdsStatusUpdate = async (orderId, newStatus) => {"""

content = content.replace("  const handleKdsStatusUpdate = async (orderId, newStatus) => {", handle_start_func)

# 2. Modify KDS card rendering inside kds-grid
kds_card_old = """                            <div
                              key={order.id}
                              className={`kds-card age-${ageClass} ${statusClass}`}
                            >
                              {/* Card Header */}
                              <div className="kds-card-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span className="kds-token">{order.token_number}</span>
                                  <span className="kds-source-badge" style={{ fontSize: '0.8rem', padding: '2px 6px', borderRadius: '4px', background: order.order_source === 'QR' ? 'var(--accent-primary)' : '#64748b', color: '#fff' }}>
                                    {order.order_source === 'QR' ? '📱 QR' : '🖥️ POS'}
                                  </span>
                                  <span className={`kds-status-badge ${order.status.toLowerCase()}`}>
                                    {order.status === 'Pending' ? '🕒 Pending' : '🍳 Preparing'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span className="kds-payment-tag">{order.payment_mode}</span>
                                  <div className={`kds-timer ${ageClass}`}>
                                    <svg className="kds-timer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                    {formatElapsed(elapsed)}
                                  </div>
                                </div>
                              </div>
                              
                              <div style={{ padding: '0.5rem 1rem 0 1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {order.customer_name && (
                                  <div className="kds-customer-name" style={{ fontWeight: 'bold', color: 'var(--accent-primary)', fontSize: '0.9rem' }}>
                                    👤 {order.customer_name}
                                  </div>
                                )}
                                {order.pickup_slot && (
                                  <div style={{ alignSelf: 'flex-start', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--accent-primary)', color: '#fff', fontWeight: 'bold' }}>
                                    ⏰ Pickup: {order.pickup_slot}
                                  </div>
                                )}
                              </div>

                              {/* Delayed Alert */}
                              {ageClass === 'critical' && (
                                <div className="kds-delayed-badge">
                                  ⚠ Delayed — {Math.floor(elapsed / 60)} min waiting
                                </div>
                              )}

                              {/* Items List */}
                              <div className="kds-items-list">
                                {order.items && order.items.map((item, idx) => (
                                  <div key={idx} className="kds-item-block" style={{ padding: '0.4rem 0', borderBottom: idx < order.items.length - 1 ? '1px dashed var(--border-color)' : 'none' }}>
                                    <div className="kds-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span
                                          className="kds-item-category-dot"
                                          style={{
                                            background:
                                              item.category === 'Breakfast' ? '#f59e0b' :
                                              item.category === 'Lunch' ? '#3b82f6' :
                                              item.category === 'Snacks' ? '#ef4444' :
                                              item.category === 'Beverages' ? '#10b981' :
                                              '#8b5cf6'
                                          }}
                                        />
                                        <span className="kds-item-name" style={{ fontWeight: '600' }}>{item.name}</span>
                                      </div>
                                      <span className="kds-item-qty" style={{ fontWeight: 'bold' }}>×{item.quantity}</span>
                                    </div>
                                    
                                    {(item.spice_level || item.special_instructions) && (
                                      <div style={{ paddingLeft: '20px', display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                                        {item.spice_level && (
                                          <span style={{ fontSize: '0.75rem', padding: '1px 5px', borderRadius: '3px', background: item.spice_level === 'Hot' ? '#fee2e2' : item.spice_level === 'Medium' ? '#fffbeb' : '#f0fdf4', color: item.spice_level === 'Hot' ? '#dc2626' : item.spice_level === 'Medium' ? '#d97706' : '#16a34a', border: '1px solid currentColor', fontWeight: '500' }}>
                                            🌶️ {item.spice_level}
                                          </span>
                                        )}
                                        {item.special_instructions && (
                                          <span style={{ fontSize: '0.75rem', padding: '1px 5px', borderRadius: '3px', background: 'var(--bg-color)', color: 'var(--text-color-secondary)', border: '1px solid var(--border-color)', fontStyle: 'italic' }}>
                                            📝 "{item.special_instructions}"
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {/* Action Buttons */}
                              <div className="kds-card-footer">
                                {order.status === 'Pending' && (
                                  <button
                                    className="kds-action-btn start"
                                    onClick={() => handleKdsStatusUpdate(order.id, 'Preparing')}
                                  >
                                    ▶ Start
                                  </button>
                                )}
                                {['Preparing', 'Partially Ready', 'Pending'].includes(order.status) && (
                                  <button
                                    className="kds-action-btn ready"
                                    onClick={() => handleKdsStatusUpdate(order.id, 'Ready')}
                                  >
                                    ✓ Ready
                                  </button>
                                )}
                                <button
                                  className="kds-action-btn cancel"
                                  onClick={() => {
                                    setCancelModal({ show: true, orderId: order.id, tokenNumber: order.token_number, pin: '', reason: '', step: 1 });
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>"""

kds_card_new = """                            <div
                              key={order.id}
                              className={`kds-card age-${ageClass} ${statusClass}`}
                            >
                              {/* Card Header */}
                              <div className="kds-card-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span className="kds-token">{order.token_number}</span>
                                  <span className="kds-source-badge" style={{ fontSize: '0.8rem', padding: '2px 6px', borderRadius: '4px', background: order.order_source === 'QR' ? 'var(--accent-primary)' : '#64748b', color: '#fff' }}>
                                    {order.order_source === 'QR' ? '📱 QR' : '🖥️ POS'}
                                  </span>
                                  <span className={`kds-status-badge ${order.status.toLowerCase().replace(' ', '-')}`}>
                                    {order.status === 'Pending' ? '🕒 Pending' : order.status === 'Preparing' ? '🍳 Preparing' : order.status === 'Partially Ready' ? '⏳ Partially Ready' : order.status}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span className="kds-payment-tag">{order.payment_mode}</span>
                                  <div className={`kds-timer ${ageClass}`}>
                                    <svg className="kds-timer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                    {formatElapsed(elapsed)}
                                  </div>
                                </div>
                              </div>
                              
                              <div style={{ padding: '0.5rem 1rem 0 1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {order.customer_name && (
                                  <div className="kds-customer-name" style={{ fontWeight: 'bold', color: 'var(--accent-primary)', fontSize: '0.9rem' }}>
                                    👤 {order.customer_name}
                                  </div>
                                )}
                                {order.pickup_slot && (
                                  <div style={{ alignSelf: 'flex-start', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--accent-primary)', color: '#fff', fontWeight: 'bold' }}>
                                    ⏰ Pickup: {order.pickup_slot}
                                  </div>
                                )}
                              </div>

                              {/* Delayed Alert */}
                              {ageClass === 'critical' && (
                                <div className="kds-delayed-badge">
                                  ⚠ Delayed — {Math.floor(elapsed / 60)} min waiting
                                </div>
                              )}

                              {/* Items List - With Vendor Grouping Support */}
                              <div className="kds-items-list">
                                {(() => {
                                  if (!order.items) return null;
                                  // Determine if we need to group by vendor (Expo view usually has vendor_name)
                                  const isExpoView = order.items.some(item => item.vendor_name);
                                  
                                  const itemsToRender = order.items;
                                  
                                  // If Expo View, group by vendor
                                  if (isExpoView) {
                                    const groupedItems = itemsToRender.reduce((acc, item) => {
                                      const vName = item.vendor_name || 'Central Canteen';
                                      if (!acc[vName]) acc[vName] = [];
                                      acc[vName].push(item);
                                      return acc;
                                    }, {});
                                    
                                    return Object.entries(groupedItems).map(([vendorName, vItems], vIdx) => (
                                      <div key={vIdx} className="kds-vendor-group">
                                        <div className="kds-vendor-header">
                                          {vendorName === 'Central Canteen' ? '🏠' : '🏪'} {vendorName}
                                        </div>
                                        {vItems.map((item, idx) => (
                                          <div key={`${vIdx}-${idx}`} className="kds-item-block">
                                            <div className="kds-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span className={`item-status-chip ${item.item_status ? item.item_status.toLowerCase() : 'pending'}`}>
                                                  {item.item_status === 'Pending' ? '🟡' : item.item_status === 'Preparing' ? '🔵' : '🟢 ✓'}
                                                </span>
                                                <span className="kds-item-name" style={{ fontWeight: '600' }}>{item.name}</span>
                                              </div>
                                              <span className="kds-item-qty" style={{ fontWeight: 'bold' }}>×{item.quantity}</span>
                                            </div>
                                            {(item.spice_level || item.special_instructions) && (
                                              <div style={{ paddingLeft: '32px', display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                                                {item.spice_level && (
                                                  <span style={{ fontSize: '0.75rem', padding: '1px 5px', borderRadius: '3px', background: item.spice_level === 'Hot' ? '#fee2e2' : item.spice_level === 'Medium' ? '#fffbeb' : '#f0fdf4', color: item.spice_level === 'Hot' ? '#dc2626' : item.spice_level === 'Medium' ? '#d97706' : '#16a34a', border: '1px solid currentColor', fontWeight: '500' }}>
                                                    🌶️ {item.spice_level}
                                                  </span>
                                                )}
                                                {item.special_instructions && (
                                                  <span style={{ fontSize: '0.75rem', padding: '1px 5px', borderRadius: '3px', background: 'var(--bg-color)', color: 'var(--text-color-secondary)', border: '1px solid var(--border-color)', fontStyle: 'italic' }}>
                                                    📝 "{item.special_instructions}"
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ));
                                  } else {
                                    // Normal Stall View
                                    return itemsToRender.map((item, idx) => (
                                      <div key={idx} className="kds-item-block" style={{ padding: '0.4rem 0', borderBottom: idx < itemsToRender.length - 1 ? '1px dashed var(--border-color)' : 'none' }}>
                                        <div className="kds-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className={`item-status-chip ${item.item_status ? item.item_status.toLowerCase() : 'pending'}`}>
                                              {item.item_status === 'Pending' ? '🟡' : item.item_status === 'Preparing' ? '🔵' : '🟢 ✓'}
                                            </span>
                                            <span className="kds-item-name" style={{ fontWeight: '600' }}>{item.name}</span>
                                          </div>
                                          <span className="kds-item-qty" style={{ fontWeight: 'bold' }}>×{item.quantity}</span>
                                        </div>
                                        
                                        {(item.spice_level || item.special_instructions) && (
                                          <div style={{ paddingLeft: '32px', display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                                            {item.spice_level && (
                                              <span style={{ fontSize: '0.75rem', padding: '1px 5px', borderRadius: '3px', background: item.spice_level === 'Hot' ? '#fee2e2' : item.spice_level === 'Medium' ? '#fffbeb' : '#f0fdf4', color: item.spice_level === 'Hot' ? '#dc2626' : item.spice_level === 'Medium' ? '#d97706' : '#16a34a', border: '1px solid currentColor', fontWeight: '500' }}>
                                                🌶️ {item.spice_level}
                                              </span>
                                            )}
                                            {item.special_instructions && (
                                              <span style={{ fontSize: '0.75rem', padding: '1px 5px', borderRadius: '3px', background: 'var(--bg-color)', color: 'var(--text-color-secondary)', border: '1px solid var(--border-color)', fontStyle: 'italic' }}>
                                                📝 "{item.special_instructions}"
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ));
                                  }
                                })()}
                              </div>

                              {/* Action Buttons */}
                              <div className="kds-card-footer" style={{ flexDirection: 'column' }}>
                                {(() => {
                                  const relevantItems = order.items ? order.items.filter(i => i.is_own !== 0) : [];
                                  const hasPending = relevantItems.some(i => i.item_status === 'Pending');
                                  const allPreparing = relevantItems.length > 0 && relevantItems.every(i => i.item_status === 'Preparing');
                                  
                                  return (
                                    <div style={{ display: 'flex', width: '100%', gap: '10px' }}>
                                      {hasPending && (
                                        <button
                                          className="kds-action-btn start"
                                          onClick={() => handleKdsStart(order.id)}
                                          style={{ flex: 1 }}
                                        >
                                          ▶ Start
                                        </button>
                                      )}
                                      {!hasPending && allPreparing && (
                                        <button
                                          className="kds-action-btn ready"
                                          onClick={() => handleKdsStatusUpdate(order.id, 'Ready')}
                                          style={{ flex: 1 }}
                                        >
                                          ✓ Ready
                                        </button>
                                      )}
                                      <button
                                        className="kds-action-btn cancel"
                                        onClick={() => {
                                          setCancelModal({ show: true, orderId: order.id, tokenNumber: order.token_number, pin: '', reason: '', step: 1 });
                                        }}
                                        style={{ width: '40px', flex: 'none' }}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  );
                                })()}
                                {order.is_expo && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)', textAlign: 'center', marginTop: '6px' }}>
                                    (Controls Central items only)
                                  </div>
                                )}
                              </div>
                            </div>"""
if kds_card_old in content:
    content = content.replace(kds_card_old, kds_card_new)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully patched App.jsx")
else:
    print("Could not find the KDS card block to replace. Please check the content.")
