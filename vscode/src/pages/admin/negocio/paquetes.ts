// Paquetes: los vendidos (cuántas sesiones le quedan, cuánto debe y cuándo es la próxima) y el catálogo de tipos
// (cuánto sale cada sesión y cuánto se ahorra). Puro: se prueba con node --test.
import type { Appointment } from '../../../store/appointmentStore';
import type { ClientPackage, PackagePayment, Service, SessionPackage } from '../../../store/serviceStore';
import { sinTildes } from '../../../site/reservar/servicios.ts';
import { sesionDelPaquete } from '../agendar/reglas.ts';

export type EstadoPaquete = 'activo' | 'ultima' | 'completado' | 'cancelado';

export const ETIQUETA_PAQUETE: Record<EstadoPaquete, string> = {
  activo: 'Activo', ultima: 'Última sesión', completado: 'Completado', cancelado: 'Cancelado',
};

export interface PaqueteVendido {
  paquete: ClientPackage;
  estado: EstadoPaquete;
  quedan: number;
  /** lo que falta pagar (0 si está saldado) */
  saldo: number;
  /** la próxima sesión agendada, de hoy en adelante */
  proxima: Appointment | null;
  /** sesiones agendadas que todavía no se descuentan (se descuentan al completar la cita) */
  agendadas: number;
}

export function estadoDelPaquete(p: ClientPackage): EstadoPaquete {
  if (p.status === 'cancelled') return 'cancelado';
  const quedan = p.totalSessions - p.usedSessions;
  if (quedan <= 0 || p.status === 'completed') return 'completado';
  return quedan === 1 ? 'ultima' : 'activo';
}

export const sigueActivo = (v: Pick<PaqueteVendido, 'estado'>) => v.estado === 'activo' || v.estado === 'ultima';

/** Cada paquete vendido con lo que hace falta para atenderlo. Primero los activos (los que no tienen la próxima
 *  agendada antes, que son los que hay que llamar; luego por la fecha de la próxima); después los demás, del más
 *  reciente al más viejo. */
export function paquetesVendidos(paquetes: ClientPackage[], citas: Appointment[], hoy: string): PaqueteVendido[] {
  const lista = paquetes.map((p): PaqueteVendido => {
    const estado = estadoDelPaquete(p);
    const { agendadas } = estado === 'activo' || estado === 'ultima' ? sesionDelPaquete(p, citas, hoy) : { agendadas: [] };
    return {
      paquete: p,
      estado,
      quedan: Math.max(0, p.totalSessions - p.usedSessions),
      saldo: Math.max(0, (p.totalPrice || 0) - (p.amountPaid || 0)),
      proxima: agendadas[0] ?? null,
      agendadas: agendadas.length,
    };
  });
  const cuando = (v: PaqueteVendido) => (v.proxima ? `1 ${v.proxima.date} ${v.proxima.time}` : '0');
  return lista.sort((a, b) => {
    const activoA = sigueActivo(a), activoB = sigueActivo(b);
    if (activoA !== activoB) return activoA ? -1 : 1;
    if (activoA) return cuando(a).localeCompare(cuando(b)) || a.paquete.clientName.localeCompare(b.paquete.clientName, 'es');
    return b.paquete.purchasedAt.localeCompare(a.paquete.purchasedAt);
  });
}

export type FiltroPaquetes = 'activos' | 'sinAgendar' | 'conSaldo' | 'completados' | 'todos';

const cumple: Record<FiltroPaquetes, (v: PaqueteVendido) => boolean> = {
  activos: sigueActivo,
  sinAgendar: (v) => sigueActivo(v) && !v.proxima,
  conSaldo: (v) => v.estado !== 'cancelado' && v.saldo > 0,
  completados: (v) => v.estado === 'completado',
  todos: () => true,
};

/** Los del filtro, y con texto, los de esa clienta, paquete o servicio (sin tildes, todas las palabras). */
export function filtrarPaquetes(lista: PaqueteVendido[], filtro: FiltroPaquetes, texto: string): PaqueteVendido[] {
  const palabras = sinTildes(texto.trim()).split(/\s+/).filter(Boolean);
  return lista.filter((v) => {
    if (!cumple[filtro](v)) return false;
    const donde = sinTildes(`${v.paquete.clientName} ${v.paquete.packageName} ${v.paquete.serviceName}`);
    return palabras.every((p) => donde.includes(p));
  });
}

export interface ResumenPaquetes {
  activos: number;
  sinAgendar: number;
  conSaldo: number;
  /** lo que falta por cobrar de todos */
  porCobrar: number;
  completados: number;
}

export function resumenPaquetes(lista: PaqueteVendido[]): ResumenPaquetes {
  const r: ResumenPaquetes = { activos: 0, sinAgendar: 0, conSaldo: 0, porCobrar: 0, completados: 0 };
  for (const v of lista) {
    if (cumple.activos(v)) r.activos++;
    if (cumple.sinAgendar(v)) r.sinAgendar++;
    if (cumple.conSaldo(v)) { r.conSaldo++; r.porCobrar += v.saldo; }
    if (cumple.completados(v)) r.completados++;
  }
  return r;
}

export interface TipoDePaquete {
  tipo: SessionPackage;
  porSesion: number;
  /** cuánto se ahorra (en %) frente a pagar cada sesión suelta; null si no se ahorra o el servicio no tiene precio */
  ahorro: number | null;
  vendidos: number;
  activos: number;
}

/** El catálogo de tipos de paquete: los que se venden primero y por nombre. */
export function catalogoDePaquetes(tipos: SessionPackage[], servicios: Service[], vendidos: ClientPackage[]): TipoDePaquete[] {
  return tipos
    .map((tipo) => {
      const porSesion = tipo.sessions > 0 ? Math.round(tipo.price / tipo.sessions) : 0;
      const suelto = servicios.find((s) => s.id === tipo.serviceId)?.price ?? 0;
      const ahorro = suelto > 0 ? Math.round((1 - porSesion / suelto) * 100) : 0;
      const suyos = vendidos.filter((p) => p.packageId === tipo.id);
      return {
        tipo,
        porSesion,
        ahorro: ahorro > 0 ? ahorro : null,
        vendidos: suyos.length,
        activos: suyos.filter((p) => estadoDelPaquete(p) === 'activo' || estadoDelPaquete(p) === 'ultima').length,
      };
    })
    .sort((a, b) => Number(b.tipo.active) - Number(a.tipo.active) || a.tipo.name.localeCompare(b.tipo.name, 'es'));
}

export const METODOS_PAGO: [PackagePayment['paymentMethod'], string][] = [['cash', 'Efectivo'], ['transfer', 'Transferencia'], ['card', 'Tarjeta']];
export const NOMBRE_METODO: Record<string, string> = Object.fromEntries(METODOS_PAGO);

/** Lo que se revisa antes de registrar un abono: que haya monto y que no pase de lo que debe. */
export function errorDelAbono(monto: number, saldo: number): string | null {
  if (!Number.isFinite(monto) || monto <= 0) return 'Escribe cuánto abona';
  if (monto > saldo) return `No puede pasar de lo que debe (RD$ ${saldo.toLocaleString('es-DO')})`;
  return null;
}

/** Un paquete que la clienta compró antes de usar el sistema ("Paquete previo" al vender): cuándo lo compró, cuántas
 *  sesiones ya se tomó, cuánto costó y cuánto ha pagado. */
export interface PaquetePrevio { fecha: string; tomadas: number; total: number; precio: number; pagado: number }
export interface ErroresPrevio { fecha?: string; tomadas?: string; precio?: string; pagado?: string }

/** Lo que se revisa antes de registrar un paquete previo. */
export function erroresPaquetePrevio(p: PaquetePrevio, hoy: string): ErroresPrevio {
  const e: ErroresPrevio = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.fecha)) e.fecha = '¿Cuándo lo compró?';
  else if (p.fecha > hoy) e.fecha = 'La fecha no puede ser después de hoy';
  if (!Number.isInteger(p.tomadas) || p.tomadas < 0) e.tomadas = 'Escribe cuántas sesiones se tomó';
  else if (p.tomadas > p.total) e.tomadas = `Son ${p.total} sesiones: no pueden ser más`;
  if (!Number.isFinite(p.precio) || p.precio < 0) e.precio = 'Escribe cuánto costó';
  else if (!Number.isFinite(p.pagado) || p.pagado < 0) e.pagado = 'Escribe cuánto ha pagado';
  else if (p.pagado > p.precio) e.pagado = `No puede pasar de lo que costó (RD$ ${p.precio.toLocaleString('es-DO')})`;
  return e;
}

export interface ErroresTipo { name?: string; serviceId?: string; sessions?: string; price?: string }

/** Lo que se revisa antes de guardar un tipo de paquete. */
export function erroresDelTipo(form: { name: string; serviceId: string; sessions: number; price: number }, tipos: SessionPackage[], id: string | null): ErroresTipo {
  const e: ErroresTipo = {};
  const nombre = sinTildes(form.name.trim());
  if (!nombre) e.name = 'Escribe el nombre del paquete';
  else if (tipos.some((t) => t.id !== id && sinTildes(t.name.trim()) === nombre)) e.name = 'Ya hay un paquete con ese nombre';
  if (!form.serviceId) e.serviceId = 'Elige el servicio';
  if (!Number.isInteger(form.sessions) || form.sessions < 2 || form.sessions > 50) e.sessions = 'Entre 2 y 50 sesiones';
  if (!Number.isFinite(form.price) || form.price < 0) e.price = 'Escribe un precio válido';
  return e;
}
