import SiteLayout from '../site/SiteLayout';
// primero los estilos comunes: los de cada sección se emiten después y les ganan por orden
import '../site/landing/landing.css';
import Hero from '../site/landing/Hero';
import TrustStrip from '../site/landing/TrustStrip';
import Services from '../site/landing/Services';
import { useServiciosPublicos } from '../site/landing/useDatosPublicos';

/** Página principal (spec §5). Solo lista en el menú las secciones que existen. */
export default function LandingPage() {
  const servicios = useServiciosPublicos();
  const secciones = ['s-inicio', 's-servicios'];
  return (
    <SiteLayout conSecciones secciones={secciones}>
      <Hero />
      <TrustStrip />
      <Services servicios={servicios} />
    </SiteLayout>
  );
}
