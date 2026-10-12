// Hoy: el día del salón por especialista, con sus citas, sus bloqueos y sus huecos libres, lo que está en sala y lo
// que falta confirmar. Puro: se prueba con node --test.
import type { Appointment } from '../../../store/appointmentStore';
import type { ScheduleBlock } from '../../../store/blockStore';
import type { StaffMember } from '../../../store/staffStore';
import { atiendeClientas } from '../../../lib/quienAtiende.ts';
import { tramoDelSalon } from '../../../lib/horarioSalon.ts';

/** Días como se guardan en staff.working_days (sin tildes). */
const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
/** Un hueco más corto que esto no se ofrece para agendar. */
export const MIN_HUECO = 15;
/** Lo cancelado y lo que no vino deja el hueco libre y no se pinta. */
const FUERA = new Set(['cancelled', 'no_show']);

export interface Tramo { inicio: number; fin: number }
/** Un servicio de una cita en la columna de quien lo hace. */
export interface BloqueCita extends Tramo { cita: Appointment; servicio: string }
export interface BloqueoVista extends Tramo { motivo: string; todoElDia: boolean }

export interface Columna {
  id: string;
  nombre: string;
  /** false si ese día no trabaja (o no está en Equipo pero tiene citas) */
  trabaja: boolean;
  /** su horario de ese día, ya dentro del horario del salón */
  desde: number;
  hasta: number;
  bloques: BloqueCita[];
  bloqueos: BloqueoVista[];
  libres: Tramo[];
  minutosLibres: number;
}

export interface Dia { inicio: number; fin: number; columnas: Columna[] }

export const aMinutos = (hhmm: string): number => {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return h * 60 + (m || 0);
};
export const aHora = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const clave = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/** Quita de `base` los tramos de `quitar`. */
export function restar(base: Tramo[], quitar: Tramo[]): Tramo[] {
  let quedan = base;
  for (const q of quitar) {
    quedan = quedan.flatMap((t) => {
      if (q.fin <= t.inicio || q.inicio >= t.fin) return [t];
      const partes: Tramo[] = [];
      if (q.inicio > t.inicio) partes.push({ inicio: t.inicio, fin: q.inicio });
      if (q.fin < t.fin) partes.push({ inicio: q.fin, fin: t.fin });
      return partes;
    });
  }
  return quedan;
}

/** Las líneas de una cita (cada servicio con su especialista y su hora); las citas viejas traen solo el resumen. */
function lineas(c: Appointment) {
  return c.services.length > 0
    ? c.services.map((l) => ({ empleada: l.employee, hora: l.startTime || c.time, minutos: l.duration || 45, servicio: l.serviceName }))
    : [{ empleada: c.employee, hora: c.time, minutos: c.duration || 45, servicio: c.service }];
}

/**
 * El día del salón: una columna por especialista que atiende (y otra por cada nombre con citas que ya no está en
 * Equipo), con sus citas, sus bloqueos y sus huecos libres. `ahora` (minutos) es solo para hoy: lo que ya pasó no
 * se ofrece como libre.
 */
export function diaDelSalon(
  fecha: string, staff: StaffMember[], citas: Appointment[], bloqueos: ScheduleBlock[], ahora: number | null,
): Dia {
  const salon = tramoDelSalon(fecha);
  const nombreDia = DIAS[new Date(`${fecha}T12:00:00`).getDay()];
  const columnas: Columna[] = staff
    .filter((m) => m.active && atiendeClientas(m))
    .map((m) => {
      const trabaja = !!salon && (m.workingDays ?? []).includes(nombreDia);
      return {
        id: m.id, nombre: m.name, trabaja,
        desde: Math.max(aMinutos(m.workingStart), salon?.abre ?? 0),
        hasta: aMinutos(m.workingEnd),
        bloques: [], bloqueos: [], libres: [], minutosLibres: 0,
      };
    });

  const porNombre = new Map(columnas.map((c) => [clave(c.nombre), c]));
  for (const c of citas) {
    if (c.date !== fecha || FUERA.has(c.status)) continue;
    for (const l of lineas(c)) {
      let col = porNombre.get(clave(l.empleada));
      if (!col) {
        col = { id: `sin-equipo:${clave(l.empleada)}`, nombre: l.empleada || 'Sin asignar', trabaja: false, desde: 0, hasta: 0, bloques: [], bloqueos: [], libres: [], minutosLibres: 0 };
        columnas.push(col);
        porNombre.set(clave(l.empleada), col);
      }
      const inicio = aMinutos(l.hora);
      col.bloques.push({ cita: c, servicio: l.servicio, inicio, fin: inicio + l.minutos });
    }
  }

  for (const col of columnas) {
    col.bloques.sort((a, b) => a.inicio - b.inicio);
    col.bloqueos = bloqueos
      .filter((b) => b.startDate <= fecha && fecha <= b.endDate && (!b.staffId || b.staffId === col.id))
      .map((b) => {
        const todoElDia = !b.startTime || !b.endTime;
        return {
          inicio: todoElDia ? col.desde : aMinutos(b.startTime!),
          fin: todoElDia ? col.hasta : aMinutos(b.endTime!),
          motivo: b.reason,
          todoElDia,
        };
      });
    if (!col.trabaja || col.hasta <= col.desde) continue;
    const desde = ahora === null ? col.desde : Math.max(col.desde, Math.ceil(ahora / 15) * 15);
    col.libres = restar([{ inicio: desde, fin: col.hasta }], [...col.bloques, ...col.bloqueos])
      .filter((t) => t.fin - t.inicio >= MIN_HUECO);
    col.minutosLibres = col.libres.reduce((n, t) => n + t.fin - t.inicio, 0);
  }

  // de la hora entera antes de lo primero a la hora entera después de lo último (si no hay nada, de 8 a 6)
  const tramos = columnas.flatMap((c) => [...(c.trabaja ? [{ inicio: c.desde, fin: c.hasta }] : []), ...c.bloques]);
  const inicio = tramos.length ? Math.floor(Math.min(...tramos.map((t) => t.inicio)) / 60) * 60 : 8 * 60;
  const fin = tramos.length ? Math.ceil(Math.max(...tramos.map((t) => t.fin)) / 60) * 60 : 18 * 60;
  return { inicio, fin: Math.max(fin, inicio + 60), columnas };
}

const porHora = (a: Appointment, b: Appointment) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time);

/** Las que están en sala ahora. */
export function enSala(citas: Appointment[], fecha: string): Appointment[] {
  return citas.filter((c) => c.date === fecha && c.status === 'in_progress').sort(porHora);
}

/** Lo que falta confirmar de hoy y mañana, en orden. */
export function porConfirmar(citas: Appointment[], hoy: string, manana: string): Appointment[] {
  return citas.filter((c) => c.status === 'pending' && (c.date === hoy || c.date === manana)).sort(porHora);
}

/** Cuántas citas hay mañana y cuántas faltan por confirmar. */
export function resumenDe(citas: Appointment[], fecha: string): { citas: number; porConfirmar: number } {
  const delDia = citas.filter((c) => c.date === fecha && !FUERA.has(c.status));
  return { citas: delDia.length, porConfirmar: delDia.filter((c) => c.status === 'pending').length };
}

/** En el celular el día va en una sola lista: citas y huecos libres de cada especialista, en orden de hora. */
export type Renglon =
  | { tipo: 'cita'; inicio: number; bloque: BloqueCita; columna: Columna }
  | { tipo: 'libre'; inicio: number; tramo: Tramo; columna: Columna };

export function renglonesDelDia(dia: Dia): Renglon[] {
  const renglones: Renglon[] = dia.columnas.flatMap((columna) => [
    ...columna.bloques.map((bloque): Renglon => ({ tipo: 'cita', inicio: bloque.inicio, bloque, columna })),
    ...columna.libres.filter((t) => t.fin - t.inicio >= 30).map((tramo): Renglon => ({ tipo: 'libre', inicio: tramo.inicio, tramo, columna })),
  ]);
  return renglones.sort((a, b) => a.inicio - b.inicio || (a.tipo === b.tipo ? 0 : a.tipo === 'cita' ? -1 : 1));
}

/** 45 → "45 min", 300 → "5 h", 345 → "5 h 45" (debajo del nombre de cada especialista). */
export function horasTexto(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m}` : `${h} h`;
}
