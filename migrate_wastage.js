const mysql = require('mysql2/promise');

async function migrate() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'erp' });
  try {
    console.log('Adding recorded_cost column to stock_logs...');
    await pool.query('ALTER TABLE stock_logs ADD COLUMN recorded_cost DECIMAL(10,2) DEFAULT 0.00 AFTER change_qty');
    
    console.log('Backfilling recorded_cost for existing stock logs...');
    const [result] = await pool.query(`
      UPDATE stock_logs sl
      JOIN raw_materials rm ON sl.material_id = rm.id
      SET sl.recorded_cost = (sl.change_qty * rm.cost_per_unit)
    `);
    console.log('Migration complete! Rows affected:', result.affectedRows);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column recorded_cost already exists.');
    } else {
      console.error('Migration failed:', err);
    }
  } finally {
    pool.end();
  }
}

migrate();
