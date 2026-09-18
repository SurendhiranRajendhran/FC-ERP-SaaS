import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add new state variables
state_pattern = r"const \[submittingReview, setSubmittingReview\] = useState\(false\);"
state_replacement = """const [submittingReview, setSubmittingReview] = useState(false);
  const [showPendingAlert, setShowPendingAlert] = useState(false);
  const [customPassword, setCustomPassword] = useState('');"""
content = re.sub(state_pattern, state_replacement, content, count=1)

# 2. Modify useEffect and fetchRegistrations
fetch_replacement = """useEffect(() => {
    fetchRegistrations();
  }, []);

  useEffect(() => {
    if (activeTab === 'registrations') {
      fetchRegistrations();
    }
  }, [activeTab]);

  const fetchRegistrations = async () => {
    setLoadingRegs(true);
    try {
      const res = await originalFetch(`${API_BASE}/superadmin/registrations`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        cache: 'no-store'
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setRegistrations(data);
        if (data.some(r => r.status === 'pending')) {
          setShowPendingAlert(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch registrations:', err);
    } finally {
      setLoadingRegs(false);
    }
  };"""

original_fetch_block = """useEffect(() => {
    if (activeTab === 'registrations') {
      fetchRegistrations();
    }
  }, [activeTab]);

  const fetchRegistrations = async () => {
    setLoadingRegs(true);
    try {
      const res = await originalFetch(`${API_BASE}/superadmin/registrations`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        cache: 'no-store'
      });
      const data = await res.json();
      if (Array.isArray(data)) setRegistrations(data);
    } catch (err) {
      console.error('Failed to fetch registrations:', err);
    } finally {
      setLoadingRegs(false);
    }
  };"""
content = content.replace(original_fetch_block, fetch_replacement)

# 3. Update submitReview to send customPassword
submit_replacement = "body: JSON.stringify({ action: reviewAction, admin_notes: adminNotes, custom_password: customPassword })"
content = content.replace("body: JSON.stringify({ action: reviewAction, admin_notes: adminNotes })", submit_replacement)

submit_reset_replacement = "setShowReviewModal(false);\n      setAdminNotes('');\n      setCustomPassword('');"
content = content.replace("setShowReviewModal(false);\n      setAdminNotes('');", submit_reset_replacement)

# 4. Add the custom password field to the review modal
modal_replacement = """{reviewAction === 'approve' && (
                <div style={saStyles.formGroup}>
                  <label style={saStyles.formLabel}>Assign Password</label>
                  <input
                    type="text"
                    style={saStyles.formInput}
                    value={customPassword}
                    onChange={e => setCustomPassword(e.target.value)}
                    placeholder="Enter password to assign (or leave empty to auto-generate)"
                    onFocus={e => { e.target.style.borderColor = '#8b5cf6'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  />
                </div>
              )}
              <div style={saStyles.formGroup}>
                <label style={saStyles.formLabel}>Admin Notes (optional)</label>"""
content = content.replace("<div style={saStyles.formGroup}>\n                <label style={saStyles.formLabel}>Admin Notes (optional)</label>", modal_replacement)


# 5. Add the Pending Alert Modal popup
alert_modal = """
      {/* 🚀 NEW CLIENT NOTIFICATION POPUP */}
      {showPendingAlert && (
        <div style={saStyles.overlay} onClick={(e) => { if (e.target === e.currentTarget) setShowPendingAlert(false); }}>
          <div style={{...saStyles.modal, maxWidth: '420px', textAlign: 'center'}}>
            <div style={{fontSize: '3rem', marginBottom: '16px'}}>🔔</div>
            <h2 style={{...saStyles.modalTitle, justifyContent: 'center', marginBottom: '16px'}}>New Clients Registered!</h2>
            <p style={{color: '#cbd5e1', marginBottom: '24px', lineHeight: '1.5'}}>
              You have {registrations.filter(r => r.status === 'pending').length} new registration request(s) waiting for your approval.
            </p>
            <div style={{display: 'flex', gap: '16px', justifyContent: 'center'}}>
              <button style={saStyles.cancelBtn} onClick={() => setShowPendingAlert(false)}>Dismiss</button>
              <button style={saStyles.saveBtn} onClick={() => { setActiveTab('registrations'); setShowPendingAlert(false); }}>Go to Registrations</button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 REVIEW REGISTRATION MODAL 🟢 */}
      {showReviewModal && ("""
content = content.replace("{/* 🟢 REVIEW REGISTRATION MODAL 🟢 */}\n      {showReviewModal && (", alert_modal)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("frontend/src/App.jsx updated.")
