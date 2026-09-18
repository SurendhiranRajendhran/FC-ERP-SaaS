const mysql = require('mysql2/promise');

async function fixDB() {
  try {
    const pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'erp',
    });
    
    console.log("Altering orders table...");
    await pool.query("ALTER TABLE orders MODIFY COLUMN status ENUM('Pending','Preparing','Partially Ready','Ready','Completed','Cancelled') DEFAULT 'Pending'");
    console.log("Updating empty statuses...");
    await pool.query("UPDATE orders SET status = 'Partially Ready' WHERE status = ''");
    console.log("Done!");
    pool.end();
  } catch (err) {
    console.error(err);
  }
}
fixDB();
