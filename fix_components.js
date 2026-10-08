const fs = require('fs');

function replaceInFile(file, replacements) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    for (let r of replacements) {
        content = content.replace(r.search, r.replace);
    }
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
}

replaceInFile('frontend/src/Promotions.jsx', [
    { search: "const API_BASE = 'http://localhost:5000/api';", replace: "const API_BASE = '/api';" }
]);

replaceInFile('frontend/src/StallInsights.jsx', [
    { search: "const API_BASE = 'http://localhost:5000/api';", replace: "const API_BASE = '/api';" }
]);

replaceInFile('frontend/src/WalletManagement.jsx', [
    { search: "const API_BASE = 'http://localhost:5000/api';", replace: "const API_BASE = '/api';" }
]);

replaceInFile('frontend/src/SignUpPage.jsx', [
    { search: "'http://localhost:5000/api/register'", replace: "'/api/register'" }
]);

replaceInFile('frontend/src/SignUpPage_temp.jsx', [
    { search: "'http://localhost:5000/api/register'", replace: "'/api/register'" }
]);

replaceInFile('frontend/src/CrmNotifications.jsx', [
    { search: "`http://localhost:5000${url}`", replace: "url" } // Wait, CrmNotifications logic might need just URL if relative. Let's check first.
]);

