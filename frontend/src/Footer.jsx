import React from 'react';

export default function Footer() {
  const scrollTo = (id) => {
    if (window.location.pathname !== '/') {
      window.location.href = `/#${id}`;
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="fc-footer">
      <style>{`
        .fc-footer {
          background: #020617;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          font-family: 'Outfit', system-ui, -apple-system, sans-serif;
          position: relative;
          overflow: hidden;
        }
        .fc-footer::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.5), transparent);
        }
        .fc-footer-inner {
          max-width: 1240px;
          margin: 0 auto;
          padding: 70px 24px 40px;
        }
        .fc-footer-grid {
          display: grid;
          grid-template-columns: 2fr 1.2fr 1.2fr 1fr 1.4fr;
          gap: 40px;
          margin-bottom: 50px;
        }
        @media (max-width: 1024px) {
          .fc-footer-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 36px;
          }
        }
        @media (max-width: 640px) {
          .fc-footer-grid {
            grid-template-columns: 1fr;
            gap: 32px;
          }
        }
        .fc-footer-brand h3 {
          color: #f8fafc;
          font-size: 1.5rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .fc-footer-brand-badge {
          background: #4f46e5;
          color: #ffffff;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
        }
        .fc-footer-desc {
          font-size: 0.92rem;
          line-height: 1.65;
          color: #94a3b8;
          margin-bottom: 18px;
        }
        .fc-footer-corporate {
          display: inline-flex;
          flex-direction: column;
          gap: 4px;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 10px;
          font-size: 0.8rem;
        }
        .fc-footer-corp-title {
          font-weight: 700;
          color: #cbd5e1;
          letter-spacing: 0.02em;
        }
        .fc-footer-corp-sub {
          color: #64748b;
          font-size: 0.75rem;
        }
        .fc-footer-col h4 {
          color: #f8fafc;
          font-size: 0.95rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 18px;
        }
        .fc-footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 11px;
        }
        .fc-footer-links li a, .fc-footer-links li button {
          background: transparent;
          border: none;
          padding: 0;
          color: #94a3b8;
          font-size: 0.9rem;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          font-family: inherit;
        }
        .fc-footer-links li a:hover, .fc-footer-links li button:hover {
          color: #f8fafc;
          padding-left: 4px;
        }
        .fc-footer-contact-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.88rem;
          line-height: 1.5;
          margin-bottom: 12px;
          color: #94a3b8;
        }
        .fc-footer-contact-item span {
          color: #818cf8;
          font-size: 1rem;
        }
        .fc-footer-bottom {
          padding-top: 28px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 0.85rem;
        }
        .fc-footer-status {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #10b981;
          font-weight: 500;
          font-size: 0.82rem;
        }
        .fc-footer-status-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 10px #10b981;
          animation: fcPulse 2s infinite;
        }
        @keyframes fcPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        .fc-footer-legal {
          display: flex;
          gap: 20px;
        }
        .fc-footer-legal a {
          color: #64748b;
          text-decoration: none;
          transition: color 0.2s;
        }
        .fc-footer-legal a:hover {
          color: #cbd5e1;
        }
      `}</style>

      <div className="fc-footer-inner">
        <div className="fc-footer-grid">
          {/* Brand Col */}
          <div className="fc-footer-brand">
            <h3>
              <img src="/favicon.svg" alt="FC-ERP" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain' }} />
              <span>FC-ERP</span>
              <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>v1.1.4</span>
            </h3>
            <p className="fc-footer-desc">
              Next-generation enterprise operating system powering multi-vendor food courts, institutional canteens, and commercial kitchens with unified POS, real-time KDS, automated vendor settlements, and smart RFID dining wallets.
            </p>
            <div className="fc-footer-corporate">
              <span className="fc-footer-corp-title">RAD Infotech</span>
              <span className="fc-footer-corp-sub">Enterprise Cloud &amp; Automation Division</span>
            </div>
          </div>

          {/* Platform Modules */}
          <div className="fc-footer-col">
            <h4>Platform Modules</h4>
            <ul className="fc-footer-links">
              <li><button onClick={() => scrollTo('features')}>Multi-Stall POS</button></li>
              <li><button onClick={() => scrollTo('features')}>Kitchen Display (KDS)</button></li>
              <li><button onClick={() => scrollTo('features')}>QR Self-Ordering</button></li>
              <li><button onClick={() => scrollTo('features')}>RFID Meal Wallets</button></li>
              <li><button onClick={() => scrollTo('features')}>Vendor Settlements</button></li>
              <li><button onClick={() => scrollTo('features')}>Stock & Recipe BOM</button></li>
            </ul>
          </div>

          {/* Pricing Tiers */}
          <div className="fc-footer-col">
            <h4>Plan Editions</h4>
            <ul className="fc-footer-links">
              <li><a href="/signup?plan=Canteen+Basic">Canteen Basic (₹12K/yr)</a></li>
              <li><a href="/signup?plan=Canteen+Pro">Canteen Pro (₹20K/yr)</a></li>
              <li><a href="/signup?plan=Food+Court">Food Court Suite (₹40K/yr)</a></li>
              <li><a href="/signup?plan=Enterprise">Enterprise Suite (Custom)</a></li>
              <li><button onClick={() => scrollTo('pricing')}>Compare Entitlements</button></li>
            </ul>
          </div>

          {/* Navigation */}
          <div className="fc-footer-col">
            <h4>Navigation</h4>
            <ul className="fc-footer-links">
              <li><button onClick={() => scrollTo('overview')}>Overview</button></li>
              <li><button onClick={() => scrollTo('features')}>Features</button></li>
              <li><button onClick={() => scrollTo('pricing')}>Pricing</button></li>
              <li><button onClick={() => scrollTo('pwa')}>Mobile PWA</button></li>
              <li><button onClick={() => scrollTo('faq')}>FAQ & Help</button></li>
              <li><a href="/signup">Register Food Court</a></li>
            </ul>
          </div>

          {/* Corporate Contact */}
          <div className="fc-footer-col">
            <h4>Corporate Desk</h4>
            <div className="fc-footer-contact-item">
              <span>📍</span>
              <div>
                <strong>RAD Infotech</strong>
                <div>Coimbatore, Tamil Nadu, India</div>
              </div>
            </div>
            <div className="fc-footer-contact-item">
              <span>✉️</span>
              <div>
                <div>info@radinfotec.com</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Technical &amp; Sales Desk</div>
              </div>
            </div>
            <div className="fc-footer-contact-item">
              <span>📞</span>
              <div>
                <div>+91 9894779442</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Mon-Sat 9AM-7PM IST</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="fc-footer-bottom">
          <div>
            &copy; 2026 <strong>RAD Infotech</strong>. All rights reserved.
          </div>
          <div className="fc-footer-status">
            <span className="fc-footer-status-dot"></span>
            Cloud Services Operational &amp; Highly Available
          </div>
          <div className="fc-footer-legal">
            <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('Privacy Policy: All food court and vendor financial records are strictly isolated and encrypted under tenant partitions.'); }}>Privacy Policy</a>
            <a href="#terms" onClick={(e) => { e.preventDefault(); alert('Terms of Service: Standard SaaS license governing uptime SLA, backup redundancy, and role-based data governance.'); }}>Terms of Service</a>
            <a href="#security" onClick={(e) => { e.preventDefault(); alert('Security: Hardened AES-256 encrypted operational storage with isolated multi-tenant query rewriting.'); }}>Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
