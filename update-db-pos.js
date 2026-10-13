const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'erp',
};

async function migrate() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully!');

    // 1. Create coupons table
    console.log('Creating coupons table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        discount_type ENUM('Percentage', 'Fixed') NOT NULL,
        value DECIMAL(10,2) NOT NULL,
        min_order_amount DECIMAL(10,2) DEFAULT 0.00,
        vendor_id INT NULL DEFAULT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY (vendor_id)
      ) ENGINE=InnoDB;
    `);

    // Ensure vendor_id exists in coupons if table was created previously without it
    const [couponCols] = await connection.query('DESCRIBE coupons');
    if (!couponCols.some(col => col.Field === 'vendor_id')) {
      await connection.query('ALTER TABLE coupons ADD COLUMN vendor_id INT NULL DEFAULT NULL AFTER min_order_amount, ADD KEY (vendor_id)');
      console.log('✅ Added missing vendor_id column to coupons table.');
    }
    console.log('✅ coupons table ready.');

    // 2. Create held_orders table
    console.log('Creating held_orders table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS held_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hold_name VARCHAR(255) NOT NULL,
        cart_data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    console.log('✅ held_orders table ready.');

    // 3. Alter orders table payment_mode column
    console.log('Modifying payment_mode column in orders...');
    // We modify it to support ENUM('Cash', 'UPI', 'Card', 'Meal Card', 'Split')
    await connection.query(`
      ALTER TABLE orders 
      MODIFY COLUMN payment_mode ENUM('Cash', 'UPI', 'Card', 'Meal Card', 'Split') NOT NULL;
    `);
    console.log('✅ orders.payment_mode updated.');

    // 4. Add discount and split columns to orders table if not present
    console.log('Checking orders table columns...');
    const [cols] = await connection.query('DESCRIBE orders');
    
    const addColumnIfNotExists = async (colName, colDef) => {
      const exists = cols.some(col => col.Field === colName);
      if (!exists) {
        console.log(`Adding column ${colName} to orders...`);
        await connection.query(`ALTER TABLE orders ADD COLUMN ${colName} ${colDef};`);
        console.log(`✅ Column ${colName} added.`);
      } else {
        console.log(`Column ${colName} already exists.`);
      }
    };

    await addColumnIfNotExists('discount_type', "ENUM('None', 'Percentage', 'Fixed', 'Student', 'Staff', 'Coupon') DEFAULT 'None'");
    await addColumnIfNotExists('discount_value', "DECIMAL(10,2) DEFAULT 0.00");
    await addColumnIfNotExists('discount_amount', "DECIMAL(10,2) DEFAULT 0.00");
    await addColumnIfNotExists('discount_reference', "VARCHAR(255) DEFAULT NULL");
    await addColumnIfNotExists('payment_details', "TEXT DEFAULT NULL");

    // Ensure cancel_pin exists on vendors table
    const [vCols] = await connection.query('DESCRIBE vendors');
    if (!vCols.some(col => col.Field === 'cancel_pin')) {
      await connection.query('ALTER TABLE vendors ADD COLUMN cancel_pin VARCHAR(10) NULL DEFAULT NULL');
      console.log('✅ Added cancel_pin column to vendors table.');
    }

    // Ensure central_cancel_pin exists on tenants table
    const [tCols] = await connection.query('DESCRIBE tenants');
    if (!tCols.some(col => col.Field === 'central_cancel_pin')) {
      await connection.query('ALTER TABLE tenants ADD COLUMN central_cancel_pin VARCHAR(10) NULL DEFAULT NULL');
      console.log('✅ Added central_cancel_pin column to tenants table.');
    }

    // 5. Seed default coupons if table is empty
    const [existingCoupons] = await connection.query('SELECT COUNT(*) as count FROM coupons');
    if (existingCoupons[0].count === 0) {
      console.log('Seeding mock coupons...');
      await connection.query(`
        INSERT INTO coupons (code, discount_type, value, min_order_amount, is_active) VALUES
        ('CAMPUS10', 'Percentage', 10.00, 0.00, 1),
        ('FREECOFFEE', 'Fixed', 20.00, 100.00, 1),
        ('SUPERCOMBO', 'Percentage', 15.00, 200.00, 1)
      `);
      console.log('✅ Sample coupons seeded.');
    }

    console.log('\n🎉 POS Billing migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
