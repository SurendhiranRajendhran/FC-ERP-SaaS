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
    console.log('Connected!');

    // Helper function to check if a column exists
    async function columnExists(table, column) {
      const [rows] = await connection.query(`DESCRIBE \`${table}\``);
      return rows.some(row => row.Field === column);
    }

    // 1. Alter raw_materials to add cost_per_unit
    console.log('Checking raw_materials table alterations...');
    const hasCost = await columnExists('raw_materials', 'cost_per_unit');
    if (!hasCost) {
      console.log('Adding cost_per_unit column to raw_materials...');
      await connection.query('ALTER TABLE raw_materials ADD COLUMN cost_per_unit DECIMAL(10,2) DEFAULT 50.00');
      console.log('✅ cost_per_unit added.');
    } else {
      console.log('✅ cost_per_unit already exists.');
    }

    // 2. Create customers table
    console.log('Creating customers table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) UNIQUE DEFAULT NULL,
        email VARCHAR(255) DEFAULT NULL,
        loyalty_points INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    console.log('✅ customers table created.');

    // 3. Alter orders table to add customer_id
    console.log('Checking orders table alterations...');
    const hasCustomerId = await columnExists('orders', 'customer_id');
    if (!hasCustomerId) {
      console.log('Adding customer_id column to orders...');
      await connection.query('ALTER TABLE orders ADD COLUMN customer_id INT DEFAULT NULL');
      await connection.query('ALTER TABLE orders ADD CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL');
      console.log('✅ customer_id added and constraint set.');
    } else {
      console.log('✅ customer_id already exists.');
    }

    // 4. Create customer_feedback table
    console.log('Creating customer_feedback table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customer_feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT DEFAULT NULL,
        customer_name VARCHAR(255) DEFAULT NULL,
        rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comments TEXT DEFAULT NULL,
        feedback_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);
    console.log('✅ customer_feedback table created.');

    // 5. Create overheads table
    console.log('Creating overheads table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS overheads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        expense_date DATE NOT NULL,
        category ENUM('Electricity', 'Cleaning', 'Security', 'Rent', 'Overheads', 'Other') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    console.log('✅ overheads table created.');

    // 6. Seed sample customers
    const [existingCustomers] = await connection.query('SELECT COUNT(*) as count FROM customers');
    if (existingCustomers[0].count === 0) {
      console.log('Seeding sample customers...');
      const sampleCustomers = [
        ['Alice Johnson', '9876543220', 'alice@gmail.com', 45],
        ['Bob Smith', '9876543221', 'bob@gmail.com', 12],
        ['Charlie Brown', '9876543222', 'charlie@gmail.com', 80],
        ['David Miller', '9876543223', 'david@gmail.com', 0],
        ['Eva Green', '9876543224', 'eva@gmail.com', 150]
      ];
      await connection.query(
        'INSERT INTO customers (name, phone, email, loyalty_points) VALUES ?',
        [sampleCustomers]
      );
      console.log('✅ Sample customers seeded.');
    }

    // 7. Seed sample overheads for last 3 months
    const [existingOverheads] = await connection.query('SELECT COUNT(*) as count FROM overheads');
    if (existingOverheads[0].count === 0) {
      console.log('Seeding sample overheads...');
      const sampleOverheads = [
        ['2026-04-10', 'Rent', 12000.00, 'April Canteen Stall Rent'],
        ['2026-04-28', 'Electricity', 3500.00, 'April Power Bill'],
        ['2026-04-30', 'Cleaning', 1500.00, 'April Hygiene services'],
        ['2026-04-30', 'Security', 2000.00, 'April Security services'],
        
        ['2026-05-10', 'Rent', 12000.00, 'May Canteen Stall Rent'],
        ['2026-05-28', 'Electricity', 4200.00, 'May Power Bill'],
        ['2026-05-30', 'Cleaning', 1600.00, 'May Hygiene services'],
        ['2026-05-30', 'Security', 2000.00, 'May Security services'],

        ['2026-06-10', 'Rent', 12000.00, 'June Canteen Stall Rent'],
        ['2026-06-12', 'Electricity', 3900.00, 'June Power Bill (Mid-month estimation)'],
        ['2026-06-12', 'Cleaning', 1500.00, 'June Hygiene maintenance']
      ];
      await connection.query(
        'INSERT INTO overheads (expense_date, category, amount, description) VALUES ?',
        [sampleOverheads]
      );
      console.log('✅ Sample overheads seeded.');
    }

    // 8. Seed sample customer feedback if empty
    const [existingFeedback] = await connection.query('SELECT COUNT(*) as count FROM customer_feedback');
    if (existingFeedback[0].count === 0) {
      console.log('Seeding sample feedback ratings...');
      const sampleFeedback = [
        [null, 'Alice Johnson', 5, 'Best Masala Dosa in town! Quick service.', '2026-06-08'],
        [null, 'Bob Smith', 4, 'Idli was very soft, coffee was standard.', '2026-06-09'],
        [null, 'Charlie Brown', 5, 'Highly recommend the Veg Biryani combo. Value for money.', '2026-06-10'],
        [null, 'David Miller', 3, 'Biryani was cold, service took 15 minutes today.', '2026-06-11'],
        [null, 'Eva Green', 5, 'Clean tables and quick order delivery from token display!', '2026-06-12']
      ];
      await connection.query(
        'INSERT INTO customer_feedback (order_id, customer_name, rating, comments, feedback_date) VALUES ?',
        [sampleFeedback]
      );
      console.log('✅ Sample feedback ratings seeded.');
    }

    // 9. Update raw materials costs with realistic pricing for COGS calculation
    console.log('Updating raw material cost prices...');
    await connection.query("UPDATE raw_materials SET cost_per_unit = 40.00 WHERE LOWER(name) LIKE '%rice%'");
    await connection.query("UPDATE raw_materials SET cost_per_unit = 120.00 WHERE LOWER(name) LIKE '%oil%'");
    await connection.query("UPDATE raw_materials SET cost_per_unit = 30.00 WHERE LOWER(name) LIKE '%onion%'");
    await connection.query("UPDATE raw_materials SET cost_per_unit = 25.00 WHERE LOWER(name) LIKE '%potato%'");
    await connection.query("UPDATE raw_materials SET cost_per_unit = 15.00 WHERE LOWER(name) LIKE '%salt%'");
    await connection.query("UPDATE raw_materials SET cost_per_unit = 80.00 WHERE LOWER(name) LIKE '%paneer%'");
    await connection.query("UPDATE raw_materials SET cost_per_unit = 60.00 WHERE LOWER(name) LIKE '%atta%' OR LOWER(name) LIKE '%flour%'");
    await connection.query("UPDATE raw_materials SET cost_per_unit = 100.00 WHERE LOWER(name) LIKE '%chicken%'");
    console.log('✅ Raw material cost prices updated.');

    console.log('\n🎉 Reports & Analytics Database Migration Completed Successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
