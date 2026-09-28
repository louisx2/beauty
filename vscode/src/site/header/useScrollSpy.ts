import { useEffect, useState } from 'react';
import { lineaDeSeccion, seccionActiva } from './secciones';

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
      const barra = document.querySelector('.s-nav-in')?.getBoundingClientRect().height ?? 64;
      const alFondo = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      setActiva(seccionActiva(marcas, lineaDeSeccion(window.innerHeight, barra), alFondo));
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
