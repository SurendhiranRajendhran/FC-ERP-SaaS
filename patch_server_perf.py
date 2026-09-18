import re

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern for the entire API route
pattern = r"app\.get\('/api/staff/performance', async \(req, res\) => \{.*?\n\}\);"

replacement = """app.get('/api/staff/performance', async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate query parameters are required.' });
  }

  const startDateTime = `${startDate} 00:00:00`;
  const endDateTime = `${endDate} 23:59:59`;

  try {
    const [staffMetrics] = await pool.query(`
      SELECT
        s.id as staff_id,
        s.name as staff_name,
        s.role,
        IFNULL(att.days_present, 0) as days_present,
        IFNULL(att.total_records, 0) as total_attendance_records,
        IFNULL(att.late_days, 0) as late_days,
        IFNULL(lv.leaves_taken, 0) as leaves_taken,
        IFNULL(meals.total_meals, 0) as total_meals_consumed,
        IFNULL(meals.meal_cost, 0) as total_meal_cost,
        IFNULL(ord.orders_processed, 0) as orders_processed,
        IFNULL(ord.upsold_orders, 0) as upsold_orders,
        IFNULL(ord.avg_handling_time, 0) as avg_handling_time
      FROM staff s
      LEFT JOIN (
        SELECT staff_id,
          COUNT(*) as total_records,
          SUM(CASE WHEN status IN ('Present', 'Late') THEN 1 WHEN status = 'Half-Day' THEN 0.5 ELSE 0 END) as days_present,
          SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late_days
        FROM attendance
        WHERE attendance_date BETWEEN ? AND ?
        GROUP BY staff_id
      ) att ON s.id = att.staff_id
      LEFT JOIN (
        SELECT staff_id, 
          SUM(DATEDIFF(LEAST(end_date, DATE(?)), GREATEST(start_date, DATE(?))) + 1) as leaves_taken
        FROM leaves
        WHERE status = 'Approved'
          AND start_date <= DATE(?) 
          AND end_date >= DATE(?)
        GROUP BY staff_id
      ) lv ON s.id = lv.staff_id
      LEFT JOIN (
        SELECT o.customer_staff_id as staff_id,
          SUM(oi.quantity) as total_meals,
          SUM(oi.quantity * oi.price) as meal_cost
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.discount_type = 'StaffMeal'
          AND o.order_date BETWEEN ? AND ?
          AND o.status != 'Cancelled'
        GROUP BY o.customer_staff_id
      ) meals ON s.id = meals.staff_id
      LEFT JOIN (
        SELECT 
          billing_staff_id,
          COUNT(*) as orders_processed,
          IFNULL(SUM(is_upsold), 0) as upsold_orders,
          IFNULL(AVG(TIMESTAMPDIFF(SECOND, preparation_start, preparation_end)), 0) as avg_handling_time
        FROM orders
        WHERE order_date BETWEEN ? AND ? AND status IN ('Ready', 'Completed')
        GROUP BY billing_staff_id
      ) ord ON s.id = ord.billing_staff_id
      WHERE s.is_active = 1 AND s.exclude_from_performance = 0
        AND s.tenant_id = ?
        AND (
          ? IS NULL OR s.vendor_id = ?
        )
      ORDER BY s.name
    `, [
      startDateTime, endDateTime,
      endDateTime, startDateTime, endDateTime, startDateTime,
      startDateTime, endDateTime,
      startDateTime, endDateTime,
      req.user.tenant_id,
      req.user.vendor_id || null, req.user.vendor_id || null
    ]);

    res.json(staffMetrics);
  } catch (error) {
    console.error('Error fetching staff performance:', error);
    res.status(500).json({ error: 'Failed to fetch staff performance' });
  }
});"""

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("server.js updated.")
