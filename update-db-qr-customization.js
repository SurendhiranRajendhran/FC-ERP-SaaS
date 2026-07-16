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

    // Check order_items columns
    console.log('Checking order_items table columns...');
    const [oiCols] = await connection.query('DESCRIBE order_items');
    
    const addOiColumn = async (colName, colDef) => {
      const exists = oiCols.some(col => col.Field === colName);
      if (!exists) {
        console.log(`Adding column ${colName} to order_items...`);
        await connection.query(`ALTER TABLE order_items ADD COLUMN ${colName} ${colDef};`);
        console.log(`✅ Column ${colName} added to order_items.`);
      } else {
        console.log(`Column ${colName} already exists in order_items.`);
      }
    };

    await addOiColumn('spice_level', 'VARCHAR(50) DEFAULT NULL');
    await addOiColumn('special_instructions', 'VARCHAR(255) DEFAULT NULL');

    // Check orders columns
    console.log('Checking orders table columns...');
    const [oCols] = await connection.query('DESCRIBE orders');
    
    const addOColumn = async (colName, colDef) => {
      const exists = oCols.some(col => col.Field === colName);
      if (!exists) {
        console.log(`Adding column ${colName} to orders...`);
        await connection.query(`ALTER TABLE orders ADD COLUMN ${colName} ${colDef};`);
        console.log(`✅ Column ${colName} added to orders.`);
      } else {
        console.log(`Column ${colName} already exists in orders.`);
      }
    };

    await addOColumn('pickup_slot', 'VARCHAR(100) DEFAULT NULL');

    console.log('\n🎉 QR Code Self-Ordering Customization migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
