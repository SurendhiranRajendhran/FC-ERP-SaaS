const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function updateDbAuth() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'erp',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('Checking for password_hash column in staff table...');
    const [columns] = await pool.query(`SHOW COLUMNS FROM staff LIKE 'password_hash'`);
    
    if (columns.length === 0) {
      console.log('Adding password_hash column...');
      await pool.query(`ALTER TABLE staff ADD COLUMN password_hash VARCHAR(255) NULL AFTER email`);
      console.log('Column added.');
    } else {
      console.log('password_hash column already exists.');
    }

    // Set default password for all existing staff
    const defaultPassword = 'password123';
    console.log(`Hashing default password: ${defaultPassword}`);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    console.log('Updating all existing staff with the default password...');
    const [result] = await pool.query(`UPDATE staff SET password_hash = ? WHERE password_hash IS NULL`, [hashedPassword]);
    console.log(`Updated ${result.affectedRows} staff members.`);

    // Check if an Owner exists, if not create a default one
    const [owners] = await pool.query(`SELECT id FROM staff WHERE role = 'Owner'`);
    if (owners.length === 0) {
      console.log('No Owner found, creating default Admin/Owner account...');
      await pool.query(`
        INSERT INTO staff (name, email, phone, role, pay_type, is_active, password_hash, joined_at)
        VALUES ('Admin', 'admin@foodcourt.com', '0000000000', 'Owner', 'monthly', 1, ?, NOW())
      `, [hashedPassword]);
      console.log('Default Admin created: admin@foodcourt.com / password123');
    }

    console.log('Database authentication update completed successfully.');
  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    pool.end();
  }
}

updateDbAuth();
