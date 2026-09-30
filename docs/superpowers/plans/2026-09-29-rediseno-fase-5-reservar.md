# Rediseño · Fase 5: `/reservar` en tres pasos — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/reservar` pasa a tener la cara nueva, con tres pasos en una sola página (servicios, día y hora, tus
datos), un resumen "Tu visita" y la confirmación con el depósito. La lógica de disponibilidad, bloqueos, choque
de horas y guardado sigue siendo la de hoy.

**Architecture:**
- **Lógica pura con pruebas:** el cálculo de `Booking.tsx` se saca tal cual a funciones puras en
  `src/site/reservar/`:
  - `disponibilidad.ts`: quién puede, quién está libre y a qué horas cabe la visita;
  - `calendario.ts`: la semana, el mes y los 90 días;
  - `servicios.ts`: la lista con su familia, su especialidad y su precio, y el buscador;
  - `resumen.ts` y `datos.ts`: las horas encadenadas, los textos y la validación.
- **Un hook para las dos caras:** `useBooking` junta los datos, la agenda del día, la relectura y el guardado.
  Lo usan la reserva nueva y la vieja.
- **El diseño viejo no se pierde:** la reserva vieja se mueve a `src/legacy/` con su ruta
  `/diseno-anterior/reservar`, y así se comprueba que el hook no cambió el comportamiento.
- **La interfaz nueva:** se arma con una pieza por paso, más el resumen, la barra y la confirmación.

**Tech Stack:** React 19 + TypeScript + Vite 7, react-router-dom 7, Supabase JS, zustand, CSS plano por componente
y `node --test` (`npm test`).

**Spec:** `docs/superpowers/specs/2026-09-27-rediseno-web-clienta-design.md`, en estas secciones:
- §6.1 `/reservar`;
- §6.2 confirmación;
- §4.4 WhatsApp;
- §8 arquitectura y diseño anterior;
- §10 pruebas;
- §3 sistema visual.

**Boceto aprobado:** `C:/Users/loui-/Desktop/ANABEL/bocetos-rediseno/citas-v2.html`, páginas "/reservar" y
"Confirmación". El CSS está en las líneas 99–247 y los cortes en 291–384; el HTML en 443–530. Es la fuente de las
medidas y los textos.

**Base que dejaron las fases anteriores** (rama `claude/rediseno-fase-4-equipo`, todavía sin fusionar):
- **Lo que se reemplaza:** `src/pages/BookingPage.tsx` usa `legacy/Navbar`, `components/Booking` y
  `legacy/Footer`. `src/components/Booking.tsx` (828 líneas, CRLF) tiene toda la lógica y la interfaz vieja.
- **Diseño y armado de la página:**
  - `src/site/SiteLayout.tsx` ya acepta `secciones` y `whatsappElevado`;
  - `src/site/theme/tokens.css` tiene las variables `--s-*`, `.s-btn`, `.s-wrap`, `.s-eyebrow`, `.s-display` y
    `.s-sr`;
  - `src/site/ui/SesionesOvalos.tsx` dibuja las sesiones en óvalos.
- **Catálogo y equipo:**
  - `src/site/landing/catalogo.ts` tiene `FAMILIAS`, `formatoRD`, `SIN_PRECIO`, `nombreEnTabla` y
    `precioDelTexto`, y privadas `gruposDe` y `precioVista`;
  - `src/site/landing/equipo.ts` exporta `iniciales`;
  - `src/data/servicesMenu.ts` exporta `servicesMenu` (15 especialidades con `id`, `title` y `familia`).
- **Secciones:** `src/site/header/secciones.ts` tiene `seccionesPresentes({ paquetes, equipo, opiniones })`.
- **Datos:** `src/store/settingsStore.ts` da `deposit_amount`, `bank_accounts` y `whatsapp_number`.

**Base de datos (solo se lee, no hay migración):**
- **`services`:** 84 activos, con precio 0 en los que no son médicos.
- **`staff`:** anon puede leer `id, name, role, active, avatar_url, service_ids, working_days, working_start` y
  `working_end`. Por ahora ninguna persona tiene foto.
- **`session_packages`:** 3 activos (`id, name, sessions, service_id, services(name, duration)`).
- **Funciones:**
  - `get_busy_slots(p_date, p_employee)` devuelve `time, duration`;
  - `save_appointment(...)` guarda la cita y sus servicios en una transacción; si la hora se tomó, falla con
    `23P01`.
- **Vista `schedule_blocks_public`:** `staff_id, start_date, end_date, start_time, end_time`.

## Global Constraints

- **Qué no cambia (spec §6.1):** "La lógica de hoy de `Booking.tsx` se conserva: disponibilidad, bloqueos, choque
  de horas, varios servicios con especialista por servicio, paquetes y `save_appointment`. Solo cambia la
  interfaz." En concreto se conservan:
  - las horas cada 30 minutos;
  - hoy, 15 minutos de margen;
  - apertura `min(inicio de cada una, 9:00)` y cierre `max(fin de cada una, 18:00)`;
  - primero quien tiene el servicio en su catálogo y después la dueña;
  - la relectura de la agenda antes de guardar;
  - el `23P01`;
  - el mensaje de WhatsApp;
  - `price: 0` en los servicios de la cita.
- **Arreglos permitidos en la lógica:** solo dos. Primero, las respuestas de un día viejo se descartan si ya se
  eligió otro. Segundo, la agenda ocupada y los bloqueos llegan juntos antes de mostrar horas.
- **Paso 1 (spec §6.1):**
  - selector "Servicios" | "Tengo un paquete";
  - buscador y pestañas de familia;
  - lista con casilla, nombre, duración y precio. En celular, la duración y el precio van apilados a la derecha;
  - cada servicio elegido sale como tarjeta, con las caras de quienes lo hacen más "Cualquiera", y se puede quitar;
  - en "Tengo un paquete", las tarjetas llevan las sesiones en óvalos y a quién se quiere.
- **Paso 2 (spec §6.1):**
  - mes y flechas ‹ ›;
  - tira de 7 días que avanza de semana en semana;
  - "Ver mes" abre el mes completo y, al elegir un día, vuelve a su semana;
  - hasta **90 días** adelante (`DIAS_MAXIMOS`);
  - los domingos y los días pasados salen apagados;
  - las horas van en **Mañana** y **Tarde**, y las ocupadas salen tachadas.
- **Paso 3 (spec §6.1):** nombre; teléfono de WhatsApp con la nota "con este número verás tus citas en Mis citas";
  notas opcionales.
- **Resumen (spec §6.1):**
  - en PC va fijo a la derecha. Lleva la línea de tiempo con la hora de cada servicio y quién lo hace, el día, la
    duración total, el aviso del depósito y "Solicitar cita". **Nunca pasa del alto de la ventana**;
  - en tableta y celular es una barra fija abajo ("2 servicios · 10:00 AM / jueves 2 de octubre") con
    "Continuar" o "Solicitar cita", y el texto se recorta con "…".
- **Pasos:** cabecera con listones, "Reserva en línea", "Agenda tu *cita*" y el indicador 1 Servicios · 2 Día y
  hora · 3 Tus datos. Cada paso se desbloquea al completar el anterior.
- **Enlaces (spec §6.1):**
  - `/reservar?categoria=<id de la categoría>` deja el paso 1 filtrado a esa especialidad;
  - `/reservar?paquete=<id de session_packages>` abre "Tengo un paquete" con ese paquete elegido.
- **Confirmación (spec §6.2):**
  - un óvalo con un check que se dibuja y "¡Tu cita está *pre-reservada*!";
  - una boleta con fecha, horas, servicios, especialistas y "Pendiente de depósito";
  - el depósito con monto y cuentas de `settings`, y "Copiar" en cada número;
  - tres pasos;
  - "Enviar comprobante por WhatsApp" (el mensaje de hoy), "Ver mis citas" y "Hacer otra reserva".
- **WhatsApp (spec §4.4):** en `/reservar` sube para no tapar la barra de abajo.
- **Diseño anterior (spec §8):** `Booking` se mueve a `src/legacy/` (no se borra) y queda en
  `/diseno-anterior/reservar` con `noindex`.
- **Cortes:** celular ≤ 760 px, tableta 761–1100 px y computadora > 1100 px, escritos de celular hacia arriba con
  `@media (min-width: 761px)` y `@media (min-width: 1101px)`.
- **Clases:** prefijo `s-` dentro de `.site`, sin utilidades de Tailwind. Los controles de verdad (radio,
  checkbox) quedan invisibles pero enfocables, con el foco visible en su etiqueta.
- **Calidad (spec §3.8):**
  - nada se sale de la pantalla;
  - los textos largos bajan de línea o se recortan con "…";
  - zonas táctiles ≥ 44 px;
  - contraste AA;
  - los campos de texto van a 16 px, para que el iPhone no acerque la vista;
  - `prefers-reduced-motion` apaga las animaciones (lo hace `tokens.css`).
  - **Excepción aceptada:** en 360 px, las celdas del calendario de 7 columnas miden unos 36 px, porque no caben
    44. Cumplen el mínimo AA de 24 px.
- **Código:**
  - comentarios y nombres en español;
  - los módulos puros de `src/site/reservar/` se prueban con Node, así que importan con extensión `.ts`. Los
    `import type` sin extensión están bien;
  - `Booking.tsx`, `BookingPage.tsx` y `App.tsx` usan **CRLF**; los demás archivos, LF. Cada uno conserva el suyo.
- **Caracteres tipográficos:** los editores de algunos agentes cambian “ ” · – — … ‹ › por ASCII sin avisar. Después
  de escribir un archivo que los tenga, se comprueban con `grep`.
- **Líneas base:**
  - `npx tsc -p tsconfig.app.json --noEmit` da hoy **39 errores**, ninguno en `src/site`, `src/pages/BookingPage`,
    `src/components/Booking` ni `src/App`;
  - `npm test` da **61** pruebas.

## Review Focus

- **Una hora que se ocupa en el último momento** (relectura o `23P01`):
  - la hora elegida se borra y sale "Ese horario se acaba de ocupar. Por favor elige otra hora." en el paso 2;
  - la página lleva ahí y esa hora queda tachada;
  - no queda nada guardado a medias.
  - Lo cubren la Task 2 (`chocaConAgenda`), la Task 10 y la Task 12.
- **Tocar varios días rápido:** la respuesta de un día viejo nunca pisa la del día elegido, y no se ofrecen horas
  antes de que lleguen los bloqueos. Lo cubren la Task 5 (guarda `vigente` y `Promise.all`) y la Task 12.
- **Un día sin ningún hueco** (nadie trabaja, está todo tomado o el salón está bloqueado):
  - sale "No hay horarios libres para esta fecha. Prueba otro día.", o la variante para varios servicios, en vez
    de una grilla vacía o toda tachada.
  - Lo cubren la Task 2 (día bloqueado) y la Task 7.
- **Datos incompletos:** con el nombre vacío o el teléfono sin sus 10 dígitos no se envía nada. El paso 3 muestra
  el error y el foco va al campo. Lo cubren la Task 4 (`validarDatos`) y la Task 10.
- **Celular de 360 px:**
  - el indicador de pasos, los 7 días y las 3 columnas de horas caben;
  - la barra recorta su texto con "…" y el WhatsApp no la tapa;
  - un `?paquete=` o `?categoria=` que no existe se ignora sin romper la página.
  - Lo cubren la Task 10 y la Task 12.

---

### Task 0: Rama de la fase (la hace el controlador)

- [ ] **Step 1:** La Fase 5 parte de la Fase 4 (sin fusionar):
```bash
git switch claude/rediseno-fase-5-reservar 2>/dev/null || git switch -c claude/rediseno-fase-5-reservar claude/rediseno-fase-4-equipo
```
Su PR apunta a `main` cuando el PR de la Fase 4 esté fusionado. El plan ya está en esta rama.

---

### Task 1: Calendario de la reserva (semana, mes y 90 días)

**Files:**
- Create: `vscode/src/site/reservar/calendario.ts`
- Test: `vscode/tests/calendario.test.ts`

**Interfaces:**
- Produces:
  - `DIAS_MAXIMOS = 90`, `DIAS_CORTOS`, `DIAS_LARGOS`, `MESES`;
  - `isoLocal(d: Date): string`, `deIso(iso: string): Date`, `sumarDias(iso, n): string`,
    `diasEntre(desde, hasta): number`, `lunesDe(iso): string`;
  - `type Motivo = 'domingo' | 'pasado' | 'lejos' | null` y `motivoNoReservable(iso, hoy, max?): Motivo`;
  - `interface Dia { iso; corto; numero; mes; esHoy; motivo }`, `semana(lunes, hoy): Dia[]`,
    `flechasSemana(lunes, hoy): Flechas`;
  - `interface MesVisto { anio: number; mes: number }` (mes de 0 a 11), `mesDeSemana(lunes): MesVisto`,
    `etiquetaMes(v): string`, `sumarMeses(v, n): MesVisto`, `mesEnCuadricula(v, hoy): (Dia | null)[]`,
    `flechasMes(v, hoy): Flechas`;
  - `interface Flechas { anterior: boolean; siguiente: boolean }`.

- [ ] **Step 1: Escribir las pruebas**

`vscode/tests/calendario.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIAS_MAXIMOS, deIso, diasEntre, etiquetaMes, flechasMes, flechasSemana, isoLocal, lunesDe, mesDeSemana,
  mesEnCuadricula, motivoNoReservable, semana, sumarDias, sumarMeses,
} from '../src/site/reservar/calendario.ts';

// "hoy" en las pruebas: martes 29 de septiembre de 2026
const HOY = '2026-09-29';

test('fechas locales: ida y vuelta, y sumar días cruzando de mes', () => {
  assert.equal(isoLocal(deIso('2026-09-29')), '2026-09-29');
  assert.equal(sumarDias('2026-09-29', 3), '2026-10-02');
  assert.equal(sumarDias('2026-10-01', -1), '2026-09-30');
  assert.equal(diasEntre('2026-09-29', '2026-12-28'), 90);
  assert.equal(diasEntre('2026-09-29', '2026-09-28'), -1);
});

test('la semana empieza en lunes, también desde un domingo', () => {
  assert.equal(lunesDe('2026-09-29'), '2026-09-28');
  assert.equal(lunesDe('2026-10-04'), '2026-09-28');
  assert.equal(lunesDe('2026-09-28'), '2026-09-28');
});

test('se reserva desde hoy hasta 90 días; nunca un domingo ni un día pasado', () => {
  assert.equal(DIAS_MAXIMOS, 90);
  assert.equal(motivoNoReservable('2026-09-29', HOY), null);
  assert.equal(motivoNoReservable('2026-09-28', HOY), 'pasado');
  assert.equal(motivoNoReservable('2026-10-04', HOY), 'domingo');
  assert.equal(motivoNoReservable('2026-12-28', HOY), null);
  assert.equal(motivoNoReservable('2026-12-29', HOY), 'lejos');
});

test('semana: siete días con su nombre corto, número, mes y motivo', () => {
  const s = semana('2026-09-28', HOY);
  assert.equal(s.length, 7);
  assert.deepEqual(s.map((d) => d.corto), ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);
  assert.deepEqual(s.map((d) => d.numero), [28, 29, 30, 1, 2, 3, 4]);
  assert.deepEqual(s.map((d) => d.mes), ['sep', 'sep', 'sep', 'oct', 'oct', 'oct', 'oct']);
  assert.deepEqual(s.map((d) => d.motivo), ['pasado', null, null, null, null, null, 'domingo']);
  assert.deepEqual(s.map((d) => d.esHoy), [false, true, false, false, false, false, false]);
});

test('flechas de semana: no se va al pasado ni más allá de los 90 días', () => {
  assert.deepEqual(flechasSemana('2026-09-28', HOY), { anterior: false, siguiente: true });
  assert.deepEqual(flechasSemana('2026-12-21', HOY), { anterior: true, siguiente: true });
  assert.deepEqual(flechasSemana('2026-12-28', HOY), { anterior: true, siguiente: false });
});

test('mes: cuadrícula que empieza en lunes, con huecos antes del día 1', () => {
  const sep = mesEnCuadricula({ anio: 2026, mes: 8 }, HOY);
  assert.equal(sep.filter((d) => d === null).length, 1); // el 1 de septiembre de 2026 es martes
  assert.equal(sep.length, 31);
  assert.equal(sep[1]?.iso, '2026-09-01');
  const oct = mesEnCuadricula({ anio: 2026, mes: 9 }, HOY);
  assert.equal(oct.filter((d) => d === null).length, 3); // el 1 de octubre es jueves
  assert.equal(oct.at(-1)?.iso, '2026-10-31');
});

test('flechas de mes, nombre del mes y sumar meses cruzando de año', () => {
  assert.deepEqual(flechasMes({ anio: 2026, mes: 8 }, HOY), { anterior: false, siguiente: true });
  assert.deepEqual(flechasMes({ anio: 2026, mes: 11 }, HOY), { anterior: true, siguiente: false });
  assert.equal(etiquetaMes({ anio: 2026, mes: 8 }), 'Septiembre 2026');
  assert.deepEqual(sumarMeses({ anio: 2026, mes: 11 }, 1), { anio: 2027, mes: 0 });
  assert.deepEqual(sumarMeses({ anio: 2027, mes: 0 }, -1), { anio: 2026, mes: 11 });
});

test('el mes que se nombra sobre una semana es el de su jueves', () => {
  assert.deepEqual(mesDeSemana('2026-09-28'), { anio: 2026, mes: 9 });
  assert.deepEqual(mesDeSemana('2026-09-21'), { anio: 2026, mes: 8 });
});
```

- [ ] **Step 2: Correr las pruebas y ver que fallan**

Run: `cd vscode && npm test`
Expected: FAIL, porque no existe `../src/site/reservar/calendario.ts`.

- [ ] **Step 3: Escribir `calendario.ts`**

`vscode/src/site/reservar/calendario.ts`:
```ts
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

/** No se va a un mes ya pasado ni a uno que empieza después del límite. */
export function flechasMes(visto: MesVisto, hoy: string): Flechas {
  const h = deIso(hoy);
  return {
    anterior: visto.anio * 12 + visto.mes > h.getFullYear() * 12 + h.getMonth(),
    siguiente: diasEntre(hoy, primeroDe(sumarMeses(visto, 1))) <= DIAS_MAXIMOS,
  };
}
```

- [ ] **Step 4: Correr las pruebas y ver que pasan**

Run: `cd vscode && npm test`
Expected: PASS, con 69 pruebas (61 + 8).

- [ ] **Step 5: Revisar los caracteres y hacer el commit**

```bash
grep -c "é\|á" vscode/src/site/reservar/calendario.ts
git add vscode/src/site/reservar/calendario.ts vscode/tests/calendario.test.ts
git commit -m "feat(reservar): calendario de semana, mes y 90 días"
```

---

### Task 2: Disponibilidad (la lógica de siempre, en funciones puras)

**Files:**
- Create: `vscode/src/site/reservar/disponibilidad.ts`
- Test: `vscode/tests/disponibilidad.test.ts`

**Interfaces:**
- Produces:
  - `WEEKDAYS`;
  - `interface Especialista { id; name; working_days: string[]; working_start; working_end; service_ids: string[]; avatar_url?: string | null }`;
  - `interface Bloqueo { staff_id: string | null; start_date; end_date; start_time: string | null; end_time: string | null }`;
  - `interface Ocupado { time: string; duration: number }`;
  - `interface Elegido { serviceId; staffId; nombre; duracion: number }`;
  - `interface LineaPlan { serviceId; nombre; duracion: number; staff: Especialista }`;
  - `interface Horario { hora: string; plan: LineaPlan[] | null }`;
  - `interface Agenda { staff: Especialista[]; ocupados: Record<string, Ocupado[]>; bloqueos: Bloqueo[] }`;
  - `timeToMinutes(t)`, `minutesToTime(m)`, `quienPuede(staff, serviceId)`,
    `estaLibre(m, desde, dur, dia, agenda)`, `repartirDesde(elegidos, inicio, dia, agenda)`,
    `horariosDelDia(elegidos, dia, agenda, ahora: { hoy: string; minutos: number }): Horario[]` y
    `chocaConAgenda(plan, hora, agendaFresca): boolean`.

El cuerpo de cada función es el de `vscode/src/components/Booking.tsx` (líneas 52–62 y 189–309), sin cambiar el
cálculo. Lo único nuevo es que `horariosDelDia` devuelve también las horas ocupadas (con `plan: null`), para
poder tacharlas.

- [ ] **Step 1: Escribir las pruebas**

`vscode/tests/disponibilidad.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chocaConAgenda, estaLibre, horariosDelDia, minutesToTime, quienPuede, repartirDesde, timeToMinutes,
  type Agenda, type Elegido, type Especialista,
} from '../src/site/reservar/disponibilidad.ts';

const L_S = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const persona = (id: string, service_ids: string[]): Especialista => ({
  id, name: id.toUpperCase(), working_days: L_S, working_start: '09:00:00', working_end: '18:00:00', service_ids,
});
const ana = persona('ana', ['s1']);
const bea = persona('bea', ['s2']);
const duena = persona('duena', []);
const STAFF = [ana, bea, duena];
const agenda = (extra: Partial<Agenda> = {}): Agenda => ({ staff: STAFF, ocupados: {}, bloqueos: [], ...extra });
const JUEVES = '2026-10-01';
const DOMINGO = '2026-10-04';
const limpieza: Elegido = { serviceId: 's1', staffId: '', nombre: 'Limpieza', duracion: 60 };
const cejas: Elegido = { serviceId: 's2', staffId: '', nombre: 'Cejas', duracion: 30 };
const quienes = (plan: ReturnType<typeof repartirDesde>) => plan?.map((l) => `${l.nombre}@${l.staff.id}`) ?? null;
const OTRO_DIA = { hoy: '2026-09-29', minutos: 0 };

test('horas: "09:30" ↔ 570 minutos', () => {
  assert.equal(timeToMinutes('09:30:00'), 570);
  assert.equal(minutesToTime(570), '09:30');
  assert.equal(timeToMinutes(''), 0);
});

test('quién puede: primero su catálogo y después quien no tiene catálogo (la dueña)', () => {
  assert.deepEqual(quienPuede(STAFF, 's1').map((m) => m.id), ['ana', 'duena']);
  assert.deepEqual(quienPuede(STAFF, 's9').map((m) => m.id), ['duena']);
});

test('libre: solo en sus días y dentro de su horario', () => {
  assert.equal(estaLibre(ana, 600, 60, DOMINGO, agenda()), false);
  assert.equal(estaLibre(ana, 510, 60, JUEVES, agenda()), false);
  assert.equal(estaLibre(ana, 1050, 60, JUEVES, agenda()), false);
  assert.equal(estaLibre(ana, 1020, 60, JUEVES, agenda()), true);
});

test('libre: una cita ocupa su tramo, pero justo antes y justo después queda libre', () => {
  const a = agenda({ ocupados: { ana: [{ time: '10:00:00', duration: 45 }] } });
  assert.equal(estaLibre(ana, 600, 30, JUEVES, a), false);
  assert.equal(estaLibre(ana, 645, 30, JUEVES, a), true);
  assert.equal(estaLibre(ana, 570, 30, JUEVES, a), true);
  assert.equal(estaLibre(ana, 570, 31, JUEVES, a), false);
});

test('bloqueos: el de otra persona no cuenta; el del salón en su horario y el suyo de todo el día, sí', () => {
  const deBea = { staff_id: 'bea', start_date: JUEVES, end_date: JUEVES, start_time: null, end_time: null };
  const almuerzo = { staff_id: null, start_date: JUEVES, end_date: JUEVES, start_time: '12:00:00', end_time: '13:00:00' };
  const vacaciones = { staff_id: 'ana', start_date: JUEVES, end_date: JUEVES, start_time: null, end_time: null };
  assert.equal(estaLibre(ana, 600, 60, JUEVES, agenda({ bloqueos: [deBea] })), true);
  assert.equal(estaLibre(ana, 750, 30, JUEVES, agenda({ bloqueos: [almuerzo] })), false);
  assert.equal(estaLibre(ana, 780, 30, JUEVES, agenda({ bloqueos: [almuerzo] })), true);
  assert.equal(estaLibre(ana, 600, 60, JUEVES, agenda({ bloqueos: [vacaciones] })), false);
});

test('día bloqueado para todo el salón: ninguna hora libre', () => {
  const feriado = { staff_id: null, start_date: JUEVES, end_date: JUEVES, start_time: null, end_time: null };
  const h = horariosDelDia([limpieza], JUEVES, agenda({ bloqueos: [feriado] }), OTRO_DIA);
  assert.ok(h.length > 0);
  assert.ok(h.every((x) => x.plan === null));
});

test('reparto: dos servicios seguidos con dos especialistas', () => {
  assert.deepEqual(quienes(repartirDesde([limpieza, cejas], 600, JUEVES, agenda())), ['Limpieza@ana', 'Cejas@bea']);
});

test('reparto: si la de su catálogo está ocupada, lo hace la dueña', () => {
  const a = agenda({ ocupados: { ana: [{ time: '10:00:00', duration: 60 }] } });
  assert.deepEqual(quienes(repartirDesde([limpieza, cejas], 600, JUEVES, a)), ['Limpieza@duena', 'Cejas@bea']);
});

test('reparto: con una especialista elegida es ella o nada', () => {
  const a = agenda({ ocupados: { ana: [{ time: '10:00:00', duration: 60 }] } });
  assert.equal(repartirDesde([{ ...limpieza, staffId: 'ana' }], 600, JUEVES, a), null);
  assert.deepEqual(quienes(repartirDesde([{ ...limpieza, staffId: 'ana' }], 660, JUEVES, a)), ['Limpieza@ana']);
});

test('horarios: cada media hora de 9:00 a la última que cabe; las ocupadas quedan sin reparto', () => {
  const a = agenda({ ocupados: { ana: [{ time: '10:00:00', duration: 60 }], duena: [{ time: '10:00:00', duration: 60 }] } });
  const h = horariosDelDia([limpieza], JUEVES, a, OTRO_DIA);
  assert.equal(h[0].hora, '09:00');
  assert.equal(h.at(-1)?.hora, '17:00');
  assert.equal(h.length, 17);
  const libre = (hora: string) => h.find((x) => x.hora === hora)!.plan !== null;
  assert.equal(libre('09:00'), true);
  assert.equal(libre('09:30'), false);
  assert.equal(libre('10:30'), false);
  assert.equal(libre('11:00'), true);
});

test('horarios: hoy no ofrece horas que ya pasaron (con 15 minutos de margen)', () => {
  const h = horariosDelDia([cejas], '2026-09-29', agenda(), { hoy: '2026-09-29', minutos: 650 });
  assert.equal(h[0].hora, '11:30');
});

test('horarios: sin servicios o sin día, nada', () => {
  assert.deepEqual(horariosDelDia([], JUEVES, agenda(), OTRO_DIA), []);
  assert.deepEqual(horariosDelDia([limpieza], '', agenda(), OTRO_DIA), []);
});

test('relectura: avisa si alguien tomó uno de los tramos mientras llenaba el formulario', () => {
  const plan = repartirDesde([limpieza, cejas], 600, JUEVES, agenda())!;
  assert.equal(chocaConAgenda(plan, '10:00', { bea: [{ time: '11:15:00', duration: 30 }] }), true);
  assert.equal(chocaConAgenda(plan, '10:00', { bea: [{ time: '11:30:00', duration: 30 }] }), false);
});
```

- [ ] **Step 2: Correr las pruebas y ver que fallan**

Run: `cd vscode && npm test`
Expected: FAIL, porque no existe `../src/site/reservar/disponibilidad.ts`.

- [ ] **Step 3: Escribir `disponibilidad.ts`**

`vscode/src/site/reservar/disponibilidad.ts`:
```ts
// Disponibilidad de la reserva: quién puede, quién está libre y a qué horas cabe la visita completa.
// Es la lógica de siempre de Booking.tsx, sacada tal cual a funciones puras (spec §6.1: cambia la forma, no el
// cálculo). Sin imports: se prueba con Node.

/** Días como se guardan en staff.working_days (sin tildes). */
export const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

export interface Especialista {
  id: string;
  name: string;
  working_days: string[];
  working_start: string;
  working_end: string;
  service_ids: string[];
  avatar_url?: string | null;
}

export interface Bloqueo {
  staff_id: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
}

export interface Ocupado { time: string; duration: number }

/** Un servicio de la visita. staffId vacío = "cualquiera disponible". */
export interface Elegido { serviceId: string; staffId: string; nombre: string; duracion: number }

export interface LineaPlan { serviceId: string; nombre: string; duracion: number; staff: Especialista }

/** Una hora del día: con el reparto si cabe la visita completa; plan null si está ocupada. */
export interface Horario { hora: string; plan: LineaPlan[] | null }

/** La agenda del día elegido: citas de cada especialista (por id) y bloqueos de horario. */
export interface Agenda { staff: Especialista[]; ocupados: Record<string, Ocupado[]>; bloqueos: Bloqueo[] }

export function timeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/** Quién puede hacer un servicio. Primero quienes lo tienen en su catálogo; después quienes no tienen catálogo
 *  (la dueña, que puede todo), para no cargarle a ella el trabajo que cubre el equipo. */
export function quienPuede(staff: Especialista[], serviceId: string): Especialista[] {
  const propias = staff.filter((m) => (m.service_ids ?? []).includes(serviceId));
  const comodin = staff.filter((m) => (m.service_ids ?? []).length === 0);
  return [...propias, ...comodin];
}

/** ¿Está libre esa persona en ese tramo? Mira su horario de trabajo, sus citas y los bloqueos (vacaciones,
 *  almuerzo, feriado del salón). Los bloqueos ya vienen filtrados por el día. */
export function estaLibre(m: Especialista, desde: number, dur: number, dia: string, agenda: Agenda): boolean {
  const dayName = WEEKDAYS[new Date(`${dia}T12:00:00`).getDay()];
  if (!(m.working_days ?? []).includes(dayName)) return false;
  if (desde < timeToMinutes(m.working_start)) return false;
  if (desde + dur > timeToMinutes(m.working_end)) return false;

  const ocupada = (agenda.ocupados[m.id] ?? []).some((a) => {
    const ini = timeToMinutes(String(a.time).slice(0, 5));
    return desde < ini + (a.duration ?? 45) && desde + dur > ini;
  });
  if (ocupada) return false;

  return !agenda.bloqueos.some((b) => {
    if (b.staff_id && b.staff_id !== m.id) return false;
    if (!b.start_time || !b.end_time) return true;
    const bIni = timeToMinutes(b.start_time.slice(0, 5));
    const bFin = timeToMinutes(b.end_time.slice(0, 5));
    return desde < bFin && desde + dur > bIni;
  });
}

/** Reparte todos los servicios en cadena desde una hora. Devuelve quién hace cada uno, o null si no cabe. */
export function repartirDesde(elegidos: Elegido[], inicio: number, dia: string, agenda: Agenda): LineaPlan[] | null {
  let cursor = inicio;
  const plan: LineaPlan[] = [];
  const ocupadasAqui: Record<string, number[][]> = {};

  for (const e of elegidos) {
    const candidatas = e.staffId
      ? agenda.staff.filter((m) => m.id === e.staffId)
      : quienPuede(agenda.staff, e.serviceId);

    const libre = candidatas.find((m) => {
      if (!estaLibre(m, cursor, e.duracion, dia, agenda)) return false;
      // tampoco puede estar haciendo otro servicio de ESTA misma cita
      return !(ocupadasAqui[m.id] ?? []).some(([a, b]) => cursor < b && cursor + e.duracion > a);
    });

    if (!libre) return null;
    (ocupadasAqui[libre.id] ??= []).push([cursor, cursor + e.duracion]);
    plan.push({ serviceId: e.serviceId, nombre: e.nombre, duracion: e.duracion, staff: libre });
    cursor += e.duracion;
  }
  return plan;
}

/** Cada media hora del día: si cabe la visita completa, con su reparto; si no, ocupada (plan null).
 *  Hoy nunca se ofrecen horas que ya pasaron (con 15 minutos de margen). */
export function horariosDelDia(
  elegidos: Elegido[], dia: string, agenda: Agenda, ahora: { hoy: string; minutos: number },
): Horario[] {
  const duracionTotal = elegidos.reduce((t, e) => t + e.duracion, 0);
  if (elegidos.length === 0 || !dia || duracionTotal === 0) return [];

  const apertura = Math.min(...agenda.staff.map((m) => timeToMinutes(m.working_start)), 9 * 60);
  const cierre = Math.max(...agenda.staff.map((m) => timeToMinutes(m.working_end)), 18 * 60);
  const desdeAhora = dia === ahora.hoy ? ahora.minutos + 15 : 0;

  const salida: Horario[] = [];
  for (let cursor = apertura; cursor + duracionTotal <= cierre; cursor += 30) {
    if (cursor < desdeAhora) continue;
    salida.push({ hora: minutesToTime(cursor), plan: repartirDesde(elegidos, cursor, dia, agenda) });
  }
  return salida;
}

/** Relectura antes de guardar: ¿alguien tomó alguno de estos tramos mientras la clienta llenaba el formulario? */
export function chocaConAgenda(plan: LineaPlan[], hora: string, agendaFresca: Record<string, Ocupado[]>): boolean {
  let cursor = timeToMinutes(hora);
  return plan.some((linea) => {
    const choca = (agendaFresca[linea.staff.id] ?? []).some((a) => {
      const ini = timeToMinutes(String(a.time).slice(0, 5));
      return cursor < ini + (a.duration ?? 45) && cursor + linea.duracion > ini;
    });
    cursor += linea.duracion;
    return choca;
  });
}
```

- [ ] **Step 4: Correr las pruebas y ver que pasan**

Run: `cd vscode && npm test`
Expected: PASS, con 82 pruebas (69 + 13).

- [ ] **Step 5: Commit**

```bash
git add vscode/src/site/reservar/disponibilidad.ts vscode/tests/disponibilidad.test.ts
git commit -m "feat(reservar): la disponibilidad de siempre en funciones puras con pruebas"
```

---

### Task 3: Servicios para reservar (familia, especialidad, precio y buscador)

**Files:**
- Modify: `vscode/src/site/landing/catalogo.ts`: solo se agrega `export` a `precioVista` y a `gruposDe`
- Create: `vscode/src/site/reservar/servicios.ts`
- Test: `vscode/tests/servicios-reserva.test.ts`

**Interfaces:**
- Consumes:
  - `FAMILIAS`, `SIN_PRECIO`, `formatoRD` y `nombreEnTabla` de `catalogo.ts`;
  - `gruposDe(cat): { etiqueta?: string; opciones: string[] }[]` y
    `precioVista(fila, opcion, enTabla): { precio: string; conPrecio: boolean }`, que esta task exporta.
- Produces:
  - `interface FilaServicio { id: string; name: string; duration: number; price: number }`;
  - `interface ServicioReserva { id; nombre; duracion: number; precio: string; conPrecio: boolean; familia: FamiliaId | null; categoria: string | null }`;
  - `nombreVisible(nombre)`, `sinTildes(texto)`,
    `serviciosParaReservar(menu, filas): ServicioReserva[]` y
    `filtrarServicios(lista, { texto, familia, categoria }): ServicioReserva[]`, con
    `familia: FamiliaId | 'todas'` y `categoria: string | null`.

- [ ] **Step 1: Escribir las pruebas**

`vscode/tests/servicios-reserva.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { servicesMenu } from '../src/data/servicesMenu.ts';
import { SIN_PRECIO } from '../src/site/landing/catalogo.ts';
import {
  filtrarServicios, nombreVisible, serviciosParaReservar, sinTildes, type FilaServicio,
} from '../src/site/reservar/servicios.ts';

const FILAS: FilaServicio[] = [
  { id: '1', name: 'Depilación Láser - Axilas', duration: 15, price: 0 },
  { id: '2', name: 'Limpieza Facial Profunda', duration: 60, price: 0 },
  { id: '3', name: 'Toxina Botulínica - Líneas de expresión', duration: 30, price: 12000 },
  { id: '4', name: 'Diseño de Cejas', duration: 30, price: 600 },
  { id: '5', name: 'Laminado de Cejas', duration: 45, price: 0 },
];
const lista = serviciosParaReservar(servicesMenu, FILAS);
const por = (id: string) => lista.find((s) => s.id === id)!;

test('nombre visible: el guion de la tabla se vuelve un punto medio', () => {
  assert.equal(nombreVisible('Depilación Láser - Axilas'), 'Depilación Láser · Axilas');
  assert.equal(nombreVisible('Hidrafacial'), 'Hidrafacial');
});

test('sin tildes ni mayúsculas, para buscar', () => {
  assert.equal(sinTildes('Depilación LÁSER'), 'depilacion laser');
});

test('cada servicio sabe su familia, su especialidad y su precio', () => {
  assert.deepEqual(
    { familia: por('1').familia, categoria: por('1').categoria, precio: por('1').precio, conPrecio: por('1').conPrecio },
    { familia: 'corporal', categoria: 'depilacion-laser', precio: SIN_PRECIO, conPrecio: false },
  );
  assert.equal(por('3').familia, 'medicina');
  assert.equal(por('3').categoria, 'toxina-botulinica');
  assert.equal(por('3').conPrecio, true);
  assert.match(por('3').precio, /RD\$ 12,000/);
  // lo que no está en el menú de la página: sin familia, con el precio de la tabla
  assert.deepEqual(
    { familia: por('4').familia, categoria: por('4').categoria, precio: por('4').precio },
    { familia: null, categoria: null, precio: 'RD$ 600' },
  );
  assert.equal(por('1').nombre, 'Depilación Láser · Axilas');
  assert.equal(por('1').duracion, 15);
});

test('orden: por familia y como en el menú; lo que no está en el menú va al final', () => {
  assert.deepEqual(lista.map((s) => s.id), ['2', '1', '5', '3', '4']);
});

test('buscador sin tildes y filtros de familia y especialidad', () => {
  const ids = (f: Parameters<typeof filtrarServicios>[1]) => filtrarServicios(lista, f).map((s) => s.id);
  assert.deepEqual(ids({ texto: 'laser', familia: 'todas', categoria: null }), ['1']);
  assert.deepEqual(ids({ texto: 'CEJAS', familia: 'todas', categoria: null }), ['5', '4']);
  assert.deepEqual(ids({ texto: '', familia: 'medicina', categoria: null }), ['3']);
  // la especialidad que viene del catálogo manda sobre la familia
  assert.deepEqual(ids({ texto: '', familia: 'facial', categoria: 'depilacion-laser' }), ['1']);
  assert.equal(ids({ texto: '  ', familia: 'todas', categoria: null }).length, 5);
});
```

- [ ] **Step 2: Correr las pruebas y ver que fallan**

Run: `cd vscode && npm test`
Expected: FAIL, porque no existe `../src/site/reservar/servicios.ts`.

- [ ] **Step 3: Exportar las dos piezas del catálogo.** En `vscode/src/site/landing/catalogo.ts`, cambia
  `function precioVista(` por `export function precioVista(` y `function gruposDe(` por `export function gruposDe(`.
  No se toca nada más.

- [ ] **Step 4: Escribir `servicios.ts`**

`vscode/src/site/reservar/servicios.ts`:
```ts
// Servicios de /reservar (spec §6.1): la lista de la tabla `services` con su familia, su especialidad y su precio,
// y el buscador. Puro: se prueba con Node.
import type { FamiliaId, ServiceCategory } from '../../data/servicesMenu';
import { FAMILIAS, SIN_PRECIO, formatoRD, gruposDe, nombreEnTabla, precioVista } from '../landing/catalogo.ts';

/** Lo que /reservar lee de `services` (anon solo ve los activos). */
export interface FilaServicio { id: string; name: string; duration: number; price: number }

export interface ServicioReserva {
  id: string;
  nombre: string;
  duracion: number;
  precio: string;
  conPrecio: boolean;
  /** null si el servicio no está en el menú de la página: sale solo en "Todos" y en el buscador */
  familia: FamiliaId | null;
  categoria: string | null;
}

/** "Depilación Láser - Axilas" → "Depilación Láser · Axilas" */
export function nombreVisible(nombre: string): string {
  return nombre.replace(/\s+-\s+/g, ' · ');
}

/** Sin tildes ni mayúsculas, para que "laser" encuentre "Láser". */
export function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

interface DelMenu { categoria: string; familia: FamiliaId; opcion: string; enTabla: string; orden: number }

/** Tabla + menú: cada servicio con su familia, su especialidad y el precio con la misma regla del catálogo. */
export function serviciosParaReservar(menu: ServiceCategory[], filas: FilaServicio[]): ServicioReserva[] {
  const delMenu = new Map<string, DelMenu>();
  let orden = 0;
  for (const cat of menu) {
    for (const g of gruposDe(cat)) {
      for (const opcion of g.opciones) {
        const enTabla = nombreEnTabla(cat.id, g.etiqueta ?? '', opcion);
        const clave = enTabla.toLowerCase().trim();
        if (!delMenu.has(clave)) delMenu.set(clave, { categoria: cat.id, familia: cat.familia, opcion, enTabla, orden: orden++ });
      }
    }
  }
  const ordenFamilia = (f: FamiliaId | null) => (f ? FAMILIAS.findIndex((x) => x.id === f) : FAMILIAS.length);

  return filas
    .map((f) => {
      const m = delMenu.get(f.name.toLowerCase().trim());
      const precio = m
        ? precioVista(f, m.opcion, m.enTabla)
        : f.price > 0 ? { precio: formatoRD(f.price), conPrecio: true } : { precio: SIN_PRECIO, conPrecio: false };
      const servicio: ServicioReserva = {
        id: f.id,
        nombre: nombreVisible(f.name),
        duracion: f.duration,
        ...precio,
        familia: m?.familia ?? null,
        categoria: m?.categoria ?? null,
      };
      return { servicio, orden: m?.orden ?? Number.MAX_SAFE_INTEGER };
    })
    .sort((a, b) =>
      ordenFamilia(a.servicio.familia) - ordenFamilia(b.servicio.familia) ||
      a.orden - b.orden ||
      a.servicio.nombre.localeCompare(b.servicio.nombre, 'es'))
    .map(({ servicio }) => servicio);
}

export interface Filtro { texto: string; familia: FamiliaId | 'todas'; categoria: string | null }

/** La especialidad (que viene del catálogo) manda sobre la familia; el texto busca en el nombre, sin tildes. */
export function filtrarServicios(lista: ServicioReserva[], { texto, familia, categoria }: Filtro): ServicioReserva[] {
  const t = sinTildes(texto.trim());
  return lista.filter((s) =>
    (categoria ? s.categoria === categoria : familia === 'todas' || s.familia === familia) &&
    (!t || sinTildes(s.nombre).includes(t)));
}
```

- [ ] **Step 5: Correr las pruebas y ver que pasan**

Run: `cd vscode && npm test`
Expected: PASS, con 87 pruebas (82 + 5). Las de `catalogo.test.ts` siguen pasando.

- [ ] **Step 6: Commit**

```bash
git add vscode/src/site/landing/catalogo.ts vscode/src/site/reservar/servicios.ts vscode/tests/servicios-reserva.test.ts
git commit -m "feat(reservar): servicios con familia, especialidad, precio y buscador sin tildes"
```

---

### Task 4: Resumen de la visita y datos de la clienta

**Files:**
- Create: `vscode/src/site/reservar/resumen.ts`
- Create: `vscode/src/site/reservar/datos.ts`
- Test: `vscode/tests/resumen.test.ts`

**Interfaces:**
- Consumes:
  - `DIAS_LARGOS`, `MESES` y `deIso` (Task 1);
  - `minutesToTime`, `timeToMinutes`, `Elegido`, `Especialista` y `LineaPlan` (Task 2);
  - `format12h` de `vscode/src/lib/timeFormat.ts` ("09:30" → "9:30 AM"; no importa nada).
- Produces:
  - en `resumen.ts`:
    - `fechaLarga(iso)` da "jueves 1 de octubre" y `fechaTitulo(iso)` da "Jueves 1 de octubre";
    - `duracionTexto(min)`;
    - `interface LineaResumen { hora: string | null; nombre: string; duracion: number; quien: string }`;
    - `lineasResumen(elegidos, staff, hora, plan): LineaResumen[]`;
    - `rangoHoras(hora, totalMin)`;
    - `textoBarra(cantidad, dia, hora): { titulo; detalle }`;
    - `mensajeWhatsApp({ nombre, telefono, plan, fecha, hora, notas })`.
  - en `datos.ts`: `formatoTelefono(raw)`, `interface ErroresDatos { nombre?: string; telefono?: string }` y
    `validarDatos(nombre, telefono): ErroresDatos`.

- [ ] **Step 1: Escribir las pruebas**

`vscode/tests/resumen.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  duracionTexto, fechaLarga, fechaTitulo, lineasResumen, mensajeWhatsApp, rangoHoras, textoBarra,
} from '../src/site/reservar/resumen.ts';
import { formatoTelefono, validarDatos } from '../src/site/reservar/datos.ts';
import { repartirDesde, type Elegido, type Especialista } from '../src/site/reservar/disponibilidad.ts';

const L_S = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const persona = (id: string, name: string, service_ids: string[]): Especialista => ({
  id, name, working_days: L_S, working_start: '09:00:00', working_end: '18:00:00', service_ids,
});
const STAFF = [persona('ana', 'Ana', ['s1']), persona('bea', 'Bea', ['s2'])];
const limpieza: Elegido = { serviceId: 's1', staffId: '', nombre: 'Limpieza', duracion: 60 };
const cejas: Elegido = { serviceId: 's2', staffId: 'bea', nombre: 'Cejas', duracion: 30 };
const plan = repartirDesde([limpieza, cejas], 600, '2026-10-01', { staff: STAFF, ocupados: {}, bloqueos: [] })!;

test('fechas en texto: "jueves 1 de octubre" y con mayúscula para títulos', () => {
  assert.equal(fechaLarga('2026-10-01'), 'jueves 1 de octubre');
  assert.equal(fechaTitulo('2026-10-03'), 'Sábado 3 de octubre');
});

test('duración total en horas y minutos', () => {
  assert.equal(duracionTexto(45), '45 min');
  assert.equal(duracionTexto(60), '1 h');
  assert.equal(duracionTexto(105), '1 h 45 min');
  assert.equal(duracionTexto(150), '2 h 30 min');
});

test('resumen sin hora: "Primera disponible" o el nombre de la que eligió', () => {
  assert.deepEqual(lineasResumen([limpieza, cejas], STAFF, null, null), [
    { hora: null, nombre: 'Limpieza', duracion: 60, quien: 'Primera disponible' },
    { hora: null, nombre: 'Cejas', duracion: 30, quien: 'Bea' },
  ]);
});

test('resumen con hora: las horas encadenadas y quién hace cada servicio', () => {
  assert.deepEqual(lineasResumen([limpieza, cejas], STAFF, '10:00', plan), [
    { hora: '10:00 AM', nombre: 'Limpieza', duracion: 60, quien: 'Ana' },
    { hora: '11:00 AM', nombre: 'Cejas', duracion: 30, quien: 'Bea' },
  ]);
});

test('rango de horas de la visita', () => {
  assert.equal(rangoHoras('10:00', 105), '10:00 AM – 11:45 AM');
  assert.equal(rangoHoras('11:30', 60), '11:30 AM – 12:30 PM');
});

test('barra de abajo: cuántos servicios, la hora y el día', () => {
  assert.deepEqual(textoBarra(0, null, null), { titulo: 'Elige un servicio', detalle: 'para empezar' });
  assert.deepEqual(textoBarra(1, null, null), { titulo: '1 servicio', detalle: 'Falta elegir día y hora' });
  assert.deepEqual(textoBarra(2, '2026-10-01', '10:00'), { titulo: '2 servicios · 10:00 AM', detalle: 'jueves 1 de octubre' });
});

test('mensaje de WhatsApp: el mismo texto de siempre', () => {
  assert.equal(
    mensajeWhatsApp({ nombre: 'María', telefono: '829-555-0102', plan, fecha: '2026-10-01', hora: '10:00', notas: '   ' }),
    'Hola, acabo de reservar una cita:\n\n' +
      'Nombre: María\n' +
      'Telefono: 829-555-0102\n' +
      'Servicios:\n- Limpieza con Ana\n- Cejas con Bea\n' +
      'Fecha: 2026-10-01\n' +
      'Hora: 10:00 AM\n' +
      'Notas: Ninguna\n\n' +
      'Adjunto el comprobante de deposito para confirmar mi cita.',
  );
});

test('teléfono: guiones al escribir y nunca más de 10 dígitos', () => {
  assert.equal(formatoTelefono('829'), '829');
  assert.equal(formatoTelefono('8295'), '829-5');
  assert.equal(formatoTelefono('8295550102'), '829-555-0102');
  assert.equal(formatoTelefono('(829) 555-0102 ext 9'), '829-555-0102');
});

test('datos: nombre y los 10 dígitos del WhatsApp', () => {
  assert.deepEqual(validarDatos('', '829'), {
    nombre: 'Escribe tu nombre.',
    telefono: 'Escribe los 10 dígitos de tu WhatsApp.',
  });
  assert.deepEqual(validarDatos('  María ', '829-555-0102'), {});
});
```

- [ ] **Step 2: Correr las pruebas y ver que fallan**

Run: `cd vscode && npm test`
Expected: FAIL, porque no existe `../src/site/reservar/resumen.ts`.

- [ ] **Step 3: Escribir `resumen.ts`**

`vscode/src/site/reservar/resumen.ts`:
```ts
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
```

- [ ] **Step 4: Escribir `datos.ts`**

`vscode/src/site/reservar/datos.ts`:
```ts
// Paso 3 de /reservar: el teléfono con guiones y qué falta para poder enviar. Puro: se prueba con Node.

/** "8295550102" → "829-555-0102"; nunca más de 10 dígitos. */
export function formatoTelefono(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export interface ErroresDatos { nombre?: string; telefono?: string }

/** Nombre escrito y los 10 dígitos del WhatsApp: con eso la clienta verá sus citas en "Mis citas". */
export function validarDatos(nombre: string, telefono: string): ErroresDatos {
  const errores: ErroresDatos = {};
  if (!nombre.trim()) errores.nombre = 'Escribe tu nombre.';
  if (telefono.replace(/\D/g, '').length !== 10) errores.telefono = 'Escribe los 10 dígitos de tu WhatsApp.';
  return errores;
}
```

- [ ] **Step 5: Correr las pruebas y ver que pasan**

Run: `cd vscode && npm test`
Expected: PASS, con 96 pruebas (87 + 9).

- [ ] **Step 6: Revisar los caracteres y hacer el commit**

```bash
grep -c "–\|·" vscode/src/site/reservar/resumen.ts vscode/tests/resumen.test.ts
git add vscode/src/site/reservar/resumen.ts vscode/src/site/reservar/datos.ts vscode/tests/resumen.test.ts
git commit -m "feat(reservar): resumen de la visita, textos y validación de los datos"
```
El `grep` debe contar al menos 1 en cada archivo.

---

### Task 5: `useBooking`, y la reserva vieja pasa a `src/legacy/`

**Files:**
- Create: `vscode/src/site/reservar/useBooking.ts`
- Move: `vscode/src/components/Booking.tsx` → `vscode/src/legacy/Booking.tsx` (CRLF), con `git mv`
- Move: `vscode/src/components/Booking.css` → `vscode/src/legacy/Booking.css`, con `git mv`
- Create: `vscode/src/legacy/BookingPageAnterior.tsx`
- Modify: `vscode/src/pages/BookingPage.tsx` (CRLF), para que importe `../legacy/Booking`
- Modify: `vscode/src/App.tsx` (CRLF), con la ruta `/diseno-anterior/reservar`

**Interfaces:**
- Consumes: Task 1 (`isoLocal`), Task 2 (tipos, `horariosDelDia` y `chocaConAgenda`) y Task 4
  (`mensajeWhatsApp`).
- Produces: `useBooking()` devuelve
  `{ services, packages, staffList, cargando, picks, setPicks, bookingType, form, setForm, settings, sending, loadingSlots, success, bookingError, setBookingError, whatsappMsg, confirmada, selectedPkg, elegidos, duracionTotal, horarios, availableSlots, planElegido, isDayOff, cambiarTipo, alternarServicio, elegirEspecialista, elegirPaquete, elegirEspecialistaPaquete, elegirFecha, elegirHora, submit, reset }`.
  Tipos exportados:
  - `ServicioBase { id; name; duration: number; price: number }`;
  - `PaqueteBase { id; name; sessions: number; service_id; services: { duration: number; name: string } | null }`;
  - `TipoReserva = 'service' | 'package'`;
  - `Pick { serviceId; staffId }`;
  - `FormReserva`;
  - `Confirmada { fecha; hora; plan: LineaPlan[]; nombre; duracionTotal: number }`;
  - `ResultadoEnvio = 'ok' | 'ocupado' | 'error' | 'incompleto'`.

- [ ] **Step 1: Escribir `useBooking.ts`**

`vscode/src/site/reservar/useBooking.ts`:
```ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSettingsStore } from '../../store/settingsStore';
import { isoLocal } from './calendario';
import {
  chocaConAgenda, horariosDelDia, type Agenda, type Bloqueo, type Elegido, type Especialista, type Horario,
  type LineaPlan, type Ocupado,
} from './disponibilidad';
import { mensajeWhatsApp } from './resumen';

/** Lo que la reserva lee de `services` (anon solo ve los activos). */
export interface ServicioBase { id: string; name: string; duration: number; price: number }
/** Paquete activo con su servicio; la sesión se descuenta al completar la cita, como siempre. */
export interface PaqueteBase {
  id: string;
  name: string;
  sessions: number;
  service_id: string;
  services: { duration: number; name: string } | null;
}
export type TipoReserva = 'service' | 'package';
/** Un servicio elegido. staffId vacío = "cualquiera disponible". */
export interface Pick { serviceId: string; staffId: string }
export interface FormReserva {
  name: string; phone: string; serviceId: string; packageId: string; staffId: string; date: string; time: string; notes: string;
}
/** Lo que queda al pre-reservar, para la confirmación. */
export interface Confirmada { fecha: string; hora: string; plan: LineaPlan[]; nombre: string; duracionTotal: number }
export type ResultadoEnvio = 'ok' | 'ocupado' | 'error' | 'incompleto';

const FORM_VACIO: FormReserva = { name: '', phone: '', serviceId: '', packageId: '', staffId: '', date: '', time: '', notes: '' };
const HORA_OCUPADA = 'Ese horario se acaba de ocupar. Por favor elige otra hora.';

/** Toda la reserva de siempre sin interfaz: datos, agenda del día, horas, relectura y guardado.
 *  La usan la reserva nueva y el diseño anterior (spec §8): cambia la forma, no el cálculo. */
export function useBooking() {
  const [services, setServices] = useState<ServicioBase[]>([]);
  const [packages, setPackages] = useState<PaqueteBase[]>([]);
  const [staffList, setStaffList] = useState<Especialista[]>([]);
  const [cargando, setCargando] = useState(true);
  const [picks, setPicks] = useState<Pick[]>([{ serviceId: '', staffId: '' }]);
  /** Horas ya ocupadas de cada especialista ese día. */
  const [busyByStaff, setBusyByStaff] = useState<Record<string, Ocupado[]>>({});
  const [bookingType, setBookingType] = useState<TipoReserva>('service');
  const [form, setForm] = useState<FormReserva>(FORM_VACIO);
  const { settings, fetchSettings } = useSettingsStore();
  const [sending, setSending] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [blocks, setBlocks] = useState<Bloqueo[]>([]);
  const [success, setSuccess] = useState(false);
  const [confirmada, setConfirmada] = useState<Confirmada | null>(null);
  const [bookingError, setBookingError] = useState('');
  const [whatsappMsg, setWhatsappMsg] = useState('');

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Datos base, una vez
  useEffect(() => {
    let vivo = true;
    Promise.all([
      supabase.from('services').select('id, name, duration, price').eq('active', true).order('name'),
      supabase
        .from('staff')
        .select('id, name, working_days, working_start, working_end, service_ids, avatar_url')
        .eq('active', true)
        .in('role', ['specialist', 'admin'])
        .order('name'),
      supabase
        .from('session_packages')
        .select('id, name, sessions, service_id, services(duration, name)')
        .eq('active', true)
        .order('name'),
    ]).then(([svcRes, staffRes, pkgRes]) => {
      if (!vivo) return;
      if (svcRes.data) {
        setServices((svcRes.data as unknown as ServicioBase[]).map((s) => ({ ...s, price: Number(s.price) || 0 })));
      }
      if (staffRes.data) setStaffList(staffRes.data as unknown as Especialista[]);
      if (pkgRes.data) setPackages(pkgRes.data as unknown as PaqueteBase[]);
      setCargando(false);
    });
    return () => { vivo = false; };
  }, []);

  // Al cambiar el día se trae la agenda ocupada de TODAS las especialistas (una cita puede repartirse entre
  // varias) y los bloqueos de horario. Llegan juntos, y si mientras tanto se eligió otro día, se descartan.
  useEffect(() => {
    if (!form.date || staffList.length === 0) return;
    let vigente = true;
    setLoadingSlots(true);
    setForm((prev) => ({ ...prev, time: '' }));
    Promise.all([
      Promise.all(
        staffList.map((m) =>
          supabase
            .rpc('get_busy_slots', { p_date: form.date, p_employee: m.name })
            .then(({ data }) => [m.id, (data as Ocupado[]) ?? []] as const),
        ),
      ),
      // vacaciones, día libre, almuerzo o cierre del salón; la vista pública solo expone los horarios
      supabase
        .from('schedule_blocks_public')
        .select('staff_id, start_date, end_date, start_time, end_time')
        .lte('start_date', form.date)
        .gte('end_date', form.date),
    ]).then(([pares, bloqueos]) => {
      if (!vigente) return;
      setBusyByStaff(Object.fromEntries(pares));
      setBlocks((bloqueos.data as unknown as Bloqueo[] | null) ?? []);
      setLoadingSlots(false);
    });
    return () => { vigente = false; };
  }, [form.date, staffList]);

  const selectedPkg = packages.find((p) => p.id === form.packageId);

  /** Servicios de esta reserva, en orden. Un paquete cuenta como uno solo. */
  const elegidos = useMemo<Elegido[]>(() => {
    if (bookingType === 'package') {
      if (!selectedPkg) return [];
      return [{
        serviceId: selectedPkg.service_id,
        staffId: picks[0]?.staffId ?? '',
        nombre: `Paquete: ${selectedPkg.name}`,
        duracion: selectedPkg.services?.duration ?? 45,
      }];
    }
    return picks
      .filter((p) => p.serviceId)
      .map((p) => {
        const sv = services.find((x) => x.id === p.serviceId);
        return { serviceId: p.serviceId, staffId: p.staffId, nombre: sv?.name ?? '', duracion: sv?.duration ?? 45 };
      });
  }, [bookingType, selectedPkg, picks, services]);

  const duracionTotal = elegidos.reduce((t, e) => t + e.duracion, 0);

  const agenda = useMemo<Agenda>(
    () => ({ staff: staffList, ocupados: busyByStaff, bloqueos: blocks }),
    [staffList, busyByStaff, blocks],
  );

  /** Todas las horas del día: con reparto si cabe la visita completa; sin él, ocupadas. */
  const horarios = useMemo<Horario[]>(() => {
    const ahora = new Date();
    return horariosDelDia(elegidos, form.date, agenda, {
      hoy: isoLocal(ahora),
      minutos: ahora.getHours() * 60 + ahora.getMinutes(),
    });
  }, [elegidos, form.date, agenda]);

  const libres = useMemo(
    () => horarios.filter((h): h is { hora: string; plan: LineaPlan[] } => h.plan !== null),
    [horarios],
  );
  const availableSlots = useMemo(() => libres.map((h) => h.hora), [libres]);
  const planElegido = libres.find((h) => h.hora === form.time)?.plan ?? null;

  // No hay ni un hueco en todo el día: o nadie trabaja, o está todo tomado
  const isDayOff = Boolean(form.date) && elegidos.length > 0 && libres.length === 0;

  /** Cambiar entre servicios sueltos y paquete empieza de cero, como siempre. */
  const cambiarTipo = useCallback((tipo: TipoReserva) => {
    setBookingType(tipo);
    setPicks([{ serviceId: '', staffId: '' }]);
    setForm((f) => (tipo === 'service'
      ? { ...f, packageId: '', staffId: '', date: '', time: '' }
      : { ...f, serviceId: '', staffId: '', date: '', time: '' }));
  }, []);

  /** Marca o desmarca un servicio de la lista. Cualquier cambio de servicios borra la hora elegida. */
  const alternarServicio = useCallback((serviceId: string) => {
    setPicks((ps) => {
      const reales = ps.filter((p) => p.serviceId);
      return reales.some((p) => p.serviceId === serviceId)
        ? reales.filter((p) => p.serviceId !== serviceId)
        : [...reales, { serviceId, staffId: '' }];
    });
    setForm((f) => ({ ...f, time: '' }));
  }, []);

  const elegirEspecialista = useCallback((serviceId: string, staffId: string) => {
    setPicks((ps) => ps.map((p) => (p.serviceId === serviceId ? { ...p, staffId } : p)));
    setForm((f) => ({ ...f, time: '' }));
  }, []);

  const elegirPaquete = useCallback((packageId: string) => {
    setPicks([{ serviceId: '', staffId: '' }]);
    setForm((f) => ({ ...f, packageId, time: '' }));
  }, []);

  const elegirEspecialistaPaquete = useCallback((staffId: string) => {
    setPicks([{ serviceId: '', staffId }]);
    setForm((f) => ({ ...f, time: '' }));
  }, []);

  const elegirFecha = useCallback((date: string) => setForm((f) => ({ ...f, date, time: '' })), []);
  const elegirHora = useCallback((time: string) => setForm((f) => ({ ...f, time })), []);

  const submit = useCallback(async (): Promise<ResultadoEnvio> => {
    if (!planElegido || !form.time) return 'incompleto';
    if (form.date < isoLocal(new Date())) {
      setBookingError('No puedes reservar una cita en una fecha pasada.');
      return 'error';
    }

    setSending(true);
    setBookingError('');
    try {
      // La lista de horarios se cargó hace rato: alguien pudo tomar la hora mientras la clienta llenaba el
      // formulario. Se relee antes de guardar.
      const frescos = await Promise.all(
        planElegido.map((linea) =>
          supabase
            .rpc('get_busy_slots', { p_date: form.date, p_employee: linea.staff.name })
            .then(({ data }) => [linea.staff.id, (data as Ocupado[]) ?? []] as const),
        ),
      );
      const agendaFresca = Object.fromEntries(frescos);
      if (chocaConAgenda(planElegido, form.time, agendaFresca)) {
        setBusyByStaff((prev) => ({ ...prev, ...agendaFresca }));
        setForm((prev) => ({ ...prev, time: '' }));
        setBookingError(HORA_OCUPADA);
        return 'ocupado';
      }

      // Cita y servicios en una sola transacción: si un servicio choca, no queda una cita a medias.
      const { error } = await supabase.rpc('save_appointment', {
        p_id: null,
        p_client_id: null,
        p_client_name: form.name.trim(),
        p_client_phone: form.phone.trim(),
        p_date: form.date,
        p_time: form.time,
        p_status: 'pending',
        p_notes: form.notes.trim() || '',
        p_source: 'web',
        p_services: planElegido.map((linea) => ({
          // En paquetes es el servicio del paquete: con eso se descuenta la sesión al completar
          service_id: linea.serviceId,
          service_name: linea.nombre,
          employee: linea.staff.name,
          duration: linea.duracion,
          price: 0,
        })),
      });

      if (error) {
        console.error('[booking] insert error:', error);
        // 23P01 = la base rechazó la cita porque otra persona tomó ese horario en el mismo instante.
        // Es el único caso que la clienta puede resolver.
        if (error.code === '23P01') {
          setForm((prev) => ({ ...prev, time: '' }));
          setBookingError(HORA_OCUPADA);
          return 'ocupado';
        }
        setBookingError('Hubo un problema al guardar tu solicitud. Por favor intenta de nuevo o contáctanos por WhatsApp.');
        return 'error';
      }

      setWhatsappMsg(mensajeWhatsApp({
        nombre: form.name, telefono: form.phone, plan: planElegido, fecha: form.date, hora: form.time, notas: form.notes,
      }));
      setConfirmada({
        fecha: form.date,
        hora: form.time,
        plan: planElegido,
        nombre: form.name.trim(),
        duracionTotal: planElegido.reduce((t, l) => t + l.duracion, 0),
      });
      setSuccess(true);
      return 'ok';
    } finally {
      setSending(false);
    }
  }, [planElegido, form]);

  const reset = useCallback(() => {
    setSuccess(false);
    setConfirmada(null);
    setBookingError('');
    setForm(FORM_VACIO);
    setPicks([{ serviceId: '', staffId: '' }]);
  }, []);

  return {
    services, packages, staffList, cargando,
    picks, setPicks, bookingType, form, setForm,
    settings, sending, loadingSlots, success, bookingError, setBookingError, whatsappMsg, confirmada,
    selectedPkg, elegidos, duracionTotal, horarios, availableSlots, planElegido, isDayOff,
    cambiarTipo, alternarServicio, elegirEspecialista, elegirPaquete, elegirEspecialistaPaquete, elegirFecha, elegirHora,
    submit, reset,
  };
}
```
Si el cliente tipado de Supabase rechaza `p_id: null` o `p_client_id: null` en `save_appointment`, se deja
exactamente como estaba en `Booking.tsx`, que compila hoy. No se agregan conversiones nuevas.

- [ ] **Step 2: Mover la reserva vieja a `src/legacy/`**

```bash
git mv vscode/src/components/Booking.tsx vscode/src/legacy/Booking.tsx
git mv vscode/src/components/Booking.css vscode/src/legacy/Booking.css
```

- [ ] **Step 3: La reserva vieja usa el hook.** En `vscode/src/legacy/Booking.tsx`, con CRLF, reemplaza todo lo
  que va desde la línea 1 hasta la línea anterior a `  if (success) {` por:
```tsx
import { useState } from 'react';
import {
  Calendar, Clock, User, Phone, MessageCircle, Send,
  Sparkles, AlertCircle, CheckCircle2, Copy, ExternalLink,
} from 'lucide-react';
import { format12h } from '../lib/timeFormat';
import { isoLocal } from '../site/reservar/calendario';
import { minutesToTime, timeToMinutes } from '../site/reservar/disponibilidad';
import { useBooking } from '../site/reservar/useBooking';
import './Booking.css';

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** El diseño anterior de /reservar (spec §8). La lógica vive en useBooking y es la misma de la reserva nueva. */
export default function Booking() {
  const {
    services, packages, staffList, picks, setPicks, bookingType, cambiarTipo, form, setForm,
    settings, sending, loadingSlots, success, bookingError, whatsappMsg,
    selectedPkg, elegidos, duracionTotal, availableSlots, planElegido, isDayOff, submit, reset,
  } = useBooking();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).catch(() => { });
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const resetForm = reset;

```
  En el resto del archivo (el JSX), cambia solo tres cosas:
  1. En el botón "Servicios" del selector, el `onClick` pasa a ser `onClick={() => cambiarTipo('service')}`.
  2. En el botón "Paquete de Sesiones", el `onClick` pasa a ser `onClick={() => cambiarTipo('package')}`.
  3. En el campo de fecha, `min={getTodayStr()}` pasa a ser `min={isoLocal(new Date())}`.

  Todo lo demás del JSX usa nombres que ahora vienen del hook, con el mismo significado.

- [ ] **Step 4: La página vieja, para consulta.** `vscode/src/legacy/BookingPageAnterior.tsx`:
```tsx
import { useEffect } from 'react';
import Navbar from './Navbar';
import Booking from './Booking';
import Footer from './Footer';

/** El diseño anterior de /reservar, guardado para consulta (spec §8). Google no la indexa. */
export default function BookingPageAnterior() {
  useEffect(() => {
    window.scrollTo(0, 0);
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  return (
    <>
      <Navbar />
      <div style={{ minHeight: '80vh', paddingTop: '60px' }}>
        <Booking />
      </div>
      <Footer />
    </>
  );
}
```

- [ ] **Step 5: Rutas, con CRLF.**
  1. En `vscode/src/pages/BookingPage.tsx`, `import Booking from '../components/Booking';` pasa a ser
     `import Booking from '../legacy/Booking';`. Mientras tanto `/reservar` sigue igual; la Task 10 la cambia.
  2. En `vscode/src/App.tsx`, debajo de `const LandingPageAnterior = lazy(...)`, agrega
     `const BookingPageAnterior = lazy(() => import('./legacy/BookingPageAnterior'));`.
  3. En `App.tsx`, debajo de la ruta `/diseno-anterior`, agrega
     `<Route path="/diseno-anterior/reservar" element={<Suspense fallback={null}><BookingPageAnterior /></Suspense>} />`.

- [ ] **Step 6: Tipos, pruebas y compilación**

```bash
cd vscode
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -E "src/site/|src/legacy/Booking|BookingPage|src/App"
npm test
npm run build
file src/legacy/Booking.tsx src/pages/BookingPage.tsx src/App.tsx
```
Expected:
- 39 errores, igual que la línea base, y ninguna línea del segundo `grep`;
- 96 pruebas pasan;
- `✓ built`;
- los tres archivos con "CRLF line terminators".

- [ ] **Step 7: Commit**

```bash
git add vscode/src/site/reservar/useBooking.ts vscode/src/legacy/Booking.tsx vscode/src/legacy/Booking.css vscode/src/legacy/BookingPageAnterior.tsx vscode/src/pages/BookingPage.tsx vscode/src/App.tsx
git commit -m "refactor(reservar): la lógica de la reserva en useBooking y el diseño anterior en /diseno-anterior/reservar"
```

---

### Task 6: Paso 1, "¿Qué te vas a hacer?"

**Files:**
- Modify: `vscode/src/site/theme/tokens.css`: variables nuevas del tema
- Create: `vscode/src/site/reservar/PasoServicios.tsx`
- Create: `vscode/src/site/reservar/PasoServicios.css`

**Interfaces:**
- Consumes:
  - `ServicioReserva` y `filtrarServicios` (Task 3);
  - `Especialista` y `quienPuede` (Task 2);
  - `PaqueteBase`, `Pick` y `TipoReserva` (Task 5);
  - `FAMILIAS` de `../landing/catalogo`, `iniciales` de `../landing/equipo`, `SesionesOvalos` de
    `../ui/SesionesOvalos` y `servicesMenu` de `../../data/servicesMenu`.
- Produces: `export default function PasoServicios(props: PasoServiciosProps)`. Estas son las props:
```ts
export interface PasoServiciosProps {
  tipo: TipoReserva;
  onTipo: (tipo: TipoReserva) => void;
  servicios: ServicioReserva[];
  staff: Especialista[];
  /** solo los servicios elegidos de verdad (con serviceId) */
  picks: Pick[];
  onAlternar: (serviceId: string) => void;
  onEspecialista: (serviceId: string, staffId: string) => void;
  paquetes: PaqueteBase[];
  paqueteId: string;
  onPaquete: (packageId: string) => void;
  especialistaPaquete: string;
  onEspecialistaPaquete: (staffId: string) => void;
  /** especialidad que viene del catálogo (?categoria=); null si no vino */
  categoriaInicial: string | null;
  cargando: boolean;
}
```

- [ ] **Step 1: Variables del tema.** En `vscode/src/site/theme/tokens.css`, suma al final del bloque
  `.site[data-site-tema="oscuro"]`:
```css
  --s-surface-2:rgba(245,241,234,.1); --s-input:rgba(245,241,234,.05); --s-warn:#E3B878; --s-bad:#E39A8F;
```
  y al final del bloque `.site[data-site-tema="claro"]`:
```css
  --s-surface-2:#F5F1EA; --s-input:#FFFFFF; --s-warn:#8F5C16; --s-bad:#B04A3C;
```
  Los valores claros de `--s-warn` y `--s-bad` son más oscuros que en el boceto, para llegar a AA sobre blanco:
  5.7:1 y 5.4:1.

- [ ] **Step 2: Componente**

`vscode/src/site/reservar/PasoServicios.tsx`:
```tsx
import { useId, useMemo, useState } from 'react';
import { servicesMenu, type FamiliaId } from '../../data/servicesMenu';
import { FAMILIAS } from '../landing/catalogo';
import { iniciales } from '../landing/equipo';
import SesionesOvalos from '../ui/SesionesOvalos';
import { quienPuede, type Especialista } from './disponibilidad';
import { filtrarServicios, type ServicioReserva } from './servicios';
import type { PaqueteBase, Pick, TipoReserva } from './useBooking';
import './PasoServicios.css';

export interface PasoServiciosProps {
  tipo: TipoReserva;
  onTipo: (tipo: TipoReserva) => void;
  servicios: ServicioReserva[];
  staff: Especialista[];
  /** solo los servicios elegidos de verdad (con serviceId) */
  picks: Pick[];
  onAlternar: (serviceId: string) => void;
  onEspecialista: (serviceId: string, staffId: string) => void;
  paquetes: PaqueteBase[];
  paqueteId: string;
  onPaquete: (packageId: string) => void;
  especialistaPaquete: string;
  onEspecialistaPaquete: (staffId: string) => void;
  /** especialidad que viene del catálogo (?categoria=); null si no vino */
  categoriaInicial: string | null;
  cargando: boolean;
}

const nombreFamilia = (f: FamiliaId) => FAMILIAS.find((x) => x.id === f)?.corto ?? '';

/** Paso 1 (spec §6.1): servicios con buscador y familias, o "Tengo un paquete"; con quién en cada uno. */
export default function PasoServicios(p: PasoServiciosProps) {
  const [texto, setTexto] = useState('');
  const [familia, setFamilia] = useState<FamiliaId | 'todas'>(
    () => servicesMenu.find((c) => c.id === p.categoriaInicial)?.familia ?? 'todas',
  );
  const [categoria, setCategoria] = useState<string | null>(p.categoriaInicial);
  const idBuscar = useId();
  const grupoTipo = useId();
  const grupoPaquete = useId();
  const lista = useMemo(
    () => filtrarServicios(p.servicios, { texto, familia, categoria }),
    [p.servicios, texto, familia, categoria],
  );
  const tituloCategoria = categoria ? servicesMenu.find((c) => c.id === categoria)?.title : null;
  const paquete = p.paquetes.find((x) => x.id === p.paqueteId);

  return (
    <>
      <fieldset className="s-seg">
        <legend className="s-sr">Qué vas a reservar</legend>
        <label>
          <input type="radio" name={grupoTipo} checked={p.tipo === 'service'} onChange={() => p.onTipo('service')} />
          <span>Servicios</span>
        </label>
        <label>
          <input type="radio" name={grupoTipo} checked={p.tipo === 'package'} onChange={() => p.onTipo('package')} />
          <span>Tengo un paquete</span>
        </label>
      </fieldset>

      {p.tipo === 'service' ? (
        <>
          {p.picks.length > 0 && (
            <ul className="s-picks">
              {p.picks.map((pick) => {
                const s = p.servicios.find((x) => x.id === pick.serviceId);
                if (!s) return null;
                return (
                  <li key={s.id} className="s-pick">
                    <div className="s-pick-top">
                      <b>{s.nombre}</b>
                      <span>{s.duracion} min</span>
                      <button type="button" onClick={() => p.onAlternar(s.id)} aria-label={`Quitar ${s.nombre}`}>×</button>
                    </div>
                    <Quien servicio={s.nombre} opciones={quienPuede(p.staff, s.id)} elegida={pick.staffId}
                      onElegir={(staffId) => p.onEspecialista(s.id, staffId)} />
                  </li>
                );
              })}
            </ul>
          )}

          <label className="s-buscar" htmlFor={idBuscar}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <span className="s-sr">Buscar servicio</span>
            <input id={idBuscar} type="search" value={texto} autoComplete="off"
              placeholder="Buscar servicio… (ej. láser, cejas, labios)" onChange={(e) => setTexto(e.target.value)} />
          </label>

          <div className="s-fams" role="group" aria-label="Tipo de tratamiento">
            {[{ id: 'todas' as const, corto: 'Todos' }, ...FAMILIAS].map((f) => (
              <button key={f.id} type="button" className={`s-fam ${familia === f.id ? 'is-on' : ''}`}
                aria-pressed={familia === f.id} onClick={() => { setFamilia(f.id); setCategoria(null); }}>
                {f.corto}
              </button>
            ))}
          </div>

          {tituloCategoria && (
            <p className="s-filtro">
              Mostrando <b>{tituloCategoria}</b>
              <button type="button" onClick={() => setCategoria(null)}>Ver todos</button>
            </p>
          )}

          <div className="s-svlist" role="group" aria-label="Servicios">
            {p.cargando ? (
              <p className="s-vacio">Cargando servicios…</p>
            ) : lista.length === 0 ? (
              <p className="s-vacio">No encontramos ese servicio. Prueba con otra palabra o escríbenos por WhatsApp.</p>
            ) : (
              lista.map((s) => {
                const on = p.picks.some((x) => x.serviceId === s.id);
                return (
                  <label key={s.id} className={`s-sv ${on ? 'is-on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => p.onAlternar(s.id)} />
                    <span className="s-sv-ck" aria-hidden="true">✓</span>
                    <span className="s-sv-nm">
                      {s.nombre}
                      {s.familia && <small>{nombreFamilia(s.familia)}</small>}
                    </span>
                    <span className="s-sv-meta">
                      <span className="s-sv-du">{s.duracion} min</span>
                      <span className={`s-sv-pr ${s.conPrecio ? '' : 'is-na'}`}>{s.precio}</span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </>
      ) : (
        <>
          {p.paquetes.length === 0 ? (
            <p className="s-vacio">{p.cargando ? 'Cargando paquetes…' : 'Por ahora no hay paquetes disponibles.'}</p>
          ) : (
            <fieldset className="s-pkgs">
              <legend className="s-sr">Tu paquete</legend>
              {p.paquetes.map((x) => (
                <label key={x.id} className={`s-pkc ${x.id === p.paqueteId ? 'is-on' : ''}`}>
                  <input type="radio" name={grupoPaquete} checked={x.id === p.paqueteId} onChange={() => p.onPaquete(x.id)} />
                  <b>{x.name}</b>
                  <span>
                    {x.services?.name ?? 'Sesión'}
                    {x.services?.duration ? ` · ${x.services.duration} min` : ''}
                  </span>
                  <SesionesOvalos sesiones={x.sessions} />
                </label>
              ))}
            </fieldset>
          )}
          {paquete && (
            <div className="s-pick">
              <div className="s-pick-top">
                <b>Sesión de {paquete.name}</b>
                {paquete.services?.duration ? <span>{paquete.services.duration} min</span> : null}
              </div>
              <Quien servicio={paquete.name} opciones={quienPuede(p.staff, paquete.service_id)}
                elegida={p.especialistaPaquete} onElegir={p.onEspecialistaPaquete} />
            </div>
          )}
          <p className="s-hint">Reserva aquí cada sesión del paquete que ya compraste. La sesión se descuenta al completarla.</p>
        </>
      )}
    </>
  );
}

/** "Con": Cualquiera y las caras de quienes hacen ese servicio. Son radios de verdad, así que el teclado funciona solo. */
function Quien({ servicio, opciones, elegida, onElegir }: {
  servicio: string; opciones: Especialista[]; elegida: string; onElegir: (staffId: string) => void;
}) {
  const grupo = useId();
  return (
    <fieldset className="s-quien">
      <legend>Con<span className="s-sr"> quién: {servicio}</span></legend>
      <div className="s-quien-op">
        <label className={`s-av ${elegida === '' ? 'is-on' : ''}`}>
          <input type="radio" name={grupo} checked={elegida === ''} onChange={() => onElegir('')} />
          <i aria-hidden="true">✦</i>Cualquiera
        </label>
        {opciones.map((m) => (
          <label key={m.id} className={`s-av ${elegida === m.id ? 'is-on' : ''}`}>
            <input type="radio" name={grupo} checked={elegida === m.id} onChange={() => onElegir(m.id)} />
            {m.avatar_url ? <img src={m.avatar_url} alt="" loading="lazy" /> : <i aria-hidden="true">{iniciales(m.name) || 'N'}</i>}
            {m.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
```

- [ ] **Step 3: Estilos**

`vscode/src/site/reservar/PasoServicios.css`:
```css
/* Paso 1 de /reservar (boceto citas-v2, #sec1). Celular primero. */
.s-seg{ display:flex; min-width:0; margin:0 0 18px; padding:4px; border:0; border-radius:999px; background:var(--s-surface-2) }
.s-seg label{ position:relative; flex:1 }
.s-seg span{ display:flex; align-items:center; justify-content:center; min-height:44px; padding:0 14px; border-radius:999px; font-size:14px; color:var(--s-soft); text-align:center; cursor:pointer; transition:background-color .3s, color .3s }
.s-seg input:checked + span{ background:var(--s-chip-on); color:var(--s-chip-on-fg); font-weight:500 }
/* los controles de verdad quedan invisibles pero enfocables; el foco se ve en su etiqueta */
.s-seg input, .s-sv input, .s-pkc input, .s-av input{ position:absolute; width:1px; height:1px; margin:0; opacity:0 }
.s-seg input:focus-visible + span{ outline:2px solid var(--s-accent); outline-offset:2px }
.s-sv:has(input:focus-visible), .s-pkc:has(input:focus-visible), .s-av:has(input:focus-visible){ outline:2px solid var(--s-accent); outline-offset:2px }
@supports not selector(:has(*)){
  .s-sv:focus-within, .s-pkc:focus-within, .s-av:focus-within{ outline:2px solid var(--s-accent); outline-offset:2px }
}

.s-picks{ display:flex; flex-direction:column; gap:12px; margin:0 0 18px; padding:0; list-style:none }
.s-pick{ padding:14px; border-radius:18px; border:1px solid var(--s-accent); background:var(--s-surface-2); animation:s-r-entra .4s var(--s-ease) both }
.s-pick-top{ display:flex; align-items:center; gap:10px; margin-bottom:10px }
.s-pick-top b{ flex:1; min-width:0; font:400 17px/1.25 var(--s-f-display); overflow-wrap:anywhere }
.s-pick-top span{ font-size:12.5px; color:var(--s-faint); white-space:nowrap }
.s-pick-top button{ display:grid; place-items:center; width:44px; height:44px; margin:-10px -10px -10px 0; border:0; background:none; color:var(--s-faint); font-size:20px; line-height:1 }

.s-quien{ min-width:0; margin:0; padding:0; border:0 }
.s-quien legend{ margin:0 0 6px; padding:0; font-size:11.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--s-faint) }
.s-quien-op{ display:flex; flex-wrap:wrap; gap:6px }
.s-av{ position:relative; display:inline-flex; align-items:center; gap:8px; min-height:44px; max-width:100%; padding:4px 12px 4px 4px; border-radius:999px; border:1px solid var(--s-line); font-size:12.5px; cursor:pointer; transition:background-color .3s, color .3s, border-color .3s }
.s-av img, .s-av i{ display:grid; place-items:center; width:30px; height:30px; flex-shrink:0; border-radius:50%; object-fit:cover; object-position:50% 18%; background:var(--s-arch-bg); font-style:normal; font-size:11px }
.s-av.is-on{ border-color:var(--s-accent); background:var(--s-chip-on); color:var(--s-chip-on-fg) }

.s-buscar{ display:flex; align-items:center; gap:10px; min-height:48px; margin-bottom:14px; padding:0 16px; border-radius:14px; border:1px solid var(--s-line); background:var(--s-input) }
.s-buscar svg{ width:17px; height:17px; flex-shrink:0; fill:none; stroke:currentColor; stroke-width:2; opacity:.7 }
.s-buscar input{ flex:1; min-width:0; height:46px; border:0; background:none; color:var(--s-text); font:400 16px var(--s-f-body); outline:none }
.s-buscar input::placeholder{ color:var(--s-faint) }
.s-buscar:focus-within{ border-color:var(--s-accent); box-shadow:0 0 0 1px var(--s-accent) }

.s-fams{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px }
.s-fam{ min-height:44px; padding:0 14px; border-radius:999px; border:1px solid var(--s-line); background:none; font-size:13px; color:var(--s-soft) }
.s-fam.is-on{ background:var(--s-chip-on); color:var(--s-chip-on-fg); border-color:transparent }
.s-filtro{ display:flex; align-items:center; flex-wrap:wrap; gap:4px 10px; margin:0 0 6px; font-size:13.5px; color:var(--s-soft) }
.s-filtro b{ color:var(--s-text); font-weight:500 }
.s-filtro button{ min-height:44px; padding:0 4px; border:0; background:none; color:var(--s-accent); text-decoration:underline; text-underline-offset:4px }

.s-svlist{ max-height:360px; margin:0 -8px; padding:0 8px; overflow-y:auto; overscroll-behavior:contain }
.s-sv{ position:relative; display:flex; align-items:center; gap:10px; min-height:52px; padding:10px 2px; border-bottom:1px solid var(--s-line); cursor:pointer }
.s-sv-ck{ display:grid; place-items:center; width:22px; height:22px; flex-shrink:0; border-radius:7px; border:1.5px solid var(--s-line); font-size:13px; color:transparent; transition:background-color .25s, color .25s }
.s-sv.is-on .s-sv-ck{ background:var(--s-btn-bg); border-color:transparent; color:var(--s-btn-fg) }
.s-sv-nm{ flex:1; min-width:0; font-size:14.5px; overflow-wrap:anywhere }
.s-sv-nm small{ display:block; margin-top:2px; font-size:12px; color:var(--s-faint) }
.s-sv-meta{ display:flex; flex-direction:column; align-items:flex-end; gap:2px; flex-shrink:0 }
.s-sv-du{ font-size:12.5px; color:var(--s-faint); white-space:nowrap }
.s-sv-pr{ font-size:12.5px; font-weight:500; white-space:nowrap }
.s-sv-pr.is-na{ color:var(--s-faint); font-weight:400 }
.s-vacio{ margin:0; padding:18px 4px; font-size:14px; line-height:1.5; color:var(--s-soft) }

.s-pkgs{ display:grid; gap:12px; min-width:0; margin:0; padding:0; border:0 }
.s-pkc{ position:relative; display:block; padding:16px; border-radius:18px; border:1px solid var(--s-line); cursor:pointer; transition:border-color .3s, background-color .3s }
.s-pkc.is-on{ border-color:var(--s-accent); background:var(--s-surface-2) }
.s-pkc b{ display:block; margin-bottom:4px; font:400 18px/1.2 var(--s-f-display); overflow-wrap:anywhere }
.s-pkc > span{ font-size:12.5px; color:var(--s-faint) }
.s-pkc .s-ovalos{ margin-top:10px }
.s-pkgs + .s-pick{ margin-top:16px }

@media (min-width: 761px){
  .s-seg{ display:inline-flex }
  .s-seg label{ flex:none }
  .s-seg span{ padding:0 18px }
  .s-pick{ padding:16px 18px }
  .s-pick-top b{ font-size:19px }
  .s-av{ font-size:13px }
  .s-sv{ gap:14px; padding:12px 4px }
  .s-sv-nm{ font-size:15px }
  .s-sv-meta{ flex-direction:row; align-items:center; gap:14px }
  .s-sv-pr{ min-width:86px; text-align:right; font-size:13.5px }
  .s-pkgs{ grid-template-columns:repeat(2, minmax(0,1fr)) }
}
@media (min-width: 1101px){
  .s-pkgs{ grid-template-columns:repeat(3, minmax(0,1fr)) }
}
@media (hover:hover){
  .s-fam:not(.is-on):hover, .s-av:not(.is-on):hover, .s-pkc:not(.is-on):hover{ border-color:var(--s-accent) }
}
```
`.s-hint` y `@keyframes s-r-entra` se definen en `Reservar.css` (Task 10), porque los usan varios pasos.

- [ ] **Step 3b: Compilación**

```bash
cd vscode
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site"
npm run build
grep -c "…\|✦\|·" src/site/reservar/PasoServicios.tsx
```
Expected: `0`, `✓ built` y al menos 3. El componente todavía no se usa; la Task 10 lo conecta.

- [ ] **Step 4: Commit**

```bash
git add vscode/src/site/theme/tokens.css vscode/src/site/reservar/PasoServicios.tsx vscode/src/site/reservar/PasoServicios.css
git commit -m "feat(reservar): paso 1 con buscador, familias, con quién y paquetes"
```

---

### Task 7: Paso 2, "¿Cuándo?" (semana, mes y horas)

**Files:**
- Create: `vscode/src/site/reservar/PasoCuando.tsx`
- Create: `vscode/src/site/reservar/PasoCuando.css`

**Interfaces:**
- Consumes: todo lo de `calendario.ts` (Task 1), `Horario` (Task 2), `fechaLarga` (Task 4) y `format12h`.
- Produces: `export default function PasoCuando(props: PasoCuandoProps)`, con estas props:
```ts
export interface PasoCuandoProps {
  hoy: string;
  /** día elegido ("" si ninguno) */
  fecha: string;
  onFecha: (iso: string) => void;
  /** todas las horas del día, con las ocupadas (plan null) */
  horarios: Horario[];
  hora: string;
  onHora: (hora: string) => void;
  cargando: boolean;
  sinHuecos: boolean;
  variosServicios: boolean;
}
```

- [ ] **Step 1: Componente**

`vscode/src/site/reservar/PasoCuando.tsx`:
```tsx
import { useState, type ReactNode } from 'react';
import { format12h } from '../../lib/timeFormat';
import {
  etiquetaMes, flechasMes, flechasSemana, lunesDe, mesDeSemana, mesEnCuadricula, semana, sumarDias, sumarMeses,
  type Dia, type MesVisto,
} from './calendario';
import type { Horario } from './disponibilidad';
import { fechaLarga } from './resumen';
import './PasoCuando.css';

export interface PasoCuandoProps {
  hoy: string;
  /** día elegido ("" si ninguno) */
  fecha: string;
  onFecha: (iso: string) => void;
  /** todas las horas del día, con las ocupadas (plan null) */
  horarios: Horario[];
  hora: string;
  onHora: (hora: string) => void;
  cargando: boolean;
  sinHuecos: boolean;
  variosServicios: boolean;
}

const INICIALES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MOTIVO = { domingo: 'cerrado', pasado: 'ya pasó', lejos: 'todavía no se puede reservar' } as const;

/** Paso 2 (spec §6.1): tira de 7 días con flechas, "Ver mes" y las horas en Mañana y Tarde. */
export default function PasoCuando(p: PasoCuandoProps) {
  const [vista, setVista] = useState<'semana' | 'mes'>('semana');
  const [lunes, setLunes] = useState(() => lunesDe(p.fecha || p.hoy));
  const [mes, setMes] = useState<MesVisto>(() => mesDeSemana(lunesDe(p.fecha || p.hoy)));

  const flechas = vista === 'semana' ? flechasSemana(lunes, p.hoy) : flechasMes(mes, p.hoy);
  const unidad = vista === 'semana' ? 'Semana' : 'Mes';
  const mover = (n: -1 | 1) => (vista === 'semana' ? setLunes((l) => sumarDias(l, 7 * n)) : setMes((m) => sumarMeses(m, n)));
  const alternarVista = () => {
    if (vista === 'semana') {
      setMes(mesDeSemana(lunes));
      setVista('mes');
    } else {
      setVista('semana');
    }
  };
  const elegir = (iso: string) => {
    p.onFecha(iso);
    // al elegir en el mes, se vuelve a la semana de ese día
    if (vista === 'mes') {
      setLunes(lunesDe(iso));
      setVista('semana');
    }
  };

  const boton = (d: Dia, clase: string, contenido: ReactNode) => (
    <button key={d.iso} type="button"
      className={`${clase} ${d.iso === p.fecha ? 'is-on' : ''} ${d.esHoy ? 'is-hoy' : ''}`}
      disabled={d.motivo !== null} aria-pressed={d.iso === p.fecha}
      aria-label={`${fechaLarga(d.iso)}${d.motivo ? `, ${MOTIVO[d.motivo]}` : ''}`}
      onClick={() => elegir(d.iso)}>
      {contenido}
    </button>
  );

  const manana = p.horarios.filter((h) => h.hora < '12:00');
  const tarde = p.horarios.filter((h) => h.hora >= '12:00');

  return (
    <>
      <div className="s-cal-h">
        <button type="button" className="s-cal-arr" onClick={() => mover(-1)} disabled={!flechas.anterior}
          aria-label={`${unidad} anterior`}>‹</button>
        <button type="button" className="s-cal-mes" onClick={alternarVista}>
          <b>{etiquetaMes(vista === 'semana' ? mesDeSemana(lunes) : mes)}</b>
          <span>{vista === 'semana' ? 'Ver mes' : 'Ver semana'}</span>
        </button>
        <button type="button" className="s-cal-arr" onClick={() => mover(1)} disabled={!flechas.siguiente}
          aria-label={`${unidad} siguiente`}>›</button>
      </div>

      {vista === 'semana' ? (
        <div className="s-dias" role="group" aria-label="Días de la semana">
          {semana(lunes, p.hoy).map((d) => boton(d, 's-dia', (
            <>
              <small>{d.corto}</small>
              <b>{d.numero}</b>
              <em>{d.motivo === 'domingo' ? 'Cerrado' : d.mes}</em>
            </>
          )))}
        </div>
      ) : (
        <div className="s-mescal" role="group" aria-label={etiquetaMes(mes)}>
          {INICIALES.map((x, i) => <span key={`dow-${i}`} className="s-mescal-dow" aria-hidden="true">{x}</span>)}
          {mesEnCuadricula(mes, p.hoy).map((d, i) => (d ? boton(d, 's-mdia', d.numero) : <span key={`h-${i}`} />))}
        </div>
      )}

      <div className="s-horas">
        {!p.fecha ? (
          <p className="s-hint">Elige un día para ver las horas libres. Puedes moverte por semanas con las flechas o ver el mes completo.</p>
        ) : p.cargando ? (
          <p className="s-hint" role="status">Buscando horarios disponibles…</p>
        ) : p.sinHuecos ? (
          <p className="s-aviso" role="status">
            {p.variosServicios
              ? 'Ese día no hay un hueco donde quepan todos los servicios seguidos. Prueba otra fecha o quita alguno.'
              : 'No hay horarios libres para esta fecha. Prueba otro día.'}
          </p>
        ) : (
          <>
            <Grupo titulo="Mañana" horas={manana} hora={p.hora} onHora={p.onHora} />
            <Grupo titulo="Tarde" horas={tarde} hora={p.hora} onHora={p.onHora} />
            <p className="s-hint">Si eliges “Cualquiera”, te damos la primera especialista libre.</p>
          </>
        )}
      </div>
    </>
  );
}

function Grupo({ titulo, horas, hora, onHora }: {
  titulo: string; horas: Horario[]; hora: string; onHora: (hora: string) => void;
}) {
  if (!horas.length) return null;
  return (
    <div className="s-horas-g">
      <h3>{titulo}</h3>
      <div className="s-slots">
        {horas.map((h) => (
          <button key={h.hora} type="button" className={`s-slot ${h.hora === hora ? 'is-on' : ''}`}
            disabled={!h.plan} aria-pressed={h.hora === hora} onClick={() => onHora(h.hora)}>
            {format12h(h.hora)}
            {!h.plan && <span className="s-sr"> (ocupada)</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Estilos**

`vscode/src/site/reservar/PasoCuando.css`:
```css
/* Paso 2 de /reservar: semana, mes y horas (boceto citas-v2, #sec2). Celular primero. */
.s-cal-h{ display:flex; align-items:center; gap:8px; margin-bottom:14px }
.s-cal-mes{ flex:1; min-width:0; display:flex; align-items:center; gap:8px; min-height:44px; padding:0; border:0; background:none; text-align:left }
.s-cal-mes b{ min-width:0; font:400 18px var(--s-f-display); white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.s-cal-mes span{ flex-shrink:0; padding:4px 8px; border-radius:999px; border:1px solid var(--s-line); font:500 10px var(--s-f-body); letter-spacing:.12em; text-transform:uppercase; color:var(--s-accent); white-space:nowrap }
.s-cal-arr{ display:grid; place-items:center; width:44px; height:44px; flex-shrink:0; border-radius:50%; border:1px solid var(--s-line); background:none; font-size:18px; line-height:1 }
.s-cal-arr:disabled{ opacity:.25; cursor:default }

.s-dias{ display:grid; grid-template-columns:repeat(7, minmax(0,1fr)); gap:5px; margin-bottom:22px }
.s-dia{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-width:0; height:70px; padding:0; border-radius:20px; border:1px solid var(--s-line); background:none }
.s-dia small{ font-size:9.5px; letter-spacing:.04em; text-transform:uppercase; color:var(--s-faint) }
.s-dia b{ font:400 19px/1 var(--s-f-display) }
.s-dia em{ font-style:normal; font-size:9px; color:var(--s-faint) }
.s-dia:disabled{ opacity:.35; cursor:default }
.s-dia.is-hoy{ border-color:var(--s-accent) }
.s-dia.is-on{ background:var(--s-chip-on); color:var(--s-chip-on-fg); border-color:transparent }
.s-dia.is-on small, .s-dia.is-on em{ color:inherit; opacity:.75 }

.s-mescal{ display:grid; grid-template-columns:repeat(7, minmax(0,1fr)); gap:6px; margin-bottom:22px; animation:s-r-entra .35s var(--s-ease) both }
.s-mescal-dow{ padding:4px 0 6px; font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--s-faint); text-align:center }
.s-mdia{ justify-self:center; width:100%; max-width:52px; aspect-ratio:1/1; padding:0; border-radius:50%; border:1px solid transparent; background:none; font-size:14.5px }
.s-mdia:disabled{ opacity:.25; cursor:default }
.s-mdia.is-hoy{ border-color:var(--s-accent) }
.s-mdia.is-on{ background:var(--s-chip-on); color:var(--s-chip-on-fg); border-color:transparent }

.s-horas-g{ margin-bottom:16px }
.s-horas-g h3{ margin:0 0 10px; font:500 12px var(--s-f-body); letter-spacing:.16em; text-transform:uppercase; color:var(--s-faint) }
.s-slots{ display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:8px }
.s-slot{ min-height:44px; padding:0 4px; border-radius:12px; border:1px solid var(--s-line); background:none; font-size:13px; white-space:nowrap }
.s-slot:disabled{ opacity:.3; text-decoration:line-through; cursor:default }
.s-slot.is-on{ background:var(--s-btn-bg); color:var(--s-btn-fg); border-color:transparent; font-weight:500 }
.s-aviso{ margin:0; padding:12px 14px; border-radius:14px; background:var(--s-surface-2); font-size:14px; line-height:1.5 }

@media (min-width: 761px){
  .s-cal-h{ gap:10px }
  .s-cal-mes{ gap:12px }
  .s-cal-mes b{ font-size:22px }
  .s-cal-mes span{ padding:5px 11px; font-size:11.5px }
  .s-dias{ gap:8px }
  .s-dia{ height:84px; border-radius:999px }
  .s-dia small{ font-size:11px; letter-spacing:.1em }
  .s-dia b{ font-size:24px }
  .s-dia em{ font-size:10.5px }
  .s-slots{ grid-template-columns:repeat(6, minmax(0,1fr)) }
  .s-slot{ font-size:13.5px }
}
@media (hover:hover){
  .s-dia:not(:disabled):not(.is-on):hover, .s-mdia:not(:disabled):not(.is-on):hover,
  .s-slot:not(:disabled):not(.is-on):hover, .s-cal-arr:not(:disabled):hover{ border-color:var(--s-accent) }
}
```

- [ ] **Step 3: Compilación**

```bash
cd vscode
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site"
npm run build
grep -c "‹\|›\|“\|…" src/site/reservar/PasoCuando.tsx
```
Expected: `0`, `✓ built` y al menos 4.

- [ ] **Step 4: Commit**

```bash
git add vscode/src/site/reservar/PasoCuando.tsx vscode/src/site/reservar/PasoCuando.css
git commit -m "feat(reservar): paso 2 con semana, mes y horas en mañana y tarde"
```

---

### Task 8: Paso 3, resumen "Tu visita" y barra de abajo

**Files:**
- Create: `vscode/src/site/reservar/PasoDatos.tsx`
- Create: `vscode/src/site/reservar/PasoDatos.css`
- Create: `vscode/src/site/reservar/ResumenVisita.tsx`
- Create: `vscode/src/site/reservar/ResumenVisita.css`

**Interfaces:**
- Consumes: `ErroresDatos` y `formatoTelefono` (Task 4), `duracionTexto`, `fechaLarga` y `LineaResumen`
  (Task 4), y `formatoRD` de `../landing/catalogo`.
- Produces:
  - `export default function PasoDatos(props: PasoDatosProps)`, donde
    `PasoDatosProps = { nombre: string; telefono: string; notas: string; errores: ErroresDatos; onCambio: (campo: 'name' | 'phone' | 'notes', valor: string) => void }`.
    Los ids de los campos son `r-nombre`, `r-telefono` y `r-notas`.
  - `export function ResumenVisita(props: ResumenProps)`, donde
    `ResumenProps = { lineas: LineaResumen[]; fecha: string; duracionTotal: number; deposito: number; listo: boolean; enviando: boolean; onSolicitar: () => void }`.
  - `export function BarraReserva(props: BarraProps)`, donde
    `BarraProps = { titulo: string; detalle: string; accion: string; deshabilitada: boolean; onAccion: () => void }`.

- [ ] **Step 1: Paso 3**

`vscode/src/site/reservar/PasoDatos.tsx`:
```tsx
import { formatoTelefono, type ErroresDatos } from './datos';
import './PasoDatos.css';

export interface PasoDatosProps {
  nombre: string;
  telefono: string;
  notas: string;
  errores: ErroresDatos;
  onCambio: (campo: 'name' | 'phone' | 'notes', valor: string) => void;
}

/** Paso 3 (spec §6.1): nombre, WhatsApp y notas. Reservar usa los ids para llevar el foco al campo con error. */
export default function PasoDatos({ nombre, telefono, notas, errores, onCambio }: PasoDatosProps) {
  const descTelefono = ['r-telefono-nota', errores.telefono ? 'r-telefono-error' : ''].filter(Boolean).join(' ');
  return (
    <div className="s-campos">
      <div className="s-campo">
        <label htmlFor="r-nombre">Nombre completo</label>
        <input id="r-nombre" type="text" autoComplete="name" value={nombre}
          aria-invalid={errores.nombre ? true : undefined}
          aria-describedby={errores.nombre ? 'r-nombre-error' : undefined}
          onChange={(e) => onCambio('name', e.target.value)} />
        {errores.nombre && <small id="r-nombre-error" className="s-campo-error">{errores.nombre}</small>}
      </div>
      <div className="s-campo">
        <label htmlFor="r-telefono">Teléfono (WhatsApp)</label>
        <input id="r-telefono" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="829-000-0000"
          value={telefono} aria-invalid={errores.telefono ? true : undefined} aria-describedby={descTelefono}
          onChange={(e) => onCambio('phone', formatoTelefono(e.target.value))} />
        <small id="r-telefono-nota">Con este número verás tus citas en “Mis citas”.</small>
        {errores.telefono && <small id="r-telefono-error" className="s-campo-error">{errores.telefono}</small>}
      </div>
      <div className="s-campo s-campo--full">
        <label htmlFor="r-notas">Notas para tu especialista (opcional)</label>
        <textarea id="r-notas" rows={3} value={notas}
          placeholder="Alergias, si es tu primera vez, algo que debamos saber…"
          onChange={(e) => onCambio('notes', e.target.value)} />
      </div>
    </div>
  );
}
```

`vscode/src/site/reservar/PasoDatos.css`:
```css
/* Paso 3 de /reservar (boceto citas-v2, #sec3). Celular primero; 16 px para que el iPhone no acerque la vista. */
.s-campos{ display:grid; gap:16px }
.s-campo{ min-width:0 }
.s-campo label{ display:block; margin-bottom:7px; font-size:12.5px; color:var(--s-soft) }
.s-campo input, .s-campo textarea{ width:100%; min-height:50px; padding:0 16px; border-radius:14px; border:1px solid var(--s-line); background:var(--s-input); color:var(--s-text); font:400 16px var(--s-f-body) }
.s-campo textarea{ min-height:96px; padding:14px 16px; line-height:1.5; resize:vertical }
.s-campo input::placeholder, .s-campo textarea::placeholder{ color:var(--s-faint) }
.s-campo input[aria-invalid="true"]{ border-color:var(--s-bad) }
.s-campo small{ display:block; margin-top:6px; font-size:12px; line-height:1.4; color:var(--s-faint) }
.s-campo .s-campo-error{ color:var(--s-bad); font-weight:500 }
@media (min-width: 761px){
  .s-campos{ grid-template-columns:1fr 1fr }
  .s-campo--full{ grid-column:1 / -1 }
}
```

- [ ] **Step 2: Resumen y barra**

`vscode/src/site/reservar/ResumenVisita.tsx`:
```tsx
import { formatoRD } from '../landing/catalogo';
import { duracionTexto, fechaLarga, type LineaResumen } from './resumen';
import './ResumenVisita.css';

export interface ResumenProps {
  lineas: LineaResumen[];
  fecha: string;
  duracionTotal: number;
  deposito: number;
  /** hay día, hora y reparto: se puede solicitar */
  listo: boolean;
  enviando: boolean;
  onSolicitar: () => void;
}

/** "Tu visita", fija a la derecha en computadora. Nunca pasa del alto de la ventana: el contenido baja por
 *  dentro y el botón queda siempre a la vista (spec §6.1). */
export function ResumenVisita(p: ResumenProps) {
  return (
    <aside className="s-sum" aria-label="Resumen de tu visita">
      <div className="s-sum-h">
        <p className="s-eyebrow">Resumen</p>
        <h2 className="s-display">Tu visita</h2>
      </div>
      <div className="s-sum-b">
        {p.lineas.length === 0 ? (
          <p className="s-sum-vacio">Todavía no has elegido servicios. Aquí verás tu visita armada, con la hora de cada servicio y con quién.</p>
        ) : (
          <>
            <ol className="s-tl">
              {p.lineas.map((l, i) => (
                <li key={`${l.nombre}-${i}`}>
                  <time>{l.hora ?? '—'}</time>
                  <div><b>{l.nombre}</b><span>{l.duracion} min · {l.quien}</span></div>
                </li>
              ))}
            </ol>
            <dl className="s-sum-filas">
              <div><dt>Día</dt><dd>{p.fecha ? fechaLarga(p.fecha) : 'Por elegir'}</dd></div>
              <div><dt>Duración total</dt><dd>{duracionTexto(p.duracionTotal)}</dd></div>
            </dl>
          </>
        )}
      </div>
      <div className="s-sum-pie">
        <p className="s-dep">Para confirmar se pide un <b>depósito de {formatoRD(p.deposito)}</b>. El resto lo pagas en el salón.</p>
        <button type="button" className="s-btn s-btn-solid" disabled={!p.listo || p.enviando} onClick={p.onSolicitar}>
          {p.enviando ? 'Enviando…' : <>Solicitar cita <span className="s-ar" aria-hidden="true">→</span></>}
        </button>
      </div>
    </aside>
  );
}

export interface BarraProps {
  titulo: string;
  detalle: string;
  accion: string;
  deshabilitada: boolean;
  onAccion: () => void;
}

/** Tableta y celular: barra fija abajo con el resumen corto y el botón (spec §6.1). */
export function BarraReserva(p: BarraProps) {
  return (
    <div className="s-rbar" role="region" aria-label="Tu visita">
      <p><b>{p.titulo}</b><span>{p.detalle}</span></p>
      <button type="button" className="s-btn" disabled={p.deshabilitada} onClick={p.onAccion}>{p.accion}</button>
    </div>
  );
}
```

`vscode/src/site/reservar/ResumenVisita.css`:
```css
/* Resumen de /reservar (boceto citas-v2): barra abajo en tableta y celular, "Tu visita" fija en computadora.
   Los dos van siempre en chocolate, como la llamada final. */
.s-sum{ display:none }
.s-rbar{ position:sticky; bottom:0; z-index:15; display:flex; align-items:center; gap:12px; margin-top:8px; padding:12px 16px calc(14px + env(safe-area-inset-bottom)); border-radius:20px 20px 0 0; background:var(--s-listones-oscuro); color:#F5F1EA; box-shadow:0 -14px 30px -18px rgba(0,0,0,.6) }
.s-rbar p{ flex:1; min-width:0; margin:0; font-size:12.5px; line-height:1.4; color:rgba(245,241,234,.75) }
.s-rbar b{ display:block; color:#F5F1EA; font-size:14px; font-weight:500 }
.s-rbar b, .s-rbar span{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.s-rbar span{ display:block }
.s-rbar .s-btn{ flex-shrink:0; min-height:46px; padding:0 18px; background:#B2967D; color:#2A1E17 }
.s-rbar .s-btn:disabled{ opacity:.5; cursor:default }

@media (min-width: 761px){
  .s-rbar{ padding:14px 22px calc(16px + env(safe-area-inset-bottom)); border-radius:22px 22px 0 0 }
  .s-rbar p{ font-size:13px }
  .s-rbar b{ font-size:15px }
  .s-rbar .s-btn{ padding:0 22px }
}

@media (min-width: 1101px){
  .s-rbar{ display:none }
  .s-sum{ position:sticky; top:calc(var(--s-nav-h) + 20px); display:flex; flex-direction:column; max-height:calc(100vh - var(--s-nav-h) - 40px); border-radius:26px; overflow:hidden; background:var(--s-surface); border:1px solid var(--s-surface-line); box-shadow:var(--s-shadow) }
  .s-sum-h{ flex-shrink:0; padding:20px 24px; background:var(--s-listones-oscuro); color:#F5F1EA }
  .s-sum-h .s-eyebrow{ margin:0 0 8px; color:#B2967D }
  .s-sum-h h2{ font-size:26px }
  .s-sum-b{ flex:1; min-height:0; padding:18px 24px 6px; overflow-y:auto }
  .s-sum-pie{ flex-shrink:0; padding:4px 24px 22px; border-top:1px solid var(--s-line) }
  .s-sum-vacio{ margin:0; padding:10px 0 18px; font-size:14px; line-height:1.6; color:var(--s-faint) }
  .s-tl{ margin:0 0 18px; padding:0; list-style:none }
  .s-tl li{ display:grid; grid-template-columns:62px minmax(0,1fr); gap:12px; padding:10px 0 }
  .s-tl li + li{ border-top:1px dashed var(--s-line) }
  .s-tl time{ font-size:13px; font-weight:500; color:var(--s-accent) }
  .s-tl b{ display:block; margin-bottom:2px; font-size:14.5px; font-weight:500; overflow-wrap:anywhere }
  .s-tl span{ font-size:12.5px; color:var(--s-faint) }
  .s-sum-filas{ margin:0 }
  .s-sum-filas div{ display:flex; justify-content:space-between; gap:12px; padding:9px 0; border-top:1px solid var(--s-line); font-size:13.5px; color:var(--s-soft) }
  .s-sum-filas dt, .s-sum-filas dd{ margin:0 }
  .s-sum-filas dd{ color:var(--s-text); font-weight:500; text-align:right }
  .s-dep{ margin:14px 0 18px; padding:12px 14px; border-radius:14px; background:var(--s-surface-2); font-size:12.8px; line-height:1.55; color:var(--s-soft) }
  .s-dep b{ color:var(--s-text) }
  .s-sum .s-btn{ width:100% }
  .s-sum .s-btn:disabled{ opacity:.35; cursor:default }
}
```

- [ ] **Step 3: Compilación**

```bash
cd vscode
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site"
npm run build
grep -c "…\|—\|“" src/site/reservar/PasoDatos.tsx src/site/reservar/ResumenVisita.tsx
```
Expected: `0`, `✓ built` y al menos 1 en cada archivo.

- [ ] **Step 4: Commit**

```bash
git add vscode/src/site/reservar/PasoDatos.tsx vscode/src/site/reservar/PasoDatos.css vscode/src/site/reservar/ResumenVisita.tsx vscode/src/site/reservar/ResumenVisita.css
git commit -m "feat(reservar): tus datos, resumen fijo en computadora y barra abajo en celular"
```

---

### Task 9: Confirmación con el depósito

**Files:**
- Create: `vscode/src/site/reservar/Confirmacion.tsx`
- Create: `vscode/src/site/reservar/Confirmacion.css`

**Interfaces:**
- Consumes:
  - `Confirmada` (Task 5);
  - `lineasResumen`, `fechaTitulo` y `rangoHoras` (Task 4);
  - `nombreVisible` (Task 3);
  - `formatoRD`;
  - `BankAccount` de `../../store/settingsStore`.
- Produces: `export default function Confirmacion(props: ConfirmacionProps)`, con
  `ConfirmacionProps = { cita: Confirmada; deposito: number; cuentas: BankAccount[]; whatsapp: string; mensaje: string; onOtra: () => void }`.

- [ ] **Step 1: Componente**

`vscode/src/site/reservar/Confirmacion.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BankAccount } from '../../store/settingsStore';
import { formatoRD } from '../landing/catalogo';
import { fechaTitulo, lineasResumen, rangoHoras } from './resumen';
import { nombreVisible } from './servicios';
import type { Confirmada } from './useBooking';
import './Confirmacion.css';

export interface ConfirmacionProps {
  cita: Confirmada;
  deposito: number;
  cuentas: BankAccount[];
  /** número de WhatsApp del salón (settings) */
  whatsapp: string;
  mensaje: string;
  onOtra: () => void;
}

/** ¡Tu cita está pre-reservada! Boleta, depósito con "Copiar" y los tres pasos que siguen (spec §6.2). */
export default function Confirmacion({ cita, deposito, cuentas, whatsapp, mensaje, onOtra }: ConfirmacionProps) {
  const titulo = useRef<HTMLHeadingElement>(null);
  const [copiada, setCopiada] = useState<number | null>(null);
  const lineas = lineasResumen([], [], cita.hora, cita.plan);

  // quien usa lector de pantalla llega directo a la noticia
  useEffect(() => { titulo.current?.focus(); }, []);

  const copiar = (texto: string, i: number) => {
    navigator.clipboard?.writeText(texto).catch(() => {});
    setCopiada(i);
    window.setTimeout(() => setCopiada((c) => (c === i ? null : c)), 2000);
  };

  return (
    <div className="s-wrap s-conf">
      <div className="s-okmark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></div>
      <p className="s-eyebrow">Solicitud recibida</p>
      <h1 className="s-display s-conf-t" tabIndex={-1} ref={titulo}>¡Tu cita está <em>pre-reservada</em>!</h1>
      <p className="s-conf-p">Guardamos tu espacio. Para confirmarlo, haz el depósito y envíanos el comprobante.</p>

      <section className="s-ticket" aria-label="Tu cita">
        <div className="s-tk-h">
          <b>{fechaTitulo(cita.fecha)}</b>
          <span className="s-estado"><i aria-hidden="true" />Pendiente de depósito</span>
        </div>
        <dl className="s-tk-b">
          <div><dt>Hora</dt><dd>{rangoHoras(cita.hora, cita.duracionTotal)}</dd></div>
          <div><dt>A nombre de</dt><dd>{cita.nombre}</dd></div>
          <div className="is-full">
            <dt>{lineas.length > 1 ? 'Servicios' : 'Servicio'}</dt>
            <dd>{lineas.map((l, i) => <span key={i}>{l.hora} · {nombreVisible(l.nombre)} · {l.quien}</span>)}</dd>
          </div>
        </dl>
      </section>

      <section className="s-banco" aria-labelledby="s-banco-t">
        <div className="s-banco-h">
          <h2 id="s-banco-t" className="s-eyebrow">Deposita para confirmar</h2>
          <b>{formatoRD(deposito)}</b>
        </div>
        {cuentas.map((c, i) => (
          <div key={`${c.account_number}-${i}`} className="s-cuenta">
            <div><span>Banco</span>{c.bank_name}</div>
            <div>
              <span>Cuenta</span>
              <span className="s-copiar">
                {c.account_number}
                <button type="button" onClick={() => copiar(c.account_number, i)}
                  aria-label={`Copiar el número de cuenta ${c.account_number}`}>
                  {copiada === i ? 'Copiado' : 'Copiar'}
                </button>
              </span>
            </div>
            <div><span>A nombre de</span>{c.account_name}</div>
          </div>
        ))}
        <p className="s-sr" aria-live="polite">{copiada !== null ? 'Número de cuenta copiado' : ''}</p>
      </section>

      <ol className="s-next3">
        <li><b>1</b>Haz el depósito o transferencia por {formatoRD(deposito)}.</li>
        <li><b>2</b>Envía el comprobante por WhatsApp.</li>
        <li><b>3</b>Recepción confirma y te llega el aviso.</li>
      </ol>

      <div className="s-conf-btns">
        <a className="s-btn s-btn-solid" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`}
          target="_blank" rel="noopener noreferrer">Enviar comprobante por WhatsApp</a>
        <Link className="s-btn s-btn-line" to="/mis-citas">Ver mis citas</Link>
      </div>
      <button type="button" className="s-conf-otra" onClick={onOtra}>Hacer otra reserva</button>
    </div>
  );
}
```

- [ ] **Step 2: Estilos**

`vscode/src/site/reservar/Confirmacion.css`:
```css
/* Confirmación de /reservar (boceto citas-v2, "Confirmación"). Celular primero. */
.s-conf{ max-width:760px; padding-top:34px; padding-bottom:80px; text-align:center }
.s-okmark{ position:relative; display:grid; place-items:center; width:92px; height:136px; margin:0 auto 26px; border-radius:999px; border:1.5px solid var(--s-accent) }
.s-okmark::after{ content:""; position:absolute; inset:7px; border-radius:999px; border:1px solid var(--s-line) }
.s-okmark svg{ width:40px; height:40px; fill:none; stroke:var(--s-accent); stroke-width:2; stroke-dasharray:40; stroke-dashoffset:40; animation:s-trazo .9s .3s forwards }
@keyframes s-trazo{ to{ stroke-dashoffset:0 } }
.s-conf > .s-eyebrow{ margin:0 0 14px }
.s-conf-t{ margin:0 0 12px; font-size:32px }
.s-conf-t:focus{ outline:none }
.s-conf-p{ max-width:34em; margin:0 auto 34px; font-size:16px; font-weight:300; line-height:1.6; color:var(--s-soft) }

.s-ticket{ margin-bottom:22px; border-radius:26px; overflow:hidden; background:var(--s-surface); border:1px solid var(--s-surface-line); text-align:left }
.s-tk-h{ display:flex; flex-direction:column; align-items:flex-start; gap:10px; padding:18px 24px; border-bottom:1px dashed var(--s-line) }
.s-tk-h b{ font:400 22px/1.2 var(--s-f-display) }
.s-estado{ display:inline-flex; align-items:center; gap:7px; padding:6px 12px; border-radius:999px; border:1px solid currentColor; font-size:12px; font-weight:500; color:var(--s-warn) }
.s-estado i{ width:7px; height:7px; border-radius:50%; background:currentColor }
.s-tk-b{ display:grid; gap:18px 24px; margin:0; padding:20px 24px }
.s-tk-b dt{ margin:0 0 4px; font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--s-faint) }
.s-tk-b dd{ margin:0; font-size:15px; font-weight:500; line-height:1.5; overflow-wrap:anywhere }
.s-tk-b dd span{ display:block }

.s-banco{ margin-bottom:22px; padding:22px 24px; border-radius:26px; border:1px solid var(--s-accent); background:var(--s-surface-2); text-align:left }
.s-banco-h{ display:flex; flex-direction:column; gap:6px; margin-bottom:14px }
.s-banco-h h2{ margin:0 }
.s-banco-h b{ font:400 26px var(--s-f-display); color:var(--s-accent) }
.s-cuenta{ display:grid; grid-template-columns:1fr 1fr; gap:14px; padding:14px 0; border-top:1px solid var(--s-line); font-size:14px; align-items:center; overflow-wrap:anywhere }
.s-cuenta > div:last-child{ grid-column:1 / -1 }
.s-cuenta > div > span:first-child{ display:block; margin-bottom:3px; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--s-faint) }
.s-copiar{ display:inline-flex; align-items:center; flex-wrap:wrap; gap:8px }
.s-copiar button{ min-height:44px; padding:0 12px; border-radius:10px; border:1px solid var(--s-line); background:none; font-size:12.5px; color:var(--s-soft) }

.s-next3{ display:grid; margin:0 0 28px; padding:0; border:1px solid var(--s-line); border-radius:22px; overflow:hidden; list-style:none; text-align:left }
.s-next3 li{ padding:18px 20px; font-size:13.5px; line-height:1.5; color:var(--s-soft) }
.s-next3 li + li{ border-top:1px solid var(--s-line) }
.s-next3 b{ display:block; margin-bottom:6px; font:italic 400 24px var(--s-f-display); color:var(--s-accent) }
.s-conf-btns{ display:flex; flex-direction:column; gap:12px }
.s-conf-btns .s-btn{ white-space:normal; text-align:center }
.s-conf-otra{ min-height:44px; margin-top:12px; padding:0 8px; border:0; background:none; font-size:14px; color:var(--s-soft); text-decoration:underline; text-underline-offset:4px }

@media (min-width: 761px){
  .s-conf{ padding-top:56px; padding-bottom:90px }
  .s-conf-t{ font-size:46px }
  .s-tk-h{ flex-direction:row; justify-content:space-between; align-items:center }
  .s-tk-b{ grid-template-columns:1fr 1fr }
  .s-tk-b .is-full{ grid-column:1 / -1 }
  .s-banco-h{ flex-direction:row; justify-content:space-between; align-items:baseline }
  .s-banco-h b{ font-size:30px }
  .s-cuenta{ grid-template-columns:1fr 1.3fr 1.2fr }
  .s-cuenta > div:last-child{ grid-column:auto }
  .s-next3{ grid-template-columns:repeat(3, 1fr) }
  .s-next3 li + li{ border-top:0; border-left:1px solid var(--s-line) }
  .s-conf-btns{ flex-direction:row; flex-wrap:wrap; justify-content:center }
}
```

- [ ] **Step 3: Compilación**

```bash
cd vscode
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site"
npm run build
grep -c "¡\|·" src/site/reservar/Confirmacion.tsx
```
Expected: `0`, `✓ built` y al menos 2.

- [ ] **Step 4: Commit**

```bash
git add vscode/src/site/reservar/Confirmacion.tsx vscode/src/site/reservar/Confirmacion.css
git commit -m "feat(reservar): confirmación con boleta, depósito y copiar la cuenta"
```

---

### Task 10: La página `/reservar` nueva

**Files:**
- Create: `vscode/src/site/reservar/Reservar.tsx`
- Create: `vscode/src/site/reservar/Reservar.css`
- Create: `vscode/src/site/header/usePresencia.ts`
- Modify: `vscode/src/pages/BookingPage.tsx` (CRLF)
- Modify: `vscode/src/site/SiteLayout.css`: el WhatsApp en computadora

**Interfaces:**
- Consumes: todo lo anterior, más `seccionesPresentes` (`../header/secciones`) y `testimonios`
  (`../../config/testimonios`).
- Produces:
  - `export default function Reservar()`;
  - `export function useSeccionesPresentes(): string[]` (también lo usará `/mis-citas` en la Fase 6).

- [ ] **Step 1: Las secciones del menú fuera de la página principal**

`vscode/src/site/header/usePresencia.ts`:
```ts
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { testimonios } from '../../config/testimonios';
import { seccionesPresentes } from './secciones';

/** En las páginas que no son la principal (reservar, mis citas), el menú ofrece las mismas secciones que la
 *  principal tiene de verdad. Mientras no se sabe, o si falla la red, solo las fijas. */
export function useSeccionesPresentes(): string[] {
  const [hay, setHay] = useState({ paquetes: false, equipo: false });
  useEffect(() => {
    let vivo = true;
    Promise.all([
      supabase.from('session_packages').select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from('staff').select('id', { count: 'exact', head: true }).eq('mostrar_en_web', true).eq('active', true),
    ]).then(([paq, eq]) => {
      if (!vivo) return;
      setHay({ paquetes: (paq.count ?? 0) > 0, equipo: (eq.count ?? 0) > 0 });
    });
    return () => { vivo = false; };
  }, []);
  return seccionesPresentes({ ...hay, opiniones: testimonios.length > 0 });
}
```

- [ ] **Step 2: La página**

`vscode/src/site/reservar/Reservar.tsx`:
```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { site } from '../../config/site';
import { servicesMenu } from '../../data/servicesMenu';
import { isoLocal } from './calendario';
import { validarDatos, type ErroresDatos } from './datos';
import { lineasResumen, textoBarra } from './resumen';
import { nombreVisible, serviciosParaReservar } from './servicios';
import { useBooking } from './useBooking';
import PasoServicios from './PasoServicios';
import PasoCuando from './PasoCuando';
import PasoDatos from './PasoDatos';
import { BarraReserva, ResumenVisita } from './ResumenVisita';
import Confirmacion from './Confirmacion';
import './Reservar.css';

const PASOS = ['Servicios', 'Día y hora', 'Tus datos'];

const suave = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
/** Lleva a un paso; las secciones ya dejan su margen bajo la barra (scroll-margin-top de .s-main section). */
const irA = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: suave(), block: 'start' });

/** /reservar en tres pasos en una sola página (spec §6.1), y la confirmación (spec §6.2). */
export default function Reservar() {
  const b = useBooking();
  const [params] = useSearchParams();
  const hoy = useMemo(() => isoLocal(new Date()), []);
  const servicios = useMemo(() => serviciosParaReservar(servicesMenu, b.services), [b.services]);
  // ?categoria= que no existe se ignora
  const categoriaInicial = useMemo(() => {
    const c = params.get('categoria');
    return c && servicesMenu.some((x) => x.id === c) ? c : null;
  }, [params]);
  const [errores, setErrores] = useState<ErroresDatos>({});
  const [errorEn, setErrorEn] = useState<'paso2' | 'paso3' | null>(null);
  const paqueteAplicado = useRef(false);
  const { cargando, packages, cambiarTipo, elegirPaquete, confirmada } = b;

  // ?paquete=<id>: "Tengo un paquete" con ese paquete ya elegido, cuando llegan los paquetes. Uno que no existe se ignora.
  useEffect(() => {
    if (cargando || paqueteAplicado.current) return;
    paqueteAplicado.current = true;
    const id = params.get('paquete');
    if (id && packages.some((p) => p.id === id)) {
      cambiarTipo('package');
      elegirPaquete(id);
    }
  }, [cargando, packages, params, cambiarTipo, elegirPaquete]);

  // al pre-reservar se sube arriba; la confirmación lleva el foco a su título
  useEffect(() => {
    if (confirmada) window.scrollTo({ top: 0, behavior: 'auto' });
  }, [confirmada]);

  const paso1 = b.elegidos.length > 0;
  const paso2 = paso1 && b.planElegido !== null;
  const lineas = lineasResumen(b.elegidos, b.staffList, paso2 ? b.form.time : null, b.planElegido)
    .map((l) => ({ ...l, nombre: nombreVisible(l.nombre) }));
  const barra = textoBarra(b.elegidos.length, b.form.date || null, paso2 ? b.form.time : null);
  const deposito = b.settings.deposit_amount ?? 500;

  const cambiarDato = (campo: 'name' | 'phone' | 'notes', valor: string) => {
    b.setForm((f) => ({ ...f, [campo]: valor }));
    if (campo === 'name' && errores.nombre) setErrores((e) => ({ ...e, nombre: undefined }));
    if (campo === 'phone' && errores.telefono) setErrores((e) => ({ ...e, telefono: undefined }));
  };

  const elegirHora = (hora: string) => {
    b.elegirHora(hora);
    if (errorEn === 'paso2') {
      setErrorEn(null);
      b.setBookingError('');
    }
  };

  const solicitar = async () => {
    if (!paso1) { irA('r-paso-1'); return; }
    if (!paso2) { irA('r-paso-2'); return; }
    const e = validarDatos(b.form.name, b.form.phone);
    setErrores(e);
    if (e.nombre || e.telefono) {
      irA('r-paso-3');
      document.getElementById(e.nombre ? 'r-nombre' : 'r-telefono')?.focus({ preventScroll: true });
      return;
    }
    const r = await b.submit();
    if (r === 'ocupado') {
      setErrorEn('paso2');
      irA('r-paso-2');
    } else if (r === 'error') {
      setErrorEn('paso3');
      irA('r-paso-3');
    }
  };

  if (confirmada) {
    return (
      <Confirmacion
        cita={confirmada}
        deposito={deposito}
        cuentas={b.settings.bank_accounts}
        whatsapp={b.settings.whatsapp_number || '18293224014'}
        mensaje={b.whatsappMsg}
        onOtra={() => {
          b.reset();
          setErrores({});
          setErrorEn(null);
          window.scrollTo({ top: 0, behavior: 'auto' });
        }}
      />
    );
  }

  const ahora = paso2 ? 2 : paso1 ? 1 : 0;
  const hechos = [paso1, paso2, false];

  return (
    <div className="s-r">
      <header className="s-r-head">
        <div className="s-wrap">
          <p className="s-eyebrow">Reserva en línea</p>
          <h1 className="s-display s-r-titulo">Agenda tu <em>cita</em></h1>
          <p className="s-r-intro">Elige tus servicios, con quién y la hora que te quede mejor. Los horarios salen de la agenda real de cada especialista.</p>
          <ol className="s-pasos" aria-label="Pasos de la reserva">
            {PASOS.map((t, i) => (
              <li key={t} className={`s-pasos-i ${hechos[i] ? 'is-hecho' : ''} ${ahora === i ? 'is-ahora' : ''}`}
                aria-current={ahora === i ? 'step' : undefined}>
                <b aria-hidden="true">{hechos[i] ? '✓' : i + 1}</b>{t}
                {hechos[i] && <span className="s-sr"> (listo)</span>}
              </li>
            ))}
          </ol>
        </div>
      </header>

      <div className="s-wrap s-r-grid">
        <div>
          <section id="r-paso-1" className="s-r-paso" aria-labelledby="r-paso-1-t">
            <div className="s-r-paso-t">
              <span className="s-r-n" aria-hidden="true">01</span>
              <h2 id="r-paso-1-t" className="s-display">¿Qué te vas a hacer?</h2>
              <small>Puedes elegir varios</small>
            </div>
            <PasoServicios
              tipo={b.bookingType}
              onTipo={b.cambiarTipo}
              servicios={servicios}
              staff={b.staffList}
              picks={b.picks.filter((x) => x.serviceId)}
              onAlternar={b.alternarServicio}
              onEspecialista={b.elegirEspecialista}
              paquetes={b.packages}
              paqueteId={b.form.packageId}
              onPaquete={b.elegirPaquete}
              especialistaPaquete={b.picks[0]?.staffId ?? ''}
              onEspecialistaPaquete={b.elegirEspecialistaPaquete}
              categoriaInicial={categoriaInicial}
              cargando={b.cargando}
            />
          </section>

          <section id="r-paso-2" className={`s-r-paso ${paso1 ? '' : 'is-bloqueado'}`} aria-labelledby="r-paso-2-t" inert={!paso1}>
            <div className="s-r-paso-t">
              <span className="s-r-n" aria-hidden="true">02</span>
              <h2 id="r-paso-2-t" className="s-display">¿Cuándo?</h2>
              <small>{site.hours}</small>
            </div>
            {errorEn === 'paso2' && b.bookingError && <p className="s-r-alerta" role="alert">{b.bookingError}</p>}
            <PasoCuando
              hoy={hoy}
              fecha={b.form.date}
              onFecha={b.elegirFecha}
              horarios={b.horarios}
              hora={b.form.time}
              onHora={elegirHora}
              cargando={b.loadingSlots}
              sinHuecos={b.isDayOff}
              variosServicios={b.elegidos.length > 1}
            />
          </section>

          <section id="r-paso-3" className={`s-r-paso ${paso2 ? '' : 'is-bloqueado'}`} aria-labelledby="r-paso-3-t" inert={!paso2}>
            <div className="s-r-paso-t">
              <span className="s-r-n" aria-hidden="true">03</span>
              <h2 id="r-paso-3-t" className="s-display">Tus datos</h2>
            </div>
            {errorEn === 'paso3' && b.bookingError && <p className="s-r-alerta" role="alert">{b.bookingError}</p>}
            <PasoDatos nombre={b.form.name} telefono={b.form.phone} notas={b.form.notes} errores={errores} onCambio={cambiarDato} />
          </section>
        </div>

        <ResumenVisita
          lineas={lineas}
          fecha={b.form.date}
          duracionTotal={b.duracionTotal}
          deposito={deposito}
          listo={paso2}
          enviando={b.sending}
          onSolicitar={solicitar}
        />
      </div>

      <BarraReserva
        titulo={barra.titulo}
        detalle={barra.detalle}
        accion={b.sending ? 'Enviando…' : paso2 ? 'Solicitar cita' : 'Continuar'}
        deshabilitada={b.sending}
        onAccion={solicitar}
      />
    </div>
  );
}
```

- [ ] **Step 3: Estilos de la página**

`vscode/src/site/reservar/Reservar.css`:
```css
/* /reservar (boceto citas-v2): cabecera con listones, pasos en tarjetas y resumen. Celular primero. */
.s-r{ position:relative }
.s-r-head{ padding:34px 0 28px; background:var(--s-tex); border-bottom:1px solid var(--s-line) }
.s-r-head .s-eyebrow{ margin:0 0 16px }
.s-r-titulo{ margin:0 0 14px; font-size:36px }
.s-r-intro{ max-width:36em; margin:0; font-size:15px; font-weight:300; line-height:1.65; color:var(--s-soft) }
.s-pasos{ display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:6px; margin:20px 0 0; padding:0; list-style:none }
.s-pasos-i{ display:flex; align-items:center; justify-content:center; gap:6px; min-width:0; padding:5px 6px; border-radius:999px; border:1px solid var(--s-line); font-size:12px; color:var(--s-soft); white-space:nowrap }
.s-pasos-i b{ display:grid; place-items:center; width:22px; height:22px; flex-shrink:0; border-radius:50%; border:1px solid var(--s-line); font:500 11px var(--s-f-body) }
.s-pasos-i.is-hecho{ color:var(--s-text) }
.s-pasos-i.is-hecho b{ background:var(--s-btn-bg); color:var(--s-btn-fg); border-color:transparent }
.s-pasos-i.is-ahora{ color:var(--s-text); border-color:var(--s-accent) }

.s-r-grid{ padding-top:22px; padding-bottom:24px }
.s-r-paso{ margin-bottom:14px; padding:22px 18px; border-radius:20px; background:var(--s-surface); border:1px solid var(--s-surface-line); transition:opacity .4s }
.s-r-paso.is-bloqueado{ opacity:.45 }
.s-r-paso-t{ display:flex; align-items:center; gap:10px; margin-bottom:16px }
.s-r-n{ font:italic 400 24px/1 var(--s-f-display); color:var(--s-accent) }
.s-r-paso-t h2{ min-width:0; font-size:22px }
.s-r-paso-t small{ display:none; margin-left:auto; font-size:12.5px; color:var(--s-faint); text-align:right }
.s-r-alerta{ margin:0 0 16px; padding:12px 14px; border-radius:14px; border:1px solid var(--s-bad); background:var(--s-surface-2); font-size:14px; line-height:1.5 }
.s-hint{ margin:10px 0 0; font-size:12.5px; line-height:1.5; color:var(--s-faint) }
@keyframes s-r-entra{ from{ opacity:0; transform:translateY(8px) } to{ opacity:1; transform:none } }

@media (min-width: 761px){
  .s-r-head{ padding:56px 0 46px }
  .s-r-titulo{ font-size:46px }
  .s-r-intro{ font-size:16.5px }
  .s-pasos{ display:flex; flex-wrap:wrap; gap:10px; margin-top:30px }
  .s-pasos-i{ gap:10px; padding:8px 16px 8px 8px; font-size:13.5px }
  .s-pasos-i b{ width:26px; height:26px; font-size:12px }
  .s-r-grid{ padding-top:30px; padding-bottom:30px }
  .s-r-paso{ margin-bottom:22px; padding:28px 30px; border-radius:24px }
  .s-r-paso-t{ gap:14px; margin-bottom:20px }
  .s-r-n{ font-size:30px }
  .s-r-paso-t h2{ font-size:26px }
  .s-r-paso-t small{ display:block }
}
@media (min-width: 1101px){
  .s-r-titulo{ font-size:54px }
  .s-r-grid{ display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:40px; align-items:start; padding-top:44px; padding-bottom:90px }
}
```

- [ ] **Step 4: El WhatsApp en computadora.** En `vscode/src/site/SiteLayout.css`, después de la línea con
  `@media (min-width: 761px){ .s-wa{ ... } .s-wa.is-elevado{ bottom:96px } }`, agrega:
```css
/* en computadora /reservar no tiene barra abajo: el WhatsApp vuelve a su lugar */
@media (min-width: 1101px){ .s-wa.is-elevado{ bottom:20px } }
```

- [ ] **Step 5: `BookingPage` con la página nueva.** `vscode/src/pages/BookingPage.tsx` queda así, con CRLF:
```tsx
import { useEffect } from 'react';
import SiteLayout from '../site/SiteLayout';
import Reservar from '../site/reservar/Reservar';
import { useSeccionesPresentes } from '../site/header/usePresencia';

/** /reservar con la cara nueva (spec §6.1). El diseño anterior sigue en /diseno-anterior/reservar. */
export default function BookingPage() {
  const secciones = useSeccionesPresentes();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <SiteLayout secciones={secciones} whatsappElevado>
      <Reservar />
    </SiteLayout>
  );
}
```

- [ ] **Step 6: Tipos, pruebas, compilación y caracteres**

```bash
cd vscode
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -E "src/site/|BookingPage|src/App"
npm test
npm run build
file src/pages/BookingPage.tsx
grep -c "¿\|…\|✓" src/site/reservar/Reservar.tsx
```
Expected:
- 39 errores y ninguna línea en el segundo `grep`;
- 96 pruebas pasan;
- `✓ built`;
- CRLF en `BookingPage.tsx`;
- al menos 3 en el último `grep`.

- [ ] **Step 7: Commit**

```bash
git add vscode/src/site/reservar/Reservar.tsx vscode/src/site/reservar/Reservar.css vscode/src/site/header/usePresencia.ts vscode/src/site/SiteLayout.css vscode/src/pages/BookingPage.tsx
git commit -m "feat(reservar): la página nueva en tres pasos con resumen, barra y confirmación"
```

---

### Task 11: Enlaces desde la página principal

**Files:**
- Modify: `vscode/src/site/landing/Catalog.tsx`, los dos `to="/reservar"`
- Modify: `vscode/src/site/landing/PaquetesMenu.tsx`, `PaquetesMembresia.tsx` y `PaquetesAhorro.tsx`, el
  `to="/reservar"` de cada tarjeta

**Interfaces:**
- Consumes: los `?categoria=` y `?paquete=` que lee `Reservar` (Task 10).

- [ ] **Step 1: Catálogo.** En `Catalog.tsx`:
  - el `Link` del panel de computadora (el que está junto a `{plural(actual.total)} · puedes combinar varios…`)
    pasa a ser `to={`/reservar?categoria=${actual.id}`}`;
  - el `Link` del acordeón de celular (dentro de `.s-acc-in`) pasa a ser `to={`/reservar?categoria=${c.id}`}`.
- [ ] **Step 2: Paquetes.** En los tres archivos, el `Link` de cada tarjeta (dentro de `paquetes.map((p, i) => …)`)
  pasa a ser `to={`/reservar?paquete=${p.id}`}`.
- [ ] **Step 3: Comprobación**

```bash
cd vscode
grep -n "to=\"/reservar\"" src/site/landing/Catalog.tsx src/site/landing/Paquetes*.tsx
grep -c "reservar?categoria=\|reservar?paquete=" src/site/landing/Catalog.tsx src/site/landing/Paquetes*.tsx
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site"
npm run build
```
Expected:
- el primer `grep` no imprime nada;
- el segundo cuenta 2 en `Catalog.tsx` y 1 en cada archivo de paquetes;
- `0`;
- `✓ built`.

Los "Agendar cita" de la portada, la llamada final y el menú siguen yendo a `/reservar` sin nada más.

- [ ] **Step 4: Commit**

```bash
git add vscode/src/site/landing/Catalog.tsx vscode/src/site/landing/PaquetesMenu.tsx vscode/src/site/landing/PaquetesMembresia.tsx vscode/src/site/landing/PaquetesAhorro.tsx
git commit -m "feat(sitio): reservar desde una especialidad o un paquete abre /reservar con eso elegido"
```

---

### Task 12: Revisión en el navegador y los 6 casos de la spec §10 (la hace el controlador)

Se prueba con el servidor `sitio-rediseno` (`.claude/launch.json`, puerto 5181), que usa la única base. Las citas
de prueba van a nombre de **"Prueba Claude"**, con el teléfono **809-000-0000**, y se borran al final. Si las
notificaciones del panel avisan de una cita web, ese aviso también es de prueba.

- [ ] **Step 1: Revisión visual** de `/reservar` en 360, 390, 430, 820, 1180, 1280 y 1440, en los dos temas:
  - la cabecera y el indicador de pasos caben en 360;
  - los pasos 2 y 3 se ven apagados hasta que les toca, y no se pueden alcanzar con Tab;
  - el paso 1 muestra el buscador (probar "laser" y "cejas"), las familias, las tarjetas de lo elegido con
    "Cualquiera" y las iniciales, y "Tengo un paquete" con sus óvalos;
  - el paso 2 muestra la semana, las flechas (la de atrás apagada en la semana actual), "Ver mes", el mes que
    vuelve a la semana al elegir un día, los domingos "Cerrado", las horas en Mañana y Tarde, y las ocupadas
    tachadas;
  - el resumen en PC: al elegir 4 servicios o más no pasa del alto de la ventana y el botón sigue a la vista;
  - la barra en tableta y celular: recorta su texto con "…" y el WhatsApp queda arriba de ella;
  - nada se sale de la pantalla en ningún ancho (`document.documentElement.scrollWidth === innerWidth`);
  - `/diseno-anterior/reservar` abre la reserva vieja y funciona igual que antes;
  - en el menú de `/reservar`, "Equipo" y "Paquetes" aparecen solo si la página principal los tiene.
- [ ] **Step 2: Enlaces.**
  - Desde el catálogo de la página principal, "Reservar" de Depilación láser abre el paso 1 filtrado ("Mostrando
    Depilación láser · Ver todos").
  - Desde un paquete, abre "Tengo un paquete" con ese paquete elegido.
  - `/reservar?paquete=no-existe` y `/reservar?categoria=no-existe` abren la página normal.
- [ ] **Step 3: Los 6 casos** (spec §10):
  1. **Un servicio suelto:** reservar y llegar a la confirmación. En la base queda una cita `pending` con `source`
     `web`.
  2. **Varios servicios con dos especialistas:** por ejemplo, láser (Carmen) y cera (Paola). El resumen muestra las
     horas encadenadas y a las dos. En `appointment_services` quedan dos filas con especialistas distintas.
  3. **Un paquete:** reservar por `/reservar?paquete=<id>`. El `service_id` de la cita es el del paquete.
  4. **Un día bloqueado:** poner un bloqueo de todo el salón para un día de prueba y ver "No hay horarios libres
     para esta fecha. Prueba otro día.":
```sql
insert into schedule_blocks (staff_id, start_date, end_date, start_time, end_time, reason)
values (null, '<día de prueba>', '<día de prueba>', null, null, 'Prueba Claude');
```
  5. **Una hora que se ocupa en el último momento:** abrir dos pestañas con la misma visita, día y hora. Solicitar
     en la primera y después en la segunda. La segunda muestra "Ese horario se acaba de ocupar…" en el paso 2, la
     hora queda tachada y no se guarda nada.
  6. **Confirmación con depósito:**
     - el monto y las cuentas salen de Configuración;
     - "Copiar" cambia a "Copiado";
     - el enlace de WhatsApp lleva el mensaje de siempre (se lee su `href`, no se toca);
     - "Ver mis citas" va a `/mis-citas`;
     - "Hacer otra reserva" vuelve al paso 1 vacío.
  - Además, tocar varios días seguidos rápido: las horas que quedan son las del último día tocado.
- [ ] **Step 4: Dejar la base como estaba:**
```sql
delete from appointment_services where appointment_id in (select id from appointments where client_name = 'Prueba Claude');
delete from appointments where client_name = 'Prueba Claude';
delete from schedule_blocks where reason = 'Prueba Claude';
select (select count(*) from appointments where client_name = 'Prueba Claude') as citas,
       (select count(*) from schedule_blocks where reason = 'Prueba Claude') as bloqueos;  -- 0 y 0
```
  Si `save_appointment` o algún disparador creó un cliente "Prueba Claude" en `clients`, se borra también.
- [ ] **Step 5: Louis prueba en su teléfono y su iPad**, con `vite --host` en su WiFi: una reserva completa y "Ver
  mes". Sus citas de prueba se borran igual.
- [ ] **Step 6:** Abre el PR "Rediseño fase 5: /reservar en tres pasos", contra `main` cuando el PR de la Fase 4
  esté fusionado.

## Al terminar la Fase 5

Sigue la **Fase 6**, `/mis-citas` nueva, con:
- `get_client_packages(p_phone)`, con `SECURITY DEFINER` y `search_path` fijo, ejecutable por anon (spec §7);
- "Mis paquetes", con "Reservar mi próxima sesión" apuntando a `/reservar?paquete=<id>`, que ya funciona;
- `useSeccionesPresentes` para su menú;
- las variables `--s-ok`, `--s-warn` y `--s-bad` para los estados. `--s-warn` y `--s-bad` ya existen.
