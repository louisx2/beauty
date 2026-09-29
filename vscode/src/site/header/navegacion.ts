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

// nombres de las secciones del sitio anterior (barra vieja, enlaces guardados o compartidos)
const ALIAS_ANTERIORES: Record<string, string> = {
  hero: 's-inicio', servicios: 's-servicios', paquetes: 's-paquetes',
  nosotros: 's-nosotros', mision: 's-filosofia', testimonios: 's-opiniones', contacto: 's-contacto',
};

/** "#paquetes" (sitio anterior) o "#s-paquetes" → id de la sección; null si el hash está mal formado. */
export function idDeHash(hash: string): string | null {
  let id: string;
  try { id = decodeURIComponent(hash.replace(/^#/, '')); } catch { return null; }
  return ALIAS_ANTERIORES[id] ?? id;
}

/** Al llegar con "/#s-servicios" (p. ej. desde el menú en /reservar) baja a esa sección. */
export function useIrAlHash(): void {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = idDeHash(hash);
    if (!id) return; // un "#%" mal formado no tumba la página
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
      window.removeEventListener('pointerdown', soltar);
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
          window.addEventListener('pointerdown', soltar, { passive: true });
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
