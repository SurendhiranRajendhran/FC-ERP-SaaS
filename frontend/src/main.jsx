import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import QRMenu from './QRMenu.jsx'

import HomePage from './HomePage.jsx'
import AboutPage from './AboutPage.jsx'
import ContactPage from './ContactPage.jsx'
import SignUpPage from './SignUpPage.jsx'

const path = window.location.pathname;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {path === '/' ? (
      <HomePage />
    ) : path === '/about' ? (
      <AboutPage />
    ) : path === '/contact' ? (
      <ContactPage />
    ) : path === '/signup' ? (
      <SignUpPage />
    ) : path.startsWith('/menu') ? (
      <QRMenu />
    ) : (
      <App />
    )}
  </StrictMode>,
)
