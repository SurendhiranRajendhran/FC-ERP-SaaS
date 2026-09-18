import re

file_path = r'c:\Users\surendhiran.R\Desktop\ERP\server.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add POST /api/register
# We will inject it before the /api/tenants section

register_endpoints = """
// ==========================================
// REGISTRATION & SUPER ADMIN REVIEW
// ==========================================

// Public endpoint for new client sign-ups
app.post('/api/register', async (req, res) => {
  const { food_court_name, owner_name, email, phone, city, message } = req.body;
  if (!food_court_name || !owner_name || !email) {
    return res.status(400).json({ error: 'Food Court Name, Owner Name, and Email are required.' });
  }

  const conn = await pool.getConnection();
  try {
    // 1. Check if email exists in staff table
    const [existingStaff] = await conn.query('SELECT id FROM staff WHERE email = ?', [email]);
    if (existingStaff.length > 0) {
      return res.status(400).json({ error: 'Email is already registered as an active user.' });
    }

    // 2. Check if email exists in pending registrations
    const [existingReg] = await conn.query('SELECT id FROM registrations WHERE email = ? AND status = "pending"', [email]);
    if (existingReg.length > 0) {
      return res.status(400).json({ error: 'A registration request for this email is already pending review.' });
    }

    // 3. Insert registration
    await conn.query(
      'INSERT INTO registrations (food_court_name, owner_name, email, phone, city, message) VALUES (?, ?, ?, ?, ?, ?)',
      [food_court_name, owner_name, email, phone || null, city || null, message || null]
    );

    res.status(201).json({ success: true, message: 'Registration submitted successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to submit registration' });
  } finally {
    conn.release();
  }
});

// Super Admin: Get all registrations
app.get('/api/superadmin/registrations', authenticateToken, authorizeRoles('Super Admin'), async (req, res) => {
  const { status } = req.query;
  try {
    let query = 'SELECT * FROM registrations ORDER BY created_at DESC';
    let params = [];
    if (status) {
      query = 'SELECT * FROM registrations WHERE status = ? ORDER BY created_at DESC';
      params = [status];
    }
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch registrations error:', error);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// Super Admin: Review registration (Approve/Reject)
app.put('/api/superadmin/registrations/:id/review', authenticateToken, authorizeRoles('Super Admin'), async (req, res) => {
  const { id } = req.params;
  const { action, admin_notes } = req.body; // action: 'approve' or 'reject'

  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).json({ error: 'Invalid action. Must be approve or reject.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [regs] = await conn.query('SELECT * FROM registrations WHERE id = ? FOR UPDATE', [id]);
    if (regs.length === 0) throw new Error('Registration not found');
    const reg = regs[0];
    
    if (reg.status !== 'pending') {
      throw new Error(`Registration is already ${reg.status}`);
    }

    // Get super admin SMTP settings
    const [saSettings] = await pool.query('SELECT * FROM notification_settings WHERE tenant_id = 1');
    const settings = saSettings[0] || {};

    if (action === 'approve') {
      // 1. Create tenant
      const [tenantResult] = await conn.query(
        'INSERT INTO tenants (name, owner_email) VALUES (?, ?)',
        [reg.food_court_name, reg.email]
      );
      const tenantId = tenantResult.insertId;

      // 2. Create owner user with random password
      const bcrypt = require('bcryptjs');
      const crypto = require('crypto');
      const plainPassword = crypto.randomBytes(4).toString('hex'); // 8 char random password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(plainPassword, salt);

      await conn.query(
        'INSERT INTO staff (name, email, password_hash, role, tenant_id) VALUES (?, ?, ?, ?, ?)',
        [reg.owner_name, reg.email, hashedPassword, 'Owner', tenantId]
      );

      // 3. Initialize notification settings
      await conn.query('INSERT INTO notification_settings (tenant_id) VALUES (?)', [tenantId]);

      // 4. Update registration status
      await conn.query(
        'UPDATE registrations SET status = "approved", admin_notes = ?, reviewed_at = CURRENT_TIMESTAMP, tenant_id = ? WHERE id = ?',
        [admin_notes || null, tenantId, id]
      );

      await conn.commit();

      // Send approval email
      const loginUrl = 'http://localhost:5173/signin'; // Adjust as needed
      const html = `
        <h2>Welcome to FC-ERP!</h2>
        <p>Dear ${reg.owner_name},</p>
        <p>Your registration for <b>${reg.food_court_name}</b> has been approved!</p>
        <p>Here are your login credentials:</p>
        <ul>
          <li><b>Email:</b> ${reg.email}</li>
          <li><b>Password:</b> ${plainPassword}</li>
        </ul>
        <p>You can log in to your dashboard here: <a href="${loginUrl}">${loginUrl}</a></p>
        <p>Please change your password after your first login.</p>
        ${admin_notes ? `<p><b>Admin Note:</b> ${admin_notes}</p>` : ''}
        <br/><p>Regards,<br/>The FC-ERP Team</p>
      `;
      await crm.sendEmail(reg.email, 'Your FC-ERP Account is Ready!', html, settings);
      
      res.json({ success: true, message: 'Registration approved and tenant created', tenant_id: tenantId });
    } else {
      // Reject
      await conn.query(
        'UPDATE registrations SET status = "rejected", admin_notes = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
        [admin_notes || null, id]
      );
      await conn.commit();

      // Send rejection email
      const html = `
        <h2>FC-ERP Registration Update</h2>
        <p>Dear ${reg.owner_name},</p>
        <p>Thank you for your interest in FC-ERP. Unfortunately, we are unable to approve your registration for <b>${reg.food_court_name}</b> at this time.</p>
        ${admin_notes ? `<p><b>Reason:</b> ${admin_notes}</p>` : ''}
        <br/><p>Regards,<br/>The FC-ERP Team</p>
      `;
      await crm.sendEmail(reg.email, 'Update on your FC-ERP Registration', html, settings);

      res.json({ success: true, message: 'Registration rejected' });
    }
  } catch (error) {
    await conn.rollback();
    console.error('Registration review error:', error);
    res.status(400).json({ error: error.message || 'Failed to review registration' });
  } finally {
    conn.release();
  }
});
"""

# Insert before "app.get('/api/tenants'"
anchor = "app.get('/api/tenants', authenticateToken, authorizeRoles('Super Admin')"
if anchor in content and register_endpoints not in content:
    content = content.replace(anchor, register_endpoints + "\n\n" + anchor)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Injected registration endpoints into server.js")
else:
    print("Anchor not found or already injected")
