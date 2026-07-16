const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function testInsert() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'erp', waitForConnections: true });
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    console.log('Attempting insert...');
    const [result] = await pool.query(
      "INSERT INTO staff (name, phone, email, role, pay_type, daily_rate, monthly_salary, pf_enabled, esi_enabled, tds_percentage, bank_account, joined_at, is_active, vendor_id, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1, ?, ?)",
      [
        'Test Cook',
        '1234567890',
        'test3@cook.com',
        'Cook',
        'monthly',
        0,
        1000,
        0,
        0,
        0,
        null,
        null,
        hashedPassword
      ]
    );
    console.log('Success:', result);
  } catch(e) {
    console.error('MySQL Error:', e.message);
  } finally {
    await pool.end();
  }
}
testInsert();
