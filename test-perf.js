const mysql = require('mysql2/promise');
require('dotenv').config();
async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'erp'
  });
  const month = 6; const year = 2026;
  try {
    const q = `
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
        WHERE MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?
        GROUP BY staff_id
      ) att ON s.id = att.staff_id
      LEFT JOIN (
        SELECT staff_id, COUNT(*) as leaves_taken
        FROM leaves
        WHERE status = 'Approved'
          AND ((MONTH(start_date) = ? AND YEAR(start_date) = ?) OR (MONTH(end_date) = ? AND YEAR(end_date) = ?))
        GROUP BY staff_id
      ) lv ON s.id = lv.staff_id
      LEFT JOIN (
        SELECT staff_id,
          SUM(quantity) as total_meals,
          SUM(quantity * price) as meal_cost
        FROM staff_meals
        WHERE MONTH(meal_date) = ? AND YEAR(meal_date) = ?
        GROUP BY staff_id
      ) meals ON s.id = meals.staff_id
      LEFT JOIN (
        SELECT 
          billing_staff_id,
          COUNT(*) as orders_processed,
          IFNULL(SUM(is_upsold), 0) as upsold_orders,
          IFNULL(AVG(TIMESTAMPDIFF(SECOND, preparation_start, preparation_end)), 0) as avg_handling_time
        FROM orders
        WHERE MONTH(order_date) = ? AND YEAR(order_date) = ? AND status IN ('Ready', 'Completed')
        GROUP BY billing_staff_id
      ) ord ON s.id = ord.billing_staff_id
      WHERE s.is_active = 1 AND s.exclude_from_performance = 0
      ORDER BY s.name
    `;
    const [staffMetrics] = await conn.query(q, [month, year, month, year, month, year, month, year, month, year]);
    console.log('Success:', staffMetrics);
  } catch(e) {
    console.error('Error:', e.message);
  }
  await conn.end();
}
run();
