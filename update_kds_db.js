const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'erp'
  });

  try {
    console.log('Altering order_items status default...');
    await connection.execute(`ALTER TABLE order_items MODIFY COLUMN status VARCHAR(20) DEFAULT 'Pending'`);
    
    console.log('Updating existing Preparing items for Pending orders...');
    await connection.execute(`
      UPDATE order_items oi
      JOIN orders o ON oi.order_id = o.id
      SET oi.status = 'Pending'
      WHERE o.status = 'Pending' AND oi.status = 'Preparing'
    `);
    
    console.log('Success!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

run();
