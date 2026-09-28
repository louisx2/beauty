// primero los tokens: los CSS de los componentes se emiten después y les ganan por orden
import './theme/tokens.css';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import SiteHeader from './header/SiteHeader';
import SiteMenu from './header/SiteMenu';
import { useScrollSpy } from './header/useScrollSpy';
import { seccionesVisibles } from './header/secciones';
import { irASeccion, useIrAlHash } from './header/navegacion';
import { origenDesdeBoton, type Punto } from './header/menuOrigen';
import { useSiteTema } from './theme/useSiteTema';
import SiteFooter from './SiteFooter';
import WhatsAppButton from './WhatsAppButton';
import './SiteLayout.css';

interface Props {
  children: ReactNode;
  conSecciones?: boolean;
  /** ids de las secciones que la página tiene de verdad; sin lista, las 7 */
  secciones?: string[];
  whatsappElevado?: boolean;
}

/** Todo lo que ve la clienta va dentro: tema, barra, menú, pie y WhatsApp. */
export default function SiteLayout({ children, conSecciones = false, secciones, whatsappElevado = false }: Props) {
  const [tema, setTema] = useSiteTema();
  const { activa, solida } = useScrollSpy(conSecciones);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [origen, setOrigen] = useState<Punto>({ x: 0, y: 0 });
  const abridor = useRef<HTMLButtonElement | null>(null);
  const botonMenu = useRef<HTMLButtonElement>(null);
  const estabaAbierto = useRef(false);
  const navigate = useNavigate();
  useIrAlHash(); // llegar con "/#s-servicios" baja a la sección; sin hash no hace nada

  const clave = secciones?.join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- la clave resume la lista (el arreglo cambia en cada render)
  const lista = useMemo(() => seccionesVisibles(secciones), [clave]);

  // la barra del navegador del teléfono y el fondo al estirar la página toman el color del tema
  useEffect(() => {
    const color = tema === 'claro' ? '#FBF8F3' : '#2A1E17';
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const antesMeta = meta?.content;
    const html = document.documentElement;
    if (meta) meta.content = color;
    html.style.backgroundColor = color;
    return () => {
      if (meta && antesMeta !== undefined) meta.content = antesMeta;
      html.style.backgroundColor = ''; // también borra el que puso index.html antes de cargar la app
    };
  }, [tema]);

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
      <SiteHeader conSecciones={conSecciones} secciones={lista} activa={activa} solida={solida} menuAbierto={menuAbierto} onAbrirMenu={abrirMenu} onIr={ir} botonRef={botonMenu} inerte={menuAbierto} />
      <SiteMenu abierto={menuAbierto} origen={origen} activa={activa} secciones={lista} tema={tema} onTema={setTema} onCerrar={cerrarMenu} onIr={ir} />
      <main id="s-contenido" tabIndex={-1} inert={menuAbierto} className={conSecciones ? 's-main' : 's-main s-main--pad'}>{children}</main>
      <SiteFooter inerte={menuAbierto} />
      <WhatsAppButton elevado={whatsappElevado} inerte={menuAbierto} />
    </div>
  );
}
