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

    // 1. Create vendors table
    console.log('Creating vendors table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        gstin VARCHAR(50) DEFAULT NULL,
        bank_account VARCHAR(100) DEFAULT NULL,
        contact VARCHAR(50) DEFAULT NULL,
        stall_number VARCHAR(50) DEFAULT NULL,
        commission_rate DECIMAL(5,2) DEFAULT 10.00,
        share_area DECIMAL(5,2) DEFAULT 10.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // 2. Create vendor_settlements table
    console.log('Creating vendor_settlements table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS vendor_settlements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vendor_id INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        gross_sales DECIMAL(10,2) NOT NULL,
        commission_amount DECIMAL(10,2) NOT NULL,
        common_area_cost DECIMAL(10,2) NOT NULL,
        net_payout DECIMAL(10,2) NOT NULL,
        status ENUM('Pending', 'Settled') DEFAULT 'Pending',
        settled_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 3. Add vendor_id to items if not exists
    console.log('Checking items table columns...');
    const [cols] = await connection.query('DESCRIBE items');
    const hasVendorId = cols.some(col => col.Field === 'vendor_id');

    if (!hasVendorId) {
      console.log('Adding vendor_id to items table...');
      await connection.query(`
        ALTER TABLE items 
        ADD COLUMN vendor_id INT NULL DEFAULT NULL,
        ADD FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;
      `);
    } else {
      console.log('vendor_id column already exists in items.');
    }

    // 4. Seed mock vendors if empty
    const [existingVendors] = await connection.query('SELECT COUNT(*) as count FROM vendors');
    if (existingVendors[0].count === 0) {
      console.log('Seeding mock vendors...');
      const mockVendors = [
        ['South Stall (Dosa & Meals)', '33AAAAA1111A1Z1', '12345678901', '9876543210', 'Stall A-1', 12.00, 25.00],
        ['Biryani House', '33BBBBB2222B1Z2', '98765432102', '9876543211', 'Stall B-3', 15.00, 20.00],
        ['Snack & Chaat Corner', '33CCCCC3333C1Z3', '55443322110', '9876543212', 'Stall C-2', 10.00, 15.00],
        ['Beverage & Cafe', '33DDDDD4444D1Z4', '33221100998', '9876543213', 'Stall D-4', 8.00, 10.00],
        ['Specials Kitchen', '33EEEEE5555E1Z5', '77665544332', '9876543214', 'Stall E-5', 10.00, 30.00]
      ];
      await connection.query(
        'INSERT INTO vendors (name, gstin, bank_account, contact, stall_number, commission_rate, share_area) VALUES ?',
        [mockVendors]
      );
      console.log('Mock vendors seeded!');

      // Assign existing items to vendors
      console.log('Linking existing menu items to vendors...');
      const [vendors] = await connection.query('SELECT id, name FROM vendors');
      const getVendorId = (namePart) => vendors.find(v => v.name.includes(namePart))?.id;

      const southStallId = getVendorId('South Stall');
      const biryaniId = getVendorId('Biryani House');
      const snackId = getVendorId('Snack');
      const beverageId = getVendorId('Beverage');
      const specialsId = getVendorId('Specials');

      if (southStallId) {
        await connection.query('UPDATE items SET vendor_id = ? WHERE category IN (?, ?)', [southStallId, 'Breakfast', 'Lunch']);
      }
      if (snackId) {
        await connection.query('UPDATE items SET vendor_id = ? WHERE category = ?', [snackId, 'Snacks']);
      }
      if (beverageId) {
        await connection.query('UPDATE items SET vendor_id = ? WHERE category = ?', [beverageId, 'Beverages']);
      }
      if (biryaniId) {
        await connection.query('UPDATE items SET vendor_id = ? WHERE category = ?', [biryaniId, 'Combos']);
      }
      if (specialsId) {
        await connection.query('UPDATE items SET vendor_id = ? WHERE category = ?', [specialsId, 'Specials']);
      }
      console.log('Items linked successfully!');
    } else {
      console.log('Vendors table already populated.');
    }

    console.log('Migration successfully completed!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
