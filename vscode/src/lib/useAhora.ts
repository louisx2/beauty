import { useEffect, useState } from 'react';
import { fechaLocal } from './fechas';

/**
 * Fecha y minutos de ahora, para la línea de "ahora" y los huecos que ya pasaron. Se pone al día justo al cambiar el
 * minuto (no un minuto después de abrir la pantalla) y al volver a la pantalla: la tableta que estuvo apagada o la
 * pestaña que estuvo atrás no se queda con la hora vieja.
 */
export function useAhora() {
  const leer = () => { const d = new Date(); return { hoy: fechaLocal(d), minutos: d.getHours() * 60 + d.getMinutes() }; };
  const [ahora, setAhora] = useState(leer);
  useEffect(() => {
    let espera: ReturnType<typeof setTimeout>;
    const poner = () => setAhora((antes) => {
      const nuevo = leer();
      return nuevo.hoy === antes.hoy && nuevo.minutos === antes.minutos ? antes : nuevo;
    });
    const alSiguienteMinuto = () => {
      espera = setTimeout(() => { poner(); alSiguienteMinuto(); }, 60_000 - (Date.now() % 60_000) + 50);
    };
    const alVolver = () => { if (document.visibilityState === 'visible') { poner(); clearTimeout(espera); alSiguienteMinuto(); } };
    alSiguienteMinuto();
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    return () => {
      clearTimeout(espera);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, []);
  return ahora;
}
