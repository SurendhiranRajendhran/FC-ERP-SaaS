const fs = require('fs');
const file = 'frontend/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/pattern="\^\\\\\\\\\\+?\\\\\\\\d\{10,15\}\$"/g, 'pattern="^\\\\+?\\\\d{10,15}$"'); // Wait, let's just use string split join.

content = content.split('pattern="^\\\\+?\\\\d{10,15}$"').join('pattern="^\\+?\\d{10,15}$"');

fs.writeFileSync(file, content);
console.log('Fixed double backslashes in App.jsx patterns');
