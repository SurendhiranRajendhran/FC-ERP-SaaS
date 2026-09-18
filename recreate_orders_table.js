const mysql = require('mysql2/promise');

async function recreateOrdersTable() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'erp',
  });

  try {
    // Check if table exists
    const [tables] = await pool.query("SHOW TABLES LIKE 'orders'");
    if (tables.length > 0) {
      console.log("'orders' table already exists. Skipping creation.");
      await pool.end();
      return;
    }

    console.log("Creating 'orders' table...");

    await pool.query(`
      CREATE TABLE orders (
        id INT(11) NOT NULL AUTO_INCREMENT,
        order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        token_number VARCHAR(50) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        gst_amount DECIMAL(10,2) NOT NULL,
        payment_mode ENUM('Cash','UPI','Card','Meal Card','Split','Credit','RFID Wallet','Mess Plan','Staff Meal') NOT NULL,
        status ENUM('Pending','Preparing','Ready','Completed','Cancelled') DEFAULT 'Pending',
        discount_type ENUM('None','Percentage','Fixed','Student','Staff','Coupon','StaffMeal','Loyalty','Credit') DEFAULT 'None',
        discount_value DECIMAL(10,2) DEFAULT 0.00,
        discount_amount DECIMAL(10,2) DEFAULT 0.00,
        discount_reference VARCHAR(255) DEFAULT NULL,
        payment_details TEXT DEFAULT NULL,
        customer_id INT(11) DEFAULT NULL,
        billing_staff_id INT(11) DEFAULT NULL,
        preparation_start TIMESTAMP NULL DEFAULT NULL,
        preparation_end TIMESTAMP NULL DEFAULT NULL,
        is_upsold TINYINT(1) DEFAULT 0,
        cancellation_reason VARCHAR(255) DEFAULT NULL,
        refund_status ENUM('None','Pending','Refunded') DEFAULT 'None',
        refund_amount DECIMAL(10,2) DEFAULT 0.00,
        order_source ENUM('POS','QR') DEFAULT 'POS',
        customer_name VARCHAR(100) DEFAULT NULL,
        customer_phone VARCHAR(20) DEFAULT NULL,
        pickup_slot VARCHAR(100) DEFAULT NULL,
        customer_staff_id INT(11) DEFAULT NULL,
        tenant_id INT(11) NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        KEY customer_id (customer_id),
        KEY billing_staff_id (billing_staff_id),
        KEY customer_staff_id (customer_staff_id),
        KEY tenant_id (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log("✅ 'orders' table created successfully!");

    // Verify
    const [desc] = await pool.query("DESCRIBE orders");
    console.log("Table columns:", desc.map(c => c.Field).join(', '));

  } catch (err) {
    console.error("Error:", err.message);
  }

  await pool.end();
}

recreateOrdersTable();
