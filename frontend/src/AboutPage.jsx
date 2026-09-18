import React from 'react';
import Navbar from './Navbar.jsx';

export default function AboutPage() {
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

        /* Hero */
        .hero {
          position: relative; padding: 180px 5% 120px; text-align: center;
          background: linear-gradient(180deg, rgba(3,3,3,0.6) 0%, rgba(3,3,3,0.9) 70%, rgba(3,3,3,1) 100%), url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1920&q=80') center/cover no-repeat;
        }
        .hero h1 { font-size: clamp(3rem, 6vw, 4.5rem); font-weight: 800; margin-bottom: 24px; line-height: 1.1; }
        .hero p { font-size: 1.25rem; color: #94a3b8; max-width: 700px; margin: 0 auto; line-height: 1.6; }

        /* Story Section */
        .story-section { padding: 100px 5%; max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px; }
        .story-block { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 60px; text-align: left; position: relative; overflow: hidden; }
        .story-block::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #4f46e5; border-radius: 4px 0 0 4px; }
        .story-block h2 { font-size: 2rem; margin-bottom: 20px; font-weight: 700; }
        .story-block p { font-size: 1.1rem; color: #94a3b8; line-height: 1.8; margin-bottom: 20px; }
        .story-block p:last-child { margin-bottom: 0; }

        /* Team Section */
        .team-section { padding: 120px 5%; max-width: 1200px; margin: 0 auto; text-align: center; }
        .team-title { font-size: 2.5rem; font-weight: 800; margin-bottom: 60px; }
        .team-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 32px; }
        .team-card { background: transparent; transition: transform 0.3s; }
        .team-card:hover { transform: translateY(-8px); }
        .avatar-container { position: relative; width: 140px; height: 140px; margin: 0 auto 24px; border-radius: 50%; padding: 4px; background: linear-gradient(135deg, rgba(79,70,229,0.5), rgba(0,0,0,0)); }
        .avatar { width: 100%; height: 100%; border-radius: 50%; background: #111; display: flex; align-items: center; justify-content: center; font-size: 3rem; color: #818cf8; overflow: hidden; border: 4px solid #030303; }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }
        .team-card h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 8px; color: #f8fafc; }
        .team-card p { font-size: 0.95rem; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }

        /* Values Grid */
        .values-section { padding: 100px 5%; max-width: 1200px; margin: 0 auto 100px; border-top: 1px solid rgba(255,255,255,0.05); }
        .values-header { text-align: center; margin-bottom: 60px; }
        .values-header h2 { font-size: 2.5rem; font-weight: 800; }
        .values-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 32px; }
        .value-card { padding: 40px; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; }
        .value-icon { font-size: 2rem; margin-bottom: 20px; color: #818cf8; }
        .value-card h3 { font-size: 1.3rem; font-weight: 700; margin-bottom: 12px; }
        .value-card p { color: #94a3b8; line-height: 1.6; }

        /* Footer */
        .footer { padding: 40px 5%; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; color: #64748b; }
        .footer-links a { color: #64748b; text-decoration: none; margin-left: 24px; transition: color 0.2s; }
        .footer-links a:hover { color: #e2e8f0; }
      `}</style>
      <Navbar />

      <section className="hero">
        <h1>Building the operating system <br/><span className="text-gradient">for modern food courts</span></h1>
        <p>We are a team of engineers and operations experts dedicated to solving the complex fragmentation of multi-vendor dining experiences.</p>
      </section>

      <section className="story-section">
        <div className="story-block">
          <h2>The Problem</h2>
          <p>Before FC-ERP, food court operators were forced to stitch together a patchwork of disconnected systems. The cashier used one POS software, individual vendors used another, and settlement was done manually using error-prone spreadsheets at the end of the day.</p>
          <p>Inventory counts were inaccurate, staff payroll was chaotic, and customer experience suffered from disjointed ordering processes.</p>
        </div>
        <div className="story-block" style={{'::before': {background: '#10b981'}}}>
          <h2>Our Solution</h2>
          <p>We engineered FC-ERP from the ground up as a fully integrated, multi-tenant architecture. Our platform allows a central management layer to seamlessly govern POS operations, vendor payouts, inventory transfers, and kitchen displays in real-time.</p>
          <p>Today, FC-ERP powers over 50+ enterprise food courts, processing millions of transactions reliably with zero downtime.</p>
        </div>
      </section>

      <section className="team-section">
        <h2 className="team-title">Our Leadership</h2>
        <div className="team-grid">
          <div className="team-card">
            <div className="avatar-container"><div className="avatar">👨‍💼</div></div>
            <h3>Alex Sharma</h3>
            <p>Chief Executive Officer</p>
          </div>
          <div className="team-card">
            <div className="avatar-container"><div className="avatar">👩‍💻</div></div>
            <h3>Priya Patel</h3>
            <p>Chief Technology Officer</p>
          </div>
          <div className="team-card">
            <div className="avatar-container"><div className="avatar">👨‍🎨</div></div>
            <h3>Ravi Kumar</h3>
            <p>Head of Product</p>
          </div>
          <div className="team-card">
            <div className="avatar-container"><div className="avatar">👩‍💼</div></div>
            <h3>Maya Lee</h3>
            <p>VP of Operations</p>
          </div>
        </div>
      </section>

      <section className="values-section">
        <div className="values-header">
          <h2>Engineering Principles</h2>
        </div>
        <div className="values-grid">
          <div className="value-card">
            <div className="value-icon">⚡</div>
            <h3>Speed as a Feature</h3>
            <p>During peak lunch hours, every millisecond counts. We optimize our databases and edge network to ensure POS interactions happen instantaneously.</p>
          </div>
          <div className="value-card">
            <div className="value-icon">🔒</div>
            <h3>Bulletproof Security</h3>
            <p>With millions of financial transactions routing through our settlement engine, we enforce strict role-based access, encryption, and automated audit trails.</p>
          </div>
          <div className="value-card">
            <div className="value-icon">🤝</div>
            <h3>Transparent Payouts</h3>
            <p>We believe vendors shouldn't have to wait to see what they earned. Our real-time settlement engine calculates deductions and payouts perfectly.</p>
          </div>
        </div>
      </section>

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
