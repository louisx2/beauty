# Rediseño · Fase 4: el equipo en la web — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La dueña marca en el panel (página Equipo) quién aparece en la página principal, con qué cargo y
qué especialidades. La sección "Nuestro equipo" muestra a esas personas en retratos en arco y, si no hay
nadie marcado, no aparece ni en la página ni en el menú.

**Architecture:**
- **Base de datos:** tres columnas nuevas en `staff`. anon lee `staff` columna por columna, así que cada
  columna nueva lleva su `grant select (col)`.
- **Qué se prueba:** quién sale, en qué orden, las iniciales cuando no hay foto y la limpieza de los textos
  del panel. Son funciones puras en `src/site/landing/equipo.ts`.
- **Página principal:** `useEquipoPublico` lee el equipo y `Team` lo pinta. `seccionesPresentes` decide
  en un solo lugar qué secciones existen: con eso se arma a la vez lo que se pinta y lo que ofrecen el
  menú y las pestañas.
- **Panel:** el formulario de Equipo suma un bloque "Página web", y la tarjeta de cada persona muestra
  "En la web" cuando sale en la página.

**Tech Stack:** React 19 + TypeScript + Vite 7, react-router-dom 7, Supabase JS, CSS plano por componente y
`node --test` (`npm test`).

**Spec:** `docs/superpowers/specs/2026-09-27-rediseno-web-clienta-design.md`: §6.5 equipo en la web, §5.7
la sección, §7 cambios en la base y §3 sistema visual.

**Boceto aprobado:** `C:/Users/loui-/Desktop/ANABEL/bocetos-rediseno/land-v4.html`, sección `.team`
(líneas ~385–395 del CSS, ~560 y ~629 de los cortes, ~795–810 del HTML). De ahí salen las medidas y los
textos.

**Base que dejó la Fase 3** (rama `claude/rediseno-fase-3-paquetes`, PR #9):
- `src/pages/LandingPage.tsx` decide hoy qué secciones hay, con banderas sueltas.
- `src/site/header/secciones.ts` tiene `SECCIONES`, cuyas 7 entradas ya incluyen `s-equipo`, y
  `seccionesVisibles`.
- `src/site/landing/useDatosPublicos.ts` tiene `useServiciosPublicos` y `usePaquetesPublicos`.
- `src/site/landing/landing.css` tiene `.s-sec`, `.s-sec-head`, `.s-arco` (y `.s-arco.is-ph`), `.s-h2` y `.s-rv`.
- `src/site/ui/useRevela.ts` hace aparecer los elementos al bajar.
- `src/site/brand.ts` tiene `MONOGRAMA` y `FOTOS.equipoAnabel` (`/fotos/equipo-anabel.jpg`, la foto de
  Anabel para el equipo, spec §3.6). El código no la usa: Louis la sube como foto de Anabel en el panel
  cuando cargue los datos reales.

**Estado de la base hoy** (datos de prueba hasta la entrega):
- 6 filas en `staff`, todas activas y ninguna con foto: Ana Ortega (admin), Carmen Rodríguez, Dra.
  Nadieska Soto, Paola Jiménez, Luisa Méndez (Recepción) y Louis H.
- anon tiene `select` solo en `id, name, role, active, avatar_url, service_ids, working_days,
  working_start, working_end`, y la política `anon_read` le deja ver solo las filas con `active = true`.
- authenticated tiene permisos de tabla, así que no necesita grants nuevos. La RLS deja editar solo a
  quien tiene `staff_role() = 'admin'`.

## Global Constraints

- **Columnas (spec §6.5 y §7):**
  - `mostrar_en_web boolean not null default false`;
  - `cargo_web text`, por ejemplo "Médico estético y cosmiatra";
  - `especialidades_web text`, por ejemplo "Facial · Medicina estética".
- **Acceso de anon:** `grant select (mostrar_en_web, cargo_web, especialidades_web) on public.staff to
  anon`. Toda consulta pública a `staff` nombra sus columnas: nunca `select('*')`.
- **Quién sale:** quien tenga `mostrar_en_web = true` y `active = true`. Si no hay nadie, no aparece la
  sección, ni "Equipo" en el menú y las pestañas.
- **Sección (spec §5.7):**
  - etiqueta "Nuestro equipo" y título "Manos *expertas* que te cuidan";
  - retratos en arco con nombre, cargo y especialidades;
  - **4 columnas en computadora y 2 en tableta y celular, sin carrusel**;
  - va después de Filosofía y antes de Opiniones.
- **Foto:** la de `avatar_url`. Sin foto, o si la foto no carga, van las iniciales sobre la textura, como
  "PJ" en el boceto.
- **Cortes:** celular ≤ 760 px, tableta 761–1100 px y computadora > 1100 px. Se escribe de celular hacia
  arriba, con `@media (min-width: 761px)` y `@media (min-width: 1101px)`.
- **Clases:**
  - prefijo `s-` dentro de `.site`, sin utilidades de Tailwind;
  - en el panel, las clases `staff-*`, `modal__*` y `toggle-*` del archivo;
  - el tema claro del panel va con `[data-theme="light"]`.
- **Calidad (spec §3.8):**
  - nada se sale de la pantalla;
  - los textos largos bajan de línea;
  - zonas táctiles ≥ 44 px;
  - contraste AA;
  - `prefers-reduced-motion` apaga las animaciones (ya lo hace `.s-rv`).
- **Código:**
  - comentarios y nombres en español;
  - `src/site/landing/equipo.ts` y `src/site/header/secciones.ts` se prueban con Node, así que no importan
    nada o importan con la extensión `.ts`;
  - `Staff.tsx` y `staffStore.ts` tienen fin de línea **CRLF**, y se conserva.
- **Caracteres tipográficos:** los editores de algunos agentes cambian “ ” · – — por ASCII sin avisar.
  Después de escribir un archivo que los tenga, se comprueban con `grep`.
- **Tipos, línea base:** `npx tsc -p tsconfig.app.json --noEmit` da hoy **40 errores**, ninguno en
  `src/site`, `LandingPage` ni `staffStore`, y 5 en `Staff.tsx` (importaciones y variables sin usar: `Plus`,
  `Calendar`, `TrendingUp`, `data`, `handleToggleActive`). La fase no suma errores.
- **Datos de prueba:** no se deja a nadie marcado para la web sin avisarle a Louis. Al fusionar, la
  página publicada mostraría a esas personas.

## Review Focus

- **Nadie marcado (así queda la base después de la migración):**
  - no aparece la sección, ni "Equipo" en el menú y las pestañas;
  - `/#s-equipo` abre la página sin errores.
  - Lo prueban la Task 5 (`seccionesPresentes`) y la Task 6.
- **Marcada pero inactiva:** no sale en la web. El panel avisa "Está inactiva: no saldrá en la web" y la
  tarjeta no lleva "En la web" (Task 2 y Task 3).
- **Sin foto o con foto rota:** van las iniciales, nunca el ícono de imagen rota. Si el nombre no deja
  iniciales, va la N (Task 2 `iniciales` y Task 4 `onError`).
- **1, 3 o 5 personas:**
  - la última fila queda centrada, sin una tarjeta sola pegada a la izquierda;
  - un nombre o cargo largo baja de línea sin salirse a 360 px.
  - Lo cubren la Task 4 y la Task 6.
- **Editar a alguien en el panel:**
  - cambiar solo el teléfono no borra su cargo ni sus especialidades;
  - un cargo en blanco se guarda como `null`, nunca `""`.
  - Lo cubren la Task 2 `textoONull` y la Task 3.

---

### Task 0: Rama de la fase (la hace el controlador)

- [ ] **Step 1:** La Fase 4 parte de la Fase 3, que todavía no está fusionada:
```bash
git switch claude/rediseno-fase-4-equipo 2>/dev/null || git switch -c claude/rediseno-fase-4-equipo claude/rediseno-fase-3-paquetes
```
Su PR apunta a `main` cuando el PR #9 esté fusionado. El plan ya está en esta rama.

---

### Task 1: Columnas del equipo en `staff` (la hace el controlador con el MCP de Supabase)

**Files:**
- Create: `vscode/supabase/migration_staff_equipo_web.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- Equipo en la web (spec §6.5 y §7). "Nuestro equipo" muestra a quien tenga mostrar_en_web = true y
-- active = true. anon lee staff columna por columna: cada columna nueva que la web lea necesita su grant.
-- authenticated tiene permisos de tabla; editar lo limita la RLS (solo admin).
alter table public.staff
  add column if not exists mostrar_en_web boolean not null default false,
  add column if not exists cargo_web text,
  add column if not exists especialidades_web text;

grant select (mostrar_en_web, cargo_web, especialidades_web) on public.staff to anon;
```

- [ ] **Step 2: Aplicarla** con `apply_migration`, con el nombre `staff_equipo_web` y ese SQL.

- [ ] **Step 3: Verificar**

```sql
select mostrar_en_web, count(*) from public.staff group by 1;
```
Expected: una sola fila, `false | 6`.

```sql
begin;
set local role anon;
select id, name, mostrar_en_web, cargo_web, especialidades_web from public.staff where mostrar_en_web = false limit 2;
rollback;
```
Expected: dos filas, sin error de permisos.

```sql
begin;
set local role anon;
select phone from public.staff limit 1;
rollback;
```
Expected: `permission denied for table staff`. anon sigue sin leer el teléfono.

- [ ] **Step 4: Commit**

```bash
git add vscode/supabase/migration_staff_equipo_web.sql
git commit -m "feat(base): quién sale en la web, su cargo y especialidades en staff"
```

---

### Task 2: Quién sale en la web, en qué orden y sus iniciales

**Files:**
- Create: `vscode/src/site/landing/equipo.ts`
- Test: `vscode/tests/equipo.test.ts`

**Interfaces:**
- Produces (lo usan la Task 3, la Task 4 y la Task 5):
  - `interface FilaEquipo { id: string; name: string | null; role: string | null; active: boolean | null; avatar_url: string | null; mostrar_en_web: boolean | null; cargo_web: string | null; especialidades_web: string | null }`
  - `interface MiembroPublico { id: string; nombre: string; cargo: string | null; especialidades: string | null; foto: string | null; iniciales: string }`
  - `textoONull(valor: string | null | undefined): string | null`
  - `iniciales(nombre: string): string`
  - `equipoPublico(filas: readonly FilaEquipo[]): MiembroPublico[]`

- [ ] **Step 1: Escribir las pruebas**

`vscode/tests/equipo.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { equipoPublico, iniciales, textoONull, type FilaEquipo } from '../src/site/landing/equipo.ts';

const fila = (extra: Partial<FilaEquipo>): FilaEquipo => ({
  id: 'x', name: 'Paola Jiménez', role: 'specialist', active: true, avatar_url: null,
  mostrar_en_web: true, cargo_web: null, especialidades_web: null, ...extra,
});

test('iniciales: primer nombre y último apellido, sin títulos ni paréntesis', () => {
  assert.equal(iniciales('Paola Jiménez'), 'PJ');
  assert.equal(iniciales('Anabel De los Santos'), 'AS');
  assert.equal(iniciales('Dra. Nadieska Soto'), 'NS');
  assert.equal(iniciales('Luisa Méndez (Recepción)'), 'LM');
  assert.equal(iniciales('Louis H.'), 'LH');
  assert.equal(iniciales('ángela ñúñez'), 'ÁÑ');
  assert.equal(iniciales('Carmen'), 'C');
});

test('iniciales: si el nombre no deja letras, vacío (la tarjeta pone la N)', () => {
  assert.equal(iniciales('   '), '');
  assert.equal(iniciales('Dra.'), '');
});

test('textoONull: recorta, junta espacios y nunca devuelve ""', () => {
  assert.equal(textoONull('  Facial ·  Medicina estética '), 'Facial · Medicina estética');
  assert.equal(textoONull('   '), null);
  assert.equal(textoONull(''), null);
  assert.equal(textoONull(null), null);
  assert.equal(textoONull(undefined), null);
});

test('equipo: solo quien está marcada para la web y activa, y con nombre', () => {
  const r = equipoPublico([
    fila({ id: 'a', name: 'Ana' }),
    fila({ id: 'b', name: 'Bea', mostrar_en_web: false }),
    fila({ id: 'c', name: 'Cris', active: false }),
    fila({ id: 'd', name: 'Dora', mostrar_en_web: null }),
    fila({ id: 'e', name: '   ' }),
  ]);
  assert.deepEqual(r.map((m) => m.id), ['a']);
});

test('equipo: la administración primero y después por nombre, con los acentos bien ordenados', () => {
  const r = equipoPublico([
    fila({ id: '1', name: 'Paola Jiménez' }),
    fila({ id: '2', name: 'Ángela Ruiz' }),
    fila({ id: '3', name: 'Zoila Pérez', role: 'admin' }),
    fila({ id: '4', name: 'Carmen Rodríguez' }),
  ]);
  assert.deepEqual(r.map((m) => m.nombre), ['Zoila Pérez', 'Ángela Ruiz', 'Carmen Rodríguez', 'Paola Jiménez']);
});

test('equipo: textos en blanco quedan en null y una foto en blanco no cuenta', () => {
  const [m] = equipoPublico([fila({
    name: ' Dra. Nadieska Soto ', cargo_web: '  ', especialidades_web: 'Facial · Medicina estética', avatar_url: '',
  })]);
  assert.deepEqual(m, {
    id: 'x', nombre: 'Dra. Nadieska Soto', cargo: null, especialidades: 'Facial · Medicina estética',
    foto: null, iniciales: 'NS',
  });
});

test('equipo: sin filas, nadie', () => {
  assert.deepEqual(equipoPublico([]), []);
});
```

- [ ] **Step 2: Correr las pruebas y ver que fallan**

Run: `cd vscode && npm test`
Expected: FAIL, porque no existe `../src/site/landing/equipo.ts`.

- [ ] **Step 3: Escribir `equipo.ts`**

`vscode/src/site/landing/equipo.ts`:
```ts
// Equipo en la web (spec §6.5): quién sale en "Nuestro equipo" y cómo. Sin imports: se prueba con Node.

/** Fila de `staff` tal como la lee la página (solo columnas autorizadas a anon). */
export interface FilaEquipo {
  id: string;
  name: string | null;
  role: string | null;
  active: boolean | null;
  avatar_url: string | null;
  mostrar_en_web: boolean | null;
  cargo_web: string | null;
  especialidades_web: string | null;
}

export interface MiembroPublico {
  id: string;
  nombre: string;
  cargo: string | null;
  especialidades: string | null;
  foto: string | null;
  /** para el arco sin foto; vacío si el nombre no deja ninguna (entonces va la N) */
  iniciales: string;
}

/** Texto libre del panel: sin espacios de sobra y null si queda vacío, así nunca se guarda "". */
export function textoONull(valor: string | null | undefined): string | null {
  const t = (valor ?? '').replace(/\s+/g, ' ').trim();
  return t || null;
}

// tratamientos que no cuentan para las iniciales ("Dra. Nadieska Soto" → NS)
const TITULOS = new Set(['dr', 'dra', 'lic', 'lcda', 'lcdo', 'ing', 'sr', 'sra', 'srta']);

/** Primera letra del primer nombre y del último apellido, sin paréntesis ni títulos. */
export function iniciales(nombre: string): string {
  const palabras = nombre
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s+/)
    .map((p) => p.replace(/[^\p{L}]/gu, ''))
    .filter((p) => p && !TITULOS.has(p.toLocaleLowerCase('es')));
  if (!palabras.length) return '';
  const primera = palabras[0][0];
  const ultima = palabras.length > 1 ? palabras[palabras.length - 1][0] : '';
  return (primera + ultima).toLocaleUpperCase('es');
}

/**
 * Quienes salen en la web: marcadas, activas y con nombre. Primero la administración (la dueña) y
 * después por nombre, como en el boceto.
 */
export function equipoPublico(filas: readonly FilaEquipo[]): MiembroPublico[] {
  return filas
    .filter((f) => f.mostrar_en_web === true && f.active === true)
    .map((f) => ({ f, nombre: textoONull(f.name) }))
    .filter((x): x is { f: FilaEquipo; nombre: string } => x.nombre !== null)
    .sort((a, b) =>
      Number(b.f.role === 'admin') - Number(a.f.role === 'admin') ||
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
    .map(({ f, nombre }) => ({
      id: String(f.id),
      nombre,
      cargo: textoONull(f.cargo_web),
      especialidades: textoONull(f.especialidades_web),
      foto: textoONull(f.avatar_url),
      iniciales: iniciales(nombre),
    }));
}
```

- [ ] **Step 4: Correr las pruebas y ver que pasan**

Run: `cd vscode && npm test`
Expected: PASS, 51 pruebas: las 44 de antes y 7 nuevas.

- [ ] **Step 5: Revisar los caracteres y hacer el commit**

```bash
grep -c "·\|→" vscode/src/site/landing/equipo.ts vscode/tests/equipo.test.ts
git add vscode/src/site/landing/equipo.ts vscode/tests/equipo.test.ts
git commit -m "feat(sitio): quién sale en el equipo de la web, en qué orden y con qué iniciales"
```
El `grep` debe contar al menos 1 en cada archivo: el "→" del comentario y el "·" de las pruebas.

---

### Task 3: Campos de la web en la página Equipo del panel

**Files:**
- Modify: `vscode/src/lib/database.types.ts`: `staff`, en Row, Insert y Update
- Modify: `vscode/src/store/staffStore.ts` (CRLF)
- Modify: `vscode/src/pages/admin/Staff.tsx` (CRLF)
- Modify: `vscode/src/pages/admin/Staff.css`

**Interfaces:**
- Consumes: `textoONull` de `src/site/landing/equipo.ts` (Task 2).
- Produces: `StaffMember.mostrarEnWeb: boolean`, `StaffMember.cargoWeb: string | null` y
  `StaffMember.especialidadesWeb: string | null`. Con los tipos de `staff` la Task 5 puede filtrar por
  `mostrar_en_web` con el cliente tipado.

- [ ] **Step 1: Tipos de la base.** En `database.types.ts`, dentro de `staff`, agrega en orden alfabético,
  como el resto:
  - en `Row`: `cargo_web: string | null`, `especialidades_web: string | null` y `mostrar_en_web: boolean`;
  - en `Insert` y `Update`: `cargo_web?: string | null`, `especialidades_web?: string | null` y
    `mostrar_en_web?: boolean`.

- [ ] **Step 2: Store.** En `staffStore.ts`, con CRLF:

En `StaffMember`, después de `avatarUrl`:
```ts
  /** Página web (spec §6.5): sale en "Nuestro equipo" si además está activa */
  mostrarEnWeb: boolean;
  cargoWeb: string | null;
  especialidadesWeb: string | null;
```
En `mapRow`, después de `avatarUrl`:
```ts
    mostrarEnWeb: r.mostrar_en_web ?? false,
    cargoWeb: r.cargo_web ?? null,
    especialidadesWeb: r.especialidades_web ?? null,
```
En el `insert` de `addStaff`, después de `avatar_url`:
```ts
        mostrar_en_web: s.mostrarEnWeb,
        cargo_web: s.cargoWeb,
        especialidades_web: s.especialidadesWeb,
```
En `updateStaff`, después de la línea de `avatarUrl`:
```ts
    if (updates.mostrarEnWeb !== undefined) db.mostrar_en_web = updates.mostrarEnWeb;
    if (updates.cargoWeb !== undefined) db.cargo_web = updates.cargoWeb;
    if (updates.especialidadesWeb !== undefined) db.especialidades_web = updates.especialidadesWeb;
```

- [ ] **Step 3: Formulario.** En `Staff.tsx`, con CRLF:
  1. Suma `Globe` a la importación de `lucide-react` y agrega
     `import { textoONull } from '../../site/landing/equipo';`.
  2. En `emptyForm`: `mostrarEnWeb: false, cargoWeb: null, especialidadesWeb: null,`.
  3. En `openEdit`, dentro del `setForm`:
     `mostrarEnWeb: m.mostrarEnWeb, cargoWeb: m.cargoWeb, especialidadesWeb: m.especialidadesWeb,`.
  4. En el `payload` de `handleSubmit`, después de `email`:
     ```ts
        cargoWeb: textoONull(form.cargoWeb),
        especialidadesWeb: textoONull(form.especialidadesWeb),
     ```
  5. En el interruptor "Estado", cambia el `<span style={{ marginLeft: 8, fontSize: '0.85rem', color:
     'rgba(255,255,255,0.6)' }}>` por `<span className="staff-toggle__txt">`. Con el color fijo, el
     texto no se veía en el tema claro.
  6. Justo antes de `<div className="modal__actions">`, agrega el bloque:
```tsx
              {/* Página web (spec §6.5): quién sale en "Nuestro equipo" */}
              <fieldset className="staff-web">
                <legend className="staff-web__titulo"><Globe size={14} /> Página web</legend>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={form.mostrarEnWeb}
                    onChange={(e) => setForm({ ...form, mostrarEnWeb: e.target.checked })}
                  />
                  <span className="toggle-slider" />
                  <span className="staff-toggle__txt">Mostrar en la página web</span>
                </label>
                {form.mostrarEnWeb && (
                  <>
                    <div className="modal__row">
                      <div className="modal__field">
                        <label htmlFor="staff-cargo-web">Cargo para la web</label>
                        <input
                          id="staff-cargo-web"
                          type="text"
                          maxLength={60}
                          placeholder="Médico estético y cosmiatra"
                          value={form.cargoWeb ?? ''}
                          onChange={(e) => setForm({ ...form, cargoWeb: e.target.value })}
                        />
                      </div>
                      <div className="modal__field">
                        <label htmlFor="staff-especialidades-web">Especialidades para la web</label>
                        <input
                          id="staff-especialidades-web"
                          type="text"
                          maxLength={80}
                          placeholder="Facial · Medicina estética"
                          value={form.especialidadesWeb ?? ''}
                          onChange={(e) => setForm({ ...form, especialidadesWeb: e.target.value })}
                        />
                      </div>
                    </div>
                    {(!form.active || !form.avatarUrl) && (
                      <p className="staff-web__aviso">
                        {!form.active && 'Está inactiva: no saldrá en la web hasta activarla. '}
                        {!form.avatarUrl && 'Sin foto, la web muestra sus iniciales.'}
                      </p>
                    )}
                  </>
                )}
              </fieldset>
```
  7. En la tarjeta de cada persona, dentro de `staff-card__name-role` y después del `<span>` del rol:
```tsx
                    {m.active && m.mostrarEnWeb && (
                      <span className="staff-card__web-badge" title="Aparece en «Nuestro equipo» de la página web">
                        <Globe size={10} /> En la web
                      </span>
                    )}
```

- [ ] **Step 4: Estilos.** Al final de `Staff.css`:
```css
/* Página web (spec §6.5) */
.staff-web {
  display: grid;
  gap: 12px;
  min-width: 0;
  margin: 0;
  padding: 12px 16px 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.staff-web__titulo {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

.staff-toggle__txt {
  margin-left: 8px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

/* el input del interruptor está oculto: el foco del teclado se ve en la perilla */
.toggle-switch input:focus-visible + .toggle-slider {
  outline: 2px solid #B2967D;
  outline-offset: 2px;
}

.staff-web__aviso {
  margin: 0;
  font-size: 0.8rem;
  color: #fbbf24;
}

.staff-card__web-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  margin-top: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 600;
  background: rgba(178, 150, 125, 0.15);
  color: #d8c3ae;
}

[data-theme="light"] .staff-web { border-color: rgba(74, 52, 42, 0.12); }
[data-theme="light"] .staff-web__titulo,
[data-theme="light"] .staff-toggle__txt { color: var(--muted); }
[data-theme="light"] .staff-web__aviso { color: #92400e; }
[data-theme="light"] .staff-card__web-badge { background: rgba(125, 90, 68, 0.1); color: #7D5A44; }
```

- [ ] **Step 5: Tipos, pruebas y compilación**

```bash
cd vscode
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -E "Staff.tsx|staffStore|database.types"
npm test
npm run build
```
Expected:
- 40 errores, igual que la línea base;
- en `Staff.tsx` solo los 5 de siempre, y ninguno en `staffStore` ni en `database.types`;
- 51 pruebas pasan;
- la compilación termina con `✓ built`.

- [ ] **Step 6: Revisar el fin de línea y hacer el commit**

```bash
file vscode/src/pages/admin/Staff.tsx vscode/src/store/staffStore.ts
grep -c "·\|«" vscode/src/pages/admin/Staff.tsx
git add vscode/src/lib/database.types.ts vscode/src/store/staffStore.ts vscode/src/pages/admin/Staff.tsx vscode/src/pages/admin/Staff.css
git commit -m "feat(panel): mostrar en la página web, cargo y especialidades en Equipo"
```
`file` debe decir "with CRLF line terminators" en los dos, y el `grep` debe contar al menos 2.

---

### Task 4: Sección "Nuestro equipo"

**Files:**
- Create: `vscode/src/site/landing/Team.tsx`
- Create: `vscode/src/site/landing/Team.css`

**Interfaces:**
- Consumes: `MiembroPublico` (Task 2), `MONOGRAMA` de `../brand` y `useRevela` de `../ui/useRevela`.
- Produces: `export default function Team({ miembros }: { miembros: MiembroPublico[] })`. Pinta
  `<section id="s-equipo" data-spy="">` y solo se usa cuando hay alguien (Task 5).

- [ ] **Step 1: Componente**

`vscode/src/site/landing/Team.tsx`:
```tsx
import { useState } from 'react';
import { MONOGRAMA } from '../brand';
import { useRevela } from '../ui/useRevela';
import type { MiembroPublico } from './equipo';
import './Team.css';

/** Nuestro equipo: retratos en arco con nombre, cargo y especialidades, sin carrusel (spec §5.7 y §6.5). */
export default function Team({ miembros }: { miembros: MiembroPublico[] }) {
  const cabeza = useRevela<HTMLDivElement>();
  const grilla = useRevela<HTMLUListElement>();
  return (
    <section className="s-sec s-team" id="s-equipo" data-spy="">
      <div className="s-wrap">
        <div className="s-sec-head s-rv" ref={cabeza}>
          <div>
            <p className="s-eyebrow">Nuestro equipo</p>
            <h2 className="s-display s-h2">Manos <em>expertas</em> que te cuidan</h2>
          </div>
          <p className="s-lead">Cada tratamiento lo realiza una especialista formada en su área. Al reservar, puedes elegir con quién.</p>
        </div>
        <ul className="s-team-grid s-rv" ref={grilla}>
          {miembros.map((m) => <Miembro key={m.id} m={m} />)}
        </ul>
      </div>
    </section>
  );
}

function Miembro({ m }: { m: MiembroPublico }) {
  // si la foto no carga (borrada del almacenamiento), van las iniciales en vez del ícono roto
  const [fotoRota, setFotoRota] = useState(false);
  const foto = fotoRota ? null : m.foto;
  return (
    <li className="s-tm">
      <div className={foto ? 's-arco s-tm-arco' : 's-arco s-tm-arco is-ph'}>
        {foto ? (
          // el nombre va justo debajo: la foto no repite nada al lector de pantalla
          <img src={foto} alt="" loading="lazy" decoding="async" onError={() => setFotoRota(true)} />
        ) : m.iniciales ? (
          <span className="s-tm-ini" aria-hidden="true">{m.iniciales}</span>
        ) : (
          <img src={MONOGRAMA} alt="" />
        )}
      </div>
      <h3 className="s-display s-tm-nombre">{m.nombre}</h3>
      {m.cargo && <p className="s-tm-cargo">{m.cargo}</p>}
      {m.especialidades && <p className="s-tm-tags">{m.especialidades}</p>}
    </li>
  );
}
```

- [ ] **Step 2: Estilos**

`vscode/src/site/landing/Team.css`:
```css
/* Nuestro equipo (boceto land-v4, .team). Celular primero: 2 columnas, sin carrusel. */
.s-team{ background:var(--s-bg-alt) }
/* flex y no grid: la última fila incompleta (1, 3 o 5 personas) queda centrada */
.s-team-grid{ display:flex; flex-wrap:wrap; justify-content:center; gap:22px 14px; margin:0; padding:0; list-style:none }
.s-tm{ flex:0 0 calc((100% - 14px) / 2); min-width:0; text-align:center }
.s-tm-arco{ aspect-ratio:4/5.2; border-radius:999px 999px 20px 20px; margin-bottom:14px }
.s-tm-arco img{ object-position:50% 18% }
.s-tm-ini{ font-family:var(--s-f-display); font-size:34px; line-height:1; color:var(--s-accent) }
.s-tm-nombre{ font-size:17px; line-height:1.2; margin:0 0 6px; overflow-wrap:anywhere }
.s-tm-cargo{ font-size:12.5px; line-height:1.45; color:var(--s-soft); margin:0 0 8px; overflow-wrap:anywhere }
.s-tm-tags{ font-size:10.5px; line-height:1.6; letter-spacing:.1em; text-transform:uppercase; color:var(--s-accent); margin:0; overflow-wrap:anywhere }

@media (min-width: 761px){
  .s-team-grid{ gap:28px 22px }
  /* en tableta 2 por fila, pero sin retratos gigantes */
  .s-tm{ flex-basis:calc((100% - 22px) / 2); max-width:300px }
  .s-tm-ini{ font-size:42px }
  .s-tm-nombre{ font-size:20px }
  .s-tm-cargo{ font-size:13.5px }
  .s-tm-tags{ font-size:11px; letter-spacing:.14em }
}
@media (min-width: 1101px){
  .s-team-grid{ gap:26px }
  .s-tm{ flex-basis:calc((100% - 3 * 26px) / 4); max-width:none }
  .s-tm-arco{ margin-bottom:18px }
  .s-tm-nombre{ font-size:21px }
}
```
En `.s-arco.is-ph` (de `landing.css`), la N va a 34 px con la opacidad baja. El `.s-tm-ini` no la toca.

- [ ] **Step 3: Compilación**

```bash
cd vscode
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site"
npm run build
```
Expected: `0` y `✓ built`. La sección todavía no se usa: la conecta la Task 5.

- [ ] **Step 4: Commit**

```bash
git add vscode/src/site/landing/Team.tsx vscode/src/site/landing/Team.css
git commit -m "feat(sitio): sección Nuestro equipo con retratos en arco"
```

---

### Task 5: Equipo en la página y una sola lista de secciones presentes

**Files:**
- Modify: `vscode/src/site/header/secciones.ts`
- Modify: `vscode/tests/secciones.test.ts`
- Modify: `vscode/src/site/landing/useDatosPublicos.ts`
- Modify: `vscode/src/pages/LandingPage.tsx`

**Interfaces:**
- Consumes:
  - `equipoPublico`, `FilaEquipo` y `MiembroPublico` (Task 2);
  - los tipos de `staff` (Task 3);
  - `Team` (Task 4).
- Produces:
  - `interface Presencia { paquetes: boolean; equipo: boolean; opiniones: boolean }`;
  - `seccionesPresentes(p: Presencia): string[]`;
  - `useEquipoPublico(): MiembroPublico[]`.

- [ ] **Step 1: Escribir las pruebas.** Agrega al final de `vscode/tests/secciones.test.ts`, y suma
  `seccionesPresentes` a la importación de `../src/site/header/secciones.ts`:
```ts
test('secciones presentes: sin paquetes, equipo ni opiniones quedan las 4 fijas', () => {
  assert.deepEqual(
    seccionesPresentes({ paquetes: false, equipo: false, opiniones: false }),
    ['s-inicio', 's-servicios', 's-nosotros', 's-contacto'],
  );
});

test('secciones presentes: Equipo va entre Nosotros y Opiniones, en el orden de la página', () => {
  assert.deepEqual(
    seccionesPresentes({ paquetes: false, equipo: true, opiniones: false }),
    ['s-inicio', 's-servicios', 's-nosotros', 's-equipo', 's-contacto'],
  );
  assert.deepEqual(
    seccionesPresentes({ paquetes: true, equipo: true, opiniones: true }),
    SECCIONES.map((s) => s.id),
  );
});
```

- [ ] **Step 2: Correr las pruebas y ver que fallan**

Run: `cd vscode && npm test`
Expected: FAIL, porque `seccionesPresentes` no existe.

- [ ] **Step 3: `seccionesPresentes`.** Al final de `secciones.ts`:
```ts
/** Lo que la página tiene hoy: estas secciones dependen de datos y solo están si hay qué mostrar. */
export interface Presencia { paquetes: boolean; equipo: boolean; opiniones: boolean }

const OPCIONALES: Record<string, keyof Presencia> = {
  's-paquetes': 'paquetes',
  's-equipo': 'equipo',
  's-opiniones': 'opiniones',
};

/** Ids de las secciones presentes, en el orden de la página. La misma lista pinta la página y arma el menú. */
export function seccionesPresentes(p: Presencia): string[] {
  return SECCIONES.map((s) => s.id).filter((id) => {
    const clave = OPCIONALES[id];
    return clave ? p[clave] : true;
  });
}
```

- [ ] **Step 4: Correr las pruebas y ver que pasan**

Run: `cd vscode && npm test`
Expected: PASS, 53 pruebas.

- [ ] **Step 5: `useEquipoPublico`.** En `useDatosPublicos.ts`, suma
  `import { equipoPublico, type FilaEquipo, type MiembroPublico } from './equipo';` y agrega al final:
```ts
/** Quienes la dueña marcó en el panel para la web y están activas. Sin red o sin permiso: nadie, y no hay sección. */
export function useEquipoPublico(): MiembroPublico[] {
  const [equipo, setEquipo] = useState<MiembroPublico[]>([]);
  useEffect(() => {
    let vivo = true;
    supabase
      .from('staff')
      .select('id, name, role, active, avatar_url, mostrar_en_web, cargo_web, especialidades_web')
      .eq('mostrar_en_web', true)
      .eq('active', true)
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error) { console.warn('No se pudo leer el equipo:', error.message); return; }
        setEquipo(equipoPublico((data ?? []) as unknown as FilaEquipo[]));
      });
    return () => { vivo = false; };
  }, []);
  return equipo;
}
```

- [ ] **Step 6: La página.** `vscode/src/pages/LandingPage.tsx` queda así:
```tsx
import SiteLayout from '../site/SiteLayout';
// primero los estilos comunes: los de cada sección se emiten después y les ganan por orden
import '../site/landing/landing.css';
import Hero from '../site/landing/Hero';
import TrustStrip from '../site/landing/TrustStrip';
import Services from '../site/landing/Services';
import Packages from '../site/landing/Packages';
import About from '../site/landing/About';
import Philosophy from '../site/landing/Philosophy';
import Team from '../site/landing/Team';
import Testimonials from '../site/landing/Testimonials';
import CtaBand from '../site/landing/CtaBand';
import Contact from '../site/landing/Contact';
import { useEquipoPublico, usePaquetesPublicos, useServiciosPublicos } from '../site/landing/useDatosPublicos';
import { seccionesPresentes } from '../site/header/secciones';
import { testimonios } from '../config/testimonios';

/**
 * Página principal (spec §5). Paquetes, Equipo y Opiniones dependen de datos: una sola lista decide qué
 * se pinta y qué ofrecen el menú y las pestañas.
 */
export default function LandingPage() {
  const servicios = useServiciosPublicos();
  const { paquetes, estilo } = usePaquetesPublicos();
  const equipo = useEquipoPublico();
  const secciones = seccionesPresentes({
    paquetes: paquetes.length > 0, // sin paquetes activos (o sin red) la sección no aparece
    equipo: equipo.length > 0, // nadie marcado para la web: tampoco
    opiniones: testimonios.length > 0,
  });
  const hay = (id: string) => secciones.includes(id);
  return (
    <SiteLayout conSecciones secciones={secciones}>
      <Hero />
      <TrustStrip />
      <Services servicios={servicios} />
      {hay('s-paquetes') && <Packages paquetes={paquetes} estilo={estilo} />}
      <About />
      <Philosophy />
      {hay('s-equipo') && <Team miembros={equipo} />}
      {hay('s-opiniones') && <Testimonials />}
      <CtaBand />
      <Contact />
    </SiteLayout>
  );
}
```

- [ ] **Step 7: Tipos, pruebas y compilación**

```bash
cd vscode
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site\|src/pages/LandingPage"
npm test
npm run build
```
Expected: 40 errores en total, 0 en estos archivos, 53 pruebas que pasan y `✓ built`.

- [ ] **Step 8: Commit**

```bash
git add vscode/src/site/header/secciones.ts vscode/tests/secciones.test.ts vscode/src/site/landing/useDatosPublicos.ts vscode/src/pages/LandingPage.tsx
git commit -m "feat(sitio): el equipo en la página principal y una sola lista de secciones presentes"
```

---

### Task 6: Revisión en el navegador (la hace el controlador)

El controlador no entra al panel, así que marca a las personas desde la base, **por un rato**. La
página publicada todavía no lee estas columnas, así que marcarlas no cambia nada para las clientas.

- [ ] **Step 1: Sin nadie marcado** (el estado después de la migración). Con el servidor
  `sitio-rediseno` (`.claude/launch.json`, puerto 5181), abre `/`:
  - no está la sección;
  - "Equipo" no aparece en el menú ni en las pestañas;
  - `/#s-equipo` abre arriba, sin errores en la consola.
- [ ] **Step 2: Marca a las tres especialistas de prueba**, con los textos del boceto. Antes de tocarlas,
  anota el estado: después de la Task 1 son `false`, `null`, `null` y sin foto.
```sql
update staff set mostrar_en_web = true, cargo_web = 'Médico estético y cosmiatra', especialidades_web = 'Facial · Medicina estética' where id = '22222222-0001-0001-0001-000000000003';
update staff set mostrar_en_web = true, cargo_web = 'Aparatología y corporal', especialidades_web = 'Blanqueamiento · HIFU' where id = '22222222-0001-0001-0001-000000000004';
update staff set mostrar_en_web = true, cargo_web = 'Cosmetóloga y masajista', especialidades_web = 'Depilación con cera' where id = '22222222-0001-0001-0001-000000000005';
```
  Recarga `/` y revisa en 360, 390, 430, 820, 1180, 1280 y 1440, en los dos temas:
  - salen las tres, en arco y con sus iniciales (CR, NS, PJ), ordenadas por nombre;
  - con tres personas, en celular y tableta van 2 arriba y 1 centrada abajo, y en PC las 3 van centradas
    en una fila;
  - nada se sale de la pantalla, y "Dra. Nadieska Soto" y los cargos bajan de línea bien;
  - "Equipo" aparece en el menú y en las pestañas, entre Nosotros y Opiniones, y se marca al bajar;
  - `/#s-equipo` baja hasta la sección.
- [ ] **Step 3: Fotos.** Pon por un rato una foto real y una rota, y revisa el recorte y las iniciales:
```sql
update staff set avatar_url = '/fotos/equipo-anabel.jpg' where id = '22222222-0001-0001-0001-000000000004';
update staff set avatar_url = 'https://example.invalid/no-existe.jpg' where id = '22222222-0001-0001-0001-000000000005';
```
  - la foto real llena el arco y la cara queda arriba (`object-position: 50% 18%`);
  - la rota muestra "PJ", sin ícono de imagen rota.
- [ ] **Step 4: Deja la base como estaba:**
```sql
update staff set mostrar_en_web = false, cargo_web = null, especialidades_web = null, avatar_url = null
where id in ('22222222-0001-0001-0001-000000000003', '22222222-0001-0001-0001-000000000004', '22222222-0001-0001-0001-000000000005');
select count(*) from staff where mostrar_en_web or avatar_url is not null;  -- 0
```
- [ ] **Step 5: Louis prueba en su panel** (Equipo → editar a alguien):
  - marca "Mostrar en la página web", escribe cargo y especialidades y guarda;
  - la tarjeta muestra "En la web", y la página muestra a esa persona;
  - vuelve a editarla, cambia solo el teléfono y guarda: el cargo y las especialidades siguen ahí;
  - revisa el formulario en el tema claro;
  - desmarca y guarda: la sección desaparece si no queda nadie.
- [ ] **Step 6:** Abre el PR "Rediseño fase 4: el equipo en la web", contra `main` cuando el PR #9
  esté fusionado.

## Al terminar la Fase 4

Sigue la **Fase 5**, `/reservar` en 3 pasos:
- la lógica de disponibilidad se mueve a `useBooking` sin cambiar su comportamiento;
- calendario de semana y mes, a 90 días;
- resumen fijo en PC y barra fija abajo en celular;
- confirmación con el depósito.

Hay que mantener los alias de `idDeHash` (ver el índice de planes).
