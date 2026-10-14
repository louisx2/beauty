// Agenda: el día, la semana y el mes del salón (o de una especialista) para ver de un vistazo qué hay y dónde queda
// tiempo libre. Se arma con la misma regla del día que usa Hoy (hoy/dia.ts). Puro: se prueba con node --test.
import type { Appointment } from '../../../store/appointmentStore';
import type { ScheduleBlock } from '../../../store/blockStore';
import type { StaffMember } from '../../../store/staffStore';
import { tramoDelSalon } from '../../../lib/horarioSalon.ts';
import { sinTildes } from '../../../site/reservar/servicios.ts';
import { DIAS_CORTOS, MESES, deIso, sumarDias } from '../../../site/reservar/calendario.ts';
import { diaDelSalon, type BloqueCita, type BloqueoVista, type Dia, type Tramo } from '../hoy/dia.ts';

export type Vista = 'dia' | 'semana' | 'mes';
export interface Ahora { hoy: string; minutos: number }

/** Lo cancelado y lo que no vino no ocupa la agenda. */
const FUERA = new Set(['cancelled', 'no_show']);
const SIN_EQUIPO = 'sin-equipo:';

/** Las citas de cada día, para no recorrerlas todas una vez por día. */
export function citasPorDia(citas: Appointment[]): Map<string, Appointment[]> {
  const mapa = new Map<string, Appointment[]>();
  for (const c of citas) (mapa.get(c.date) ?? mapa.set(c.date, []).get(c.date)!).push(c);
  return mapa;
}

/** Lunes a sábado; el domingo solo si el salón abre o alguien tiene cita ese día. */
export function diasDeSemana(lunes: string, porDia: Map<string, Appointment[]>): string[] {
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const domingo = dias[6];
  const usado = (porDia.get(domingo) ?? []).some((c) => !FUERA.has(c.status));
  return tramoDelSalon(domingo) || usado ? dias : dias.slice(0, 6);
}

/** Citas encimadas una al lado de la otra: cada una en su carril; cada grupo de encimadas reparte el ancho entre
 *  los carriles que necesita (las que no se enciman con nadie usan el ancho entero). */
export function enCarriles<T extends Tramo>(bloques: T[]): (T & { carril: number; carriles: number })[] {
  const orden = [...bloques].sort((a, b) => a.inicio - b.inicio || b.fin - a.fin);
  const salida: (T & { carril: number; carriles: number })[] = [];
  let grupo: (T & { carril: number; carriles: number })[] = [];
  let finDelGrupo = -Infinity;
  let finesDeCarril: number[] = [];
  const cerrar = () => {
    for (const b of grupo) b.carriles = finesDeCarril.length;
    salida.push(...grupo);
    grupo = [];
    finesDeCarril = [];
  };
  for (const b of orden) {
    if (b.inicio >= finDelGrupo) cerrar();
    let carril = finesDeCarril.findIndex((fin) => fin <= b.inicio);
    if (carril === -1) carril = finesDeCarril.push(b.fin) - 1;
    else finesDeCarril[carril] = b.fin;
    grupo.push({ ...b, carril, carriles: 1 });
    finDelGrupo = Math.max(finDelGrupo === -Infinity ? b.fin : finDelGrupo, b.fin);
  }
  cerrar();
  return salida;
}

export type BloqueAgenda = BloqueCita & { carril: number; carriles: number; empleada: string };

export interface ColumnaAgenda {
  clave: string;
  fecha: string;
  /** para agendar en un hueco de esta columna: quién (null en "todo el salón") */
  empleada: string | null;
  trabaja: boolean;
  desde: number;
  hasta: number;
  bloques: BloqueAgenda[];
  bloqueos: BloqueoVista[];
  libres: Tramo[];
  minutosLibres: number;
  citas: number;
}

export interface Cuadricula { inicio: number; fin: number; columnas: ColumnaAgenda[] }

/** Lo que ya pasó no se ofrece como libre: un día pasado no tiene huecos; hoy, desde ahora. */
function minutosDesde(fecha: string, ahora: Ahora): number | null {
  if (fecha < ahora.hoy) return 24 * 60;
  return fecha === ahora.hoy ? ahora.minutos : null;
}

function delDia(fecha: string, staff: StaffMember[], porDia: Map<string, Appointment[]>, bloqueos: ScheduleBlock[], ahora: Ahora): Dia {
  return diaDelSalon(fecha, staff, porDia.get(fecha) ?? [], bloqueos, minutosDesde(fecha, ahora));
}

const contarCitas = (bloques: BloqueCita[]) => new Set(bloques.map((b) => b.cita.id)).size;

/** El día en columnas: una por especialista (o solo la elegida), con sus citas, bloqueos y huecos libres. */
export function cuadriculaDelDia(
  fecha: string, staff: StaffMember[], porDia: Map<string, Appointment[]>, bloqueos: ScheduleBlock[], ahora: Ahora,
  especialista: string | null,
): Cuadricula {
  const d = delDia(fecha, staff, porDia, bloqueos, ahora);
  const columnas = d.columnas
    .filter((c) => !especialista || c.id === especialista)
    .map((c): ColumnaAgenda => ({
      clave: c.id,
      fecha,
      empleada: c.id.startsWith(SIN_EQUIPO) ? null : c.nombre,
      trabaja: c.trabaja,
      desde: c.desde,
      hasta: c.hasta,
      bloques: enCarriles(c.bloques).map((b) => ({ ...b, empleada: c.nombre })),
      bloqueos: c.bloqueos,
      libres: c.libres,
      minutosLibres: c.minutosLibres,
      citas: contarCitas(c.bloques),
    }));
  return { inicio: d.inicio, fin: d.fin, columnas };
}

/** La semana en columnas, un día por columna: de una especialista (con sus huecos libres) o de todo el salón (las
 *  citas de todas, encimadas una al lado de la otra, y solo los bloqueos de todo el salón). */
export function cuadriculaDeSemana(
  lunes: string, staff: StaffMember[], porDia: Map<string, Appointment[]>, bloqueos: ScheduleBlock[], ahora: Ahora,
  especialista: string | null,
): Cuadricula {
  const dias = diasDeSemana(lunes, porDia).map((fecha) => ({ fecha, d: delDia(fecha, staff, porDia, bloqueos, ahora) }));
  const columnas = dias.map(({ fecha, d }): ColumnaAgenda => {
    if (especialista) {
      const c = d.columnas.find((x) => x.id === especialista);
      return {
        clave: fecha, fecha, empleada: c?.nombre ?? null,
        trabaja: !!c?.trabaja, desde: c?.desde ?? 0, hasta: c?.hasta ?? 0,
        bloques: c ? enCarriles(c.bloques).map((b) => ({ ...b, empleada: c.nombre })) : [],
        bloqueos: c?.bloqueos ?? [],
        libres: c?.libres ?? [],
        minutosLibres: c?.minutosLibres ?? 0,
        citas: c ? contarCitas(c.bloques) : 0,
      };
    }
    const trabajan = d.columnas.filter((c) => c.trabaja);
    const todos = d.columnas.flatMap((c) => c.bloques.map((b) => ({ ...b, empleada: c.nombre })));
    const desde = trabajan.length ? Math.min(...trabajan.map((c) => c.desde)) : 0;
    const hasta = trabajan.length ? Math.max(...trabajan.map((c) => c.hasta)) : 0;
    return {
      clave: fecha, fecha, empleada: null,
      trabaja: trabajan.length > 0, desde, hasta,
      bloques: enCarriles(todos),
      // los de todo el salón (feriado, cierre): de cualquier columna, sin repetir
      bloqueos: bloqueos
        .filter((b) => !b.staffId && b.startDate <= fecha && fecha <= b.endDate)
        .map((b) => {
          const todoElDia = !b.startTime || !b.endTime;
          const [hi, mi] = (b.startTime ?? '0:0').split(':').map(Number);
          const [hf, mf] = (b.endTime ?? '0:0').split(':').map(Number);
          return { inicio: todoElDia ? desde : hi * 60 + mi, fin: todoElDia ? hasta : hf * 60 + mf, motivo: b.reason, todoElDia };
        }),
      libres: [],
      minutosLibres: d.columnas.reduce((n, c) => n + c.minutosLibres, 0),
      citas: contarCitas(todos),
    };
  });
  const conAlgo = dias.map(({ d }) => d);
  return {
    inicio: Math.min(...conAlgo.map((d) => d.inicio)),
    fin: Math.max(...conAlgo.map((d) => d.fin)),
    columnas,
  };
}

export interface DiaDelMes {
  fecha: string;
  abierto: boolean;
  citas: number;
  porConfirmar: number;
  /** tiempo libre que queda (de hoy en adelante) y tiempo de trabajo del día: para la barra de ocupación */
  minutosLibres: number;
  minutosTrabajo: number;
}

/** Cada día del mes: cuántas citas, cuántas por confirmar y cuánto queda libre (de todo el salón o de una). */
export function resumenDelMes(
  fechas: string[], staff: StaffMember[], porDia: Map<string, Appointment[]>, bloqueos: ScheduleBlock[], ahora: Ahora,
  especialista: string | null,
): Map<string, DiaDelMes> {
  const mapa = new Map<string, DiaDelMes>();
  for (const fecha of fechas) {
    const d = delDia(fecha, staff, porDia, bloqueos, ahora);
    const cols = d.columnas.filter((c) => !especialista || c.id === especialista);
    const citas = new Map<string, Appointment>();
    for (const c of cols) for (const b of c.bloques) citas.set(b.cita.id, b.cita);
    mapa.set(fecha, {
      fecha,
      abierto: !!tramoDelSalon(fecha),
      citas: citas.size,
      porConfirmar: [...citas.values()].filter((c) => c.status === 'pending').length,
      minutosLibres: cols.reduce((n, c) => n + c.minutosLibres, 0),
      minutosTrabajo: cols.filter((c) => c.trabaja).reduce((n, c) => n + Math.max(0, c.hasta - c.desde), 0),
    });
  }
  return mapa;
}

/** Buscar citas por clienta (sin tildes, por palabras), teléfono o servicio. Las por venir primero (la más cercana
 *  arriba) y después las que ya pasaron (la más reciente arriba). */
export function buscarCitas(citas: Appointment[], texto: string, hoy: string, max = 60): Appointment[] {
  const q = sinTildes(texto.trim());
  if (!q) return [];
  const palabras = q.split(/\s+/);
  const digitos = texto.replace(/\D/g, '');
  const cuando = (c: Appointment) => `${c.date} ${c.time}`;
  return citas
    .filter((c) => {
      const donde = sinTildes(`${c.clientName} ${c.service}`);
      return palabras.every((p) => donde.includes(p)) || (digitos.length >= 3 && c.clientPhone.replace(/\D/g, '').includes(digitos));
    })
    .sort((a, b) => {
      const va = a.date >= hoy;
      const vb = b.date >= hoy;
      if (va !== vb) return va ? -1 : 1;
      return va ? cuando(a).localeCompare(cuando(b)) : cuando(b).localeCompare(cuando(a));
    })
    .slice(0, max);
}

/** Lo que se ve arriba: "Jueves 15 de octubre", "12 – 17 de octubre", "28 sep – 3 oct", "Octubre 2026". */
export function tituloDeRango(vista: Vista, fecha: string, dias: string[] = []): string {
  const d = deIso(fecha);
  if (vista === 'mes') return `${MESES[d.getMonth()][0].toUpperCase()}${MESES[d.getMonth()].slice(1)} ${d.getFullYear()}`;
  if (vista === 'dia') {
    const t = `${['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
    return `${t[0].toUpperCase()}${t.slice(1)}`;
  }
  const a = deIso(dias[0] ?? fecha);
  const b = deIso(dias[dias.length - 1] ?? fecha);
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()} – ${b.getDate()} de ${MESES[a.getMonth()]}`
    : `${a.getDate()} ${MESES[a.getMonth()].slice(0, 3)} – ${b.getDate()} ${MESES[b.getMonth()].slice(0, 3)}`;
}

/** "Lun 12" para la cabeza de cada día. */
export function diaCorto(fecha: string): string {
  const d = deIso(fecha);
  if (Number.isNaN(d.getTime())) return '';
  return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()}`;
}

/** "Jue 15 oct" para las listas. */
export function fechaCorta(fecha: string): string {
  const d = deIso(fecha);
  if (Number.isNaN(d.getTime())) return '';
  return `${DIAS_CORTOS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
}

/** Un toque en una columna vacía: la media hora en que cayó (para agendar ahí). */
export function horaDelToque(minutos: number, desde: number, hasta: number): number {
  const redondo = Math.floor(minutos / 30) * 30;
  return Math.min(Math.max(redondo, desde), Math.max(desde, hasta - 30));
}
