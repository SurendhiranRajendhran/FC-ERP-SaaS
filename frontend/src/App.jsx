import React, { useState, useEffect } from 'react';
import CrmNotifications from './CrmNotifications';
import WalletManagement from './WalletManagement';

const API_BASE = 'http://localhost:5000/api';

// --- AUTHENTICATION INTERCEPTOR ---
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  const token = localStorage.getItem('token');
  
  if (token && typeof resource === 'string' && resource.startsWith(API_BASE)) {
    config = config || {};
    config.headers = config.headers || {};
    // Don't overwrite if it already exists
    if (!config.headers['Authorization'] && !config.headers.Authorization) {
      // If headers is a Headers object
      if (config.headers instanceof Headers) {
        config.headers.append('Authorization', `Bearer ${token}`);
      } else {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
  }
  
  const response = await originalFetch(resource, config);
  return response;
};

// --- LOGIN SCREEN COMPONENT ---
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await originalFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Food Court ERP
          </h1>
          <p>Login to your account</p>
        </div>
        
        {error && <div className="login-error">{error}</div>}
        
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="admin@foodcourt.com"
              required 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              required 
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}


const getCategoryEmoji = (category) => {
  switch (category) {
    case 'Breakfast': return '🥞';
    case 'Lunch': return '🍲';
    case 'Snacks': return '🍿';
    case 'Beverages': return '☕';
    case 'Combos': return '🍱';
    case 'Specials': return '🍕';
    default: return '🍛';
  }
};

// ==========================================
// QR ORDERING MANAGEMENT PANEL COMPONENT
// ==========================================
function QRManagementPanel() {
  const [tableCount, setTableCount] = useState(10);
  const [baseUrl, setBaseUrl] = useState('');
  const [lanIp, setLanIp] = useState('');
  const [qrImages, setQrImages] = useState([]);
  const [qrOrders, setQrOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    // Auto-detect the LAN IP so QR codes work on mobile phones
    fetch('http://localhost:5000/api/server-info')
      .then(r => r.json())
      .then(info => {
        const url = `http://${info.lan_ip}:${info.port}/menu`;
        setLanIp(info.lan_ip);
        setBaseUrl(url);
      })
      .catch(() => {
        // Fallback: use current origin
        setBaseUrl(window.location.origin + '/menu');
      });
    fetchQrOrders();

    // Auto-polling for QR orders every 5 seconds
    const qrInterval = setInterval(() => {
      fetchQrOrders(true);
    }, 5000);
    return () => clearInterval(qrInterval);
  }, []);

  useEffect(() => {
    if (baseUrl) generateQrCodes();
  }, [tableCount, baseUrl]);

  const generateQrCodes = async () => {
    const QRCode = (await import('qrcode')).default;
    const images = [];
    for (let i = 1; i <= tableCount; i++) {
      const url = `${baseUrl}?table=${i}`;
      try {
        const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
        images.push({ table: i, url, dataUrl });
      } catch (e) {}
    }
    setQrImages(images);
  };

  const fetchQrOrders = async (silent = false) => {
    if (!silent) setLoadingOrders(true);
    try {
      const res = await fetch('http://localhost:5000/api/orders');
      const data = await res.json();
      setQrOrders((data || []).filter(o => o.order_source === 'QR').slice(0, 50));
    } catch (e) {}
    if (!silent) setLoadingOrders(false);
  };

  const downloadQr = (dataUrl, tableNum) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `table-${tableNum}-qr.png`;
    a.click();
  };

  const downloadAll = () => {
    qrImages.forEach(q => downloadQr(q.dataUrl, q.table));
  };

  return (
    <div className="view-panel active">
      <div className="view-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>📱 QR Self-Ordering Management</h3>
        <a href={baseUrl} target="_blank" rel="noopener noreferrer" style={{ background: 'var(--accent-primary)', color: '#fff', padding: '0.5rem 1rem', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold' }}>
          Preview Customer Menu →
        </a>
      </div>

      {/* LAN IP Info Banner */}
      {lanIp && (
        <div style={{ background: '#065f46', border: '1px solid #34d399', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.2rem' }}>📡</span>
          <div>
            <strong style={{ color: '#34d399' }}>Your PC's Wi-Fi IP: {lanIp}</strong>
            <div style={{ color: '#a7f3d0', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Mobile URL: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>{baseUrl}?table=1</code>
              &nbsp;— Make sure your <strong>phone and PC are on the same Wi-Fi network</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Config Section */}
      <div className="qr-admin-config" style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--panel-bg)', borderRadius: '8px', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-color-secondary)' }}>Number of Tables</label>
          <input type="number" min="1" max="100" value={tableCount} onChange={e => setTableCount(Math.max(1, parseInt(e.target.value) || 1))} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-color)', color: 'var(--text-color)' }} />
        </div>
        <div style={{ flex: 3, minWidth: '300px' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-color-secondary)' }}>Base Menu URL</label>
          <input type="text" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-color)', color: 'var(--text-color)' }} />
        </div>
        <button onClick={downloadAll} style={{ padding: '0.5rem 1.2rem', background: 'var(--accent-success)', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          ⬇ Download All QR Codes
        </button>
      </div>

      {/* QR Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {qrImages.map(q => (
          <div key={q.table} style={{ background: 'var(--panel-bg)', borderRadius: '8px', padding: '1rem', textAlign: 'center', border: '1px solid var(--border-color)' }}>
            <img src={q.dataUrl} alt={`Table ${q.table} QR`} style={{ width: '100%', borderRadius: '4px' }} />
            <div style={{ fontWeight: 'bold', marginTop: '0.5rem', fontSize: '1rem' }}>Table {q.table}</div>
            <button onClick={() => downloadQr(q.dataUrl, q.table)} style={{ marginTop: '0.5rem', width: '100%', padding: '0.4rem', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
              ⬇ Download
            </button>
          </div>
        ))}
      </div>

      {/* Recent QR Orders */}
      <div className="view-header-bar" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
        <h3>Recent QR Orders</h3>
        <button onClick={fetchQrOrders} style={{ padding: '0.4rem 0.8rem', background: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px', cursor: 'pointer' }}>🔄 Refresh</button>
      </div>
      {loadingOrders ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-secondary)' }}>Loading...</div>
      ) : qrOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-secondary)' }}>No QR orders yet. Share table QR codes with customers!</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead><tr>
              <th>Token</th><th>Customer</th><th>Phone</th><th>Pickup Slot</th><th>Date</th><th>Amount</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {qrOrders.map(o => (
                <tr key={o.id}>
                  <td><strong>{o.token_number}</strong></td>
                  <td>{o.customer_name || '—'}</td>
                  <td>{o.customer_phone || '—'}</td>
                  <td>{o.pickup_slot ? <strong>{o.pickup_slot}</strong> : <span style={{ color: 'var(--text-muted)' }}>⚡ Immediate</span>}</td>
                  <td>{new Date(o.order_date).toLocaleString()}</td>
                  <td>₹{parseFloat(o.total_amount).toFixed(2)}</td>
                  <td><span className={`status-badge ${(o.status || '').toLowerCase()}`}>{o.status}</span></td>
                  <td>
                    <button onClick={() => window.alert(`Printing KOT for Token #${o.token_number}...`)} style={{ padding: '0.2rem 0.5rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', marginRight: '0.4rem' }}>Print KOT</button>
                    <button onClick={() => window.alert(`Printing Bill for Token #${o.token_number}...`)} style={{ padding: '0.2rem 0.5rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Print Bill</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function App() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState('dashboard');
  const [inventorySubTab, setInventorySubTab] = useState('materials');

  // Runtimes and Clock
  const [liveTime, setLiveTime] = useState(new Date().toLocaleTimeString());

  // Database Data States
  const [items, setItems] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [pastOrders, setPastOrders] = useState([]);
  const [dashData, setDashData] = useState({
    revenue: 0,
    ordersCount: 0,
    gstCollected: 0,
    lowStockCount: 0,
    lowStockMaterials: [],
    topSelling: [],
    categoryDistribution: []
  });

  // POS / Cart States
  const [cart, setCart] = useState([]);
  const [posPaymentMode, setPosPaymentMode] = useState('Cash');
  const [rfidScanInput, setRfidScanInput] = useState('');
  const [rfidStatusMsg, setRfidStatusMsg] = useState('');
  const [rfidCustomerInfo, setRfidCustomerInfo] = useState(null);
  const [rfidLoading, setRfidLoading] = useState(false);
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState('All');

  // Searching & Filtering States
  const [menuSearch, setMenuSearch] = useState('');
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('All');
  const [materialSearch, setMaterialSearch] = useState('');
  const [recipeSearch, setRecipeSearch] = useState('');

  // Recipe Formulation Panel States
  const [selectedRecipeItem, setSelectedRecipeItem] = useState(null);
  const [recipeRows, setRecipeRows] = useState([]); // array of { material_id, quantity }
  const [recipeBulkPasteMode, setRecipeBulkPasteMode] = useState(false);
  const [recipeBulkPasteText, setRecipeBulkPasteText] = useState('');
  const [recipeCloneDropdown, setRecipeCloneDropdown] = useState(false);
  const [recipeCloneSearch, setRecipeCloneSearch] = useState('');
  const [recipeTemplateDropdown, setRecipeTemplateDropdown] = useState(false);
  const [recipeTemplateSearch, setRecipeTemplateSearch] = useState('');
  const [textareaCursorPos, setTextareaCursorPos] = useState(0);

  const cloneDropdownRef = React.useRef(null);
  const templateDropdownRef = React.useRef(null);

  // Pre-built recipe templates for common canteen dishes
  const RECIPE_TEMPLATES = [
    { name: 'Filter Coffee', ingredients: [{ name: 'Coffee Powder', qty: 0.015, unit: 'kg' }, { name: 'Milk', qty: 0.15, unit: 'litre' }, { name: 'Sugar', qty: 0.02, unit: 'kg' }] },
    { name: 'Masala Dosa', ingredients: [{ name: 'Rice', qty: 0.15, unit: 'kg' }, { name: 'Oil', qty: 0.03, unit: 'litre' }, { name: 'Onion', qty: 0.05, unit: 'kg' }, { name: 'Potato', qty: 0.1, unit: 'kg' }] },
    { name: 'Plain Tea', ingredients: [{ name: 'Tea Powder', qty: 0.01, unit: 'kg' }, { name: 'Milk', qty: 0.1, unit: 'litre' }, { name: 'Sugar', qty: 0.015, unit: 'kg' }] },
    { name: 'Fried Rice', ingredients: [{ name: 'Rice', qty: 0.2, unit: 'kg' }, { name: 'Oil', qty: 0.03, unit: 'litre' }, { name: 'Onion', qty: 0.05, unit: 'kg' }, { name: 'Vegetables', qty: 0.1, unit: 'kg' }] },
    { name: 'Paneer Curry', ingredients: [{ name: 'Paneer', qty: 0.15, unit: 'kg' }, { name: 'Oil', qty: 0.03, unit: 'litre' }, { name: 'Onion', qty: 0.05, unit: 'kg' }, { name: 'Tomato', qty: 0.1, unit: 'kg' }] },
    { name: 'Idli (2 pcs)', ingredients: [{ name: 'Rice', qty: 0.1, unit: 'kg' }, { name: 'Urad Dal', qty: 0.03, unit: 'kg' }, { name: 'Oil', qty: 0.005, unit: 'litre' }] },
    { name: 'Chapati (2 pcs)', ingredients: [{ name: 'Wheat Flour', qty: 0.1, unit: 'kg' }, { name: 'Oil', qty: 0.01, unit: 'litre' }] },
    { name: 'Lemon Juice', ingredients: [{ name: 'Lemon', qty: 2, unit: 'piece' }, { name: 'Sugar', qty: 0.03, unit: 'kg' }] }
  ];

  // Modal Control States
  const [menuItemModal, setMenuItemModal] = useState({ show: false, mode: 'add', data: null });
  const [materialModal, setMaterialModal] = useState({ show: false, data: null });
  const [stockActionModal, setStockActionModal] = useState({ show: false, material_id: '', change_qty: '', log_type: 'Purchase', reason: '' });
  const [printerModal, setPrinterModal] = useState({ show: false, bill: '', kot: '' });
  const [purchaseEntryModal, setPurchaseEntryModal] = useState({ show: false });
  const [isNewSupplierInPurchase, setIsNewSupplierInPurchase] = useState(false);
  const [formPurchaseSupplierDetails, setFormPurchaseSupplierDetails] = useState({
    name: '', contact_phone: '', email: '', payment_terms: ''
  });
  const [formPurchaseEntry, setFormPurchaseEntry] = useState({
    supplier_id: '',
    invoice_number: '',
    items: [
      { material_id: '', material_name: '', change_qty: '', unit: 'kg', min_stock: '5', cost_per_unit: '', showSuggestions: false }
    ]
  });

  // Toaster Notifications State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // KDS (Kitchen Display System) States
  const [kdsOrders, setKdsOrders] = useState([]);
  const [kdsHistory, setKdsHistory] = useState([]);
  const [kdsRushMode, setKdsRushMode] = useState(false);
  const [kdsFilter, setKdsFilter] = useState('All');
  const [kdsShowHistory, setKdsShowHistory] = useState(false);
  const [kdsElapsedOffsets, setKdsElapsedOffsets] = useState({}); // tracks local elapsed per order
  const [kdsThresholds] = useState({ warning: 300, critical: 600 }); // 5 min, 10 min in seconds

  // Multi-vendor States
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState('all');
  const [settlements, setSettlements] = useState([]);
  const [vendorPerformance, setVendorPerformance] = useState([]);
  const [formVendor, setFormVendor] = useState({ id: '', name: '', gstin: '', bank_account: '', contact: '', stall_number: '', commission_rate: '10.00', share_area: '10.00' });
  const [costSplit, setCostSplit] = useState({ startDate: '', endDate: '', totalCost: '', method: 'Equal' });
  const [vendorSubTab, setVendorSubTab] = useState('profiles');
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [perfMetric, setPerfMetric] = useState('revenue');
  const [commonExpensesList, setCommonExpensesList] = useState([]);
  const [commonExpenseForm, setCommonExpenseForm] = useState({ category: 'Electricity', description: '', amount: '', expense_date: new Date().toLocaleDateString('en-CA') });

  const fetchCommonExpenses = async () => {
    try {
      const res = await fetch(`${API_BASE}/vendors/expenses`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setCommonExpensesList(data);
    } catch (err) {
      console.error('Failed to fetch common expenses', err);
    }
  };

  const handleCommonExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/vendors/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(commonExpenseForm)
      });
      if (res.ok) {
        showToast('Common expense logged successfully!', 'success');
        setCommonExpenseForm({ category: 'Electricity', description: '', amount: '', expense_date: new Date().toLocaleDateString('en-CA') });
        fetchCommonExpenses();
      } else {
        showToast('Failed to log expense', 'error');
      }
    } catch (error) {
      showToast('Error logging expense', 'error');
    }
  };

  // Advanced POS Billing States
  const [heldOrders, setHeldOrders] = useState([]);
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdName, setHoldName] = useState('');
  
  const [discountType, setDiscountType] = useState('None'); // 'None', 'Percentage', 'Fixed', 'Student', 'Staff', 'Coupon', 'Loyalty'
  const [discountValue, setDiscountValue] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountReference, setDiscountReference] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [studentId, setStudentId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  // Loyalty redemption state
  const [loyaltyRedeemPoints, setLoyaltyRedeemPoints] = useState('');
  const [loyaltyCustomerInfo, setLoyaltyCustomerInfo] = useState(null); // { id, name, loyalty_points }
  
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [splitType, setSplitType] = useState('Equal'); // 'Equal', 'Custom'
  const [splitPayments, setSplitPayments] = useState([
    { mode: 'Cash', amount: '' },
    { mode: 'UPI', amount: '' }
  ]);

  // POS Customer & Feedback Modal States
  const [posCustomerId, setPosCustomerId] = useState('');
  const [customers, setCustomers] = useState([]);
  const [posCashierId, setPosCashierId] = useState('');
  const [posIsUpsold, setPosIsUpsold] = useState(false);
  const [isPosCheckoutLoading, setIsPosCheckoutLoading] = useState(false); // Guard against double-submit

  // HR, Payroll & Attendance States
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [shiftSwaps, setShiftSwaps] = useState([]);
  const [roster, setRoster] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [staffMeals, setStaffMeals] = useState([]);
  const [staffPerformance, setStaffPerformance] = useState([]);

  // HR sub-tabs & filter selections
  const [hrSubTab, setHrSubTab] = useState('directory');

  // MIS Reports & Analytics States
  const [reportsSubTab, setReportsSubTab] = useState('sales');
  const [reportsData, setReportsData] = useState({ sales: null, stock: null, vendors: null, peakHours: null, monthlyPl: null, customerAnalytics: null, gst: null });
  const [reportDateRange, setReportDateRange] = useState({ startDate: '', endDate: '' });
  const [reconData, setReconData] = useState(null);
  const [reconDate, setReconDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [creditCustomers, setCreditCustomers] = useState([]);
  const [creditLedger, setCreditLedger] = useState([]);
  const [selectedCreditCustomer, setSelectedCreditCustomer] = useState(null);
  const [combos, setCombos] = useState([]);
  const [comboModal, setComboModal] = useState({ show: false, comboId: null, comboName: '', childItems: [] });
  const [suppliers, setSuppliers] = useState([]);
  const [supplierModal, setSupplierModal] = useState({ show: false, mode: 'add', data: null });
  const [supplierHistoryModal, setSupplierHistoryModal] = useState({ show: false, supplier: null, history: [], loading: false });
  const [formSupplier, setFormSupplier] = useState({ name: '', contact_person: '', phone: '', email: '', address: '', payment_terms: '', items_supplied: '', delivery_schedule: '' });
  const [tempSupplierItem, setTempSupplierItem] = useState('');
  const [showSupplierItemSuggestions, setShowSupplierItemSuggestions] = useState(false);
  
  // Bulk Stock Modals States
  const [showBulkOpeningModal, setShowBulkOpeningModal] = useState(false);
  const [bulkOpeningItems, setBulkOpeningItems] = useState([]);
  const [showBulkClosingModal, setShowBulkClosingModal] = useState(false);
  const [bulkClosingItems, setBulkClosingItems] = useState([]);
  
  // Overheads & Customers Modal States
  const [showOverheadModal, setShowOverheadModal] = useState(false);
  const [overheadForm, setOverheadForm] = useState({ category: 'Rent', description: '', amount: '', expense_date: new Date().toLocaleDateString('en-CA') });
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '' });

  // ── Authentication State ──
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch(e) { return null; } });

  // Enforce default tab based on role
  useEffect(() => {
    if (user) {
      if (user.role === 'Cook' && !['kds'].includes(activeTab)) {
        setActiveTab('kds');
      } else if (user.role === 'Cashier' && !['pos', 'menu', 'orders', 'wallet'].includes(activeTab)) {
        setActiveTab('pos');
      }
    }
  }, [user, activeTab]);

  // Auto-set Cashier / Staff select value if current user is POS staff
  useEffect(() => {
    if (user && ['Cashier', 'Manager', 'Owner'].includes(user.role)) {
      setPosCashierId(String(user.id));
    } else {
      setPosCashierId('');
    }
  }, [user]);
  const handleLogin = (userData, authToken) => {
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
    if (userData.role === 'Cook') setActiveTab('kds');
    else if (userData.role === 'Vendor') setActiveTab('inventory');
    else setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setActiveTab('dashboard');
  };

  // Listen for token expiry dispatched by the fetch interceptor
  useEffect(() => {
    const onAuthExpired = () => handleLogout();
    window.addEventListener('auth-expired', onAuthExpired);
    return () => window.removeEventListener('auth-expired', onAuthExpired);
  }, []);

  const fetchReportData = async (type) => {
    try {
      const queryParams = new URLSearchParams();
      if (reportDateRange.startDate) queryParams.append('startDate', reportDateRange.startDate);
      if (reportDateRange.endDate) queryParams.append('endDate', reportDateRange.endDate);
      if (selectedVendorId && selectedVendorId !== 'all') queryParams.append('vendor_id', selectedVendorId);
      const res = await fetch(`http://localhost:5000/api/reports/${type}?${queryParams}`);
      if (res.ok) {
        const data = await res.json();
        const stateKey = type.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        setReportsData(prev => ({ ...prev, [stateKey]: data }));
      }
    } catch (err) {
      console.error(`Failed to fetch ${type} report`, err);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (activeTab === 'reports') {
      if (reportsSubTab === 'reconciliation') {
        fetchReconciliation();
      } else if (reportsSubTab === 'credits') {
        fetchCreditCustomers();
      } else {
        fetchReportData(reportsSubTab);
      }
    }
  }, [activeTab, reportsSubTab, reportDateRange]);

  const handleOverheadSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/overheads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(overheadForm) });
      const data = await res.json();
      if (res.ok) {
        showToast('Overhead expense logged successfully!', 'success');
        setShowOverheadModal(false);
        setOverheadForm({ category: 'Rent', description: '', amount: '', expense_date: new Date().toLocaleDateString('en-CA') });
        if (reportsSubTab === 'monthly-pl') fetchReportData('monthly-pl');
      } else {
        showToast(data.error || 'Failed to save expense', 'error');
      }
    } catch (err) { showToast('Error saving overhead', 'error'); }
  };

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(customerForm) });
      if (res.ok) {
        showToast('Customer registered successfully', 'success');
        setShowCustomerModal(false);
        setCustomerForm({ name: '', phone: '', email: '' });
        fetchCustomers();
        if (reportsSubTab === 'customer-analytics') fetchReportData('customer-analytics');
      }
    } catch (err) { showToast('Error registering customer', 'error'); }
  };

  const [selectedRosterWeek, setSelectedRosterWeek] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  });
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [selectedMealsDate, setSelectedMealsDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [payrollMonth, setPayrollMonth] = useState(() => new Date().getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(() => new Date().getFullYear());
  const [payrollWorkingDays, setPayrollWorkingDays] = useState('30');
  const [perfStartDate, setPerfStartDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });
  const [perfEndDate, setPerfEndDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // HR Form Bindings
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [formStaff, setFormStaff] = useState({
    id: '', name: '', phone: '', email: '', role: 'Stall Staff',
    pay_type: 'monthly', daily_rate: '0', monthly_salary: '0',
    pf_enabled: false, esi_enabled: false, tds_percentage: '0', bank_account: '', vendor_id: '',
    exclude_from_payroll: false, exclude_from_roster: false, exclude_from_attendance: false, exclude_from_performance: false
  });
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [formShift, setFormShift] = useState({ id: '', name: '', start_time: '09:00:00', end_time: '17:00:00' });
  const [showSwapForm, setShowSwapForm] = useState(false);
  const [formSwap, setFormSwap] = useState({ requester_id: '', target_id: '', swap_date: '', reason: '' });
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [formLeave, setFormLeave] = useState({ staff_id: '', leave_type: 'Casual', start_date: '', end_date: '', reason: '' });
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [showMealForm, setShowMealForm] = useState(false);
  const [formMeal, setFormMeal] = useState({ staff_id: '', item_id: '', quantity: '1', price: '50', meal_date: new Date().toLocaleDateString('en-CA') });
  const [cancelModal, setCancelModal] = useState({ show: false, orderId: null, tokenNumber: null, pin: '', reason: '', step: 1 });
  const [showCashDrawerModal, setShowCashDrawerModal] = useState(false);
  const [holidayModal, setHolidayModal] = useState({ show: false, name: '', date: '', description: '' });
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [cashDrawer, setCashDrawer] = useState(null);
  const [isRushHour, setIsRushHour] = useState(false);
  
  // Manual Attendance Logging
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [formAttendanceManual, setFormAttendanceManual] = useState({
    staff_id: '', shift_id: '', status: 'Present', notes: '', check_in: '', check_out: ''
  });

  // Add/Edit Form Bindings
  const [formMenu, setFormMenu] = useState({ id: '', name: '', category: 'Breakfast', price: '', gst_rate: '5', image_url: '', description: '', vendor_id: '' });
  const [formMaterial, setFormMaterial] = useState({ id: '', name: '', unit: 'kg', min_stock: '5', stock_level: '0' });
  const [formStockAction, setFormStockAction] = useState({ material_id: '', change_qty: '', log_type: 'Purchase', reason: '', responsible_person: '', cost_per_unit: '' });

  // Live Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Click outside listener for recipe Clone and Template dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (recipeCloneDropdown && cloneDropdownRef.current && !cloneDropdownRef.current.contains(event.target)) {
        setRecipeCloneDropdown(false);
        setRecipeCloneSearch('');
      }
      if (recipeTemplateDropdown && templateDropdownRef.current && !templateDropdownRef.current.contains(event.target)) {
        setRecipeTemplateDropdown(false);
        setRecipeTemplateSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [recipeCloneDropdown, recipeTemplateDropdown]);

  // Fetch all initial data
  const loadAllData = () => {
    fetchDashboard();
    fetchItems();
    fetchCombos();
    fetchMaterials();
    fetchSuppliers();
    fetchRecipes();
    fetchLogs();
    fetchOrders();
    fetchKdsOrders();
    fetchVendors();
    fetchSettlements();
    fetchVendorPerformance();
    fetchHeldOrders();
    // HR fetchers
    fetchStaff();
    fetchShifts();
    fetchRoster(selectedRosterWeek);
    fetchAttendance(selectedAttendanceDate);
    fetchLeaves();
    fetchHolidays();
    fetchPayroll(payrollMonth, payrollYear);
    fetchStaffMeals();
    fetchStaffPerformance(perfStartDate, perfEndDate);
    fetchCustomers();
  };

  useEffect(() => {
    if (!token) return;
    loadAllData();
  }, [token]);

  // Update filtered metrics and queues when selectedVendorId changes
  useEffect(() => {
    if (!token) return;
    fetchDashboard();
    fetchKdsOrders();
    if (kdsShowHistory) {
      fetchKdsHistory();
    }
  }, [token, selectedVendorId]);

  // Auto-calculate common cost in Vendor split settlements based on selected date range by summing actual overheads
  // Adding commonExpensesList to dependencies ensures this re-runs when a new expense is logged
  useEffect(() => {
    const fetchAutoCost = async () => {
      if (costSplit.startDate && costSplit.endDate) {
        try {
          const res = await fetch(`${API_BASE}/vendors/expenses/sum?startDate=${costSplit.startDate}&endDate=${costSplit.endDate}&_t=${Date.now()}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-store'
          });
          const data = await res.json();
          if (res.ok) {
            setCostSplit(prev => ({ ...prev, totalCost: data.total.toString() }));
          }
        } catch (error) {
          console.error("Failed to fetch auto common cost:", error);
        }
      }
    };
    fetchAutoCost();
  }, [costSplit.startDate, costSplit.endDate, commonExpensesList, token]);

  // HR auto-refetch triggers on filter change
  useEffect(() => {
    if (!token) return;
    fetchRoster(selectedRosterWeek);
  }, [token, selectedRosterWeek]);

  useEffect(() => {
    if (!token) return;
    fetchAttendance(selectedAttendanceDate);
  }, [token, selectedAttendanceDate]);

  useEffect(() => {
    if (!token) return;
    fetchPayroll(payrollMonth, payrollYear);
  }, [token, payrollMonth, payrollYear]);

  // Auto-calculate Total Working Days for Payroll based on month/year and holidays
  useEffect(() => {
    // Number of days in the selected month (using day 0 of the next month)
    const daysInMonth = new Date(payrollYear, payrollMonth, 0).getDate();
    // Count how many holidays fall in this selected month and year
    const holidaysInMonth = holidays.filter(h => {
      if (!h.holiday_date) return false;
      const d = new Date(h.holiday_date);
      return (d.getMonth() + 1) === payrollMonth && d.getFullYear() === payrollYear;
    }).length;
    
    setPayrollWorkingDays((daysInMonth - holidaysInMonth).toString());
  }, [payrollMonth, payrollYear, holidays]);

  useEffect(() => {
    if (!token) return;
    fetchStaffPerformance(perfStartDate, perfEndDate);
  }, [token, perfStartDate, perfEndDate]);

  // KDS Auto-polling: fetch active orders every 5 seconds when KDS tab is active
  useEffect(() => {
    if (!token || activeTab !== 'kds') return;
    fetchKdsOrders();
    const kdsInterval = setInterval(() => {
      fetchKdsOrders();
    }, 5000);
    return () => clearInterval(kdsInterval);
  }, [activeTab]);

  // KDS Live elapsed timer: increment local elapsed counter every second
  useEffect(() => {
    if (activeTab !== 'kds' || kdsOrders.length === 0) return;
    const timerInterval = setInterval(() => {
      setKdsElapsedOffsets(prev => {
        const updated = { ...prev };
        kdsOrders.forEach(order => {
          updated[order.id] = (updated[order.id] || 0) + 1;
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [activeTab, kdsOrders.length]);

  // API Call Helpers
  const fetchHeldOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/held-orders`);
      if (res.ok) {
        const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setHeldOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch held orders:', err);
    }
  };

  const fetchDashboard = async () => {
    try {
      const q = selectedVendorId !== 'all' ? `?vendor_id=${selectedVendorId}` : '';
      const res = await fetch(`${API_BASE}/dashboard${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setDashData(data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch(`${API_BASE}/items`);
      if (res.ok) {
        const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setItems(data);
      } else {
        setItems([]);
      }
    } catch (err) {
      showToast('Failed to connect to backend server items API', 'error');
      setItems([]);
    }
  };

  const fetchCombos = async () => {
    try {
      const res = await fetch(`${API_BASE}/combos`);
      if (res.ok) {
        const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setCombos(data);
      } else {
        setCombos([]);
      }
    } catch (err) {
      console.error('Failed to fetch combos:', err);
      setCombos([]);
    }
  };

  const fetchMaterials = async () => {
    try {
      const res = await fetch(`${API_BASE}/raw-materials`);
      if (res.ok) {
        const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setMaterials(data);
      } else {
        setMaterials([]);
      }
    } catch (err) {
      showToast('Failed to fetch raw materials', 'error');
      setMaterials([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${API_BASE}/suppliers`);
      if (res.ok) {
        const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setSuppliers(data);
      } else {
        setSuppliers([]);
      }
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
      setSuppliers([]);
    }
  };

  const handleOpenSupplierHistory = async (supplier) => {
    setSupplierHistoryModal({ show: true, supplier, history: [], loading: true });
    try {
      const res = await fetch(`${API_BASE}/suppliers/${supplier.id}/history`);
      if (res.ok) {
        const data = await res.json();
        setSupplierHistoryModal(prev => ({ ...prev, history: data, loading: false }));
      } else {
        setSupplierHistoryModal(prev => ({ ...prev, history: [], loading: false }));
        showToast('Failed to load history', 'error');
      }
    } catch (err) {
      console.error('Error fetching supplier history:', err);
      setSupplierHistoryModal(prev => ({ ...prev, history: [], loading: false }));
      showToast('API communication failed', 'error');
    }
  };

  const fetchRecipes = async () => {
    try {
      const res = await fetch(`${API_BASE}/recipes`);
      if (res.ok) {
        const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setRecipes(data);
      } else {
        setRecipes([]);
      }
    } catch (err) {
      console.error('Failed to fetch recipes:', err);
      setRecipes([]);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/stock-logs`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch stock logs:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/orders`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setPastOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  // Multi-vendor Fetchers
  const fetchVendors = async () => {
    try {
      const res = await fetch(`${API_BASE}/vendors`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setVendors(data);
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    }
  };

  const fetchSettlements = async () => {
    try {
      const res = await fetch(`${API_BASE}/vendors/settlements`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setSettlements(data);
    } catch (err) {
      console.error('Failed to fetch settlements:', err);
    }
  };

  const fetchVendorPerformance = async () => {
    try {
      const res = await fetch(`${API_BASE}/vendors/performance`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setVendorPerformance(data);
    } catch (err) {
      console.error('Failed to fetch vendor performance stats:', err);
    }
  };

  // HR Module Fetchers
  const fetchStaff = async () => {
    try {
      const res = await fetch(`${API_BASE}/staff`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setStaff(data);
    } catch (err) {
      console.error('Failed to fetch staff directory:', err);
    }
  };

  const fetchShifts = async () => {
    try {
      const res = await fetch(`${API_BASE}/shifts`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setShifts(data);
    } catch (err) {
      console.error('Failed to fetch shifts:', err);
    }
  };

  const fetchShiftSwaps = async () => {
    try {
      const res = await fetch(`${API_BASE}/shifts/swap-requests`);
      if (res.ok) {
        const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setShiftSwaps(data);
      }
    } catch (err) {
      console.error('Failed to fetch shift swaps:', err);
    }
  };

  const fetchCashDrawerStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/cash-drawer/status`);
      if (res.ok) setCashDrawer(await res.json());
    } catch (err) {
      console.error('Failed to fetch cash drawer status:', err);
    }
  };

  const fetchReconciliation = async (date) => {
    try {
      const d = date || reconDate;
      const res = await fetch(`${API_BASE}/reconciliation/summary?date=${d}`);
      if (res.ok) setReconData(await res.json());
    } catch (err) {
      console.error('Failed to fetch reconciliation:', err);
    }
  };

  const fetchCreditCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE}/credits/customers`);
      if (res.ok) setCreditCustomers(await res.json());
    } catch (err) {
      console.error('Failed to fetch credit customers:', err);
    }
  };

  const fetchCreditLedger = async (customerId) => {
    try {
      const res = await fetch(`${API_BASE}/credits/ledger/${customerId}`);
      if (res.ok) setCreditLedger(await res.json());
    } catch (err) {
      console.error('Failed to fetch credit ledger:', err);
    }
  };

  const fetchRoster = async (weekStart) => {
    try {
      const res = await fetch(`${API_BASE}/roster?week_start=${weekStart}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setRoster(data);
    } catch (err) {
      console.error('Failed to fetch roster:', err);
    }
  };

  const fetchAttendance = async (date) => {
    try {
      const res = await fetch(`${API_BASE}/attendance?date=${date}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setAttendance(data);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    }
  };

  const fetchLeaves = async () => {
    try {
      const res = await fetch(`${API_BASE}/leaves`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setLeaves(data);
    } catch (err) {
      console.error('Failed to fetch leaves:', err);
    }
  };

  const fetchHolidays = async () => {
    try {
      const res = await fetch(`${API_BASE}/holidays`);
      if (res.ok) {
        const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setHolidays(data);
      }
    } catch (err) {
      console.error('Failed to fetch holidays:', err);
    }
  };

  const fetchPayroll = async (month, year) => {
    try {
      const res = await fetch(`${API_BASE}/payroll?month=${month}&year=${year}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setPayroll(data);
    } catch (err) {
      console.error('Failed to fetch payroll:', err);
    }
  };

  const fetchStaffMeals = async () => {
    try {
      const res = await fetch(`${API_BASE}/staff-meals`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setStaffMeals(data);
    } catch (err) {
      console.error('Failed to fetch staff meals:', err);
      setStaffMeals([]);
    }
  };

  const fetchStaffPerformance = async (startDate, endDate) => {
    try {
      const res = await fetch(`${API_BASE}/staff/performance?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setStaffPerformance(data);
    } catch (err) {
      console.error('Failed to fetch staff performance:', err);
      setStaffPerformance([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE}/customers`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setCustomers(data);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setCustomers([]);
    }
  };



  // KDS Fetch Functions
  const fetchKdsOrders = async () => {
    try {
      const q = selectedVendorId !== 'all' ? `?vendor_id=${selectedVendorId}` : '';
      const res = await fetch(`${API_BASE}/kds/orders${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setKdsOrders(data);
      // Reset elapsed offsets for new orders, keep existing
      setKdsElapsedOffsets(prev => {
        const updated = {};
        data.forEach(order => {
          updated[order.id] = prev[order.id] || 0;
        });
        return updated;
      });
    } catch (err) {
      console.error('Failed to fetch KDS orders:', err);
    }
  };

  const fetchKdsHistory = async () => {
    try {
      const q = selectedVendorId !== 'all' ? `?vendor_id=${selectedVendorId}` : '';
      const res = await fetch(`${API_BASE}/kds/history${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setKdsHistory(data);
    } catch (err) {
      console.error('Failed to fetch KDS history:', err);
    }
  };

  const handleKdsStatusUpdate = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast(`Order status updated to ${newStatus}`, 'success');
        fetchKdsOrders();
        if (kdsShowHistory) fetchKdsHistory();
        fetchOrders(); // refresh past orders too
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update status', 'error');
      }
    } catch (err) {
      showToast('API communication failed', 'error');
    }
  };

  // KDS Helper: format elapsed seconds as MM:SS
  const formatElapsed = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // KDS Helper: get ageing class based on elapsed seconds
  const getAgeClass = (seconds) => {
    if (seconds >= kdsThresholds.critical) return 'critical';
    if (seconds >= kdsThresholds.warning) return 'warning';
    return 'fresh';
  };

  // Toast System
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // ==========================================
  // MENU MANAGEMENT ACTIONS
  // ==========================================
  const handleOpenAddMenu = () => {
    setFormMenu({ id: '', name: '', category: 'Breakfast', price: '', gst_rate: '5', image_url: '', description: '', is_special: false, special_price: '', available_from: '', available_until: '', mess_eligible: false });
    setMenuItemModal({ show: true, mode: 'add', data: null });
  };

  const handleOpenEditMenu = (item) => {
    setFormMenu({
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      gst_rate: item.gst_rate,
      image_url: item.image_url || '',
      description: item.description || '',
      is_special: !!item.is_special,
      special_price: item.special_price || '',
      available_from: item.available_from || '',
      available_until: item.available_until || '',
      mess_eligible: !!item.mess_eligible
    });
    setMenuItemModal({ show: true, mode: 'edit', data: item });
  };

  const handleSaveMenuItem = async (e) => {
    e.preventDefault();
    const isEdit = menuItemModal.mode === 'edit';
    const url = isEdit ? `${API_BASE}/items/${formMenu.id}` : `${API_BASE}/items`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formMenu)
      });
      if (res.ok) {
        showToast(isEdit ? 'Menu item updated successfully!' : 'Menu item created successfully!', 'success');
        setMenuItemModal({ show: false, mode: 'add', data: null });
        fetchItems();
        fetchDashboard();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save menu item', 'error');
      }
    } catch (error) {
      showToast('API communication failed.', 'error');
    }
  };

  const handleDeleteMenuItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this menu item? All associated recipes will be removed.')) return;
    try {
      const res = await fetch(`${API_BASE}/items/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Menu item deleted successfully!', 'success');
        fetchItems();
        fetchDashboard();
        if (selectedRecipeItem?.id === id) {
          setSelectedRecipeItem(null);
          setRecipeRows([]);
        }
      }
    } catch (err) {
      showToast('Failed to delete item', 'error');
    }
  };

  const handleToggleItemActive = async (item) => {
    const nextActive = item.is_active === 1 ? 0 : 1;
    try {
      const res = await fetch(`${API_BASE}/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextActive })
      });
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: nextActive } : i));
        showToast(nextActive ? `"${item.name}" Activated for today.` : `"${item.name}" Deactivated.`, 'success');
      }
    } catch (err) {
      showToast('Toggle status failed', 'error');
    }
  };

  const handleSaveCombo = async () => {
    try {
      const res = await fetch(`${API_BASE}/combos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          combo_id: comboModal.comboId,
          child_items: comboModal.childItems
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Combo child items updated successfully.', 'success');
        fetchCombos();
        setComboModal({ show: false, comboId: null, comboName: '', childItems: [] });
      } else {
        showToast(data.error || 'Failed to set combo items', 'error');
      }
    } catch (err) {
      showToast('Network error during setting combo.', 'error');
    }
  };

  const handleOpenBulkOpening = async () => {
    try {
      const res = await fetch(`${API_BASE}/stock/opening-sheet`);
      const data = await res.json();
      setBulkOpeningItems(data.map(item => ({
        material_id: item.id,
        name: item.name,
        unit: item.unit,
        yesterday_closing: item.yesterday_closing,
        opening_qty: item.yesterday_closing
      })));
      setShowBulkOpeningModal(true);
    } catch (err) {
      showToast('Error connecting to backend for opening sheet', 'error');
    }
  };

  const handleSaveBulkOpening = async () => {
    try {
      const res = await fetch(`${API_BASE}/stock/opening-entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: bulkOpeningItems })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Opening stock updated successfully.', 'success');
        fetchMaterials();
        setShowBulkOpeningModal(false);
      } else {
        showToast(data.error || 'Failed to save opening stock', 'error');
      }
    } catch (err) {
      showToast('Error sending opening stock data', 'error');
    }
  };

  const handleOpenBulkClosing = () => {
    setBulkClosingItems(materials.map(item => ({
      material_id: item.id,
      name: item.name,
      unit: item.unit,
      system_qty: parseFloat(item.stock_level),
      physical_qty: parseFloat(item.stock_level),
      variance: 0
    })));
    setShowBulkClosingModal(true);
  };

  const handleSaveBulkClosing = async () => {
    try {
      const res = await fetch(`${API_BASE}/stock/closing-entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: bulkClosingItems })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Closing stock recorded successfully.', 'success');
        fetchMaterials();
        setShowBulkClosingModal(false);
      } else {
        showToast(data.error || 'Failed to save closing stock', 'error');
      }
    } catch (err) {
      showToast('Error sending closing stock data', 'error');
    }
  };

  // ==========================================
  // INVENTORY INGREDIENT ACTIONS
  // ==========================================
  const handleOpenAddMaterial = () => {
    setFormMaterial({ id: '', name: '', unit: 'kg', min_stock: '5', stock_level: '0' });
    setMaterialModal({ show: true });
  };

  const handleSaveMaterial = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/raw-materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formMaterial)
      });
      if (res.ok) {
        showToast('Raw ingredient added to ledger successfully!', 'success');
        setMaterialModal({ show: false });
        fetchMaterials();
        fetchLogs();
        fetchDashboard();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save raw material', 'error');
      }
    } catch (err) {
      showToast('API communication failed', 'error');
    }
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm('Delete this ingredient? Associated recipe mappings will break.')) return;
    try {
      const res = await fetch(`${API_BASE}/raw-materials/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Ingredient deleted from stock ledger!', 'success');
        fetchMaterials();
        fetchLogs();
        fetchDashboard();
        // Clear active recipe mapping row if needed
        if (selectedRecipeItem) {
          loadRecipeFor(selectedRecipeItem);
        }
      }
    } catch (err) {
      showToast('Deletion failed', 'error');
    }
  };

  const handleOpenStockAction = (matId = '') => {
    setFormStockAction({ material_id: matId, change_qty: '', log_type: 'Purchase', reason: '', responsible_person: '', cost_per_unit: '', _isNewMaterial: false, _newName: '', _newUnit: 'kg', _newMinStock: '0' });
    setStockActionModal({ show: true });
  };

  const handleSaveStockAction = async (e) => {
    e.preventDefault();

    let materialId = formStockAction.material_id;

    // If user is adding a brand-new material, create it first
    if (formStockAction._isNewMaterial) {
      if (!formStockAction._newName.trim()) {
        showToast('Please enter a name for the new material.', 'error');
        return;
      }
      try {
        const createRes = await fetch(`${API_BASE}/raw-materials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formStockAction._newName.trim(),
            unit: formStockAction._newUnit,
            stock_level: 0,
            min_stock: parseFloat(formStockAction._newMinStock) || 0
          })
        });
        if (!createRes.ok) {
          const errData = await createRes.json();
          showToast(errData.error || 'Failed to create new material', 'error');
          return;
        }
        const created = await createRes.json();
        materialId = created.id;
        showToast(`New material "${created.name}" created!`, 'success');
      } catch (err) {
        showToast('Failed to create material — network error', 'error');
        return;
      }
    }

    if (!materialId) {
      showToast('Please select a material.', 'error');
      return;
    }

    let finalLogType = formStockAction.log_type;
    let finalQty = parseFloat(formStockAction.change_qty);

    if (formStockAction.log_type === 'Adjustment-Add') {
      finalLogType = 'Adjustment';
      finalQty = Math.abs(finalQty);
    } else if (formStockAction.log_type === 'Adjustment-Reduce') {
      finalLogType = 'Adjustment';
      finalQty = -Math.abs(finalQty);
    } else if (formStockAction.log_type === 'Wastage') {
      finalQty = -Math.abs(finalQty);
    } else if (formStockAction.log_type === 'Purchase') {
      finalQty = Math.abs(finalQty);
    }

    const payload = {
      material_id: materialId,
      change_qty: finalQty,
      log_type: finalLogType,
      reason: formStockAction.reason,
      responsible_person: formStockAction.log_type === 'Wastage' ? formStockAction.responsible_person : null,
      cost_per_unit: formStockAction.log_type === 'Purchase' && formStockAction.cost_per_unit ? parseFloat(formStockAction.cost_per_unit) : undefined
    };

    try {
      const res = await fetch(`${API_BASE}/stock-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Stock transaction written successfully!', 'success');
        setStockActionModal({ show: false });
        fetchMaterials();
        fetchLogs();
        fetchDashboard();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to process transaction', 'error');
      }
    } catch (err) {
      showToast('API communication failed', 'error');
    }
  };

  const handleOpenPurchaseEntry = () => {
    setIsNewSupplierInPurchase(false);
    setFormPurchaseSupplierDetails({
      name: '', contact_phone: '', email: '', payment_terms: ''
    });
    setFormPurchaseEntry({
      supplier_id: '',
      invoice_number: '',
      items: [
        { material_id: '', material_name: '', change_qty: '', unit: 'kg', min_stock: '5', showSuggestions: false }
      ]
    });
    setPurchaseEntryModal({ show: true });
  };

  const handleUpdatePurchaseItemRow = (index, field, value) => {
    setFormPurchaseEntry(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      
      if (field === 'material_name') {
        updatedItems[index].showSuggestions = value.trim().length > 0;
        if (updatedItems[index].material_id) {
          const matched = materials.find(m => m.name.toLowerCase() === value.toLowerCase());
          if (!matched) {
            updatedItems[index].material_id = '';
          }
        }
      }
      return { ...prev, items: updatedItems };
    });
  };

  const handleSelectMaterialSuggestion = (rowIndex, selectedMat) => {
    setFormPurchaseEntry(prev => {
      const updatedItems = [...prev.items];
      updatedItems[rowIndex] = {
        ...updatedItems[rowIndex],
        material_id: selectedMat.id,
        material_name: selectedMat.name,
        unit: selectedMat.unit,
        min_stock: selectedMat.min_stock,
        showSuggestions: false
      };
      return { ...prev, items: updatedItems };
    });
  };

  const handleAddPurchaseItemRow = () => {
    setFormPurchaseEntry(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { material_id: '', material_name: '', change_qty: '', unit: 'kg', min_stock: '5', cost_per_unit: '', showSuggestions: false }
      ]
    }));
  };

  const handleRemovePurchaseItemRow = (index) => {
    setFormPurchaseEntry(prev => {
      if (prev.items.length === 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      };
    });
  };

  const handleSavePurchaseEntry = async (e) => {
    e.preventDefault();
    if (isNewSupplierInPurchase && !formPurchaseSupplierDetails.name.trim()) {
      showToast('Please provide a name for the new supplier.', 'error');
      return;
    }
    if (!isNewSupplierInPurchase && !formPurchaseEntry.supplier_id) {
      showToast('Please select a supplier.', 'error');
      return;
    }
    if (formPurchaseEntry.items.some(item => !item.material_name.trim() || !item.change_qty || parseFloat(item.change_qty) <= 0)) {
      showToast('Please fill out all ingredient names and positive quantities.', 'error');
      return;
    }
    
    const payload = {
      ...formPurchaseEntry,
      supplier_details: isNewSupplierInPurchase ? formPurchaseSupplierDetails : null
    };

    try {
      const res = await fetch(`${API_BASE}/purchase-entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Purchase invoice entry processed successfully!', 'success');
        setPurchaseEntryModal({ show: false });
        fetchMaterials();
        fetchLogs();
        fetchDashboard();
        fetchSuppliers(); // Re-fetch suppliers since a new one might have been added
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to process purchase entry', 'error');
      }
    } catch (err) {
      showToast('API communication failed', 'error');
    }
  };

  // ==========================================
  // RECIPE FORMULATION ACTIONS
  // ==========================================
  const loadRecipeFor = async (item) => {
    setSelectedRecipeItem(item);
    try {
      const res = await fetch(`${API_BASE}/recipes/${item.id}`);
      const data = await res.json();
      setRecipeRows(data.map(row => ({
        material_id: row.material_id,
        quantity: row.quantity
      })));
    } catch (err) {
      console.error('Failed to load recipe details:', err);
    }
  };

  const handleAddRecipeRow = () => {
    if (materials.length === 0) {
      showToast('Please create raw materials first.', 'error');
      return;
    }
    setRecipeRows(prev => [...prev, { material_id: materials[0].id, quantity: '0.1' }]);
  };

  const handleUpdateRecipeRow = (index, field, value) => {
    setRecipeRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const handleRemoveRecipeRow = (index) => {
    setRecipeRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveRecipe = async () => {
    if (!selectedRecipeItem) return;

    // Filter out duplicates and validate quantities
    const cleanedIngredients = recipeRows.map(row => ({
      material_id: parseInt(row.material_id),
      quantity: parseFloat(row.quantity)
    })).filter(row => !isNaN(row.material_id) && !isNaN(row.quantity) && row.quantity > 0);

    // Validation: prevent saving empty recipe
    if (cleanedIngredients.length === 0) {
      showToast('Please add at least one ingredient before saving the recipe.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: selectedRecipeItem.id,
          ingredients: cleanedIngredients
        })
      });
      if (res.ok) {
        showToast(`Recipe formulation saved for ${selectedRecipeItem.name}!`, 'success');
        fetchRecipes();
      } else {
        showToast('Failed to save recipe configurations', 'error');
      }
    } catch (err) {
      showToast('Network error saving recipe', 'error');
    }
  };

  // ==========================================
  // RECIPE FAST-ENTRY: BULK PASTE
  // Helper to get active line info for bulk paste autocomplete
  const getActiveLineInfo = () => {
    const text = recipeBulkPasteText;
    const cursor = textareaCursorPos;
    if (cursor === undefined || cursor === null) return { query: '', lineText: '', startIdx: 0, endIdx: 0 };
    
    // Find start of current line
    const startIdx = text.lastIndexOf('\n', cursor - 1) + 1;
    // Find end of current line
    let endIdx = text.indexOf('\n', cursor);
    if (endIdx === -1) endIdx = text.length;
    
    const lineText = text.substring(startIdx, endIdx);
    
    // Parse name from lineText (anything before the comma or first numeric/whitespace suffix)
    const parts = lineText.split(/[,\t]+/).map(p => p.trim());
    let namePart = parts[0] || '';
    if (parts.length < 2) {
      const lastSpaceIdx = lineText.trim().lastIndexOf(' ');
      if (lastSpaceIdx > 0) {
        // Only split by last space if the suffix is numeric (quantity)
        const suffix = lineText.trim().substring(lastSpaceIdx + 1).trim();
        if (!isNaN(parseFloat(suffix))) {
          namePart = lineText.trim().substring(0, lastSpaceIdx).trim();
        }
      }
    }
    
    return {
      query: namePart,
      lineText,
      startIdx,
      endIdx
    };
  };

  const handleApplySuggestion = (suggestedName) => {
    const { startIdx, endIdx, lineText } = getActiveLineInfo();
    const parts = lineText.split(/[,\t]+/);
    let newLine = '';
    if (parts.length >= 2) {
      if (lineText.includes(',')) {
        newLine = `${suggestedName}, ${parts[1].trim()}`;
      } else {
        newLine = `${suggestedName} ${parts[1].trim()}`;
      }
    } else {
      newLine = `${suggestedName}, `;
    }
    
    const before = recipeBulkPasteText.substring(0, startIdx);
    const after = recipeBulkPasteText.substring(endIdx);
    const newText = before + newLine + after;
    
    setRecipeBulkPasteText(newText);
    
    // Position cursor at the end of the new line, focus back
    setTimeout(() => {
      const ta = document.getElementById('recipe-bulk-textarea');
      if (ta) {
        ta.focus();
        const newPos = startIdx + newLine.length;
        ta.setSelectionRange(newPos, newPos);
        setTextareaCursorPos(newPos);
      }
    }, 10);
  };

  // Live line-by-line status check preview helper
  const getLiveParsedLines = () => {
    return recipeBulkPasteText.split('\n').map((line, idx) => {
      if (!line.trim()) return null;
      
      const parts = line.split(/[,\t]+/).map(p => p.trim());
      let namePart = parts[0] || '';
      let qtyPart = parts[1] || '';
      if (parts.length < 2) {
        const lastSpaceIdx = line.trim().lastIndexOf(' ');
        if (lastSpaceIdx > 0) {
          const suffix = line.trim().substring(lastSpaceIdx + 1).trim();
          if (!isNaN(parseFloat(suffix))) {
            namePart = line.trim().substring(0, lastSpaceIdx).trim();
            qtyPart = suffix;
          }
        }
      }
      
      const qty = parseFloat(qtyPart);
      const isQtyValid = !isNaN(qty) && qty > 0;
      
      const matched = materials.find(m => m && m.name && m.name.toLowerCase() === namePart.toLowerCase());
      let status = 'unrecognized';
      let matchedMaterial = null;
      
      if (matched) {
        status = 'matched';
        matchedMaterial = matched;
      } else if (namePart) {
        const partialMatch = materials.find(m => m && m.name && (m.name.toLowerCase().includes(namePart.toLowerCase()) || namePart.toLowerCase().includes(m.name.toLowerCase())));
        if (partialMatch) {
          status = 'partial';
          matchedMaterial = partialMatch;
        }
      }
      
      return {
        lineIdx: idx,
        originalText: line,
        name: namePart,
        qty: isQtyValid ? qty : null,
        status,
        matchedMaterial
      };
    }).filter(Boolean);
  };

  const activeLine = getActiveLineInfo();
  const activeSuggestions = (activeLine.query && activeLine.query.trim())
    ? materials.filter(m => 
        m && m.name &&
        m.name.toLowerCase().includes(activeLine.query.toLowerCase()) && 
        m.name.toLowerCase() !== activeLine.query.toLowerCase()
      ).slice(0, 5)
    : [];

  // ==========================================
  const handleBulkPasteParse = () => {
    if (!recipeBulkPasteText.trim()) {
      showToast('Paste some ingredients first (one per line: name, quantity)', 'error');
      return;
    }

    const lines = recipeBulkPasteText.trim().split('\n').filter(l => l.trim());
    const newRows = [];
    const unmatched = [];

    for (const line of lines) {
      // Support formats: "Rice, 0.15" or "Rice 0.15" or "Rice,0.15"
      const parts = line.split(/[,\t]+/).map(p => p.trim());
      if (parts.length < 2) {
        // Try splitting by last space if no comma
        const lastSpaceIdx = line.trim().lastIndexOf(' ');
        if (lastSpaceIdx > 0) {
          parts[0] = line.trim().substring(0, lastSpaceIdx).trim();
          parts[1] = line.trim().substring(lastSpaceIdx + 1).trim();
        }
      }

      const ingredientName = parts[0]?.trim();
      const qty = parseFloat(parts[1]);

      if (!ingredientName || isNaN(qty) || qty <= 0) {
        if (ingredientName) unmatched.push(`"${ingredientName}" (invalid quantity)`);
        continue;
      }

      // Case-insensitive match against existing materials
      const matched = materials.find(m => m.name.toLowerCase() === ingredientName.toLowerCase());
      if (!matched) {
        // Try partial match
        const partialMatch = materials.find(m => m.name.toLowerCase().includes(ingredientName.toLowerCase()) || ingredientName.toLowerCase().includes(m.name.toLowerCase()));
        if (partialMatch) {
          newRows.push({ material_id: partialMatch.id, quantity: qty.toString() });
        } else {
          unmatched.push(`"${ingredientName}"`);
        }
      } else {
        newRows.push({ material_id: matched.id, quantity: qty.toString() });
      }
    }

    if (newRows.length > 0) {
      setRecipeRows(prev => [...prev, ...newRows]);
      showToast(`${newRows.length} ingredient(s) added from paste!`, 'success');
    }

    if (unmatched.length > 0) {
      showToast(`Unmatched: ${unmatched.join(', ')}. Add them via Purchase Entry first.`, 'error');
    }

    setRecipeBulkPasteText('');
    setRecipeBulkPasteMode(false);
  };

  // ==========================================
  // RECIPE FAST-ENTRY: CLONE FROM ANOTHER ITEM
  // ==========================================
  const handleCloneRecipe = async (sourceItem) => {
    if (recipeRows.length > 0) {
      if (!window.confirm(`This will replace the current recipe rows for "${selectedRecipeItem.name}" with the recipe from "${sourceItem.name}". Continue?`)) {
        return;
      }
    }

    try {
      const res = await fetch(`${API_BASE}/recipes/${sourceItem.id}`);
      const data = await res.json();
      if (data.length === 0) {
        showToast(`"${sourceItem.name}" has no recipe to clone.`, 'error');
        return;
      }
      setRecipeRows(data.map(row => ({
        material_id: row.material_id,
        quantity: row.quantity
      })));
      showToast(`Cloned ${data.length} ingredient(s) from "${sourceItem.name}". Review and save.`, 'success');
    } catch (err) {
      showToast('Failed to load source recipe for cloning.', 'error');
    }
    setRecipeCloneDropdown(false);
    setRecipeCloneSearch('');
  };

  // ==========================================
  // RECIPE FAST-ENTRY: APPLY TEMPLATE
  // ==========================================
  const handleApplyTemplate = (template) => {
    if (recipeRows.length > 0) {
      if (!window.confirm(`This will replace the current recipe rows with the "${template.name}" template. Continue?`)) {
        return;
      }
    }

    const newRows = [];
    const unmatched = [];

    for (const ing of template.ingredients) {
      const matched = materials.find(m => m.name.toLowerCase() === ing.name.toLowerCase());
      if (!matched) {
        const partialMatch = materials.find(m => m.name.toLowerCase().includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(m.name.toLowerCase()));
        if (partialMatch) {
          newRows.push({ material_id: partialMatch.id, quantity: ing.qty.toString() });
        } else {
          unmatched.push(`"${ing.name}"`);
        }
      } else {
        newRows.push({ material_id: matched.id, quantity: ing.qty.toString() });
      }
    }

    if (newRows.length > 0) {
      setRecipeRows(newRows);
      showToast(`Template "${template.name}" applied with ${newRows.length} ingredient(s).`, 'success');
    }

    if (unmatched.length > 0) {
      showToast(`Unmatched: ${unmatched.join(', ')}. Add them via Purchase Entry first.`, 'error');
    }

    setRecipeTemplateDropdown(false);
    setRecipeTemplateSearch('');
  };

  // Helper: get items that have at least one recipe mapped
  const itemsWithRecipes = items.filter(item =>
    recipes.some(r => r.item_id === item.id) && item.id !== selectedRecipeItem?.id
  );

  // ==========================================
  // HR & PAYROLL MODULE HANDLERS
  // ==========================================
  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!formStaff.name.trim() || !formStaff.role.trim()) {
      showToast('Name and Role are required.', 'error');
      return;
    }

    try {
      const url = formStaff.id ? `${API_BASE}/staff/${formStaff.id}` : `${API_BASE}/staff`;
      const method = formStaff.id ? 'PUT' : 'POST';
      const body = {
        name: formStaff.name,
        phone: formStaff.phone || null,
        email: formStaff.email || null,
        role: formStaff.role,
        pay_type: formStaff.pay_type,
        daily_rate: parseFloat(formStaff.daily_rate || 0),
        monthly_salary: parseFloat(formStaff.monthly_salary || 0),
        pf_enabled: formStaff.pf_enabled ? 1 : 0,
        esi_enabled: formStaff.esi_enabled ? 1 : 0,
        tds_percentage: parseFloat(formStaff.tds_percentage || 0),
        bank_account: formStaff.bank_account || null,
        vendor_id: formStaff.vendor_id ? parseInt(formStaff.vendor_id) : null,
        exclude_from_payroll: formStaff.exclude_from_payroll ? 1 : 0,
        exclude_from_roster: formStaff.exclude_from_roster ? 1 : 0,
        exclude_from_attendance: formStaff.exclude_from_attendance ? 1 : 0,
        exclude_from_performance: formStaff.exclude_from_performance ? 1 : 0
      };
      if (formStaff.id) {
        body.is_active = formStaff.is_active;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        showToast(formStaff.id ? 'Staff updated successfully' : 'Staff registered successfully', 'success');
        setShowStaffForm(false);
        setFormStaff({
          id: '', name: '', phone: '', email: '', role: 'Stall Staff',
          pay_type: 'monthly', daily_rate: '0', monthly_salary: '0',
          pf_enabled: false, esi_enabled: false, tds_percentage: '0', bank_account: '', vendor_id: '',
          exclude_from_payroll: false, exclude_from_roster: false, exclude_from_attendance: false, exclude_from_performance: false
        });
        fetchStaff();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to save staff', 'error');
      }
    } catch (err) {
      showToast('Network error saving staff', 'error');
    }
  };

  const handleEditStaff = (member) => {
    setFormStaff({
      id: member.id,
      name: member.name,
      phone: member.phone || '',
      email: member.email || '',
      role: member.role,
      pay_type: member.pay_type,
      daily_rate: member.daily_rate.toString(),
      monthly_salary: member.monthly_salary.toString(),
      pf_enabled: member.pf_enabled === 1,
      esi_enabled: member.esi_enabled === 1,
      tds_percentage: member.tds_percentage.toString(),
      bank_account: member.bank_account || '',
      vendor_id: member.vendor_id ? member.vendor_id.toString() : '',
      exclude_from_payroll: member.exclude_from_payroll === 1,
      exclude_from_roster: member.exclude_from_roster === 1,
      exclude_from_attendance: member.exclude_from_attendance === 1,
      exclude_from_performance: member.exclude_from_performance === 1,
      is_active: member.is_active
    });
    setShowStaffForm(true);
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Delete this staff member?')) return;
    try {
      const res = await fetch(`${API_BASE}/staff/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Staff member deleted successfully', 'success');
        fetchStaff();
      } else {
        showToast('Failed to delete staff member', 'error');
      }
    } catch (err) {
      showToast('Network error deleting staff', 'error');
    }
  };

  const handleSaveShift = async (e) => {
    e.preventDefault();
    if (!formShift.name.trim() || !formShift.start_time || !formShift.end_time) {
      showToast('All shift fields are required.', 'error');
      return;
    }

    try {
      const url = formShift.id ? `${API_BASE}/shifts/${formShift.id}` : `${API_BASE}/shifts`;
      const method = formShift.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formShift)
      });

      if (res.ok) {
        showToast(formShift.id ? 'Shift updated successfully' : 'Shift created successfully', 'success');
        setShowShiftForm(false);
        setFormShift({ id: '', name: '', start_time: '09:00:00', end_time: '17:00:00' });
        fetchShifts();
      } else {
        showToast('Failed to save shift', 'error');
      }
    } catch (err) {
      showToast('Network error saving shift', 'error');
    }
  };

  const handleDeleteShift = async (id) => {
    if (!window.confirm('Delete this shift definition?')) return;
    try {
      const res = await fetch(`${API_BASE}/shifts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Shift deleted', 'success');
        fetchShifts();
      } else {
        showToast('Failed to delete shift', 'error');
      }
    } catch (err) {
      showToast('Network error deleting shift', 'error');
    }
  };

  const handleUpdateRosterCell = (staffId, dateStr, shiftId) => {
    setRoster(prev => {
      const existingIdx = prev.findIndex(r => r.staff_id === staffId && r.roster_date.split('T')[0] === dateStr);
      const shiftObj = shifts.find(s => s.id == shiftId);
      const shiftName = shiftObj ? shiftObj.name : 'Off';
      
      const updated = [...prev];
      if (existingIdx > -1) {
        if (!shiftId || shiftId === 'Off') {
          updated[existingIdx] = { ...updated[existingIdx], shift_id: null, shift_name: 'Off', status: 'Off' };
        } else {
          updated[existingIdx] = { ...updated[existingIdx], shift_id: parseInt(shiftId), shift_name: shiftName, status: 'Scheduled' };
        }
      } else {
        if (shiftId && shiftId !== 'Off') {
          updated.push({
            staff_id: staffId,
            roster_date: dateStr,
            shift_id: parseInt(shiftId),
            shift_name: shiftName,
            status: 'Scheduled'
          });
        }
      }
      return updated;
    });
  };

  const handleSaveRoster = async () => {
    const entries = roster
      .map(r => ({
        staff_id: r.staff_id,
        shift_id: (!r.shift_id || r.status === 'Off') ? null : r.shift_id,
        roster_date: r.roster_date.split('T')[0],
        status: r.status || 'Scheduled'
      }));

    try {
      const res = await fetch(`${API_BASE}/roster/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries })
      });

      if (res.ok) {
        showToast('Roster saved successfully', 'success');
        fetchRoster(selectedRosterWeek);
      } else {
        showToast('Failed to save roster', 'error');
      }
    } catch (err) {
      showToast('Network error saving roster', 'error');
    }
  };

  const handleCheckIn = async (staffId, shiftId, notes) => {
    try {
      const res = await fetch(`${API_BASE}/attendance/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId, shift_id: shiftId || null, notes: notes || null })
      });
      if (res.ok) {
        showToast('Staff checked in successfully', 'success');
        fetchAttendance(selectedAttendanceDate);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to check in', 'error');
      }
    } catch (err) {
      showToast('Network error checking in', 'error');
    }
  };

  const handleCheckOut = async (attendanceId) => {
    try {
      const res = await fetch(`${API_BASE}/attendance/${attendanceId}/check-out`, {
        method: 'PUT'
      });
      if (res.ok) {
        showToast('Staff checked out successfully', 'success');
        fetchAttendance(selectedAttendanceDate);
      } else {
        showToast('Failed to check out', 'error');
      }
    } catch (err) {
      showToast('Network error checking out', 'error');
    }
  };

  const handleSaveManualAttendance = async (e) => {
    e.preventDefault();
    if (!formAttendanceManual.staff_id || !formAttendanceManual.status) {
      showToast('Staff and Status are required.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/attendance/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: parseInt(formAttendanceManual.staff_id),
          shift_id: formAttendanceManual.shift_id ? parseInt(formAttendanceManual.shift_id) : null,
          status: formAttendanceManual.status,
          notes: formAttendanceManual.notes || null,
          attendance_date: selectedAttendanceDate,
          check_in: formAttendanceManual.check_in || null
        })
      });

      if (res.ok) {
        showToast('Attendance logged manually', 'success');
        setShowAttendanceForm(false);
        setFormAttendanceManual({ staff_id: '', shift_id: '', status: 'Present', notes: '', check_in: '', check_out: '' });
        fetchAttendance(selectedAttendanceDate);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to log attendance', 'error');
      }
    } catch (err) {
      showToast('Network error logging attendance', 'error');
    }
  };

  const handleSaveSwapRequest = async (e) => {
    e.preventDefault();
    if (!formSwap.requester_id || !formSwap.target_id || !formSwap.swap_date) {
      showToast('Requester, Target, and Date are required.', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/shifts/swap-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formSwap)
      });
      if (res.ok) {
        showToast('Swap Request Submitted', 'success');
        setShowSwapForm(false);
        setFormSwap({ requester_id: '', target_id: '', swap_date: '', reason: '' });
        fetchShiftSwaps();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to submit request', 'error');
      }
    } catch (err) {
      showToast('Network error submitting request', 'error');
    }
  };


  const handleLeaveStaffChange = async (e) => {
    const staffId = e.target.value;
    setFormLeave(prev => ({ ...prev, staff_id: staffId }));
    if (staffId) {
      try {
        const res = await fetch(`${API_BASE}/leaves/balance/${staffId}`);
        if (res.ok) {
          const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      setLeaveBalance(data);
        }
      } catch (err) {
        console.error('Failed to fetch leave balance', err);
      }
    } else {
      setLeaveBalance(null);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (leaveBalance) {
      const type = formLeave.leave_type; // 'Casual', 'Sick', 'Earned'
      const start = new Date(formLeave.start_date);
      const end = new Date(formLeave.end_date);
      const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
      
      let limit = 0;
      let taken = 0;
      if (type === 'Casual') { limit = leaveBalance.casual_limit; taken = leaveBalance.casual_taken; }
      else if (type === 'Sick') { limit = leaveBalance.sick_limit; taken = leaveBalance.sick_taken; }
      else if (type === 'Earned') { limit = leaveBalance.earned_limit; taken = leaveBalance.earned_taken; }

      if (taken + days > limit) {
        showToast(`Not enough ${type} leave balance. Limit: ${limit}, Taken: ${taken}, Requested: ${days}`, 'error');
        return;
      }
    }
    if (!formLeave.staff_id || !formLeave.leave_type || !formLeave.start_date || !formLeave.end_date) {
      showToast('Please fill all leave fields.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: parseInt(formLeave.staff_id),
          leave_type: formLeave.leave_type,
          start_date: formLeave.start_date,
          end_date: formLeave.end_date,
          reason: formLeave.reason || null
        })
      });

      if (res.ok) {
        showToast('Leave request submitted', 'success');
        setShowLeaveForm(false);
        setFormLeave({ staff_id: '', leave_type: 'Casual', start_date: '', end_date: '', reason: '' });
        fetchLeaves();
      } else {
        showToast('Failed to submit leave', 'error');
      }
    } catch (err) {
      showToast('Network error applying for leave', 'error');
    }
  };

  const handleApproveLeave = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/leaves/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: 'Admin' })
      });
      if (res.ok) {
        showToast('Leave request approved', 'success');
        fetchLeaves();
        fetchAttendance(selectedAttendanceDate);
      } else {
        showToast('Failed to approve leave', 'error');
      }
    } catch (err) {
      showToast('Network error approving leave', 'error');
    }
  };

  const handleRejectLeave = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/leaves/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: 'Admin' })
      });
      if (res.ok) {
        showToast('Leave request rejected', 'success');
        fetchLeaves();
      } else {
        showToast('Failed to reject leave', 'error');
      }
    } catch (err) {
      showToast('Network error rejecting leave', 'error');
    }
  };

  const handleGeneratePayroll = async () => {
    if (!payrollWorkingDays || isNaN(payrollWorkingDays)) {
      showToast('Please enter a valid number of working days.', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/payroll/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: parseInt(payrollMonth),
          year: parseInt(payrollYear),
          working_days: parseInt(payrollWorkingDays)
        })
      });

      if (res.ok) {
        showToast('Monthly payroll generated successfully as Draft', 'success');
        fetchPayroll(payrollMonth, payrollYear);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to generate payroll', 'error');
      }
    } catch (err) {
      showToast('Network error generating payroll', 'error');
    }
  };

  const handlePayPayroll = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/payroll/${id}/finalize`, {
        method: 'PUT'
      });
      if (res.ok) {
        showToast('Payroll record finalized and paid', 'success');
        fetchPayroll(payrollMonth, payrollYear);
      } else {
        showToast('Failed to finalize payroll', 'error');
      }
    } catch (err) {
      showToast('Network error finalizing payroll', 'error');
    }
  };

  const handleSaveStaffMeal = async (e) => {
    e.preventDefault();
    if (!formMeal.staff_id || !formMeal.item_id || !formMeal.quantity || !formMeal.price) {
      showToast('Please fill all staff meal fields.', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/staff-meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: parseInt(formMeal.staff_id),
          item_id: parseInt(formMeal.item_id),
          quantity: parseInt(formMeal.quantity),
          price: parseFloat(formMeal.price),
          meal_date: formMeal.meal_date || selectedMealsDate
        })
      });

      if (res.ok) {
        showToast('Staff meal transaction recorded successfully', 'success');
        setShowMealForm(false);
        setFormMeal({ staff_id: '', item_id: '', quantity: '1', price: '50', meal_date: selectedMealsDate });
        fetchStaffMeals();
      } else {
        showToast('Failed to record staff meal', 'error');
      }
    } catch (err) {
      showToast('Network error saving staff meal', 'error');
    }
  };

  // ==========================================
  // POS CART ACTIONS
  // ==========================================
  const handleAddToCart = (item) => {
    if (item.is_active !== 1) {
      showToast('This item is marked as sold out today.', 'error');
      return;
    }

    setCart(prev => {
      const exist = prev.find(i => i.id === item.id);
      if (exist) {
        // Warn if stock might be low (rough client check)
        const ok = verifyStockAvailability(item.id, exist.quantity + 1);
        if (!ok) {
          showToast(`Warning: Cart quantity might exceed available raw material stock!`, 'error');
        }
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        const ok = verifyStockAvailability(item.id, 1);
        if (!ok) {
          showToast(`Warning: Stock level critical for ingredients of "${item.name}"!`, 'error');
        }
        return [...prev, {
          id: item.id,
          name: item.name,
          price: parseFloat(item.is_special && item.special_price ? item.special_price : item.price),
          gst_rate: parseFloat(item.gst_rate),
          quantity: 1
        }];
      }
    });
  };

  // Simple client-side stock helper
  const verifyStockAvailability = (itemId, neededQty) => {
    const itemRecipes = recipes.filter(r => r.item_id === itemId);
    if (itemRecipes.length === 0) return true; // No recipe mapping, proceed

    for (const rec of itemRecipes) {
      const mat = materials.find(m => m.id === rec.material_id);
      if (!mat) return false;
      const totalRequired = parseFloat(rec.quantity) * neededQty;
      if (parseFloat(mat.stock_level) < totalRequired) {
        return false;
      }
    }
    return true;
  };

  const handleUpdateCartQty = (itemId, change) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + change;
        if (newQty <= 0) return null;
        if (change > 0 && !verifyStockAvailability(itemId, newQty)) {
          showToast('Warning: Exceeds current available stock level!', 'error');
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Clear entire cart?')) setCart([]);
  };

  // Totals calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartTax = cart.reduce((sum, item) => {
    const base = item.price / (1 + (item.gst_rate / 100));
    const tax = (item.price - base) * item.quantity;
    return sum + tax;
  }, 0);

  // --- ADVANCED POS BILLING HANDLERS ---
  const handleHoldOrder = async () => {
        if (['RFID Wallet', 'Mess Plan'].includes(posPaymentMode) && !rfidCustomerInfo) {
      showToast('Please scan a valid RFID card first.', 'error');
      return;
    }

    if (cart.length === 0) {
      showToast('Order cart is empty.', 'error');
      return;
    }
    if (!holdName.trim()) {
      showToast('Please enter customer/table reference name.', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/held-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hold_name: holdName,
          cart_data: cart
        })
      });
      if (res.ok) {
        showToast(`Order put on hold under "${holdName}"`, 'success');
        setCart([]);
        setHoldName('');
        setShowHoldModal(false);
        fetchHeldOrders();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to hold order.', 'error');
      }
    } catch (error) {
      showToast('Error connecting to hold order API.', 'error');
    }
  };

  const handleRecallOrder = async (heldOrder) => {
    if (cart.length > 0 && !window.confirm('Active cart is not empty. Overwrite with held cart?')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/held-orders/${heldOrder.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCart(heldOrder.cart_data);
        handleClearDiscount();
        showToast(`Recalled order "${heldOrder.hold_name}"`, 'success');
        setShowHeldModal(false);
        fetchHeldOrders();
      } else {
        showToast('Failed to delete recalled order from list.', 'error');
      }
    } catch (error) {
      showToast('Error connecting to recall order API.', 'error');
    }
  };

  const handleDiscardHeldOrder = async (id, name) => {
    if (!window.confirm(`Discard held order for "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/held-orders/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast(`Discarded held order "${name}"`, 'success');
        fetchHeldOrders();
      } else {
        showToast('Failed to discard held order.', 'error');
      }
    } catch (error) {
      showToast('Error connecting to discard order API.', 'error');
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      showToast('Please enter a coupon code.', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode,
          subtotal: cartSubtotal
        })
      });
      if (res.ok) {
        const data = await res.json();
        setDiscountType('Coupon');
        setDiscountValue(data.value);
        setDiscountAmount(data.discount_amount);
        setDiscountReference(data.code);
        showToast(`Coupon "${data.code}" applied! Discount: ₹${data.discount_amount.toFixed(2)}`, 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to validate coupon.', 'error');
      }
    } catch (error) {
      showToast('Error checking coupon validation.', 'error');
    }
  };

  const handleApplyStudentDiscount = () => {
    if (!studentId.trim()) {
      showToast('Please enter a valid Student ID.', 'error');
      return;
    }
    const amount = cartSubtotal * 0.10; // 10% off
    setDiscountType('Student');
    setDiscountValue(10);
    setDiscountAmount(amount);
    setDiscountReference(studentId);
    showToast(`Student Discount (10%) applied!`, 'success');
  };

  const handleApplyStaffDiscount = (staffId) => {
    if (!staffId) {
      setDiscountType('None');
      setDiscountValue(0);
      setDiscountAmount(0);
      setDiscountReference('');
      return;
    }
    const staffMember = staff.find(s => s.id === parseInt(staffId));
    if (!staffMember) return;
    const amount = cartSubtotal * 0.15; // 15% off for staff
    setDiscountType('Staff');
    setDiscountValue(15);
    setDiscountAmount(amount);
    setDiscountReference(`${staffMember.name} (ID: ${staffMember.id})`);
    setSelectedStaffId(staffId);
    showToast(`Staff Discount (15%) applied for ${staffMember.name}`, 'success');
  };

  const handleApplyCustomDiscount = (pct) => {
    const val = parseFloat(pct || 0);
    if (val < 0 || val > 100) {
      showToast('Discount percentage must be between 0 and 100.', 'error');
      return;
    }
    const amount = cartSubtotal * (val / 100);
    setDiscountType('Percentage');
    setDiscountValue(val);
    setDiscountAmount(amount);
    setDiscountReference('Custom');
    showToast(`Custom Discount (${val}%) applied!`, 'success');
  };

  const handleApplyStaffMeal = (staffId) => {
    if (!staffId) {
      setDiscountType('None');
      setDiscountValue(0);
      setDiscountAmount(0);
      setDiscountReference('');
      return;
    }
    const staffMember = staff.find(s => s.id === parseInt(staffId));
    if (!staffMember) return;
    setDiscountType('StaffMeal');
    setDiscountValue(100);
    setDiscountAmount(cartSubtotal);
    setDiscountReference(`Staff Meal: ${staffMember.name} (ID: ${staffMember.id})`);
    setSelectedStaffId(staffId);
    showToast(`Staff Meal applied for ${staffMember.name}`, 'success');
  };

  const handleApplyLoyaltyRedemption = () => {
    // Require a loyalty customer to be selected
    if (!posCustomerId) {
      showToast('Please select a Loyalty Customer first (in the section below).', 'error');
      return;
    }
    const pointsToRedeem = parseInt(loyaltyRedeemPoints);
    if (!pointsToRedeem || pointsToRedeem <= 0) {
      showToast('Please enter a valid number of points to redeem.', 'error');
      return;
    }
    // Find the customer in our local list to check their balance
    const customer = customers.find(c => c.id === parseInt(posCustomerId));
    if (!customer) {
      showToast('Selected customer not found.', 'error');
      return;
    }
    const minRedeem = 50; // Must match backend setting (default 50)
    if (pointsToRedeem < minRedeem) {
      showToast(`Minimum ${minRedeem} points required to redeem.`, 'error');
      return;
    }
    if (pointsToRedeem > customer.loyalty_points) {
      showToast(`Insufficient points. Available: ${customer.loyalty_points} pts.`, 'error');
      return;
    }
    // 1 point = ₹1 (matches backend default loyalty_redeem_ratio = 1)
    const discAmt = pointsToRedeem;
    setDiscountType('Loyalty');
    setDiscountValue(pointsToRedeem); // store points as "value"
    setDiscountAmount(discAmt);
    setDiscountReference(`${customer.name} (${pointsToRedeem} pts)`);
    setLoyaltyCustomerInfo(customer);
    showToast(`Loyalty Discount: ${pointsToRedeem} points = ₹${discAmt.toFixed(2)} off!`, 'success');
  };

  const handleClearDiscount = () => {
    setDiscountType('None');
    setDiscountValue(0);
    setDiscountAmount(0);
    setDiscountReference('');
    setCouponCode('');
    setStudentId('');
    setSelectedStaffId('');
    setLoyaltyRedeemPoints('');
    setLoyaltyCustomerInfo(null);
  };

  useEffect(() => {
    if (discountType === 'StaffMeal') {
      setDiscountAmount(cartSubtotal);
    }
  }, [cartSubtotal, discountType]);

  // POS Checkout Billing Confirmation
  const handleRfidSubmit = async (e) => {
    e.preventDefault();
    const tag = rfidScanInput.trim();
    if (!tag) { setRfidStatusMsg('❌ Please enter or scan an RFID tag first.'); return; }
    setRfidLoading(true);
    setRfidStatusMsg('Verifying card...');
    setRfidCustomerInfo(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/wallet/rfid/${encodeURIComponent(tag)}`, {
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'RFID Tag not found or unregistered');
      setRfidCustomerInfo(data);
      setPosCustomerId(data.id);
      setRfidStatusMsg(`✅ ${data.name} | Wallet: ₹${Number(data.wallet_balance||0).toFixed(2)} | Meals Left: ${data.mess_meals_left||0}`);
    } catch(err) {
      setRfidStatusMsg('❌ ' + err.message);
      setRfidCustomerInfo(null);
      setPosCustomerId('');
    } finally {
      setRfidLoading(false);
    }
  };

  const handleCheckoutPOS = async () => {
    // ── CRITICAL: Prevent double-submit on rapid clicks ──
    if (isPosCheckoutLoading) return;
    setIsPosCheckoutLoading(true);

    let currentCustomerInfo = rfidCustomerInfo;
    
    // Auto-attempt validation if card ID was typed/scanned but not submitted/verified
    if (['RFID Wallet', 'Mess Plan'].includes(posPaymentMode) && !currentCustomerInfo && rfidScanInput.trim()) {
      try {
        const res = await fetch(`${API_BASE}/wallet/rfid/${rfidScanInput.trim()}`, {
          headers: { ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}) }
        });
        if (res.ok) {
          const data = await res.json();
          currentCustomerInfo = data;
          setRfidCustomerInfo(data);
          setPosCustomerId(data.id);
        }
      } catch(e) {}
    }

    if (['RFID Wallet', 'Mess Plan'].includes(posPaymentMode) && !currentCustomerInfo) {
      showToast('Please scan a valid RFID card first.', 'error');
      setIsPosCheckoutLoading(false);
      return;
    }
    
    // Validate mess eligibility for Mess Plan payment mode
    if (posPaymentMode === 'Mess Plan') {
      const nonEligibleItems = cart.filter(item => !item.mess_eligible);
      if (nonEligibleItems.length > 0) {
        const itemNames = nonEligibleItems.map(item => item.name).join(', ');
        showToast(`Mess Plan cannot be used for: ${itemNames}. Only mess-eligible items are allowed.`, 'error');
        setIsPosCheckoutLoading(false);
        return;
      }
    }

    if (posPaymentMode === 'Credit' && !posCustomerId && !currentCustomerInfo) {
      showToast('Please select a Loyalty Customer for Credit payments.', 'error');
      setIsPosCheckoutLoading(false);
      return;
    }

    if (cart.length === 0) {
      showToast('Order cart is empty.', 'error');
      setIsPosCheckoutLoading(false);
      return;
    }

    // If split billing, check if the total sums match the payable amount
    const payableTotal = Math.max(0, cartSubtotal - discountAmount);
    if (posPaymentMode === 'Split') {
      const sumSplits = splitPayments.reduce((sum, sp) => sum + parseFloat(sp.amount || 0), 0);
      if (Math.abs(sumSplits - payableTotal) > 0.01) {
        showToast(`Split payments total (₹${sumSplits.toFixed(2)}) must exactly equal the payable amount (₹${payableTotal.toFixed(2)}).`, 'error');
        setIsPosCheckoutLoading(false);
        return;
      }
    }

    const payload = {
      items: cart.map(i => ({ item_id: i.id, quantity: i.quantity })),
      payment_mode: discountType === 'StaffMeal' ? 'Staff Meal' : posPaymentMode,
      discount_type: discountAmount > 0 ? discountType : 'None',
      discount_value: discountAmount > 0 ? discountValue : 0,
      discount_amount: discountAmount > 0 ? discountAmount : 0,
      discount_reference: discountAmount > 0 ? discountReference : '',
      payment_details: posPaymentMode === 'Split' ? splitPayments.map(sp => ({ mode: sp.mode, amount: parseFloat(sp.amount || 0) })) : null,
      customer_id: posCustomerId || (currentCustomerInfo ? currentCustomerInfo.id : null) || null,
      billing_staff_id: posCashierId || null,
      is_upsold: posIsUpsold ? 1 : 0,
      customer_staff_id: discountType === 'StaffMeal' ? selectedStaffId : null,
      // Loyalty redemption: only deduct points if the discount was actually applied (amount > 0)
      loyalty_redeem_points: (discountType === 'Loyalty' && discountAmount > 0) ? parseInt(loyaltyRedeemPoints || 0) : 0
    };

    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Order Token ${data.token_number} generated successfully!`, 'success');
        setCart([]); // Clear cart
        handleClearDiscount();
        setShowSplitModal(false);
        setPosCustomerId(''); // reset
        setPosCashierId(''); // reset
        setPosIsUpsold(false); // reset
        setRfidScanInput('');
        setRfidCustomerInfo(null);
        setRfidStatusMsg('');
        
        // Open the virtual printer terminal with the receipt layouts
        setPrinterModal({
          show: true,
          bill: data.receipts.bill,
          kot: data.receipts.kot
        });

        // Reload data
        loadAllData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to process checkout order.', 'error');
      }
    } catch (error) {
      showToast('Network error during checkout POS.', 'error');
    } finally {
      // Always release the lock so the button becomes clickable again
      setIsPosCheckoutLoading(false);
    }
  };

  const handleLocalPrintReceipt = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<pre style="font-family: monospace; font-size: 14px; padding: 20px;">${printerModal.bill}</pre>`);
    printWindow.document.close();
    printWindow.print();
  };

  // --- FILTERS & SEARCHING MATCHES ---
  const filteredPOSItems = items.filter(item => {
    const matchActive = item.is_active === 1;
    const matchSearch = item.name.toLowerCase().includes(posSearch.toLowerCase());
    const matchCategory = posCategory === 'All' || item.category === posCategory || (posCategory === 'Specials' && item.is_special);
    const matchVendor = selectedVendorId === 'all' || item.vendor_id === parseInt(selectedVendorId);
    
    // Time-based filtering
    let matchTime = true;
    const hasFrom = item.available_from && item.available_from !== '00:00:00';
    const hasUntil = item.available_until && item.available_until !== '00:00:00';
    if (hasFrom || hasUntil) {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      
      let fromMin = 0;
      if (hasFrom) {
        const [h, m] = item.available_from.split(':').map(Number);
        fromMin = h * 60 + m;
      }
      
      let untilMin = 1440;
      if (hasUntil) {
        const [h, m] = item.available_until.split(':').map(Number);
        untilMin = h * 60 + m;
      }
      
      if (currentMin < fromMin || currentMin > untilMin) {
        matchTime = false;
      }
    }
    
    return matchActive && matchSearch && matchCategory && matchVendor && matchTime;
  });

  const filteredMenuItems = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase()) || 
                        (item.description && item.description.toLowerCase().includes(menuSearch.toLowerCase()));
    const matchCategory = menuCategoryFilter === 'All' || item.category === menuCategoryFilter;
    const matchVendor = selectedVendorId === 'all' || item.vendor_id === parseInt(selectedVendorId);
    return matchSearch && matchCategory && matchVendor;
  });

  const filteredMaterials = materials.filter(mat => {
    return mat.name.toLowerCase().includes(materialSearch.toLowerCase());
  });

  const filteredRecipeMenuItems = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(recipeSearch.toLowerCase());
    const matchVendor = selectedVendorId === 'all' || item.vendor_id === parseInt(selectedVendorId);
    return matchSearch && matchVendor;
  });


  // ── Auth Guard ─────────────────────────────────────
  if (!token || !user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      {/* 1. SIDEBAR MENU */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <div className="logo-text">
            <h1>ERP</h1>
            <span>Canteen ERP</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          {['Owner', 'Manager'].includes(user.role) && (
          <div
            className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="9" rx="1"/>
              <rect x="14" y="3" width="7" height="5" rx="1"/>
              <rect x="14" y="12" width="7" height="9" rx="1"/>
              <rect x="3" y="16" width="7" height="5" rx="1"/>
            </svg>
            <span>Dashboard</span>
          </div>
        )}
          {['Owner', 'Manager', 'Cashier'].includes(user.role) && (<div
            className={`menu-item ${activeTab === 'pos' ? 'active' : ''}`}
            onClick={() => setActiveTab('pos')}
          >
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <line x1="6" y1="20" x2="6" y2="4"/>
              <line x1="18" y1="20" x2="18" y2="4"/>
              <line x1="2" y1="9" x2="22" y2="9"/>
            </svg>
            <span>Counter POS</span>
          </div>
          )}
          {['Owner', 'Manager', 'Cashier'].includes(user.role) && (
          <div
            className={`menu-item ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <span>Items (Menu)</span>
          </div>
        )}
          {['Owner', 'Manager'].includes(user.role) && (
          <div
            className={`menu-item ${activeTab === 'materials' ? 'active' : ''}`}
            onClick={() => setActiveTab('materials')}
          >
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <span>Raw Materials</span>
          </div>
        )}
          {['Owner', 'Manager'].includes(user.role) && (
          <div
            className={`menu-item ${activeTab === 'recipes' ? 'active' : ''}`}
            onClick={() => setActiveTab('recipes')}
          >
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span>Recipes</span>
          </div>
        )}
          {['Owner', 'Manager'].includes(user.role) && (
          <div
            className={`menu-item ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>Stock Logs</span>
          </div>
        )}
          {['Owner', 'Manager', 'Cook'].includes(user.role) && (<div
            className={`menu-item ${activeTab === 'kds' ? 'active' : ''}`}
            onClick={() => setActiveTab('kds')}
          >
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <span>Kitchen Display</span>
          </div>
          )}
          {['Owner', 'Manager'].includes(user.role) && (
          <div
            className={`menu-item ${activeTab === 'qr' ? 'active' : ''}`}
            onClick={() => setActiveTab('qr')}
          >
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span>QR Ordering</span>
          </div>
        )}
          {['Owner', 'Manager', 'Cashier'].includes(user.role) && (
          <div
            className={`menu-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <span>Past Orders</span>
          </div>
        )}
          {selectedVendorId === 'all' && ['Owner', 'Manager'].includes(user.role) && (
            <div
              className={`menu-item ${activeTab === 'vendors' ? 'active' : ''}`}
              onClick={() => setActiveTab('vendors')}
            >
              <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>Multi-Vendor</span>
            </div>
          )}
          {selectedVendorId === 'all' && ['Owner', 'Manager'].includes(user.role) && (
            <div
              className={`menu-item ${activeTab === 'hr' ? 'active' : ''}`}
              onClick={() => setActiveTab('hr')}
            >
              <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
              <span>HR & Payroll</span>
            </div>
          )}
          {selectedVendorId === 'all' && ['Owner', 'Manager'].includes(user.role) && (
            <div
              className={`menu-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
              </svg>
              <span>MIS Reports</span>
            </div>
          )}
          {selectedVendorId === 'all' && ['Owner', 'Manager'].includes(user.role) && (
            <div
              className={`menu-item ${activeTab === 'crm' ? 'active' : ''}`}
              onClick={() => setActiveTab('crm')}
            >
              <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              <span>CRM & Alerts</span>
            </div>
          )}
          {selectedVendorId === 'all' && ['Owner', 'Manager', 'Cashier'].includes(user.role) && (
            <div
              className={`menu-item ${activeTab === 'wallet' ? 'active' : ''}`}
              onClick={() => setActiveTab('wallet')}
            >
              <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
              <span>Cards & Wallets</span>
            </div>
          )}

        </nav>
 
        <div className="sidebar-footer">
          {user && (
            <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.8rem' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }}></span>
                <strong style={{ color: 'var(--text-main)' }}>{user.name}</strong>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '8px' }}>{user.role}</div>
              <button onClick={handleLogout} style={{ width: '100%', padding: '6px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>
 
      {/* 2. MAIN VIEW CONTAINER */}
      <main class="main-content">
        <header class="top-bar">
          <div class="top-bar-left">
            <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Control</h2>
            <p>
              {activeTab === 'dashboard' && 'Canteen operational statistics and daily alerts'}
              {activeTab === 'pos' && 'High-speed touch screen checkout console'}
              {activeTab === 'menu' && 'Manage prices, GST rules and daily dish toggles'}
              {activeTab === 'materials' && 'Raw ingredient ledgers and stock levels'}
              {activeTab === 'recipes' && 'Recipe formulations for automated deduction'}
              {activeTab === 'logs' && 'Audit trail for all inventory changes'}
              {activeTab === 'kds' && 'Real-time kitchen order board with live tracking'}
              {activeTab === 'orders' && 'Historical sales transactions and itemized orders'}
              {activeTab === 'vendors' && 'Manage registered stalls, split shared costs and view payout settlements'}
              {activeTab === 'hr' && 'Manage staff directory, define shifts, schedule roster, track attendance & leaves, calculate payroll and meals'}
                            {activeTab === 'reports' && 'Advanced analytics, daily sales, vendor settlements, and P&L ledger'}
              {activeTab === 'crm' && 'Customer loyalty, broadcasts, feedback, and low-stock alerts'}
              {activeTab === 'wallet' && 'Manage RFID cards, prepaid wallets, and mess subscriptions'}
              {activeTab === 'qr' && 'Generate table QR codes, monitor QR orders and manage self-ordering settings'}
            </p>
          </div>
          <div class="top-bar-right">
            <div class="vendor-filter-context" style={{ marginRight: '15px' }}>
              <select 
                value={selectedVendorId} 
                onChange={(e) => {
                  setSelectedVendorId(e.target.value);
                  if (e.target.value !== 'all' && (activeTab === 'vendors' || activeTab === 'hr')) {
                    setActiveTab('dashboard');
                  }
                }}
                className="vendor-select-dropdown"
              >
                <option value="all">🏢 Central Admin (Full View)</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>🏪 Stall: {v.name} ({v.stall_number})</option>
                ))}
              </select>
            </div>
            <div class="session-timer">
              <span>{liveTime}</span>
            </div>
            <div class="tenant-selector">
              <span class="tenant-badge">Central Canteen</span>
            </div>
          </div>
        </header>

        <div class="view-panel-container">
          
          
      {/* Overhead Modal */}
      {showOverheadModal && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Log Overhead Expense</h2>
              <button className="close-btn" onClick={() => setShowOverheadModal(false)}>×</button>
            </div>
            <form onSubmit={handleOverheadSubmit} className="modal-body">
              <div className="form-group">
                <label>Date</label>
                <input type="date" className="form-control" value={overheadForm.expense_date} onChange={e => setOverheadForm({...overheadForm, expense_date: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select className="form-control" value={overheadForm.category} onChange={e => setOverheadForm({...overheadForm, category: e.target.value})}>
                  <option>Rent</option>
                  <option>Electricity</option>
                  <option>Water</option>
                  <option>Marketing</option>
                  <option>Maintenance</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount (₹)</label>
                <input type="number" step="0.01" className="form-control" value={overheadForm.amount} onChange={e => setOverheadForm({...overheadForm, amount: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" className="form-control" value={overheadForm.description} onChange={e => setOverheadForm({...overheadForm, description: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary btn-block">Save Expense</button>
            </form>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Register Customer</h2>
              <button className="close-btn" onClick={() => setShowCustomerModal(false)}>×</button>
            </div>
            <form onSubmit={handleCustomerSubmit} className="modal-body">
              <div className="form-group">
                <label>Name</label>
                <input type="text" className="form-control" value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="text" className="form-control" value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Email (Optional)</label>
                <input type="email" className="form-control" value={customerForm.email} onChange={e => setCustomerForm({...customerForm, email: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary btn-block">Register Customer</button>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================

               2.1 DASHBOARD PANEL
               ========================================== */}
          {activeTab === 'dashboard' && (
            <div className="view-panel active">
              
              {/* Shift Controls Section */}
              {user.role !== 'Staff' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Shift Controls</h3>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-outline-success" onClick={() => { fetchCashDrawerStatus(); setShowCashDrawerModal(true); }}>
                      Start Shift
                    </button>
                    <button className="btn btn-outline-danger" onClick={() => { fetchCashDrawerStatus(); setShowCashDrawerModal(true); }}>
                      End Shift
                    </button>
                  </div>
                </div>
              )}

              <div className="stats-grid">
                <div className="stats-card revenue-card">
                  <div className="stats-info">
                    <h3>Today's Net Sales</h3>
                    <span className="stats-value">₹{dashData.revenue.toFixed(2)}</span>
                    <p className="stats-label">GST Collected: ₹{dashData.gstCollected.toFixed(2)}</p>
                  </div>
                  <div className="stats-icon-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{width: 24, height: 24}}>
                      <line x1="12" y1="1" x2="12" y2="23"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                  </div>
                </div>

                <div className="stats-card orders-card">
                  <div className="stats-info">
                    <h3>Today's Orders</h3>
                    <span className="stats-value">{dashData.ordersCount}</span>
                    <p className="stats-label">Takeaway & Counter KOTs</p>
                  </div>
                  <div className="stats-icon-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{width: 24, height: 24}}>
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <path d="M16 10a4 4 0 0 1-8 0"/>
                    </svg>
                  </div>
                </div>


                {/* Live Pending Orders card removed from Dashboard */}

                <div 
                  className={`stats-card stock-alert-card ${dashData.lowStockCount > 0 ? 'has-alerts' : ''}`}
                  onClick={() => { setActiveTab('materials'); }}
                >
                  <div className="stats-info">
                    <h3>Low Stock Materials</h3>
                    <span className="stats-value">{dashData.lowStockCount}</span>
                    <p className="stats-label">Requires immediate restock</p>
                  </div>
                  <div className="stats-icon-wrapper">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{width: 24, height: 24}}>
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Aggregates details grids */}
              <div className="dashboard-details-grid">
                <div className="panel-card">
                  <div className="panel-card-header">
                    <h3>Top Performing Menu Items</h3>
                    <span>By Sales Quantity</span>
                  </div>
                  <div className="panel-card-body">
                    <div className="chart-list">
                      {dashData.topSelling.length > 0 ? (
                        dashData.topSelling.map((val, idx) => {
                          // Find max qty to scale chart progress bars
                          const maxQty = Math.max(...dashData.topSelling.map(t => t.qty));
                          const percentage = maxQty > 0 ? (val.qty / maxQty) * 100 : 0;
                          return (
                            <div className="chart-bar-item" key={idx}>
                              <div className="chart-bar-label">
                                <span className="chart-bar-name">{val.name}</span>
                                <span className="chart-bar-val">{val.qty} Units (₹{val.sales.toFixed(2)})</span>
                              </div>
                              <div className="chart-bar-track">
                                <div className="chart-bar-fill" style={{ width: `${percentage}%` }}></div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="empty-state">No sales transactions checked out today.</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="panel-card">
                  <div className="panel-card-header">
                    <h3>Current Stock Alert Checklist</h3>
                    <span className={`badge ${dashData.lowStockCount > 0 ? 'badge-danger' : 'badge-success'}`}>
                      {dashData.lowStockCount} Alerts
                    </span>
                  </div>
                  <div className="panel-card-body">
                    <div className="alert-list-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Material</th>
                            <th>Available Stock</th>
                            <th>Min Threshold</th>
                            <th>Quick Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashData.lowStockMaterials.length > 0 ? (
                            dashData.lowStockMaterials.map((mat, idx) => (
                              <tr key={idx}>
                                <td><strong>{mat.name}</strong></td>
                                <td className="text-danger" style={{fontWeight: 700}}>
                                  {parseFloat(mat.stock_level).toFixed(3)} {mat.unit}
                                </td>
                                <td>{parseFloat(mat.min_stock).toFixed(3)} {mat.unit}</td>
                                <td>
                                  <button 
                                    className="btn btn-success btn-small"
                                    onClick={() => handleOpenStockAction(mat.id)}
                                  >
                                    Restock
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4" className="empty-state" style={{textAlign: 'center'}}>
                                No inventory alerts! All ingredients healthy.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
               2.2 COUNTER POS PANEL
               ========================================== */}
          {activeTab === 'pos' && (
            <div className="view-panel active">
              <div className={`pos-layout ${isRushHour ? 'rush-hour' : ''}`}>
                {/* Left side catalog */}
                <div className="pos-catalog">
                  <div className="catalog-header">
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div className="search-bar-wrapper" style={{ flex: 1 }}>
                        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8"/>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        <input 
                          type="text" 
                          placeholder="Search menu items..."
                          value={posSearch}
                          onChange={(e) => setPosSearch(e.target.value)}
                        />
                        {posSearch && (
                          <button className="clear-search" onClick={() => setPosSearch('')}>×</button>
                        )}
                      </div>
                      <button className="btn btn-outline-primary btn-small" onClick={() => { fetchCashDrawerStatus(); setShowCashDrawerModal(true); }} style={{ padding: '6px 10px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        💵 Drawer
                      </button>
                      <button className={`btn btn-small ${isRushHour ? 'btn-danger' : 'btn-outline-primary'}`} onClick={() => setIsRushHour(!isRushHour)} style={{ padding: '6px 10px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        ⚡ {isRushHour ? 'Rush ON' : 'Rush'}
                      </button>
                    </div>
                    <div className="category-tabs-container">
                      <div className="category-tabs">
                        {['All', 'Breakfast', 'Lunch', 'Snacks', 'Beverages', 'Combos', 'Specials'].map((cat, idx) => (
                          <button
                            key={idx}
                            className={`cat-tab ${posCategory === cat ? 'active' : ''}`}
                            onClick={() => setPosCategory(cat)}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pos-grid">
                    {filteredPOSItems.length > 0 ? (
                      filteredPOSItems.map((item, idx) => {
                        const inCartCount = cart.find(c => c.id === item.id)?.quantity || 0;
                        return (
                          <div 
                            key={idx} 
                            className={`pos-item-card ${inCartCount > 0 ? 'selected-active' : ''}`}
                            onClick={() => handleAddToCart(item)}
                          >
                            <div className="pos-item-img-container">
                              {item.image_url ? (
                                <>
                                  <img 
                                    src={item.image_url} 
                                    alt={item.name} 
                                    className="pos-item-img" 
                                    referrerPolicy="no-referrer" 
                                    loading="lazy" 
                                    onError={(e) => { 
                                      e.target.style.display='none'; 
                                      e.target.parentElement.querySelector('.pos-item-fallback') && (e.target.parentElement.querySelector('.pos-item-fallback').style.display='flex'); 
                                    }}
                                  />
                                  <div className="pos-item-fallback" style={{display:'none'}}>
                                    <span className="pos-fallback-emoji">{getCategoryEmoji(item.category)}</span>
                                  </div>
                                </>
                              ) : (
                                <div className="pos-item-fallback">
                                  <span className="pos-fallback-emoji">{getCategoryEmoji(item.category)}</span>
                                </div>
                              )}
                              <span className="pos-card-tag">{item.category}</span>
                            </div>
                            {item.is_special ? <span className="pos-special-badge">⭐ Special</span> : null}
                            <div className="pos-item-info">
                              <div className="pos-item-name">{item.name}</div>
                              {item.description && <div className="pos-item-desc">{item.description}</div>}
                            </div>
                            <div className="pos-item-footer">
                              {item.is_special && item.special_price ? (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '0.7rem', textDecoration: 'line-through', color: 'var(--text-muted)' }}>₹{parseFloat(item.price).toFixed(2)}</span>
                                  <span className="pos-item-price" style={{ color: 'var(--accent-warning)' }}>₹{parseFloat(item.special_price).toFixed(2)}</span>
                                </div>
                              ) : (
                                <span className="pos-item-price">₹{parseFloat(item.price).toFixed(2)}</span>
                              )}
                              {inCartCount > 0 ? (
                                <span className="badge badge-success">Selected (x{inCartCount})</span>
                              ) : (
                                <span className="pos-add-action-btn">+ Add</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="empty-state" style={{gridColumn: '1/-1'}}>
                        No active dishes match your filters today.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side checkout cart panel */}
                <div className="pos-billing-pane">
                  <div className="billing-header">
                    <h3>Current Order Cart</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button 
                        className={`btn btn-secondary-outline btn-xs ${heldOrders.length > 0 ? 'pulse-badge' : ''}`} 
                        onClick={() => { fetchHeldOrders(); setShowHeldModal(true); }}
                      >
                        Recall ({heldOrders.length})
                      </button>
                      {cart.length > 0 && (
                        <>
                          <button className="btn btn-warning-outline btn-xs" onClick={() => setShowHoldModal(true)}>
                            Hold
                          </button>
                          <button className="btn btn-icon-only btn-danger-outline" onClick={handleClearCart} style={{ padding: '4px' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 14, height: 14}}>
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="cart-items-wrapper">
                    {cart.length > 0 ? (
                      cart.map((item, idx) => (
                        <div className="cart-item-row" key={idx}>
                          <div className="cart-item-details">
                            <span className="cart-item-name">{item.name}</span>
                            {items.find(i => i.id === item.id)?.category === 'Combos' && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '10px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                {combos.filter(c => c.combo_id === item.id).map((child, cIdx) => (
                                  <span key={cIdx}>&bull; {child.child_name || items.find(i => i.id === child.child_item_id)?.name} (x{child.quantity})</span>
                                ))}
                              </div>
                            )}
                            <span className="cart-item-price">₹{item.price.toFixed(2)}</span>
                          </div>
                          <div className="cart-qty-controls">
                            <button className="cart-qty-btn" onClick={() => handleUpdateCartQty(item.id, -1)}>&minus;</button>
                            <span className="cart-qty-num">{item.quantity}</span>
                            <button className="cart-qty-btn" onClick={() => handleUpdateCartQty(item.id, 1)}>+</button>
                          </div>
                          <span className="cart-item-total">₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="cart-empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cart-empty-icon">
                          <circle cx="9" cy="21" r="1"/>
                          <circle cx="20" cy="21" r="1"/>
                          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                        </svg>
                        <p>Order Cart is empty.</p>
                        <span>Select menu items on the left to build order.</span>
                      </div>
                    )}
                  </div>

                  <div className="billing-footer">
                    <div className="price-row">
                      <span>Subtotal</span>
                      <span>₹{cartSubtotal.toFixed(2)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="price-row discount-row" style={{ color: '#f87171', animation: 'fadeIn 0.2s' }}>
                        <span>Discount ({discountType === 'Percentage' ? `${discountValue}%` : discountType}{discountReference ? ` - ${discountReference}` : ''})</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>-₹{discountAmount.toFixed(2)}</span>
                          <button 
                            onClick={handleClearDiscount} 
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', padding: 0, fontWeight: 'bold' }}
                            title="Remove Discount"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="price-row">
                      <span>GST (5% Inclusive)</span>
                      <span>₹{cartTax.toFixed(2)}</span>
                    </div>
                    <hr className="price-divider"/>
                    <div className="price-row total-row">
                      <span>Payable Amount</span>
                      <span>₹{Math.max(0, cartSubtotal - discountAmount).toFixed(2)}</span>
                    </div>

                    {/* Interactive Discounts Panel */}
                    {cart.length > 0 && (
                      <div className="pos-discount-panel" style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                          {/* Loyalty Redemption - First position */}
                          <button 
                            type="button"
                            className={`btn btn-xs ${discountType === 'Loyalty' ? 'btn-primary' : 'btn-secondary-outline'}`}
                            onClick={() => { setDiscountType(discountType === 'Loyalty' ? 'None' : 'Loyalty'); setDiscountAmount(0); setLoyaltyRedeemPoints(''); setLoyaltyCustomerInfo(null); }}
                            style={{ whiteSpace: 'nowrap', background: discountType === 'Loyalty' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : undefined, borderColor: discountType !== 'Loyalty' ? '#f59e0b55' : undefined, color: discountType !== 'Loyalty' ? '#f59e0b' : undefined }}
                            title="Redeem customer loyalty points as a discount"
                          >
                            ⭐ Loyalty
                          </button>
                          <button 
                            type="button"
                            className={`btn btn-xs ${discountType === 'Coupon' ? 'btn-primary' : 'btn-secondary-outline'}`}
                            onClick={() => { setDiscountType(discountType === 'Coupon' ? 'None' : 'Coupon'); setDiscountAmount(0); }}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            Promo Code
                          </button>
                          <button 
                            type="button"
                            className={`btn btn-xs ${discountType === 'Student' ? 'btn-primary' : 'btn-secondary-outline'}`}
                            onClick={() => { setDiscountType(discountType === 'Student' ? 'None' : 'Student'); setDiscountAmount(0); }}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            Student ID
                          </button>
                          <button 
                            type="button"
                            className={`btn btn-xs ${discountType === 'Staff' ? 'btn-primary' : 'btn-secondary-outline'}`}
                            onClick={() => { setDiscountType(discountType === 'Staff' ? 'None' : 'Staff'); setDiscountAmount(0); }}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            Staff Discount
                          </button>
                          <button 
                            type="button"
                            className={`btn btn-xs ${discountType === 'StaffMeal' ? 'btn-primary' : 'btn-secondary-outline'}`}
                            onClick={() => { setDiscountType(discountType === 'StaffMeal' ? 'None' : 'StaffMeal'); setDiscountAmount(0); }}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            Staff Meal
                          </button>
                          <button 
                            type="button"
                            className={`btn btn-xs ${discountType === 'Percentage' ? 'btn-primary' : 'btn-secondary-outline'}`}
                            onClick={() => { setDiscountType(discountType === 'Percentage' ? 'None' : 'Percentage'); setDiscountAmount(0); }}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            Custom %
                          </button>
                        </div>

                        {discountType === 'Coupon' && (
                          <div style={{ display: 'flex', gap: '6px', animation: 'slideDown 0.2s' }}>
                            <input 
                              type="text" 
                              placeholder="e.g. CAMPUS10" 
                              className="input-field input-xs"
                              value={couponCode} 
                              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                              style={{ flex: 1, padding: '4px 8px', height: '32px', fontSize: '12px' }}
                            />
                            <button type="button" className="btn btn-primary btn-xs" onClick={handleApplyCoupon}>Apply</button>
                          </div>
                        )}

                        {discountType === 'Student' && (
                          <div style={{ display: 'flex', gap: '6px', animation: 'slideDown 0.2s' }}>
                            <input 
                              type="text" 
                              placeholder="Enter Student Card ID" 
                              className="input-field input-xs"
                              value={studentId} 
                              onChange={(e) => setStudentId(e.target.value)}
                              style={{ flex: 1, padding: '4px 8px', height: '32px', fontSize: '12px' }}
                            />
                            <button type="button" className="btn btn-primary btn-xs" onClick={handleApplyStudentDiscount}>10% Off</button>
                          </div>
                        )}

                        {discountType === 'Staff' && (
                          <div style={{ display: 'flex', gap: '6px', animation: 'slideDown 0.2s' }}>
                            <select 
                              className="input-field input-xs" 
                              value={selectedStaffId}
                              onChange={(e) => handleApplyStaffDiscount(e.target.value)}
                              style={{ flex: 1, padding: '4px 8px', height: '32px', fontSize: '12px' }}
                            >
                              <option value="">-- Choose Employee (15% Off) --</option>
                              {staff.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {discountType === 'StaffMeal' && (
                          <div style={{ display: 'flex', gap: '6px', animation: 'slideDown 0.2s' }}>
                            <select 
                              className="input-field input-xs" 
                              value={selectedStaffId}
                              onChange={(e) => handleApplyStaffMeal(e.target.value)}
                              style={{ flex: 1, padding: '4px 8px', height: '32px', fontSize: '12px' }}
                            >
                              <option value="">-- Choose Employee (Staff Meal) --</option>
                              {staff.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {discountType === 'Percentage' && (
                          <div style={{ display: 'flex', gap: '6px', animation: 'slideDown 0.2s' }}>
                            <input 
                              type="number" 
                              min="0" 
                              max="100" 
                              placeholder="Enter Discount %" 
                              className="input-field input-xs"
                              value={discountValue || ''} 
                              onChange={(e) => handleApplyCustomDiscount(e.target.value)}
                              style={{ flex: 1, padding: '4px 8px', height: '32px', fontSize: '12px' }}
                            />
                          </div>
                        )}

                        {/* ⭐ LOYALTY REDEMPTION PANEL */}
                        {discountType === 'Loyalty' && (
                          <div style={{ animation: 'slideDown 0.2s', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '6px', padding: '8px 10px' }}>
                            {/* Show selected customer info */}
                            {posCustomerId ? (() => {
                              const cust = customers.find(c => c.id === parseInt(posCustomerId));
                              return cust ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '4px 8px', background: 'rgba(245,158,11,0.12)', borderRadius: '4px' }}>
                                  <span style={{ fontSize: '16px' }}>⭐</span>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#f59e0b' }}>{cust.name}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Available: <strong style={{ color: '#fbbf24' }}>{cust.loyalty_points} points</strong> = ₹{cust.loyalty_points} max</div>
                                  </div>
                                </div>
                              ) : null;
                            })() : (
                              <div style={{ fontSize: '11px', color: '#f59e0b', marginBottom: '6px', padding: '4px 8px', background: 'rgba(245,158,11,0.1)', borderRadius: '4px' }}>
                                ⚠️ Please select a Loyalty Customer in the section below first.
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <input 
                                type="number" 
                                min="50" 
                                step="10"
                                placeholder="Points to redeem (min 50)" 
                                className="input-field input-xs"
                                value={loyaltyRedeemPoints} 
                                onChange={(e) => setLoyaltyRedeemPoints(e.target.value)}
                                style={{ flex: 1, padding: '4px 8px', height: '32px', fontSize: '12px' }}
                                disabled={!posCustomerId}
                              />
                              <button 
                                type="button" 
                                className="btn btn-xs"
                                style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', whiteSpace: 'nowrap', height: '32px' }}
                                onClick={handleApplyLoyaltyRedemption}
                                disabled={!posCustomerId || !loyaltyRedeemPoints}
                              >
                                Redeem {loyaltyRedeemPoints ? `= ₹${loyaltyRedeemPoints}` : 'Points'}
                              </button>
                            </div>
                            {loyaltyRedeemPoints && posCustomerId && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                💡 {loyaltyRedeemPoints} pts = ₹{loyaltyRedeemPoints} discount (1 pt = ₹1)
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* POS Metadata & Cashier Section */}
                    <div className="pos-metadata-section" style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                      <div className="hr-form-group" style={{ marginBottom: '8px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Loyalty Customer</label>
                        <select 
                          className="input-field input-xs" 
                          value={posCustomerId}
                          onChange={(e) => setPosCustomerId(e.target.value)}
                          style={{ width: '100%', padding: '4px 8px', height: '28px', fontSize: '11px' }}
                        >
                          <option value="">-- Guest Order (No Loyalty) --</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.phone} - {c.loyalty_points} pts)</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div className="hr-form-group" style={{ flex: 1, marginBottom: 0 }}>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cashier / Staff *</label>
                          <select 
                            required
                            className="input-field input-xs" 
                            value={posCashierId}
                            onChange={(e) => setPosCashierId(e.target.value)}
                            style={{ width: '100%', padding: '4px 8px', height: '28px', fontSize: '11px' }}
                          >
                            <option value="">-- Select Cashier --</option>
                            {staff.filter(s => s.role === 'Billing Staff' || s.role === 'Cashier' || s.role === 'Manager' || s.role === 'Owner').map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '14px' }}>
                          <input 
                            type="checkbox" 
                            id="posIsUpsold" 
                            checked={posIsUpsold}
                            onChange={(e) => setPosIsUpsold(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                          />
                          <label htmlFor="posIsUpsold" style={{ fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', margin: 0 }}>Upsold?</label>
                        </div>
                      </div>
                    </div>

                    <div className="payment-method-section" style={{ marginTop: '12px' }}>
                      <label>Select Payment Mode</label>
                      <div className="payment-grid">
                        {['Cash', 'UPI', 'Card', 'Credit', 'RFID Wallet', 'Mess Plan', 'Split'].map((mode, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className={`pay-btn ${posPaymentMode === mode ? 'active' : ''}`}
                            onClick={() => {
                              setPosPaymentMode(mode);
                              // Clear RFID state when switching away from RFID modes
                              if (!['RFID Wallet', 'Mess Plan'].includes(mode)) {
                                setRfidScanInput('');
                                setRfidCustomerInfo(null);
                                setRfidStatusMsg('');
                                setRfidLoading(false);
                              }
                              if (mode === 'Split') {
                                const total = Math.max(0, cartSubtotal - discountAmount);
                                setSplitCount(2);
                                setSplitType('Equal');
                                setSplitPayments([
                                  { mode: 'Cash', amount: (total / 2).toFixed(2) },
                                  { mode: 'UPI', amount: (total / 2).toFixed(2) }
                                ]);
                                setShowSplitModal(true);
                              }
                            }}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                    {['RFID Wallet', 'Mess Plan'].includes(posPaymentMode) && (
                      <div style={{ marginTop: '12px', background: 'rgba(59,130,246,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <label style={{ fontSize: '11px', color: '#60a5fa' }}>Tap Card on Reader</label>
                        <form onSubmit={handleRfidSubmit} style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <input 
                            autoFocus 
                            type="text" 
                            value={rfidScanInput}
                            onChange={(e) => setRfidScanInput(e.target.value)}
                            placeholder="Awaiting RFID scan..."
                            style={{ flex: 1, padding: '8px 12px', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff' }}
                          />
                          <button type="submit" disabled={rfidLoading} style={{ padding: '8px 16px', background: rfidLoading ? '#374151' : '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: rfidLoading ? 'not-allowed' : 'pointer', fontWeight: 600 }}>{rfidLoading ? 'Verifying...' : 'Verify'}</button>
                        </form>
                        {rfidStatusMsg && <div style={{ marginTop: '8px', fontSize: '12px', color: rfidStatusMsg.startsWith('✅') ? '#34d399' : '#f87171' }}>{rfidStatusMsg}</div>}
                      </div>
                    )}


                    {posPaymentMode === 'Split' && (
                      <div style={{ marginTop: '8px' }}>
                        <button 
                          type="button"
                          className="btn btn-secondary-outline btn-block btn-xs"
                          onClick={() => setShowSplitModal(true)}
                          style={{ borderColor: '#eab308', color: '#eab308' }}
                        >
                          ⚙️ Configure Split Payments
                        </button>
                      </div>
                    )}

                    <button 
                      className="btn btn-primary btn-block btn-large" 
                      onClick={handleCheckoutPOS}
                      disabled={cart.length === 0 || !posCashierId || isPosCheckoutLoading}
                      style={{ marginTop: '12px', opacity: isPosCheckoutLoading ? 0.75 : 1, cursor: isPosCheckoutLoading ? 'not-allowed' : 'pointer' }}
                    >
                      {isPosCheckoutLoading ? (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 20, height: 20, marginRight: 8, animation: 'spin 1s linear infinite'}}>
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                          </svg>
                          Processing Order...
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 20, height: 20, marginRight: 8}}>
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Confirm Order &amp; Print KOT
                        </>
                      )}
                    </button>
                    {!posCashierId && cart.length > 0 && (
                      <p style={{ color: '#f87171', fontSize: '11px', textAlign: 'center', marginTop: '4px', fontWeight: 600 }}>
                        [Warning] Select cashier before confirming order
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
               2.3 MENU MASTER PANEL
               ========================================== */}
          {activeTab === 'menu' && (
            <div className="view-panel active">
              <div className="view-header-bar">
                <div className="header-search-bar">
                  <input 
                    type="text" 
                    placeholder="Search menu master (e.g. Veg biryani)..."
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                  />
                  <select 
                    value={menuCategoryFilter}
                    onChange={(e) => setMenuCategoryFilter(e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Combos">Combos</option>
                    <option value="Specials">Specials</option>
                  </select>
                </div>
                <button className="btn btn-primary" onClick={handleOpenAddMenu}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{width: 18, height: 18, marginRight: 6}}>
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add New Menu Item
                </button>
              </div>

              <div className="menu-items-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Base Price</th>
                      <th>GST Rate</th>
                      <th>Description</th>
                      <th>Daily Activation</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMenuItems.length > 0 ? (
                      filteredMenuItems.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="table-image" referrerPolicy="no-referrer" loading="lazy"/>
                            ) : (
                              <div className="table-image-fallback">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style={{width: 20, height: 20}}>
                                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                                </svg>
                              </div>
                            )}
                          </td>
                          <td><strong>{item.name}</strong></td>
                          <td><span className="badge badge-category">{item.category}</span></td>
                          <td><strong className="text-success">₹{parseFloat(item.price).toFixed(2)}</strong></td>
                          <td>{parseFloat(item.gst_rate).toFixed(1)}%</td>
                          <td style={{maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                            {item.description || <span className="text-muted">No description</span>}
                          </td>
                          <td>
                            <label className="switch">
                              <input 
                                type="checkbox" 
                                checked={item.is_active === 1}
                                onChange={() => handleToggleItemActive(item)}
                              />
                              <span className="slider"></span>
                            </label>
                          </td>
                          <td>
                            <div className="action-btns">
                              <button 
                                className="btn btn-outline-primary btn-small"
                                onClick={() => handleOpenEditMenu(item)}
                              >
                                Edit
                              </button>
                              {item.category === 'Combos' && (
                                <button 
                                  className="btn btn-outline-success btn-small"
                                  onClick={() => {
                                    const comboItemsList = Array.isArray(combos) ? combos : [];
                                    const existing = comboItemsList.filter(c => c.combo_id === item.id).map(c => ({ child_item_id: c.child_item_id, child_name: c.child_name, quantity: c.quantity }));
                                    setComboModal({ show: true, comboId: item.id, comboName: item.name, childItems: existing });
                                  }}
                                  style={{ marginLeft: '4px' }}
                                >
                                  Manage Combo
                                </button>
                              )}
                              <button 
                                className="btn btn-danger-small"
                                onClick={() => handleDeleteMenuItem(item.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="empty-state">
                          No menu items found. Build one using the "Add New Menu Item" button.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==========================================
               2.4 RAW MATERIALS & SUPPLIERS PANEL
               ========================================== */}
          {activeTab === 'materials' && (
            <div className="view-panel active">
              <div className="sub-tab-bar" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button className={`btn ${inventorySubTab === 'materials' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setInventorySubTab('materials')}>Raw Materials</button>
                <button className={`btn ${inventorySubTab === 'suppliers' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setInventorySubTab('suppliers')}>Suppliers</button>
              </div>

              {inventorySubTab === 'materials' && (
                <div>
                  <div className="view-header-bar">
                    <div className="header-search-bar">
                      <input 
                        type="text" 
                        placeholder="Search stock ingredients (e.g. Sugar, Milk)..."
                        value={materialSearch}
                        onChange={(e) => setMaterialSearch(e.target.value)}
                      />
                    </div>
                    <div style={{display: 'flex', gap: 10}}>
                      <button className="btn btn-success" onClick={handleOpenPurchaseEntry}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{width: 18, height: 18, marginRight: 6}}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="12" y1="18" x2="12" y2="12"/>
                          <line x1="9" y1="15" x2="15" y2="15"/>
                        </svg>
                        New Purchase Entry
                      </button>
                      <button className="btn btn-outline-primary" onClick={() => handleOpenStockAction('')}>
                        New Purchase Entry / Stock Action
                      </button>
                      <button className="btn btn-outline-success" onClick={handleOpenBulkOpening}>
                        Bulk Opening Stock
                      </button>
                      <button className="btn btn-outline-warning" onClick={handleOpenBulkClosing}>
                        Closing Stock Entry
                      </button>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Ingredient Name</th>
                          <th>Unit of Measure</th>
                          <th>Current Stock Level</th>
                          <th>Min Alert Threshold</th>
                          <th>Status Badge</th>
                          <th>Quick Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMaterials.length > 0 ? (
                          filteredMaterials.map((mat, idx) => {
                            const isLow = parseFloat(mat.stock_level) <= parseFloat(mat.min_stock);
                            return (
                              <tr key={idx}>
                                <td>{mat.id}</td>
                                <td><strong>{mat.name}</strong></td>
                                <td><span className="badge badge-category">{mat.unit}</span></td>
                                <td style={{ fontWeight: 700, color: isLow ? 'var(--accent-danger)' : 'var(--text-light)' }}>
                                  {parseFloat(mat.stock_level).toFixed(3)} {mat.unit}
                                </td>
                                <td>{parseFloat(mat.min_stock).toFixed(3)} {mat.unit}</td>
                                <td>
                                  <span className={`badge ${isLow ? 'badge-danger' : 'badge-success'}`}>
                                    {isLow ? 'Low Stock Warning' : 'Healthy Level'}
                                  </span>
                                </td>
                                <td>
                                  <div className="action-btns">
                                    <button 
                                      className="btn btn-success btn-small"
                                      onClick={() => handleOpenStockAction(mat.id)}
                                    >
                                      Restock
                                    </button>
                                    <button 
                                      className="btn btn-danger-small"
                                      onClick={() => handleDeleteMaterial(mat.id)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="7" className="empty-state">No raw materials in database ledger yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {inventorySubTab === 'suppliers' && (
                <div>
                  <div className="view-header-bar">
                    <h3>Supplier Directory</h3>
                    <button className="btn btn-primary" onClick={() => {
                      setFormSupplier({ name: '', contact_person: '', phone: '', email: '', address: '', payment_terms: '', items_supplied: '', delivery_schedule: '' });
                      setSupplierModal({ show: true, mode: 'add', data: null });
                      setTempSupplierItem('');
                      setShowSupplierItemSuggestions(false);
                    }}>Add Supplier</button>
                  </div>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Supplier Name</th>
                          <th>Contact</th>
                          <th>Phone</th>
                          <th>Email</th>
                          <th>Items Supplied</th>
                          <th>Outstanding</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suppliers.map(s => (
                          <tr key={s.id}>
                            <td><strong>{s.name}</strong></td>
                            <td>{s.contact_person}</td>
                            <td>{s.phone}</td>
                            <td>{s.email}</td>
                            <td>{s.items_supplied}</td>
                            <td className={s.outstanding_balance > 0 ? 'text-danger' : 'text-success'}>₹{parseFloat(s.outstanding_balance || 0).toFixed(2)}</td>
                            <td>
                              <button className="btn btn-outline-primary btn-small" onClick={() => handleOpenSupplierHistory(s)}>History</button>
                              <button className="btn btn-outline-secondary btn-small" style={{marginLeft: '5px'}} onClick={() => {
                                setFormSupplier(s);
                                setSupplierModal({ show: true, mode: 'edit', data: s });
                                setTempSupplierItem('');
                                setShowSupplierItemSuggestions(false);
                              }}>Edit</button>
                              <button className="btn btn-danger-small" style={{marginLeft: '5px'}} onClick={async () => {
                                if(!window.confirm('Delete supplier?')) return;
                                try {
                                  const res = await fetch(`${API_BASE}/suppliers/${s.id}`, { method: 'DELETE' });
                                  if(res.ok) { showToast('Deleted', 'success'); fetchSuppliers(); }
                                } catch(e) { showToast('Error', 'error'); }
                              }}>Delete</button>
                            </td>
                          </tr>
                        ))}
                        {suppliers.length === 0 && <tr><td colSpan="7" className="empty-state">No suppliers found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==========================================
               2.5 RECIPE FORMULATION BUILDER
               ========================================== */}
          {activeTab === 'recipes' && (
            <div className="view-panel active">
                  <div className="recipe-formulation-layout">
                    {/* Left menu items column */}
                    <div className="recipe-items-sidebar">
                      <h3>Select Menu Item</h3>
                      <input 
                        type="text" 
                        placeholder="Search item..."
                        value={recipeSearch}
                        onChange={(e) => setRecipeSearch(e.target.value)}
                      />
                      <div className="recipe-item-list">
                        {filteredRecipeMenuItems.map((item, idx) => (
                          <div 
                            key={idx} 
                            className={`recipe-item-row ${selectedRecipeItem?.id === item.id ? 'active' : ''}`}
                            onClick={() => loadRecipeFor(item)}
                          >
                            <span className="recipe-item-name">{item.name}</span>
                            <span className="badge badge-category">{item.category}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right formulation canvas */}
                    <div className="recipe-builder-panel">
                      {selectedRecipeItem ? (
                        <div className="recipe-builder-form">
                          <div className="recipe-builder-header">
                            <div>
                              <h3>Formulate Recipe: {selectedRecipeItem.name}</h3>
                              <p>Link raw ingredients consumed per serving</p>
                            </div>
                            <button className="btn btn-success" onClick={handleSaveRecipe}>
                              Save Recipe Configuration
                            </button>
                          </div>

                          {/* === FAST ENTRY TOOLBAR === */}
                          <div className="recipe-fast-entry-bar">
                            <button 
                              className={`btn btn-fast-entry ${recipeBulkPasteMode ? 'active' : ''}`}
                              onClick={() => { setRecipeBulkPasteMode(!recipeBulkPasteMode); setRecipeCloneDropdown(false); setRecipeTemplateDropdown(false); }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 15, height: 15, marginRight: 5}}>
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                              </svg>
                              Bulk Paste
                            </button>

                            <div style={{position: 'relative'}} ref={cloneDropdownRef}>
                              <button 
                                className={`btn btn-fast-entry ${recipeCloneDropdown ? 'active' : ''}`}
                                onClick={() => { setRecipeCloneDropdown(!recipeCloneDropdown); setRecipeCloneSearch(''); setRecipeBulkPasteMode(false); setRecipeTemplateDropdown(false); }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 15, height: 15, marginRight: 5}}>
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                                Clone From...
                              </button>
                              {recipeCloneDropdown && (
                                <div className="recipe-dropdown-panel">
                                  <input 
                                    type="text" 
                                    placeholder="Search item to clone..."
                                    className="recipe-dropdown-search"
                                    value={recipeCloneSearch}
                                    onChange={(e) => setRecipeCloneSearch(e.target.value)}
                                    autoFocus
                                  />
                                  <div className="recipe-dropdown-list">
                                    {itemsWithRecipes
                                      .filter(i => i.name.toLowerCase().includes(recipeCloneSearch.toLowerCase()))
                                      .map((item, idx) => (
                                        <div 
                                          key={idx} 
                                          className="recipe-dropdown-item"
                                          onClick={() => handleCloneRecipe(item)}
                                        >
                                          <span>{item.name}</span>
                                          <span className="badge badge-category" style={{fontSize: '0.65rem'}}>{item.category}</span>
                                        </div>
                                      ))
                                    }
                                    {itemsWithRecipes.filter(i => i.name.toLowerCase().includes(recipeCloneSearch.toLowerCase())).length === 0 && (
                                      <div className="recipe-dropdown-empty">No items with recipes found.</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div style={{position: 'relative'}} ref={templateDropdownRef}>
                              <button 
                                className={`btn btn-fast-entry ${recipeTemplateDropdown ? 'active' : ''}`}
                                onClick={() => { setRecipeTemplateDropdown(!recipeTemplateDropdown); setRecipeTemplateSearch(''); setRecipeBulkPasteMode(false); setRecipeCloneDropdown(false); }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 15, height: 15, marginRight: 5}}>
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                  <polyline points="14 2 14 8 20 8"/>
                                  <line x1="16" y1="13" x2="8" y2="13"/>
                                  <line x1="16" y1="17" x2="8" y2="17"/>
                                </svg>
                                Use Template
                              </button>
                              {recipeTemplateDropdown && (
                                <div className="recipe-dropdown-panel">
                                  <input 
                                    type="text" 
                                    placeholder="Search template..."
                                    className="recipe-dropdown-search"
                                    value={recipeTemplateSearch}
                                    onChange={(e) => setRecipeTemplateSearch(e.target.value)}
                                    autoFocus
                                  />
                                  <div className="recipe-dropdown-list">
                                    {RECIPE_TEMPLATES
                                      .filter(t => t.name.toLowerCase().includes(recipeTemplateSearch.toLowerCase()))
                                      .map((tpl, idx) => (
                                        <div 
                                          key={idx} 
                                          className="recipe-dropdown-item"
                                          onClick={() => handleApplyTemplate(tpl)}
                                        >
                                          <span>{tpl.name}</span>
                                          <span className="recipe-tpl-detail">{tpl.ingredients.length} items</span>
                                        </div>
                                      ))
                                    }
                                    {RECIPE_TEMPLATES.filter(t => t.name.toLowerCase().includes(recipeTemplateSearch.toLowerCase())).length === 0 && (
                                      <div className="recipe-dropdown-empty">No matching templates found.</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* === BULK PASTE TEXTAREA (conditionally visible) === */}
                          {recipeBulkPasteMode && (
                            <div className="recipe-bulk-paste-panel">
                              <label>Paste ingredients below <span style={{color: 'var(--text-muted)', fontWeight: 400}}>(one per line: name, quantity)</span></label>
                              <textarea
                                id="recipe-bulk-textarea"
                                className="recipe-bulk-textarea"
                                rows="6"
                                placeholder={"Rice, 0.15\nOil, 0.03\nMilk, 0.2\nSugar, 0.02"}
                                value={recipeBulkPasteText}
                                onChange={(e) => {
                                  setRecipeBulkPasteText(e.target.value);
                                  setTextareaCursorPos(e.target.selectionStart);
                                }}
                                onKeyUp={(e) => setTextareaCursorPos(e.target.selectionStart)}
                                onMouseUp={(e) => setTextareaCursorPos(e.target.selectionStart)}
                                onFocus={(e) => setTextareaCursorPos(e.target.selectionStart)}
                                autoFocus
                              />
                              
                              {/* Live Suggestions Bar */}
                              {activeSuggestions.length > 0 && (
                                <div className="recipe-bulk-suggestions">
                                  <span className="suggestion-label">Did you mean:</span>
                                  <div className="suggestion-badges">
                                    {activeSuggestions.map((m, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        className="btn-suggestion-badge"
                                        onClick={() => handleApplySuggestion(m.name)}
                                      >
                                        {m.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Live Validation Panel */}
                              {recipeBulkPasteText.trim() && (
                                <div className="recipe-bulk-validation-panel">
                                  <span className="panel-title">Live Parser Preview:</span>
                                  <div className="validation-lines">
                                    {getLiveParsedLines().map((parsed, idx) => (
                                      <div key={idx} className={`validation-line ${parsed.status}`}>
                                        <span className="line-num">Line {parsed.lineIdx + 1}:</span>
                                        <span className="line-text">"{parsed.name || '?'}"</span>
                                        
                                        {parsed.status === 'matched' ? (
                                          <span className="badge badge-success">
                                            ✓ {parsed.matchedMaterial.name} ({parsed.qty ? `${parsed.qty} ${parsed.matchedMaterial.unit}` : 'missing qty'})
                                          </span>
                                        ) : parsed.status === 'partial' ? (
                                          <span className="badge badge-warning">
                                            ⚠ Auto-maps: {parsed.matchedMaterial.name} ({parsed.qty ? `${parsed.qty} ${parsed.matchedMaterial.unit}` : 'missing qty'})
                                          </span>
                                        ) : (
                                          <span className="badge badge-danger">
                                            ✗ Unrecognized (will be ignored)
                                          </span>
                                        )}
                                        
                                        {parsed.name && !parsed.qty && (
                                          <span className="badge badge-danger" style={{marginLeft: '4px'}}>
                                            Missing Qty
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div style={{display: 'flex', gap: 8, marginTop: 12}}>
                                <button type="button" className="btn btn-success btn-small" onClick={handleBulkPasteParse}>
                                  Parse & Add Rows
                                </button>
                                <button type="button" className="btn btn-outline-primary btn-small" onClick={() => { setRecipeBulkPasteMode(false); setRecipeBulkPasteText(''); }}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="mapped-ingredients-container">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Raw Material / Ingredient</th>
                                  <th>Quantity required per serving</th>
                                  <th>UoM</th>
                                  <th>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {recipeRows.length > 0 ? (
                                  recipeRows.map((row, idx) => {
                                    const material = materials.find(m => m.id == row.material_id);
                                    return (
                                      <tr key={idx}>
                                        <td>
                                          <select 
                                            className="recipe-select-material"
                                            value={row.material_id}
                                            onChange={(e) => handleUpdateRecipeRow(idx, 'material_id', e.target.value)}
                                          >
                                            {materials.map((m, mIdx) => (
                                              <option value={m.id} key={mIdx}>{m.name}</option>
                                            ))}
                                          </select>
                                        </td>
                                        <td>
                                          <input 
                                            type="number" 
                                            step="0.001"
                                            min="0.001"
                                            className="recipe-qty-input"
                                            value={row.quantity}
                                            onChange={(e) => handleUpdateRecipeRow(idx, 'quantity', e.target.value)}
                                          />
                                        </td>
                                        <td><span className="badge badge-category">{material?.unit || 'UoM'}</span></td>
                                        <td>
                                          <button 
                                            className="btn btn-danger-small"
                                            onClick={() => handleRemoveRecipeRow(idx)}
                                          >
                                            Remove
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan="4" className="empty-state">
                                      No recipe mapped yet. Use the tools above or click button below to add ingredients.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                            <button className="btn btn-outline-primary btn-block btn-small" onClick={handleAddRecipeRow} style={{marginTop: 15}}>
                              + Add Ingredient Requirement Line
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="recipe-empty-state">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{width: 48, height: 48, stroke: 'var(--text-muted)', marginBottom: 12}}>
                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                          <h4>No Item Selected</h4>
                          <p>Choose a menu item from the catalog on the left to review or formulate its recipes mapping.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
          {/* ==========================================
               2.6 AUDIT STOCK LOGS PANEL
               ========================================== */}
          {activeTab === 'logs' && (
            <div className="view-panel active">
                  <div className="view-header-bar">
                    <h3>Inventory Transaction Audit Trail</h3>
                    <button className="btn btn-outline-primary" onClick={() => handleOpenStockAction('')}>
                      New Purchase Entry / Stock Action
                    </button>
                  </div>
                  
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Ingredient</th>
                          <th>Transaction Qty</th>
                          <th>Log Type</th>
                          <th>Reason / Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.length > 0 ? (
                          logs.map((log, idx) => (
                            <tr key={idx}>
                              <td style={{fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)'}}>
                                {new Date(log.logged_at).toLocaleString()}
                              </td>
                              <td><strong>{log.material_name}</strong></td>
                              <td style={{
                                fontWeight: 700,
                                color: parseFloat(log.change_qty) > 0 ? 'var(--accent-success)' : 'var(--accent-danger)'
                              }}>
                                {parseFloat(log.change_qty) > 0 ? `+${parseFloat(log.change_qty).toFixed(3)}` : parseFloat(log.change_qty).toFixed(3)} {log.unit}
                              </td>
                              <td>
                                <span className={`badge ${
                                  ['Purchase', 'Opening'].includes(log.log_type) ? 'badge-success' : 
                                  log.log_type === 'Wastage' ? 'badge-danger' : 'badge-category'
                                }`}>
                                  {log.log_type}
                                </span>
                              </td>
                              <td>{log.reason || <span className="text-muted">No remarks</span>}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="empty-state">No transaction audits logged yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
          )}

          {/* ==========================================
               QR ORDERING MANAGEMENT PANEL
               ========================================== */}
          {activeTab === 'qr' && (
            <QRManagementPanel />
          )}

          {/* ==========================================
               2.7 PAST ORDERS PANEL
               ========================================== */}
          {activeTab === 'orders' && (
            <div className="view-panel active">
              <div className="view-header-bar">
                <h3>Historical Sales Orders</h3>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Token Number</th>
                      <th>Date</th>
                      <th>Order Items</th>
                      <th>Net Total</th>
                      <th>Payment Mode</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastOrders.length > 0 ? (
                      pastOrders.map((order, idx) => (
                        <tr key={idx}>
                          <td><strong>{order.token_number}</strong></td>
                          <td style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>
                            {new Date(order.order_date).toLocaleString()}
                          </td>
                          <td>
                            <ul style={{margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem', color: 'var(--text-light)'}}>
                              {order.items.map((it, i) => (
                                <li key={i}>{it.name} <span className="text-muted">(x{it.quantity})</span></li>
                              ))}
                            </ul>
                          </td>
                          <td>
                            <strong className="text-success">₹{parseFloat(order.total_amount).toFixed(2)}</strong>
                            <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>GST: ₹{parseFloat(order.gst_amount).toFixed(2)}</div>
                          </td>
                          <td>
                            <span className={`badge ${order.status === 'Cancelled' ? 'badge-danger' : 'badge-category'}`}>
                              {order.status === 'Cancelled' ? 'Cancelled' : order.payment_mode}
                            </span>
                          </td>
                          <td>
                            {order.status !== 'Cancelled' && (
                              <button className="btn btn-danger-small" onClick={() => setCancelModal({ show: true, orderId: order.id, tokenNumber: order.token_number, pin: '', reason: '', step: 1 })}>Cancel</button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="empty-state">No orders have been recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==========================================
               2.8 KITCHEN DISPLAY SYSTEM (KDS) PANEL
               ========================================== */}
          {activeTab === 'kds' && (
            <div className="view-panel active">
              {/* KDS Toolbar */}
              <div className="kds-toolbar">
                <div className="kds-toolbar-left">
                  <div className="kds-tabs-selector">
                    <button
                      className={`kds-tab-btn ${!kdsShowHistory ? 'active' : ''}`}
                      onClick={() => setKdsShowHistory(false)}
                    >
                      🍳 Live Queue ({kdsOrders.length})
                    </button>
                    <button
                      className={`kds-tab-btn ${kdsShowHistory ? 'active' : ''}`}
                      onClick={() => {
                        setKdsShowHistory(true);
                        fetchKdsHistory();
                      }}
                    >
                      📋 Completed History
                    </button>
                  </div>
                </div>

                <div className="kds-toolbar-right">
                  {!kdsShowHistory ? (
                    <>
                      <div className="kds-filter-tabs">
                        {['All', 'Breakfast', 'Lunch', 'Snacks', 'Beverages'].map(cat => (
                          <button
                            key={cat}
                            className={`kds-filter-tab ${kdsFilter === cat ? 'active' : ''}`}
                            onClick={() => setKdsFilter(cat)}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      <div className="kds-stats-bar">
                        <div className="kds-stat">
                          Pending: <span className="kds-stat-value">{kdsOrders.filter(o => o.status === 'Pending').length}</span>
                        </div>
                        <div className="kds-stat">
                          Preparing: <span className="kds-stat-value">{kdsOrders.filter(o => o.status === 'Preparing').length}</span>
                        </div>
                      </div>

                      <button
                        className={`kds-rush-toggle ${kdsRushMode ? 'active' : ''}`}
                        onClick={() => setKdsRushMode(!kdsRushMode)}
                      >
                        🔥 {kdsRushMode ? 'Rush ON' : 'Rush Hour'}
                      </button>
                    </>
                  ) : (
                    <div className="kds-stats-bar">
                      <div className="kds-stat">
                        Completed (Last 2h): <span className="kds-stat-value">{kdsHistory.length}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Conditional Panels */}
              {!kdsShowHistory ? (
                <>
                  {/* Rush Hour Banner */}
                  {kdsRushMode && (
                    <div className="kds-rush-banner">
                      🔥 RUSH HOUR MODE — Compact view enabled for maximum visibility
                    </div>
                  )}

                  {/* KDS Active Order Grid */}
                  {(() => {
                    const filteredOrders = kdsOrders.filter(order => {
                      if (kdsFilter === 'All') return true;
                      return order.items && order.items.some(item => item.category === kdsFilter);
                    });

                    if (filteredOrders.length === 0) {
                      return (
                        <div className="kds-empty-state">
                          <svg className="kds-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                            <line x1="8" y1="21" x2="16" y2="21"/>
                            <line x1="12" y1="17" x2="12" y2="21"/>
                            <path d="M8 10h8M8 13h4" strokeDasharray="2 2"/>
                          </svg>
                          <div className="kds-empty-title">No Active Orders</div>
                          <div className="kds-empty-subtitle">
                            {kdsFilter !== 'All'
                              ? `No ${kdsFilter} orders in the queue right now. Try selecting "All" to see all orders.`
                              : 'Kitchen is clear! New orders from the POS will appear here automatically.'
                            }
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className={`kds-grid ${kdsRushMode ? 'rush-mode' : ''}`}>
                        {filteredOrders.map(order => {
                          const elapsed = (order.elapsed_seconds || 0) + (kdsElapsedOffsets[order.id] || 0);
                          const ageClass = getAgeClass(elapsed);
                          const statusClass = order.status === 'Preparing' ? 'status-preparing' : '';

                          return (
                            <div
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
                                {order.status === 'Preparing' && (
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
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </>
              ) : (
                /* KDS Full-screen History Section */
                <div className="kds-history-section full-screen">
                  <div className="kds-history-header">
                    <h4>📋 Completed Orders — Last 2 Hours ({kdsHistory.length} orders)</h4>
                  </div>
                  {kdsHistory.length === 0 ? (
                    <div className="kds-empty-state">
                      <svg className="kds-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <div className="kds-empty-title">No Completed Orders</div>
                      <div className="kds-empty-subtitle">
                        No orders have been marked as ready in the last 2 hours.
                      </div>
                    </div>
                  ) : (
                    <div className="kds-history-grid">
                      {kdsHistory.map(order => (
                        <div key={order.id} className="kds-history-card">
                          <div className="kds-card-header">
                            <span className="kds-token">{order.token_number}</span>
                            <span className="kds-completed-badge">
                              ✓ {order.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {new Date(order.order_date).toLocaleTimeString()}
                            {order.customer_name && ` | 👤 ${order.customer_name}`}
                            {order.pickup_slot && ` | ⏰ ${order.pickup_slot}`}
                          </div>
                          <div className="kds-items-list">
                            {order.items && order.items.map((item, idx) => (
                              <div key={idx} className="kds-item-block" style={{ padding: '0.2rem 0', borderBottom: idx < order.items.length - 1 ? '1px dashed var(--border-color)' : 'none' }}>
                                <div className="kds-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span className="kds-item-name">{item.name}</span>
                                  <span className="kds-item-qty">×{item.quantity}</span>
                                </div>
                                {(item.spice_level || item.special_instructions) && (
                                  <div style={{ paddingLeft: '8px', display: 'flex', gap: '6px', marginTop: '2px' }}>
                                    {item.spice_level && <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)' }}>🌶️ {item.spice_level}</span>}
                                    {item.special_instructions && <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', fontStyle: 'italic' }}>📝 "{item.special_instructions}"</span>}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==========================================
               TAB 9: MULTI-VENDOR MANAGEMENT
               ========================================== */}
          {activeTab === 'vendors' && (
            <div className="vendor-panel">
              {/* Sub-tab Navigation */}
              <div className="vendor-sub-tabs">
                {[['profiles', '🏪 Vendor Profiles'], ['settlements', '💰 Cost Splitting & Settlements'], ['performance', '📊 Performance Analytics'], ['expenses', '🧾 Common Expenses']].map(([key, label]) => (
                  <button
                    key={key}
                    className={`vendor-sub-tab ${vendorSubTab === key ? 'active' : ''}`}
                    onClick={() => {
                      setVendorSubTab(key);
                      if (key === 'settlements') { fetchSettlements(); }
                      if (key === 'performance') { fetchVendorPerformance(); }
                      if (key === 'expenses') { fetchCommonExpenses(); }
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* ============ SUB-TAB: VENDOR PROFILES ============ */}
              {vendorSubTab === 'profiles' && (
                <div>
                  {/* Inline Add/Edit Form */}
                  {showVendorForm && (
                    <div className="vendor-form-card">
                      <h4>{formVendor.id ? '✏️ Edit Vendor Stall' : '➕ Register New Stall'}</h4>
                      <div className="vendor-form-grid">
                        <div className="vendor-form-group">
                          <label>Stall Name *</label>
                          <input type="text" placeholder="e.g. South Stall (Dosa & Meals)" value={formVendor.name} onChange={e => setFormVendor({ ...formVendor, name: e.target.value })} />
                        </div>
                        <div className="vendor-form-group">
                          <label>Stall Number</label>
                          <input type="text" placeholder="e.g. Stall A-1" value={formVendor.stall_number} onChange={e => setFormVendor({ ...formVendor, stall_number: e.target.value })} />
                        </div>
                        <div className="vendor-form-group">
                          <label>GSTIN</label>
                          <input type="text" placeholder="15-digit GSTIN" value={formVendor.gstin} onChange={e => setFormVendor({ ...formVendor, gstin: e.target.value })} />
                        </div>
                        <div className="vendor-form-group">
                          <label>Bank Account</label>
                          <input type="text" placeholder="Account number" value={formVendor.bank_account} onChange={e => setFormVendor({ ...formVendor, bank_account: e.target.value })} />
                        </div>
                        <div className="vendor-form-group">
                          <label>Contact Phone</label>
                          <input type="text" placeholder="10-digit mobile" value={formVendor.contact} onChange={e => setFormVendor({ ...formVendor, contact: e.target.value })} />
                        </div>
                        <div className="vendor-form-group">
                          <label>Commission Rate (%)</label>
                          <input type="number" step="0.01" placeholder="10.00" value={formVendor.commission_rate} onChange={e => setFormVendor({ ...formVendor, commission_rate: e.target.value })} />
                        </div>
                        <div className="vendor-form-group">
                          <label>Share Area (%)</label>
                          <input type="number" step="0.01" placeholder="10.00" value={formVendor.share_area} onChange={e => setFormVendor({ ...formVendor, share_area: e.target.value })} />
                        </div>
                      </div>
                      <div className="vendor-form-actions">
                        <button className="vendor-form-cancel" onClick={() => { setShowVendorForm(false); setFormVendor({ id: '', name: '', gstin: '', bank_account: '', contact: '', stall_number: '', commission_rate: '10.00', share_area: '10.00' }); }}>Cancel</button>
                        <button className="vendor-form-save" onClick={async () => {
                          if (!formVendor.name.trim()) { setToast({ show: true, message: 'Stall name is required', type: 'error' }); return; }
                          try {
                            const url = formVendor.id ? `${API_BASE}/vendors/${formVendor.id}` : `${API_BASE}/vendors`;
                            const method = formVendor.id ? 'PUT' : 'POST';
                            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                              name: formVendor.name, gstin: formVendor.gstin, bank_account: formVendor.bank_account,
                              contact: formVendor.contact, stall_number: formVendor.stall_number,
                              commission_rate: parseFloat(formVendor.commission_rate) || 10, share_area: parseFloat(formVendor.share_area) || 10
                            })});
                            if (res.ok) {
                              setToast({ show: true, message: formVendor.id ? 'Vendor updated successfully' : 'Vendor registered successfully', type: 'success' });
                              setShowVendorForm(false);
                              setFormVendor({ id: '', name: '', gstin: '', bank_account: '', contact: '', stall_number: '', commission_rate: '10.00', share_area: '10.00' });
                              fetchVendors();
                            } else { throw new Error('Failed'); }
                          } catch (err) {
                            setToast({ show: true, message: 'Failed to save vendor', type: 'error' });
                          }
                        }}>{formVendor.id ? 'Update Vendor' : 'Register Stall'}</button>
                      </div>
                    </div>
                  )}

                  {/* Vendor Profile Cards */}
                  <div className="vendor-profiles-grid">
                    {vendors.map(v => (
                      <div key={v.id} className="vendor-profile-card">
                        <div className="vendor-card-header">
                          <h4>{v.name}</h4>
                          {v.stall_number && <span className="vendor-stall-badge">{v.stall_number}</span>}
                        </div>
                        <div className="vendor-card-info">
                          <div className="vendor-info-row"><span className="info-label">📞 Contact</span><span className="info-value">{v.contact || '—'}</span></div>
                          <div className="vendor-info-row"><span className="info-label">🏛️ GSTIN</span><span className="info-value">{v.gstin || '—'}</span></div>
                          <div className="vendor-info-row"><span className="info-label">🏦 Bank A/C</span><span className="info-value">{v.bank_account || '—'}</span></div>
                          <div className="vendor-info-row"><span className="info-label">💸 Commission</span><span className="info-value">{v.commission_rate}%</span></div>
                          <div className="vendor-info-row"><span className="info-label">📐 Share Area</span><span className="info-value">{v.share_area}%</span></div>
                        </div>
                        <div className="vendor-card-footer">
                          <button className="vendor-btn-edit" onClick={() => {
                            setFormVendor({ id: v.id, name: v.name, gstin: v.gstin || '', bank_account: v.bank_account || '', contact: v.contact || '', stall_number: v.stall_number || '', commission_rate: v.commission_rate || '10.00', share_area: v.share_area || '10.00' });
                            setShowVendorForm(true);
                          }}>✏️ Edit</button>
                          <button className="vendor-btn-delete" onClick={async () => {
                            if (!confirm(`Delete vendor "${v.name}"? Items will be unlinked.`)) return;
                            try {
                              const res = await fetch(`${API_BASE}/vendors/${v.id}`, { method: 'DELETE' });
                              if (res.ok) {
                                setToast({ show: true, message: 'Vendor deleted', type: 'success' });
                                fetchVendors();
                                fetchItems();
                              } else { throw new Error('Failed'); }
                            } catch { setToast({ show: true, message: 'Failed to delete vendor', type: 'error' }); }
                          }}>🗑️ Delete</button>
                        </div>
                      </div>
                    ))}

                    {/* Add New Vendor Card */}
                    <div className="vendor-add-card" onClick={() => {
                      setFormVendor({ id: '', name: '', gstin: '', bank_account: '', contact: '', stall_number: '', commission_rate: '10.00', share_area: '10.00' });
                      setShowVendorForm(true);
                    }}>
                      <div className="add-icon">＋</div>
                      <span>Register New Stall</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ============ SUB-TAB: COST SPLITTING & SETTLEMENTS ============ */}
              {vendorSubTab === 'settlements' && (
                <div className="settlement-section">
                  {/* Calculator Form */}
                  <div className="settlement-calculator">
                    <h4>🧮 Calculate Settlement</h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      Split common area costs (electricity, cleaning, security) across all vendors and calculate net payouts.
                    </p>
                    <div className="settlement-form-row">
                      <div className="vendor-form-group">
                        <label>Start Date</label>
                        <input type="date" value={costSplit.startDate} onChange={e => setCostSplit(prev => ({ ...prev, startDate: e.target.value }))} />
                      </div>
                      <div className="vendor-form-group">
                        <label>End Date</label>
                        <input type="date" value={costSplit.endDate} onChange={e => setCostSplit(prev => ({ ...prev, endDate: e.target.value }))} />
                      </div>
                      <div className="vendor-form-group">
                        <label>Total Common Cost (₹) <span style={{ fontSize: '0.7rem', color: 'var(--accent-success)' }}>Auto-filled</span></label>
                        <input type="number" step="0.01" placeholder="Select dates to auto-calculate" value={costSplit.totalCost} readOnly style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'default' }} />
                      </div>
                      <div className="vendor-form-group">
                        <label>Split Method</label>
                        <select value={costSplit.method} onChange={e => setCostSplit({ ...costSplit, method: e.target.value })}>
                          <option value="Equal">Equal Split</option>
                          <option value="Stall Area">By Stall Area %</option>
                          <option value="Sales Percentage">By Sales %</option>
                        </select>
                      </div>
                      <button className="btn-calculate" onClick={async () => {
                        if (!costSplit.startDate || !costSplit.endDate || !costSplit.totalCost) {
                          setToast({ show: true, message: 'Please fill all fields', type: 'error' }); return;
                        }
                        try {
                          const res = await fetch(`${API_BASE}/vendors/settlements/calculate`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ startDate: costSplit.startDate, endDate: costSplit.endDate, totalCommonAreaCost: parseFloat(costSplit.totalCost), splitMethod: costSplit.method })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            showToast(`Settlement calculated for ${data.settlements?.length || 0} vendors`, 'success');
                            fetchSettlements();
                          } else {
                            showToast(data.error || 'Calculation failed', 'error');
                          }
                        } catch { showToast('Settlement calculation failed', 'error'); }
                      }}>⚡ Calculate & Generate</button>
                    </div>
                  </div>

                  {/* Settlements History Table */}
                  <div className="settlement-table-wrap">
                    <h4>📋 Settlement History ({settlements.length})</h4>
                    {settlements.length === 0 ? (
                      <div className="vendor-empty-state">
                        <div className="empty-icon">💰</div>
                        <h4>No Settlements Yet</h4>
                        <p>Use the calculator above to generate vendor settlements.</p>
                      </div>
                    ) : (
                      <div className="settlement-table-responsive">
                        <table className="settlement-table">
                          <thead>
                            <tr>
                              <th>Vendor</th>
                              <th>Stall</th>
                              <th>Period</th>
                              <th>Gross Sales</th>
                              <th>Commission</th>
                              <th>Area Cost</th>
                              <th>Net Payout</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {settlements.map(s => (
                              <tr key={s.id}>
                                <td style={{ fontWeight: 600 }}>{s.vendor_name}</td>
                                <td>{s.stall_number || '—'}</td>
                                <td style={{ fontSize: '0.78rem' }}>{new Date(s.start_date).toLocaleDateString()} – {new Date(s.end_date).toLocaleDateString()}</td>
                                <td className="amount-col amount-positive">₹{parseFloat(s.gross_sales).toFixed(2)}</td>
                                <td className="amount-col amount-negative">−₹{parseFloat(s.commission_amount).toFixed(2)}</td>
                                <td className="amount-col amount-negative">−₹{parseFloat(s.common_area_cost).toFixed(2)}</td>
                                <td className="amount-col" style={{ color: parseFloat(s.net_payout) >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', fontWeight: 700 }}>₹{parseFloat(s.net_payout).toFixed(2)}</td>
                                <td>
                                  <span className={`settle-status-badge ${s.status.toLowerCase()}`}>{s.status}</span>
                                </td>
                                <td>
                                  {s.status === 'Pending' && (
                                    <button className="btn-mark-settled" onClick={async () => {
                                      try {
                                        const res = await fetch(`${API_BASE}/vendors/settlements/${s.id}/settle`, { method: 'PUT' });
                                        if (res.ok) {
                                          showToast(`Settlement #${s.id} marked as Paid`, 'success');
                                          fetchSettlements();
                                        }
                                      } catch { showToast('Failed to update', 'error'); }
                                    }}>✅ Mark Paid</button>
                                  )}
                                  {s.status === 'Settled' && (
                                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Paid {s.settled_at ? new Date(s.settled_at).toLocaleDateString() : ''}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============ SUB-TAB: PERFORMANCE ANALYTICS ============ */}
              {vendorSubTab === 'performance' && (
                <div className="performance-section">
                  {/* Summary Cards */}
                  <div className="performance-summary-cards">
                    <div className="perf-summary-card">
                      <div className="perf-label">Total Vendors</div>
                      <div className="perf-value primary">{vendors.length}</div>
                    </div>
                    <div className="perf-summary-card">
                      <div className="perf-label">Total Revenue</div>
                      <div className="perf-value success">₹{vendorPerformance.reduce((s, v) => s + parseFloat(v.total_sales || 0), 0).toFixed(0)}</div>
                    </div>
                    <div className="perf-summary-card">
                      <div className="perf-label">Total Orders</div>
                      <div className="perf-value warning">{vendorPerformance.reduce((s, v) => s + parseInt(v.total_orders || 0), 0)}</div>
                    </div>
                    <div className="perf-summary-card">
                      <div className="perf-label">Avg Order Value</div>
                      <div className="perf-value">₹{(() => { const tot = vendorPerformance.reduce((s, v) => s + parseFloat(v.total_sales || 0), 0); const cnt = vendorPerformance.reduce((s, v) => s + parseInt(v.total_orders || 0), 0); return cnt > 0 ? (tot / cnt).toFixed(0) : '0'; })()}</div>
                    </div>
                  </div>

                  {/* Ranked Performance Bars */}
                  <div className="performance-ranking">
                    <h4>🏆 Vendor Ranking</h4>
                    <div className="perf-metric-tabs">
                      {[['revenue', '💰 Revenue'], ['orders', '📦 Orders'], ['aov', '📈 Avg Order Value']].map(([key, label]) => (
                        <button key={key} className={`perf-metric-tab ${perfMetric === key ? 'active' : ''}`} onClick={() => setPerfMetric(key)}>{label}</button>
                      ))}
                    </div>

                    {vendorPerformance.length === 0 ? (
                      <div className="vendor-empty-state">
                        <div className="empty-icon">📊</div>
                        <h4>No Performance Data</h4>
                        <p>Place some orders to see vendor rankings here.</p>
                      </div>
                    ) : (() => {
                      const sorted = [...vendorPerformance].sort((a, b) => {
                        if (perfMetric === 'revenue') return parseFloat(b.total_sales || 0) - parseFloat(a.total_sales || 0);
                        if (perfMetric === 'orders') return parseInt(b.total_orders || 0) - parseInt(a.total_orders || 0);
                        const aovA = parseInt(a.total_orders || 0) > 0 ? parseFloat(a.total_sales || 0) / parseInt(a.total_orders || 0) : 0;
                        const aovB = parseInt(b.total_orders || 0) > 0 ? parseFloat(b.total_sales || 0) / parseInt(b.total_orders || 0) : 0;
                        return aovB - aovA;
                      });
                      const maxVal = sorted.length > 0 ? (() => {
                        if (perfMetric === 'revenue') return parseFloat(sorted[0].total_sales || 0);
                        if (perfMetric === 'orders') return parseInt(sorted[0].total_orders || 0);
                        return parseInt(sorted[0].total_orders || 0) > 0 ? parseFloat(sorted[0].total_sales || 0) / parseInt(sorted[0].total_orders || 0) : 0;
                      })() : 1;

                      return sorted.map((v, idx) => {
                        let val = 0;
                        let displayVal = '';
                        if (perfMetric === 'revenue') {
                          val = parseFloat(v.total_sales || 0);
                          displayVal = `₹${val.toFixed(0)}`;
                        } else if (perfMetric === 'orders') {
                          val = parseInt(v.total_orders || 0);
                          displayVal = `${val} orders`;
                        } else {
                          val = parseInt(v.total_orders || 0) > 0 ? parseFloat(v.total_sales || 0) / parseInt(v.total_orders || 0) : 0;
                          displayVal = `₹${val.toFixed(0)}`;
                        }
                        const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                        const rankClass = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : '';

                        return (
                          <div key={v.vendor_id} className="perf-bar-row">
                            <div className={`perf-bar-rank ${rankClass}`}>{idx + 1}</div>
                            <div className="perf-bar-name">{v.vendor_name}</div>
                            <div className="perf-bar-track">
                              <div className={`perf-bar-fill ${perfMetric}`} style={{ width: `${pct}%` }}></div>
                            </div>
                            <div className="perf-bar-value">{displayVal}</div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {vendorSubTab === 'expenses' && (
                <div className="expenses-section">
                  <div className="reports-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                    
                    {/* Expense Form */}
                    <div className="panel-card">
                      <div className="panel-card-header">
                        <h3>Log Common Expense</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>These expenses will be summed for vendor settlements.</p>
                      </div>
                      <form onSubmit={handleCommonExpenseSubmit} style={{ padding: '20px' }}>
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                          <label>Date</label>
                          <input type="date" className="form-control" value={commonExpenseForm.expense_date} onChange={e => setCommonExpenseForm({...commonExpenseForm, expense_date: e.target.value})} required />
                        </div>
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                          <label>Category</label>
                          <select className="form-control" value={commonExpenseForm.category} onChange={e => setCommonExpenseForm({...commonExpenseForm, category: e.target.value})}>
                            <option value="Electricity">Electricity</option>
                            <option value="Water">Water</option>
                            <option value="Rent">Rent</option>
                            <option value="Sweeping">Sweeping/Cleaning</option>
                            <option value="Labor">Labor</option>
                            <option value="Gas">Gas/Fuel</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                          <label>Amount (₹)</label>
                          <input type="number" step="0.01" className="form-control" placeholder="e.g. 500" value={commonExpenseForm.amount} onChange={e => setCommonExpenseForm({...commonExpenseForm, amount: e.target.value})} required />
                        </div>
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                          <label>Description</label>
                          <input type="text" className="form-control" placeholder="Optional details..." value={commonExpenseForm.description} onChange={e => setCommonExpenseForm({...commonExpenseForm, description: e.target.value})} />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Log Expense</button>
                      </form>
                    </div>

                    {/* Expense History Table */}
                    <div className="panel-card">
                      <div className="panel-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Common Expenses History</h3>
                        <button className="btn btn-outline-primary" onClick={fetchCommonExpenses}>Refresh</button>
                      </div>
                      <div className="table-container" style={{ padding: '0 20px 20px 20px' }}>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Category</th>
                              <th>Amount</th>
                              <th>Description</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {commonExpensesList.length === 0 ? (
                              <tr><td colSpan="5" style={{ textAlign: 'center' }}>No common expenses found.</td></tr>
                            ) : (
                              commonExpensesList.map((exp) => (
                                <tr key={exp.id}>
                                  <td>{new Date(exp.expense_date).toLocaleDateString()}</td>
                                  <td><span className="badge">{exp.category}</span></td>
                                  <td><strong style={{ color: 'var(--accent-danger)' }}>₹{Number(exp.amount).toFixed(2)}</strong></td>
                                  <td>{exp.description || '-'}</td>
                                  <td>
                                    <button className="btn-icon danger" onClick={async () => {
                                      if (window.confirm('Delete this expense?')) {
                                        try {
                                          const res = await fetch(`${API_BASE}/vendors/expenses/${exp.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                                          if (res.ok) {
                                            showToast('Expense deleted', 'success');
                                            fetchCommonExpenses();
                                          }
                                        } catch (e) {}
                                      }
                                    }}>🗑️</button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==========================================
               TAB 10: HR, PAYROLL & ATTENDANCE
               ========================================== */}
          {activeTab === 'hr' && (
            <div className="hr-panel">
              {/* Sub-tab Navigation */}
              <div className="hr-sub-tabs">
                {[
                  ['directory', '👥 Staff Directory'],
                  ['shifts', '⏰ Shift Management'],
                  ['swaps', '🔄 Shift Swaps'],
                  ['roster', '📅 Roster & Scheduler'],
                  ['attendance', '📝 Attendance Logs'],
                  ['leaves', '✉️ Leave Management'],
                  ['holidays', '🏖️ Holiday Calendar'],
                  ['payroll', '💰 Payroll Panel'],
                  ['performance', '📊 Performance']
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={`hr-sub-tab ${hrSubTab === key ? 'active' : ''}`}
                    onClick={() => {
                      setHrSubTab(key);
                      if (key === 'directory') fetchStaff();
                      if (key === 'shifts') fetchShifts();
                      if (key === 'swaps') fetchShiftSwaps();
                      if (key === 'roster') fetchRoster(selectedRosterWeek);
                      if (key === 'attendance') fetchAttendance(selectedAttendanceDate);
                      if (key === 'leaves') fetchLeaves();
                      if (key === 'holidays') fetchHolidays();
                      if (key === 'payroll') fetchPayroll(payrollMonth, payrollYear);
                      if (key === 'performance') fetchStaffPerformance(perfStartDate, perfEndDate);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* ============ SUB-TAB: STAFF DIRECTORY ============ */}
              {hrSubTab === 'directory' && (
                <div>
                  {/* Modal Add/Edit Staff Form */}
                  {showStaffForm && (
                    <div className="modal-overlay active" style={{ zIndex: 1100 }}>
                      <div className="modal-card" style={{ maxWidth: '600px', width: '95%' }}>
                        <div className="modal-header">
                          <h3>{formStaff.id ? '✏️ Edit Staff Member' : '➕ Register New Staff Member'}</h3>
                          <button className="close-btn" onClick={() => { setShowStaffForm(false); setFormStaff({ id: '', name: '', phone: '', email: '', role: 'Staff', pay_type: 'monthly', daily_rate: '0', monthly_salary: '0', pf_enabled: false, esi_enabled: false, tds_percentage: '0', bank_account: '', vendor_id: '', exclude_from_payroll: false, exclude_from_roster: false, exclude_from_attendance: false, exclude_from_performance: false }); }}>&times;</button>
                        </div>
                        <form onSubmit={handleSaveStaff}>
                          <div className="modal-body">
                            <div className="hr-form-grid">
                              <div className="hr-form-group">
                                <label>Name *</label>
                                <input type="text" required placeholder="e.g. Rahul Sharma" value={formStaff.name} onChange={e => setFormStaff({ ...formStaff, name: e.target.value })} />
                              </div>
                              <div className="hr-form-group">
                                <label>Phone</label>
                                <input type="text" placeholder="e.g. 9876543210" value={formStaff.phone} onChange={e => setFormStaff({ ...formStaff, phone: e.target.value })} />
                              </div>
                              <div className="hr-form-group">
                                <label>Email</label>
                                <input type="email" placeholder="e.g. rahul@example.com" value={formStaff.email} onChange={e => setFormStaff({ ...formStaff, email: e.target.value })} />
                              </div>
                              <div className="hr-form-group">
                                <label>Role *</label>
                                <select value={formStaff.role} onChange={e => setFormStaff({ ...formStaff, role: e.target.value })}>
                                  <option value="Manager">Manager</option>
                                  <option value="Cook">Cook</option>
                                  <option value="Cashier">Cashier</option>
                                  <option value="Staff">General Staff</option>
                                </select>
                              </div>
                              <div className="hr-form-group">
                                <label>Pay Type</label>
                                <select value={formStaff.pay_type} onChange={e => setFormStaff({ ...formStaff, pay_type: e.target.value })}>
                                  <option value="monthly">Monthly Salary</option>
                                  <option value="daily">Daily Wage</option>
                                </select>
                              </div>
                              {formStaff.pay_type === 'monthly' ? (
                                <div className="hr-form-group">
                                  <label>Monthly Salary (₹)</label>
                                  <input type="number" step="0.01" placeholder="e.g. 15000" value={formStaff.monthly_salary} onChange={e => setFormStaff({ ...formStaff, monthly_salary: e.target.value })} />
                                </div>
                              ) : (
                                <div className="hr-form-group">
                                  <label>Daily Rate (₹)</label>
                                  <input type="number" step="0.01" placeholder="e.g. 500" value={formStaff.daily_rate} onChange={e => setFormStaff({ ...formStaff, daily_rate: e.target.value })} />
                                </div>
                              )}
                              <div className="hr-form-group">
                                <label>TDS Percentage (%)</label>
                                <input type="number" step="0.1" placeholder="e.g. 1.0" value={formStaff.tds_percentage} onChange={e => setFormStaff({ ...formStaff, tds_percentage: e.target.value })} />
                              </div>
                              <div className="hr-form-group">
                                <label>Bank Account</label>
                                <input type="text" placeholder="Account Number & IFSC" value={formStaff.bank_account} onChange={e => setFormStaff({ ...formStaff, bank_account: e.target.value })} />
                              </div>
                              <div className="hr-form-group">
                                <label>Linked Stall / Vendor</label>
                                <select value={formStaff.vendor_id} onChange={e => setFormStaff({ ...formStaff, vendor_id: e.target.value })}>
                                  <option value="">🏢 Central Canteen (Main)</option>
                                  {vendors.map(v => (
                                    <option key={v.id} value={v.id}>🏪 Stall: {v.name}</option>
                                  ))}
                                </select>
                              </div>
                              {formStaff.id && (
                                <div className="hr-form-group">
                                  <label>Status</label>
                                  <select value={formStaff.is_active} onChange={e => setFormStaff({ ...formStaff, is_active: parseInt(e.target.value) })}>
                                    <option value="1">Active</option>
                                    <option value="0">Inactive</option>
                                  </select>
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 20px', margin: '15px 0', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={formStaff.pf_enabled} onChange={e => setFormStaff({ ...formStaff, pf_enabled: e.target.checked })} />
                                Enable PF (@12%)
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={formStaff.esi_enabled} onChange={e => setFormStaff({ ...formStaff, esi_enabled: e.target.checked })} />
                                Enable ESI (@0.75%)
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={formStaff.exclude_from_payroll} onChange={e => setFormStaff({ ...formStaff, exclude_from_payroll: e.target.checked })} />
                                Exclude from Payroll
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={formStaff.exclude_from_roster} onChange={e => setFormStaff({ ...formStaff, exclude_from_roster: e.target.checked })} />
                                Exclude from Roster
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={formStaff.exclude_from_attendance} onChange={e => setFormStaff({ ...formStaff, exclude_from_attendance: e.target.checked })} />
                                Exclude from Attendance
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={formStaff.exclude_from_performance} onChange={e => setFormStaff({ ...formStaff, exclude_from_performance: e.target.checked })} />
                                Exclude from Performance
                              </label>
                            </div>
                          </div>
                          <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '15px' }}>
                            <button type="button" className="btn btn-outline-primary" onClick={() => { setShowStaffForm(false); setFormStaff({ id: '', name: '', phone: '', email: '', role: 'Staff', pay_type: 'monthly', daily_rate: '0', monthly_salary: '0', pf_enabled: false, esi_enabled: false, tds_percentage: '0', bank_account: '', vendor_id: '', exclude_from_payroll: false, exclude_from_roster: false, exclude_from_attendance: false, exclude_from_performance: false }); }}>Cancel</button>
                            <button type="submit" className="btn btn-success">{formStaff.id ? 'Update Staff Info' : 'Add Staff'}</button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Staff Directory List */}
                  <div className="hr-profiles-grid">
                    {staff.map(s => {
                      const stall = vendors.find(v => v.id === s.vendor_id);
                      return (
                        <div key={s.id} className="hr-profile-card">
                          <div className="hr-card-header">
                            <h4>{s.name}</h4>
                            <span className="hr-role-badge">{s.role}</span>
                          </div>
                          <div className="hr-card-info">
                            <div className="hr-info-row"><span className="info-label">📍 Placement</span><span className="info-value">{stall ? `🏪 Stall: ${stall.name}` : '🏢 Central Canteen'}</span></div>
                            <div className="hr-info-row"><span className="info-label">📞 Phone</span><span className="info-value">{s.phone || '—'}</span></div>
                            <div className="hr-info-row"><span className="info-label">✉️ Email</span><span className="info-value">{s.email || '—'}</span></div>
                            <div className="hr-info-row"><span className="info-label">💳 Payment</span><span className="info-value">{s.pay_type === 'monthly' ? `₹${parseFloat(s.monthly_salary).toLocaleString()}/mo` : `₹${parseFloat(s.daily_rate).toLocaleString()}/day`}</span></div>
                            <div className="hr-info-row">
                              <span className="info-label">📋 Statutory</span>
                              <span className="info-value">
                                {s.pf_enabled ? 'PF ' : ''}
                                {s.esi_enabled ? 'ESI ' : ''}
                                {s.tds_percentage > 0 ? `TDS(${s.tds_percentage}%)` : ''}
                                {!s.pf_enabled && !s.esi_enabled && s.tds_percentage == 0 ? 'None' : ''}
                              </span>
                            </div>
                            <div className="hr-info-row"><span className="info-label">🏦 Bank Account</span><span className="info-value" style={{ fontSize: '0.8rem' }}>{s.bank_account || '—'}</span></div>
                            <div className="hr-info-row">
                              <span className="info-label">Status</span>
                              <span className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'}`}>
                                {s.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                          <div className="hr-card-footer">
                            <button className="hr-btn-edit" onClick={() => handleEditStaff(s)}>✏️ Edit</button>
                            <button className="hr-btn-delete" onClick={() => handleDeleteStaff(s.id)}>🗑️ Delete</button>
                          </div>
                        </div>
                      );
                    })}

                    <div className="hr-add-card" onClick={() => { setFormStaff({ id: '', name: '', phone: '', email: '', role: 'Staff', pay_type: 'monthly', daily_rate: '0', monthly_salary: '0', pf_enabled: false, esi_enabled: false, tds_percentage: '0', bank_account: '', vendor_id: '', exclude_from_payroll: false, exclude_from_roster: false, exclude_from_attendance: false, exclude_from_performance: false }); setShowStaffForm(true); }}>
                      <div className="add-icon">＋</div>
                      <span>Add Staff Member</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ============ SUB-TAB: SHIFT MANAGEMENT ============ */}
              {hrSubTab === 'shifts' && (
                <div>
                  {showShiftForm && (
                    <div className="hr-form-card" style={{ maxWidth: '500px' }}>
                      <h4>{formShift.id ? '✏️ Edit Shift Configuration' : '➕ Create New Work Shift'}</h4>
                      <form onSubmit={handleSaveShift}>
                        <div className="hr-form-group">
                          <label>Shift Name *</label>
                          <input type="text" required placeholder="e.g. Morning Shift" value={formShift.name} onChange={e => setFormShift({ ...formShift, name: e.target.value })} />
                        </div>
                        <div className="hr-form-row" style={{ display: 'flex', gap: '15px' }}>
                          <div className="hr-form-group" style={{ flex: 1 }}>
                            <label>Start Time (HH:MM:SS) *</label>
                            <input type="text" required placeholder="e.g. 06:00:00" value={formShift.start_time} onChange={e => setFormShift({ ...formShift, start_time: e.target.value })} />
                          </div>
                          <div className="hr-form-group" style={{ flex: 1 }}>
                            <label>End Time (HH:MM:SS) *</label>
                            <input type="text" required placeholder="e.g. 14:00:00" value={formShift.end_time} onChange={e => setFormShift({ ...formShift, end_time: e.target.value })} />
                          </div>
                        </div>
                        <div className="hr-form-actions" style={{ marginTop: '15px' }}>
                          <button type="button" className="btn btn-outline-primary" onClick={() => { setShowShiftForm(false); setFormShift({ id: '', name: '', start_time: '09:00:00', end_time: '17:00:00' }); }}>Cancel</button>
                          <button type="submit" className="btn btn-success">Save Shift</button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="view-header-bar">
                    <h3>Defined Staff Work Shifts</h3>
                    <button className="btn btn-primary" onClick={() => { setFormShift({ id: '', name: '', start_time: '09:00:00', end_time: '17:00:00' }); setShowShiftForm(true); }}>➕ Create New Shift</button>
                  </div>

                  <div className="hr-shifts-grid" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
                    {shifts.map(sh => (
                      <div key={sh.id} className="hr-shift-card" style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', width: '260px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-light)' }}>{sh.name}</h4>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '15px' }}>
                          🕒 {sh.start_time} – {sh.end_time}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button className="btn btn-outline-primary btn-small" onClick={() => { setFormShift(sh); setShowShiftForm(true); }}>✏️ Edit</button>
                          <button className="btn btn-danger-small" onClick={() => handleDeleteShift(sh.id)}>🗑️ Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ============ SUB-TAB: SHIFT SWAPS ============ */}
              {hrSubTab === 'swaps' && (
                <div className="swaps-section" style={{ padding: '20px' }}>
                  
                  {/* Shift Swap Form Modal */}
                  {showSwapForm && (
                    <div className="modal-overlay active" style={{ zIndex: 1100 }}>
                      <div className="modal-card" style={{ maxWidth: '500px', width: '95%' }}>
                        <div className="modal-header">
                          <h3>🔄 New Shift Swap Request</h3>
                          <button className="close-btn" onClick={() => setShowSwapForm(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSaveSwapRequest}>
                          <div className="modal-body">
                            <div className="hr-form-group">
                              <label>Requester Staff *</label>
                              <select required value={formSwap.requester_id} onChange={e => setFormSwap({ ...formSwap, requester_id: e.target.value })}>
                                <option value="">-- Select Requester --</option>
                                {staff.filter(s => s.is_active === 1).map(s => (
                                  <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                ))}
                              </select>
                            </div>
                            <div className="hr-form-group">
                              <label>Target Staff *</label>
                              <select required value={formSwap.target_id} onChange={e => setFormSwap({ ...formSwap, target_id: e.target.value })}>
                                <option value="">-- Select Target --</option>
                                {staff.filter(s => s.is_active === 1 && s.id.toString() !== formSwap.requester_id).map(s => (
                                  <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                ))}
                              </select>
                            </div>
                            <div className="hr-form-group">
                              <label>Swap Date *</label>
                              <input type="date" required value={formSwap.swap_date} onChange={e => setFormSwap({ ...formSwap, swap_date: e.target.value })} />
                            </div>
                            <div className="hr-form-group">
                              <label>Reason</label>
                              <input type="text" placeholder="e.g. Doctor appointment" value={formSwap.reason} onChange={e => setFormSwap({ ...formSwap, reason: e.target.value })} />
                            </div>
                          </div>
                          <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '15px' }}>
                            <button type="button" className="btn btn-outline-primary" onClick={() => setShowSwapForm(false)}>Cancel</button>
                            <button type="submit" className="btn btn-success">Submit Request</button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  <div className="view-header-bar">
                    <h3>Shift Swap Requests</h3>
                    <button className="btn btn-primary" onClick={() => setShowSwapForm(true)}>+ New Request</button>
                  </div>
                  <div className="table-container mt-4">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Requester</th>
                          <th>Target Staff</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shiftSwaps.map(sw => (
                          <tr key={sw.id}>
                            <td>{new Date(sw.swap_date).toLocaleDateString()}</td>
                            <td>{sw.requester_name}</td>
                            <td>{sw.target_name}</td>
                            <td>{sw.reason}</td>
                            <td>
                              <span className={`badge ${sw.status === 'Approved' ? 'badge-success' : sw.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`}>
                                {sw.status}
                              </span>
                            </td>
                            <td>
                              {sw.status === 'Pending' && (
                                <>
                                  <button className="btn-icon" style={{ color: 'var(--accent-success)', marginRight: '10px' }} onClick={() => {
                                    if (window.confirm('Approve this shift swap?')) {
                                      fetch(`${API_BASE}/shifts/swap/${sw.id}/approve`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approved_by: null }) })
                                        .then(() => { showToast('Approved', 'success'); fetchShiftSwaps(); });
                                    }
                                  }}>✓</button>
                                  <button className="btn-icon" style={{ color: 'var(--accent-danger)' }} onClick={() => {
                                    if (window.confirm('Reject this shift swap?')) {
                                      fetch(`${API_BASE}/shifts/swap/${sw.id}/reject`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approved_by: null }) })
                                        .then(() => { showToast('Rejected', 'success'); fetchShiftSwaps(); });
                                    }
                                  }}>✗</button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                        {shiftSwaps.length === 0 && (
                          <tr><td colSpan="6" className="empty-state">No shift swap requests found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ============ SUB-TAB: ROSTER & SCHEDULER ============ */}
              {hrSubTab === 'roster' && (
                <div>
                  <div className="view-header-bar" style={{ flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label style={{ fontWeight: 600 }}>Roster Week starting (Monday):</label>
                      <input type="date" value={selectedRosterWeek} onChange={e => setSelectedRosterWeek(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }} />
                    </div>
                    <button className="btn btn-success" onClick={handleSaveRoster}>💾 Save Weekly Roster</button>
                  </div>

                  <div className="table-container" style={{ marginTop: '20px' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Staff Member</th>
                          <th>Role</th>
                          {Array.from({ length: 7 }, (_, i) => {
                            let start = new Date(selectedRosterWeek);
                            if (isNaN(start.getTime())) start = new Date(); // fallback if input is cleared
                            start.setDate(start.getDate() + i);
                            const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                            return (
                              <th key={i}>
                                {dayNames[i]}<br />
                                <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                                  {start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {staff.filter(s => s.is_active === 1 && s.exclude_from_roster !== 1).map(member => (
                          <tr key={member.id}>
                            <td><strong>{member.name}</strong></td>
                            <td><span className="badge badge-category" style={{ fontSize: '0.75rem' }}>{member.role}</span></td>
                            {Array.from({ length: 7 }, (_, i) => {
                              let d = new Date(selectedRosterWeek);
                              if (isNaN(d.getTime())) d = new Date(); // fallback if input is cleared
                              d.setDate(d.getDate() + i);
                              const dateStr = d.toISOString().split('T')[0];

                              // Check if this date is a holiday
                              const isHoliday = holidays.some(h => h.holiday_date === dateStr);

                              // Check if this staff member has approved leave covering this date
                              const approvedLeave = leaves.find(l => {
                                if (l.staff_id !== member.id || l.status !== 'Approved') return false;
                                const leaveStart = new Date(l.start_date).toLocaleDateString('en-CA');
                                const leaveEnd = new Date(l.end_date).toLocaleDateString('en-CA');
                                return dateStr >= leaveStart && dateStr <= leaveEnd;
                              });

                              // Holiday takes priority — show for everyone
                              if (isHoliday) {
                                return (
                                  <td key={i} style={{ padding: '6px', textAlign: 'center' }}>
                                    <div style={{
                                      padding: '10px 4px',
                                      borderRadius: '6px',
                                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                      border: '1px solid rgba(245, 158, 11, 0.4)',
                                      textAlign: 'center'
                                    }}>
                                      <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>Holiday</div>
                                    </div>
                                  </td>
                                );
                              }

                              // Approved leave — show for this specific employee
                              if (approvedLeave) {
                                return (
                                  <td key={i} style={{ padding: '6px', textAlign: 'center' }}>
                                    <div style={{
                                      padding: '10px 4px',
                                      borderRadius: '6px',
                                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                      border: '1px solid rgba(239, 68, 68, 0.35)',
                                      textAlign: 'center'
                                    }}>
                                      <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>On Leave</div>
                                    </div>
                                  </td>
                                );
                              }

                              // Normal shift assignment
                              const entry = roster.find(r => r.staff_id === member.id && r.roster_date.split('T')[0] === dateStr);
                              const currentVal = entry && entry.status !== 'Off' ? entry.shift_id || 'Off' : 'Off';
                              const isSwapped = entry && entry.status === 'Swapped';

                              return (
                                <td key={i} style={{ padding: '6px' }}>
                                  <select
                                    value={currentVal}
                                    onChange={e => handleUpdateRosterCell(member.id, dateStr, e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '5px',
                                      fontSize: '0.8rem',
                                      borderRadius: '4px',
                                      backgroundColor: currentVal === 'Off' ? 'rgba(255,255,255,0.03)' : (isSwapped ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16,185,129,0.15)'),
                                      color: currentVal === 'Off' ? 'var(--text-muted)' : (isSwapped ? '#3b82f6' : 'var(--accent-success)'),
                                      border: isSwapped ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)'
                                    }}
                                  >
                                    <option value="Off">💤 Off</option>
                                    {shifts.map(sh => (
                                      <option key={sh.id} value={sh.id}>🕒 {sh.name}</option>
                                    ))}
                                  </select>
                                  {isSwapped && (
                                    <div style={{ fontSize: '0.65rem', color: '#3b82f6', marginTop: '4px', textAlign: 'center', fontWeight: '500' }}>
                                      🔄 Swapped
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ============ SUB-TAB: ATTENDANCE LOGS ============ */}
              {hrSubTab === 'attendance' && (
                <div>
                  <div className="view-header-bar" style={{ flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label style={{ fontWeight: 600 }}>Select Date:</label>
                      <input type="date" value={selectedAttendanceDate} onChange={e => setSelectedAttendanceDate(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }} />
                    </div>
                    <button className="btn btn-outline-primary" onClick={() => setShowAttendanceForm(true)}>📝 Log Manual / Past Attendance</button>
                  </div>

                  {/* Manual attendance dialog */}
                  {showAttendanceForm && (
                    <div className="hr-form-card" style={{ maxWidth: '600px', margin: '20px 0' }}>
                      <h4>📝 Manual Attendance Entry</h4>
                      <form onSubmit={handleSaveManualAttendance}>
                        <div className="hr-form-grid">
                          <div className="hr-form-group">
                            <label>Staff Member *</label>
                            <select required value={formAttendanceManual.staff_id} onChange={e => setFormAttendanceManual({ ...formAttendanceManual, staff_id: e.target.value })}>
                              <option value="">-- Select Staff --</option>
                              {staff.filter(s => s.is_active === 1 && s.exclude_from_attendance !== 1).map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                              ))}
                            </select>
                          </div>
                          <div className="hr-form-group">
                            <label>Shift</label>
                            <select value={formAttendanceManual.shift_id} onChange={e => setFormAttendanceManual({ ...formAttendanceManual, shift_id: e.target.value })}>
                              <option value="">-- None / Select Shift --</option>
                              {shifts.map(sh => (
                                <option key={sh.id} value={sh.id}>{sh.name} ({sh.start_time})</option>
                              ))}
                            </select>
                          </div>
                          <div className="hr-form-group">
                            <label>Status *</label>
                            <select value={formAttendanceManual.status} onChange={e => setFormAttendanceManual({ ...formAttendanceManual, status: e.target.value })}>
                              <option value="Present">Present</option>
                              <option value="Late">Late</option>
                              <option value="Half-Day">Half-Day</option>
                              <option value="Absent">Absent</option>
                            </select>
                          </div>
                          <div className="hr-form-group">
                            <label>Check-in Time (YYYY-MM-DD HH:mm:ss)</label>
                            <input type="text" placeholder="Optional. e.g. 2026-06-10 09:05:00" value={formAttendanceManual.check_in} onChange={e => setFormAttendanceManual({ ...formAttendanceManual, check_in: e.target.value })} />
                          </div>
                        </div>
                        <div className="hr-form-group" style={{ marginTop: '10px' }}>
                          <label>Notes / Remarks</label>
                          <input type="text" placeholder="e.g. Late due to public transit delay" value={formAttendanceManual.notes} onChange={e => setFormAttendanceManual({ ...formAttendanceManual, notes: e.target.value })} />
                        </div>
                        <div className="hr-form-actions" style={{ marginTop: '15px' }}>
                          <button type="button" className="btn btn-outline-primary" onClick={() => { setShowAttendanceForm(false); setFormAttendanceManual({ staff_id: '', shift_id: '', status: 'Present', notes: '', check_in: '', check_out: '' }); }}>Cancel</button>
                          <button type="submit" className="btn btn-success">Save Record</button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="attendance-layout" style={{ display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
                    {/* Left: Quick checkin for today */}
                    {selectedAttendanceDate === new Date().toLocaleDateString('en-CA') && (
                      <div style={{ flex: 1, minWidth: '400px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h4 style={{ margin: '0 0 15px 0' }}>🍳 Today's Quick Check-in Desk</h4>
                        <div className="quick-checkin-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {staff.filter(s => s.is_active === 1 && s.exclude_from_attendance !== 1).map(member => {
                            const rec = attendance.find(a => a.staff_id === member.id);
                            return (
                              <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                <div>
                                  <strong style={{ display: 'block' }}>{member.name}</strong>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{member.role}</span>
                                </div>
                                <div>
                                  {!rec ? (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button className="btn btn-success btn-small" onClick={() => {
                                        const todayStr = new Date().toLocaleDateString('en-CA');
                                        const rosterEntry = roster.find(r => r.staff_id === member.id && r.roster_date.split('T')[0] === todayStr);
                                        const shiftId = rosterEntry && rosterEntry.status !== 'Off' ? rosterEntry.shift_id : null;
                                        handleCheckIn(member.id, shiftId, 'Desk check-in');
                                      }}>▶ Check In</button>
                                    </div>
                                  ) : !rec.check_out && rec.status !== 'Absent' ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>In: {new Date(rec.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      <button className="btn btn-outline-danger btn-small" onClick={() => handleCheckOut(rec.id)}>■ Check Out</button>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: rec.status === 'Absent' ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                                      {rec.status === 'Absent' ? ' Absent' : '✓ Completed'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Right: Attendance history table */}
                    <div style={{ flex: 2, minWidth: '600px' }}>
                      <h4 style={{ margin: '0 0 15px 0' }}>📋 Attendance Ledger Records</h4>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Staff Member</th>
                            <th>Shift</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Status Badge</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendance.filter(a => { const s = staff.find(st => st.id === a.staff_id); return !s || s.exclude_from_attendance !== 1; }).map(a => (
                            <tr key={a.id}>
                              <td><strong>{a.staff_name}</strong></td>
                              <td>{a.shift_name || '—'}</td>
                              <td style={{ fontSize: '0.8rem' }}>{a.check_in ? new Date(a.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                              <td style={{ fontSize: '0.8rem' }}>{a.check_out ? new Date(a.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                              <td>
                                <span className={`badge ${
                                  a.status === 'Present' ? 'badge-success' :
                                  a.status === 'Late' ? 'badge-warning' :
                                  a.status === 'Half-Day' ? 'badge-category' : 'badge-danger'
                                }`}>
                                  {a.status}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.notes || '—'}</td>
                            </tr>
                          ))}
                          {attendance.length === 0 && (
                            <tr>
                              <td colSpan="6" className="empty-state">No attendance records logged for this date.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ============ SUB-TAB: LEAVE MANAGEMENT ============ */}
              {hrSubTab === 'leaves' && (
                <div>
                  <div className="view-header-bar">
                    <h3>Leave Application & Approvals</h3>
                    <button className="btn btn-primary" onClick={() => setShowLeaveForm(true)}>➕ Apply for Leave</button>
                  </div>

                  {showLeaveForm && (
                    <div className="hr-form-card" style={{ maxWidth: '550px', margin: '20px 0' }}>
                      <h4>✉️ File Leave Application</h4>
                      <form onSubmit={handleApplyLeave}>
                        <div className="hr-form-grid">
                          <div className="hr-form-group">
                            <label>Staff Member *</label>
                            <select required value={formLeave.staff_id} onChange={handleLeaveStaffChange}>
                              <option value="">-- Choose Staff --</option>
                              {staff.filter(s => s.is_active === 1).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                          {leaveBalance && (
                            <div className="hr-form-group" style={{ gridColumn: 'span 2' }}>
                              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.85rem' }}>
                                <strong>Leave Balances ({leaveBalance.year}):</strong><br/>
                                Casual: {leaveBalance.casual_taken}/{leaveBalance.casual_limit} | 
                                Sick: {leaveBalance.sick_taken}/{leaveBalance.sick_limit} | 
                                Earned: {leaveBalance.earned_taken}/{leaveBalance.earned_limit}
                              </div>
                            </div>
                          )}
                          <div className="hr-form-group">
                            <label>Leave Type *</label>
                            <select value={formLeave.leave_type} onChange={e => setFormLeave({ ...formLeave, leave_type: e.target.value })}>
                              <option value="Casual">Casual Leave</option>
                              <option value="Sick">Sick Leave</option>
                              <option value="Earned">Earned Leave</option>
                            </select>
                          </div>
                          <div className="hr-form-group">
                            <label>Start Date *</label>
                            <input type="date" required value={formLeave.start_date} onChange={e => setFormLeave({ ...formLeave, start_date: e.target.value })} />
                          </div>
                          <div className="hr-form-group">
                            <label>End Date *</label>
                            <input type="date" required value={formLeave.end_date} onChange={e => setFormLeave({ ...formLeave, end_date: e.target.value })} />
                          </div>
                        </div>
                        <div className="hr-form-group" style={{ marginTop: '10px' }}>
                          <label>Reason / Purpose *</label>
                          <input type="text" required placeholder="e.g. Medical recovery, family occasion" value={formLeave.reason} onChange={e => setFormLeave({ ...formLeave, reason: e.target.value })} />
                        </div>
                        <div className="hr-form-actions" style={{ marginTop: '15px' }}>
                          <button type="button" className="btn btn-outline-primary" onClick={() => { setShowLeaveForm(false); setFormLeave({ staff_id: '', leave_type: 'Casual', start_date: '', end_date: '', reason: '' }); }}>Cancel</button>
                          <button type="submit" className="btn btn-success">File Leave</button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="table-container" style={{ marginTop: '20px' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Staff Member</th>
                          <th>Leave Type</th>
                          <th>Period</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th>Approval Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaves.map(lv => (
                          <tr key={lv.id}>
                            <td><strong>{lv.staff_name}</strong></td>
                            <td><span className="badge badge-category">{lv.leave_type}</span></td>
                            <td style={{ fontSize: '0.85rem' }}>
                              {new Date(lv.start_date).toLocaleDateString()} – {new Date(lv.end_date).toLocaleDateString()}
                            </td>
                            <td>{lv.reason}</td>
                            <td>
                              <span className={`badge ${
                                lv.status === 'Approved' ? 'badge-success' :
                                lv.status === 'Rejected' ? 'badge-danger' : 'badge-warning'
                              }`}>
                                {lv.status}
                              </span>
                            </td>
                            <td>
                              {lv.status === 'Pending' ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button className="btn btn-success btn-small" onClick={() => handleApproveLeave(lv.id)}>Approve</button>
                                  <button className="btn btn-danger-small" onClick={() => handleRejectLeave(lv.id)}>Reject</button>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  {lv.status === 'Approved' ? `Approved by ${lv.approved_by || 'Admin'}` : 'Request Declined'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {leaves.length === 0 && (
                          <tr>
                            <td colSpan="6" className="empty-state">No leave applications registered.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ============ SUB-TAB: PAYROLL PANEL ============ */}
              {hrSubTab === 'payroll' && (
                <div>
                  {/* Payroll generator configuration */}
                  <div className="hr-form-card" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4>🧮 Generate / Calculate Monthly Payroll</h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                      Generates statutory earnings & deductions (PF @12%, ESI @0.75%, configured TDS, and Staff Meal deductions) based on attendance days.
                    </p>
                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div className="hr-form-group" style={{ width: '120px' }}>
                        <label>Month</label>
                        <select value={payrollMonth} onChange={e => setPayrollMonth(parseInt(e.target.value))}>
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{new Date(2026, i).toLocaleString(undefined, { month: 'long' })}</option>
                          ))}
                        </select>
                      </div>
                      <div className="hr-form-group" style={{ width: '120px' }}>
                        <label>Year</label>
                        <select value={payrollYear} onChange={e => setPayrollYear(parseInt(e.target.value))}>
                          {[2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                      <div className="hr-form-group" style={{ width: '160px' }}>
                        <label>Total Working Days</label>
                        <input type="number" value={payrollWorkingDays} onChange={e => setPayrollWorkingDays(e.target.value)} />
                      </div>
                      <button className="btn btn-success" onClick={handleGeneratePayroll} style={{ height: '42px' }}>⚡ Generate Payroll Ledger</button>
                    </div>
                  </div>

                  {/* Payroll history ledger */}
                  <div className="table-container" style={{ marginTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h4>📋 Payroll Statement — {new Date(2026, payrollMonth - 1).toLocaleString(undefined, { month: 'long' })} {payrollYear}</h4>
                    </div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Staff</th>
                          <th>Type</th>
                          <th>Duty Days</th>
                          <th>Gross Pay</th>
                          <th>PF (12%)</th>
                          <th>ESI (0.75%)</th>
                          <th>TDS Deduction</th>
                          <th>Meals Cost</th>
                          <th>Net Payout</th>
                          <th>Status</th>
                          <th>Bank Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payroll.filter(p => {
                          const s = staff.find(st => st.id === p.staff_id);
                          return !s || s.exclude_from_payroll !== 1;
                        }).map(p => (
                          <tr key={p.id}>
                            <td>
                              <strong>{p.staff_name}</strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.role}</div>
                            </td>
                            <td><span className="badge badge-category" style={{ fontSize: '0.75rem' }}>{p.pay_type}</span></td>
                            <td><strong>{p.days_present}</strong> / {p.working_days}</td>
                            <td className="text-success">₹{parseFloat(p.gross_salary).toFixed(2)}</td>
                            <td className="text-danger">−₹{parseFloat(p.pf_deduction).toFixed(2)}</td>
                            <td className="text-danger">−₹{parseFloat(p.esi_deduction).toFixed(2)}</td>
                            <td className="text-danger">−₹{parseFloat(p.tds_deduction).toFixed(2)}</td>
                            <td className="text-danger">−₹{parseFloat(p.meal_deduction).toFixed(2)}</td>
                            <td style={{ fontWeight: 700, color: 'var(--accent-success)' }}>₹{parseFloat(p.net_salary).toFixed(2)}</td>
                            <td>
                              <span className={`badge ${p.status === 'Finalized' ? 'badge-success' : 'badge-warning'}`}>
                                {p.status === 'Finalized' ? 'Paid' : 'Draft'}
                              </span>
                            </td>
                            <td>
                              {p.status === 'Draft' ? (
                                <button className="btn btn-success btn-small" onClick={() => handlePayPayroll(p.id)}>💳 Finalize & Pay</button>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    Sent to A/C: {p.bank_account || 'Bank Transfer'}
                                  </span>
                                  <button className="btn btn-outline-primary btn-small" onClick={() => {
                                    const printWin = window.open('', '_blank');
                                    printWin.document.write(`
                                      <html><head><title>Payslip - ${p.staff_name}</title>
                                      <style>
                                        body { font-family: Arial, sans-serif; padding: 20px; }
                                        .header { text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
                                        .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                        .table th, .table td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                                      </style>
                                      </head><body>
                                      <div class="header">
                                        <h2>Food Court & Canteen ERP</h2>
                                        <h3>Payslip for ${new Date(2026, payrollMonth - 1).toLocaleString(undefined, { month: 'long' })} ${payrollYear}</h3>
                                      </div>
                                      <p><strong>Employee:</strong> ${p.staff_name}</p>
                                      <p><strong>Role:</strong> ${p.role}</p>
                                      <p><strong>Days Worked:</strong> ${p.days_present} / ${p.working_days}</p>
                                      <table class="table">
                                        <tr><th>Earnings</th><th>Amount</th><th>Deductions</th><th>Amount</th></tr>
                                        <tr>
                                          <td>Gross Pay</td><td>₹${parseFloat(p.gross_salary).toFixed(2)}</td>
                                          <td>PF Deduction (12%)</td><td>₹${parseFloat(p.pf_deduction).toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                          <td></td><td></td>
                                          <td>ESI Deduction (0.75%)</td><td>₹${parseFloat(p.esi_deduction).toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                          <td></td><td></td>
                                          <td>TDS Deduction</td><td>₹${parseFloat(p.tds_deduction).toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                          <td></td><td></td>
                                          <td>Meals Deductions</td><td>₹${parseFloat(p.meal_deduction).toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                          <th>Total Earnings</th><th>₹${parseFloat(p.gross_salary).toFixed(2)}</th>
                                          <th>Total Deductions</th><th>₹${(parseFloat(p.pf_deduction) + parseFloat(p.esi_deduction) + parseFloat(p.tds_deduction) + parseFloat(p.meal_deduction)).toFixed(2)}</th>
                                        </tr>
                                      </table>
                                      <h3 style="text-align:right; margin-top: 20px;">Net Payable: ₹${parseFloat(p.net_salary).toFixed(2)}</h3>
                                      <script>window.print();</script>
                                      </body></html>
                                    `);
                                    printWin.document.close();
                                  }}>📄 Payslip</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                        {payroll.length === 0 && (
                          <tr>
                            <td colSpan="11" className="empty-state">No payroll statements generated for this period. Click the generate button above.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}



              {/* ============ SUB-TAB: PERFORMANCE ANALYTICS ============ */}
              {hrSubTab === 'performance' && (
                <div>
                  <div className="view-header-bar" style={{ flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label style={{ fontWeight: 600 }}>Start Date:</label>
                      <input type="date" className="attendance-date-input" value={perfStartDate} onChange={e => setPerfStartDate(e.target.value)} />
                      <label style={{ fontWeight: 600 }}>End Date:</label>
                      <input type="date" className="attendance-date-input" value={perfEndDate} onChange={e => setPerfEndDate(e.target.value)} />
                      <button className="btn btn-primary" onClick={() => fetchStaffPerformance(perfStartDate, perfEndDate)} style={{ height: '38px' }}>🔄 Load Performance</button>
                    </div>
                  </div>

                  <div className="performance-summary-cards" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
                    <div className="perf-summary-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', flex: '1', minWidth: '200px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="perf-label" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Active Staff Directory</div>
                      <div className="perf-value primary" style={{ fontSize: '2rem', fontWeight: 700, marginTop: '5px' }}>{staff.filter(s => s.is_active === 1).length}</div>
                    </div>
                    <div className="perf-summary-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', flex: '1', minWidth: '200px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="perf-label" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Attendance Rate (Avg)</div>
                      <div className="perf-value success" style={{ fontSize: '2rem', fontWeight: 700, marginTop: '5px', color: 'var(--accent-success)' }}>
                        {(() => {
                          const activeRecordCount = staffPerformance.length;
                          if (activeRecordCount === 0) return '0%';
                          const totalPresence = staffPerformance.reduce((s, p) => s + parseFloat(p.days_present), 0);
                          const totalPossible = staffPerformance.reduce((s, p) => s + parseInt(p.total_attendance_records || 30), 0);
                          return totalPossible > 0 ? `${((totalPresence / totalPossible) * 100).toFixed(0)}%` : '0%';
                        })()}
                      </div>
                    </div>
                    <div className="perf-summary-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', flex: '1', minWidth: '200px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="perf-label" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Leaves Taken</div>
                      <div className="perf-value warning" style={{ fontSize: '2rem', fontWeight: 700, marginTop: '5px', color: 'var(--accent-warning)' }}>
                        {staffPerformance.reduce((s, p) => s + parseInt(p.leaves_taken), 0)}
                      </div>
                    </div>
                    <div className="perf-summary-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', flex: '1', minWidth: '200px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="perf-label" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Staff Meal Deductions</div>
                      <div className="perf-value" style={{ fontSize: '2rem', fontWeight: 700, marginTop: '5px' }}>
                        ₹{staffPerformance.reduce((s, p) => s + parseFloat(p.total_meal_cost), 0).toFixed(0)}
                      </div>
                    </div>
                  </div>

                  <div className="table-container" style={{ marginTop: '20px' }}>
                    <h4>🏆 Month-wise Staff Attendance, POS Performance & Incentives</h4>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Staff Name</th>
                          <th>Role</th>
                          <th>Days Worked</th>
                          <th>Late Days</th>
                          <th>Meals Deducted</th>
                          <th>Orders Processed</th>
                          <th>Avg Prep Time</th>
                          <th>Upsell Rate</th>
                          <th>Incentive Earned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffPerformance.map(m => {
                          const ordersProcessed = m.orders_processed || 0;
                          const upsoldOrders = m.upsold_orders || 0;
                          const avgPrepTimeSec = m.avg_handling_time || 0;
                          
                          let formattedPrepTime = '-';
                          if (ordersProcessed > 0 && avgPrepTimeSec > 0) {
                            const mins = Math.floor(avgPrepTimeSec / 60);
                            const secs = Math.round(avgPrepTimeSec % 60);
                            formattedPrepTime = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                          }
                          
                          const upsellRate = ordersProcessed > 0 ? `${((upsoldOrders / ordersProcessed) * 100).toFixed(0)}%` : '-';
                          const incentive = ordersProcessed > 0 ? (ordersProcessed * 5) + (upsoldOrders * 10) : 0;
                          
                          return (
                            <tr key={m.staff_id}>
                              <td><strong>{m.staff_name}</strong></td>
                              <td><span className="badge badge-category" style={{ fontSize: '0.75rem' }}>{m.role}</span></td>
                              <td><strong>{m.days_present}</strong> days</td>
                              <td style={{ color: m.late_days > 2 ? 'var(--accent-danger)' : 'var(--text-light)' }}>
                                {m.late_days} day(s)
                              </td>
                              <td style={{ fontWeight: 600, color: 'var(--accent-danger)' }}>₹{parseFloat(m.total_meal_cost).toFixed(2)}</td>
                              <td><strong>{ordersProcessed}</strong> orders</td>
                              <td>{formattedPrepTime}</td>
                              <td>{upsellRate}</td>
                              <td style={{ fontWeight: 700, color: 'var(--accent-success)' }}>₹{incentive.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                        {staffPerformance.length === 0 && (
                          <tr>
                            <td colSpan="9" className="empty-state">No performance stats loaded. Try selecting a month with attendance data.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ============ SUB-TAB: HOLIDAY CALENDAR ============ */}
              {hrSubTab === 'holidays' && (
                <div className="holidays-section" style={{ padding: '20px' }}>
                  <div className="panel-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <button className="btn btn-outline-primary" onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1, 1))}>&lt; Prev</button>
                      <h3 style={{ margin: 0, minWidth: '150px', textAlign: 'center' }}>
                        {currentCalendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </h3>
                      <button className="btn btn-outline-primary" onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1, 1))}>Next &gt;</button>
                    </div>
                    <button className="btn btn-primary" onClick={() => setHolidayModal({ show: true, name: '', date: '', description: '' })}>+ Add Holiday</button>
                  </div>
                  
                  <div className="calendar-grid-container">
                    {(() => {
                      const year = currentCalendarMonth.getFullYear();
                      const month = currentCalendarMonth.getMonth();
                      const firstDay = new Date(year, month, 1);
                      const lastDay = new Date(year, month + 1, 0);
                      const startDate = new Date(firstDay);
                      startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
                      
                      const endDate = new Date(lastDay);
                      if (endDate.getDay() !== 6) {
                        endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End on Saturday
                      }

                      const rows = [];
                      let days = [];
                      let day = new Date(startDate);

                      while (day <= endDate) {
                        for (let i = 0; i < 7; i++) {
                          const currentDate = new Date(day);
                          // Pad zero to month and day for ISO format comparison
                          const tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
                          const dateStr = (new Date(currentDate.getTime() - tzoffset)).toISOString().split('T')[0];
                          const isCurrentMonth = currentDate.getMonth() === month;
                          const holidayInfo = holidays.find(h => h.holiday_date === dateStr);
                          
                          days.push(
                            <div 
                              key={dateStr}
                              onClick={() => setHolidayModal({ show: true, name: holidayInfo ? holidayInfo.name : '', date: dateStr, description: '' })}
                              style={{
                                padding: '10px',
                                minHeight: '90px',
                                border: '1px solid var(--border-light)',
                                backgroundColor: holidayInfo ? 'rgba(245, 158, 11, 0.12)' : (isCurrentMonth ? 'var(--bg-surface)' : 'rgba(0,0,0,0.02)'),
                                opacity: isCurrentMonth ? 1 : 0.5,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                position: 'relative'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = holidayInfo ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-light)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = holidayInfo ? 'rgba(245, 158, 11, 0.12)' : (isCurrentMonth ? 'var(--bg-surface)' : 'rgba(0,0,0,0.02)')}
                            >
                              <div style={{ fontWeight: 'bold', marginBottom: '5px', color: isCurrentMonth ? 'inherit' : 'var(--text-muted)' }}>{currentDate.getDate()}</div>
                              {holidayInfo && (
                                <div style={{
                                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                  border: '1px solid rgba(245, 158, 11, 0.4)',
                                  color: '#f59e0b',
                                  padding: '4px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px'
                                }}>
                                  <span>🎉 Holiday</span>
                                  <span style={{ fontSize: '0.65rem' }}>{holidayInfo.name}</span>
                                </div>
                              )}
                            </div>
                          );
                          day.setDate(day.getDate() + 1);
                        }
                        rows.push(<div key={day.toISOString()} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>{days}</div>);
                        days = [];
                      }
                      
                      return (
                        <div style={{ border: '1px solid var(--border-light)', borderRadius: '8px', overflow: 'hidden' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'var(--bg-light)', borderBottom: '1px solid var(--border-light)' }}>
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                              <div key={d} style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: 'var(--text-muted)' }}>{d}</div>
                            ))}
                          </div>
                          <div>{rows}</div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==========================================
               2.12 MIS REPORTS VIEW
               ========================================== */}
          {activeTab === 'reports' && (
            <div className="view-panel active">
              <div className="view-header-bar">
                <h2>MIS, Reports & Analytics</h2>
                <div className="action-btns">
                  <input type="date" className="header-date-input" value={reportDateRange.startDate} onChange={e => setReportDateRange(prev => ({...prev, startDate: e.target.value}))} />
                  <span style={{color: 'var(--text-muted)'}}>to</span>
                  <input type="date" className="header-date-input" value={reportDateRange.endDate} onChange={e => setReportDateRange(prev => ({...prev, endDate: e.target.value}))} />
                  
                  <button className="btn btn-outline-primary" onClick={() => setShowOverheadModal(true)}>+ Log Expense</button>
                  <button className="btn btn-outline-primary" onClick={() => setShowCustomerModal(true)}>+ New Customer</button>
                  <button className="btn btn-primary" onClick={() => window.print()}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: 6}}><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/></svg>
                    Export PDF
                  </button>
                </div>
              </div>
              
              <div className="sub-tabs">
                <button className={`sub-tab ${reportsSubTab === 'sales' ? 'active' : ''}`} onClick={() => setReportsSubTab('sales')}>Daily Sales</button>
                <button className={`sub-tab ${reportsSubTab === 'stock' ? 'active' : ''}`} onClick={() => setReportsSubTab('stock')}>Stock</button>
                <button className={`sub-tab ${reportsSubTab === 'vendors' ? 'active' : ''}`} onClick={() => setReportsSubTab('vendors')}>Vendors</button>
                <button className={`sub-tab ${reportsSubTab === 'peak-hours' ? 'active' : ''}`} onClick={() => setReportsSubTab('peak-hours')}>Peak Hours</button>
                <button className={`sub-tab ${reportsSubTab === 'monthly-pl' ? 'active' : ''}`} onClick={() => setReportsSubTab('monthly-pl')}>Monthly P&L</button>
                <button className={`sub-tab ${reportsSubTab === 'customer-analytics' ? 'active' : ''}`} onClick={() => setReportsSubTab('customer-analytics')}>Customers</button>
                <button className={`sub-tab ${reportsSubTab === 'gst' ? 'active' : ''}`} onClick={() => setReportsSubTab('gst')}>GST Report</button>
                <button className={`sub-tab ${reportsSubTab === 'reconciliation' ? 'active' : ''}`} onClick={() => { setReportsSubTab('reconciliation'); fetchReconciliation(); }}>Reconciliation</button>
                <button className={`sub-tab ${reportsSubTab === 'credits' ? 'active' : ''}`} onClick={() => { setReportsSubTab('credits'); fetchCreditCustomers(); }}>Credits</button>
              </div>

              <div className="reports-content-area">
                {reportsSubTab === 'sales' && reportsData.sales && (
                  <div className="report-section">
                    <div className="stats-grid">
                      <div className="stats-card">
                        <div className="stats-info">
                          <h3>Gross Sales</h3>
                          <span className="stats-value">₹{Number(reportsData.sales.revenue || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="stats-card">
                        <div className="stats-info">
                          <h3>Net Sales</h3>
                          <span className="stats-value">₹{Number(reportsData.sales.revenue || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="stats-card">
                        <div className="stats-info">
                          <h3>Total COGS</h3>
                          <span className="stats-value" style={{color: 'var(--accent-danger)'}}>₹{Number(reportsData.sales.cogs || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="stats-card">
                        <div className="stats-info">
                          <h3>Gross Profit Margin</h3>
                          <span className="stats-value" style={{color: 'var(--accent-success)'}}>{(((reportsData.sales.revenue - reportsData.sales.cogs) / (reportsData.sales.revenue || 1)) * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {reportsSubTab === 'stock' && reportsData.stock && reportsData.stock.items && (
                  <div className="panel-card mt-4">
                    {/* Comparison Cards Dashboard */}
                    {reportsData.stock.summary && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                        <div style={{ padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', backgroundColor: 'rgba(255,255,255,0.05)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Total Purchased</span>
                          <h3 style={{ margin: '5px 0 0 0', fontSize: '22px', color: 'var(--text-light)', fontWeight: 600 }}>₹{Number(reportsData.stock.summary.totalPurchased || 0).toFixed(2)}</h3>
                        </div>
                        <div style={{ padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', backgroundColor: 'rgba(255,255,255,0.05)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Total Consumed (COGS)</span>
                          <h3 style={{ margin: '5px 0 0 0', fontSize: '22px', color: 'var(--text-light)', fontWeight: 600 }}>₹{Number(reportsData.stock.summary.totalConsumed || 0).toFixed(2)}</h3>
                        </div>
                        <div style={{ padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', backgroundColor: 'rgba(255,255,255,0.05)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Total Wasted</span>
                          <h3 style={{ margin: '5px 0 0 0', fontSize: '22px', color: 'var(--accent-danger)', fontWeight: 600 }}>₹{Number(reportsData.stock.summary.totalWasted || 0).toFixed(2)}</h3>
                        </div>
                        <div style={{ padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', backgroundColor: 'rgba(255,255,255,0.05)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Net Inventory Delta</span>
                          <h3 style={{ margin: '5px 0 0 0', fontSize: '22px', color: reportsData.stock.summary.netDelta >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)', fontWeight: 600 }}>
                            {reportsData.stock.summary.netDelta >= 0 ? '+' : ''}₹{Number(reportsData.stock.summary.netDelta || 0).toFixed(2)}
                          </h3>
                        </div>
                      </div>
                    )}

                    <div className="panel-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>Stock & Inventory Report</h3>
                      <button className="btn btn-outline-primary" onClick={() => {
                        const csvContent = "data:text/csv;charset=utf-8,Item,Opening,Purchased,Consumed,Wasted,Closing,Value\n" +
                          reportsData.stock.items.map(e => `${e.name},${e.openingStock} ${e.unit},${e.purchases} ${e.unit},${e.consumption} ${e.unit},${e.wastage} ${e.unit},${e.closingStock} ${e.unit},${(e.closingStock * e.cost_per_unit).toFixed(2)}`).join("\n");
                        const link = document.createElement("a");
                        link.setAttribute("href", encodeURI(csvContent));
                        link.setAttribute("download", `stock_report.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}>Export CSV</button>
                    </div>
                    <div className="table-container">
                      <table className="data-table">
                        <thead><tr><th>Item</th><th>Opening</th><th>Purchased</th><th>Consumed</th><th>Wasted</th><th>Closing</th><th>Value</th></tr></thead>
                        <tbody>
                          {reportsData.stock.items.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.name}</td>
                              <td>{item.openingStock} {item.unit}</td>
                              <td>{item.purchases} {item.unit}</td>
                              <td>{item.consumption} {item.unit}</td>
                              <td>{item.wastage} {item.unit}</td>
                              <td>{item.closingStock} {item.unit}</td>
                              <td>₹{Number(item.closingStock * item.cost_per_unit).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {reportsSubTab === 'vendors' && reportsData.vendors && reportsData.vendors.vendors && (
                  <div className="panel-card mt-4">
                    <div className="panel-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>Vendor Performance & Settlement</h3>
                      <button className="btn btn-outline-primary" onClick={() => {
                        const csvContent = "data:text/csv;charset=utf-8,Vendor,Total Orders,Gross Revenue,Platform Fee (%),Net Settlement\n" +
                          reportsData.vendors.vendors.map(e => `${e.name},${e.orderCount},${e.totalSales},${e.feePercentage},${e.netPayable}`).join("\n");
                        const link = document.createElement("a");
                        link.setAttribute("href", encodeURI(csvContent));
                        link.setAttribute("download", `vendors_report.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}>Export CSV</button>
                    </div>
                    <div className="table-container">
                      <table className="data-table">
                        <thead><tr><th>Vendor Name</th><th>Gross Sales</th><th>Admin Commission</th><th>Overheads Share</th><th>Net Payable</th></tr></thead>
                        <tbody>
                          {reportsData.vendors.vendors.map((v, idx) => (
                            <tr key={idx}>
                              <td>{v.name}</td>
                              <td>₹{Number(v.revenue || 0).toFixed(2)}</td>
                              <td>₹{Number(v.commission || 0).toFixed(2)}</td>
                              <td>₹{Number(v.common_cost_share || 0).toFixed(2)}</td>
                              <td><strong style={{color: 'var(--accent-success)'}}>₹{Number(v.netPayout || 0).toFixed(2)}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {reportsSubTab === 'peak-hours' && reportsData.peakHours && (
                  <div className="panel-card mt-4">
                    <div className="panel-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>Peak Hours Analysis</h3>
                      <button className="btn btn-outline-primary" onClick={() => {
                        const csvContent = "data:text/csv;charset=utf-8,Hour,Orders,Revenue\n" +
                          reportsData.peakHours.map(e => `${e.hour}:00,${e.orders},${e.revenue}`).join("\n");
                        const link = document.createElement("a");
                        link.setAttribute("href", encodeURI(csvContent));
                        link.setAttribute("download", `peak_hours_report.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}>Export CSV</button>
                    </div>
                    <div className="panel-card-body">
                      <div className="chart-list">
                        {reportsData.peakHours.map((ph, idx) => (
                          <div className="chart-bar-item" key={idx}>
                            <div className="chart-bar-label">
                              <span className="chart-bar-name">{ph.label || `${ph.hour}:00`}</span>
                              <span className="chart-bar-val">{ph.orders} orders (₹{Number(ph.revenue || 0).toFixed(2)})</span>
                            </div>
                            <div className="chart-bar-track">
                               <div className="chart-bar-fill" style={{width: `${Math.min((ph.orders / 50) * 100, 100)}%`}}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {reportsSubTab === 'monthly-pl' && reportsData.monthlyPl && (
                  <div className="panel-card mt-4">
                    <div className="panel-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3>Monthly P&L Ledger</h3>
                      <button className="btn btn-outline-primary" onClick={() => {
                        const csvContent = "data:text/csv;charset=utf-8,Month,Total Revenue,Total COGS,Total Overheads,Raw Material Purchases,Net Profit\n" +
                          reportsData.monthlyPl.map(e => `${e.monthName},${e.revenue},${e.cogs},${e.overheads},${e.purchases || 0},${e.netProfit}`).join("\n");
                        const link = document.createElement("a");
                        link.setAttribute("href", encodeURI(csvContent));
                        link.setAttribute("download", `monthly_pl_report.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}>Export CSV</button>
                    </div>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Month</th>
                            <th>Total Revenue</th>
                            <th>Total COGS</th>
                            <th>Total Overheads</th>
                            <th>Raw Material Purchases (Outflow)</th>
                            <th>Net Profit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportsData.monthlyPl.map((pl, idx) => (
                            <tr key={idx}>
                              <td>{pl.monthName}</td>
                              <td>₹{Number(pl.revenue || 0).toFixed(2)}</td>
                              <td style={{color: 'var(--accent-danger)'}}>₹{Number(pl.cogs || 0).toFixed(2)}</td>
                              <td style={{color: 'var(--accent-danger)'}}>₹{Number(pl.overheads || 0).toFixed(2)}</td>
                              <td style={{color: 'var(--text-muted)'}}>₹{Number(pl.purchases || 0).toFixed(2)}</td>
                              <td><strong style={{color: pl.netProfit >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)'}}>₹{Number(pl.netProfit || 0).toFixed(2)}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Cash Flow Note Card */}
                    <div style={{ marginTop: '20px', padding: '15px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', backgroundColor: 'rgba(255, 255, 255, 0.02)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                        <span>💰</span> Cash Flow Note: Inventory Purchases
                      </h4>
                      <p style={{ margin: '0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                        During this year, a total of <strong>₹{reportsData.monthlyPl.reduce((sum, pl) => sum + (pl.purchases || 0), 0).toFixed(2)}</strong> was spent on purchasing raw materials (inventory). 
                        This represents a real cash outflow from your funds, but it is not directly subtracted from your Net Profit. Instead, it increases your inventory value, and is only expensed as <strong>COGS</strong> when those ingredients are actually sold to customers or logged as <strong>Wastage</strong>.
                      </p>
                    </div>
                  </div>
                )}
                
                {reportsSubTab === 'customer-analytics' && reportsData.customerAnalytics && (
                  <div className="dashboard-details-grid mt-4">
                    <div className="panel-card">
                      <div className="panel-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Loyalty Leaderboard</h3>
                        <button className="btn btn-outline-primary btn-small" onClick={() => {
                          const csvContent = "data:text/csv;charset=utf-8,Customer,Phone,Total Visits,Total Spent,Points\n" +
                            reportsData.customerAnalytics.leaderboard.map(e => `${e.name},${e.phone},${e.total_visits},${e.total_spent},${e.loyalty_points}`).join("\n");
                          const link = document.createElement("a");
                          link.setAttribute("href", encodeURI(csvContent));
                          link.setAttribute("download", `customer_loyalty.csv`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}>Export CSV</button>
                      </div>
                      <div className="table-container" style={{ height: '260px', overflowY: 'auto' }}>
                        <table className="data-table">
                          <thead><tr><th style={{ position: 'sticky', top: 0, background: 'var(--bg-panel)', zIndex: 1 }}>Customer</th><th style={{ position: 'sticky', top: 0, background: 'var(--bg-panel)', zIndex: 1 }}>Phone</th><th style={{ position: 'sticky', top: 0, background: 'var(--bg-panel)', zIndex: 1 }}>Total Visits</th><th style={{ position: 'sticky', top: 0, background: 'var(--bg-panel)', zIndex: 1 }}>Total Spent</th><th style={{ position: 'sticky', top: 0, background: 'var(--bg-panel)', zIndex: 1 }}>Points</th></tr></thead>
                          <tbody>
                            {reportsData.customerAnalytics.leaderboard && reportsData.customerAnalytics.leaderboard.map((c, idx) => (
                              <tr key={idx}>
                                <td>{c.name}</td>
                                <td>{c.phone}</td>
                                <td>{c.total_visits}</td>
                                <td>₹{Number(c.total_spent || 0).toFixed(2)}</td>
                                <td><span className="badge badge-success">{c.loyalty_points} pts</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="panel-card">
                      <div className="panel-card-header"><h3>Recent Feedback</h3></div>
                      <div className="table-container" style={{ height: '260px', overflowY: 'auto' }}>
                        <table className="data-table">
                          <thead><tr><th style={{ position: 'sticky', top: 0, background: 'var(--bg-panel)', zIndex: 1 }}>Customer</th><th style={{ position: 'sticky', top: 0, background: 'var(--bg-panel)', zIndex: 1 }}>Rating</th><th style={{ position: 'sticky', top: 0, background: 'var(--bg-panel)', zIndex: 1 }}>Comments</th></tr></thead>
                          <tbody>
                            {reportsData.customerAnalytics.feedback && reportsData.customerAnalytics.feedback.map((f, idx) => (
                              <tr key={idx}>
                                <td>{f.customer_name}</td>
                                <td>{'★'.repeat(f.rating || 0)}{'☆'.repeat(Math.max(0, 5 - (f.rating || 0)))}</td>
                                <td>{f.comments}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {reportsSubTab === 'gst' && reportsData.gst && (
                  <div className="report-section">
                    <div className="panel-card-header">
                      <h3>GST Report (Summary)</h3>
                    </div>
                    <div className="dashboard-details-grid mt-4">
                      <div className="panel-card">
                        <div className="panel-card-header">
                          <h3>HSN / SAC Summary</h3>
                        </div>
                        <div className="table-container">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>HSN/SAC</th>
                                <th>Category</th>
                                <th>Taxable Value</th>
                                <th>CGST</th>
                                <th>SGST</th>
                                <th>Total GST</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportsData.gst.hsnSummary && reportsData.gst.hsnSummary.map((item, idx) => (
                                <tr key={idx}>
                                  <td>{item.hsn}</td>
                                  <td>{item.category}</td>
                                  <td>₹{Number(item.taxable_value).toFixed(2)}</td>
                                  <td>₹{Number(item.cgst).toFixed(2)}</td>
                                  <td>₹{Number(item.sgst).toFixed(2)}</td>
                                  <td>₹{Number(item.gst_amount).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="panel-card">
                        <div className="panel-card-header">
                          <h3>Vendor-wise GST Summary</h3>
                        </div>
                        <div className="table-container">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Vendor</th>
                                <th>Total Sales</th>
                                <th>Taxable Value</th>
                                <th>Total GST</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportsData.gst.vendorSummary && reportsData.gst.vendorSummary.map((item, idx) => (
                                <tr key={idx}>
                                  <td>{item.vendor_name}</td>
                                  <td>₹{Number(item.total_sales).toFixed(2)}</td>
                                  <td>₹{Number(item.taxable_value).toFixed(2)}</td>
                                  <td>₹{Number(item.gst_amount).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* E1: Daily Reconciliation UI */}
                {reportsSubTab === 'reconciliation' && reconData && (
                  <div className="report-section">
                    <div className="panel-card-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'var(--bg-card)', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                      <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' }}>
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        Reconciliation Date:
                      </h3>
                      <input type="date" value={reconDate} onChange={e => { setReconDate(e.target.value); fetchReconciliation(e.target.value); }} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-dark)', color: 'var(--text-light)', fontSize: '1rem', fontWeight: 'bold', outline: 'none' }} />
                    </div>

                    <div className="stats-grid mt-4">
                      {Object.entries(reconData.systemTotals || {}).map(([mode, amount]) => (
                        <div className="stats-card" key={mode}>
                          <div className="stats-info">
                            <h3>{mode} (System)</h3>
                            <span className="stats-value">₹{Number(amount).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="panel-card mt-4">
                      <div className="panel-card-header"><h3>Submit Physical Counts</h3></div>
                      <div className="panel-card-body">
                        <div className="form-row" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                          <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                            <label>Physical Cash</label>
                            <input type="number" id="recon-physical-cash" defaultValue="" placeholder="Count cash in drawer" />
                          </div>
                          <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                            <label>UPI Settlement</label>
                            <input type="number" id="recon-upi" defaultValue="" placeholder="UPI bank credit" />
                          </div>
                          <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                            <label>Card Settlement</label>
                            <input type="number" id="recon-card" defaultValue="" placeholder="Card bank credit" />
                          </div>
                        </div>
                        <div className="form-row mt-3" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                          <div className="form-group" style={{ flex: 2, minWidth: '200px' }}>
                            <label>Notes</label>
                            <input type="text" id="recon-notes" defaultValue="" placeholder="Optional notes" />
                          </div>
                          <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
                            <label>Submitted By (Staff)</label>
                            <select id="recon-staff" defaultValue="" required style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-light)', fontSize: '0.95rem' }}>
                              <option value="" disabled>-- Select Staff --</option>
                              {staff.filter(s => s.is_active === 1 && ['Owner','Admin','Manager','Cashier'].includes(s.role)).map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="form-actions mt-4">
                          <button className="btn btn-primary" onClick={() => {
                            const staffId = document.getElementById('recon-staff').value;
                            if (!staffId) { showToast('Please select the staff member submitting this count.', 'error'); return; }
                            fetch(`${API_BASE}/reconciliation`, {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                recon_date: reconDate,
                                physical_cash: document.getElementById('recon-physical-cash').value,
                                upi_settlement: document.getElementById('recon-upi').value,
                                card_settlement: document.getElementById('recon-card').value,
                                notes: document.getElementById('recon-notes').value,
                                submitted_by: staffId
                              })
                            }).then(r => r.json()).then(data => {
                              showToast(`Reconciliation saved. Discrepancy: ₹${Number(data.discrepancy).toFixed(2)}`, data.discrepancy === 0 ? 'success' : 'error');
                              fetchReconciliation(reconDate);
                              document.getElementById('recon-physical-cash').value = '';
                              document.getElementById('recon-upi').value = '';
                              document.getElementById('recon-card').value = '';
                              document.getElementById('recon-notes').value = '';
                              document.getElementById('recon-staff').value = '';
                            }).catch(() => showToast('Failed to save reconciliation', 'error'));
                          }}>Save Reconciliation</button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Submission History Timeline */}
                    {Array.isArray(reconData.reconciliation) && reconData.reconciliation.length > 0 && (
                      <div className="panel-card mt-4">
                        <div className="panel-card-header"><h3>Reconciliation Ledger History</h3></div>
                        <div className="panel-card-body">
                          <div className="timeline-container" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {reconData.reconciliation.map((rec, idx) => (
                              <div key={rec.id} style={{ 
                                padding: '15px', 
                                borderRadius: '8px', 
                                borderLeft: idx === 0 ? '4px solid var(--accent-primary)' : '4px solid var(--border-color)', 
                                background: idx === 0 ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-card)',
                                position: 'relative'
                              }}>
                                {idx === 0 && <span style={{ position: 'absolute', top: '15px', right: '15px', fontSize: '0.75rem', background: 'var(--accent-primary)', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>OFFICIAL RECORD</span>}
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                  <strong>{new Date(rec.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong> • Submitted by: <strong style={{color:'var(--text-light)'}}>{rec.submitted_by_name || 'Unknown User'}</strong>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', marginBottom: '10px' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                      <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Mode</th>
                                      <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>System</th>
                                      <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Physical</th>
                                      <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Variance</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {[
                                      { label: 'Cash', sys: rec.system_cash, phys: rec.physical_cash },
                                      { label: 'UPI', sys: rec.system_upi, phys: rec.upi_settlement },
                                      { label: 'Card', sys: rec.system_card, phys: rec.card_settlement }
                                    ].map(row => {
                                      const variance = Number(row.phys) - Number(row.sys);
                                      return (
                                        <tr key={row.label} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                          <td style={{ padding: '6px 8px', fontWeight: 500 }}>{row.label}</td>
                                          <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>₹{Number(row.sys).toFixed(2)}</td>
                                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>₹{Number(row.phys).toFixed(2)}</td>
                                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: variance === 0 ? 'var(--accent-success)' : variance > 0 ? 'var(--accent-warning, #f59e0b)' : 'var(--accent-danger)' }}>
                                            {variance === 0 ? '✓' : (variance > 0 ? '+' : '') + '₹' + variance.toFixed(2)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                                <div className={rec.discrepancy >= 0 ? 'text-success' : 'text-danger'} style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                                  Discrepancy: ₹{Number(rec.discrepancy).toFixed(2)} {rec.discrepancy > 0 ? '(Excess)' : rec.discrepancy < 0 ? '(Shortage)' : '(Balanced)'}
                                </div>
                                {rec.notes && <div style={{ marginTop: '8px', fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>Notes: "{rec.notes}"</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* E2: Credit Settle UI */}
                {reportsSubTab === 'credits' && (
                  <div className="report-section">
                    <div className="panel-card-header"><h3>Credit Customers (Outstanding)</h3></div>
                    <div className="table-container mt-3">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Customer</th>
                            <th>Phone</th>
                            <th>Outstanding</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creditCustomers.length > 0 ? creditCustomers.map(cust => (
                            <tr key={cust.id}>
                              <td><strong>{cust.name}</strong></td>
                              <td>{cust.phone || '-'}</td>
                              <td><span className={`badge ${Number(cust.outstanding) > 0 ? 'badge-danger' : 'badge-success'}`}>₹{Number(cust.outstanding).toFixed(2)}</span></td>
                              <td>
                                {selectedCreditCustomer?.id === cust.id ? (
                                  <button className="btn btn-secondary btn-small" onClick={() => setSelectedCreditCustomer(null)}>Close Ledger</button>
                                ) : (
                                  <button className="btn btn-primary btn-small" onClick={() => { setSelectedCreditCustomer(cust); fetchCreditLedger(cust.id); }}>View Ledger</button>
                                )}
                                {Number(cust.outstanding) > 0 && (
                                  <button className="btn btn-success btn-small" style={{ marginLeft: '8px' }} onClick={() => {
                                    const amt = prompt(`Settle how much for ${cust.name}? Outstanding: ₹${Number(cust.outstanding).toFixed(2)}`);
                                    if (amt && parseFloat(amt) > 0) {
                                      fetch(`${API_BASE}/credits/settle`, {
                                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ customer_id: cust.id, amount: parseFloat(amt), payment_mode: 'Cash', notes: 'Manual settlement' })
                                      }).then(() => { showToast('Settlement recorded', 'success'); fetchCreditCustomers(); }).catch(() => showToast('Settlement failed', 'error'));
                                    }
                                  }}>Settle</button>
                                )}
                              </td>
                            </tr>
                          )) : (
                            <tr><td colSpan="4" className="empty-state">No credit transactions found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {selectedCreditCustomer && (
                      <div className="panel-card mt-4">
                        <div className="panel-card-header">
                          <h3>Ledger — {selectedCreditCustomer.name}</h3>
                        </div>
                        <div className="table-container">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {creditLedger.map((entry, idx) => (
                                <tr key={idx}>
                                  <td style={{ fontSize: '0.85rem' }}>{entry.created_at}</td>
                                  <td><span className={`badge ${entry.type === 'Credit' ? 'badge-danger' : 'badge-success'}`}>{entry.type}</span></td>
                                  <td>₹{Number(entry.amount).toFixed(2)}</td>
                                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{entry.notes || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'crm' && (
            <CrmNotifications userRole={user?.role} />
          )}
          
          {activeTab === 'wallet' && (
            <WalletManagement userRole={user?.role} />
          )}
        </div>
      
</main>

      {/* Add Holiday Modal */}
      {holidayModal.show && (
        <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) setHolidayModal({ show: false, name: '', date: '', description: '' }); }}>
          <div className="modal-card" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>📅 Add Holiday</h3>
              <button className="btn-close" onClick={() => setHolidayModal({ show: false, name: '', date: '', description: '' })}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Holiday Name <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Diwali, Christmas, Republic Day"
                  value={holidayModal.name}
                  onChange={e => setHolidayModal(prev => ({ ...prev, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Date <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
                <input
                  type="date"
                  className="form-input"
                  value={holidayModal.date}
                  onChange={e => setHolidayModal(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>(optional)</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Short note about this holiday"
                  value={holidayModal.description}
                  onChange={e => setHolidayModal(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 24px', borderTop: '1px solid var(--border-light)' }}>
              <button className="btn btn-secondary" onClick={() => setHolidayModal({ show: false, name: '', date: '', description: '' })}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (!holidayModal.name.trim() || !holidayModal.date) {
                    showToast('Holiday name and date are required.', 'error');
                    return;
                  }
                  try {
                    const res = await fetch(`${API_BASE}/holidays`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: holidayModal.name.trim(), holiday_date: holidayModal.date, description: holidayModal.description || '' })
                    });
                    if (res.ok) {
                      showToast('Holiday added successfully!', 'success');
                      setHolidayModal({ show: false, name: '', date: '', description: '' });
                      fetchHolidays();
                    } else {
                      const err = await res.json();
                      showToast(err.error || 'Failed to add holiday', 'error');
                    }
                  } catch (err) {
                    showToast('Network error adding holiday', 'error');
                  }
                }}
              >
                Save Holiday
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelModal.show && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>{cancelModal.step === 1 ? '🔒 Manager PIN Required' : '⚠️ Cancel Order & Refund'}</h3>
              <button className="btn-close" onClick={() => setCancelModal({ show: false, orderId: null, tokenNumber: null, pin: '', reason: '', step: 1 })}>×</button>
            </div>
            <div className="modal-body">
              {cancelModal.step === 1 ? (
                <>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>
                    Canceling order #{cancelModal.tokenNumber} requires managerial override.
                  </p>
                  <div className="form-group">
                    <label>Enter Manager PIN</label>
                    <input type="password" autoFocus placeholder="****" value={cancelModal.pin} onChange={e => setCancelModal({ ...cancelModal, pin: e.target.value })} onKeyDown={(e) => {
                      if(e.key === 'Enter') {
                        const enteredPin = cancelModal.pin.trim();
                        if (enteredPin === '1234' || enteredPin === '0000') {
                          setCancelModal({ ...cancelModal, step: 2 });
                        } else {
                          showToast('Invalid Manager PIN', 'error');
                        }
                      }
                    }} style={{ fontSize: '24px', letterSpacing: '5px', textAlign: 'center' }} />
                  </div>
                  <div className="form-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button className="btn btn-outline-primary" onClick={() => setCancelModal({ show: false, orderId: null, tokenNumber: null, pin: '', reason: '', step: 1 })}>Abort</button>
                    <button className="btn btn-primary" onClick={() => {
                      const enteredPin = cancelModal.pin.trim();
                      if (enteredPin === '1234' || enteredPin === '0000') {
                        setCancelModal({ ...cancelModal, step: 2 });
                      } else {
                        showToast('Invalid Manager PIN', 'error');
                      }
                    }}>Verify PIN</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="alert alert-warning" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>
                    <strong>Refund Required:</strong> Please ensure the cash drawer is updated or the digital refund is initiated via the POS terminal.
                  </div>
                  <div className="form-group">
                    <label>Reason for Cancellation *</label>
                    <select value={cancelModal.reason} onChange={e => setCancelModal({ ...cancelModal, reason: e.target.value })} style={{ width: '100%', marginBottom: '15px' }}>
                      <option value="">-- Select Reason --</option>
                      <option value="Customer changed mind">Customer changed mind</option>
                      <option value="Item out of stock">Item out of stock</option>
                      <option value="Long wait time">Long wait time</option>
                      <option value="Entered by mistake">Entered by mistake</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button className="btn btn-outline-primary" onClick={() => setCancelModal({ show: false, orderId: null, tokenNumber: null, pin: '', reason: '', step: 1 })}>Abort</button>
                    <button className="btn btn-danger" disabled={!cancelModal.reason} onClick={() => {
                      fetch(`${API_BASE}/orders/${cancelModal.orderId}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'Cancelled', cancellation_reason: cancelModal.reason })
                      }).then(() => {
                        showToast('Order Cancelled and Stock Reversed', 'success');
                        setCancelModal({ show: false, orderId: null, tokenNumber: null, pin: '', reason: '', step: 1 });
                        if (activeTab === 'kds') fetchKdsOrders();
                        if (activeTab === 'orders') fetchPastOrders();
                      }).catch(err => {
                        showToast('Failed to cancel order', 'error');
                      });
                    }}>Confirm Cancellation</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
           MODAL 1: ADD / EDIT MENU ITEM
           ========================================== */}
      {menuItemModal.show && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{menuItemModal.mode === 'edit' ? 'Edit Menu Item' : 'Add New Menu Item'}</h3>
              <button className="close-btn" onClick={() => setMenuItemModal({ show: false, mode: 'add', data: null })}>&times;</button>
            </div>
            <form onSubmit={handleSaveMenuItem}>
              <div className="form-group">
                <label>Item Name *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Paneer Tikka Dosa"
                  value={formMenu.name}
                  onChange={(e) => setFormMenu(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <div className="form-group col">
                  <label>Category *</label>
                  <select 
                    value={formMenu.category}
                    onChange={(e) => setFormMenu(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Combos">Combos</option>
                    <option value="Specials">Specials</option>
                  </select>
                </div>
                <div className="form-group col">
                  <label>Base Price (₹) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    required 
                    placeholder="e.g. 150.00"
                    value={formMenu.price}
                    onChange={(e) => setFormMenu(prev => ({ ...prev, price: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group col">
                  <label>GST Rate (%)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formMenu.gst_rate}
                    onChange={(e) => setFormMenu(prev => ({ ...prev, gst_rate: e.target.value }))}
                  />
                </div>
                <div className="form-group col">
                  <label>Image URL</label>
                  <input 
                    type="url" 
                    placeholder="e.g. https://images.unsplash.com/..."
                    value={formMenu.image_url}
                    onChange={(e) => setFormMenu(prev => ({ ...prev, image_url: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Item Description</label>
                <textarea 
                  rows="3" 
                  placeholder="Portion size and details..."
                  value={formMenu.description}
                  onChange={(e) => setFormMenu(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {/* A1 & A2: Special & Time-Based Fields */}
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                  <input 
                    type="checkbox" 
                    id="is_special_toggle"
                    checked={formMenu.is_special}
                    onChange={(e) => setFormMenu(prev => ({ ...prev, is_special: e.target.checked }))}
                  />
                  <label htmlFor="is_special_toggle" style={{ margin: 0, fontWeight: 'bold', color: 'var(--accent-primary)' }}>⭐ Mark as Daily Special</label>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                  <input 
                    type="checkbox" 
                    id="mess_eligible_toggle"
                    checked={formMenu.mess_eligible}
                    onChange={(e) => setFormMenu(prev => ({ ...prev, mess_eligible: e.target.checked }))}
                  />
                  <label htmlFor="mess_eligible_toggle" style={{ margin: 0, fontWeight: 'bold', color: 'var(--accent-success)' }}>🍽️ Mess Plan Eligible</label>
                </div>
              </div>

              {formMenu.is_special && (
                <div className="form-group">
                  <label>Special Offer Price (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="e.g. 99.00"
                    value={formMenu.special_price}
                    onChange={(e) => setFormMenu(prev => ({ ...prev, special_price: e.target.value }))}
                  />
                </div>
              )}

              <div className="form-row mt-3">
                <div className="form-group col">
                  <label>Available From (Optional)</label>
                  <input 
                    type="time" 
                    value={formMenu.available_from}
                    onChange={(e) => setFormMenu(prev => ({ ...prev, available_from: e.target.value }))}
                  />
                </div>
                <div className="form-group col">
                  <label>Available Until (Optional)</label>
                  <input 
                    type="time" 
                    value={formMenu.available_until}
                    onChange={(e) => setFormMenu(prev => ({ ...prev, available_until: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-primary" onClick={() => setMenuItemModal({ show: false, mode: 'add', data: null })}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Menu Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2 (Add Ingredient) removed — Purchase Entry handles new ingredient creation */}

      {/* ==========================================
           MODAL 3: QUICK RESTOCK & AUDIT TRANSACTION
           ========================================== */}
      {stockActionModal.show && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Stock Ledger Transaction</h3>
              <button className="close-btn" onClick={() => setStockActionModal({ show: false })}>&times;</button>
            </div>
            <form onSubmit={handleSaveStockAction}>
              <div className="form-group">
                <label>Select Raw Material *</label>
                <select 
                  required={!formStockAction._isNewMaterial}
                  value={formStockAction._isNewMaterial ? '__NEW__' : formStockAction.material_id}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setFormStockAction(prev => ({ ...prev, material_id: '', _isNewMaterial: true, _newName: '', _newUnit: 'kg', _newMinStock: '0' }));
                    } else {
                      setFormStockAction(prev => ({ ...prev, material_id: e.target.value, _isNewMaterial: false }));
                    }
                  }}
                >
                  <option value="">-- Choose Ingredient --</option>
                  {materials.map((m, idx) => (
                    <option value={m.id} key={idx}>{m.name} ({m.unit})</option>
                  ))}
                  <option value="__NEW__" style={{ fontWeight: 'bold' }}>＋ Add New Material</option>
                </select>
              </div>
              {formStockAction._isNewMaterial && (
                <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--accent-green)', borderRadius: '8px', padding: '16px', marginBottom: '12px', animation: 'fadeIn 0.2s' }}>
                  <div style={{ color: 'var(--accent-green)', fontWeight: 600, fontSize: '13px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>＋</span> Quick-Add New Raw Material
                  </div>
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label>Material Name *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Amul Butter, Basmati Rice, Olive Oil"
                      value={formStockAction._newName}
                      onChange={(e) => setFormStockAction(prev => ({ ...prev, _newName: e.target.value }))}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group col">
                      <label>Unit of Measure *</label>
                      <select 
                        value={formStockAction._newUnit}
                        onChange={(e) => setFormStockAction(prev => ({ ...prev, _newUnit: e.target.value }))}
                      >
                        <option value="kg">kg</option>
                        <option value="litre">litre</option>
                        <option value="piece">piece</option>
                        <option value="packet">packet</option>
                        <option value="gram">gram</option>
                        <option value="ml">ml</option>
                        <option value="dozen">dozen</option>
                        <option value="box">box</option>
                      </select>
                    </div>
                    <div className="form-group col">
                      <label>Min Stock Alert Level</label>
                      <input 
                        type="number" 
                        step="0.001" 
                        min="0" 
                        placeholder="e.g. 5"
                        value={formStockAction._newMinStock}
                        onChange={(e) => setFormStockAction(prev => ({ ...prev, _newMinStock: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="form-row">
                <div className="form-group col">
                  <label>Transaction Quantity *</label>
                  <input 
                    type="number" 
                    step="0.001" 
                    min="0.001" 
                    required 
                    placeholder="Quantity"
                    value={formStockAction.change_qty}
                    onChange={(e) => setFormStockAction(prev => ({ ...prev, change_qty: e.target.value }))}
                  />
                </div>
                <div className="form-group col">
                  <label>Transaction Type *</label>
                  <select 
                    value={formStockAction.log_type}
                    onChange={(e) => setFormStockAction(prev => ({ ...prev, log_type: e.target.value }))}
                  >
                    <option value="Purchase">Purchase (Restock - Add)</option>
                    <option value="Wastage">Wastage (Spoiled/Discarded - Reduce)</option>
                    <option value="Adjustment-Add">Adjustment (Add Stock)</option>
                    <option value="Adjustment-Reduce">Adjustment (Reduce Stock)</option>
                  </select>
                </div>
              </div>
              {formStockAction.log_type === 'Purchase' && (
                <div className="form-group" style={{ animation: 'fadeIn 0.2s' }}>
                  <label>Unit Cost (₹ per unit)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    placeholder="e.g. 180.00 per litre"
                    value={formStockAction.cost_per_unit}
                    onChange={(e) => setFormStockAction(prev => ({ ...prev, cost_per_unit: e.target.value }))}
                  />
                  {formStockAction.cost_per_unit && formStockAction.change_qty && (
                    <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      Line Total: ₹{(parseFloat(formStockAction.cost_per_unit) * parseFloat(formStockAction.change_qty)).toFixed(2)}
                    </small>
                  )}
                </div>
              )}
              {formStockAction.log_type === 'Wastage' && (
                <div className="form-group" style={{ animation: 'fadeIn 0.2s' }}>
                  <label>Staff Responsible for Wastage *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Enter staff member's name"
                    value={formStockAction.responsible_person}
                    onChange={(e) => setFormStockAction(prev => ({ ...prev, responsible_person: e.target.value }))}
                  />
                </div>
              )}
              <div className="form-group">
                <label>Remarks / Reason</label>
                <input 
                  type="text" 
                  placeholder="e.g. Weekly vendor restocking, spilled milk batch (Optional)"
                  value={formStockAction.reason}
                  onChange={(e) => setFormStockAction(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-primary" onClick={() => setStockActionModal({ show: false })}>Cancel</button>
                <button type="submit" className="btn btn-primary">Confirm Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B4: Supplier Modal */}
      {supplierModal.show && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{supplierModal.mode === 'edit' ? 'Edit Supplier' : 'Add New Supplier'}</h3>
              <button className="close-btn" onClick={() => setSupplierModal({ show: false, mode: 'add', data: null })}>&times;</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const method = supplierModal.mode === 'edit' ? 'PUT' : 'POST';
                const url = supplierModal.mode === 'edit' ? `${API_BASE}/suppliers/${supplierModal.data.id}` : `${API_BASE}/suppliers`;
                const res = await fetch(url, {
                  method, headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(formSupplier)
                });
                if (!res.ok) throw new Error('Failed to save supplier');
                showToast(`Supplier ${supplierModal.mode === 'edit' ? 'updated' : 'added'}`, 'success');
                fetchSuppliers();
                setSupplierModal({ show: false, mode: 'add', data: null });
              } catch(err) {
                showToast(err.message, 'error');
              }
            }}>
              <div className="form-group">
                <label>Supplier Name *</label>
                <input type="text" required value={formSupplier.name} onChange={(e) => setFormSupplier({...formSupplier, name: e.target.value})} />
              </div>
              <div className="form-row">
                <div className="form-group col"><label>Contact Person</label><input type="text" value={formSupplier.contact_person} onChange={(e) => setFormSupplier({...formSupplier, contact_person: e.target.value})} /></div>
                <div className="form-group col"><label>Phone</label><input type="text" value={formSupplier.phone} onChange={(e) => setFormSupplier({...formSupplier, phone: e.target.value})} /></div>
              </div>
              <div className="form-row">
                <div className="form-group col"><label>Email</label><input type="email" value={formSupplier.email} onChange={(e) => setFormSupplier({...formSupplier, email: e.target.value})} /></div>
                <div className="form-group col"><label>Payment Terms</label><input type="text" placeholder="e.g. Net 30" value={formSupplier.payment_terms} onChange={(e) => setFormSupplier({...formSupplier, payment_terms: e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Address</label><input type="text" value={formSupplier.address} onChange={(e) => setFormSupplier({...formSupplier, address: e.target.value})} /></div>
              <div className="form-group">
                <label>Items Supplied</label>
                
                {/* Chip container for multiple items */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {formSupplier.items_supplied ? formSupplier.items_supplied.split(',').map(s => s.trim()).filter(Boolean).map((item, tagIdx) => (
                    <span key={tagIdx} className="supplier-item-chip" style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-light)',
                      color: 'var(--text-light)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: '500',
                      gap: '6px'
                    }}>
                      {item}
                      <button 
                        type="button" 
                        onClick={() => {
                          const current = formSupplier.items_supplied ? formSupplier.items_supplied.split(',').map(s => s.trim()).filter(Boolean) : [];
                          const updated = current.filter(x => x !== item).join(', ');
                          setFormSupplier(prev => ({ ...prev, items_supplied: updated }));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '14px',
                          lineHeight: 1,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        onMouseOver={(e) => e.target.style.color = '#ef4444'}
                        onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}
                      >
                        &times;
                      </button>
                    </span>
                  )) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '4px' }}>No items linked yet. Add below:</span>
                  )}
                </div>

                {/* Autocomplete Input with existing raw materials suggestions */}
                <div className="autocomplete-wrapper">
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Type material name (e.g. Rice) and press Enter or Add"
                      value={tempSupplierItem}
                      onChange={(e) => {
                        setTempSupplierItem(e.target.value);
                        setShowSupplierItemSuggestions(true);
                      }}
                      onFocus={() => setShowSupplierItemSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSupplierItemSuggestions(false), 200)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (tempSupplierItem.trim()) {
                            const current = formSupplier.items_supplied ? formSupplier.items_supplied.split(',').map(s => s.trim()).filter(Boolean) : [];
                            const newItem = tempSupplierItem.trim();
                            if (!current.includes(newItem)) {
                              const updated = [...current, newItem].join(', ');
                              setFormSupplier(prev => ({ ...prev, items_supplied: updated }));
                            }
                            setTempSupplierItem('');
                            setShowSupplierItemSuggestions(false);
                          }
                        }
                      }}
                    />
                    <button 
                      type="button"
                      className="btn btn-outline-primary btn-small"
                      onClick={() => {
                        if (tempSupplierItem.trim()) {
                          const current = formSupplier.items_supplied ? formSupplier.items_supplied.split(',').map(s => s.trim()).filter(Boolean) : [];
                          const newItem = tempSupplierItem.trim();
                          if (!current.includes(newItem)) {
                            const updated = [...current, newItem].join(', ');
                            setFormSupplier(prev => ({ ...prev, items_supplied: updated }));
                          }
                          setTempSupplierItem('');
                          setShowSupplierItemSuggestions(false);
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>

                  {/* Suggestions List */}
                  {showSupplierItemSuggestions && tempSupplierItem.trim() && (
                    <ul className="suggestions-list" style={{ width: '100%' }}>
                      {materials.filter(m => 
                        m.name.toLowerCase().includes(tempSupplierItem.toLowerCase()) && 
                        !(formSupplier.items_supplied ? formSupplier.items_supplied.split(',').map(s => s.trim()).filter(Boolean) : []).includes(m.name)
                      ).slice(0, 5).map((m, idx) => (
                        <li 
                          key={idx} 
                          className="suggestion-item"
                          onClick={() => {
                            const current = formSupplier.items_supplied ? formSupplier.items_supplied.split(',').map(s => s.trim()).filter(Boolean) : [];
                            if (!current.includes(m.name)) {
                              const updated = [...current, m.name].join(', ');
                              setFormSupplier(prev => ({ ...prev, items_supplied: updated }));
                            }
                            setTempSupplierItem('');
                            setShowSupplierItemSuggestions(false);
                          }}
                        >
                          <span className="suggestion-name">{m.name}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>({m.unit})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-primary" onClick={() => setSupplierModal({ show: false, mode: 'add', data: null })}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
           MODAL 3B: BULK PURCHASE INVOICE ENTRY
           ========================================== */}
      {purchaseEntryModal.show && (
        <div className="modal-overlay active">
          <div className="modal-card modal-card-large">
            <div className="modal-header">
              <h3>Bulk Purchase Invoice Entry</h3>
              <button className="close-btn" onClick={() => setPurchaseEntryModal({ show: false })}>&times;</button>
            </div>
            <form onSubmit={handleSavePurchaseEntry}>
              <div className="form-row">
                <div className="form-group col" style={{ flex: '1.5' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Supplier Name *</label>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline-primary" 
                      style={{ padding: '2px 8px', fontSize: '12px' }}
                      onClick={() => setIsNewSupplierInPurchase(!isNewSupplierInPurchase)}
                    >
                      {isNewSupplierInPurchase ? 'Select Existing Supplier' : '+ New Supplier'}
                    </button>
                  </div>
                  
                  {!isNewSupplierInPurchase ? (
                    <select
                      required
                      value={formPurchaseEntry.supplier_id}
                      onChange={(e) => setFormPurchaseEntry(prev => ({ ...prev, supplier_id: e.target.value }))}
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ border: '1px dashed var(--border-light)', padding: '10px', borderRadius: '6px', marginTop: '5px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                      <input 
                        type="text" 
                        required 
                        placeholder="New Supplier Name *"
                        value={formPurchaseSupplierDetails.name}
                        onChange={(e) => setFormPurchaseSupplierDetails(prev => ({ ...prev, name: e.target.value }))}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', marginBottom: '8px' }}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input type="text" placeholder="Phone" value={formPurchaseSupplierDetails.contact_phone} onChange={(e) => setFormPurchaseSupplierDetails(prev => ({ ...prev, contact_phone: e.target.value }))} style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }} />
                        <input type="email" placeholder="Email" value={formPurchaseSupplierDetails.email} onChange={(e) => setFormPurchaseSupplierDetails(prev => ({ ...prev, email: e.target.value }))} style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }} />
                      </div>
                      <input type="text" placeholder="Payment Terms (e.g. Net 30, Cash)" value={formPurchaseSupplierDetails.payment_terms} onChange={(e) => setFormPurchaseSupplierDetails(prev => ({ ...prev, payment_terms: e.target.value }))} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }} />
                    </div>
                  )}
                </div>
                <div className="form-group col" style={{ flex: '1' }}>
                  <label>Invoice Number *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. INV-2026-88"
                    value={formPurchaseEntry.invoice_number}
                    onChange={(e) => setFormPurchaseEntry(prev => ({ ...prev, invoice_number: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-light)' }}>
                  Invoice Line Items *
                </label>
                <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '10px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-light)', textAlign: 'left' }}>
                        <th style={{ padding: '8px', fontSize: '12px' }}>Ingredient Name *</th>
                        <th style={{ padding: '8px', fontSize: '12px' }}>Qty *</th>
                        <th style={{ padding: '8px', fontSize: '12px' }}>Unit *</th>
                        <th style={{ padding: '8px', fontSize: '12px' }}>Unit Cost (₹)</th>
                        <th style={{ padding: '8px', fontSize: '12px' }}>Line Total</th>
                        <th style={{ padding: '8px', fontSize: '12px' }}>Min Stock Alert</th>
                        <th style={{ padding: '8px', fontSize: '12px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formPurchaseEntry.items.map((item, index) => {
                        const searchTerm = item.material_name.toLowerCase();
                        const suggestions = searchTerm
                          ? materials.filter(m => m.name.toLowerCase().includes(searchTerm))
                          : [];

                        return (
                          <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '8px', verticalAlign: 'top', position: 'relative' }}>
                              <div className="autocomplete-wrapper">
                                <input 
                                  type="text" 
                                  required 
                                  placeholder="Type name (e.g. Butter)..."
                                  style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                                  value={item.material_name}
                                  onChange={(e) => handleUpdatePurchaseItemRow(index, 'material_name', e.target.value)}
                                  onFocus={() => {
                                    if (item.material_name.trim().length > 0) {
                                      handleUpdatePurchaseItemRow(index, 'showSuggestions', true);
                                    }
                                  }}
                                  onBlur={() => {
                                    setTimeout(() => {
                                      handleUpdatePurchaseItemRow(index, 'showSuggestions', false);
                                    }, 200);
                                  }}
                                />
                                
                                {item.showSuggestions && suggestions.length > 0 && (
                                  <ul className="suggestions-list" style={{ width: '100%' }}>
                                    {suggestions.map((s, idx) => (
                                      <li 
                                        key={idx} 
                                        className="suggestion-item"
                                        onMouseDown={() => handleSelectMaterialSuggestion(index, s)}
                                      >
                                        <span className="suggestion-name">{s.name}</span>
                                        <span className="suggestion-unit">{s.unit}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              <div style={{ marginTop: '4px' }}>
                                {item.material_id ? (
                                  <span className="badge badge-item-status badge-item-existing">Existing Ledger Item</span>
                                ) : item.material_name.trim() ? (
                                  <span className="badge badge-item-status badge-item-new">New Master Item</span>
                                ) : null}
                              </div>
                            </td>
                            <td style={{ padding: '8px', verticalAlign: 'top' }}>
                              <input 
                                type="number" 
                                step="0.001" 
                                min="0.001" 
                                required 
                                placeholder="Qty"
                                style={{ width: '80px', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                                value={item.change_qty}
                                onChange={(e) => handleUpdatePurchaseItemRow(index, 'change_qty', e.target.value)}
                              />
                            </td>
                            <td style={{ padding: '8px', verticalAlign: 'top' }}>
                              <select 
                                disabled={!!item.material_id}
                                style={{ width: '90px', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', opacity: item.material_id ? 0.6 : 1 }}
                                value={item.unit}
                                onChange={(e) => handleUpdatePurchaseItemRow(index, 'unit', e.target.value)}
                              >
                                <option value="kg">kg</option>
                                <option value="litre">litre</option>
                                <option value="piece">piece</option>
                                <option value="packet">packet</option>
                                <option value="box">box</option>
                              </select>
                            </td>
                            <td style={{ padding: '8px', verticalAlign: 'top' }}>
                              <input 
                                type="number" 
                                step="0.01" 
                                min="0" 
                                placeholder="₹ per unit"
                                style={{ width: '100px', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
                                value={item.cost_per_unit}
                                onChange={(e) => handleUpdatePurchaseItemRow(index, 'cost_per_unit', e.target.value)}
                              />
                            </td>
                            <td style={{ padding: '8px', verticalAlign: 'top', fontWeight: 600, color: 'var(--accent-success)', whiteSpace: 'nowrap' }}>
                              {item.cost_per_unit && item.change_qty ? `₹${(parseFloat(item.cost_per_unit) * parseFloat(item.change_qty)).toFixed(2)}` : '—'}
                            </td>
                            <td style={{ padding: '8px', verticalAlign: 'top' }}>
                              <input 
                                type="number" 
                                step="0.001" 
                                min="0" 
                                disabled={!!item.material_id}
                                placeholder="Min limit"
                                style={{ width: '90px', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-app)', color: 'var(--text-main)', opacity: item.material_id ? 0.6 : 1 }}
                                value={item.min_stock}
                                onChange={(e) => handleUpdatePurchaseItemRow(index, 'min_stock', e.target.value)}
                              />
                            </td>
                            <td style={{ padding: '8px', verticalAlign: 'top', textAlign: 'center' }}>
                              <button 
                                type="button" 
                                className="btn btn-outline-danger" 
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                onClick={() => handleRemovePurchaseItemRow(index)}
                                disabled={formPurchaseEntry.items.length === 1}
                              >
                                &times;
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <button 
                  type="button" 
                  className="btn btn-outline-primary" 
                  style={{ marginTop: '10px', fontSize: '13px', padding: '6px 12px' }}
                  onClick={handleAddPurchaseItemRow}
                >
                  + Add Invoice Line
                </button>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '15px', marginTop: '10px' }}>
                <button type="button" className="btn btn-outline-primary" onClick={() => setPurchaseEntryModal({ show: false })}>Cancel</button>
                <button type="submit" className="btn btn-success">Confirm Purchase & Update Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
           MODAL 4: SIMULATED THERMAL PRINTER RECEIPT VIEW
           ========================================== */}
      {printerModal.show && (
        <div className="modal-overlay active">
          <div className="printer-terminal-card">
            <div className="printer-card-header">
              <div className="printer-title">
                <span className="printer-status-light blinking"></span>
                <span>Virtual Thermal Printer Output (ESC/POS)</span>
              </div>
              <button className="close-printer-btn" onClick={() => setPrinterModal({ show: false, bill: '', kot: '' })}>Close Terminal &times;</button>
            </div>
            
            <div className="printer-paper-viewport">
              <div className="receipt-paper animate-print">
                {printerModal.bill}
              </div>
            </div>

            <div className="printer-actions">
              <button className="btn btn-success" onClick={handleLocalPrintReceipt}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{width: 16, height: 16, marginRight: 6}}>
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Send to Local Printer
              </button>
              <button className="btn btn-outline-primary" onClick={() => setPrinterModal({ show: false, bill: '', kot: '' })}>
                Done (New Order)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
           MODAL 5: HOLD ORDER REFERENCE DIALOG
           ========================================== */}
      {showHoldModal && (
        <div className="modal-overlay active" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Hold Order Session</h3>
              <button className="close-btn" onClick={() => { setShowHoldModal(false); setHoldName(''); }}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '15px' }}>
              <div className="form-group">
                <label>Table Number / Customer Name *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Table 5 / Alice" 
                  value={holdName}
                  onChange={(e) => setHoldName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button className="btn btn-secondary-outline" onClick={() => { setShowHoldModal(false); setHoldName(''); }}>Cancel</button>
              <button className="btn btn-warning" onClick={handleHoldOrder} disabled={!holdName.trim()}>
                Confirm Hold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
           MODAL 6: RECALL HELD ORDERS LIST
           ========================================== */}
      {showHeldModal && (
        <div className="modal-overlay active" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '650px', width: '90%' }}>
            <div className="modal-header">
              <h3>Held Orders Registry</h3>
              <button className="close-btn" onClick={() => setShowHeldModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {heldOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '10px', opacity: 0.5 }}>
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <p style={{ margin: 0, fontSize: '15px' }}>No orders currently on hold.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {heldOrders.map((ho) => {
                    const itemCount = ho.cart_data.reduce((sum, item) => sum + item.quantity, 0);
                    const totalVal = ho.cart_data.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    return (
                      <div key={ho.id} className="roster-row-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-light)' }}>
                            {ho.hold_name}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Held on: {new Date(ho.created_at).toLocaleTimeString()} | Items: {itemCount} | Total: ₹{totalVal.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '4px', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ho.cart_data.map(i => `${i.name} x${i.quantity}`).join(', ')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-secondary-outline btn-xs" 
                            style={{ borderColor: '#ef4444', color: '#ef4444' }}
                            onClick={() => handleDiscardHeldOrder(ho.id, ho.hold_name)}
                          >
                            Discard
                          </button>
                          <button 
                            className="btn btn-primary btn-xs"
                            onClick={() => handleRecallOrder(ho)}
                          >
                            Recall Cart
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button className="btn btn-secondary-outline" onClick={() => setShowHeldModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
           MODAL 7: SPLIT PAYMENT CONSOLE
           ========================================== */}
      {showSplitModal && (
        <div className="modal-overlay active" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '550px', width: '90%' }}>
            <div className="modal-header">
              <h3>Split Billing Desk</h3>
              <button className="close-btn" onClick={() => { setShowSplitModal(false); setPosPaymentMode('Cash'); }}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Net Payable Total:</span>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                    ₹{Math.max(0, cartSubtotal - discountAmount).toFixed(2)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Assigned Splits Total:</span>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
                    ₹{splitPayments.reduce((sum, sp) => sum + parseFloat(sp.amount || 0), 0).toFixed(2)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Split Count</label>
                  <select 
                    className="input-field" 
                    value={splitCount} 
                    onChange={(e) => {
                      const count = parseInt(e.target.value);
                      setSplitCount(count);
                      setSplitType('Equal');
                      
                      const total = Math.max(0, cartSubtotal - discountAmount);
                      const equalShare = (total / count).toFixed(2);
                      
                      const newSplits = [];
                      for (let i = 0; i < count; i++) {
                        const modes = ['Cash', 'UPI', 'Card', 'Meal Card'];
                        newSplits.push({
                          mode: modes[i % modes.length],
                          amount: i === count - 1 ? (total - (equalShare * (count - 1))).toFixed(2) : equalShare
                        });
                      }
                      setSplitPayments(newSplits);
                    }}
                  >
                    {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} Customers</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Split Mode</label>
                  <select 
                    className="input-field" 
                    value={splitType} 
                    onChange={(e) => {
                      const type = e.target.value;
                      setSplitType(type);
                      if (type === 'Equal') {
                        const total = Math.max(0, cartSubtotal - discountAmount);
                        const equalShare = (total / splitCount).toFixed(2);
                        const newSplits = splitPayments.map((sp, i) => ({
                          ...sp,
                          amount: i === splitCount - 1 ? (total - (equalShare * (splitCount - 1))).toFixed(2) : equalShare
                        }));
                        setSplitPayments(newSplits);
                      }
                    }}
                  >
                    <option value="Equal">Equal Amounts</option>
                    <option value="Custom">Custom Amounts</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '5px' }}>
                {splitPayments.map((sp, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', width: '70px', color: 'var(--text-light)' }}>
                      Customer {idx + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <select 
                        className="input-field"
                        value={sp.mode}
                        onChange={(e) => {
                          const updated = [...splitPayments];
                          updated[idx].mode = e.target.value;
                          setSplitPayments(updated);
                        }}
                        style={{ padding: '4px 8px', height: '32px', fontSize: '13px' }}
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI Scan</option>
                        <option value="Card">Card Swipe</option>
                        <option value="Meal Card">Meal Card</option>
                      </select>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>₹</span>
                      <input 
                        type="number"
                        step="0.01"
                        min="0"
                        className="input-field"
                        value={sp.amount}
                        disabled={splitType === 'Equal'}
                        onChange={(e) => {
                          const updated = [...splitPayments];
                          updated[idx].amount = e.target.value;
                          setSplitPayments(updated);
                        }}
                        style={{ padding: '4px 8px', height: '32px', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Balance Validation Message */}
              {(() => {
                const totalPayable = Math.max(0, cartSubtotal - discountAmount);
                const sumSplits = splitPayments.reduce((sum, sp) => sum + parseFloat(sp.amount || 0), 0);
                const diff = totalPayable - sumSplits;
                
                if (Math.abs(diff) > 0.01) {
                  return (
                    <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: '4px', fontSize: '12px', textAlign: 'center' }}>
                      ⚠️ Out of balance! Please assign remaining <strong>₹{diff.toFixed(2)}</strong>.
                    </div>
                  );
                } else {
                  return (
                    <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', borderRadius: '4px', fontSize: '12px', textAlign: 'center' }}>
                      ✅ Splits balanced successfully! Ready for checkout.
                    </div>
                  );
                }
              })()}
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button 
                className="btn btn-secondary-outline" 
                onClick={() => { setShowSplitModal(false); setPosPaymentMode('Cash'); }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleCheckoutPOS}
                disabled={isPosCheckoutLoading || !posCashierId || (() => {
                  const totalPayable = Math.max(0, cartSubtotal - discountAmount);
                  const sumSplits = splitPayments.reduce((sum, sp) => sum + parseFloat(sp.amount || 0), 0);
                  return Math.abs(sumSplits - totalPayable) > 0.01;
                })()}
                style={{ opacity: isPosCheckoutLoading ? 0.75 : 1 }}
              >
                {isPosCheckoutLoading ? 'Processing...' : 'Checkout Splits'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Drawer Modal */}
      {showCashDrawerModal && cashDrawer && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>💵 Cash Drawer Management</h3>
              <button className="btn-close" onClick={() => setShowCashDrawerModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '15px' }}>
                <span className={`badge ${cashDrawer.status === 'Open' ? 'badge-success' : 'badge-danger'}`}>
                  Status: {cashDrawer.status}
                </span>
                <p style={{ marginTop: '10px' }}>System Cash Expected: <strong>₹{Number(cashDrawer.system_cash).toFixed(2)}</strong></p>
              </div>

              {cashDrawer.status !== 'Open' ? (
                <div>
                  <h4>Open Drawer</h4>
                  <div className="form-group mt-3">
                    <label>Opening Cash (Float)</label>
                    <input type="number" id="drawer-open-cash" defaultValue="0" />
                  </div>
                  <div className="form-group mt-3">
                    <label>Notes</label>
                    <input type="text" id="drawer-open-notes" placeholder="e.g. Morning float from safe" />
                  </div>
                  <div className="form-actions mt-4">
                    <button className="btn btn-success" onClick={() => {
                      fetch(`${API_BASE}/cash-drawer/open`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ opening_cash: document.getElementById('drawer-open-cash').value, notes: document.getElementById('drawer-open-notes').value })
                      }).then(() => { showToast('Drawer Opened', 'success'); fetchCashDrawerStatus(); });
                    }}>Open Drawer</button>
                  </div>
                </div>
              ) : (
                <div>
                  <h4>Close Drawer (EOD)</h4>
                  <div className="form-group mt-3">
                    <label>Physical Cash Count</label>
                    <input type="number" id="drawer-close-cash" defaultValue={cashDrawer.system_cash} />
                  </div>
                  <div className="form-group mt-3">
                    <label>Notes</label>
                    <input type="text" id="drawer-close-notes" placeholder="e.g. Handover to Manager" />
                  </div>
                  <div className="form-actions mt-4">
                    <button className="btn btn-danger" onClick={() => {
                      fetch(`${API_BASE}/cash-drawer/close`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ closing_cash: document.getElementById('drawer-close-cash').value, notes: document.getElementById('drawer-close-notes').value })
                      }).then(() => { showToast('Drawer Closed', 'success'); fetchCashDrawerStatus(); });
                    }}>Close Drawer</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
           MODAL: COMBO BUILDER
           ========================================== */}
      {comboModal.show && (
        <div className="modal-overlay active" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '650px', maxHeight: '80vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3>🍱 Combo Builder — {comboModal.comboName}</h3>
              <button className="close-btn" onClick={() => setComboModal({ show: false, comboId: null, comboName: '', childItems: [] })}>&times;</button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '15px' }}>
                Define which menu items make up this combo. These child items will be linked for stock deduction when the combo is sold.
              </p>

              {/* Existing child items */}
              {comboModal.childItems.length > 0 && (
                <table className="data-table" style={{ marginBottom: '15px' }}>
                  <thead>
                    <tr>
                      <th>Child Item</th>
                      <th>Quantity</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comboModal.childItems.map((child, idx) => (
                      <tr key={idx}>
                        <td><strong>{child.child_name || items.find(i => i.id === child.child_item_id)?.name || `Item #${child.child_item_id}`}</strong></td>
                        <td>
                          <input 
                            type="number" min="1" 
                            value={child.quantity} 
                            onChange={(e) => {
                              const updated = [...comboModal.childItems];
                              updated[idx] = { ...updated[idx], quantity: parseInt(e.target.value) || 1 };
                              setComboModal(prev => ({ ...prev, childItems: updated }));
                            }}
                            style={{ width: '70px', padding: '4px 8px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-light)' }}
                          />
                        </td>
                        <td>
                          <button 
                            className="btn btn-danger-small"
                            onClick={() => {
                              const updated = comboModal.childItems.filter((_, i) => i !== idx);
                              setComboModal(prev => ({ ...prev, childItems: updated }));
                            }}
                          >Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Add new child item */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
                <select 
                  id="combo-add-child-select"
                  className="input-field"
                  style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }}
                >
                  <option value="">-- Select a menu item to add --</option>
                  {items.filter(i => i.id !== comboModal.comboId && !comboModal.childItems.some(c => c.child_item_id === i.id)).map(i => (
                    <option key={i.id} value={i.id}>{i.name} (₹{parseFloat(i.price).toFixed(2)}) — {i.category}</option>
                  ))}
                </select>
                <button 
                  className="btn btn-primary btn-small"
                  onClick={() => {
                    const sel = document.getElementById('combo-add-child-select');
                    const childId = parseInt(sel.value);
                    if (!childId) return;
                    const childItem = items.find(i => i.id === childId);
                    if (!childItem) return;
                    setComboModal(prev => ({
                      ...prev,
                      childItems: [...prev.childItems, { child_item_id: childId, child_name: childItem.name, quantity: 1 }]
                    }));
                    sel.value = '';
                  }}
                >+ Add</button>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="btn btn-outline-primary" onClick={() => setComboModal({ show: false, comboId: null, comboName: '', childItems: [] })}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveCombo}>Save Combo Items</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
           MODAL: BULK OPENING STOCK
           ========================================== */}
      {showBulkOpeningModal && (
        <div className="modal-overlay active" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '700px', maxHeight: '85vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3>📦 Bulk Opening Stock Entry</h3>
              <button className="close-btn" onClick={() => setShowBulkOpeningModal(false)}>&times;</button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '15px' }}>
                Set the initial opening stock quantities for all raw materials at the start of the day. Yesterday's closing is pre-filled as the default opening value.
              </p>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Unit</th>
                    <th>Yesterday Closing</th>
                    <th>Opening Qty (Today)</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkOpeningItems.map((item, idx) => (
                    <tr key={idx}>
                      <td><strong>{item.name}</strong></td>
                      <td><span className="badge badge-category">{item.unit}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{parseFloat(item.yesterday_closing).toFixed(3)}</td>
                      <td>
                        <input 
                          type="number" 
                          min="0" 
                          step="0.001"
                          value={item.opening_qty}
                          onChange={(e) => {
                            const updated = [...bulkOpeningItems];
                            updated[idx] = { ...updated[idx], opening_qty: parseFloat(e.target.value) || 0 };
                            setBulkOpeningItems(updated);
                          }}
                          style={{ width: '110px', padding: '5px 8px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-light)' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '15px' }}>
                <button className="btn btn-outline-primary" onClick={() => setShowBulkOpeningModal(false)}>Cancel</button>
                <button className="btn btn-success" onClick={handleSaveBulkOpening}>Save Opening Stock</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
           MODAL: CLOSING STOCK VARIANCE
           ========================================== */}
      {showBulkClosingModal && (
        <div className="modal-overlay active" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '750px', maxHeight: '85vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3>📋 Closing Stock Variance Entry</h3>
              <button className="close-btn" onClick={() => setShowBulkClosingModal(false)}>&times;</button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '15px' }}>
                Enter the actual physical count of each material. The system will calculate the variance (shrinkage/surplus) and adjust stock levels accordingly.
              </p>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Unit</th>
                    <th>System Stock</th>
                    <th>Physical Count</th>
                    <th>Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkClosingItems.map((item, idx) => {
                    const variance = (item.physical_qty - item.system_qty).toFixed(3);
                    const varColor = parseFloat(variance) < 0 ? '#ef4444' : parseFloat(variance) > 0 ? '#22c55e' : 'var(--text-muted)';
                    return (
                      <tr key={idx}>
                        <td><strong>{item.name}</strong></td>
                        <td><span className="badge badge-category">{item.unit}</span></td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{item.system_qty.toFixed(3)}</td>
                        <td>
                          <input 
                            type="number" 
                            min="0" 
                            step="0.001"
                            value={item.physical_qty}
                            onChange={(e) => {
                              const updated = [...bulkClosingItems];
                              const physQty = parseFloat(e.target.value) || 0;
                              updated[idx] = { ...updated[idx], physical_qty: physQty, variance: physQty - item.system_qty };
                              setBulkClosingItems(updated);
                            }}
                            style={{ width: '110px', padding: '5px 8px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-light)' }}
                          />
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: varColor }}>
                          {parseFloat(variance) > 0 ? '+' : ''}{variance} {item.unit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '15px' }}>
                <button className="btn btn-outline-primary" onClick={() => setShowBulkClosingModal(false)}>Cancel</button>
                <button className="btn btn-warning" onClick={handleSaveBulkClosing}>Save Closing Stock</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toaster Notification Toaster */}
      <div className={`toast-wrapper ${toast.show ? 'active' : ''} ${toast.type === 'error' ? 'error' : 'success'}`}>
        <span>{toast.message}</span>
      </div>

      {supplierHistoryModal.show && (
        <div className="modal-overlay active">
          <div className="modal-card modal-card-large">
            <div className="modal-header">
              <h3>Purchase History: {supplierHistoryModal.supplier?.name}</h3>
              <button className="close-btn" onClick={() => setSupplierHistoryModal({ show: false, supplier: null, history: [], loading: false })}>&times;</button>
            </div>
            <div style={{ padding: '20px' }}>
              {supplierHistoryModal.loading ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading history...</div>
              ) : supplierHistoryModal.history.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No purchase history found for this supplier.</div>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Material</th>
                        <th>Quantity</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierHistoryModal.history.map(record => (
                        <tr key={record.id}>
                          <td>{new Date(record.logged_at).toLocaleDateString()} {new Date(record.logged_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                          <td><strong>{record.material_name}</strong></td>
                          <td><span className="badge badge-success">+{parseFloat(record.change_qty).toFixed(2)} {record.unit}</span></td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{record.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
