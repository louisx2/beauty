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

/** Mis citas (spec §6.3): busca por teléfono las citas, sus servicios y los paquetes; cancela con la regla de 12 h
 *  de la base (cancel_client_appointment). Con un número recordado, busca solo al abrir. */
export function usePortal() {
  const [telefono, setTelefono] = useState('');
  const [recordar, setRecordarEstado] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');
  const [datos, setDatos] = useState<DatosPortal | null>(null);
  /** el teléfono de los datos a la vista (el campo puede haber cambiado después) */
  const [buscado, setBuscado] = useState('');
  const ultima = useRef(0);

  const buscar = useCallback(async (tel: string, recordarlo: boolean) => {
    const esta = ++ultima.current;
    setBuscando(true);
    setError('');
    const [c, s, p] = await Promise.all([
      supabase.rpc('get_client_appointments', { p_phone: tel }),
      supabase.rpc('get_client_appointment_services', { p_phone: tel }),
      supabase.rpc('get_client_packages', { p_phone: tel }),
    ]);
    if (esta !== ultima.current) return; // llegó una búsqueda más nueva
    setBuscando(false);
    if (c.error) {
      console.error('[mis-citas] búsqueda:', c.error);
      setError('No pudimos buscar tus citas. Revisa tu conexión e intenta de nuevo.');
      setDatos(null);
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
    guardar(recordarlo ? tel : null);
  }, []);

  // un número recordado en este teléfono: se busca solo al abrir
  useEffect(() => {
    const guardado = leerGuardado();
    if (!guardado) return;
    setTelefono(guardado);
    setRecordarEstado(true);
    void buscar(guardado, true);
  }, [buscar]);

  const setRecordar = useCallback((v: boolean) => {
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
    setDatos((d) => d && { ...d, citas: d.citas.map((x) => (x.id === id ? { ...x, status: 'cancelled' } : x)) });
    return 'ok';
  }, [buscado]);

  return { telefono, setTelefono, recordar, setRecordar, buscando, error, datos, buscado, buscar, cancelar };
}
