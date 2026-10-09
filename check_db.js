const mysql = require('mysql2/promise');

async function checkDb() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'erp',
  });

  try {
    const [desc] = await pool.query("DESCRIBE registrations");
    console.log("Columns in registrations table:", desc.map(c => c.Field).join(', '));
  } catch (err) {
    console.error("Error:", err.message);
  }

  await pool.end();
}

checkDb();
