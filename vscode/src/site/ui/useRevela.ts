import { useEffect, useRef } from 'react';

/**
 * Aparece con un fundido y un leve ascenso al entrar en pantalla, una sola vez (spec §3.7).
 * Se usa con la clase `s-rv`. Nunca dentro de un carrusel: ahí el deslizamiento parecía trabado.
 */
export function useRevela<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { el.classList.add('is-in'); return; }
    const io = new IntersectionObserver((entradas) => {
      if (entradas.some((e) => e.isIntersecting)) { el.classList.add('is-in'); io.disconnect(); }
    }, { threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}
