import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r"(\{reviewAction === 'approve' && \(\n)(\s*<div style=\{saStyles\.formGroup\}>\n\s*<label style=\{saStyles\.formLabel\}>Assign Login Email</label>)"
replacement = r"\1                <>\n\2"
content = re.sub(pattern, replacement, content)

pattern2 = r"(onBlur=\{e => \{ e\.target\.style\.borderColor = 'rgba\(255,255,255,0\.1\)'; \}\}\n\s*/>\n\s*</div>\n)(\s*\)\})"
replacement2 = r"\1                </>\n\2"
content = re.sub(pattern2, replacement2, content)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("fixed")
