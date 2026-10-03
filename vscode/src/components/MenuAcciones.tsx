import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import './MenuAcciones.css';

export interface ItemMenu {
  id: string;
  etiqueta: string;
  icono?: ReactNode;
  onSelect: () => void;
  /** En rojo y separado del resto (cancelar, eliminar). Va al final de la lista. */
  peligro?: boolean;
}

interface Props {
  items: ItemMenu[];
  /** Nombre del botón para lectores de pantalla, p. ej. "Más acciones para la cita de Ana". */
  etiqueta: string;
}

const MARGEN = 8;

/** Botón "⋯" con un menú de acciones. El menú va en una capa fija sobre la página, así no lo recorta la
 *  tarjeta; se abre hacia arriba si abajo no cabe, y se cierra con Escape, al tocar fuera o al desplazar. */
export default function MenuAcciones({ items, etiqueta }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();

  const cerrar = useCallback((devolverFoco: boolean) => {
    setAbierto(false);
    setPos(null);
    if (devolverFoco) boton.current?.focus({ preventScroll: true });
  }, []);

  // junto al botón, alineado a su borde derecho; arriba si abajo no cabe
  useLayoutEffect(() => {
    if (!abierto || !boton.current || !menu.current) return;
    const b = boton.current.getBoundingClientRect();
    const m = menu.current.getBoundingClientRect();
    const abajo = b.bottom + 6;
    const top = abajo + m.height <= window.innerHeight - MARGEN ? abajo : Math.max(MARGEN, b.top - 6 - m.height);
    const left = Math.min(Math.max(MARGEN, b.right - m.width), window.innerWidth - m.width - MARGEN);
    setPos({ top, left });
  }, [abierto]);

  // el foco va a la primera opción cuando el menú ya se ve (oculto no lo recibe)
  useEffect(() => {
    if (pos) menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
  }, [pos]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menu.current?.contains(t) || boton.current?.contains(t)) return;
      cerrar(false);
    };
    const alDesplazar = (e: Event) => {
      if (menu.current?.contains(e.target as Node)) return;
      cerrar(false);
    };
    const alCambiarTamano = () => cerrar(false);
    document.addEventListener('pointerdown', fuera);
    window.addEventListener('scroll', alDesplazar, true);
    window.addEventListener('resize', alCambiarTamano);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      window.removeEventListener('scroll', alDesplazar, true);
      window.removeEventListener('resize', alCambiarTamano);
    };
  }, [abierto, cerrar]);

  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    const opciones = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const i = opciones.indexOf(document.activeElement as HTMLElement);
    const ir = (n: number) => { e.preventDefault(); opciones[(n + opciones.length) % opciones.length]?.focus(); };
    if (e.key === 'Escape') { e.preventDefault(); cerrar(true); }
    else if (e.key === 'ArrowDown') ir(i + 1);
    else if (e.key === 'ArrowUp') ir(i - 1);
    else if (e.key === 'Home') ir(0);
    else if (e.key === 'End') ir(opciones.length - 1);
    else if (e.key === 'Tab') cerrar(false);
  };

  return (
    <>
      <button
        ref={boton}
        type="button"
        className="macc__boton"
        aria-label={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? id : undefined}
        onClick={(e) => { e.stopPropagation(); if (abierto) cerrar(false); else setAbierto(true); }}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !abierto) { e.preventDefault(); setAbierto(true); } }}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {abierto && createPortal(
        // los eventos de un portal suben por el árbol de React: sin esto, tocar una opción también "tocaría" la tarjeta
        <div
          ref={menu}
          id={id}
          role="menu"
          aria-label={etiqueta}
          className="macc__menu"
          style={pos ?? { top: 0, left: 0, visibility: 'hidden' }}
          onKeyDown={alTeclear}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={`macc__item${it.peligro ? ' macc__item--peligro' : ''}`}
              onClick={() => { cerrar(true); it.onSelect(); }}
            >
              {it.icono}
              <span>{it.etiqueta}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
