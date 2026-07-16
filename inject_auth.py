with open('c:/Users/surendhiran.R/Desktop/ERP/frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# ─── INJECTION 1: Auth state after line 460 (0-indexed: 459) ───────────────────
# After: const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '' });
auth_state = [
    '\n',
    '  // ── Authentication State ──\n',
    "  const [token, setToken] = useState(localStorage.getItem('token') || null);\n",
    "  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch(e) { return null; } });\n",
    '\n',
    '  const handleLogin = (userData, authToken) => {\n',
    "    localStorage.setItem('token', authToken);\n",
    "    localStorage.setItem('user', JSON.stringify(userData));\n",
    '    setToken(authToken);\n',
    '    setUser(userData);\n',
    "    if (userData.role === 'Cook') setActiveTab('kds');\n",
    "    else if (userData.role === 'Vendor') setActiveTab('inventory');\n",
    "    else setActiveTab('dashboard');\n",
    '  };\n',
    '\n',
    '  const handleLogout = () => {\n',
    "    localStorage.removeItem('token');\n",
    "    localStorage.removeItem('user');\n",
    '    setToken(null);\n',
    '    setUser(null);\n',
    "    setActiveTab('dashboard');\n",
    '  };\n',
    '\n',
]

# Insert after line 460 (index 459)
insert_idx = 459 + 1
lines = lines[:insert_idx] + auth_state + lines[insert_idx:]
print(f"After state injection: {len(lines)} lines")

# ─── INJECTION 2: Early auth return just before return ( (was line 2661) ───────
# Recalculate position (shifted by len(auth_state))
new_return_idx = 2661 - 1 + len(auth_state)  # was 0-indexed 2660
# Verify
print(f"Expected return line content: {lines[new_return_idx].strip()}")

# Find the actual 'return (' line from the new positions
actual_return_idx = -1
for i in range(new_return_idx - 5, new_return_idx + 10):
    if '  return (' in lines[i]:
        actual_return_idx = i
        break

print(f"Actual return( at index {actual_return_idx} (line {actual_return_idx+1})")

early_return = [
    '\n',
    '  // ── Auth Guard ─────────────────────────────────────\n',
    '  if (!token || !user) {\n',
    '    return <LoginScreen onLogin={handleLogin} />;\n',
    '  }\n',
    '\n',
]

lines = lines[:actual_return_idx] + early_return + lines[actual_return_idx:]
print(f"After early return injection: {len(lines)} lines")

with open('c:/Users/surendhiran.R/Desktop/ERP/frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Done! App.jsx auth state and early return injected successfully.")
