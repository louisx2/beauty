// primero los tokens: los CSS de los componentes se emiten después y les ganan por orden
import './theme/tokens.css';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import SiteHeader from './header/SiteHeader';
import SiteMenu from './header/SiteMenu';
import { useScrollSpy } from './header/useScrollSpy';
import { irASeccion } from './header/navegacion';
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
  const navigate = useNavigate();

  const abrirMenu = useCallback((boton: HTMLButtonElement) => {
    abridor.current = boton;
    setOrigen(origenDesdeBoton(boton.getBoundingClientRect()));
    setMenuAbierto(true);
  }, []);

  const cerrarMenu = useCallback(() => {
    setMenuAbierto(false);
    abridor.current?.focus({ preventScroll: true });
  }, []);

  const ir = useCallback((id: string) => {
    setMenuAbierto(false);
    if (!conSecciones) { navigate(`/#${id}`); return; }
    requestAnimationFrame(() => irASeccion(id));
  }, [conSecciones, navigate]);

  return (
    <div className="site" data-site-tema={tema}>
      <a className="s-skip" href="#s-contenido">Saltar al contenido</a>
      <SiteHeader conSecciones={conSecciones} activa={activa} solida={solida} menuAbierto={menuAbierto} onAbrirMenu={abrirMenu} onIr={ir} />
      <SiteMenu abierto={menuAbierto} origen={origen} activa={activa} tema={tema} onTema={setTema} onCerrar={cerrarMenu} onIr={ir} />
      <main id="s-contenido" className={conSecciones ? 's-main' : 's-main s-main--pad'}>{children}</main>
      <SiteFooter />
      <WhatsAppButton elevado={whatsappElevado} />
    </div>
  );
}
