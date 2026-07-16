const fs = require('fs');
let code = fs.readFileSync('frontend/src/App.jsx', 'utf8');

// Dashboard (Owner, Manager)
code = code.replace(/<div\s+className=\{\`menu-item \$\{activeTab === 'dashboard' \? 'active' : ''\}\`\}[\s\S]*?<\/div>/, (match) => {
  return `{['Owner', 'Manager'].includes(user.role) && (\n          ${match}\n        )}`;
});

// Menu (Items) (Owner, Manager, Cashier)
code = code.replace(/<div\s+className=\{\`menu-item \$\{activeTab === 'menu' \? 'active' : ''\}\`\}[\s\S]*?<\/div>/, (match) => {
  return `{['Owner', 'Manager', 'Cashier'].includes(user.role) && (\n          ${match}\n        )}`;
});

// Materials (Owner, Manager)
code = code.replace(/<div\s+className=\{\`menu-item \$\{activeTab === 'materials' \? 'active' : ''\}\`\}[\s\S]*?<\/div>/, (match) => {
  return `{['Owner', 'Manager'].includes(user.role) && (\n          ${match}\n        )}`;
});

// Recipes (Owner, Manager)
code = code.replace(/<div\s+className=\{\`menu-item \$\{activeTab === 'recipes' \? 'active' : ''\}\`\}[\s\S]*?<\/div>/, (match) => {
  return `{['Owner', 'Manager'].includes(user.role) && (\n          ${match}\n        )}`;
});

// Logs (Owner, Manager)
code = code.replace(/<div\s+className=\{\`menu-item \$\{activeTab === 'logs' \? 'active' : ''\}\`\}[\s\S]*?<\/div>/, (match) => {
  return `{['Owner', 'Manager'].includes(user.role) && (\n          ${match}\n        )}`;
});

// QR Ordering (Owner, Manager)
code = code.replace(/<div\s+className=\{\`menu-item \$\{activeTab === 'qr' \? 'active' : ''\}\`\}[\s\S]*?<\/div>/, (match) => {
  return `{['Owner', 'Manager'].includes(user.role) && (\n          ${match}\n        )}`;
});

// Orders (Past Orders) (Owner, Manager, Cashier)
code = code.replace(/<div\s+className=\{\`menu-item \$\{activeTab === 'orders' \? 'active' : ''\}\`\}[\s\S]*?<\/div>/, (match) => {
  return `{['Owner', 'Manager', 'Cashier'].includes(user.role) && (\n          ${match}\n        )}`;
});

// Fix existing pos and kds checks
code = code.replace(/\{user\.role !== 'Cook' && \(([\s\S]*?activeTab === 'pos'[\s\S]*?<\/div>\s*)\)\}/, `{['Owner', 'Manager', 'Cashier'].includes(user.role) && ($1)}`);
code = code.replace(/\{user\.role !== 'Cashier' && \(([\s\S]*?activeTab === 'kds'[\s\S]*?<\/div>\s*)\)\}/, `{['Owner', 'Manager', 'Cook'].includes(user.role) && ($1)}`);

fs.writeFileSync('frontend/src/App.jsx', code);
console.log('Sidebar UI logic updated.');
