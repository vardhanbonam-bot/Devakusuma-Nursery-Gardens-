import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Force-clear cache storage and trigger a service worker update on version changes to guarantee live update rendering
try {
  const CURRENT_APP_VERSION = "4.0.0";
  const storedVersion = localStorage.getItem("devakusuma_app_version");
  if (storedVersion !== CURRENT_APP_VERSION) {
    localStorage.setItem("devakusuma_app_version", CURRENT_APP_VERSION);
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name);
        }
      });
    }
    // Also unregister old service workers to let the new version register cleanly
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        let unregisteredAny = false;
        for (const registration of registrations) {
          registration.unregister();
          unregisteredAny = true;
        }
        if (unregisteredAny) {
          window.location.reload();
        }
      });
    }
  }
} catch (e) {
  console.warn("Could not execute version auto-update check:", e);
}

// Register service worker for standalone PWA mobile application support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('Progressive Web App service worker registered successfully!');
        // Trigger background check for service worker updates immediately
        reg.update();
      })
      .catch(err => {
        console.warn('Service Worker registration skipped:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
