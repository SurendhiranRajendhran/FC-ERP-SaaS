const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'erp',
};

async function migrate() {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    console.log('Connected to DB');

    const addCol = async (table, col, def) => {
      try {
        await conn.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
        console.log(`  + Added ${table}.${col}`);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') console.log(`  - ${table}.${col} already exists`);
        else console.error(`  X ${table}.${col}: ${e.message}`);
      }
    };

    console.log('\n=== items table ===');
    await addCol('items', 'is_special', "TINYINT(1) DEFAULT 0");
    await addCol('items', 'special_price', "DECIMAL(10,2) DEFAULT NULL");
    await addCol('items', 'available_from', "TIME DEFAULT NULL");
    await addCol('items', 'available_until', "TIME DEFAULT NULL");

    console.log('\n=== stock_logs table ===');
    await addCol('stock_logs', 'responsible_person', "VARCHAR(255) DEFAULT NULL");

    console.log('\n=== orders table ===');
    await addCol('orders', 'cancellation_reason', "VARCHAR(255) DEFAULT NULL");
    await addCol('orders', 'refund_status', "ENUM('None','Pending','Refunded') DEFAULT 'None'");
    await addCol('orders', 'refund_amount', "DECIMAL(10,2) DEFAULT 0.00");

    console.log('\n=== combo_items table ===');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS combo_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        combo_id INT NOT NULL,
        child_item_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        FOREIGN KEY (combo_id) REFERENCES items(id) ON DELETE CASCADE,
        FOREIGN KEY (child_item_id) REFERENCES items(id) ON DELETE CASCADE,
        UNIQUE KEY unique_combo_child (combo_id, child_item_id)
      ) ENGINE=InnoDB;
    `);
    console.log('  + Created combo_items');

    console.log('\n=== suppliers table ===');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255) DEFAULT NULL,
        phone VARCHAR(20) DEFAULT NULL,
        email VARCHAR(255) DEFAULT NULL,
        address TEXT DEFAULT NULL,
        payment_terms VARCHAR(255) DEFAULT 'Net 30',
        items_supplied TEXT DEFAULT NULL,
        delivery_schedule VARCHAR(255) DEFAULT NULL,
        outstanding_balance DECIMAL(10,2) DEFAULT 0.00,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    console.log('  + Created suppliers');
    await addCol('raw_materials', 'supplier_id', "INT DEFAULT NULL");

    console.log('\n=== cash_drawer table ===');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS cash_drawer (
        id INT AUTO_INCREMENT PRIMARY KEY,
        drawer_date DATE NOT NULL,
        opening_cash DECIMAL(10,2) DEFAULT 0.00,
        closing_cash DECIMAL(10,2) DEFAULT NULL,
        denominations JSON DEFAULT NULL,
        system_cash DECIMAL(10,2) DEFAULT 0.00,
        shortage_excess DECIMAL(10,2) DEFAULT 0.00,
        handover_to VARCHAR(255) DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        status ENUM('Open','Closed') DEFAULT 'Open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_date (drawer_date)
      ) ENGINE=InnoDB;
    `);
    console.log('  + Created cash_drawer');

    console.log('\n=== daily_reconciliation table ===');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS daily_reconciliation (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recon_date DATE NOT NULL,
        system_cash DECIMAL(10,2) DEFAULT 0.00,
        system_upi DECIMAL(10,2) DEFAULT 0.00,
        system_card DECIMAL(10,2) DEFAULT 0.00,
        system_meal_card DECIMAL(10,2) DEFAULT 0.00,
        physical_cash DECIMAL(10,2) DEFAULT NULL,
        upi_settlement DECIMAL(10,2) DEFAULT NULL,
        card_settlement DECIMAL(10,2) DEFAULT NULL,
        discrepancy DECIMAL(10,2) DEFAULT 0.00,
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_recon_date (recon_date)
      ) ENGINE=InnoDB;
    `);
    console.log('  + Created daily_reconciliation');

    console.log('\n=== credit_ledger table ===');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS credit_ledger (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        order_id INT DEFAULT NULL,
        amount DECIMAL(10,2) NOT NULL,
        type ENUM('Credit','Payment') NOT NULL DEFAULT 'Credit',
        is_settled TINYINT(1) DEFAULT 0,
        settled_date DATE DEFAULT NULL,
        notes VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);
    console.log('  + Created credit_ledger');

    console.log('\n=== leave_balances table ===');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        staff_id INT NOT NULL,
        year INT NOT NULL,
        casual_total INT DEFAULT 12,
        casual_used INT DEFAULT 0,
        sick_total INT DEFAULT 6,
        sick_used INT DEFAULT 0,
        earned_total INT DEFAULT 12,
        earned_used INT DEFAULT 0,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
        UNIQUE KEY unique_staff_year (staff_id, year)
      ) ENGINE=InnoDB;
    `);
    console.log('  + Created leave_balances');

    const currentYear = new Date().getFullYear();
    const [staff] = await conn.query('SELECT id FROM staff WHERE is_active = 1');
    for (const s of staff) {
      try {
        await conn.query('INSERT IGNORE INTO leave_balances (staff_id, year) VALUES (?, ?)', [s.id, currentYear]);
      } catch (e) { /* ignore */ }
    }
    console.log(`  + Initialized leave balances for ${staff.length} staff (year ${currentYear})`);

    console.log('\n=== shift_swap_requests table ===');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS shift_swap_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        requester_id INT NOT NULL,
        target_id INT NOT NULL,
        swap_date DATE NOT NULL,
        requester_shift_id INT DEFAULT NULL,
        target_shift_id INT DEFAULT NULL,
        status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
        approved_by INT DEFAULT NULL,
        reason VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (requester_id) REFERENCES staff(id) ON DELETE CASCADE,
        FOREIGN KEY (target_id) REFERENCES staff(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES staff(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);
    console.log('  + Created shift_swap_requests');

    console.log('\n=== holidays table ===');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id INT AUTO_INCREMENT PRIMARY KEY,
        holiday_date DATE NOT NULL,
        name VARCHAR(255) NOT NULL,
        is_recurring TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_holiday_date (holiday_date)
      ) ENGINE=InnoDB;
    `);
    console.log('  + Created holidays');

    console.log('\n=== Updating orders.payment_mode enum ===');
    try {
      await conn.query(`ALTER TABLE orders MODIFY COLUMN payment_mode ENUM('Cash','UPI','Card','Meal Card','Split','Credit') NOT NULL`);
      console.log("  + Added 'Credit' to orders.payment_mode enum");
    } catch (e) {
      console.log('  - payment_mode enum update:', e.message);
    }

    console.log('\nAll migrations completed successfully!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    if (conn) await conn.end();
  }
}

migrate();
