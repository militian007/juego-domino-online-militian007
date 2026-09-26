import { useEffect, useState } from 'react';

/**
 * INSTALAR LA APP (seccion 209), copiado del truco (`usePWAInstall.ts`). El
 * `beforeinstallprompt` de Chrome se atrapa en `index.html` ANTES de que monte
 * React y se guarda en `window.__pwaInstallEvent`: asi ningun componente se lo
 * pierde por llegar tarde (la pastilla vieja lo escuchaba sola y a veces no le
 * llegaba nunca).
 */
function esIOS() {
  if (typeof window === 'undefined') return false;
  return /ipad|iphone|ipod/i.test(navigator.userAgent) && !('MSStream' in window);
}

function instalada() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

export function usePWAInstall() {
  const [prompt, setPrompt] = useState(() => window.__pwaInstallEvent ?? null);
  const [yaInstalada, setYaInstalada] = useState(instalada);

  useEffect(() => {
    if (instalada()) {
      setYaInstalada(true);
      return undefined;
    }
    if (window.__pwaInstallEvent && !prompt) setPrompt(window.__pwaInstallEvent);

    const alOfrecer = (e) => {
      e.preventDefault();
      window.__pwaInstallEvent = e;
      setPrompt(e);
    };
    const alEstarListo = () => {
      if (window.__pwaInstallEvent) setPrompt(window.__pwaInstallEvent);
    };
    const alInstalar = () => {
      setYaInstalada(true);
      setPrompt(null);
      window.__pwaInstallEvent = null;
    };
    window.addEventListener('beforeinstallprompt', alOfrecer);
    window.addEventListener('pwa-install-ready', alEstarListo);
    window.addEventListener('appinstalled', alInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', alOfrecer);
      window.removeEventListener('pwa-install-ready', alEstarListo);
      window.removeEventListener('appinstalled', alInstalar);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setYaInstalada(true);
      setPrompt(null);
      window.__pwaInstallEvent = null;
    }
  };

  return {
    canInstall: !!prompt && !yaInstalada,
    isIOS: esIOS() && !yaInstalada,
    isInstalled: yaInstalada,
    install
  };
}
