import { useEffect, useState } from 'react';
import { seccionActiva } from './secciones';

/** Qué sección [data-spy] cruza el tercio de la pantalla y si ya se bajó (barra sólida). */
export function useScrollSpy(activo: boolean): { activa: string | null; solida: boolean } {
  const [activa, setActiva] = useState<string | null>(null);
  const [solida, setSolida] = useState(false);

  useEffect(() => {
    let raf = 0;
    const medir = () => {
      raf = 0;
      setSolida(window.scrollY > 30);
      if (!activo) return;
      const marcas = [...document.querySelectorAll<HTMLElement>('[data-spy]')].map((el) => ({
        id: el.dataset.spy || el.id,
        top: el.getBoundingClientRect().top,
      }));
      setActiva(seccionActiva(marcas, window.innerHeight * 0.33));
    };
    const alMover = () => { if (!raf) raf = requestAnimationFrame(medir); };
    medir();
    window.addEventListener('scroll', alMover, { passive: true });
    window.addEventListener('resize', alMover);
    return () => {
      window.removeEventListener('scroll', alMover);
      window.removeEventListener('resize', alMover);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [activo]);

  return { activa, solida };
}
