// update-db-crm.js -- CRM & Notifications Engine DB Migration
const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateDbCrm() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'erp'
  });
  console.log('Starting CRM DB migration...');

  const createQueries = [
    `CREATE TABLE IF NOT EXISTS notification_settings (
      id INT NOT NULL DEFAULT 1,
      whatsapp_provider VARCHAR(50) DEFAULT 'gupshup',
      gupshup_api_key VARCHAR(500) DEFAULT '',
      gupshup_app_name VARCHAR(255) DEFAULT '',
      gupshup_phone VARCHAR(20) DEFAULT '',
      sms_provider VARCHAR(50) DEFAULT 'msg91',
      msg91_auth_key VARCHAR(500) DEFAULT '',
      msg91_sender_id VARCHAR(20) DEFAULT 'ERPALR',
      smtp_host VARCHAR(255) DEFAULT '',
      smtp_port INT DEFAULT 587,
      smtp_user VARCHAR(255) DEFAULT '',
      smtp_pass VARCHAR(500) DEFAULT '',
      smtp_from_name VARCHAR(255) DEFAULT 'Food Court ERP',
      owner_whatsapp VARCHAR(20) DEFAULT '',
      owner_email VARCHAR(255) DEFAULT '',
      daily_summary_time VARCHAR(10) DEFAULT '22:00',
      daily_summary_enabled TINYINT(1) DEFAULT 1,
      loyalty_points_per_100 DECIMAL(5,2) DEFAULT 1.00,
      loyalty_min_redeem INT DEFAULT 50,
      loyalty_redeem_ratio DECIMAL(5,2) DEFAULT 1.00,
      loyalty_enabled TINYINT(1) DEFAULT 1,
      low_stock_alert_enabled TINYINT(1) DEFAULT 1,
      low_stock_throttle_hours INT DEFAULT 4,
      order_ready_sms TINYINT(1) DEFAULT 1,
      order_ready_whatsapp TINYINT(1) DEFAULT 1,
      negative_feedback_threshold INT DEFAULT 2,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB`,

    `INSERT IGNORE INTO notification_settings (id) VALUES (1)`,

    `CREATE TABLE IF NOT EXISTS notification_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      channel VARCHAR(20) NOT NULL,
      recipient VARCHAR(255),
      recipient_name VARCHAR(255),
      message TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      error_message TEXT,
      reference_id VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS broadcast_campaigns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      channel VARCHAR(20) DEFAULT 'whatsapp',
      target_segment VARCHAR(50) DEFAULT 'all',
      status VARCHAR(20) DEFAULT 'draft',
      scheduled_at DATETIME DEFAULT NULL,
      sent_at DATETIME DEFAULT NULL,
      total_recipients INT DEFAULT 0,
      total_sent INT DEFAULT 0,
      total_failed INT DEFAULT 0,
      created_by VARCHAR(100) DEFAULT 'Owner',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS broadcast_recipients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      campaign_id INT NOT NULL,
      customer_id INT,
      customer_name VARCHAR(255),
      phone VARCHAR(20),
      email VARCHAR(255),
      status VARCHAR(20) DEFAULT 'pending',
      sent_at DATETIME DEFAULT NULL,
      error_message VARCHAR(500),
      INDEX idx_campaign (campaign_id)
    ) ENGINE=InnoDB`,

    `CREATE TABLE IF NOT EXISTS loyalty_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      order_id INT,
      type VARCHAR(20) NOT NULL,
      points INT NOT NULL,
      balance_after INT NOT NULL,
      note VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_customer (customer_id)
    ) ENGINE=InnoDB`
  ];

  const alterQueries = [
    'ALTER TABLE customers ADD COLUMN total_spent DECIMAL(12,2) DEFAULT 0',
    'ALTER TABLE customers ADD COLUMN total_visits INT DEFAULT 0',
    'ALTER TABLE customers ADD COLUMN last_visit DATE DEFAULT NULL',
    'ALTER TABLE customers ADD COLUMN whatsapp_opt_in TINYINT(1) DEFAULT 1',
    'ALTER TABLE customers ADD COLUMN sms_opt_in TINYINT(1) DEFAULT 1',
    'ALTER TABLE customer_feedback ADD COLUMN food_rating INT DEFAULT NULL',
    'ALTER TABLE customer_feedback ADD COLUMN service_rating INT DEFAULT NULL',
    'ALTER TABLE customer_feedback ADD COLUMN speed_rating INT DEFAULT NULL',
    'ALTER TABLE customer_feedback ADD COLUMN customer_id INT DEFAULT NULL',
    'ALTER TABLE customer_feedback ADD COLUMN customer_phone VARCHAR(20) DEFAULT NULL',
    'ALTER TABLE customer_feedback ADD COLUMN is_negative_alerted TINYINT(1) DEFAULT 0',
    'ALTER TABLE raw_materials ADD COLUMN last_alert_sent DATETIME DEFAULT NULL'
  ];

  for (const q of createQueries) {
    try {
      await conn.query(q);
      console.log('  OK:', q.trim().substring(0, 60).replace(/\n/g, ' '));
    } catch (e) {
      console.error('  ERR:', e.message.substring(0, 80));
    }
  }
  for (const q of alterQueries) {
    try {
      await conn.query(q);
      console.log('  OK:', q);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        const col = q.split('ADD COLUMN ')[1]?.split(' ')[0];
        console.log('  SKIP (exists):', col);
      } else {
        console.error('  ERR:', e.message);
      }
    }
  }

  await conn.end();
  console.log('\nCRM DB migration complete!');
}
updateDbCrm().catch(console.error);
