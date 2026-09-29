import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import './CarruselCentrado.css';

interface Props { etiqueta: string; className?: string; children: ReactNode }

/**
 * En computadora, todos en fila. En tableta y celular, uno a la vez: al deslizar cada uno se
 * detiene en el centro, los de los lados se ven tenues y hay puntitos que se pueden tocar (spec §5.6).
 */
export default function CarruselCentrado({ etiqueta, className = '', children }: Props) {
  const fila = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);
  const [centro, setCentro] = useState(0);

  const marcar = useCallback(() => {
    const f = fila.current;
    if (!f) return;
    const medio = f.getBoundingClientRect().left + f.clientWidth / 2;
    let mejor = 0;
    let distancia = Infinity;
    [...f.children].forEach((it, i) => {
      const r = it.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - medio);
      if (d < distancia) { distancia = d; mejor = i; }
    });
    setCentro(mejor);
  }, []);

  useEffect(() => {
    const f = fila.current;
    if (!f) return;
    let raf = 0;
    const alMover = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; marcar(); }); };
    f.addEventListener('scroll', alMover, { passive: true });
    const ro = new ResizeObserver(alMover);
    ro.observe(f);
    return () => { f.removeEventListener('scroll', alMover); ro.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [marcar]);

  const ir = (i: number) => {
    const f = fila.current;
    const it = f?.children[i] as HTMLElement | undefined;
    if (!f || !it) return;
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    f.scrollTo({ left: it.offsetLeft - (f.clientWidth - it.clientWidth) / 2, behavior: reducir ? 'instant' : 'smooth' });
  };

  return (
    <div className={`s-carr ${className}`} role="group" aria-roledescription="carrusel" aria-label={etiqueta}>
      <div className="s-carr-fila" ref={fila}>
        {items.map((hijo, i) => (
          <div key={i} className={`s-carr-item ${i === centro ? 'is-centro' : ''}`}>{hijo}</div>
        ))}
      </div>
      <div className="s-carr-puntos">
        {items.map((_, i) => (
          <button key={i} type="button" className={i === centro ? 'is-on' : ''} onClick={() => ir(i)}
            aria-label={`Ir al ${i + 1} de ${items.length}`} aria-current={i === centro ? 'true' : undefined} />
        ))}
      </div>
    </div>
  );
}
