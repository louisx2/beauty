// Mis citas (spec §6.3): próximas, historial, estados y paquetes, listos para mostrar. Puro: se prueba con Node.
import { format12h } from '../../lib/timeFormat.ts';
import { DIAS_CORTOS, MESES, deIso } from '../reservar/calendario.ts';
import { nombreVisible } from '../reservar/servicios.ts';

/** Lo que devuelve get_client_appointments: una fila por cita. */
export interface FilaCita {
  id: string; client_name: string; service: string; employee: string; date: string; time: string;
  duration: number; status: string; notes: string | null; source: string;
}
/** Lo que devuelve get_client_appointment_services: una fila por servicio de la cita. */
export interface FilaServicioCita {
  appointment_id: string; servicio: string; especialista: string; hora: string; duracion: number; orden: number;
}
/** Lo que devuelve get_client_packages. */
export interface FilaPaqueteCliente {
  id: string; paquete_id: string | null; paquete: string | null; servicio: string | null; sesiones: number;
  usadas: number; comprado: string; estado: string; paquete_activo: boolean | null; cliente: string | null;
}

export type Tono = 'warn' | 'ok' | 'bad' | 'mute';

const ESTADOS: Record<string, { texto: string; tono: Tono }> = {
  pending: { texto: 'Pendiente', tono: 'warn' },
  confirmed: { texto: 'Confirmada', tono: 'ok' },
  in_progress: { texto: 'En curso', tono: 'ok' },
  completed: { texto: 'Completada', tono: 'mute' },
  cancelled: { texto: 'Cancelada', tono: 'bad' },
  no_show: { texto: 'No asistió', tono: 'bad' },
};

export function estadoCita(status: string): { texto: string; tono: Tono } {
  return ESTADOS[status] ?? { texto: status, tono: 'mute' };
}

/** Horas que faltan para la cita (negativo si ya pasó). La hora de la cita es la de Santo Domingo. */
export function horasHasta(fecha: string, hora: string, ahora: Date): number {
  // hora de Santo Domingo: UTC-4 todo el año (no hay horario de verano), sin depender del reloj del teléfono
  const cita = new Date(`${fecha}T${hora.slice(0, 5)}:00-04:00`);
  return (cita.getTime() - ahora.getTime()) / 3_600_000;
}

/** "2026-09-15" → "15 sep" */
export function fechaCorta(iso: string): string {
  const d = deIso(iso);
  return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
}

export interface LineaCita { hora: string; nombre: string; quien: string }

export interface CitaVista {
  id: string;
  fecha: string;
  hora: string;
  estado: string;
  tono: Tono;
  titulo: string;
  lineas: LineaCita[];
  ovalo: { dia: string; numero: number; mes: string };
  fechaCorta: string;
  /** se puede cancelar en línea: pendiente o confirmada y faltan más de 12 h (la base tiene la última palabra) */
  cancelable: boolean;
  /** pendiente o confirmada, pero faltan 12 h o menos: se cambia por WhatsApp */
  menosDe12h: boolean;
}

const ACTIVAS = ['pending', 'confirmed', 'in_progress'];
const CANCELABLES = ['pending', 'confirmed'];

function vista(c: FilaCita, servicios: FilaServicioCita[], ahora: Date): CitaVista {
  const propios = servicios.filter((s) => s.appointment_id === c.id).sort((a, b) => a.orden - b.orden);
  const lineas: LineaCita[] = propios.length
    ? propios.map((s) => ({ hora: format12h(s.hora.slice(0, 5)), nombre: nombreVisible(s.servicio), quien: s.especialista }))
    : [{ hora: format12h(c.time.slice(0, 5)), nombre: nombreVisible(c.service), quien: c.employee }];
  const d = deIso(c.date);
  const mes = MESES[d.getMonth()].slice(0, 3);
  const faltan = horasHasta(c.date, c.time, ahora);
  const puede = CANCELABLES.includes(c.status);
  const e = estadoCita(c.status);
  return {
    id: c.id,
    fecha: c.date,
    hora: c.time.slice(0, 5),
    estado: e.texto,
    tono: e.tono,
    titulo: lineas.map((l) => l.nombre).join(' + '),
    lineas,
    ovalo: { dia: DIAS_CORTOS[d.getDay()], numero: d.getDate(), mes: `${mes[0].toUpperCase()}${mes.slice(1)}` },
    fechaCorta: fechaCorta(c.date),
    cancelable: puede && faltan > 12,
    menosDe12h: puede && faltan > 0 && faltan <= 12,
  };
}

/** Próximas: activas y por venir, de la más cercana a la más lejana. Historial: lo demás, de la más reciente. */
export function vistaCitas(
  citas: FilaCita[], servicios: FilaServicioCita[], ahora: Date,
): { proximas: CitaVista[]; historial: CitaVista[] } {
  const proximas: CitaVista[] = [];
  const historial: CitaVista[] = [];
  for (const c of citas) {
    const v = vista(c, servicios, ahora);
    (ACTIVAS.includes(c.status) && horasHasta(c.date, c.time, ahora) > 0 ? proximas : historial).push(v);
  }
  const clave = (v: CitaVista) => `${v.fecha} ${v.hora}`;
  proximas.sort((a, b) => clave(a).localeCompare(clave(b)));
  historial.sort((a, b) => clave(b).localeCompare(clave(a)));
  return { proximas, historial };
}

export interface PaqueteVista {
  id: string;
  nombre: string;
  servicio: string | null;
  desde: string;
  total: number;
  usadas: number;
  quedan: number;
  texto: string;
  terminado: boolean;
  /** a dónde lleva "Reservar mi próxima sesión"; null si ya no quedan sesiones */
  reservar: string | null;
}

/** Sesiones usadas y las que quedan. Un paquete que ya no se vende no se puede preelegir: lleva a /reservar a secas. */
export function vistaPaquetes(filas: FilaPaqueteCliente[]): PaqueteVista[] {
  return filas.map((p) => {
    const total = Math.max(0, Number(p.sesiones) || 0);
    const usadas = Math.min(total, Math.max(0, Number(p.usadas) || 0));
    const quedan = total - usadas;
    const terminado = p.estado !== 'active' || quedan === 0;
    return {
      id: p.id,
      nombre: p.paquete ?? 'Paquete',
      servicio: p.servicio,
      desde: `desde ${fechaCorta(p.comprado)}`,
      total,
      usadas,
      quedan,
      texto: terminado
        ? `${usadas} de ${total} sesiones usadas · paquete terminado`
        : `${usadas} de ${total} sesiones usadas · te ${quedan === 1 ? 'queda 1' : `quedan ${quedan}`}`,
      terminado,
      reservar: terminado ? null : p.paquete_id && p.paquete_activo ? `/reservar?paquete=${p.paquete_id}` : '/reservar',
    };
  });
}

/** "María Altagracia Gómez" → "María" */
export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? '';
}

const cuenta = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** "2 citas próximas · 1 paquete activo · 3 visitas en tu historial". Con `null` en los paquetes (no se pudieron cargar)
 *  no se dice cuántos hay. */
export function textoResumen(proximas: number, paquetesActivos: number | null, historial: number): string {
  return [
    cuenta(proximas, 'cita próxima', 'citas próximas'),
    paquetesActivos === null ? '' : cuenta(paquetesActivos, 'paquete activo', 'paquetes activos'),
    cuenta(historial, 'visita en tu historial', 'visitas en tu historial'),
  ].filter(Boolean).join(' · ');
}

/** Los 10 dígitos del teléfono, escritos como sea. */
export function telefonoCompleto(tel: string): boolean {
  return tel.replace(/\D/g, '').length === 10;
}
