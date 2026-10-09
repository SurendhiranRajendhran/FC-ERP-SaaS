const fs = require('fs');
const file = 'frontend/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const target =             )}
            </div>
            <div class="tenant-selector">;

const replacement =             )}
            <div class="tenant-selector">;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
