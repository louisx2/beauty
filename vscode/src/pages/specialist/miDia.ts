// Mi día: lo que una especialista necesita a mano mientras trabaja. Quién está en su cabina y quién sigue, lo que
// conviene saber de esa clienta antes de atenderla y sus próximos días. Cuenta cada servicio suyo aunque la cita
// sea de varios servicios con varias especialistas. Puro: se prueba con node --test.
import type { Appointment } from '../../store/appointmentStore';
import type { Client } from '../../store/clientStore';
import { citasDeClienta } from '../admin/clientes/ficha.ts';

const POR_VENIR = new Set(['pending', 'confirmed']);
const clave = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
const aMinutos = (hhmm: string) => {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return h * 60 + (m || 0);
};

/** Un servicio suyo dentro de una cita. */
export interface LineaMia { cita: Appointment; servicio: string; inicio: number; fin: number }

/** Lo que hace ella ese día: cada servicio suyo (de la cita que sea), en orden. Lo cancelado y lo que no vino, no. */
export function misLineas(citas: Appointment[], nombre: string, fecha: string): LineaMia[] {
  const yo = clave(nombre);
  return citas
    .filter((c) => c.date === fecha && c.status !== 'cancelled' && c.status !== 'no_show')
    .flatMap((c) => (c.services.length > 0
      ? c.services.map((l) => ({ empleada: l.employee, hora: l.startTime || c.time, minutos: l.duration || 45, servicio: l.serviceName }))
      : [{ empleada: c.employee, hora: c.time, minutos: c.duration || 45, servicio: c.service }])
      .filter((l) => clave(l.empleada) === yo)
      .map((l) => ({ cita: c, servicio: l.servicio, inicio: aMinutos(l.hora), fin: aMinutos(l.hora) + l.minutos })))
    .sort((a, b) => a.inicio - b.inicio);
}

/** La que tiene en cabina (en curso) y la que sigue (la primera por empezar, aunque ya se le haya pasado la hora). */
export function enSalaYSiguiente(lineas: LineaMia[]): { enSala: LineaMia | null; siguiente: LineaMia | null } {
  return {
    enSala: lineas.find((l) => l.cita.status === 'in_progress') ?? null,
    siguiente: lineas.find((l) => POR_VENIR.has(l.cita.status)) ?? null,
  };
}

export interface AntesDeAtender {
  alergias: string | null;
  piel: string | null;
  notas: string | null;
  /** la última vez que vino (antes de esta cita): qué se hizo, con quién y lo que se anotó */
  ultima: Appointment | null;
  visitas: number;
}

/** Lo que conviene saber de la clienta antes de atenderla: de su ficha (alergias, piel, notas) y de su última visita. */
export function antesDeAtender(cita: Appointment, clientas: Client[], citas: Appointment[]): AntesDeAtender {
  const ficha = cita.client_id ? clientas.find((c) => c.id === cita.client_id) : undefined;
  const suyas = ficha
    ? citasDeClienta(citas, ficha)
    : citas.filter((c) => !c.client_id && c.clientPhone && c.clientPhone === cita.clientPhone);
  const antes = suyas
    .filter((c) => c.id !== cita.id && c.status === 'completed' && `${c.date} ${c.time}` < `${cita.date} ${cita.time}`)
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  return {
    alergias: ficha?.allergies?.trim() || null,
    piel: ficha?.skin_type || null,
    notas: ficha?.notes?.trim() || null,
    ultima: antes[0] ?? null,
    visitas: antes.length,
  };
}

/** Sus próximos días con citas (sin contar hoy), con las citas de cada uno en orden. */
export function proximosDias(citas: Appointment[], nombre: string, hoy: string, cuantos = 6): { fecha: string; lineas: LineaMia[] }[] {
  const fechas = [...new Set(citas.filter((c) => c.date > hoy && POR_VENIR.has(c.status)).map((c) => c.date))].sort();
  return fechas
    .map((fecha) => ({ fecha, lineas: misLineas(citas, nombre, fecha).filter((l) => POR_VENIR.has(l.cita.status)) }))
    .filter((d) => d.lineas.length > 0)
    .slice(0, cuantos);
}

/** "12 min", "1 h 05 min": lo que lleva la que está en cabina. */
export function tiempoTranscurrido(desde: string | null, ahora: number): string {
  if (!desde) return '';
  const min = Math.max(0, Math.floor((ahora - new Date(desde).getTime()) / 60_000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}

/** "Buenos días" hasta las 12, "Buenas tardes" hasta las 6, después "Buenas noches". */
export function saludo(minutos: number): string {
  if (minutos < 12 * 60) return 'Buenos días';
  if (minutos < 18 * 60) return 'Buenas tardes';
  return 'Buenas noches';
}
