import React from 'react';

export default function Navbar() {
  const currentPath = window.location.pathname;

  return (
    <>
      <style>{`
        .lp-nav {
          position: fixed; top: 0; width: 100%; height: 80px; z-index: 1000;
          display: flex; justify-content: space-between; align-items: center;
          padding: 0 5%; background: rgba(3, 3, 3, 0.7);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .lp-nav-logo {
          font-size: 1.5rem; font-weight: 800; color: #f8fafc;
          text-decoration: none; display: flex; align-items: center; gap: 10px;
          letter-spacing: -0.02em;
        }
        .lp-nav-logo span { 
          color: #fff; background: #4f46e5; width: 32px; height: 32px; 
          display: flex; align-items: center; justify-content: center; 
          border-radius: 8px; font-size: 1.2rem;
        }
        .lp-nav-links { display: flex; gap: 32px; align-items: center; }
        .lp-nav-link {
          color: #94a3b8; text-decoration: none; font-size: 0.95rem; font-weight: 500;
          transition: color 0.2s; position: relative; padding: 8px 0;
        }
        .lp-nav-link:hover, .lp-nav-link.active { color: #f8fafc; }
        .lp-nav-link.active::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0;
          height: 2px; background: #4f46e5; border-radius: 2px;
        }
        .lp-nav-actions { display: flex; gap: 16px; align-items: center; }
        .lp-btn-ghost {
          background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #f8fafc;
          padding: 10px 20px; border-radius: 8px; font-size: 0.9rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .lp-btn-ghost:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2); }
        .lp-btn-solid {
          background: #f8fafc; border: none; color: #030303;
          padding: 10px 24px; border-radius: 8px; font-size: 0.9rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .lp-btn-solid:hover { background: #e2e8f0; transform: translateY(-1px); }
        @media (max-width: 768px) {
          .lp-nav-links { display: none; }
          .lp-nav-actions { gap: 8px; }
          .lp-btn-ghost, .lp-btn-solid { padding: 8px 16px; font-size: 0.85rem; }
        }
      `}</style>
      <nav className="lp-nav">
        <a href="/" className="lp-nav-logo">
          <span>❖</span> FC-ERP
        </a>
        <div className="lp-nav-links">
          <a href="/" className={`lp-nav-link ${currentPath === '/' ? 'active' : ''}`}>Platform</a>
          <a href="/about" className={`lp-nav-link ${currentPath === '/about' ? 'active' : ''}`}>Company</a>
          <a href="/contact" className={`lp-nav-link ${currentPath === '/contact' ? 'active' : ''}`}>Contact Sales</a>
        </div>
        <div className="lp-nav-actions">
          <button className="lp-btn-ghost" onClick={() => window.location.href = '/app'}>Sign In</button>
          <button className="lp-btn-solid" onClick={() => window.location.href = '/signup'}>Start Free Trial</button>
        </div>
      </nav>
    </>
  );
}
