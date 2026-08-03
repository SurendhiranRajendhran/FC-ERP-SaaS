import { useState, useEffect, useRef } from 'react';

/* ─── API base: uses same origin so LAN IP works on mobile ─── */
const QR_API_BASE = window.location.origin;

/* ─── Category emoji map ─── */
const CAT_EMOJI = {
  Breakfast: '🌅', Lunch: '☀️', Snacks: '🍿',
  Beverages: '☕', Combos: '🍱', Specials: '⭐',
  Dinner: '🌙', Desserts: '🍮', default: '🍽️'
};
const getCatEmoji = c => CAT_EMOJI[c] || CAT_EMOJI.default;

export default function QRMenu() {
  /* ── State ── */
  const [items, setItems]               = useState([]);
  const [combos, setCombos]             = useState([]);
  const [categories, setCategories]     = useState([]);
  const [selCat, setSelCat]             = useState('All');
  const [cart, setCart]                 = useState([]);
  const [step, setStep]                 = useState(1);       // 1 menu | 2 cart | 3 checkout | 4 success
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber]   = useState('');
  const [tenantId, setTenantId]         = useState('');
  const [orderStatus, setOrderStatus]   = useState(null);
  const [loading, setLoading]           = useState(false);
  const [fetchError, setFetchError]     = useState(false);
  const [cartAnim, setCartAnim]         = useState(false);
  const [pickupSlot, setPickupSlot]     = useState('Immediate');
  const [liveStatus, setLiveStatus]     = useState('Pending');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackName, setFeedbackName] = useState('');
  const qrCanvasRef                     = useRef(null);
  const pollIntervalRef                 = useRef(null);

  /* ── Derived ── */
  const cartTotal  = cart.reduce((s, i) => s + parseFloat(i.is_special && i.special_price ? i.special_price : i.price) * i.quantity, 0);
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const filtered   = selCat === 'All' ? items : items.filter(i => i.category === selCat);

  /* ── On mount ── */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.has('table')) setTableNumber(p.get('table'));
    if (p.has('tenant')) setTenantId(p.get('tenant'));
  }, []);
  
  // We need to delay fetch until tenantId is set (if provided)
  useEffect(() => {
    fetchItems();
  }, [tenantId]);

  /* ── UPI QR on checkout step ── */
  useEffect(() => {
    if (step === 3 && qrCanvasRef.current) {
      const url = `upi://pay?pa=canteen@upi&pn=CampusCanteen&am=${cartTotal.toFixed(2)}&tn=FoodOrder&cu=INR`;
      import('qrcode').then(m => {
        const QRCode = m.default || m;
        QRCode.toCanvas(qrCanvasRef.current, url, { width: 220, margin: 2, color: { dark: '#1a202c', light: '#ffffff' } }, () => {});
      }).catch(e => console.error("Failed to load QRCode module", e));
    }
  }, [step, cartTotal]);

  /* ── Data ── */
  const fetchItems = async () => {
    try {
      const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
      const [rItems, rCombos] = await Promise.all([
        fetch(`${QR_API_BASE}/api/items`, { headers }),
        fetch(`${QR_API_BASE}/api/combos`, { headers })
      ]);
      const d = await rItems.json();
      const combosData = await rCombos.json();
      const active = d.filter(i => i.is_active);
      setItems(active);
      setCombos(combosData);
      setCategories(['All', ...new Set(active.map(i => i.category).filter(Boolean))]);
    } catch { setFetchError(true); }
  };

  /* ── Status Polling & Audio Chime ── */
  useEffect(() => {
    if (step === 4 && orderStatus?.id) {
      setLiveStatus('Pending');
      const checkStatus = async () => {
        try {
          const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
          const res = await fetch(`${QR_API_BASE}/api/orders/${orderStatus.id}/status`, { headers });
          if (res.ok) {
            const data = await res.json();
            setLiveStatus(data.status);
          }
        } catch (e) {
          console.error("Error polling order status:", e);
        }
      };

      checkStatus();
      pollIntervalRef.current = setInterval(checkStatus, 5000);
      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    }
  }, [step, orderStatus]);

  useEffect(() => {
    if (liveStatus === 'Ready') {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav');
        audio.play().catch(() => {});
      } catch (e) {}
    }
  }, [liveStatus]);

  /* ── Cart ── */
  const addToCart = item => {
    setCartAnim(true); setTimeout(() => setCartAnim(false), 300);
    setCart(p => {
      const ex = p.find(c => c.id === item.id);
      return ex ? p.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
                : [...p, { ...item, quantity: 1, spiceLevel: 'Medium', specialInstructions: '' }];
    });
  };
  const removeFromCart = id => setCart(p => {
    const ex = p.find(c => c.id === id);
    if (!ex) return p;
    return ex.quantity === 1 ? p.filter(c => c.id !== id) : p.map(c => c.id === id ? { ...c, quantity: c.quantity - 1 } : c);
  });
  const updateCartItemCustomization = (id, key, val) => {
    setCart(p => p.map(c => c.id === id ? { ...c, [key]: val } : c));
  };
  const getQty = id => (cart.find(c => c.id === id) || {}).quantity || 0;

  /* ── Checkout ── */
  const handleCheckout = async () => {
    if (!customerName.trim()) { alert('Please enter your name to continue.'); return; }
    setLoading(true);
    setTimeout(async () => {
      try {
        const payload = {
          items: cart.map(c => ({
            item_id: c.id,
            quantity: c.quantity,
            spice_level: c.spiceLevel || 'Medium',
            special_instructions: c.specialInstructions || null
          })),
          payment_mode: 'UPI', order_source: 'QR',
          customer_name: `${customerName.trim()}${tableNumber ? ` (T-${tableNumber})` : ''}`,
          customer_phone: customerPhone,
          pickup_slot: pickupSlot === 'Immediate' ? null : pickupSlot
        };
        const headers = { 'Content-Type': 'application/json' };
        if (tenantId) headers['x-tenant-id'] = tenantId;
        const r = await fetch(`${QR_API_BASE}/api/orders`, {
          method: 'POST', headers,
          body: JSON.stringify(payload)
        });
        const d = await r.json();
        const id = d.order_id || d.orderId;
        if (id) { setOrderStatus({ token: d.token_number, id }); setStep(4); setCart([]); }
        else alert(d.error || 'Order failed. Please try again.');
      } catch { alert('Network error. Please check your connection.'); }
      finally { setLoading(false); }
    }, 1500);
  };

  /* ── Feedback ── */
  const submitFeedback = async () => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (tenantId) headers['x-tenant-id'] = tenantId;
      await fetch(`${QR_API_BASE}/api/feedback`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          order_id: orderStatus?.id || null,
          customer_name: feedbackName || customerName || 'Walk-in Customer',
          rating: feedbackRating,
          comments: feedbackComment,
          feedback_date: new Date().toLocaleDateString('en-CA')
        })
      });
      setShowFeedback(false);
      setFeedbackRating(5);
      setFeedbackComment('');
      setFeedbackName('');
      alert('Thank you for your feedback!');
    } catch (e) {
      console.error(e);
      alert('Failed to submit feedback.');
    }
  };

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <div style={S.root}>

      {/* ── TOP HEADER ── */}
      <div style={S.header}>
        <div style={S.headerInner}>
          {step > 1 && step < 4 ? (
            <button style={S.backBtn} onClick={() => setStep(s => s - 1)}>
              <span style={{ fontSize: 20 }}>‹</span>
            </button>
          ) : <div style={{ width: 40 }} />}
          <div style={S.headerCenter}>
            <div style={S.headerTitle}>
              {step === 1 ? '🍽️ Menu' : step === 2 ? '🛒 Cart' : step === 3 ? '💳 Checkout' : '✅ Confirmed!'}
            </div>
            {tableNumber && step < 4 && <div style={S.tablePill}>Table {tableNumber}</div>}
          </div>
          {step === 1 ? (
            <button onClick={() => setShowFeedback(true)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '4px 8px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Feedback
            </button>
          ) : (
            <div style={{ width: 40 }} />
          )}
        </div>

        {/* Step progress bar */}
        <div style={S.progressBar}>
          {[1,2,3,4].map(n => (
            <div key={n} style={{ ...S.progressDot, background: step >= n ? '#fff' : 'rgba(255,255,255,0.3)', width: step === n ? 24 : 8 }} />
          ))}
        </div>
      </div>

      {/* ── SCROLL BODY ── */}
      <div style={S.body}>

        {/* ══ STEP 1: MENU ══ */}
        {step === 1 && (
          <div>
            {fetchError && (
              <div style={S.errorBanner}>
                ⚠️ Could not load menu. <button style={S.retryBtn} onClick={fetchItems}>Retry</button>
              </div>
            )}

            {/* Category scroll */}
            <div style={S.catScroll}>
              {categories.map(c => (
                <button key={c} style={{ ...S.catChip, ...(selCat === c ? S.catChipActive : {}) }}
                  onClick={() => setSelCat(c)}>
                  {c !== 'All' ? getCatEmoji(c) + ' ' : '🍽️ '}{c}
                </button>
              ))}
            </div>

            {/* Item count */}
            <div style={S.sectionLabel}>{filtered.length} items{selCat !== 'All' ? ` in ${selCat}` : ''}</div>

            {/* Item cards */}
            {filtered.length === 0 && !fetchError ? (
              <div style={S.emptyState}>
                <div style={{ fontSize: 48 }}>🍽️</div>
                <p style={{ color: '#94a3b8', marginTop: 8 }}>Loading menu...</p>
              </div>
            ) : (
              <div style={S.itemList}>
                {filtered.map(item => {
                  const qty = getQty(item.id);
                  return (
                    <div key={item.id} style={{ ...S.itemCard, ...(qty > 0 ? S.itemCardActive : {}) }}>
                      {/* Item image / placeholder */}
                      <div style={S.itemImageBox}>
                        {item.image_url
                          ? <img src={item.image_url} alt={item.name} style={S.itemImg} />
                          : <div style={S.itemPlaceholder}>{getCatEmoji(item.category)}</div>
                        }
                        {qty > 0 && <div style={S.qtyBadge}>{qty}</div>}
                      </div>

                      {/* Item info */}
                      <div style={S.itemInfo}>
                        <div style={S.itemName}>{item.name}</div>
                        {item.category === 'Combos' && combos.some(c => c.combo_id === item.id) && (
                          <div style={{ fontSize: 11, color: MUTED, marginBottom: 4, lineHeight: 1.3 }}>
                            {combos.filter(c => c.combo_id === item.id).map(c => `${c.child_name || ''} (x${c.quantity})`).join(' • ')}
                          </div>
                        )}
                        <div style={S.itemPrice}>
                          {item.is_special && item.special_price ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.7rem', textDecoration: 'line-through', color: '#999' }}>₹{parseFloat(item.price).toFixed(0)}</span>
                              <span>₹{parseFloat(item.special_price).toFixed(0)}</span>
                            </div>
                          ) : (
                            <>₹{parseFloat(item.price).toFixed(0)}</>
                          )}
                        </div>
                      </div>

                      {/* Add / Qty controls */}
                      <div style={S.itemCtrl}>
                        {qty === 0 ? (
                          <button style={S.addBtn} onClick={() => addToCart(item)}>
                            <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
                          </button>
                        ) : (
                          <div style={S.qtyRow}>
                            <button style={S.qtyBtn} onClick={() => removeFromCart(item.id)}>−</button>
                            <span style={S.qtyNum}>{qty}</span>
                            <button style={S.qtyBtn} onClick={() => addToCart(item)}>+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom spacer for floating bar */}
            <div style={{ height: cart.length > 0 ? 96 : 24 }} />
          </div>
        )}

        {/* ══ STEP 2: CART ══ */}
        {step === 2 && (
          <div>
            {cart.length === 0 ? (
              <div style={S.emptyState}>
                <div style={{ fontSize: 56 }}>🛒</div>
                <div style={{ fontWeight: 700, fontSize: 18, marginTop: 16 }}>Your cart is empty</div>
                <p style={{ color: '#94a3b8', marginTop: 8 }}>Add items from the menu</p>
                <button style={{ ...S.primaryBtn, marginTop: 24 }} onClick={() => setStep(1)}>Browse Menu</button>
              </div>
            ) : (
              <div>
                {/* Cart items */}
                <div style={S.cartList}>
                  {cart.map(item => (
                    <div key={item.id} style={S.cartCard}>
                      <div style={S.cartMainRow}>
                        <div style={S.cartItemPlaceholder}>{getCatEmoji(item.category)}</div>
                        <div style={S.cartItemInfo}>
                          <div style={S.cartItemName}>{item.name}</div>
                          <div style={S.cartItemPrice}>₹{parseFloat(item.is_special && item.special_price ? item.special_price : item.price).toFixed(0)} each</div>
                        </div>
                        <div style={S.qtyRow}>
                          <button style={S.qtyBtn} onClick={() => removeFromCart(item.id)}>−</button>
                          <span style={S.qtyNum}>{item.quantity}</span>
                          <button style={S.qtyBtn} onClick={() => addToCart(item)}>+</button>
                        </div>
                        <div style={S.cartItemTotal}>₹{(parseFloat(item.is_special && item.special_price ? item.special_price : item.price) * item.quantity).toFixed(0)}</div>
                      </div>
                      
                      <div style={S.customizationBox}>
                        <div style={S.spiceContainer}>
                          <span style={S.custLabel}>🌶️ Spice Level:</span>
                          <div style={S.spiceButtonGroup}>
                            {['Mild', 'Medium', 'Hot'].map(level => (
                              <button key={level}
                                style={{ ...S.spiceButton, ...(item.spiceLevel === level ? S.spiceButtonActive : {}) }}
                                onClick={() => updateCartItemCustomization(item.id, 'spiceLevel', level)}>
                                {level}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div style={S.instructionsContainer}>
                          <input type="text" placeholder="Note (e.g. no onion, extra spicy, etc.)"
                            value={item.specialInstructions || ''}
                            onChange={e => updateCartItemCustomization(item.id, 'specialInstructions', e.target.value)}
                            style={S.custInput} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bill summary */}
                <div style={S.billCard}>
                  <div style={S.billTitle}>Bill Summary</div>
                  {cart.map(item => (
                    <div key={item.id} style={S.billRow}>
                      <span>{item.name} × {item.quantity}</span>
                      <span>₹{(parseFloat(item.is_special && item.special_price ? item.special_price : item.price) * item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                  <div style={S.billDivider} />
                  <div style={{ ...S.billRow, ...S.billTotal }}>
                    <span>Total</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button style={S.primaryBtn} onClick={() => setStep(3)}>
                  Proceed to Pay &nbsp;→
                </button>
                <button style={S.ghostBtn} onClick={() => setStep(1)}>+ Add More Items</button>
              </div>
            )}
            <div style={{ height: 32 }} />
          </div>
        )}

        {/* ══ STEP 3: CHECKOUT ══ */}
        {step === 3 && (
          <div>
            {/* Order summary pill */}
            <div style={S.summaryPill}>
              <span>🛒 {totalItems} item{totalItems > 1 ? 's' : ''}</span>
              <span style={{ fontWeight: 700 }}>₹{cartTotal.toFixed(2)}</span>
            </div>

            {/* Your details */}
            <div style={S.formCard}>
              <div style={S.formCardTitle}>Your Details</div>
              <div style={S.formGroup}>
                <label style={S.formLabel}>Name *</label>
                <input style={S.formInput} type="text" placeholder="e.g. Rahul Kumar"
                  value={customerName} onChange={e => setCustomerName(e.target.value)}
                  autoComplete="name" autoFocus />
              </div>
              <div style={S.formGroup}>
                <label style={S.formLabel}>Mobile Number (optional)</label>
                <input style={S.formInput} type="tel" placeholder="10-digit number"
                  value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  autoComplete="tel" />
              </div>
              <div style={S.formGroup}>
                <label style={S.formLabel}>🕒 Pickup / Pre-Order Slot</label>
                <select style={S.formInput}
                  value={pickupSlot} onChange={e => setPickupSlot(e.target.value)}>
                  <option value="Immediate">⚡ Prepare Immediately (Now)</option>
                  <option value="12:30 PM - 01:00 PM">⏰ Lunch Slot: 12:30 PM - 01:00 PM</option>
                  <option value="01:00 PM - 01:30 PM">⏰ Lunch Slot: 01:00 PM - 01:30 PM</option>
                  <option value="01:30 PM - 02:00 PM">⏰ Lunch Slot: 01:30 PM - 02:00 PM</option>
                  <option value="04:30 PM - 05:00 PM">⏰ Evening Snacks: 04:30 PM - 05:00 PM</option>
                  <option value="05:00 PM - 05:30 PM">⏰ Evening Snacks: 05:00 PM - 05:30 PM</option>
                </select>
              </div>
              {!tableNumber && (
                <div style={S.formGroup}>
                  <label style={S.formLabel}>Table Number (optional)</label>
                  <input style={S.formInput} type="text" placeholder="e.g. 5"
                    value={tableNumber} onChange={e => setTableNumber(e.target.value)} />
                </div>
              )}
            </div>

            {/* UPI QR */}
            <div style={S.upiCard}>
              <div style={S.upiTitle}>
                <span style={{ fontSize: 24 }}>💳</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Pay via UPI</div>
                  <div style={{ color: '#64748b', fontSize: 13 }}>Scan & pay before placing order</div>
                </div>
              </div>
              <div style={S.qrWrapper}>
                <canvas ref={qrCanvasRef} style={{ borderRadius: 8, display: 'block' }} />
              </div>
              <div style={S.upiAmount}>Amount: <strong>₹{cartTotal.toFixed(2)}</strong></div>
              <div style={S.upiHint}>After UPI payment, tap the button below to place your order</div>
            </div>

            <button style={{ ...S.primaryBtn, ...(loading ? S.primaryBtnLoading : {}) }}
              disabled={loading} onClick={handleCheckout}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={S.spinner} />  Placing Order...
                </span>
              ) : "✅  I've Paid — Confirm Order"}
            </button>
            <div style={{ height: 32 }} />
          </div>
        )}

        {/* ══ STEP 4: SUCCESS ══ */}
        {step === 4 && orderStatus && (
          <div style={S.successView}>
            <div style={S.successIconCircle}>✅</div>
            <h2 style={S.successTitle}>Order Confirmed!</h2>
            <p style={S.successSub}>Your payment was received & order is sent to kitchen.</p>

            <div style={S.tokenCard}>
              <div style={S.tokenLabel}>Your Token Number</div>
              <div style={S.tokenNumber}>{orderStatus.token}</div>
              <div style={S.tokenHint}>Please show this token when collecting your food</div>
            </div>

            <div style={S.statusCard}>
              <div style={S.statusHeader}>LIVE ORDER STATUS</div>
              <div style={{ ...S.statusPill, 
                background: liveStatus === 'Pending' ? '#f1f5f9' : 
                            liveStatus === 'Preparing' ? '#fffbeb' : 
                            liveStatus === 'Ready' ? '#d1fae5' : 
                            liveStatus === 'Cancelled' ? '#fef2f2' : '#f1f5f9',
                color: liveStatus === 'Pending' ? '#475569' : 
                       liveStatus === 'Preparing' ? '#d97706' : 
                       liveStatus === 'Ready' ? '#065f46' : 
                       liveStatus === 'Cancelled' ? '#991b1b' : '#475569',
                border: liveStatus === 'Pending' ? '1px solid #cbd5e1' : 
                        liveStatus === 'Preparing' ? '1px solid #fde68a' : 
                        liveStatus === 'Ready' ? '1px solid #a7f3d0' : 
                        liveStatus === 'Cancelled' ? '1px solid #fecaca' : '1px solid #cbd5e1'
              }}>
                <span style={{ marginRight: 8, fontSize: 18 }}>
                  {liveStatus === 'Pending' ? '🕒' :
                   liveStatus === 'Preparing' ? '🍳' :
                   liveStatus === 'Ready' ? '🎉' :
                   liveStatus === 'Completed' ? '✅' : '❌'}
                </span>
                <strong style={{ fontSize: 14 }}>
                  {liveStatus === 'Pending' ? 'Order Received (Awaiting Kitchen Prep)' :
                   liveStatus === 'Preparing' ? 'Chef is Preparing Your Food' :
                   liveStatus === 'Ready' ? 'Order is READY! Please Collect Now!' :
                   liveStatus === 'Completed' ? 'Completed & Collected' :
                   liveStatus === 'Cancelled' ? 'Order Cancelled' : liveStatus}
                </strong>
              </div>
              
              {liveStatus === 'Ready' && (
                <div style={{ color: '#065f46', fontSize: 12, marginTop: 8, fontWeight: 600, animation: 'pulse 1.5s infinite' }}>
                  🔔 Play Ready chime active!
                </div>
              )}
            </div>

            <button style={S.primaryBtn}
              onClick={() => { setStep(1); setOrderStatus(null); setCustomerName(''); setCustomerPhone(''); setPickupSlot('Immediate'); setLiveStatus('Pending'); }}>
              🍽️  Order More Items
            </button>
            <button style={{...S.ghostBtn, marginTop: 12, padding: 12}} onClick={() => setShowFeedback(true)}>
              ⭐ Leave Feedback
            </button>
            <div style={{ height: 40 }} />
          </div>
        )}
      </div>

      {/* ── FLOATING CART BAR (step 1 only) ── */}
      {step === 1 && cart.length > 0 && (
        <div style={{ ...S.floatingBar, transform: cartAnim ? 'scale(1.03)' : 'scale(1)' }}
          onClick={() => setStep(2)}>
          <div style={S.floatingLeft}>
            <div style={S.floatingBadge}>{totalItems}</div>
            <span style={{ fontWeight: 600, fontSize: 15 }}>View Cart</span>
          </div>
          <div style={S.floatingRight}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>₹{cartTotal.toFixed(2)}</span>
            <span style={{ fontSize: 18 }}>→</span>
          </div>
        </div>
      )}

      {/* ── FEEDBACK OVERLAY ── */}
      {showFeedback && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: RADIUS, padding: 20, width: '100%', maxWidth: 360, textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setShowFeedback(false)} style={{ position: 'absolute', top: 12, right: 16, background: 'transparent', border: 'none', fontSize: 24, color: MUTED, cursor: 'pointer' }}>&times;</button>
            <h3 style={{ margin: '0 0 16px 0', color: DARK, fontSize: 18 }}>How was the experience?</h3>
            <input
              type="text"
              placeholder="Your Name (Optional)"
              value={feedbackName}
              onChange={e => setFeedbackName(e.target.value)}
              style={{ width: '100%', padding: 12, borderRadius: 10, border: `1px solid ${BORDER}`, marginBottom: 12, fontFamily: FONT, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, fontSize: 36, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} onClick={() => setFeedbackRating(star)} style={{ color: star <= feedbackRating ? '#f59e0b' : '#cbd5e1', cursor: 'pointer', userSelect: 'none' }}>
                  {star <= feedbackRating ? '★' : '☆'}
                </span>
              ))}
            </div>
            <textarea
              placeholder="Any comments? (optional)"
              value={feedbackComment}
              onChange={e => setFeedbackComment(e.target.value)}
              style={{ width: '100%', minHeight: 80, padding: 12, borderRadius: 10, border: `1px solid ${BORDER}`, marginBottom: 16, fontFamily: FONT, fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowFeedback(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${BORDER}`, background: '#f8fafc', color: DARK, fontWeight: 600, cursor: 'pointer' }}>Skip</button>
              <button onClick={submitFeedback} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: ORANGE, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   INLINE STYLES — fully self-contained, no external CSS needed
════════════════════════════════════════ */
const ORANGE   = '#FF6B35';
const DARK     = '#1a202c';
const CARD_BG  = '#ffffff';
const PAGE_BG  = '#f1f5f9';
const MUTED    = '#64748b';
const BORDER   = '#e2e8f0';
const GREEN    = '#10b981';
const RADIUS   = 14;
const FONT     = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

const S = {
  /* Layout */
  root: { fontFamily: FONT, background: PAGE_BG, height: '100dvh', maxWidth: 480, margin: '0 auto', position: 'relative', overflowX: 'hidden', overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  body: { padding: '0 16px 80px 16px', paddingTop: 8 },

  /* Header */
  header: {
    background: `linear-gradient(135deg, ${ORANGE} 0%, #ff8c42 100%)`,
    padding: '16px 16px 12px', position: 'sticky', top: 0, zIndex: 100,
    boxShadow: '0 4px 20px rgba(255,107,53,0.35)'
  },
  headerInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  backBtn: { background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 22, cursor: 'pointer' },
  headerCenter: { textAlign: 'center', flex: 1 },
  headerTitle: { color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: 0.3 },
  tablePill: { display: 'inline-block', background: 'rgba(255,255,255,0.25)', borderRadius: 20, padding: '2px 10px', color: '#fff', fontSize: 12, fontWeight: 600, marginTop: 3 },
  progressBar: { display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', height: 8 },
  progressDot: { height: 8, borderRadius: 4, transition: 'all 0.3s ease' },

  /* Error */
  errorBanner: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: RADIUS, padding: '12px 16px', marginTop: 12, color: '#dc2626', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  retryBtn: { background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontSize: 13 },

  /* Category */
  catScroll: { display: 'flex', gap: 10, overflowX: 'auto', padding: '14px 0 4px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' },
  catChip: { flexShrink: 0, padding: '8px 16px', borderRadius: 50, border: `1.5px solid ${BORDER}`, background: CARD_BG, color: DARK, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' },
  catChipActive: { background: ORANGE, borderColor: ORANGE, color: '#fff', boxShadow: `0 4px 12px rgba(255,107,53,0.35)` },
  sectionLabel: { fontSize: 12, color: MUTED, fontWeight: 600, marginTop: 10, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },

  /* Items */
  itemList: { display: 'flex', flexDirection: 'column', gap: 10 },
  itemCard: { background: CARD_BG, borderRadius: RADIUS, padding: '14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `1.5px solid transparent`, transition: 'all 0.2s' },
  itemCardActive: { border: `1.5px solid ${ORANGE}`, boxShadow: `0 4px 16px rgba(255,107,53,0.15)` },
  itemImageBox: { position: 'relative', flexShrink: 0 },
  itemImg: { width: 64, height: 64, borderRadius: 12, objectFit: 'cover' },
  itemPlaceholder: { width: 64, height: 64, borderRadius: 12, background: 'linear-gradient(135deg, #fef3ee, #fde8d8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 },
  qtyBadge: { position: 'absolute', top: -6, right: -6, background: ORANGE, color: '#fff', borderRadius: 10, width: 20, height: 20, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { fontWeight: 700, fontSize: 15, color: DARK, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  itemCat: { fontSize: 12, color: MUTED, marginBottom: 5 },
  itemPrice: { fontWeight: 800, fontSize: 16, color: ORANGE },
  itemCtrl: { flexShrink: 0 },
  addBtn: { width: 40, height: 40, borderRadius: 12, background: ORANGE, border: 'none', color: '#fff', fontWeight: 800, fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 4px 12px rgba(255,107,53,0.35)` },

  /* Qty row */
  qtyRow: { display: 'flex', alignItems: 'center', gap: 6, background: '#fff7f4', borderRadius: 12, padding: '4px 6px', border: `1.5px solid #fde8d8` },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, background: ORANGE, border: 'none', color: '#fff', fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  qtyNum: { minWidth: 24, textAlign: 'center', fontWeight: 800, fontSize: 16, color: DARK },

  /* Cart */
  cartList: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 },
  cartCard: { background: CARD_BG, borderRadius: RADIUS, padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cartItemPlaceholder: { width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#fef3ee,#fde8d8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 },
  cartItemInfo: { flex: 1, minWidth: 0 },
  cartItemName: { fontWeight: 700, fontSize: 14, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cartItemPrice: { fontSize: 12, color: MUTED, marginTop: 2 },
  cartItemTotal: { fontWeight: 800, fontSize: 15, color: DARK, flexShrink: 0 },

  /* Bill */
  billCard: { background: CARD_BG, borderRadius: RADIUS, padding: '16px', marginTop: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  billTitle: { fontWeight: 800, fontSize: 14, color: DARK, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  billRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, color: MUTED, marginBottom: 8 },
  billDivider: { height: 1, background: BORDER, margin: '10px 0' },
  billTotal: { fontWeight: 800, fontSize: 17, color: DARK },

  /* Buttons */
  primaryBtn: { display: 'block', width: '100%', padding: '16px', background: `linear-gradient(135deg, ${ORANGE}, #ff8c42)`, color: '#fff', border: 'none', borderRadius: RADIUS, fontWeight: 800, fontSize: 16, cursor: 'pointer', marginTop: 16, boxShadow: `0 6px 20px rgba(255,107,53,0.4)`, letterSpacing: 0.3, boxSizing: 'border-box' },
  primaryBtnLoading: { opacity: 0.8, cursor: 'not-allowed' },
  ghostBtn: { display: 'block', width: '100%', padding: '14px', background: 'transparent', color: ORANGE, border: `2px solid ${ORANGE}`, borderRadius: RADIUS, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 10, boxSizing: 'border-box' },

  /* Empty state */
  emptyState: { textAlign: 'center', padding: '60px 20px' },

  /* Checkout */
  summaryPill: { background: '#fff7f4', border: `1.5px solid #fde8d8`, borderRadius: RADIUS, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 14, color: DARK },
  formCard: { background: CARD_BG, borderRadius: RADIUS, padding: '18px 16px', marginTop: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  formCardTitle: { fontWeight: 800, fontSize: 15, color: DARK, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  formGroup: { marginBottom: 14 },
  formLabel: { display: 'block', fontSize: 12, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  formInput: { width: '100%', padding: '13px 14px', border: `1.5px solid ${BORDER}`, borderRadius: 10, fontSize: 15, color: DARK, background: '#f8fafc', outline: 'none', boxSizing: 'border-box', fontFamily: FONT },

  /* UPI */
  upiCard: { background: CARD_BG, borderRadius: RADIUS, padding: '18px 16px', marginTop: 14, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  upiTitle: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, textAlign: 'left' },
  qrWrapper: { background: '#fff', border: `2px dashed ${BORDER}`, borderRadius: 12, padding: 12, display: 'inline-block', marginBottom: 12 },
  upiAmount: { fontSize: 18, color: DARK, marginBottom: 6 },
  upiHint: { fontSize: 12, color: MUTED, lineHeight: 1.5 },

  /* Spinner */
  spinner: { width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' },

  /* Floating bar */
  floatingBar: { position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 448, background: DARK, borderRadius: 16, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '0 8px 30px rgba(0,0,0,0.25)', zIndex: 200, transition: 'transform 0.2s ease' },
  floatingLeft: { display: 'flex', alignItems: 'center', gap: 10, color: '#fff' },
  floatingBadge: { background: ORANGE, color: '#fff', borderRadius: 8, minWidth: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 },
  floatingRight: { display: 'flex', alignItems: 'center', gap: 8, color: '#fff' },

  /* Success */
  successView: { textAlign: 'center', paddingTop: 20 },
  successIconCircle: { width: 90, height: 90, background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)', borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42 },
  successTitle: { fontSize: 26, fontWeight: 900, color: DARK, margin: '0 0 8px' },
  successSub: { color: MUTED, fontSize: 14, margin: '0 0 24px' },
  tokenCard: { background: `linear-gradient(135deg, ${ORANGE}, #ff8c42)`, borderRadius: 20, padding: '24px 20px', margin: '0 0 24px', color: '#fff', boxShadow: `0 12px 30px rgba(255,107,53,0.4)` },
  tokenLabel: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.85, marginBottom: 8 },
  tokenNumber: { fontSize: 52, fontWeight: 900, letterSpacing: 4 },
  tokenHint: { fontSize: 12, opacity: 0.8, marginTop: 8 },
  stepsList: { background: CARD_BG, borderRadius: RADIUS, padding: '16px', marginBottom: 20, textAlign: 'left', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  stepItem: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, lastChild: { marginBottom: 0 } },
  stepIcon: { fontSize: 22, flexShrink: 0 },
  stepText: { fontSize: 14, color: DARK, fontWeight: 500 },
  
  /* Customization & Status Styles */
  cartCard: { background: CARD_BG, borderRadius: RADIUS, padding: '14px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cartMainRow: { display: 'flex', alignItems: 'center', gap: 10 },
  customizationBox: { display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 10, borderTop: `1px dashed ${BORDER}` },
  spiceContainer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  custLabel: { fontSize: 11, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  spiceButtonGroup: { display: 'flex', gap: 6 },
  spiceButton: { padding: '4px 10px', fontSize: 11, fontWeight: 700, borderRadius: 8, border: `1.5px solid ${BORDER}`, background: '#fff', color: DARK, cursor: 'pointer', transition: 'all 0.15s' },
  spiceButtonActive: { background: ORANGE, borderColor: ORANGE, color: '#fff' },
  instructionsContainer: { width: '100%' },
  custInput: { width: '100%', padding: '8px 10px', border: `1.5px solid ${BORDER}`, borderRadius: 8, fontSize: 12, color: DARK, background: '#f8fafc', outline: 'none', boxSizing: 'border-box', fontFamily: FONT },
  statusCard: { background: CARD_BG, borderRadius: RADIUS, padding: '16px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' },
  statusHeader: { fontSize: 11, fontWeight: 800, color: MUTED, letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  statusPill: { padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
};

/* CSS for spinner animation injected once */
if (!document.getElementById('qr-spin-style')) {
  const s = document.createElement('style');
  s.id = 'qr-spin-style';
  s.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { 0% { opacity: 0.7; } 50% { opacity: 1; } 100% { opacity: 0.7; } }
    * { -webkit-tap-highlight-color: transparent; }
  `;
  document.head.appendChild(s);
}
