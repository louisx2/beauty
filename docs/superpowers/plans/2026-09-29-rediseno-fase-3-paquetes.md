# Rediseño · Fase 3: los 3 estilos de paquetes, elegibles en el panel — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La dueña elige en el panel (Configuración → "Página web") cómo se ven los paquetes en la página
principal. Hay tres estilos:
- **Membresía:** tarjeta chocolate con el logo;
- **Menú con foto:** el estilo actual, por defecto;
- **Ahorro:** tarjeta con foto y el sello "Ahorras X %".

**Architecture:**
- **Base de datos:** una columna nueva `settings.estilo_paquetes`, que es de lectura pública.
- **Qué se prueba:** el % de ahorro, el conteo de paquetes sin sello y la validación del estilo, como funciones puras en `src/site/landing/paquetes.ts`.
- **Página principal:** `usePaquetesPublicos` trae a la vez los paquetes (con el precio de su servicio) y el estilo, para que la sección no cambie de estilo después de pintarse. `Packages` queda como caparazón (título y "Cómo funciona") con un componente por estilo.
- **Panel:** la página de Configuración suma una tarjeta con tres miniaturas y un aviso.

**Tech Stack:** React 19 + TypeScript + Vite 7, react-router-dom 7, Supabase JS, CSS plano por componente y `node --test` (`npm test`).

**Spec:** `docs/superpowers/specs/2026-09-27-rediseno-web-clienta-design.md`: §6.4 estilos de paquetes, §7 cambios en la base y §3 sistema visual.

**Boceto aprobado:** `C:/Users/loui-/Desktop/ANABEL/bocetos-rediseno/paq-v1.html` (variantes A, B y C). Es la fuente de las medidas y los textos.

**Base que dejó la Fase 2** (rama `claude/beauty-landing-redesign-3780cc`, PR #8):
- `src/site/landing/`:
  - `Packages.tsx` y `.css` (estilo B y "Cómo funciona");
  - `paquetes.ts`, con `PaquetePublico`, `nombreCorto`, `precioPorSesion`, `indiceDestacado` y `fotoDePaquete`;
  - `useDatosPublicos.ts`;
  - `catalogo.ts`, con `formatoRD`.
- `src/site/brand.ts`, con `LOGO_CLARO`, `MONOGRAMA` y `FOTOS`.
- `src/site/theme/tokens.css`, con las variables `--s-*` y `--s-listones-oscuro`.

## Global Constraints

- **Paleta:** camel `#B2967D`, cocoa `#7D5A44`, linen `#F5F1EA`, khaki `#D7C9B8`, choco `#2A1E17`, crema `#FBF8F3`.
- **Colores:** el color sale de las variables `--s-*`. Dos elementos son siempre chocolate (en los dos temas) y redefinen las variables del tema marrón dentro de su propia clase, como la llamada final: la tarjeta de Membresía y el sello de Ahorro.
- **Estilos y valores (spec §6.4 y §7):** `settings.estilo_paquetes text not null default 'menu' check (estilo_paquetes in ('membresia','menu','ahorro'))`. Por defecto va "Menú con foto".
- **% de ahorro (spec §6.4-C):** `(precio del servicio × sesiones − precio del paquete) / (precio del servicio × sesiones)`, redondeado al entero.
  - Si el servicio no tiene precio, ese paquete va **sin sello** y sin precio tachado.
  - Tampoco lleva sello si el ahorro no llega a 1 %: nunca "Ahorras 0 %" ni un número negativo.
- **"Regalar un paquete"** (spec §6.4-A) queda apagado: no se construye.
- **Cortes:** celular ≤ 760 px, tableta 761–1100 px, computadora > 1100 px, de celular hacia arriba con `@media (min-width: 761px)` y `@media (min-width: 1101px)`.
- **Clases:** prefijo `s-` dentro de `.site`; en el panel se siguen las clases `settings-*` del archivo.
- **Calidad (spec §3.8):**
  - nada se sale de la pantalla;
  - zonas táctiles ≥ 44 px;
  - contraste AA;
  - efectos de mouse solo bajo `@media (hover:hover)`, sin cambiar la letra;
  - `prefers-reduced-motion` apaga las animaciones.
- **Código:** comentarios y nombres en español. `src/site/landing/paquetes.ts` se prueba con Node, así que sus imports llevan la extensión `.ts`.
- **Caracteres tipográficos:** los editores de algunos agentes cambian “ ” – — por ASCII sin avisar. Después de escribir un archivo que los tenga, se comprueban con `grep`.

## Review Focus

- **Hoy los servicios del panel tienen precio RD$ 0.**
  - En estilo Ahorro las tarjetas salen sin sello y sin precio tachado, sin "Ahorras 0 %" ni "RD$ 0".
  - El panel avisa cuántos paquetes quedarán así.
  - Lo cubren las pruebas de la Task 2 y la verificación de la Task 8.
- **Paquete más caro que las sesiones sueltas, o ahorro de menos de 1 %:** sin sello (Task 2).
- **Estilo desconocido o sin red:** si falla la lectura del estilo, o si la columna todavía no existiera, la página usa "Menú con foto" (Task 2 `estiloValido`, Task 3).
- **Guardar la configuración:**
  - cambiar el estilo y guardar no borra ni altera los datos bancarios ni los depósitos;
  - la base rechaza un valor que no sea uno de los tres (Task 1 y Task 7).
- **Contenido largo:** un servicio de nombre largo ("Limpieza Facial Express / Hidratación") no se sale de la tarjeta de Membresía, y un paquete de más de 10 sesiones no llena la fila de óvalos (Tasks 4–6).

---

### Task 0: Rama de la fase (la hace el controlador)

- [ ] **Step 1:** La Fase 3 parte de la Fase 2, que todavía no está fusionada. Si la rama no existe, créala:
```bash
git switch claude/rediseno-fase-3-paquetes 2>/dev/null || git switch -c claude/rediseno-fase-3-paquetes
```
Su PR apunta a `main` cuando el PR #8 esté fusionado. El plan ya está en esta rama.

---

### Task 1: Columna `settings.estilo_paquetes` (la hace el controlador con el MCP de Supabase)

**Files:**
- Create: `vscode/supabase/migration_settings_estilo_paquetes.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- Estilo de los paquetes en la página principal (spec §6.4 y §7).
-- 'menu' = Menú con foto (por defecto), 'membresia' = tarjeta de socia, 'ahorro' = sello de ahorro.
-- settings ya es de lectura pública (política public_read_settings y grant de tabla): no hace falta grant.
alter table public.settings
  add column if not exists estilo_paquetes text not null default 'menu';

alter table public.settings
  drop constraint if exists settings_estilo_paquetes_check;

alter table public.settings
  add constraint settings_estilo_paquetes_check
  check (estilo_paquetes in ('membresia', 'menu', 'ahorro'));
```

- [ ] **Step 2: Aplicarla** con `apply_migration`, con el nombre `settings_estilo_paquetes` y ese SQL.

- [ ] **Step 3: Verificar**

```sql
select estilo_paquetes from settings where id = 1;                  -- 'menu'
update settings set estilo_paquetes = 'otro' where id = 1;          -- debe fallar por el check
```
Expected: `menu`, y el `update` falla con `violates check constraint "settings_estilo_paquetes_check"`.

- [ ] **Step 4: Commit**

```bash
git add vscode/supabase/migration_settings_estilo_paquetes.sql
git commit -m "feat(base): estilo de los paquetes en settings (membresia, menu, ahorro)"
```

---

### Task 2: % de ahorro, paquetes sin sello y estilo válido

**Files:**
- Modify: `vscode/src/site/landing/paquetes.ts`
- Test: `vscode/tests/paquetes.test.ts`

**Interfaces:**
- Produces:
  - `PaquetePublico` suma `precioServicio: number`, con 0 cuando no hay precio;
  - `ESTILOS_PAQUETES`, `type EstiloPaquetes = 'membresia' | 'menu' | 'ahorro'` y `ESTILO_POR_DEFECTO = 'menu'`;
  - `estiloValido(valor: unknown): EstiloPaquetes`;
  - `porcentajeAhorro(p: Pick<PaquetePublico, 'precio' | 'sesiones' | 'precioServicio'>): number | null`;
  - `paquetesSinSello(paquetes: Pick<…>[]): number`.

- [ ] **Step 1: Escribir las pruebas que fallan.** Al final de `vscode/tests/paquetes.test.ts` agrega lo siguiente, y amplía el import de la línea 3 a
`import { ESTILO_POR_DEFECTO, estiloValido, fotoDePaquete, indiceDestacado, nombreCorto, paquetesSinSello, porcentajeAhorro, precioPorSesion } from '../src/site/landing/paquetes.ts';`

```ts
test('ahorro de los tres paquetes del boceto', () => {
  assert.equal(porcentajeAhorro({ precio: 6000, sesiones: 5, precioServicio: 1500 }), 20);
  assert.equal(porcentajeAhorro({ precio: 7500, sesiones: 3, precioServicio: 3000 }), 17);
  assert.equal(porcentajeAhorro({ precio: 9000, sesiones: 6, precioServicio: 1800 }), 17);
});

test('sin sello: servicio sin precio, sin sesiones, sin ahorro o con menos de 1 %', () => {
  assert.equal(porcentajeAhorro({ precio: 6000, sesiones: 5, precioServicio: 0 }), null);
  assert.equal(porcentajeAhorro({ precio: 6000, sesiones: 0, precioServicio: 1500 }), null);
  assert.equal(porcentajeAhorro({ precio: 8000, sesiones: 5, precioServicio: 1500 }), null);
  assert.equal(porcentajeAhorro({ precio: 4990, sesiones: 5, precioServicio: 1000 }), null);
});

test('aviso del panel: cuántos paquetes quedarían sin sello', () => {
  assert.equal(paquetesSinSello([
    { precio: 6000, sesiones: 5, precioServicio: 1500 },
    { precio: 7500, sesiones: 3, precioServicio: 0 },
    { precio: 9000, sesiones: 6, precioServicio: 0 },
  ]), 2);
  assert.equal(paquetesSinSello([]), 0);
});

test('estilo desde la base: uno de los tres o "Menú con foto"', () => {
  assert.equal(ESTILO_POR_DEFECTO, 'menu');
  assert.equal(estiloValido('ahorro'), 'ahorro');
  assert.equal(estiloValido('membresia'), 'membresia');
  assert.equal(estiloValido('rarito'), 'menu');
  assert.equal(estiloValido(null), 'menu');
  assert.equal(estiloValido(undefined), 'menu');
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd vscode && npm test`
Expected: FAIL: `does not provide an export named 'ESTILO_POR_DEFECTO'` (o similar).

- [ ] **Step 3: Implementar en `vscode/src/site/landing/paquetes.ts`**
- Cambia la línea del comentario inicial por:
  `// Paquetes en la página principal: sus 3 estilos (spec §6.4), foto, precio por sesión y % de ahorro. Puro para probarlo.`
- Reemplaza `export interface PaquetePublico { … }` por:
  ```ts
  /** precioServicio: precio de una sesión suelta del servicio del paquete; 0 si no tiene precio cargado. */
  export interface PaquetePublico {
    id: string;
    nombre: string;
    sesiones: number;
    precio: number;
    servicio: string | null;
    precioServicio: number;
  }
  ```
- Agrega al final del archivo:
  ```ts
  /** Estilos de la sección de paquetes, elegibles en el panel (spec §6.4). */
  export const ESTILOS_PAQUETES = ['membresia', 'menu', 'ahorro'] as const;
  export type EstiloPaquetes = (typeof ESTILOS_PAQUETES)[number];
  export const ESTILO_POR_DEFECTO: EstiloPaquetes = 'menu';

  /** Lo que venga de la base; si no es un estilo conocido, "Menú con foto". */
  export function estiloValido(valor: unknown): EstiloPaquetes {
    return (ESTILOS_PAQUETES as readonly unknown[]).includes(valor) ? (valor as EstiloPaquetes) : ESTILO_POR_DEFECTO;
  }

  type ConPrecios = Pick<PaquetePublico, 'precio' | 'sesiones' | 'precioServicio'>;

  /**
   * % que se ahorra frente a pagar cada sesión suelta (spec §6.4-C):
   * (precio del servicio × sesiones − precio del paquete) / (precio del servicio × sesiones).
   * null = sin sello: el servicio no tiene precio, no hay sesiones o el ahorro no llega a 1 %.
   */
  export function porcentajeAhorro(p: ConPrecios): number | null {
    if (p.precioServicio <= 0 || p.sesiones <= 0) return null;
    const suelto = p.precioServicio * p.sesiones;
    const pct = Math.round(((suelto - p.precio) / suelto) * 100);
    return pct >= 1 ? pct : null;
  }

  /** Cuántos paquetes saldrían sin sello en el estilo Ahorro (para el aviso del panel). */
  export function paquetesSinSello(paquetes: ConPrecios[]): number {
    return paquetes.filter((p) => porcentajeAhorro(p) === null).length;
  }
  ```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd vscode && npm test`
Expected: `ℹ pass 44` y `ℹ fail 0`.

- [ ] **Step 5: Tipos.** `useDatosPublicos.ts` todavía no llena `precioServicio`, así que `tsc` lo marca. Se arregla en la Task 3.

Run: `cd vscode && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep "src/site"`
Expected: una sola línea de error, en `src/site/landing/useDatosPublicos.ts`, por falta de `precioServicio`. Anótala en el reporte.

- [ ] **Step 6: Commit**

```bash
git add vscode/src/site/landing/paquetes.ts vscode/tests/paquetes.test.ts
git commit -m "feat(sitio): porcentaje de ahorro de los paquetes y estilo válido"
```

---

### Task 3: Los paquetes traen el precio de su servicio y el estilo elegido

**Files:**
- Modify: `vscode/src/site/landing/useDatosPublicos.ts` (`usePaquetesPublicos`)
- Modify: `vscode/src/store/settingsStore.ts`

**Interfaces:**
- Produces:
  - `usePaquetesPublicos(): { cargando: boolean; paquetes: PaquetePublico[]; estilo: EstiloPaquetes }`, que llega todo junto: la sección aparece una sola vez, ya en su estilo;
  - `Settings` suma `estilo_paquetes: EstiloPaquetes`.

- [ ] **Step 1:** En `vscode/src/site/landing/useDatosPublicos.ts`:
- Cambia `import type { PaquetePublico } from './paquetes';` por
  `import { ESTILO_POR_DEFECTO, estiloValido, type EstiloPaquetes, type PaquetePublico } from './paquetes';`
- En `interface FilaPaquete`, la línea `services: …` pasa a ser
  `services: { name: string; price: number | string | null } | { name: string; price: number | string | null }[] | null;`
- Reemplaza la función `usePaquetesPublicos` completa por:
  ```ts
  /**
   * Paquetes activos, del más barato al más caro, y el estilo elegido en el panel. Llegan juntos, así la
   * sección aparece una sola vez y ya en su estilo. Si falla la red: sin paquetes (la sección no aparece)
   * y estilo "Menú con foto".
   */
  export function usePaquetesPublicos(): { cargando: boolean; paquetes: PaquetePublico[]; estilo: EstiloPaquetes } {
    const [estado, setEstado] = useState<{ cargando: boolean; paquetes: PaquetePublico[]; estilo: EstiloPaquetes }>(
      { cargando: true, paquetes: [], estilo: ESTILO_POR_DEFECTO },
    );
    useEffect(() => {
      let vivo = true;
      Promise.all([
        supabase.from('session_packages').select('id, name, sessions, price, services(name, price)').eq('active', true).order('price'),
        supabase.from('settings').select('estilo_paquetes').eq('id', 1).maybeSingle(),
      ]).then(([paq, conf]) => {
        if (!vivo) return;
        if (paq.error) console.warn('No se pudieron leer los paquetes:', paq.error.message);
        if (conf.error) console.warn('No se pudo leer el estilo de los paquetes:', conf.error.message);
        const filas = (paq.data ?? []) as unknown as FilaPaquete[];
        const paquetes = filas.map((p) => {
          const sv = Array.isArray(p.services) ? p.services[0] : p.services;
          return {
            id: String(p.id),
            nombre: String(p.name),
            sesiones: Number(p.sessions) || 0,
            precio: Number(p.price) || 0,
            servicio: sv?.name ?? null,
            precioServicio: Number(sv?.price) || 0,
          };
        });
        const estilo = estiloValido((conf.data as { estilo_paquetes?: unknown } | null)?.estilo_paquetes);
        setEstado({ cargando: false, paquetes, estilo });
      });
      return () => { vivo = false; };
    }, []);
    return estado;
  }
  ```

- [ ] **Step 2:** En `vscode/src/store/settingsStore.ts`:
- Debajo de `import { toast } from 'react-hot-toast';` agrega
  `import type { EstiloPaquetes } from '../site/landing/paquetes';`.
- En `interface Settings`, debajo de `package_deposit_value: number;`, agrega:
  ```ts
    /** cómo se ven los paquetes en la página principal (Configuración → Página web) */
    estilo_paquetes: EstiloPaquetes;
  ```
- En `DEFAULTS`, debajo de `package_deposit_value: 500,`, agrega `estilo_paquetes: 'menu',`.
- En `fetchSettings`, el `.select('…')` suma `, estilo_paquetes` al final de la lista:
  `.select('deposit_amount, bank_name, account_number, account_name, bank_accounts, whatsapp_number, package_deposit_type, package_deposit_value, estilo_paquetes')`.

- [ ] **Step 3: Pruebas, tipos y compilación**

Run: `cd vscode && npm test && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site\|src/store/settingsStore\|src/pages/LandingPage" ; npm run build 2>&1 | tail -2`
Expected: `ℹ pass 44`, luego `0` y `✓ built in`. `LandingPage` sigue igual y usa solo `paquetes`.

- [ ] **Step 4: Commit**

```bash
git add vscode/src/site/landing/useDatosPublicos.ts vscode/src/store/settingsStore.ts
git commit -m "feat(sitio): los paquetes traen el precio de su servicio y el estilo elegido en el panel"
```

---

### Task 4: Óvalos de sesiones compartidos y `Packages` como caparazón (sin cambio visible)

Esta tarea reordena el código para que cada estilo sea su propio componente. La página debe verse
exactamente igual que antes.

**Files:**
- Create: `vscode/src/site/ui/SesionesOvalos.tsx`, `vscode/src/site/ui/SesionesOvalos.css`
- Create: `vscode/src/site/landing/PaquetesMenu.tsx`, `vscode/src/site/landing/PaquetesMenu.css`
- Modify (reemplazo completo): `vscode/src/site/landing/Packages.tsx`, `vscode/src/site/landing/Packages.css`
- Modify: `vscode/src/site/theme/tokens.css` (clase `.s-sr`)
- Modify: `vscode/src/pages/LandingPage.tsx` (pasa el estilo)

**Interfaces:**
- Produces:
  - `SesionesOvalos` con props `{ sesiones: number; conTexto?: boolean; className?: string }`. Con `conTexto={false}` es decorativo (`aria-hidden`);
  - `PaquetesMenu` con props `{ paquetes: PaquetePublico[]; destacado: number }`;
  - `Packages` con props `{ paquetes: PaquetePublico[]; estilo: EstiloPaquetes }`;
  - la clase `.s-sr` (solo para lectores de pantalla).

- [ ] **Step 1: `vscode/src/site/ui/SesionesOvalos.tsx` y `.css`**

```tsx
import './SesionesOvalos.css';

const MAX = 10; // más de 10 sesiones se dicen con el número, sin llenar la fila

interface Props { sesiones: number; conTexto?: boolean; className?: string }

/** Sesiones de un paquete en óvalos, como los letreros del salón (spec §3.4). Sin texto es decorativo. */
export default function SesionesOvalos({ sesiones, conTexto = true, className = '' }: Props) {
  return (
    <div className={`s-ovalos ${className}`} aria-hidden={conTexto ? undefined : true}>
      {Array.from({ length: Math.min(sesiones, MAX) }, (_, k) => <i key={k} aria-hidden="true" />)}
      {conTexto && <span>{sesiones} {sesiones === 1 ? 'sesión' : 'sesiones'}</span>}
    </div>
  );
}
```

```css
/* sesiones en óvalos, como los letreros del salón */
.s-ovalos{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; color:var(--s-accent) }
.s-ovalos i{ display:block; width:12px; height:22px; border-radius:999px; border:1px solid currentColor }
.s-ovalos span{ margin-left:8px; font-size:12px; letter-spacing:.14em; text-transform:uppercase }
```

- [ ] **Step 2: `.s-sr` en `vscode/src/site/theme/tokens.css`.** Agrega justo antes del bloque `@media (prefers-reduced-motion: reduce)`:

```css
/* texto solo para lectores de pantalla */
.s-sr{ position:absolute; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; border:0 }
```

- [ ] **Step 3: `vscode/src/site/landing/PaquetesMenu.tsx`.** Es el estilo B, con el mismo marcado de hoy, ahora como componente propio.

```tsx
import { Link } from 'react-router-dom';
import { formatoRD } from './catalogo';
import { fotoDePaquete, nombreCorto, precioPorSesion, type PaquetePublico } from './paquetes';
import SesionesOvalos from '../ui/SesionesOvalos';
import { MONOGRAMA } from '../brand';
import './PaquetesMenu.css';

/** Estilo B · Menú con foto: una fila por paquete con la foto del servicio en arco (spec §6.4-B). */
export default function PaquetesMenu({ paquetes, destacado }: { paquetes: PaquetePublico[]; destacado: number }) {
  return (
    <div className="s-prows">
      {paquetes.map((p, i) => {
        const foto = fotoDePaquete(p.nombre, p.servicio);
        const porSesion = precioPorSesion(p.precio, p.sesiones);
        const esDestacado = i === destacado;
        return (
          <article key={p.id} className="s-prow">
            <div className={`s-arco s-prow-foto ${foto ? '' : 'is-ph'}`}>
              <img src={foto ?? MONOGRAMA} alt="" loading="lazy" />
            </div>
            <div className="s-prow-tx">
              <h3 className="s-display">{nombreCorto(p.nombre)}{esDestacado && <> <span className="s-tag">Más elegido</span></>}</h3>
              {p.servicio && <p className="s-prow-inc">{p.servicio}</p>}
              <SesionesOvalos sesiones={p.sesiones} />
            </div>
            <div className="s-prow-precio">
              <b>{formatoRD(p.precio)}</b>
              {porSesion !== null && <span>{formatoRD(porSesion)} por sesión</span>}
            </div>
            <div className="s-prow-go">
              <Link className={`s-btn ${esDestacado ? 's-btn-solid' : 's-btn-line'}`} to="/reservar">
                Reservar paquete <span className="s-ar" aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: `vscode/src/site/landing/PaquetesMenu.css`.** Mueve aquí, sin cambiar valores, todas las reglas de filas que hoy están en `Packages.css`:
- `.s-prows`, `.s-prow`, `.s-prow-foto` (y su `img`), `.s-prow h3`, `.s-tag`, `.s-prow-inc`, `.s-prow-precio` (y `b`, `span`) y `.s-prow-go` (y `.s-btn`);
- sus versiones dentro de `@media (min-width: 761px)` y `@media (min-width: 1101px)`;
- el bloque `@media (hover: hover)` de `.s-prow`.

**No** muevas las reglas `.s-ovalos*`: esas se borran, porque ahora viven en `ui/SesionesOvalos.css`.
Empieza el archivo con el comentario `/* Estilo B · Menú con foto */`.

- [ ] **Step 5: `vscode/src/site/landing/Packages.css` queda solo con el caparazón.** Reemplázalo completo por:

```css
/* Sección de paquetes: fondo y "Cómo funciona" (el estilo de cada paquete está en su propio archivo) */
.s-pkg{ background:var(--s-bg-alt) }

/* Cómo funciona */
.s-how{ list-style:none; display:grid; grid-template-columns:1fr; margin:36px 0 0; padding:0; border:1px solid var(--s-line); border-radius:24px; overflow:hidden }
.s-how-paso{ display:flex; align-items:flex-start; gap:18px; padding:26px 28px }
.s-how-paso + .s-how-paso{ border-top:1px solid var(--s-line) }
.s-how-paso b{ font-family:var(--s-f-display); font-weight:400; font-style:italic; font-size:30px; line-height:1; color:var(--s-accent) }
.s-how-paso h4{ margin:0 0 6px; font-family:var(--s-f-body); font-size:15.5px; font-weight:500 }
.s-how-paso p{ margin:0; font-size:13.5px; line-height:1.6; color:var(--s-soft); font-weight:300 }

@media (min-width: 761px){ .s-how{ margin-top:56px } }
@media (min-width: 1101px){
  .s-how{ grid-template-columns:repeat(3,1fr) }
  .s-how-paso + .s-how-paso{ border-top:0; border-left:1px solid var(--s-line) }
}
```

- [ ] **Step 6: `vscode/src/site/landing/Packages.tsx`, reemplazo completo** (en esta etapa el único estilo es el menú; las Tasks 5 y 6 agregan los otros dos)

```tsx
import { indiceDestacado, type EstiloPaquetes, type PaquetePublico } from './paquetes';
import PaquetesMenu from './PaquetesMenu';
import { useRevela } from '../ui/useRevela';
import './Packages.css';

const PASOS = [
  { n: '01', t: 'Elige tu paquete', d: 'Según el tratamiento y las sesiones que tu piel necesita.' },
  { n: '02', t: 'Reserva en línea', d: 'Agenda tu primera sesión y las siguientes cuando te quede mejor.' },
  { n: '03', t: 'Sigue tu avance', d: 'En Mis citas ves cuántas sesiones llevas y cuántas te quedan.' },
];

/** Paquetes en el estilo elegido en el panel (spec §6.4) y la franja "Cómo funciona" (spec §5.4). */
export default function Packages({ paquetes, estilo }: { paquetes: PaquetePublico[]; estilo: EstiloPaquetes }) {
  const cabeza = useRevela<HTMLDivElement>();
  const lista = useRevela<HTMLDivElement>();
  const pasos = useRevela<HTMLOListElement>();
  const destacado = indiceDestacado(paquetes.length);

  return (
    <section className="s-sec s-pkg" id="s-paquetes" data-spy="" data-estilo={estilo}>
      <div className="s-wrap">
        <div className="s-sec-head s-sec-head--centro s-rv" ref={cabeza}>
          <p className="s-eyebrow">Paquetes con sesiones</p>
          <h2 className="s-display s-h2">Ahorra con nuestros <em>paquetes</em></h2>
          <p className="s-lead">Compra tu paquete de sesiones y obtén resultados duraderos a un precio especial.</p>
        </div>

        <div className="s-rv" ref={lista}>
          <PaquetesMenu paquetes={paquetes} destacado={destacado} />
        </div>

        <ol className="s-how s-rv" ref={pasos}>
          {PASOS.map((s) => (
            <li key={s.n} className="s-how-paso">
              <b aria-hidden="true">{s.n}</b>
              <div><h4>{s.t}</h4><p>{s.d}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: `vscode/src/pages/LandingPage.tsx` pasa el estilo.**
- Cambia `const { paquetes } = usePaquetesPublicos();` por `const { paquetes, estilo } = usePaquetesPublicos();`.
- Cambia `{conPaquetes && <Packages paquetes={paquetes} />}` por `{conPaquetes && <Packages paquetes={paquetes} estilo={estilo} />}`.

- [ ] **Step 8: Pruebas, tipos, compilación y que nada cambió a la vista**

Run: `cd vscode && npm test && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site\|src/pages/LandingPage" ; npm run build 2>&1 | tail -2 ; grep -rn "s-ovalos" src/site --include=*.css`
Expected:
- `ℹ pass 44`, luego `0` y `✓ built in`;
- `s-ovalos` solo aparece en `ui/SesionesOvalos.css`.

- [ ] **Step 9: Commit**

```bash
git add vscode/src/site vscode/src/pages/LandingPage.tsx
git commit -m "refactor(sitio): paquetes como caparazón con un componente por estilo y óvalos de sesiones compartidos"
```

---

### Task 5: Estilo A · Membresía

**Files:**
- Create: `vscode/src/site/landing/PaquetesMembresia.tsx`, `vscode/src/site/landing/PaquetesMembresia.css`
- Modify: `vscode/src/site/landing/Packages.tsx` (elige el estilo)

**Interfaces:**
- Consumes: `formatoRD`, `nombreCorto`, `precioPorSesion`, `PaquetePublico`, `SesionesOvalos`, `LOGO_CLARO` y `MONOGRAMA`.
- Produces: `PaquetesMembresia` con props `{ paquetes: PaquetePublico[]; destacado: number }`.

- [ ] **Step 1: `vscode/src/site/landing/PaquetesMembresia.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { formatoRD } from './catalogo';
import { nombreCorto, precioPorSesion, type PaquetePublico } from './paquetes';
import SesionesOvalos from '../ui/SesionesOvalos';
import { LOGO_CLARO, MONOGRAMA } from '../brand';
import './PaquetesMembresia.css';

/**
 * Estilo A · Membresía: cada paquete es una tarjeta chocolate con el logo, como una tarjeta de socia.
 * Se inclina y brilla al pasar el mouse (spec §6.4-A). "Regalar un paquete" queda apagado (no se construye).
 */
export default function PaquetesMembresia({ paquetes, destacado }: { paquetes: PaquetePublico[]; destacado: number }) {
  return (
    <ul className="s-mc-grid">
      {paquetes.map((p, i) => {
        const porSesion = precioPorSesion(p.precio, p.sesiones);
        const esDestacado = i === destacado;
        return (
          <li key={p.id} className={`s-mc-item ${esDestacado ? 'is-pop' : ''}`}>
            {esDestacado && <span className="s-mc-badge">Más elegido</span>}
            <div className="s-mc">
              <img className="s-mc-mono" src={MONOGRAMA} alt="" aria-hidden="true" />
              <div className="s-mc-top">
                <img className="s-mc-logo" src={LOGO_CLARO} alt="" aria-hidden="true" />
                <SesionesOvalos sesiones={p.sesiones} conTexto={false} />
              </div>
              <div className="s-mc-mid">
                {p.servicio && <p className="s-mc-svc">{p.servicio}</p>}
                <h3 className="s-display s-mc-nombre">{nombreCorto(p.nombre)}</h3>
              </div>
              <div className="s-mc-bot">
                <b>{formatoRD(p.precio)}</b>
                <small>{p.sesiones} {p.sesiones === 1 ? 'sesión' : 'sesiones'}</small>
              </div>
            </div>
            <div className="s-mc-under">
              <span>{porSesion !== null ? `${formatoRD(porSesion)} por sesión` : ''}</span>
              <Link className={`s-btn ${esDestacado ? 's-btn-solid' : 's-btn-line'}`} to="/reservar">
                Reservar <span className="s-ar" aria-hidden="true">→</span>
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: `vscode/src/site/landing/PaquetesMembresia.css`**

```css
/* Estilo A · Membresía: tarjeta chocolate con el logo, igual en los dos temas */
.s-mc-grid{ list-style:none; display:grid; grid-template-columns:1fr; gap:34px 30px; max-width:440px; margin:0 auto; padding:12px 0 0 }
.s-mc-item{ position:relative; perspective:1100px }
/* la tarjeta redefine las variables del tema marrón: se ve igual en beige */
.s-mc{ --s-text:#F5F1EA; --s-accent:#CDB8A2;
  position:relative; display:flex; flex-direction:column; min-height:210px; padding:22px 24px; border-radius:20px; overflow:hidden; color:var(--s-text);
  background:radial-gradient(120% 90% at 100% 0%, rgba(178,150,125,.32), transparent 60%), var(--s-listones-oscuro);
  box-shadow:0 30px 60px -26px rgba(0,0,0,.75), inset 0 1px 0 rgba(255,255,255,.1);
  transform-style:preserve-3d; transition:transform .7s var(--s-ease), box-shadow .7s }
/* brillo que cruza la tarjeta al pasar el mouse */
.s-mc::after{ content:""; position:absolute; inset:0; background:linear-gradient(115deg, transparent 30%, rgba(255,255,255,.2) 46%, transparent 62%); transform:translateX(-130%); transition:transform 1.1s ease; pointer-events:none }
.s-mc-item.is-pop .s-mc{ outline:1px solid rgba(205,184,162,.7); outline-offset:-7px }
.s-mc-mono{ position:absolute; right:-18px; bottom:-34px; height:170px; opacity:.1; filter:brightness(0) invert(1); pointer-events:none }
.s-mc-top{ position:relative; display:flex; justify-content:space-between; align-items:center; gap:12px }
.s-mc-logo{ height:34px; width:auto }
.s-mc-top .s-ovalos{ gap:5px; justify-content:flex-end }
.s-mc-top .s-ovalos i{ width:9px; height:16px }
.s-mc-mid{ position:relative; margin-top:auto; padding-top:18px }
.s-mc-svc{ margin:0 0 6px; font-size:10.5px; letter-spacing:.2em; text-transform:uppercase; color:var(--s-accent) }
.s-mc-nombre{ font-size:25px; overflow-wrap:anywhere }
.s-mc-bot{ position:relative; display:flex; justify-content:space-between; align-items:flex-end; gap:12px; margin-top:14px; padding-top:12px; border-top:1px solid rgba(205,184,162,.25) }
.s-mc-bot b{ font-family:var(--s-f-display); font-weight:400; font-size:25px; color:var(--s-accent) }
.s-mc-bot small{ font-size:11.5px; color:rgba(245,241,234,.72) }
.s-mc-under{ display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:18px }
.s-mc-under span{ font-size:13px; color:var(--s-soft) }
.s-mc-badge{ position:absolute; top:-12px; left:22px; z-index:3; padding:6px 12px; border-radius:999px; background:var(--s-btn-bg); color:var(--s-btn-fg); font:500 10.5px var(--s-f-body); letter-spacing:.16em; text-transform:uppercase }

@media (min-width: 761px){ .s-mc-grid{ grid-template-columns:1fr 1fr; max-width:none } }
@media (min-width: 1101px){ .s-mc-grid{ grid-template-columns:repeat(3,1fr) } }
@media (hover: hover){
  .s-mc-item:hover .s-mc{ transform:rotateX(7deg) rotateY(-9deg) translateY(-6px); box-shadow:0 44px 70px -30px rgba(0,0,0,.8) }
  .s-mc-item:hover .s-mc::after{ transform:translateX(130%) }
}
```

- [ ] **Step 3: `Packages.tsx` elige entre Menú y Membresía**
- Agrega `import PaquetesMembresia from './PaquetesMembresia';` debajo del import de `PaquetesMenu`.
- Reemplaza `<PaquetesMenu paquetes={paquetes} destacado={destacado} />` por:
  ```tsx
            {estilo === 'membresia'
              ? <PaquetesMembresia paquetes={paquetes} destacado={destacado} />
              : <PaquetesMenu paquetes={paquetes} destacado={destacado} />}
  ```

- [ ] **Step 4: Pruebas, tipos y compilación**

Run: `cd vscode && npm test && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site" ; npm run build 2>&1 | tail -2`
Expected: `ℹ pass 44`, luego `0` y `✓ built in`.

- [ ] **Step 5: Commit**

```bash
git add vscode/src/site/landing/PaquetesMembresia.tsx vscode/src/site/landing/PaquetesMembresia.css vscode/src/site/landing/Packages.tsx
git commit -m "feat(sitio): paquetes en estilo Membresía, tarjeta chocolate con el logo"
```

---

### Task 6: Estilo C · Ahorro

**Files:**
- Create: `vscode/src/site/landing/PaquetesAhorro.tsx`, `vscode/src/site/landing/PaquetesAhorro.css`
- Modify: `vscode/src/site/landing/Packages.tsx` (tercer estilo)

**Interfaces:**
- Consumes: `formatoRD`, `fotoDePaquete`, `nombreCorto`, `porcentajeAhorro`, `precioPorSesion`, `PaquetePublico`, `SesionesOvalos`, `MONOGRAMA` y la clase `.s-sr` (Task 4).
- Produces: `PaquetesAhorro` con props `{ paquetes: PaquetePublico[]; destacado: number }`.

- [ ] **Step 1: `vscode/src/site/landing/PaquetesAhorro.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { formatoRD } from './catalogo';
import { fotoDePaquete, nombreCorto, porcentajeAhorro, precioPorSesion, type PaquetePublico } from './paquetes';
import SesionesOvalos from '../ui/SesionesOvalos';
import { MONOGRAMA } from '../brand';
import './PaquetesAhorro.css';

/**
 * Estilo C · Ahorro: foto, sello "Ahorras X %", precio por sesión grande y el precio suelto tachado
 * (spec §6.4-C). Si el servicio del paquete no tiene precio, esa tarjeta sale sin sello ni precio tachado.
 */
export default function PaquetesAhorro({ paquetes, destacado }: { paquetes: PaquetePublico[]; destacado: number }) {
  return (
    <ul className="s-sc-grid">
      {paquetes.map((p, i) => {
        const foto = fotoDePaquete(p.nombre, p.servicio);
        const porSesion = precioPorSesion(p.precio, p.sesiones);
        const ahorro = porcentajeAhorro(p);
        const esDestacado = i === destacado;
        return (
          <li key={p.id} className={`s-sc ${esDestacado ? 'is-pop' : ''}`}>
            <div className={`s-sc-img ${foto ? '' : 'is-ph'}`}>
              <img src={foto ?? MONOGRAMA} alt="" loading="lazy" />
              {esDestacado && <span className="s-sc-flag">Más elegido</span>}
              {ahorro !== null && <span className="s-sc-sello" aria-hidden="true"><small>Ahorras</small><b>{ahorro}%</b></span>}
              <SesionesOvalos sesiones={p.sesiones} className="s-sc-ovalos" />
            </div>
            <div className="s-sc-bd">
              <h3 className="s-display">{nombreCorto(p.nombre)}</h3>
              {p.servicio && <p className="s-sc-inc">{p.servicio}</p>}
              {porSesion !== null && <p className="s-sc-per"><b>{formatoRD(porSesion)}</b><span>por sesión</span></p>}
              {ahorro !== null && (
                <p className="s-sc-antes">
                  <s>{formatoRD(p.precioServicio)}</s> precio de la sesión suelta<span className="s-sr">, ahorras {ahorro} por ciento</span>
                </p>
              )}
              <p className="s-sc-total">
                Total <b>{formatoRD(p.precio)}</b> por {p.sesiones === 1 ? 'la sesión' : `las ${p.sesiones} sesiones`}
              </p>
              <Link className={`s-btn ${esDestacado ? 's-btn-solid' : 's-btn-line'}`} to="/reservar">
                Reservar paquete <span className="s-ar" aria-hidden="true">→</span>
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: `vscode/src/site/landing/PaquetesAhorro.css`**

```css
/* Estilo C · Ahorro */
.s-sc-grid{ list-style:none; display:grid; grid-template-columns:1fr; gap:22px; max-width:440px; margin:0 auto; padding:0 }
.s-sc{ position:relative; display:flex; flex-direction:column; border-radius:28px; overflow:hidden; background:var(--s-surface); border:1px solid var(--s-surface-line); transition:transform .5s var(--s-ease), box-shadow .5s }
.s-sc.is-pop{ border-color:var(--s-accent) }
.s-sc-img{ position:relative; height:170px; overflow:hidden; background:var(--s-arch-bg) }
.s-sc-img img{ width:100%; height:100%; object-fit:cover; object-position:50% 30% }
.s-sc-img.is-ph{ display:grid; place-items:center; background:var(--s-tex) }
.s-sc-img.is-ph img{ width:40px; height:auto; opacity:.5; object-fit:contain }
.site[data-site-tema="oscuro"] .s-sc-img.is-ph img{ filter:brightness(0) invert(1) }
.s-sc-img::after{ content:""; position:absolute; inset:0; background:linear-gradient(180deg, transparent 40%, rgba(42,30,23,.6)); pointer-events:none }
.s-sc-flag{ position:absolute; left:18px; top:18px; z-index:2; padding:6px 12px; border-radius:999px; background:var(--s-btn-bg); color:var(--s-btn-fg); font:500 10.5px var(--s-f-body); letter-spacing:.16em; text-transform:uppercase }
/* el sello siempre camel sobre chocolate, en los dos temas */
.s-sc-sello{ position:absolute; right:18px; top:18px; z-index:2; display:flex; flex-direction:column; align-items:center; justify-content:center; width:78px; height:78px; border-radius:50%; background:#B2967D; color:#2A1E17; line-height:1; transform:rotate(-8deg); box-shadow:0 12px 24px -10px rgba(0,0,0,.5) }
.s-sc-sello small{ font-size:9.5px; letter-spacing:.14em; text-transform:uppercase }
.s-sc-sello b{ margin-top:3px; font-family:var(--s-f-display); font-weight:500; font-size:24px }
.s-sc-ovalos{ position:absolute; left:22px; bottom:16px; z-index:2; color:#F5F1EA }
.s-sc-bd{ display:flex; flex-direction:column; flex:1; padding:24px 26px 28px }
.s-sc-bd h3{ margin:0 0 6px; font-size:25px }
.s-sc-inc{ margin:0 0 22px; font-size:14px; color:var(--s-soft); font-weight:300 }
.s-sc-per{ display:flex; align-items:baseline; flex-wrap:wrap; gap:10px; margin:0 }
.s-sc-per b{ font-family:var(--s-f-display); font-weight:400; font-size:34px }
.s-sc-per span{ font-size:13px; color:var(--s-soft) }
.s-sc-antes{ margin:6px 0 4px; font-size:13px; color:var(--s-faint) }
.s-sc-antes s{ margin-right:6px }
.s-sc-total{ margin:0 0 22px; padding:14px 0 22px; border-bottom:1px solid var(--s-line); font-size:13px; color:var(--s-soft) }
.s-sc-total b{ color:var(--s-text); font-weight:500 }
.s-sc .s-btn{ width:100%; margin-top:auto }

@media (min-width: 761px){ .s-sc-grid{ grid-template-columns:1fr 1fr; max-width:none } }
@media (min-width: 1101px){ .s-sc-grid{ grid-template-columns:repeat(3,1fr); gap:24px } }
@media (hover: hover){ .s-sc:hover{ transform:translateY(-8px); box-shadow:var(--s-shadow) } }
```

- [ ] **Step 3: `Packages.tsx` con los tres estilos**
- Agrega `import PaquetesAhorro from './PaquetesAhorro';` debajo del import de `PaquetesMembresia`.
- Reemplaza el bloque que elige el estilo por:
  ```tsx
            {estilo === 'membresia' && <PaquetesMembresia paquetes={paquetes} destacado={destacado} />}
            {estilo === 'ahorro' && <PaquetesAhorro paquetes={paquetes} destacado={destacado} />}
            {estilo === 'menu' && <PaquetesMenu paquetes={paquetes} destacado={destacado} />}
  ```

- [ ] **Step 4: Pruebas, tipos y compilación**

Run: `cd vscode && npm test && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site" ; npm run build 2>&1 | tail -2`
Expected: `ℹ pass 44`, luego `0` y `✓ built in`.

- [ ] **Step 5: Commit**

```bash
git add vscode/src/site/landing/PaquetesAhorro.tsx vscode/src/site/landing/PaquetesAhorro.css vscode/src/site/landing/Packages.tsx
git commit -m "feat(sitio): paquetes en estilo Ahorro con sello de % y precio suelto tachado"
```

---

### Task 7: Tarjeta "Página web" en Configuración del panel

**Files:**
- Modify: `vscode/src/pages/admin/Settings.tsx`
- Modify: `vscode/src/pages/admin/Settings.css`

**Interfaces:**
- Consumes: `Settings.estilo_paquetes` y `updateSettings` (Task 3); `paquetesSinSello` y `EstiloPaquetes` (Task 2).
- Produces: el formulario guarda `estilo_paquetes` con el botón "Guardar Cambios" de siempre.

- [ ] **Step 1: `Settings.tsx`, imports y estado**
- La línea de `lucide-react` suma `Globe` y `ExternalLink`:
  `import { Save, AlertCircle, Building2, CreditCard, DollarSign, User as UserIcon, Phone, Plus, Trash2, Star, Globe, ExternalLink } from 'lucide-react';`
- Debajo de la línea de `useSettingsStore`, agrega:
  ```tsx
  import { supabase } from '../../lib/supabase';
  import { paquetesSinSello, type EstiloPaquetes } from '../../site/landing/paquetes';
  ```
- Debajo de `import './Settings.css';` (después de todos los imports y antes de `export default function Settings`), agrega:
  ```tsx
  // estilos de la sección de paquetes de la página principal (spec §6.4)
  const ESTILOS: { id: EstiloPaquetes; nombre: string; desc: string }[] = [
    { id: 'membresia', nombre: 'Membresía', desc: 'Tarjetas chocolate con el logo, como una tarjeta de socia.' },
    { id: 'menu', nombre: 'Menú con foto', desc: 'Una fila por paquete con la foto del servicio. Es el estilo recomendado.' },
    { id: 'ahorro', nombre: 'Ahorro', desc: 'Tarjetas con el sello "Ahorras X %" y el precio suelto tachado.' },
  ];

  // en el dominio del panel (app.…) la página pública vive en el dominio principal
  const URL_PAQUETES = typeof window !== 'undefined' && window.location.hostname.startsWith('app.')
    ? `https://${window.location.hostname.slice(4)}/#s-paquetes`
    : '/#s-paquetes';
  ```
- En el `useState` de `form`, debajo de `package_deposit_value: 500,`, agrega
  `estilo_paquetes: 'menu' as EstiloPaquetes,`.
- En el `setForm({ … })` del efecto que copia `settings`, debajo de
  `package_deposit_value: settings.package_deposit_value,`, agrega
  `estilo_paquetes: settings.estilo_paquetes,`.
- Debajo de ese efecto, agrega el conteo para el aviso:
  ```tsx
  // cuántos paquetes activos saldrían sin sello en el estilo Ahorro (su servicio no tiene precio)
  const [conteo, setConteo] = useState<{ total: number; sinSello: number } | null>(null);
  useEffect(() => {
    let vivo = true;
    supabase.from('session_packages').select('sessions, price, services(price)').eq('active', true).then(({ data, error }) => {
      if (!vivo || error) return;
      type Fila = { sessions: number | string | null; price: number | string | null; services: { price: number | string | null } | { price: number | string | null }[] | null };
      const paquetes = ((data ?? []) as unknown as Fila[]).map((p) => {
        const sv = Array.isArray(p.services) ? p.services[0] : p.services;
        return { precio: Number(p.price) || 0, sesiones: Number(p.sessions) || 0, precioServicio: Number(sv?.price) || 0 };
      });
      setConteo({ total: paquetes.length, sinSello: paquetesSinSello(paquetes) });
    });
    return () => { vivo = false; };
  }, []);
  ```

- [ ] **Step 2: `Settings.tsx`: la tarjeta.** Agrégala dentro de `<div className="settings-grid">`, justo antes del comentario `{/* Preferencias de Interfaz */}`:

```tsx
        {/* Página web */}
        <div className="settings-card settings-card--secondary">
          <div className="settings-card__header">
            <h3 className="settings-card__title"><Globe size={20} /> Página web</h3>
            <p className="settings-card__desc">Cómo se ven los paquetes en la página principal. Se publica al guardar.</p>
          </div>
          <fieldset className="settings-estilos">
            <legend>Estilo de los paquetes</legend>
            {ESTILOS.map((e) => (
              <label key={e.id} className={`settings-estilo ${form.estilo_paquetes === e.id ? 'is-on' : ''}`}>
                <input type="radio" name="estilo_paquetes" value={e.id} checked={form.estilo_paquetes === e.id}
                  onChange={() => setForm({ ...form, estilo_paquetes: e.id })} />
                <span className={`settings-estilo__mini settings-estilo__mini--${e.id}`} aria-hidden="true"><i /><i /><i /></span>
                <span className="settings-estilo__txt"><b>{e.nombre}</b><small>{e.desc}</small></span>
              </label>
            ))}
          </fieldset>
          {form.estilo_paquetes === 'ahorro' && conteo && conteo.sinSello > 0 && (
            <p className="settings-estilos__aviso" role="status">
              <AlertCircle size={16} />
              {conteo.sinSello} de {conteo.total} {conteo.total === 1 ? 'paquete no mostrará' : 'paquetes no mostrarán'} el sello
              de ahorro porque su servicio no tiene precio. Cárgalo en Servicios.
            </p>
          )}
          <a className="settings-estilos__ver" href={URL_PAQUETES} target="_blank" rel="noopener noreferrer">
            Ver los paquetes en la página <ExternalLink size={14} />
          </a>
        </div>
```

- [ ] **Step 3: Estilos al final de `vscode/src/pages/admin/Settings.css`**

```css
/* ── Página web: estilo de los paquetes ── */
.settings-estilos { border: 0; margin: 0; padding: 0; display: grid; gap: 12px; }
.settings-estilos legend { margin-bottom: 10px; font-size: 0.85rem; font-weight: 600; color: rgba(255, 255, 255, 0.8); text-transform: uppercase; letter-spacing: 0.5px; }
.settings-estilo { position: relative; display: flex; align-items: center; gap: 16px; min-height: 44px; padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.08); cursor: pointer; transition: border-color .2s, background-color .2s; }
.settings-estilo input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.settings-estilo.is-on { border-color: #B2967D; background: rgba(178, 150, 125, 0.1); }
.settings-estilo:has(input:focus-visible) { outline: 2px solid #B2967D; outline-offset: 2px; }
.settings-estilo__txt { display: flex; flex-direction: column; gap: 3px; }
.settings-estilo__txt b { color: #fff; font-weight: 600; font-size: 0.95rem; }
.settings-estilo__txt small { color: rgba(255, 255, 255, 0.6); font-size: 0.82rem; line-height: 1.4; }
/* miniaturas de cada estilo */
.settings-estilo__mini { flex-shrink: 0; position: relative; width: 72px; height: 50px; border-radius: 10px; overflow: hidden; background: #F5F1EA; }
.settings-estilo__mini i { position: absolute; display: block; }
.settings-estilo__mini--membresia { background: linear-gradient(135deg, #3b2b21, #2A1E17); }
.settings-estilo__mini--membresia i:nth-child(1) { left: 8px; top: 8px; width: 22px; height: 4px; border-radius: 2px; background: #CDB8A2; }
.settings-estilo__mini--membresia i:nth-child(2) { left: 8px; bottom: 15px; width: 34px; height: 5px; border-radius: 2px; background: #F5F1EA; }
.settings-estilo__mini--membresia i:nth-child(3) { left: 8px; bottom: 7px; width: 20px; height: 4px; border-radius: 2px; background: #B2967D; }
.settings-estilo__mini--menu i { left: 6px; right: 6px; height: 12px; border-bottom: 1px solid rgba(125, 90, 68, 0.25); }
.settings-estilo__mini--menu i::before { content: ""; position: absolute; left: 0; top: 1px; width: 7px; height: 9px; border-radius: 4px 4px 1px 1px; background: #7D5A44; }
.settings-estilo__mini--menu i::after { content: ""; position: absolute; left: 11px; top: 4px; width: 30px; height: 3px; border-radius: 2px; background: #B2967D; }
.settings-estilo__mini--menu i:nth-child(1) { top: 4px; }
.settings-estilo__mini--menu i:nth-child(2) { top: 18px; }
.settings-estilo__mini--menu i:nth-child(3) { top: 32px; }
.settings-estilo__mini--ahorro i:nth-child(1) { left: 0; right: 0; top: 0; height: 22px; background: #B2967D; }
.settings-estilo__mini--ahorro i:nth-child(2) { right: 6px; top: 6px; width: 16px; height: 16px; border-radius: 50%; background: #2A1E17; }
.settings-estilo__mini--ahorro i:nth-child(3) { left: 8px; bottom: 8px; width: 30px; height: 6px; border-radius: 2px; background: #7D5A44; }
.settings-estilos__aviso { display: flex; gap: 8px; align-items: flex-start; margin: 0; padding: 12px 14px; border-radius: 12px; background: rgba(245, 158, 11, 0.12); color: #fbbf24; font-size: 0.85rem; line-height: 1.45; }
.settings-estilos__aviso svg { flex-shrink: 0; margin-top: 1px; }
.settings-estilos__ver { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; min-height: 44px; font-size: 0.88rem; color: #CDB8A2; text-decoration: none; }
.settings-estilos__ver:hover { text-decoration: underline; }
:root[data-theme="light"] .settings-estilos legend { color: #4b5563; }
:root[data-theme="light"] .settings-estilo { border-color: #e5e7eb; }
:root[data-theme="light"] .settings-estilo.is-on { border-color: #7D5A44; background: rgba(125, 90, 68, 0.08); }
:root[data-theme="light"] .settings-estilo:has(input:focus-visible) { outline-color: #7D5A44; }
:root[data-theme="light"] .settings-estilo__txt b { color: #1f2937; }
:root[data-theme="light"] .settings-estilo__txt small { color: #6b7280; }
:root[data-theme="light"] .settings-estilos__aviso { color: #92400e; background: #fef3c7; }
:root[data-theme="light"] .settings-estilos__ver { color: #7D5A44; }
```

- [ ] **Step 4: Pruebas, tipos y compilación**

Run: `cd vscode && npm test && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/pages/admin/Settings\|src/site\|src/store/settingsStore" ; npm run build 2>&1 | tail -2`
Expected: `ℹ pass 44` y `✓ built in`. En el conteo de `tsc`, ningún error nuevo respecto a los que `Settings.tsx` ya tuviera antes de esta tarea: anota el número de antes y el de después.

- [ ] **Step 5: Commit**

```bash
git add vscode/src/pages/admin/Settings.tsx vscode/src/pages/admin/Settings.css
git commit -m "feat(panel): tarjeta Página web para elegir el estilo de los paquetes"
```

---

### Task 8: Revisión en el navegador (la hace el controlador)

- [ ] **Step 1:** Con `npm run dev -- --host`, cambia el estilo desde la base, porque el controlador no inicia sesión en el panel:
  ```sql
  update settings set estilo_paquetes = 'membresia' where id = 1;
  ```
  Recarga `/` y revisa en 360, 390, 430, 820, 1180, 1280 y 1440, en los dos temas:
  - la tarjeta chocolate es igual en marrón y beige;
  - el nombre y el servicio no se salen;
  - "Más elegido" queda sobre la tarjeta del medio, sin tapar nada;
  - en PC, al pasar el mouse, la tarjeta se inclina y brilla, sin cambiar la letra.
- [ ] **Step 2:** Repite con `'ahorro'`:
  - con los precios de servicio en 0 (como hoy), las tarjetas no tienen sello ni precio tachado, y no aparece "RD$ 0";
  - para probar el sello, pon por un momento un precio a un servicio de paquete. Anota el precio que tenía y déjalo igual al terminar;
  - la foto, los óvalos y "Más elegido" se leen bien sobre la foto.
- [ ] **Step 3:** Vuelve a `'menu'` y comprueba que la página se ve igual que en la Fase 2:
  ```sql
  update settings set estilo_paquetes = 'menu' where id = 1;
  ```
- [ ] **Step 4:** Louis prueba en su panel: Configuración → Página web → elige un estilo → Guardar. El aviso de "N de M paquetes sin sello" aparece al elegir Ahorro. Los datos bancarios y los depósitos no cambian.
- [ ] **Step 5:** Deja el estilo en el que Louis elija y abre el PR "Rediseño fase 3: estilos de paquetes elegibles en el panel", contra `main` cuando el PR #8 esté fusionado.

## Al terminar la Fase 3

Sigue la **Fase 4**: el equipo en la web.
- **Base:** columnas nuevas en `staff`, cada una con su `grant select (col) ... to anon`.
- **Panel:** campos nuevos en la página Equipo.
- **Página principal:** la sección "Nuestro equipo", que solo aparece si hay alguien marcado para la web.
- **Menú:** usar una lista declarativa de secciones presentes (ver el índice de planes).
