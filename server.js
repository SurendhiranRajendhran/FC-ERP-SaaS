const { AsyncLocalStorage } = require('async_hooks');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_food_court_key_123';

const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
const os = require('os');
require('dotenv').config();
const crm = require('./crm-service');


// Helper: get LAN (Wi-Fi/Ethernet) IP address for QR code generation
function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Prefer Wi-Fi over VirtualBox/VMware adapters
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('192.168.56')) {
        return net.address;
      }
    }
  }
  // Fallback: any non-internal IPv4
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: Return server LAN IP for QR code generation
app.get('/api/server-info', (req, res) => {
  res.json({ lan_ip: getLanIp(), port: PORT });
});

// Database Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'erp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

crm.setPool(pool);

// ==========================================
// SAAS MULTI-TENANT QUERY ISOLATION WRAPPER
// ==========================================
const tenantStorage = new AsyncLocalStorage();
const tenantTables = [
  'vendors', 'items', 'orders', 'staff', 'raw_materials', 'shifts', 'shift_roster',
  'shift_swap_requests', 'leaves', 'leave_balances', 'attendance', 'payroll',
  'holidays', 'customers', 'customer_feedback', 'daily_reconciliation',
  'stock_logs', 'suppliers', 'vendor_settlements', 'broadcast_campaigns',
  'cash_drawer', 'notification_logs', 'vendor_common_expenses', 'overheads', 'central_settlements',
  'stock_transfers'
];

function getTableIdentifier(sql, tableName) {
  const regex = new RegExp('(?:from|join)\\s+' + tableName + '\\s+(?:as\\s+)?([a-zA-Z0-9_]+)\\b', 'i');
  const match = sql.match(regex);
  if (match) {
    const alias = match[1];
    const keywords = new Set(['on', 'left', 'right', 'join', 'inner', 'outer', 'where', 'order', 'group', 'limit', 'as', 'using']);
    if (!keywords.has(alias.toLowerCase())) {
      return alias;
    }
  }
  return tableName;
}

function rewriteQuery(sql, params, tenantId) {
  if (!tenantId) return { sql, params };
  
  const matchedTables = [];
  for (const table of tenantTables) {
    const tableRegex = new RegExp('\\b' + table + '\\b', 'i');
    const match = sql.match(tableRegex);
    if (match) {
      matchedTables.push({ name: table, index: match.index });
    }
  }

  if (matchedTables.length === 0) return { sql, params };

  matchedTables.sort((a, b) => a.index - b.index);
  const targetTable = matchedTables[0].name;

  if (/\btenant_id\b/i.test(sql)) return { sql, params };

  let rewrittenSql = sql;
  let rewrittenParams = params ? [...params] : [];
  const lowerSql = sql.toLowerCase();

  if (/^\s*(select|update|delete)\b/i.test(sql)) {
    if (/\bwhere\b/i.test(sql)) {
      const whereIdx = lowerSql.lastIndexOf('where');
      const sqlBeforeWhere = sql.slice(0, whereIdx);
      const paramsBeforeWhereCount = (sqlBeforeWhere.match(/\?/g) || []).length;
      
      const tableAlias = getTableIdentifier(sql, targetTable);
      rewrittenSql = sql.slice(0, whereIdx + 5) + ` ${tableAlias}.tenant_id = ? AND ` + sql.slice(whereIdx + 5);
      rewrittenParams.splice(paramsBeforeWhereCount, 0, tenantId);
    } else {
      let insertIdx = sql.length;
      const orderByIdx = lowerSql.lastIndexOf('order by');
      const groupByIdx = lowerSql.lastIndexOf('group by');
      const limitIdx = lowerSql.lastIndexOf('limit');
      
      const indices = [orderByIdx, groupByIdx, limitIdx].filter(idx => idx !== -1);
      if (indices.length > 0) {
        insertIdx = Math.min(...indices);
      }
      
      const tableAlias = getTableIdentifier(sql, targetTable);
      const countBeforeInsert = (sql.slice(0, insertIdx).match(/\\?/g) || []).length;
      
      rewrittenSql = sql.slice(0, insertIdx) + ` WHERE ${tableAlias}.tenant_id = ? ` + sql.slice(insertIdx);
      rewrittenParams.splice(countBeforeInsert, 0, tenantId);
    }
  } 
  else if (/^\s*insert\b/i.test(sql)) {
    if (/\bvalues\b/i.test(sql)) {
      const valuesIdx = lowerSql.indexOf('values');
      const colsPart = sql.slice(0, valuesIdx);
      const valuesPart = sql.slice(valuesIdx);
      
      const lastParenInCols = colsPart.lastIndexOf(')');
      if (lastParenInCols !== -1) {
        const newColsPart = colsPart.slice(0, lastParenInCols) + ', tenant_id' + colsPart.slice(lastParenInCols);
        
        const firstParenInValues = valuesPart.indexOf('(');
        const lastParenInValues = valuesPart.lastIndexOf(')');
        if (firstParenInValues !== -1 && lastParenInValues !== -1) {
          const newValuesPart = valuesPart.slice(0, lastParenInValues) + ', ?' + valuesPart.slice(lastParenInValues);
          rewrittenSql = newColsPart + newValuesPart;
          rewrittenParams.push(tenantId);
        }
      }
    } else if (/\bset\b/i.test(sql)) {
      rewrittenSql = sql + ', tenant_id = ?';
      rewrittenParams.push(tenantId);
    }
  }

  return { sql: rewrittenSql, params: rewrittenParams };
}

// Wrap Pool query/execute methods
const originalPoolQuery = pool.query;
pool.query = async function(sql, params) {
  const context = tenantStorage.getStore();
  const tenantId = context ? context.tenant_id : null;
  const { sql: newSql, params: newParams } = rewriteQuery(sql, params, tenantId);
  return originalPoolQuery.apply(pool, [newSql, newParams]);
};

const originalPoolExecute = pool.execute;
pool.execute = async function(sql, params) {
  const context = tenantStorage.getStore();
  const tenantId = context ? context.tenant_id : null;
  const { sql: newSql, params: newParams } = rewriteQuery(sql, params, tenantId);
  return originalPoolExecute.apply(pool, [newSql, newParams]);
};

// Wrap Pool getConnection to support connection level queries (e.g. transactions)
const originalGetConnection = pool.getConnection;
pool.getConnection = async function() {
  const conn = await originalGetConnection.apply(pool);
  return new Proxy(conn, {
    get(target, prop, receiver) {
      if (prop === 'query' || prop === 'execute') {
        return async function(sql, params) {
          const context = tenantStorage.getStore();
          const tenantId = context ? context.tenant_id : null;
          const { sql: newSql, params: newParams } = rewriteQuery(sql, params, tenantId);
          return target[prop](newSql, newParams);
        };
      }
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'function') {
        return val.bind(target);
      }
      return val;
    }
  });
};

crm.startDailySummaryScheduler();
console.log('[CRM] Notifications & CRM Engine initialized');

// Test Connection and Pool
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Express connected to XAMPP MySQL Pool successfully.');
    connection.release();
  } catch (error) {
    console.error('CRITICAL: Express failed to connect to XAMPP MySQL:', error.message);
  }
})();

// ==========================================
// AUTHENTICATION & RBAC MIDDLEWARES
// ==========================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // If a token is provided, verify it and set req.user
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Ignore token errors for public routes, but for protected routes we'll handle it below
    }
  }

  // Public routes that don't require auth (but we still populated req.user if they had a token)
  const publicPaths = ['/server-info', '/auth/login'];
  if (publicPaths.some(p => req.path === p || req.path.startsWith(p))) return next();
  
  // Allow QR menu to fetch active items and combos without auth
  if ((req.path === '/items' || req.path === '/combos') && req.method === 'GET') return next();
  
  // Allow QR menu to submit orders without auth
  if (req.path === '/orders' && req.method === 'POST') return next();
  
  // Allow QR menu to poll order status without auth
  if (req.path.match(/^\/orders\/\d+\/status$/) && req.method === 'GET') return next();

  // Allow QR menu to submit feedback without auth
  if (req.path === '/feedback' && req.method === 'POST') return next();

  if (!req.user) {
    return res.status(401).json({ error: 'Access denied. No valid token provided.' });
  }

  next();
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return next(); // Handled by authenticateToken or it's a public route
    if (allowedRoles.includes('All')) return next();
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}` });
    }
    next();
  };
};

// Apply authentication to all /api routes
app.use('/api', authenticateToken);

// SaaS Tenant Isolation Context Middleware
app.use('/api', (req, res, next) => {
  let tenantId = req.user ? req.user.tenant_id : null;
  if (!tenantId && req.headers['x-tenant-id']) {
    tenantId = parseInt(req.headers['x-tenant-id'], 10);
  }
  
  if (tenantId) {
    tenantStorage.run({ tenant_id: tenantId }, next);
  } else {
    next();
  }
});

// Apply RBAC based on route prefixes
app.use('/api/hr', authorizeRoles('Owner', 'Manager'));
app.use('/api/staff', authorizeRoles('Owner', 'Manager'));
app.use('/api/shifts', authorizeRoles('Owner', 'Manager'));
app.use('/api/shift-swaps', authorizeRoles('Owner', 'Manager'));
app.use('/api/roster', authorizeRoles('Owner', 'Manager'));
app.use('/api/attendance', authorizeRoles('Owner', 'Manager'));
app.use('/api/leaves', authorizeRoles('Owner', 'Manager'));
app.use('/api/leave-balance', authorizeRoles('Owner', 'Manager'));
app.use('/api/holidays', authorizeRoles('Owner', 'Manager'));
app.use('/api/payroll', authorizeRoles('Owner', 'Manager'));
app.use('/api/payslip', authorizeRoles('Owner', 'Manager'));
app.use('/api/staff-meals', authorizeRoles('Owner', 'Manager', 'Cook', 'Cashier'));
app.use('/api/performance', authorizeRoles('Owner', 'Manager'));

app.use('/api/inventory', authorizeRoles('Owner', 'Manager', 'Cook'));
app.use('/api/reports', authorizeRoles('Owner', 'Manager'));
app.use('/api/vendors', authorizeRoles('Owner', 'Manager'));
app.use('/api/overheads', authorizeRoles('Owner', 'Manager'));

// KDS endpoints
app.use('/api/kds', authorizeRoles('Owner', 'Manager', 'Cook'));

// POS endpoints
app.use('/api/pos', authorizeRoles('Owner', 'Manager', 'Cashier'));
app.use('/api/categories', authorizeRoles('Owner', 'Manager', 'Cashier'));
app.use('/api/customers', authorizeRoles('Owner', 'Manager', 'Cashier'));

// ==========================================
// AUTH ENDPOINTS
// ==========================================
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const [rows] = await pool.query('SELECT * FROM staff WHERE email = ? AND is_active = 1', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials or inactive account.' });

    const user = rows[0];
    if (!user.password_hash) return res.status(401).json({ error: 'Account not initialized. Contact Admin.' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, vendor_id: user.vendor_id, tenant_id: user.tenant_id },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role, email: user.email, vendor_id: user.vendor_id, tenant_id: user.tenant_id }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

app.get('/api/auth/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
  res.json({ user: req.user });
});

// Helper to format date in local YYYY-MM-DD HH:mm:ss format
function formatLocalTimestamp(date) {
  const pad = (num) => String(num).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

// ==========================================
// 1. DASHBOARD API
// ==========================================
app.get('/api/dashboard', async (req, res) => {
  try {
    const { vendor_id } = req.query;

    // Today's Date range
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayEnd = new Date();
    todayEnd.setHours(23,59,59,999);

    // Format for MySQL
    const startStr = formatLocalTimestamp(todayStart);
    const endStr = formatLocalTimestamp(todayEnd);

    let salesResult, lowStockResult, topSellingResult, categoryCount, pendingCount;

    let isCentral = (vendor_id === 'null');
    let isSpecificStall = (vendor_id && vendor_id !== 'all' && vendor_id !== 'null');

    if (isSpecificStall) {
      const vId = parseInt(vendor_id);
      
      // Today's Sales & Orders for Vendor
      const [sales] = await pool.query(
        `SELECT COUNT(DISTINCT o.id) as total_orders, 
                IFNULL(SUM(oi.quantity * oi.price), 0) as total_revenue, 
                IFNULL(SUM(oi.quantity * oi.price * (i.gst_rate / 100)), 0) as total_gst 
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         JOIN items i ON oi.item_id = i.id
         WHERE o.order_date BETWEEN ? AND ? 
           AND o.status != 'Cancelled'
           AND i.vendor_id = ?`,
         [startStr, endStr, vId]
      );
      salesResult = sales;

      // Today's active pending orders for Vendor
      const [pending] = await pool.query(
        `SELECT COUNT(DISTINCT o.id) as count 
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         JOIN items i ON oi.item_id = i.id
         WHERE o.order_date BETWEEN ? AND ? 
           AND o.status IN ('Pending', 'Preparing', 'Ready')
           AND i.vendor_id = ?`,
         [startStr, endStr, vId]
      );
      pendingCount = pending[0].count;

      // Low stock count & list for raw materials linked to Vendor items via recipes
      const [lowStock] = await pool.query(
        `SELECT DISTINCT rm.id, rm.name, rm.stock_level, rm.min_stock, rm.unit 
         FROM raw_materials rm
         JOIN recipes r ON rm.id = r.material_id
         JOIN items i ON r.item_id = i.id
         WHERE i.vendor_id = ? AND rm.stock_level <= rm.min_stock`,
         [vId]
      );
      lowStockResult = lowStock;

      // Top Selling Items for Vendor
      const [topSelling] = await pool.query(
        `SELECT i.name, SUM(oi.quantity) as total_qty, SUM(oi.quantity * oi.price) as total_sales
         FROM order_items oi
         JOIN items i ON oi.item_id = i.id
         JOIN orders o ON oi.order_id = o.id
         WHERE o.status != 'Cancelled' AND i.vendor_id = ?
         GROUP BY oi.item_id
         ORDER BY total_qty DESC
         LIMIT 5`,
         [vId]
      );
      topSellingResult = topSelling;

      // Category distribution for Vendor
      const [catCount] = await pool.query(
        `SELECT category, COUNT(id) as count FROM items WHERE vendor_id = ? GROUP BY category`,
        [vId]
      );
      categoryCount = catCount;
    } else if (isCentral) {
      // Today's Sales & Orders for Central Store (vendor_id is NULL)
      const [sales] = await pool.query(
        `SELECT COUNT(DISTINCT o.id) as total_orders, 
                IFNULL(SUM(oi.quantity * oi.price), 0) as total_revenue, 
                IFNULL(SUM(oi.quantity * oi.price * (i.gst_rate / 100)), 0) as total_gst 
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         JOIN items i ON oi.item_id = i.id
         WHERE o.order_date BETWEEN ? AND ? 
           AND o.status != 'Cancelled'
           AND i.vendor_id IS NULL`,
         [startStr, endStr]
      );
      salesResult = sales;

      // Today's active pending orders for Central Store
      const [pending] = await pool.query(
        `SELECT COUNT(DISTINCT o.id) as count 
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         JOIN items i ON oi.item_id = i.id
         WHERE o.order_date BETWEEN ? AND ? 
           AND o.status IN ('Pending', 'Preparing', 'Ready')
           AND i.vendor_id IS NULL`,
         [startStr, endStr]
      );
      pendingCount = pending[0].count;

      // Low stock count & list for Central Store raw materials (where vendor_id IS NULL)
      const [lowStock] = await pool.query(
        `SELECT DISTINCT rm.id, rm.name, rm.stock_level, rm.min_stock, rm.unit 
         FROM raw_materials rm
         WHERE rm.vendor_id IS NULL AND rm.stock_level <= rm.min_stock`
      );
      lowStockResult = lowStock;

      // Top Selling Items for Central Store
      const [topSelling] = await pool.query(
        `SELECT i.name, SUM(oi.quantity) as total_qty, SUM(oi.quantity * oi.price) as total_sales
         FROM order_items oi
         JOIN items i ON oi.item_id = i.id
         JOIN orders o ON oi.order_id = o.id
         WHERE o.status != 'Cancelled' AND i.vendor_id IS NULL
         GROUP BY oi.item_id
         ORDER BY total_qty DESC
         LIMIT 5`
      );
      topSellingResult = topSelling;

      // Category distribution for Central Store
      const [catCount] = await pool.query(
        `SELECT category, COUNT(id) as count FROM items WHERE vendor_id IS NULL GROUP BY category`
      );
      categoryCount = catCount;
    } else {
      // Today's Sales & Orders (All)
      const [sales] = await pool.query(
        `SELECT COUNT(id) as total_orders, IFNULL(SUM(total_amount), 0) as total_revenue, IFNULL(SUM(gst_amount), 0) as total_gst 
         FROM orders 
         WHERE order_date BETWEEN ? AND ? AND status != 'Cancelled'`,
        [startStr, endStr]
      );
      salesResult = sales;

      // Today's active pending orders (All)
      const [pending] = await pool.query(
        `SELECT COUNT(id) as count 
         FROM orders 
         WHERE order_date BETWEEN ? AND ? 
           AND status IN ('Pending', 'Preparing', 'Ready')`,
        [startStr, endStr]
      );
      pendingCount = pending[0].count;

      // Low stock count & list (All)
      const [lowStock] = await pool.query(
        `SELECT id, name, stock_level, min_stock, unit 
         FROM raw_materials 
         WHERE stock_level <= min_stock`
      );
      lowStockResult = lowStock;

      // Top Selling Items (All)
      const [topSelling] = await pool.query(
        `SELECT i.name, SUM(oi.quantity) as total_qty, SUM(oi.quantity * oi.price) as total_sales
         FROM order_items oi
         JOIN items i ON oi.item_id = i.id
         JOIN orders o ON oi.order_id = o.id
         WHERE o.status != 'Cancelled'
         GROUP BY oi.item_id
         ORDER BY total_qty DESC
         LIMIT 5`
      );
      topSellingResult = topSelling;

      // Category distribution (All)
      const [catCount] = await pool.query(
        `SELECT category, COUNT(id) as count FROM items GROUP BY category`
      );
      categoryCount = catCount;
    }

    res.json({
      revenue: parseFloat(salesResult[0].total_revenue),
      ordersCount: salesResult[0].total_orders,
      pendingOrdersCount: pendingCount,
      gstCollected: parseFloat(salesResult[0].total_gst),
      lowStockCount: lowStockResult.length,
      lowStockMaterials: lowStockResult,
      topSelling: topSellingResult.map(item => ({
        name: item.name,
        qty: parseInt(item.total_qty),
        sales: parseFloat(item.total_sales)
      })),
      categoryDistribution: categoryCount
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});


// ==========================================
// 2. MENU ITEMS API
// ==========================================

// Get all menu items
app.get('/api/items', async (req, res) => {
  try {
    let query = 'SELECT * FROM items WHERE is_deleted = 0';
    let params = [];
    
    if (req.user && req.user.vendor_id) {
      query += ' AND vendor_id = ?';
      params.push(req.user.vendor_id);
    } else if (req.query.vendor_id) {
      query += ' AND vendor_id = ?';
      params.push(req.query.vendor_id);
    }
    
    query += ' ORDER BY category, name';
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Add a menu item
app.post('/api/items', async (req, res) => {
  const { name, category, price, gst_rate, image_url, description, vendor_id, is_special, special_price, available_from, available_until, mess_eligible } = req.body;
  if (!name || !category || price === undefined) {
    return res.status(400).json({ error: 'Name, Category and Price are required.' });
  }

  let final_vendor_id = vendor_id ? parseInt(vendor_id) : null;
  if (req.user && req.user.vendor_id) {
    final_vendor_id = req.user.vendor_id;
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO items (name, category, price, gst_rate, image_url, description, vendor_id, is_special, special_price, available_from, available_until, mess_eligible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name, 
        category, 
        price, 
        gst_rate || 5.00, 
        image_url || null, 
        description || null, 
        final_vendor_id,
        is_special ? 1 : 0,
        special_price !== undefined && special_price !== '' ? parseFloat(special_price) : null,
        available_from || null,
        available_until || null,
        mess_eligible ? 1 : 0
      ]
    );
    res.status(201).json({ 
      id: result.insertId, 
      name, 
      category, 
      price, 
      gst_rate, 
      image_url, 
      description, 
      vendor_id: vendor_id ? parseInt(vendor_id) : null, 
      is_active: 1,
      is_special: is_special ? 1 : 0,
      special_price: special_price ? parseFloat(special_price) : null,
      available_from,
      available_until
    });
  } catch (error) {
    console.error('Failed to create menu item:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// Update a menu item
app.put('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, price, gst_rate, is_active, image_url, description, vendor_id, is_special, special_price, available_from, available_until, mess_eligible } = req.body;

  try {
    const [existing] = await pool.query('SELECT * FROM items WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = existing[0];
    const updateName = name !== undefined ? name : item.name;
    const updateCategory = category !== undefined ? category : item.category;
    const updatePrice = price !== undefined ? price : item.price;
    const updateGst = gst_rate !== undefined ? gst_rate : item.gst_rate;
    const updateActive = is_active !== undefined ? is_active : item.is_active;
    const updateImage = image_url !== undefined ? image_url : item.image_url;
    const updateDesc = description !== undefined ? description : item.description;
    let updateVendor = vendor_id !== undefined ? (vendor_id ? parseInt(vendor_id) : null) : item.vendor_id;
    if (req.user && req.user.vendor_id) {
      updateVendor = req.user.vendor_id;
    }
    const updateIsSpecial = is_special !== undefined ? (is_special ? 1 : 0) : item.is_special;
    const updateSpecialPrice = special_price !== undefined ? (special_price !== '' && special_price !== null ? parseFloat(special_price) : null) : item.special_price;
    const updateAvailableFrom = available_from !== undefined ? (available_from === '' || available_from === null ? null : available_from) : item.available_from;
    const updateAvailableUntil = available_until !== undefined ? (available_until === '' || available_until === null ? null : available_until) : item.available_until;
    const updateMessEligible = mess_eligible !== undefined ? (mess_eligible ? 1 : 0) : item.mess_eligible;

    await pool.query(
      'UPDATE items SET name = ?, category = ?, price = ?, gst_rate = ?, is_active = ?, image_url = ?, description = ?, vendor_id = ?, is_special = ?, special_price = ?, available_from = ?, available_until = ?, mess_eligible = ? WHERE id = ?',
      [
        updateName, 
        updateCategory, 
        updatePrice, 
        updateGst, 
        updateActive, 
        updateImage, 
        updateDesc, 
        updateVendor, 
        updateIsSpecial, 
        updateSpecialPrice, 
        updateAvailableFrom, 
        updateAvailableUntil, 
        updateMessEligible,
        id
      ]
    );

    res.json({
      id: parseInt(id),
      name: updateName,
      category: updateCategory,
      price: parseFloat(updatePrice),
      gst_rate: parseFloat(updateGst),
      is_active: parseInt(updateActive),
      image_url: updateImage,
      description: updateDesc,
      vendor_id: updateVendor,
      is_special: parseInt(updateIsSpecial),
      special_price: updateSpecialPrice ? parseFloat(updateSpecialPrice) : null,
      available_from: updateAvailableFrom,
      available_until: updateAvailableUntil
    });
  } catch (error) {
    console.error('Failed to update menu item:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Delete a menu item
app.delete('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check if the item is present in order history or staff meals (sales records)
    const [orderRows] = await connection.query('SELECT id FROM order_items WHERE item_id = ? LIMIT 1', [id]);
    const [mealRows] = await connection.query('SELECT id FROM staff_meals WHERE item_id = ? LIMIT 1', [id]);

    if (orderRows.length > 0 || mealRows.length > 0) {
      // Soft delete: mark as deleted so historical logs/reports remain valid
      await connection.query('UPDATE items SET is_deleted = 1 WHERE id = ?', [id]);
      await connection.commit();
      return res.json({ success: true, message: 'Item has sales history; softly deleted.' });
    }

    // Hard delete: safe to delete item completely
    // 1. Delete associated recipe mappings
    await connection.query('DELETE FROM recipes WHERE item_id = ?', [id]);
    
    // 2. Delete combo item associations
    await connection.query('DELETE FROM combo_items WHERE combo_id = ? OR child_item_id = ?', [id, id]);

    // 3. Delete the item itself
    await connection.query('DELETE FROM items WHERE id = ?', [id]);

    await connection.commit();
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Failed to delete item:', error);
    res.status(500).json({ error: 'Failed to delete menu item: ' + error.message });
  } finally {
    connection.release();
  }
});


// ==========================================
// 3. RAW MATERIALS API
// ==========================================

// Get all raw materials
app.get('/api/raw-materials', async (req, res) => {
  try {
    let query = 'SELECT * FROM raw_materials';
    let params = [];
    
    let vendor_id = req.query.vendor_id;
    if (req.user && req.user.vendor_id) {
      vendor_id = req.user.vendor_id;
    }
    
    if (vendor_id === 'all') {
      // Central admin viewing all stalls, no WHERE clause needed
    } else if (vendor_id && vendor_id !== 'null') {
      query += ' WHERE vendor_id = ?';
      params.push(parseInt(vendor_id));
    } else if (vendor_id === 'null' || (req.user && req.user.vendor_id === null)) {
      query += ' WHERE vendor_id IS NULL'; // Central
    }
    
    query += ' ORDER BY name';
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch raw materials' });
  }
});

// Add a raw material
app.post('/api/raw-materials', async (req, res) => {
  const { name, unit, stock_level, min_stock, vendor_id } = req.body;
  if (!name || !unit) {
    return res.status(400).json({ error: 'Name and Unit are required.' });
  }

  let final_vendor_id = vendor_id ? parseInt(vendor_id) : null;
  if (req.user && req.user.vendor_id) {
    final_vendor_id = req.user.vendor_id;
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO raw_materials (name, unit, stock_level, min_stock, vendor_id) VALUES (?, ?, ?, ?, ?)',
      [name, unit, stock_level || 0, min_stock || 0, final_vendor_id]
    );

    if (stock_level > 0) {
      await pool.query(
        'INSERT INTO stock_logs (material_id, change_qty, log_type, reason, vendor_id) VALUES (?, ?, "Opening", "Initial stock setup", ?)',
        [result.insertId, stock_level, final_vendor_id]
      );
    }

    res.status(201).json({ id: result.insertId, name, unit, stock_level: parseFloat(stock_level || 0), min_stock: parseFloat(min_stock || 0), vendor_id: final_vendor_id });
  } catch (error) {
    console.error('Error creating raw material:', error);
    res.status(500).json({ error: 'Failed to create raw material' });
  }
});

// Update raw material (Edit min stock or physical restock)
app.put('/api/raw-materials/:id', async (req, res) => {
  const { id } = req.params;
  const { name, unit, min_stock } = req.body;

  try {
    const [existing] = await pool.query('SELECT * FROM raw_materials WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Raw material not found' });
    }

    const mat = existing[0];
    // Enforce vendor_id boundary for stall managers
    if (req.user && req.user.vendor_id && mat.vendor_id !== req.user.vendor_id) {
      return res.status(403).json({ error: 'Forbidden: Cannot modify another stall\'s raw material' });
    }

    const updateName = name !== undefined ? name : mat.name;
    const updateUnit = unit !== undefined ? unit : mat.unit;
    const updateMin = min_stock !== undefined ? min_stock : mat.min_stock;

    await pool.query(
      'UPDATE raw_materials SET name = ?, unit = ?, min_stock = ? WHERE id = ?',
      [updateName, updateUnit, updateMin, id]
    );

    res.json({ id: parseInt(id), name: updateName, unit: updateUnit, min_stock: parseFloat(updateMin), stock_level: parseFloat(mat.stock_level) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update raw material' });
  }
});

// Delete raw material
app.delete('/api/raw-materials/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [existing] = await pool.query('SELECT vendor_id FROM raw_materials WHERE id = ?', [id]);
    if (existing.length > 0 && req.user && req.user.vendor_id && existing[0].vendor_id !== req.user.vendor_id) {
      return res.status(403).json({ error: 'Forbidden: Cannot delete another stall\'s raw material' });
    }

    await pool.query('DELETE FROM raw_materials WHERE id = ?', [id]);
    res.json({ success: true, message: 'Raw material deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete raw material' });
  }
});


// ==========================================
// STOCK TRANSFERS & ALLOCATION API
// ==========================================

// Get all stock transfers
app.get('/api/stock-transfers', async (req, res) => {
  try {
    let query = `
      SELECT t.*, t.transfer_date as created_at, m.name as material_name, m.unit as material_unit,
             vf.name as from_vendor_name, vt.name as to_vendor_name
      FROM stock_transfers t
      JOIN raw_materials m ON t.material_id = m.id
      LEFT JOIN vendors vf ON t.from_vendor_id = vf.id
      LEFT JOIN vendors vt ON t.to_vendor_id = vt.id
    `;
    let params = [];

    // Filter by vendor if Stall Manager
    let vendor_id = req.query.vendor_id;
    if (req.user && req.user.vendor_id) {
      vendor_id = req.user.vendor_id;
    }

    if (vendor_id) {
      query += ' WHERE t.from_vendor_id = ? OR t.to_vendor_id = ?';
      params.push(parseInt(vendor_id), parseInt(vendor_id));
    }

    query += ' ORDER BY t.transfer_date DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching stock transfers:', error);
    res.status(500).json({ error: 'Failed to fetch stock transfers.' });
  }
});

// Request or execute a stock transfer
app.post('/api/stock-transfers', async (req, res) => {
  const { material_id, quantity, from_vendor_id, to_vendor_id, requested_by, status } = req.body;
  
  if (!material_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'material_id and positive quantity are required.' });
  }

  let final_from = from_vendor_id === undefined ? null : (from_vendor_id ? parseInt(from_vendor_id) : null);
  let final_to = to_vendor_id === undefined ? null : (to_vendor_id ? parseInt(to_vendor_id) : null);
  let final_status = status || 'Requested';

  // Stall Managers can only request/send transfers involving their own stall
  if (req.user && req.user.vendor_id) {
    if (final_from !== req.user.vendor_id && final_to !== req.user.vendor_id) {
      return res.status(403).json({ error: 'Forbidden: You can only request transfers for your own stall.' });
    }
    final_status = 'Requested'; // Force to requested
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Verify material exists at source
    const [sourceMat] = await connection.query(
      'SELECT id, name, unit, stock_level, min_stock, supplier_id, cost_per_unit, vendor_id FROM raw_materials WHERE id = ?',
      [material_id]
    );

    if (sourceMat.length === 0) {
      throw new Error('Source material not found.');
    }

    const [insertResult] = await connection.query(
      'INSERT INTO stock_transfers (from_vendor_id, to_vendor_id, material_id, quantity, status, requested_by, tenant_id, material_name, unit, qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [final_from, final_to, material_id, quantity, final_status, requested_by || (req.user ? req.user.name : 'System'), req.user ? req.user.tenant_id : null, sourceMat[0].name, sourceMat[0].unit, quantity]
    );

    const transferId = insertResult.insertId;

    if (final_status === 'Completed') {
      const source = sourceMat[0];
      
      let actualSourceMatId = material_id;
      let actualSourceMat = source;

      // If the request specifies a different from_vendor_id than where the material_id lives
      // we need to look it up by name in the correct from_vendor location.
      if (source.vendor_id !== final_from) {
        const [actualSource] = await connection.query(
          'SELECT id, name, unit, stock_level, min_stock, supplier_id, cost_per_unit, vendor_id FROM raw_materials WHERE LOWER(name) = LOWER(?) AND (vendor_id = ? OR (vendor_id IS NULL AND ? IS NULL))',
          [source.name.trim(), final_from, final_from]
        );
        if (actualSource.length === 0) {
          let fromNameStr = final_from ? `Stall #${final_from}` : 'Central Warehouse';
          throw new Error(`Naming conflict: Could not find material named "${source.name}" in ${fromNameStr}. Please ensure material names match exactly.`);
        }
        actualSourceMat = actualSource[0];
        actualSourceMatId = actualSourceMat.id;
      }

      if (parseFloat(actualSourceMat.stock_level) < parseFloat(quantity)) {
        throw new Error(`Insufficient stock in source inventory for "${actualSourceMat.name}". Available: ${actualSourceMat.stock_level}, Required: ${quantity}`);
      }

      // Deduct from source
      await connection.query(
        'UPDATE raw_materials SET stock_level = stock_level - ? WHERE id = ?',
        [quantity, actualSourceMatId]
      );

      // Get vendor names for logs
      let fromName = 'Central Warehouse';
      if (final_from) {
        const [fv] = await connection.query('SELECT name FROM vendors WHERE id = ?', [final_from]);
        if (fv.length > 0) fromName = fv[0].name;
      }
      let toName = 'Central Warehouse';
      if (final_to) {
        const [tv] = await connection.query('SELECT name FROM vendors WHERE id = ?', [final_to]);
        if (tv.length > 0) toName = tv[0].name;
      }

      // Log source deduction
      await connection.query(
        "INSERT INTO stock_logs (material_id, change_qty, log_type, reason, vendor_id, tenant_id) VALUES (?, ?, 'Transfer Out', ?, ?, ?)",
        [actualSourceMatId, -quantity, `Transfer to ${toName} (Ref #${transferId})`, final_from, req.user ? req.user.tenant_id : null]
      );

      // Add to target
      const [targetMat] = await connection.query(
        'SELECT id FROM raw_materials WHERE LOWER(name) = LOWER(?) AND (vendor_id = ? OR (vendor_id IS NULL AND ? IS NULL))',
        [source.name.trim(), final_to, final_to]
      );

      let targetMatId;
      if (targetMat.length > 0) {
        targetMatId = targetMat[0].id;
        await connection.query(
          'UPDATE raw_materials SET stock_level = stock_level + ? WHERE id = ?',
          [quantity, targetMatId]
        );
      } else {
        const [newMatResult] = await connection.query(
          'INSERT INTO raw_materials (name, unit, stock_level, min_stock, supplier_id, vendor_id, cost_per_unit) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [source.name.trim(), source.unit, quantity, source.min_stock, source.supplier_id, final_to, source.cost_per_unit]
        );
        targetMatId = newMatResult.insertId;
      }

      // Log target addition
      await connection.query(
        "INSERT INTO stock_logs (material_id, change_qty, log_type, reason, vendor_id, tenant_id) VALUES (?, ?, 'Transfer In', ?, ?, ?)",
        [targetMatId, quantity, `Transfer from ${fromName} (Ref #${transferId})`, final_to, req.user ? req.user.tenant_id : null]
      );
    }

    await connection.commit();
    res.status(201).json({ success: true, transfer_id: transferId, status: final_status });

  } catch (error) {
    await connection.rollback();
    console.error('Error initiating stock transfer:', error);
    res.status(500).json({ error: error.message || 'Failed to initiate stock transfer.' });
  } finally {
    connection.release();
  }
});

// Update stock transfer status (Approve, Reject, Complete)
app.put('/api/stock-transfers/:id', async (req, res) => {
  const { id } = req.params;
  const { status, approved_by, rejection_reason } = req.body;

  if (!status || !['Approved', 'Rejected', 'Completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be Approved, Rejected, or Completed.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [transfers] = await connection.query(
      'SELECT * FROM stock_transfers WHERE id = ? FOR UPDATE',
      [id]
    );

    if (transfers.length === 0) {
      throw new Error('Stock transfer request not found.');
    }

    const transfer = transfers[0];

    // Stall Managers security check
    if (req.user && req.user.vendor_id) {
      if (status === 'Completed' || status === 'Approved') {
        if (transfer.to_vendor_id !== req.user.vendor_id && transfer.from_vendor_id !== req.user.vendor_id) {
          throw new Error('Forbidden: You cannot approve/complete this transfer.');
        }
      } else if (status === 'Rejected') {
        if (transfer.to_vendor_id !== req.user.vendor_id && transfer.from_vendor_id !== req.user.vendor_id) {
          throw new Error('Forbidden: You cannot reject this transfer.');
        }
      }
    }

    if (status === 'Completed' && transfer.status !== 'Completed') {
      // Find the material associated with the transfer request
      const [reqMat] = await connection.query(
        'SELECT * FROM raw_materials WHERE id = ? FOR UPDATE',
        [transfer.material_id]
      );

      if (reqMat.length === 0) {
        throw new Error('Requested material not found.');
      }

      const reqMaterial = reqMat[0];
      
      // Determine if the requested material belongs to the source (from_vendor) or target (to_vendor)
      const reqMatVendorId = reqMaterial.vendor_id;
      let isSourceMaterial = false;
      
      // reqMatVendorId can be null (Central) or a vendor ID
      if (reqMatVendorId === transfer.from_vendor_id) {
        isSourceMaterial = true;
      } else if (reqMatVendorId === transfer.to_vendor_id) {
        isSourceMaterial = false;
      } else {
        // Fallback: assume it is the source
        isSourceMaterial = true;
      }

      let sourceMatId, targetMatId;
      let source, target;

      if (isSourceMaterial) {
        sourceMatId = reqMaterial.id;
        source = reqMaterial;

        // Find target by name
        const [tMat] = await connection.query(
          'SELECT * FROM raw_materials WHERE LOWER(name) = LOWER(?) AND (vendor_id = ? OR (vendor_id IS NULL AND ? IS NULL))',
          [reqMaterial.name.trim(), transfer.to_vendor_id, transfer.to_vendor_id]
        );
        if (tMat.length > 0) {
          target = tMat[0];
          targetMatId = target.id;
        }
      } else {
        targetMatId = reqMaterial.id;
        target = reqMaterial;

        // Find source by name
        const [sMat] = await connection.query(
          'SELECT * FROM raw_materials WHERE LOWER(name) = LOWER(?) AND (vendor_id = ? OR (vendor_id IS NULL AND ? IS NULL)) FOR UPDATE',
          [reqMaterial.name.trim(), transfer.from_vendor_id, transfer.from_vendor_id]
        );
        
        if (sMat.length > 0) {
          source = sMat[0];
          sourceMatId = source.id;
        } else {
          // If names don't match, we cannot deduct from source
          let fromName = transfer.from_vendor_id ? `Stall #${transfer.from_vendor_id}` : 'Central Warehouse';
          throw new Error(`Naming conflict: Could not find material named "${reqMaterial.name}" in ${fromName}. Please ensure material names match exactly.`);
        }
      }

      if (parseFloat(source.stock_level) < parseFloat(transfer.quantity)) {
        throw new Error(`Insufficient stock in source inventory for "${source.name}". Available: ${source.stock_level}, Required: ${transfer.quantity}`);
      }

      // Deduct from source
      await connection.query(
        'UPDATE raw_materials SET stock_level = stock_level - ? WHERE id = ?',
        [transfer.quantity, sourceMatId]
      );

      // Get vendor names for logs
      let fromName = 'Central Warehouse';
      if (transfer.from_vendor_id) {
        const [fv] = await connection.query('SELECT name FROM vendors WHERE id = ?', [transfer.from_vendor_id]);
        if (fv.length > 0) fromName = fv[0].name;
      }
      let toName = 'Central Warehouse';
      if (transfer.to_vendor_id) {
        const [tv] = await connection.query('SELECT name FROM vendors WHERE id = ?', [transfer.to_vendor_id]);
        if (tv.length > 0) toName = tv[0].name;
      }

      // Log source deduction
      await connection.query(
        "INSERT INTO stock_logs (material_id, change_qty, log_type, reason, vendor_id, tenant_id) VALUES (?, ?, 'Transfer Out', ?, ?, ?)",
        [sourceMatId, -transfer.quantity, `Transfer to ${toName} (Ref #${id})`, transfer.from_vendor_id, req.user ? req.user.tenant_id : null]
      );

      // Add to target
      if (targetMatId) {
        await connection.query(
          'UPDATE raw_materials SET stock_level = stock_level + ? WHERE id = ?',
          [transfer.quantity, targetMatId]
        );
      } else {
        // Create it in the target location
        const [newMatResult] = await connection.query(
          'INSERT INTO raw_materials (name, unit, stock_level, min_stock, supplier_id, vendor_id, cost_per_unit) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [source.name.trim(), source.unit, transfer.quantity, source.min_stock, source.supplier_id, transfer.to_vendor_id, source.cost_per_unit]
        );
        targetMatId = newMatResult.insertId;
      }

      // Log target addition
      await connection.query(
        "INSERT INTO stock_logs (material_id, change_qty, log_type, reason, vendor_id, tenant_id) VALUES (?, ?, 'Transfer In', ?, ?, ?)",
        [targetMatId, transfer.quantity, `Transfer from ${fromName} (Ref #${id})`, transfer.to_vendor_id, req.user ? req.user.tenant_id : null]
      );
    }

    // Update status in stock_transfers
    await connection.query(
      'UPDATE stock_transfers SET status = ?, approved_by = ?, rejection_reason = ? WHERE id = ?',
      [status, approved_by || (req.user ? req.user.name : 'System'), rejection_reason || null, id]
    );

    await connection.commit();
    res.json({ success: true, message: `Transfer status updated to ${status}.` });

  } catch (error) {
    await connection.rollback();
    console.error('Error updating stock transfer:', error);
    res.status(500).json({ error: error.message || 'Failed to update stock transfer.' });
  } finally {
    connection.release();
  }
});


// ==========================================
// 4. RECIPES & MAPPING API
// ==========================================

// Get all recipe mappings grouped by item
app.get('/api/recipes', async (req, res) => {
  try {
    let query = `
      SELECT r.id, r.item_id, i.name as item_name, r.material_id, m.name as material_name, m.unit, r.quantity
      FROM recipes r
      JOIN items i ON r.item_id = i.id
      JOIN raw_materials m ON r.material_id = m.id
      WHERE i.is_deleted = 0
    `;
    let params = [];
    const vendorParam = req.query.vendor_id;
    if (vendorParam && vendorParam !== 'all') {
      if (vendorParam === 'null') {
        // Central Admin's own recipes (items with no vendor)
        query += ' AND i.vendor_id IS NULL';
      } else {
        const vid = parseInt(vendorParam, 10);
        if (!isNaN(vid)) {
          query += ' AND i.vendor_id = ?';
          params.push(vid);
        }
      }
    } else if (!vendorParam && req.user && req.user.vendor_id) {
      // Stall manager fallback — filter by token vendor_id
      query += ' AND i.vendor_id = ?';
      params.push(req.user.vendor_id);
    }
    // vendor_id=all → no filter, return all recipes
    query += ' ORDER BY i.name';
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Get recipe ingredients for a specific item
app.get('/api/recipes/:item_id', async (req, res) => {
  const { item_id } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT r.id, r.material_id, m.name as material_name, m.unit, r.quantity
      FROM recipes r
      JOIN raw_materials m ON r.material_id = m.id
      WHERE r.item_id = ?
    `, [item_id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recipe for item' });
  }
});

// Save recipe ingredients mapping for an item (creates new / replaces existing)
app.post('/api/recipes', async (req, res) => {
  const { item_id, ingredients } = req.body; // ingredients is array of { material_id, quantity }
  if (!item_id || !Array.isArray(ingredients)) {
    return res.status(400).json({ error: 'item_id and ingredients array are required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Delete existing recipe mappings for this item
    await connection.query('DELETE FROM recipes WHERE item_id = ?', [item_id]);

    // 2. Insert new mappings
    if (ingredients.length > 0) {
      const values = ingredients.map(ing => [item_id, ing.material_id, ing.quantity]);
      await connection.query('INSERT INTO recipes (item_id, material_id, quantity) VALUES ?', [values]);
    }

    await connection.commit();
    res.json({ success: true, message: 'Recipe mapped successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error mapping recipe:', error);
    res.status(500).json({ error: 'Failed to map recipe' });
  } finally {
    connection.release();
  }
});


// ==========================================
// 5. STOCK LOGS (PURCHASE / WASTAGE MANUAL ENTRY)
// ==========================================

// Get stock logs
app.get('/api/stock-logs', async (req, res) => {
  try {
    let query = `
      SELECT l.id, l.material_id, m.name as material_name, m.unit, l.change_qty, l.log_type, l.reason, l.logged_at, l.responsible_person, l.vendor_id
      FROM stock_logs l
      JOIN raw_materials m ON l.material_id = m.id
    `;
    const params = [];
    
    let vendor_id = req.query.vendor_id;
    if (req.user && req.user.vendor_id) {
      vendor_id = req.user.vendor_id;
    }
    
    if (vendor_id === 'all') {
      // Central admin viewing all stalls, no WHERE clause needed
    } else if (vendor_id && vendor_id !== 'null') {
      query += ' WHERE l.vendor_id = ?';
      params.push(parseInt(vendor_id));
    } else if (vendor_id === 'null' || (req.user && req.user.vendor_id === null)) {
      query += ' WHERE l.vendor_id IS NULL';
    }

    query += ' ORDER BY l.logged_at DESC LIMIT 100';
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock audit logs' });
  }
});

// Add manual stock log (Purchase or Wastage adjustments)
app.post('/api/stock-logs', async (req, res) => {
  const { material_id, change_qty, log_type, reason, responsible_person, cost_per_unit } = req.body;
  if (!material_id || change_qty === undefined || !log_type) {
    return res.status(400).json({ error: 'material_id, change_qty, and log_type are required.' });
  }

  // Adjust change_qty sign depending on log_type
  // Purchase/Adjustment/Opening should be positive (increase stock)
  // Wastage/Closing/Sale Deduction should represent physical decrease (represented as negative in log)
  let adjustedQty = parseFloat(change_qty);
  if (['Wastage', 'Closing', 'Sale Deduction'].includes(log_type) && adjustedQty > 0) {
    adjustedQty = -adjustedQty;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check material exists
    const [existing] = await connection.query('SELECT stock_level, cost_per_unit, vendor_id FROM raw_materials WHERE id = ?', [material_id]);
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Raw material not found' });
    }

    const mat = existing[0];
    if (req.user && req.user.vendor_id && mat.vendor_id !== req.user.vendor_id) {
      await connection.rollback();
      connection.release();
      return res.status(403).json({ error: 'Forbidden: Cannot adjust stock for another stall' });
    }

    let currentCost = parseFloat(mat.cost_per_unit || 0);
    if (log_type === 'Purchase' && cost_per_unit && parseFloat(cost_per_unit) > 0) {
      currentCost = parseFloat(cost_per_unit);
    }
    const recordedCost = adjustedQty * currentCost;

    // Insert Stock Log
    await connection.query(
      'INSERT INTO stock_logs (material_id, change_qty, recorded_cost, log_type, reason, responsible_person, vendor_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [material_id, adjustedQty, recordedCost, log_type, reason || null, responsible_person || null, mat.vendor_id]
    );

    // Update current stock level
    await connection.query(
      'UPDATE raw_materials SET stock_level = stock_level + ? WHERE id = ?',
      [adjustedQty, material_id]
    );

    // Update unit cost if provided (only for Purchase type)
    if (log_type === 'Purchase' && cost_per_unit && parseFloat(cost_per_unit) > 0) {
      await connection.query(
        'UPDATE raw_materials SET cost_per_unit = ? WHERE id = ?',
        [parseFloat(cost_per_unit), material_id]
      );
    }

    await connection.commit();

    // CRM: Check low stock and trigger alert if needed
    try {
      const [matCheck] = await pool.query('SELECT * FROM raw_materials WHERE id=?', [material_id]);
      if (matCheck.length && matCheck[0].stock_level <= matCheck[0].min_stock) {
        crm.triggerLowStockAlert(matCheck[0]).catch(e => console.error('[CRM] Low stock alert err:', e.message));
      }
    } catch(crmErr) { console.error('[CRM] Hook err:', crmErr.message); }
    res.json({ success: true, message: 'Stock log added and inventory updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error adding stock log:', error);
    res.status(500).json({ error: 'Failed to record stock log' });
  } finally {
    connection.release();
  }
});


// Bulk Purchase Entry (Invoice Log)
app.post('/api/purchase-entry', async (req, res) => {
  let { supplier_name, invoice_number, items, supplier_id, supplier_details, vendor_id } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invoice items array is required.' });
  }

  let final_vendor_id = vendor_id ? parseInt(vendor_id) : null;
  if (req.user && req.user.vendor_id) {
    final_vendor_id = req.user.vendor_id;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let sName = supplier_name || 'N/A';
    
    // Create new supplier if details are provided
    if (supplier_details && !supplier_id) {
      const { name, contact_phone, email, payment_terms, items_supplied } = supplier_details;
      sName = name || sName;
      const [insertSupp] = await connection.query(
        'INSERT INTO suppliers (name, phone, email, payment_terms, items_supplied, outstanding_balance, vendor_id) VALUES (?, ?, ?, ?, ?, 0, ?)',
        [name, contact_phone || '', email || '', payment_terms || '', items_supplied || '', final_vendor_id]
      );
      supplier_id = insertSupp.insertId;
    } else if (supplier_id) {
      const [supp] = await connection.query('SELECT name FROM suppliers WHERE id = ?', [supplier_id]);
      if (supp.length > 0) {
        sName = supp[0].name;
      }
    }

    const formattedReason = `Supplier: ${sName} | Invoice: ${invoice_number || 'N/A'}`;
    let totalInvoiceCost = 0;

    for (const item of items) {
      let materialId = item.material_id;
      const qty = parseFloat(item.change_qty);
      const unitCost = parseFloat(item.cost_per_unit || item.price || 0);

      if (isNaN(qty) || qty <= 0) {
        throw new Error(`Invalid quantity for item ${item.material_name || item.material_id}`);
      }

      totalInvoiceCost += qty * unitCost;

      // If no material_id is provided, search by name or create it
      if (!materialId) {
        if (!item.material_name) {
          throw new Error('Either material_id or material_name is required.');
        }

        // Check if material already exists for this vendor (case-insensitive)
        const [existing] = await connection.query(
          'SELECT id FROM raw_materials WHERE LOWER(name) = LOWER(?) AND (vendor_id = ? OR (vendor_id IS NULL AND ? IS NULL))',
          [item.material_name.trim(), final_vendor_id, final_vendor_id]
        );

        if (existing.length > 0) {
          materialId = existing[0].id;
        } else {
          // Create new material
          const [insertResult] = await connection.query(
            'INSERT INTO raw_materials (name, unit, stock_level, min_stock, supplier_id, vendor_id) VALUES (?, ?, 0, ?, ?, ?)',
            [item.material_name.trim(), item.unit || 'packet', parseFloat(item.min_stock) || 0.0, supplier_id ? parseInt(supplier_id) : null, final_vendor_id]
          );
          materialId = insertResult.insertId;
        }
      } else {
        // Verify material belongs to target vendor
        const [matVerify] = await connection.query(
          'SELECT vendor_id FROM raw_materials WHERE id = ?',
          [materialId]
        );
        if (matVerify.length > 0) {
          const matVendor = matVerify[0].vendor_id;
          if (matVendor !== final_vendor_id) {
            throw new Error(`Material ID ${materialId} does not belong to the selected vendor/stall.`);
          }
        }
        
        if (supplier_id) {
          // Link existing material to supplier
          await connection.query(
            'UPDATE raw_materials SET supplier_id = ? WHERE id = ?',
            [supplier_id, materialId]
          );
        }
      }

      // Update current stock level (cumulative addition)
      await connection.query(
        'UPDATE raw_materials SET stock_level = stock_level + ? WHERE id = ?',
        [qty, materialId]
      );

      // Update unit cost if provided
      if (unitCost > 0) {
        await connection.query(
          'UPDATE raw_materials SET cost_per_unit = ? WHERE id = ?',
          [unitCost, materialId]
        );
      }

      // Insert Stock Log (Purchase type)
      const recordedCost = qty * unitCost;
      await connection.query(
        'INSERT INTO stock_logs (material_id, change_qty, recorded_cost, log_type, reason, supplier_id, vendor_id) VALUES (?, ?, ?, "Purchase", ?, ?, ?)',
        [materialId, qty, recordedCost, formattedReason, supplier_id || null, final_vendor_id]
      );
    }

    // Update supplier outstanding balance
    if (supplier_id && totalInvoiceCost > 0) {
      await connection.query(
        'UPDATE suppliers SET outstanding_balance = outstanding_balance + ? WHERE id = ?',
        [totalInvoiceCost, supplier_id]
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Purchase invoice entered and inventory updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error recording purchase entry:', error);
    res.status(500).json({ error: error.message || 'Failed to record purchase entry invoice' });
  } finally {
    connection.release();
  }
});



// ==========================================
// 6. POS OPERATIONS (ORDER PLACEMENT)
// ==========================================

app.post('/api/orders', async (req, res) => {
  const { 
    items: orderItems, 
    payment_mode, 
    discount_type = 'None', 
    discount_value = 0, 
    discount_amount = 0, 
    discount_reference = null, 
    payment_details = null,
    customer_id = null,
    billing_staff_id = null,
    is_upsold = 0,
    order_source = 'POS',
    customer_name = null,
    customer_phone = null,
    pickup_slot = null,
    customer_staff_id = null,
    loyalty_redeem_points = 0,   // loyalty points to redeem as a discount
    vendor_id = null              // stall that placed this order (for wallet settlement tracking)
  } = req.body; // items: Array of { item_id, quantity }
  
  if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0 || !payment_mode) {
    return res.status(400).json({ error: 'Order items array and payment mode are required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Calculate order total & tax and double-check menu item validity
    let subtotal = 0;
    let gstTotal = 0;
    const validatedItems = [];

    for (const ordItem of orderItems) {
      const [itemRows] = await connection.query('SELECT * FROM items WHERE id = ? AND is_active = 1 AND is_deleted = 0', [ordItem.item_id]);
      if (itemRows.length === 0) {
        throw new Error(`Item ID ${ordItem.item_id} is inactive, deleted, or not found.`);
      }

      const dbItem = itemRows[0];
      const itemQty = parseInt(ordItem.quantity);
      const itemPrice = (dbItem.is_special && dbItem.special_price !== null && dbItem.special_price !== undefined)
        ? parseFloat(dbItem.special_price)
        : parseFloat(dbItem.price);
      const gstRate = parseFloat(dbItem.gst_rate);

      const itemTotal = itemPrice * itemQty;
      // Tax calculations: price includes GST.
      const basePrice = itemPrice / (1 + (gstRate / 100));
      const itemGst = itemTotal - (basePrice * itemQty);

      subtotal += itemTotal;
      gstTotal += itemGst;

      // Check if this item is a combo and get its child items
      const [comboRows] = await connection.query(`
        SELECT ci.child_item_id, ci.quantity, i.name as child_name
        FROM combo_items ci
        JOIN items i ON ci.child_item_id = i.id
        WHERE ci.combo_id = ?
      `, [dbItem.id]);

      validatedItems.push({
        ...dbItem,
        quantity: itemQty,
        priceSnapshot: itemPrice,
        childItems: comboRows,
        spice_level: ordItem.spice_level || null,
        special_instructions: ordItem.special_instructions || null
      });
    }

    // 2. Ingredient stock validation & deduction based on recipe mappings (handles combo items recursively)
    for (const valItem of validatedItems) {
      // Check if this item is a combo item
      const [comboRows] = await connection.query('SELECT * FROM combo_items WHERE combo_id = ?', [valItem.id]);
      
      if (comboRows.length > 0) {
        // It's a combo, deduct child items' stock
        for (const comboItem of comboRows) {
          const childQty = comboItem.quantity * valItem.quantity;
          const [recipesRows] = await connection.query('SELECT * FROM recipes WHERE item_id = ?', [comboItem.child_item_id]);
          
          for (const recipe of recipesRows) {
            const matId = recipe.material_id;
            const qtyNeeded = parseFloat(recipe.quantity) * childQty;

            // Fetch current stock
            const [matRows] = await connection.query('SELECT name, stock_level, unit, cost_per_unit, vendor_id FROM raw_materials WHERE id = ? FOR UPDATE', [matId]);
            if (matRows.length === 0) {
              throw new Error(`Ingredient for combo component not found in stock master.`);
            }

            const mat = matRows[0];
            const newStock = parseFloat(mat.stock_level) - qtyNeeded;

            if (newStock < 0) {
              throw new Error(`Insufficient stock for combo ingredient "${mat.name}". Needed: ${qtyNeeded.toFixed(3)} ${mat.unit}, Available: ${parseFloat(mat.stock_level).toFixed(3)} ${mat.unit}`);
            }

            // Deduct stock
            await connection.query('UPDATE raw_materials SET stock_level = ? WHERE id = ?', [newStock, matId]);

            // Record stock log
            await connection.query(
              'INSERT INTO stock_logs (material_id, change_qty, log_type, reason, vendor_id) VALUES (?, ?, "Sale Deduction", ?, ?)',
              [matId, -qtyNeeded, `Combo Component Order: ${valItem.name} -> Item #${comboItem.child_item_id} x${childQty}`, mat.vendor_id]
            );

            valItem.recordedCogs = (valItem.recordedCogs || 0) + (qtyNeeded * parseFloat(mat.cost_per_unit || 0));
          }
        }
      } else {
        // It's a normal item, deduct standard recipes
        const [recipesRows] = await connection.query('SELECT * FROM recipes WHERE item_id = ?', [valItem.id]);

        for (const recipe of recipesRows) {
          const matId = recipe.material_id;
          const qtyNeeded = parseFloat(recipe.quantity) * valItem.quantity;

          // Fetch current stock
          const [matRows] = await connection.query('SELECT name, stock_level, unit, cost_per_unit, vendor_id FROM raw_materials WHERE id = ? FOR UPDATE', [matId]);
          if (matRows.length === 0) {
            throw new Error(`Ingredient for ${valItem.name} not found in stock master.`);
          }

          const mat = matRows[0];
          const newStock = parseFloat(mat.stock_level) - qtyNeeded;

          if (newStock < 0) {
            throw new Error(`Insufficient stock for ingredient "${mat.name}". Needed: ${qtyNeeded.toFixed(3)} ${mat.unit}, Available: ${parseFloat(mat.stock_level).toFixed(3)} ${mat.unit}`);
          }

          // Deduct stock
          await connection.query(
            'UPDATE raw_materials SET stock_level = ? WHERE id = ?',
            [newStock, matId]
          );

          // Record stock log
          await connection.query(
            'INSERT INTO stock_logs (material_id, change_qty, log_type, reason, vendor_id) VALUES (?, ?, "Sale Deduction", ?, ?)',
            [matId, -qtyNeeded, `Order Token Checkout (Item: ${valItem.name} x${valItem.quantity})`, mat.vendor_id]
          );
          
          valItem.recordedCogs = (valItem.recordedCogs || 0) + (qtyNeeded * parseFloat(mat.cost_per_unit || 0));
        }
      }
    }

    // Calculate final payable amount after discount
    const finalPayable = Math.max(0, subtotal - parseFloat(discount_amount || 0));

    // 3. Generate token number (daily auto-increment token, e.g. T-101, T-102 etc.)
    const today = new Date();
    const dateStr = today.getFullYear().toString().slice(-2) + (today.getMonth()+1).toString().padStart(2, '0') + today.getDate().toString().padStart(2, '0');
    
    // Count orders today to generate token
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const [countToday] = await connection.query(
      'SELECT COUNT(id) as count FROM orders WHERE order_date >= ?',
      [formatLocalTimestamp(todayStart)]
    );
    const tokenSeq = (countToday[0].count + 1).toString().padStart(3, '0');
    const tokenNumber = `T-${tokenSeq}`;

    // Serialize payment details if split billing
    const paymentDetailsStr = payment_details ? (typeof payment_details === 'string' ? payment_details : JSON.stringify(payment_details)) : null;

    // 4. Write order headers
    const [orderResult] = await connection.query(
      'INSERT INTO orders (token_number, total_amount, gst_amount, payment_mode, status, discount_type, discount_value, discount_amount, discount_reference, payment_details, customer_id, billing_staff_id, is_upsold, order_source, customer_name, customer_phone, pickup_slot, customer_staff_id) VALUES (?, ?, ?, ?, "Pending", ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [tokenNumber, finalPayable, gstTotal, payment_mode, discount_type, parseFloat(discount_value), parseFloat(discount_amount), discount_reference, paymentDetailsStr, customer_id ? parseInt(customer_id) : null, billing_staff_id ? parseInt(billing_staff_id) : null, is_upsold ? 1 : 0, order_source, customer_name, customer_phone, pickup_slot, customer_staff_id ? parseInt(customer_staff_id) : null]
    );
    const orderId = orderResult.insertId;

    // Credit Ledger Entry if credit payment
    if (payment_mode === 'Credit') {
      if (!customer_id) {
        throw new Error('Customer ID is required for Credit transactions.');
      }
      await connection.query(
        'INSERT INTO credit_ledger (customer_id, order_id, amount, type, notes) VALUES (?, ?, ?, "Credit", ?)',
        [parseInt(customer_id), orderId, finalPayable, `Order Token Checkout (Token: ${tokenNumber})`]
      );
    }

    // ─── RFID Wallet / Mess Plan Deduction ────────────────────────────────────
    if (payment_mode === 'RFID Wallet' || payment_mode === 'Mess Plan') {
      if (!customer_id) {
        throw new Error(`Customer ID is required for ${payment_mode} payments. Please scan the RFID card first.`);
      }
      const custId = parseInt(customer_id);
      const [custRows] = await connection.query('SELECT * FROM customers WHERE id = ? FOR UPDATE', [custId]);
      if (custRows.length === 0) throw new Error('Customer not found for RFID payment.');
      const cust = custRows[0];

      if (payment_mode === 'RFID Wallet') {
        const currentBal = parseFloat(cust.wallet_balance || 0);
        if (currentBal < finalPayable) {
          throw new Error(`Insufficient wallet balance. Available: ₹${currentBal.toFixed(2)}, Required: ₹${finalPayable.toFixed(2)}`);
        }
        const newBal = parseFloat((currentBal - finalPayable).toFixed(2));
        await connection.query('UPDATE customers SET wallet_balance = ? WHERE id = ?', [newBal, custId]);
        await connection.query(
          `INSERT INTO wallet_transactions (customer_id, vendor_id, type, amount, meals_count, balance_after, meals_after, reference_id, description)
           VALUES (?, ?, 'debit', ?, 0, ?, ?, ?, ?)`,
          [custId, vendor_id || null, finalPayable, newBal, cust.mess_meals_left || 0, String(orderId), `Order Payment (Token: ${tokenNumber})`]
        );
      } else if (payment_mode === 'Mess Plan') {
        // Validate all items are mess-eligible
        const nonEligible = validatedItems.filter(vi => !vi.mess_eligible);
        if (nonEligible.length > 0) {
          const names = nonEligible.map(i => i.name).join(', ');
          throw new Error(`Mess Plan cannot be used for: ${names}. Only mess-eligible items can be redeemed with meal credits.`);
        }
        const mealsLeft = parseInt(cust.mess_meals_left || 0);
        if (mealsLeft < 1) throw new Error('No mess meals remaining on this card.');
        if (cust.mess_valid_until && new Date(cust.mess_valid_until) < new Date()) {
          throw new Error('Mess subscription has expired. Please renew the plan.');
        }
        const newMeals = mealsLeft - 1;
        await connection.query('UPDATE customers SET mess_meals_left = ? WHERE id = ?', [newMeals, custId]);
        await connection.query(
          `INSERT INTO wallet_transactions (customer_id, vendor_id, type, amount, meals_count, balance_after, meals_after, reference_id, description)
           VALUES (?, ?, 'debit', 0, -1, ?, ?, ?, ?)`,
          [custId, vendor_id || null, parseFloat(cust.wallet_balance || 0), newMeals, String(orderId), `Mess Meal Used (Token: ${tokenNumber})`]
        );
      }
    }
    // Loyalty logic moved to after commit to prevent deadlock

    // 5. Write order line items
    for (const valItem of validatedItems) {
      await connection.query(
        'INSERT INTO order_items (order_id, item_id, quantity, price, recorded_cogs, spice_level, special_instructions) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [orderId, valItem.id, valItem.quantity, valItem.priceSnapshot, valItem.recordedCogs || 0, valItem.spice_level, valItem.special_instructions]
      );
    }

    await connection.commit();

    // ──────────────────────────────────────────────────────────────────────────
    // ─── Loyalty Redemption & Awarding (After Commit to Avoid Deadlocks) ──
    // ──────────────────────────────────────────────────────────────────────────
    if (loyalty_redeem_points > 0 && customer_id) {
      try {
        await crm.redeemLoyaltyPoints(parseInt(customer_id), parseInt(loyalty_redeem_points), orderId);
        console.log(`[CRM] Redeemed ${loyalty_redeem_points} loyalty points for customer ${customer_id} on order ${orderId}`);
      } catch (loyaltyErr) {
        // Log but do NOT fail the order — the discount was already calculated server-side
        console.error('[CRM] Loyalty redeem err during order:', loyaltyErr.message);
      }
    }

    if (customer_id) {
      crm.awardLoyaltyPoints(parseInt(customer_id), orderId, finalPayable)
        .catch(e => console.error('[CRM] Loyalty award err:', e.message));
    }
    // ──────────────────────────────────────────────────────────────────────────    // ==========================================
    // 7. PRE-FORMATTED PRINT RECEIPTS (KOT & BILL)
    // ==========================================
    
    // Thermal Bill Layout
    let billPrint = `
========================================
         CAMPUS CANTEEN BILL            
========================================
Token No: ${tokenNumber}
Date: ${today.toLocaleString()}
Order ID: #${orderId}
Payment: ${payment_mode}
----------------------------------------
Item                 Qty   Price   Total
----------------------------------------
`;
    validatedItems.forEach(item => {
      const namePad = item.name.substring(0, 20).padEnd(20, ' ');
      const qtyPad = item.quantity.toString().padStart(4, ' ');
      const pricePad = parseFloat(item.priceSnapshot).toFixed(2).padStart(7, ' ');
      const totalPad = (item.quantity * item.priceSnapshot).toFixed(2).padStart(8, ' ');
      billPrint += `${namePad}${qtyPad}${pricePad}${totalPad}\n`;
      if (item.childItems && item.childItems.length > 0) {
        item.childItems.forEach(child => {
          const childLine = `  - ${child.child_name} (x${child.quantity * item.quantity})`;
          billPrint += `${childLine.substring(0, 40)}\n`;
        });
      }
    });

    billPrint += `----------------------------------------\n`;
    
    if (parseFloat(discount_amount) > 0) {
      billPrint += `Subtotal:               ₹${subtotal.toFixed(2).padStart(15, ' ')}\n`;
      const discLabel = `Discount (${discount_type}${discount_reference ? ' - ' + discount_reference : ''}):`;
      billPrint += `${discLabel.padEnd(24, ' ')} -₹${parseFloat(discount_amount).toFixed(2).padStart(14, ' ')}\n`;
    }
    
    billPrint += `GST (incl.):            ₹${gstTotal.toFixed(2).padStart(15, ' ')}
Total Net:              ₹${finalPayable.toFixed(2).padStart(15, ' ')}
========================================
`;
    if (payment_mode === 'Split' && paymentDetailsStr) {
      const splits = JSON.parse(paymentDetailsStr);
      billPrint += `         SPLIT PAYMENTS BREAKDOWN       \n`;
      splits.forEach((split, sIdx) => {
        const line = ` Split ${sIdx + 1} (${split.mode}):`;
        billPrint += `${line.padEnd(24, ' ')}  ₹${parseFloat(split.amount).toFixed(2).padStart(14, ' ')}\n`;
      });
      billPrint += `========================================\n`;
    }
    billPrint += `     Thank you! Enjoy your meal!        
========================================
\n\n`;

    // Thermal KOT (Kitchen Order Ticket) Layout
    let kotPrint = `
========================================
         KITCHEN ORDER TICKET           
========================================
Token No: ${tokenNumber}
Date: ${today.toLocaleString()}
Order ID: #${orderId}
Source: ${order_source}
Customer: ${customer_name || 'N/A'}
Phone: ${customer_phone || 'N/A'}
----------------------------------------
Item                 Qty
----------------------------------------
`;
    validatedItems.forEach(item => {
      const namePad = item.name.substring(0, 28).padEnd(28, ' ');
      const qtyPad = item.quantity.toString().padStart(4, ' ');
      kotPrint += `${namePad}${qtyPad}\n`;
      if (item.childItems && item.childItems.length > 0) {
        item.childItems.forEach(child => {
          const childLine = `  - ${child.child_name} (x${child.quantity * item.quantity})`;
          kotPrint += `${childLine.substring(0, 40)}\n`;
        });
      }
    });
    kotPrint += `----------------------------------------
            * RUSH HOUR ORDER *         
========================================
\n\n`;

    res.status(201).json({
      success: true,
      order_id: orderId,
      token_number: tokenNumber,
      total_amount: finalPayable,
      gst_amount: gstTotal,
      payment_mode,
      receipts: {
        bill: billPrint,
        kot: kotPrint
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('POS Checkout Failed:', error.message);
    res.status(500).json({ error: error.message || 'POS Checkout Transaction Failed' });
  } finally {
    connection.release();
  }
});


// ==========================================
// 7. KITCHEN DISPLAY SYSTEM (KDS) APIS
// ==========================================

// Get active kitchen orders (Pending + Preparing) with items — polled every 5s by KDS
app.get('/api/kds/orders', async (req, res) => {
  let vendor_id = req.query.vendor_id;
  if (req.user && req.user.vendor_id) {
    vendor_id = req.user.vendor_id;
  }
  try {
    let ordersQuery = '';
    let ordersParams = [];

    const isSpecificStall = (vendor_id && vendor_id !== 'all' && vendor_id !== 'null');

    if (isSpecificStall) {
      const vId = parseInt(vendor_id);
      ordersQuery = `
        SELECT DISTINCT o.id, o.token_number, o.order_date, o.status, o.payment_mode, o.total_amount,
               o.order_source, o.customer_name, o.customer_phone, o.pickup_slot,
               TIMESTAMPDIFF(SECOND, o.order_date, NOW()) as elapsed_seconds
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN items i ON oi.item_id = i.id
        WHERE o.status IN ('Pending', 'Preparing')
          AND i.vendor_id = ?
        ORDER BY o.order_date ASC
      `;
      ordersParams.push(vId);
    } else {
      ordersQuery = `
        SELECT id, token_number, order_date, status, payment_mode, total_amount,
               order_source, customer_name, customer_phone, pickup_slot,
               TIMESTAMPDIFF(SECOND, order_date, NOW()) as elapsed_seconds
        FROM orders
        WHERE status IN ('Pending', 'Preparing')
        ORDER BY order_date ASC
      `;
    }

    const [orders] = await pool.query(ordersQuery, ordersParams);
    if (orders.length === 0) return res.json([]);

    const orderIds = orders.map(o => o.id);
    let itemsQuery = `
      SELECT oi.order_id, oi.quantity, oi.price, oi.spice_level, oi.special_instructions, i.name, i.category, i.vendor_id
      FROM order_items oi
      JOIN items i ON oi.item_id = i.id
      WHERE oi.order_id IN (?)
    `;
    let itemsParams = [orderIds];

    if (isSpecificStall) {
      itemsQuery += ` AND i.vendor_id = ?`;
      itemsParams.push(parseInt(vendor_id));
    }

    const [items] = await pool.query(itemsQuery, itemsParams);

    const itemsByOrder = {};
    items.forEach(item => {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    });

    const result = orders.map(order => ({
      ...order,
      elapsed_seconds: Math.max(0, order.elapsed_seconds || 0),
      items: itemsByOrder[order.id] || []
    }));

    res.json(result);
  } catch (error) {
    console.error('KDS fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch KDS orders' });
  }
});

// Update order status (Pending → Preparing → Ready → Completed)
app.put('/api/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, cancellation_reason } = req.body;

  const validStatuses = ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const [existing] = await pool.query('SELECT id, status FROM orders WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Enforce valid transitions
    const currentStatus = existing[0].status;
    const allowedTransitions = {
      'Pending': ['Preparing', 'Cancelled'],
      'Preparing': ['Ready', 'Cancelled'],
      'Ready': ['Completed', 'Cancelled'],
      'Completed': [],
      'Cancelled': []
    };

    if (!allowedTransitions[currentStatus]?.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from "${currentStatus}" to "${status}". Allowed: ${allowedTransitions[currentStatus].join(', ') || 'none'}`
      });
    }

    if (status === 'Cancelled') {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Update status & cancellation reason
        await connection.query(
          'UPDATE orders SET status = "Cancelled", cancellation_reason = ? WHERE id = ?',
          [cancellation_reason || 'No reason provided', id]
        );

        // Fetch order items
        const [orderItems] = await connection.query(
          'SELECT item_id, quantity FROM order_items WHERE order_id = ?',
          [id]
        );

        for (const item of orderItems) {
          const itemQty = parseInt(item.quantity);

          // Check if it is a combo item
          const [comboRows] = await connection.query('SELECT * FROM combo_items WHERE combo_id = ?', [item.item_id]);
          if (comboRows.length > 0) {
            for (const comboItem of comboRows) {
              const childQty = comboItem.quantity * itemQty;
              const [recipesRows] = await connection.query('SELECT * FROM recipes WHERE item_id = ?', [comboItem.child_item_id]);
              for (const recipe of recipesRows) {
                const matId = recipe.material_id;
                const qtyRestored = parseFloat(recipe.quantity) * childQty;
                
                const [matRows] = await connection.query('SELECT vendor_id FROM raw_materials WHERE id = ?', [matId]);
                const matVendorId = matRows.length > 0 ? matRows[0].vendor_id : null;

                await connection.query('UPDATE raw_materials SET stock_level = stock_level + ? WHERE id = ?', [qtyRestored, matId]);
                await connection.query(
                  'INSERT INTO stock_logs (material_id, change_qty, log_type, reason, vendor_id) VALUES (?, ?, "Adjustment", ?, ?)',
                  [matId, qtyRestored, `Order Cancellation Reversion (Combo Component of Order #${id})`, matVendorId]
                );
              }
            }
          } else {
            // Normal item
            const [recipesRows] = await connection.query('SELECT * FROM recipes WHERE item_id = ?', [item.item_id]);
            for (const recipe of recipesRows) {
              const matId = recipe.material_id;
              const qtyRestored = parseFloat(recipe.quantity) * itemQty;

              const [matRows] = await connection.query('SELECT vendor_id FROM raw_materials WHERE id = ?', [matId]);
              const matVendorId = matRows.length > 0 ? matRows[0].vendor_id : null;

              await connection.query('UPDATE raw_materials SET stock_level = stock_level + ? WHERE id = ?', [qtyRestored, matId]);
              await connection.query(
                'INSERT INTO stock_logs (material_id, change_qty, log_type, reason, vendor_id) VALUES (?, ?, "Adjustment", ?, ?)',
                [matId, qtyRestored, `Order Cancellation Reversion (Order #${id})`, matVendorId]
              );
            }
          }
        }

        await connection.commit();
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } else if (status === 'Preparing') {
      await pool.query('UPDATE orders SET status = ?, preparation_start = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
    } else if (status === 'Ready' || status === 'Completed') {
      await pool.query('UPDATE orders SET status = ?, preparation_end = IFNULL(preparation_end, CURRENT_TIMESTAMP) WHERE id = ?', [status, id]);
    } else {
      await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    }

    // CRM: Send order-ready notification to customer
    if (status === 'Ready') {
      try {
        const [orderInfo] = await pool.query(
          'SELECT id, token_number, customer_name, customer_phone FROM orders WHERE id=?', [id]
        );
        if (orderInfo.length) {
          crm.sendOrderReadyNotification(orderInfo[0]).catch(e => console.error('[CRM] Ready notify err:', e.message));
        }
      } catch(crmErr) { console.error('[CRM] Hook err:', crmErr.message); }
    }
    res.json({ success: true, message: `Order #${id} status updated to ${status}` });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Get completed orders from last 2 hours (KDS History for disputes)
app.get('/api/kds/history', async (req, res) => {
  let vendor_id = req.query.vendor_id;
  if (req.user && req.user.vendor_id) {
    vendor_id = req.user.vendor_id;
  }
  try {
    let ordersQuery = '';
    let ordersParams = [];

    const isSpecificStall = (vendor_id && vendor_id !== 'all' && vendor_id !== 'null');

    if (isSpecificStall) {
      const vId = parseInt(vendor_id);
      ordersQuery = `
        SELECT DISTINCT o.id, o.token_number, o.order_date, o.status, o.payment_mode, o.total_amount,
               o.order_source, o.customer_name, o.customer_phone, o.pickup_slot
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN items i ON oi.item_id = i.id
        WHERE o.status IN ('Ready', 'Completed')
          AND o.order_date >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
          AND i.vendor_id = ?
        ORDER BY o.order_date DESC
      `;
      ordersParams.push(vId);
    } else {
      ordersQuery = `
        SELECT id, token_number, order_date, status, payment_mode, total_amount,
               order_source, customer_name, customer_phone, pickup_slot
        FROM orders
        WHERE status IN ('Ready', 'Completed')
          AND order_date >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
        ORDER BY order_date DESC
      `;
    }

    const [orders] = await pool.query(ordersQuery, ordersParams);
    if (orders.length === 0) return res.json([]);

    const orderIds = orders.map(o => o.id);
    let itemsQuery = `
      SELECT oi.order_id, oi.quantity, oi.price, oi.spice_level, oi.special_instructions, i.name, i.category, i.vendor_id
      FROM order_items oi
      JOIN items i ON oi.item_id = i.id
      WHERE oi.order_id IN (?)
    `;
    let itemsParams = [orderIds];

    if (isSpecificStall) {
      itemsQuery += ` AND i.vendor_id = ?`;
      itemsParams.push(parseInt(vendor_id));
    }

    const [items] = await pool.query(itemsQuery, itemsParams);

    const itemsByOrder = {};
    items.forEach(item => {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    });

    const result = orders.map(order => ({
      ...order,
      items: itemsByOrder[order.id] || []
    }));

    res.json(result);
  } catch (error) {
    console.error('KDS history error:', error);
    res.status(500).json({ error: 'Failed to fetch KDS history' });
  }
});


// Get a single order's status (for customer menu polling)
app.get('/api/orders/:id/status', async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT status, token_number FROM orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(orders[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order status' });
  }
});

// Get all orders with items
app.get('/api/orders', async (req, res) => {
  try {
    const { vendor_id } = req.query;

    let orderQuery;
    let orderParams = [];

    if (vendor_id) {
      // Stall Manager: only orders that contain at least one item from their stall
      orderQuery = `
        SELECT DISTINCT o.*
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        JOIN items i ON oi.item_id = i.id
        WHERE i.vendor_id = ?
        ORDER BY o.order_date DESC
        LIMIT 200
      `;
      orderParams = [vendor_id];
    } else {
      // Central Admin: all orders
      orderQuery = 'SELECT * FROM orders ORDER BY order_date DESC LIMIT 200';
    }

    const [orders] = await pool.query(orderQuery, orderParams);
    if (orders.length === 0) return res.json([]);

    const orderIds = orders.map(o => o.id);
    const [items] = await pool.query(`
      SELECT oi.order_id, oi.item_id, oi.quantity, oi.price, oi.spice_level, oi.special_instructions,
             i.name, i.vendor_id,
             v.name AS vendor_name, v.stall_number
      FROM order_items oi
      JOIN items i ON oi.item_id = i.id
      LEFT JOIN vendors v ON i.vendor_id = v.id
      WHERE oi.order_id IN (?)
    `, [orderIds]);

    const itemsByOrder = {};
    items.forEach(item => {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    });

    // If filtering by vendor_id, only include items from that vendor in each order
    const result = orders.map(order => {
      const filteredItems = vendor_id
        ? (itemsByOrder[order.id] || []).filter(it => String(it.vendor_id) === String(vendor_id))
        : (itemsByOrder[order.id] || []);

      let vendorTotal = parseFloat(order.total_amount);
      let vendorGst = parseFloat(order.gst_amount || 0);

      if (vendor_id && filteredItems.length > 0) {
        vendorTotal = filteredItems.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
        // Approximate GST for this vendor's portion
        const ratio = parseFloat(order.total_amount) > 0 ? (vendorTotal / parseFloat(order.total_amount)) : 0;
        vendorGst = (parseFloat(order.gst_amount || 0) * ratio);
      }

      return {
        ...order,
        total_amount: vendor_id ? vendorTotal : order.total_amount,
        gst_amount: vendor_id ? vendorGst : order.gst_amount,
        items: filteredItems
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ==========================================
// 8. MULTI-VENDOR MANAGEMENT APIS
// ==========================================

// Get all vendors
app.get('/api/vendors', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vendors ORDER BY name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// Add a vendor
app.post('/api/vendors', async (req, res) => {
  const { name, gstin, bank_account, contact, stall_number, commission_rate, share_area } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Vendor name is required.' });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO vendors (name, gstin, bank_account, contact, stall_number, commission_rate, share_area) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, gstin || null, bank_account || null, contact || null, stall_number || null, commission_rate || 10.00, share_area || 10.00]
    );
    res.status(201).json({
      id: result.insertId,
      name, gstin, bank_account, contact, stall_number,
      commission_rate: parseFloat(commission_rate || 10.00),
      share_area: parseFloat(share_area || 10.00)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// Update a vendor
app.put('/api/vendors/:id', async (req, res) => {
  const { id } = req.params;
  const { name, gstin, bank_account, contact, stall_number, commission_rate, share_area } = req.body;
  try {
    const [existing] = await pool.query('SELECT * FROM vendors WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    const v = existing[0];
    const updateName = name !== undefined ? name : v.name;
    const updateGstin = gstin !== undefined ? gstin : v.gstin;
    const updateBank = bank_account !== undefined ? bank_account : v.bank_account;
    const updateContact = contact !== undefined ? contact : v.contact;
    const updateStall = stall_number !== undefined ? stall_number : v.stall_number;
    const updateComm = commission_rate !== undefined ? commission_rate : v.commission_rate;
    const updateArea = share_area !== undefined ? share_area : v.share_area;

    await pool.query(
      `UPDATE vendors SET name = ?, gstin = ?, bank_account = ?, contact = ?, stall_number = ?, commission_rate = ?, share_area = ? 
       WHERE id = ?`,
      [updateName, updateGstin, updateBank, updateContact, updateStall, updateComm, updateArea, id]
    );

    res.json({
      id: parseInt(id),
      name: updateName,
      gstin: updateGstin,
      bank_account: updateBank,
      contact: updateContact,
      stall_number: updateStall,
      commission_rate: parseFloat(updateComm),
      share_area: parseFloat(updateArea)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// Delete a vendor
app.delete('/api/vendors/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM vendors WHERE id = ?', [id]);
    res.json({ success: true, message: 'Vendor deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete vendor' });
  }
});

// Get vendor performance analytics
app.get('/api/vendors/performance', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        v.id, v.name, v.stall_number,
        COUNT(DISTINCT o.id) as footfall,
        IFNULL(SUM(oi.quantity * oi.price), 0) as total_sales,
        IFNULL(SUM(oi.quantity * oi.price) / NULLIF(COUNT(DISTINCT o.id), 0), 0) as aov
      FROM vendors v
      LEFT JOIN items i ON v.id = i.vendor_id
      LEFT JOIN order_items oi ON i.id = oi.item_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'Cancelled'
      GROUP BY v.id
      ORDER BY total_sales DESC
    `);
    
    const formatted = rows.map(r => ({
      id: r.id,
      vendor_id: r.id,
      name: r.name,
      vendor_name: r.name,
      stall_number: r.stall_number,
      footfall: parseInt(r.footfall),
      total_orders: parseInt(r.footfall),
      total_sales: parseFloat(r.total_sales),
      aov: parseFloat(r.aov)
    }));
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendor performance' });
  }
});

// Stall-specific performance with optional date range filter
app.get('/api/vendors/performance/my-stats', async (req, res) => {
  const vendorId = req.user.vendor_id;
  if (!vendorId) {
    return res.status(400).json({ error: 'This endpoint is for stall managers only.' });
  }

  const { startDate, endDate } = req.query;
  const hasDateFilter = startDate && endDate;

  try {
    // Summary KPIs — filtered by date range if provided
    const summaryDateClause = hasDateFilter
      ? `AND DATE(o.order_date) BETWEEN '${startDate}' AND '${endDate}'`
      : '';

    const [summary] = await pool.query(`
      SELECT
        v.id, v.name, v.stall_number,
        COUNT(DISTINCT o.id) as footfall,
        IFNULL(SUM(IF(o.id IS NOT NULL, oi.quantity * oi.price, 0)), 0) as total_sales,
        IFNULL(SUM(IF(o.id IS NOT NULL, oi.quantity * oi.price, 0)) / NULLIF(COUNT(DISTINCT o.id), 0), 0) as aov,
        COUNT(DISTINCT i.id) as total_menu_items
      FROM vendors v
      LEFT JOIN items i ON v.id = i.vendor_id
      LEFT JOIN order_items oi ON i.id = oi.item_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'Cancelled' ${summaryDateClause}
      WHERE v.id = ?
      GROUP BY v.id
    `, [vendorId]);

    // Daily breakdown for the last 30 days if no date filter
    const trendDateClause = hasDateFilter 
      ? `AND DATE(o.order_date) BETWEEN '${startDate}' AND '${endDate}'`
      : `AND o.order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;

    const [dailyRows] = await pool.query(`
      SELECT
        DATE(o.order_date) as date,
        COUNT(DISTINCT o.id) as orders,
        IFNULL(SUM(oi.quantity * oi.price), 0) as revenue
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN items i ON oi.item_id = i.id
      WHERE i.vendor_id = ? AND o.status != 'Cancelled' ${trendDateClause}
      GROUP BY DATE(o.order_date)
      ORDER BY date ASC
    `, [vendorId]);

    // Top Items
    const [topItems] = await pool.query(`
      SELECT 
        i.name, 
        SUM(oi.quantity) as qty_sold 
      FROM order_items oi
      JOIN items i ON oi.item_id = i.id
      JOIN orders o ON oi.order_id = o.id
      WHERE i.vendor_id = ? AND o.status != 'Cancelled' ${trendDateClause}
      GROUP BY i.id, i.name
      ORDER BY qty_sold DESC
      LIMIT 5
    `, [vendorId]);

    // Source Breakdown
    const [sourceBreakdown] = await pool.query(`
      SELECT 
        IFNULL(o.order_source, 'POS') as source, 
        COUNT(DISTINCT o.id) as count 
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN items i ON oi.item_id = i.id
      WHERE i.vendor_id = ? AND o.status != 'Cancelled' ${trendDateClause}
      GROUP BY source
    `, [vendorId]);

    res.json({
      summary: summary[0] || { footfall: 0, total_sales: 0, aov: 0, total_menu_items: 0, name: 'My Stall' },
      dailyTrend: dailyRows.map(d => ({
        date: d.date,
        orders: parseInt(d.orders),
        revenue: parseFloat(d.revenue)
      })),
      topItems: topItems.map(t => ({
        name: t.name,
        qty_sold: parseInt(t.qty_sold)
      })),
      sourceBreakdown: sourceBreakdown.map(s => ({
        source: s.source,
        count: parseInt(s.count)
      })),
      dateFiltered: hasDateFilter,
      startDate: startDate || null,
      endDate: endDate || null
    });
  } catch (error) {
    console.error('Error fetching my stall stats:', error);
    res.status(500).json({ error: 'Failed to fetch stall performance stats' });
  }
});

// Calculate settlements & split common area costs
app.post('/api/vendors/settlements/calculate', async (req, res) => {
  const { startDate, endDate, totalCommonAreaCost, totalCost: totalCostAlt, splitMethod } = req.body;
  const cost = totalCommonAreaCost !== undefined ? totalCommonAreaCost : totalCostAlt;
  if (!startDate || !endDate || cost === undefined || !splitMethod) {
    return res.status(400).json({ error: 'startDate, endDate, totalCommonAreaCost, and splitMethod are required.' });
  }

  const startStr = `${startDate} 00:00:00`;
  const endStr = `${endDate} 23:59:59`;
  const totalCost = parseFloat(cost);

  try {
    // 0. Check for overlaps — strict block (no overwrite allowed)
    const [overlaps] = await pool.query(`
      SELECT id, start_date, end_date, status FROM vendor_settlements 
      WHERE start_date <= ? AND end_date >= ?
    `, [endDate, startDate]);

    if (overlaps.length > 0) {
      return res.status(400).json({ error: "Overlapping occurred and blocked." });
    }
    // 1. Get gross sales & info for all vendors in this period
    const [vendorsSales] = await pool.query(`
      SELECT 
        v.id as vendor_id,
        v.name,
        v.commission_rate,
        v.share_area,
        IFNULL(SUM(oi.quantity * oi.price), 0) as gross_sales
      FROM vendors v
      LEFT JOIN items i ON v.id = i.vendor_id
      LEFT JOIN order_items oi ON i.id = oi.item_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'Cancelled' AND o.order_date BETWEEN ? AND ?
      GROUP BY v.id
    `, [startStr, endStr]);

    if (vendorsSales.length === 0) {
      return res.status(400).json({ error: 'No vendors found to settle.' });
    }

    const totalStallArea = vendorsSales.reduce((sum, v) => sum + parseFloat(v.share_area || 0), 0);
    const totalGrossSales = vendorsSales.reduce((sum, v) => sum + parseFloat(v.gross_sales || 0), 0);

    const settlements = [];

    for (const v of vendorsSales) {
      let allocatedCost = 0;
      if (splitMethod === 'Equal') {
        allocatedCost = totalCost / vendorsSales.length;
      } else if (splitMethod === 'Stall Area') {
        allocatedCost = totalStallArea > 0 ? totalCost * (parseFloat(v.share_area || 0) / totalStallArea) : totalCost / vendorsSales.length;
      } else if (splitMethod === 'Sales Percentage') {
        allocatedCost = totalGrossSales > 0 ? totalCost * (parseFloat(v.gross_sales || 0) / totalGrossSales) : totalCost / vendorsSales.length;
      }

      const gross = parseFloat(v.gross_sales);
      const commission = gross * (parseFloat(v.commission_rate || 10.00) / 100);
      const duesToAdmin = commission + allocatedCost;

      // 2. Insert into vendor_settlements
      const netPayout = gross - duesToAdmin;
      const [insertResult] = await pool.query(`
        INSERT INTO vendor_settlements (vendor_id, start_date, end_date, gross_sales, commission_amount, common_area_cost, net_payout, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
      `, [v.vendor_id, startDate, endDate, gross, commission, allocatedCost, netPayout]);

      settlements.push({
        id: insertResult.insertId,
        vendor_id: v.vendor_id,
        vendor_name: v.name,
        start_date: startDate,
        end_date: endDate,
        gross_sales: gross,
        commission_amount: commission,
        common_area_cost: allocatedCost,
        dues_to_admin: duesToAdmin,
        status: 'Pending'
      });
    }

    res.json({ success: true, message: 'Settlements calculated successfully', settlements });
  } catch (error) {
    console.error('Settlement calculation failed:', error);
    res.status(500).json({ error: 'Failed to calculate settlements' });
  }
});

// Get settlements list
app.get('/api/vendors/settlements', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, v.name as vendor_name, v.stall_number, 
             (s.commission_amount + s.common_area_cost) AS dues_to_admin
      FROM vendor_settlements s
      JOIN vendors v ON s.vendor_id = v.id
      ORDER BY s.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settlements' });
  }
});

// Pay/Settle a settlement
app.put('/api/vendors/settlements/:id/settle', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      `UPDATE vendor_settlements SET status = 'Settled', settled_at = NOW() WHERE id = ?`,
      [id]
    );
    res.json({ success: true, message: 'Settlement status updated to Settled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settlement' });
  }
});

// Get settlement dues for the logged-in stall manager
app.get('/api/vendors/settlements/my-dues', async (req, res) => {
  const vendorId = req.user && req.user.vendor_id;
  if (!vendorId) {
    return res.status(403).json({ error: 'Only stall managers can access this endpoint.' });
  }
  try {
    const [rows] = await pool.query(`
      SELECT s.id, s.start_date, s.end_date, s.gross_sales, s.commission_amount,
             s.common_area_cost, s.net_payout, s.status, s.settled_at, s.created_at,
             (s.commission_amount + s.common_area_cost) AS dues_to_admin
      FROM vendor_settlements s
      WHERE s.vendor_id = ?
      ORDER BY s.start_date DESC
    `, [vendorId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching stall dues:', error);
    res.status(500).json({ error: 'Failed to fetch settlement dues' });
  }
});

// ==========================================
// 8.5 CENTRAL ORDER SETTLEMENTS (Task 5)
// ==========================================

// Get all stalls with their total pending payout (centrally placed POS/QR orders)
app.get('/api/vendors/central-settlements/pending', async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const [rows] = await pool.query(`
      SELECT 
        v.id, 
        v.name, 
        v.stall_number, 
        v.commission_rate,
        IFNULL((
          SELECT SUM(oi.quantity * oi.price)
          FROM order_items oi
          JOIN items i ON oi.item_id = i.id
          JOIN orders o ON oi.order_id = o.id
          LEFT JOIN staff s ON o.billing_staff_id = s.id
          WHERE i.vendor_id = v.id
            AND oi.central_settlement_id IS NULL
            AND o.status != 'Cancelled'
            AND o.tenant_id = ?
            AND (o.order_source = 'QR' OR o.billing_staff_id IS NULL OR s.vendor_id IS NULL)
        ), 0) AS pending_amount
      FROM vendors v
      WHERE v.tenant_id = ?
    `, [tenantId, tenantId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching pending central settlements:', error);
    res.status(500).json({ error: 'Failed to fetch pending central settlements' });
  }
});

// Get pending itemized central orders for a specific vendor
app.get('/api/vendors/central-settlements/pending/:vendorId', async (req, res) => {
  const { vendorId } = req.params;
  const tenantId = req.user.tenant_id;
  try {
    const [rows] = await pool.query(`
      SELECT 
        oi.id AS order_item_id,
        o.id AS order_id,
        o.token_number,
        o.order_date,
        o.order_source,
        i.name AS item_name,
        oi.quantity,
        oi.price,
        (oi.quantity * oi.price) AS total_price
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN items i ON oi.item_id = i.id
      LEFT JOIN staff s ON o.billing_staff_id = s.id
      WHERE oi.central_settlement_id IS NULL
        AND i.vendor_id = ?
        AND o.status != 'Cancelled'
        AND (o.order_source = 'QR' OR (o.order_source = 'POS' AND (o.billing_staff_id IS NULL OR s.vendor_id IS NULL)))
        AND o.tenant_id = ?
      ORDER BY o.order_date DESC
    `, [vendorId, tenantId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching pending items for vendor:', error);
    res.status(500).json({ error: 'Failed to fetch pending items' });
  }
});

// Process a payout settlement for a vendor
app.post('/api/vendors/central-settlements/settle', async (req, res) => {
  const { vendorId, orderItemIds, amount } = req.body;
  const tenantId = req.user.tenant_id;
  if (!vendorId || !orderItemIds || !Array.isArray(orderItemIds) || orderItemIds.length === 0 || amount === undefined) {
    return res.status(400).json({ error: 'vendorId, orderItemIds (array), and amount are required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert payout record
    const [insertResult] = await connection.query(`
      INSERT INTO central_settlements (vendor_id, amount, tenant_id)
      VALUES (?, ?, ?)
    `, [vendorId, parseFloat(amount), tenantId]);

    const settlementId = insertResult.insertId;

    // 2. Mark order items as settled
    await connection.query(`
      UPDATE order_items 
      SET central_settlement_id = ? 
      WHERE id IN (?)
    `, [settlementId, orderItemIds]);

    await connection.commit();
    res.json({ success: true, message: 'Payout settled successfully', settlementId });
  } catch (error) {
    await connection.rollback();
    console.error('Settle transaction failed:', error);
    res.status(500).json({ error: 'Failed to process payout settlement' });
  } finally {
    connection.release();
  }
});

// Get settlement history
app.get('/api/vendors/central-settlements/history', async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const [rows] = await pool.query(`
      SELECT 
        cs.id,
        cs.amount,
        cs.settled_at,
        v.name as vendor_name,
        v.stall_number
      FROM central_settlements cs
      JOIN vendors v ON cs.vendor_id = v.id
      WHERE cs.tenant_id = ?
      ORDER BY cs.settled_at DESC
    `, [tenantId]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching settlement history:', error);
    res.status(500).json({ error: 'Failed to fetch settlement history' });
  }
});

// ==========================================
// 9. STAFF CRUD API (HR)
// ==========================================

// Get all staff
app.get('/api/staff', async (req, res) => {
  try {
    let query = 'SELECT * FROM staff';
    const params = [];
    if (req.user.vendor_id) {
      query += ' WHERE vendor_id = ?';
      params.push(req.user.vendor_id);
    }
    query += ' ORDER BY name';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// Get staff performance metrics
app.get('/api/staff/performance', async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate query parameters are required.' });
  }

  const startDateTime = `${startDate} 00:00:00`;
  const endDateTime = `${endDate} 23:59:59`;

  try {
    const [staffMetrics] = await pool.query(`
      SELECT
        s.id as staff_id,
        s.name as staff_name,
        s.role,
        IFNULL(att.days_present, 0) as days_present,
        IFNULL(att.total_records, 0) as total_attendance_records,
        IFNULL(att.late_days, 0) as late_days,
        IFNULL(lv.leaves_taken, 0) as leaves_taken,
        IFNULL(meals.total_meals, 0) as total_meals_consumed,
        IFNULL(meals.meal_cost, 0) as total_meal_cost,
        IFNULL(ord.orders_processed, 0) as orders_processed,
        IFNULL(ord.upsold_orders, 0) as upsold_orders,
        IFNULL(ord.avg_handling_time, 0) as avg_handling_time
      FROM staff s
      LEFT JOIN (
        SELECT staff_id,
          COUNT(*) as total_records,
          SUM(CASE WHEN status IN ('Present', 'Late') THEN 1 WHEN status = 'Half-Day' THEN 0.5 ELSE 0 END) as days_present,
          SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late_days
        FROM attendance
        WHERE attendance_date BETWEEN ? AND ?
        GROUP BY staff_id
      ) att ON s.id = att.staff_id
      LEFT JOIN (
        SELECT staff_id, COUNT(*) as leaves_taken
        FROM leaves
        WHERE status = 'Approved'
          AND (start_date <= ? AND end_date >= ?)
        GROUP BY staff_id
      ) lv ON s.id = lv.staff_id
      LEFT JOIN (
        SELECT o.customer_staff_id as staff_id,
          SUM(oi.quantity) as total_meals,
          SUM(oi.quantity * oi.price) as meal_cost
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.discount_type = 'StaffMeal'
          AND o.order_date BETWEEN ? AND ?
          AND o.status != 'Cancelled'
        GROUP BY o.customer_staff_id
      ) meals ON s.id = meals.staff_id
      LEFT JOIN (
        SELECT 
          billing_staff_id,
          COUNT(*) as orders_processed,
          IFNULL(SUM(is_upsold), 0) as upsold_orders,
          IFNULL(AVG(TIMESTAMPDIFF(SECOND, preparation_start, preparation_end)), 0) as avg_handling_time
        FROM orders
        WHERE order_date BETWEEN ? AND ? AND status IN ('Ready', 'Completed')
        GROUP BY billing_staff_id
      ) ord ON s.id = ord.billing_staff_id
      WHERE s.is_active = 1 AND s.exclude_from_performance = 0
      ORDER BY s.name
    `, [startDateTime, endDateTime, endDateTime, startDateTime, startDateTime, endDateTime, startDateTime, endDateTime]);

    res.json(staffMetrics);
  } catch (error) {
    console.error('Error fetching staff performance:', error);
    res.status(500).json({ error: 'Failed to fetch staff performance' });
  }
});

// Get single staff by ID
app.get('/api/staff/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM staff WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// Add a staff member
app.post('/api/staff', async (req, res) => {
  const {
    name, phone, email, password, role, pay_type, daily_rate, monthly_salary,
    pf_enabled, esi_enabled, tds_percentage, bank_account, joined_at,
    exclude_from_payroll, exclude_from_roster, exclude_from_attendance, exclude_from_performance, vendor_id
  } = req.body;

  let assigned_vendor_id = vendor_id || null;
  if (req.user.vendor_id) {
    assigned_vendor_id = req.user.vendor_id;
  }

  try {
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const [result] = await pool.query(
      `INSERT INTO staff (
        name, phone, email, password_hash, role, pay_type, daily_rate, monthly_salary,
        pf_enabled, esi_enabled, tds_percentage, bank_account, joined_at,
        exclude_from_payroll, exclude_from_roster, exclude_from_attendance, exclude_from_performance, vendor_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, phone, email, passwordHash, role, pay_type, daily_rate || 0, monthly_salary || 0,
        pf_enabled || 0, esi_enabled || 0, tds_percentage || 0.00, bank_account, joined_at,
        exclude_from_payroll || 0, exclude_from_roster || 0, exclude_from_attendance || 0, exclude_from_performance || 0,
        assigned_vendor_id
      ]
    );
    res.status(201).json({
      id: result.insertId,
      name, phone, email, role,
      pay_type: pay_type || 'monthly',
      daily_rate: parseFloat(daily_rate || 0),
      monthly_salary: parseFloat(monthly_salary || 0),
      pf_enabled: pf_enabled ? 1 : 0,
      esi_enabled: esi_enabled ? 1 : 0,
      tds_percentage: parseFloat(tds_percentage || 0),
      bank_account: bank_account || null,
      is_active: 1,
      vendor_id: vendor_id ? parseInt(vendor_id) : null,
      exclude_from_payroll: exclude_from_payroll ? 1 : 0,
      exclude_from_roster: exclude_from_roster ? 1 : 0,
      exclude_from_attendance: exclude_from_attendance ? 1 : 0,
      exclude_from_performance: exclude_from_performance ? 1 : 0
    });
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({ error: 'Failed to create staff member' });
  }
});

// Update a staff member
app.put('/api/staff/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, role, pay_type, daily_rate, monthly_salary, pf_enabled, esi_enabled, tds_percentage, bank_account, is_active, vendor_id, exclude_from_payroll, exclude_from_roster, exclude_from_attendance, exclude_from_performance } = req.body;

  try {
    const [existing] = await pool.query('SELECT * FROM staff WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const s = existing[0];
    const updateName = name !== undefined ? name : s.name;
    const updatePhone = phone !== undefined ? phone : s.phone;
    const updateEmail = email !== undefined ? email : s.email;
    const updateRole = role !== undefined ? role : s.role;
    const updatePayType = pay_type !== undefined ? pay_type : s.pay_type;
    const updateDailyRate = daily_rate !== undefined ? daily_rate : s.daily_rate;
    const updateMonthlySalary = monthly_salary !== undefined ? monthly_salary : s.monthly_salary;
    const updatePf = pf_enabled !== undefined ? (pf_enabled ? 1 : 0) : s.pf_enabled;
    const updateEsi = esi_enabled !== undefined ? (esi_enabled ? 1 : 0) : s.esi_enabled;
    const updateTds = tds_percentage !== undefined ? tds_percentage : s.tds_percentage;
    const updateBank = bank_account !== undefined ? bank_account : s.bank_account;
    const updateActive = is_active !== undefined ? is_active : s.is_active;
    const updateVendor = vendor_id !== undefined ? (vendor_id ? parseInt(vendor_id) : null) : s.vendor_id;
    const updateExclude = exclude_from_payroll !== undefined ? (exclude_from_payroll ? 1 : 0) : s.exclude_from_payroll;
    const updateExcludeRoster = exclude_from_roster !== undefined ? (exclude_from_roster ? 1 : 0) : s.exclude_from_roster;
    const updateExcludeAttendance = exclude_from_attendance !== undefined ? (exclude_from_attendance ? 1 : 0) : s.exclude_from_attendance;
    const updateExcludePerformance = exclude_from_performance !== undefined ? (exclude_from_performance ? 1 : 0) : s.exclude_from_performance;

    let updatePasswordHash = s.password_hash;
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      updatePasswordHash = await bcrypt.hash(req.body.password, salt);
    }

    await pool.query(
      `UPDATE staff SET name = ?, phone = ?, email = ?, role = ?, pay_type = ?, daily_rate = ?, monthly_salary = ?,
       pf_enabled = ?, esi_enabled = ?, tds_percentage = ?, bank_account = ?, is_active = ?, vendor_id = ?, exclude_from_payroll = ?, exclude_from_roster = ?, exclude_from_attendance = ?, exclude_from_performance = ?, password_hash = ? WHERE id = ?`,
      [updateName, updatePhone, updateEmail, updateRole, updatePayType, updateDailyRate, updateMonthlySalary,
       updatePf, updateEsi, updateTds, updateBank, updateActive, updateVendor, updateExclude, updateExcludeRoster, updateExcludeAttendance, updateExcludePerformance, updatePasswordHash, id]
    );

    res.json({
      id: parseInt(id),
      name: updateName,
      phone: updatePhone,
      email: updateEmail,
      role: updateRole,
      pay_type: updatePayType,
      daily_rate: parseFloat(updateDailyRate),
      monthly_salary: parseFloat(updateMonthlySalary),
      pf_enabled: parseInt(updatePf),
      esi_enabled: parseInt(updateEsi),
      tds_percentage: parseFloat(updateTds),
      bank_account: updateBank,
      is_active: parseInt(updateActive),
      vendor_id: updateVendor,
      exclude_from_payroll: parseInt(updateExclude),
      exclude_from_roster: parseInt(updateExcludeRoster),
      exclude_from_attendance: parseInt(updateExcludeAttendance),
      exclude_from_performance: parseInt(updateExcludePerformance)
    });
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ error: 'Failed to update staff member' });
  }
});

// Delete a staff member
app.delete('/api/staff/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM staff WHERE id = ?', [id]);
    res.json({ success: true, message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ error: 'Failed to delete staff member' });
  }
});


// ==========================================
// 10. SHIFTS API
// ==========================================

// Get all shifts
app.get('/api/shifts', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM shifts ORDER BY start_time');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
});

// Add a shift
app.post('/api/shifts', async (req, res) => {
  const { name, start_time, end_time } = req.body;
  if (!name || !start_time || !end_time) {
    return res.status(400).json({ error: 'Name, start_time, and end_time are required.' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO shifts (name, start_time, end_time) VALUES (?, ?, ?)',
      [name, start_time, end_time]
    );
    res.status(201).json({ id: result.insertId, name, start_time, end_time });
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ error: 'Failed to create shift' });
  }
});

// Update a shift
app.put('/api/shifts/:id', async (req, res) => {
  const { id } = req.params;
  const { name, start_time, end_time } = req.body;

  try {
    const [existing] = await pool.query('SELECT * FROM shifts WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    const sh = existing[0];
    const updateName = name !== undefined ? name : sh.name;
    const updateStart = start_time !== undefined ? start_time : sh.start_time;
    const updateEnd = end_time !== undefined ? end_time : sh.end_time;

    await pool.query(
      'UPDATE shifts SET name = ?, start_time = ?, end_time = ? WHERE id = ?',
      [updateName, updateStart, updateEnd, id]
    );

    res.json({ id: parseInt(id), name: updateName, start_time: updateStart, end_time: updateEnd });
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ error: 'Failed to update shift' });
  }
});

// Delete a shift
app.delete('/api/shifts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM shifts WHERE id = ?', [id]);
    res.json({ success: true, message: 'Shift deleted successfully' });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({ error: 'Failed to delete shift' });
  }
});


// ==========================================
// 11. SHIFT ROSTER API
// ==========================================

// Get roster for a week (pass week_start as YYYY-MM-DD)
app.get('/api/roster', async (req, res) => {
  const { week_start } = req.query;
  if (!week_start) {
    return res.status(400).json({ error: 'week_start query parameter is required (YYYY-MM-DD).' });
  }

  try {
    const weekEnd = new Date(week_start);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const [rows] = await pool.query(`
      SELECT r.id, r.staff_id, s.name as staff_name, r.shift_id, sh.name as shift_name,
             sh.start_time, sh.end_time, r.roster_date, r.status, r.swap_with_staff_id,
             sw.name as swap_with_staff_name, r.created_at
      FROM shift_roster r
      JOIN staff s ON r.staff_id = s.id
      JOIN shifts sh ON r.shift_id = sh.id
      LEFT JOIN staff sw ON r.swap_with_staff_id = sw.id
      WHERE r.roster_date BETWEEN ? AND ?
      ORDER BY r.roster_date, sh.start_time
    `, [week_start, weekEndStr]);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching roster:', error);
    res.status(500).json({ error: 'Failed to fetch roster' });
  }
});

// Add a single roster entry
app.post('/api/roster', async (req, res) => {
  const { staff_id, shift_id, roster_date, status } = req.body;
  if (!staff_id || !shift_id || !roster_date) {
    return res.status(400).json({ error: 'staff_id, shift_id, and roster_date are required.' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO shift_roster (staff_id, shift_id, roster_date, status) VALUES (?, ?, ?, ?)',
      [staff_id, shift_id, roster_date, status || 'Scheduled']
    );
    res.status(201).json({ id: result.insertId, staff_id, shift_id, roster_date, status: status || 'Scheduled' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Roster entry already exists for this staff on this date.' });
    }
    console.error('Error creating roster entry:', error);
    res.status(500).json({ error: 'Failed to create roster entry' });
  }
});

// Bulk add roster entries
app.post('/api/roster/bulk', async (req, res) => {
  const { entries } = req.body; // Array of { staff_id, shift_id, roster_date, status }
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'entries array is required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const inserted = [];
    for (const entry of entries) {
      if (!entry.staff_id || !entry.roster_date) {
        throw new Error('Each entry must have staff_id and roster_date.');
      }
      
      if (entry.shift_id === null || entry.status === 'Off') {
        await connection.query(
          'DELETE FROM shift_roster WHERE staff_id = ? AND roster_date = ?',
          [entry.staff_id, entry.roster_date]
        );
      } else {
        const [result] = await connection.query(
          'INSERT INTO shift_roster (staff_id, shift_id, roster_date, status) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE shift_id = VALUES(shift_id), status = VALUES(status)',
          [entry.staff_id, entry.shift_id, entry.roster_date, entry.status || 'Scheduled']
        );
        inserted.push({ id: result.insertId, ...entry, status: entry.status || 'Scheduled' });
      }
    }

    await connection.commit();
    res.status(201).json({ success: true, message: `${inserted.length} roster entries saved`, entries: inserted });
  } catch (error) {
    await connection.rollback();
    console.error('Error bulk creating roster entries:', error);
    res.status(500).json({ error: error.message || 'Failed to bulk create roster entries' });
  } finally {
    connection.release();
  }
});

// Update a roster entry
app.put('/api/roster/:id', async (req, res) => {
  const { id } = req.params;
  const { shift_id, status, swap_with_staff_id } = req.body;

  try {
    const [existing] = await pool.query('SELECT * FROM shift_roster WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Roster entry not found' });
    }

    const r = existing[0];
    const updateShift = shift_id !== undefined ? shift_id : r.shift_id;
    const updateStatus = status !== undefined ? status : r.status;
    const updateSwap = swap_with_staff_id !== undefined ? swap_with_staff_id : r.swap_with_staff_id;

    await pool.query(
      'UPDATE shift_roster SET shift_id = ?, status = ?, swap_with_staff_id = ? WHERE id = ?',
      [updateShift, updateStatus, updateSwap, id]
    );

    res.json({ id: parseInt(id), staff_id: r.staff_id, shift_id: updateShift, roster_date: r.roster_date, status: updateStatus, swap_with_staff_id: updateSwap });
  } catch (error) {
    console.error('Error updating roster entry:', error);
    res.status(500).json({ error: 'Failed to update roster entry' });
  }
});

// Delete a roster entry
app.delete('/api/roster/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM shift_roster WHERE id = ?', [id]);
    res.json({ success: true, message: 'Roster entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting roster entry:', error);
    res.status(500).json({ error: 'Failed to delete roster entry' });
  }
});


// ==========================================
// 12. ATTENDANCE API
// ==========================================

// Get attendance for a date
app.get('/api/attendance', async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD).' });
  }

  try {
    const [rows] = await pool.query(`
      SELECT a.id, a.staff_id, s.name as staff_name, s.role, a.attendance_date,
             a.check_in, a.check_out, a.shift_id, sh.name as shift_name,
             a.status, a.notes, a.created_at
      FROM attendance a
      JOIN staff s ON a.staff_id = s.id
      LEFT JOIN shifts sh ON a.shift_id = sh.id
      WHERE a.attendance_date = ?
      ORDER BY s.name
    `, [date]);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Check-in
app.post('/api/attendance/check-in', async (req, res) => {
  const { staff_id, shift_id, notes, attendance_date, check_in, status } = req.body;
  if (!staff_id) {
    return res.status(400).json({ error: 'staff_id is required.' });
  }

  try {
    const now = new Date();
    const attendanceDate = attendance_date || now.toISOString().split('T')[0];
    const checkInTime = check_in || formatLocalTimestamp(now);
    const attStatus = status || 'Present';

    const [result] = await pool.query(
      `INSERT INTO attendance (staff_id, attendance_date, check_in, shift_id, status, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [staff_id, attendanceDate, checkInTime, shift_id || null, attStatus, notes || null]
    );

    res.status(201).json({
      id: result.insertId,
      staff_id,
      attendance_date: attendanceDate,
      check_in: checkInTime,
      check_out: null,
      shift_id: shift_id || null,
      status: attStatus,
      notes: notes || null
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Attendance already recorded for this staff on this date.' });
    }
    console.error('Error recording check-in:', error);
    res.status(500).json({ error: 'Failed to record check-in' });
  }
});

// Check-out
app.put('/api/attendance/:id/check-out', async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT * FROM attendance WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    if (existing[0].check_out) {
      return res.status(400).json({ error: 'Already checked out.' });
    }

    const now = new Date();
    const checkOutTime = formatLocalTimestamp(now);

    await pool.query('UPDATE attendance SET check_out = ? WHERE id = ?', [checkOutTime, id]);

    res.json({ success: true, message: 'Check-out recorded', check_out: checkOutTime });
  } catch (error) {
    console.error('Error recording check-out:', error);
    res.status(500).json({ error: 'Failed to record check-out' });
  }
});

// Update attendance record (edit status, notes, etc.)
app.put('/api/attendance/:id', async (req, res) => {
  const { id } = req.params;
  const { status, notes, check_in, check_out, shift_id } = req.body;

  try {
    const [existing] = await pool.query('SELECT * FROM attendance WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    const a = existing[0];
    const updateStatus = status !== undefined ? status : a.status;
    const updateNotes = notes !== undefined ? notes : a.notes;
    const updateCheckIn = check_in !== undefined ? check_in : a.check_in;
    const updateCheckOut = check_out !== undefined ? check_out : a.check_out;
    const updateShift = shift_id !== undefined ? shift_id : a.shift_id;

    await pool.query(
      'UPDATE attendance SET status = ?, notes = ?, check_in = ?, check_out = ?, shift_id = ? WHERE id = ?',
      [updateStatus, updateNotes, updateCheckIn, updateCheckOut, updateShift, id]
    );

    res.json({
      id: parseInt(id),
      staff_id: a.staff_id,
      attendance_date: a.attendance_date,
      check_in: updateCheckIn,
      check_out: updateCheckOut,
      shift_id: updateShift,
      status: updateStatus,
      notes: updateNotes
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ error: 'Failed to update attendance record' });
  }
});

// Get attendance summary for a staff member in a month
app.get('/api/attendance/summary', async (req, res) => {
  const { staff_id, month, year } = req.query;
  if (!staff_id || !month || !year) {
    return res.status(400).json({ error: 'staff_id, month, and year query parameters are required.' });
  }

  try {
    const [rows] = await pool.query(`
      SELECT
        COUNT(*) as total_records,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late_days,
        SUM(CASE WHEN status = 'Half-Day' THEN 1 ELSE 0 END) as half_days
      FROM attendance
      WHERE staff_id = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?
    `, [staff_id, month, year]);

    const [details] = await pool.query(`
      SELECT id, attendance_date, check_in, check_out, status, notes
      FROM attendance
      WHERE staff_id = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?
      ORDER BY attendance_date
    `, [staff_id, month, year]);

    res.json({
      staff_id: parseInt(staff_id),
      month: parseInt(month),
      year: parseInt(year),
      summary: rows[0],
      details
    });
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ error: 'Failed to fetch attendance summary' });
  }
});


// ==========================================
// 13. LEAVES API
// ==========================================

// Get leaves (optionally filter by status, staff_id)
app.get('/api/leaves', async (req, res) => {
  const { status, staff_id } = req.query;

  try {
    let query = `
      SELECT l.id, l.staff_id, s.name as staff_name, l.leave_type, l.start_date, l.end_date,
             l.reason, l.status, s2.name as approved_by, l.created_at
      FROM leaves l
      JOIN staff s ON l.staff_id = s.id
      LEFT JOIN staff s2 ON l.approved_by = s2.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    }
    if (staff_id) {
      query += ' AND l.staff_id = ?';
      params.push(staff_id);
    }

    query += ' ORDER BY l.created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching leaves:', error);
    res.status(500).json({ error: 'Failed to fetch leaves' });
  }
});

// Apply for leave
app.post('/api/leaves', async (req, res) => {
  const { staff_id, leave_type, start_date, end_date, reason } = req.body;
  if (!staff_id || !leave_type || !start_date || !end_date) {
    return res.status(400).json({ error: 'staff_id, leave_type, start_date, and end_date are required.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO leaves (staff_id, leave_type, start_date, end_date, reason, status)
       VALUES (?, ?, ?, ?, ?, 'Pending')`,
      [staff_id, leave_type, start_date, end_date, reason || null]
    );

    res.status(201).json({
      id: result.insertId,
      staff_id,
      leave_type,
      start_date,
      end_date,
      reason: reason || null,
      status: 'Pending'
    });
  } catch (error) {
    console.error('Error applying for leave:', error);
    res.status(500).json({ error: 'Failed to apply for leave' });
  }
});

// Approve a leave
app.put('/api/leaves/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { approved_by } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.query('SELECT * FROM leaves WHERE id = ? FOR UPDATE', [id]);
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Leave request not found' });
    }

    const leave = existing[0];
    if (leave.status !== 'Pending') {
      connection.release();
      return res.status(400).json({ error: `Leave is already ${leave.status}.` });
    }

    let approverId = null;
    if (approved_by && !isNaN(approved_by)) {
      approverId = parseInt(approved_by);
    } else {
      const [managers] = await connection.query("SELECT id FROM staff WHERE role IN ('Manager', 'Owner') LIMIT 1");
      if (managers.length > 0) {
        approverId = managers[0].id;
      }
    }

    // Calculate number of leave days
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Auto-exclude holidays
    const [holidays] = await connection.query(
      'SELECT COUNT(id) as count FROM holidays WHERE holiday_date BETWEEN ? AND ?',
      [leave.start_date, leave.end_date]
    );
    const holidayCount = holidays[0].count;
    const netDays = Math.max(1, diffDays - holidayCount);

    // Check and update leave balance
    const year = start.getFullYear();
    const [balanceRows] = await connection.query(
      'SELECT * FROM leave_balances WHERE staff_id = ? AND year = ? FOR UPDATE',
      [leave.staff_id, year]
    );

    let balance = null;
    if (balanceRows.length === 0) {
      // Create new balance
      await connection.query('INSERT IGNORE INTO leave_balances (staff_id, year) VALUES (?, ?)', [leave.staff_id, year]);
      const [newBal] = await connection.query('SELECT * FROM leave_balances WHERE staff_id = ? AND year = ?', [leave.staff_id, year]);
      balance = newBal[0];
    } else {
      balance = balanceRows[0];
    }

    let columnUsed = '';
    let available = 0;
    if (leave.leave_type === 'Casual') {
      columnUsed = 'casual_used';
      available = balance.casual_total - balance.casual_used;
    } else if (leave.leave_type === 'Sick') {
      columnUsed = 'sick_used';
      available = balance.sick_total - balance.sick_used;
    } else if (leave.leave_type === 'Earned') {
      columnUsed = 'earned_used';
      available = balance.earned_total - balance.earned_used;
    }

    if (columnUsed && available < netDays) {
      connection.rollback();
      connection.release();
      return res.status(400).json({ error: `Insufficient leave balance. Net leave days: ${netDays} (after excluding ${holidayCount} holidays), Available: ${available}` });
    }

    // Decrement balance (increment used column)
    if (columnUsed) {
      await connection.query(
        `UPDATE leave_balances SET ${columnUsed} = ${columnUsed} + ? WHERE staff_id = ? AND year = ?`,
        [netDays, leave.staff_id, year]
      );
    }

    await connection.query(
      'UPDATE leaves SET status = ?, approved_by = ? WHERE id = ?',
      ['Approved', approverId, id]
    );

    await connection.commit();
    res.json({ success: true, message: `Leave approved successfully. Net days deducted: ${netDays}` });
  } catch (error) {
    await connection.rollback();
    console.error('Error approving leave:', error);
    res.status(500).json({ error: 'Failed to approve leave' });
  } finally {
    connection.release();
  }
});

// Reject a leave
app.put('/api/leaves/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { approved_by } = req.body;

  try {
    const [existing] = await pool.query('SELECT * FROM leaves WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (existing[0].status !== 'Pending') {
      return res.status(400).json({ error: `Leave is already ${existing[0].status}.` });
    }

    let approverId = null;
    if (approved_by && !isNaN(approved_by)) {
      approverId = parseInt(approved_by);
    } else {
      // Look up a Manager or Owner's ID from staff
      const [managers] = await pool.query("SELECT id FROM staff WHERE role IN ('Manager', 'Owner') LIMIT 1");
      if (managers.length > 0) {
        approverId = managers[0].id;
      }
    }

    await pool.query(
      'UPDATE leaves SET status = ?, approved_by = ? WHERE id = ?',
      ['Rejected', approverId, id]
    );

    res.json({ success: true, message: 'Leave rejected successfully' });
  } catch (error) {
    console.error('Error rejecting leave:', error);
    res.status(500).json({ error: 'Failed to reject leave' });
  }
});


// ==========================================
// 14. PAYROLL API
// ==========================================

// Generate payroll for a given month/year
app.post('/api/payroll/generate', async (req, res) => {
  const { month, year, working_days } = req.body;
  if (!month || !year || !working_days) {
    return res.status(400).json({ error: 'month, year, and working_days are required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Fetch all active staff not excluded from payroll
    const [staffList] = await connection.query('SELECT * FROM staff WHERE is_active = 1 AND exclude_from_payroll = 0');
    if (staffList.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'No active staff found for payroll.' });
    }

    // Query holidays for the selected month to automatically reduce working days
    const [holidaysResult] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM holidays 
      WHERE MONTH(holiday_date) = ? AND YEAR(holiday_date) = ?
    `, [month, year]);
    const holidayCount = holidaysResult[0].count;
    
    // Automatically reduce standard working days by the number of holidays in this month
    const actualWorkingDays = Math.max(1, parseFloat(working_days) - holidayCount);

    const payrollRecords = [];

    for (const staff of staffList) {
      // Get days present (Present + Late count as full, Half-Day counts as 0.5)
      const [attSummary] = await connection.query(`
        SELECT
          IFNULL(SUM(CASE WHEN status IN ('Present', 'Late') THEN 1 WHEN status = 'Half-Day' THEN 0.5 ELSE 0 END), 0) as days_present
        FROM attendance
        WHERE staff_id = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?
      `, [staff.id, month, year]);

      const daysPresent = parseFloat(attSummary[0].days_present);

      // Calculate gross salary
      let grossSalary = 0;
      if (staff.pay_type === 'monthly') {
        grossSalary = parseFloat(staff.monthly_salary) * (daysPresent / actualWorkingDays);
      } else {
        // daily
        grossSalary = parseFloat(staff.daily_rate) * daysPresent;
      }

      // PF deduction (12% if enabled)
      const pfDeduction = staff.pf_enabled ? grossSalary * 0.12 : 0;

      // ESI deduction (0.75% if enabled)
      const esiDeduction = staff.esi_enabled ? grossSalary * 0.0075 : 0;

      // TDS deduction (configured percentage)
      const tdsDeduction = grossSalary * (parseFloat(staff.tds_percentage || 0) / 100);

      // Meal deductions from orders and order_items
      const [mealSum] = await connection.query(`
        SELECT IFNULL(SUM(oi.quantity * oi.price), 0) as total_meal_cost
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.customer_staff_id = ? 
          AND o.discount_type = 'StaffMeal'
          AND MONTH(o.order_date) = ? 
          AND YEAR(o.order_date) = ?
          AND o.status != 'Cancelled'
      `, [staff.id, month, year]);

      const mealDeduction = parseFloat(mealSum[0].total_meal_cost);

      // Net salary
      const netSalary = grossSalary - pfDeduction - esiDeduction - tdsDeduction - mealDeduction;

      // Insert or update payroll record (unique constraint on staff_id, month, year)
      await connection.query(`
        INSERT INTO payroll (staff_id, month, year, working_days, days_present, gross_salary, pf_deduction, esi_deduction, tds_deduction, meal_deduction, net_salary, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft')
        ON DUPLICATE KEY UPDATE
          working_days = VALUES(working_days),
          days_present = VALUES(days_present),
          gross_salary = VALUES(gross_salary),
          pf_deduction = VALUES(pf_deduction),
          esi_deduction = VALUES(esi_deduction),
          tds_deduction = VALUES(tds_deduction),
          meal_deduction = VALUES(meal_deduction),
          net_salary = VALUES(net_salary),
          status = 'Draft'
      `, [staff.id, month, year, working_days, daysPresent, grossSalary, pfDeduction, esiDeduction, tdsDeduction, mealDeduction, netSalary]);

      payrollRecords.push({
        staff_id: staff.id,
        staff_name: staff.name,
        pay_type: staff.pay_type,
        working_days: parseInt(working_days),
        days_present: daysPresent,
        gross_salary: parseFloat(grossSalary.toFixed(2)),
        pf_deduction: parseFloat(pfDeduction.toFixed(2)),
        esi_deduction: parseFloat(esiDeduction.toFixed(2)),
        tds_deduction: parseFloat(tdsDeduction.toFixed(2)),
        meal_deduction: parseFloat(mealDeduction.toFixed(2)),
        net_salary: parseFloat(netSalary.toFixed(2)),
        status: 'Draft'
      });
    }

    await connection.commit();
    res.json({ success: true, message: `Payroll generated for ${month}/${year}`, payroll: payrollRecords });
  } catch (error) {
    await connection.rollback();
    console.error('Error generating payroll:', error);
    res.status(500).json({ error: 'Failed to generate payroll' });
  } finally {
    connection.release();
  }
});

// Get payroll records for a month/year
app.get('/api/payroll', async (req, res) => {
  const { month, year } = req.query;
  if (!month || !year) {
    return res.status(400).json({ error: 'month and year query parameters are required.' });
  }

  try {
    const [rows] = await pool.query(`
      SELECT p.id, p.staff_id, s.name as staff_name, s.role, s.pay_type, s.bank_account,
             p.month, p.year, p.working_days, p.days_present, p.gross_salary,
             p.pf_deduction, p.esi_deduction, p.tds_deduction, p.meal_deduction,
             p.net_salary, p.status, p.created_at
      FROM payroll p
      JOIN staff s ON p.staff_id = s.id
      WHERE p.month = ? AND p.year = ?
      ORDER BY s.name
    `, [month, year]);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching payroll:', error);
    res.status(500).json({ error: 'Failed to fetch payroll records' });
  }
});

// Finalize a payroll record
app.put('/api/payroll/:id/finalize', async (req, res) => {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT * FROM payroll WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    if (existing[0].status === 'Finalized') {
      return res.status(400).json({ error: 'Payroll is already finalized.' });
    }

    await pool.query('UPDATE payroll SET status = ? WHERE id = ?', ['Finalized', id]);

    res.json({ success: true, message: 'Payroll finalized successfully' });
  } catch (error) {
    console.error('Error finalizing payroll:', error);
    res.status(500).json({ error: 'Failed to finalize payroll' });
  }
});


// ==========================================
// 15. STAFF MEALS API
// ==========================================

// Get staff meals (filter by staff_id, month, year)
app.get('/api/staff-meals', async (req, res) => {
  const { staff_id, month, year } = req.query;

  try {
    let query = `
      SELECT sm.id, sm.staff_id, s.name as staff_name, sm.item_id, i.name as item_name,
             sm.quantity, sm.price, DATE_FORMAT(sm.meal_date, '%Y-%m-%d') as meal_date, sm.created_at
      FROM staff_meals sm
      JOIN staff s ON sm.staff_id = s.id
      JOIN items i ON sm.item_id = i.id
      WHERE 1=1
    `;
    const params = [];

    if (staff_id) {
      query += ' AND sm.staff_id = ?';
      params.push(staff_id);
    }
    if (month) {
      query += ' AND MONTH(sm.meal_date) = ?';
      params.push(month);
    }
    if (year) {
      query += ' AND YEAR(sm.meal_date) = ?';
      params.push(year);
    }

    query += ' ORDER BY sm.meal_date DESC, s.name';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching staff meals:', error);
    res.status(500).json({ error: 'Failed to fetch staff meals' });
  }
});

// Record a staff meal
app.post('/api/staff-meals', async (req, res) => {
  const { staff_id, item_id, quantity, price, meal_date } = req.body;
  if (!staff_id || !item_id || !quantity || price === undefined) {
    return res.status(400).json({ error: 'staff_id, item_id, quantity, and price are required.' });
  }

  try {
    const mealDateVal = meal_date || new Date().toISOString().split('T')[0];

    const [result] = await pool.query(
      'INSERT INTO staff_meals (staff_id, item_id, quantity, price, meal_date) VALUES (?, ?, ?, ?, ?)',
      [staff_id, item_id, quantity, price, mealDateVal]
    );

    res.status(201).json({
      id: result.insertId,
      staff_id,
      item_id,
      quantity: parseInt(quantity),
      price: parseFloat(price),
      meal_date: mealDateVal
    });
  } catch (error) {
    console.error('Error recording staff meal:', error);
    res.status(500).json({ error: 'Failed to record staff meal' });
  }
});


// ==========================================
// 16. STAFF PERFORMANCE API
// ==========================================

// Get performance metrics — orders processed per billing staff


// ==========================================
// 17. HELD ORDERS OPERATIONS
// ==========================================

// Get all held orders
app.get('/api/held-orders', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM held_orders ORDER BY created_at DESC');
    res.json(rows.map(row => ({
      ...row,
      cart_data: JSON.parse(row.cart_data)
    })));
  } catch (error) {
    console.error('Error fetching held orders:', error);
    res.status(500).json({ error: 'Failed to fetch held orders' });
  }
});

// Hold an order (save cart)
app.post('/api/held-orders', async (req, res) => {
  const { hold_name, cart_data } = req.body;
  if (!hold_name || !cart_data) {
    return res.status(400).json({ error: 'hold_name and cart_data are required.' });
  }

  try {
    const cartString = typeof cart_data === 'string' ? cart_data : JSON.stringify(cart_data);
    const [result] = await pool.query(
      'INSERT INTO held_orders (hold_name, cart_data) VALUES (?, ?)',
      [hold_name, cartString]
    );
    res.status(201).json({ success: true, id: result.insertId, hold_name });
  } catch (error) {
    console.error('Error holding order:', error);
    res.status(500).json({ error: 'Failed to hold order' });
  }
});

// Delete a held order
app.delete('/api/held-orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM held_orders WHERE id = ?', [id]);
    res.json({ success: true, message: 'Held order deleted' });
  } catch (error) {
    console.error('Error deleting held order:', error);
    res.status(500).json({ error: 'Failed to delete held order' });
  }
});

// ==========================================
// 18. COUPONS MANAGEMENT & VALIDATION
// ==========================================

// Validate a coupon code
app.post('/api/coupons/validate', async (req, res) => {
  const { code, subtotal } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Coupon code is required.' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [code]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or inactive coupon code.' });
    }

    const coupon = rows[0];
    const minAmt = parseFloat(coupon.min_order_amount);
    const currentSub = parseFloat(subtotal || 0);

    if (currentSub < minAmt) {
      return res.status(400).json({
        error: `Minimum order amount of ₹${minAmt.toFixed(2)} required to use this coupon.`
      });
    }

    let discountAmount = 0;
    const value = parseFloat(coupon.value);
    if (coupon.discount_type === 'Percentage') {
      discountAmount = currentSub * (value / 100);
    } else {
      discountAmount = value;
    }

    if (discountAmount > currentSub) {
      discountAmount = currentSub;
    }

    res.json({
      success: true,
      code: coupon.code,
      discount_type: coupon.discount_type,
      value: value,
      discount_amount: discountAmount
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

// Get all coupons
app.get('/api/coupons', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM coupons ORDER BY code');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// ==========================================
// 8. MIS, REPORTS & ANALYTICS API (Module 3.9)
// ==========================================

// --- CUSTOMERS ---
app.get('/api/customers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM customers ORDER BY name');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

app.post('/api/customers', async (req, res) => {
  const { name, phone, email } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required.' });
  try {
    const cleanPhone = phone && phone.trim() ? phone.trim() : null;
    const cleanEmail = email && email.trim() ? email.trim() : null;
    const [result] = await pool.query(
      'INSERT INTO customers (name, phone, email, loyalty_points) VALUES (?, ?, ?, 0)',
      [name.trim(), cleanPhone, cleanEmail]
    );
    res.status(201).json({ id: result.insertId, name: name.trim(), phone: cleanPhone, email: cleanEmail, loyalty_points: 0 });
  } catch (error) {
    console.error('Error creating customer:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A customer with this phone number already exists.' });
    }
    res.status(500).json({ error: 'Failed to create customer: ' + error.message });
  }
});

// Delete a customer
// Update customer profile
app.put('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, whatsapp_opt_in, sms_opt_in } = req.body;
  try {
    const [existing] = await pool.query('SELECT id FROM customers WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Customer not found' });
    await pool.query(
      'UPDATE customers SET name=?, phone=?, email=?, whatsapp_opt_in=?, sms_opt_in=? WHERE id=?',
      [name, phone || null, email || null, whatsapp_opt_in ? 1 : 0, sms_opt_in ? 1 : 0, id]
    );
    const [updated] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
    res.json({ success: true, customer: updated[0] });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer: ' + error.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Null out the customer_id on any linked orders (preserve order history, just unlink)
    await pool.query('UPDATE orders SET customer_id = NULL WHERE customer_id = ?', [id]);
    // Remove loyalty transactions
    await pool.query('DELETE FROM loyalty_transactions WHERE customer_id = ?', [id]);
    // Remove the customer record
    const [result] = await pool.query('DELETE FROM customers WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ success: true, message: 'Customer removed successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer: ' + error.message });
  }
});

// --- CUSTOMER FEEDBACK ---
app.get('/api/feedback', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM customer_feedback ORDER BY feedback_date DESC, created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});



// --- OVERHEAD EXPENSES ---
app.get('/api/overheads', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM overheads ORDER BY expense_date DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching overheads:', error);
    res.status(500).json({ error: 'Failed to fetch overheads' });
  }
});

// --- VENDOR COMMON EXPENSES ---
app.get('/api/vendors/expenses', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vendor_common_expenses ORDER BY expense_date DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching vendor common expenses:', error);
    res.status(500).json({ error: 'Failed to fetch vendor expenses' });
  }
});

app.post('/api/vendors/expenses', async (req, res) => {
  const { expense_date, category, amount, description } = req.body;
  if (!expense_date || !category || amount === undefined) {
    return res.status(400).json({ error: 'Date, Category, and Amount are required.' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO vendor_common_expenses (expense_date, category, amount, description) VALUES (?, ?, ?, ?)',
      [expense_date, category, parseFloat(amount), description || null]
    );
    res.status(201).json({ id: result.insertId, expense_date, category, amount: parseFloat(amount), description });
  } catch (error) {
    console.error('Error creating vendor expense:', error);
    res.status(500).json({ error: 'Failed to create vendor expense' });
  }
});

app.delete('/api/vendors/expenses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM vendor_common_expenses WHERE id = ?', [id]);
    res.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (error) {
    console.error('Error deleting vendor expense:', error);
    res.status(500).json({ error: 'Failed to delete vendor expense' });
  }
});

app.get('/api/vendors/expenses/sum', async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    const [rows] = await pool.query(
      'SELECT IFNULL(SUM(amount), 0) as total FROM vendor_common_expenses WHERE expense_date BETWEEN ? AND ?',
      [startDate || '1970-01-01', endDate || '9999-12-31']
    );
    res.json({ total: parseFloat(rows[0].total) });
  } catch (error) {
    console.error('Error fetching vendor expenses sum:', error);
    res.status(500).json({ error: 'Failed to fetch vendor expenses sum' });
  }
});

app.post('/api/overheads', async (req, res) => {
  const { expense_date, category, amount, description } = req.body;
  if (!expense_date || !category || amount === undefined) {
    return res.status(400).json({ error: 'Date, Category, and Amount are required.' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO overheads (expense_date, category, amount, description) VALUES (?, ?, ?, ?)',
      [expense_date, category, parseFloat(amount), description || null]
    );
    res.status(201).json({ id: result.insertId, expense_date, category, amount: parseFloat(amount), description });
  } catch (error) {
    console.error('Error creating overhead expense:', error);
    res.status(500).json({ error: 'Failed to create overhead expense' });
  }
});

app.delete('/api/overheads/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM overheads WHERE id = ?', [id]);
    res.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (error) {
    console.error('Error deleting overhead expense:', error);
    res.status(500).json({ error: 'Failed to delete overhead expense' });
  }
});

// --- ANALYTICS REPORTS ---

// 1. Sales Report
app.get('/api/reports/sales', async (req, res) => {
  const { startDate, endDate, vendor_id } = req.query;
  const startStr = startDate ? `${startDate} 00:00:00` : '1970-01-01 00:00:00';
  const endStr = endDate ? `${endDate} 23:59:59` : '9999-12-31 23:59:59';

  try {
    let salesQuery, salesParams;
    if (vendor_id) {
      const vId = parseInt(vendor_id);
      salesQuery = `
        SELECT COUNT(DISTINCT o.id) as total_orders,
               IFNULL(SUM(oi.quantity * oi.price), 0) as total_revenue,
               IFNULL(SUM(oi.quantity * oi.price * (i.gst_rate / 100)), 0) as total_gst
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN items i ON oi.item_id = i.id
        WHERE o.order_date BETWEEN ? AND ? AND o.status != 'Cancelled' AND i.vendor_id = ?`;
      salesParams = [startStr, endStr, vId];
    } else {
      salesQuery = `
        SELECT COUNT(id) as total_orders,
               IFNULL(SUM(total_amount), 0) as total_revenue,
               IFNULL(SUM(gst_amount), 0) as total_gst
        FROM orders
        WHERE order_date BETWEEN ? AND ? AND status != 'Cancelled'`;
      salesParams = [startStr, endStr];
    }

    const [salesRows] = await pool.query(salesQuery, salesParams);
    const summary = salesRows[0];
    const totalRevenue = parseFloat(summary.total_revenue || 0);
    const totalOrders = parseInt(summary.total_orders || 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Item-wise sales count & revenue
    let itemQuery, itemParams;
    if (vendor_id) {
      const vId = parseInt(vendor_id);
      itemQuery = `
        SELECT i.id, i.name, i.category, SUM(oi.quantity) as qty, SUM(oi.quantity * oi.price) as revenue
        FROM order_items oi
        JOIN items i ON oi.item_id = i.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.order_date BETWEEN ? AND ? AND o.status != 'Cancelled' AND i.vendor_id = ?
        GROUP BY oi.item_id
        ORDER BY qty DESC`;
      itemParams = [startStr, endStr, vId];
    } else {
      itemQuery = `
        SELECT i.id, i.name, i.category, SUM(oi.quantity) as qty, SUM(oi.quantity * oi.price) as revenue
        FROM order_items oi
        JOIN items i ON oi.item_id = i.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.order_date BETWEEN ? AND ? AND o.status != 'Cancelled'
        GROUP BY oi.item_id
        ORDER BY qty DESC`;
      itemParams = [startStr, endStr];
    }
    const [itemRows] = await pool.query(itemQuery, itemParams);

    // Payment Mode Split
    let payQuery, payParams;
    if (vendor_id) {
      const vId = parseInt(vendor_id);
      payQuery = `
        SELECT o.payment_mode, COUNT(DISTINCT o.id) as count, SUM(oi.quantity * oi.price) as amount
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN items i ON oi.item_id = i.id
        WHERE o.order_date BETWEEN ? AND ? AND o.status != 'Cancelled' AND i.vendor_id = ?
        GROUP BY o.payment_mode`;
      payParams = [startStr, endStr, vId];
    } else {
      payQuery = `
        SELECT payment_mode, COUNT(id) as count, SUM(total_amount) as amount
        FROM orders
        WHERE order_date BETWEEN ? AND ? AND status != 'Cancelled'
        GROUP BY payment_mode`;
      payParams = [startStr, endStr];
    }
    const [payRows] = await pool.query(payQuery, payParams);

    // Cost of Goods Sold (COGS)
    let cogsQuery, cogsParams;
    if (vendor_id) {
      const vId = parseInt(vendor_id);
      cogsQuery = `
        SELECT IFNULL(SUM(oi.recorded_cogs), 0) as cogs
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN items i ON oi.item_id = i.id
        WHERE o.order_date BETWEEN ? AND ? AND o.status != 'Cancelled' AND i.vendor_id = ?`;
      cogsParams = [startStr, endStr, vId];
    } else {
      cogsQuery = `
        SELECT IFNULL(SUM(oi.recorded_cogs), 0) as cogs
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.order_date BETWEEN ? AND ? AND o.status != 'Cancelled'`;
      cogsParams = [startStr, endStr];
    }
    const [cogsRows] = await pool.query(cogsQuery, cogsParams);
    const cogsVal = parseFloat(cogsRows[0].cogs || 0);

    // Wastage Costs
    let wastageQuery, wastageParams;
    if (vendor_id) {
      const vId = parseInt(vendor_id);
      wastageQuery = `
        SELECT IFNULL(SUM(ABS(sl.recorded_cost)), 0) as wastage
        FROM stock_logs sl
        JOIN raw_materials rm ON sl.material_id = rm.id
        JOIN recipes r ON rm.id = r.material_id
        JOIN items i ON r.item_id = i.id
        WHERE sl.logged_at BETWEEN ? AND ? AND sl.log_type = 'Wastage' AND i.vendor_id = ?`;
      wastageParams = [startStr, endStr, vId];
    } else {
      wastageQuery = `
        SELECT IFNULL(SUM(ABS(sl.recorded_cost)), 0) as wastage
        FROM stock_logs sl
        JOIN raw_materials rm ON sl.material_id = rm.id
        WHERE sl.logged_at BETWEEN ? AND ? AND sl.log_type = 'Wastage'`;
      wastageParams = [startStr, endStr];
    }
    const [wastageRows] = await pool.query(wastageQuery, wastageParams);
    const wastageVal = parseFloat(wastageRows[0].wastage || 0);

    // Overhead Expenses Split
    let overheadsVal = 0;
    if (!vendor_id) {
      const [overheadsRows] = await pool.query(
        'SELECT IFNULL(SUM(amount), 0) as amount FROM overheads WHERE expense_date BETWEEN ? AND ?',
        [startDate || '1970-01-01', endDate || '9999-12-31']
      );
      overheadsVal = parseFloat(overheadsRows[0].amount || 0);
    } else {
      const vId = parseInt(vendor_id);
      const [vendorRows] = await pool.query('SELECT share_area FROM vendors WHERE id = ?', [vId]);
      if (vendorRows.length > 0) {
        const sharePct = parseFloat(vendorRows[0].share_area || 0);
        const [overheadsRows] = await pool.query(
          'SELECT IFNULL(SUM(amount), 0) as amount FROM overheads WHERE expense_date BETWEEN ? AND ?',
          [startDate || '1970-01-01', endDate || '9999-12-31']
        );
        overheadsVal = parseFloat(overheadsRows[0].amount || 0) * (sharePct / 100);
      }
    }

    // Staff Salaries Cost
    let staffCostVal = 0;
    const startYear = startDate ? parseInt(startDate.split('-')[0]) : new Date().getFullYear();
    const startMonth = startDate ? parseInt(startDate.split('-')[1]) : new Date().getMonth() + 1;
    const endYear = endDate ? parseInt(endDate.split('-')[0]) : new Date().getFullYear();
    const endMonth = endDate ? parseInt(endDate.split('-')[1]) : new Date().getMonth() + 1;

    let staffQuery, staffParams;
    if (vendor_id) {
      const vId = parseInt(vendor_id);
      staffQuery = `
        SELECT IFNULL(SUM(p.gross_salary), 0) as cost
        FROM payroll p
        JOIN staff s ON p.staff_id = s.id
        WHERE s.vendor_id = ? AND (p.year * 12 + p.month) BETWEEN ? AND ?`;
      staffParams = [vId, startYear * 12 + startMonth, endYear * 12 + endMonth];
    } else {
      staffQuery = `
        SELECT IFNULL(SUM(gross_salary), 0) as cost
        FROM payroll
        WHERE (year * 12 + month) BETWEEN ? AND ?`;
      staffParams = [startYear * 12 + startMonth, endYear * 12 + endMonth];
    }
    const [staffRows] = await pool.query(staffQuery, staffParams);
    staffCostVal = parseFloat(staffRows[0].cost || 0);

    const netProfit = totalRevenue - cogsVal - wastageVal - overheadsVal - staffCostVal;

    res.json({
      revenue: totalRevenue,
      ordersCount: totalOrders,
      avgOrderValue: avgOrderValue,
      gstCollected: parseFloat(summary.total_gst || 0),
      cogs: cogsVal,
      wastage: wastageVal,
      overheads: overheadsVal,
      staffCost: staffCostVal,
      netProfit: netProfit,
      items: itemRows.map(row => ({
        id: row.id,
        name: row.name,
        category: row.category,
        qty: parseInt(row.qty || 0),
        revenue: parseFloat(row.revenue || 0)
      })),
      paymentSplit: payRows.map(row => ({
        mode: row.payment_mode,
        count: parseInt(row.count || 0),
        amount: parseFloat(row.amount || 0)
      }))
    });
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).json({ error: 'Failed to generate sales report.' });
  }
});

// 2. Stock Ledger Report
app.get('/api/reports/stock', async (req, res) => {
  const { startDate, endDate } = req.query;
  const startStr = startDate ? `${startDate} 00:00:00` : '1970-01-01 00:00:00';
  const endStr = endDate ? `${endDate} 23:59:59` : '9999-12-31 23:59:59';

  try {
    // Get all raw materials
    const [materials] = await pool.query('SELECT * FROM raw_materials ORDER BY name');
    const stockReport = [];

    for (const mat of materials) {
      // Calculate changes after EndDate (to compute Closing Stock at EndDate)
      const [futureLogs] = await pool.query(
        'SELECT IFNULL(SUM(change_qty), 0) as change_sum FROM stock_logs WHERE material_id = ? AND logged_at > ?',
        [mat.id, endStr]
      );
      const futureChanges = parseFloat(futureLogs[0].change_sum);
      const closingStock = parseFloat(mat.stock_level) + futureChanges;

      // Calculate changes in range
      const [rangeLogs] = await pool.query(
        `SELECT 
          IFNULL(SUM(CASE WHEN log_type = 'Purchase' THEN change_qty ELSE 0 END), 0) as purchases,
          IFNULL(SUM(CASE WHEN log_type = 'Sale Deduction' THEN ABS(change_qty) ELSE 0 END), 0) as usage_qty,
          IFNULL(SUM(CASE WHEN log_type = 'Wastage' THEN ABS(change_qty) ELSE 0 END), 0) as wastage,
          IFNULL(SUM(CASE WHEN log_type = 'Adjustment' OR log_type = 'Opening' OR log_type = 'Closing' THEN change_qty ELSE 0 END), 0) as adjustments
         FROM stock_logs 
         WHERE material_id = ? AND logged_at BETWEEN ? AND ?`,
        [mat.id, startStr, endStr]
      );

      const purchases = parseFloat(rangeLogs[0].purchases);
      const usageQty = parseFloat(rangeLogs[0].usage_qty);
      const wastage = parseFloat(rangeLogs[0].wastage);
      const adjustments = parseFloat(rangeLogs[0].adjustments);

      // Opening Stock = Closing Stock - Changes in range
      const totalChangesInRange = purchases - usageQty - wastage + adjustments;
      const openingStock = closingStock - totalChangesInRange;

      stockReport.push({
        id: mat.id,
        name: mat.name,
        unit: mat.unit,
        min_stock: parseFloat(mat.min_stock),
        cost_per_unit: parseFloat(mat.cost_per_unit || 50.00),
        openingStock: openingStock,
        purchases: purchases,
        consumption: usageQty,
        wastage: wastage,
        adjustments: adjustments,
        closingStock: closingStock,
        currentStock: parseFloat(mat.stock_level),
        reorderRequired: parseFloat(mat.stock_level) <= parseFloat(mat.min_stock)
      });
    }

    // Calculate range-wide summary totals
    const [summaryRows] = await pool.query(
      `SELECT 
        IFNULL(SUM(CASE WHEN log_type = 'Purchase' THEN recorded_cost ELSE 0 END), 0) as totalPurchased,
        IFNULL(SUM(CASE WHEN log_type = 'Wastage' THEN ABS(recorded_cost) ELSE 0 END), 0) as totalWasted
       FROM stock_logs
       WHERE logged_at BETWEEN ? AND ?`,
      [startStr, endStr]
    );

    const [cogsRows] = await pool.query(
      `SELECT IFNULL(SUM(oi.recorded_cogs), 0) as totalConsumed
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.order_date BETWEEN ? AND ? AND o.status != 'Cancelled'`,
      [startStr, endStr]
    );

    const totalPurchased = parseFloat(summaryRows[0].totalPurchased || 0);
    const totalWasted = parseFloat(summaryRows[0].totalWasted || 0);
    const totalConsumed = parseFloat(cogsRows[0].totalConsumed || 0);
    const netDelta = totalPurchased - totalConsumed - totalWasted;

    res.json({
      summary: {
        totalPurchased,
        totalConsumed,
        totalWasted,
        netDelta
      },
      items: stockReport
    });
  } catch (error) {
    console.error('Error generating stock report:', error);
    res.status(500).json({ error: 'Failed to generate stock report.' });
  }
});

// 3. Vendor Settlement & Performance
app.get('/api/reports/vendors', async (req, res) => {
  const { startDate, endDate } = req.query;
  const startStr = startDate ? `${startDate} 00:00:00` : '1970-01-01 00:00:00';
  const endStr = endDate ? `${endDate} 23:59:59` : '9999-12-31 23:59:59';

  try {
    const [vendors] = await pool.query('SELECT * FROM vendors ORDER BY name');
    
    // Sum total overheads in this range to split common costs
    const [overheads] = await pool.query(
      'SELECT IFNULL(SUM(amount), 0) as amount FROM overheads WHERE expense_date BETWEEN ? AND ?',
      [startDate || '1970-01-01', endDate || '9999-12-31']
    );
    const totalCommonCost = parseFloat(overheads[0].amount || 0);

    const vendorReport = [];

    for (const v of vendors) {
      // Vendor Sales
      const [sales] = await pool.query(
        `SELECT COUNT(DISTINCT o.id) as orders_count, 
                IFNULL(SUM(oi.quantity * oi.price), 0) as revenue
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         JOIN items i ON oi.item_id = i.id
         WHERE o.order_date BETWEEN ? AND ? 
           AND o.status != 'Cancelled'
           AND i.vendor_id = ?`,
        [startStr, endStr, v.id]
      );
      
      const salesCount = parseInt(sales[0].orders_count || 0);
      const grossSales = parseFloat(sales[0].revenue || 0);
      const avgOrder = salesCount > 0 ? grossSales / salesCount : 0;
      
      // Calculate Commission
      const commissionRate = parseFloat(v.commission_rate || 10.00);
      const commissionAmount = grossSales * (commissionRate / 100);

      // Split common cost based on share_area percentage
      const shareAreaPct = parseFloat(v.share_area || 0);
      const commonAreaCost = totalCommonCost * (shareAreaPct / 100);

      const netPayout = grossSales - commissionAmount - commonAreaCost;

      vendorReport.push({
        id: v.id,
        name: v.name,
        stall_number: v.stall_number,
        commission_rate: commissionRate,
        share_area: shareAreaPct,
        orders: salesCount,
        revenue: grossSales,
        avgOrder: avgOrder,
        commission: commissionAmount,
        common_cost_share: commonAreaCost,
        netPayout: netPayout
      });
    }

    res.json({
      vendors: vendorReport,
      totalCommonCost: totalCommonCost
    });
  } catch (error) {
    console.error('Error generating vendor report:', error);
    res.status(500).json({ error: 'Failed to generate vendor report.' });
  }
});

// 4. Peak Hours Analysis
app.get('/api/reports/peak-hours', async (req, res) => {
  const { startDate, endDate, vendor_id } = req.query;
  const startStr = startDate ? `${startDate} 00:00:00` : '1970-01-01 00:00:00';
  const endStr = endDate ? `${endDate} 23:59:59` : '9999-12-31 23:59:59';

  try {
    let query, params;
    if (vendor_id) {
      const vId = parseInt(vendor_id);
      query = `
        SELECT HOUR(o.order_date) as hour_of_day, 
               COUNT(DISTINCT o.id) as order_count, 
               SUM(oi.quantity * oi.price) as revenue
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN items i ON oi.item_id = i.id
        WHERE o.order_date BETWEEN ? AND ? 
          AND o.status != 'Cancelled'
          AND i.vendor_id = ?
        GROUP BY HOUR(o.order_date)
        ORDER BY hour_of_day`;
      params = [startStr, endStr, vId];
    } else {
      query = `
        SELECT HOUR(order_date) as hour_of_day, 
               COUNT(id) as order_count, 
               SUM(total_amount) as revenue
        FROM orders
        WHERE order_date BETWEEN ? AND ? 
          AND status != 'Cancelled'
        GROUP BY HOUR(order_date)
        ORDER BY hour_of_day`;
      params = [startStr, endStr];
    }

    const [rows] = await pool.query(query, params);
    
    // Fill in all 24 hours of the day
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: `${i.toString().padStart(2, '0')}:00`,
      orders: 0,
      revenue: 0.00
    }));

    for (const r of rows) {
      const hr = parseInt(r.hour_of_day);
      if (hr >= 0 && hr < 24) {
        hourlyData[hr].orders = parseInt(r.order_count || 0);
        hourlyData[hr].revenue = parseFloat(r.revenue || 0);
      }
    }

    res.json(hourlyData);
  } catch (error) {
    console.error('Error executing peak hours analysis:', error);
    res.status(500).json({ error: 'Failed to generate peak hours analysis.' });
  }
});

// 5. Monthly Profit & Loss Statement
app.get('/api/reports/monthly-pl', async (req, res) => {
  const { year } = req.query;
  const currentYear = year ? parseInt(year) : new Date().getFullYear();

  try {
    const plData = [];

    for (let month = 1; month <= 12; month++) {
      const monthStart = `${currentYear}-${month.toString().padStart(2, '0')}-01 00:00:00`;
      // Find end date of the month
      const lastDay = new Date(currentYear, month, 0).getDate();
      const monthEnd = `${currentYear}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')} 23:59:59`;

      // 1. Total Revenue
      const [sales] = await pool.query(
        "SELECT IFNULL(SUM(total_amount), 0) as revenue FROM orders WHERE order_date BETWEEN ? AND ? AND status != 'Cancelled'",
        [monthStart, monthEnd]
      );
      const revenue = parseFloat(sales[0].revenue || 0);

      // 2. COGS (Cost of Goods Sold)
      const [cogsRows] = await pool.query(
        `SELECT IFNULL(SUM(oi.recorded_cogs), 0) as cogs
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         WHERE o.order_date BETWEEN ? AND ? AND o.status != 'Cancelled'`,
        [monthStart, monthEnd]
      );
      const cogs = parseFloat(cogsRows[0].cogs || 0);

      // 3. Staff Salaries
      const [staffRows] = await pool.query(
        'SELECT IFNULL(SUM(gross_salary), 0) as salaries FROM payroll WHERE month = ? AND year = ?',
        [month, currentYear]
      );
      const staffSalaries = parseFloat(staffRows[0].salaries || 0);

      // 4. Overheads (Expenses logged for this month)
      const [overheadsRows] = await pool.query(
        'SELECT IFNULL(SUM(amount), 0) as amount FROM overheads WHERE expense_date BETWEEN ? AND ?',
        [`${currentYear}-${month.toString().padStart(2, '0')}-01`, `${currentYear}-${month.toString().padStart(2, '0')}-${lastDay}`]
      );
      const overheads = parseFloat(overheadsRows[0].amount || 0);

      // 5. Wastage Cost
      const [wastageRows] = await pool.query(
        `SELECT IFNULL(SUM(ABS(sl.recorded_cost)), 0) as wastage
         FROM stock_logs sl
         JOIN raw_materials rm ON sl.material_id = rm.id
         WHERE sl.logged_at BETWEEN ? AND ? AND sl.log_type = 'Wastage'`,
        [monthStart, monthEnd]
      );
      const wastage = parseFloat(wastageRows[0].wastage || 0);

      // 6. Total Purchases (cash outflow)
      const [purchaseRows] = await pool.query(
        `SELECT IFNULL(SUM(ABS(sl.recorded_cost)), 0) as purchases
         FROM stock_logs sl
         WHERE sl.logged_at BETWEEN ? AND ? AND sl.log_type = 'Purchase'`,
        [monthStart, monthEnd]
      );
      const totalPurchases = parseFloat(purchaseRows[0].purchases || 0);

      const grossProfit = revenue - cogs;
      const netProfit = revenue - cogs - staffSalaries - overheads - wastage;

      plData.push({
        month: month,
        monthName: new Date(currentYear, month - 1, 1).toLocaleString('default', { month: 'long' }),
        revenue: revenue,
        cogs: cogs,
        grossProfit: grossProfit,
        staffCost: staffSalaries,
        overheads: overheads,
        wastageCost: wastage,
        purchases: totalPurchases,
        netProfit: netProfit
      });
    }

    res.json(plData);
  } catch (error) {
    console.error('Error generating monthly P&L:', error);
    res.status(500).json({ error: 'Failed to generate monthly P&L.' });
  }
});

// 6. Customer Analytics & Feedback Summary
app.get('/api/reports/customer-analytics', async (req, res) => {
  try {
    // Total registered customers
    const [custCountRows] = await pool.query('SELECT COUNT(id) as total FROM customers');
    const totalCustomers = custCountRows[0].total;

    // Total outstanding loyalty points
    const [loyaltyRows] = await pool.query('SELECT SUM(loyalty_points) as total FROM customers');
    const totalLoyaltyPoints = loyaltyRows[0].total || 0;

    // Loyalty leaderboard (Top 10 customers with total visits & spent)
    const [leaderboard] = await pool.query(`
      SELECT c.id, c.name, c.phone, c.loyalty_points,
             COUNT(o.id) as total_visits,
             IFNULL(SUM(o.total_amount), 0) as total_spent
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id AND o.status != 'Cancelled'
      GROUP BY c.id
      ORDER BY c.loyalty_points DESC
      LIMIT 10
    `);

    // Repeat customer rate (Customers with more than 1 order)
    const [repeatRows] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN order_count > 1 THEN 1 END) as repeat_count,
        COUNT(id) as total_customers_with_orders
      FROM (
        SELECT customer_id as id, COUNT(id) as order_count 
        FROM orders 
        WHERE customer_id IS NOT NULL AND status != 'Cancelled'
        GROUP BY customer_id
      ) t
    `);
    
    const repeatCount = repeatRows[0].repeat_count || 0;
    const totalCustomersWithOrders = repeatRows[0].total_customers_with_orders || 0;
    const repeatCustomerRate = totalCustomersWithOrders > 0 ? (repeatCount / totalCustomersWithOrders) * 100 : 0;

    // Average rating score
    const [feedbackRows] = await pool.query(
      'SELECT COUNT(id) as count, AVG(rating) as avg_rating FROM customer_feedback'
    );
    
    const totalFeedbacks = feedbackRows[0].count;
    const avgRating = parseFloat(feedbackRows[0].avg_rating || 0);

    // Rating distribution
    const [ratingDistRows] = await pool.query(
      'SELECT rating, COUNT(id) as count FROM customer_feedback GROUP BY rating ORDER BY rating DESC'
    );

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of ratingDistRows) {
      ratingDistribution[r.rating] = r.count;
    }

    // Recent feedback entries (limit to 10)
    const [feedback] = await pool.query(
      'SELECT id, customer_name, rating, comments, DATE_FORMAT(feedback_date, "%Y-%m-%d") as feedback_date FROM customer_feedback ORDER BY feedback_date DESC, id DESC LIMIT 10'
    );

    res.json({
      totalCustomers: totalCustomers,
      totalLoyaltyPoints: totalLoyaltyPoints,
      repeatCustomerRate: repeatCustomerRate,
      averageRating: avgRating,
      totalFeedbacks: totalFeedbacks,
      ratingDistribution: ratingDistribution,
      leaderboard: leaderboard,
      feedback: feedback
    });
  } catch (error) {
    console.error('Error generating customer analytics:', error);
    res.status(500).json({ error: 'Failed to generate customer analytics.' });
  }
});
// ==========================================
// 15. NEW COMPLETED FEATURES ENDPOINTS
// ==========================================

// Get all combos
app.get('/api/combos', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT ci.combo_id, ci.child_item_id, ci.quantity, 
             i.name as child_name, i.price as child_price,
             p.name as combo_name
      FROM combo_items ci
      JOIN items i ON ci.child_item_id = i.id
      JOIN items p ON ci.combo_id = p.id
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching combos:', error);
    res.status(500).json({ error: 'Failed to fetch combo items' });
  }
});

// Set combo child items
app.post('/api/combos', async (req, res) => {
  const { combo_id, child_items } = req.body;
  if (!combo_id || !child_items || !Array.isArray(child_items)) {
    return res.status(400).json({ error: 'combo_id and child_items array are required.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM combo_items WHERE combo_id = ?', [combo_id]);
    for (const child of child_items) {
      await connection.query(
        'INSERT INTO combo_items (combo_id, child_item_id, quantity) VALUES (?, ?, ?)',
        [combo_id, child.child_item_id, child.quantity]
      );
    }
    await connection.commit();
    res.json({ success: true, message: 'Combo child items updated successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error setting combos:', error);
    res.status(500).json({ error: 'Failed to set combo items' });
  } finally {
    connection.release();
  }
});

// Opening stock sheet
app.get('/api/stock/opening-sheet', async (req, res) => {
  try {
    const [materials] = await pool.query('SELECT * FROM raw_materials ORDER BY name');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    const yesterdayStr = formatLocalTimestamp(yesterday);

    const result = [];
    for (const mat of materials) {
      const [futureLogs] = await pool.query(
        'SELECT IFNULL(SUM(change_qty), 0) as change_sum FROM stock_logs WHERE material_id = ? AND logged_at > ?',
        [mat.id, yesterdayStr]
      );
      const closingYesterday = parseFloat(mat.stock_level) - parseFloat(futureLogs[0].change_sum);
      result.push({
        id: mat.id,
        name: mat.name,
        unit: mat.unit,
        yesterday_closing: Math.max(0, closingYesterday),
        min_stock: parseFloat(mat.min_stock),
        current_stock: parseFloat(mat.stock_level)
      });
    }
    res.json(result);
  } catch (error) {
    console.error('Error fetching opening sheet:', error);
    res.status(500).json({ error: 'Failed to fetch opening sheet' });
  }
});

// Opening Stock entry
app.post('/api/stock/opening-entry', async (req, res) => {
  const { entries } = req.body;
  if (!entries || !Array.isArray(entries)) {
    return res.status(400).json({ error: 'Entries array is required.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const entry of entries) {
      const matId = parseInt(entry.material_id);
      const opQty = parseFloat(entry.opening_qty);
      const [mat] = await connection.query('SELECT stock_level, vendor_id FROM raw_materials WHERE id = ? FOR UPDATE', [matId]);
      if (mat.length > 0) {
        const current = parseFloat(mat[0].stock_level);
        const diff = opQty - current;
        await connection.query('UPDATE raw_materials SET stock_level = ? WHERE id = ?', [opQty, matId]);
        await connection.query(
          'INSERT INTO stock_logs (material_id, change_qty, log_type, reason, vendor_id) VALUES (?, ?, "Opening", ?, ?)',
          [matId, diff, 'Bulk Opening Stock Entry', mat[0].vendor_id]
        );
      }
    }
    await connection.commit();
    res.json({ success: true, message: 'Opening stock updated successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error recording opening stock:', error);
    res.status(500).json({ error: 'Failed to save opening stock.' });
  } finally {
    connection.release();
  }
});

// Closing stock entry
app.post('/api/stock/closing-entry', async (req, res) => {
  const { entries } = req.body;
  if (!entries || !Array.isArray(entries)) {
    return res.status(400).json({ error: 'Entries array is required.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const results = [];
    for (const entry of entries) {
      const matId = parseInt(entry.material_id);
      const physQty = parseFloat(entry.physical_qty);
      const [mat] = await connection.query('SELECT name, stock_level, vendor_id FROM raw_materials WHERE id = ? FOR UPDATE', [matId]);
      if (mat.length > 0) {
        const systemQty = parseFloat(mat[0].stock_level);
        const variance = physQty - systemQty;
        await connection.query('UPDATE raw_materials SET stock_level = ? WHERE id = ?', [physQty, matId]);
        await connection.query(
          'INSERT INTO stock_logs (material_id, change_qty, log_type, reason, vendor_id) VALUES (?, ?, "Closing", ?, ?)',
          [matId, variance, `Daily Physical Closing Count (System: ${systemQty.toFixed(2)}, Physical: ${physQty.toFixed(2)}, Var: ${variance.toFixed(2)})`, mat[0].vendor_id]
        );
        results.push({
          material_id: matId,
          name: mat[0].name,
          systemQty,
          physicalQty: physQty,
          variance
        });
      }
    }
    await connection.commit();
    res.json({ success: true, message: 'Closing stock recorded successfully.', results });
  } catch (error) {
    await connection.rollback();
    console.error('Error recording closing stock:', error);
    res.status(500).json({ error: 'Failed to save closing stock.' });
  } finally {
    connection.release();
  }
});

// Suppliers CRUD
app.get('/api/suppliers', async (req, res) => {
  try {
    let query = `
      SELECT s.*, IFNULL(SUM(CASE WHEN l.log_type = 'Purchase' AND l.payment_status = 'Pending' THEN l.recorded_cost ELSE 0 END), 0) as outstanding_balance
      FROM suppliers s
      LEFT JOIN stock_logs l ON s.id = l.supplier_id
    `;
    let params = [];
    
    let vendor_id = req.query.vendor_id;
    if (req.user && req.user.vendor_id) {
      vendor_id = req.user.vendor_id;
    }
    
    if (vendor_id === 'all') {
      // Central admin viewing all stalls, no WHERE clause needed
    } else if (vendor_id && vendor_id !== 'null') {
      query += ' WHERE s.vendor_id = ?';
      params.push(parseInt(vendor_id));
    } else if (vendor_id === 'null' || (req.user && req.user.vendor_id === null)) {
      query += ' WHERE s.vendor_id IS NULL'; // Central Store
    }
    
    query += ' GROUP BY s.id ORDER BY s.name';
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// Supplier Purchase History
app.get('/api/suppliers/:id/history', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT sl.id, sl.logged_at, sl.change_qty, sl.reason, rm.name as material_name, rm.unit
      FROM stock_logs sl
      JOIN raw_materials rm ON sl.material_id = rm.id
      WHERE sl.supplier_id = ? AND sl.log_type = 'Purchase'
      ORDER BY sl.logged_at DESC
    `, [id]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching supplier history:', error);
    res.status(500).json({ error: 'Failed to fetch supplier history' });
  }
});

app.get('/api/suppliers/:id/pending-bills', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT sl.id, sl.logged_at, sl.change_qty, sl.recorded_cost, rm.name as material_name, rm.unit
      FROM stock_logs sl
      JOIN raw_materials rm ON sl.material_id = rm.id
      WHERE sl.supplier_id = ? AND sl.log_type = 'Purchase' AND sl.payment_status = 'Pending'
      ORDER BY sl.logged_at ASC
    `, [id]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching pending bills:', error);
    res.status(500).json({ error: 'Failed to fetch pending bills' });
  }
});

app.post('/api/suppliers/:id/pay', async (req, res) => {
  const { id } = req.params;
  const { log_ids } = req.body;
  if (!log_ids || log_ids.length === 0) return res.status(400).json({ error: 'No bills selected' });
  try {
    const placeholders = log_ids.map(() => '?').join(',');
    await pool.query(`
      UPDATE stock_logs 
      SET payment_status = 'Paid' 
      WHERE supplier_id = ? AND log_type = 'Purchase' AND id IN (${placeholders})
    `, [id, ...log_ids]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error settling bills:', error);
    res.status(500).json({ error: 'Failed to settle bills' });
  }
});
app.post('/api/suppliers', async (req, res) => {
  const { name, contact_person, phone, email, address, gst_no, payment_terms, items_supplied, delivery_schedule, vendor_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Supplier name is required.' });

  let final_vendor_id = vendor_id ? parseInt(vendor_id) : null;
  if (req.user && req.user.vendor_id) {
    final_vendor_id = req.user.vendor_id;
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO suppliers (name, contact_person, phone, email, address, gst_no, payment_terms, items_supplied, delivery_schedule, vendor_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, contact_person || null, phone || null, email || null, address || null, gst_no || null, payment_terms || 'Net 30', items_supplied || null, delivery_schedule || null, final_vendor_id]
    );
    res.status(201).json({ id: result.insertId, name, contact_person, phone, email, address, gst_no, payment_terms, items_supplied, delivery_schedule, outstanding_balance: 0.00, vendor_id: final_vendor_id });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});
app.put('/api/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, contact_person, phone, email, address, gst_no, payment_terms, items_supplied, delivery_schedule, vendor_id } = req.body;

  let final_vendor_id = vendor_id ? parseInt(vendor_id) : null;
  if (req.user && req.user.vendor_id) {
    final_vendor_id = req.user.vendor_id;
  }

  try {
    // Enforce vendor_id boundary for stall managers
    const [existing] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [id]);
    if (existing.length > 0 && req.user && req.user.vendor_id && existing[0].vendor_id !== req.user.vendor_id) {
      return res.status(403).json({ error: "Forbidden: Cannot modify another stall's supplier" });
    }

    await pool.query(
      `UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, gst_no = ?, payment_terms = ?, items_supplied = ?, delivery_schedule = ?, vendor_id = ?
       WHERE id = ?`,
      [name, contact_person || null, phone || null, email || null, address || null, gst_no || null, payment_terms, items_supplied || null, delivery_schedule || null, final_vendor_id, id]
    );
    res.json({ id: parseInt(id), name, contact_person, phone, email, address, gst_no, payment_terms, items_supplied, delivery_schedule, vendor_id: final_vendor_id });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});
app.delete('/api/suppliers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM suppliers WHERE id = ?', [id]);
    res.json({ success: true, message: 'Supplier deleted successfully.' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

// Refunds
app.post('/api/orders/:id/refund', async (req, res) => {
  const { id } = req.params;
  const { refund_amount } = req.body;
  if (refund_amount === undefined || isNaN(refund_amount)) {
    return res.status(400).json({ error: 'Refund amount is required.' });
  }
  try {
    await pool.query(
      'UPDATE orders SET refund_status = "Refunded", refund_amount = ? WHERE id = ?',
      [parseFloat(refund_amount), id]
    );
    res.json({ success: true, message: `Refund of ${refund_amount} processed for order #${id}.` });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// Cash Drawer status
app.get('/api/cash-drawer/status', async (req, res) => {
  const { date } = req.query;
  const dateVal = date || new Date().toISOString().split('T')[0];
  try {
    const [rows] = await pool.query('SELECT * FROM cash_drawer WHERE drawer_date = ?', [dateVal]);
    const [salesRow] = await pool.query(
      `SELECT IFNULL(SUM(total_amount), 0) as cash_sales 
       FROM orders 
       WHERE payment_mode = 'Cash' AND DATE(order_date) = ? AND status != 'Cancelled'`,
      [dateVal]
    );
    const systemCash = parseFloat(salesRow[0].cash_sales);

    if (rows.length === 0) {
      return res.json({ status: 'Closed', drawer_date: dateVal, system_cash: systemCash, opening_cash: 0, closing_cash: null, denominations: null, shortage_excess: 0 });
    }
    res.json({ ...rows[0], system_cash: systemCash });
  } catch (error) {
    console.error('Error fetching cash drawer status:', error);
    res.status(500).json({ error: 'Failed to fetch cash drawer status' });
  }
});

// Open Cash drawer
app.post('/api/cash-drawer/open', async (req, res) => {
  const { drawer_date, opening_cash, notes } = req.body;
  const dateVal = drawer_date || new Date().toISOString().split('T')[0];
  try {
    const [existing] = await pool.query('SELECT id FROM cash_drawer WHERE drawer_date = ?', [dateVal]);
    if (existing.length > 0) {
      await pool.query(
        'UPDATE cash_drawer SET opening_cash = ?, notes = ?, status = "Open" WHERE drawer_date = ?',
        [parseFloat(opening_cash || 0), notes || null, dateVal]
      );
    } else {
      await pool.query(
        'INSERT INTO cash_drawer (drawer_date, opening_cash, notes, status) VALUES (?, ?, ?, "Open")',
        [dateVal, parseFloat(opening_cash || 0), notes || null]
      );
    }
    res.json({ success: true, message: `Cash drawer opened for ${dateVal}` });
  } catch (error) {
    console.error('Error opening cash drawer:', error);
    res.status(500).json({ error: 'Failed to open cash drawer' });
  }
});

// Close cash drawer
app.post('/api/cash-drawer/close', async (req, res) => {
  const { drawer_date, closing_cash, denominations, notes, handover_to } = req.body;
  const dateVal = drawer_date || new Date().toISOString().split('T')[0];
  try {
    const [existing] = await pool.query('SELECT * FROM cash_drawer WHERE drawer_date = ?', [dateVal]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'No cash drawer session found for this date. Please open drawer first.' });
    }

    const openingCash = parseFloat(existing[0].opening_cash || 0);
    const [salesRow] = await pool.query(
      `SELECT IFNULL(SUM(total_amount), 0) as cash_sales 
       FROM orders 
       WHERE payment_mode = 'Cash' AND DATE(order_date) = ? AND status != 'Cancelled'`,
      [dateVal]
    );
    const systemCash = parseFloat(salesRow[0].cash_sales);
    const expectedCash = openingCash + systemCash;
    const physicalClosing = parseFloat(closing_cash || 0);
    const shortageExcess = physicalClosing - expectedCash;

    await pool.query(
      `UPDATE cash_drawer 
       SET closing_cash = ?, system_cash = ?, shortage_excess = ?, denominations = ?, handover_to = ?, notes = ?, status = 'Closed'
       WHERE drawer_date = ?`,
      [physicalClosing, systemCash, shortageExcess, typeof denominations === 'string' ? denominations : JSON.stringify(denominations), handover_to || null, notes || null, dateVal]
    );

    res.json({ 
      success: true, 
      message: `Cash drawer closed for ${dateVal}`,
      summary: { openingCash, systemCash, expectedCash, physicalClosing, shortageExcess } 
    });
  } catch (error) {
    console.error('Error closing cash drawer:', error);
    res.status(500).json({ error: 'Failed to close cash drawer' });
  }
});

// Reconciliation summary
app.get('/api/reconciliation/summary', async (req, res) => {
  const { date } = req.query;
  const dateVal = date || new Date().toISOString().split('T')[0];
  try {
    const [orders] = await pool.query(
      `SELECT payment_mode, total_amount as total, payment_details
       FROM orders
       WHERE DATE(order_date) = ? AND status != 'Cancelled'`,
      [dateVal]
    );

    const systemTotals = { Cash: 0, UPI: 0, Card: 0, 'Meal Card': 0, Credit: 0 };
    orders.forEach(row => {
      if (row.payment_mode === 'Split' && row.payment_details) {
        try {
          const splits = JSON.parse(row.payment_details);
          splits.forEach(s => {
            if (systemTotals[s.mode] !== undefined) {
              systemTotals[s.mode] += parseFloat(s.amount || 0);
            }
          });
        } catch (e) { console.error('Error parsing split payments:', e); }
      } else {
        if (systemTotals[row.payment_mode] !== undefined) {
          systemTotals[row.payment_mode] += parseFloat(row.total);
        }
      }
    });

    const [walletTopups] = await pool.query(
      `SELECT payment_mode, transaction_amount as amount
       FROM wallet_transactions
       WHERE type = 'credit' AND DATE(created_at) = ?`,
      [dateVal]
    );

    walletTopups.forEach(row => {
      const mode = row.payment_mode || 'Cash';
      if (systemTotals[mode] !== undefined) {
        systemTotals[mode] += parseFloat(row.amount || 0);
      } else {
        systemTotals[mode] = parseFloat(row.amount || 0);
      }
    });

    const [recon] = await pool.query('SELECT d.*, s.name as submitted_by_name FROM daily_reconciliation d LEFT JOIN staff s ON d.submitted_by = s.id WHERE d.recon_date = ? ORDER BY d.created_at DESC', [dateVal]);
    res.json({
      recon_date: dateVal,
      systemTotals,
      reconciliation: recon
    });
  } catch (error) {
    console.error('Error fetching reconciliation summary:', error);
    res.status(500).json({ error: 'Failed to fetch reconciliation summary' });
  }
});

// Post daily reconciliation
app.post('/api/reconciliation', async (req, res) => {
  const { recon_date, physical_cash, upi_settlement, card_settlement, notes, submitted_by } = req.body;
  const dateVal = recon_date || new Date().toISOString().split('T')[0];
  try {
    const [orders] = await pool.query(
      `SELECT payment_mode, total_amount as total, payment_details
       FROM orders
       WHERE DATE(order_date) = ? AND status != 'Cancelled'`,
      [dateVal]
    );

    const systemTotals = { Cash: 0, UPI: 0, Card: 0, 'Meal Card': 0, Credit: 0 };
    orders.forEach(row => {
      if (row.payment_mode === 'Split' && row.payment_details) {
        try {
          const splits = JSON.parse(row.payment_details);
          splits.forEach(s => {
            if (systemTotals[s.mode] !== undefined) {
              systemTotals[s.mode] += parseFloat(s.amount || 0);
            }
          });
        } catch (e) { console.error('Error parsing split payments:', e); }
      } else {
        if (systemTotals[row.payment_mode] !== undefined) {
          systemTotals[row.payment_mode] += parseFloat(row.total);
        }
      }
    });

    const sysCash = systemTotals['Cash'];
    const sysUpi = systemTotals['UPI'];
    const sysCard = systemTotals['Card'];
    const sysMealCard = systemTotals['Meal Card'];

    const physCash = parseFloat(physical_cash || 0);
    const upiSet = parseFloat(upi_settlement || 0);
    const cardSet = parseFloat(card_settlement || 0);

    const discrepancy = (physCash + upiSet + cardSet) - (sysCash + sysUpi + sysCard);

    await pool.query(
      `INSERT INTO daily_reconciliation 
         (recon_date, system_cash, system_upi, system_card, system_meal_card, physical_cash, upi_settlement, card_settlement, discrepancy, notes, submitted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [dateVal, sysCash, sysUpi, sysCard, sysMealCard, physCash, upiSet, cardSet, discrepancy, notes || null, submitted_by || null]
    );

    res.json({ success: true, message: `Reconciliation saved for ${dateVal}`, discrepancy });
  } catch (error) {
    console.error('Error saving reconciliation:', error);
    res.status(500).json({ error: 'Failed to save daily reconciliation' });
  }
});

// Credit customers outstanding list
app.get('/api/credits/customers', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.id, c.name, c.phone, c.email,
             IFNULL(SUM(CASE WHEN cl.type = 'Credit' THEN cl.amount ELSE 0 END), 0) - 
             IFNULL(SUM(CASE WHEN cl.type = 'Payment' THEN cl.amount ELSE 0 END), 0) as outstanding
      FROM customers c
      LEFT JOIN credit_ledger cl ON c.id = cl.customer_id
      GROUP BY c.id
      HAVING outstanding > 0 OR outstanding < 0 OR EXISTS (SELECT 1 FROM credit_ledger WHERE customer_id = c.id)
      ORDER BY c.name
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching credits:', error);
    res.status(500).json({ error: 'Failed to fetch customer credits' });
  }
});

// Credit customer ledger
app.get('/api/credits/ledger/:customerId', async (req, res) => {
  const { customerId } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT *, DATE_FORMAT(created_at, "%Y-%m-%d %H:%i:%s") as created_at FROM credit_ledger WHERE customer_id = ? ORDER BY id DESC',
      [customerId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching credit ledger:', error);
    res.status(500).json({ error: 'Failed to fetch credit ledger' });
  }
});

// Credit settlement post
app.post('/api/credits/settle', async (req, res) => {
  const { customer_id, amount, payment_mode, notes } = req.body;
  if (!customer_id || amount === undefined) {
    return res.status(400).json({ error: 'customer_id and amount are required.' });
  }
  try {
    await pool.query(
      'INSERT INTO credit_ledger (customer_id, amount, type, notes, is_settled, settled_date) VALUES (?, ?, "Payment", ?, 1, NOW())',
      [customer_id, parseFloat(amount), notes || `Credit settlement payment via ${payment_mode || 'Cash'}`]
    );
    res.json({ success: true, message: 'Credit settlement recorded successfully.' });
  } catch (error) {
    console.error('Error settling credit:', error);
    res.status(500).json({ error: 'Failed to settle credit' });
  }
});

// GST Report
app.get('/api/reports/gst', async (req, res) => {
  const { month, year, startDate, endDate, vendor_id } = req.query;

  try {
    let query = `SELECT oi.quantity, oi.price, i.name, i.category, i.gst_rate, v.name as vendor_name, i.vendor_id
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN items i ON oi.item_id = i.id
       LEFT JOIN vendors v ON i.vendor_id = v.id
       WHERE o.status != 'Cancelled'`;
    let params = [];

    if (startDate && endDate) {
      query += ` AND DATE(o.order_date) >= ? AND DATE(o.order_date) <= ?`;
      params.push(startDate, endDate);
    } else {
      let m = month;
      let y = year;
      if (!m || !y) {
        if (startDate) {
          const parts = startDate.split('-'); // YYYY-MM-DD
          y = parts[0];
          m = parts[1];
        } else {
          const d = new Date();
          y = d.getFullYear();
          m = d.getMonth() + 1;
        }
      }
      query += ` AND MONTH(o.order_date) = ? AND YEAR(o.order_date) = ?`;
      params.push(parseInt(m), parseInt(y));
    }

    if (vendor_id) {
      query += ` AND i.vendor_id = ?`;
      params.push(vendor_id);
    }

    const [orderItems] = await pool.query(query, params);

    const categoryHSNMap = {
      Breakfast: 'HSN-9961',
      Lunch: 'HSN-9962',
      Snacks: 'HSN-9963',
      Beverages: 'HSN-9964',
      Combos: 'HSN-9965',
      Specials: 'HSN-9966'
    };

    const hsnSummary = {};
    const vendorSummary = {};

    orderItems.forEach(item => {
      const qty = parseInt(item.quantity);
      const price = parseFloat(item.price);
      const gstRate = parseFloat(item.gst_rate || 5);
      const totalSales = qty * price;
      const taxableValue = totalSales / (1 + (gstRate / 100));
      const gstAmount = totalSales - taxableValue;

      const cat = item.category || 'Lunch';
      const hsn = categoryHSNMap[cat] || 'HSN-9960';
      const hsnKey = `${hsn}_${gstRate}`;

      if (!hsnSummary[hsnKey]) {
        hsnSummary[hsnKey] = {
          hsn,
          category: cat,
          gst_rate: gstRate,
          total_sales: 0,
          taxable_value: 0,
          cgst: 0,
          sgst: 0,
          gst_amount: 0
        };
      }
      hsnSummary[hsnKey].total_sales += totalSales;
      hsnSummary[hsnKey].taxable_value += taxableValue;
      hsnSummary[hsnKey].gst_amount += gstAmount;
      hsnSummary[hsnKey].cgst += gstAmount / 2;
      hsnSummary[hsnKey].sgst += gstAmount / 2;

      const vName = item.vendor_name || 'Main Canteen / Food Court';
      const vId = item.vendor_id || 0;
      const vendorKey = `${vId}`;

      if (!vendorSummary[vendorKey]) {
        vendorSummary[vendorKey] = {
          vendor_id: vId,
          vendor_name: vName,
          total_sales: 0,
          taxable_value: 0,
          gst_amount: 0,
          cgst: 0,
          sgst: 0
        };
      }
      vendorSummary[vendorKey].total_sales += totalSales;
      vendorSummary[vendorKey].taxable_value += taxableValue;
      vendorSummary[vendorKey].gst_amount += gstAmount;
      vendorSummary[vendorKey].cgst += gstAmount / 2;
      vendorSummary[vendorKey].sgst += gstAmount / 2;
    });

    res.json({
      hsnSummary: Object.values(hsnSummary),
      vendorSummary: Object.values(vendorSummary)
    });
  } catch (error) {
    console.error('Error generating GST report:', error);
    res.status(500).json({ error: 'Failed to generate GST report' });
  }
});

// Leave balances fetch
app.get('/api/leaves/balance/:staffId', async (req, res) => {
  const { staffId } = req.params;
  const currentYear = new Date().getFullYear();
  try {
    let [rows] = await pool.query('SELECT * FROM leave_balances WHERE staff_id = ? AND year = ?', [staffId, currentYear]);
    if (rows.length === 0) {
      await pool.query('INSERT IGNORE INTO leave_balances (staff_id, year) VALUES (?, ?)', [staffId, currentYear]);
      [rows] = await pool.query('SELECT * FROM leave_balances WHERE staff_id = ? AND year = ?', [staffId, currentYear]);
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching leave balances:', error);
    res.status(500).json({ error: 'Failed to fetch leave balances' });
  }
});

// Shift swap request post
app.post('/api/shifts/swap-request', async (req, res) => {
  const { requester_id, target_id, swap_date, reason } = req.body;
  if (!requester_id || !target_id || !swap_date) {
    return res.status(400).json({ error: 'requester_id, target_id, and swap_date are required.' });
  }
  try {
    const [reqRoster] = await pool.query('SELECT shift_id FROM shift_roster WHERE staff_id = ? AND roster_date = ?', [requester_id, swap_date]);
    const [targetRoster] = await pool.query('SELECT shift_id FROM shift_roster WHERE staff_id = ? AND roster_date = ?', [target_id, swap_date]);
    
    const rShiftId = reqRoster.length > 0 ? reqRoster[0].shift_id : null;
    const tShiftId = targetRoster.length > 0 ? targetRoster[0].shift_id : null;

    await pool.query(
      `INSERT INTO shift_swap_requests (requester_id, target_id, swap_date, requester_shift_id, target_shift_id, reason, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
      [requester_id, target_id, swap_date, rShiftId, tShiftId, reason || null]
    );
    res.status(201).json({ success: true, message: 'Shift swap request submitted.' });
  } catch (error) {
    console.error('Error submitting shift swap request:', error);
    res.status(500).json({ error: 'Failed to submit shift swap request' });
  }
});

// Shift swap requests list
app.get('/api/shifts/swap-requests', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, 
             s1.name as requester_name, 
             s2.name as target_name,
             sh1.name as requester_shift_name,
             sh2.name as target_shift_name
      FROM shift_swap_requests r
      JOIN staff s1 ON r.requester_id = s1.id
      JOIN staff s2 ON r.target_id = s2.id
      LEFT JOIN shifts sh1 ON r.requester_shift_id = sh1.id
      LEFT JOIN shifts sh2 ON r.target_shift_id = sh2.id
      ORDER BY r.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching shift swap requests:', error);
    res.status(500).json({ error: 'Failed to fetch shift swap requests' });
  }
});

// Approve shift swap
app.put('/api/shifts/swap/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { approved_by } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query('SELECT * FROM shift_swap_requests WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Swap request not found.' });
    }

    const request = rows[0];
    if (request.status !== 'Pending') {
      connection.release();
      return res.status(400).json({ error: `Request has already been ${request.status}.` });
    }

    // Delete existing roster entries for both staff on this date
    await connection.query(
      'DELETE FROM shift_roster WHERE staff_id IN (?, ?) AND roster_date = ?',
      [request.requester_id, request.target_id, request.swap_date]
    );

    // Insert swapped shifts (only if they had a shift to swap, else they become 'Off')
    if (request.target_shift_id !== null) {
      await connection.query(
        'INSERT INTO shift_roster (staff_id, shift_id, roster_date, status, swap_with_staff_id) VALUES (?, ?, ?, ?, ?)',
        [request.requester_id, request.target_shift_id, request.swap_date, 'Swapped', request.target_id]
      );
    }
    if (request.requester_shift_id !== null) {
      await connection.query(
        'INSERT INTO shift_roster (staff_id, shift_id, roster_date, status, swap_with_staff_id) VALUES (?, ?, ?, ?, ?)',
        [request.target_id, request.requester_shift_id, request.swap_date, 'Swapped', request.requester_id]
      );
    }

    await connection.query(
      'UPDATE shift_swap_requests SET status = "Approved", approved_by = ? WHERE id = ?',
      [approved_by || null, id]
    );

    await connection.commit();
    res.json({ success: true, message: 'Shift swap approved and roster updated successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error approving shift swap:', error);
    res.status(500).json({ error: 'Failed to approve shift swap' });
  } finally {
    connection.release();
  }
});

// Reject shift swap
app.put('/api/shifts/swap/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { approved_by } = req.body;
  try {
    await pool.query(
      'UPDATE shift_swap_requests SET status = "Rejected", approved_by = ? WHERE id = ?',
      [approved_by || null, id]
    );
    res.json({ success: true, message: 'Shift swap request rejected.' });
  } catch (error) {
    console.error('Error rejecting shift swap:', error);
    res.status(500).json({ error: 'Failed to reject shift swap' });
  }
});

// Holidays list
app.get('/api/holidays', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT *, DATE_FORMAT(holiday_date, "%Y-%m-%d") as holiday_date FROM holidays ORDER BY holiday_date');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

// Add holiday
app.post('/api/holidays', async (req, res) => {
  const { holiday_date, name, is_recurring } = req.body;
  if (!holiday_date || !name) {
    return res.status(400).json({ error: 'holiday_date and name are required.' });
  }
  try {
    await pool.query(
      'INSERT INTO holidays (holiday_date, name, is_recurring) VALUES (?, ?, ?)',
      [holiday_date, name, is_recurring ? 1 : 0]
    );
    res.status(201).json({ success: true, message: 'Holiday added successfully.' });
  } catch (error) {
    console.error('Error adding holiday:', error);
    res.status(500).json({ error: 'Failed to add holiday' });
  }
});

// Delete holiday
app.delete('/api/holidays/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM holidays WHERE id = ?', [id]);
    res.json({ success: true, message: 'Holiday deleted successfully.' });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});




// ==========================================
// CRM & NOTIFICATIONS ENGINE ROUTES
// ==========================================

// ── Settings ──────────────────────────────────────────────────────────────────
app.get('/api/notifications/settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM notification_settings WHERE id=1');
    const s = rows[0] || {};
    // Never expose raw passwords/keys in GET response (redact)
    const safe = { ...s };
    if (safe.gupshup_api_key) safe.gupshup_api_key = safe.gupshup_api_key ? '••••••••' : '';
    if (safe.msg91_auth_key) safe.msg91_auth_key = safe.msg91_auth_key ? '••••••••' : '';
    if (safe.smtp_pass) safe.smtp_pass = safe.smtp_pass ? '••••••••' : '';
    res.json(safe);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/notifications/settings', async (req, res) => {
  try {
    const fields = [
      'whatsapp_provider','gupshup_api_key','gupshup_app_name','gupshup_phone',
      'sms_provider','msg91_auth_key','msg91_sender_id',
      'smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from_name',
      'owner_whatsapp','owner_email',
      'daily_summary_time','daily_summary_enabled',
      'loyalty_points_per_100','loyalty_min_redeem','loyalty_redeem_ratio','loyalty_enabled',
      'low_stock_alert_enabled','low_stock_throttle_hours',
      'order_ready_sms','order_ready_whatsapp','negative_feedback_threshold'
    ];
    const body = req.body;
    const updates = [];
    const vals = [];
    for (const f of fields) {
      if (body[f] !== undefined && body[f] !== '••••••••') {
        updates.push(`${f}=?`);
        vals.push(body[f]);
      }
    }
    if (updates.length === 0) return res.json({ success: true, message: 'No changes' });
    vals.push(1);
    await pool.query(`UPDATE notification_settings SET ${updates.join(',')} WHERE id=?`, vals);
    res.json({ success: true, message: 'Settings saved' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Test send ─────────────────────────────────────────────────────────────────
app.post('/api/notifications/test', async (req, res) => {
  try {
    const { channel, recipient } = req.body;
    const msg = `🧪 TEST from Food Court ERP\nIf you see this, your ${channel} integration is working!\n${new Date().toLocaleString('en-IN')}`;
    const result = await crm.smartSend({ type: 'test', channel: channel || 'simulated', recipient: recipient || 'owner', recipientName: 'Owner', message: msg, referenceId: 'test' });
    res.json({ success: true, result, message: msg });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Notification Logs ─────────────────────────────────────────────────────────
app.get('/api/notifications/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, type, channel, status, from, to } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '1=1';
    const params = [];
    if (type) { where += ' AND type=?'; params.push(type); }
    if (channel) { where += ' AND channel=?'; params.push(channel); }
    if (status) { where += ' AND status=?'; params.push(status); }
    if (from) { where += ' AND DATE(created_at)>=?'; params.push(from); }
    if (to) { where += ' AND DATE(created_at)<=?'; params.push(to); }
    const [rows] = await pool.query(`SELECT * FROM notification_logs WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);
    const [[{total}]] = await pool.query(`SELECT COUNT(*) as total FROM notification_logs WHERE ${where}`, params);
    res.json({ logs: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Daily Summary ─────────────────────────────────────────────────────────────
app.post('/api/notifications/daily-summary', async (req, res) => {
  try {
    const result = await crm.sendDailySummary();
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Low Stock Test ────────────────────────────────────────────────────────────
app.post('/api/notifications/test-low-stock', async (req, res) => {
  try {
    const [mats] = await pool.query('SELECT * FROM raw_materials WHERE stock_level <= min_stock LIMIT 1');
    if (!mats.length) return res.json({ success: true, message: 'No low-stock items currently' });
    const mat = mats[0];
    mat.last_alert_sent = null; // force send
    await crm.triggerLowStockAlert(mat);
    res.json({ success: true, message: `Low-stock alert sent for: ${mat.name}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Loyalty ───────────────────────────────────────────────────────────────────
app.get('/api/notifications/loyalty', async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '1=1';
    const params = [];
    if (search) { where += ' AND (name LIKE ? OR phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    const [customers] = await pool.query(
      `SELECT id,name,phone,email,loyalty_points,total_spent,total_visits,last_visit,whatsapp_opt_in,sms_opt_in,created_at,
              rfid_tag,wallet_balance,is_mess_subscriber,mess_meals_left,mess_valid_until
       FROM customers WHERE ${where} ORDER BY loyalty_points DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    const [[{total}]] = await pool.query(`SELECT COUNT(*) as total FROM customers WHERE ${where}`, params);
    res.json({ customers, total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/notifications/loyalty/:customerId/history', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM loyalty_transactions WHERE customer_id=? ORDER BY created_at DESC LIMIT 100',
      [req.params.customerId]
    );
    const [cus] = await pool.query('SELECT id,name,loyalty_points,total_spent FROM customers WHERE id=?', [req.params.customerId]);
    res.json({ transactions: rows, customer: cus[0] || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/notifications/loyalty/redeem', async (req, res) => {
  try {
    const { customer_id, points, order_id } = req.body;
    if (!customer_id || !points) return res.status(400).json({ error: 'customer_id and points required' });
    const result = await crm.redeemLoyaltyPoints(parseInt(customer_id), parseInt(points), order_id || null);
    res.json({ success: true, ...result });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/notifications/loyalty/:customerId/opt-in', async (req, res) => {
  try {
    const { whatsapp_opt_in, sms_opt_in } = req.body;
    await pool.query('UPDATE customers SET whatsapp_opt_in=?, sms_opt_in=? WHERE id=?',
      [whatsapp_opt_in ? 1 : 0, sms_opt_in ? 1 : 0, req.params.customerId]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Feedback ──────────────────────────────────────────────────────────────────
app.get('/api/notifications/feedback', async (req, res) => {
  try {
    const { page = 1, limit = 50, filter, from, to } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '1=1';
    const params = [];
    if (filter === 'negative') { where += ' AND (food_rating <= 2 OR service_rating <= 2 OR speed_rating <= 2 OR rating <= 2)'; }
    if (from) { where += ' AND DATE(created_at)>=?'; params.push(from); }
    if (to) { where += ' AND DATE(created_at)<=?'; params.push(to); }
    const [rows] = await pool.query(
      `SELECT * FROM customer_feedback WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    const [[{total}]] = await pool.query(`SELECT COUNT(*) as total FROM customer_feedback WHERE ${where}`, params);
    // Summary stats
    const [[stats]] = await pool.query(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as total_feedback,
       SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) as negative_count
       FROM customer_feedback`
    );
    res.json({ feedback: rows, total, stats });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Public: submit feedback (no auth, used from QR page post-order)
app.post('/api/feedback', async (req, res) => {
  try {
    const { order_id, customer_name, customer_phone, customer_id, rating, food_rating, service_rating, speed_rating, comments } = req.body;
    const overallRating = rating || Math.round(((food_rating||3)+(service_rating||3)+(speed_rating||3))/3);
    if (!overallRating || overallRating < 1 || overallRating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    const today = new Date().toISOString().split('T')[0];
    const [result] = await pool.query(
      `INSERT INTO customer_feedback (order_id, customer_name, rating, food_rating, service_rating, speed_rating, comments, customer_id, customer_phone, feedback_date) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [order_id||null, customer_name||'Anonymous', overallRating, food_rating||null, service_rating||null, speed_rating||null, comments||null, customer_id||null, customer_phone||null, today]
    );
    const feedbackId = result.insertId;
    // Trigger negative feedback alert asynchronously
    const s = await crm.getSettings();
    const threshold = s.negative_feedback_threshold || 2;
    if (overallRating <= threshold) {
      crm.sendNegativeFeedbackAlert({ id: feedbackId, order_id, customer_name, food_rating, service_rating, speed_rating, rating: overallRating, comments })
        .catch(e => console.error('[CRM] Feedback alert err:', e.message));
    }
    res.status(201).json({ success: true, id: feedbackId, message: 'Thank you for your feedback!' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Broadcasts ────────────────────────────────────────────────────────────────
app.get('/api/notifications/broadcasts', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM broadcast_campaigns ORDER BY created_at DESC LIMIT 100');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/notifications/broadcasts', async (req, res) => {
  try {
    const { name, message, channel, target_segment, scheduled_at } = req.body;
    if (!name || !message) return res.status(400).json({ error: 'name and message are required' });
    const [r] = await pool.query(
      'INSERT INTO broadcast_campaigns (name,message,channel,target_segment,scheduled_at,created_by) VALUES (?,?,?,?,?,?)',
      [name, message, channel||'whatsapp', target_segment||'all', scheduled_at||null, 'Owner']
    );
    res.status(201).json({ success: true, id: r.insertId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/notifications/broadcasts/:id', async (req, res) => {
  try {
    const { name, message, channel, target_segment, scheduled_at } = req.body;
    await pool.query(
      'UPDATE broadcast_campaigns SET name=?,message=?,channel=?,target_segment=?,scheduled_at=? WHERE id=?',
      [name, message, channel||'whatsapp', target_segment||'all', scheduled_at||null, req.params.id]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/notifications/broadcasts/:id/send', async (req, res) => {
  try {
    const result = await crm.dispatchBroadcast(parseInt(req.params.id));
    res.json({ success: true, ...result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/notifications/broadcasts/:id/recipients', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM broadcast_recipients WHERE campaign_id=? LIMIT 500', [req.params.id]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/notifications/broadcasts/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM broadcast_campaigns WHERE id=? AND status IN (?,?)', [req.params.id, 'draft', 'failed']);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Order Ready Notification (manual trigger) ─────────────────────────────────
app.post('/api/notifications/order-ready/:orderId', async (req, res) => {
  try {
    const [orderInfo] = await pool.query(
      'SELECT id, token_number, customer_name, customer_phone FROM orders WHERE id=?',
      [req.params.orderId]
    );
    if (!orderInfo.length) return res.status(404).json({ error: 'Order not found' });
    await crm.sendOrderReadyNotification(orderInfo[0]);
    res.json({ success: true, message: 'Order ready notification sent' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CRM Overview Stats ────────────────────────────────────────────────────────
app.get('/api/notifications/overview', async (req, res) => {
  try {
    const [[custStats]] = await pool.query(
      `SELECT COUNT(*) as total_customers,
       SUM(CASE WHEN loyalty_points>0 THEN 1 ELSE 0 END) as loyalty_members,
       COALESCE(SUM(loyalty_points),0) as total_points_outstanding
       FROM customers`
    );
    const [[feedbackStats]] = await pool.query(
      `SELECT COALESCE(AVG(rating),0) as avg_rating, COUNT(*) as total_feedback
       FROM customer_feedback`
    );
    const [[todayNotif]] = await pool.query(
      `SELECT COUNT(*) as sent_today FROM notification_logs WHERE DATE(created_at)=CURDATE()`
    );
    const [recentLogs] = await pool.query(
      `SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT 10`
    );
    const [lowStockItems] = await pool.query(
      `SELECT name, stock_level, min_stock, unit FROM raw_materials WHERE stock_level<=min_stock`
    );
    const [campaignStats] = await pool.query(
      `SELECT status, COUNT(*) as count FROM broadcast_campaigns GROUP BY status`
    );
    res.json({
      customers: custStats,
      feedback: feedbackStats,
      notifications: { sent_today: todayNotif.sent_today },
      recent_logs: recentLogs,
      low_stock_items: lowStockItems,
      campaign_stats: campaignStats
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================
// RFID & PREPAID WALLET MODULE
// ==========================================

// 1. Fetch Customer by RFID Tag
app.get('/api/wallet/rfid/:tag', authenticateToken, async (req, res) => {
  try {
    const [customers] = await pool.query('SELECT * FROM customers WHERE rfid_tag = ?', [req.params.tag]);
    if (customers.length === 0) return res.status(404).json({ error: 'RFID Tag not found or unregistered' });
    res.json(customers[0]);
  } catch (error) {
    console.error('Fetch RFID error:', error);
    res.status(500).json({ error: 'Failed to fetch customer by RFID' });
  }
});

// 2. Wallet/Mess Top-up (Admin/Cashier)
app.post('/api/wallet/topup', authenticateToken, async (req, res) => {
  if (!['Owner', 'Manager', 'Cashier', 'Admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const { customer_id, amount, meals_count, description, paymentMode, transaction_amount } = req.body;
  const payMode = paymentMode || 'Cash';
  
  if (!customer_id) return res.status(400).json({ error: 'customer_id is required' });
  const amt = parseFloat(amount || 0);
  const transAmt = transaction_amount !== undefined ? parseFloat(transaction_amount) : amt;
  const meals = parseInt(meals_count || 0);
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Lock row for update
    const [customers] = await connection.query('SELECT * FROM customers WHERE id = ? FOR UPDATE', [customer_id]);
    if (customers.length === 0) throw new Error('Customer not found');
    const customer = customers[0];
    
    const newBalance = parseFloat(customer.wallet_balance || 0) + amt;
    const newMeals = parseInt(customer.mess_meals_left || 0) + meals;
    const isSubscriber = newMeals > 0 ? true : customer.is_mess_subscriber;
    
    // If adding meals, extend validity by 30 days by default (can be enhanced later)
    let validUntilQuery = '';
    let queryParams = [newBalance, isSubscriber, newMeals, customer_id];
    
    if (meals > 0) {
      validUntilQuery = ', mess_valid_until = DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY)';
    }

    await connection.query(
      `UPDATE customers SET wallet_balance = ?, is_mess_subscriber = ?, mess_meals_left = ? ${validUntilQuery} WHERE id = ?`,
      queryParams
    );
    
    // Log transaction
    await connection.query(
      `INSERT INTO wallet_transactions (customer_id, type, payment_mode, amount, transaction_amount, meals_count, balance_after, meals_after, description) 
       VALUES (?, 'credit', ?, ?, ?, ?, ?, ?, ?)`,
      [customer_id, payMode, amt, transAmt, meals, newBalance, newMeals, description || 'Manual Top-up']
    );
    
    await connection.commit();
    res.json({ message: 'Top-up successful', newBalance, newMeals });
  } catch (error) {
    await connection.rollback();
    console.error('Wallet top-up error:', error);
    res.status(500).json({ error: error.message || 'Failed to top-up wallet' });
  } finally {
    connection.release();
  }
});

// 3. Get Wallet Transactions Ledger
app.get('/api/wallet/history/:customerId', authenticateToken, async (req, res) => {
  try {
    const [transactions] = await pool.query(
      'SELECT * FROM wallet_transactions WHERE customer_id = ? ORDER BY created_at DESC LIMIT 100',
      [req.params.customerId]
    );
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

// 4. Update RFID Tag for Customer
app.put('/api/wallet/assign-rfid', authenticateToken, async (req, res) => {
  if (!['Owner', 'Manager', 'Cashier', 'Admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const { customer_id, rfid_tag } = req.body;
  try {
    await pool.query('UPDATE customers SET rfid_tag = ? WHERE id = ?', [rfid_tag, customer_id]);
    res.json({ message: 'RFID assigned successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'This RFID tag is already assigned to another customer.' });
    }
    res.status(500).json({ error: 'Failed to assign RFID' });
  }
});




// ==========================================
// SAAS TENANT MANAGEMENT (SUPER ADMIN)
// ==========================================
app.get('/api/tenants', authenticateToken, authorizeRoles('Super Admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, owner_email, plan, is_active, created_at FROM tenants ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

app.post('/api/tenants', authenticateToken, authorizeRoles('Super Admin'), async (req, res) => {
  const { name, owner_name, email, password } = req.body;
  if (!name || !owner_name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Check if email already exists
    const [existing] = await conn.query('SELECT id FROM staff WHERE email = ?', [email]);
    if (existing.length > 0) {
      throw new Error('Email is already registered');
    }

    // 2. Create the tenant
    const [tenantResult] = await conn.query(
      'INSERT INTO tenants (name, owner_email) VALUES (?, ?)',
      [name, email]
    );
    const tenantId = tenantResult.insertId;

    // 3. Create the owner user
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await conn.query(
      'INSERT INTO staff (name, email, password_hash, role, tenant_id) VALUES (?, ?, ?, ?, ?)',
      [owner_name, email, hashedPassword, 'Owner', tenantId]
    );

    await conn.commit();
    res.status(201).json({ success: true, message: 'Food Court registered successfully', tenant_id: tenantId });
  } catch (error) {
    await conn.rollback();
    console.error('Error creating tenant:', error);
    res.status(400).json({ error: error.message || 'Failed to register food court' });
  } finally {
    conn.release();
  }
});

// ==========================================
// SPA Fallback — serve React app for /menu and all frontend routes
// ==========================================
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Start Server — listen on all interfaces so mobile devices can connect
const LAN_IP = getLanIp();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ERP Backend running successfully on http://localhost:${PORT}`);
  console.log(`📱 QR Menu accessible at: http://${LAN_IP}:${PORT}/menu`);
  console.log(`   (Share this URL with phones on the same Wi-Fi network)`);
});
