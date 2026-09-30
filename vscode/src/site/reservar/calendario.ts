// Calendario de /reservar (spec §6.1): semana de 7 días, mes completo y hasta 90 días adelante.
// Puro y sin imports: se prueba con Node. Las fechas viajan como texto "AAAA-MM-DD" en hora local.

/** Hasta cuántos días adelante se puede reservar (constante configurable, spec §6.1). */
export const DIAS_MAXIMOS = 90;

export const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const dos = (n: number) => String(n).padStart(2, '0');

/** Fecha local → "2026-09-29", sin pasar por UTC (toISOString cambiaría el día por la noche). */
export function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/** "2026-09-29" → fecha a mediodía local: así sumar días nunca salta por un cambio de hora. */
export function deIso(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d, 12);
}

export function sumarDias(iso: string, n: number): string {
  const d = deIso(iso);
  d.setDate(d.getDate() + n);
  return isoLocal(d);
}

/** Días de `desde` a `hasta` (negativo si `hasta` es antes). */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((deIso(hasta).getTime() - deIso(desde).getTime()) / 86_400_000);
}

/** Lunes de la semana de ese día: la semana va de lunes a domingo. */
export function lunesDe(iso: string): string {
  return sumarDias(iso, -((deIso(iso).getDay() + 6) % 7));
}

export type Motivo = 'domingo' | 'pasado' | 'lejos' | null;

/** Por qué no se puede reservar ese día; null si se puede. */
export function motivoNoReservable(iso: string, hoy: string, max = DIAS_MAXIMOS): Motivo {
  const n = diasEntre(hoy, iso);
  if (n < 0) return 'pasado';
  if (n > max) return 'lejos';
  if (deIso(iso).getDay() === 0) return 'domingo';
  return null;
}

/** El primer día que se puede reservar desde hoy (si hoy es domingo, el lunes). */
export function primerDiaReservable(hoy: string): string {
  let d = hoy;
  for (let i = 0; i <= DIAS_MAXIMOS && motivoNoReservable(d, hoy) !== null; i++) d = sumarDias(d, 1);
  return d;
}

export interface Dia {
  iso: string;
  /** "Lun" */
  corto: string;
  numero: number;
  /** "sep" */
  mes: string;
  esHoy: boolean;
  motivo: Motivo;
}

function dia(iso: string, hoy: string): Dia {
  const d = deIso(iso);
  return {
    iso,
    corto: DIAS_CORTOS[d.getDay()],
    numero: d.getDate(),
    mes: MESES[d.getMonth()].slice(0, 3),
    esHoy: iso === hoy,
    motivo: motivoNoReservable(iso, hoy),
  };
}

/** Los 7 días de la semana que empieza en `lunes`. */
export function semana(lunes: string, hoy: string): Dia[] {
  return Array.from({ length: 7 }, (_, i) => dia(sumarDias(lunes, i), hoy));
}

export interface Flechas { anterior: boolean; siguiente: boolean }

/** No se va a una semana ya pasada ni a una que empieza después del límite. */
export function flechasSemana(lunes: string, hoy: string): Flechas {
  return {
    anterior: lunes > lunesDe(hoy),
    siguiente: diasEntre(hoy, sumarDias(lunes, 7)) <= DIAS_MAXIMOS,
  };
}

/** Un mes a la vista; `mes` va de 0 (enero) a 11 (diciembre). */
export interface MesVisto { anio: number; mes: number }

/** El mes que se nombra sobre una semana: el de su jueves, que siempre tiene la mayoría de los días. */
export function mesDeSemana(lunes: string): MesVisto {
  const d = deIso(sumarDias(lunes, 3));
  return { anio: d.getFullYear(), mes: d.getMonth() };
}

/** "Septiembre 2026" */
export function etiquetaMes({ anio, mes }: MesVisto): string {
  const m = MESES[mes];
  return `${m[0].toUpperCase()}${m.slice(1)} ${anio}`;
}

export function sumarMeses({ anio, mes }: MesVisto, n: number): MesVisto {
  const t = anio * 12 + mes + n;
  return { anio: Math.floor(t / 12), mes: t % 12 };
}

const primeroDe = ({ anio, mes }: MesVisto) => `${anio}-${dos(mes + 1)}-01`;

/** Días del mes en una cuadrícula que empieza en lunes: null en los huecos antes del día 1. */
export function mesEnCuadricula(visto: MesVisto, hoy: string): (Dia | null)[] {
  const primero = primeroDe(visto);
  const huecos = (deIso(primero).getDay() + 6) % 7;
  const total = new Date(visto.anio, visto.mes + 1, 0).getDate();
  return [
    ...Array.from({ length: huecos }, () => null),
    ...Array.from({ length: total }, (_, i) => dia(sumarDias(primero, i), hoy)),
  ];
}

/** No se va a un mes ya pasado ni a uno sin días reservables (fuera del límite, o solo un domingo dentro). */
export function flechasMes(visto: MesVisto, hoy: string): Flechas {
  const h = deIso(hoy);
  return {
    anterior: visto.anio * 12 + visto.mes > h.getFullYear() * 12 + h.getMonth(),
    siguiente: hayReservableEnMes(sumarMeses(visto, 1), hoy),
  };
}

/** Si el mes tiene algún día que se pueda reservar (abierto, desde hoy y dentro del límite). */
export function hayReservableEnMes(visto: MesVisto, hoy: string): boolean {
  return mesEnCuadricula(visto, hoy).some((d) => d !== null && d.motivo === null);
}

/** El mes que abre "Ver mes": nunca antes del de hoy, ni uno sin días reservables al final (p. ej. cuando el día 90 es
 *  un domingo 1). */
export function mesAcotado(m: MesVisto, hoy: string): MesVisto {
  const h = deIso(hoy);
  const desde: MesVisto = { anio: h.getFullYear(), mes: h.getMonth() };
  const n = (x: MesVisto) => x.anio * 12 + x.mes;
  let r = n(m) < n(desde) ? desde : m;
  while (n(r) > n(desde) && !hayReservableEnMes(r, hoy)) r = sumarMeses(r, -1);
  return r;
}

/** La semana que muestra "Ver semana" al volver del mes: la del primer día reservable de ese mes. Si esa semana se
 *  nombra con el mes anterior (su jueves cae antes) y la siguiente sí es del mes, va a la siguiente. */
export function lunesParaMes(visto: MesVisto, hoy: string): string {
  const dia = mesEnCuadricula(visto, hoy).find((d) => d !== null && d.motivo === null)?.iso ?? primerDiaReservable(hoy);
  const lunes = lunesDe(dia);
  const siguiente = sumarDias(lunes, 7);
  const delMes = (l: string) => {
    const m = mesDeSemana(l);
    return m.anio === visto.anio && m.mes === visto.mes;
  };
  return !delMes(lunes) && delMes(siguiente) && flechasSemana(lunes, hoy).siguiente ? siguiente : lunes;
}

/** Cuánto falta para la próxima medianoche local, más 5 s de margen (para cambiar "hoy" sin recargar). */
export function msHastaMedianoche(ahora: Date): number {
  const manana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, 0, 0, 5);
  return manana.getTime() - ahora.getTime();
}
