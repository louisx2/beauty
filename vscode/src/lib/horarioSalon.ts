// Horario del salón (src/config/site.ts) en la reserva en línea y en el panel: qué horas se ofrecen cada día.
// Puro salvo horasParaAgendar, que lee el reloj: se prueba con Node.
import { horarioSalon } from '../config/site.ts';
import { fechaLocal } from './fechas.ts';

/** Minutos desde la medianoche: 8:00 = 480. */
export interface Tramo { abre: number; cierra: number }
export interface Ahora { hoy: string; minutos: number }

const aMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const aHora = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Horario del salón ese día ("AAAA-MM-DD"); null si no abre o si la fecha no sirve. */
export function tramoDelSalon(fecha: string): Tramo | null {
  const t = horarioSalon[new Date(`${fecha}T12:00:00`).getDay()];
  return t ? { abre: aMinutos(t.abre), cierra: aMinutos(t.cierra) } : null;
}

/** Horas para agendar en el panel, cada media hora, desde que abre hasta media hora antes de cerrar.
 *  Si es hoy, solo las que no han pasado. */
export function horasDelSalon(fecha: string, ahora: Ahora): string[] {
  const t = tramoDelSalon(fecha);
  if (!t) return [];
  const horas: string[] = [];
  for (let m = t.abre; m + 30 <= t.cierra; m += 30) {
    if (fecha === ahora.hoy && m <= ahora.minutos) continue;
    horas.push(aHora(m));
  }
  return horas;
}

/** horasDelSalon con el reloj del equipo. `actual` (la hora que ya tiene la cita) sale siempre, aunque quede fuera
 *  del horario: así lo que se ve en la lista es lo que se guarda. */
export function horasParaAgendar(fecha: string, actual = ''): string[] {
  const d = new Date();
  const horas = horasDelSalon(fecha, { hoy: fechaLocal(d), minutos: d.getHours() * 60 + d.getMinutes() });
  return actual && !horas.includes(actual) ? [...horas, actual].sort() : horas;
}

/** Lo que dice la lista de horas mientras no hay una elegida. */
export function textoSinHora(fecha: string): string {
  return fecha && !tramoDelSalon(fecha) ? 'Cerrado ese día' : 'Elegir hora';
}
