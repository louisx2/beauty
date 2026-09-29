# Rediseño · Fase 2: página principal nueva — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la página principal `/` por la del boceto aprobado `land-v4`, dentro del caparazón de la Fase 1:
- portada;
- franja de confianza;
- servicios con catálogo desplegable;
- paquetes en estilo "Menú con foto";
- Conoce a Anabel;
- filosofía en óvalos;
- opiniones;
- llamada final;
- contacto.

La página vieja no se pierde: queda en `/diseno-anterior`.

**Architecture:**
- **Dónde va:** cada sección es un componente en `vscode/src/site/landing/`, con su `.css`. Las piezas compartidas van en `src/site/ui/`.
- **Qué se prueba:** la lógica con reglas va en funciones puras con pruebas `node --test`: catálogo, precios, familias y paquetes.
- **Datos:** salen de `src/data/servicesMenu.ts`, de la tabla `services` (precio y duración) y de `session_packages`, igual que hoy.
- **Contenedor:** `LandingPage` usa `SiteLayout` con `conSecciones` y la lista de secciones que de verdad tiene.
- **Diseño viejo:** sus componentes se mueven a `src/legacy/` y siguen funcionando.

**Tech Stack:** React 19 + TypeScript + Vite 7, react-router-dom 7, Supabase JS, CSS plano por componente, `node --test` (`npm test`).

**Spec:** `docs/superpowers/specs/2026-09-27-rediseno-web-clienta-design.md`: §3 sistema visual, §5 página principal, §6.4-B paquetes estilo B, §8 arquitectura y diseño anterior, §9 contenido pendiente.

**Boceto aprobado:** `C:/Users/loui-/Desktop/ANABEL/bocetos-rediseno/land-v4.html`. Es la fuente de las medidas y los textos de este plan.

**Base que dejó la Fase 1** (ya en `main`), en `vscode/src/site/`:
- `SiteLayout.tsx`: tema, barra, menú, pie y WhatsApp. Ya llama `useIrAlHash()`; la página NO debe llamarlo.
- `theme/tokens.css`: variables `--s-*` y clases `.s-wrap`, `.s-eyebrow`, `.s-display`, `.s-lead`, `.s-btn`, `.s-btn-solid`, `.s-btn-line` y `.s-ar`.
- `header/navegacion.ts`: `irASeccion(id)`, `clicEspecial(e)` y `useIrAlHash()`.
- `header/secciones.ts`: `SECCIONES`, `seccionActiva()` y `MarcaSeccion`.
- `brand.ts`: `LOGO`, `LOGO_CLARO`, `MONOGRAMA`, `FOTO_MENU` y `FOTOS`.

## Global Constraints

- **Paleta:** camel `#B2967D`, cocoa `#7D5A44`, linen `#F5F1EA`, khaki `#D7C9B8`, choco `#2A1E17`, crema `#FBF8F3`.
- **Colores:** todo color sale de las variables `--s-*`. La **llamada final** y el **pie** se quedan en marrón también en el tema beige.
- **Tipografía:** títulos en Playfair Display, con la palabra clave en *cursiva* y color de acento (`<em>`); texto en Outfit.
- **Cortes:** celular ≤ 760 px, tableta 761–1100 px, computadora > 1100 px. Se escriben de celular hacia arriba, con `@media (min-width: 761px)` y `@media (min-width: 1101px)`.
- **Clases y CSS:**
  - todas las clases llevan el prefijo `s-` y viven dentro de `.site`;
  - dentro de `.site` **no** se usan utilidades de Tailwind;
  - los reinicios van con `:where(.site)`, para no pisar las clases de los componentes.
- **Calidad (spec §3.8):**
  - nada se sale de la pantalla;
  - las zonas táctiles miden ≥ 44 px;
  - el contraste es AA;
  - WhatsApp no tapa botones de acción;
  - nunca se encoge una vista de computadora para que quepa.
- **Movimiento (spec §3.7):**
  - al pasar el mouse nunca cambia la letra;
  - los efectos de mouse van solo bajo `@media (hover:hover)`;
  - `prefers-reduced-motion` apaga las animaciones;
  - **nunca hay fundidos por tarjeta dentro de un carrusel**.
- **Precios (spec §5.3), en este orden:**
  1. el de la tabla `services` si es mayor que 0, buscado por nombre con la misma regla de hoy;
  2. si no, el que trae el texto del menú;
  3. si no hay ninguno, `RD$ —`.
  - La duración viene de `services.duration`.
- **SEO:** se conservan las metaetiquetas, el JSON-LD y `index.html`. Solo se agrega un script que pinta el fondo inicial.
- **Diseño anterior (spec §8):** nada se borra.
  - Los componentes viejos se mueven a `src/legacy/`.
  - La página vieja queda en `/diseno-anterior` con `noindex`.
  - Antes de fusionar esta fase se sube la etiqueta git `diseno-anterior`.
- **Código:** comentarios y nombres en español, como el resto del proyecto. Anchos de prueba: 360, 390, 430, 820, 1180, 1280 y 1440.
- **Imports en módulos con pruebas:**
  - `src/data/servicesMenu.ts` no importa nada, porque las pruebas lo cargan con Node;
  - un módulo probado que importe código de otro archivo usa la extensión `.ts` explícita (`tsconfig.app.json` tiene `allowImportingTsExtensions`);
  - los `import type` no la necesitan.

## Review Focus

- **Sin red o con Supabase caído:**
  - el catálogo igual se ve completo, con `RD$ —` y sin duraciones;
  - si fallan los paquetes, la sección Paquetes no aparece y el menú no la lista. No debe quedar una pantalla en blanco ni una sección vacía.
  - Lo cubren las pruebas de la Task 1 (`construirCatalogo(menu, [])`) y el paso de verificación de la Task 10.
- **Tocar un destacado con el catálogo cerrado, en celular:**
  - el catálogo se abre en la familia de esa especialidad, con su acordeón abierto;
  - la pantalla baja hasta que la especialidad queda justo debajo de la barra, no tapada por las pestañas.
  - En computadora, baja al panel con esa especialidad elegida (Task 6; verificación de la Task 10).
- **Llegar desde otra página con `/#s-contacto` o `/#s-paquetes`:**
  - con paquetes, la página baja a la sección aunque cargue después;
  - sin paquetes, `/#s-paquetes` se queda arriba sin error (Task 7 y Task 10).
- **Tema beige:** la llamada final y el pie siguen marrones, y todos los textos cumplen AA (en particular el botón "Agendar cita" y el sello "Más elegido") (Task 9 y Task 10).
- **Reducir movimiento:**
  - no hay cascada en la portada ni aparición al bajar;
  - los carruseles y el catálogo no animan su desplazamiento;
  - el catálogo abre sin animación y las especialidades no entran en cascada (Task 4 y Task 10).

---

### Task 0: Etiqueta del diseño anterior (la hace el controlador, no un subagente)

- [ ] **Step 1: Marcar y subir el `main` actual**, que todavía tiene la página vieja.

```bash
git fetch origin
git tag -a diseno-anterior origin/main -m "Diseño de la web de la clienta antes del rediseño (spec §8)"
git push origin diseno-anterior
git ls-remote --tags origin diseno-anterior
```
Expected: la última línea muestra `refs/tags/diseno-anterior`. Para volver algún día al diseño viejo:
`git checkout diseno-anterior -- vscode/src`.

---

### Task 1: Catálogo con familias, precios y duración

**Files:**
- Modify: `vscode/src/data/servicesMenu.ts` (tipos, familia, imagen, descripción, miniatura y el texto de verrugas)
- Create: `vscode/public/fotos/esp-anabel.jpg`, `esp-nadieska.jpg` y `esp-carmen.jpg` (miniaturas de 160 px)
- Create: `vscode/src/site/landing/catalogo.ts`
- Test: `vscode/tests/catalogo.test.ts`

**Interfaces:**
- Produces, desde `servicesMenu.ts`:
  - `type FamiliaId = 'facial' | 'corporal' | 'cejas-maquillaje' | 'medicina'`;
  - `ServiceCategory` suma `familia: FamiliaId`, `imagen?: string`, `posicion?: string` y `descripcion?: string`;
  - `Specialist` suma `miniatura?: string`.
- Produces, desde `catalogo.ts`:
  - `FAMILIAS: Familia[]` y `interface Familia { id: FamiliaId; nombre: string; corto: string }`;
  - `interface ServicioPublico { name: string; price: number; duration: number }`;
  - `interface ServicioVista { nombre: string; minutos: number | null; precio: string; conPrecio: boolean }`;
  - `interface GrupoVista { etiqueta?: string; servicios: ServicioVista[] }`;
  - `interface EspecialistaVista { nombre: string; miniatura?: string; iniciales: string }`;
  - `interface EspecialidadVista { id; titulo; familia: FamiliaId; imagen?; posicion?; descripcion?; especialista: EspecialistaVista; grupos: GrupoVista[]; total: number }`;
  - `formatoRD(n: number): string`, `SIN_PRECIO = 'RD$ —'`, `nombreEnTabla(catId, bloque, opcion): string`, `precioDelTexto(opcion): string | null`;
  - `construirCatalogo(menu: ServiceCategory[], servicios: ServicioPublico[]): EspecialidadVista[]`, ordenado por familia.

- [ ] **Step 1: Miniaturas de "Realizado por"** (las fotos de `public/equipo/` pesan 1.4 MB y aquí se muestran a 38 px)

```bash
cd vscode && python -c "
from PIL import Image
B = 'C:/Users/loui-/Desktop/ANABEL/bocetos-rediseno/files/'
for src, dst in [('anabel.jpg','esp-anabel.jpg'), ('colab1.jpg','esp-nadieska.jpg'), ('colab2.jpg','esp-carmen.jpg')]:
    im = Image.open(B + src).convert('RGB')
    w, h = im.size
    top = round((h - w) * 0.2)          # cuadrado con la cara, como object-position 50% 20%
    im.crop((0, top, w, top + w)).resize((160, 160), Image.LANCZOS).save('public/fotos/' + dst, quality=82, optimize=True, progressive=True)
    print(dst, 'ok')
"
ls -la public/fotos/esp-*.jpg
```
Expected: tres archivos `esp-*.jpg` de menos de 15 KB cada uno.

- [ ] **Step 2: Escribir la prueba que falla**: `vscode/tests/catalogo.test.ts`

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FAMILIAS, SIN_PRECIO, construirCatalogo, formatoRD, nombreEnTabla, precioDelTexto,
  type EspecialidadVista,
} from '../src/site/landing/catalogo.ts';
import { servicesMenu } from '../src/data/servicesMenu.ts';

const buscar = (cat: EspecialidadVista[], id: string, nombre: string) =>
  cat.find((c) => c.id === id)!.grupos.flatMap((g) => g.servicios).find((s) => s.nombre === nombre)!;

test('formato de precio con comas y sin decimales', () => {
  assert.equal(formatoRD(12000), 'RD$ 12,000');
  assert.equal(formatoRD(950), 'RD$ 950');
  assert.equal(formatoRD(1500.4), 'RD$ 1,500');
});

test('las 15 especialidades en 4 familias, en el orden de la spec', () => {
  const cat = construirCatalogo(servicesMenu, []);
  assert.deepEqual(FAMILIAS.map((f) => f.id), ['facial', 'corporal', 'cejas-maquillaje', 'medicina']);
  assert.deepEqual(cat.map((c) => c.id), [
    'limpieza-facial', 'hidra-lips',
    'depilacion-laser', 'depilacion-cera', 'blanqueamiento-corporal', 'remocion-tatuaje', 'aparatologia',
    'cejas-pestanas', 'maquillaje',
    'toxina-botulinica', 'rellenos', 'bioestimuladores', 'mesoterapia', 'escleroterapia', 'verrugas',
  ]);
});

test('nombre en la tabla: la misma regla del sitio actual', () => {
  assert.equal(nombreEnTabla('depilacion-laser', 'Áreas cortas', 'Axilas'), 'Depilación Láser - Axilas');
  assert.equal(nombreEnTabla('cejas-pestanas', 'Extensiones de pestañas', 'Volumen 2D, 3D, 4D, 5D'), 'Extensiones de Pestañas - Volumen 2D-5D');
  assert.equal(nombreEnTabla('cejas-pestanas', '', 'Laminado de cejas'), 'Laminado de cejas');
  assert.equal(nombreEnTabla('bioestimuladores', '', 'Hilos PDO — RD$12,000 (x10 hilos)'), 'Bioestimulador - Hilos PDO (x10)');
  assert.equal(nombreEnTabla('mesoterapia', '', 'NCTF para ojeras — RD$5,000 / sesión'), 'Mesoterapia NCTF - Ojeras');
  assert.equal(nombreEnTabla('verrugas', '', 'Eliminación de verrugas — desde RD$1,000'), 'Eliminación de Verrugas (desde)');
  assert.equal(nombreEnTabla('limpieza-facial', '', 'Peeling'), 'Peeling');
});

test('precio del texto del menú, limpio', () => {
  assert.equal(precioDelTexto('Labios — RD$15,000'), 'RD$ 15,000');
  assert.equal(precioDelTexto('Líneas de expresión — RD$12,000 a 18,000'), 'RD$ 12,000 – 18,000');
  assert.equal(precioDelTexto('Bozo'), null);
});

test('precio: primero la tabla si es mayor que 0, con su duración', () => {
  const cat = construirCatalogo(servicesMenu, [{ name: 'Depilación Láser - Axilas', price: 1500, duration: 15 }]);
  assert.deepEqual(buscar(cat, 'depilacion-laser', 'Axilas'), { nombre: 'Axilas', minutos: 15, precio: 'RD$ 1,500', conPrecio: true });
});

test('precio en 0 en la tabla: usa el texto del menú o "RD$ —"', () => {
  const cat = construirCatalogo(servicesMenu, [
    { name: 'Depilación Láser - Bozo', price: 0, duration: 15 },
    { name: 'Relleno Ácido Hialurónico - Labios', price: 0, duration: 45 },
  ]);
  assert.deepEqual(buscar(cat, 'depilacion-laser', 'Bozo'), { nombre: 'Bozo', minutos: 15, precio: SIN_PRECIO, conPrecio: false });
  assert.equal(buscar(cat, 'rellenos', 'Labios').precio, 'RD$ 15,000');
});

test('rango o "desde" en el menú: el precio de la tabla se muestra como "desde"', () => {
  const cat = construirCatalogo(servicesMenu, [
    { name: 'Toxina Botulínica - Líneas de expresión', price: 12000, duration: 30 },
    { name: 'Eliminación de Verrugas (desde)', price: 1000, duration: 20 },
    { name: 'Relleno Ácido Hialurónico - Nariz', price: 15000, duration: 45 },
  ]);
  assert.equal(buscar(cat, 'toxina-botulinica', 'Líneas de expresión').precio, 'desde RD$ 12,000');
  assert.equal(buscar(cat, 'verrugas', 'Eliminación de verrugas').precio, 'desde RD$ 1,000');
  assert.equal(buscar(cat, 'rellenos', 'Nariz').precio, 'RD$ 15,000');
});

test('sin fila en la tabla no hay duración; el nombre se busca sin importar mayúsculas', () => {
  const cat = construirCatalogo(servicesMenu, [{ name: 'depilación con HILO', price: 0, duration: 20 }]);
  assert.equal(buscar(cat, 'cejas-pestanas', 'Depilación con hilo').minutos, 20);
  assert.equal(buscar(cat, 'cejas-pestanas', 'Lifting de pestañas').minutos, null);
});

test('especialista con iniciales y total de servicios', () => {
  const cat = construirCatalogo(servicesMenu, []);
  const cera = cat.find((c) => c.id === 'depilacion-cera')!;
  assert.equal(cera.especialista.iniciales, 'PJ');
  assert.equal(cera.especialista.miniatura, undefined);
  assert.equal(cera.total, 5);
  const limpieza = cat.find((c) => c.id === 'limpieza-facial')!;
  assert.equal(limpieza.especialista.iniciales, 'NS');
  assert.equal(limpieza.especialista.miniatura, '/fotos/esp-nadieska.jpg');
  assert.equal(limpieza.total, 13);
});
```

- [ ] **Step 3: Correr y ver que falla**

Run: `cd vscode && npm test`
Expected: FAIL con `ERR_MODULE_NOT_FOUND ... src/site/landing/catalogo.ts`

- [ ] **Step 4: Ampliar `vscode/src/data/servicesMenu.ts`**, sin agregar ningún `import`.

4a. En `interface Specialist`, debajo de `bio?: string;`, agrega:
```ts
  /** Foto chica (160 px) para "Realizado por"; sin ella se muestran las iniciales */
  miniatura?: string;
```
4b. En el objeto `specialists`, agrega `miniatura` a tres especialistas (Paola no tiene foto):
- en `anabel`, `miniatura: '/fotos/esp-anabel.jpg',`
- en `nadieska`, `miniatura: '/fotos/esp-nadieska.jpg',`
- en `carmen`, `miniatura: '/fotos/esp-carmen.jpg',`

4c. Reemplaza `export interface ServiceCategory { ... }` por:
```ts
/** Familia de la página principal (spec §5.3) */
export type FamiliaId = 'facial' | 'corporal' | 'cejas-maquillaje' | 'medicina';

export interface ServiceCategory {
  id: string;
  title: string;
  items: ServiceItem[];
  specialist: Specialist;
  familia: FamiliaId;
  /** Foto del servicio en `public/fotos`; sin foto se muestra la N (medicina estética) */
  imagen?: string;
  /** Encuadre de la foto (object-position) */
  posicion?: string;
  /** Texto corto de la especialidad en el catálogo */
  descripcion?: string;
}
```
4d. En cada categoría de `servicesMenu`, agrega estas líneas justo debajo de `specialist: …,`:

| id | líneas a agregar |
|---|---|
| `limpieza-facial` | `familia: 'facial', imagen: '/fotos/servicio-limpieza.jpg', posicion: '50% 30%', descripcion: 'Protocolos de limpieza y renovación según tu tipo de piel.',` |
| `depilacion-laser` | `familia: 'corporal', imagen: '/fotos/servicio-laser.jpg', descripcion: 'Láser de diodo para resultados progresivos y seguros.',` |
| `depilacion-cera` | `familia: 'corporal', imagen: '/fotos/servicio-cera.jpg',` |
| `cejas-pestanas` | `familia: 'cejas-maquillaje', imagen: '/fotos/servicio-pest.jpg', posicion: '60% 50%',` |
| `hidra-lips` | `familia: 'facial', imagen: '/fotos/servicio-lips.jpg', descripcion: 'Exfolia, hidrata en profundidad y da volumen temporal a los labios con ácido hialurónico y succión suave. Sin agujas.',` |
| `blanqueamiento-corporal` | `familia: 'corporal', imagen: '/fotos/servicio-blanq.jpg', posicion: '25% 50%',` |
| `remocion-tatuaje` | `familia: 'corporal', imagen: '/fotos/servicio-tatu.jpg', descripcion: 'Eliminación de tatuajes con láser.',` |
| `maquillaje` | `familia: 'cejas-maquillaje', imagen: '/fotos/servicio-maq.jpg',` |
| `toxina-botulinica` | `familia: 'medicina',` |
| `rellenos` | `familia: 'medicina',` |
| `bioestimuladores` | `familia: 'medicina',` |
| `mesoterapia` | `familia: 'medicina',` |
| `escleroterapia` | `familia: 'medicina', descripcion: 'Tratamiento para várices.',` |
| `verrugas` | `familia: 'medicina', descripcion: 'El precio varía según la cantidad y el tamaño.',` |
| `aparatologia` | `familia: 'corporal', imagen: '/fotos/servicio-aparatologia.jpg', posicion: '50% 62%',` |

4e. En `verrugas`, cambia `options: ['Desde RD$1,000'],` por
`options: ['Eliminación de verrugas — desde RD$1,000'],`. Así el catálogo muestra el nombre del
servicio y no el precio como nombre. El sitio viejo sigue igual, porque separa por ` — `.

- [ ] **Step 5: Implementar `vscode/src/site/landing/catalogo.ts`**

```ts
// Catálogo de la página principal: familias, especialidades, precios y duración (spec §5.3).
// Puro: recibe el menú y los servicios de la base, así se prueba con node --test.
import type { FamiliaId, ServiceCategory } from '../../data/servicesMenu';

export interface Familia { id: FamiliaId; nombre: string; corto: string }

export const FAMILIAS: Familia[] = [
  { id: 'facial', nombre: 'Facial', corto: 'Facial' },
  { id: 'corporal', nombre: 'Corporal', corto: 'Corporal' },
  { id: 'cejas-maquillaje', nombre: 'Cejas, pestañas y maquillaje', corto: 'Cejas y maquillaje' },
  { id: 'medicina', nombre: 'Medicina estética', corto: 'Medicina estética' },
];

/** Lo que la página lee de la tabla `services` (anon solo ve los activos). */
export interface ServicioPublico { name: string; price: number; duration: number }

export interface ServicioVista { nombre: string; minutos: number | null; precio: string; conPrecio: boolean }
export interface GrupoVista { etiqueta?: string; servicios: ServicioVista[] }
export interface EspecialistaVista { nombre: string; miniatura?: string; iniciales: string }
export interface EspecialidadVista {
  id: string;
  titulo: string;
  familia: FamiliaId;
  imagen?: string;
  posicion?: string;
  descripcion?: string;
  especialista: EspecialistaVista;
  grupos: GrupoVista[];
  total: number;
}

export const SIN_PRECIO = 'RD$ —';

/** 12000 → "RD$ 12,000", sin depender del idioma del teléfono. */
export function formatoRD(n: number): string {
  return `RD$ ${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/** Nombre del servicio en la tabla `services` para una opción del menú (la misma regla de siempre). */
export function nombreEnTabla(catId: string, bloque: string, opcion: string): string {
  const it = opcion.split(' — ')[0].trim();
  switch (catId) {
    case 'depilacion-laser': return `Depilación Láser - ${it}`;
    case 'depilacion-cera': return `Depilación Cera - ${it}`;
    case 'blanqueamiento-corporal': return `Blanqueamiento - ${it}`;
    case 'cejas-pestanas':
      if (bloque !== 'Extensiones de pestañas') return it;
      return it.startsWith('Volumen 2D') ? 'Extensiones de Pestañas - Volumen 2D-5D' : `Extensiones de Pestañas - ${it}`;
    case 'maquillaje': return `Maquillaje - ${it}`;
    case 'toxina-botulinica': return `Toxina Botulínica - ${it}`;
    case 'rellenos': return `Relleno Ácido Hialurónico - ${it}`;
    case 'bioestimuladores': {
      let p = it;
      if (p.startsWith('Hilos PDO')) p = 'Hilos PDO (x10)';
      if (p.startsWith('Hilos tensores')) p = 'Hilos tensores (desde)';
      return `Bioestimulador - ${p}`;
    }
    case 'mesoterapia': {
      let p = it;
      if (p.startsWith('NCTF')) p = 'NCTF - Ojeras';
      if (p.startsWith('PDRN')) p = 'PDRN de Salmón - Ojeras';
      return `Mesoterapia ${p}`;
    }
    case 'escleroterapia': return 'Escleroterapia - Ampolla 2ml';
    case 'verrugas': return 'Eliminación de Verrugas (desde)';
    default: return it;
  }
}

/** Precio que trae el texto del menú ("Labios — RD$15,000") ya limpio: "RD$ 15,000". */
export function precioDelTexto(opcion: string): string | null {
  const partes = opcion.split(' — ');
  if (partes.length < 2) return null;
  return partes.slice(1).join(' — ').trim()
    .replace(/RD\$\s?(?=\d)/g, 'RD$ ')
    .replace(/(\d)\s+a\s+(\d)/g, '$1 – $2');
}

/** Tabla > 0 primero; si el menú habla de un rango o de "desde", el de la tabla es el mínimo. */
function precioVista(fila: ServicioPublico | undefined, opcion: string, enTabla: string): Pick<ServicioVista, 'precio' | 'conPrecio'> {
  if (fila && fila.price > 0) {
    const desde = /desde/i.test(opcion) || /desde/i.test(enTabla) || /\d\s+a\s+\d/.test(opcion);
    return { precio: `${desde ? 'desde ' : ''}${formatoRD(fila.price)}`, conPrecio: true };
  }
  const texto = precioDelTexto(opcion);
  return texto ? { precio: texto, conPrecio: true } : { precio: SIN_PRECIO, conPrecio: false };
}

/** Bloques de la especialidad: primero los servicios sueltos, después los grupos con nombre. */
function gruposDe(cat: ServiceCategory): { etiqueta?: string; opciones: string[] }[] {
  const grupos: { etiqueta?: string; opciones: string[] }[] = [];
  const sueltos: string[] = [];
  for (const item of cat.items) {
    if (item.groups) item.groups.forEach((g) => grupos.push({ etiqueta: g.label, opciones: g.items }));
    else if (item.options) grupos.push({ etiqueta: cat.items.length > 1 ? item.name : undefined, opciones: item.options });
    else sueltos.push(item.name);
  }
  if (sueltos.length) grupos.unshift({ opciones: sueltos });
  return grupos;
}

/** "Dra. Nadieska Soto" → "NS" */
function iniciales(nombre: string): string {
  return nombre.replace(/^Dra?\.\s*/, '').split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase();
}

/** Menú + tabla → especialidades listas para mostrar, ordenadas por familia. */
export function construirCatalogo(menu: ServiceCategory[], servicios: ServicioPublico[]): EspecialidadVista[] {
  const porNombre = new Map(servicios.map((s) => [s.name.toLowerCase().trim(), s]));
  const vistas: EspecialidadVista[] = menu.map((cat) => {
    const grupos: GrupoVista[] = gruposDe(cat).map((g) => ({
      etiqueta: g.etiqueta,
      servicios: g.opciones.map((op) => {
        const enTabla = nombreEnTabla(cat.id, g.etiqueta ?? '', op);
        const fila = porNombre.get(enTabla.toLowerCase().trim());
        return {
          nombre: op.split(' — ')[0].trim(),
          minutos: fila && fila.duration > 0 ? fila.duration : null,
          ...precioVista(fila, op, enTabla),
        };
      }),
    }));
    return {
      id: cat.id,
      titulo: cat.title,
      familia: cat.familia,
      imagen: cat.imagen,
      posicion: cat.posicion,
      descripcion: cat.descripcion ?? cat.items.find((i) => i.description)?.description,
      especialista: { nombre: cat.specialist.name, miniatura: cat.specialist.miniatura, iniciales: iniciales(cat.specialist.name) },
      grupos,
      total: grupos.reduce((n, g) => n + g.servicios.length, 0),
    };
  });
  const orden = (f: FamiliaId) => FAMILIAS.findIndex((x) => x.id === f);
  return vistas
    .map((v, i) => ({ v, i }))
    .sort((a, b) => orden(a.v.familia) - orden(b.v.familia) || a.i - b.i)
    .map(({ v }) => v);
}
```

- [ ] **Step 6: Correr y ver que pasa**

Run: `cd vscode && npm test`
Expected: `ℹ pass 30` y `ℹ fail 0`: las 21 de antes más las 9 nuevas.

- [ ] **Step 7: Tipos**

Run: `cd vscode && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site\|src/data\|src/components/Services"`
Expected: `0`. El sitio viejo, `src/components/Services.tsx`, usa `ServiceCategory` y debe seguir compilando.

- [ ] **Step 8: Commit**

```bash
git add vscode/src/data/servicesMenu.ts vscode/src/site/landing/catalogo.ts vscode/tests/catalogo.test.ts vscode/public/fotos/esp-*.jpg
git commit -m "feat(sitio): catálogo por familias con precio y duración de la tabla"
```

---

### Task 2: Paquetes, opiniones y datos públicos

**Files:**
- Create: `vscode/src/site/landing/paquetes.ts`
- Create: `vscode/src/config/testimonios.ts`
- Create: `vscode/src/site/landing/useDatosPublicos.ts`
- Test: `vscode/tests/paquetes.test.ts`

**Interfaces:**
- Consumes: `ServicioPublico` (Task 1) y `FOTOS` (`src/site/brand.ts`).
- Produces:
  - `interface PaquetePublico { id: string; nombre: string; sesiones: number; precio: number; servicio: string | null }`;
  - `nombreCorto(nombre)`, `precioPorSesion(precio, sesiones): number | null`, `indiceDestacado(total): number` y `fotoDePaquete(nombre, servicio): string | null`;
  - `interface Testimonio { nombre: string; servicio: string; texto: string; estrellas: number }` y `testimonios: Testimonio[]`;
  - `useServiciosPublicos(): ServicioPublico[]` y `usePaquetesPublicos(): { cargando: boolean; paquetes: PaquetePublico[] }`.

- [ ] **Step 1: Escribir la prueba que falla**: `vscode/tests/paquetes.test.ts`

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fotoDePaquete, indiceDestacado, nombreCorto, precioPorSesion } from '../src/site/landing/paquetes.ts';
import { FOTOS } from '../src/site/brand.ts';

test('nombre corto sin "Paquete" ni "x5"', () => {
  assert.equal(nombreCorto('Paquete Facial Profunda x5'), 'Facial Profunda');
  assert.equal(nombreCorto('Paquete de Láser Axilas x 6'), 'Láser Axilas');
  assert.equal(nombreCorto('Glow'), 'Glow');
  assert.equal(nombreCorto('Paquete'), 'Paquete');
});

test('precio por sesión redondeado y sin dividir entre 0', () => {
  assert.equal(precioPorSesion(7500, 3), 2500);
  assert.equal(precioPorSesion(1000, 3), 333);
  assert.equal(precioPorSesion(1000, 0), null);
});

test('"Más elegido": el del medio cuando hay 3 o más', () => {
  assert.equal(indiceDestacado(3), 1);
  assert.equal(indiceDestacado(4), 2);
  assert.equal(indiceDestacado(2), -1);
  assert.equal(indiceDestacado(0), -1);
});

test('foto según el nombre del paquete y, si no dice nada, según su servicio', () => {
  assert.equal(fotoDePaquete('Paquete Peeling Químico x3', 'Peeling'), FOTOS.anabelGuantes);
  assert.equal(fotoDePaquete('Paquete Microdermoabrasión x6', 'Limpieza Facial Express / Hidratación'), FOTOS.servicio.aparatologia);
  assert.equal(fotoDePaquete('Paquete Glow x4', 'Limpieza Facial Profunda'), FOTOS.servicio.limpieza);
  assert.equal(fotoDePaquete('Hidra Lips x3', null), FOTOS.servicio.lips);
  assert.equal(fotoDePaquete('Paquete especial', null), null);
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd vscode && npm test`
Expected: FAIL con `ERR_MODULE_NOT_FOUND ... src/site/landing/paquetes.ts`

- [ ] **Step 3: Implementar `vscode/src/site/landing/paquetes.ts`**

```ts
// Paquetes en la página principal, estilo "Menú con foto" (spec §6.4-B). Puro para probarlo.
import { FOTOS } from '../brand.ts';

export interface PaquetePublico { id: string; nombre: string; sesiones: number; precio: number; servicio: string | null }

/** "Paquete Facial Profunda x5" → "Facial Profunda" */
export function nombreCorto(nombre: string): string {
  const limpio = nombre.replace(/^paquete\s+(de\s+)?/i, '').replace(/\s+x\s?\d+\s*$/i, '').trim();
  return limpio || nombre.trim();
}

/** Precio de cada sesión, redondeado al peso. */
export function precioPorSesion(precio: number, sesiones: number): number | null {
  return sesiones > 0 ? Math.round(precio / sesiones) : null;
}

/** Con 3 o más paquetes, el del medio (van por precio) lleva "Más elegido", como en el sitio actual. */
export function indiceDestacado(total: number): number {
  return total >= 3 ? Math.floor(total / 2) : -1;
}

// en orden: la primera palabra que aparezca decide la foto
const FOTO_POR_PALABRA: [RegExp, string][] = [
  [/peeling/i, FOTOS.anabelGuantes],
  [/microderm|hifu|radiofrecuencia|aparatolog/i, FOTOS.servicio.aparatologia],
  [/l[aá]ser/i, FOTOS.servicio.laser],
  [/cera/i, FOTOS.servicio.cera],
  [/blanque/i, FOTOS.servicio.blanqueamiento],
  [/tatuaje/i, FOTOS.servicio.tatuaje],
  [/lips|labio/i, FOTOS.servicio.lips],
  [/pesta|ceja/i, FOTOS.servicio.pestanas],
  [/maquillaje/i, FOTOS.servicio.maquillaje],
  [/facial|limpieza|hidra|dermaplaning|microneedling|exosomas/i, FOTOS.servicio.limpieza],
];

/** Foto del paquete según su nombre y, si no dice nada, según su servicio. null = se muestra la N. */
export function fotoDePaquete(nombre: string, servicio: string | null): string | null {
  for (const texto of [nombre, servicio ?? '']) {
    for (const [palabra, foto] of FOTO_POR_PALABRA) if (palabra.test(texto)) return foto;
  }
  return null;
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd vscode && npm test`
Expected: `ℹ pass 34` y `ℹ fail 0`.

- [ ] **Step 5: Crear `vscode/src/config/testimonios.ts`**

```ts
// Opiniones de la página principal. Son de ejemplo hasta tener reseñas reales (spec §9).
// Si la lista queda vacía, la sección Opiniones no aparece ni en la página ni en el menú.
export interface Testimonio { nombre: string; servicio: string; texto: string; estrellas: number }

export const testimonios: Testimonio[] = [
  {
    nombre: 'María G.', servicio: 'Depilación láser', estrellas: 5,
    texto: 'Increíble el resultado después de solo 3 sesiones. El equipo es súper profesional y el ambiente te hace sentir en confianza.',
  },
  {
    nombre: 'Laura S.', servicio: 'Limpieza facial', estrellas: 5,
    texto: 'Mi piel nunca había lucido tan bien. La limpieza profunda me cambió la vida. 100% recomendado.',
  },
  {
    nombre: 'Carolina P.', servicio: 'Blanqueamiento corporal', estrellas: 5,
    texto: 'Los tratamientos realmente funcionan. Noté diferencia desde la segunda sesión. ¡Estoy encantada!',
  },
];
```

- [ ] **Step 6: Crear `vscode/src/site/landing/useDatosPublicos.ts`**. Anon solo lee los servicios y paquetes activos; ya hay políticas `anon_read` y grants por columna para `name`, `price`, `duration`, `sessions` y `service_id`.

```ts
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { ServicioPublico } from './catalogo';
import type { PaquetePublico } from './paquetes';

interface FilaServicio { name: string; price: number | string | null; duration: number | string | null }
interface FilaPaquete {
  id: string;
  name: string;
  sessions: number | string | null;
  price: number | string | null;
  services: { name: string } | { name: string }[] | null;
}

/** Precio y duración de los servicios activos. Si falla la red, el catálogo muestra "RD$ —". */
export function useServiciosPublicos(): ServicioPublico[] {
  const [servicios, setServicios] = useState<ServicioPublico[]>([]);
  useEffect(() => {
    let vivo = true;
    supabase.from('services').select('name, price, duration').eq('active', true).then(({ data, error }) => {
      if (!vivo) return;
      if (error) { console.warn('No se pudieron leer los servicios:', error.message); return; }
      const filas = (data ?? []) as unknown as FilaServicio[];
      setServicios(filas.map((s) => ({ name: String(s.name), price: Number(s.price) || 0, duration: Number(s.duration) || 0 })));
    });
    return () => { vivo = false; };
  }, []);
  return servicios;
}

/** Paquetes activos del más barato al más caro. Si falla la red, la lista queda vacía y la sección no aparece. */
export function usePaquetesPublicos(): { cargando: boolean; paquetes: PaquetePublico[] } {
  const [estado, setEstado] = useState<{ cargando: boolean; paquetes: PaquetePublico[] }>({ cargando: true, paquetes: [] });
  useEffect(() => {
    let vivo = true;
    supabase.from('session_packages').select('id, name, sessions, price, services(name)').eq('active', true).order('price')
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error) console.warn('No se pudieron leer los paquetes:', error.message);
        const filas = (data ?? []) as unknown as FilaPaquete[];
        const paquetes = filas.map((p) => {
          const sv = Array.isArray(p.services) ? p.services[0] : p.services;
          return { id: String(p.id), nombre: String(p.name), sesiones: Number(p.sessions) || 0, precio: Number(p.price) || 0, servicio: sv?.name ?? null };
        });
        setEstado({ cargando: false, paquetes });
      });
    return () => { vivo = false; };
  }, []);
  return estado;
}
```

- [ ] **Step 7: Tipos**

Run: `cd vscode && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site\|src/config"`
Expected: `0`

- [ ] **Step 8: Commit**

```bash
git add vscode/src/site/landing/paquetes.ts vscode/src/site/landing/useDatosPublicos.ts vscode/src/config/testimonios.ts vscode/tests/paquetes.test.ts
git commit -m "feat(sitio): paquetes y opiniones de la página principal, con datos públicos de Supabase"
```

---

### Task 3: El caparazón se adapta a la página real

**Files:**
- Modify: `vscode/src/site/header/secciones.ts`, `vscode/src/site/header/useScrollSpy.ts`
- Modify: `vscode/src/site/header/SiteHeader.tsx`, `vscode/src/site/header/SiteMenu.tsx`, `vscode/src/site/SiteLayout.tsx`
- Modify: `vscode/index.html` (fondo inicial de `/`)
- Delete: `vscode/src/site/DisenoPreview.tsx`; Modify: `vscode/src/App.tsx` (quitar `/_diseno`)
- Test: `vscode/tests/secciones.test.ts`

**Interfaces:**
- Produces:
  - `seccionesVisibles(presentes?: readonly string[]): Seccion[]`;
  - `lineaDeSeccion(altoVentana: number, altoBarra: number): number`;
  - `seccionActiva(marcas, linea, alFondo = false)`: con `alFondo`, manda la última sección.
- `SiteLayout` suma la prop `secciones?: string[]`, los ids que la página tiene de verdad. Sin ella se listan las 7 secciones.
- `SiteHeader` y `SiteMenu` reciben la prop `secciones: Seccion[]` y dejan de importar `SECCIONES`.

- [ ] **Step 1: Escribir las pruebas que fallan.** Agrega al final de `vscode/tests/secciones.test.ts` (y suma `lineaDeSeccion, seccionesVisibles` al `import` de la línea 3):

```ts
test('al llegar al fondo de la página manda la última sección (Contacto es corta)', () => {
  assert.equal(seccionActiva(marcas, 260, true), 's-nosotros');
});

test('línea de la sección activa: un tercio de la pantalla, o debajo de la barra en pantallas bajas', () => {
  assert.equal(lineaDeSeccion(900, 74), 297);
  assert.equal(lineaDeSeccion(360, 64), 121);
});

test('secciones visibles: solo las que la página tiene; sin lista, todas', () => {
  assert.deepEqual(seccionesVisibles(['s-inicio', 's-contacto']).map((s) => s.id), ['s-inicio', 's-contacto']);
  assert.equal(seccionesVisibles().length, 7);
});
```
La línea 3 queda así:
`import { SECCIONES, lineaDeSeccion, seccionActiva, seccionesVisibles } from '../src/site/header/secciones.ts';`

- [ ] **Step 2: Correr y ver que falla**

Run: `cd vscode && npm test`
Expected: FAIL: `lineaDeSeccion is not a function` (o `does not provide an export named`).

- [ ] **Step 3: Implementar en `vscode/src/site/header/secciones.ts`.** Reemplaza la función `seccionActiva` completa por:

```ts
/**
 * La activa es la última (en orden de la página) cuyo borde de arriba ya cruzó la línea.
 * Al llegar al fondo manda la última: una sección corta al final nunca alcanzaría la línea.
 */
export function seccionActiva(marcas: MarcaSeccion[], linea: number, alFondo = false): string | null {
  if (alFondo && marcas.length) return marcas[marcas.length - 1].id;
  let activa: string | null = marcas.length ? marcas[0].id : null;
  for (const m of marcas) if (m.top <= linea) activa = m.id;
  return activa;
}

/**
 * Un tercio de la pantalla, pero nunca por encima de donde queda una sección al tocarla
 * (barra + 56 px de margen + 1). Así, en un celular acostado, la que se tocó queda marcada.
 */
export function lineaDeSeccion(altoVentana: number, altoBarra: number): number {
  return Math.max(altoVentana * 0.33, altoBarra + 57);
}

/** Solo las secciones que la página tiene de verdad (sin paquetes u opiniones vacías); sin lista, todas. */
export function seccionesVisibles(presentes?: readonly string[]): Seccion[] {
  return presentes ? SECCIONES.filter((s) => presentes.includes(s.id)) : SECCIONES;
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `cd vscode && npm test`
Expected: `ℹ pass 37` y `ℹ fail 0`.

- [ ] **Step 5: `useScrollSpy.ts` usa la línea nueva y el fondo.** Cambia la línea `import { seccionActiva } from './secciones';` por
`import { lineaDeSeccion, seccionActiva } from './secciones';` y reemplaza la línea
`setActiva(seccionActiva(marcas, window.innerHeight * 0.33));` por:

```ts
      const barra = document.querySelector('.s-nav-in')?.getBoundingClientRect().height ?? 64;
      const alFondo = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      setActiva(seccionActiva(marcas, lineaDeSeccion(window.innerHeight, barra), alFondo));
```

- [ ] **Step 6: `SiteHeader.tsx` recibe las secciones**
- Cambia `import { SECCIONES } from './secciones';` por `import type { Seccion } from './secciones';`.
- En `interface Props`, debajo de `conSecciones: boolean;`, agrega:
  ```ts
    /** secciones que la página tiene (la barra y las pestañas muestran solo esas) */
    secciones: Seccion[];
  ```
- En la firma del componente, agrega `secciones` después de `conSecciones`:
  `export default function SiteHeader({ conSecciones, secciones, activa, solida, menuAbierto, onAbrirMenu, onIr, botonRef, inerte = false }: Props) {`.
- En `.s-links`, cambia `{SECCIONES.map((s) => (` por `{secciones.map((s) => (`.
- Cambia `{conSecciones && <Pestanas activa={activa} onIr={onIr} />}` por
  `{conSecciones && <Pestanas secciones={secciones} activa={activa} onIr={onIr} />}`.
- La firma de `Pestanas` pasa a ser
  `function Pestanas({ secciones, activa, onIr }: { secciones: Seccion[]; activa: string | null; onIr: (id: string) => void }) {`,
  y dentro, `{SECCIONES.map((s) => (` pasa a ser `{secciones.map((s) => (`.

- [ ] **Step 7: `SiteMenu.tsx` recibe las secciones**
- Cambia `import { SECCIONES } from './secciones';` por `import type { Seccion } from './secciones';`.
- En `interface Props`, debajo de `activa: string | null;`, agrega
  `  /** secciones que la página tiene (en otras páginas, todas) */` y `  secciones: Seccion[];`.
- En la firma, agrega `secciones` después de `activa`:
  `export default function SiteMenu({ abierto, origen, activa, secciones, tema, onTema, onCerrar, onIr }: Props) {`.
- En `.s-menu-list`, cambia `{SECCIONES.map((s, i) => (` por `{secciones.map((s, i) => (`.

- [ ] **Step 8: `SiteLayout.tsx`: la prop `secciones`, y el color del teléfono según el tema**
- Cambia `import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';` por
  `import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';`.
- Agrega `import { seccionesVisibles } from './header/secciones';` debajo de la línea de `useScrollSpy`.
- Reemplaza `interface Props { children: ReactNode; conSecciones?: boolean; whatsappElevado?: boolean }` por:
  ```ts
  interface Props {
    children: ReactNode;
    conSecciones?: boolean;
    /** ids de las secciones que la página tiene de verdad; sin lista, las 7 */
    secciones?: string[];
    whatsappElevado?: boolean;
  }
  ```
- La firma pasa a ser
  `export default function SiteLayout({ children, conSecciones = false, secciones, whatsappElevado = false }: Props) {`.
- Debajo de `useIrAlHash();`, agrega:
  ```ts
    const clave = secciones?.join('|');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la clave resume la lista (el arreglo cambia en cada render)
    const lista = useMemo(() => seccionesVisibles(secciones), [clave]);

    // la barra del navegador del teléfono y el fondo al estirar la página toman el color del tema
    useEffect(() => {
      const color = tema === 'claro' ? '#FBF8F3' : '#2A1E17';
      const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      const antesMeta = meta?.content;
      const html = document.documentElement;
      if (meta) meta.content = color;
      html.style.backgroundColor = color;
      return () => {
        if (meta && antesMeta !== undefined) meta.content = antesMeta;
        html.style.backgroundColor = ''; // también borra el que puso index.html antes de cargar la app
      };
    }, [tema]);
  ```
- En el JSX:
  - `<SiteHeader conSecciones={conSecciones} …` pasa a ser `<SiteHeader conSecciones={conSecciones} secciones={lista} …`, con el resto igual;
  - `<SiteMenu abierto={menuAbierto} origen={origen} activa={activa} …` pasa a ser `<SiteMenu abierto={menuAbierto} origen={origen} activa={activa} secciones={lista} …`, con el resto igual.

- [ ] **Step 9: `index.html`: fondo del tema desde el primer instante en `/`, y `preconnect` de las fuentes** (spec §8).
Justo debajo de la línea `<meta name="theme-color" content="#8a6a4f" />` agrega:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <script>
      // Página principal nueva: el fondo del tema desde el primer instante (sin destello color lino
      // antes de que cargue la app). Las demás páginas y el panel no cambian. Al montarse, SiteLayout
      // toma el control del fondo y de theme-color, y al salir de la página los deja como estaban.
      (function () {
        if (location.hostname.indexOf('app.') === 0 || location.pathname !== '/') return;
        var t = null;
        try { t = localStorage.getItem('anadsll-site-tema'); } catch (e) {}
        document.documentElement.style.backgroundColor = t === 'claro' ? '#FBF8F3' : '#2A1E17';
      })();
    </script>
```

- [ ] **Step 10: Quitar la vista previa de la Fase 1**, que ya no hace falta porque `/` es la página real.

```bash
git rm vscode/src/site/DisenoPreview.tsx
```
En `vscode/src/App.tsx`, borra estas líneas:
- el comentario `// solo en desarrollo: en producción ni siquiera se emite el chunk de la vista previa`;
- la línea `const DisenoPreview = import.meta.env.DEV ? lazy(() => import('./site/DisenoPreview')) : null;`;
- la línea `{DisenoPreview && <Route path="/_diseno" element={<Suspense fallback={null}><DisenoPreview /></Suspense>} />}`.

- [ ] **Step 11: Pruebas, tipos y compilación**

Run: `cd vscode && npm test && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site\|src/App.tsx" ; npm run build 2>&1 | tail -2`
Expected: `ℹ fail 0`, luego `0` y `✓ built in`.

- [ ] **Step 12: Commit**

```bash
git add vscode/src/site vscode/tests/secciones.test.ts vscode/index.html vscode/src/App.tsx
git commit -m "feat(sitio): el menú muestra solo las secciones que existen, sección activa al fondo y color del tema en el teléfono"
```

---

### Task 4: Piezas compartidas y estilos comunes

**Files:**
- Modify: `vscode/src/site/theme/tokens.css` (4 variables nuevas por tema)
- Create: `vscode/src/site/ui/useRevela.ts`
- Create: `vscode/src/site/ui/Desplegable.tsx`, `vscode/src/site/ui/Desplegable.css`
- Create: `vscode/src/site/ui/CarruselCentrado.tsx`, `vscode/src/site/ui/CarruselCentrado.css`
- Create: `vscode/src/site/ui/Sello.tsx`, `vscode/src/site/ui/Sello.css`
- Create: `vscode/src/site/landing/landing.css`

**Interfaces:**
- Produces:
  - `useRevela<T extends HTMLElement>(): RefObject<T | null>`, que pone `.is-in` al entrar en pantalla (se usa con la clase `s-rv`);
  - `Desplegable` con props `{ id: string; abierto: boolean; children: ReactNode; className?: string }`;
  - `CarruselCentrado` con props `{ etiqueta: string; className?: string; children: ReactNode }`;
  - `Sello` con props `{ className?: string }`.
- Clases comunes en `landing.css`: `.s-sec`, `.s-sec-head`, `.s-sec-head--centro`, `.s-h1`, `.s-h2`, `.s-h3`, `.s-arco`, `.s-arco.is-ph`, `.s-rv` y `.is-in`, más los `@keyframes s-subir`.
- Variables nuevas: `--s-surface-hover`, `--s-float-bg`, `--s-float-line` y `--s-seal-bg`.

- [ ] **Step 1: Variables nuevas en `vscode/src/site/theme/tokens.css`**
- En el bloque `.site[data-site-tema="oscuro"]{ … }`, agrega esta línea antes de `--s-shadow:…`:
  `  --s-surface-hover:rgba(245,241,234,.1); --s-float-bg:rgba(42,30,23,.86); --s-float-line:rgba(178,150,125,.35); --s-seal-bg:#2A1E17;`
- En el bloque `.site[data-site-tema="claro"]{ … }`, agrega esta línea antes de `--s-shadow:…`:
  `  --s-surface-hover:#FFFFFF; --s-float-bg:#FFFFFF; --s-float-line:rgba(125,90,68,.08); --s-seal-bg:#FBF8F3;`

- [ ] **Step 2: Crear `vscode/src/site/ui/useRevela.ts`**

```ts
import { useEffect, useRef } from 'react';

/**
 * Aparece con un fundido y un leve ascenso al entrar en pantalla, una sola vez (spec §3.7).
 * Se usa con la clase `s-rv`. Nunca dentro de un carrusel: ahí el deslizamiento parecía trabado.
 */
export function useRevela<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { el.classList.add('is-in'); return; }
    const io = new IntersectionObserver((entradas) => {
      if (entradas.some((e) => e.isIntersecting)) { el.classList.add('is-in'); io.disconnect(); }
    }, { threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}
```

- [ ] **Step 3: Crear `vscode/src/site/ui/Desplegable.tsx` y `Desplegable.css`**

```tsx
import type { ReactNode } from 'react';
import './Desplegable.css';

interface Props { id: string; abierto: boolean; children: ReactNode; className?: string }

/**
 * Despliegue con la altura animada (0fr → 1fr) y el contenido con fundido (spec §3.7).
 * Cerrado queda inerte: ni Tab ni lector de pantalla entran. El botón que lo abre usa aria-controls={id}.
 */
export default function Desplegable({ id, abierto, children, className = '' }: Props) {
  return (
    <div id={id} className={`s-despl ${abierto ? 'is-abierto' : ''} ${className}`} inert={!abierto}>
      <div className="s-despl-in">{children}</div>
    </div>
  );
}
```

```css
.s-despl{ display:grid; grid-template-rows:0fr; transition:grid-template-rows .8s var(--s-ease-io) }
.s-despl.is-abierto{ grid-template-rows:1fr }
.s-despl-in{ overflow:hidden; min-height:0 }
.s-despl-in > *{ opacity:0; transform:translateY(-10px); transition:opacity .3s ease, transform .45s var(--s-ease-x) }
.s-despl.is-abierto > .s-despl-in > *{ opacity:1; transform:none; transition:opacity .6s .18s ease, transform .8s .12s var(--s-ease) }
```

- [ ] **Step 4: Crear `vscode/src/site/ui/CarruselCentrado.tsx` y `CarruselCentrado.css`**

```tsx
import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import './CarruselCentrado.css';

interface Props { etiqueta: string; className?: string; children: ReactNode }

/**
 * En computadora, todos en fila. En tableta y celular, uno a la vez: al deslizar cada uno se
 * detiene en el centro, los de los lados se ven tenues y hay puntitos que se pueden tocar (spec §5.6).
 */
export default function CarruselCentrado({ etiqueta, className = '', children }: Props) {
  const fila = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);
  const [centro, setCentro] = useState(0);

  const marcar = useCallback(() => {
    const f = fila.current;
    if (!f) return;
    const medio = f.getBoundingClientRect().left + f.clientWidth / 2;
    let mejor = 0;
    let distancia = Infinity;
    [...f.children].forEach((it, i) => {
      const r = it.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - medio);
      if (d < distancia) { distancia = d; mejor = i; }
    });
    setCentro(mejor);
  }, []);

  useEffect(() => {
    const f = fila.current;
    if (!f) return;
    let raf = 0;
    const alMover = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; marcar(); }); };
    f.addEventListener('scroll', alMover, { passive: true });
    const ro = new ResizeObserver(alMover);
    ro.observe(f);
    marcar();
    return () => { f.removeEventListener('scroll', alMover); ro.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [marcar]);

  const ir = (i: number) => {
    const f = fila.current;
    const it = f?.children[i] as HTMLElement | undefined;
    if (!f || !it) return;
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    f.scrollTo({ left: it.offsetLeft - (f.clientWidth - it.clientWidth) / 2, behavior: reducir ? 'instant' : 'smooth' });
  };

  return (
    <div className={`s-carr ${className}`} role="group" aria-roledescription="carrusel" aria-label={etiqueta}>
      <div className="s-carr-fila" ref={fila}>
        {items.map((hijo, i) => (
          <div key={i} className={`s-carr-item ${i === centro ? 'is-centro' : ''}`}>{hijo}</div>
        ))}
      </div>
      <div className="s-carr-puntos">
        {items.map((_, i) => (
          <button key={i} type="button" className={i === centro ? 'is-on' : ''} onClick={() => ir(i)}
            aria-label={`Ir al ${i + 1} de ${items.length}`} aria-current={i === centro ? 'true' : undefined} />
        ))}
      </div>
    </div>
  );
}
```

```css
/* computadora: todos en fila */
.s-carr{ --carr-movil:78vw }
.s-carr-fila{ position:relative; display:grid; grid-auto-flow:column; grid-auto-columns:1fr; gap:30px }
.s-carr-item{ display:flex; justify-content:center; min-width:0 }
.s-carr-puntos{ display:none; justify-content:center; gap:2px; margin-top:10px }
/* puntito de 8 px dentro de un botón de 44 px de alto */
.s-carr-puntos button{ position:relative; width:30px; height:44px; border:0; padding:0; background:none }
.s-carr-puntos button::before{ content:""; position:absolute; left:50%; top:50%; width:8px; height:8px; border-radius:999px; background:var(--s-line); transform:translate(-50%,-50%); transition:width .4s, background-color .4s }
.s-carr-puntos button.is-on::before{ width:26px; background:var(--s-accent) }
/* tableta y celular: uno a la vez, centrado; el primero y el último también quedan al centro */
@media (max-width: 1100px){
  .s-carr-fila{ display:flex; overflow-x:auto; scroll-snap-type:x mandatory; gap:22px; margin:0 -36px; padding:16px calc(50vw - 170px) 8px; scrollbar-width:none }
  .s-carr-fila::-webkit-scrollbar{ display:none }
  .s-carr-item{ flex:0 0 340px; scroll-snap-align:center; scroll-snap-stop:always; transition:transform .55s var(--s-ease), opacity .55s }
  .s-carr-item:not(.is-centro){ transform:scale(.92); opacity:.5 }
  .s-carr-puntos{ display:flex }
}
@media (max-width: 760px){
  .s-carr-fila{ margin:0 -20px; gap:14px; padding-left:calc((100vw - var(--carr-movil)) / 2); padding-right:calc((100vw - var(--carr-movil)) / 2) }
  .s-carr-item{ flex-basis:var(--carr-movil) }
}
```

- [ ] **Step 5: Crear `vscode/src/site/ui/Sello.tsx` y `Sello.css`**

```tsx
import { useId } from 'react';
import { MONOGRAMA } from '../brand';
import './Sello.css';

/** Sello que gira despacio con la frase de la marca y la N al centro (spec §3.4). Decorativo. */
export default function Sello({ className = '' }: { className?: string }) {
  const id = `s-sello-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <div className={`s-sello ${className}`} aria-hidden="true">
      <svg viewBox="0 0 120 120">
        <defs><path id={id} d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0" /></defs>
        <text><textPath href={`#${id}`} textLength="280">Belleza y bienestar con responsabilidad ·</textPath></text>
      </svg>
      <img src={MONOGRAMA} alt="" />
    </div>
  );
}
```

```css
.s-sello{ position:absolute; width:104px; height:104px; border-radius:50%; display:grid; place-items:center; background:var(--s-seal-bg); box-shadow:var(--s-shadow) }
.s-sello svg{ position:absolute; inset:0; width:100%; height:100%; animation:s-girar 26s linear infinite }
.s-sello text{ font:500 9.4px var(--s-f-body); letter-spacing:.2em; text-transform:uppercase; fill:var(--s-accent) }
.s-sello img{ position:relative; width:30px }
.site[data-site-tema="oscuro"] .s-sello img{ filter:brightness(0) invert(.92) }
@keyframes s-girar{ to{ transform:rotate(360deg) } }
@media (min-width: 761px){ .s-sello{ width:136px; height:136px } .s-sello text{ font-size:9.6px } }
```

- [ ] **Step 6: Crear `vscode/src/site/landing/landing.css`** (estilos comunes de las secciones, medidas del boceto `land-v4`)

```css
/* Piezas comunes de las secciones de la página principal (boceto land-v4). Celular primero. */
.s-sec{ position:relative; padding:72px 0 }
.s-sec-head{ display:grid; gap:16px; margin-bottom:28px }
.s-sec-head .s-eyebrow{ margin-bottom:18px }
.s-sec-head.s-sec-head--centro{ display:block; text-align:center; max-width:720px; margin:0 auto 32px }
.s-sec-head--centro .s-lead{ margin:18px auto 0 }

.s-h1{ font-size:40px }
.s-h2{ font-size:30px }
.s-h3{ font-size:23px; line-height:1.15 }

/* fotos en arco u óvalo; la máscara hace que Safari respete las esquinas */
.s-arco{ position:relative; overflow:hidden; background:var(--s-arch-bg); -webkit-mask-image:-webkit-radial-gradient(white, black) }
.s-arco img{ width:100%; height:100%; object-fit:cover }
/* especialidades sin foto (medicina estética): la N sobre la textura */
.s-arco.is-ph{ display:grid; place-items:center; background:var(--s-tex) }
.s-arco.is-ph img{ width:34px; height:auto; opacity:.5; object-fit:contain }
.site[data-site-tema="oscuro"] .s-arco.is-ph img{ filter:brightness(0) invert(1) }

/* aparecer al bajar (useRevela) */
.s-rv{ opacity:0; transform:translateY(28px); transition:opacity 1s var(--s-ease), transform 1s var(--s-ease) }
.s-rv.is-in{ opacity:1; transform:none }
@media (prefers-reduced-motion: reduce){ .s-rv{ opacity:1; transform:none } }

@keyframes s-subir{ from{ opacity:0; transform:translateY(22px) } to{ opacity:1; transform:none } }

@media (min-width: 761px){
  .s-sec{ padding:92px 0 }
  .s-sec-head{ margin-bottom:40px }
  .s-sec-head.s-sec-head--centro{ margin-bottom:60px }
  .s-h1{ font-size:51px }
  .s-h2{ font-size:44px }
}
@media (min-width: 1101px){
  .s-sec{ padding:112px 0 }
  .s-sec-head{ grid-template-columns:1fr 1fr; gap:48px; align-items:end; margin-bottom:56px }
  .s-h1{ font-size:63px }
}
```

- [ ] **Step 7: Tipos**

Run: `cd vscode && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site"`
Expected: `0`

- [ ] **Step 8: Commit**

```bash
git add vscode/src/site/theme/tokens.css vscode/src/site/ui vscode/src/site/landing/landing.css
git commit -m "feat(sitio): piezas compartidas (aparecer al bajar, despliegue, carrusel centrado, sello) y estilos comunes"
```

---

### Task 5: Página nueva con portada y franja de confianza; la vieja pasa a `/diseno-anterior`

**Files:**
- Move: `vscode/src/components/{Hero,Services,Packages,About,Mission,Testimonials,Navbar,Footer}.{tsx,css}` → `vscode/src/legacy/`
- Create: `vscode/src/legacy/LandingPageAnterior.tsx`
- Modify: `vscode/src/pages/BookingPage.tsx`, `vscode/src/pages/ClientPortal.tsx` (imports de Navbar y Footer)
- Modify: `vscode/src/App.tsx` (ruta `/diseno-anterior`)
- Create: `vscode/src/site/landing/Hero.tsx`, `Hero.css`, `TrustStrip.tsx`, `TrustStrip.css`
- Modify (reemplazo completo): `vscode/src/pages/LandingPage.tsx`

**Interfaces:**
- Consumes: `SiteLayout` (prop `secciones`, Task 3), `Sello` y `landing.css` (Task 4), `irASeccion` y `clicEspecial`, `FOTOS`.
- Produces: `Hero` y `TrustStrip` sin props. Las Tasks 6–9 amplían `LandingPage`.

- [ ] **Step 1: Mover los componentes viejos a `src/legacy/`**, sin borrarlos (spec §8).

```bash
cd vscode
mkdir -p src/legacy
for c in Hero Services Packages About Mission Testimonials Navbar Footer; do
  git mv src/components/$c.tsx src/legacy/$c.tsx
  git mv src/components/$c.css src/legacy/$c.css
done
git status --short src/legacy | wc -l
```
Expected: `16`. Sus imports relativos (`../data`, `../store`, `../lib`, `../config`) siguen valiendo, porque `src/legacy` está al mismo nivel que `src/components`.

- [ ] **Step 2: `BookingPage.tsx` y `ClientPortal.tsx` usan el Navbar y el Footer viejos desde `legacy`**, porque esas páginas se rediseñan en las Fases 5 y 6. En los dos archivos:
- `import Navbar from '../components/Navbar';` pasa a ser `import Navbar from '../legacy/Navbar';`;
- `import Footer from '../components/Footer';` pasa a ser `import Footer from '../legacy/Footer';`.

- [ ] **Step 3: Crear `vscode/src/legacy/LandingPageAnterior.tsx`**, la página vieja completa para consultarla

```tsx
import { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import Hero from './Hero';
import Services from './Services';
import Packages from './Packages';
import About from './About';
import Mission from './Mission';
import Testimonials from './Testimonials';
import Footer from './Footer';

/** El diseño anterior de la página principal, guardado para consulta (spec §8). Google no la indexa. */
export default function LandingPageAnterior() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  return (
    <>
      <Navbar />
      <Hero />
      <Services />
      <Packages />
      <About />
      <Mission />
      <Testimonials />

      {/* CTA Section */}
      <section className="cta-section" style={{ padding: '100px 5%', textAlign: 'center', background: 'var(--bg-secondary)', position: 'relative', overflow: 'hidden' }}>
        <div className="blob" style={{ width: 400, height: 400, background: 'var(--lavender-light)', top: '-20%', left: '-10%', opacity: 0.5 }} />
        <div className="blob" style={{ width: 300, height: 300, background: 'var(--rose-light)', bottom: '-20%', right: '-5%', opacity: 0.5 }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>¿Lista para tu <span className="gradient-text">transformación</span>?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px auto', fontSize: '1.1rem', lineHeight: 1.6 }}>
            Reserva tu cita hoy mismo y descubre el cuidado profesional que tu piel y cuerpo merecen.
          </p>
          <Link to="/reservar" className="btn-primary" style={{ display: 'inline-flex', padding: '16px 40px', fontSize: '1.1rem', borderRadius: '50px' }}>
            Agendar Cita Ahora <ArrowRight size={20} style={{ marginLeft: '10px' }} />
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
```

- [ ] **Step 4: Ruta `/diseno-anterior` en `vscode/src/App.tsx`**
- Debajo de `const ReceptionistDashboard = lazy(...)`, agrega:
  ```tsx
  // el diseño anterior de la página principal, para consultarlo o volver a él (spec §8)
  const LandingPageAnterior = lazy(() => import('./legacy/LandingPageAnterior'));
  ```
- Debajo de `<Route path="/mis-citas" element={<ClientPortal />} />`, agrega:
  ```tsx
          <Route path="/diseno-anterior" element={<Suspense fallback={null}><LandingPageAnterior /></Suspense>} />
  ```

- [ ] **Step 5: Crear `vscode/src/site/landing/Hero.tsx` y `Hero.css`**

```tsx
import { Link } from 'react-router-dom';
import { FOTOS } from '../brand';
import Sello from '../ui/Sello';
import { clicEspecial, irASeccion } from '../header/navegacion';
import './Hero.css';

/** Portada: los textos suben en cascada, el óvalo se eleva, la foto se aleja y el sello gira (spec §5.1). */
export default function Hero() {
  return (
    <section className="s-hero" id="s-inicio" data-spy="">
      <div className="s-wrap s-hero-in">
        <div className="s-hero-tx">
          <p className="s-eyebrow s-hero-a1">Centro de estética · San José de Ocoa</p>
          <h1 className="s-display s-h1 s-hero-a2">Recupera la <em>confianza</em> en tu piel</h1>
          <p className="s-lead s-hero-a3">
            Tratamientos faciales, depilación láser y medicina estética con especialistas certificadas, en un
            espacio pensado para que te sientas en confianza desde que llegas.
          </p>
          <div className="s-hero-btns s-hero-a4">
            <Link className="s-btn s-btn-solid" to="/reservar">Agendar cita <span className="s-ar" aria-hidden="true">→</span></Link>
            <a className="s-btn s-btn-line" href="#s-servicios"
              onClick={(e) => { if (clicEspecial(e)) return; e.preventDefault(); irASeccion('s-servicios'); }}>
              Ver servicios
            </a>
          </div>
        </div>
        <div className="s-hero-media">
          <div className="s-arco s-hero-arco">
            <img src={FOTOS.portada} alt="Anabel De los Santos en su salón" width={934} height={1400} fetchPriority="high" />
          </div>
          <div className="s-hero-linea" aria-hidden="true" />
          <Sello className="s-hero-sello" />
          <div className="s-hero-firma"><b>Anabel De los Santos</b>Fundadora · Cosmetóloga</div>
        </div>
      </div>
    </section>
  );
}
```

```css
.s-hero{ background:var(--s-tex); padding-top:var(--s-nav-h) }
.s-hero-in{ display:grid; grid-template-columns:1fr; gap:44px; align-items:center; padding-top:18px; padding-bottom:72px }
.s-hero-tx .s-eyebrow{ margin-bottom:18px; font-size:10.5px }
.s-hero-tx h1{ margin-bottom:26px }
.s-hero-tx .s-lead{ margin-bottom:38px }
.s-hero-btns{ display:flex; gap:14px; flex-wrap:wrap }
.s-hero-btns .s-btn{ flex:1; padding:0 18px }
.s-hero-media{ position:relative; justify-self:center; width:100%; max-width:300px }
.s-hero-arco{ z-index:2; aspect-ratio:4/5.9; border-radius:999px }
.s-hero-arco img{ object-position:50% 22% }
.s-hero-linea{ position:absolute; inset:0; z-index:1; transform:translate(12px,-12px); border:1px solid var(--s-accent); opacity:.5; border-radius:999px }
.s-hero-sello{ z-index:3; left:-22px; bottom:30px }
.s-hero-firma{ position:absolute; right:-10px; bottom:-16px; z-index:4; padding:10px 14px; border-radius:14px; font-size:12px; line-height:1.35; background:var(--s-float-bg); border:1px solid var(--s-float-line); color:var(--s-soft); box-shadow:var(--s-shadow); -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px) }
.s-hero-firma b{ display:block; font-family:var(--s-f-display); font-weight:400; font-size:15px; color:var(--s-text) }

/* entrada: cascada del texto, el óvalo se eleva y la foto se aleja */
@keyframes s-elevar{ from{ opacity:0; transform:translateY(40px) } to{ opacity:1; transform:none } }
@keyframes s-alejar{ from{ transform:scale(1.14) } to{ transform:scale(1) } }
.s-hero-a1{ animation:s-subir .9s .05s both }
.s-hero-a2{ animation:s-subir 1s .15s both }
.s-hero-a3{ animation:s-subir 1s .28s both }
.s-hero-a4{ animation:s-subir 1s .4s both }
.s-hero-media{ animation:s-elevar 1.2s .2s both }
.s-hero-arco img{ animation:s-alejar 2.2s .2s both var(--s-ease) }

@media (min-width: 761px){
  .s-hero-in{ grid-template-columns:1.08fr .92fr; gap:40px; padding-top:30px; padding-bottom:84px }
  .s-hero-tx .s-eyebrow{ margin-bottom:26px; font-size:12px }
  .s-hero-btns .s-btn{ flex:none; padding:0 28px }
  .s-hero-media{ max-width:430px }
  .s-hero-linea{ transform:translate(20px,-20px) }
  .s-hero-sello{ left:-54px; bottom:54px }
  .s-hero-firma{ right:-26px; bottom:-22px; padding:14px 20px; font-size:13px }
  .s-hero-firma b{ font-size:17px }
}
@media (min-width: 1101px){ .s-hero-in{ gap:64px; padding-top:36px; padding-bottom:104px } }
```

- [ ] **Step 6: Crear `vscode/src/site/landing/TrustStrip.tsx` y `TrustStrip.css`**

```tsx
import './TrustStrip.css';

const PUNTOS = ['Especialistas certificadas', 'Equipos de alta tecnología', 'Atención personalizada', 'Reserva en línea 24/7'];

/** Franja de confianza bajo la portada; en celular va en 2×2 (spec §5.2). */
export default function TrustStrip() {
  return (
    <div className="s-trust">
      <ul className="s-wrap s-trust-in">
        {PUNTOS.map((p) => <li key={p}>{p}</li>)}
      </ul>
    </div>
  );
}
```

```css
.s-trust{ background:var(--s-bg-alt); border-top:1px solid var(--s-line); border-bottom:1px solid var(--s-line); color:var(--s-accent) }
.s-trust-in{ list-style:none; display:grid; grid-template-columns:1fr 1fr; gap:12px 10px; padding-top:18px; padding-bottom:18px; font-size:10.5px; letter-spacing:.1em; text-transform:uppercase; text-align:center }
@media (min-width: 761px){
  .s-trust-in{ grid-template-columns:repeat(4,1fr); gap:18px; padding-top:22px; padding-bottom:22px; font-size:12px; letter-spacing:.12em }
}
/* computadora: una sola fila con rombos entre frases */
@media (min-width: 1101px){
  .s-trust-in{ display:flex; justify-content:center; align-items:center; gap:26px; font-size:13px; letter-spacing:.14em }
  .s-trust-in li + li::before{ content:""; display:inline-block; width:6px; height:6px; margin-right:26px; transform:translateY(-2px) rotate(45deg); background:currentColor; opacity:.55 }
}
```

- [ ] **Step 7: Reemplazar `vscode/src/pages/LandingPage.tsx` completo** (etapa 1: portada y franja; las Tasks 6–9 agregan lo demás)

```tsx
import SiteLayout from '../site/SiteLayout';
// primero los estilos comunes: los de cada sección se emiten después y les ganan por orden
import '../site/landing/landing.css';
import Hero from '../site/landing/Hero';
import TrustStrip from '../site/landing/TrustStrip';

/** Página principal (spec §5). Solo lista en el menú las secciones que existen. */
export default function LandingPage() {
  const secciones = ['s-inicio'];
  return (
    <SiteLayout conSecciones secciones={secciones}>
      <Hero />
      <TrustStrip />
    </SiteLayout>
  );
}
```

- [ ] **Step 8: Pruebas, tipos y compilación**

Run: `cd vscode && npm test && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site\|src/pages\|src/App.tsx" ; npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep "src/legacy" ; npm run build 2>&1 | tail -2`
Expected:
- `ℹ fail 0` y luego `0`;
- en `src/legacy`, exactamente los 2 errores que ya tenía el Footer viejo antes de moverlo (`Footer.tsx(1,50)` `'Navigation' is declared…` y `Footer.tsx(1,62)` `'Map' is declared…`), que no se tocan: es el diseño guardado tal cual;
- `✓ built in`.

- [ ] **Step 9: Commit**

```bash
git add -A vscode/src/components vscode/src/legacy vscode/src/pages vscode/src/App.tsx vscode/src/site/landing
git commit -m "feat(sitio): página principal nueva con portada y franja de confianza; la anterior queda en /diseno-anterior"
```

---

### Task 6: Servicios destacados y catálogo desplegable

**Files:**
- Create: `vscode/src/site/landing/Services.tsx`, `Services.css`, `Catalog.tsx`, `Catalog.css`
- Modify (reemplazo completo): `vscode/src/pages/LandingPage.tsx`

**Interfaces:**
- Consumes:
  - `construirCatalogo`, `FAMILIAS`, `EspecialidadVista`, `GrupoVista`, `EspecialistaVista` y `ServicioPublico` (Task 1);
  - `useServiciosPublicos` (Task 2);
  - `Desplegable` y `useRevela` (Task 4);
  - `clicEspecial` y `MONOGRAMA`.
- Produces:
  - `Services` con props `{ servicios: ServicioPublico[] }`;
  - `Catalog` con props `{ catalogo: EspecialidadVista[]; elegida: string; onElegir: (id: string) => void; pedido: number }`;
  - el bloque `#s-catalogo`.

- [ ] **Step 1: Crear `vscode/src/site/landing/Catalog.tsx`**

```tsx
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { FamiliaId } from '../../data/servicesMenu';
import { FAMILIAS, type EspecialidadVista, type EspecialistaVista, type GrupoVista } from './catalogo';
import Desplegable from '../ui/Desplegable';
import { MONOGRAMA } from '../brand';
import './Catalog.css';

interface Props {
  catalogo: EspecialidadVista[];
  elegida: string;
  onElegir: (id: string) => void;
  /** cambia cada vez que un servicio destacado pide abrir su especialidad */
  pedido: number;
}

const plural = (n: number) => `${n} ${n === 1 ? 'servicio' : 'servicios'}`;
const reducir = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** alto real de la barra, con las pestañas si están a la vista */
const altoBarra = () => document.querySelector('.s-nav')?.getBoundingClientRect().height ?? 64;

function Foto({ c, clase }: { c: EspecialidadVista; clase: string }) {
  if (!c.imagen) return <div className={`s-arco is-ph ${clase}`} aria-hidden="true"><img src={MONOGRAMA} alt="" /></div>;
  return (
    <div className={`s-arco ${clase}`}>
      <img src={c.imagen} alt="" loading="lazy" style={{ objectPosition: c.posicion ?? '50% 50%' }} />
    </div>
  );
}

function Especialista({ e }: { e: EspecialistaVista }) {
  return (
    <div className="s-cp-esp">
      {e.miniatura
        ? <img src={e.miniatura} alt="" width={38} height={38} loading="lazy" />
        : <span className="s-cp-ini" aria-hidden="true">{e.iniciales}</span>}
      <span>Realizado por<b>{e.nombre}</b></span>
    </div>
  );
}

function Lista({ grupos }: { grupos: GrupoVista[] }) {
  let r = 0; // número de fila para la cascada
  return (
    <>
      {grupos.map((g, gi) => (
        <div key={gi} className="s-cp-grupo">
          {g.etiqueta && <p className="s-cp-etq">{g.etiqueta}</p>}
          <ul>
            {g.servicios.map((s) => (
              <li key={s.nombre} className="s-fila" style={{ '--r': r++ } as CSSProperties}>
                <span className="s-fila-nm">{s.nombre}</span>
                <span className="s-fila-pts" aria-hidden="true" />
                {s.minutos !== null && <span className="s-fila-du">{s.minutos} min</span>}
                <span className={`s-fila-pr ${s.conPrecio ? '' : 'is-na'}`}>{s.precio}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

/**
 * Catálogo completo (spec §5.3). En tableta y computadora: especialidades a la izquierda y detalle a
 * la derecha. En celular: familias con una píldora que se desliza y un acordeón de especialidades.
 */
export default function Catalog({ catalogo, elegida, onElegir, pedido }: Props) {
  const raiz = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const actual = catalogo.find((c) => c.id === elegida) ?? catalogo[0];
  const [familia, setFamilia] = useState<FamiliaId>(actual.familia);
  const [abiertaMovil, setAbiertaMovil] = useState<string | null>(null);
  const [entrada, setEntrada] = useState(0); // al cambiar de familia, las especialidades entran en cascada
  const [pildora, setPildora] = useState<CSSProperties>({ width: 0 });

  // un destacado pidió esta especialidad: se elige su familia, se abre y la pantalla baja hasta ella
  useEffect(() => {
    if (!pedido) return;
    const fam = catalogo.find((c) => c.id === elegida)?.familia;
    if (fam) setFamilia(fam);
    setAbiertaMovil(elegida);
    const t = window.setTimeout(() => {
      const movil = window.matchMedia('(max-width: 760px)').matches;
      const destino = movil ? document.getElementById(`s-acc-${elegida}`) : raiz.current;
      if (!destino) return;
      const top = destino.getBoundingClientRect().top + window.scrollY - altoBarra() - 12;
      window.scrollTo({ top, behavior: reducir() ? 'instant' : 'smooth' });
    }, reducir() ? 0 : 380);
    return () => window.clearTimeout(t);
    // solo cuando llega un pedido nuevo (el catálogo cambia al cargar precios y no debe volver a bajar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido]);

  // la píldora se desliza hasta la familia elegida, y esa pestaña se centra
  useLayoutEffect(() => {
    const cont = chips.current;
    if (!cont) return;
    const medir = () => {
      const on = cont.querySelector<HTMLElement>('.is-on');
      if (!on) return;
      setPildora({ width: on.offsetWidth, height: on.offsetHeight, transform: `translate(${on.offsetLeft}px, ${on.offsetTop}px)` });
    };
    medir();
    const on = cont.querySelector<HTMLElement>('.is-on');
    if (on) cont.scrollTo({ left: on.offsetLeft - cont.clientWidth / 2 + on.offsetWidth / 2, behavior: reducir() ? 'instant' : 'smooth' });
    const ro = new ResizeObserver(medir);
    ro.observe(cont);
    return () => ro.disconnect();
  }, [familia]);

  const elegirFamilia = (f: FamiliaId) => {
    if (f === familia) return;
    setFamilia(f);
    setAbiertaMovil(null);
    setEntrada((n) => n + 1);
  };

  // si la especialidad abierta quedó bajo la barra o muy abajo, la pantalla se acomoda sola
  const alternar = (id: string) => {
    const abrir = abiertaMovil !== id;
    setAbiertaMovil(abrir ? id : null);
    if (!abrir) return;
    window.setTimeout(() => {
      const el = document.getElementById(`s-acc-${id}`);
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const h = altoBarra();
      if (top < h + 6 || top > window.innerHeight * 0.55) {
        window.scrollTo({ top: window.scrollY + top - h - 10, behavior: reducir() ? 'instant' : 'smooth' });
      }
    }, reducir() ? 0 : 340);
  };

  const nombreFamilia = (f: FamiliaId) => FAMILIAS.find((x) => x.id === f)?.nombre ?? '';

  return (
    <div className="s-cat" id="s-catalogo" ref={raiz}>
      <div className="s-cat-head">
        <div>
          <p className="s-eyebrow">Catálogo completo</p>
          <h3 className="s-display s-cat-tit">Todos nuestros tratamientos</h3>
        </div>
        <p>Elige un tipo de tratamiento y luego la especialidad para ver cada servicio, su duración y su precio.</p>
      </div>

      {/* tableta y computadora */}
      <div className="s-cat-grid">
        <nav className="s-cat-nav" aria-label="Especialidades">
          {FAMILIAS.map((f) => (
            <div key={f.id}>
              <p className="s-cat-fam">{f.nombre}</p>
              {catalogo.filter((c) => c.familia === f.id).map((c) => (
                <button key={c.id} type="button" className={`s-cat-btn ${c.id === actual.id ? 'is-on' : ''}`}
                  aria-pressed={c.id === actual.id} onClick={() => onElegir(c.id)}>
                  {c.titulo}<small>{c.total}</small>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="s-cat-panel">
          <div className="s-cp-anim" key={actual.id}>
            <div className="s-cp-top">
              <div>
                <span className="s-cp-fam">{nombreFamilia(actual.familia)}</span>
                <h4 className="s-display s-cp-tit">{actual.titulo}</h4>
                {actual.descripcion && <p className="s-cp-desc">{actual.descripcion}</p>}
                <Especialista e={actual.especialista} />
              </div>
              <Foto c={actual} clase="s-cp-img" />
            </div>
            <Lista grupos={actual.grupos} />
            <div className="s-cp-foot">
              <span>{plural(actual.total)} · puedes combinar varios en una misma cita</span>
              <Link className="s-btn s-btn-solid" to="/reservar">Reservar <span className="s-ar" aria-hidden="true">→</span></Link>
            </div>
          </div>
        </div>
      </div>

      {/* celular */}
      <div className="s-famchips" ref={chips} role="group" aria-label="Tipo de tratamiento">
        <i className="s-fam-ind" style={pildora} aria-hidden="true" />
        {FAMILIAS.map((f) => (
          <button key={f.id} type="button" className={`s-famchip ${f.id === familia ? 'is-on' : ''}`}
            aria-pressed={f.id === familia} onClick={() => elegirFamilia(f.id)}>
            {f.corto}
          </button>
        ))}
      </div>
      <div className="s-cat-acc">
        {catalogo.filter((c) => c.familia === familia).map((c, i) => {
          const abierta = abiertaMovil === c.id;
          return (
            <div key={`${c.id}-${entrada}`} id={`s-acc-${c.id}`}
              className={`s-acc ${abierta ? 'is-abierta' : ''} ${entrada ? 'is-entra' : ''}`} style={{ '--i': i } as CSSProperties}>
              <button type="button" className="s-acc-btn" aria-expanded={abierta} aria-controls={`s-acc-cuerpo-${c.id}`} onClick={() => alternar(c.id)}>
                <Foto c={c} clase="s-acc-mini" />
                <span className="s-acc-t">{c.titulo}<small>{plural(c.total)}</small></span>
                <span className="s-acc-mas" aria-hidden="true" />
              </button>
              <Desplegable id={`s-acc-cuerpo-${c.id}`} abierto={abierta}>
                <div className="s-acc-in">
                  {c.descripcion && <p className="s-cp-desc">{c.descripcion}</p>}
                  <Especialista e={c.especialista} />
                  <Lista grupos={c.grupos} />
                  <div className="s-cp-foot">
                    <Link className="s-btn s-btn-solid" to="/reservar">Reservar <span className="s-ar" aria-hidden="true">→</span></Link>
                  </div>
                </div>
              </Desplegable>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear `vscode/src/site/landing/Catalog.css`**

```css
.s-cat{ position:relative; padding-top:30px; scroll-margin-top:calc(var(--s-nav-h) + 56px) }
.s-cat-head{ margin-bottom:28px; padding-bottom:22px; border-bottom:1px solid var(--s-line) }
.s-cat-head .s-eyebrow{ margin-bottom:12px }
.s-cat-tit{ font-size:32px }
.s-cat-head > p{ margin:10px 0 0; font-size:14px; color:var(--s-soft); max-width:26em; font-weight:300 }
.s-cat-grid{ display:none }

/* celular: familias con píldora que se desliza */
.s-famchips{ position:relative; display:flex; gap:8px; overflow-x:auto; margin:0 -20px 10px; padding:0 20px 4px; scroll-padding-inline:20px; scrollbar-width:none }
.s-famchips::-webkit-scrollbar{ display:none }
.s-famchip{ position:relative; z-index:1; flex-shrink:0; height:44px; padding:0 16px; border-radius:999px; border:1px solid var(--s-line); background:transparent; font-size:13px; color:var(--s-soft); white-space:nowrap; transition:color .45s, border-color .45s }
.s-famchip.is-on{ color:var(--s-chip-on-fg); border-color:transparent }
.s-fam-ind{ position:absolute; left:0; top:0; z-index:0; border-radius:999px; background:var(--s-chip-on); transition:transform .6s var(--s-ease-io), width .6s var(--s-ease-io), background-color .6s }

/* celular: acordeón de especialidades */
.s-acc{ border-bottom:1px solid var(--s-line) }
@keyframes s-entra-acc{ from{ opacity:0; transform:translateY(18px) } to{ opacity:1; transform:none } }
.s-acc.is-entra{ animation:s-entra-acc .6s var(--s-ease) both; animation-delay:calc(var(--i, 0) * 65ms) }
.s-acc-btn{ display:flex; align-items:center; gap:14px; width:100%; background:none; border:0; padding:15px 0; text-align:left }
.s-acc-mini{ width:46px; height:46px; border-radius:999px 999px 10px 10px; flex-shrink:0; transition:transform .6s var(--s-ease) }
.s-acc-mini.is-ph img{ width:18px }
.s-acc.is-abierta .s-acc-mini{ transform:scale(1.08) }
.s-acc-t{ flex:1; min-width:0; font-family:var(--s-f-display); font-size:19px; transition:color .45s }
.s-acc-t small{ display:block; font:400 12px var(--s-f-body); color:var(--s-faint); margin-top:3px }
.s-acc.is-abierta .s-acc-t{ color:var(--s-accent) }
/* + que se vuelve – */
.s-acc-mas{ position:relative; width:30px; height:30px; border-radius:50%; border:1px solid var(--s-line); flex-shrink:0; transition:background-color .45s, color .45s, border-color .45s }
.s-acc-mas::before, .s-acc-mas::after{ content:""; position:absolute; left:50%; top:50%; width:11px; height:1.5px; border-radius:2px; background:currentColor; transform:translate(-50%,-50%); transition:transform .55s var(--s-ease-io) }
.s-acc-mas::after{ transform:translate(-50%,-50%) rotate(90deg) }
.s-acc.is-abierta .s-acc-mas{ background:var(--s-btn-bg); color:var(--s-btn-fg); border-color:transparent }
.s-acc.is-abierta .s-acc-mas::after{ transform:translate(-50%,-50%) rotate(0deg) }
.s-acc-in{ padding:0 0 22px }
@keyframes s-fila-entra{ from{ opacity:0; transform:translateX(-12px) } to{ opacity:1; transform:none } }
.s-acc.is-abierta .s-fila{ animation:s-fila-entra .5s var(--s-ease) both; animation-delay:calc(.22s + var(--r, 0) * 35ms) }

/* detalle de la especialidad (celular y panel) */
.s-cp-fam, .s-cp-etq{ font:500 11px var(--s-f-body); letter-spacing:.2em; text-transform:uppercase; color:var(--s-accent) }
.s-cp-etq{ margin:22px 0 6px }
.s-cp-tit{ font-size:32px; margin:10px 0 12px }
.s-cp-desc{ font-size:14.5px; line-height:1.65; color:var(--s-soft); font-weight:300; margin:0 0 16px; max-width:34em }
.s-cp-esp{ display:inline-flex; align-items:center; gap:12px; padding:8px 16px 8px 8px; border-radius:999px; border:1px solid var(--s-line); font-size:12.5px; color:var(--s-soft); line-height:1.3 }
.s-cp-esp b{ display:block; color:var(--s-text); font-weight:500; font-size:13.5px }
.s-cp-esp img, .s-cp-ini{ width:38px; height:38px; border-radius:50%; object-fit:cover; flex-shrink:0 }
.s-cp-ini{ display:grid; place-items:center; background:var(--s-arch-bg); color:var(--s-text); font:500 13px var(--s-f-body) }
.s-cp-grupo ul{ list-style:none; margin:0; padding:0 }
.s-fila{ display:flex; align-items:baseline; gap:10px; padding:11px 0; border-bottom:1px solid var(--s-line); font-size:14px }
.s-fila-nm{ flex:1; min-width:0 }
.s-fila-pts{ display:none }
.s-fila-du{ font-size:12.5px; color:var(--s-faint); white-space:nowrap }
.s-fila-pr{ margin-left:auto; font-weight:500; white-space:nowrap; text-align:right }
.s-fila-pr.is-na{ color:var(--s-faint); font-weight:400 }
.s-cp-foot{ display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-top:28px }
.s-cp-foot span{ font-size:13px; color:var(--s-faint) }

/* tableta y computadora: especialidades a la izquierda y panel a la derecha */
@media (min-width: 761px){
  .s-cat{ padding-top:40px }
  .s-cat-head{ display:flex; align-items:end; justify-content:space-between; gap:24px }
  .s-cat-head > p{ margin:0 }
  .s-famchips, .s-cat-acc{ display:none }
  .s-cat-grid{ display:grid; grid-template-columns:220px 1fr; gap:26px; align-items:start }
  .s-cat-fam{ font:500 11px var(--s-f-body); letter-spacing:.2em; text-transform:uppercase; color:var(--s-faint); margin:22px 0 8px }
  .s-cat-nav > div:first-child .s-cat-fam{ margin-top:0 }
  .s-cat-btn{ display:flex; justify-content:space-between; align-items:center; gap:10px; width:100%; min-height:44px; text-align:left; background:none; border:0; padding:9px 14px; border-radius:10px; font-size:15px; color:var(--s-soft); transition:background-color .3s, color .3s }
  .s-cat-btn small{ font-size:12px; opacity:.7 }
  .s-cat-btn.is-on{ background:var(--s-chip-on); color:var(--s-chip-on-fg) }
  .s-cat-panel{ min-width:0; min-height:520px; padding:34px 36px 36px; border-radius:26px; background:var(--s-surface); border:1px solid var(--s-surface-line) }
  .s-cp-top{ display:grid; grid-template-columns:1fr 130px; gap:28px; align-items:start; margin-bottom:26px }
  .s-cp-img{ aspect-ratio:4/5.2; border-radius:999px 999px 18px 18px }
  .s-cp-anim{ animation:s-subir .55s both }
  .s-fila{ gap:12px; font-size:15px }
  .s-fila-pts{ display:block; flex:1; min-width:20px; border-bottom:1px dotted var(--s-line); transform:translateY(-4px) }
}
@media (min-width: 761px) and (hover: hover){ .s-cat-btn:not(.is-on):hover{ color:var(--s-text); background:var(--s-surface) } }
@media (min-width: 1101px){
  .s-cat-grid{ grid-template-columns:270px 1fr; gap:44px }
  .s-cp-top{ grid-template-columns:1fr 170px }
}
```

- [ ] **Step 3: Crear `vscode/src/site/landing/Services.tsx`**

```tsx
import { useCallback, useMemo, useState } from 'react';
import { servicesMenu } from '../../data/servicesMenu';
import { construirCatalogo, type ServicioPublico } from './catalogo';
import Catalog from './Catalog';
import Desplegable from '../ui/Desplegable';
import { useRevela } from '../ui/useRevela';
import { clicEspecial } from '../header/navegacion';
import './Services.css';

// los 4 destacados de la spec §5.3, con los textos del boceto
const DESTACADOS = [
  { id: 'limpieza-facial', titulo: 'Limpieza facial', texto: 'Profunda, hidrafacial, peeling y más: el protocolo justo para tu tipo de piel.' },
  { id: 'depilacion-laser', titulo: 'Depilación láser', texto: 'Resultados progresivos y seguros, en áreas pequeñas o grandes.' },
  { id: 'cejas-pestanas', titulo: 'Cejas y pestañas', texto: 'Laminado, lifting, extensiones pelo a pelo y diseño con hilo.' },
  { id: 'maquillaje', titulo: 'Maquillaje', texto: 'Express, social, quinceañera y novia, con acabado profesional.' },
];

/** Servicios: 4 destacados y el catálogo completo, cerrado tras "Ver todos los servicios" (spec §5.3). */
export default function Services({ servicios }: { servicios: ServicioPublico[] }) {
  const catalogo = useMemo(() => construirCatalogo(servicesMenu, servicios), [servicios]);
  const [abierto, setAbierto] = useState(false);
  const [elegida, setElegida] = useState('limpieza-facial');
  const [pedido, setPedido] = useState(0);
  const cabeza = useRevela<HTMLDivElement>();
  const tarjetas = useRevela<HTMLDivElement>();
  const boton = useRevela<HTMLDivElement>();

  // tocar un destacado abre el catálogo justo en esa especialidad
  const abrirEn = useCallback((id: string) => {
    setElegida(id);
    setAbierto(true);
    setPedido((n) => n + 1);
  }, []);

  return (
    <section className="s-sec s-svc" id="s-servicios" data-spy="">
      <div className="s-wrap">
        <div className="s-sec-head s-rv" ref={cabeza}>
          <div>
            <p className="s-eyebrow">Nuestros servicios</p>
            <h2 className="s-display s-h2">Tratamientos <em>especializados</em> para ti</h2>
          </div>
          <p className="s-lead">Facial, corporal, cejas y pestañas y medicina estética: todo en un mismo lugar y con el mismo cuidado en cada detalle.</p>
        </div>

        <div className="s-cards s-rv" ref={tarjetas}>
          {DESTACADOS.map((d, i) => {
            const c = catalogo.find((x) => x.id === d.id);
            return (
              <a key={d.id} className="s-card" href="#s-catalogo"
                onClick={(e) => { if (clicEspecial(e)) return; e.preventDefault(); abrirEn(d.id); }}>
                <div className="s-card-img">
                  <img src={c?.imagen} alt="" loading="lazy" style={{ objectPosition: c?.posicion ?? '50% 50%' }} />
                </div>
                <div className="s-card-bd">
                  <span className="s-card-num">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="s-display s-h3">{d.titulo}</h3>
                  <p>{d.texto}</p>
                  <span className="s-card-link">Ver servicios <span className="s-ar" aria-hidden="true">→</span></span>
                </div>
              </a>
            );
          })}
        </div>

        <div className="s-cat-toggle s-rv" ref={boton}>
          <button type="button" className={`s-btn s-btn-line s-cat-open ${abierto ? 'is-abierto' : ''}`}
            aria-expanded={abierto} aria-controls="s-cat-despl" onClick={() => setAbierto((a) => !a)}>
            <span className="s-co-l">
              <span className="s-co-roll">
                <b className="s-co-a" aria-hidden={abierto}>Ver todos los servicios</b>
                <b className="s-co-b" aria-hidden={!abierto}>Ocultar servicios</b>
              </span>
              <small>{catalogo.length} especialidades · precios y duración</small>
            </span>
            <i className="s-co-chev" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </i>
          </button>
        </div>

        <Desplegable id="s-cat-despl" abierto={abierto}>
          <Catalog catalogo={catalogo} elegida={elegida} onElegir={setElegida} pedido={pedido} />
        </Desplegable>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Crear `vscode/src/site/landing/Services.css`**

```css
.s-svc{ background:var(--s-bg) }

/* celular: cuadrícula 2×2 de fotos con el nombre encima (sin carrusel) */
.s-cards{ display:grid; grid-template-columns:1fr 1fr; gap:12px }
.s-card{ position:relative; display:block; border-radius:20px; overflow:hidden; background:var(--s-surface); border:1px solid var(--s-surface-line); -webkit-tap-highlight-color:transparent; transition:transform .5s var(--s-ease), box-shadow .5s, background-color .6s, border-color .6s }
.s-card:active{ transform:scale(.98) }
.s-card-img{ aspect-ratio:4/5.2; overflow:hidden }
.s-card-img img{ width:100%; height:100%; object-fit:cover; transition:transform 1.2s var(--s-ease) }
.s-card-bd{ position:absolute; left:0; right:0; bottom:0; padding:46px 14px 14px; background:linear-gradient(180deg, rgba(20,14,10,0), rgba(20,14,10,.88)) }
.s-card-bd p, .s-card-num{ display:none }
.s-card-bd .s-h3{ margin:0 0 4px; font-size:17px; color:#F5F1EA }
.s-card-link{ display:inline-flex; gap:8px; font-size:12.5px; font-weight:500; color:var(--s-camel-l) }

/* botón del catálogo: el texto rueda a "Ocultar servicios" y la flecha gira */
.s-cat-toggle{ display:flex; justify-content:center; margin-top:24px }
.s-cat-open{ width:100%; height:auto; min-height:64px; justify-content:space-between; gap:14px; padding:12px 16px 12px 24px; overflow:hidden }
.s-co-l{ display:flex; flex-direction:column; align-items:flex-start; line-height:1.2; text-align:left }
.s-co-l small{ font-size:12px; font-weight:400; opacity:.65 }
.s-co-roll{ position:relative; display:block; height:1.3em; overflow:hidden }
.s-co-roll b{ display:block; font-weight:500; transition:transform .65s var(--s-ease-x) }
.s-co-roll .s-co-b{ position:absolute; left:0; top:0; transform:translateY(110%) }
.s-cat-open.is-abierto .s-co-a{ transform:translateY(-110%) }
.s-cat-open.is-abierto .s-co-b{ transform:none }
.s-co-chev{ display:grid; place-items:center; flex-shrink:0; width:34px; height:34px; border-radius:50%; border:1px solid currentColor; transition:transform .65s var(--s-ease-x), background-color .45s, color .45s, border-color .45s }
.s-co-chev svg{ width:14px; height:14px }
.s-cat-open.is-abierto .s-co-chev{ transform:rotate(180deg); background:var(--s-btn-bg); color:var(--s-btn-fg); border-color:transparent }

/* tableta: 2×2 con descripción; computadora: 4 en fila */
@media (min-width: 761px){
  .s-cards{ gap:22px }
  .s-card{ border-radius:22px }
  .s-card-img{ aspect-ratio:4/4.6; margin:10px 10px 0; border-radius:16px }
  .s-card-bd{ position:static; padding:20px 22px 24px; background:none }
  .s-card-num{ display:block; margin-bottom:10px; font:500 12px var(--s-f-body); letter-spacing:.2em; color:var(--s-accent) }
  .s-card-bd .s-h3{ margin:0 0 10px; font-size:23px; color:var(--s-text) }
  .s-card-bd p{ display:block; min-height:4.8em; margin:0 0 18px; font-size:14px; line-height:1.6; font-weight:300; color:var(--s-soft) }
  .s-card-link{ font-size:14px; color:var(--s-accent) }
  .s-cat-toggle{ margin-top:44px }
  .s-cat-open{ width:auto; padding:12px 30px }
}
@media (min-width: 1101px){ .s-cards{ grid-template-columns:repeat(4,1fr) } }
@media (hover: hover){
  .s-card:hover{ transform:translateY(-8px); background:var(--s-surface-hover); box-shadow:var(--s-shadow) }
  .s-card:hover .s-card-img img{ transform:scale(1.06) }
  .s-card:hover .s-ar{ transform:translateX(5px) }
}
```

- [ ] **Step 5: Reemplazar `vscode/src/pages/LandingPage.tsx` completo** (etapa 2)

```tsx
import SiteLayout from '../site/SiteLayout';
// primero los estilos comunes: los de cada sección se emiten después y les ganan por orden
import '../site/landing/landing.css';
import Hero from '../site/landing/Hero';
import TrustStrip from '../site/landing/TrustStrip';
import Services from '../site/landing/Services';
import { useServiciosPublicos } from '../site/landing/useDatosPublicos';

/** Página principal (spec §5). Solo lista en el menú las secciones que existen. */
export default function LandingPage() {
  const servicios = useServiciosPublicos();
  const secciones = ['s-inicio', 's-servicios'];
  return (
    <SiteLayout conSecciones secciones={secciones}>
      <Hero />
      <TrustStrip />
      <Services servicios={servicios} />
    </SiteLayout>
  );
}
```

- [ ] **Step 6: Pruebas, tipos y compilación**

Run: `cd vscode && npm test && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site\|src/pages/LandingPage" ; npm run build 2>&1 | tail -2`
Expected: `ℹ fail 0`, luego `0` y `✓ built in`.

- [ ] **Step 7: Commit**

```bash
git add vscode/src/site/landing vscode/src/pages/LandingPage.tsx
git commit -m "feat(sitio): servicios destacados y catálogo desplegable por familias"
```

---

### Task 7: Paquetes (estilo "Menú con foto") y "Cómo funciona"

La Fase 3 agrega los estilos Membresía y Ahorro y el selector del panel. Esta fase trae el estilo por
defecto (B) para que la página nueva no llegue a producción sin paquetes: la vieja sí los tiene.

**Files:**
- Create: `vscode/src/site/landing/Packages.tsx`, `Packages.css`
- Modify (reemplazo completo): `vscode/src/pages/LandingPage.tsx`

**Interfaces:**
- Consumes:
  - `formatoRD` (Task 1);
  - `PaquetePublico`, `fotoDePaquete`, `indiceDestacado`, `nombreCorto` y `precioPorSesion` (Task 2);
  - `usePaquetesPublicos` (Task 2) y `useRevela` (Task 4).
- Produces: `Packages` con props `{ paquetes: PaquetePublico[] }`. La Fase 3 le suma el estilo.

- [ ] **Step 1: Crear `vscode/src/site/landing/Packages.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { formatoRD } from './catalogo';
import { fotoDePaquete, indiceDestacado, nombreCorto, precioPorSesion, type PaquetePublico } from './paquetes';
import { MONOGRAMA } from '../brand';
import { useRevela } from '../ui/useRevela';
import './Packages.css';

const PASOS = [
  { n: '01', t: 'Elige tu paquete', d: 'Según el tratamiento y las sesiones que tu piel necesita.' },
  { n: '02', t: 'Reserva en línea', d: 'Agenda tu primera sesión y las siguientes cuando te quede mejor.' },
  { n: '03', t: 'Sigue tu avance', d: 'En Mis citas ves cuántas sesiones llevas y cuántas te quedan.' },
];
const MAX_OVALOS = 10; // más de 10 sesiones se dicen con el número, sin llenar la fila

/** Paquetes en el estilo "Menú con foto" (spec §6.4-B) y la franja "Cómo funciona" (spec §5.4). */
export default function Packages({ paquetes }: { paquetes: PaquetePublico[] }) {
  const cabeza = useRevela<HTMLDivElement>();
  const filas = useRevela<HTMLDivElement>();
  const pasos = useRevela<HTMLOListElement>();
  const destacado = indiceDestacado(paquetes.length);

  return (
    <section className="s-sec s-pkg" id="s-paquetes" data-spy="">
      <div className="s-wrap">
        <div className="s-sec-head s-sec-head--centro s-rv" ref={cabeza}>
          <p className="s-eyebrow">Paquetes con sesiones</p>
          <h2 className="s-display s-h2">Ahorra con nuestros <em>paquetes</em></h2>
          <p className="s-lead">Compra tu paquete de sesiones y obtén resultados duraderos a un precio especial.</p>
        </div>

        <div className="s-prows s-rv" ref={filas}>
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
                  <h3 className="s-display">{nombreCorto(p.nombre)}{esDestacado && <span className="s-tag">Más elegido</span>}</h3>
                  {p.servicio && <p className="s-prow-inc">{p.servicio}</p>}
                  <div className="s-ovalos">
                    {Array.from({ length: Math.min(p.sesiones, MAX_OVALOS) }, (_, k) => <i key={k} aria-hidden="true" />)}
                    <span>{p.sesiones} {p.sesiones === 1 ? 'sesión' : 'sesiones'}</span>
                  </div>
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

- [ ] **Step 2: Crear `vscode/src/site/landing/Packages.css`**

```css
.s-pkg{ background:var(--s-bg-alt) }
.s-prows{ border-top:1px solid var(--s-line) }
/* celular: foto a la izquierda, texto y precio a la derecha, botón a lo ancho */
.s-prow{ display:grid; grid-template-columns:84px 1fr; gap:6px 16px; align-items:center; padding:20px 2px; border-bottom:1px solid var(--s-line); transition:background-color .4s }
.s-prow-foto{ grid-row:span 2; aspect-ratio:4/5; border-radius:999px 999px 16px 16px }
.s-prow-foto img{ object-position:50% 35%; transition:transform 1s var(--s-ease) }
.s-prow h3{ display:flex; align-items:center; flex-wrap:wrap; gap:8px 14px; margin:0 0 8px; font-size:22px }
.s-tag{ padding:5px 11px; border-radius:999px; background:var(--s-btn-bg); color:var(--s-btn-fg); font:500 10.5px var(--s-f-body); letter-spacing:.16em; text-transform:uppercase }
.s-prow-inc{ margin:0 0 10px; font-size:14px; color:var(--s-soft); font-weight:300 }
/* sesiones en óvalos, como los letreros del salón */
.s-ovalos{ display:flex; flex-wrap:wrap; align-items:center; gap:6px; color:var(--s-accent) }
.s-ovalos i{ display:block; width:12px; height:22px; border-radius:999px; border:1px solid currentColor }
.s-ovalos span{ margin-left:8px; font-size:12px; letter-spacing:.14em; text-transform:uppercase }
.s-prow-precio{ grid-column:2 }
.s-prow-precio b{ margin-right:8px; font-family:var(--s-f-display); font-weight:400; font-size:25px }
.s-prow-precio span{ font-size:13px; color:var(--s-faint); white-space:nowrap }
.s-prow-go{ grid-column:1 / -1; margin-top:14px }
.s-prow-go .s-btn{ width:100% }

/* Cómo funciona */
.s-how{ list-style:none; display:grid; grid-template-columns:1fr; margin:36px 0 0; padding:0; border:1px solid var(--s-line); border-radius:24px; overflow:hidden }
.s-how-paso{ display:flex; align-items:flex-start; gap:18px; padding:26px 28px }
.s-how-paso + .s-how-paso{ border-top:1px solid var(--s-line) }
.s-how-paso b{ font-family:var(--s-f-display); font-weight:400; font-style:italic; font-size:30px; line-height:1; color:var(--s-accent) }
.s-how-paso h4{ margin:0 0 6px; font-family:var(--s-f-body); font-size:15.5px; font-weight:500 }
.s-how-paso p{ margin:0; font-size:13.5px; line-height:1.6; color:var(--s-soft); font-weight:300 }

@media (min-width: 761px){
  .s-prow{ grid-template-columns:100px 1fr auto; gap:22px; padding:28px 24px }
  .s-prow-foto{ grid-row:auto }
  .s-prow h3{ font-size:28px }
  .s-prow-inc{ margin-bottom:14px }
  .s-prow-precio{ grid-column:auto }
  .s-prow-precio b{ display:block; margin:0; font-size:32px }
  .s-prow-go{ grid-column:2 / -1; justify-self:start; margin-top:0 }
  .s-prow-go .s-btn{ width:auto }
  .s-how{ margin-top:56px }
}
@media (min-width: 1101px){
  .s-prow{ grid-template-columns:118px 1.4fr 1fr auto; gap:40px }
  .s-prow-go{ grid-column:auto; justify-self:end }
  .s-how{ grid-template-columns:repeat(3,1fr) }
  .s-how-paso + .s-how-paso{ border-top:0; border-left:1px solid var(--s-line) }
}
@media (hover: hover){
  .s-prow:hover{ background:var(--s-surface) }
  .s-prow:hover .s-prow-foto img{ transform:scale(1.07) }
}
```

- [ ] **Step 3: Reemplazar `vscode/src/pages/LandingPage.tsx` completo** (etapa 3)

```tsx
import SiteLayout from '../site/SiteLayout';
// primero los estilos comunes: los de cada sección se emiten después y les ganan por orden
import '../site/landing/landing.css';
import Hero from '../site/landing/Hero';
import TrustStrip from '../site/landing/TrustStrip';
import Services from '../site/landing/Services';
import Packages from '../site/landing/Packages';
import { usePaquetesPublicos, useServiciosPublicos } from '../site/landing/useDatosPublicos';

/** Página principal (spec §5). Solo lista en el menú las secciones que existen. */
export default function LandingPage() {
  const servicios = useServiciosPublicos();
  const { paquetes } = usePaquetesPublicos();
  const conPaquetes = paquetes.length > 0; // sin paquetes activos (o sin red) la sección no aparece
  const secciones = ['s-inicio', 's-servicios', ...(conPaquetes ? ['s-paquetes'] : [])];
  return (
    <SiteLayout conSecciones secciones={secciones}>
      <Hero />
      <TrustStrip />
      <Services servicios={servicios} />
      {conPaquetes && <Packages paquetes={paquetes} />}
    </SiteLayout>
  );
}
```

- [ ] **Step 4: Pruebas, tipos y compilación**

Run: `cd vscode && npm test && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site\|src/pages/LandingPage" ; npm run build 2>&1 | tail -2`
Expected: `ℹ fail 0`, luego `0` y `✓ built in`.

- [ ] **Step 5: Commit**

```bash
git add vscode/src/site/landing vscode/src/pages/LandingPage.tsx
git commit -m "feat(sitio): paquetes en estilo Menú con foto y franja Cómo funciona"
```

---

### Task 8: Conoce a Anabel, filosofía en óvalos y opiniones

**Files:**
- Create: `vscode/src/site/landing/About.tsx`, `About.css`, `Philosophy.tsx`, `Philosophy.css`, `Testimonials.tsx`, `Testimonials.css`
- Modify (reemplazo completo): `vscode/src/pages/LandingPage.tsx`

**Interfaces:**
- Consumes: `Desplegable`, `CarruselCentrado` y `useRevela` (Task 4); `testimonios` (Task 2); `FOTOS` y `MONOGRAMA`.
- Produces: `About`, `Philosophy` y `Testimonials`, sin props. `Testimonials` devuelve `null` si no hay testimonios.

- [ ] **Step 1: Crear `vscode/src/site/landing/About.tsx`**

```tsx
import { useState } from 'react';
import { FOTOS, MONOGRAMA } from '../brand';
import Desplegable from '../ui/Desplegable';
import { useRevela } from '../ui/useRevela';
import './About.css';

/** Conoce a Anabel: foto en arco, dos párrafos, la cita y su historia desplegable (spec §5.5). */
export default function About() {
  const [historia, setHistoria] = useState(false);
  const media = useRevela<HTMLDivElement>();
  const texto = useRevela<HTMLDivElement>();
  return (
    <section className="s-sec s-about" id="s-nosotros" data-spy="">
      <div className="s-wrap s-about-in">
        <div className="s-about-media s-rv" ref={media}>
          <div className="s-arco s-about-arco"><img src={FOTOS.anabelLobby} alt="Anabel en el lobby del salón" loading="lazy" /></div>
          <div className="s-about-sello" aria-hidden="true"><img src={MONOGRAMA} alt="" /></div>
        </div>
        <div className="s-about-tx s-rv" ref={texto}>
          <p className="s-eyebrow">Conoce a Anabel</p>
          <h2 className="s-display s-h2">La historia detrás de <em>Anadsll</em></h2>
          <p className="s-about-p">
            Anadsll nace de las iniciales de su fundadora, Anabel De los Santos Lluberes. Empezó en 2016 como
            consultora de belleza y se formó como cosmetóloga, maquilladora, lashista y especialista en cejas.
          </p>
          <p className="s-about-p">
            Hoy combina técnica, equipos de alta tecnología y calidez humana, para que al irte veas en el espejo
            exactamente lo que esperabas.
          </p>
          <blockquote className="s-display s-about-cita">“Belleza y bienestar con responsabilidad.”</blockquote>
          <Desplegable id="s-historia" abierto={historia}>
            <div className="s-historia">
              <p>Todo comenzó en 2016, cuando di mis primeros pasos como consultora de belleza en Mary Kay. Ahí descubrí mi pasión: ayudar a las mujeres a sentirse seguras en su propia piel.</p>
              <p>Con el tiempo, esa pasión me llevó a formarme más. Me certifiqué como maquilladora, lashista, especialista en cejas, cosmetóloga y masajista. Cada formación era un paso para ofrecerte algo mejor.</p>
              <p>Mi deseo es simple: que cuando visites Anadsll te sientas en un espacio acogedor, en confianza. Y que al irte, veas en el espejo exactamente los resultados que esperabas. Porque tu transformación es nuestra mayor satisfacción.</p>
              <p className="s-historia-firma">¡Bienvenida a Anadsll! Bienvenida a tu mejor versión. — Anabel</p>
            </div>
          </Desplegable>
          <button type="button" className={`s-btn s-btn-line s-historia-btn ${historia ? 'is-abierto' : ''}`}
            aria-expanded={historia} aria-controls="s-historia" onClick={() => setHistoria((h) => !h)}>
            {historia ? 'Cerrar su historia' : 'Leer su historia'} <span className="s-ar" aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Crear `vscode/src/site/landing/About.css`**

```css
.s-about{ background:var(--s-bg) }
.s-about-in{ display:grid; grid-template-columns:1fr; gap:44px; align-items:center }
.s-about-media{ position:relative; width:100%; max-width:300px; margin:0 auto }
.s-about-arco{ aspect-ratio:4/5.4; border-radius:999px 999px 26px 26px }
.s-about-arco img{ object-position:40% 40% }
.s-about-sello{ position:absolute; right:-14px; top:40px; z-index:3; display:grid; place-items:center; width:72px; height:72px; border-radius:50%; background:var(--s-btn-bg) }
.s-about-sello img{ width:28px; filter:brightness(0) invert(1) }
.site[data-site-tema="oscuro"] .s-about-sello img{ filter:brightness(0) }
.s-about-tx .s-eyebrow{ margin-bottom:18px }
.s-about-tx h2{ margin-bottom:26px }
.s-about-p{ max-width:34em; margin:0 0 16px; font-size:16px; line-height:1.75; font-weight:300; color:var(--s-soft) }
.s-about-cita{ margin:30px 0; padding-left:26px; border-left:1px solid var(--s-accent); font-size:23px; font-style:italic; line-height:1.25 }
.s-historia{ margin-bottom:8px; padding:4px 0 30px 26px; border-left:1px solid var(--s-line) }
.s-historia p{ max-width:34em; margin:0 0 14px; font-size:15.5px; line-height:1.8; color:var(--s-soft); font-weight:300 }
.s-historia .s-historia-firma{ font-family:var(--s-f-display); font-style:italic; font-size:21px; color:var(--s-text) }
.s-historia-btn .s-ar{ transition:transform .4s }
.s-historia-btn.is-abierto .s-ar, .s-historia-btn.is-abierto:hover .s-ar{ transform:rotate(90deg) }
@media (min-width: 761px){
  .s-about-in{ grid-template-columns:.9fr 1.1fr; gap:48px }
  .s-about-media{ max-width:440px; margin:0 }
  .s-about-sello{ right:-30px; width:92px; height:92px }
  .s-about-cita{ font-size:28px }
}
@media (min-width: 1101px){ .s-about-in{ gap:88px } }
```

- [ ] **Step 3: Crear `vscode/src/site/landing/Philosophy.tsx` y `Philosophy.css`**

```tsx
import CarruselCentrado from '../ui/CarruselCentrado';
import { useRevela } from '../ui/useRevela';
import './Philosophy.css';

const VALORES = ['Atención personalizada', 'Excelencia con calidez', 'Confianza y bienestar', 'Compromiso real', 'Eficiencia', 'Seguridad'];

/** Misión, visión y valores en tres óvalos, como los letreros de su pared (spec §5.6). Cuenta como "Nosotros". */
export default function Philosophy() {
  const cabeza = useRevela<HTMLDivElement>();
  return (
    <section className="s-sec s-filo" id="s-filosofia" data-spy="s-nosotros">
      <div className="s-wrap">
        <div className="s-sec-head s-sec-head--centro s-rv" ref={cabeza}>
          <p className="s-eyebrow">Nuestra filosofía</p>
          <h2 className="s-display s-h2">Lo que nos <em>mueve</em></h2>
        </div>
        <CarruselCentrado etiqueta="Misión, visión y valores">
          <article className="s-oval">
            <h3 className="s-ov-tag">Misión</h3>
            <p>Ofrecer una experiencia superior de cuidado personal y bienestar, transformando la salud de la piel de nuestros clientes a través de tratamientos estéticos avanzados y tecnología de vanguardia, con un diagnóstico profesional y honesto, en un ambiente que inspire confianza, seguridad y relajación.</p>
          </article>
          <article className="s-oval">
            <h3 className="s-ov-tag">Visión</h3>
            <p>Ser el centro estético líder en la región sur y en San José de Ocoa, reconocidos por la excelencia en servicios, la innovación en tratamientos y el compromiso con la satisfacción del cliente; el referente en belleza y bienestar que promueve la autoestima de quienes nos visitan.</p>
          </article>
          <article className="s-oval">
            <h3 className="s-ov-tag">Valores</h3>
            <ul>{VALORES.map((v) => <li key={v}>{v}</li>)}</ul>
          </article>
        </CarruselCentrado>
      </div>
    </section>
  );
}
```

```css
.s-filo{ background:var(--s-tex) }
.s-oval{ position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; max-width:320px; aspect-ratio:1/1.72; padding:58px 28px; border-radius:999px; border:1.5px solid var(--s-accent); text-align:center; background:color-mix(in srgb, var(--s-bg) 55%, transparent) }
.s-oval::before{ content:""; position:absolute; inset:8px; border-radius:999px; border:1px solid var(--s-line) }
/* la etiqueta es un h3 (Misión / Visión / Valores) con aspecto de letrero */
.s-oval .s-ov-tag{ position:relative; display:inline-block; margin:0 0 22px; padding:7px 18px; border-radius:4px; background:var(--s-btn-bg); color:var(--s-btn-fg); font:500 11.5px var(--s-f-body); letter-spacing:.22em; text-transform:uppercase }
.s-oval p{ position:relative; margin:0; font-size:14px; line-height:1.7; color:var(--s-soft); font-weight:300 }
.s-oval ul{ position:relative; list-style:none; margin:0; padding:0; font-family:var(--s-f-display); font-size:18px; line-height:1.3 }
.s-oval li{ padding:7px 0 }
.s-oval li + li{ border-top:1px solid var(--s-line) }
@media (max-width: 1100px){ .s-oval{ max-width:none } }
@media (min-width: 761px){ .s-oval{ padding:64px 38px } }
```

- [ ] **Step 4: Crear `vscode/src/site/landing/Testimonials.tsx` y `Testimonials.css`**

```tsx
import { testimonios } from '../../config/testimonios';
import CarruselCentrado from '../ui/CarruselCentrado';
import { useRevela } from '../ui/useRevela';
import './Testimonials.css';

/** Opiniones: en computadora 3 en fila; en tableta y celular una a la vez con puntitos (spec §5.8). */
export default function Testimonials() {
  const cabeza = useRevela<HTMLDivElement>();
  if (!testimonios.length) return null;
  return (
    <section className="s-sec s-testi" id="s-opiniones" data-spy="">
      <div className="s-wrap">
        <div className="s-sec-head s-sec-head--centro s-rv" ref={cabeza}>
          <p className="s-eyebrow">Opiniones</p>
          <h2 className="s-display s-h2">Lo que dicen nuestras <em>clientas</em></h2>
        </div>
        <CarruselCentrado etiqueta="Opiniones de clientas" className="s-carr--opiniones">
          {testimonios.map((t) => (
            <figure key={t.nombre} className="s-tq">
              <span className="s-tq-q" aria-hidden="true">“</span>
              <blockquote>{t.texto}</blockquote>
              <figcaption>
                <span><b>{t.nombre}</b>{t.servicio}</span>
                <span className="s-tq-est" role="img" aria-label={`${t.estrellas} de 5 estrellas`}>{'★'.repeat(t.estrellas)}</span>
              </figcaption>
            </figure>
          ))}
        </CarruselCentrado>
      </div>
    </section>
  );
}
```

```css
.s-testi{ background:var(--s-bg) }
.s-carr--opiniones{ --carr-movil:84vw }
.s-tq{ display:flex; flex-direction:column; width:100%; margin:0; padding:30px 24px 26px; border-radius:26px; background:var(--s-surface); border:1px solid var(--s-surface-line) }
.s-tq-q{ height:34px; font-family:var(--s-f-display); font-size:70px; line-height:.6; color:var(--s-accent) }
.s-tq blockquote{ flex:1; margin:10px 0 26px; font-family:var(--s-f-display); font-size:20px; line-height:1.4 }
.s-tq figcaption{ display:flex; align-items:center; gap:12px; padding-top:18px; border-top:1px solid var(--s-line); font-size:13px; color:var(--s-soft) }
.s-tq figcaption b{ display:block; font-size:14px; font-weight:500; color:var(--s-text) }
.s-tq-est{ margin-left:auto; font-size:12px; letter-spacing:2px; color:var(--s-accent) }
@media (min-width: 761px){ .s-tq{ padding:38px 34px 32px } }
```

- [ ] **Step 5: Reemplazar `vscode/src/pages/LandingPage.tsx` completo** (etapa 4)

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
import Testimonials from '../site/landing/Testimonials';
import { usePaquetesPublicos, useServiciosPublicos } from '../site/landing/useDatosPublicos';
import { testimonios } from '../config/testimonios';

/** Página principal (spec §5). Solo lista en el menú las secciones que existen. */
export default function LandingPage() {
  const servicios = useServiciosPublicos();
  const { paquetes } = usePaquetesPublicos();
  const conPaquetes = paquetes.length > 0; // sin paquetes activos (o sin red) la sección no aparece
  const conOpiniones = testimonios.length > 0;
  const secciones = [
    's-inicio', 's-servicios',
    ...(conPaquetes ? ['s-paquetes'] : []),
    's-nosotros',
    ...(conOpiniones ? ['s-opiniones'] : []),
  ];
  return (
    <SiteLayout conSecciones secciones={secciones}>
      <Hero />
      <TrustStrip />
      <Services servicios={servicios} />
      {conPaquetes && <Packages paquetes={paquetes} />}
      <About />
      <Philosophy />
      <Testimonials />
    </SiteLayout>
  );
}
```

- [ ] **Step 6: Pruebas, tipos y compilación**

Run: `cd vscode && npm test && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site\|src/pages/LandingPage" ; npm run build 2>&1 | tail -2`
Expected: `ℹ fail 0`, luego `0` y `✓ built in`.

- [ ] **Step 7: Commit**

```bash
git add vscode/src/site/landing vscode/src/pages/LandingPage.tsx
git commit -m "feat(sitio): Conoce a Anabel con su historia, filosofía en óvalos y opiniones"
```

---

### Task 9: Llamada final y contacto

**Files:**
- Create: `vscode/src/site/landing/CtaBand.tsx`, `CtaBand.css`, `Contact.tsx`, `Contact.css`
- Modify (reemplazo completo): `vscode/src/pages/LandingPage.tsx`

**Interfaces:**
- Consumes: `site`, `mapsUrl`, `wazeUrl` y `mapEmbedUrl` (`src/config/site.ts`); `useRevela`; `MONOGRAMA`.
- Produces: `CtaBand` y `Contact`, sin props. Con ellos `LandingPage` queda completa: las 6 secciones con id del menú, más la filosofía y la llamada final.

- [ ] **Step 1: Crear `vscode/src/site/landing/CtaBand.tsx` y `CtaBand.css`**

```tsx
import { Link } from 'react-router-dom';
import { MONOGRAMA } from '../brand';
import { site } from '../../config/site';
import { useRevela } from '../ui/useRevela';
import './CtaBand.css';

/** Llamada final: siempre marrón (también en el tema beige), con la N gigante de fondo (spec §5.9). */
export default function CtaBand() {
  const bloque = useRevela<HTMLDivElement>();
  const whatsapp = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent('Hola, quiero agendar una cita')}`;
  return (
    <section className="s-cta" aria-labelledby="s-cta-tit">
      <img className="s-cta-mono" src={MONOGRAMA} alt="" aria-hidden="true" />
      <div className="s-wrap s-cta-in s-rv" ref={bloque}>
        <p className="s-eyebrow">Reserva en línea</p>
        <h2 id="s-cta-tit" className="s-display s-h2">¿Lista para tu <em>mejor versión</em>?</h2>
        <p className="s-lead">Elige tu servicio, tu especialista y tu hora, o escríbenos por WhatsApp si prefieres que te orientemos.</p>
        <div className="s-cta-btns">
          <Link className="s-btn s-btn-solid" to="/reservar">Agendar cita <span className="s-ar" aria-hidden="true">→</span></Link>
          <a className="s-btn s-btn-line" href={whatsapp} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>
        </div>
      </div>
    </section>
  );
}
```

```css
/* siempre marrón: colores fijos de la marca, no las variables del tema */
.s-cta{ position:relative; overflow:hidden; padding:72px 0; text-align:center; background:var(--s-listones-oscuro); color:#F5F1EA }
.s-cta .s-eyebrow, .s-cta .s-display em{ color:#B2967D }
.s-cta .s-lead{ margin:0 auto 38px; color:rgba(245,241,234,.72) }
.s-cta .s-btn-solid{ background:#B2967D; color:#2A1E17 }
.s-cta .s-btn-line{ color:#F5F1EA }
.s-cta-mono{ position:absolute; left:50%; top:50%; height:130%; transform:translate(-50%,-50%); opacity:.05; pointer-events:none; filter:brightness(0) invert(1) }
.s-cta-in{ position:relative }
.s-cta-in .s-eyebrow{ margin-bottom:22px }
.s-cta-in h2{ margin-bottom:20px }
.s-cta-btns{ display:flex; justify-content:center; flex-wrap:wrap; gap:14px }
.s-cta-btns .s-btn{ width:100% }
@media (min-width: 761px){ .s-cta{ padding:92px 0 } .s-cta-btns .s-btn{ width:auto } }
@media (min-width: 1101px){ .s-cta{ padding:120px 0 } }
@media (hover: hover){ .s-cta .s-btn-solid:hover{ background:#CDB8A2 } }
```

- [ ] **Step 2: Crear `vscode/src/site/landing/Contact.tsx` y `Contact.css`**

```tsx
import { site, mapsUrl, wazeUrl, mapEmbedUrl } from '../../config/site';
import { useRevela } from '../ui/useRevela';
import './Contact.css';

/** Contacto con dirección, horario, teléfono, Instagram, Waze/Maps y el mapa (spec §5.10). */
export default function Contact() {
  const texto = useRevela<HTMLDivElement>();
  return (
    <section className="s-sec s-contact" id="s-contacto" data-spy="">
      <div className="s-wrap s-contact-in">
        <div className="s-rv" ref={texto}>
          <p className="s-eyebrow">Visítanos</p>
          <h2 className="s-display s-h2">Te esperamos en <em>San José de Ocoa</em></h2>
          <ul className="s-ct-list">
            <li><span>Dirección</span>{site.address}</li>
            <li><span>Horario</span>{site.hours}</li>
            <li><span>Teléfono</span><a href={`tel:+1${site.phone.replace(/\D/g, '')}`}>{site.phone}</a></li>
            <li>
              <span>Instagram</span>
              <a href={`https://www.instagram.com/${site.instagram}`} target="_blank" rel="noopener noreferrer">@{site.instagram}</a>
            </li>
          </ul>
          <div className="s-ct-btns">
            <a className="s-btn s-btn-solid" href={wazeUrl} target="_blank" rel="noopener noreferrer">Cómo llegar con Waze</a>
            <a className="s-btn s-btn-line" href={mapsUrl} target="_blank" rel="noopener noreferrer">Google Maps</a>
          </div>
        </div>
        {/* sin aparecer al bajar: la animación peleaba con la máscara que redondea el mapa en Safari */}
        <div className="s-ct-mapa">
          <iframe src={mapEmbedUrl} loading="lazy" title="Ubicación de Anadsll Beauty Esthetic" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      </div>
    </section>
  );
}
```

```css
.s-contact{ background:var(--s-bg-alt) }
.s-contact-in{ display:grid; grid-template-columns:1fr; gap:44px; align-items:center }
.s-contact .s-eyebrow{ margin-bottom:18px }
.s-contact h2{ margin-bottom:30px }
.s-ct-list{ list-style:none; margin:0 0 34px; padding:0 }
.s-ct-list li{ display:grid; grid-template-columns:1fr; gap:4px; padding:15px 0; border-bottom:1px solid var(--s-line); font-size:15.5px }
.s-ct-list li span{ padding-top:4px; font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:var(--s-accent) }
/* enlaces de teléfono e Instagram con zona táctil de 44 px sin mover el texto */
.s-ct-list a{ display:inline-block; margin:-10px 0; padding:10px 0 }
.s-ct-btns{ display:flex; flex-wrap:wrap; gap:12px }
.s-ct-btns .s-btn{ width:100% }
/* mapa: esquinas redondeadas que Safari/iPad respeta, sin filtros que lo deformen */
.s-ct-mapa{ position:relative; overflow:hidden; aspect-ratio:4/3.4; border-radius:22px; border:1px solid var(--s-surface-line); box-shadow:var(--s-shadow); isolation:isolate; -webkit-mask-image:-webkit-radial-gradient(white, black); transform:translateZ(0) }
.s-ct-mapa iframe{ position:absolute; inset:0; display:block; width:100%; height:100%; border:0 }
@media (min-width: 761px){
  .s-contact-in{ gap:40px }
  .s-ct-list li{ grid-template-columns:110px 1fr; gap:16px }
  .s-ct-btns .s-btn{ width:auto }
  .s-ct-mapa{ aspect-ratio:16/10; border-radius:28px }
}
@media (min-width: 1101px){
  .s-contact-in{ grid-template-columns:1fr 1.1fr; gap:64px }
  .s-ct-mapa{ aspect-ratio:1/1 }
}
```

- [ ] **Step 3: Reemplazar `vscode/src/pages/LandingPage.tsx` completo** (versión final)

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
import Testimonials from '../site/landing/Testimonials';
import CtaBand from '../site/landing/CtaBand';
import Contact from '../site/landing/Contact';
import { usePaquetesPublicos, useServiciosPublicos } from '../site/landing/useDatosPublicos';
import { testimonios } from '../config/testimonios';

/**
 * Página principal (spec §5). Solo lista en el menú las secciones que existen: Paquetes aparece si hay
 * paquetes activos y Opiniones si hay testimonios. El equipo llega en la Fase 4.
 */
export default function LandingPage() {
  const servicios = useServiciosPublicos();
  const { paquetes } = usePaquetesPublicos();
  const conPaquetes = paquetes.length > 0; // sin paquetes activos (o sin red) la sección no aparece
  const conOpiniones = testimonios.length > 0;
  const secciones = [
    's-inicio', 's-servicios',
    ...(conPaquetes ? ['s-paquetes'] : []),
    's-nosotros',
    ...(conOpiniones ? ['s-opiniones'] : []),
    's-contacto',
  ];
  return (
    <SiteLayout conSecciones secciones={secciones}>
      <Hero />
      <TrustStrip />
      <Services servicios={servicios} />
      {conPaquetes && <Packages paquetes={paquetes} />}
      <About />
      <Philosophy />
      <Testimonials />
      <CtaBand />
      <Contact />
    </SiteLayout>
  );
}
```

- [ ] **Step 4: Pruebas, tipos y compilación**

Run: `cd vscode && npm test && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "src/site\|src/pages/LandingPage" ; npm run build 2>&1 | tail -2`
Expected: `ℹ fail 0` (37 pruebas), luego `0` y `✓ built in`.

- [ ] **Step 5: Commit**

```bash
git add vscode/src/site/landing vscode/src/pages/LandingPage.tsx
git commit -m "feat(sitio): llamada final siempre marrón y contacto con mapa"
```

---

### Task 10: Revisión en el navegador y en los aparatos de Louis (la hace el controlador)

- [ ] **Step 1:** Corre `cd vscode && npm run dev -- --host` y abre `/` en 360, 390, 430, 820, 1180, 1280 y 1440 px, en los dos temas. Revisa cada punto:
  1. **Nada se sale de la pantalla** (`document.documentElement.scrollWidth === innerWidth`) y nada queda cortado.
  2. **Portada:**
     - los textos suben en cascada, el óvalo se eleva y el sello gira;
     - en celular va apilada (texto arriba, óvalo abajo);
     - la tarjeta "Anabel De los Santos" no se sale del borde.
  3. **Franja:** 2×2 en celular, 4 columnas en tableta y una fila con rombos en computadora.
  4. **Servicios:**
     - 2×2 con el nombre sobre la foto en celular, 2×2 con texto en tableta y 4 en fila en computadora;
     - tocar "Depilación láser" abre el catálogo en Corporal, con Depilación láser abierta (celular) o elegida (tableta y PC), y la pantalla baja hasta ella sin quedar bajo la barra;
     - el botón rueda a "Ocultar servicios" y la flecha gira.
  5. **Catálogo:**
     - precios de medicina estética desde la tabla, con "desde" en los rangos;
     - los demás en `RD$ —`, con sus duraciones;
     - "Realizado por" con foto (Paola, con iniciales PJ);
     - las especialidades de medicina muestran la N;
     - la píldora de familias se desliza.
  6. **Paquetes:**
     - los 3 paquetes de prueba, con foto, óvalos de sesiones, precio y precio por sesión;
     - "Peeling Químico" con "Más elegido" y botón sólido.
     - Con `session_packages` sin activos (simúlalo con la red bloqueada a `*.supabase.co` en DevTools), la sección y "Paquetes" desaparecen del menú y el catálogo muestra `RD$ —`.
  7. **Conoce a Anabel:** "Leer su historia" despliega el texto firmado "— Anabel" y el botón cambia a "Cerrar su historia".
  8. **Filosofía:** en PC, tres óvalos en fila; en tableta y celular, uno centrado. Al deslizar se detiene en el centro, y los puntitos se pueden tocar y marcan el actual.
  9. **Opiniones:** igual que la filosofía, con estrellas.
  10. **Llamada final y pie:** marrones también en beige. El contraste de "Agendar cita" (choco sobre camel) es ≥ 4.5:1.
  11. **Contacto:** el mapa tiene esquinas redondeadas, es cuadrado en PC y va a lo ancho en tableta y celular; Waze y Google Maps abren en otra pestaña.
  12. **Menú y barra:**
      - las secciones visibles son Inicio, Servicios, Paquetes, Nosotros, Opiniones y Contacto (sin Equipo);
      - la sección activa sigue al bajar, y al llegar al fondo marca Contacto;
      - tocar una sección en el menú lleva ahí.
  13. **Entrar con `/#s-contacto`** desde otra pestaña baja a Contacto. **`/diseno-anterior`** muestra la página vieja completa, con `<meta name="robots" content="noindex, nofollow">`.
  14. **Reducir movimiento** en DevTools: nada se anima y todo se ve de entrada.
  15. **Teléfono al abrir `/`:** en marrón no hay destello color lino, y la barra del navegador toma el color del tema.
- [ ] **Step 2:** Louis la prueba en su teléfono y su iPad (`http://<IP de la PC>:5173/`) antes de fusionar.
- [ ] **Step 3:** PR "Rediseño fase 2: página principal nueva" contra `main`. La etiqueta `diseno-anterior` ya se subió en la Task 0.

## Al terminar la Fase 2

- **Estado:** `/` es la página nueva, y `/diseno-anterior` guarda la vieja sin indexar.
- **Siguiente:** plan de la **Fase 3**, con los estilos de paquetes Membresía y Ahorro, `settings.estilo_paquetes` y la tarjeta "Página web" del panel.
  - `Packages` recibe el estilo como prop;
  - el cálculo del % de ahorro va en `paquetes.ts` con sus pruebas;
  - para el % hace falta el precio del servicio del paquete: `usePaquetesPublicos` suma `services(name, price)`.
