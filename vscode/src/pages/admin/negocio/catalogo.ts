// Servicios: el catálogo del salón. Cómo se ve agrupado, quién hace cada servicio (y qué cambia en el equipo al
// marcarlo desde aquí), cuánto se usa y lo que se revisa antes de guardarlo. Puro: se prueba con node --test.
import type { Appointment } from '../../../store/appointmentStore';
import type { Service, ServiceCategory } from '../../../store/serviceStore';
import type { StaffMember } from '../../../store/staffStore';
import { sumarDias } from '../../../site/reservar/calendario.ts';
import { sinTildes } from '../../../site/reservar/servicios.ts';
import { buscarServicios, CATEGORIAS } from '../agendar/reglas.ts';

/** El orden de las categorías en el panel (el mismo de la página). */
export const ORDEN_CATEGORIAS: ServiceCategory[] = ['facial', 'laser', 'corporal', 'belleza', 'medicina'];

export interface GrupoServicios { categoria: ServiceCategory; titulo: string; servicios: Service[] }

/** El catálogo por categoría: con texto, lo que se busca (sin tildes, primero lo que empieza así); los inactivos
 *  solo si se piden. */
export function catalogoAgrupado(
  servicios: Service[], texto: string, categoria: ServiceCategory | 'todas', verInactivos: boolean,
): GrupoServicios[] {
  const base = servicios.filter((s) => (categoria === 'todas' || s.category === categoria) && (verInactivos || s.active));
  const encontrados = buscarServicios(base, texto);
  return ORDEN_CATEGORIAS
    .map((c) => ({ categoria: c, titulo: CATEGORIAS[c], servicios: encontrados.filter((s) => s.category === c) }))
    .filter((g) => g.servicios.length > 0);
}

/** Cómo hace una persona del equipo este servicio:
 *  - 'todos': especialista sin servicios marcados, hace todos (no se cambia desde aquí);
 *  - 'unico': especialista que solo hace este (quitárselo la dejaría haciendo todos: se cambia en Equipo);
 *  - 'si' / 'no': lo tiene marcado o no. */
export type ComoLoHace = 'todos' | 'unico' | 'si' | 'no';

export function comoLoHace(m: Pick<StaffMember, 'role' | 'serviceIds'>, serviceId: string | null): ComoLoHace {
  const ids = m.serviceIds ?? [];
  if (m.role === 'specialist' && ids.length === 0) return 'todos';
  if (!serviceId || !ids.includes(serviceId)) return 'no';
  return m.role === 'specialist' && ids.length === 1 ? 'unico' : 'si';
}

/** Quién puede hacer servicios: las especialistas y la administración activas (recepción no atiende). */
export function quienesAtienden(equipo: StaffMember[]): StaffMember[] {
  return equipo
    .filter((m) => m.active && (m.role === 'specialist' || m.role === 'admin'))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/** Quiénes lo hacen hoy, para la lista. */
export function quienLoHace(serviceId: string, equipo: StaffMember[]): StaffMember[] {
  return quienesAtienden(equipo).filter((m) => comoLoHace(m, serviceId) !== 'no');
}

/** Lo que hay que cambiarle al equipo al guardar quién hace el servicio: solo a quien lo tiene marcado uno por uno y
 *  cambió. La que hace todos y la que solo hace este quedan igual. */
export function cambiosDeEquipo(serviceId: string, equipo: StaffMember[], elegidas: string[]): { id: string; serviceIds: string[] }[] {
  return quienesAtienden(equipo).flatMap((m) => {
    const como = comoLoHace(m, serviceId);
    if (como === 'todos' || como === 'unico') return [];
    const quiere = elegidas.includes(m.id);
    if ((como === 'si') === quiere) return [];
    return [{ id: m.id, serviceIds: quiere ? [...m.serviceIds, serviceId] : m.serviceIds.filter((x) => x !== serviceId) }];
  });
}

export interface UsoServicio {
  /** veces que se hizo en los últimos 30 días */
  hechos: number;
  /** veces que está agendado de hoy en adelante */
  agendados: number;
}

const clave = (s: string | null | undefined) => sinTildes((s ?? '').trim());

/** Cuánto se usa cada servicio (por id): hecho en los últimos 30 días y agendado de hoy en adelante. Cada servicio de
 *  una cita cuenta; las citas antiguas sin líneas, por el nombre. */
export function usoDeServicios(citas: Appointment[], servicios: Service[], hoy: string): Map<string, UsoServicio> {
  const desde = sumarDias(hoy, -30);
  const porNombre = new Map(servicios.map((s) => [clave(s.name), s.id]));
  const uso = new Map<string, UsoServicio>(servicios.map((s) => [s.id, { hechos: 0, agendados: 0 }]));
  for (const c of citas) {
    const hecho = c.status === 'completed' && c.date >= desde && c.date <= hoy;
    const agendado = (c.status === 'pending' || c.status === 'confirmed') && c.date >= hoy;
    if (!hecho && !agendado) continue;
    const lineas = c.services.length > 0 ? c.services : [{ serviceId: null, serviceName: c.service }];
    for (const l of lineas) {
      const id = (l.serviceId && uso.has(l.serviceId) ? l.serviceId : null) ?? porNombre.get(clave(l.serviceName));
      const u = id ? uso.get(id) : undefined;
      if (!u) continue;
      if (hecho) u.hechos++;
      else u.agendados++;
    }
  }
  return uso;
}

export interface ErroresServicio { name?: string; duration?: string; price?: string }

/** Lo que se revisa antes de guardar: nombre (sin repetir otro, aunque cambien tildes o mayúsculas), duración y precio. */
export function erroresDelServicio(
  form: { name: string; duration: number; price: number }, servicios: Service[], id: string | null,
): ErroresServicio {
  const e: ErroresServicio = {};
  const nombre = clave(form.name).replace(/\s+/g, ' ');
  if (!nombre) e.name = 'Escribe el nombre del servicio';
  else if (servicios.some((s) => s.id !== id && clave(s.name).replace(/\s+/g, ' ') === nombre)) e.name = 'Ya hay un servicio con ese nombre';
  if (!Number.isInteger(form.duration) || form.duration < 5 || form.duration > 600) e.duration = 'Entre 5 y 600 minutos';
  if (!Number.isFinite(form.price) || form.price < 0) e.price = 'Escribe un precio válido';
  return e;
}

/** El precio con ITBIS (18 %), redondeado. */
export const conItbis = (precio: number) => Math.round(precio * 1.18);
