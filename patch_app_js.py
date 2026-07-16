import re

def patch_app():
    with open('c:/Users/surendhiran.R/Desktop/ERP/frontend/src/App.jsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Inject custom fetch to handle Auth token automatically
    if "const originalFetch = window.fetch;" not in content:
        auth_interceptor = """
// --- AUTHENTICATION INTERCEPTOR ---
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  const token = localStorage.getItem('token');
  
  if (token && typeof resource === 'string' && resource.startsWith(API_BASE)) {
    config = config || {};
    config.headers = config.headers || {};
    // Don't overwrite if it already exists
    if (!config.headers['Authorization'] && !config.headers.Authorization) {
      // If headers is a Headers object
      if (config.headers instanceof Headers) {
        config.headers.append('Authorization', `Bearer ${token}`);
      } else {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
  }
  
  const response = await originalFetch(resource, config);
  if (response.status === 401 || response.status === 403) {
    // Check if it's not the login endpoint itself
    if (typeof resource === 'string' && !resource.includes('/api/auth/login') && !resource.includes('/api/items') && !resource.includes('/api/server-info')) {
      // Token expired or invalid
      console.error('Auth error on fetch:', response.status);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-expired'));
    }
  }
  return response;
};

// --- LOGIN SCREEN COMPONENT ---
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await originalFetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Food Court ERP
          </h1>
          <p>Login to your account</p>
        </div>
        
        {error && <div className="login-error">{error}</div>}
        
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="admin@foodcourt.com"
              required 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              required 
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
"""
        content = re.sub(r"(const API_BASE = .*?;)", r"\1\n" + auth_interceptor, content)

    # 2. Add auth state to App
    if "const [user, setUser] = useState(" not in content:
        app_state_injection = """
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);

  useEffect(() => {
    const handleAuthExpired = () => {
      setToken(null);
      setUser(null);
      setActiveTab('pos');
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  const handleLogin = (userData, authToken) => {
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
    
    // Default tab routing based on role
    if (userData.role === 'Cashier') setActiveTab('pos');
    else if (userData.role === 'Cook') setActiveTab('kds');
    else if (userData.role === 'Vendor') setActiveTab('inventory'); // Vendors usually manage inventory first
    else setActiveTab('pos');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setActiveTab('pos');
  };

  if (!token || !user) {
    return <LoginScreen onLogin={handleLogin} />;
  }
"""
        # Find 'export default function App() {'
        app_pattern = r"(export default function App\(\) \{)"
        content = re.sub(app_pattern, r"\1\n" + app_state_injection, content)

    # 3. Add logout button to sidebar footer
    if "onClick={handleLogout}" not in content:
        logout_btn = """
            <button onClick={handleLogout} style={{ marginTop: '12px', width: '100%', padding: '8px', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-muted)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Logout
            </button>"""
        # Find connection-status and insert
        content = re.sub(r"(<span className=\"status-dot online\"></span>\n\s+<span>Connected</span>\n\s+</div>)", r"\1" + logout_btn, content)

    # 4. Hide/show sidebar items based on role
    # POS -> All roles except Cook
    content = re.sub(r"(<div\s+className={`menu-item \${activeTab === 'pos' \? 'active' : ''}`}\s+onClick=\{.*?'pos'\)\})", 
                     r"{user.role !== 'Cook' && (\1", content)
    content = re.sub(r"(<span>Counter POS</span>\n\s+</div>)", r"\1\n          )}", content)

    # KDS -> All roles except Cashier
    content = re.sub(r"(<div\s+className={`menu-item \${activeTab === 'kds' \? 'active' : ''}`}\s+onClick=\{.*?'kds'\)\})", 
                     r"{user.role !== 'Cashier' && (\1", content)
    content = re.sub(r"(<span>Kitchen KDS</span>\n\s+</div>)", r"\1\n          )}", content)

    # Inventory -> Owner, Manager, Cook, Vendor
    content = re.sub(r"(\{\s*features\.inventory && \()", r"{features.inventory && ['Owner', 'Manager', 'Cook', 'Vendor'].includes(user.role) && (", content)

    # HR -> Owner, Manager
    content = re.sub(r"(\{\s*features\.hr && \()", r"{features.hr && ['Owner', 'Manager'].includes(user.role) && (", content)

    # Vendors -> Owner, Manager
    content = re.sub(r"(\{\s*features\.vendors && \()", r"{features.vendors && ['Owner', 'Manager'].includes(user.role) && (", content)
    
    # Reports -> Owner, Manager
    content = re.sub(r"(selectedVendorId === 'all' && \()", r"selectedVendorId === 'all' && ['Owner', 'Manager'].includes(user.role) && (", content)

    with open('c:/Users/surendhiran.R/Desktop/ERP/frontend/src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(content)

    print("App.jsx patched successfully.")

patch_app()
