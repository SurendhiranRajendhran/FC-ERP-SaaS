const mysql = require('mysql2/promise');

async function runMigration() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'erp',
    multipleStatements: true
  });

  try {
    console.log('Starting RFID & Wallet Database Migration...');

    // 1. Add wallet fields to customers table
    const alterCustomersSQL = `
      ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS rfid_tag VARCHAR(100) UNIQUE,
      ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(12,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS is_mess_subscriber BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS mess_meals_left INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS mess_valid_until DATE DEFAULT NULL;
    `;
    await connection.query(alterCustomersSQL);
    console.log('✅ Added wallet & mess fields to customers table');

    // 2. Create wallet_transactions table
    const createTransactionsSQL = `
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        type ENUM('credit', 'debit') NOT NULL,
        amount DECIMAL(12,2) DEFAULT 0.00,
        meals_count INT DEFAULT 0,
        balance_after DECIMAL(12,2) DEFAULT 0.00,
        meals_after INT DEFAULT 0,
        reference_id VARCHAR(100),
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      );
    `;
    await connection.query(createTransactionsSQL);
    console.log('✅ Created wallet_transactions table');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

runMigration();
