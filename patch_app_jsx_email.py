import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state variable
state_pattern = r"const \[customPassword, setCustomPassword\] = useState\(''\);"
state_replacement = "const [customPassword, setCustomPassword] = useState('');\n  const [customEmail, setCustomEmail] = useState('');"
content = re.sub(state_pattern, state_replacement, content, count=1)

# 2. Update submitReview
submit_pattern = r"body: JSON.stringify\(\{ action: reviewAction, admin_notes: adminNotes, custom_password: customPassword \}\)"
submit_replacement = "body: JSON.stringify({ action: reviewAction, admin_notes: adminNotes, custom_password: customPassword, custom_email: customEmail })"
content = content.replace("body: JSON.stringify({ action: reviewAction, admin_notes: adminNotes, custom_password: customPassword })", submit_replacement)

reset_pattern = r"setCustomPassword\(''\);"
reset_replacement = "setCustomPassword('');\n      setCustomEmail('');"
content = content.replace("setCustomPassword('');", reset_replacement)

# 3. Add input field to modal
modal_pattern = r"""<div style=\{saStyles.formGroup\}>\n                  <label style=\{saStyles.formLabel\}>Assign Password</label>"""
modal_replacement = """<div style={saStyles.formGroup}>
                  <label style={saStyles.formLabel}>Assign Login Email</label>
                  <input
                    type="email"
                    style={saStyles.formInput}
                    value={customEmail}
                    onChange={e => setCustomEmail(e.target.value)}
                    placeholder="Leave empty to use registration email"
                    onFocus={e => { e.target.style.borderColor = '#8b5cf6'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  />
                </div>
                <div style={saStyles.formGroup}>
                  <label style={saStyles.formLabel}>Assign Password</label>"""
content = re.sub(modal_pattern, modal_replacement, content)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("frontend/src/App.jsx updated for custom email.")
