import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import MenuButton from './MenuButton';
import { SECCIONES } from './secciones';
import type { Punto } from './menuOrigen';
import type { Tema } from '../theme/tema';
import { FOTO_MENU, LOGO, LOGO_CLARO, MONOGRAMA } from '../brand';
import { site } from '../../config/site';
import './SiteMenu.css';

interface Props {
  abierto: boolean;
  origen: Punto;
  activa: string | null;
  tema: Tema;
  onTema: (t: Tema) => void;
  onCerrar: () => void;
  onIr: (id: string) => void;
}

const Luna = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>);
const Sol = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>);

/** Se abre en círculo desde el botón; las secciones suben una tras otra (spec §4.3). */
export default function SiteMenu({ abierto, origen, activa, tema, onTema, onCerrar, onIr }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const cerrar = useRef<HTMLButtonElement>(null);
  const [x, setX] = useState(false);       // las líneas se cruzan un instante después de abrir
  const [listo, setListo] = useState(false); // terminó la entrada: el hover ya responde sin retrasos

  useEffect(() => {
    if (!abierto) { setX(false); setListo(false); return; }
    const t1 = window.setTimeout(() => setX(true), 120);
    const t2 = window.setTimeout(() => setListo(true), 1400);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [abierto]);

  // Escape cierra, Tab no se escapa del menú y el fondo no se desplaza
  useEffect(() => {
    if (!abierto) return;
    const el = panel.current;
    panel.current?.scrollTo(0, 0);
    cerrar.current?.focus({ preventScroll: true });
    const enfocables = () => [...(el?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])];
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCerrar(); return; }
      if (e.key !== 'Tab') return;
      const f = enfocables();
      if (!f.length) return;
      const primero = f[0], ultimo = f[f.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    };
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', alTeclear);
    return () => { document.removeEventListener('keydown', alTeclear); document.body.style.overflow = antes; };
  }, [abierto, onCerrar]);

  const estilo = { '--mx': `${origen.x}px`, '--my': `${origen.y}px` } as CSSProperties;

  return (
    <div id="s-menu" ref={panel} role="dialog" aria-modal="true" aria-label="Menú" aria-hidden={!abierto} {...(!abierto ? { inert: true } : {})}
      className={`s-menu ${abierto ? 'is-open' : ''} ${listo ? 'is-listo' : ''}`} style={estilo}>
      <div className="s-menu-glow" aria-hidden="true" />
      <img className="s-menu-mono" src={MONOGRAMA} alt="" aria-hidden="true" />

      <div className="s-wrap s-menu-top">
        <a className="s-logo" href="/#s-inicio" onClick={(e) => { e.preventDefault(); onIr('s-inicio'); }} aria-label="Ir al inicio">
          <img className="s-lc" src={LOGO} alt="" /><img className="s-lw" src={LOGO_CLARO} alt="" />
        </a>
        <MenuButton ref={cerrar} cerrar={x} etiqueta="Cerrar menú" controla="s-menu" expandido onClick={onCerrar} />
      </div>

      <div className="s-wrap s-menu-body">
        <nav className="s-menu-list" aria-label="Secciones">
          {SECCIONES.map((s, i) => (
            <a key={s.id} href={`/#${s.id}`} style={{ '--i': i } as CSSProperties}
              className={activa === s.id ? 'is-on' : ''} aria-current={activa === s.id ? 'true' : undefined}
              onClick={(e) => { e.preventDefault(); onIr(s.id); }}>
              <span className="s-ml-n">{String(i + 1).padStart(2, '0')}</span>
              <span className="s-ml-t"><span>{s.etiqueta}</span></span>
              <span className="s-ml-here">Estás aquí</span>
              <span className="s-ml-arrow" aria-hidden="true">→</span>
            </a>
          ))}
        </nav>
        <aside className="s-menu-side" aria-hidden="true">
          <div className="s-ms-arch"><img src={FOTO_MENU} alt="" loading="lazy" /></div>
          <p className="s-ms-q">"Belleza y bienestar con responsabilidad."</p>
        </aside>
      </div>

      <div className="s-wrap s-menu-bottom">
        <div className="s-ts">
          <span className="s-ts-lbl" id="s-ts-lbl">Apariencia</span>
          <div className="s-ts-seg" role="radiogroup" aria-labelledby="s-ts-lbl" data-on={tema}>
            <i className="s-ts-knob" aria-hidden="true" />
            <button type="button" role="radio" aria-checked={tema === 'oscuro'} className={tema === 'oscuro' ? 'is-on' : ''} onClick={() => onTema('oscuro')}><Luna />Marrón</button>
            <button type="button" role="radio" aria-checked={tema === 'claro'} className={tema === 'claro' ? 'is-on' : ''} onClick={() => onTema('claro')}><Sol />Beige</button>
          </div>
        </div>
        <div className="s-menu-cta">
          <Link className="s-btn s-btn-solid" to="/reservar" onClick={onCerrar}>Agendar cita <span className="s-ar">→</span></Link>
          <Link className="s-btn s-btn-line" to="/mis-citas" onClick={onCerrar}>Mis citas</Link>
        </div>
        <div className="s-menu-info">
          <span>{site.hours}</span>
          <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp {site.phone}</a>
          <a href={`https://www.instagram.com/${site.instagram}`} target="_blank" rel="noopener noreferrer">@{site.instagram}</a>
        </div>
      </div>
    </div>
  );
}
