// Clientas: la lista (buscar, filtrar, ordenar) y la ficha de cada una con todo lo suyo en un solo lugar: sus citas
// por venir, sus paquetes con lo que le queda y lo que falta pagar, y su historial completo (lo del sistema y lo
// anotado de antes). Puro: se prueba con node --test.
import type { Appointment, AppointmentStatus } from '../../../store/appointmentStore';
import type { Client } from '../../../store/clientStore';
import type { ClientPackage } from '../../../store/serviceStore';
import type { EntradaHistorial } from '../../../lib/historialAnterior';
import { sinTildes } from '../../../site/reservar/servicios.ts';
import { telefonoClave } from '../atender/atender.ts';
import { cumpleDe } from './cumples.ts';

const POR_VENIR = new Set<AppointmentStatus>(['pending', 'confirmed']);
const cuando = (c: Appointment) => `${c.date} ${c.time}`;

/** Las citas de la clienta: las de su ficha y, por si una reserva no quedó enlazada, las sin ficha con su teléfono. */
export function citasDeClienta(citas: Appointment[], clienta: Pick<Client, 'id' | 'phone'>): Appointment[] {
  const tel = telefonoClave(clienta.phone);
  return citas.filter((c) => c.client_id === clienta.id || (!c.client_id && tel.length === 10 && telefonoClave(c.clientPhone) === tel));
}

export interface ResumenClienta {
  /** las que vino y se completaron */
  visitas: number;
  noVino: number;
  ultima: Appointment | null;
  /** la próxima por venir (por confirmar o confirmada) */
  proxima: Appointment | null;
  /** la que está en sala ahora */
  enSala: Appointment | null;
}

const VACIO: ResumenClienta = { visitas: 0, noVino: 0, ultima: null, proxima: null, enSala: null };

function sumar(r: ResumenClienta, c: Appointment, hoy: string): ResumenClienta {
  if (c.status === 'completed') {
    return { ...r, visitas: r.visitas + 1, ultima: !r.ultima || cuando(c) > cuando(r.ultima) ? c : r.ultima };
  }
  if (c.status === 'no_show') return { ...r, noVino: r.noVino + 1 };
  if (c.status === 'in_progress') return { ...r, enSala: c };
  if (POR_VENIR.has(c.status) && c.date >= hoy && (!r.proxima || cuando(c) < cuando(r.proxima))) return { ...r, proxima: c };
  return r;
}

/** Lo de una clienta: cuántas veces vino, cuántas no, la última visita, la próxima cita y si está en sala. */
export function resumenDeClienta(citas: Appointment[], hoy: string): ResumenClienta {
  return citas.reduce((r, c) => sumar(r, c, hoy), VACIO);
}

/** Lo mismo para todas a la vez (para la lista), por id de la clienta. */
export function resumenesPorClienta(citas: Appointment[], hoy: string): Map<string, ResumenClienta> {
  const mapa = new Map<string, ResumenClienta>();
  for (const c of citas) {
    if (!c.client_id) continue;
    mapa.set(c.client_id, sumar(mapa.get(c.client_id) ?? VACIO, c, hoy));
  }
  return mapa;
}

/** Sus citas por venir, la más cercana primero (las que ya pasaron sin marcar no cuentan). */
export function proximasCitas(citas: Appointment[], hoy: string): Appointment[] {
  return citas.filter((c) => POR_VENIR.has(c.status) && c.date >= hoy).sort((a, b) => cuando(a).localeCompare(cuando(b)));
}

export type Filtro = 'todas' | 'paquete' | 'cita' | 'alergia' | 'cumple';
export type Orden = 'recientes' | 'nombre' | 'visita';

/** ¿Coincide con lo escrito? Todas las palabras en el nombre (sin tildes), o el teléfono o la cédula con 3 dígitos o
 *  más, o el correo. */
export function coincide(c: Client, texto: string): boolean {
  const q = sinTildes(texto.trim());
  if (!q) return true;
  const nombre = sinTildes(c.name);
  if (q.split(/\s+/).every((p) => nombre.includes(p))) return true;
  const digitos = texto.replace(/\D/g, '');
  if (digitos.length >= 3 && (c.phone.replace(/\D/g, '').includes(digitos) || (c.cedula ?? '').replace(/\D/g, '').includes(digitos))) return true;
  return !!c.email && c.email.toLowerCase().includes(texto.trim().toLowerCase());
}

/** La lista como se pidió: lo que coincide con lo escrito y el filtro, en el orden elegido. Las que cumplen años este
 *  mes (el de `hoy`) van por el día de su cumpleaños. */
export function listaDeClientas(
  clientas: Client[], texto: string, filtro: Filtro, orden: Orden,
  resumenes: Map<string, ResumenClienta>, conPaquete: Set<string>, hoy = '',
): Client[] {
  const mes = Number(hoy.slice(5, 7));
  const pasa = (c: Client) => {
    switch (filtro) {
      case 'paquete': return conPaquete.has(c.id);
      case 'cita': return !!resumenes.get(c.id)?.proxima;
      case 'alergia': return !!c.allergies?.trim();
      case 'cumple': return cumpleDe(c.birthday)?.mes === mes;
      default: return true;
    }
  };
  const ultima = (c: Client) => resumenes.get(c.id)?.ultima;
  return clientas.filter((c) => pasa(c) && coincide(c, texto)).sort((a, b) => {
    if (filtro === 'cumple') return (cumpleDe(a.birthday)?.dia ?? 0) - (cumpleDe(b.birthday)?.dia ?? 0) || a.name.localeCompare(b.name, 'es');
    if (orden === 'nombre') return a.name.localeCompare(b.name, 'es');
    if (orden === 'visita') {
      const ua = ultima(a);
      const ub = ultima(b);
      if (ua && ub) return cuando(ub).localeCompare(cuando(ua));
      if (ua || ub) return ua ? -1 : 1;
    }
    return b.created_at.localeCompare(a.created_at);
  });
}

export interface PaqueteDeClienta {
  paquete: ClientPackage;
  quedan: number;
  /** lo que falta pagar (0 si está saldado) */
  saldo: number;
  activo: boolean;
}

/** Sus paquetes: los activos primero (y entre ellos el más reciente), con lo que le queda y lo que falta pagar. */
export function paquetesDeClienta(paquetes: ClientPackage[], clientId: string): PaqueteDeClienta[] {
  return paquetes
    .filter((p) => p.clientId === clientId)
    .map((p) => ({
      paquete: p,
      quedan: Math.max(0, p.totalSessions - p.usedSessions),
      saldo: Math.max(0, (p.totalPrice || 0) - (p.amountPaid || 0)),
      activo: p.status === 'active' && p.usedSessions < p.totalSessions,
    }))
    .sort((a, b) => Number(b.activo) - Number(a.activo) || b.paquete.purchasedAt.localeCompare(a.paquete.purchasedAt));
}

/** Un renglón del historial: una cita del sistema o algo anotado de antes. */
export type Renglon =
  | { tipo: 'cita'; clave: string; cita: Appointment }
  | { tipo: 'antes'; clave: string; entrada: EntradaHistorial };

/** Todo lo que se le ha hecho, lo más reciente primero: las citas que ya pasaron o están en curso (las por venir van
 *  aparte) y lo anotado de antes. Lo de antes sin fecha va al final. */
export function historialCompleto(citas: Appointment[], anteriores: EntradaHistorial[], hoy: string): Renglon[] {
  const delSistema: Renglon[] = citas
    .filter((c) => !(POR_VENIR.has(c.status) && c.date >= hoy))
    .map((c) => ({ tipo: 'cita', clave: cuando(c), cita: c }));
  const deAntes: Renglon[] = anteriores.map((e) => ({ tipo: 'antes', clave: e.fecha ?? '', entrada: e }));
  return [...delSistema, ...deAntes].sort((a, b) => {
    if (!a.clave || !b.clave) return a.clave ? -1 : b.clave ? 1 : 0;
    return b.clave.localeCompare(a.clave);
  });
}

/** "Yokasta Ramírez" → "YR". */
export function iniciales(nombre: string): string {
  return nombre.trim().split(/\s+/).map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase();
}
