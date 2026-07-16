const fs = require('fs');

let code = fs.readFileSync('frontend/src/App.jsx', 'utf8');
let replacedCount = 0;

// Replace exact pattern:
// const data = await res.json();
// setSomething(data);
// or setSomething(Array.isArray(data) ? data : []);

// First, revert the array changes we just made to make it cleaner
code = code.replace(/set([A-Za-z0-9_]+)\(Array\.isArray\(data\) \? data : \[\]\);/g, 'set$1(data);');

// Now, insert the res.ok check
code = code.replace(/const data = await res\.json\(\);\s*set([A-Za-z0-9_]+)\(data\);/g, (match, setter) => {
  replacedCount++;
  return `const data = await res.json();\n      if (!res.ok) throw new Error(data.error || 'Fetch failed');\n      set${setter}(data);`;
});

// There is one edge case in fetchDashboard where it does:
// setDashData(data.dash || { ... });
// setLogs(data.logs || []);
// Let's check for those manually if needed.

console.log('Replaced', replacedCount, 'fetchers with res.ok check');
fs.writeFileSync('frontend/src/App.jsx', code);
