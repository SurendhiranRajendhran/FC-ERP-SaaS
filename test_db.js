const mysql = require('mysql2/promise');

async function test() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'erp',
  });
  
  const [orders] = await pool.query("SELECT * FROM orders ORDER BY id DESC LIMIT 1");
  if(orders.length === 0) return console.log("No orders");
  
  const orderId = orders[0].id;
  console.log("Order:", orders[0]);
  
  const [items] = await pool.query("SELECT oi.id, oi.status, i.name, i.vendor_id FROM order_items oi JOIN items i ON oi.item_id = i.id WHERE oi.order_id = ?", [orderId]);
  console.log("Items:", items);
  
  pool.end();
}
test();
