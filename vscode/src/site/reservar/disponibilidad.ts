// Disponibilidad de la reserva: quién puede, quién está libre y a qué horas cabe la visita completa.
// Es la lógica de siempre de Booking.tsx, sacada tal cual a funciones puras (spec §6.1: cambia la forma, no el
// cálculo), más el horario del salón. Sin React ni base de datos: se prueba con Node.
import { tramoDelSalon } from '../../lib/horarioSalon.ts';
import { puedeHacer } from '../../lib/quienAtiende.ts';

/** Días como se guardan en staff.working_days (sin tildes). */
export const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

export interface Especialista {
  id: string;
  name: string;
  /** specialist o admin (la reserva no trae recepción); sin rol cuenta como especialista */
  role?: string;
  working_days: string[];
  working_start: string;
  working_end: string;
  service_ids: string[];
  avatar_url?: string | null;
}

export interface Bloqueo {
  staff_id: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
}

export interface Ocupado { time: string; duration: number }

/** Un servicio de la visita. staffId vacío = "cualquiera disponible". */
export interface Elegido { serviceId: string; staffId: string; nombre: string; duracion: number }

export interface LineaPlan { serviceId: string; nombre: string; duracion: number; staff: Especialista }

/** Una hora del día: con el reparto si cabe la visita completa; plan null si está ocupada. */
export interface Horario { hora: string; plan: LineaPlan[] | null }

/** La agenda del día elegido: citas de cada especialista (por id) y bloqueos de horario. */
export interface Agenda { staff: Especialista[]; ocupados: Record<string, Ocupado[]>; bloqueos: Bloqueo[] }

export function timeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/** Quién puede hacer un servicio. Primero quienes lo tienen en su catálogo; después las especialistas sin catálogo
 *  (pueden todo). La administración sin servicios (la cuenta de soporte) no atiende: ver lib/quienAtiende. */
export function quienPuede(staff: Especialista[], serviceId: string): Especialista[] {
  const puede = (m: Especialista) => puedeHacer({ role: m.role ?? 'specialist', serviceIds: m.service_ids }, serviceId);
  const propias = staff.filter((m) => (m.service_ids ?? []).includes(serviceId) && puede(m));
  const comodin = staff.filter((m) => (m.service_ids ?? []).length === 0 && puede(m));
  return [...propias, ...comodin];
}

/** ¿Está libre esa persona en ese tramo? Mira su horario de trabajo, sus citas y los bloqueos (vacaciones,
 *  almuerzo, feriado del salón). Los bloqueos ya vienen filtrados por el día. */
export function estaLibre(m: Especialista, desde: number, dur: number, dia: string, agenda: Agenda): boolean {
  const dayName = WEEKDAYS[new Date(`${dia}T12:00:00`).getDay()];
  if (!(m.working_days ?? []).includes(dayName)) return false;
  if (desde < timeToMinutes(m.working_start)) return false;
  if (desde + dur > timeToMinutes(m.working_end)) return false;

  const ocupada = (agenda.ocupados[m.id] ?? []).some((a) => {
    const ini = timeToMinutes(String(a.time).slice(0, 5));
    return desde < ini + (a.duration ?? 45) && desde + dur > ini;
  });
  if (ocupada) return false;

  return !agenda.bloqueos.some((b) => {
    if (b.staff_id && b.staff_id !== m.id) return false;
    if (!b.start_time || !b.end_time) return true;
    const bIni = timeToMinutes(b.start_time.slice(0, 5));
    const bFin = timeToMinutes(b.end_time.slice(0, 5));
    return desde < bFin && desde + dur > bIni;
  });
}

/** Reparte todos los servicios en cadena desde una hora. Devuelve quién hace cada uno, o null si no cabe. */
export function repartirDesde(elegidos: Elegido[], inicio: number, dia: string, agenda: Agenda): LineaPlan[] | null {
  let cursor = inicio;
  const plan: LineaPlan[] = [];
  const ocupadasAqui: Record<string, number[][]> = {};

  for (const e of elegidos) {
    const candidatas = e.staffId
      ? agenda.staff.filter((m) => m.id === e.staffId)
      : quienPuede(agenda.staff, e.serviceId);

    const libre = candidatas.find((m) => {
      if (!estaLibre(m, cursor, e.duracion, dia, agenda)) return false;
      // tampoco puede estar haciendo otro servicio de ESTA misma cita
      return !(ocupadasAqui[m.id] ?? []).some(([a, b]) => cursor < b && cursor + e.duracion > a);
    });

    if (!libre) return null;
    (ocupadasAqui[libre.id] ??= []).push([cursor, cursor + e.duracion]);
    plan.push({ serviceId: e.serviceId, nombre: e.nombre, duracion: e.duracion, staff: libre });
    cursor += e.duracion;
  }
  return plan;
}

/** Cada media hora del día, dentro del horario del salón: si cabe la visita completa, con su reparto; si no,
 *  ocupada (plan null). El día que el salón no abre, nada. Hoy nunca se ofrecen horas que ya pasaron (con 15
 *  minutos de margen). */
export function horariosDelDia(
  elegidos: Elegido[], dia: string, agenda: Agenda, ahora: { hoy: string; minutos: number },
): Horario[] {
  const duracionTotal = elegidos.reduce((t, e) => t + e.duracion, 0);
  if (elegidos.length === 0 || !dia || duracionTotal === 0) return [];

  const salon = tramoDelSalon(dia);
  if (!salon) return [];
  const apertura = Math.max(salon.abre, Math.min(...agenda.staff.map((m) => timeToMinutes(m.working_start)), 9 * 60));
  const cierre = Math.min(salon.cierra, Math.max(...agenda.staff.map((m) => timeToMinutes(m.working_end)), 18 * 60));
  const desdeAhora = dia === ahora.hoy ? ahora.minutos + 15 : 0;

  const salida: Horario[] = [];
  for (let cursor = apertura; cursor + duracionTotal <= cierre; cursor += 30) {
    if (cursor < desdeAhora) continue;
    salida.push({ hora: minutesToTime(cursor), plan: repartirDesde(elegidos, cursor, dia, agenda) });
  }
  return salida;
}

/** Relectura antes de guardar: ¿alguien tomó alguno de estos tramos mientras la clienta llenaba el formulario? */
export function chocaConAgenda(plan: LineaPlan[], hora: string, agendaFresca: Record<string, Ocupado[]>): boolean {
  let cursor = timeToMinutes(hora);
  return plan.some((linea) => {
    const choca = (agendaFresca[linea.staff.id] ?? []).some((a) => {
      const ini = timeToMinutes(String(a.time).slice(0, 5));
      return cursor < ini + (a.duration ?? 45) && cursor + linea.duracion > ini;
    });
    cursor += linea.duracion;
    return choca;
  });
}
