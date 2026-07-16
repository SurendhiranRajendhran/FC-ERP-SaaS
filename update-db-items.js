const mysql = require('mysql2/promise');

const expandMenu = async () => {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'erp',
  });

  // All new items per category with carefully selected, working Unsplash food images
  const newItems = [
    // ---- BREAKFAST ----
    ['Poha', 'Breakfast', 25.00, 5.00, 'https://images.unsplash.com/photo-1697258605581-af0e83c1e0a4?w=500&q=80', 'Light flattened rice with mustard, peanuts and turmeric.'],
    ['Upma', 'Breakfast', 30.00, 5.00, 'https://images.unsplash.com/photo-1672243776827-1ded86d1f8d0?w=500&q=80', 'Semolina cooked with vegetables and spices.'],
    ['Puri Bhaji', 'Breakfast', 50.00, 5.00, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&q=80', 'Crispy deep-fried bread with spiced potato curry.'],
    ['Aloo Paratha', 'Breakfast', 55.00, 5.00, 'https://images.unsplash.com/photo-1604152135912-00a2e9c52288?w=500&q=80', 'Whole wheat flatbread stuffed with spiced potato.'],
    ['Bread Omelette', 'Breakfast', 45.00, 5.00, 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=500&q=80', 'Fluffy omelette served between toasted bread slices.'],
    ['Sheera (Halwa)', 'Breakfast', 35.00, 5.00, 'https://images.unsplash.com/photo-1651770906023-6fdc80fad7ae?w=500&q=80', 'Sweet semolina pudding with cashews and raisins.'],
    ['Rava Idli', 'Breakfast', 40.00, 5.00, 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=500&q=80', 'Soft semolina steamed cakes with sambar.'],

    // ---- LUNCH ----
    ['Dal Fry with Rice', 'Lunch', 80.00, 5.00, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80', 'Tempered yellow lentils with steamed basmati rice.'],
    ['Rajma Chawal', 'Lunch', 95.00, 5.00, 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&q=80', 'Red kidney beans curry served with steamed rice.'],
    ['Chapati with Sabji', 'Lunch', 60.00, 5.00, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&q=80', '3 soft chapatis served with seasonal vegetable curry.'],
    ['Sambar Rice', 'Lunch', 70.00, 5.00, 'https://images.unsplash.com/photo-1645078516016-160d70eb063c?w=500&q=80', 'Lentil tamarind stew mixed with steamed rice.'],
    ['Egg Rice', 'Lunch', 85.00, 5.00, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80', 'Wok-fried rice with scrambled eggs and vegetables.'],
    ['Paneer Fried Rice', 'Lunch', 110.00, 5.00, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80', 'Indo-Chinese fried rice with cottage cheese cubes.'],
    ['Mixed Veg Curry Rice', 'Lunch', 90.00, 5.00, 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=500&q=80', 'Seasonal vegetables in rich tomato-onion gravy with rice.'],

    // ---- SNACKS ----
    ['Bread Pakora', 'Snacks', 35.00, 5.00, 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&q=80', 'Spiced potato stuffed bread fritters.'],
    ['Veg Puff', 'Snacks', 30.00, 5.00, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&q=80', 'Flaky pastry filled with spiced mixed vegetables.'],
    ['Pani Puri (6 Pcs)', 'Snacks', 40.00, 5.00, 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&q=80', 'Crispy hollow puri filled with tangy tamarind water.'],
    ['Veg Burger', 'Snacks', 75.00, 5.00, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80', 'Crispy veggie patty with lettuce and special sauce.'],
    ['Spring Roll (2 Pcs)', 'Snacks', 60.00, 5.00, 'https://images.unsplash.com/photo-1600335895229-6e75511892c8?w=500&q=80', 'Crispy fried rolls with Indo-Chinese vegetable filling.'],
    ['Dhokla (4 Pcs)', 'Snacks', 45.00, 5.00, 'https://images.unsplash.com/photo-1604152135912-00a2e9c52288?w=500&q=80', 'Soft steamed fermented chickpea flour cakes.'],
    ['Corn Chaat', 'Snacks', 50.00, 5.00, 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&q=80', 'Spiced sweet corn with onion, tomato and lime.'],

    // ---- BEVERAGES ----
    ['Mango Lassi', 'Beverages', 55.00, 5.00, 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500&q=80', 'Chilled creamy yogurt blended with Alphonso mango.'],
    ['Sweet Lassi', 'Beverages', 40.00, 5.00, 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500&q=80', 'Chilled sweetened yogurt drink topped with cream.'],
    ['Buttermilk (Chaas)', 'Beverages', 20.00, 5.00, 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=500&q=80', 'Salted spiced yogurt drink with cumin and coriander.'],
    ['Lemon Soda', 'Beverages', 30.00, 5.00, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80', 'Fizzy lemon soda with a pinch of black salt.'],
    ['Hot Milk', 'Beverages', 25.00, 5.00, 'https://images.unsplash.com/photo-1606791405792-1004f1718d0c?w=500&q=80', 'Fresh full-cream hot milk.'],
    ['Badam Milk', 'Beverages', 55.00, 5.00, 'https://images.unsplash.com/photo-1461023058943-07cb1ce91122?w=500&q=80', 'Chilled almond-flavoured sweetened milk.'],
    ['Watermelon Juice', 'Beverages', 45.00, 5.00, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80', 'Fresh pressed seasonal watermelon juice.'],

    // ---- COMBOS ----
    ['Dosa + Filter Coffee', 'Combos', 90.00, 5.00, 'https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?w=500&q=80', 'Classic South Indian breakfast combo.'],
    ['Meals + Sweet', 'Combos', 130.00, 5.00, 'https://images.unsplash.com/photo-1626779836100-348259dcfb55?w=500&q=80', 'Full South Indian meals with payasam dessert.'],
    ['Biryani + Raita', 'Combos', 140.00, 5.00, 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=500&q=80', 'Fragrant veg biryani paired with fresh yogurt raita.'],
    ['Burger + Fries + Drink', 'Combos', 150.00, 5.00, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80', 'Veg burger with crispy fries and cold coffee.'],
    ['Idli + Vada + Coffee', 'Combos', 85.00, 5.00, 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=500&q=80', 'Classic 2 idli, 1 vada with filter coffee.'],
    ['Noodles + Spring Roll', 'Combos', 120.00, 5.00, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80', 'Veg Hakka noodles with crispy spring rolls.'],

    // ---- SPECIALS ----
    ['Paneer Tikka', 'Specials', 160.00, 5.00, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80', 'Marinated cottage cheese grilled in tandoor.'],
    ['Veg Manchurian', 'Specials', 120.00, 5.00, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80', 'Deep-fried veggie balls in spicy Manchurian sauce.'],
    ['Masala Pasta', 'Specials', 110.00, 5.00, 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=500&q=80', 'Fusion desi-style spiced pasta with vegetables.'],
    ['Schezwan Fried Rice', 'Specials', 130.00, 5.00, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80', 'Fiery Schezwan sauce fried rice with vegetables.'],
    ['Dal Makhani', 'Specials', 140.00, 5.00, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&q=80', 'Slow-cooked black lentils in creamy tomato butter gravy.'],
    ['Veg Pizza', 'Specials', 170.00, 5.00, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80', 'Thin-crust pizza loaded with fresh vegetables and cheese.'],
    ['Gulab Jamun (2 Pcs)', 'Specials', 50.00, 5.00, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&q=80', 'Soft milk-solid dumplings soaked in rose sugar syrup.'],
  ];

  // Also fix existing item images that were broken
  const imageUpdates = [
    { id: 1, url: 'https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?w=500&q=80' }, // Masala Dosa
    { id: 2, url: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=500&q=80' }, // Idli sambar
    { id: 3, url: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=500&q=80' }, // Veg Biryani
    { id: 4, url: 'https://images.unsplash.com/photo-1626779836100-348259dcfb55?w=500&q=80' }, // South Indian Meals
    { id: 5, url: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&q=80' }, // Samosa
    { id: 6, url: 'https://images.unsplash.com/photo-1606791405792-1004f1718d0c?w=500&q=80' }, // Filter Coffee
    { id: 7, url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80' }, // Fresh Lime Juice
    { id: 8, url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&q=80' }, // Paneer Butter Masala
    { id: 9, url: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=500&q=80' }, // Chef Special Pasta
    { id: 10, url: 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=500&q=80' }, // Masala Chai
    { id: 11, url: 'https://images.unsplash.com/photo-1604152135912-00a2e9c52288?w=500&q=80' }, // Medu Vada
    { id: 12, url: 'https://images.unsplash.com/photo-1645078516016-160d70eb063c?w=500&q=80' }, // Curd Rice
    { id: 13, url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80' }, // Veg Fried Rice
    { id: 14, url: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&q=80' }, // French Fries
    { id: 15, url: 'https://images.unsplash.com/photo-1461023058943-07cb1ce91122?w=500&q=80' }, // Cold Coffee
    { id: 16, url: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=500&q=80' }, // Chole Bhature
    { id: 17, url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&q=80' }, // Cheese Grill Sandwich
  ];

  try {
    console.log('Fixing existing image URLs...');
    for (const u of imageUpdates) {
      await pool.query('UPDATE items SET image_url = ? WHERE id = ?', [u.url, u.id]);
    }

    console.log('Adding new menu items...');
    let added = 0;
    for (const item of newItems) {
      const [existing] = await pool.query('SELECT id FROM items WHERE name = ?', [item[0]]);
      if (existing.length === 0) {
        await pool.query(
          'INSERT INTO items (name, category, price, gst_rate, image_url, description, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
          item
        );
        added++;
        console.log(`  ✓ Added: ${item[0]} (${item[1]})`);
      } else {
        console.log(`  ~ Skipped (exists): ${item[0]}`);
      }
    }

    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM items');
    console.log(`\nDone! ${added} new items added. Total items in menu: ${countResult[0].total}`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    pool.end();
  }
};

expandMenu();
