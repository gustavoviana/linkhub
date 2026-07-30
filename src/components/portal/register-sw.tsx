'use client';

import { useEffect } from 'react';

// Registra o service worker da central. Sem ele o Chrome não oferece
// instalar o app, e é o mesmo requisito que o app Android exige do site.

export function RegisterSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const timer = window.setTimeout(() => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
