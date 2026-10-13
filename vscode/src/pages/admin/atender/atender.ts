// Atender ahora: una clienta que llegó sin cita y empieza de una vez. Buscar su ficha (o crearla sin duplicar),
// ver quién está libre en este momento y armar la visita con la misma regla de disponibilidad de /reservar.
// Puro: se prueba con node --test.
import type { Appointment } from '../../../store/appointmentStore';
import type { ScheduleBlock } from '../../../store/blockStore';
import type { Client } from '../../../store/clientStore';
import type { ClientPackage } from '../../../store/serviceStore';
import { repartirDesde, type Elegido, type Especialista, type LineaPlan } from '../../../site/reservar/disponibilidad.ts';
import { sinTildes } from '../../../site/reservar/servicios.ts';
import { agendaDelDia } from '../citas/proximaCita.ts';

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
/** Lo que ocupa a una especialista: lo que ya terminó, se canceló o no vino deja el hueco libre. */
const OCUPAN = new Set(['pending', 'confirmed', 'in_progress']);

const aMinutos = (hhmm: string) => {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return h * 60 + (m || 0);
};

/** Los últimos 10 dígitos: así "+1 (829) 555-1234" y "8295551234" son el mismo número. */
export function telefonoClave(telefono: string): string {
  return telefono.replace(/\D/g, '').slice(-10);
}

/** Mientras se escribe: 829-555-1234 (con más de 10 dígitos que empiezan con 1, se quita el 1 del país). */
export function formatoTelefono(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.length > 10 && d[0] === '1') d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Clientas que coinciden con lo escrito: todas las palabras en el nombre (sin tildes) o, con 3 dígitos o más,
 *  el teléfono. Las que empiezan por lo escrito van primero. */
export function buscarClientas(clientas: Client[], texto: string, max = 8): Client[] {
  const q = sinTildes(texto.trim());
  if (!q) return [];
  const palabras = q.split(/\s+/);
  const digitos = texto.replace(/\D/g, '');
  return clientas
    .filter((c) => {
      const nombre = sinTildes(c.name);
      return palabras.every((p) => nombre.includes(p)) || (digitos.length >= 3 && c.phone.replace(/\D/g, '').includes(digitos));
    })
    .sort((a, b) => Number(!sinTildes(a.name).startsWith(q)) - Number(!sinTildes(b.name).startsWith(q)) || a.name.localeCompare(b.name, 'es'))
    .slice(0, max);
}

/** La ficha que ya tiene ese teléfono (para no crear la misma clienta dos veces). */
export function clientaConTelefono(clientas: Client[], telefono: string): Client | null {
  const clave = telefonoClave(telefono);
  if (clave.length < 10) return null;
  return clientas.find((c) => telefonoClave(c.phone) === clave) ?? null;
}

/** Una clienta nueva necesita nombre y un teléfono de 10 dígitos: con él se la encuentra después y se le escribe. */
export function validarNueva(nombre: string, telefono: string): { nombre?: string; telefono?: string } {
  const errores: { nombre?: string; telefono?: string } = {};
  if (nombre.trim().length < 2) errores.nombre = 'Escribe su nombre';
  if (telefono.replace(/\D/g, '').length !== 10) errores.telefono = 'Teléfono de 10 dígitos';
  return errores;
}

/** La clienta nueva se puede guardar: nombre, teléfono de 10 dígitos y que ese teléfono no sea de otra ficha. */
export function nuevaLista(nueva: { nombre: string; telefono: string }, clientas: Client[]): boolean {
  return Object.keys(validarNueva(nueva.nombre, nueva.telefono)).length === 0 && !clientaConTelefono(clientas, nueva.telefono);
}

export type Disponibilidad =
  | { tipo: 'libre'; hasta: number }
  /** `hasta` puede haber pasado: la cita sigue en curso aunque ya debía terminar */
  | { tipo: 'ocupada'; hasta: number; con: string }
  | { tipo: 'bloqueada'; hasta: number; motivo: string }
  | { tipo: 'entra'; a: number }
  | { tipo: 'termino' }
  | { tipo: 'no_trabaja' };

/** Cómo está una especialista en este momento: libre (y hasta cuándo), ocupada (con quién y hasta cuándo), en un
 *  bloqueo, todavía no entra, ya terminó o no trabaja hoy. */
export function disponibilidadAhora(
  m: Especialista, citas: Appointment[], bloqueos: ScheduleBlock[], hoy: string, minutos: number,
): Disponibilidad {
  if (!(m.working_days ?? []).includes(DIAS[new Date(`${hoy}T12:00:00`).getDay()])) return { tipo: 'no_trabaja' };
  const entra = aMinutos(m.working_start);
  const sale = aMinutos(m.working_end);
  if (minutos < entra) return { tipo: 'entra', a: entra };
  if (minutos >= sale) return { tipo: 'termino' };

  const nombre = m.name.trim().toLowerCase();
  const suyas = citas
    .filter((c) => c.date === hoy && OCUPAN.has(c.status))
    .flatMap((c) => (c.services.length > 0 ? c.services : [{ employee: c.employee, startTime: c.time, duration: c.duration }])
      .filter((l) => (l.employee ?? '').trim().toLowerCase() === nombre)
      .map((l) => {
        const ini = aMinutos(l.startTime || c.time);
        return { ini, fin: ini + (l.duration || 45), con: c.clientName, enCurso: c.status === 'in_progress' };
      }))
    .sort((a, b) => a.ini - b.ini);
  const deHoy = bloqueos
    .filter((b) => b.startDate <= hoy && hoy <= b.endDate && (!b.staffId || b.staffId === m.id))
    .map((b) => ({ ini: b.startTime ? aMinutos(b.startTime) : entra, fin: b.endTime ? aMinutos(b.endTime) : sale, motivo: b.reason || 'Bloqueado' }));

  const bloqueo = deHoy.find((b) => b.ini <= minutos && minutos < b.fin);
  if (bloqueo) return { tipo: 'bloqueada', hasta: bloqueo.fin, motivo: bloqueo.motivo };
  // una cita en curso la ocupa aunque ya se haya pasado de su hora
  const ahora = suyas.find((s) => s.ini <= minutos && (minutos < s.fin || s.enCurso));
  if (ahora) {
    // si tiene otra cita pegada, sigue ocupada hasta que termine esa también
    let hasta = ahora.fin;
    for (const s of suyas) if (s.ini <= hasta && s.fin > hasta) hasta = s.fin;
    return { tipo: 'ocupada', hasta, con: ahora.con };
  }
  const proxima = Math.min(sale, ...suyas.filter((s) => s.ini > minutos).map((s) => s.ini), ...deHoy.filter((b) => b.ini > minutos).map((b) => b.ini));
  return { tipo: 'libre', hasta: proxima };
}

/** La visita armada desde este minuto (quién hace cada servicio), o null si no cabe completa ahora. Lo que ya
 *  terminó no cuenta como ocupado: si la cita de las 9 terminó a las 9:40, a las 9:45 está libre. */
export function planAhora(
  elegidos: Elegido[], especialistas: Especialista[], citas: Appointment[], bloqueos: ScheduleBlock[], hoy: string, minutos: number,
): LineaPlan[] | null {
  if (elegidos.length === 0) return null;
  // una cita en curso que ya se pasó de su hora ocupa hasta este minuto
  const vigentes = citas
    .filter((c) => OCUPAN.has(c.status))
    .map((c) => (c.status !== 'in_progress' || c.date !== hoy ? c : {
      ...c,
      services: c.services.map((l) => {
        const ini = aMinutos(l.startTime || c.time);
        return { ...l, duration: Math.max(l.duration || 45, minutos + 1 - ini) };
      }),
      duration: Math.max(c.duration, minutos + 1 - aMinutos(c.time)),
    }));
  return repartirDesde(elegidos, minutos, hoy, agendaDelDia(hoy, especialistas, vigentes, bloqueos));
}

/** Paquetes activos de la clienta que cubren alguno de estos servicios (al completar se descuenta la sesión). */
export function paquetesQueUsa(paquetes: ClientPackage[], clientId: string | null, elegidos: Elegido[]): ClientPackage[] {
  if (!clientId) return [];
  const nombres = new Set(elegidos.map((e) => e.nombre.trim().toLowerCase()));
  return paquetes.filter((p) =>
    p.clientId === clientId && p.status === 'active' && p.usedSessions < p.totalSessions && nombres.has(p.serviceName.trim().toLowerCase()));
}
