# Rediseño · Fase 1: base visual, barra, menú y pie — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el "caparazón" nuevo de la web de la clienta: tema marrón/beige, barra `logo | secciones | MENÚ`, menú premium con día/noche, pie y WhatsApp. Se ve en una vista previa `/_diseno` (solo en desarrollo) que las fases siguientes reemplazan por las páginas reales.

**Architecture:** Carpeta nueva `vscode/src/site/`, aislada del panel. Todo cuelga de un contenedor `<div class="site" data-site-tema="oscuro|claro">`, con variables CSS propias y prefijo `s-` en todas las clases, para no chocar con el CSS global ni con el tema del panel (`html[data-theme]`). La lógica que se puede probar va en funciones puras con `node --test`, y la interfaz en componentes React finos que las usan.

**Tech Stack:** React 19 + TypeScript + Vite 7, react-router-dom 7, CSS plano por componente, pruebas con `node --test` (ya configurado por el PR #6: `npm test` corre `tests/**/*.test.ts`).

**Spec:** `docs/superpowers/specs/2026-09-27-rediseno-web-clienta-design.md` (§3 sistema visual, §4 barra y menú). Boceto aprobado: `C:/Users/loui-/Desktop/ANABEL/bocetos-rediseno/land-v4.html`.

## Global Constraints

- **Paleta:** camel `#B2967D`, cocoa `#7D5A44`, linen `#F5F1EA`, khaki `#D7C9B8`, choco `#2A1E17`, crema `#FBF8F3`.
- **Tema por defecto:** `oscuro` (marrón). Se guarda en `localStorage` con la clave `anadsll-site-tema`. **Nunca** se toca `html[data-theme]` ni `themeStore`, que son del panel.
- **Tipografía:** títulos Playfair Display (cursiva para el acento) y texto Outfit.
- **Cortes:** celular ≤ 760 px, tableta 761–1100 px, computadora > 1100 px. Barra de 64, 70 y 74 px; logo de 46, 48 y 52 px.
- **Clases del sitio:** siempre con prefijo `s-` y colgadas de `.site`.
- **Movimiento:**
  - al pasar el mouse nunca cambia la letra (sin cursiva ni negrita);
  - los efectos de mouse van solo bajo `@media (hover:hover)`;
  - `prefers-reduced-motion` apaga las animaciones.
- **Código:** comentarios y nombres en español, como el resto del proyecto. Los anchos de prueba de la lista final son 360, 390, 430, 820, 1180, 1280 y 1440.

## Review Focus

- **Navegador en modo privado o con almacenamiento bloqueado:** `localStorage` lanza error → la página abre en marrón y el selector sigue funcionando sin romperse (Task 2, prueba `almacén que falla`).
- **Menú abierto:**
  - la tecla Escape lo cierra y el foco vuelve al botón MENÚ;
  - Tab no se escapa del menú;
  - el fondo no se desplaza mientras está abierto (Task 6, verificación manual con pasos exactos).
- **Tocar una sección del menú** estando en `/reservar` o `/mis-citas` lleva a `/#s-<id>` y la página principal baja hasta esa sección. El hook `useIrAlHash` se prueba en `/_diseno#s-paquetes` (Task 7).
- **Encabezado en páginas sin secciones:** el contenido no queda escondido bajo la barra fija; `s-main--pad` da el espacio (Task 7, verificación).
- **Botón "Cerrar" alineado con MENÚ en cada ancho**, para que el círculo nazca del mismo punto (Task 7, verificación con coordenadas en 360, 820 y 1440).

---

### Task 0: Traer `main` a la rama del rediseño

El PR #6 (descuento de paquetes + runner de pruebas) ya está en `main`. La rama del rediseño partió antes.

- [ ] **Step 1: Actualizar la rama.** En el worktree de la app, usa la herramienta `sync_with_base_branch` del host. Si trabajas fuera de la app: `git fetch origin && git merge origin/main`.
- [ ] **Step 2: Verificar que el runner existe.**

Run: `cd vscode && npm test`
Expected: `ℹ pass 8` y `ℹ fail 0` (las pruebas de `tests/packageMatch.test.ts`).

---

### Task 1: Logo, fotos y fuente

**Files:**
- Create: `vscode/public/brand/logo-sin-icono.png`, `vscode/public/brand/logo-sin-icono-claro.png`
- Create: `vscode/public/fotos/` (fotos optimizadas, ver tabla)
- Create: `vscode/src/site/brand.ts`
- Modify: `vscode/src/index.css:3` (import de Google Fonts)

**Interfaces:**
- Produces: `LOGO`, `LOGO_CLARO`, `MONOGRAMA`, `FOTO_MENU` (strings con rutas públicas) en `src/site/brand.ts`; las fases 2–6 importan las rutas de las fotos desde `FOTOS`.

- [ ] **Step 1: Copiar los recursos ya optimizados de los bocetos**

```bash
B="C:/Users/loui-/Desktop/ANABEL/bocetos-rediseno/files"
P="vscode/public"
mkdir -p "$P/fotos"
cp "$B/logo-s.png"   "$P/brand/logo-sin-icono.png"
cp "$B/logo-s-w.png" "$P/brand/logo-sin-icono-claro.png"
cp "$B/duena-cintura.jpg" "$P/fotos/portada.jpg"
cp "$B/duena-sofa-v.jpg"  "$P/fotos/anabel-lobby.jpg"
cp "$B/duena-brazos.jpg"  "$P/fotos/equipo-anabel.jpg"
cp "$B/duena-guantes.jpg" "$P/fotos/anabel-guantes.jpg"
cp "$B/d-unif.jpg"        "$P/fotos/servicio-limpieza.jpg"
cp "$B/lobby2.jpg"        "$P/fotos/lobby-monograma.jpg"
cp "$B/equipo.jpg"        "$P/fotos/servicio-aparatologia.jpg"
for s in laser lips pest cejas cera blanq tatu maq; do cp "$B/sv-$s.jpg" "$P/fotos/servicio-$s.jpg"; done
ls "$P/fotos" | wc -l
```
Expected: `15`

- [ ] **Step 2: Crear `vscode/src/site/brand.ts`**

```ts
// Rutas públicas de la marca y las fotos de la web de la clienta (spec §3.5 y §3.6).
export const LOGO = '/brand/logo-sin-icono.png';
export const LOGO_CLARO = '/brand/logo-sin-icono-claro.png';
export const MONOGRAMA = '/brand/icono.png';
export const FOTO_MENU = '/fotos/lobby-monograma.jpg';

export const FOTOS = {
  portada: '/fotos/portada.jpg',
  anabelLobby: '/fotos/anabel-lobby.jpg',
  equipoAnabel: '/fotos/equipo-anabel.jpg',
  anabelGuantes: '/fotos/anabel-guantes.jpg',
  servicio: {
    limpieza: '/fotos/servicio-limpieza.jpg',
    aparatologia: '/fotos/servicio-aparatologia.jpg',
    laser: '/fotos/servicio-laser.jpg',
    lips: '/fotos/servicio-lips.jpg',
    pestanas: '/fotos/servicio-pest.jpg',
    cejas: '/fotos/servicio-cejas.jpg',
    cera: '/fotos/servicio-cera.jpg',
    blanqueamiento: '/fotos/servicio-blanq.jpg',
    tatuaje: '/fotos/servicio-tatu.jpg',
    maquillaje: '/fotos/servicio-maq.jpg',
  },
} as const;
```

- [ ] **Step 3: Agregar Playfair Display al import de fuentes.** En `vscode/src/index.css`, línea 3, reemplaza la URL por:

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&display=swap');
```

- [ ] **Step 4: Verificar que compila**

Run: `cd vscode && npm run build`
Expected: `✓ built in`, sin errores.

- [ ] **Step 5: Commit**

```bash
git add vscode/public/brand/logo-sin-icono.png vscode/public/brand/logo-sin-icono-claro.png vscode/public/fotos vscode/src/site/brand.ts vscode/src/index.css
git commit -m "feat(sitio): logo sin la N, fotos optimizadas y fuente Playfair"
```

---

### Task 2: Tema marrón/beige

**Files:**
- Create: `vscode/src/site/theme/tema.ts`
- Create: `vscode/src/site/theme/useSiteTema.ts`
- Create: `vscode/src/site/theme/tokens.css`
- Test: `vscode/tests/tema.test.ts`

**Interfaces:**
- Produces: `type Tema = 'oscuro' | 'claro'`, `TEMA_POR_DEFECTO`, `CLAVE_TEMA`, `leerTema(almacen)`, `guardarTema(almacen, tema)` y `useSiteTema(): [Tema, (t: Tema) => void]`. Clases utilitarias en `tokens.css`: `.site`, `.s-wrap`, `.s-eyebrow`, `.s-display`, `.s-lead`, `.s-btn`, `.s-btn-solid`, `.s-btn-line`, `.s-ar`, `.s-skip`, `.s-main--pad`, y las variables `--s-bg --s-bg-alt --s-tex --s-text --s-soft --s-faint --s-accent --s-surface --s-surface-line --s-line --s-btn-bg --s-btn-fg --s-btn-hover --s-chip-on --s-chip-on-fg --s-arch-bg --s-nav-bg --s-menu-bg --s-shadow --s-nav-h --s-ease --s-ease-io --s-ease-x --s-listones-oscuro --s-listones-lino`.

- [ ] **Step 1: Escribir la prueba que falla** — `vscode/tests/tema.test.ts`

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerTema, guardarTema, CLAVE_TEMA, TEMA_POR_DEFECTO } from '../src/site/theme/tema.ts';

const memoria = (inicial: Record<string, string> = {}) => {
  const datos = { ...inicial };
  return { getItem: (k: string) => datos[k] ?? null, setItem: (k: string, v: string) => { datos[k] = v; }, datos };
};

test('sin nada guardado abre en marrón', () => {
  assert.equal(TEMA_POR_DEFECTO, 'oscuro');
  assert.equal(leerTema(memoria()), 'oscuro');
});

test('recuerda el beige si la clienta lo eligió', () => {
  assert.equal(leerTema(memoria({ [CLAVE_TEMA]: 'claro' })), 'claro');
});

test('un valor raro guardado vuelve al marrón', () => {
  assert.equal(leerTema(memoria({ [CLAVE_TEMA]: 'azul' })), 'oscuro');
});

test('almacén que falla (modo privado) no rompe: marrón', () => {
  const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
  assert.equal(leerTema(roto), 'oscuro');
  assert.doesNotThrow(() => guardarTema(roto, 'claro'));
});

test('sin almacén disponible también abre en marrón', () => {
  assert.equal(leerTema(null), 'oscuro');
});

test('guarda la elección con su clave', () => {
  const m = memoria();
  guardarTema(m, 'claro');
  assert.equal(m.datos[CLAVE_TEMA], 'claro');
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd vscode && npm test`
Expected: FAIL con `ERR_MODULE_NOT_FOUND ... src/site/theme/tema.ts`

- [ ] **Step 3: Implementar `vscode/src/site/theme/tema.ts`**

```ts
// Tema de la web de la clienta: marrón por defecto, beige opcional (spec §3.2).
// Va aparte del tema del panel (html[data-theme] / themeStore): uno no afecta al otro.
export const TEMAS = ['oscuro', 'claro'] as const;
export type Tema = (typeof TEMAS)[number];
export const TEMA_POR_DEFECTO: Tema = 'oscuro';
export const CLAVE_TEMA = 'anadsll-site-tema';

type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

/** Tema guardado en el teléfono de la clienta; marrón si no hay nada o si el almacén falla. */
export function leerTema(almacen: Almacen | null | undefined): Tema {
  try {
    const v = almacen?.getItem(CLAVE_TEMA) ?? '';
    return (TEMAS as readonly string[]).includes(v) ? (v as Tema) : TEMA_POR_DEFECTO;
  } catch {
    return TEMA_POR_DEFECTO;
  }
}

export function guardarTema(almacen: Almacen | null | undefined, tema: Tema): void {
  try {
    almacen?.setItem(CLAVE_TEMA, tema);
  } catch {
    // modo privado o almacenamiento bloqueado: el tema dura solo esta visita
  }
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd vscode && npm test`
Expected: `ℹ fail 0`, y las 6 pruebas de tema en verde.

- [ ] **Step 5: Implementar `vscode/src/site/theme/useSiteTema.ts`**

```ts
import { useCallback, useState } from 'react';
import { flushSync } from 'react-dom';
import { guardarTema, leerTema, type Tema } from './tema';

const almacen = () => {
  try { return window.localStorage; } catch { return null; }
};

/** Tema actual y cómo cambiarlo, con transición suave si el navegador la soporta. */
export function useSiteTema(): [Tema, (t: Tema) => void] {
  const [tema, setEstado] = useState<Tema>(() => leerTema(almacen()));
  const setTema = useCallback((t: Tema) => {
    guardarTema(almacen(), t);
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (doc.startViewTransition && !reducir) doc.startViewTransition(() => flushSync(() => setEstado(t)));
    else setEstado(t);
  }, []);
  return [tema, setTema];
}
```

- [ ] **Step 6: Crear `vscode/src/site/theme/tokens.css`**

```css
/* Sistema visual de la web de la clienta (spec §3). Todo cuelga de .site: el panel no se entera. */
.site{
  --s-camel:#B2967D; --s-camel-l:#CDB8A2; --s-cocoa:#7D5A44; --s-cocoa-d:#654735;
  --s-khaki:#D7C9B8; --s-linen:#F5F1EA; --s-crema:#FBF8F3; --s-choco:#2A1E17;
  --s-f-display:'Playfair Display', Georgia, serif;
  --s-f-body:'Outfit', system-ui, sans-serif;
  --s-nav-h:64px;
  --s-ease:cubic-bezier(.2,.7,.2,1);
  --s-ease-io:cubic-bezier(.65,0,.35,1);
  --s-ease-x:cubic-bezier(.7,0,.2,1);
  /* textura de listones, como la pared del salón */
  --s-listones-oscuro:
    linear-gradient(180deg, rgba(0,0,0,.28), rgba(0,0,0,0) 28%, rgba(0,0,0,0) 72%, rgba(0,0,0,.34)),
    repeating-linear-gradient(90deg, #271c15 0px, #3b2b21 17px, #2c2018 34px, #231912 36px);
  --s-listones-lino:
    linear-gradient(180deg, rgba(245,241,234,.2), rgba(245,241,234,.85)),
    repeating-linear-gradient(90deg, #f7f3ed 0px, #ebe3d9 24px, #f7f3ed 48px);
  position:relative;
  min-height:100vh;
  background:var(--s-bg);
  color:var(--s-text);
  font-family:var(--s-f-body);
  -webkit-font-smoothing:antialiased;
  overflow-x:clip;
}
@media (min-width: 761px){ .site{ --s-nav-h:70px } }
@media (min-width: 1101px){ .site{ --s-nav-h:74px } }

.site[data-site-tema="oscuro"]{
  color-scheme:dark;
  --s-bg:#2A1E17; --s-bg-alt:#33251C; --s-tex:var(--s-listones-oscuro);
  --s-text:#F5F1EA; --s-soft:rgba(245,241,234,.72); --s-faint:rgba(245,241,234,.45); --s-accent:#B2967D;
  --s-surface:rgba(245,241,234,.06); --s-surface-line:rgba(178,150,125,.24); --s-line:rgba(178,150,125,.24);
  --s-btn-bg:#B2967D; --s-btn-fg:#2A1E17; --s-btn-hover:#CDB8A2;
  --s-chip-on:#F5F1EA; --s-chip-on-fg:#2A1E17; --s-arch-bg:#3A2A20;
  --s-nav-bg:rgba(34,24,18,.9); --s-menu-bg:var(--s-listones-oscuro);
  --s-shadow:0 30px 60px -30px rgba(0,0,0,.7);
}
.site[data-site-tema="claro"]{
  color-scheme:light;
  --s-bg:#FBF8F3; --s-bg-alt:#F5F1EA; --s-tex:var(--s-listones-lino);
  --s-text:#2A1E17; --s-soft:#76665A; --s-faint:#A29487; --s-accent:#7D5A44;
  --s-surface:#FFFFFF; --s-surface-line:rgba(125,90,68,.1); --s-line:rgba(125,90,68,.18);
  --s-btn-bg:#7D5A44; --s-btn-fg:#FFFFFF; --s-btn-hover:#654735;
  --s-chip-on:#2A1E17; --s-chip-on-fg:#F5F1EA; --s-arch-bg:#D7C9B8;
  --s-nav-bg:rgba(251,248,243,.92); --s-menu-bg:var(--s-listones-lino);
  --s-shadow:0 26px 50px -30px rgba(42,30,23,.4);
}

.site *, .site *::before, .site *::after{ box-sizing:border-box }
.site img{ display:block; max-width:100% }
.site a{ color:inherit; text-decoration:none }
.site button{ font:inherit; color:inherit; cursor:pointer }
/* el CSS global pone Cormorant en h1–h3; aquí mandan Playfair y el tema */
.site h1, .site h2, .site h3, .site h4{ font-family:var(--s-f-display); font-weight:400; margin:0 }
.site :focus-visible{ outline:2px solid var(--s-accent); outline-offset:3px; border-radius:6px }

.s-wrap{ max-width:1180px; margin:0 auto; padding:0 20px }
@media (min-width: 761px){ .s-wrap{ padding:0 36px } }
@media (min-width: 1101px){ .s-wrap{ padding:0 56px } }

.s-eyebrow{ font:500 12px/1.2 var(--s-f-body); letter-spacing:.24em; text-transform:uppercase; color:var(--s-accent) }
.s-display{ font-family:var(--s-f-display); font-weight:400; letter-spacing:-.01em; line-height:1.05 }
.s-display em{ font-style:italic; color:var(--s-accent) }
.s-lead{ font-size:15.5px; line-height:1.7; color:var(--s-soft); font-weight:300; max-width:32em }
@media (min-width: 761px){ .s-lead{ font-size:17px } }

.s-btn{ display:inline-flex; align-items:center; justify-content:center; gap:10px; min-height:48px; padding:0 26px; border-radius:999px; border:0; font:500 15px var(--s-f-body); white-space:nowrap; transition:transform .35s var(--s-ease), background-color .35s, box-shadow .35s }
.s-btn-solid{ background:var(--s-btn-bg); color:var(--s-btn-fg) }
.s-btn-line{ background:transparent; color:var(--s-text); border:1px solid currentColor }
.s-ar{ display:inline-block; transition:transform .35s var(--s-ease) }
@media (hover:hover){
  .s-btn:hover .s-ar{ transform:translateX(5px) }
  .s-btn-solid:hover{ background:var(--s-btn-hover); transform:translateY(-2px); box-shadow:var(--s-shadow) }
  .s-btn-line:hover{ transform:translateY(-2px) }
}

.s-skip{ position:absolute; left:12px; top:-80px; z-index:100; padding:10px 16px; border-radius:10px; background:var(--s-btn-bg); color:var(--s-btn-fg); transition:top .2s }
.s-skip:focus{ top:12px }
.s-main--pad{ padding-top:var(--s-nav-h) }

@media (prefers-reduced-motion: reduce){
  .site *, .site *::before, .site *::after{
    animation-duration:.01ms !important; animation-iteration-count:1 !important;
    transition-duration:.01ms !important; scroll-behavior:auto !important;
  }
}
```

- [ ] **Step 7: Verificar tipos y compilación**

Run: `cd vscode && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site"`
Expected: `0` (ningún error en `src/site`).

- [ ] **Step 8: Commit**

```bash
git add vscode/src/site/theme vscode/tests/tema.test.ts
git commit -m "feat(sitio): tema marrón/beige separado del panel, con marrón por defecto"
```

---

### Task 3: Secciones, sección activa y navegación

**Files:**
- Create: `vscode/src/site/header/secciones.ts`
- Create: `vscode/src/site/header/useScrollSpy.ts`
- Create: `vscode/src/site/header/navegacion.ts`
- Test: `vscode/tests/secciones.test.ts`

**Interfaces:**
- Produces:
  - `interface Seccion { id: string; etiqueta: string }` y `SECCIONES: Seccion[]`, con los ids `s-inicio`, `s-servicios`, `s-paquetes`, `s-nosotros`, `s-equipo`, `s-opiniones` y `s-contacto`;
  - `seccionActiva(marcas: { id: string; top: number }[], linea: number): string | null`;
  - `useScrollSpy(activo: boolean): { activa: string | null; solida: boolean }`;
  - `irASeccion(id: string): void` y `useIrAlHash(): void`.
- **Contrato con las fases 2–4:** cada sección de la página es `<section id="s-…" data-spy="">`. Una sección que cuenta como otra usa `data-spy="s-nosotros"` (filosofía).

- [ ] **Step 1: Escribir la prueba que falla** — `vscode/tests/secciones.test.ts`

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SECCIONES, seccionActiva } from '../src/site/header/secciones.ts';

const marcas = [
  { id: 's-inicio', top: -900 },
  { id: 's-servicios', top: -100 },
  { id: 's-paquetes', top: 250 },
  { id: 's-nosotros', top: 900 },
];

test('las siete secciones del menú, en orden', () => {
  assert.deepEqual(SECCIONES.map((s) => s.etiqueta), ['Inicio', 'Servicios', 'Paquetes', 'Nosotros', 'Equipo', 'Opiniones', 'Contacto']);
  assert.ok(SECCIONES.every((s) => s.id.startsWith('s-')));
});

test('activa es la última que ya cruzó la línea', () => {
  assert.equal(seccionActiva(marcas, 260), 's-paquetes');
  assert.equal(seccionActiva(marcas, 200), 's-servicios');
});

test('arriba del todo: Inicio aunque nada haya cruzado', () => {
  assert.equal(seccionActiva([{ id: 's-inicio', top: 10 }, { id: 's-servicios', top: 700 }], 5), 's-inicio');
});

test('filosofía reporta Nosotros: dos marcas con el mismo id', () => {
  const m = [...marcas, { id: 's-nosotros', top: 1600 }];
  assert.equal(seccionActiva(m, 1700), 's-nosotros');
});

test('sin secciones en la página: null', () => {
  assert.equal(seccionActiva([], 300), null);
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd vscode && npm test`
Expected: FAIL con `ERR_MODULE_NOT_FOUND ... src/site/header/secciones.ts`

- [ ] **Step 3: Implementar `vscode/src/site/header/secciones.ts`**

```ts
// Secciones de la página principal: menú, pestañas y sección activa (spec §4.1).
export interface Seccion { id: string; etiqueta: string }

export const SECCIONES: Seccion[] = [
  { id: 's-inicio', etiqueta: 'Inicio' },
  { id: 's-servicios', etiqueta: 'Servicios' },
  { id: 's-paquetes', etiqueta: 'Paquetes' },
  { id: 's-nosotros', etiqueta: 'Nosotros' },
  { id: 's-equipo', etiqueta: 'Equipo' },
  { id: 's-opiniones', etiqueta: 'Opiniones' },
  { id: 's-contacto', etiqueta: 'Contacto' },
];

export interface MarcaSeccion { id: string; top: number }

/** La activa es la última (en orden de la página) cuyo borde de arriba ya cruzó la línea. */
export function seccionActiva(marcas: MarcaSeccion[], linea: number): string | null {
  let activa: string | null = marcas.length ? marcas[0].id : null;
  for (const m of marcas) if (m.top <= linea) activa = m.id;
  return activa;
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd vscode && npm test`
Expected: `ℹ fail 0`

- [ ] **Step 5: Implementar `vscode/src/site/header/useScrollSpy.ts`**

```ts
import { useEffect, useState } from 'react';
import { seccionActiva } from './secciones';

/** Qué sección [data-spy] cruza el tercio de la pantalla y si ya se bajó (barra sólida). */
export function useScrollSpy(activo: boolean): { activa: string | null; solida: boolean } {
  const [activa, setActiva] = useState<string | null>(null);
  const [solida, setSolida] = useState(false);

  useEffect(() => {
    let raf = 0;
    const medir = () => {
      raf = 0;
      setSolida(window.scrollY > 30);
      if (!activo) return;
      const marcas = [...document.querySelectorAll<HTMLElement>('[data-spy]')].map((el) => ({
        id: el.dataset.spy || el.id,
        top: el.getBoundingClientRect().top,
      }));
      setActiva(seccionActiva(marcas, window.innerHeight * 0.33));
    };
    const alMover = () => { if (!raf) raf = requestAnimationFrame(medir); };
    medir();
    window.addEventListener('scroll', alMover, { passive: true });
    window.addEventListener('resize', alMover);
    return () => {
      window.removeEventListener('scroll', alMover);
      window.removeEventListener('resize', alMover);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [activo]);

  return { activa, solida };
}
```

- [ ] **Step 6: Implementar `vscode/src/site/header/navegacion.ts`**

```ts
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const suave = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

/** Baja hasta una sección de la página actual; Inicio vuelve arriba del todo. */
export function irASeccion(id: string): void {
  if (id === 's-inicio') { window.scrollTo({ top: 0, behavior: suave() }); return; }
  document.getElementById(id)?.scrollIntoView({ behavior: suave(), block: 'start' });
}

/** Al llegar con "/#s-servicios" (p. ej. desde el menú en /reservar) baja a esa sección. */
export function useIrAlHash(): void {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    // espera a que la página pinte sus secciones
    const t = window.setTimeout(() => irASeccion(id), 60);
    return () => window.clearTimeout(t);
  }, [hash]);
}
```

- [ ] **Step 7: Verificar tipos**

Run: `cd vscode && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site"`
Expected: `0`

- [ ] **Step 8: Commit**

```bash
git add vscode/src/site/header/secciones.ts vscode/src/site/header/useScrollSpy.ts vscode/src/site/header/navegacion.ts vscode/tests/secciones.test.ts
git commit -m "feat(sitio): secciones, sección activa al bajar y navegación por ancla"
```

---

### Task 4: Botón MENÚ

**Files:**
- Create: `vscode/src/site/header/menuOrigen.ts`
- Create: `vscode/src/site/header/MenuButton.tsx`
- Create: `vscode/src/site/header/MenuButton.css`
- Test: `vscode/tests/menuOrigen.test.ts`

**Interfaces:**
- Produces:
  - `interface Punto { x: number; y: number }`;
  - `origenDesdeBoton(r: { right: number; top: number; height: number }): Punto`;
  - componente `MenuButton` con props `{ cerrar?: boolean; onClick: () => void; controla: string; expandido?: boolean; className?: string; ref?: React.Ref<HTMLButtonElement> }`.

- [ ] **Step 1: Escribir la prueba que falla** — `vscode/tests/menuOrigen.test.ts`

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { origenDesdeBoton } from '../src/site/header/menuOrigen.ts';

test('el círculo nace en el centro de las líneas del botón', () => {
  assert.deepEqual(origenDesdeBoton({ right: 340, top: 11, height: 42 }), { x: 319, y: 32 });
});

test('redondea a píxeles enteros', () => {
  assert.deepEqual(origenDesdeBoton({ right: 1254.6, top: 16.2, height: 42 }), { x: 1234, y: 37 });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd vscode && npm test`
Expected: FAIL con `ERR_MODULE_NOT_FOUND ... menuOrigen.ts`

- [ ] **Step 3: Implementar `vscode/src/site/header/menuOrigen.ts`**

```ts
export interface Punto { x: number; y: number }

/** Centro de las dos líneas del botón MENÚ (a 21 px de su borde derecho): ahí nace el círculo. */
export function origenDesdeBoton(r: { right: number; top: number; height: number }): Punto {
  return { x: Math.round(r.right - 21), y: Math.round(r.top + r.height / 2) };
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd vscode && npm test`
Expected: `ℹ fail 0`

- [ ] **Step 5: Crear `vscode/src/site/header/MenuButton.tsx`**

```tsx
import type { Ref } from 'react';
import './MenuButton.css';

interface Props {
  cerrar?: boolean;
  onClick: () => void;
  controla: string;
  expandido?: boolean;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
}

/** "MENÚ" + dos líneas finas; en modo cerrar las líneas se cruzan en X y la palabra rueda a "CERRAR". */
export default function MenuButton({ cerrar = false, onClick, controla, expandido, className = '', ref }: Props) {
  return (
    <button
      ref={ref}
      type="button"
      className={`s-menu-btn ${cerrar ? 'is-x' : ''} ${className}`}
      onClick={onClick}
      aria-label={cerrar ? 'Cerrar menú' : 'Abrir menú'}
      aria-controls={controla}
      aria-expanded={expandido}
    >
      <span className="s-mb-label" aria-hidden="true">
        <span className="s-mb-open">Menú</span>
        <span className="s-mb-close">Cerrar</span>
      </span>
      <span className="s-mb-lines" aria-hidden="true"><i /><i /></span>
    </button>
  );
}
```

- [ ] **Step 6: Crear `vscode/src/site/header/MenuButton.css`**

```css
.s-menu-btn{
  position:relative; display:inline-flex; align-items:center; gap:10px;
  height:40px; padding:0 4px 0 14px; border-radius:999px;
  border:1px solid transparent; background:transparent; color:var(--s-text);
  font:500 11px var(--s-f-body); letter-spacing:.24em; text-transform:uppercase;
  -webkit-tap-highlight-color:transparent; transition:border-color .45s, background-color .45s;
}
@media (min-width: 761px){ .s-menu-btn{ height:42px; padding-left:16px } }
/* las dos palabras en la misma celda: el ancho es el de la más larga y ninguna se corta */
.s-mb-label{ display:grid; justify-items:end; height:13px; line-height:13px; overflow:hidden }
.s-mb-label > span{ grid-area:1 / 1; transition:transform .6s var(--s-ease-x) }
.s-mb-close{ transform:translateY(110%) }
.s-menu-btn.is-x .s-mb-open{ transform:translateY(-110%) }
.s-menu-btn.is-x .s-mb-close{ transform:none }
.s-mb-lines{ position:relative; width:34px; height:34px; flex-shrink:0 }
.s-mb-lines i{ position:absolute; right:7px; top:50%; height:1px; background:currentColor; transition:transform .6s var(--s-ease-x), width .5s var(--s-ease-x) }
.s-mb-lines i:nth-child(1){ width:20px; transform:translateY(-4px) }
.s-mb-lines i:nth-child(2){ width:12px; transform:translateY(4px) }
.s-menu-btn.is-x .s-mb-lines i:nth-child(1){ width:20px; transform:rotate(45deg) }
.s-menu-btn.is-x .s-mb-lines i:nth-child(2){ width:20px; transform:rotate(-45deg) }
@media (hover:hover){ .s-menu-btn:hover .s-mb-lines i:nth-child(2){ width:20px } }
```

- [ ] **Step 7: Verificar tipos**

Run: `cd vscode && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site"`
Expected: `0`

- [ ] **Step 8: Commit**

```bash
git add vscode/src/site/header/menuOrigen.ts vscode/src/site/header/MenuButton.tsx vscode/src/site/header/MenuButton.css vscode/tests/menuOrigen.test.ts
git commit -m "feat(sitio): botón MENÚ sutil que se vuelve X"
```

---

### Task 5: Barra superior

**Files:**
- Create: `vscode/src/site/header/SiteHeader.tsx`
- Create: `vscode/src/site/header/SiteHeader.css`

**Interfaces:**
- Consumes: `SECCIONES` (Task 3), `MenuButton` (Task 4), `LOGO` y `LOGO_CLARO` (Task 1).
- Produces: `SiteHeader` con props `{ conSecciones: boolean; activa: string | null; solida: boolean; menuAbierto: boolean; onAbrirMenu: (boton: HTMLButtonElement) => void; onIr: (id: string) => void }`.

- [ ] **Step 1: Crear `vscode/src/site/header/SiteHeader.tsx`**

```tsx
import { useEffect, useRef, type MouseEvent } from 'react';
import MenuButton from './MenuButton';
import { SECCIONES } from './secciones';
import { LOGO, LOGO_CLARO } from '../brand';
import './SiteHeader.css';

interface Props {
  conSecciones: boolean;
  activa: string | null;
  solida: boolean;
  menuAbierto: boolean;
  onAbrirMenu: (boton: HTMLButtonElement) => void;
  onIr: (id: string) => void;
}

/** Celular/tableta: logo | MENÚ (+ pestañas al bajar). Computadora: logo | secciones centradas | MENÚ. */
export default function SiteHeader({ conSecciones, activa, solida, menuAbierto, onAbrirMenu, onIr }: Props) {
  const boton = useRef<HTMLButtonElement>(null);
  const ir = (id: string) => (e: MouseEvent) => { e.preventDefault(); onIr(id); };

  return (
    <header className={`s-nav ${solida ? 'is-solida' : ''}`}>
      <div className="s-wrap s-nav-in">
        <a className="s-logo" href="/#s-inicio" onClick={ir('s-inicio')} aria-label="Anadsll Beauty Esthetic, ir al inicio">
          <img className="s-lc" src={LOGO} alt="" />
          <img className="s-lw" src={LOGO_CLARO} alt="" />
        </a>
        {conSecciones && (
          <nav className="s-links" aria-label="Secciones">
            {SECCIONES.map((s) => (
              <a key={s.id} href={`#${s.id}`} onClick={ir(s.id)}
                className={activa === s.id ? 'is-on' : ''} aria-current={activa === s.id ? 'true' : undefined}>
                {s.etiqueta}
              </a>
            ))}
          </nav>
        )}
        <MenuButton ref={boton} className="s-nav-menu" controla="s-menu" expandido={menuAbierto}
          onClick={() => boton.current && onAbrirMenu(boton.current)} />
      </div>
      {conSecciones && <Pestanas activa={activa} onIr={onIr} />}
    </header>
  );
}

/** Fila de pestañas (celular y tableta): la activa va rellena y se centra sola. */
function Pestanas({ activa, onIr }: { activa: string | null; onIr: (id: string) => void }) {
  const fila = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const f = fila.current, el = f?.querySelector<HTMLElement>('.is-on');
    if (f && el) f.scrollTo({ left: el.offsetLeft - f.clientWidth / 2 + el.offsetWidth / 2, behavior: 'smooth' });
  }, [activa]);
  return (
    <div className="s-chips" ref={fila}>
      {SECCIONES.map((s) => (
        <button key={s.id} type="button" className={`s-chip ${activa === s.id ? 'is-on' : ''}`} onClick={() => onIr(s.id)}>
          {s.etiqueta}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Crear `vscode/src/site/header/SiteHeader.css`**

```css
.s-nav{ position:fixed; left:0; right:0; top:0; z-index:40; transition:background-color .4s, box-shadow .4s }
.s-nav.is-solida{ background:var(--s-nav-bg); -webkit-backdrop-filter:blur(14px); backdrop-filter:blur(14px); box-shadow:0 10px 30px -18px rgba(0,0,0,.5) }
.s-nav.is-solida .s-nav-menu{ border-color:var(--s-line) }
.s-nav-in{ height:var(--s-nav-h); display:flex; align-items:center; justify-content:space-between; gap:24px }
.s-logo img{ height:46px; width:auto }
@media (min-width: 761px){ .s-logo img{ height:48px } }
@media (min-width: 1101px){ .s-logo img{ height:52px } }
.site[data-site-tema="oscuro"] .s-lc, .site[data-site-tema="claro"] .s-lw{ display:none }

/* secciones en texto: solo en computadora, centradas de verdad (tres columnas) */
.s-links{ display:none }
@media (min-width: 1101px){
  .s-nav-in{ display:grid; grid-template-columns:1fr auto 1fr }
  .s-nav-in .s-logo{ justify-self:start; grid-column:1 }
  /* columna fija: en páginas sin secciones (/reservar, /mis-citas) MENÚ sigue a la derecha */
  .s-nav-in .s-nav-menu{ justify-self:end; grid-column:3 }
  .s-links{ display:flex; grid-column:2; gap:30px; font-size:14px; letter-spacing:.02em }
  .s-links a{ position:relative; padding:6px 0; opacity:.72; transition:opacity .35s }
  .s-links a::after{ content:""; position:absolute; left:0; right:0; bottom:-2px; height:1px; background:currentColor; transform:scaleX(0); transition:transform .45s var(--s-ease) }
  .s-links a.is-on{ opacity:1 }
  .s-links a.is-on::after{ transform:scaleX(1) }
}
@media (min-width: 1101px) and (hover:hover){ .s-links a:hover{ opacity:1 } }

/* pestañas: celular y tableta, aparecen al bajar */
.s-chips{ display:flex; gap:8px; overflow-x:auto; padding:0 20px; max-height:0; opacity:0; scroll-padding-inline:20px; transition:max-height .5s var(--s-ease-io), opacity .4s, padding .5s }
.s-chips::-webkit-scrollbar{ display:none }
.s-nav.is-solida .s-chips{ max-height:60px; opacity:1; padding:2px 20px 12px }
@media (min-width: 761px){
  .s-chips{ padding:0 36px; scroll-padding-inline:36px }
  .s-nav.is-solida .s-chips{ padding:2px 36px 12px }
}
@media (min-width: 1101px){ .s-chips{ display:none } }
.s-chip{ flex-shrink:0; border:1px solid var(--s-line); background:none; padding:7px 14px; border-radius:999px; font-size:13px; color:var(--s-soft); white-space:nowrap; transition:background-color .35s, color .35s, border-color .35s }
.s-chip.is-on{ background:var(--s-chip-on); color:var(--s-chip-on-fg); border-color:transparent }
```

- [ ] **Step 3: Verificar tipos**

Run: `cd vscode && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site"`
Expected: `0`

- [ ] **Step 4: Commit**

```bash
git add vscode/src/site/header/SiteHeader.tsx vscode/src/site/header/SiteHeader.css
git commit -m "feat(sitio): barra superior logo | secciones | MENÚ y pestañas al bajar"
```

---

### Task 6: Menú premium con día/noche

**Files:**
- Create: `vscode/src/site/header/SiteMenu.tsx`
- Create: `vscode/src/site/header/SiteMenu.css`

**Interfaces:**
- Consumes: `MenuButton` (Task 4), `Punto` (Task 4), `SECCIONES` (Task 3), `Tema` (Task 2), `LOGO`, `LOGO_CLARO`, `MONOGRAMA` y `FOTO_MENU` (Task 1), `site` de `src/config/site.ts`.
- Produces: `SiteMenu` con props `{ abierto: boolean; origen: Punto; activa: string | null; tema: Tema; onTema: (t: Tema) => void; onCerrar: () => void; onIr: (id: string) => void }`.

- [ ] **Step 1: Crear `vscode/src/site/header/SiteMenu.tsx`**

```tsx
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import MenuButton from './MenuButton';
import { SECCIONES } from './secciones';
import type { Punto } from './menuOrigen';
import type { Tema } from '../theme/tema';
import { FOTO_MENU, LOGO, LOGO_CLARO, MONOGRAMA } from '../brand';
import { site } from '../../config/site';
import './SiteMenu.css';

interface Props {
  abierto: boolean;
  origen: Punto;
  activa: string | null;
  tema: Tema;
  onTema: (t: Tema) => void;
  onCerrar: () => void;
  onIr: (id: string) => void;
}

const Luna = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>);
const Sol = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>);

/** Se abre en círculo desde el botón; las secciones suben una tras otra (spec §4.3). */
export default function SiteMenu({ abierto, origen, activa, tema, onTema, onCerrar, onIr }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const cerrar = useRef<HTMLButtonElement>(null);
  const [x, setX] = useState(false);       // las líneas se cruzan un instante después de abrir
  const [listo, setListo] = useState(false); // terminó la entrada: el hover ya responde sin retrasos

  useEffect(() => {
    if (!abierto) { setX(false); setListo(false); return; }
    const t1 = window.setTimeout(() => setX(true), 120);
    const t2 = window.setTimeout(() => setListo(true), 1400);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [abierto]);

  // Escape cierra, Tab no se escapa del menú y el fondo no se desplaza
  useEffect(() => {
    if (!abierto) return;
    const el = panel.current;
    panel.current?.scrollTo(0, 0);
    cerrar.current?.focus({ preventScroll: true });
    const enfocables = () => [...(el?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])];
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCerrar(); return; }
      if (e.key !== 'Tab') return;
      const f = enfocables();
      if (!f.length) return;
      const primero = f[0], ultimo = f[f.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    };
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', alTeclear);
    return () => { document.removeEventListener('keydown', alTeclear); document.body.style.overflow = antes; };
  }, [abierto, onCerrar]);

  const estilo = { '--mx': `${origen.x}px`, '--my': `${origen.y}px` } as CSSProperties;

  return (
    <div id="s-menu" ref={panel} role="dialog" aria-modal="true" aria-label="Menú" aria-hidden={!abierto} inert={!abierto}
      className={`s-menu ${abierto ? 'is-open' : ''} ${listo ? 'is-listo' : ''}`} style={estilo}>
      <div className="s-menu-glow" aria-hidden="true" />
      <img className="s-menu-mono" src={MONOGRAMA} alt="" aria-hidden="true" />

      <div className="s-wrap s-menu-top">
        <a className="s-logo" href="/#s-inicio" onClick={(e) => { e.preventDefault(); onIr('s-inicio'); }} aria-label="Ir al inicio">
          <img className="s-lc" src={LOGO} alt="" /><img className="s-lw" src={LOGO_CLARO} alt="" />
        </a>
        <MenuButton ref={cerrar} cerrar={x} controla="s-menu" expandido onClick={onCerrar} />
      </div>

      <div className="s-wrap s-menu-body">
        <nav className="s-menu-list" aria-label="Secciones">
          {SECCIONES.map((s, i) => (
            <a key={s.id} href={`/#${s.id}`} style={{ '--i': i } as CSSProperties}
              className={activa === s.id ? 'is-on' : ''} aria-current={activa === s.id ? 'true' : undefined}
              onClick={(e) => { e.preventDefault(); onIr(s.id); }}>
              <span className="s-ml-n">{String(i + 1).padStart(2, '0')}</span>
              <span className="s-ml-t"><span>{s.etiqueta}</span></span>
              <span className="s-ml-here">Estás aquí</span>
              <span className="s-ml-arrow" aria-hidden="true">→</span>
            </a>
          ))}
        </nav>
        <aside className="s-menu-side" aria-hidden="true">
          <div className="s-ms-arch"><img src={FOTO_MENU} alt="" loading="lazy" /></div>
          <p className="s-ms-q">“Belleza y bienestar con responsabilidad.”</p>
        </aside>
      </div>

      <div className="s-wrap s-menu-bottom">
        <div className="s-ts">
          <span className="s-ts-lbl" id="s-ts-lbl">Apariencia</span>
          <div className="s-ts-seg" role="radiogroup" aria-labelledby="s-ts-lbl" data-on={tema}>
            <i className="s-ts-knob" aria-hidden="true" />
            <button type="button" role="radio" aria-checked={tema === 'oscuro'} className={tema === 'oscuro' ? 'is-on' : ''} onClick={() => onTema('oscuro')}><Luna />Marrón</button>
            <button type="button" role="radio" aria-checked={tema === 'claro'} className={tema === 'claro' ? 'is-on' : ''} onClick={() => onTema('claro')}><Sol />Beige</button>
          </div>
        </div>
        <div className="s-menu-cta">
          <Link className="s-btn s-btn-solid" to="/reservar" onClick={onCerrar}>Agendar cita <span className="s-ar">→</span></Link>
          <Link className="s-btn s-btn-line" to="/mis-citas" onClick={onCerrar}>Mis citas</Link>
        </div>
        <div className="s-menu-info">
          <span>{site.hours}</span>
          <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp {site.phone}</a>
          <a href={`https://www.instagram.com/${site.instagram}`} target="_blank" rel="noopener noreferrer">@{site.instagram}</a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear `vscode/src/site/header/SiteMenu.css`**

```css
.s-menu{
  position:fixed; inset:0; z-index:60; display:flex; flex-direction:column;
  background:var(--s-menu-bg); color:var(--s-text); padding-bottom:24px; overflow-y:auto; overflow-x:hidden;
  clip-path:circle(0px at var(--mx, 92%) var(--my, 32px)); visibility:hidden; pointer-events:none;
  transition:clip-path .75s var(--s-ease-x), visibility 0s linear .75s;
}
.s-menu.is-open{ clip-path:circle(150% at var(--mx, 92%) var(--my, 32px)); visibility:visible; pointer-events:auto; transition:clip-path .9s var(--s-ease-x), visibility 0s }
.s-menu::-webkit-scrollbar{ width:0 }
.s-menu .s-wrap{ width:100% }
.s-menu-glow{ position:absolute; right:-25%; top:-12%; width:80%; aspect-ratio:1; border-radius:50%; background:radial-gradient(circle, rgba(178,150,125,.24), transparent 65%); pointer-events:none }
.s-menu-mono{ position:absolute; right:-50px; bottom:-40px; height:62%; opacity:.05; pointer-events:none }
.site[data-site-tema="oscuro"] .s-menu-mono{ filter:brightness(0) invert(1) }
/* misma altura y márgenes que la barra: el botón Cerrar cae donde estaba MENÚ */
.s-menu-top{ position:relative; display:flex; align-items:center; justify-content:space-between; height:var(--s-nav-h); flex-shrink:0 }
.s-menu-body{ position:relative; flex:1; display:grid; grid-template-columns:1fr; gap:24px; align-items:center; padding-top:2px; padding-bottom:16px }
.s-menu-list{ display:flex; flex-direction:column }
.s-menu-list a{ position:relative; display:flex; align-items:center; gap:14px; padding:9px 0; -webkit-tap-highlight-color:transparent }
.s-menu-list a::after{ content:""; position:absolute; left:0; right:0; bottom:0; height:1px; background:var(--s-line); transform:scaleX(0); transform-origin:left; transition:transform .5s var(--s-ease) }
.s-menu.is-open .s-menu-list a::after{ transform:scaleX(1); transition:transform 1s var(--s-ease) calc(.32s + var(--i) * 60ms) }
.s-ml-n{ font:500 11px var(--s-f-body); letter-spacing:.2em; color:var(--s-accent); width:22px; flex-shrink:0; opacity:0; transition:opacity .3s }
.s-menu.is-open .s-ml-n{ opacity:1; transition:opacity .6s calc(.4s + var(--i) * 60ms) }
/* la ventana que recorta deja un margen a la derecha para que la cursiva no se corte */
.s-ml-t{ display:block; overflow:hidden; padding:2px .25em 6px 0 }
.s-ml-t > span{ display:block; font-family:var(--s-f-display); font-size:30px; line-height:1.1; transform:translateY(115%); transition:transform .45s var(--s-ease-x), color .4s }
.s-menu.is-open .s-ml-t > span{ transform:none; transition:transform 1s cubic-bezier(.2,.8,.2,1) calc(.24s + var(--i) * 60ms), color .4s }
.s-menu-list a.is-on .s-ml-t > span{ font-style:italic; color:var(--s-accent) }
.s-ml-here{ margin-left:auto; display:none; align-items:center; gap:9px; font:500 9.5px var(--s-f-body); letter-spacing:.14em; text-transform:uppercase; color:var(--s-accent); white-space:nowrap }
.s-ml-here::before{ content:""; width:6px; height:6px; border-radius:50%; background:currentColor; box-shadow:0 0 0 4px color-mix(in srgb, var(--s-accent) 25%, transparent); animation:s-pulso 2.4s ease-in-out infinite }
@keyframes s-pulso{ 50%{ box-shadow:0 0 0 7px color-mix(in srgb, var(--s-accent) 8%, transparent) } }
.s-menu-list a.is-on .s-ml-here{ display:inline-flex }
.s-ml-arrow{ margin-left:auto; font:400 18px var(--s-f-body); color:var(--s-accent); opacity:0; transform:translateX(-10px) }
.s-menu-list a.is-on .s-ml-arrow{ display:none }
/* al pasar el mouse: se desliza y toma color, sin cambiar la letra; solo cuando la entrada terminó */
.s-menu.is-listo .s-ml-t{ transition:transform .6s cubic-bezier(.2,.8,.2,1) }
.s-menu.is-listo .s-ml-t > span{ transition:color .45s ease }
.s-menu.is-listo .s-ml-n{ transition:transform .6s cubic-bezier(.2,.8,.2,1) }
.s-menu.is-listo .s-menu-list a::after{ transition:transform .6s var(--s-ease), background-color .45s ease }
.s-menu.is-listo .s-ml-arrow{ transition:opacity .45s ease, transform .6s cubic-bezier(.2,.8,.2,1) }
@media (hover:hover){
  .s-menu.is-listo .s-menu-list a:hover .s-ml-t{ transform:translateX(12px) }
  .s-menu.is-listo .s-menu-list a:hover .s-ml-t > span{ color:var(--s-accent) }
  .s-menu.is-listo .s-menu-list a:hover .s-ml-n{ transform:translateX(4px) }
  .s-menu.is-listo .s-menu-list a:hover::after{ background:color-mix(in srgb, var(--s-accent) 70%, transparent) }
  .s-menu.is-listo .s-menu-list a:hover .s-ml-arrow{ opacity:1; transform:none }
}
.s-menu-side{ display:none }
.s-menu-bottom{ position:relative; display:grid; gap:14px; opacity:0; transform:translateY(16px); transition:opacity .3s, transform .4s }
.s-menu.is-open .s-menu-bottom{ opacity:1; transform:none; transition:opacity .7s .6s, transform .8s .55s var(--s-ease) }
.s-ts{ display:flex; align-items:center; justify-content:space-between; gap:14px; padding:12px 0; border-top:1px solid var(--s-line); border-bottom:1px solid var(--s-line) }
.s-ts-lbl{ font:500 10.5px var(--s-f-body); letter-spacing:.22em; text-transform:uppercase; color:var(--s-soft) }
.s-ts-seg{ position:relative; display:grid; grid-template-columns:1fr 1fr; padding:4px; border-radius:999px; border:1px solid var(--s-line) }
.s-ts-seg button{ position:relative; z-index:1; display:flex; align-items:center; justify-content:center; gap:7px; height:36px; padding:0 12px; border:0; background:none; border-radius:999px; font:500 12.5px var(--s-f-body); color:var(--s-soft); transition:color .5s }
.s-ts-seg button svg{ width:14px; height:14px }
.s-ts-seg button.is-on{ color:var(--s-btn-fg) }
.s-ts-knob{ position:absolute; top:4px; bottom:4px; left:4px; width:calc(50% - 4px); border-radius:999px; background:var(--s-btn-bg); transition:transform .6s var(--s-ease-io), background-color .6s }
.s-ts-seg[data-on="claro"] .s-ts-knob{ transform:translateX(100%) }
.s-menu-cta{ display:grid; grid-template-columns:1fr 1fr; gap:10px }
.s-menu-cta .s-btn{ width:100%; padding:0 14px }
.s-menu-info{ display:flex; flex-wrap:wrap; gap:6px 18px; font-size:12.5px; color:var(--s-soft) }

@media (min-width: 761px){
  .s-menu-list a{ padding:12px 0; gap:16px }
  .s-ml-t > span{ font-size:33px }
  .s-ml-here{ font-size:10px; letter-spacing:.18em }
  .s-ts-seg{ min-width:208px }
}
@media (min-width: 900px){
  .s-menu-body{ grid-template-columns:1.25fr .75fr; gap:72px }
  .s-menu-list a{ padding:10px 0 }
  .s-ml-t > span{ font-size:42px }
  .s-menu-side{ display:block; max-width:360px; width:100%; justify-self:end; opacity:0; transform:scale(.96); transition:opacity .4s, transform .6s }
  .s-menu.is-open .s-menu-side{ opacity:1; transform:none; transition:opacity 1s .45s, transform 1.2s .4s var(--s-ease) }
  .s-ms-arch{ aspect-ratio:4/5.2; max-height:min(54vh, 500px); border-radius:999px 999px 26px 26px; overflow:hidden; -webkit-mask-image:-webkit-radial-gradient(white, black) }
  .s-ms-arch img{ width:100%; height:100%; object-fit:cover }
  .s-ms-q{ font-family:var(--s-f-display); font-style:italic; font-size:22px; line-height:1.3; margin-top:18px; color:var(--s-soft) }
  .s-menu-bottom{ grid-template-columns:auto 1fr; align-items:center; gap:18px 30px }
  .s-menu-bottom .s-menu-info{ grid-column:1 / -1 }
  .s-menu-cta{ justify-self:end; min-width:380px }
}
@media (prefers-reduced-motion: reduce){ .s-menu{ transition:none !important } }
```

- [ ] **Step 3: Verificar tipos**

Run: `cd vscode && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site"`
Expected: `0`. Si TypeScript no reconoce `inert`, cambia `inert={!abierto}` por `{...(!abierto ? { inert: true } : {})}`.

- [ ] **Step 4: Commit**

```bash
git add vscode/src/site/header/SiteMenu.tsx vscode/src/site/header/SiteMenu.css
git commit -m "feat(sitio): menú que se abre en círculo, con sección actual y día/noche"
```

---

### Task 7: Contenedor del sitio, pie, WhatsApp y vista previa `/_diseno`

**Files:**
- Create: `vscode/src/site/SiteLayout.tsx`, `vscode/src/site/SiteLayout.css`
- Create: `vscode/src/site/SiteFooter.tsx`, `vscode/src/site/WhatsAppButton.tsx`
- Create: `vscode/src/site/DisenoPreview.tsx`
- Modify: `vscode/src/App.tsx` (ruta de desarrollo, antes del catch-all)

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: `SiteLayout` con props `{ children: ReactNode; conSecciones?: boolean; whatsappElevado?: boolean }`. Las fases 2, 5 y 6 envuelven `LandingPage`, `BookingPage` y `ClientPortal` con él. `conSecciones` solo va en la página principal. `whatsappElevado` va en `/reservar`, para dejar libre la barra inferior.

- [ ] **Step 1: Crear `vscode/src/site/WhatsAppButton.tsx`**

```tsx
import { site } from '../config/site';

/** Botón flotante de WhatsApp; en /reservar sube para no tapar la barra de abajo. */
export default function WhatsAppButton({ elevado = false }: { elevado?: boolean }) {
  const mensaje = encodeURIComponent('Hola, quiero información');
  return (
    <a className={`s-wa ${elevado ? 'is-elevado' : ''}`} href={`https://wa.me/${site.whatsapp}?text=${mensaje}`}
      target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2A9.8 9.8 0 0 0 3.6 17l-1.4 4.8 4.9-1.3A9.8 9.8 0 1 0 12 2.2Zm0 1.8a8 8 0 1 1-4.1 14.9l-.3-.2-2.8.7.8-2.7-.2-.3A8 8 0 0 1 12 4Zm-3.1 3.9c-.2 0-.5 0-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.8 2.2.9 2.6.7 3.1.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3l-1.7-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2-1.3-.8-.7-1.3-1.5-1.4-1.8-.2-.3 0-.4.1-.5l.4-.4.2-.4v-.4l-.8-1.9c-.2-.5-.4-.4-.5-.4h-.5Z" /></svg>
    </a>
  );
}
```

- [ ] **Step 2: Crear `vscode/src/site/SiteFooter.tsx`**

```tsx
import { LOGO_CLARO } from './brand';
import { site } from '../config/site';

export default function SiteFooter() {
  return (
    <footer className="s-foot">
      <div className="s-wrap s-foot-in">
        <img src={LOGO_CLARO} alt={site.name} />
        <span>© {new Date().getFullYear()} {site.name} · San José de Ocoa</span>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Crear `vscode/src/site/SiteLayout.tsx`**

```tsx
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SiteHeader from './header/SiteHeader';
import SiteMenu from './header/SiteMenu';
import { useScrollSpy } from './header/useScrollSpy';
import { irASeccion } from './header/navegacion';
import { origenDesdeBoton, type Punto } from './header/menuOrigen';
import { useSiteTema } from './theme/useSiteTema';
import SiteFooter from './SiteFooter';
import WhatsAppButton from './WhatsAppButton';
import './theme/tokens.css';
import './SiteLayout.css';

interface Props { children: ReactNode; conSecciones?: boolean; whatsappElevado?: boolean }

/** Todo lo que ve la clienta va dentro: tema, barra, menú, pie y WhatsApp. */
export default function SiteLayout({ children, conSecciones = false, whatsappElevado = false }: Props) {
  const [tema, setTema] = useSiteTema();
  const { activa, solida } = useScrollSpy(conSecciones);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [origen, setOrigen] = useState<Punto>({ x: 0, y: 0 });
  const abridor = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const abrirMenu = useCallback((boton: HTMLButtonElement) => {
    abridor.current = boton;
    setOrigen(origenDesdeBoton(boton.getBoundingClientRect()));
    setMenuAbierto(true);
  }, []);

  const cerrarMenu = useCallback(() => {
    setMenuAbierto(false);
    abridor.current?.focus({ preventScroll: true });
  }, []);

  const ir = useCallback((id: string) => {
    setMenuAbierto(false);
    if (!conSecciones || pathname !== '/') { navigate(`/#${id}`); return; }
    requestAnimationFrame(() => irASeccion(id));
  }, [conSecciones, navigate, pathname]);

  return (
    <div className="site" data-site-tema={tema}>
      <a className="s-skip" href="#s-contenido">Saltar al contenido</a>
      <SiteHeader conSecciones={conSecciones} activa={activa} solida={solida} menuAbierto={menuAbierto} onAbrirMenu={abrirMenu} onIr={ir} />
      <SiteMenu abierto={menuAbierto} origen={origen} activa={activa} tema={tema} onTema={setTema} onCerrar={cerrarMenu} onIr={ir} />
      <main id="s-contenido" className={conSecciones ? 's-main' : 's-main s-main--pad'}>{children}</main>
      <SiteFooter />
      <WhatsAppButton elevado={whatsappElevado} />
    </div>
  );
}
```

- [ ] **Step 4: Crear `vscode/src/site/SiteLayout.css`**

```css
.s-main section{ scroll-margin-top:calc(var(--s-nav-h) + 56px) }
.s-foot{ background:#1f1611; color:rgba(245,241,234,.55) }
.s-foot-in{ display:flex; flex-direction:column; align-items:center; gap:16px; padding:28px 20px 96px; font-size:13px; text-align:center }
.s-foot-in img{ height:62px; width:auto }
@media (min-width: 761px){
  .s-foot-in{ flex-direction:row; justify-content:space-between; padding:30px 36px; text-align:left }
  .s-foot-in img{ height:58px }
}
.s-wa{ position:fixed; right:14px; bottom:14px; z-index:30; width:50px; height:50px; border-radius:50%; display:grid; place-items:center; background:var(--s-btn-bg); color:var(--s-btn-fg); box-shadow:0 14px 30px -10px rgba(0,0,0,.45); transition:transform .3s, background-color .6s, color .6s }
.s-wa svg{ width:25px; height:25px }
.s-wa.is-elevado{ bottom:92px }
@media (min-width: 761px){ .s-wa{ right:20px; bottom:20px; width:54px; height:54px } .s-wa.is-elevado{ bottom:96px } }
@media (hover:hover){ .s-wa:hover{ transform:scale(1.07) } }
```

- [ ] **Step 5: Crear `vscode/src/site/DisenoPreview.tsx`** (solo desarrollo; la Fase 2 la reemplaza con la página real)

```tsx
import SiteLayout from './SiteLayout';
import { SECCIONES } from './header/secciones';
import { useIrAlHash } from './header/navegacion';

/** Vista previa del caparazón con secciones de relleno. Solo existe en `npm run dev`. */
export default function DisenoPreview() {
  useIrAlHash();
  return (
    <SiteLayout conSecciones>
      {SECCIONES.map((s, i) => (
        <section key={s.id} id={s.id} data-spy="" style={{ minHeight: '90vh', padding: 'calc(var(--s-nav-h) + 40px) 0 60px', background: i % 2 ? 'var(--s-bg-alt)' : 'var(--s-tex)' }}>
          <div className="s-wrap">
            <p className="s-eyebrow">Sección {i + 1}</p>
            <h2 className="s-display" style={{ fontSize: 42, margin: '16px 0' }}>{s.etiqueta} <em>de prueba</em></h2>
            <p className="s-lead">Relleno para probar la barra, las pestañas, el menú y el tema.</p>
          </div>
        </section>
      ))}
    </SiteLayout>
  );
}
```

- [ ] **Step 6: Registrar la ruta en `vscode/src/App.tsx`.** Agrega el import junto a los otros imports de páginas:

```tsx
import DisenoPreview from './site/DisenoPreview';
```

Y dentro de `<Routes>`, justo antes del comentario `{/* Catch-all */}`:

```tsx
        {import.meta.env.DEV && <Route path="/_diseno" element={<DisenoPreview />} />}
```

- [ ] **Step 7: Pruebas, tipos y compilación**

Run: `cd vscode && npm test && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site" ; npm run build`
Expected: `ℹ fail 0`, luego `0` y `✓ built in`.

- [ ] **Step 8: Verificación en el navegador.** Corre `cd vscode && npm run dev -- --host`, abre `http://localhost:5173/_diseno` y revisa cada punto en 360, 390, 430, 820, 1180, 1280 y 1440 px, en ambos temas:
  1. **Arriba:** la barra es transparente sobre la textura. En ≤ 1100 px se ve solo logo + MENÚ; en > 1100 px, logo | 7 secciones centradas | MENÚ en una fila, con "Inicio" subrayado.
  2. **Al bajar 40 px:** la barra se vuelve sólida con desenfoque. En ≤ 1100 px aparece la fila de pestañas y la activa cambia al pasar cada sección.
  3. **Al tocar MENÚ:** el círculo nace del botón, "Cerrar" cae exactamente donde estaba MENÚ, las secciones suben en cascada y la actual dice "ESTÁS AQUÍ". Comprueba con DevTools que `getBoundingClientRect().right` del botón Cerrar es igual al de MENÚ en 360, 820 y 1440.
  4. **Tema:** "Marrón | Beige" cambia el tema con transición. Al recargar, el tema se mantiene. En una ventana privada abre en marrón.
  5. **Con el menú abierto:**
     - Escape cierra y el foco vuelve a MENÚ;
     - Tab recorre solo el menú;
     - la rueda del mouse no desplaza la página de fondo;
     - al tocar "Paquetes", el menú se cierra y la página baja a Paquetes.
  6. **Mouse (en PC):** al pasarlo sobre una sección del menú, esta se desliza y toma el color camel, **sin cambiar la letra ni cortarse**.
  7. **Enlace directo:** `http://localhost:5173/_diseno#s-paquetes` abre directamente en Paquetes.
  8. **Sin movimiento:** con "Emular prefers-reduced-motion: reduce" en DevTools no hay animaciones.
  9. **En tu teléfono** (misma WiFi), abre `http://<IP de la PC>:5173/_diseno` y repite los puntos 1, 3 y 4.

- [ ] **Step 9: Commit**

```bash
git add vscode/src/site/SiteLayout.tsx vscode/src/site/SiteLayout.css vscode/src/site/SiteFooter.tsx vscode/src/site/WhatsAppButton.tsx vscode/src/site/DisenoPreview.tsx vscode/src/App.tsx
git commit -m "feat(sitio): contenedor con tema, barra, menú, pie y WhatsApp; vista previa /_diseno"
```

---

## Al terminar la Fase 1

- Todas las pruebas pasan (`npm test`), el build pasa y la vista previa cumple los 9 puntos.
- Se abre un PR "Rediseño fase 1: base visual, barra y menú" contra `main` (no cambia nada visible
  en producción, porque `/_diseno` solo existe en desarrollo).
- Siguiente: escribir el plan de la **Fase 2** (página principal) con el skill writing-plans, a partir
  de la spec §5 y el boceto `land-v4.html`. Recordatorio para ese plan: `LandingPage` debe llamar
  `useIrAlHash()`, porque el menú en `/reservar` y `/mis-citas` navega a `/#s-…`, y cada sección debe
  llevar `id="s-…"` y `data-spy` (contrato de la Task 3).
