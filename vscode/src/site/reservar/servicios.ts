// Servicios de /reservar (spec §6.1): la lista de la tabla `services` con su familia, su especialidad y su precio,
// y el buscador. Puro: se prueba con Node.
import type { FamiliaId, ServiceCategory } from '../../data/servicesMenu';
import { FAMILIAS, SIN_PRECIO, formatoRD, gruposDe, nombreEnTabla, precioVista } from '../landing/catalogo.ts';

/** Lo que /reservar lee de `services` (anon solo ve los activos). */
export interface FilaServicio { id: string; name: string; duration: number; price: number }

export interface ServicioReserva {
  id: string;
  nombre: string;
  duracion: number;
  precio: string;
  conPrecio: boolean;
  /** null si el servicio no está en el menú de la página: sale solo en "Todos" y en el buscador */
  familia: FamiliaId | null;
  categoria: string | null;
}

/** "Depilación Láser - Axilas" → "Depilación Láser · Axilas" */
export function nombreVisible(nombre: string): string {
  return nombre.replace(/\s+-\s+/g, ' · ');
}

/** Sin tildes ni mayúsculas, para que "laser" encuentre "Láser". */
export function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

interface DelMenu { categoria: string; familia: FamiliaId; opcion: string; enTabla: string; orden: number }

/** Tabla + menú: cada servicio con su familia, su especialidad y el precio con la misma regla del catálogo. */
export function serviciosParaReservar(menu: ServiceCategory[], filas: FilaServicio[]): ServicioReserva[] {
  const delMenu = new Map<string, DelMenu>();
  let orden = 0;
  for (const cat of menu) {
    for (const g of gruposDe(cat)) {
      for (const opcion of g.opciones) {
        const enTabla = nombreEnTabla(cat.id, g.etiqueta ?? '', opcion);
        const clave = enTabla.toLowerCase().trim();
        if (!delMenu.has(clave)) delMenu.set(clave, { categoria: cat.id, familia: cat.familia, opcion, enTabla, orden: orden++ });
      }
    }
  }
  const ordenFamilia = (f: FamiliaId | null) => (f ? FAMILIAS.findIndex((x) => x.id === f) : FAMILIAS.length);

  return filas
    .map((f) => {
      const m = delMenu.get(f.name.toLowerCase().trim());
      const precio = m
        ? precioVista(f, m.opcion, m.enTabla)
        : f.price > 0 ? { precio: formatoRD(f.price), conPrecio: true } : { precio: SIN_PRECIO, conPrecio: false };
      const servicio: ServicioReserva = {
        id: f.id,
        nombre: nombreVisible(f.name),
        duracion: f.duration,
        ...precio,
        familia: m?.familia ?? null,
        categoria: m?.categoria ?? null,
      };
      return { servicio, orden: m?.orden ?? Number.MAX_SAFE_INTEGER };
    })
    .sort((a, b) =>
      ordenFamilia(a.servicio.familia) - ordenFamilia(b.servicio.familia) ||
      a.orden - b.orden ||
      a.servicio.nombre.localeCompare(b.servicio.nombre, 'es'))
    .map(({ servicio }) => servicio);
}

export interface Filtro { texto: string; familia: FamiliaId | 'todas'; categoria: string | null }

/** La especialidad (que viene del catálogo) manda sobre la familia; el texto busca en el nombre, sin tildes. */
export function filtrarServicios(lista: ServicioReserva[], { texto, familia, categoria }: Filtro): ServicioReserva[] {
  const t = sinTildes(texto.trim());
  return lista.filter((s) =>
    (categoria ? s.categoria === categoria : familia === 'todas' || s.familia === familia) &&
    (!t || sinTildes(s.nombre).includes(t)));
}
