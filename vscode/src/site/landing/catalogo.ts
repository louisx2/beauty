// Catálogo de la página principal: familias, especialidades, precios y duración (spec §5.3).
// Puro: recibe el menú y los servicios de la base, así se prueba con node --test.
import type { FamiliaId, ServiceCategory } from '../../data/servicesMenu';
import { iniciales } from './equipo.ts';

export interface Familia { id: FamiliaId; nombre: string; corto: string }

export const FAMILIAS: Familia[] = [
  { id: 'facial', nombre: 'Facial', corto: 'Facial' },
  { id: 'corporal', nombre: 'Corporal', corto: 'Corporal' },
  { id: 'cejas-maquillaje', nombre: 'Cejas, pestañas y maquillaje', corto: 'Cejas y maquillaje' },
  { id: 'medicina', nombre: 'Medicina estética', corto: 'Medicina estética' },
];

/** Lo que la página lee de la tabla `services` (anon solo ve los activos). */
export interface ServicioPublico { name: string; price: number; duration: number }

export interface ServicioVista { nombre: string; minutos: number | null; precio: string; conPrecio: boolean }
export interface GrupoVista { etiqueta?: string; servicios: ServicioVista[] }
export interface EspecialistaVista { nombre: string; miniatura?: string; iniciales: string }
export interface EspecialidadVista {
  id: string;
  titulo: string;
  familia: FamiliaId;
  imagen?: string;
  posicion?: string;
  descripcion?: string;
  especialista: EspecialistaVista;
  grupos: GrupoVista[];
  total: number;
}

export const SIN_PRECIO = 'RD$ —';

/** 12000 → "RD$ 12,000", sin depender del idioma del teléfono. */
export function formatoRD(n: number): string {
  return `RD$ ${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/** Nombre del servicio en la tabla `services` para una opción del menú (la misma regla de siempre). */
export function nombreEnTabla(catId: string, bloque: string, opcion: string): string {
  const it = opcion.split(' — ')[0].trim();
  switch (catId) {
    case 'depilacion-laser': return `Depilación Láser - ${it}`;
    case 'depilacion-cera': return `Depilación Cera - ${it}`;
    case 'blanqueamiento-corporal': return `Blanqueamiento - ${it}`;
    case 'cejas-pestanas':
      if (bloque !== 'Extensiones de pestañas') return it;
      return it.startsWith('Volumen 2D') ? 'Extensiones de Pestañas - Volumen 2D-5D' : `Extensiones de Pestañas - ${it}`;
    case 'maquillaje': return `Maquillaje - ${it}`;
    case 'toxina-botulinica': return `Toxina Botulínica - ${it}`;
    case 'rellenos': return `Relleno Ácido Hialurónico - ${it}`;
    case 'bioestimuladores': {
      let p = it;
      if (p.startsWith('Hilos PDO')) p = 'Hilos PDO (x10)';
      if (p.startsWith('Hilos tensores')) p = 'Hilos tensores (desde)';
      return `Bioestimulador - ${p}`;
    }
    case 'mesoterapia': {
      let p = it;
      if (p.startsWith('NCTF')) p = 'NCTF - Ojeras';
      if (p.startsWith('PDRN')) p = 'PDRN de Salmón - Ojeras';
      return `Mesoterapia ${p}`;
    }
    case 'plasma-rico-plaquetas': return `PRP - ${it}`;
    case 'escleroterapia': return 'Escleroterapia - Ampolla 2ml';
    case 'verrugas': return 'Eliminación de Verrugas (desde)';
    default: return it;
  }
}

/** Precio que trae el texto del menú ("Labios — RD$15,000") ya limpio: "RD$ 15,000". */
export function precioDelTexto(opcion: string): string | null {
  const partes = opcion.split(' — ');
  if (partes.length < 2) return null;
  return partes.slice(1).join(' — ').trim()
    .replace(/RD\$\s?(?=\d)/g, 'RD$ ')
    .replace(/(\d)\s+a\s+(\d)/g, '$1 – $2');
}

/** Tabla > 0 primero; si el menú habla de un rango o de "desde", el de la tabla es el mínimo. */
export function precioVista(fila: ServicioPublico | undefined, opcion: string, enTabla: string): Pick<ServicioVista, 'precio' | 'conPrecio'> {
  if (fila && fila.price > 0) {
    const desde = /desde/i.test(opcion) || /desde/i.test(enTabla) || /\d\s+a\s+\d/.test(opcion);
    return { precio: `${desde ? 'desde ' : ''}${formatoRD(fila.price)}`, conPrecio: true };
  }
  const texto = precioDelTexto(opcion);
  return texto ? { precio: texto, conPrecio: true } : { precio: SIN_PRECIO, conPrecio: false };
}

/** Bloques de la especialidad: primero los servicios sueltos, después los grupos con nombre. */
export function gruposDe(cat: ServiceCategory): { etiqueta?: string; opciones: string[] }[] {
  const grupos: { etiqueta?: string; opciones: string[] }[] = [];
  const sueltos: string[] = [];
  for (const item of cat.items) {
    if (item.groups) item.groups.forEach((g) => grupos.push({ etiqueta: g.label, opciones: g.items }));
    else if (item.options) grupos.push({ etiqueta: cat.items.length > 1 ? item.name : undefined, opciones: item.options });
    else sueltos.push(item.name);
  }
  if (sueltos.length) grupos.unshift({ opciones: sueltos });
  return grupos;
}

/** Menú + tabla → especialidades listas para mostrar, ordenadas por familia. */
export function construirCatalogo(menu: ServiceCategory[], servicios: ServicioPublico[]): EspecialidadVista[] {
  const porNombre = new Map(servicios.map((s) => [s.name.toLowerCase().trim(), s]));
  const vistas: EspecialidadVista[] = menu.map((cat) => {
    const grupos: GrupoVista[] = gruposDe(cat).map((g) => ({
      etiqueta: g.etiqueta,
      servicios: g.opciones.map((op) => {
        const enTabla = nombreEnTabla(cat.id, g.etiqueta ?? '', op);
        const fila = porNombre.get(enTabla.toLowerCase().trim());
        return {
          nombre: op.split(' — ')[0].trim(),
          minutos: fila && fila.duration > 0 ? fila.duration : null,
          ...precioVista(fila, op, enTabla),
        };
      }),
    }));
    return {
      id: cat.id,
      titulo: cat.title,
      familia: cat.familia,
      imagen: cat.imagen,
      posicion: cat.posicion,
      descripcion: cat.descripcion ?? cat.items.find((i) => i.description)?.description,
      especialista: { nombre: cat.specialist.name, miniatura: cat.specialist.miniatura, iniciales: iniciales(cat.specialist.name) },
      grupos,
      total: grupos.reduce((n, g) => n + g.servicios.length, 0),
    };
  });
  const orden = (f: FamiliaId) => FAMILIAS.findIndex((x) => x.id === f);
  return vistas
    .map((v, i) => ({ v, i }))
    .sort((a, b) => orden(a.v.familia) - orden(b.v.familia) || a.i - b.i)
    .map(({ v }) => v);
}
