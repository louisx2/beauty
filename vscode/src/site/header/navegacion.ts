import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const suave = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';

/** Baja hasta una sección de la página actual; Inicio vuelve arriba del todo. */
export function irASeccion(id: string): void {
  if (id === 's-inicio') { window.scrollTo({ top: 0, behavior: suave() }); return; }
  document.getElementById(id)?.scrollIntoView({ behavior: suave(), block: 'start' });
}

/** Al llegar con "/#s-servicios" (p. ej. desde el menú en /reservar) baja a esa sección. */
export function useIrAlHash(): void {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    let id: string;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; } // un "#%" mal formado no tumba la página
    // la sección puede tardar en pintarse (datos, carga diferida): reintenta hasta ~2 s
    let intentos = 0;
    let t = 0;
    const probar = () => {
      if (id === 's-inicio' || document.getElementById(id)) { irASeccion(id); return; }
      if (++intentos < 40) t = window.setTimeout(probar, 50);
    };
    t = window.setTimeout(probar, 60);
    return () => window.clearTimeout(t);
  }, [hash]);
}
