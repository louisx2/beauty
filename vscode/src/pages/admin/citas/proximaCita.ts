// Agendar la próxima cita ahí mismo, al terminar un servicio: qué se le vuelve a agendar, la agenda de cada día
// con lo que ya hay en el panel y las líneas que se guardan. Las horas libres las calcula disponibilidad.ts, la misma
// regla de /reservar. Puro: se prueba con node --test.
import type { Appointment, AppointmentLine } from '../../../store/appointmentStore';
import type { ScheduleBlock } from '../../../store/blockStore';
import type { Service } from '../../../store/serviceStore';
import type { StaffMember } from '../../../store/staffStore';
import { atiendeClientas, puedeHacer } from '../../../lib/quienAtiende.ts';
import {
  horariosDelDia, minutesToTime, timeToMinutes,
  type Agenda, type Elegido, type Especialista, type Horario, type LineaPlan, type Ocupado,
} from '../../../site/reservar/disponibilidad.ts';

/** Lo cancelado y lo que no vino deja el hueco libre. */
const LIBERAN = new Set(['cancelled', 'no_show']);

const clave = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

/** El equipo que atiende, con la forma que usa disponibilidad.ts. Con `soloNombre`, solo esa persona
 *  (una especialista solo puede agendarse a sí misma). */
export function especialistasDeAgenda(staff: StaffMember[], soloNombre?: string): Especialista[] {
  return staff
    .filter((m) => m.active && atiendeClientas(m))
    .filter((m) => !soloNombre || clave(m.name) === clave(soloNombre))
    .map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      working_days: m.workingDays,
      working_start: m.workingStart,
      working_end: m.workingEnd,
      service_ids: m.serviceIds,
    }));
}

/** La agenda de un día con lo que el panel ya tiene: las citas de cada especialista (cada servicio con su hora)
 *  y los bloqueos que tocan ese día. */
export function agendaDelDia(
  dia: string, especialistas: Especialista[], citas: Appointment[], bloqueos: ScheduleBlock[],
): Agenda {
  const idPorNombre = new Map(especialistas.map((m) => [clave(m.name), m.id]));
  const ocupados: Record<string, Ocupado[]> = {};
  for (const c of citas) {
    if (c.date !== dia || LIBERAN.has(c.status)) continue;
    const lineas = c.services.length > 0
      ? c.services
      : [{ employee: c.employee, startTime: c.time, duration: c.duration }];
    for (const l of lineas) {
      const id = idPorNombre.get(clave(l.employee));
      if (id) (ocupados[id] ??= []).push({ time: l.startTime || c.time, duration: l.duration || 45 });
    }
  }
  return {
    staff: especialistas,
    ocupados,
    bloqueos: bloqueos
      .filter((b) => b.startDate <= dia && dia <= b.endDate)
      .map((b) => ({ staff_id: b.staffId, start_date: b.startDate, end_date: b.endDate, start_time: b.startTime, end_time: b.endTime })),
  };
}

/** Lo mismo que se acaba de hacer, con la misma especialista si todavía puede hacerlo (si no, "cualquiera"). */
export function elegidosDeCita(cita: Appointment, servicios: Service[], especialistas: Especialista[]): Elegido[] {
  const lineas = cita.services.length > 0
    ? cita.services
    : [{ serviceId: null, serviceName: cita.service, employee: cita.employee, duration: cita.duration }];
  return lineas.flatMap((l) => {
    const s = (l.serviceId ? servicios.find((x) => x.id === l.serviceId) : undefined)
      ?? servicios.find((x) => clave(x.name) === clave(l.serviceName));
    if (!s) return [];
    const m = especialistas.find((x) => clave(x.name) === clave(l.employee));
    const sigue = m && puedeHacer({ role: m.role ?? 'specialist', serviceIds: m.service_ids }, s.id);
    return [{ serviceId: s.id, staffId: sigue ? m.id : '', nombre: s.name, duracion: s.duration || l.duration || 45 }];
  });
}

/** Las horas del día (libres y ocupadas) para lo elegido. */
export function horasDelDia(
  elegidos: Elegido[], dia: string, especialistas: Especialista[], citas: Appointment[], bloqueos: ScheduleBlock[],
  ahora: { hoy: string; minutos: number },
): Horario[] {
  return horariosDelDia(elegidos, dia, agendaDelDia(dia, especialistas, citas, bloqueos), ahora);
}

/** Lo que se ve debajo de cada día del calendario: cuántas horas libres tiene de cuántas ofrece. Sin ninguna que
 *  ofrecer (hoy, cuando ya pasó la última) no es lo mismo que lleno. */
export function cuposDelDia(...args: Parameters<typeof horasDelDia>): { libres: number; total: number } {
  const horas = horasDelDia(...args);
  return { libres: horas.filter((h) => h.plan).length, total: horas.length };
}

/** "Anabel De los Santos" → "Anabel"; "Dra. Melissa Lara" → "Dra. Melissa": para el resumen. */
export function primerNombre(nombre: string): string {
  const [a, b] = nombre.trim().split(/\s+/);
  return /^dra?\.$/i.test(a ?? '') && b ? `${a} ${b}` : a ?? '';
}

/** Las líneas que se guardan: cada servicio empieza cuando termina el anterior, con su especialista y su precio. */
export function lineasDelPlan(plan: LineaPlan[], hora: string, servicios: Service[]): AppointmentLine[] {
  let cursor = timeToMinutes(hora);
  return plan.map((l) => {
    const startTime = minutesToTime(cursor);
    cursor += l.duracion;
    return {
      serviceId: l.serviceId,
      serviceName: l.nombre,
      employee: l.staff.name,
      startTime,
      duration: l.duracion,
      price: servicios.find((s) => s.id === l.serviceId)?.price ?? 0,
    };
  });
}
