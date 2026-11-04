import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import QRMenu from './QRMenu.jsx'

import HomePage from './HomePage.jsx'
import SignUpPage from './SignUpPage.jsx'
import CookieConsent from './CookieConsent.jsx'

const path = window.location.pathname;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {path === '/' || path === '/about' || path === '/contact' ? (
      <HomePage />
    ) : path === '/signup' ? (
      <SignUpPage />
    ) : path.startsWith('/menu') ? (
      <QRMenu />
    ) : (
      <App />
    )}
    <CookieConsent />
  </StrictMode>,
)
