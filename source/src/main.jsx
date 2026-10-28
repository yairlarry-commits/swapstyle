import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Fade out the splash screen from index.html
const splash = document.getElementById('ss-splash');
if (splash) {
  splash.classList.add('gone');
  window.setTimeout(() => splash.remove(), 500);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
