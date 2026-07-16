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
    console.log('Connected!');

    // 1. Create staff table
    console.log('Creating staff table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) DEFAULT NULL,
        email VARCHAR(255) DEFAULT NULL,
        role ENUM('Owner', 'Manager', 'Billing Staff', 'Cook', 'Helper') NOT NULL DEFAULT 'Helper',
        pay_type ENUM('daily', 'monthly') NOT NULL DEFAULT 'monthly',
        daily_rate DECIMAL(10,2) DEFAULT 0.00,
        monthly_salary DECIMAL(10,2) DEFAULT 0.00,
        pf_enabled TINYINT(1) DEFAULT 1,
        esi_enabled TINYINT(1) DEFAULT 1,
        tds_percentage DECIMAL(5,2) DEFAULT 0.00,
        bank_account VARCHAR(100) DEFAULT NULL,
        joined_at DATE DEFAULT NULL,
        is_active TINYINT(1) DEFAULT 1,
        vendor_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);
    console.log('✅ staff table created.');

    // 2. Create shifts table
    console.log('Creating shifts table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    console.log('✅ shifts table created.');

    // 3. Create shift_roster table
    console.log('Creating shift_roster table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS shift_roster (
        id INT AUTO_INCREMENT PRIMARY KEY,
        staff_id INT NOT NULL,
        shift_id INT NOT NULL,
        roster_date DATE NOT NULL,
        status ENUM('Scheduled', 'Swapped', 'Cancelled') DEFAULT 'Scheduled',
        swap_with_staff_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
        FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
        FOREIGN KEY (swap_with_staff_id) REFERENCES staff(id) ON DELETE SET NULL,
        UNIQUE KEY unique_staff_date (staff_id, roster_date)
      ) ENGINE=InnoDB;
    `);
    console.log('✅ shift_roster table created.');

    // 4. Create attendance table
    console.log('Creating attendance table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        staff_id INT NOT NULL,
        attendance_date DATE NOT NULL,
        check_in DATETIME DEFAULT NULL,
        check_out DATETIME DEFAULT NULL,
        shift_id INT DEFAULT NULL,
        status ENUM('Present', 'Absent', 'Late', 'Half-Day') DEFAULT 'Present',
        notes VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
        FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
        UNIQUE KEY unique_staff_attendance (staff_id, attendance_date)
      ) ENGINE=InnoDB;
    `);
    console.log('✅ attendance table created.');

    // 5. Create leaves table
    console.log('Creating leaves table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS leaves (
        id INT AUTO_INCREMENT PRIMARY KEY,
        staff_id INT NOT NULL,
        leave_type ENUM('Casual', 'Sick', 'Earned', 'Comp-Off') NOT NULL DEFAULT 'Casual',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason VARCHAR(500) DEFAULT NULL,
        status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
        approved_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES staff(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);
    console.log('✅ leaves table created.');

    // 6. Create payroll table
    console.log('Creating payroll table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payroll (
        id INT AUTO_INCREMENT PRIMARY KEY,
        staff_id INT NOT NULL,
        month INT NOT NULL,
        year INT NOT NULL,
        working_days INT DEFAULT 26,
        days_present INT DEFAULT 0,
        gross_salary DECIMAL(10,2) DEFAULT 0.00,
        pf_deduction DECIMAL(10,2) DEFAULT 0.00,
        esi_deduction DECIMAL(10,2) DEFAULT 0.00,
        tds_deduction DECIMAL(10,2) DEFAULT 0.00,
        meal_deduction DECIMAL(10,2) DEFAULT 0.00,
        net_salary DECIMAL(10,2) DEFAULT 0.00,
        status ENUM('Draft', 'Finalized') DEFAULT 'Draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
        UNIQUE KEY unique_staff_payroll (staff_id, month, year)
      ) ENGINE=InnoDB;
    `);
    console.log('✅ payroll table created.');

    // 7. Create staff_meals table
    console.log('Creating staff_meals table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS staff_meals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        staff_id INT NOT NULL,
        item_id INT NOT NULL,
        quantity INT DEFAULT 1,
        price DECIMAL(10,2) NOT NULL,
        meal_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);
    console.log('✅ staff_meals table created.');

    // 8. Seed default shifts if empty
    const [existingShifts] = await connection.query('SELECT COUNT(*) as count FROM shifts');
    if (existingShifts[0].count === 0) {
      console.log('Seeding default shifts...');
      await connection.query(`
        INSERT INTO shifts (name, start_time, end_time) VALUES
        ('Morning', '06:00:00', '14:00:00'),
        ('Afternoon', '14:00:00', '22:00:00'),
        ('Evening', '22:00:00', '06:00:00')
      `);
      console.log('✅ Default shifts seeded.');
    }

    // 9. Seed sample staff if empty
    const [existingStaff] = await connection.query('SELECT COUNT(*) as count FROM staff');
    if (existingStaff[0].count === 0) {
      console.log('Seeding sample staff...');
      const sampleStaff = [
        ['Ramesh Kumar', '9876543210', 'ramesh@erp.local', 'Manager', 'monthly', 0, 25000, 1, 1, 0, '1122334455', '2024-01-15'],
        ['Priya Sharma', '9876543211', 'priya@erp.local', 'Billing Staff', 'monthly', 0, 18000, 1, 1, 0, '2233445566', '2024-03-01'],
        ['Suresh M', '9876543212', 'suresh@erp.local', 'Cook', 'monthly', 0, 20000, 1, 1, 0, '3344556677', '2024-02-10'],
        ['Lakshmi R', '9876543213', 'lakshmi@erp.local', 'Cook', 'daily', 600, 0, 0, 0, 0, '4455667788', '2024-06-01'],
        ['Dinesh P', '9876543214', 'dinesh@erp.local', 'Helper', 'daily', 450, 0, 0, 0, 0, '5566778899', '2024-07-15']
      ];
      await connection.query(
        'INSERT INTO staff (name, phone, email, role, pay_type, daily_rate, monthly_salary, pf_enabled, esi_enabled, tds_percentage, bank_account, joined_at) VALUES ?',
        [sampleStaff]
      );
      console.log('✅ Sample staff seeded.');
    }

    console.log('\n🎉 HR Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
