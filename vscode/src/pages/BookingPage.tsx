import { useEffect } from 'react';
import SiteLayout from '../site/SiteLayout';
import Reservar from '../site/reservar/Reservar';
import { useSeccionesPresentes } from '../site/header/usePresencia';

/** /reservar con la cara nueva (spec §6.1). El diseño anterior sigue en /diseno-anterior/reservar. */
export default function BookingPage() {
  const secciones = useSeccionesPresentes();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <SiteLayout secciones={secciones} whatsappElevado>
      <Reservar />
    </SiteLayout>
  );
}
