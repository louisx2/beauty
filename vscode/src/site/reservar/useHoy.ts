import { useEffect, useState } from 'react';
import { isoLocal, msHastaMedianoche } from './calendario';

/** La fecha de hoy ("AAAA-MM-DD"). Cambia sola a la medianoche y al volver a la pestaña: una pestaña que quedó
 *  abierta de un día para otro no deja reservar ayer. */
export function useHoy(): string {
  const [hoy, setHoy] = useState(() => isoLocal(new Date()));
  useEffect(() => {
    let t = 0;
    const programar = () => {
      t = window.setTimeout(() => { setHoy(isoLocal(new Date())); programar(); }, msHastaMedianoche(new Date()));
    };
    const alVolver = () => { if (document.visibilityState === 'visible') setHoy(isoLocal(new Date())); };
    programar();
    document.addEventListener('visibilitychange', alVolver);
    return () => { window.clearTimeout(t); document.removeEventListener('visibilitychange', alVolver); };
  }, []);
  return hoy;
}
