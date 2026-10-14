// Equipo: qué hace hoy cada una (si trabaja, cuántos servicios tiene, a quién atiende ahora y quién le sigue) y cómo
// va su mes. Sale de las citas que ya están cargadas, sin pedir nada más a la base. Puro: se prueba con node --test.
import type { Appointment } from '../../../store/appointmentStore';
import type { Service } from '../../../store/serviceStore';
import type { StaffMember } from '../../../store/staffStore';
import { deIso } from '../../../site/reservar/calendario.ts';
import { WEEKDAYS } from '../../../site/reservar/disponibilidad.ts';
import { enSalaYSiguiente, misLineas, type LineaMia } from '../../specialist/miDia.ts';
import { porEspecialista, rangoDe } from './reportes.ts';

export interface HoyDe {
  /** hoy es uno de sus días de trabajo */
  trabaja: boolean;
  /** sus servicios de hoy (sin lo cancelado ni lo que no vino) */
  servicios: number;
  enCabina: LineaMia | null;
  siguiente: LineaMia | null;
}

export function hoyDe(m: StaffMember, citas: Appointment[], hoy: string): HoyDe {
  const lineas = misLineas(citas, m.name, hoy);
  const { enSala, siguiente } = enSalaYSiguiente(lineas);
  return {
    trabaja: m.workingDays.includes(WEEKDAYS[deIso(hoy).getDay()]),
    servicios: lineas.length,
    enCabina: enSala,
    siguiente,
  };
}

export interface MesDe {
  /** citas completadas en las que atendió */
  atendidas: number;
  ingresos: number;
  comision: number;
  /** servicios suyos agendados de hoy en adelante */
  proximos: number;
}

const clave = (s: string) => s.trim().toLowerCase();

/** Su mes (el de `hoy`) y lo que tiene por delante. */
export function mesDe(m: StaffMember, citas: Appointment[], catalogo: Service[], hoy: string): MesDe {
  const r = porEspecialista(citas, catalogo, [m], rangoDe('mes', hoy))[0];
  const proximos = citas
    .filter((c) => c.date >= hoy && (c.status === 'pending' || c.status === 'confirmed'))
    .flatMap((c) => (c.services.length ? c.services.map((l) => l.employee) : [c.employee]))
    .filter((e) => clave(e) === clave(m.name)).length;
  return { atendidas: r?.citas ?? 0, ingresos: r?.ingresos ?? 0, comision: r?.comision ?? 0, proximos };
}
