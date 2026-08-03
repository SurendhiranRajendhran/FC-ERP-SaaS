const mysql = require('mysql2/promise');
const http = require('http');

async function run() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'erp' });

  try {
    // Reset stock levels to 10 for both
    await pool.query('UPDATE raw_materials SET stock_level = 10 WHERE id IN (77, 78)');
    console.log('Reset stock levels to 10 for both materials');

    // Show current state
    const [before77] = await pool.query('SELECT id, name, stock_level, vendor_id FROM raw_materials WHERE id = 77');
    const [before78] = await pool.query('SELECT id, name, stock_level, vendor_id FROM raw_materials WHERE id = 78');
    console.log('BEFORE - Stall A Carrot (id=77):', before77[0]);
    console.log('BEFORE - Central Carrot (id=78):', before78[0]);

    // Create a transfer request: from Central (null) to Stall A (vendor_id=6), material_id=77 (Stall A's Carrot)
    const [res] = await pool.query(
      "INSERT INTO stock_transfers (from_vendor_id, to_vendor_id, material_id, quantity, status, requested_by, tenant_id, material_name, unit, qty) VALUES (NULL, 6, 77, 2, 'Requested', 'TestScript', 5, 'Carrot', 'kg', 2)"
    );
    const transferId = res.insertId;
    console.log('\nCreated transfer ID:', transferId);

    // Now approve it via API
    const postData = JSON.stringify({ status: 'Completed', approved_by: 'TestAdmin' });
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/stock-transfers/' + transferId,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const apiReq = http.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', async () => {
        console.log('\nAPI Response Status:', apiRes.statusCode);
        console.log('API Response Body:', data);

        const [after77] = await pool.query('SELECT id, name, stock_level, vendor_id FROM raw_materials WHERE id = 77');
        const [after78] = await pool.query('SELECT id, name, stock_level, vendor_id FROM raw_materials WHERE id = 78');
        console.log('\nAFTER - Stall A Carrot (id=77):', after77[0]);
        console.log('AFTER - Central Carrot (id=78):', after78[0]);

        // Show stock logs
        const [logs] = await pool.query('SELECT * FROM stock_logs ORDER BY id DESC LIMIT 4');
        console.log('\nRecent Stock Logs:');
        logs.forEach(l => console.log(`  material_id=${l.material_id}, change=${l.change_qty}, type=${l.log_type}, vendor_id=${l.vendor_id}`));

        await pool.end();
        process.exit(0);
      });
    });

    apiReq.on('error', (e) => {
      console.error('API Error:', e.message);
      process.exit(1);
    });

    apiReq.write(postData);
    apiReq.end();
  } catch (e) {
    console.error('Error:', e);
    await pool.end();
    process.exit(1);
  }
}

run();
