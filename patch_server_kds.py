import os
import re

file_path = r'c:\Users\surendhiran.R\Desktop\ERP\server.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add /api/kds/orders/:id/start
start_endpoint = """
// KDS Item-Level Start Update
app.put('/api/kds/orders/:id/start', async (req, res) => {
  const { id } = req.params;
  const { vendor_id } = req.body;
  
  try {
    let updateItemsQuery;
    let updateItemsParams;
    
    if (vendor_id === 'all' || vendor_id === undefined) {
      updateItemsQuery = `UPDATE order_items oi SET oi.status = 'Preparing' WHERE oi.order_id = ? AND oi.status = 'Pending'`;
      updateItemsParams = [id];
    } else if (vendor_id === 'null' || vendor_id === null) {
      updateItemsQuery = `
        UPDATE order_items oi JOIN items i ON oi.item_id = i.id 
        SET oi.status = 'Preparing' WHERE oi.order_id = ? AND i.vendor_id IS NULL AND oi.status = 'Pending'
      `;
      updateItemsParams = [id];
    } else {
      updateItemsQuery = `
        UPDATE order_items oi JOIN items i ON oi.item_id = i.id 
        SET oi.status = 'Preparing' WHERE oi.order_id = ? AND i.vendor_id = ? AND oi.status = 'Pending'
      `;
      updateItemsParams = [id, parseInt(vendor_id)];
    }
    
    await pool.query(updateItemsQuery, updateItemsParams);

    // Set preparation_start if this is the first item being started
    const [orderCheck] = await pool.query('SELECT preparation_start FROM orders WHERE id = ?', [id]);
    if (orderCheck.length > 0 && !orderCheck[0].preparation_start) {
      await pool.query('UPDATE orders SET preparation_start = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    }

    const [allItemRows] = await pool.query('SELECT status FROM order_items WHERE order_id = ?', [id]);
    const totalItems = allItemRows.length;
    const readyItems = allItemRows.filter(r => r.status === 'Ready').length;
    const preparingItems = allItemRows.filter(r => r.status === 'Preparing').length;
    
    let newOrderStatus = 'Pending';
    if (readyItems === totalItems) {
      newOrderStatus = 'Ready';
    } else if (readyItems > 0) {
      newOrderStatus = 'Partially Ready';
    } else if (preparingItems > 0) {
      newOrderStatus = 'Preparing';
    }

    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [newOrderStatus, id]);
    res.json({ success: true, message: 'Vendor items marked as Preparing', orderStatus: newOrderStatus });
  } catch (error) {
    console.error('KDS start error:', error);
    res.status(500).json({ error: 'Failed to update KDS item status to Preparing' });
  }
});

// KDS Item-Level Ready Update
"""
content = content.replace("// KDS Item-Level Ready Update\n", start_endpoint)

# 2. Modify /api/kds/orders/:id/ready
ready_endpoint_old = """    if (vendor_id === 'all' || vendor_id === undefined) {
      updateItemsQuery = `
        UPDATE order_items oi
        SET oi.status = 'Ready'
        WHERE oi.order_id = ?
      `;
      updateItemsParams = [id];
    } else if (vendor_id === 'null' || vendor_id === null) {
      updateItemsQuery = `
        UPDATE order_items oi
        JOIN items i ON oi.item_id = i.id
        SET oi.status = 'Ready'
        WHERE oi.order_id = ? AND i.vendor_id IS NULL
      `;
      updateItemsParams = [id];
    } else {
      updateItemsQuery = `
        UPDATE order_items oi
        JOIN items i ON oi.item_id = i.id
        SET oi.status = 'Ready'
        WHERE oi.order_id = ? AND i.vendor_id = ?
      `;
      updateItemsParams = [id, parseInt(vendor_id)];
    }"""
ready_endpoint_new = """    if (vendor_id === 'all' || vendor_id === undefined) {
      updateItemsQuery = `
        UPDATE order_items oi
        SET oi.status = 'Ready'
        WHERE oi.order_id = ? AND oi.status = 'Preparing'
      `;
      updateItemsParams = [id];
    } else if (vendor_id === 'null' || vendor_id === null) {
      updateItemsQuery = `
        UPDATE order_items oi
        JOIN items i ON oi.item_id = i.id
        SET oi.status = 'Ready'
        WHERE oi.order_id = ? AND i.vendor_id IS NULL AND oi.status = 'Preparing'
      `;
      updateItemsParams = [id];
    } else {
      updateItemsQuery = `
        UPDATE order_items oi
        JOIN items i ON oi.item_id = i.id
        SET oi.status = 'Ready'
        WHERE oi.order_id = ? AND i.vendor_id = ? AND oi.status = 'Preparing'
      `;
      updateItemsParams = [id, parseInt(vendor_id)];
    }"""
content = content.replace(ready_endpoint_old, ready_endpoint_new)

# 3. Modify ready order status update
ready_status_old = """    let newOrderStatus = '';
    if (readyItems === totalItems) {
      newOrderStatus = 'Ready';
    } else if (readyItems > 0) {
      newOrderStatus = 'Partially Ready';
    } else {
      newOrderStatus = 'Preparing'; // Should not happen based on logic above, but safe fallback
    }"""
ready_status_new = """    const preparingItems = allItemRows.filter(r => r.status === 'Preparing').length;
    let newOrderStatus = 'Pending';
    if (readyItems === totalItems) {
      newOrderStatus = 'Ready';
    } else if (readyItems > 0) {
      newOrderStatus = 'Partially Ready';
    } else if (preparingItems > 0) {
      newOrderStatus = 'Preparing';
    }"""
content = content.replace(ready_status_old, ready_status_new)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated server.js")
