import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { FilaCita, FilaPaqueteCliente, FilaServicioCita } from './portal';

export type ResultadoCancelar = 'ok' | 'tarde' | 'error';
export interface DatosPortal { citas: FilaCita[]; servicios: FilaServicioCita[]; paquetes: FilaPaqueteCliente[] }

const CLAVE = 'anadsll-mis-citas-tel';
// sin almacenamiento (modo privado, bloqueado) "Recordar" simplemente no guarda: la página funciona igual
const leerGuardado = (): string => {
  try { return localStorage.getItem(CLAVE) ?? ''; } catch { return ''; }
};
const guardar = (tel: string | null) => {
  try {
    if (tel) localStorage.setItem(CLAVE, tel);
    else localStorage.removeItem(CLAVE);
  } catch { /* sin almacenamiento */ }
};

/** las tres consultas de un teléfono, juntas */
const pedir = (tel: string) => Promise.all([
  supabase.rpc('get_client_appointments', { p_phone: tel }),
  supabase.rpc('get_client_appointment_services', { p_phone: tel }),
  supabase.rpc('get_client_packages', { p_phone: tel }),
]);
type Respuestas = Awaited<ReturnType<typeof pedir>>;

/** Mis citas (spec §6.3): busca por teléfono las citas, sus servicios y los paquetes; cancela con la regla de 12 h
 *  de la base (cancel_client_appointment). Con un número recordado, busca solo al abrir. */
export function usePortal() {
  // el número recordado en este teléfono, leído una sola vez al montar
  const [guardado] = useState(leerGuardado);
  const [telefono, setTelefono] = useState(guardado);
  const [recordar, setRecordarEstado] = useState(guardado !== '');
  // con un número recordado la búsqueda arranca sola al abrir: ya está buscando desde el primer pintado
  const [buscando, setBuscando] = useState(guardado !== '');
  const [error, setError] = useState('');
  const [datos, setDatos] = useState<DatosPortal | null>(null);
  /** el teléfono de los datos a la vista (el campo puede haber cambiado después) */
  const [buscado, setBuscado] = useState('');
  const ultima = useRef(0);
  /** la última elección de "Recordar": una búsqueda en curso escribe lo que la clienta quiere al terminar, no lo de cuando empezó */
  const recordarRef = useRef(guardado !== '');

  /** pone a la vista la respuesta; `esta` es el número de búsqueda, para descartar respuestas que llegan tarde */
  const aplicar = useCallback((tel: string, esta: number, [c, s, p]: Respuestas) => {
    if (esta !== ultima.current) return; // llegó una búsqueda más nueva
    setBuscando(false);
    if (c.error) {
      console.error('[mis-citas] búsqueda:', c.error);
      setError('No pudimos buscar tus citas. Revisa tu conexión e intenta de nuevo.');
      setDatos(null);
      setBuscado(''); // ya no hay datos a la vista: "Recordar" no debe guardar el número anterior
      return;
    }
    if (s.error) console.warn('[mis-citas] servicios de las citas:', s.error.message);
    if (p.error) console.warn('[mis-citas] paquetes:', p.error.message);
    setDatos({
      citas: (c.data ?? []) as unknown as FilaCita[],
      servicios: s.error ? [] : ((s.data ?? []) as unknown as FilaServicioCita[]),
      paquetes: p.error ? [] : ((p.data ?? []) as unknown as FilaPaqueteCliente[]),
    });
    setBuscado(tel);
    guardar(recordarRef.current ? tel : null);
  }, []);

  const buscar = useCallback(async (tel: string, recordarlo: boolean) => {
    const esta = ++ultima.current;
    recordarRef.current = recordarlo;
    setBuscando(true);
    setError('');
    aplicar(tel, esta, await pedir(tel));
  }, [aplicar]);

  // un número recordado en este teléfono: se busca solo al abrir
  useEffect(() => {
    if (!guardado) return;
    const esta = ++ultima.current;
    void pedir(guardado).then((r) => aplicar(guardado, esta, r));
  }, [aplicar, guardado]);

  const setRecordar = useCallback((v: boolean) => {
    recordarRef.current = v;
    setRecordarEstado(v);
    guardar(v && buscado ? buscado : null);
  }, [buscado]);

  const cancelar = useCallback(async (id: string): Promise<ResultadoCancelar> => {
    const { data, error: e } = await supabase.rpc('cancel_client_appointment', { p_id: id, p_phone: buscado });
    if (e) {
      console.error('[mis-citas] cancelar:', e);
      return 'error';
    }
    // la cita existe, pero la base no la deja cancelar sola: faltan menos de 12 h, o ya no está pendiente o confirmada
    if (data === false) return 'tarde';
    // solo un sí explícito cuenta como cancelada: una respuesta vacía no toca lo que la clienta ve
    if (data !== true) {
      console.error('[mis-citas] cancelar: respuesta inesperada', data);
      return 'error';
    }
    setDatos((d) => d && { ...d, citas: d.citas.map((x) => (x.id === id ? { ...x, status: 'cancelled' } : x)) });
    return 'ok';
  }, [buscado]);

  return { telefono, setTelefono, recordar, setRecordar, buscando, error, datos, buscado, buscar, cancelar };
}
