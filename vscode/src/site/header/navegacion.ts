import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const suave = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';

/** Ctrl/Cmd/Shift/Alt+clic o un botón que no es el principal: se deja al navegador (pestaña nueva, etc.). */
export const clicEspecial = (e: Pick<MouseEvent, 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'button'>): boolean =>
  e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

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
    let intentos = 0;
    let t = 0;
    let fin = 0;
    let ro: ResizeObserver | null = null;
    const soltar = () => {
      ro?.disconnect();
      ro = null;
      window.clearTimeout(fin);
      window.removeEventListener('wheel', soltar);
      window.removeEventListener('touchstart', soltar);
      window.removeEventListener('keydown', soltar);
    };
    const probar = () => {
      if (id === 's-inicio' || document.getElementById(id)) {
        irASeccion(id);
        // si algo de arriba termina de cargar (paquetes, fotos) y empuja la sección, se vuelve a acomodar
        // un rato; en cuanto la persona toca, usa la rueda o el teclado, se la deja en paz
        if (id !== 's-inicio' && typeof ResizeObserver !== 'undefined') {
          let primero = true;
          ro = new ResizeObserver(() => { if (primero) { primero = false; return; } irASeccion(id); });
          ro.observe(document.body);
          fin = window.setTimeout(soltar, 2500);
          window.addEventListener('wheel', soltar, { passive: true });
          window.addEventListener('touchstart', soltar, { passive: true });
          window.addEventListener('keydown', soltar);
        }
        return;
      }
      // la sección puede tardar en pintarse (datos, carga diferida): reintenta hasta ~2 s
      if (++intentos < 40) t = window.setTimeout(probar, 50);
    };
    t = window.setTimeout(probar, 60);
    return () => { window.clearTimeout(t); soltar(); };
  }, [hash]);
}
