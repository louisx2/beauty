import { useEffect, useState } from 'react';
import { fechaLocal } from './fechas';

/** Fecha y minutos de ahora; se actualiza cada minuto (la línea de "ahora" y los huecos que ya pasaron). */
export function useAhora() {
  const leer = () => { const d = new Date(); return { hoy: fechaLocal(d), minutos: d.getHours() * 60 + d.getMinutes() }; };
  const [ahora, setAhora] = useState(leer);
  useEffect(() => {
    const iv = setInterval(() => setAhora(leer()), 60_000);
    return () => clearInterval(iv);
  }, []);
  return ahora;
}
