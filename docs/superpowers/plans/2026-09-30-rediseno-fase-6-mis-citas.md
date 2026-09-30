# Rediseño · Fase 6: `/mis-citas` nueva con "Mis paquetes" — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/mis-citas` pasa a tener la cara nueva:
- búsqueda por teléfono, con "Recordar mi número";
- un saludo con el resumen;
- próximas citas con la fecha en óvalo, cada servicio con su hora y su especialista, "Cómo llegar" y "Cancelar" (la regla de 12 h);
- el historial;
- la sección nueva "Mis paquetes", con las sesiones en ovalitos y "Reservar mi próxima sesión".

**Architecture:**
- **Base de datos:** dos funciones nuevas, solo de lectura y ejecutables por anon.
  - `get_client_packages` es la que pide la spec §7.
  - `get_client_appointment_services` es necesaria porque `get_client_appointments` trae un solo servicio por cita, y la spec §6.3 pide cada servicio con su hora y su especialista.
- **Lógica pura y probada:** cómo se reparten las citas entre próximas e historial, qué se puede cancelar, los estados, los textos y los paquetes viven en `src/site/portal/portal.ts`.
- **Hook y piezas:** `usePortal` busca y cancela. La interfaz se arma con `CitaProxima`, `MisPaquetes` y `MisCitas`.
- **Diseño anterior:** el `/mis-citas` viejo se mueve a `src/legacy/` y queda en `/diseno-anterior/mis-citas`, igual que se hizo con la reserva.

**Tech Stack:** React 19 + TypeScript + Vite 7, react-router-dom 7, Supabase JS, CSS plano por componente y
`node --test` (`npm test`).

**Spec:** `docs/superpowers/specs/2026-09-27-rediseno-web-clienta-design.md`, en estas secciones:
- §6.3 `/mis-citas`;
- §7 `get_client_packages`;
- §8 arquitectura y diseño anterior;
- §3 sistema visual.

**Boceto aprobado:** `C:/Users/loui-/Desktop/ANABEL/bocetos-rediseno/citas-v2.html`, página "/mis-citas":
- CSS en las líneas 249–284, más los cortes en 337–343 y 378–383;
- HTML en 532–584.

**Base que dejaron las fases anteriores** (rama `claude/rediseno-fase-5-reservar`, PR #11, montada sobre la Fase 4):
- **Lo que se reemplaza:**
  - `src/pages/ClientPortal.tsx` (CRLF) usa `legacy/Navbar`, `components/MyAppointments` y `legacy/Footer`;
  - `src/components/MyAppointments.tsx` (CRLF, 384 líneas) llama a `get_client_appointments` y a `cancel_client_appointment`, usa `react-hot-toast` y un modal propio.
- **Lo que se reutiliza de las fases anteriores:**
  - `src/site/SiteLayout.tsx`, con `secciones` y `whatsappElevado`, y `src/site/header/usePresencia.ts` (`useSeccionesPresentes()`);
  - de `src/site/reservar/calendario.ts`: `DIAS_CORTOS`, `MESES` y `deIso`;
  - de `src/site/reservar/servicios.ts`: `nombreVisible` (que ya limpia "Paquete: Paquete…");
  - de `src/site/reservar/datos.ts`: `formatoTelefono`;
  - `src/site/ui/SesionesOvalos.tsx`, que dibuja los óvalos vacíos;
  - de `src/config/site.ts`: `site.whatsapp` y `mapsUrl`;
  - de `src/site/theme/tokens.css`: `--s-warn`, `--s-bad`, `--s-surface-2`, `--s-input` y `.s-sr`;
  - de `src/site/reservar/Confirmacion.css`: `.s-estado`, la insignia de estado, que hoy solo tiene el color de aviso.
- **Funciones de la base que ya existen:**
  - `get_client_appointments(p_phone)` compara todos los dígitos (mínimo 7) y devuelve `id, client_name, service, employee, date, time, duration, status, notes, source`;
  - `cancel_client_appointment(p_id, p_phone)` devuelve `true` o `false` con la regla de 12 h en hora de Santo Domingo;
  - `telefono_clave(p)` devuelve los últimos 10 dígitos, o null si hay menos.
- **Tablas:**
  - `client_packages`: `id, client_id, package_id, total_sessions, used_sessions, purchased_at, status` ('active' / 'completed');
  - `appointment_services`: `appointment_id, service_id, service_name, employee, start_time, duration, sort_order, active`.

## Global Constraints

- **Búsqueda (spec §6.3):** por teléfono, con **"Recordar mi número en este teléfono"** (opcional, `localStorage`).
  - La clave es `anadsll-mis-citas-tel`.
  - Si el navegador no deja guardar, la página funciona igual.
- **Saludo (spec §6.3):** el nombre y un resumen de las citas próximas, los paquetes activos y las visitas del historial, por ejemplo "2 citas próximas · 1 paquete activo · 3 visitas en tu historial".
- **Próximas citas (spec §6.3):**
  - la fecha va en un óvalo, con el día, el número y el mes;
  - cada servicio con su hora y su especialista, y el estado (Pendiente / Confirmada);
  - botones "Cómo llegar" y "Cancelar", con la regla de 12 h y la RPC actual `cancel_client_appointment`;
  - si faltan menos de 12 h, un aviso para escribir por WhatsApp.
- **Mis paquetes (spec §6.3):**
  - el nombre, el servicio y la fecha de compra;
  - las sesiones en ovalitos, **llenos los usados**, con "3 de 5 sesiones usadas · te quedan 2";
  - el botón "Reservar mi próxima sesión", que lleva a `/reservar?paquete=<id de session_packages>`.
- **Historial (spec §6.3):** filas compactas con la fecha, el servicio y el estado.
- **`get_client_packages(p_phone text)` (spec §7):**
  - es `SECURITY DEFINER`, con `search_path` fijo, y anon la puede ejecutar;
  - busca a la clienta por teléfono con la misma clave de 10 dígitos de `telefono_clave`;
  - devuelve el id, el nombre del paquete, el servicio, las sesiones totales y usadas, la fecha de compra y el estado;
  - devuelve los paquetes `active` y los `completed` de los últimos 90 días. Estos últimos se muestran como terminados.
- **Diseño anterior (spec §8):** `MyAppointments` se mueve a `src/legacy/` (no se borra) y queda en `/diseno-anterior/mis-citas`, con `noindex`.
- **Cortes:** celular ≤ 760 px, tableta 761–1100 px y computadora > 1100 px. Se escribe de celular hacia arriba, con `@media (min-width: 761px)` y `@media (min-width: 1101px)`.
- **Clases:** prefijo `s-` dentro de `.site`, sin utilidades de Tailwind.
- **Calidad (spec §3.8):**
  - nada se sale de la pantalla y los textos largos bajan de línea;
  - zonas táctiles ≥ 44 px;
  - contraste AA en los dos temas;
  - el campo de teléfono a 16 px;
  - `prefers-reduced-motion` apaga las animaciones (lo hace `tokens.css`).
- **Código:**
  - comentarios y nombres en español;
  - `src/site/portal/portal.ts` se prueba con Node, así que importa con extensión `.ts`;
  - `MyAppointments.tsx`, `ClientPortal.tsx` y `App.tsx` usan **CRLF** y lo conservan; los archivos nuevos van con LF.
- **Caracteres tipográficos:** el editor de algunos agentes cambia “ ” · … — ¿ ✓ → por ASCII sin avisar.
  - Después de escribir cada archivo, se revisa con `git diff`.
  - Si se perdió alguno, se restaura con un script de node y `String.fromCharCode(<código>)`.
- **Líneas base:** `npx tsc -p tsconfig.app.json --noEmit` da **39 errores**, uno de ellos en `src/components/MyAppointments.tsx` (hoy); ninguno en `src/site`. `npm test` da **98**.

## Review Focus

- **Una cita con menos de 12 h:**
  - no ofrece "Cancelar" y muestra el aviso con el enlace a WhatsApp;
  - si la base igual rechaza una cancelación (`false`), la tarjeta explica por qué y ofrece WhatsApp, sin romperse.
  - Lo cubren la Task 2 (`cancelable` y `menosDe12h`) y la Task 5.
- **Una cita de varios servicios:**
  - muestra cada servicio con su hora y su especialista;
  - una cita recién cancelada pasa al historial al momento, con un anuncio para lector de pantalla.
  - Lo cubren la Task 2 y la Task 6.
- **Teléfono incompleto o escrito con espacios o guiones:** se formatea solo. Con menos de 10 dígitos no se busca y el campo explica qué falta. Lo cubren la Task 2 (`telefonoCompleto`) y la Task 6.
- **Una clienta con paquetes pero sin citas:**
  - igual ve el saludo, con su nombre sacado del paquete, y sus paquetes;
  - una clienta sin nada ve el mensaje de "no encontramos" con "Agendar" y WhatsApp.
  - Lo cubren la Task 2 y la Task 6.
- **Sin `localStorage`** (modo privado): "Recordar" no guarda nada, pero la página funciona. Con un número guardado, al abrir busca sola. Lo cubren la Task 4 (try/catch) y la Task 7.

---

### Task 0: Rama de la fase (la hace el controlador)

- [ ] **Step 1:** La Fase 6 parte de la Fase 5, que todavía no está fusionada:
```bash
git switch claude/rediseno-fase-6-mis-citas 2>/dev/null || git switch -c claude/rediseno-fase-6-mis-citas claude/rediseno-fase-5-reservar
```
Su PR apunta a la rama de la Fase 5 mientras esa no esté fusionada. El plan ya está en esta rama.

---

### Task 1: Funciones de la base (la hace el controlador con el MCP de Supabase)

**Files:**
- Create: `vscode/supabase/migration_portal_paquetes.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- Mis citas (spec §6.3 y §7). Dos funciones solo de lectura, ejecutables por anon, que buscan por teléfono
-- como las que ya existen.

-- Paquetes de la clienta: los activos y los terminados de los últimos 90 días (su última sesión completada,
-- o la compra si no hay sesiones). Busca con la clave de 10 dígitos de telefono_clave.
create or replace function public.get_client_packages(p_phone text)
returns table(
  id uuid, paquete_id uuid, paquete text, servicio text, sesiones integer, usadas integer,
  comprado date, estado text, paquete_activo boolean, cliente text
)
language sql stable security definer set search_path = public
as $$
  select cp.id, cp.package_id, sp.name, s.name, cp.total_sessions, cp.used_sessions,
         cp.purchased_at::date, cp.status, sp.active, c.name
  from public.client_packages cp
  join public.clients c on c.id = cp.client_id
  left join public.session_packages sp on sp.id = cp.package_id
  left join public.services s on s.id = sp.service_id
  where public.telefono_clave(p_phone) is not null
    and public.telefono_clave(c.phone) = public.telefono_clave(p_phone)
    and (
      cp.status = 'active'
      or (cp.status = 'completed' and coalesce(
            (select max(a.date)
               from public.appointments a
               join public.appointment_services x on x.appointment_id = a.id
              where a.client_id = cp.client_id and x.service_id = sp.service_id and a.status = 'completed'),
            cp.purchased_at::date) >= current_date - 90)
    )
  order by (cp.status = 'active') desc, cp.purchased_at desc
$$;

-- Servicios de cada cita, con su hora y su especialista. get_client_appointments trae uno solo por cita.
-- Busca igual que get_client_appointments (todos los dígitos, mínimo 7), así las dos listas coinciden.
create or replace function public.get_client_appointment_services(p_phone text)
returns table(appointment_id uuid, servicio text, especialista text, hora time, duracion integer, orden integer)
language sql stable security definer set search_path = public
as $$
  select x.appointment_id, x.service_name, x.employee, x.start_time, x.duration, x.sort_order
  from public.appointment_services x
  join public.appointments a on a.id = x.appointment_id
  where length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 7
    and regexp_replace(a.client_phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
  order by x.appointment_id, x.sort_order
$$;

revoke all on function public.get_client_packages(text) from public;
revoke all on function public.get_client_appointment_services(text) from public;
grant execute on function public.get_client_packages(text) to anon, authenticated;
grant execute on function public.get_client_appointment_services(text) to anon, authenticated;
```

- [ ] **Step 2: Aplicarla** con `apply_migration`, con el nombre `portal_paquetes` y ese SQL.

- [ ] **Step 3: Verificar**

```sql
begin; set local role anon;
select paquete, servicio, sesiones, usadas, comprado, estado, cliente from public.get_client_packages('809-555-0101');
rollback;
```
Expected: una fila, "Paquete Facial Profunda x5", 5 y 5, 'active', con la cliente "María Altagracia Gómez".

```sql
begin; set local role anon;
select count(*) from public.get_client_packages('123');                 -- 0: menos de 10 dígitos
select count(*) from public.get_client_appointment_services('809-555-0101');  -- ≥ 1
rollback;
```

- [ ] **Step 4: Commit**

```bash
git add vscode/supabase/migration_portal_paquetes.sql
git commit -m "feat(base): paquetes de la clienta y servicios de sus citas para Mis citas"
```

---

### Task 2: Lógica de Mis citas (próximas, historial, estados y paquetes)

**Files:**
- Create: `vscode/src/site/portal/portal.ts`
- Test: `vscode/tests/portal.test.ts`

**Interfaces:**
- Consumes:
  - `format12h` de `../../lib/timeFormat.ts`;
  - `DIAS_CORTOS`, `MESES` y `deIso` de `../reservar/calendario.ts`;
  - `nombreVisible` de `../reservar/servicios.ts`.
- Produces:
  - Tipos de las filas y de los tonos:
    - `FilaCita`, `FilaServicioCita` y `FilaPaqueteCliente`, las filas de las tres RPC;
    - `type Tono = 'warn' | 'ok' | 'bad' | 'mute'`.
  - Estado y tiempo:
    - `estadoCita(status): { texto; tono }`;
    - `horasHasta(fecha, hora, ahora: Date): number`;
    - `fechaCorta(iso): string`.
  - Citas:
    - `interface LineaCita { hora; nombre; quien }`;
    - `interface CitaVista { id; fecha; hora; estado; tono; titulo; lineas: LineaCita[]; ovalo: { dia; numero; mes }; fechaCorta; cancelable: boolean; menosDe12h: boolean }`;
    - `vistaCitas(citas, servicios, ahora): { proximas: CitaVista[]; historial: CitaVista[] }`.
  - Paquetes:
    - `interface PaqueteVista { id; nombre; servicio: string | null; desde; total; usadas; quedan; texto; terminado: boolean; reservar: string | null }`;
    - `vistaPaquetes(filas): PaqueteVista[]`.
  - Textos y teléfono:
    - `primerNombre(nombre)`;
    - `textoResumen(proximas, paquetesActivos, historial)`;
    - `telefonoCompleto(tel): boolean`.

- [ ] **Step 1: Escribir las pruebas**

`vscode/tests/portal.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  estadoCita, fechaCorta, horasHasta, primerNombre, telefonoCompleto, textoResumen, vistaCitas, vistaPaquetes,
  type FilaCita, type FilaPaqueteCliente, type FilaServicioCita,
} from '../src/site/portal/portal.ts';

// "ahora" en las pruebas: martes 29 de septiembre de 2026, 10:00 de la mañana (hora del teléfono)
const AHORA = new Date(2026, 8, 29, 10, 0);
const cita = (id: string, date: string, time: string, status: string, service = 'Hidrafacial', employee = 'Dra. Nadieska Soto'): FilaCita => ({
  id, client_name: 'María Altagracia Gómez', service, employee, date, time, duration: 60, status, notes: null, source: 'web',
});
const CITAS: FilaCita[] = [
  cita('A', '2026-10-03', '10:00:00', 'pending', 'Depilación Láser - Axilas', 'Carmen Rodríguez'),
  cita('B', '2026-09-29', '16:00:00', 'confirmed'),
  cita('C', '2026-09-15', '09:00:00', 'completed'),
  cita('D', '2026-10-10', '11:00:00', 'cancelled'),
  cita('E', '2026-09-29', '09:30:00', 'in_progress'),
];
const SERVICIOS: FilaServicioCita[] = [
  { appointment_id: 'A', servicio: 'Depilación Cera - Bozo', especialista: 'Paola Jiménez', hora: '10:15:00', duracion: 10, orden: 1 },
  { appointment_id: 'A', servicio: 'Depilación Láser - Axilas', especialista: 'Carmen Rodríguez', hora: '10:00:00', duracion: 15, orden: 0 },
];
const { proximas, historial } = vistaCitas(CITAS, SERVICIOS, AHORA);
const por = (id: string) => [...proximas, ...historial].find((c) => c.id === id)!;

test('estados: texto y tono', () => {
  assert.deepEqual(estadoCita('pending'), { texto: 'Pendiente', tono: 'warn' });
  assert.deepEqual(estadoCita('confirmed'), { texto: 'Confirmada', tono: 'ok' });
  assert.deepEqual(estadoCita('cancelled'), { texto: 'Cancelada', tono: 'bad' });
  assert.deepEqual(estadoCita('no_show'), { texto: 'No asistió', tono: 'bad' });
  assert.deepEqual(estadoCita('completed'), { texto: 'Completada', tono: 'mute' });
  assert.deepEqual(estadoCita('otro'), { texto: 'otro', tono: 'mute' });
});

test('horas que faltan y fecha corta', () => {
  assert.equal(horasHasta('2026-09-29', '16:00:00', AHORA), 6);
  assert.equal(horasHasta('2026-09-29', '09:30:00', AHORA), -0.5);
  assert.equal(fechaCorta('2026-09-15'), '15 sep');
});

test('próximas: activas y por venir, de la más cercana; historial: lo demás, de la más reciente', () => {
  assert.deepEqual(proximas.map((c) => c.id), ['B', 'A']);
  assert.deepEqual(historial.map((c) => c.id), ['D', 'E', 'C']);
});

test('cada servicio de la cita con su hora y su especialista, en orden', () => {
  assert.deepEqual(por('A').lineas, [
    { hora: '10:00 AM', nombre: 'Depilación Láser · Axilas', quien: 'Carmen Rodríguez' },
    { hora: '10:15 AM', nombre: 'Depilación Cera · Bozo', quien: 'Paola Jiménez' },
  ]);
  assert.equal(por('A').titulo, 'Depilación Láser · Axilas + Depilación Cera · Bozo');
  assert.deepEqual(por('A').ovalo, { dia: 'Sáb', numero: 3, mes: 'Oct' });
  // sin servicios en la otra lista, la cita se muestra con lo que trae
  assert.deepEqual(por('B').lineas, [{ hora: '4:00 PM', nombre: 'Hidrafacial', quien: 'Dra. Nadieska Soto' }]);
});

test('cancelar: solo pendiente o confirmada y con más de 12 h; con menos, aviso de WhatsApp', () => {
  assert.equal(por('A').cancelable, true);
  assert.equal(por('A').menosDe12h, false);
  assert.equal(por('B').cancelable, false);
  assert.equal(por('B').menosDe12h, true);
  assert.equal(por('D').cancelable, false);
  assert.equal(por('D').menosDe12h, false);
  assert.equal(por('D').estado, 'Cancelada');
});

const paquete = (extra: Partial<FilaPaqueteCliente>): FilaPaqueteCliente => ({
  id: 'p', paquete_id: 'sp1', paquete: 'Paquete Facial Profunda x5', servicio: 'Limpieza Facial Profunda',
  sesiones: 5, usadas: 3, comprado: '2026-09-01', estado: 'active', paquete_activo: true, cliente: 'María Altagracia Gómez', ...extra,
});

test('paquetes: sesiones usadas, las que quedan y reservar la próxima', () => {
  const [p] = vistaPaquetes([paquete({})]);
  assert.deepEqual(p, {
    id: 'p', nombre: 'Paquete Facial Profunda x5', servicio: 'Limpieza Facial Profunda', desde: 'desde 1 sep',
    total: 5, usadas: 3, quedan: 2, texto: '3 de 5 sesiones usadas · te quedan 2', terminado: false,
    reservar: '/reservar?paquete=sp1',
  });
  assert.equal(vistaPaquetes([paquete({ usadas: 4 })])[0].texto, '4 de 5 sesiones usadas · te queda 1');
});

test('paquetes terminados, sin sesiones o de un paquete que ya no se vende', () => {
  const [lleno, completo, viejo, raro] = vistaPaquetes([
    paquete({ usadas: 5 }),
    paquete({ estado: 'completed', usadas: 5 }),
    paquete({ paquete_activo: false }),
    paquete({ usadas: 9 }),
  ]);
  assert.deepEqual([lleno.terminado, lleno.reservar, lleno.texto], [true, null, '5 de 5 sesiones usadas · paquete terminado']);
  assert.equal(completo.terminado, true);
  assert.equal(viejo.reservar, '/reservar');
  assert.deepEqual([raro.usadas, raro.quedan], [5, 0]);
});

test('saludo: primer nombre y resumen en singular o plural', () => {
  assert.equal(primerNombre('  María Altagracia Gómez '), 'María');
  assert.equal(primerNombre(''), '');
  assert.equal(textoResumen(2, 1, 3), '2 citas próximas · 1 paquete activo · 3 visitas en tu historial');
  assert.equal(textoResumen(1, 0, 1), '1 cita próxima · 0 paquetes activos · 1 visita en tu historial');
});

test('teléfono completo: 10 dígitos, escritos como sea', () => {
  assert.equal(telefonoCompleto('809-555-0101'), true);
  assert.equal(telefonoCompleto('809 555 010'), false);
  assert.equal(telefonoCompleto(''), false);
});
```

- [ ] **Step 2: Correr las pruebas y ver que fallan**

Run: `cd vscode && npm test`
Expected: FAIL, porque no existe `../src/site/portal/portal.ts`.

- [ ] **Step 3: Escribir `portal.ts`**

`vscode/src/site/portal/portal.ts`:
```ts
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

/** Horas que faltan para la cita (negativo si ya pasó), con la hora del teléfono. */
export function horasHasta(fecha: string, hora: string, ahora: Date): number {
  const [h, m] = hora.split(':').map(Number);
  const d = deIso(fecha);
  d.setHours(h, m, 0, 0);
  return (d.getTime() - ahora.getTime()) / 3_600_000;
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

/** "2 citas próximas · 1 paquete activo · 3 visitas en tu historial" */
export function textoResumen(proximas: number, paquetesActivos: number, historial: number): string {
  return [
    cuenta(proximas, 'cita próxima', 'citas próximas'),
    cuenta(paquetesActivos, 'paquete activo', 'paquetes activos'),
    cuenta(historial, 'visita en tu historial', 'visitas en tu historial'),
  ].join(' · ');
}

/** Los 10 dígitos del teléfono, escritos como sea. */
export function telefonoCompleto(tel: string): boolean {
  return tel.replace(/\D/g, '').length === 10;
}
```

- [ ] **Step 4: Correr las pruebas y ver que pasan**

Run: `cd vscode && npm test`
Expected: PASS, con 107 pruebas (98 + 9).

- [ ] **Step 5: Revisar los caracteres y hacer el commit**

```bash
grep -c "·\|→\|ó\|á" vscode/src/site/portal/portal.ts vscode/tests/portal.test.ts
git add vscode/src/site/portal/portal.ts vscode/tests/portal.test.ts
git commit -m "feat(portal): próximas, historial, estados y paquetes de Mis citas"
```

---

### Task 3: El `/mis-citas` viejo pasa a `src/legacy/`

**Files:**
- Move: `vscode/src/components/MyAppointments.tsx` → `vscode/src/legacy/MyAppointments.tsx` (CRLF), con `git mv`
- Move: `vscode/src/components/MyAppointments.css` → `vscode/src/legacy/MyAppointments.css`, con `git mv`
- Create: `vscode/src/legacy/ClientPortalAnterior.tsx`
- Modify: `vscode/src/pages/ClientPortal.tsx` (CRLF): importa `../legacy/MyAppointments`
- Modify: `vscode/src/App.tsx` (CRLF): ruta `/diseno-anterior/mis-citas`

- [ ] **Step 1: Mover**

```bash
git mv vscode/src/components/MyAppointments.tsx vscode/src/legacy/MyAppointments.tsx
git mv vscode/src/components/MyAppointments.css vscode/src/legacy/MyAppointments.css
```
El contenido de `MyAppointments.tsx` no cambia: sus imports (`../lib/supabase`, `../lib/timeFormat`, `./MyAppointments.css`) funcionan igual desde `src/legacy/`.

- [ ] **Step 2: La página vieja, para consulta.** `vscode/src/legacy/ClientPortalAnterior.tsx`:
```tsx
import { useEffect } from 'react';
import Navbar from './Navbar';
import MyAppointments from './MyAppointments';
import Footer from './Footer';

/** El diseño anterior de /mis-citas, guardado para consulta (spec §8). Google no la indexa. */
export default function ClientPortalAnterior() {
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
        <MyAppointments />
      </div>
      <Footer />
    </>
  );
}
```

- [ ] **Step 3: Rutas, con CRLF.**
  1. En `ClientPortal.tsx`, `import MyAppointments from '../components/MyAppointments';` pasa a ser
     `import MyAppointments from '../legacy/MyAppointments';`. Mientras tanto `/mis-citas` sigue igual; la Task 6 la cambia.
  2. En `App.tsx`, debajo de `const BookingPageAnterior = lazy(...)`, agrega
     `const ClientPortalAnterior = lazy(() => import('./legacy/ClientPortalAnterior'));`.
  3. En `App.tsx`, debajo de la ruta `/diseno-anterior/reservar`, agrega
     `<Route path="/diseno-anterior/mis-citas" element={<Suspense fallback={null}><ClientPortalAnterior /></Suspense>} />`.

- [ ] **Step 4: Comprobación**

```bash
cd vscode
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -E "src/site/|ClientPortal|src/App"
npm test
npm run build
file src/legacy/MyAppointments.tsx src/pages/ClientPortal.tsx src/App.tsx
```
Expected:
- 39 errores; el que tenía `MyAppointments.tsx` ahora aparece en `src/legacy/MyAppointments.tsx`;
- ninguna línea en el segundo `grep`;
- 107 pruebas;
- `✓ built`;
- CRLF en los tres archivos.

- [ ] **Step 5: Commit**

```bash
git add vscode/src/legacy/MyAppointments.tsx vscode/src/legacy/MyAppointments.css vscode/src/legacy/ClientPortalAnterior.tsx vscode/src/pages/ClientPortal.tsx vscode/src/App.tsx
git commit -m "refactor(portal): el diseño anterior de Mis citas en /diseno-anterior/mis-citas"
```

---

### Task 4: `usePortal` (buscar, recordar y cancelar)

**Files:**
- Create: `vscode/src/site/portal/usePortal.ts`
- Modify: `vscode/src/lib/database.types.ts`: dos funciones nuevas en `Functions`

**Interfaces:**
- Consumes: `FilaCita`, `FilaServicioCita` y `FilaPaqueteCliente` (Task 2).
- Produces:
  - `type ResultadoCancelar = 'ok' | 'tarde' | 'error'`;
  - `interface DatosPortal { citas: FilaCita[]; servicios: FilaServicioCita[]; paquetes: FilaPaqueteCliente[] }`;
  - `usePortal()` devuelve `{ telefono, setTelefono, recordar, setRecordar, buscando, error, datos: DatosPortal | null, buscado, buscar(tel: string, recordarlo: boolean): Promise<void>, cancelar(id: string): Promise<ResultadoCancelar> }`.

- [ ] **Step 1: Tipos de la base.** En `database.types.ts`, dentro de `Functions`, en orden alfabético junto a `get_client_appointments`:
```ts
      get_client_appointment_services: {
        Args: { p_phone: string }
        Returns: {
          appointment_id: string
          duracion: number
          especialista: string
          hora: string
          orden: number
          servicio: string
        }[]
      }
      get_client_packages: {
        Args: { p_phone: string }
        Returns: {
          cliente: string | null
          comprado: string
          estado: string
          id: string
          paquete: string | null
          paquete_activo: boolean | null
          paquete_id: string | null
          servicio: string | null
          sesiones: number
          usadas: number
        }[]
      }
```

- [ ] **Step 2: El hook.** `vscode/src/site/portal/usePortal.ts`:
```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { FilaCita, FilaPaqueteCliente, FilaServicioCita } from './portal';

export type ResultadoCancelar = 'ok' | 'tarde' | 'error';
export interface DatosPortal { citas: FilaCita[]; servicios: FilaServicioCita[]; paquetes: FilaPaqueteCliente[] }

const CLAVE = 'anadsll-mis-citas-tel';
// sin almacenamiento (modo privado, bloqueado) "Recordar" simplemente no guarda: la página funciona igual
const leerGuardado = (): string => {
  try { return localStorage.getItem(CLAVE) ?? ''; } catch { return ''; }
};
const guardar = (tel: string | null) => {
  try {
    if (tel) localStorage.setItem(CLAVE, tel);
    else localStorage.removeItem(CLAVE);
  } catch { /* sin almacenamiento */ }
};

/** Mis citas (spec §6.3): busca por teléfono las citas, sus servicios y los paquetes; cancela con la regla de 12 h
 *  de la base (cancel_client_appointment). Con un número recordado, busca solo al abrir. */
export function usePortal() {
  const [telefono, setTelefono] = useState('');
  const [recordar, setRecordarEstado] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');
  const [datos, setDatos] = useState<DatosPortal | null>(null);
  /** el teléfono de los datos a la vista (el campo puede haber cambiado después) */
  const [buscado, setBuscado] = useState('');
  const ultima = useRef(0);

  const buscar = useCallback(async (tel: string, recordarlo: boolean) => {
    const esta = ++ultima.current;
    setBuscando(true);
    setError('');
    const [c, s, p] = await Promise.all([
      supabase.rpc('get_client_appointments', { p_phone: tel }),
      supabase.rpc('get_client_appointment_services', { p_phone: tel }),
      supabase.rpc('get_client_packages', { p_phone: tel }),
    ]);
    if (esta !== ultima.current) return; // llegó una búsqueda más nueva
    setBuscando(false);
    if (c.error) {
      console.error('[mis-citas] búsqueda:', c.error);
      setError('No pudimos buscar tus citas. Revisa tu conexión e intenta de nuevo.');
      setDatos(null);
      return;
    }
    if (s.error) console.warn('[mis-citas] servicios de las citas:', s.error.message);
    if (p.error) console.warn('[mis-citas] paquetes:', p.error.message);
    setDatos({
      citas: (c.data ?? []) as unknown as FilaCita[],
      servicios: s.error ? [] : ((s.data ?? []) as unknown as FilaServicioCita[]),
      paquetes: p.error ? [] : ((p.data ?? []) as unknown as FilaPaqueteCliente[]),
    });
    setBuscado(tel);
    guardar(recordarlo ? tel : null);
  }, []);

  // un número recordado en este teléfono: se busca solo al abrir
  useEffect(() => {
    const guardado = leerGuardado();
    if (!guardado) return;
    setTelefono(guardado);
    setRecordarEstado(true);
    void buscar(guardado, true);
  }, [buscar]);

  const setRecordar = useCallback((v: boolean) => {
    setRecordarEstado(v);
    guardar(v && buscado ? buscado : null);
  }, [buscado]);

  const cancelar = useCallback(async (id: string): Promise<ResultadoCancelar> => {
    const { data, error: e } = await supabase.rpc('cancel_client_appointment', { p_id: id, p_phone: buscado });
    if (e) {
      console.error('[mis-citas] cancelar:', e);
      return 'error';
    }
    // la cita existe, pero la base no la deja cancelar sola: faltan menos de 12 h, o ya no está pendiente o confirmada
    if (data === false) return 'tarde';
    setDatos((d) => d && { ...d, citas: d.citas.map((x) => (x.id === id ? { ...x, status: 'cancelled' } : x)) });
    return 'ok';
  }, [buscado]);

  return { telefono, setTelefono, recordar, setRecordar, buscando, error, datos, buscado, buscar, cancelar };
}
```

- [ ] **Step 3: Tipos, pruebas y compilación**

```bash
cd vscode
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site\|database.types"
npm test
npm run build
```
Expected: 39, 0, 107 pruebas y `✓ built`. El hook todavía no se usa; la Task 6 lo conecta.

- [ ] **Step 4: Commit**

```bash
git add vscode/src/site/portal/usePortal.ts vscode/src/lib/database.types.ts
git commit -m "feat(portal): buscar, recordar el número y cancelar en Mis citas"
```

---

### Task 5: Tarjeta de cita, paquetes y piezas compartidas

**Files:**
- Modify: `vscode/src/site/theme/tokens.css`: `--s-ok` y la insignia `.s-estado` compartida
- Modify: `vscode/src/site/reservar/Confirmacion.css`: se quitan las reglas `.s-estado` y `.s-estado i`
- Modify: `vscode/src/site/reservar/Confirmacion.tsx`: la insignia lleva `is-warn`
- Modify: `vscode/src/site/ui/SesionesOvalos.tsx` y `.css`: prop `usadas`
- Create: `vscode/src/site/portal/CitaProxima.tsx` y `.css`
- Create: `vscode/src/site/portal/MisPaquetes.tsx` y `.css`

**Interfaces:**
- Consumes: `CitaVista` y `PaqueteVista` (Task 2), `ResultadoCancelar` (Task 4), `site` y `mapsUrl` de
  `../../config/site`.
- Produces:
  - `CitaProxima({ cita: CitaVista, onCancelar: (id: string) => Promise<ResultadoCancelar> })`;
  - `MisPaquetes({ paquetes: PaqueteVista[] })`;
  - la clase `.s-estado` con `is-warn`, `is-ok`, `is-bad` o `is-mute`, y `.s-btn-sm`;
  - `SesionesOvalos` con `usadas?: number`.

- [ ] **Step 1: Piezas compartidas.** En `tokens.css`:
  1. Al final del bloque `.site[data-site-tema="oscuro"]`, agrega `--s-ok:#9CC5A1;`.
  2. Al final del bloque `.site[data-site-tema="claro"]`, agrega `--s-ok:#3F7D4B;`. Da 4.95:1 sobre blanco.
  3. Antes del bloque de `prefers-reduced-motion`, agrega:
```css
/* insignia de estado: Pendiente, Confirmada, Cancelada… (reservar y mis citas) */
.s-estado{ display:inline-flex; align-items:center; gap:7px; padding:6px 12px; border-radius:999px; border:1px solid currentColor; font-size:12px; font-weight:500; white-space:nowrap }
.s-estado i{ width:7px; height:7px; border-radius:50%; background:currentColor }
.s-estado.is-warn{ color:var(--s-warn) }
.s-estado.is-ok{ color:var(--s-ok) }
.s-estado.is-bad{ color:var(--s-bad) }
.s-estado.is-mute{ color:var(--s-faint) }
/* botón chico, sin bajar de 44 px de alto */
.s-btn-sm{ min-height:44px; padding:0 16px; font-size:13.5px }
```
  4. En `Confirmacion.css`, borra las dos líneas `.s-estado{ … }` y `.s-estado i{ … }`. En `Confirmacion.tsx`,
     `className="s-estado"` pasa a `className="s-estado is-warn"`.

- [ ] **Step 2: Óvalos usados.** En `SesionesOvalos.tsx`:
  - las props pasan a `{ sesiones, usadas = 0, conTexto = true, className = '' }` y la interfaz suma `usadas?: number`;
  - cada `<i>` lleva `className={k < usadas ? 'is-usado' : undefined}`;
  - el comentario del componente suma "(llenos los usados)".

  En `SesionesOvalos.css` agrega:
```css
.s-ovalos i.is-usado{ background:currentColor }
```

- [ ] **Step 3: La tarjeta de una próxima cita.** `vscode/src/site/portal/CitaProxima.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react';
import { mapsUrl, site } from '../../config/site';
import type { CitaVista } from './portal';
import type { ResultadoCancelar } from './usePortal';
import './CitaProxima.css';

interface Props {
  cita: CitaVista;
  onCancelar: (id: string) => Promise<ResultadoCancelar>;
}

const MENSAJE: Record<Exclude<ResultadoCancelar, 'ok'>, string> = {
  tarde: 'Esta cita ya no se puede cancelar en línea (faltan menos de 12 horas).',
  error: 'No se pudo cancelar la cita.',
};

/** Una próxima cita (spec §6.3): fecha en óvalo, cada servicio con su hora y su especialista, el estado,
 *  "Cómo llegar" y "Cancelar" (12 h). Con menos de 12 h, el aviso para escribir por WhatsApp. */
export default function CitaProxima({ cita, onCancelar }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [aviso, setAviso] = useState('');
  const botonCancelar = useRef<HTMLButtonElement>(null);
  const botonConservar = useRef<HTMLButtonElement>(null);
  const abierto = useRef(false);
  const whatsapp = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
    `Hola, quiero cambiar mi cita del ${cita.fechaCorta} a las ${cita.lineas[0]?.hora ?? ''}`,
  )}`;

  // al abrir la confirmación el foco va a "No, conservar"; al cerrarla vuelve a "Cancelar"
  useEffect(() => {
    if (confirmando) botonConservar.current?.focus();
    else if (abierto.current) botonCancelar.current?.focus();
    abierto.current = confirmando;
  }, [confirmando]);

  const cancelar = async () => {
    setCancelando(true);
    const r = await onCancelar(cita.id);
    setCancelando(false);
    if (r === 'ok') return; // la cita pasa al historial y esta tarjeta desaparece
    setAviso(MENSAJE[r]);
    setConfirmando(false);
  };

  return (
    <article className="s-ap" aria-labelledby={`cita-${cita.id}`}>
      <div className="s-ap-fecha" aria-hidden="true">
        <small>{cita.ovalo.dia}</small>
        <b>{cita.ovalo.numero}</b>
        <small>{cita.ovalo.mes}</small>
      </div>
      <div className="s-ap-cuerpo">
        <div className="s-ap-top">
          <h3 id={`cita-${cita.id}`}>
            <span className="s-sr">{cita.ovalo.dia} {cita.fechaCorta}: </span>{cita.titulo}
          </h3>
          <span className={`s-estado is-${cita.tono}`}><i aria-hidden="true" />{cita.estado}</span>
        </div>
        <ul className="s-ap-lineas">
          {cita.lineas.map((l, i) => (
            <li key={i}><b>{l.hora}</b> · {l.nombre} · {l.quien}</li>
          ))}
        </ul>
        {aviso && (
          <p className="s-ap-aviso" role="alert">
            {aviso} <a href={whatsapp} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp</a> y te ayudamos.
          </p>
        )}
        {confirmando ? (
          <div className="s-ap-confirma" role="group" aria-label="Confirmar la cancelación">
            <p>¿Cancelar esta cita? No se puede deshacer.</p>
            <button type="button" className="s-btn s-btn-solid s-btn-sm" onClick={cancelar} disabled={cancelando}>
              {cancelando ? 'Cancelando…' : 'Sí, cancelar'}
            </button>
            <button type="button" ref={botonConservar} className="s-btn s-btn-line s-btn-sm"
              onClick={() => setConfirmando(false)} disabled={cancelando}>
              No, conservar
            </button>
          </div>
        ) : (
          <div className="s-ap-acciones">
            <a className="s-btn s-btn-line s-btn-sm" href={mapsUrl} target="_blank" rel="noopener noreferrer">Cómo llegar</a>
            {cita.cancelable && (
              <button type="button" ref={botonCancelar} className="s-btn s-btn-line s-btn-sm"
                onClick={() => { setAviso(''); setConfirmando(true); }}>
                Cancelar
              </button>
            )}
            {cita.cancelable && <small>Puedes cancelar hasta 12 h antes.</small>}
            {cita.menosDe12h && (
              <small>
                Faltan menos de 12 h: para cambiarla{' '}
                <a href={whatsapp} target="_blank" rel="noopener noreferrer">escríbenos por WhatsApp</a>.
              </small>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
```

`vscode/src/site/portal/CitaProxima.css`:
```css
/* Próxima cita de Mis citas (boceto citas-v2, .ap). Celular primero. */
.s-ap{ display:grid; grid-template-columns:62px minmax(0,1fr); gap:14px; margin-bottom:14px; padding:16px; border-radius:24px; background:var(--s-surface); border:1px solid var(--s-surface-line) }
.s-ap-fecha{ display:flex; flex-direction:column; align-items:center; justify-content:center; height:92px; border-radius:999px; border:1px solid var(--s-accent) }
.s-ap-fecha small{ font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--s-soft) }
.s-ap-fecha b{ font:400 28px/1.05 var(--s-f-display) }
.s-ap-cuerpo{ min-width:0 }
.s-ap-top{ display:flex; flex-direction:column; align-items:flex-start; gap:8px; margin-bottom:8px }
.s-ap-top h3{ font:400 19px/1.25 var(--s-f-display); overflow-wrap:anywhere }
.s-ap-lineas{ margin:0 0 12px; padding:0; list-style:none; font-size:13.5px; line-height:1.7; color:var(--s-soft); overflow-wrap:anywhere }
.s-ap-lineas b{ color:var(--s-text); font-weight:500 }
.s-ap-acciones, .s-ap-confirma{ display:flex; flex-wrap:wrap; align-items:center; gap:10px }
.s-ap-acciones small{ width:100%; font-size:12.5px; line-height:1.5; color:var(--s-soft) }
.s-ap-acciones a:not(.s-btn), .s-ap-aviso a{ color:var(--s-accent); text-decoration:underline; text-underline-offset:3px }
.s-ap-confirma p{ width:100%; margin:0; font-size:14px }
.s-ap-aviso{ margin:0 0 12px; padding:10px 12px; border-radius:12px; border:1px solid var(--s-bad); background:var(--s-surface-2); font-size:13.5px; line-height:1.5 }
@media (min-width: 761px){
  .s-ap{ grid-template-columns:78px minmax(0,1fr); gap:20px; padding:20px }
  .s-ap-fecha{ height:112px }
  .s-ap-fecha b{ font-size:34px }
  .s-ap-top{ flex-direction:row; justify-content:space-between; gap:10px }
  .s-ap-top h3{ font-size:21px }
  .s-ap-acciones small{ width:auto }
}
```

- [ ] **Step 4: Mis paquetes.** `vscode/src/site/portal/MisPaquetes.tsx`:
```tsx
import { Link } from 'react-router-dom';
import SesionesOvalos from '../ui/SesionesOvalos';
import type { PaqueteVista } from './portal';
import './MisPaquetes.css';

/** Mis paquetes (spec §6.3): nombre, servicio y fecha de compra, las sesiones en ovalitos (llenos los usados) y
 *  "Reservar mi próxima sesión". Los terminados se muestran sin botón. */
export default function MisPaquetes({ paquetes }: { paquetes: PaqueteVista[] }) {
  if (!paquetes.length) {
    return <p className="s-pk-vacio">No tienes paquetes activos.</p>;
  }
  return (
    <ul className="s-pks">
      {paquetes.map((p) => (
        <li key={p.id} className={`s-pk ${p.terminado ? 'is-terminado' : ''}`}>
          <h3>{p.nombre}</h3>
          <span>{[p.servicio, p.desde].filter(Boolean).join(' · ')}</span>
          <SesionesOvalos sesiones={p.total} usadas={p.usadas} conTexto={false} className="s-pk-ovalos" />
          <p>{p.texto}</p>
          {p.reservar && (
            <Link className="s-btn s-btn-solid s-btn-sm" to={p.reservar}>
              Reservar mi próxima sesión <span className="s-ar" aria-hidden="true">→</span>
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
```

`vscode/src/site/portal/MisPaquetes.css`:
```css
/* Mis paquetes (boceto citas-v2, .pk). Celular primero. */
.s-pks{ margin:0; padding:0; list-style:none }
.s-pk{ margin-bottom:14px; padding:20px 22px; border-radius:24px; background:var(--s-surface); border:1px solid var(--s-surface-line) }
.s-pk h3{ margin-bottom:2px; font:400 20px/1.25 var(--s-f-display); overflow-wrap:anywhere }
.s-pk > span{ font-size:13px; color:var(--s-soft) }
.s-pk .s-pk-ovalos{ margin:14px 0 8px }
.s-pk .s-pk-ovalos i{ width:13px; height:24px }
.s-pk p{ margin:0 0 14px; font-size:13.5px; color:var(--s-soft) }
.s-pk.is-terminado p{ margin-bottom:0 }
.s-pk-vacio{ margin:0; font-size:14px; color:var(--s-soft) }
```

- [ ] **Step 5: Tipos, pruebas, compilación y caracteres**

```bash
cd vscode
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site"
npm test
npm run build
grep -c "¿\|…\|·\|→" src/site/portal/CitaProxima.tsx src/site/portal/MisPaquetes.tsx
```
Expected:
- `0`;
- 107 pruebas;
- `✓ built`;
- al menos 1 en cada archivo.

- [ ] **Step 6: Commit**

```bash
git add vscode/src/site/theme/tokens.css vscode/src/site/reservar/Confirmacion.css vscode/src/site/reservar/Confirmacion.tsx vscode/src/site/ui/SesionesOvalos.tsx vscode/src/site/ui/SesionesOvalos.css vscode/src/site/portal/CitaProxima.tsx vscode/src/site/portal/CitaProxima.css vscode/src/site/portal/MisPaquetes.tsx vscode/src/site/portal/MisPaquetes.css
git commit -m "feat(portal): tarjeta de cita con cancelar, mis paquetes con ovalitos y la insignia de estado compartida"
```

---

### Task 6: La página `/mis-citas` nueva

**Files:**
- Create: `vscode/src/site/portal/MisCitas.tsx`
- Create: `vscode/src/site/portal/MisCitas.css`
- Modify: `vscode/src/pages/ClientPortal.tsx` (CRLF)

**Interfaces:**
- Consumes:
  - `usePortal` (Task 4);
  - `vistaCitas`, `vistaPaquetes`, `primerNombre`, `textoResumen` y `telefonoCompleto` (Task 2);
  - `CitaProxima` y `MisPaquetes` (Task 5);
  - `formatoTelefono` de `../reservar/datos`;
  - `site` de `../../config/site`;
  - `useSeccionesPresentes` de `../site/header/usePresencia`.
- Produces: `export default function MisCitas()`.

- [ ] **Step 1: La página.** `vscode/src/site/portal/MisCitas.tsx`:
```tsx
import { useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { site } from '../../config/site';
import { formatoTelefono } from '../reservar/datos';
import CitaProxima from './CitaProxima';
import MisPaquetes from './MisPaquetes';
import { primerNombre, telefonoCompleto, textoResumen, vistaCitas, vistaPaquetes } from './portal';
import { usePortal } from './usePortal';
import './MisCitas.css';

/** /mis-citas (spec §6.3): búsqueda por teléfono, saludo, próximas citas, historial y mis paquetes. */
export default function MisCitas() {
  const p = usePortal();
  const [errorTel, setErrorTel] = useState('');
  const [anuncio, setAnuncio] = useState('');
  const tituloProximas = useRef<HTMLHeadingElement>(null);
  const idRecordar = useId();

  const vistas = p.datos ? vistaCitas(p.datos.citas, p.datos.servicios, new Date()) : null;
  const paquetes = p.datos ? vistaPaquetes(p.datos.paquetes) : [];
  const nombre = p.datos ? primerNombre(p.datos.citas[0]?.client_name ?? p.datos.paquetes[0]?.cliente ?? '') : '';
  const hayAlgo = !!p.datos && (p.datos.citas.length > 0 || p.datos.paquetes.length > 0);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!telefonoCompleto(p.telefono)) {
      setErrorTel('Escribe los 10 dígitos de tu teléfono.');
      document.getElementById('mc-tel')?.focus();
      return;
    }
    setErrorTel('');
    setAnuncio('');
    void p.buscar(p.telefono, p.recordar);
  };

  const cancelar = async (id: string) => {
    const cita = vistas?.proximas.find((c) => c.id === id);
    const r = await p.cancelar(id);
    if (r === 'ok') {
      // la tarjeta desaparece: se anuncia y el foco va al título de la sección
      setAnuncio(`Cancelamos tu cita del ${cita?.fechaCorta ?? ''}.`);
      tituloProximas.current?.focus();
    }
    return r;
  };

  return (
    <div className="s-mc">
      <header className="s-mc-head">
        <div className="s-wrap">
          <p className="s-eyebrow">Mis citas</p>
          <h1 className="s-display s-mc-titulo">Tus citas y <em>paquetes</em></h1>
          <p className="s-mc-intro">Escribe tu número de teléfono para ver tus próximas citas, tu historial y las sesiones que te quedan.</p>
          <form className="s-lookup" onSubmit={enviar} noValidate>
            <label className="s-lookup-inp" htmlFor="mc-tel">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
              <span className="s-sr">Tu número de teléfono</span>
              <input id="mc-tel" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="829-000-0000"
                value={p.telefono} onChange={(e) => p.setTelefono(formatoTelefono(e.target.value))}
                aria-invalid={errorTel ? true : undefined} aria-describedby={errorTel ? 'mc-tel-error' : undefined} />
            </label>
            <button type="submit" className="s-btn s-btn-solid" disabled={p.buscando}>
              {p.buscando ? 'Buscando…' : 'Ver mis citas'}
            </button>
          </form>
          {errorTel && <p id="mc-tel-error" className="s-mc-error">{errorTel}</p>}
          <label className="s-recordar" htmlFor={idRecordar}>
            <input id={idRecordar} type="checkbox" checked={p.recordar} onChange={(e) => p.setRecordar(e.target.checked)} />
            <i aria-hidden="true">✓</i>Recordar mi número en este teléfono
          </label>
        </div>
      </header>

      <p className="s-sr" aria-live="polite">{anuncio}</p>

      <div className="s-wrap s-mc-cuerpo">
        {p.buscando ? (
          <p className="s-mc-estado">Buscando tus citas…</p>
        ) : p.error ? (
          <p className="s-mc-estado" role="alert">{p.error}</p>
        ) : !p.datos ? (
          <p className="s-mc-estado">Escribe tu número y toca “Ver mis citas”.</p>
        ) : !hayAlgo ? (
          <div className="s-mc-vacio">
            <p>No encontramos citas con el número <b>{p.buscado}</b>.</p>
            <div className="s-mc-vacio-btns">
              <Link className="s-btn s-btn-solid" to="/reservar">Agendar una cita</Link>
              <a className="s-btn s-btn-line" target="_blank" rel="noopener noreferrer"
                href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(`Hola, no encuentro mis citas con el número ${p.buscado}`)}`}>
                Escribir por WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="s-hello">
              <div>
                <h2 className="s-display">Hola{nombre ? <>, <em>{nombre}</em></> : ''}</h2>
                <p>{textoResumen(vistas!.proximas.length, paquetes.filter((x) => !x.terminado).length, vistas!.historial.length)}</p>
              </div>
              <Link className="s-btn s-btn-line s-btn-sm" to="/reservar">Reservar otra cita</Link>
            </div>
            <div className="s-mc-grid">
              <div>
                <h2 className="s-blk-t" ref={tituloProximas} tabIndex={-1}>Próximas citas</h2>
                {vistas!.proximas.length ? (
                  vistas!.proximas.map((c) => <CitaProxima key={c.id} cita={c} onCancelar={cancelar} />)
                ) : (
                  <p className="s-mc-nada">No tienes citas próximas. <Link to="/reservar">Agenda una</Link>.</p>
                )}
                {vistas!.historial.length > 0 && (
                  <>
                    <h2 className="s-blk-t s-blk-t--sep">Historial</h2>
                    <ul className="s-hist">
                      {vistas!.historial.map((c) => (
                        <li key={c.id}>
                          <time dateTime={c.fecha}>{c.fechaCorta}</time>
                          <span>{c.titulo}</span>
                          <span className={`s-estado is-${c.tono}`}><i aria-hidden="true" />{c.estado}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <div>
                <h2 className="s-blk-t">Mis paquetes</h2>
                <MisPaquetes paquetes={paquetes} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Estilos.** `vscode/src/site/portal/MisCitas.css`:
```css
/* /mis-citas (boceto citas-v2): cabecera con listones y búsqueda, saludo, citas, historial y paquetes. Celular primero. */
.s-mc-head{ padding:34px 0 28px; background:var(--s-tex); border-bottom:1px solid var(--s-line) }
.s-mc-head .s-eyebrow{ margin:0 0 16px }
.s-mc-titulo{ margin:0 0 14px; font-size:36px }
.s-mc-intro{ max-width:36em; margin:0; font-size:15px; font-weight:300; line-height:1.65; color:var(--s-soft) }
.s-lookup{ display:flex; flex-direction:column; align-items:stretch; gap:10px; max-width:560px; margin-top:24px; padding:10px; border-radius:22px; background:var(--s-surface); border:1px solid var(--s-surface-line) }
.s-lookup-inp{ display:flex; align-items:center; gap:10px; min-height:46px; padding:0 14px; border-radius:14px; border:1px solid var(--s-faint); background:var(--s-input) }
.s-lookup-inp:focus-within{ border-color:var(--s-accent); box-shadow:0 0 0 1px var(--s-accent) }
.s-lookup-inp svg{ width:18px; height:18px; flex-shrink:0; fill:none; stroke:currentColor; stroke-width:2; opacity:.7 }
.s-lookup-inp input{ flex:1; min-width:0; height:44px; border:0; background:none; color:var(--s-text); font:400 16px var(--s-f-body); outline:none }
.s-lookup-inp input::placeholder{ color:var(--s-faint) }
.s-lookup .s-btn{ width:100% }
.s-lookup .s-btn:disabled{ opacity:.6; cursor:default }
.s-mc-error{ margin:8px 0 0; font-size:13px; font-weight:500; color:var(--s-bad) }
.s-recordar{ position:relative; display:inline-flex; align-items:center; gap:10px; min-height:44px; margin-top:6px; font-size:13.5px; color:var(--s-soft); cursor:pointer }
.s-recordar input{ position:absolute; width:1px; height:1px; margin:0; opacity:0 }
.s-recordar i{ display:grid; place-items:center; width:20px; height:20px; border-radius:6px; border:1.5px solid var(--s-faint); font-style:normal; font-size:12px; color:transparent; transition:background-color .25s, color .25s }
.s-recordar input:checked + i{ background:var(--s-btn-bg); border-color:transparent; color:var(--s-btn-fg) }
.s-recordar input:focus-visible + i{ outline:2px solid var(--s-accent); outline-offset:2px }

.s-mc-cuerpo{ padding-top:30px; padding-bottom:80px }
.s-mc-estado{ margin:0; padding:30px 0 50px; text-align:center; font-size:15px; color:var(--s-soft) }
.s-mc-vacio{ padding:30px 0 50px; text-align:center; color:var(--s-soft) }
.s-mc-vacio p{ margin:0 0 18px; font-size:15px }
.s-mc-vacio b{ color:var(--s-text); font-weight:500 }
.s-mc-vacio-btns{ display:flex; flex-direction:column; gap:10px; max-width:360px; margin:0 auto }
.s-hello{ display:flex; flex-direction:column; align-items:flex-start; gap:14px; margin-bottom:26px }
.s-hello h2{ font-size:30px }
.s-hello p{ margin:6px 0 0; font-size:14.5px; color:var(--s-soft) }
.s-mc-grid{ display:grid; gap:28px }
.s-blk-t{ margin:0 0 14px; font:500 12px var(--s-f-body); letter-spacing:.2em; text-transform:uppercase; color:var(--s-accent) }
.s-blk-t:focus{ outline:none }
.s-blk-t--sep{ margin-top:28px }
.s-mc-nada{ margin:0 0 14px; font-size:14px; color:var(--s-soft) }
.s-mc-nada a{ color:var(--s-accent); text-decoration:underline; text-underline-offset:3px }
.s-hist{ margin:0; padding:0; list-style:none; border-radius:22px; border:1px solid var(--s-line); overflow:hidden }
.s-hist li{ display:grid; grid-template-columns:58px minmax(0,1fr); gap:6px 14px; align-items:center; padding:13px 18px; font-size:13.5px }
.s-hist li + li{ border-top:1px solid var(--s-line) }
.s-hist time{ font-size:12.5px; color:var(--s-soft) }
.s-hist span:not(.s-estado){ overflow-wrap:anywhere }
.s-hist .s-estado{ grid-column:2; justify-self:start }

@media (min-width: 761px){
  .s-mc-head{ padding:56px 0 46px }
  .s-mc-titulo{ font-size:46px }
  .s-mc-intro{ font-size:16.5px }
  .s-lookup{ flex-direction:row; align-items:center; gap:12px; padding:8px; border-radius:999px }
  .s-lookup-inp{ flex:1; border:0; background:none }
  .s-lookup-inp:focus-within{ box-shadow:none }
  .s-lookup:focus-within{ border-color:var(--s-accent); box-shadow:0 0 0 1px var(--s-accent) }
  .s-lookup .s-btn{ width:auto }
  .s-mc-cuerpo{ padding-top:44px; padding-bottom:90px }
  .s-mc-vacio-btns{ flex-direction:row; justify-content:center; max-width:none }
  .s-hello{ flex-direction:row; justify-content:space-between; align-items:flex-end; gap:20px; margin-bottom:30px }
  .s-hello h2{ font-size:38px }
  .s-hist li{ grid-template-columns:90px minmax(0,1fr) auto; gap:14px }
  .s-hist .s-estado{ grid-column:auto }
}
@media (min-width: 1101px){
  .s-mc-titulo{ font-size:54px }
  .s-mc-grid{ grid-template-columns:1.35fr 1fr; align-items:start }
}
```
En computadora el borde del campo pasa al contenedor redondo, que marca el foco. En celular el campo lleva su propio borde con `--s-faint`, porque el contraste de un control pide 3:1.

- [ ] **Step 3: `ClientPortal` con la página nueva.** `vscode/src/pages/ClientPortal.tsx` queda así, con CRLF:
```tsx
import { useEffect } from 'react';
import SiteLayout from '../site/SiteLayout';
import MisCitas from '../site/portal/MisCitas';
import { useSeccionesPresentes } from '../site/header/usePresencia';

/** /mis-citas con la cara nueva (spec §6.3). El diseño anterior sigue en /diseno-anterior/mis-citas. */
export default function ClientPortal() {
  const secciones = useSeccionesPresentes();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  return (
    <SiteLayout secciones={secciones}>
      <MisCitas />
    </SiteLayout>
  );
}
```

- [ ] **Step 4: Tipos, pruebas, compilación y caracteres**

```bash
cd vscode
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -E "src/site/|ClientPortal"
npm test
npm run build
file src/pages/ClientPortal.tsx
grep -c "“\|…\|✓" src/site/portal/MisCitas.tsx
```
Expected:
- 39 errores, y ninguna línea en el segundo `grep`;
- 107 pruebas;
- `✓ built`;
- CRLF en `ClientPortal.tsx`;
- al menos 3 en el último `grep`.

- [ ] **Step 5: Commit**

```bash
git add vscode/src/site/portal/MisCitas.tsx vscode/src/site/portal/MisCitas.css vscode/src/pages/ClientPortal.tsx
git commit -m "feat(portal): la página Mis citas nueva con saludo, citas, historial y paquetes"
```

---

### Task 7: Revisión en el navegador con datos de prueba (la hace el controlador)

Se prueba con el servidor `sitio-rediseno` (puerto 5181), contra la única base. Los datos de prueba usan el nombre
**"Prueba Claude"** y el teléfono **809-000-0000**, y se borran al final.

- [ ] **Step 1: Crear los datos de prueba**
  1. Una clienta con un paquete de 3 sesiones con 1 usada.
  2. Cuatro citas:
     - una en 3 días a las 10:00, pendiente, con dos servicios de dos especialistas;
     - una en menos de 12 horas, confirmada;
     - una pasada, completada;
     - una cancelada.
```sql
insert into clients (name, phone, source) values ('Prueba Claude', '809-000-0000', 'web') returning id;
-- con ese id (:cliente):
insert into client_packages (client_id, package_id, total_sessions, used_sessions, purchased_at, status)
values (:cliente, 'fdb1e14d-e2ba-4d79-9d3a-541561fde407', 3, 1, now() - interval '10 days', 'active');
select public.save_appointment(null, null, 'Prueba Claude', '809-000-0000', current_date + 3, '10:00', 'pending', '', 'web',
  jsonb_build_array(
    jsonb_build_object('service_id', null, 'service_name', 'Depilación Láser - Axilas', 'employee', 'Carmen Rodríguez', 'duration', 15, 'price', 0),
    jsonb_build_object('service_id', null, 'service_name', 'Depilación Cera - Bozo', 'employee', 'Paola Jiménez', 'duration', 10, 'price', 0)));
-- la de menos de 12 h: hoy o mañana según la hora, a unas 6 horas de ahora (hora de Santo Domingo)
select public.save_appointment(null, null, 'Prueba Claude', '809-000-0000',
  ((now() at time zone 'America/Santo_Domingo') + interval '6 hours')::date,
  date_trunc('hour', (now() at time zone 'America/Santo_Domingo') + interval '6 hours')::time,
  'confirmed', '', 'web', jsonb_build_array(jsonb_build_object('service_name', 'Hidrafacial', 'employee', 'Dra. Nadieska Soto', 'duration', 60, 'price', 0)));
select public.save_appointment(null, null, 'Prueba Claude', '809-000-0000', current_date - 14, '09:00', 'completed', '', 'web',
  jsonb_build_array(jsonb_build_object('service_name', 'Peeling', 'employee', 'Dra. Nadieska Soto', 'duration', 45, 'price', 0)));
select public.save_appointment(null, null, 'Prueba Claude', '809-000-0000', current_date + 10, '11:00', 'cancelled', '', 'web',
  jsonb_build_array(jsonb_build_object('service_name', 'Hidrafacial', 'employee', 'Dra. Nadieska Soto', 'duration', 60, 'price', 0)));
```
Si una cita choca con otra de esa especialista (error 23P01), se mueve media hora y se vuelve a guardar. El paquete
`fdb1e14d…` es "Paquete Peeling Químico x3".
- [ ] **Step 2: Revisar `/mis-citas`** en 360, 390, 430, 820, 1180, 1280 y 1440, en los dos temas.
  - **Búsqueda:**
    - con "809-000-0" sale el error de los 10 dígitos y no se busca;
    - con el número completo sale "Hola, *Prueba*" con "2 citas próximas · 1 paquete activo · 2 visitas en tu historial".
  - **Próximas citas:**
    - la de 3 días muestra el óvalo, los dos servicios con su hora y su especialista, "Pendiente", "Cómo llegar" y "Cancelar";
    - la de menos de 12 h muestra "Confirmada", no ofrece "Cancelar" y tiene el aviso de WhatsApp.
  - **Historial:** la completada y la cancelada, con sus insignias.
  - **Mis paquetes:**
    - 3 ovalitos con 1 lleno y "1 de 3 sesiones usadas · te quedan 2";
    - "Reservar mi próxima sesión" abre `/reservar` con ese paquete elegido.
  - **Cancelar la de 3 días:** "Sí, cancelar" la pasa al historial como "Cancelada", y el foco va a "Próximas citas".
  - **Recordar:** marcar "Recordar", buscar y recargar la página: busca sola. Desmarcar y recargar: ya no busca.
  - **Número sin citas** (829-111-2222): sale "No encontramos citas…", con "Agendar una cita" y WhatsApp.
  - **General:**
    - nada se sale de la pantalla;
    - en el menú, "Equipo" y "Paquetes" aparecen solo si la página principal los tiene;
    - `/diseno-anterior/mis-citas` abre el diseño viejo y funciona.
- [ ] **Step 3: Dejar la base como estaba:**
```sql
delete from appointment_services where appointment_id in (select id from appointments where client_name = 'Prueba Claude');
delete from appointments where client_name = 'Prueba Claude';
delete from client_packages where client_id in (select id from clients where name = 'Prueba Claude');
delete from clients where name = 'Prueba Claude';
select (select count(*) from appointments where client_name = 'Prueba Claude') citas,
       (select count(*) from clients where name = 'Prueba Claude') clientes;  -- 0 y 0
```
- [ ] **Step 4: Louis prueba en su teléfono** con un número de prueba y con "Recordar".
- [ ] **Step 5:** Abre el PR "Rediseño fase 6: Mis citas con mis paquetes", contra la rama de la Fase 5 mientras esa no esté fusionada.

## Al terminar la Fase 6

Sigue la **Fase 7 (calidad)**:
- revisión completa de todas las páginas de la clienta en los 7 anchos y los dos temas;
- la lista de la spec §3.8;
- los pendientes anotados en el índice ("Lo que dejó la Fase …");
- la prueba final en el teléfono y el iPad de Louis.
