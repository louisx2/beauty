import { useEffect, useRef, type MouseEvent } from 'react';
import MenuButton from './MenuButton';
import { SECCIONES } from './secciones';
import { LOGO, LOGO_CLARO } from '../brand';
import './SiteHeader.css';

interface Props {
  conSecciones: boolean;
  activa: string | null;
  solida: boolean;
  menuAbierto: boolean;
  onAbrirMenu: (boton: HTMLButtonElement) => void;
  onIr: (id: string) => void;
}

/** Celular/tableta: logo | MENÚ (+ pestañas al bajar). Computadora: logo | secciones centradas | MENÚ. */
export default function SiteHeader({ conSecciones, activa, solida, menuAbierto, onAbrirMenu, onIr }: Props) {
  const boton = useRef<HTMLButtonElement>(null);
  const ir = (id: string) => (e: MouseEvent) => { e.preventDefault(); onIr(id); };

  return (
    <header className={`s-nav ${solida ? 'is-solida' : ''}`}>
      <div className="s-wrap s-nav-in">
        <a className="s-logo" href="/#s-inicio" onClick={ir('s-inicio')} aria-label="Anadsll Beauty Esthetic, ir al inicio">
          <img className="s-lc" src={LOGO} alt="" />
          <img className="s-lw" src={LOGO_CLARO} alt="" />
        </a>
        {conSecciones && (
          <nav className="s-links" aria-label="Secciones">
            {SECCIONES.map((s) => (
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
      {conSecciones && <Pestanas activa={activa} onIr={onIr} />}
    </header>
  );
}

/** Fila de pestañas (celular y tableta): la activa va rellena y se centra sola. */
function Pestanas({ activa, onIr }: { activa: string | null; onIr: (id: string) => void }) {
  const fila = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const f = fila.current, el = f?.querySelector<HTMLElement>('.is-on');
    if (f && el) f.scrollTo({ left: el.offsetLeft - f.clientWidth / 2 + el.offsetWidth / 2, behavior: 'smooth' });
  }, [activa]);
  return (
    <div className="s-chips" ref={fila}>
      {SECCIONES.map((s) => (
        <button key={s.id} type="button" className={`s-chip ${activa === s.id ? 'is-on' : ''}`} onClick={() => onIr(s.id)}>
          {s.etiqueta}
        </button>
      ))}
    </div>
  );
}
