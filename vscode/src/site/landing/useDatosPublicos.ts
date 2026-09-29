import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { ServicioPublico } from './catalogo';
import { ESTILO_POR_DEFECTO, estiloValido, type EstiloPaquetes, type PaquetePublico } from './paquetes';

interface FilaServicio { name: string; price: number | string | null; duration: number | string | null }
interface FilaPaquete {
  id: string;
  name: string;
  sessions: number | string | null;
  price: number | string | null;
  services: { name: string; price: number | string | null } | { name: string; price: number | string | null }[] | null;
}

/** Precio y duración de los servicios activos. Si falla la red, el catálogo muestra "RD$ —". */
export function useServiciosPublicos(): ServicioPublico[] {
  const [servicios, setServicios] = useState<ServicioPublico[]>([]);
  useEffect(() => {
    let vivo = true;
    supabase.from('services').select('name, price, duration').eq('active', true).then(({ data, error }) => {
      if (!vivo) return;
      if (error) { console.warn('No se pudieron leer los servicios:', error.message); return; }
      const filas = (data ?? []) as unknown as FilaServicio[];
      setServicios(filas.map((s) => ({ name: String(s.name), price: Number(s.price) || 0, duration: Number(s.duration) || 0 })));
    });
    return () => { vivo = false; };
  }, []);
  return servicios;
}

/**
 * Paquetes activos, del más barato al más caro, y el estilo elegido en el panel. Llegan juntos, así la
 * sección aparece una sola vez y ya en su estilo. Si falla la red: sin paquetes (la sección no aparece)
 * y estilo "Menú con foto".
 */
export function usePaquetesPublicos(): { cargando: boolean; paquetes: PaquetePublico[]; estilo: EstiloPaquetes } {
  const [estado, setEstado] = useState<{ cargando: boolean; paquetes: PaquetePublico[]; estilo: EstiloPaquetes }>(
    { cargando: true, paquetes: [], estilo: ESTILO_POR_DEFECTO },
  );
  useEffect(() => {
    let vivo = true;
    Promise.all([
      supabase.from('session_packages').select('id, name, sessions, price, services(name, price)').eq('active', true).order('price'),
      supabase.from('settings').select('estilo_paquetes').eq('id', 1).maybeSingle(),
    ]).then(([paq, conf]) => {
      if (!vivo) return;
      if (paq.error) console.warn('No se pudieron leer los paquetes:', paq.error.message);
      if (conf.error) console.warn('No se pudo leer el estilo de los paquetes:', conf.error.message);
      const filas = (paq.data ?? []) as unknown as FilaPaquete[];
      const paquetes = filas.map((p) => {
        const sv = Array.isArray(p.services) ? p.services[0] : p.services;
        return {
          id: String(p.id),
          nombre: String(p.name),
          sesiones: Number(p.sessions) || 0,
          precio: Number(p.price) || 0,
          servicio: sv?.name ?? null,
          precioServicio: Number(sv?.price) || 0,
        };
      });
      const estilo = estiloValido((conf.data as { estilo_paquetes?: unknown } | null)?.estilo_paquetes);
      setEstado({ cargando: false, paquetes, estilo });
    });
    return () => { vivo = false; };
  }, []);
  return estado;
}
