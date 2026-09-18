import re

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update req.body extraction
body_pattern = r"const \{ action, admin_notes \} = req\.body;"
body_replacement = "const { action, admin_notes, custom_password } = req.body;"
content = content.replace("const { action, admin_notes } = req.body;", body_replacement)

# 2. Update password logic
password_pattern = """      // 2. Create owner user with random password
      const bcrypt = require('bcryptjs');
      const crypto = require('crypto');
      const plainPassword = crypto.randomBytes(4).toString('hex'); // 8 char random password"""

password_replacement = """      // 2. Create owner user with custom or random password
      const bcrypt = require('bcryptjs');
      const crypto = require('crypto');
      const plainPassword = custom_password || crypto.randomBytes(4).toString('hex');"""

content = content.replace(password_pattern, password_replacement)

# 3. Update the email template
email_pattern = """        <p>You can log in to your dashboard here: <a href="${loginUrl}">${loginUrl}</a></p>
        <p>Please change your password after your first login.</p>
        ${admin_notes ? `<p><b>Admin Note:</b> ${admin_notes}</p>` : ''}"""

email_replacement = """        <p>You can log in to your dashboard here: <a href="${loginUrl}">${loginUrl}</a></p>
        ${!custom_password ? `<p>Please change your password after your first login.</p>` : ''}
        ${admin_notes ? `<p><b>Admin Note:</b> ${admin_notes}</p>` : ''}"""

content = content.replace(email_pattern, email_replacement)

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("server.js updated.")
