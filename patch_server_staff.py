import re

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Patch /api/staff
staff_pattern = r"app\.get\('/api/staff', async \(req, res\) => \{\n\s*try \{\n\s*let query = 'SELECT \* FROM staff';\n\s*const params = \[\];\n\s*if \(req\.user\.vendor_id\) \{\n\s*// Stall Manager: only see their own stall's staff \(including themselves\)\n\s*query \+= ' WHERE vendor_id = \?';\n\s*params\.push\(req\.user\.vendor_id\);\n\s*\} else \{\n\s*// Central Admin: see Central Canteen staff \(no vendor\) \+ all Stall Managers\n\s*query \+= ' WHERE \(vendor_id IS NULL OR role = \\'Manager\\'\)';\n\s*\}\n\s*query \+= ' ORDER BY name';"

staff_replacement = """app.get('/api/staff', async (req, res) => {
  try {
    let query = 'SELECT * FROM staff WHERE tenant_id = ?';
    const params = [req.user.tenant_id];
    if (req.user.vendor_id) {
      // Stall Manager: only see their own stall's staff (including themselves)
      query += ' AND vendor_id = ?';
      params.push(req.user.vendor_id);
    } else {
      // Central Admin: see Central Canteen staff (no vendor) + all Stall Managers
      query += ' AND (vendor_id IS NULL OR role = \\'Manager\\')';
    }
    query += ' ORDER BY name';"""

content = re.sub(staff_pattern, staff_replacement, content)

# 2. Patch /api/staff/performance
perf_pattern = r"WHERE s\.is_active = 1 AND s\.exclude_from_performance = 0\n\s*AND s\.tenant_id = \?\n\s*AND \(\n\s*\? IS NULL OR s\.vendor_id = \?\n\s*\)\n\s*ORDER BY s\.name\n\s*`, \[\n\s*startDateTime, endDateTime,\n\s*endDateTime, startDateTime, endDateTime, startDateTime,\n\s*startDateTime, endDateTime,\n\s*startDateTime, endDateTime,\n\s*req\.user\.tenant_id,\n\s*req\.user\.vendor_id \|\| null, req\.user\.vendor_id \|\| null\n\s*\]\);"

perf_replacement = """WHERE s.is_active = 1 AND s.exclude_from_performance = 0
        AND s.tenant_id = ?
        AND (
          (? IS NOT NULL AND s.vendor_id = ?) OR
          (? IS NULL AND (s.vendor_id IS NULL OR s.role = 'Manager'))
        )
      ORDER BY s.name
    `, [
      startDateTime, endDateTime,
      endDateTime, startDateTime, endDateTime, startDateTime,
      startDateTime, endDateTime,
      startDateTime, endDateTime,
      req.user.tenant_id,
      req.user.vendor_id || null, req.user.vendor_id || null, req.user.vendor_id || null
    ]);"""

content = re.sub(perf_pattern, perf_replacement, content)

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated server.js")
