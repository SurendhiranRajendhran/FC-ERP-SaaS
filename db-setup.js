const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'erp',
};

const tables = [
  {
    name: 'items',
    query: `
      CREATE TABLE IF NOT EXISTS items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category ENUM('Breakfast', 'Lunch', 'Snacks', 'Beverages', 'Combos', 'Specials') NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        gst_rate DECIMAL(5,2) DEFAULT 5.00,
        is_active TINYINT(1) DEFAULT 1,
        image_url VARCHAR(500) DEFAULT NULL,
        description TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `
  },
  {
    name: 'raw_materials',
    query: `
      CREATE TABLE IF NOT EXISTS raw_materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        stock_level DECIMAL(10,3) DEFAULT 0.000,
        min_stock DECIMAL(10,3) DEFAULT 0.000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `
  },
  {
    name: 'recipes',
    query: `
      CREATE TABLE IF NOT EXISTS recipes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        material_id INT NOT NULL,
        quantity DECIMAL(10,3) NOT NULL,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
        FOREIGN KEY (material_id) REFERENCES raw_materials(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `
  },
  {
    name: 'orders',
    query: `
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        token_number VARCHAR(50) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        gst_amount DECIMAL(10,2) NOT NULL,
        payment_mode ENUM('Cash', 'UPI', 'Card', 'Meal Card') NOT NULL,
        status ENUM('Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled') DEFAULT 'Pending'
      ) ENGINE=InnoDB;
    `
  },
  {
    name: 'order_items',
    query: `
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        item_id INT NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id)
      ) ENGINE=InnoDB;
    `
  },
  {
    name: 'stock_logs',
    query: `
      CREATE TABLE IF NOT EXISTS stock_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        material_id INT NOT NULL,
        change_qty DECIMAL(10,3) NOT NULL,
        log_type ENUM('Opening', 'Closing', 'Purchase', 'Sale Deduction', 'Adjustment', 'Wastage') NOT NULL,
        reason VARCHAR(255) DEFAULT NULL,
        logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES raw_materials(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `
  }
];

async function setup() {
  let connection;
  try {
    console.log('Connecting to MySQL database with config:', {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database
    });

    connection = await mysql.createConnection(dbConfig);
    console.log('Successfully connected to XAMPP MySQL database!');

    // Create Tables
    for (const table of tables) {
      console.log(`Creating table: ${table.name}...`);
      await connection.query(table.query);
      console.log(`Table ${table.name} created or already exists.`);
    }

    // Seed Mock Menu Items
    const [existingItems] = await connection.query('SELECT COUNT(*) as count FROM items');
    if (existingItems[0].count === 0) {
      console.log('Seeding mock menu items...');
      const mockItems = [
        ['Masala Dosa', 'Breakfast', 60.00, 5.00, 1, 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500', 'Crispy rice crepe served with potato masala, sambar, and coconut chutney.'],
        ['Idli sambar (2 Pcs)', 'Breakfast', 40.00, 5.00, 1, 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500', 'Soft steamed rice cakes served with aromatic lentil sambar.'],
        ['Veg Biryani', 'Lunch', 120.00, 5.00, 1, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500', 'Fragrant basmati rice cooked with assorted vegetables and spices.'],
        ['South Indian Meals', 'Lunch', 90.00, 5.00, 1, 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500', 'Rice served with Sambar, Rasam, Kootu, Poriyal, Curd, and Appalam.'],
        ['Samosa (1 Pc)', 'Snacks', 15.00, 5.00, 1, 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500', 'Crispy fried pastry filled with spiced potato and peas mixture.'],
        ['Filter Coffee', 'Beverages', 20.00, 5.00, 1, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500', 'Traditional South Indian frothy milk coffee.'],
        ['Fresh Lime Juice', 'Beverages', 25.00, 5.00, 1, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500', 'Refreshing sweet and salty lemon juice.'],
        ['Paneer Butter Masala Combo', 'Combos', 150.00, 5.00, 1, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500', 'Paneer Butter Masala served with 2 Butter Rotis and Jeera Rice.'],
        ['Chef Special Pasta', 'Specials', 140.00, 5.00, 1, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500', 'Creamy white sauce pasta tossed with exotic fresh veggies.']
      ];
      await connection.query(
        'INSERT INTO items (name, category, price, gst_rate, is_active, image_url, description) VALUES ?',
        [mockItems]
      );
      console.log('Seeded 9 starting menu items successfully.');
    }

    // Seed Mock Raw Materials
    const [existingMaterials] = await connection.query('SELECT COUNT(*) as count FROM raw_materials');
    if (existingMaterials[0].count === 0) {
      console.log('Seeding mock raw materials...');
      const mockMaterials = [
        ['Rice', 'kg', 100.000, 20.000],
        ['Cooking Oil', 'litre', 25.000, 5.000],
        ['Milk', 'litre', 30.000, 10.000],
        ['Coffee Powder', 'kg', 2.500, 0.500],
        ['Potatoes', 'kg', 45.000, 15.000],
        ['Onions', 'kg', 50.000, 10.000],
        ['Paneer', 'kg', 5.000, 1.500],
        ['Pasta', 'kg', 10.000, 2.000],
        ['Sugar', 'kg', 15.000, 3.000],
        ['Sambar Powder', 'kg', 3.000, 0.500]
      ];
      await connection.query(
        'INSERT INTO raw_materials (name, unit, stock_level, min_stock) VALUES ?',
        [mockMaterials]
      );
      console.log('Seeded 10 starting raw materials successfully.');

      // Fetch newly added items & materials to seed basic recipes
      const [dbItems] = await connection.query('SELECT id, name FROM items');
      const [dbMaterials] = await connection.query('SELECT id, name FROM raw_materials');

      const findItemId = (name) => dbItems.find(i => i.name === name)?.id;
      const findMatId = (name) => dbMaterials.find(m => m.name === name)?.id;

      const mockRecipes = [];

      // Filter Coffee Recipe: requires 0.15L Milk, 0.015kg Coffee Powder, 0.015kg Sugar
      const coffeeId = findItemId('Filter Coffee');
      if (coffeeId) {
        mockRecipes.push(
          [coffeeId, findMatId('Milk'), 0.150],
          [coffeeId, findMatId('Coffee Powder'), 0.015],
          [coffeeId, findMatId('Sugar'), 0.015]
        );
      }

      // Masala Dosa Recipe: requires 0.1kg Rice, 0.05kg Potatoes, 0.02L Cooking Oil
      const dosaId = findItemId('Masala Dosa');
      if (dosaId) {
        mockRecipes.push(
          [dosaId, findMatId('Rice'), 0.100],
          [dosaId, findMatId('Potatoes'), 0.050],
          [dosaId, findMatId('Cooking Oil'), 0.020]
        );
      }

      // Veg Biryani Recipe: requires 0.15kg Rice, 0.02L Cooking Oil, 0.04kg Onions
      const biryaniId = findItemId('Veg Biryani');
      if (biryaniId) {
        mockRecipes.push(
          [biryaniId, findMatId('Rice'), 0.150],
          [biryaniId, findMatId('Cooking Oil'), 0.020],
          [biryaniId, findMatId('Onions'), 0.040]
        );
      }

      if (mockRecipes.length > 0) {
        await connection.query(
          'INSERT INTO recipes (item_id, material_id, quantity) VALUES ?',
          [mockRecipes]
        );
        console.log(`Seeded ${mockRecipes.length} recipe maps successfully.`);
      }
    }

    console.log('DB Setup and Migration Completed Successfully!');

  } catch (error) {
    console.error('CRITICAL: Error setting up database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setup();
