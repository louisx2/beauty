// Cuántas veces vino la clienta y cuántas veces se ha hecho cada servicio, como un récord: con las citas completadas
// del sistema y lo anotado en el historial previo. Puro: se prueba con node --test.
import type { Appointment } from '../../../store/appointmentStore';
import type { Service } from '../../../store/serviceStore';
import type { EntradaHistorial } from '../../../lib/historialAnterior';
import { nombreVisible, sinTildes } from '../../../site/reservar/servicios.ts';
import type { Renglon } from './ficha.ts';

type Catalogo = Pick<Service, 'id' | 'name'>[];

const sinPaquete = (nombre: string) => nombre.trim().replace(/^paquete:\s*/i, '');

/** Para juntar lo mismo escrito distinto: sin tildes, mayúsculas, guiones ni el "Paquete:" de las reservas.
 *  "Depilación Láser - Axilas" y "depilacion laser axilas" son el mismo servicio. */
export function claveServicio(nombre: string): string {
  return sinTildes(sinPaquete(nombre)).replace(/[-–·]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** El nombre que tiene hoy en el catálogo el servicio de una línea (por si se renombró, o si se reservó con un
 *  paquete y dice "Paquete: …"); si no está en el catálogo, el de la línea. */
export function nombreDeLinea(l: { serviceId: string | null; serviceName: string }, catalogo: Catalogo): string {
  return (l.serviceId && catalogo.find((s) => s.id === l.serviceId)?.name) || l.serviceName;
}

/** Los servicios de una cita (sin líneas, el de la cabecera). */
function nombresDeCita(c: Appointment, catalogo: Catalogo): string[] {
  const lineas = c.services.length > 0 ? c.services : [{ serviceId: null, serviceName: c.service }];
  return lineas.map((l) => nombreDeLinea(l, catalogo));
}

export interface Visitas {
  total: number;
  /** las citas completadas en el sistema */
  enSistema: number;
  /** las del historial previo: un día cuenta una vez aunque se anotaran dos servicios, y no cuenta si ese día ya hay
   *  una cita completada (es la misma visita); lo anotado sin fecha cuenta cada uno */
  enHistorial: number;
  /** las de antes sin detalle: el número que se pone a mano en la ficha */
  sinDetalle: number;
  /** AAAA-MM-DD de la más reciente, del sistema o del historial previo */
  ultima: string | null;
}

/** Cuántas veces vino: las citas completadas, los días del historial previo y las de antes sin detalle. */
export function contarVisitas(citas: Appointment[], anteriores: EntradaHistorial[], sinDetalle = 0): Visitas {
  const hechas = citas.filter((c) => c.status === 'completed');
  const dias = new Set(hechas.map((c) => c.date));
  let enHistorial = 0;
  for (const e of anteriores) {
    if (!e.fecha) enHistorial++;
    else if (!dias.has(e.fecha)) {
      dias.add(e.fecha);
      enHistorial++;
    }
  }
  const extra = Math.max(0, Math.floor(sinDetalle || 0));
  const ultima = [...dias].reduce<string | null>((u, d) => (!u || d > u ? d : u), null);
  return { total: hechas.length + enHistorial + extra, enSistema: hechas.length, enHistorial, sinDetalle: extra, ultima };
}

export interface VecesServicio {
  clave: string;
  /** como se ve: "Depilación Láser · Axilas" */
  nombre: string;
  veces: number;
  /** AAAA-MM-DD de la última vez; null si solo está en el historial previo sin fecha */
  ultima: string | null;
}

/** El récord: cuántas veces se hizo cada servicio (cada cita completada y cada renglón del historial previo), el que
 *  más veces arriba. Las citas que no vino, las canceladas y las por venir no cuentan. */
export function recordDeServicios(citas: Appointment[], anteriores: EntradaHistorial[], catalogo: Catalogo = []): VecesServicio[] {
  const porClave = new Map<string, VecesServicio>();
  const sumar = (nombre: string, fecha: string | null) => {
    const clave = claveServicio(nombre);
    if (!clave) return;
    const r = porClave.get(clave) ?? { clave, nombre: nombreVisible(sinPaquete(nombre)), veces: 0, ultima: null };
    porClave.set(clave, { ...r, veces: r.veces + 1, ultima: fecha && (!r.ultima || fecha > r.ultima) ? fecha : r.ultima });
  };
  for (const c of citas) {
    if (c.status !== 'completed') continue;
    const vistos = new Set<string>();
    for (const nombre of nombresDeCita(c, catalogo)) {
      if (vistos.has(claveServicio(nombre))) continue;
      vistos.add(claveServicio(nombre));
      sumar(nombre, c.date);
    }
  }
  for (const e of anteriores) sumar(e.servicio, e.fecha);
  // lo escrito a mano que coincide con el catálogo se ve como en el catálogo
  for (const s of catalogo) {
    const r = porClave.get(claveServicio(s.name));
    if (r) r.nombre = nombreVisible(s.name);
  }
  return [...porClave.values()].sort((a, b) =>
    b.veces - a.veces || (b.ultima ?? '').localeCompare(a.ultima ?? '') || a.nombre.localeCompare(b.nombre, 'es'));
}

/** Los renglones del historial de un servicio (los que cuentan: citas completadas y lo de antes) con su número de vez:
 *  el historial va del más reciente al más viejo, así que el de arriba tiene la vez más alta. */
export function vecesEnHistorial(historial: Renglon[], clave: string, catalogo: Catalogo = []): { renglon: Renglon; vez: number }[] {
  const suyos = historial.filter((r) => (r.tipo === 'antes'
    ? claveServicio(r.entrada.servicio) === clave
    : r.cita.status === 'completed' && nombresDeCita(r.cita, catalogo).some((n) => claveServicio(n) === clave)));
  return suyos.map((renglon, i) => ({ renglon, vez: suyos.length - i }));
}

/** Qué vez es este servicio para ella: las que ya se hizo, más esta. */
export function vezDelServicio(record: VecesServicio[], nombre: string): number {
  return (record.find((r) => r.clave === claveServicio(nombre))?.veces ?? 0) + 1;
}

/** "1.ª vez", "8.ª vez". */
export const textoVez = (vez: number) => `${vez}.ª vez`;
