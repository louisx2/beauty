import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { testimonios } from '../../config/testimonios';
import { seccionesPresentes } from './secciones';

/** En las páginas que no son la principal (reservar, mis citas), el menú ofrece las mismas secciones que la
 *  principal tiene de verdad. Mientras no se sabe, o si falla la red, solo las fijas. */
export function useSeccionesPresentes(): string[] {
  const [hay, setHay] = useState({ paquetes: false, equipo: false });
  useEffect(() => {
    let vivo = true;
    Promise.all([
      supabase.from('session_packages').select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from('staff').select('id', { count: 'exact', head: true }).eq('mostrar_en_web', true).eq('active', true),
    ]).then(([paq, eq]) => {
      if (!vivo) return;
      setHay({ paquetes: (paq.count ?? 0) > 0, equipo: (eq.count ?? 0) > 0 });
    });
    return () => { vivo = false; };
  }, []);
  return seccionesPresentes({ ...hay, opiniones: testimonios.length > 0 });
}
