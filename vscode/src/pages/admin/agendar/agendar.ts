// Agendar: una sola ventana para dar una cita (por teléfono, en persona o en un hueco de Hoy), cambiarla,
// reprogramarla, agendar la sesión de un paquete o la próxima al terminar un servicio. Aquí lo que no depende de la
// pantalla: con qué viene según desde dónde se abrió, qué sesión del paquete es y la hora pedida que no cae en la
// media hora. Las horas libres son las de /reservar (disponibilidad.ts). Puro: se prueba con node --test.
import type { Appointment, AppointmentStatus } from '../../../store/appointmentStore';
import type { ScheduleBlock } from '../../../store/blockStore';
import type { Client } from '../../../store/clientStore';
import type { ClientPackage, Service, SessionPackage } from '../../../store/serviceStore';
import { puedeHacer } from '../../../lib/quienAtiende.ts';
import {
  quienPuede, repartirDesde, timeToMinutes, type Elegido, type Especialista, type Horario, type LineaPlan,
} from '../../../site/reservar/disponibilidad.ts';
import { agendaDelDia } from '../citas/proximaCita.ts';

/** La clienta de la cita: con ficha (`id`) o solo nombre y teléfono (una reserva sin ficha). */
export interface ClientaAgenda {
  id: string | null;
  nombre: string;
  telefono: string;
  alergias?: string | null;
}

export const clientaDe = (c: Client): ClientaAgenda => ({ id: c.id, nombre: c.name, telefono: c.phone, alergias: c.allergies });

/** Desde dónde se abrió y con qué viene ya puesto. */
export type PedidoAgendar =
  | {
      modo: 'nueva';
      fecha?: string;
      hora?: string;
      /** la columna del hueco que se tocó en Hoy */
      empleada?: string;
      clienta?: ClientaAgenda;
      servicios?: Elegido[];
      /** la clienta está ahí y la pidió en persona: queda confirmada */
      enPersona?: boolean;
    }
  | { modo: 'editar' | 'reprogramar' | 'proxima'; cita: Appointment }
  | { modo: 'paquete'; paquete: ClientPackage };

const clave = (s: string | null | undefined) => (s ?? '').trim().replace(/^paquete:\s*/i, '').replace(/\s+/g, ' ').toLowerCase();
/** Las que todavía van a descontar una sesión: por venir o en curso. */
const POR_DESCONTAR = new Set<AppointmentStatus>(['pending', 'confirmed', 'in_progress']);

const lineasDe = (c: Appointment) => (c.services.length > 0
  ? c.services
  : [{ serviceId: null, serviceName: c.service, employee: c.employee, startTime: c.time, duration: c.duration, price: 0 }]);

const loHace = (m: Especialista, serviceId: string) => puedeHacer({ role: m.role ?? 'specialist', serviceIds: m.service_ids }, serviceId);

/** Cómo queda al guardar una cita nueva: confirmada si la clienta la pidió en persona (al terminar su servicio, o
 *  la que llegó y se agenda para más tarde); si no, por confirmar. Al cambiarla o moverla el estado no se toca (null). */
export function estadoAlGuardar(pedido: PedidoAgendar): AppointmentStatus | null {
  switch (pedido.modo) {
    case 'proxima': return 'confirmed';
    case 'nueva': return pedido.enPersona ? 'confirmed' : 'pending';
    case 'paquete': return 'pending';
    default: return null;
  }
}

/** La cita que se está cambiando no se estorba a sí misma: su hueco cuenta como libre. */
export function sinLaCita(citas: Appointment[], id: string | null | undefined): Appointment[] {
  return id ? citas.filter((c) => c.id !== id) : citas;
}

/** Lo que se le agenda con un paquete: su servicio, con la especialista que la atendió la última vez si todavía lo
 *  hace (si no, "cualquiera"). */
export function elegidosDelPaquete(
  paquete: ClientPackage, tipos: SessionPackage[], servicios: Service[], especialistas: Especialista[], citas: Appointment[],
): Elegido[] {
  const tipo = tipos.find((t) => t.id === paquete.packageId);
  const s = (tipo ? servicios.find((x) => x.id === tipo.serviceId) : undefined)
    ?? servicios.find((x) => clave(x.name) === clave(paquete.serviceName));
  if (!s) return [];
  const ultima = citas
    .filter((c) => c.client_id === paquete.clientId && c.status === 'completed')
    .flatMap((c) => lineasDe(c)
      .filter((l) => l.serviceId === s.id || clave(l.serviceName) === clave(s.name))
      .map((l) => ({ cuando: `${c.date} ${c.time}`, employee: l.employee })))
    .sort((a, b) => b.cuando.localeCompare(a.cuando))[0];
  const m = ultima ? especialistas.find((x) => clave(x.name) === clave(ultima.employee)) : undefined;
  return [{ serviceId: s.id, staffId: m && loHace(m, s.id) ? m.id : '', nombre: s.name, duracion: s.duration || 45 }];
}

/** Qué sesión del paquete se agenda: las usadas, más las que ya tiene agendadas (o en curso), más esta. Si `numero`
 *  pasa del total, ya tiene agendadas todas las que le quedan. */
export function sesionDelPaquete(paquete: ClientPackage, citas: Appointment[], hoy: string): { numero: number; agendadas: Appointment[] } {
  const servicio = clave(paquete.serviceName);
  const agendadas = citas
    .filter((c) => c.client_id === paquete.clientId && c.date >= hoy && POR_DESCONTAR.has(c.status)
      && lineasDe(c).some((l) => clave(l.serviceName) === servicio || clave(l.serviceName) === clave(paquete.packageName)))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  return { numero: paquete.usedSessions + agendadas.length + 1, agendadas };
}

/** Con una especialista pedida (el hueco de su columna en Hoy), ella hace lo que sabe hacer; lo demás, cualquiera. */
export function conEspecialista(e: Elegido, nombre: string | undefined, especialistas: Especialista[]): Elegido {
  if (!nombre || e.staffId) return e;
  const m = especialistas.find((x) => clave(x.name) === clave(nombre));
  return m && quienPuede([m], e.serviceId).length > 0 ? { ...e, staffId: m.id } : e;
}

/** El reparto a una hora fija (la que ya tenía la cita, o la del hueco de Hoy), o null si no cabe completo. */
export function planALas(
  elegidos: Elegido[], dia: string, hora: string, especialistas: Especialista[], citas: Appointment[], bloqueos: ScheduleBlock[],
): LineaPlan[] | null {
  if (!dia || !hora || elegidos.length === 0) return null;
  return repartirDesde(elegidos, timeToMinutes(hora), dia, agendaDelDia(dia, especialistas, citas, bloqueos));
}

/** La hora pedida aunque no caiga en la media hora (un hueco de Hoy que empieza a las 10:45, la hora que ya tenía
 *  la cita): se agrega a la lista en su lugar. */
export function conHoraPedida(horas: Horario[], hora: string, plan: LineaPlan[] | null): Horario[] {
  if (!hora || horas.some((h) => h.hora === hora)) return horas;
  return [...horas, { hora, plan }].sort((a, b) => a.hora.localeCompare(b.hora));
}
