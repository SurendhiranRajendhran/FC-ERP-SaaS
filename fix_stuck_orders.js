const mysql = require('mysql2/promise');

async function fixStuckOrders() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'erp',
  });
  
  // Fix orders with empty status (caused by invalid 'Partially Ready' ENUM write)
  const [stuck] = await pool.query("SELECT id, status FROM orders WHERE status = '' OR status IS NULL");
  console.log(`Found ${stuck.length} stuck order(s):`, stuck);
  
  if (stuck.length > 0) {
    await pool.query("UPDATE orders SET status = 'Preparing' WHERE status = '' OR status IS NULL");
    console.log("Fixed — set stuck orders to 'Preparing'");
  }
  
  // Verify
  const [verify] = await pool.query("SELECT id, status FROM orders WHERE status NOT IN ('Pending','Preparing','Ready','Completed','Cancelled')");
  console.log(`Orders with invalid status after fix: ${verify.length}`);
  
  await pool.end();
}
fixStuckOrders();
