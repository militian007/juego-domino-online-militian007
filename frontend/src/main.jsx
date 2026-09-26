import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import MarcoDeTelefono from './components/MarcoDeTelefono.jsx';
import './index.css';
import { varianteDeMano } from './components/game/pruebaDeMano.js';

// `?mano=a|b|c` (seccion 208): se guarda al entrar, aunque se entre por la portada.
varianteDeMano();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MarcoDeTelefono>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </MarcoDeTelefono>
  </React.StrictMode>
);

// El service worker. Se registra solo en la version publicada: en desarrollo
// estorba al recargado en caliente y no hace falta para nada.
//
// Sin el, el navegador NO ofrece instalar la app: Chrome exige un service
// worker con manejador de `fetch` antes de mostrar esa opcion.
// `?diag=1`: el vigilante del dibujo manda la mesa entera en cada jugada (§172).
if (import.meta.env.DEV) {
  try {
    if (new URLSearchParams(window.location.search).get('diag') === '1') localStorage.setItem('diagDibujo', '1');
    if (new URLSearchParams(window.location.search).get('diag') === '0') localStorage.removeItem('diagDibujo');
  } catch { /* nada */ }
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('No se pudo registrar el service worker:', err?.message);
    });
  });
}
