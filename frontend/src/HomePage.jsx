import React, { useState, useEffect } from 'react';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

const TYPING_PHRASES = [
  'Completely Unified.',
  'Zero Queue Delays.',
  'Automated Settlements.',
  'Live Kitchen Displays.',
  'Instant RFID Dining.',
  'Smart Menu Control.'
];

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    message: ''
  });

  // Dynamic typing header effect (no wrapping)
  const [typedText, setTypedText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(80);

  useEffect(() => {
    const currentPhrase = TYPING_PHRASES[phraseIndex];

    const timer = setTimeout(() => {
      if (!isDeleting) {
        setTypedText(currentPhrase.substring(0, typedText.length + 1));
        setTypingSpeed(75);

        if (typedText.length + 1 === currentPhrase.length) {
          setTimeout(() => setIsDeleting(true), 1800);
        }
      } else {
        setTypedText(currentPhrase.substring(0, typedText.length - 1));
        setTypingSpeed(40);

        if (typedText.length === 0) {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % TYPING_PHRASES.length);
          setTypingSpeed(300);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [typedText, isDeleting, phraseIndex, typingSpeed]);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSubmitted(true);
  };

  const faqs = [
    {
      q: 'Can a single central cashier bill items across multiple food court stalls?',
      a: 'Yes. FC-ERP provides a Consolidated Multi-Stall POS. A cashier selects items from any vendor stall on a single ticket. The system automatically splits the order, routes KOTs to each stall\'s kitchen display screen (KDS), and records commission and vendor settlement ledgers in real-time.'
    },
    {
      q: 'How does data isolation work for different tenants and vendor stalls?',
      a: 'Data isolation is strictly enforced at the database query layer. Every query is partitioned by tenant schema isolation, and stall managers only see operational records, stock, and revenues tagged to their authorized vendor_id. Vendors cannot view other vendors\' financial metrics or recipes.'
    },
    {
      q: 'Does FC-ERP work on mobile devices and tablets as a PWA?',
      a: 'Yes! FC-ERP is engineered with Progressive Web App (PWA) architecture. You can install it directly to the home screen of any Android tablet, iPad, or mobile phone. It adapts seamlessly to touch interfaces, supports USB/Bluetooth thermal receipt printers, and caches menu data for high responsiveness.'
    },
    {
      q: 'Can we start on Canteen Basic and upgrade to Canteen Pro or Food Court later?',
      a: 'Absolutely. FC-ERP features instant plan entitlement scaling. When you upgrade, additional modules (like KDS, RFID Wallets, or Multi-Vendor Settlements) unlock automatically in your workspace without modifying your database records or interrupting ongoing counter operations.'
    },
    {
      q: 'How are RFID meal cards and customer QR self-ordering supported?',
      a: 'In Canteen Pro, Food Court, and Enterprise plans, staff and students can tap RFID NFC cards for instant dining card deductions, with offline balance checks. Customers can also scan table or kiosk QR codes to view the live daily menu and place orders from their smartphones.'
    },
    {
      q: 'What is the deployment timeline for our institution or food park?',
      a: 'Standard cloud onboarding takes 24 to 48 hours. Our team assists with bulk importing your menu catalog, assigning stall permissions, and configuring your WhatsApp reporting gateway.'
    }
  ];

  return (
    <div className="fc-page">
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          overflow-x: hidden;
          overflow-y: auto !important;
          height: auto !important;
          min-height: 100vh;
          scroll-behavior: smooth;
          background: #030712;
        }
        .fc-page {
          background-color: #030712;
          color: #f8fafc;
          font-family: 'Outfit', system-ui, -apple-system, sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
          overflow-y: visible !important;
        }

        /* Typography & Utilities */
        h1, h2, h3, h4 { letter-spacing: -0.025em; font-weight: 800; }
        .text-gradient {
          background: linear-gradient(135deg, #ffffff 10%, #818cf8 60%, #38bdf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .text-gold {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Dynamic Typing Line & Cursor (Strict single line, no wrapping) */
        .fc-typing-line {
          display: inline-block;
          white-space: nowrap !important;
        }
        .fc-typing-text {
          display: inline-block;
          white-space: nowrap !important;
        }
        .fc-cursor {
          display: inline-block;
          color: #818cf8;
          font-weight: 300;
          animation: fcCursorBlink 0.9s infinite;
          margin-left: 2px;
          vertical-align: baseline;
        }
        @keyframes fcCursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        /* ================= HERO SECTION (2-COLUMN GRID) ================= */
        .fc-hero {
          position: relative;
          padding: 130px 5% 70px;
          background: 
            radial-gradient(circle at 35% 10%, rgba(99, 102, 241, 0.18) 0%, rgba(3, 7, 18, 0.85) 60%, #030712 100%),
            radial-gradient(circle at 85% 30%, rgba(56, 189, 248, 0.08) 0%, transparent 45%);
          overflow: visible;
        }
        .fc-hero-inner {
          max-width: 1240px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 48px;
          align-items: center;
        }
        @media (max-width: 980px) {
          .fc-hero-inner {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 40px;
          }
        }
        .fc-hero-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        @media (max-width: 980px) {
          .fc-hero-left {
            align-items: center;
          }
        }
        .fc-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 6px 16px;
          border-radius: 999px;
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.3);
          color: #cbd5e1;
          font-size: 0.86rem;
          font-weight: 600;
          margin-bottom: 22px;
        }
        .fc-hero-badge img {
          width: 20px;
          height: 20px;
          border-radius: 5px;
        }
        .fc-hero-badge-tag {
          font-size: 0.7rem;
          background: rgba(99, 102, 241, 0.25);
          color: #a5b4fc;
          padding: 2px 7px;
          border-radius: 8px;
          font-weight: 700;
        }
        .fc-hero h1 {
          font-size: clamp(2.1rem, 4vw, 3.5rem);
          line-height: 1.22;
          margin-bottom: 20px;
          color: #f8fafc;
        }
        .fc-hero p {
          font-size: clamp(1.02rem, 1.6vw, 1.18rem);
          color: #94a3b8;
          line-height: 1.65;
          margin-bottom: 32px;
          max-width: 620px;
        }
        .fc-hero-cta {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 32px;
        }
        @media (max-width: 980px) {
          .fc-hero-cta {
            justify-content: center;
          }
        }
        .fc-btn {
          padding: 13px 24px;
          border-radius: 10px;
          font-size: 0.96rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: inherit;
        }
        .fc-btn-primary {
          background: linear-gradient(135deg, #4f46e5 0%, #2563eb 100%);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 4px 18px rgba(79, 70, 229, 0.4);
        }
        .fc-btn-primary:hover {
          background: linear-gradient(135deg, #4338ca 0%, #1d4ed8 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(79, 70, 229, 0.5);
        }
        .fc-btn-outline {
          background: rgba(255, 255, 255, 0.04);
          color: #f8fafc;
          border: 1px solid rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
        }
        .fc-btn-outline:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }
        .fc-btn-ghost-nav {
          background: transparent;
          color: #94a3b8;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .fc-btn-ghost-nav:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-2px);
        }

        /* Hero Trust Chips (Only Speed and Isolation as requested) */
        .fc-hero-chips {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          font-size: 0.82rem;
          color: #cbd5e1;
        }
        @media (max-width: 980px) {
          .fc-hero-chips {
            justify-content: center;
          }
        }
        .fc-hero-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 5px 12px;
          border-radius: 999px;
        }
        .fc-chip-dot {
          width: 7px;
          height: 7px;
          background: #10b981;
          border-radius: 50%;
        }

        /* Hero Right Visual: Clean, Elegant Showcase Image Card without Overlapping Labels */
        .fc-hero-visual {
          width: 100%;
        }
        .fc-hero-img-showcase {
          width: 100%;
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(99, 102, 241, 0.15);
          position: relative;
          transition: transform 0.3s ease, border-color 0.3s ease;
        }
        .fc-hero-img-showcase:hover {
          transform: translateY(-4px);
          border-color: rgba(99, 102, 241, 0.35);
        }
        .fc-hero-img-showcase img {
          width: 100%;
          height: 440px;
          object-fit: cover;
          display: block;
          filter: contrast(1.05) brightness(0.92);
        }
        @media (max-width: 980px) {
          .fc-hero-img-showcase img {
            height: 320px;
          }
        }
        @media (max-width: 560px) {
          .fc-hero-img-showcase img {
            height: 240px;
          }
        }

        /* Scroll Down Bouncing Affordance */
        .fc-scroll-indicator-wrap {
          text-align: center;
          margin-top: 40px;
        }
        .fc-scroll-indicator {
          background: transparent;
          border: none;
          color: #818cf8;
          font-size: 0.88rem;
          font-weight: 600;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .fc-scroll-indicator:hover {
          color: #ffffff;
        }
        .fc-bounce-arrow {
          font-size: 1.2rem;
          animation: fcBounce 1.5s infinite;
        }
        @keyframes fcBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }

        /* ================= OPERATING SCALE BAR ================= */
        .fc-stats-bar {
          background: rgba(15, 23, 42, 0.6);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding: 36px 5%;
        }
        .fc-stats-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }
        @media (max-width: 768px) {
          .fc-stats-inner {
            grid-template-columns: repeat(2, 1fr);
            gap: 28px;
          }
        }
        @media (max-width: 480px) {
          .fc-stats-inner {
            grid-template-columns: 1fr;
            text-align: center;
          }
        }
        .fc-stat-card {
          text-align: center;
        }
        .fc-stat-num {
          font-size: clamp(2rem, 3.2vw, 2.8rem);
          font-weight: 800;
          color: #f8fafc;
          margin-bottom: 6px;
        }
        .fc-stat-label {
          color: #94a3b8;
          font-size: 0.86rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
        }

        /* ================= SECTIONS ================= */
        .fc-section {
          padding: 100px 5%;
          max-width: 1240px;
          margin: 0 auto;
        }
        .fc-section-head {
          text-align: center;
          margin-bottom: 56px;
        }
        .fc-section-tag {
          color: #818cf8;
          font-weight: 700;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 12px;
          display: inline-block;
        }
        .fc-section-title {
          font-size: clamp(1.9rem, 3.5vw, 2.8rem);
          margin-bottom: 16px;
        }
        .fc-section-desc {
          font-size: 1.1rem;
          color: #94a3b8;
          max-width: 680px;
          margin: 0 auto;
          line-height: 1.6;
        }

        /* Overview Panoramic Showcase Banner */
        .fc-overview-banner {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          margin-bottom: 40px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }
        .fc-overview-banner img {
          width: 100%;
          height: 240px;
          object-fit: cover;
          display: block;
          filter: brightness(0.65);
        }
        .fc-overview-banner-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 24px;
          text-align: center;
          background: radial-gradient(circle, rgba(3, 7, 18, 0.4) 0%, rgba(3, 7, 18, 0.8) 100%);
        }
        .fc-overview-banner-overlay h3 {
          font-size: clamp(1.3rem, 2.5vw, 1.8rem);
          margin-bottom: 8px;
          color: #f8fafc;
        }
        .fc-overview-banner-overlay p {
          color: #cbd5e1;
          font-size: 0.95rem;
          max-width: 600px;
        }

        /* Overview Operational Flow */
        .fc-flow-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }
        @media (max-width: 960px) {
          .fc-flow-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 540px) {
          .fc-flow-grid {
            grid-template-columns: 1fr;
          }
        }
        .fc-flow-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 28px 24px;
          position: relative;
          transition: transform 0.2s, border-color 0.2s;
        }
        .fc-flow-card:hover {
          transform: translateY(-4px);
          border-color: rgba(99, 102, 241, 0.4);
        }
        .fc-flow-step {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
          font-weight: 800;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .fc-flow-card h3 {
          font-size: 1.2rem;
          margin-bottom: 10px;
          color: #f8fafc;
        }
        .fc-flow-card p {
          color: #94a3b8;
          font-size: 0.92rem;
          line-height: 1.55;
        }

        /* ================= BENTO GRID WITH IMAGES ================= */
        .fc-bento {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 24px;
        }
        .fc-bento-col-8 { grid-column: span 8; }
        .fc-bento-col-4 { grid-column: span 4; }
        .fc-bento-col-6 { grid-column: span 6; }
        @media (max-width: 900px) {
          .fc-bento-col-8, .fc-bento-col-4, .fc-bento-col-6 {
            grid-column: span 12;
          }
        }
        .fc-card {
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 32px;
          transition: transform 0.2s, border-color 0.2s, background 0.2s;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .fc-card:hover {
          border-color: rgba(99, 102, 241, 0.35);
          background: rgba(15, 23, 42, 0.85);
          transform: translateY(-3px);
        }
        .fc-card-media {
          width: 100%;
          height: 160px;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .fc-card-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.3s ease;
        }
        .fc-card:hover .fc-card-media img {
          transform: scale(1.04);
        }
        .fc-card-icon-head {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }
        .fc-card-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          flex-shrink: 0;
        }
        .fc-card h3 {
          font-size: 1.3rem;
          color: #f8fafc;
        }
        .fc-card p {
          color: #94a3b8;
          font-size: 0.94rem;
          line-height: 1.6;
        }
        .fc-card-tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: auto;
          padding-top: 18px;
        }
        .fc-tag {
          font-size: 0.75rem;
          padding: 3px 9px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          color: #cbd5e1;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        /* ================= PRICING SECTION ================= */
        .fc-pricing-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          align-items: stretch;
        }
        @media (max-width: 1100px) {
          .fc-pricing-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 600px) {
          .fc-pricing-grid {
            grid-template-columns: 1fr;
          }
        }
        .fc-pricing-card {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 20px;
          padding: 32px 26px;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: all 0.3s;
        }
        .fc-pricing-card:hover {
          transform: translateY(-6px);
          border-color: rgba(99, 102, 241, 0.4);
        }
        .fc-pricing-featured {
          background: linear-gradient(180deg, rgba(30, 27, 75, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
          border: 2px solid #6366f1;
          box-shadow: 0 15px 35px -5px rgba(79, 70, 229, 0.3);
        }
        .fc-pricing-popular-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #4f46e5, #06b6d4);
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 4px 14px;
          border-radius: 20px;
        }
        .fc-pricing-tier-name {
          font-size: 1.3rem;
          font-weight: 800;
          margin-bottom: 6px;
          color: #f8fafc;
        }
        .fc-pricing-tier-badge {
          display: inline-block;
          font-size: 0.78rem;
          color: #818cf8;
          margin-bottom: 18px;
        }
        .fc-pricing-amount {
          font-size: 2.3rem;
          font-weight: 800;
          color: #f8fafc;
          margin-bottom: 4px;
        }
        .fc-pricing-period {
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 18px;
        }
        .fc-pricing-desc {
          font-size: 0.88rem;
          color: #94a3b8;
          line-height: 1.5;
          margin-bottom: 24px;
          min-height: 48px;
        }
        .fc-pricing-list {
          list-style: none;
          padding: 0;
          margin: 0 0 28px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 0.88rem;
          color: #cbd5e1;
          flex-grow: 1;
        }
        .fc-pricing-list li {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          line-height: 1.4;
        }
        .fc-check-icon {
          color: #10b981;
          font-weight: 800;
          font-size: 0.95rem;
        }
        .fc-pricing-btn {
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
          border: none;
          text-align: center;
          text-decoration: none;
          display: block;
          transition: all 0.2s;
          font-family: inherit;
        }

        /* ================= PLAN ENTITLEMENTS MATRIX ================= */
        .fc-matrix-container {
          margin-top: 70px;
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 36px 30px;
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.4);
        }
        @media (max-width: 768px) {
          .fc-matrix-container {
            padding: 24px 16px;
          }
        }
        .fc-matrix-header {
          text-align: center;
          margin-bottom: 28px;
        }
        .fc-matrix-header h3 {
          font-size: 1.6rem;
          color: #f8fafc;
          margin-bottom: 8px;
        }
        .fc-matrix-header p {
          color: #94a3b8;
          font-size: 0.95rem;
        }
        .fc-matrix-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .fc-matrix-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 820px;
          font-size: 0.88rem;
        }
        .fc-matrix-table th {
          padding: 16px 12px;
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          font-weight: 700;
          vertical-align: bottom;
        }
        .fc-matrix-table th:first-child {
          text-align: left;
        }
        .fc-th-plan {
          font-size: 1.05rem;
          font-weight: 800;
          color: #f8fafc;
          margin-bottom: 4px;
        }
        .fc-th-price {
          font-size: 0.82rem;
          color: #94a3b8;
          font-weight: 500;
        }
        .fc-th-badge {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 800;
          background: #6366f1;
          color: #fff;
          padding: 2px 8px;
          border-radius: 12px;
          margin-bottom: 4px;
          letter-spacing: 0.5px;
        }
        .fc-matrix-cat-row td {
          padding: 14px 12px 8px;
          font-weight: 800;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #818cf8;
          background: rgba(255, 255, 255, 0.02);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .fc-matrix-table td {
          padding: 12px;
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          color: #cbd5e1;
        }
        .fc-matrix-table td:first-child {
          text-align: left;
          color: #e2e8f0;
          font-weight: 500;
        }
        .fc-matrix-highlight {
          background: rgba(99, 102, 241, 0.05);
        }
        .fc-matrix-yes {
          color: #10b981;
          font-weight: 800;
          font-size: 1.1rem;
        }
        .fc-matrix-no {
          color: #475569;
          font-size: 1.1rem;
        }
        .fc-matrix-action-btn {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          text-decoration: none;
          background: rgba(255, 255, 255, 0.06);
          color: #f8fafc;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.2s;
        }
        .fc-matrix-action-btn:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .fc-matrix-btn-primary {
          background: linear-gradient(135deg, #4f46e5 0%, #2563eb 100%);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .fc-matrix-btn-primary:hover {
          background: linear-gradient(135deg, #4338ca 0%, #1d4ed8 100%);
        }

        /* PWA Showcase with Image */
        .fc-pwa-box {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 44px;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 40px;
          align-items: center;
        }
        @media (max-width: 860px) {
          .fc-pwa-box {
            grid-template-columns: 1fr;
            padding: 30px 20px;
          }
        }
        .fc-pwa-feature-item {
          display: flex;
          gap: 14px;
          margin-bottom: 16px;
        }
        .fc-pwa-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          flex-shrink: 0;
        }
        .fc-pwa-card-wrap {
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          position: relative;
        }
        .fc-pwa-card-wrap img {
          width: 100%;
          height: 260px;
          object-fit: cover;
          display: block;
          filter: brightness(0.85);
        }
        .fc-pwa-card-caption {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 16px;
          background: linear-gradient(180deg, transparent 0%, rgba(3, 7, 18, 0.95) 100%);
          text-align: center;
        }

        /* FAQ Accordion */
        .fc-faq-list {
          max-width: 860px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .fc-faq-item {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .fc-faq-item:hover {
          border-color: rgba(99, 102, 241, 0.3);
        }
        .fc-faq-btn {
          width: 100%;
          padding: 20px 24px;
          background: transparent;
          border: none;
          color: #f8fafc;
          font-size: 1.05rem;
          font-weight: 700;
          text-align: left;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          font-family: inherit;
        }
        .fc-faq-arrow {
          font-size: 1.1rem;
          color: #818cf8;
          transition: transform 0.25s ease;
        }
        .fc-faq-arrow.rotated {
          transform: rotate(180deg);
        }
        .fc-faq-ans {
          padding: 0 24px 22px;
          font-size: 0.95rem;
          color: #94a3b8;
          line-height: 1.65;
        }

        /* Contact Section */
        .fc-contact-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 40px;
        }
        @media (max-width: 880px) {
          .fc-contact-grid {
            grid-template-columns: 1fr;
          }
        }
        .fc-contact-info {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .fc-contact-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 22px;
          display: flex;
          gap: 16px;
        }
        .fc-contact-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          flex-shrink: 0;
        }
        .fc-contact-form {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 36px;
        }
        .fc-form-group {
          margin-bottom: 20px;
        }
        .fc-form-label {
          display: block;
          font-size: 0.88rem;
          font-weight: 600;
          color: #cbd5e1;
          margin-bottom: 8px;
        }
        .fc-form-input, .fc-form-textarea {
          width: 100%;
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(3, 7, 18, 0.7);
          color: #f8fafc;
          font-family: inherit;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .fc-form-input:focus, .fc-form-textarea:focus {
          border-color: #6366f1;
        }
        .fc-form-textarea {
          min-height: 110px;
          resize: vertical;
        }
      `}</style>

      {/* Modern Sticky Nav */}
      <Navbar />

      {/* ================= HERO SECTION ================= */}
      <section id="home" className="fc-hero">
        <div className="fc-hero-inner">
          {/* Left Column: Copy & Dynamic Typing Headline */}
          <div className="fc-hero-left">
            <div className="fc-hero-badge">
              <img src="/favicon.svg" alt="FC-ERP" />
              <span>Multi-Vendor Food Court &amp; Institutional Canteen OS</span>
              <span className="fc-hero-badge-tag">v1.1.4</span>
            </div>

            <h1>
              Smart Food Court &amp; Canteen Operations, <br />
              <span className="fc-typing-line">
                <span className="text-gradient fc-typing-text">{typedText}</span>
                <span className="fc-cursor">|</span>
              </span>
            </h1>

            <p>
              A high-performance cloud ERP engineered for multi-stall food courts, campus dining halls, and institutional canteens. Accelerate counter checkout, route orders to kitchen screens instantly, and automate vendor payouts in real-time.
            </p>

            <div className="fc-hero-cta">
              <a href="/signup" className="fc-btn fc-btn-primary">
                <span>Register Your Food Court</span>
                <span>→</span>
              </a>
              <button
                type="button"
                className="fc-btn fc-btn-outline"
                onClick={() => scrollTo('overview')}
              >
                <span>Explore Platform</span>
              </button>
              <a href="/signin" className="fc-btn fc-btn-ghost-nav">
                <span>Sign In to Terminal</span>
              </a>
            </div>

            {/* Chips: Speed and Revenue Isolation only */}
            <div className="fc-hero-chips">
              <div className="fc-hero-chip">
                <span className="fc-chip-dot"></span>
                <span>⚡ 1.2s Ticket Speed</span>
              </div>
              <div className="fc-hero-chip">
                <span className="fc-chip-dot"></span>
                <span>🛡️ Multi-Vendor Revenue Isolation</span>
              </div>
            </div>
          </div>

          {/* Right Column: Clean, High-Resolution Showcase Image without Overlapping Labels */}
          <div className="fc-hero-visual">
            <div className="fc-hero-img-showcase">
              <img
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80"
                alt="Modern Food Court &amp; Canteen Operations"
                loading="eager"
              />
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="fc-scroll-indicator-wrap">
          <button
            type="button"
            className="fc-scroll-indicator"
            onClick={() => scrollTo('overview')}
            aria-label="Scroll down to explore"
          >
            <span>Scroll to explore architecture</span>
            <span className="fc-bounce-arrow">↓</span>
          </button>
        </div>
      </section>

      {/* Stats Bar */}
      <div className="fc-stats-bar">
        <div className="fc-stats-inner">
          <div className="fc-stat-card">
            <div className="fc-stat-num">50+</div>
            <div className="fc-stat-label">Enterprise Food Courts</div>
          </div>
          <div className="fc-stat-card">
            <div className="fc-stat-num">50M+</div>
            <div className="fc-stat-label">Orders Processed</div>
          </div>
          <div className="fc-stat-card">
            <div className="fc-stat-num">99.99%</div>
            <div className="fc-stat-label">Service SLA Uptime</div>
          </div>
          <div className="fc-stat-card">
            <div className="fc-stat-num">24 / 7</div>
            <div className="fc-stat-label">Production Support</div>
          </div>
        </div>
      </div>

      {/* ================= PLATFORM OVERVIEW WITH PANORAMIC IMAGE ================= */}
      <section id="overview" className="fc-section">
        <div className="fc-section-head">
          <span className="fc-section-tag">Platform Architecture</span>
          <h2 className="fc-section-title">How FC-ERP Powers Operations</h2>
          <p className="fc-section-desc">
            Eliminate manual cashier slips, vendor reconciliation disputes, and delayed kitchen orders with an end-to-end synchronized workflow.
          </p>
        </div>

        {/* Panoramic Dining Hall Showcase */}
        <div className="fc-overview-banner">
          <img
            src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80"
            alt="Modern Dining Hall"
            loading="lazy"
          />
          <div className="fc-overview-banner-overlay">
            <h3>Engineered for Multi-Stall High-Throughput Operations</h3>
            <p>From single institutional canteens to multi-vendor commercial dining parks, FC-ERP adapts to your exact layout.</p>
          </div>
        </div>

        <div className="fc-flow-grid">
          <div className="fc-flow-card">
            <div className="fc-flow-step">1</div>
            <h3>Unified Intake</h3>
            <p>Customers order via central cashier POS, table QR code, or self-service kiosks with instant payment support (Cash, UPI, Cards, RFID).</p>
          </div>
          <div className="fc-flow-card">
            <div className="fc-flow-step">2</div>
            <h3>Smart KDS Dispatch</h3>
            <p>Orders split dynamically. Kitchen display screens (KDS) receive only their stall's items with live color-coded preparation timers.</p>
          </div>
          <div className="fc-flow-card">
            <div className="fc-flow-step">3</div>
            <h3>Automated Split</h3>
            <p>Platform commissions, food court maintenance, and vendor payouts calculate automatically in real-time without end-of-day spreadsheets.</p>
          </div>
          <div className="fc-flow-card">
            <div className="fc-flow-step">4</div>
            <h3>Audit &amp; Intelligence</h3>
            <p>Daily sales, stock deductions, and staff shift summaries are automatically compiled and delivered to management via WhatsApp and MIS portals.</p>
          </div>
        </div>
      </section>

      {/* ================= CORE FEATURES BENTO GRID (WITH IMAGES) ================= */}
      <section id="features" className="fc-section" style={{ paddingTop: '20px' }}>
        <div className="fc-section-head">
          <span className="fc-section-tag">Core Capabilities</span>
          <h2 className="fc-section-title">Everything You Need, Built Directly In</h2>
          <p className="fc-section-desc">
            Replace patchwork software with a purpose-built suite that handles multi-tenant, multi-stall operations flawlessly.
          </p>
        </div>

        <div className="fc-bento">
          {/* Card 1: Multi-Stall POS (Large with Image) */}
          <div className="fc-card fc-bento-col-8">
            <div className="fc-card-media">
              <img
                src="https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&w=800&q=80"
                alt="Counter POS Terminal"
                loading="lazy"
              />
            </div>
            <div className="fc-card-icon-head">
              <div className="fc-card-icon" style={{ background: 'rgba(79, 70, 229, 0.15)', color: '#818cf8' }}>
                🖥️
              </div>
              <h3>Consolidated Multi-Stall Point of Sale</h3>
            </div>
            <p>
              Allow cashiers to add items across multiple vendors on a single invoice. FC-ERP creates a unified customer receipt, prints split kitchen order tickets (KOTs), and isolates accounting entries into respective vendor ledgers.
            </p>
            <div className="fc-card-tags">
              <span className="fc-tag">Split Invoicing</span>
              <span className="fc-tag">Dual Cashier/Expo Screens</span>
              <span className="fc-tag">Thermal Print Support</span>
              <span className="fc-tag">Barcode &amp; RFID Scanner</span>
            </div>
          </div>

          {/* Card 2: KDS (Small with Image) */}
          <div className="fc-card fc-bento-col-4">
            <div className="fc-card-media">
              <img
                src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=600&q=80"
                alt="Kitchen Display Preparation"
                loading="lazy"
              />
            </div>
            <div className="fc-card-icon-head">
              <div className="fc-card-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                🍳
              </div>
              <h3>Real-Time KDS Displays</h3>
            </div>
            <p>
              Replace paper tickets with kitchen displays. Chefs update preparation stages in real-time with automatic order ready notifications.
            </p>
            <div className="fc-card-tags">
              <span className="fc-tag">Preparation Timers</span>
              <span className="fc-tag">Audible Chimes</span>
              <span className="fc-tag">Expo Screen View</span>
            </div>
          </div>

          {/* Card 3: Settlements (Small with Image) */}
          <div className="fc-card fc-bento-col-4">
            <div className="fc-card-media">
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80"
                alt="Automated Financial Settlements"
                loading="lazy"
              />
            </div>
            <div className="fc-card-icon-head">
              <div className="fc-card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                📊
              </div>
              <h3>Automated Settlements</h3>
            </div>
            <p>
              Instant end-of-day reconciliation. Define individual stall commission rates and view transparent vendor payout ledgers.
            </p>
            <div className="fc-card-tags">
              <span className="fc-tag">Commission Rules</span>
              <span className="fc-tag">Payout Vouchers</span>
              <span className="fc-tag">Export to Tally/Excel</span>
            </div>
          </div>

          {/* Card 4: RFID & QR (Large with Image) */}
          <div className="fc-card fc-bento-col-8">
            <div className="fc-card-media">
              <img
                src="https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=800&q=80"
                alt="Contactless Dining Card & Mobile QR"
                loading="lazy"
              />
            </div>
            <div className="fc-card-icon-head">
              <div className="fc-card-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>
                💳
              </div>
              <h3>RFID Dining Cards &amp; Mobile QR Ordering</h3>
            </div>
            <p>
              Eliminate queues during peak break hours. Staff and students can use tap-and-pay RFID smart cards with rechargeable balances. Table and counter QR codes enable seamless self-ordering directly from customers' smartphones.
            </p>
            <div className="fc-card-tags">
              <span className="fc-tag">Prepaid Mess Wallets</span>
              <span className="fc-tag">Contactless Tap &amp; Pay</span>
              <span className="fc-tag">Table QR Menus</span>
              <span className="fc-tag">WhatsApp Receipts</span>
            </div>
          </div>

          {/* Card 5: Inventory & Recipe (Col 6 with Image) */}
          <div className="fc-card fc-bento-col-6">
            <div className="fc-card-media">
              <img
                src="https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=600&q=80"
                alt="Stock & Raw Material Ledger"
                loading="lazy"
              />
            </div>
            <div className="fc-card-icon-head">
              <div className="fc-card-icon" style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8' }}>
                📦
              </div>
              <h3>Recipe Formulation &amp; Stock Auto-Deductions</h3>
            </div>
            <p>
              Track raw material consumption per recipe. As orders are completed, raw ingredients auto-deduct from stock with automated reorder alerts.
            </p>
            <div className="fc-card-tags">
              <span className="fc-tag">Bill of Materials (BOM)</span>
              <span className="fc-tag">Low-Stock WhatsApp Alerts</span>
              <span className="fc-tag">Wastage Logs</span>
            </div>
          </div>

          {/* Card 6: HR & Shifts (Col 6 with Image) */}
          <div className="fc-card fc-bento-col-6">
            <div className="fc-card-media">
              <img
                src="https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=600&q=80"
                alt="Kitchen Staff & Workforce Team"
                loading="lazy"
              />
            </div>
            <div className="fc-card-icon-head">
              <div className="fc-card-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                👥
              </div>
              <h3>Staff Shifts, Attendance &amp; Payroll</h3>
            </div>
            <p>
              Complete workforce governance for kitchen and counter teams. Manage shift rotations, daily check-ins, advance salary draws, and monthly payroll.
            </p>
            <div className="fc-card-tags">
              <span className="fc-tag">Biometric Sync</span>
              <span className="fc-tag">Salary Slips</span>
              <span className="fc-tag">Shift Rostering</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PRICING PLANS ================= */}
      <section id="pricing" className="fc-section">
        <div className="fc-section-head">
          <span className="fc-section-tag">Transparent Subscriptions</span>
          <h2 className="fc-section-title">Choose the Plan That Fits Your Scale</h2>
          <p className="fc-section-desc">
            All plans include continuous cloud security updates, zero operational lock-in, and dedicated onboarding support.
          </p>
        </div>

        <div className="fc-pricing-grid">
          {/* Tier 1: Canteen Basic */}
          <div className="fc-pricing-card">
            <div className="fc-pricing-tier-name">Canteen Basic</div>
            <div className="fc-pricing-tier-badge">School / College Counters</div>
            <div className="fc-pricing-amount">₹12,000</div>
            <div className="fc-pricing-period">per year / counter</div>
            <div className="fc-pricing-desc">
              Essential billing, daily menu toggles, and cash/UPI POS for institutional single counters.
            </div>
            <ul className="fc-pricing-list">
              <li><span className="fc-check-icon">✓</span> Daily Menu Toggle &amp; Pricing</li>
              <li><span className="fc-check-icon">✓</span> Basic Stock Ledger (Manual Counts)</li>
              <li><span className="fc-check-icon">✓</span> Counter POS &amp; Instant Cash/UPI</li>
              <li><span className="fc-check-icon">✓</span> Daily WhatsApp Closing Summary</li>
              <li><span className="fc-check-icon">✓</span> Standard MIS Sales Reports</li>
            </ul>
            <a
              href="/signup?plan=Canteen+Basic"
              className="fc-pricing-btn"
              style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#f8fafc' }}
            >
              Register Canteen Basic
            </a>
          </div>

          {/* Tier 2: Canteen Pro (Popular) */}
          <div className="fc-pricing-card fc-pricing-featured">
            <div className="fc-pricing-popular-badge">Most Popular</div>
            <div className="fc-pricing-tier-name">Canteen Pro</div>
            <div className="fc-pricing-tier-badge" style={{ color: '#a5b4fc' }}>Corporate &amp; Hospitals</div>
            <div className="fc-pricing-amount text-gradient">₹20,000</div>
            <div className="fc-pricing-period">per year / kitchen</div>
            <div className="fc-pricing-desc">
              Full automation suite with live KDS screens, self-order QR menus, and RFID cards for busy facilities.
            </div>
            <ul className="fc-pricing-list">
              <li><span className="fc-check-icon">✓</span> <strong>Everything in Canteen Basic</strong></li>
              <li><span className="fc-check-icon">✓</span> Real-Time Kitchen Display (KDS)</li>
              <li><span className="fc-check-icon">✓</span> Customer QR Code Self-Ordering</li>
              <li><span className="fc-check-icon">✓</span> Recipe Formulations &amp; Auto-Deductions</li>
              <li><span className="fc-check-icon">✓</span> RFID Meal Cards &amp; Wallets</li>
              <li><span className="fc-check-icon">✓</span> Staff Shifts, Attendance &amp; Payroll</li>
            </ul>
            <a
              href="/signup?plan=Canteen+Pro"
              className="fc-pricing-btn fc-btn-primary"
            >
              Register Canteen Pro
            </a>
          </div>

          {/* Tier 3: Food Court */}
          <div className="fc-pricing-card">
            <div className="fc-pricing-tier-name">Food Court</div>
            <div className="fc-pricing-tier-badge">Malls &amp; Multi-Vendor Parks</div>
            <div className="fc-pricing-amount">₹40,000</div>
            <div className="fc-pricing-period">per year / food court</div>
            <div className="fc-pricing-desc">
              Multi-stall governance with central split billing, automated vendor commissions, and payout vouchers.
            </div>
            <ul className="fc-pricing-list">
              <li><span className="fc-check-icon">✓</span> <strong>Everything in Canteen Pro</strong></li>
              <li><span className="fc-check-icon">✓</span> Multi-Vendor &amp; Multi-Stall Architecture</li>
              <li><span className="fc-check-icon">✓</span> Stall-Level Real-Time Insights</li>
              <li><span className="fc-check-icon">✓</span> Commission Tracking &amp; Auto-Splits</li>
              <li><span className="fc-check-icon">✓</span> Vendor Settlement Payout Ledgers</li>
              <li><span className="fc-check-icon">✓</span> Consolidated Central POS Terminal</li>
            </ul>
            <a
              href="/signup?plan=Food+Court"
              className="fc-pricing-btn"
              style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#f8fafc' }}
            >
              Register Food Court
            </a>
          </div>

          {/* Tier 4: Enterprise */}
          <div className="fc-pricing-card">
            <div className="fc-pricing-tier-name">Enterprise</div>
            <div className="fc-pricing-tier-badge" style={{ color: '#fbbf24' }}>Large Food Parks &amp; Chains</div>
            <div className="fc-pricing-amount text-gold">₹75,000+</div>
            <div className="fc-pricing-period">custom annual agreement</div>
            <div className="fc-pricing-desc">
              Dedicated cloud infrastructure, priority WhatsApp gateways, and dedicated enterprise SLAs.
            </div>
            <ul className="fc-pricing-list">
              <li><span className="fc-check-icon">✓</span> <strong>All Food Court &amp; Pro Features</strong></li>
              <li><span className="fc-check-icon">✓</span> Dedicated Enterprise Cloud Partition</li>
              <li><span className="fc-check-icon">✓</span> High-Throughput WhatsApp Gateway</li>
              <li><span className="fc-check-icon">✓</span> Dedicated Technical Account Manager</li>
              <li><span className="fc-check-icon">✓</span> Custom ERP &amp; Biometric Integrations</li>
              <li><span className="fc-check-icon">✓</span> Priority 99.99% Uptime Guarantee</li>
            </ul>
            <a
              href="/signup?plan=Enterprise"
              className="fc-pricing-btn"
              style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#f8fafc' }}
            >
              Inquire Enterprise
            </a>
          </div>
        </div>

        {/* ================= COMPREHENSIVE PLAN ENTITLEMENTS MATRIX ================= */}
        <div className="fc-matrix-container">
          <div className="fc-matrix-header">
            <h3>Detailed Feature &amp; Entitlement Matrix</h3>
            <p>Comprehensive side-by-side comparison of modules and operational limits across all four tiers.</p>
          </div>

          <div className="fc-matrix-scroll">
            <table className="fc-matrix-table">
              <thead>
                <tr>
                  <th style={{ width: '36%' }}>Modules &amp; Capabilities</th>
                  <th style={{ width: '16%' }}>
                    <div className="fc-th-plan">Canteen Basic</div>
                    <div className="fc-th-price">₹12,000/yr</div>
                  </th>
                  <th style={{ width: '16%', background: 'rgba(99, 102, 241, 0.12)' }}>
                    <div className="fc-th-badge">POPULAR</div>
                    <div className="fc-th-plan" style={{ color: '#a5b4fc' }}>Canteen Pro</div>
                    <div className="fc-th-price">₹20,000/yr</div>
                  </th>
                  <th style={{ width: '16%' }}>
                    <div className="fc-th-plan" style={{ color: '#34d399' }}>Food Court</div>
                    <div className="fc-th-price">₹40,000/yr</div>
                  </th>
                  <th style={{ width: '16%' }}>
                    <div className="fc-th-plan" style={{ color: '#fbbf24' }}>Enterprise</div>
                    <div className="fc-th-price">Custom Agreement</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Counter POS & Billing */}
                <tr className="fc-matrix-cat-row">
                  <td colSpan={5}>1. Counter POS &amp; Billing</td>
                </tr>
                <tr>
                  <td>Daily Menu Toggle &amp; Item Pricing Control</td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>
                <tr>
                  <td>Counter Cash &amp; Dynamic UPI QR Billing</td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>
                <tr>
                  <td>Consolidated Multi-Stall POS (Split Invoice)</td>
                  <td><span className="fc-matrix-no">—</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-no">—</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>
                <tr>
                  <td>Split KOT &amp; Thermal Receipt Printing</td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>

                {/* 2. Kitchen Display System (KDS) */}
                <tr className="fc-matrix-cat-row">
                  <td colSpan={5}>2. Kitchen Display System (KDS)</td>
                </tr>
                <tr>
                  <td>Real-Time Kitchen Display Screens</td>
                  <td><span className="fc-matrix-no">—</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>
                <tr>
                  <td>Color-Coded Preparation Stage Timers</td>
                  <td><span className="fc-matrix-no">—</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>
                <tr>
                  <td>Central Expediter (Expo) Display View</td>
                  <td><span className="fc-matrix-no">—</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>

                {/* 3. Inventory & Raw Material Management */}
                <tr className="fc-matrix-cat-row">
                  <td colSpan={5}>3. Inventory &amp; Raw Material Management</td>
                </tr>
                <tr>
                  <td>Basic Stock Ledger (Manual Counts)</td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>
                <tr>
                  <td>Recipe Formulation (Bill of Materials)</td>
                  <td><span className="fc-matrix-no">—</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>
                <tr>
                  <td>Automatic Ingredient Consumption on Order</td>
                  <td><span className="fc-matrix-no">—</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>
                <tr>
                  <td>Low-Stock Threshold &amp; Wastage Logs</td>
                  <td><span className="fc-matrix-no">—</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>

                {/* 4. Customer Ordering & Meal Wallets */}
                <tr className="fc-matrix-cat-row">
                  <td colSpan={5}>4. Customer Ordering &amp; Meal Wallets</td>
                </tr>
                <tr>
                  <td>Daily WhatsApp Closing Summaries</td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>
                <tr>
                  <td>Customer QR Code Mobile Self-Ordering</td>
                  <td><span className="fc-matrix-no">—</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>
                <tr>
                  <td>Contactless RFID Meal Cards &amp; Wallets</td>
                  <td><span className="fc-matrix-no">—</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>
                <tr>
                  <td>Mess Monthly Subscription Meal Plans</td>
                  <td><span className="fc-matrix-no">—</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>

                {/* 5. Multi-Vendor & Revenue Settlements */}
                <tr className="fc-matrix-cat-row">
                  <td colSpan={5}>5. Multi-Vendor &amp; Revenue Settlements</td>
                </tr>
                <tr>
                  <td>Isolated Multi-Vendor / Stall Partitioning</td>
                  <td><span className="fc-matrix-no">—</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-no">—</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>
                <tr>
                  <td>Individual Stall Manager Login &amp; Sales</td>
                  <td><span className="fc-matrix-no">—</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-no">—</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>
                <tr>
                  <td>Platform Commission Splits &amp; Payout Ledgers</td>
                  <td><span className="fc-matrix-no">—</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-no">—</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>

                {/* 6. Workforce, Shifts & Payroll */}
                <tr className="fc-matrix-cat-row">
                  <td colSpan={5}>6. Workforce, Shifts &amp; Payroll</td>
                </tr>
                <tr>
                  <td>Staff Shifts, Attendance &amp; Check-ins</td>
                  <td><span className="fc-matrix-no">—</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>
                <tr>
                  <td>Wage Calculation &amp; Advance Salary Ledgers</td>
                  <td><span className="fc-matrix-no">—</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>

                {/* 7. Cloud Hosting & Technical SLAs */}
                <tr className="fc-matrix-cat-row">
                  <td colSpan={5}>7. Cloud Hosting &amp; Technical SLAs</td>
                </tr>
                <tr>
                  <td>Cloud Hosting &amp; Automatic Backups</td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>
                <tr>
                  <td>Standard Email &amp; WhatsApp Support</td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>
                <tr>
                  <td>Dedicated Technical Account Manager</td>
                  <td><span className="fc-matrix-no">—</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-no">—</span></td>
                  <td><span className="fc-matrix-no">—</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>
                <tr>
                  <td>Custom ERP &amp; Biometric Integrations</td>
                  <td><span className="fc-matrix-no">—</span></td>
                  <td className="fc-matrix-highlight"><span className="fc-matrix-no">—</span></td>
                  <td><span className="fc-matrix-no">—</span></td>
                  <td><span className="fc-matrix-yes">✓</span></td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ fontWeight: 700 }}>Select Plan</td>
                  <td>
                    <a href="/signup?plan=Canteen+Basic" className="fc-matrix-action-btn">
                      Select Basic
                    </a>
                  </td>
                  <td className="fc-matrix-highlight">
                    <a href="/signup?plan=Canteen+Pro" className="fc-matrix-action-btn fc-matrix-btn-primary">
                      Select Pro
                    </a>
                  </td>
                  <td>
                    <a href="/signup?plan=Food+Court" className="fc-matrix-action-btn">
                      Select Food Court
                    </a>
                  </td>
                  <td>
                    <a href="/signup?plan=Enterprise" className="fc-matrix-action-btn">
                      Inquire
                    </a>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* ================= MOBILE PWA & HARDWARE (WITH IMAGE) ================= */}
      <section id="pwa" className="fc-section" style={{ paddingTop: '20px' }}>
        <div className="fc-pwa-box">
          <div>
            <span className="fc-section-tag">Modern PWA Technology</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', marginBottom: '16px' }}>
              Works on Any Device, Anywhere
            </h2>
            <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '24px' }}>
              FC-ERP is built as a lightning-fast Progressive Web App. Turn any tablet, touch screen, or desktop into a professional counter terminal in seconds.
            </p>

            <div className="fc-pwa-feature-item">
              <div className="fc-pwa-icon">📱</div>
              <div>
                <strong>Installable on Android &amp; iOS</strong>
                <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Add to home screen for full-screen kiosk operation with zero app store delays.</p>
              </div>
            </div>

            <div className="fc-pwa-feature-item">
              <div className="fc-pwa-icon">🖨️</div>
              <div>
                <strong>Hardware Printer Integration</strong>
                <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Compatible with standard 58mm/80mm thermal receipt printers via USB, LAN, or Bluetooth.</p>
              </div>
            </div>

            <div className="fc-pwa-feature-item">
              <div className="fc-pwa-icon">⚡</div>
              <div>
                <strong>Offline-Resilient Caching</strong>
                <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Cashiers keep billing smoothly during Wi-Fi drops with automatic queue synchronization.</p>
              </div>
            </div>
          </div>

          <div className="fc-pwa-card-wrap">
            <img
              src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80"
              alt="Mobile and Tablet POS System"
              loading="lazy"
            />
            <div className="fc-pwa-card-caption">
              <h3 style={{ fontSize: '1.15rem', color: '#f8fafc', marginBottom: '6px' }}>Zero Proprietary Hardware Lock-In</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.84rem', marginBottom: '14px' }}>
                Use your existing tablets, laptops, or smartphones without expensive proprietary terminals.
              </p>
              <a href="/signup" className="fc-btn fc-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Get Started with FC-ERP
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FREQUENTLY ASKED QUESTIONS ================= */}
      <section id="faq" className="fc-section">
        <div className="fc-section-head">
          <span className="fc-section-tag">Clarifications</span>
          <h2 className="fc-section-title">Frequently Asked Questions</h2>
          <p className="fc-section-desc">
            Everything you need to know about FC-ERP architecture, security, and setup.
          </p>
        </div>

        <div className="fc-faq-list">
          {faqs.map((faq, idx) => (
            <div key={idx} className="fc-faq-item">
              <button
                type="button"
                className="fc-faq-btn"
                onClick={() => toggleFaq(idx)}
                aria-expanded={openFaq === idx}
              >
                <span>{faq.q}</span>
                <span className={`fc-faq-arrow ${openFaq === idx ? 'rotated' : ''}`}>▼</span>
              </button>
              {openFaq === idx && (
                <div className="fc-faq-ans">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ================= CONTACT & INQUIRIES ================= */}
      <section id="contact" className="fc-section" style={{ paddingTop: '20px' }}>
        <div className="fc-section-head">
          <span className="fc-section-tag">Direct Contact</span>
          <h2 className="fc-section-title">Talk to Our Solutions Team</h2>
          <p className="fc-section-desc">
            Have questions about custom multi-counter setups or enterprise SLA terms? Connect with our engineering and support specialists.
          </p>
        </div>

        <div className="fc-contact-grid">
          <div className="fc-contact-info">
            <div className="fc-contact-card">
              <div className="fc-contact-icon">📍</div>
              <div>
                <strong style={{ display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>Corporate Headquarters</strong>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  RAD Infotech<br />
                  Coimbatore, Tamil Nadu, India
                </p>
              </div>
            </div>

            <div className="fc-contact-card">
              <div className="fc-contact-icon">✉️</div>
              <div>
                <strong style={{ display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>Inquiries &amp; Support</strong>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                  info@radinfotec.com<br />
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Technical &amp; Sales Desk</span>
                </p>
              </div>
            </div>

            <div className="fc-contact-card">
              <div className="fc-contact-icon">📞</div>
              <div>
                <strong style={{ display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>Enterprise Desk</strong>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                  +91 9894779442<br />
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Mon-Sat 9:00 AM - 7:00 PM IST</span>
                </p>
              </div>
            </div>
          </div>

          <div className="fc-contact-form">
            {contactSubmitted ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✉️</div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '10px' }}>Message Received</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6' }}>
                  Thank you for reaching out. Our solution specialist will contact you at <strong>{contactForm.email || 'your email'}</strong> within one business day.
                </p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit}>
                <div className="fc-form-group">
                  <label className="fc-form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="fc-form-input"
                    placeholder="e.g. Ramesh Kumar"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  />
                </div>

                <div className="fc-form-group">
                  <label className="fc-form-label">Work Email *</label>
                  <input
                    type="email"
                    required
                    className="fc-form-input"
                    placeholder="e.g. ramesh@institution.edu"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  />
                </div>

                <div className="fc-form-group">
                  <label className="fc-form-label">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    pattern="[+]?[0-9 -]{10,20}"
                    title="Please enter a valid 10-digit mobile number (e.g. 9894779442 or +91 9894779442)"
                    className="fc-form-input"
                    placeholder="e.g. 9894779442"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  />
                </div>

                <div className="fc-form-group">
                  <label className="fc-form-label">Food Court / Organization *</label>
                  <input
                    type="text"
                    required
                    className="fc-form-input"
                    placeholder="e.g. Campus Central Canteen"
                    value={contactForm.organization}
                    onChange={(e) => setContactForm({ ...contactForm, organization: e.target.value })}
                  />
                </div>

                <div className="fc-form-group">
                  <label className="fc-form-label">Message / Counters Required</label>
                  <textarea
                    className="fc-form-textarea"
                    placeholder="Tell us about your counters, stall count, or any specific requirements..."
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="fc-btn fc-btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                >
                  Send Inquiry
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Comprehensive Footer */}
      <Footer />
    </div>
  );
}
