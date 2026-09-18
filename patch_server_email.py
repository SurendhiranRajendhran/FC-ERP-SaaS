import re

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update req.body extraction
body_pattern = r"const \{ action, admin_notes, custom_password \} = req\.body;"
body_replacement = "const { action, admin_notes, custom_password, custom_email } = req.body;"
content = content.replace("const { action, admin_notes, custom_password } = req.body;", body_replacement)

# 2. Update insert logic
insert_pattern = """      await conn.query(
        'INSERT INTO staff (name, email, password_hash, role, tenant_id) VALUES (?, ?, ?, ?, ?)',
        [reg.owner_name, reg.email, hashedPassword, 'Owner', tenantId]
      );"""

insert_replacement = """      const loginEmail = custom_email || reg.email;
      await conn.query(
        'INSERT INTO staff (name, email, password_hash, role, tenant_id) VALUES (?, ?, ?, ?, ?)',
        [reg.owner_name, loginEmail, hashedPassword, 'Owner', tenantId]
      );"""
content = content.replace(insert_pattern, insert_replacement)

# 3. Update the email template list items
email_pattern = """        <ul>
          <li><b>Email:</b> ${reg.email}</li>
          <li><b>Password:</b> ${plainPassword}</li>
        </ul>"""

email_replacement = """        <ul>
          <li><b>Login Email:</b> ${loginEmail}</li>
          <li><b>Password:</b> ${plainPassword}</li>
        </ul>"""
content = content.replace(email_pattern, email_replacement)

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("server.js updated for custom email.")
