import { useEffect } from 'react';
import SiteLayout from '../site/SiteLayout';
import MisCitas from '../site/portal/MisCitas';
import { useSeccionesPresentes } from '../site/header/usePresencia';

/** /mis-citas con la cara nueva (spec §6.3). El diseño anterior sigue en /diseno-anterior/mis-citas. */
export default function ClientPortal() {
  const secciones = useSeccionesPresentes();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <SiteLayout secciones={secciones}>
      <MisCitas />
    </SiteLayout>
  );
}
