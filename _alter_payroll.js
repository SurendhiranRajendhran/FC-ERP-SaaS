const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'erp'
  });

  try {
    await pool.query("ALTER TABLE payroll MODIFY COLUMN status ENUM('Draft','Finalized','Paid') DEFAULT 'Draft'");
    const [cols] = await pool.query("SHOW COLUMNS FROM payroll LIKE 'status'");
    console.log('Updated column:', JSON.stringify(cols[0]));
  } catch (err) {
    console.error('Error:', err.message);
  }

  await pool.end();
})();
