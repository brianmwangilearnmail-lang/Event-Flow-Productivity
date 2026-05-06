import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App.tsx';
import './index.css';

const root = document.getElementById('root');
if (!root) {
  document.body.innerHTML = '<div style="background:red;color:white;padding:2rem;font-size:1.5rem">FATAL: #root element not found</div>';
} else {
  try {
    createRoot(root).render(
      <StrictMode>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </StrictMode>,
    );
  } catch (e: any) {
    root.innerHTML = `<div style="background:#1a1a1a;color:#f87171;padding:2rem;font-family:monospace;font-size:0.85rem"><h1 style="color:#B8860B;font-size:1.5rem">⚠ Root Render Failed</h1><pre style="margin-top:1rem;white-space:pre-wrap">${e?.message}\n${e?.stack}</pre></div>`;
  }
}
