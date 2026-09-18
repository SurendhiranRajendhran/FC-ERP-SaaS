const mysql = require('mysql2/promise');

async function createRegistrationsTable() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'erp',
  });

  try {
    const [tables] = await pool.query("SHOW TABLES LIKE 'registrations'");
    if (tables.length > 0) {
      console.log("'registrations' table already exists.");
      await pool.end();
      return;
    }

    console.log("Creating 'registrations' table...");
    await pool.query(`
      CREATE TABLE registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        food_court_name VARCHAR(255) NOT NULL,
        owner_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20) DEFAULT NULL,
        city VARCHAR(100) DEFAULT NULL,
        message TEXT DEFAULT NULL,
        status ENUM('pending','approved','rejected') DEFAULT 'pending',
        admin_notes TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP NULL DEFAULT NULL,
        tenant_id INT NULL DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log("✅ 'registrations' table created successfully!");
    const [desc] = await pool.query("DESCRIBE registrations");
    console.log("Columns:", desc.map(c => c.Field).join(', '));
  } catch (err) {
    console.error("Error:", err.message);
  }

  await pool.end();
}

createRegistrationsTable();
