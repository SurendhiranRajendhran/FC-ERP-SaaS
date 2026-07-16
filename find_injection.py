with open('c:/Users/surendhiran.R/Desktop/ERP/frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find main return( of App function - look for the line that contains the main sidebar
for i, line in enumerate(lines):
    if 'app-layout' in line or 'className="app-layout"' in line:
        print(f'app-layout at line {i+1}: {line.strip()[:80]}')

# Also find the 'return (' just before the main JSX
for i in range(2500, 2800):
    if '  return (' in lines[i] or '  return(' in lines[i]:
        print(f'return( at line {i+1}: {repr(lines[i])}')
        break
