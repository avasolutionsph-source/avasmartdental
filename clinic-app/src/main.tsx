import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Clear chunk error flag on successful load
sessionStorage.removeItem('chunk_error_reload');

// Register the PWA service worker. autoUpdate mode silently reloads when a
// new build is available — the next route change picks up the fresh code.
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
