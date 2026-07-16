const mysql = require('mysql2/promise');
async function check() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'erp', waitForConnections: true });
  
  // Check if admin user exists
  const [rows] = await pool.query("SELECT id, name, email, role, is_active, password_hash FROM staff WHERE email = 'admin@foodcourt.com'");
  if (rows.length === 0) {
    console.log('Admin user NOT FOUND. Checking all staff...');
    const [all] = await pool.query("SELECT id, name, email, role, is_active, CASE WHEN password_hash IS NOT NULL THEN 'YES' ELSE 'NO' END as has_pwd FROM staff LIMIT 20");
    console.table(all);
  } else {
    console.log('Admin user found:');
    console.log('  ID:', rows[0].id);
    console.log('  Name:', rows[0].name);
    console.log('  Email:', rows[0].email);
    console.log('  Role:', rows[0].role);
    console.log('  Active:', rows[0].is_active);
    console.log('  Has password_hash:', rows[0].password_hash ? 'YES (length=' + rows[0].password_hash.length + ')' : 'NO');
  }
  
  // Also check the table schema for password_hash column
  const [cols] = await pool.query("SHOW COLUMNS FROM staff LIKE 'password_hash'");
  console.log('\npassword_hash column:', cols.length > 0 ? 'EXISTS' : 'MISSING');
  if (cols.length > 0) console.log('  Type:', cols[0].Type);
  
  await pool.end();
}
check().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
