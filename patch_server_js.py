import re

def patch_server():
    with open('c:/Users/surendhiran.R/Desktop/ERP/server.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add imports
    if "const jwt = require('jsonwebtoken');" not in content:
        imports_injection = """const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_food_court_key_123';
"""
        content = content.replace("const express = require('express');", "const express = require('express');\n" + imports_injection)

    # 2. Add Authentication & RBAC Middlewares after app middleware
    if "const authenticateToken" not in content:
        middleware_code = """
// ==========================================
// AUTHENTICATION & RBAC MIDDLEWARES
// ==========================================
const authenticateToken = (req, res, next) => {
  // Public routes that don't require auth
  const publicRoutes = ['/api/server-info', '/api/auth/login'];
  if (publicRoutes.includes(req.path)) return next();
  
  // Allow QR menu to fetch active items without auth
  if (req.path === '/api/items' && req.method === 'GET') return next();
  
  // Allow QR menu to submit orders without auth
  if (req.path === '/api/orders' && req.method === 'POST') return next();
  
  // Allow QR menu to poll order status without auth
  if (req.path.match(/^\\/api\\/orders\\/\\d+\\/status$/) && req.method === 'GET') return next();

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
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
      { id: user.id, name: user.name, role: user.role, vendor_id: user.vendor_id },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role, email: user.email, vendor_id: user.vendor_id }
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
"""
        # Find the line "connection.release();\n  } catch (error) {\n    console.error('CRITICAL: Express failed to connect to XAMPP MySQL:', error.message);\n  }\n})();\n"
        # and replace using .replace()
        split_point = "})();\n"
        parts = content.split(split_point, 1)
        if len(parts) == 2:
            content = parts[0] + split_point + middleware_code + parts[1]

    # 3. Patch POST /api/staff to hash password if provided, or set default password
    if "const defaultPassword = 'password123';" not in content:
        # We need to replace the POST /api/staff insertion logic
        post_staff_pattern = r"(app\.post\('/api/staff', async \(req, res\) => \{.*?\n\s+try \{)(.*?)(const \[result\] = await pool\.query\()"
        
        post_staff_replacement = r"""\1
    // Generate default password if not provided
    const defaultPassword = 'password123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);
\2const [result] = await pool.query("""

        content = re.sub(post_staff_pattern, post_staff_replacement, content, flags=re.DOTALL)
        
        # We also need to update the INSERT INTO query
        insert_pattern = r"(INSERT INTO staff \(name, phone, email, role, pay_type, daily_rate, monthly_salary, pf_enabled, esi_enabled, tds_percentage, bank_account, joined_at, is_active, vendor_id\)\n\s+VALUES \(\?, \?, \?, \?, \?, \?, \?, \?, \?, \?, \?, NOW\(\), 1, \?\))"
        insert_replacement = r"INSERT INTO staff (name, phone, email, role, pay_type, daily_rate, monthly_salary, pf_enabled, esi_enabled, tds_percentage, bank_account, joined_at, is_active, vendor_id, password_hash)\n       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1, ?, ?)"
        content = re.sub(insert_pattern, insert_replacement, content)
        
        # And add hashedPassword to the parameters array
        params_pattern = r"(vendor_id\n\s+\])"
        params_replacement = r"vendor_id,\n        hashedPassword\n      ]"
        content = re.sub(params_pattern, params_replacement, content)

    with open('c:/Users/surendhiran.R/Desktop/ERP/server.js', 'w', encoding='utf-8') as f:
        f.write(content)

    print("server.js patched successfully.")

patch_server()
