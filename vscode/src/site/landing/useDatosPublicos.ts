import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { ServicioPublico } from './catalogo';
import type { PaquetePublico } from './paquetes';

interface FilaServicio { name: string; price: number | string | null; duration: number | string | null }
interface FilaPaquete {
  id: string;
  name: string;
  sessions: number | string | null;
  price: number | string | null;
  services: { name: string } | { name: string }[] | null;
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

/** Paquetes activos del más barato al más caro. Si falla la red, la lista queda vacía y la sección no aparece. */
export function usePaquetesPublicos(): { cargando: boolean; paquetes: PaquetePublico[] } {
  const [estado, setEstado] = useState<{ cargando: boolean; paquetes: PaquetePublico[] }>({ cargando: true, paquetes: [] });
  useEffect(() => {
    let vivo = true;
    supabase.from('session_packages').select('id, name, sessions, price, services(name)').eq('active', true).order('price')
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error) console.warn('No se pudieron leer los paquetes:', error.message);
        const filas = (data ?? []) as unknown as FilaPaquete[];
        const paquetes = filas.map((p) => {
          const sv = Array.isArray(p.services) ? p.services[0] : p.services;
          return { id: String(p.id), nombre: String(p.name), sesiones: Number(p.sessions) || 0, precio: Number(p.price) || 0, servicio: sv?.name ?? null };
        });
        setEstado({ cargando: false, paquetes });
      });
    return () => { vivo = false; };
  }, []);
  return estado;
}
