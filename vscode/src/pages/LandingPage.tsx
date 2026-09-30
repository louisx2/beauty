import SiteLayout from '../site/SiteLayout';
// primero los estilos comunes: los de cada sección se emiten después y les ganan por orden
import '../site/landing/landing.css';
import Hero from '../site/landing/Hero';
import TrustStrip from '../site/landing/TrustStrip';
import Services from '../site/landing/Services';
import Packages from '../site/landing/Packages';
import About from '../site/landing/About';
import Philosophy from '../site/landing/Philosophy';
import Team from '../site/landing/Team';
import Testimonials from '../site/landing/Testimonials';
import CtaBand from '../site/landing/CtaBand';
import Contact from '../site/landing/Contact';
import { useEquipoPublico, usePaquetesPublicos, useServiciosPublicos } from '../site/landing/useDatosPublicos';
import { seccionesPresentes } from '../site/header/secciones';
import { testimonios } from '../config/testimonios';

/**
 * Página principal (spec §5). Paquetes, Equipo y Opiniones dependen de datos: una sola lista decide qué
 * se pinta y qué ofrecen el menú y las pestañas.
 */
export default function LandingPage() {
  const servicios = useServiciosPublicos();
  const { paquetes, estilo } = usePaquetesPublicos();
  const equipo = useEquipoPublico();
  const secciones = seccionesPresentes({
    paquetes: paquetes.length > 0, // sin paquetes activos (o sin red) la sección no aparece
    equipo: equipo.length > 0, // nadie marcado para la web: tampoco
    opiniones: testimonios.length > 0,
  });
  const hay = (id: string) => secciones.includes(id);
  return (
    <SiteLayout conSecciones secciones={secciones}>
      <Hero />
      <TrustStrip />
      <Services servicios={servicios} />
      {hay('s-paquetes') && <Packages paquetes={paquetes} estilo={estilo} />}
      <About />
      <Philosophy />
      {hay('s-equipo') && <Team miembros={equipo} />}
      {hay('s-opiniones') && <Testimonials />}
      <CtaBand />
      <Contact />
    </SiteLayout>
  );
}
