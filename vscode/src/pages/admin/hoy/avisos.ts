// Recordatorios de mañana: a quién hay que escribirle, el mensaje listo para WhatsApp y a quién ya se le escribió
// (se anota en este equipo). Puro: se prueba con node --test.
import type { Appointment } from '../../../store/appointmentStore';
import { format12h } from '../../../lib/timeFormat.ts';
import { fechaLarga } from '../../../site/reservar/resumen.ts';

/** Las citas de mañana para recordar (por confirmar y confirmadas), en orden de hora: así ninguna salta de lugar
 *  cuando se confirma. */
export function citasParaRecordar(citas: Appointment[], manana: string): Appointment[] {
  return citas
    .filter((c) => c.date === manana && (c.status === 'pending' || c.status === 'confirmed'))
    .sort((a, b) => a.time.localeCompare(b.time));
}

/** A quién escribirle ahora: primero las que faltan por confirmar, después las confirmadas; de las que no se avisó. */
export function siguienteParaAvisar(citas: Appointment[], marcas: Marcas): Appointment | null {
  const sinAvisar = citas.filter((c) => !marcas[c.id]);
  return sinAvisar.find((c) => c.status === 'pending') ?? sinAvisar[0] ?? null;
}

const primerNombre = (n: string) => n.trim().split(/\s+/)[0] ?? n;
const conQuien = (c: Appointment) => {
  const nombres = [...new Set((c.services.length > 0 ? c.services.map((l) => l.employee) : [c.employee]).filter(Boolean))];
  return nombres.length ? ` con ${nombres.map((n) => (/^dra?\.$/i.test(n.split(/\s+/)[0]) ? n.split(/\s+/).slice(0, 2).join(' ') : primerNombre(n))).join(' y ')}` : '';
};

/** El mensaje: el día, la hora, qué se va a hacer y con quién; si falta confirmar, se le pide que confirme. */
export function mensajeRecordatorio(c: Appointment): string {
  const cuando = `mañana ${fechaLarga(c.date)} a las ${format12h(c.time)}`;
  const que = `${c.service}${conQuien(c)}`;
  const cierre = c.status === 'pending'
    ? '¿Nos confirmas que vienes? Si necesitas cambiarla, respóndenos por aquí.'
    : '¡Te esperamos! Si necesitas cambiarla, respóndenos por aquí.';
  return `Hola ${primerNombre(c.clientName)} 👋 Te recordamos tu cita de ${cuando}: ${que}. ${cierre}\n\nAnadsll Beauty Esthetic`;
}

/** A quién ya se le escribió (por id de la cita): el día en que se le escribió y a qué hora. */
export type Marcas = Record<string, { dia: string; hora: string }>;

/** Solo las de hoy: lo de días anteriores ya no sirve (y no se acumula). */
export function marcasDeHoy(marcas: Marcas, hoy: string): Marcas {
  return Object.fromEntries(Object.entries(marcas).filter(([, m]) => m.dia === hoy));
}

/** Cómo va mañana: cuántas citas, cuántas por confirmar y a cuántas falta escribirles. */
export function resumenRecordatorios(citas: Appointment[], marcas: Marcas): { total: number; porConfirmar: number; sinAvisar: number } {
  return {
    total: citas.length,
    porConfirmar: citas.filter((c) => c.status === 'pending').length,
    sinAvisar: citas.filter((c) => !marcas[c.id]).length,
  };
}

const MARCAS = 'anadsll-recordatorios';

/** A quién ya se le escribió, guardado en este equipo (si el navegador no deja, empieza vacío). */
export function leerMarcas(): Marcas {
  try { return JSON.parse(localStorage.getItem(MARCAS) ?? '{}'); } catch { return {}; }
}

export function guardarMarcas(m: Marcas) {
  try { localStorage.setItem(MARCAS, JSON.stringify(m)); } catch { /* sin guardar */ }
}
