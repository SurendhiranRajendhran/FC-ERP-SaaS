import React from 'react';
import Navbar from './Navbar.jsx';

export default function HomePage() {
  return (
    <div className="page-wrapper">
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .page-wrapper { height: 100vh; overflow-y: auto; background-color: #030303; color: #f8fafc; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        
        /* Typography */
        h1, h2, h3, h4 { letter-spacing: -0.02em; }
        .text-gradient {
          background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        /* Hero Section */
        .hero {
          position: relative;
          padding: 160px 5% 100px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 90vh;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(3,3,3,0.6) 0%, rgba(3,3,3,0.9) 70%, rgba(3,3,3,1) 100%), url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1920&q=80') center/cover no-repeat;
        }
        .hero::before {
          content: '';
          position: absolute;
          top: -20%; left: 50%; transform: translateX(-50%);
          width: 800px; height: 600px;
          background: radial-gradient(circle, rgba(79,70,229,0.15) 0%, rgba(0,0,0,0) 70%);
          z-index: 0; pointer-events: none;
        }
        .hero-content {
          position: relative; z-index: 1; max-width: 900px;
        }
        .badge {
          display: inline-block; padding: 6px 16px; border-radius: 50px;
          background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2);
          color: #818cf8; font-size: 0.85rem; font-weight: 600; margin-bottom: 24px;
        }
        .hero h1 { font-size: clamp(3rem, 7vw, 5rem); font-weight: 800; line-height: 1.1; margin-bottom: 24px; }
        .hero p { font-size: clamp(1.1rem, 2vw, 1.3rem); color: #94a3b8; line-height: 1.6; max-width: 700px; margin: 0 auto 40px; }
        
        /* Buttons */
        .btn-group { display: flex; gap: 16px; justify-content: center; }
        .btn { padding: 14px 28px; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-primary { background: #4f46e5; color: #fff; border: 1px solid #4f46e5; box-shadow: 0 4px 14px rgba(79,70,229,0.3); }
        .btn-primary:hover { background: #4338ca; transform: translateY(-2px); }
        .btn-outline { background: transparent; color: #f8fafc; border: 1px solid rgba(255,255,255,0.2); }
        .btn-outline:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.3); transform: translateY(-2px); }

        /* Dashboard Preview */
        .dashboard-preview {
          margin-top: 60px; position: relative; z-index: 1;
          border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
          overflow: hidden; max-width: 1000px; margin-left: auto; margin-right: auto;
        }
        .dashboard-preview img { width: 100%; display: block; }
        .dashboard-preview::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(3,3,3,0) 60%, rgba(3,3,3,1) 100%);
        }

        /* Logos Section */
        .logos-section { padding: 40px 5%; border-bottom: 1px solid rgba(255,255,255,0.05); text-align: center; }
        .logos-title { font-size: 0.9rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 24px; font-weight: 600; }
        .logos-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 40px; opacity: 0.6; filter: grayscale(100%); }
        .logos-grid span { font-size: 1.5rem; font-weight: 700; display: flex; align-items: center; gap: 8px; color: #cbd5e1; }

        /* Features Section */
        .section { padding: 120px 5%; max-width: 1200px; margin: 0 auto; }
        .section-header { text-align: center; margin-bottom: 64px; }
        .section-label { color: #818cf8; font-weight: 600; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
        .section-title { font-size: clamp(2rem, 4vw, 3rem); font-weight: 800; margin-bottom: 20px; }
        .section-desc { font-size: 1.15rem; color: #94a3b8; max-width: 600px; margin: 0 auto; line-height: 1.6; }

        /* Feature Bento Grid */
        .bento-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px; }
        .bento-card {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px; padding: 40px; transition: transform 0.3s, background 0.3s;
          position: relative; overflow: hidden;
        }
        .bento-card:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.15); transform: translateY(-4px); }
        .bento-large { grid-column: span 8; }
        .bento-small { grid-column: span 4; }
        @media (max-width: 900px) { .bento-large, .bento-small { grid-column: span 12; } }
        
        .bento-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 24px; }
        .bento-card h3 { font-size: 1.4rem; font-weight: 700; margin-bottom: 12px; color: #f8fafc; }
        .bento-card p { font-size: 1rem; color: #94a3b8; line-height: 1.6; }

        /* Stats */
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 60px 5%; margin: 60px 0; background: rgba(255,255,255,0.01); }
        .stat-item { text-align: center; }
        .stat-num { font-size: 3rem; font-weight: 800; color: #f8fafc; margin-bottom: 8px; }
        .stat-label { font-size: 0.9rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
        @media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 40px; } }

        /* CTA Section */
        .cta-section {
          margin: 100px 5%; border-radius: 24px; padding: 80px 40px;
          background: linear-gradient(135deg, rgba(79,70,229,0.2) 0%, rgba(0,0,0,0) 100%), #0a0a0f;
          border: 1px solid rgba(79,70,229,0.3); text-align: center;
        }
        .cta-section h2 { font-size: 2.5rem; font-weight: 800; margin-bottom: 20px; }
        .cta-section p { font-size: 1.15rem; color: #94a3b8; max-width: 500px; margin: 0 auto 40px; }

        /* Footer */
        .footer { padding: 40px 5%; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; color: #64748b; }
        .footer-links a { color: #64748b; text-decoration: none; margin-left: 24px; transition: color 0.2s; }
        .footer-links a:hover { color: #e2e8f0; }
      `}</style>
      <Navbar />
      
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="badge">✨ FC-ERP 2.0 is now live</div>
          <h1>The Enterprise OS for <br/><span className="text-gradient">Modern Food Courts</span></h1>
          <p>Unify your point-of-sale, kitchen displays, inventory, and vendor settlements into a single, highly scalable cloud platform engineered for speed and reliability.</p>
          <div className="btn-group">
            <a href="/signup" className="btn btn-primary">Start Free Trial</a>
            <a href="/about" className="btn btn-outline">Explore Platform</a>
          </div>
        </div>
        
        <div className="dashboard-preview">
          <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80" alt="Dashboard Preview" />
        </div>
      </section>

      {/* Trusted By */}
      <section className="logos-section">
        <div className="logos-title">Trusted by top food courts nationwide</div>
        <div className="logos-grid">
          <span>🏛️ MetroBites</span>
          <span>🍔 UrbanEats</span>
          <span>🍕 Central Plaza</span>
          <span>🍲 FoodHub Co.</span>
          <span>☕ The Gallery</span>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="section">
        <div className="section-header">
          <div className="section-label">Platform Capabilities</div>
          <h2 className="section-title">Everything you need, built in.</h2>
          <p className="section-desc">Replace your fragmented systems with a unified architecture designed specifically for multi-vendor food courts.</p>
        </div>

        <div className="bento-grid">
          {/* Feature 1 (Large) */}
          <div className="bento-card bento-large">
            <div className="bento-icon" style={{background: 'rgba(79,70,229,0.1)', color: '#818cf8'}}>💻</div>
            <h3>Unified Multi-Stall POS</h3>
            <p>A single cashier can handle orders for multiple vendors seamlessly. The system automatically splits the bill, routes the KOTs to specific kitchens, and accurately calculates the central cash flow and vendor settlements without manual intervention.</p>
            <div style={{marginTop: '30px', height: '120px', borderRadius: '12px', background: 'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.05))', border: '1px dashed rgba(255,255,255,0.1)'}}></div>
          </div>

          {/* Feature 2 (Small) */}
          <div className="bento-card bento-small">
            <div className="bento-icon" style={{background: 'rgba(16,185,129,0.1)', color: '#34d399'}}>📊</div>
            <h3>Real-Time Settlements</h3>
            <p>End-of-day reconciliation is instantly calculated, displaying exact vendor payouts, platform commissions, and tax deductions in real-time.</p>
          </div>

          {/* Feature 3 (Small) */}
          <div className="bento-card bento-small">
            <div className="bento-icon" style={{background: 'rgba(245,158,11,0.1)', color: '#fbbf24'}}>🔥</div>
            <h3>Smart Kitchen Display</h3>
            <p>Industry-standard KDS. Each vendor sees only their assigned items, while the central expo screen tracks overall order fulfillment.</p>
          </div>

          {/* Feature 4 (Large) */}
          <div className="bento-card bento-large">
            <div className="bento-icon" style={{background: 'rgba(236,72,153,0.1)', color: '#f472b6'}}>📱</div>
            <h3>Customer Self-Ordering & Wallets</h3>
            <p>Eliminate long cashier queues. Customers can scan QR codes at tables to place orders, or use RFID-based prepaid meal cards for instant transactions. Build loyalty with built-in CRM tools, cashback offers, and automated WhatsApp receipts.</p>
          </div>
        </div>
      </section>

      {/* Enterprise Stats */}
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-num">99.99%</div>
          <div className="stat-label">System Uptime</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">50M+</div>
          <div className="stat-label">Orders Processed</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">&lt;200ms</div>
          <div className="stat-label">Average API Latency</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">24/7</div>
          <div className="stat-label">Enterprise Support</div>
        </div>
      </div>

      {/* Deep Dive Section */}
      <section className="section" style={{paddingTop: '60px'}}>
        <div className="section-header">
          <div className="section-label">Infrastructure</div>
          <h2 className="section-title">Engineered for Scale</h2>
          <p className="section-desc">Designed to support multi-location franchises, thousands of concurrent transactions, and complex organizational structures.</p>
        </div>
        <div className="bento-grid">
           <div className="bento-card bento-small">
            <h3 style={{fontSize:'1.2rem'}}>Inventory & Supply Chain</h3>
            <p style={{fontSize:'0.9rem', marginTop:'10px'}}>Track raw materials per vendor. Set low-stock alerts, manage inter-stall transfers, and auto-deduct stock based on recipe formulations.</p>
          </div>
          <div className="bento-card bento-small">
            <h3 style={{fontSize:'1.2rem'}}>HR & Payroll System</h3>
            <p style={{fontSize:'0.9rem', marginTop:'10px'}}>Manage staff attendance, shifts, leave balances, PF/ESI deductions, and calculate accurate monthly or daily wages automatically.</p>
          </div>
          <div className="bento-card bento-small">
            <h3 style={{fontSize:'1.2rem'}}>Role-Based Access</h3>
            <p style={{fontSize:'0.9rem', marginTop:'10px'}}>Strict permission controls for Super Admins, Stall Managers, Cashiers, and Kitchen Staff. Secure every action with granular audit logs.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2>Ready to upgrade your infrastructure?</h2>
        <p>Join the fastest-growing food courts utilizing FC-ERP to scale their operations globally.</p>
        <div className="btn-group">
          <a href="/signup" className="btn btn-primary" style={{padding: '16px 36px', fontSize: '1.1rem'}}>Deploy FC-ERP Now</a>
          <a href="/contact" className="btn btn-outline" style={{padding: '16px 36px', fontSize: '1.1rem'}}>Talk to Sales</a>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div>&copy; 2026 FC-ERP Inc. All rights reserved.</div>
        <div className="footer-links">
          <a href="#">Security</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}
