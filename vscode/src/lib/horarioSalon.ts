// Horario del salón (src/config/site.ts) en la reserva en línea y en el panel: qué horas se ofrecen cada día y
// el horario de cada colaboradora ese día.
// Puro salvo horasParaAgendar, que lee el reloj: se prueba con Node.
import { horarioSalon } from '../config/site.ts';
import { fechaLocal } from './fechas.ts';

/** Minutos desde la medianoche: 8:00 = 480. `ultimoTurno`: la última hora a la que puede empezar una cita. */
export interface Tramo { abre: number; ultimoTurno: number }
export interface Ahora { hoy: string; minutos: number }

const aMinutos = (hhmm: string) => {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return h * 60 + (m || 0);
};
const aHora = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Horario del salón ese día ("AAAA-MM-DD"); null si no abre o si la fecha no sirve. */
export function tramoDelSalon(fecha: string): Tramo | null {
  const t = horarioSalon[new Date(`${fecha}T12:00:00`).getDay()];
  return t ? { abre: aMinutos(t.abre), ultimoTurno: aMinutos(t.ultimoTurno) } : null;
}

/** El horario de una colaboradora ese día, en minutos: el de su ficha (`entra`/`sale`, "HH:MM"), salvo el día en
 *  que el salón tiene el mismo para todas (el sábado): ese día, el del salón. `sale` es la última hora a la que
 *  toma una cita. */
export function horarioDeTrabajo(fecha: string, entra: string, sale: string): { entra: number; sale: number } {
  const t = horarioSalon[new Date(`${fecha}T12:00:00`).getDay()];
  return t?.paraTodas
    ? { entra: aMinutos(t.abre), sale: aMinutos(t.ultimoTurno) }
    : { entra: aMinutos(entra), sale: aMinutos(sale) };
}

/** Horas para agendar en el panel, cada media hora, desde que abre hasta el último turno (esa cita puede
 *  terminar después). Si es hoy, solo las que no han pasado. */
export function horasDelSalon(fecha: string, ahora: Ahora): string[] {
  const t = tramoDelSalon(fecha);
  if (!t) return [];
  const horas: string[] = [];
  for (let m = t.abre; m <= t.ultimoTurno; m += 30) {
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
