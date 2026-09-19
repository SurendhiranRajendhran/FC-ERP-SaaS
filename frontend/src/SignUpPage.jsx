// Clean SignUpPage component
import React, { useState } from 'react';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    foodCourtName: '',
    ownerName: '',
    email: '',
    phone: '',
    city: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const theme = {
    bg: '#0a0a0f',
    card: '#111118',
    cardBorder: '#1e0e2e',
    textPrimary: '#e2e8f0',
    textSecondary: '#94a3b8',
    accent: '#8b5cf6',
    accentHover: '#7c3aed',
    inputBg: '#1a1a2e',
    inputBorder: '#2d2d44',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
    error: '#ef4444'
  };
  const styles = {
    container: { backgroundColor: theme.bg, color: theme.textPrimary, fontFamily: 'system-ui, -apple-system, sans-serif', height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '80px', paddingBottom: '40px' },
    header: { position: 'absolute', top: '20px', left: '20px' },
    backLink: { color: theme.textSecondary, textDecoration: 'none', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' },
    card: { background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '500px', boxSizing: 'border-box' },
    logo: { fontSize: '2rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '8px' },
    subtitle: { color: theme.textSecondary, textAlign: 'center', marginBottom: '32px', fontSize: '1.1rem' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' },
    input: { background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.textPrimary, borderRadius: '8px', padding: '12px', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', width: '100%', boxSizing: 'border-box' },
    textarea: { background: theme.inputBg, border: `1px solid ${theme.inputBorder}`, color: theme.textPrimary, borderRadius: '8px', padding: '12px', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s', width: '100%', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box' },
    submitBtn: { background: theme.gradient, color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', width: '100%', transition: 'opacity 0.2s' },
    errorMsg: { color: theme.error, marginTop: '16px', textAlign: 'center', fontSize: '0.9rem' },
    successPanel: { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' },
    successIcon: { fontSize: '4rem', marginBottom: '10px' },
    successTitle: { fontSize: '1.8rem', fontWeight: 'bold', margin: 0 },
    successDesc: { color: theme.textSecondary, lineHeight: '1.6', marginBottom: '20px' },
    homeBtn: { background: theme.cardBorder, color: theme.textPrimary, border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_court_name: formData.foodCourtName,
          owner_name: formData.ownerName,
          email: formData.email,
          phone: formData.phone,
          city: formData.city,
          message: formData.message
        })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Failed to submit registration. Please try again.');
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.backLink} onClick={() => window.location.href = '/'}>← Back to Home</span>
      </div>
      <div style={styles.card}>
        {!success ? (
          <>
            <div style={styles.logo}>🍽️ FC-ERP</div>
            <div style={styles.subtitle}>Register your Food Court</div>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <input style={styles.input} type="text" name="foodCourtName" placeholder="Food Court Name" required value={formData.foodCourtName} onChange={handleChange} onFocus={e => e.target.style.borderColor = theme.accent} onBlur={e => e.target.style.borderColor = theme.inputBorder} />
                <input style={styles.input} type="text" name="ownerName" placeholder="Owner Name" required value={formData.ownerName} onChange={handleChange} onFocus={e => e.target.style.borderColor = theme.accent} onBlur={e => e.target.style.borderColor = theme.inputBorder} />
                <input style={styles.input} type="email" name="email" placeholder="Email Address" required value={formData.email} onChange={handleChange} onFocus={e => e.target.style.borderColor = theme.accent} onBlur={e => e.target.style.borderColor = theme.inputBorder} />
                <input style={styles.input} type="tel" name="phone" placeholder="Phone Number" required value={formData.phone} onChange={handleChange} onFocus={e => e.target.style.borderColor = theme.accent} onBlur={e => e.target.style.borderColor = theme.inputBorder} />
                <input style={styles.input} type="text" name="city" placeholder="City" required value={formData.city} onChange={handleChange} onFocus={e => e.target.style.borderColor = theme.accent} onBlur={e => e.target.style.borderColor = theme.inputBorder} />
                <textarea style={styles.textarea} name="message" placeholder="Message / Additional Info (Optional)" value={formData.message} onChange={handleChange} onFocus={e => e.target.style.borderColor = theme.accent} onBlur={e => e.target.style.borderColor = theme.inputBorder} />
              </div>
              <button type="submit" style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }} disabled={loading}>{loading ? 'Submitting...' : 'Register'}</button>
              {error && <div style={styles.errorMsg}>{error}</div>}
            </form>
          </>
        ) : (
          <div style={styles.successPanel}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={styles.successTitle}>Registration Submitted!</h2>
            <p style={styles.successDesc}>Your profile is under admin review. If approved or rejected, you will be notified via email at <b>{formData.email}</b>.</p>
            <button style={styles.homeBtn} onClick={() => window.location.href = '/'}>Back to Home</button>
          </div>
        )}
      </div>
    </div>
  );
}
