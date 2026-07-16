const mysql = require('mysql2/promise');

async function migrate() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'erp' });
  try {
    console.log('Adding recorded_cogs column...');
    await pool.query('ALTER TABLE order_items ADD COLUMN recorded_cogs DECIMAL(10,2) DEFAULT 0.00 AFTER price');
    
    console.log('Backfilling recorded_cogs for existing orders...');
    const [result] = await pool.query(`
      UPDATE order_items oi
      SET recorded_cogs = IFNULL((
        SELECT SUM(r.quantity * rm.cost_per_unit)
        FROM recipes r
        JOIN raw_materials rm ON r.material_id = rm.id
        WHERE r.item_id = oi.item_id
      ) * oi.quantity, 0)
    `);
    console.log('Migration complete! Rows affected:', result.affectedRows);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column recorded_cogs already exists.');
    } else {
      console.error('Migration failed:', err);
    }
  } finally {
    pool.end();
  }
}

migrate();
