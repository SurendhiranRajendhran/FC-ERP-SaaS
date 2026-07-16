const fs = require('fs');
let code = fs.readFileSync('frontend/src/App.jsx', 'utf8');

const defaultTabLogic = `
  // Enforce default tab based on role
  useEffect(() => {
    if (user) {
      if (user.role === 'Cook' && !['kds'].includes(activeTab)) {
        setActiveTab('kds');
      } else if (user.role === 'Cashier' && !['pos', 'menu', 'orders'].includes(activeTab)) {
        setActiveTab('pos');
      }
    }
  }, [user, activeTab]);
`;

code = code.replace(/const \[activeTab, setActiveTab\] = useState\('dashboard'\);/, `const [activeTab, setActiveTab] = useState('dashboard');\n${defaultTabLogic}`);

fs.writeFileSync('frontend/src/App.jsx', code);
console.log('Added default tab redirection.');
