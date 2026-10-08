const fs = require('fs');
const file = 'frontend/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = "const url = `http://${info.lan_ip}:${info.port}/menu?tenant=${user.tenant_id}`;";

const replacement = `let url;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          url = \`http://\${info.lan_ip}:\${info.port}/menu?tenant=\${user.tenant_id}\`;
        } else {
          url = window.location.origin + '/menu?tenant=' + user.tenant_id;
        }`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('App.jsx QR code logic updated.');
