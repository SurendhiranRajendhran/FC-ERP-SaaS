import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import QRMenu from './QRMenu.jsx'

const path = window.location.pathname;
const isMenu = path.startsWith('/menu');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isMenu ? <QRMenu /> : <App />}
  </StrictMode>,
)
