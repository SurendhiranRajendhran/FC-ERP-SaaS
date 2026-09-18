import React from 'react';
import Navbar from './Navbar.jsx';

export default function ContactPage() {
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
          position: relative; padding: 180px 5% 100px; text-align: center;
          background: linear-gradient(180deg, rgba(3,3,3,0.6) 0%, rgba(3,3,3,0.9) 70%, rgba(3,3,3,1) 100%), url('https://images.unsplash.com/photo-1423666639041-f56000c27a9a?auto=format&fit=crop&w=1920&q=80') center/cover no-repeat;
        }
        .hero h1 { font-size: clamp(3rem, 6vw, 4.5rem); font-weight: 800; margin-bottom: 24px; line-height: 1.1; }
        .hero p { font-size: 1.25rem; color: #94a3b8; max-width: 600px; margin: 0 auto; line-height: 1.6; }

        /* Contact Layout */
        .contact-section { padding: 60px 5%; max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
        @media (max-width: 900px) { .contact-section { grid-template-columns: 1fr; } }
        
        /* Contact Info */
        .contact-info { display: flex; flex-direction: column; gap: 40px; }
        .contact-info h2 { font-size: 2.2rem; font-weight: 800; margin-bottom: 12px; }
        .contact-info p { color: #94a3b8; font-size: 1.1rem; line-height: 1.6; margin-bottom: 20px; }
        .info-card { display: flex; align-items: flex-start; gap: 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 24px; border-radius: 16px; }
        .info-icon { font-size: 1.8rem; color: #818cf8; background: rgba(79,70,229,0.1); width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 12px; }
        .info-card h3 { font-size: 1.2rem; font-weight: 700; margin-bottom: 8px; }
        .info-card p { color: #94a3b8; font-size: 1rem; margin-bottom: 0; }
        
        /* Contact Form */
        .contact-form-container { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); padding: 40px; border-radius: 24px; }
        .form-group { margin-bottom: 24px; }
        .form-label { display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 8px; color: #cbd5e1; }
        .form-input { width: 100%; background: #0a0a0f; border: 1px solid rgba(255,255,255,0.1); color: #f8fafc; padding: 14px 16px; border-radius: 10px; font-size: 1rem; outline: none; transition: border-color 0.2s, box-shadow 0.2s; font-family: inherit; }
        .form-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.2); }
        textarea.form-input { min-height: 140px; resize: vertical; }
        .btn-submit { width: 100%; background: #4f46e5; color: #fff; border: none; padding: 16px; border-radius: 10px; font-size: 1.05rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-submit:hover { background: #4338ca; transform: translateY(-2px); box-shadow: 0 4px 14px rgba(79,70,229,0.3); }

        /* FAQ Section */
        .faq-section { padding: 100px 5%; max-width: 900px; margin: 0 auto 60px; }
        .faq-header { text-align: center; margin-bottom: 60px; }
        .faq-header h2 { font-size: 2.5rem; font-weight: 800; }
        .faq-item { margin-bottom: 24px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 32px; }
        .faq-question { font-size: 1.25rem; font-weight: 700; color: #f8fafc; margin-bottom: 12px; }
        .faq-answer { font-size: 1.05rem; color: #94a3b8; line-height: 1.6; }

        /* Footer */
        .footer { padding: 40px 5%; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; color: #64748b; }
        .footer-links a { color: #64748b; text-decoration: none; margin-left: 24px; transition: color 0.2s; }
        .footer-links a:hover { color: #e2e8f0; }
      `}</style>
      <Navbar />

      <section className="hero">
        <h1>Let's build <span className="text-gradient">something great</span></h1>
        <p>Our sales and support teams are ready to help you seamlessly transition your food court to FC-ERP.</p>
      </section>

      <section className="contact-section">
        <div className="contact-info">
          <div>
            <h2>Get in Touch</h2>
            <p>Whether you're looking for a custom enterprise plan or need technical assistance, we are here to help.</p>
          </div>
          
          <div className="info-card">
            <div className="info-icon">💬</div>
            <div>
              <h3>Enterprise Sales</h3>
              <p>sales@fcerp.com</p>
              <p>+91 98765 43210</p>
            </div>
          </div>
          
          <div className="info-card">
            <div className="info-icon">🛠️</div>
            <div>
              <h3>Technical Support</h3>
              <p>support@fcerp.com</p>
              <p>24/7 dedicated line for customers.</p>
            </div>
          </div>
          
          <div className="info-card">
            <div className="info-icon">📍</div>
            <div>
              <h3>Headquarters</h3>
              <p>Cyber City, Phase 2<br/>Chennai, India 600001</p>
            </div>
          </div>
        </div>

        <div className="contact-form-container">
          <form onSubmit={(e)=>{e.preventDefault();alert('Message sent successfully!');}}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" placeholder="John Doe" required />
            </div>
            <div className="form-group">
              <label className="form-label">Work Email</label>
              <input className="form-input" type="email" placeholder="john@example.com" required />
            </div>
            <div className="form-group">
              <label className="form-label">Company / Food Court Name</label>
              <input className="form-input" type="text" placeholder="UrbanEats Plaza" required />
            </div>
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea className="form-input" placeholder="How can we help you?" required></textarea>
            </div>
            <button type="submit" className="btn-submit">Send Message</button>
          </form>
        </div>
      </section>

      <section className="faq-section">
        <div className="faq-header">
          <h2>Frequently Asked Questions</h2>
        </div>
        <div className="faq-item">
          <div className="faq-question">Do you offer on-premise deployments?</div>
          <div className="faq-answer">By default, FC-ERP is a cloud-native SaaS platform designed for high availability. For enterprise clients with strict compliance requirements, we offer dedicated single-tenant cloud deployments. On-premise deployment is not supported.</div>
        </div>
        <div className="faq-item">
          <div className="faq-question">How does pricing work for multi-location franchises?</div>
          <div className="faq-answer">We offer volume-based enterprise discounts for franchises operating multiple food court locations. Contact our sales team for a custom quote tailored to your scale.</div>
        </div>
        <div className="faq-item">
          <div className="faq-question">What is your typical onboarding timeline?</div>
          <div className="faq-answer">Standard onboarding takes about 1-2 weeks, which includes menu import, vendor onboarding, and hardware integration. We provide a dedicated Customer Success Manager to guide you through every step.</div>
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
