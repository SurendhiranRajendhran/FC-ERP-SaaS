import React, { useState, useEffect } from 'react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      // Section spy (Only nav items: overview, pricing, faq, contact)
      const sections = ['home', 'overview', 'pricing', 'faq', 'contact'];
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom >= 120) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (sectionId) => {
    setMobileOpen(false);
    if (window.location.pathname !== '/') {
      window.location.href = `/#${sectionId}`;
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <style>{`
        .fc-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 76px;
          z-index: 1000;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 5%;
          background: ${scrolled ? 'rgba(9, 13, 22, 0.92)' : 'rgba(9, 13, 22, 0.75)'};
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, ${scrolled ? '0.08' : '0.04'});
          box-shadow: ${scrolled ? '0 10px 30px rgba(0, 0, 0, 0.5)' : 'none'};
          transition: all 0.3s ease;
          font-family: 'Outfit', system-ui, -apple-system, sans-serif;
        }
        .fc-nav-logo {
          font-size: 1.45rem;
          font-weight: 800;
          color: #f8fafc;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 10px;
          letter-spacing: -0.02em;
        }
        .fc-nav-logo-img {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          box-shadow: 0 4px 14px rgba(139, 92, 246, 0.35);
          object-fit: contain;
        }
        .fc-nav-badge {
          font-size: 0.68rem;
          background: rgba(139, 92, 246, 0.15);
          color: #c4b5fd;
          border: 1px solid rgba(139, 92, 246, 0.35);
          padding: 2px 7px;
          border-radius: 9999px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .fc-nav-links {
          display: flex;
          gap: 28px;
          align-items: center;
        }
        .fc-nav-link {
          color: #94a3b8;
          background: none;
          border: none;
          font-size: 0.94rem;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.2s;
          position: relative;
          padding: 8px 0;
          font-family: inherit;
        }
        .fc-nav-link:hover, .fc-nav-link.active {
          color: #f8fafc;
        }
        .fc-nav-link.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #8b5cf6, #6366f1);
          border-radius: 2px;
        }
        .fc-nav-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .fc-btn-signin {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #f8fafc;
          padding: 8px 20px;
          border-radius: 9999px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .fc-btn-signin:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.25);
          transform: translateY(-1px);
        }
        .fc-btn-register {
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #ffffff;
          padding: 8px 22px;
          border-radius: 9999px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
        }
        .fc-btn-register:hover {
          background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.55);
        }
        .fc-hamburger {
          display: none;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #f8fafc;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1.25rem;
          line-height: 1;
        }
        /* Mobile Drawer */
        .fc-mobile-drawer {
          display: none;
        }
        @media (max-width: 880px) {
          .fc-nav-links {
            display: none;
          }
          .fc-hamburger {
            display: block;
          }
          .fc-mobile-drawer {
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 76px;
            left: 0;
            right: 0;
            background: rgba(9, 13, 22, 0.96);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding: 24px;
            gap: 16px;
            z-index: 999;
            animation: fcDrawerSlide 0.25s ease-out forwards;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
          }
          @keyframes fcDrawerSlide {
            from {
              opacity: 0;
              transform: translateY(-15px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .fc-mobile-link {
            background: transparent;
            border: none;
            color: #cbd5e1;
            font-size: 1.05rem;
            font-weight: 600;
            padding: 12px 14px;
            border-radius: 8px;
            text-align: left;
            cursor: pointer;
            font-family: inherit;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .fc-mobile-link:hover, .fc-mobile-link.active {
            background: rgba(139, 92, 246, 0.18);
            color: #ffffff;
          }
          .fc-mobile-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 12px;
            padding-top: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
          }
          .fc-mobile-actions button {
            width: 100%;
            padding: 12px;
            font-size: 1rem;
          }
        }
      `}</style>

      <nav className="fc-nav">
        <a href="/" className="fc-nav-logo">
          <img src="/favicon.svg" alt="FC-ERP" className="fc-nav-logo-img" />
          <span>FC-ERP</span>
          <span className="fc-nav-badge">v1.1.4</span>
        </a>

        {/* Desktop Links (Overview, Pricing Plans, FAQ, Contact) */}
        <div className="fc-nav-links">
          <button
            type="button"
            className={`fc-nav-link ${activeSection === 'overview' ? 'active' : ''}`}
            onClick={() => handleNavClick('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            className={`fc-nav-link ${activeSection === 'pricing' ? 'active' : ''}`}
            onClick={() => handleNavClick('pricing')}
          >
            Pricing Plans
          </button>
          <button
            type="button"
            className={`fc-nav-link ${activeSection === 'faq' ? 'active' : ''}`}
            onClick={() => handleNavClick('faq')}
          >
            FAQ
          </button>
          <button
            type="button"
            className={`fc-nav-link ${activeSection === 'contact' ? 'active' : ''}`}
            onClick={() => handleNavClick('contact')}
          >
            Contact
          </button>
        </div>

        {/* Actions */}
        <div className="fc-nav-actions">
          <button
            type="button"
            className="fc-btn-signin"
            onClick={() => window.location.href = '/signin'}
          >
            Sign In
          </button>
          <button
            type="button"
            className="fc-btn-register"
            onClick={() => window.location.href = '/signup'}
          >
            Register
          </button>
          <button
            type="button"
            className="fc-hamburger"
            aria-label="Toggle Navigation Menu"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Drawer (Overview, Pricing Plans, FAQ, Contact) */}
      {mobileOpen && (
        <div className="fc-mobile-drawer">
          <button
            type="button"
            className={`fc-mobile-link ${activeSection === 'overview' ? 'active' : ''}`}
            onClick={() => handleNavClick('overview')}
          >
            <span>Platform Overview</span>
            <span>→</span>
          </button>
          <button
            type="button"
            className={`fc-mobile-link ${activeSection === 'pricing' ? 'active' : ''}`}
            onClick={() => handleNavClick('pricing')}
          >
            <span>Pricing &amp; Plans</span>
            <span>→</span>
          </button>
          <button
            type="button"
            className={`fc-mobile-link ${activeSection === 'faq' ? 'active' : ''}`}
            onClick={() => handleNavClick('faq')}
          >
            <span>Frequently Asked Questions</span>
            <span>→</span>
          </button>
          <button
            type="button"
            className={`fc-mobile-link ${activeSection === 'contact' ? 'active' : ''}`}
            onClick={() => handleNavClick('contact')}
          >
            <span>Contact &amp; Support</span>
            <span>→</span>
          </button>

          <div className="fc-mobile-actions">
            <button
              type="button"
              className="fc-btn-signin"
              onClick={() => { setMobileOpen(false); window.location.href = '/signin'; }}
            >
              Sign In to Food Court
            </button>
            <button
              type="button"
              className="fc-btn-register"
              onClick={() => { setMobileOpen(false); window.location.href = '/signup'; }}
            >
              Register Your Food Court
            </button>
          </div>
        </div>
      )}
    </>
  );
}
