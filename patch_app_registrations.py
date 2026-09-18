import re

file_path = r'c:\Users\surendhiran.R\Desktop\ERP\frontend\src\App.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add activeTab state to SuperAdminDashboard
# Find: const [adding, setAdding] = useState(false);
active_tab_state = """
  // Tabs
  const [activeTab, setActiveTab] = useState('foodCourts');

  // Registrations state
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState(null); // 'approve' or 'reject'
  const [reviewingRegId, setReviewingRegId] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (activeTab === 'registrations') {
      fetchRegistrations();
    }
  }, [activeTab]);

  const fetchRegistrations = async () => {
    setLoadingRegs(true);
    try {
      const res = await originalFetch(`${API_BASE}/superadmin/registrations`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setRegistrations(data);
    } catch (err) {
      console.error('Failed to fetch registrations:', err);
    } finally {
      setLoadingRegs(false);
    }
  };

  const submitReview = async () => {
    setSubmittingReview(true);
    try {
      const res = await originalFetch(`${API_BASE}/superadmin/registrations/${reviewingRegId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action: reviewAction, admin_notes: adminNotes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to review registration');
      
      alert(data.message);
      setShowReviewModal(false);
      setAdminNotes('');
      fetchRegistrations();
      if (reviewAction === 'approve') fetchTenants();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };
"""

content = content.replace(
    "const [adding, setAdding] = useState(false);",
    "const [adding, setAdding] = useState(false);\n" + active_tab_state
)

# 2. Update Sidebar Navigation
old_nav = """
        <ul style={saStyles.navList}>
          <li style={saStyles.navItem(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><path d="M3 9h18M9 21V9" />
            </svg>
            Food Courts
          </li>
          <li style={saStyles.navItem(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M12 20v-6M6 20V10M18 20V4" />
            </svg>
            Analytics (Soon)
          </li>
        </ul>
"""

new_nav = """
        <ul style={saStyles.navList}>
          <li style={saStyles.navItem(activeTab === 'foodCourts')} onClick={() => setActiveTab('foodCourts')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><path d="M3 9h18M9 21V9" />
            </svg>
            Food Courts
          </li>
          <li style={saStyles.navItem(activeTab === 'registrations')} onClick={() => setActiveTab('registrations')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            Registrations
            {registrations.filter(r => r.status === 'pending').length > 0 && (
              <span style={{ marginLeft: 'auto', background: '#eab308', color: '#000', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600 }}>
                {registrations.filter(r => r.status === 'pending').length}
              </span>
            )}
          </li>
          <li style={saStyles.navItem(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M12 20v-6M6 20V10M18 20V4" />
            </svg>
            Analytics (Soon)
          </li>
        </ul>
"""
content = content.replace(old_nav.strip(), new_nav.strip())

# 3. Main Content rendering conditionally
# Wrap the existing main content in activeTab === 'foodCourts'
old_main = """
        {/* Header */}
        <header style={saStyles.header}>
"""

new_main = """
        {activeTab === 'foodCourts' && (
          <>
        {/* Header */}
        <header style={saStyles.header}>
"""
content = content.replace(old_main.strip(), new_main.strip())

old_footer_modal = """
      </main>

      {/* Add Modal */}
"""
new_footer_modal = """
          </>
        )}

        {activeTab === 'registrations' && (
          <>
            <header style={saStyles.header}>
              <div>
                <h1 style={saStyles.pageTitle}>Client Registrations</h1>
                <p style={saStyles.pageSubtitle}>Review and approve new food court sign-ups</p>
              </div>
            </header>

            <div style={saStyles.statsGrid}>
              <div style={saStyles.statCard}>
                <div style={saStyles.statHeader}>
                  <p style={saStyles.statTitle}>Pending Reviews</p>
                  <div style={{...saStyles.statIcon, background: 'rgba(234, 179, 8, 0.1)', color: '#eab308'}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                </div>
                <h3 style={saStyles.statValue}>{registrations.filter(r => r.status === 'pending').length}</h3>
              </div>
            </div>

            <div style={saStyles.contentArea}>
              <div style={saStyles.tableCard}>
                <div style={saStyles.tableHeader}>
                  <h2 style={saStyles.tableTitle}>Registration Requests</h2>
                </div>
                
                {loadingRegs ? (
                  <div style={saStyles.emptyState}>Loading registrations...</div>
                ) : registrations.length === 0 ? (
                  <div style={saStyles.emptyState}>No registrations found.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={saStyles.table}>
                      <thead>
                        <tr>
                          <th style={saStyles.th}>Date</th>
                          <th style={saStyles.th}>Client</th>
                          <th style={saStyles.th}>Food Court Name</th>
                          <th style={saStyles.th}>Contact</th>
                          <th style={saStyles.th}>Status</th>
                          <th style={saStyles.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrations.map(reg => (
                          <tr key={reg.id} style={saStyles.tr}>
                            <td style={saStyles.td}>
                              <span style={{ color: '#e2e8f0' }}>{new Date(reg.created_at).toLocaleDateString()}</span>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(reg.created_at).toLocaleTimeString()}</div>
                            </td>
                            <td style={saStyles.td}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{...saStyles.avatar, width: '32px', height: '32px', fontSize: '0.8rem'}}>
                                  {reg.owner_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{reg.owner_name}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{reg.city || '-'}</div>
                                </div>
                              </div>
                            </td>
                            <td style={saStyles.td}>
                              <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{reg.food_court_name}</div>
                            </td>
                            <td style={saStyles.td}>
                              <div style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>{reg.email}</div>
                              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{reg.phone || '-'}</div>
                            </td>
                            <td style={saStyles.td}>
                              <span style={{
                                ...saStyles.statusBadge(reg.status === 'approved'),
                                background: reg.status === 'pending' ? 'rgba(234, 179, 8, 0.1)' : reg.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                color: reg.status === 'pending' ? '#eab308' : reg.status === 'rejected' ? '#ef4444' : '#22c55e',
                              }}>
                                {reg.status.toUpperCase()}
                              </span>
                            </td>
                            <td style={saStyles.td}>
                              {reg.status === 'pending' ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={() => { setReviewingRegId(reg.id); setReviewAction('approve'); setShowReviewModal(true); }}
                                    style={{ ...saStyles.actionBtn, background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}
                                    title="Approve"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                      <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => { setReviewingRegId(reg.id); setReviewAction('reject'); setShowReviewModal(true); }}
                                    style={{ ...saStyles.actionBtn, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                                    title="Reject"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                      <line x1="18" y1="6" x2="6" y2="18"></line>
                                      <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                  </button>
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Reviewed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

      </main>

      {/* Review Modal */}
      {showReviewModal && (
        <div style={saStyles.modalOverlay}>
          <div style={saStyles.modalContent}>
            <div style={saStyles.modalHeader}>
              <h3 style={saStyles.modalTitle}>{reviewAction === 'approve' ? 'Approve Registration' : 'Reject Registration'}</h3>
              <button style={saStyles.modalClose} onClick={() => setShowReviewModal(false)}>×</button>
            </div>
            <div style={saStyles.modalBody}>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>
                {reviewAction === 'approve' 
                  ? 'This will create a new tenant and send an email with login credentials.' 
                  : 'This will reject the registration and send a notification email.'}
              </p>
              
              <div style={saStyles.formGroup}>
                <label style={saStyles.label}>Admin Notes (Optional)</label>
                <textarea
                  style={{ ...saStyles.input, minHeight: '80px', resize: 'vertical' }}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Notes sent in the email..."
                />
              </div>
            </div>
            <div style={saStyles.modalFooter}>
              <button style={saStyles.cancelBtn} onClick={() => setShowReviewModal(false)}>Cancel</button>
              <button 
                style={{
                  ...saStyles.submitBtn(submittingReview),
                  background: reviewAction === 'approve' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #ef4444, #dc2626)'
                }} 
                onClick={submitReview} 
                disabled={submittingReview}
              >
                {submittingReview ? 'Processing...' : reviewAction === 'approve' ? 'Approve & Send Email' : 'Reject & Notify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
"""
content = content.replace(old_footer_modal.strip(), new_footer_modal.strip())

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Successfully patched App.jsx with Registrations tab logic")
