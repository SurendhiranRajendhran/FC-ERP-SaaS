import os

file_path = r'c:\Users\surendhiran.R\Desktop\ERP\frontend\src\index.css'

css_append = """

/* KDS Redesign Additions */
.kds-status-badge.partially-ready {
  background: #fef08a; /* yellow-200 */
  color: #854d0e; /* yellow-800 */
}

.item-status-chip {
  font-size: 0.8rem;
  margin-right: 4px;
}

.kds-vendor-group {
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
}

.kds-vendor-header {
  font-size: 0.85rem;
  font-weight: bold;
  background: var(--bg-color);
  padding: 4px 8px;
  color: var(--text-color);
  border-bottom: 1px solid var(--border-color);
}

.kds-vendor-group .kds-item-block {
  padding: 4px 8px;
  border-bottom: 1px dashed var(--border-color);
}

.kds-vendor-group .kds-item-block:last-child {
  border-bottom: none;
}
"""

with open(file_path, 'a', encoding='utf-8') as f:
    f.write(css_append)
    
print("Successfully appended CSS to index.css")
