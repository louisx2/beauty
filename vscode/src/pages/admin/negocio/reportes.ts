// Reportes: cómo le fue al salón (o a una especialista) en un día, una semana, un mes o un año, comparado con el
// periodo anterior. Lo cobrado sale de las citas completadas (la facturación con NCF está apagada). Cada servicio de
// una cita cuenta para quien lo hizo. Puro: se prueba con node --test.
import type { Appointment } from '../../../store/appointmentStore';
import type { Service, ServiceCategory } from '../../../store/serviceStore';
import type { StaffMember } from '../../../store/staffStore';
import { atiendeClientas } from '../../../lib/quienAtiende.ts';
import { DIAS_LARGOS, MESES, deIso, lunesDe, sumarDias } from '../../../site/reservar/calendario.ts';
import { CATEGORIAS } from '../agendar/reglas.ts';

export type Periodo = 'dia' | 'semana' | 'mes' | 'anio';
export interface Rango { desde: string; hasta: string }

const dos = (n: number) => String(n).padStart(2, '0');
const clave = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/** Del primer al último día del periodo que contiene la fecha (la semana, de lunes a domingo). */
export function rangoDe(periodo: Periodo, fecha: string): Rango {
  if (periodo === 'dia') return { desde: fecha, hasta: fecha };
  if (periodo === 'semana') {
    const lunes = lunesDe(fecha);
    return { desde: lunes, hasta: sumarDias(lunes, 6) };
  }
  const [a, m] = fecha.split('-').map(Number);
  if (periodo === 'mes') return { desde: `${a}-${dos(m)}-01`, hasta: `${a}-${dos(m)}-${dos(new Date(a, m, 0).getDate())}` };
  return { desde: `${a}-01-01`, hasta: `${a}-12-31` };
}

/** El periodo de antes (n = -1) o de después (n = 1): devuelve su primer día. */
export function moverPeriodo(periodo: Periodo, fecha: string, n: number): string {
  const { desde } = rangoDe(periodo, fecha);
  if (periodo === 'dia') return sumarDias(desde, n);
  if (periodo === 'semana') return sumarDias(desde, 7 * n);
  const [a, m] = desde.split('-').map(Number);
  if (periodo === 'anio') return `${a + n}-01-01`;
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${dos((total % 12) + 1)}-01`;
}

const corto = (iso: string) => {
  const d = deIso(iso);
  return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
};

/** "Jueves 15 de octubre de 2026", "12 – 18 de octubre de 2026", "28 sep – 4 oct 2026", "Octubre de 2026", "2026". */
export function tituloPeriodo(periodo: Periodo, fecha: string): string {
  const { desde, hasta } = rangoDe(periodo, fecha);
  const d = deIso(desde);
  if (periodo === 'dia') {
    const t = `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
    return t[0].toUpperCase() + t.slice(1);
  }
  if (periodo === 'mes') return `${MESES[d.getMonth()][0].toUpperCase()}${MESES[d.getMonth()].slice(1)} de ${d.getFullYear()}`;
  if (periodo === 'anio') return String(d.getFullYear());
  const h = deIso(hasta);
  if (d.getMonth() === h.getMonth()) return `${d.getDate()} – ${h.getDate()} de ${MESES[h.getMonth()]} de ${h.getFullYear()}`;
  return `${corto(desde)} – ${corto(hasta)} ${h.getFullYear()}`;
}

export const enRango = (fecha: string, r: Rango) => fecha >= r.desde && fecha <= r.hasta;

/** Un servicio de una cita, con su precio (el guardado o el del catálogo), quién lo hizo y a qué hora empezó. */
export interface LineaVendida { cita: Appointment; nombre: string; empleada: string; precio: number; hora: string; categoria: ServiceCategory | null }

export function lineasDe(c: Appointment, catalogo: Service[]): LineaVendida[] {
  const delCatalogo = (id: string | null, nombre: string) =>
    (id ? catalogo.find((s) => s.id === id) : undefined) ?? catalogo.find((s) => clave(s.name) === clave(nombre));
  const lineas = c.services.length > 0
    ? c.services.map((l) => ({ id: l.serviceId, nombre: l.serviceName, empleada: l.employee, guardado: l.price, hora: l.startTime || c.time }))
    : [{ id: null, nombre: c.service, empleada: c.employee, guardado: 0, hora: c.time }];
  return lineas.map((l) => {
    const s = delCatalogo(l.id, l.nombre);
    return { cita: c, nombre: l.nombre, empleada: l.empleada, precio: l.guardado > 0 ? l.guardado : s?.price ?? 0, hora: l.hora, categoria: s?.category ?? null };
  });
}

/** Las citas del rango; con `empleada`, solo en las que ella hizo algo. */
function citasDelRango(citas: Appointment[], r: Rango, empleada?: string | null): Appointment[] {
  const suya = (c: Appointment) => (c.services.length ? c.services.map((l) => l.employee) : [c.employee]).some((e) => clave(e) === clave(empleada));
  return citas.filter((c) => enRango(c.date, r) && (!empleada || suya(c)));
}

/** Los servicios completados del rango; con `empleada`, solo los que hizo ella. */
export function vendidasDelRango(citas: Appointment[], catalogo: Service[], r: Rango, empleada?: string | null): LineaVendida[] {
  return citasDelRango(citas, r, empleada)
    .filter((c) => c.status === 'completed')
    .flatMap((c) => lineasDe(c, catalogo))
    .filter((l) => !empleada || clave(l.empleada) === clave(empleada));
}

const quienEs = (c: Appointment) => c.client_id ?? (c.clientPhone?.replace(/\D/g, '') || clave(c.clientName));

export interface Resumen {
  completadas: number;
  noVino: number;
  canceladas: number;
  ingresos: number;
  /** lo que deja en promedio cada cita completada */
  ticket: number;
  /** clientas distintas atendidas */
  atendidas: number;
  /** de las atendidas, las que venían por primera vez (su primera cita completada cae en el periodo) */
  primeraVez: number;
  /** de las atendidas, las que ya habían venido antes */
  volvieron: number;
}

export function resumenDelPeriodo(citas: Appointment[], catalogo: Service[], r: Rango, empleada?: string | null): Resumen {
  const delRango = citasDelRango(citas, r, empleada);
  const completadas = delRango.filter((c) => c.status === 'completed');
  const ingresos = vendidasDelRango(citas, catalogo, r, empleada).reduce((t, l) => t + l.precio, 0);
  const atendidas = new Set(completadas.map(quienEs));
  // ¿ya había venido? una cita completada antes del periodo, con quien fuera
  const antes = new Set(citas.filter((c) => c.status === 'completed' && c.date < r.desde).map(quienEs));
  const volvieron = [...atendidas].filter((k) => antes.has(k)).length;
  return {
    completadas: completadas.length,
    noVino: delRango.filter((c) => c.status === 'no_show').length,
    canceladas: delRango.filter((c) => c.status === 'cancelled').length,
    ingresos,
    ticket: completadas.length ? Math.round(ingresos / completadas.length) : 0,
    atendidas: atendidas.size,
    primeraVez: atendidas.size - volvieron,
    volvieron,
  };
}

/** Cuánto cambió frente al periodo anterior, en %; null si antes no hubo nada con qué comparar. */
export function variacion(actual: number, anterior: number): number | null {
  if (!anterior) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

export interface Rendimiento { miembro: StaffMember; citas: number; ingresos: number; comision: number }

/** Cuánto hizo cada una del equipo: citas en las que atendió, lo que cobró por sus servicios y su comisión. Quien no
 *  atiende (recepción, la cuenta de soporte) solo sale si hizo algún servicio. De más a menos ingresos. */
export function porEspecialista(citas: Appointment[], catalogo: Service[], equipo: StaffMember[], r: Rango): Rendimiento[] {
  const vendidas = vendidasDelRango(citas, catalogo, r);
  return equipo
    .flatMap((m) => {
      const suyas = vendidas.filter((l) => clave(l.empleada) === clave(m.name));
      if (suyas.length === 0 && (!m.active || !atiendeClientas(m))) return [];
      const ingresos = suyas.reduce((t, l) => t + l.precio, 0);
      return [{ miembro: m, citas: new Set(suyas.map((l) => l.cita.id)).size, ingresos, comision: Math.round((ingresos * m.commissionPct) / 100) }];
    })
    .sort((a, b) => b.ingresos - a.ingresos || a.miembro.name.localeCompare(b.miembro.name, 'es'));
}

export interface Parte { clave: string; nombre: string; cantidad: number; monto: number }

/** Lo cobrado por categoría de servicio, de más a menos. */
export function porCategoria(citas: Appointment[], catalogo: Service[], r: Rango, empleada?: string | null): Parte[] {
  const partes = new Map<string, Parte>();
  for (const l of vendidasDelRango(citas, catalogo, r, empleada)) {
    const k = l.categoria ?? 'otros';
    const p = partes.get(k) ?? { clave: k, nombre: l.categoria ? CATEGORIAS[l.categoria] : 'Otros', cantidad: 0, monto: 0 };
    p.cantidad++;
    p.monto += l.precio;
    partes.set(k, p);
  }
  return [...partes.values()].sort((a, b) => b.monto - a.monto);
}

/** Los servicios que más se hicieron, de más a menos veces. */
export function serviciosMasHechos(citas: Appointment[], catalogo: Service[], r: Rango, empleada?: string | null, cuantos = 5): Parte[] {
  const partes = new Map<string, Parte>();
  for (const l of vendidasDelRango(citas, catalogo, r, empleada)) {
    const k = clave(l.nombre);
    const p = partes.get(k) ?? { clave: k, nombre: l.nombre, cantidad: 0, monto: 0 };
    p.cantidad++;
    p.monto += l.precio;
    partes.set(k, p);
  }
  return [...partes.values()].sort((a, b) => b.cantidad - a.cantidad || b.monto - a.monto).slice(0, cuantos);
}

/** Las clientas que más dejaron en el periodo (todos sus servicios, aunque la cita sea de varios). */
export function mejoresClientas(citas: Appointment[], catalogo: Service[], r: Rango, cuantas = 5): (Parte & { clientId: string | null })[] {
  const partes = new Map<string, Parte & { clientId: string | null }>();
  for (const c of citasDelRango(citas, r).filter((x) => x.status === 'completed')) {
    const k = quienEs(c);
    const p = partes.get(k) ?? { clave: k, nombre: c.clientName, clientId: c.client_id, cantidad: 0, monto: 0 };
    p.cantidad++;
    p.monto += lineasDe(c, catalogo).reduce((t, l) => t + l.precio, 0);
    partes.set(k, p);
  }
  return [...partes.values()].sort((a, b) => b.monto - a.monto || b.cantidad - a.cantidad).slice(0, cuantas);
}

/** Cuántos servicios empezaron a cada hora del día (de 9 a 6 por lo menos, más si hubo antes o después). */
export function porHora(citas: Appointment[], catalogo: Service[], r: Rango, empleada?: string | null): { hora: number; cantidad: number }[] {
  const cuenta = new Map<number, number>();
  for (const l of vendidasDelRango(citas, catalogo, r, empleada)) {
    const h = Number(l.hora.slice(0, 2));
    if (Number.isFinite(h)) cuenta.set(h, (cuenta.get(h) ?? 0) + 1);
  }
  const horas = [...cuenta.keys()];
  const desde = Math.min(9, ...horas), hasta = Math.max(18, ...horas);
  return Array.from({ length: hasta - desde + 1 }, (_, i) => ({ hora: desde + i, cantidad: cuenta.get(desde + i) ?? 0 }));
}

/** De dónde vinieron las citas completadas: la reserva en línea o el salón (teléfono, en persona). */
export function origenDeCitas(citas: Appointment[], r: Rango, empleada?: string | null): { enLinea: number; enSalon: number } {
  const hechas = citasDelRango(citas, r, empleada).filter((c) => c.status === 'completed');
  const enLinea = hechas.filter((c) => c.source === 'online').length;
  return { enLinea, enSalon: hechas.length - enLinea };
}
