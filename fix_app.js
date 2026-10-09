const fs = require('fs');
const file = 'frontend/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace all email inputs
content = content.replace(/type="email"/g, 'type="email" pattern="[^\\s@]+@[^\\s@]+\\.[^\\s@]+" title="Enter a valid email address (e.g., name@domain.com)"');

// For phones, there are multiple inputs. Let's find phone and tel inputs.
content = content.replace(/type="tel"/g, 'type="tel" pattern="^\\+?\\d{10,15}$" title="Phone number must contain 10-15 digits"');

// Wait, what if the phone input is type="text"? Let's check GST and phone fields specifically.
fs.writeFileSync(file, content);
console.log('Updated emails and tel in App.jsx');
