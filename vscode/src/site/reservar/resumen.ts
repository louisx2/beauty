// Resumen de la visita (spec §6.1 y §6.2): horas encadenadas, quién hace cada servicio, fechas y textos.
// Puro: se prueba con Node.
import { format12h } from '../../lib/timeFormat.ts';
import { DIAS_LARGOS, MESES, deIso } from './calendario.ts';
import { minutesToTime, timeToMinutes, type Elegido, type Especialista, type LineaPlan } from './disponibilidad.ts';

/** "2026-10-01" → "jueves 1 de octubre" */
export function fechaLarga(iso: string): string {
  const d = deIso(iso);
  return `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/** "Jueves 1 de octubre", para títulos. */
export function fechaTitulo(iso: string): string {
  const t = fechaLarga(iso);
  return `${t[0].toUpperCase()}${t.slice(1)}`;
}

/** 45 → "45 min", 60 → "1 h", 105 → "1 h 45 min" */
export function duracionTexto(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ') || '0 min';
}

export interface LineaResumen { hora: string | null; nombre: string; duracion: number; quien: string }

/** Sin hora elegida: sin horas, y "Primera disponible" donde eligió "Cualquiera".
 *  Con hora y reparto: la hora de cada servicio, encadenada, y quién lo hace. */
export function lineasResumen(
  elegidos: Elegido[], staff: Especialista[], hora: string | null, plan: LineaPlan[] | null,
): LineaResumen[] {
  if (hora && plan) {
    let cursor = timeToMinutes(hora);
    return plan.map((l) => {
      const linea = { hora: format12h(minutesToTime(cursor)), nombre: l.nombre, duracion: l.duracion, quien: l.staff.name };
      cursor += l.duracion;
      return linea;
    });
  }
  return elegidos.map((e) => ({
    hora: null,
    nombre: e.nombre,
    duracion: e.duracion,
    quien: (e.staffId && staff.find((m) => m.id === e.staffId)?.name) || 'Primera disponible',
  }));
}

/** "10:00 AM – 11:45 AM" */
export function rangoHoras(hora: string, totalMin: number): string {
  return `${format12h(hora)} – ${format12h(minutesToTime(timeToMinutes(hora) + totalMin))}`;
}

/** Barra de abajo en tableta y celular: "2 servicios · 10:00 AM" y "jueves 1 de octubre". */
export function textoBarra(cantidad: number, dia: string | null, hora: string | null): { titulo: string; detalle: string } {
  if (cantidad === 0) return { titulo: 'Elige un servicio', detalle: 'para empezar' };
  const titulo = `${cantidad} ${cantidad === 1 ? 'servicio' : 'servicios'}${hora ? ` · ${format12h(hora)}` : ''}`;
  return { titulo, detalle: dia ? fechaLarga(dia) : 'Falta elegir día y hora' };
}

/** El mensaje de WhatsApp de siempre, para mandar el comprobante (mismo texto que el diseño anterior). */
export function mensajeWhatsApp(d: {
  nombre: string; telefono: string; plan: LineaPlan[]; fecha: string; hora: string; notas: string;
}): string {
  const detalle = d.plan.map((l) => `- ${l.nombre} con ${l.staff.name}`).join('\n');
  return (
    `Hola, acabo de reservar una cita:\n\n` +
    `Nombre: ${d.nombre}\n` +
    `Telefono: ${d.telefono}\n` +
    `${d.plan.length > 1 ? 'Servicios' : 'Servicio'}:\n${detalle}\n` +
    `Fecha: ${d.fecha}\n` +
    `Hora: ${format12h(d.hora)}\n` +
    `Notas: ${d.notas.trim() || 'Ninguna'}\n\n` +
    `Adjunto el comprobante de deposito para confirmar mi cita.`
  );
}
