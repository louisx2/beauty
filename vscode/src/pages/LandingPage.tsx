import SiteLayout from '../site/SiteLayout';
// primero los estilos comunes: los de cada sección se emiten después y les ganan por orden
import '../site/landing/landing.css';
import Hero from '../site/landing/Hero';
import TrustStrip from '../site/landing/TrustStrip';
import Services from '../site/landing/Services';
import Packages from '../site/landing/Packages';
import About from '../site/landing/About';
import Philosophy from '../site/landing/Philosophy';
import Testimonials from '../site/landing/Testimonials';
import { usePaquetesPublicos, useServiciosPublicos } from '../site/landing/useDatosPublicos';
import { testimonios } from '../config/testimonios';

/** Página principal (spec §5). Solo lista en el menú las secciones que existen. */
export default function LandingPage() {
  const servicios = useServiciosPublicos();
  const { paquetes } = usePaquetesPublicos();
  const conPaquetes = paquetes.length > 0; // sin paquetes activos (o sin red) la sección no aparece
  const conOpiniones = testimonios.length > 0;
  const secciones = [
    's-inicio', 's-servicios',
    ...(conPaquetes ? ['s-paquetes'] : []),
    's-nosotros',
    ...(conOpiniones ? ['s-opiniones'] : []),
  ];
  return (
    <SiteLayout conSecciones secciones={secciones}>
      <Hero />
      <TrustStrip />
      <Services servicios={servicios} />
      {conPaquetes && <Packages paquetes={paquetes} />}
      <About />
      <Philosophy />
      <Testimonials />
    </SiteLayout>
  );
}
