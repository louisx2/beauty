// primero los tokens: los CSS de los componentes se emiten después y les ganan por orden
import './theme/tokens.css';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import SiteHeader from './header/SiteHeader';
import SiteMenu from './header/SiteMenu';
import { useScrollSpy } from './header/useScrollSpy';
import { irASeccion, useIrAlHash } from './header/navegacion';
import { origenDesdeBoton, type Punto } from './header/menuOrigen';
import { useSiteTema } from './theme/useSiteTema';
import SiteFooter from './SiteFooter';
import WhatsAppButton from './WhatsAppButton';
import './SiteLayout.css';

interface Props { children: ReactNode; conSecciones?: boolean; whatsappElevado?: boolean }

/** Todo lo que ve la clienta va dentro: tema, barra, menú, pie y WhatsApp. */
export default function SiteLayout({ children, conSecciones = false, whatsappElevado = false }: Props) {
  const [tema, setTema] = useSiteTema();
  const { activa, solida } = useScrollSpy(conSecciones);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [origen, setOrigen] = useState<Punto>({ x: 0, y: 0 });
  const abridor = useRef<HTMLButtonElement | null>(null);
  const botonMenu = useRef<HTMLButtonElement>(null);
  const estabaAbierto = useRef(false);
  const navigate = useNavigate();
  useIrAlHash(); // llegar con "/#s-servicios" baja a la sección; sin hash no hace nada

  // con el menú cerrado el círculo de 0 px ya está sobre MENÚ: al abrir solo crece (también tras girar)
  useLayoutEffect(() => {
    const medir = () => {
      if (botonMenu.current) setOrigen(origenDesdeBoton(botonMenu.current.getBoundingClientRect()));
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  const abrirMenu = useCallback((boton: HTMLButtonElement) => {
    abridor.current = boton;
    setOrigen(origenDesdeBoton(boton.getBoundingClientRect()));
    setMenuAbierto(true);
  }, []);

  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);

  // al cerrar por cualquier camino el foco vuelve a MENÚ; después del render, cuando la barra ya no está inerte
  useEffect(() => {
    if (estabaAbierto.current && !menuAbierto) abridor.current?.focus({ preventScroll: true });
    estabaAbierto.current = menuAbierto;
  }, [menuAbierto]);

  const ir = useCallback((id: string) => {
    setMenuAbierto(false);
    if (!conSecciones) { navigate(`/#${id}`); return; }
    requestAnimationFrame(() => irASeccion(id));
  }, [conSecciones, navigate]);

  return (
    <div className="site" data-site-tema={tema}>
      {/* con el menú abierto todo lo de atrás queda inerte: ni Tab ni lector de pantalla llegan */}
      <a className="s-skip" href="#s-contenido" inert={menuAbierto}>Saltar al contenido</a>
      <SiteHeader conSecciones={conSecciones} activa={activa} solida={solida} menuAbierto={menuAbierto} onAbrirMenu={abrirMenu} onIr={ir} botonRef={botonMenu} inerte={menuAbierto} />
      <SiteMenu abierto={menuAbierto} origen={origen} activa={activa} tema={tema} onTema={setTema} onCerrar={cerrarMenu} onIr={ir} />
      <main id="s-contenido" tabIndex={-1} inert={menuAbierto} className={conSecciones ? 's-main' : 's-main s-main--pad'}>{children}</main>
      <SiteFooter inerte={menuAbierto} />
      <WhatsAppButton elevado={whatsappElevado} inerte={menuAbierto} />
    </div>
  );
}
