const fs = require('fs');
const file = 'server.js';
let content = fs.readFileSync(file, 'utf8');

const target = `app.use(express.static(path.join(__dirname, 'public')));`;

const replacement = `// Global strict input validation middleware
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?\\d{10,15}$/;
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;

    const emailFields = ['email', 'owner_email', 'custom_email'];
    const phoneFields = ['phone', 'customer_phone', 'contact'];
    const gstFields = ['gstin', 'gst_no'];

    for (const key of Object.keys(req.body)) {
      const val = req.body[key];
      if (!val || typeof val !== 'string') continue;

      if (emailFields.includes(key)) {
        if (!emailRegex.test(val)) {
          return res.status(400).json({ error: \`Invalid \${key} format. Please enter a valid email address.\` });
        }
      }
      if (phoneFields.includes(key)) {
        const cleanPhone = val.replace(/[\\s-]/g, '');
        if (!phoneRegex.test(cleanPhone)) {
          return res.status(400).json({ error: \`Invalid \${key} format. Phone must contain 10-15 digits.\` });
        }
        req.body[key] = cleanPhone;
      }
      if (gstFields.includes(key)) {
        if (!gstRegex.test(val)) {
          return res.status(400).json({ error: \`Invalid \${key} format. Please enter a valid 15-character GSTIN.\` });
        }
        req.body[key] = val.toUpperCase();
      }
    }
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Backend Validation Middleware Added.');
