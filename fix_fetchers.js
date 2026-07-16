const fs = require('fs');

let code = fs.readFileSync('frontend/src/App.jsx', 'utf8');
let fetchCount = 0;

// Replace exact lines of "setSomething(data);" with "setSomething(Array.isArray(data) ? data : (res.ok ? data : []));"
// We'll target setters that set arrays.

const setters = [
  'setVendors', 'setSettlements', 'setVendorPerformance', 'setHeldOrders',
  'setStaff', 'setShifts', 'setRoster', 'setAttendance', 'setLeaves',
  'setPayroll', 'setStaffMeals', 'setStaffPerformance', 'setKdsOrders',
  'setKdsHistory', 'setItems', 'setCategories', 'setCustomers', 'setReportData', 'setReconciliation'
];

setters.forEach(setter => {
  const regex = new RegExp(`const data = await res\\.json\\(\\);\\s+${setter}\\(data\\);`, 'g');
  code = code.replace(regex, (match) => {
    fetchCount++;
    return `const data = await res.json();\n      ${setter}(Array.isArray(data) ? data : []);`;
  });
});

console.log('Replaced', fetchCount, 'fetchers automatically');
fs.writeFileSync('frontend/src/App.jsx', code);
