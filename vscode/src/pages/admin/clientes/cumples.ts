// Cumpleaños de las clientas: el dato es opcional (día y mes; el año, si lo quiere dar). Quién cumple hoy y en los
// próximos días, para felicitarla por WhatsApp. Puro: se prueba con node --test.
//
// Se guarda como fecha (columna `birthday`, tipo date). Si no se sabe el año, se guarda con el año 1904 (bisiesto,
// así el 29 de febrero también cabe) y no se muestra la edad.
import type { Client } from '../../../store/clientStore';
import { MESES, deIso, diasEntre } from '../../../site/reservar/calendario.ts';
import { primerNombre } from '../citas/proximaCita.ts';

export const ANIO_SIN_SABER = 1904;

export interface Cumple { dia: number; mes: number; anio: number | null }

/** "1990-10-15" → { dia: 15, mes: 10, anio: 1990 }; con el año 1904, sin año; lo que no es fecha, null. */
export function cumpleDe(birthday: string | null | undefined): Cumple | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthday ?? '');
  if (!m) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return { dia, mes, anio: anio === ANIO_SIN_SABER ? null : anio };
}

const diasDelMes = (mes: number, anio: number) => new Date(anio, mes, 0).getDate();

/** Lo que se escribe en el formulario (día, mes y año opcional) → la fecha a guardar, o el error. Todo vacío: sin
 *  cumpleaños. */
export function fechaDeCumple(f: { dia: string; mes: string; anio: string }, hoy: string): { fecha: string | null; error?: string } {
  const dia = Number(f.dia), mes = Number(f.mes), anioTxt = f.anio.trim();
  if (!f.dia && !f.mes && !anioTxt) return { fecha: null };
  if (!dia || !mes) return { fecha: null, error: 'Elige el día y el mes' };
  const tope = Number(hoy.slice(0, 4));
  const anio = anioTxt ? Number(anioTxt) : ANIO_SIN_SABER;
  if (anioTxt && (!/^\d{4}$/.test(anioTxt) || anio < 1900 || anio > tope)) return { fecha: null, error: `El año va de 1900 a ${tope}` };
  if (dia > diasDelMes(mes, anio)) return { fecha: null, error: `${MESES[mes - 1][0].toUpperCase()}${MESES[mes - 1].slice(1)} no tiene ${dia} días` };
  const fecha = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  if (anioTxt && fecha > hoy) return { fecha: null, error: 'Esa fecha todavía no llega' };
  return { fecha };
}

/** Para el formulario: la fecha guardada → día, mes y año (vacío si no se sabe). */
export function partesDeCumple(birthday: string | null | undefined): { dia: string; mes: string; anio: string } {
  const c = cumpleDe(birthday);
  return c ? { dia: String(c.dia), mes: String(c.mes), anio: c.anio ? String(c.anio) : '' } : { dia: '', mes: '', anio: '' };
}

/** El día en que lo celebra ese año (el 29 de febrero, el 28 si el año no es bisiesto). */
function enElAnio(c: Cumple, anio: number): string {
  const dia = Math.min(c.dia, diasDelMes(c.mes, anio));
  return `${anio}-${String(c.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** "15 de octubre" (y "· cumplió 36" / "· cumple 36" si se sabe el año). */
export function textoCumple(birthday: string | null | undefined, hoy: string): string {
  const c = cumpleDe(birthday);
  if (!c) return '';
  const base = `${c.dia} de ${MESES[c.mes - 1]}`;
  if (!c.anio) return base;
  const anio = Number(hoy.slice(0, 4));
  const yaFue = enElAnio(c, anio) <= hoy;
  const edad = anio - c.anio - (yaFue ? 0 : 1);
  return yaFue ? `${base} · tiene ${edad} años` : `${base} · cumple ${edad + 1}`;
}

export interface CumpleProximo {
  clienta: Client;
  /** el día que lo celebra, "AAAA-MM-DD" */
  fecha: string;
  /** 0 hoy, 1 mañana… */
  enDias: number;
  /** los años que cumple, si se sabe el año */
  cumple: number | null;
}

/** Quién cumple de hoy a `dias` días, primero las de hoy; entre iguales, por nombre. */
export function cumpleanosProximos(clientas: Client[], hoy: string, dias = 7): CumpleProximo[] {
  const anio = Number(hoy.slice(0, 4));
  return clientas
    .flatMap((clienta) => {
      const c = cumpleDe(clienta.birthday);
      if (!c) return [];
      // el de este año, o el del próximo si ya pasó (a fin de año, las de enero)
      let fecha = enElAnio(c, anio);
      if (fecha < hoy) fecha = enElAnio(c, anio + 1);
      const enDias = diasEntre(hoy, fecha);
      if (enDias > dias) return [];
      return [{ clienta, fecha, enDias, cumple: c.anio ? deIso(fecha).getFullYear() - c.anio : null }];
    })
    .sort((a, b) => a.enDias - b.enDias || a.clienta.name.localeCompare(b.clienta.name, 'es'));
}

/** El mensaje de felicitación, listo para WhatsApp (sin emojis: en la computadora salían como "�"). */
export function mensajeCumple(c: Pick<Client, 'name'>): string {
  return `¡Feliz cumpleaños, ${primerNombre(c.name)}! De parte de todo el equipo de Anadsll Beauty Esthetic te deseamos un día precioso y un año lleno de cosas bonitas. ¡Gracias por confiar en nosotras!`;
}
