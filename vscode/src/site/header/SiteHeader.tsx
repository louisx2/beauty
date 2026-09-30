import { useEffect, useRef, type MouseEvent, type RefObject } from 'react';
import MenuButton from './MenuButton';
import type { Seccion } from './secciones';
import { clicEspecial } from './navegacion';
import { LOGO, LOGO_CLARO } from '../brand';
import './SiteHeader.css';

interface Props {
  conSecciones: boolean;
  /** secciones que la página tiene (la barra y las pestañas muestran solo esas) */
  secciones: Seccion[];
  activa: string | null;
  solida: boolean;
  menuAbierto: boolean;
  onAbrirMenu: (boton: HTMLButtonElement) => void;
  onIr: (id: string) => void;
  /** si viene, es la ref del botón MENÚ (el contenedor lo mide para el origen del círculo) */
  botonRef?: RefObject<HTMLButtonElement | null>;
  /** con el menú abierto la barra queda inerte */
  inerte?: boolean;
}

/** Celular/tableta: logo | MENÚ (+ pestañas al bajar). Computadora: logo | secciones centradas | MENÚ. */
export default function SiteHeader({ conSecciones, secciones, activa, solida, menuAbierto, onAbrirMenu, onIr, botonRef, inerte = false }: Props) {
  const botonPropio = useRef<HTMLButtonElement>(null);
  const boton = botonRef ?? botonPropio;
  const ir = (id: string) => (e: MouseEvent) => { if (clicEspecial(e)) return; e.preventDefault(); onIr(id); };

  return (
    <header className={`s-nav ${solida ? 'is-solida' : ''}`} inert={inerte}>
      <div className="s-wrap s-nav-in">
        <a className="s-logo" href="/#s-inicio" onClick={ir('s-inicio')} aria-label="Anadsll Beauty Esthetic, ir al inicio">
          <img className="s-lc" src={LOGO} alt="" width={359} height={200} />
          <img className="s-lw" src={LOGO_CLARO} alt="" width={359} height={200} />
        </a>
        {conSecciones && (
          <nav className="s-links" aria-label="Secciones">
            {secciones.map((s) => (
              <a key={s.id} href={`#${s.id}`} onClick={ir(s.id)}
                className={activa === s.id ? 'is-on' : ''} aria-current={activa === s.id ? 'true' : undefined}>
                {s.etiqueta}
              </a>
            ))}
          </nav>
        )}
        <MenuButton ref={boton} className="s-nav-menu" controla="s-menu" expandido={menuAbierto}
          onClick={() => boton.current && onAbrirMenu(boton.current)} />
      </div>
      {conSecciones && <Pestanas secciones={secciones} activa={activa} onIr={onIr} />}
    </header>
  );
}

/** Fila de pestañas (celular y tableta): la activa va rellena y se centra sola. */
function Pestanas({ secciones, activa, onIr }: { secciones: Seccion[]; activa: string | null; onIr: (id: string) => void }) {
  const fila = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const f = fila.current, el = f?.querySelector<HTMLElement>('.is-on');
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (f && el) f.scrollTo({ left: el.offsetLeft - f.clientWidth / 2 + el.offsetWidth / 2, behavior: reducir ? 'auto' : 'smooth' });
  }, [activa]);
  return (
    <div className="s-chips" ref={fila}>
      {secciones.map((s) => (
        <button key={s.id} type="button" className={`s-chip ${activa === s.id ? 'is-on' : ''}`} onClick={() => onIr(s.id)}
          aria-current={activa === s.id ? 'true' : undefined}>
          <span>{s.etiqueta}</span>
        </button>
      ))}
    </div>
  );
}
