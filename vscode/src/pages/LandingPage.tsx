import SiteLayout from '../site/SiteLayout';
// primero los estilos comunes: los de cada sección se emiten después y les ganan por orden
import '../site/landing/landing.css';
import Hero from '../site/landing/Hero';
import TrustStrip from '../site/landing/TrustStrip';
import Services from '../site/landing/Services';
import Packages from '../site/landing/Packages';
import { usePaquetesPublicos, useServiciosPublicos } from '../site/landing/useDatosPublicos';

/** Página principal (spec §5). Solo lista en el menú las secciones que existen. */
export default function LandingPage() {
  const servicios = useServiciosPublicos();
  const { paquetes } = usePaquetesPublicos();
  const conPaquetes = paquetes.length > 0; // sin paquetes activos (o sin red) la sección no aparece
  const secciones = ['s-inicio', 's-servicios', ...(conPaquetes ? ['s-paquetes'] : [])];
  return (
    <SiteLayout conSecciones secciones={secciones}>
      <Hero />
      <TrustStrip />
      <Services servicios={servicios} />
      {conPaquetes && <Packages paquetes={paquetes} />}
    </SiteLayout>
  );
}
