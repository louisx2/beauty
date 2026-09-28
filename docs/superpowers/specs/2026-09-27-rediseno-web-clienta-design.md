# Rediseño de la web que ve la clienta — documento de diseño

**Fecha:** 2026-09-27 · **Proyecto:** `vscode/` (React 19 + Vite + Supabase) · **Estado:** para revisión de Louis

## 1. Por qué

La dueña (Anabel De los Santos) siente que la web actual "no le llega" y se ve poco profesional. Pidió
un diseño más cuidado, con animaciones, manteniendo el **marrón** que es la base de su marca. Sus
referencias fueron la landing "Programa Pele Saudável" (andrey.lopess: franjas chocolate y blanco,
textura de listones, serif con cursiva, retrato en arco, sello con monograma) y el reel "Aura Beauty"
(polanaeem.tech: base crema aireada, foto protagonista, tarjetas de servicio).

La idea que guía todo: **que la web se sienta como entrar a su salón.** Su logo es una "N" dentro de un
óvalo, sus letreros de Misión/Visión/Valores son óvalos y su lobby tiene pared de listones de madera;
esos tres elementos son los motivos del diseño.

**Lo más importante es el teléfono** (Louis, 2026-09-27): la mayoría de las clientas llegan desde
Instagram en el celular. Se diseña primero para celular y después se adapta.

### Cómo se validó
Bocetos navegables revisados por Louis en PC, en su teléfono y en su iPad, en varias rondas:
direcciones A/B/C → tema marrón/beige → landing completa v2 → v3 (observaciones del teléfono) → v4
(menú premium). Paquetes: 3 estilos. Reservar y Mis citas: v2.

## 2. Alcance

**Entra:** todo lo que ve la clienta: la página principal `/`, `/reservar` (incluida la confirmación)
y `/mis-citas`.

**Cambios en el panel (autorizados solo en lo necesario para que encaje):**
- Configuración → tarjeta nueva **"Página web"** para elegir el estilo de los paquetes.
- Equipo → campos para controlar quién aparece en la web y con qué cargo (sección 6.5).
- Base: columna nueva en `settings`, columnas nuevas en `staff` y una función para "Mis paquetes".

**No entra:** rediseñar el panel/CRM; facturación NCF e inventario (apagados a propósito); cambiar la
lógica de cálculo de horarios de la reserva (se conserva tal cual, solo cambia la forma).

## 3. Sistema visual

### 3.1 Paleta (oficial de la marca)
| Token | Valor | Uso |
|---|---|---|
| camel | `#B2967D` | acentos en tema marrón, botones claros |
| cocoa | `#7D5A44` | acentos y botones en tema beige |
| linen | `#F5F1EA` | fondos claros, texto sobre oscuro |
| khaki | `#D7C9B8` | fondos de fotos en tema beige |
| choco | `#2A1E17` | fondo del tema marrón (de la referencia `#281E17`) |
| crema | `#FBF8F3` | fondo del tema beige |

**Textura de listones:** gradiente CSS repetido (sin imágenes). Oscura para el tema marrón y bandas de
llamada final; lino para la portada del tema beige.

### 3.2 Dos temas, misma estructura
- **Marrón (oscuro) — por defecto.** Beige (claro) opcional.
- La elección se recuerda en el teléfono de la clienta (`localStorage`, clave `anadsll-site-tema`).
- Solo cambian valores de variables CSS (`--bg`, `--bg-alt`, `--text`, `--soft`, `--faint`, `--accent`,
  `--surface`, `--line`, `--btn-bg`, `--btn-fg`, …); ningún componente tiene colores fijos.
- En el tema beige, la **llamada final** y el **pie** se quedan en marrón para anclar la marca.
- Transición suave al cambiar (View Transitions cuando el navegador lo soporta; si no, cambio directo).
- **Debe ir separado del tema del panel:** el panel usa `html[data-theme]` y `themeStore`. La web
  pública usa su propio contenedor (`.site[data-site-tema]`) y su propia clave; uno no afecta al otro.

### 3.3 Tipografía
- **Títulos:** Playfair Display, con la palabra clave en *cursiva* y color de acento
  ("Recupera la *confianza* en tu piel").
- **Texto:** Outfit (la que ya usa el proyecto).
- Etiquetas pequeñas en mayúsculas con letras espaciadas (0.2–0.24em).
- Cormorant se mantiene cargada solo porque el panel la usa.

### 3.4 Motivos
- **Óvalo/arco del logo:** marco de fotos (retrato de portada en óvalo completo, fotos en arco),
  número de sesiones, fechas en "Mis citas", pestañas de días.
- **Sello giratorio** con la frase "Belleza y bienestar con responsabilidad" y la N en el centro.
- **Listones** en portada, filosofía, menú y llamada final.

### 3.5 Logo
Solo **"Anadsll · Beauty Esthetic" (versión oficial "sin icono")**, sin la N, en cocoa (tema beige) y
linen (tema marrón). Se agregan `public/brand/logo-sin-icono.png` y `logo-sin-icono-claro.png` desde
`Desktop/ANABEL/LOGOS PNG/anabel logo oficial color oficialsin icono .png`. La N queda para el sello,
la marca de agua del menú y el favicon.

### 3.6 Fotos
De la sesión real (`Desktop/ANABEL/Dueña de la estetica`), optimizadas a ~1400 px, JPG calidad ~82:

| Uso | Archivo original |
|---|---|
| Portada (óvalo) | as-07304 (manos en la cintura) |
| Conoce a Anabel (arco) | as-07340 (sofá del lobby, vertical) |
| Equipo: Anabel | as-07297 (brazos cruzados) |
| Limpieza facial | as-07361 (uniforme blanco con aparato) |
| Paquete de peeling | as-07319 (guantes) |
| Menú (lateral en PC) | Lobby 2 (N en la pared de listones) |

- **Servicios:** recortes de los flyers de `Desktop/ANABEL/servicios` sin el texto (láser, labios,
  pestañas, cejas, cera, blanqueamiento, tatuaje, maquillaje). La aparatología usa la foto del equipo.
- **Categorías sin foto** (medicina estética): se muestra la N sobre la textura.
- Las fotos con blazer marrón (`duena-retrato/busto/blanco/laser`) **no se usan** hasta confirmar su origen.

### 3.7 Movimiento
- **Portada:**
  - los textos suben en cascada;
  - el óvalo se eleva;
  - la foto hace un leve alejamiento;
  - el sello gira despacio.
- **Al bajar**, las secciones aparecen con un fundido y un leve ascenso. **Nunca dentro de un
  carrusel**: ahí el fundido hacía que el deslizamiento pareciera trabado.
- **Botones:** la flecha se desplaza al pasar el mouse. Las tarjetas se elevan y su foto crece, **solo
  en dispositivos con mouse** (`@media (hover:hover)`).
- **Despliegues** (catálogo, especialidades, historia), con curva `cubic-bezier(.65,0,.35,1)`:
  - la altura se anima y el contenido entra con fundido;
  - los servicios aparecen en cascada;
  - el **+** se convierte en **–**.
- **Al pasar el mouse nunca cambia la letra** (sin saltar a cursiva ni negrita, porque no se puede
  animar). Solo cambian posición, color u opacidad.
- **Reducir movimiento:** con `prefers-reduced-motion`, todo esto se apaga.

### 3.8 Pantallas y reglas de calidad
- **Cortes:** celular ≤ 760 px · tableta 761–1100 px · computadora > 1100 px.
- **Anchos de prueba obligatorios:** 360, 390, 430, 820 (iPad), 1180, 1280 y 1440.
- **Qué debe cumplirse:**
  - nada se sale de la pantalla ni se corta;
  - los textos largos se recortan con "…" o bajan de línea, sin romper el diseño;
  - los elementos fijos nunca pasan del alto de la ventana y su botón queda visible;
  - WhatsApp no tapa botones de acción;
  - las zonas táctiles miden ≥ 44 px;
  - el contraste de texto es AA.
- **Nunca se encoge una vista de computadora** para que quepa (eso rompía el mapa en el iPad).

## 4. Barra superior y menú (todas las páginas de la clienta)

### 4.1 Barra superior
- **Celular y tableta:** `logo | botón MENÚ`.
- **Computadora:** una sola fila `logo | secciones centradas | MENÚ`.
  - Las secciones son texto, con una línea fina bajo la actual.
  - Van centradas de verdad, en una cuadrícula de tres columnas.
  - El logo se alinea con el borde del contenido.
- **Alto:** 74 px (PC), 70 px (tableta), 64 px (celular); logo de 52, 48 y 46 px.
- **Al bajar**, la barra se vuelve sólida con desenfoque y sombra suave.
- **En celular y tableta**, además, aparece debajo una **fila de pestañas** (Inicio, Servicios,
  Paquetes, Nosotros, Equipo, Opiniones, Contacto). La activa va rellena y se centra sola.
- **Sección activa:** es la que cruza una línea imaginaria a un tercio de la pantalla. Filosofía cuenta
  como "Nosotros".
- **Día/noche NO va en la barra.**

### 4.2 Botón MENÚ
- La palabra "MENÚ" en 11 px con letras espaciadas, y dos líneas finas de 20 y 12 px.
- **Al pasar el mouse**, la línea corta se alarga.
- **Al abrir:** las líneas se cruzan en una X y la palabra rueda a "CERRAR". Las dos palabras ocupan la
  misma celda, para que ninguna se corte.
- **Al bajar la página**, el botón toma un borde muy fino.

### 4.3 Menú abierto
- **Apertura:** se abre como un **círculo que crece desde el botón** (`clip-path`). Cubre la pantalla
  con la textura, una luz cálida en la esquina y la N de marca de agua. El botón Cerrar cae
  exactamente donde estaba MENÚ en cada tamaño.
- **Secciones:**
  - numeradas 01–07, grandes, en Playfair;
  - suben una tras otra y la línea divisoria se dibuja;
  - la actual va en cursiva color acento, con un punto que late y "ESTÁS AQUÍ";
  - al pasar el mouse, el nombre se desliza 12 px, toma el acento y aparece una flecha. Se mueve el
    contenedor que recorta, no el texto, para que no se corte.
- **Parte de abajo:**
  - selector **"Apariencia: Marrón | Beige"**, con una perilla que se desliza;
  - botones "Agendar cita" y "Mis citas";
  - horario, WhatsApp e Instagram.
- **En PC y tableta ancha** (≥ 900 px): en dos columnas, con la foto del lobby en arco y la frase.
- **Cerrar:** tecla Escape, botón Cerrar o tocar una sección, que cierra y lleva a esa sección.
- **Accesibilidad:**
  - `aria-expanded` en el botón y `role="dialog"` en el menú;
  - el foco queda dentro del menú mientras está abierto y vuelve al botón al cerrar;
  - el selector de tema es un grupo de radio (`role="radiogroup"`).

### 4.4 WhatsApp flotante
Círculo en el color del botón del tema (50 px en celular). En `/reservar` sube para no tapar la barra
inferior.

## 5. Página principal — secciones en orden

1. **Portada** (textura de listones):
   - etiqueta "Centro de estética · San José de Ocoa";
   - título "Recupera la *confianza* en tu piel";
   - texto corto y botones "Agendar cita" y "Ver servicios";
   - retrato en **óvalo completo**, con una línea de óvalo desplazada detrás, el sello giratorio y una
     tarjeta flotante "Anabel De los Santos · Fundadora · Cosmetóloga".
   - En celular todo va apilado: texto arriba, óvalo abajo.
2. **Franja de confianza:** "Especialistas certificadas · Equipos de alta tecnología · Atención
   personalizada · Reserva en línea 24/7". En celular va en 2×2.
3. **Servicios** — "Tratamientos *especializados* para ti":
   - **4 destacados:** Limpieza facial, Depilación láser, Cejas y pestañas y Maquillaje.
     - **PC:** 4 tarjetas con foto, número, descripción y "Ver servicios →".
     - **Tableta:** en 2×2.
     - **Celular: cuadrícula 2×2** de fotos con el nombre encima, sin descripción y **sin carrusel**.
   - **Catálogo cerrado por defecto**, tras un botón **"Ver todos los servicios · 15 especialidades"**.
     El texto rueda a "Ocultar servicios" y la flecha gira.
   - **Al tocar un destacado**, se abre el catálogo en esa especialidad y la pantalla baja hasta ella.
   - **Catálogo en PC:** a la izquierda, las 15 especialidades agrupadas en 4 familias; a la derecha, un
     panel con foto en arco, "Realizado por" y la lista servicio · duración · precio.
   - **Catálogo en celular:** pestañas de las **4 familias**, con una píldora que se desliza. Debajo, un
     acordeón solo con las especialidades de esa familia, que entran en cascada. Cada una se despliega
     con sus servicios y un botón "Reservar". Si queda escondida, la pantalla se acomoda sola.
   - **Familias:**
     - Facial: Limpieza facial, Hidra Lips.
     - Corporal: Depilación láser, Depilación con cera, Blanqueamiento corporal, Remoción de tatuaje,
       Aparatologías.
     - Cejas, pestañas y maquillaje: Cejas y pestañas, Maquillaje.
     - Medicina estética: Toxina botulínica, Rellenos con ácido hialurónico, Bioestimuladores de
       colágeno, Mesoterapias, Escleroterapia, Eliminación de verrugas.
   - **Precio de cada servicio, en este orden:**
     1. el de la tabla `services` si es mayor que 0 (buscado por nombre, como hoy);
     2. si no, el que trae el texto del menú (los de medicina estética);
     3. si no hay ninguno, "RD$ —".
   - La duración viene de `services.duration`.
   - "Realizado por" sigue saliendo de la especialista asignada a cada categoría en `servicesMenu.ts`.
4. **Paquetes** — "Ahorra con nuestros *paquetes*":
   - en el **estilo elegido en el panel** (sección 6.4); por defecto "Menú con foto";
   - debajo, la franja "Cómo funciona": 01 Elige tu paquete · 02 Reserva en línea · 03 Sigue tu avance
     en Mis citas.
5. **Conoce a Anabel:**
   - foto en arco con la N en un círculo;
   - dos párrafos cortos en tercera persona y la cita "Belleza y bienestar con responsabilidad";
   - **"Leer su historia"** despliega la historia completa en su voz, firmada "— Anabel".
6. **Nuestra filosofía** — "Lo que nos *mueve*":
   - **Misión, Visión y Valores en tres óvalos**, como los letreros de su pared (textos actuales del sitio);
   - en PC, los tres en fila;
   - en tableta y celular, **uno a la vez, centrado**: al deslizar, cada óvalo se detiene en el centro,
     los de los lados se ven tenues y hay puntitos que se pueden tocar.
7. **Nuestro equipo** — "Manos *expertas* que te cuidan":
   - retratos en arco con nombre, cargo y especialidades;
   - PC 4 columnas; tableta y celular 2 columnas, **sin carrusel**;
   - los datos vienen de `staff` (sección 6.5).
8. **Opiniones:**
   - tarjetas con comilla grande, texto en serif, nombre, servicio y estrellas;
   - en PC, 3 en fila; en tableta y celular, una a la vez centrada, con puntitos.
9. **Llamada final** (siempre marrón, con la N gigante de fondo):
   - "¿Lista para tu *mejor versión*?";
   - botones "Agendar cita" y "Escribir por WhatsApp".
10. **Contacto** — "Te esperamos en *San José de Ocoa*":
    - dirección, horario, teléfono e Instagram;
    - botones Waze y Google Maps;
    - mapa embebido con esquinas redondeadas compatibles con Safari/iPad, sin filtros de color. En
      tableta y celular el mapa va a lo ancho.
11. **Pie:** logo claro y "© 2026 Anadsll Beauty Esthetic · San José de Ocoa".

Los datos de contacto salen de `src/config/site.ts`, como hoy. Se conservan las metaetiquetas, el
JSON-LD de negocio local y el `index.html` del SEO actual.

## 6. Reservar, confirmación y Mis citas

### 6.1 `/reservar`: tres pasos en una sola página
Es la recomendación, y es la que se construye salvo que Louis diga lo contrario al revisar este
documento. La lógica de hoy de `Booking.tsx` se conserva: disponibilidad, bloqueos, choque de horas,
varios servicios con especialista por servicio, paquetes y `save_appointment`. Solo cambia la interfaz.

- **Cabecera:** textura, etiqueta "Reserva en línea", título "Agenda tu *cita*" e indicador de pasos
  (1 Servicios · 2 Día y hora · 3 Tus datos). Los pasos se marcan como hechos, y los siguientes se
  desbloquean al completar el anterior.
- **Paso 1 — ¿Qué te vas a hacer?:**
  - selector **"Servicios" | "Tengo un paquete"**.
  - **Servicios:**
    - buscador y pestañas de familia;
    - lista con casilla, nombre, duración y precio (en celular, duración y precio van apilados a la
      derecha);
    - cada servicio elegido aparece como tarjeta, con las **caras de las especialistas** que lo hacen
      más "Cualquiera", y se puede quitar.
  - **Paquete:** tarjetas de paquetes con sus sesiones en óvalos, y a quién se quiere.
- **Paso 2 — ¿Cuándo?:**
  - encabezado con el mes y flechas ‹ ›;
  - **tira de 7 días** (una semana) que avanza de semana en semana;
  - **"Ver mes"** abre el mes completo; al elegir un día, vuelve a su semana;
  - se reserva hasta **90 días** adelante (constante configurable);
  - los domingos y los días pasados salen apagados;
  - las horas se agrupan en **Mañana** y **Tarde**; las ocupadas salen tachadas.
- **Paso 3 — Tus datos:**
  - nombre;
  - teléfono de WhatsApp, con la nota "con este número verás tus citas en Mis citas";
  - notas opcionales.
- **Resumen "Tu visita":**
  - **en PC**, fijo a la derecha: línea de tiempo con la hora de cada servicio y quién lo hace, día,
    duración total, aviso del depósito y botón "Solicitar cita". **Nunca pasa del alto de la ventana**:
    el contenido baja por dentro y el botón queda siempre visible.
  - **en tableta y celular**, barra fija abajo: "2 servicios · 10:00 AM / jueves 2 de octubre" con el
    botón "Continuar" o "Solicitar cita". El texto se recorta con "…".
- **Enlaces desde la landing:**
  - el "Reservar" de una especialidad del catálogo abre `/reservar?categoria=<id de la categoría>`, con
    el paso 1 filtrado a esa especialidad;
  - el de un paquete abre `/reservar?paquete=<id de session_packages>`, con "Tengo un paquete" y ese
    paquete ya elegidos.

### 6.2 Confirmación
- un óvalo con un check que se dibuja;
- "¡Tu cita está *pre-reservada*!";
- **boleta** con fecha, horas, servicios, especialistas y el estado "Pendiente de depósito";
- **depósito** con el monto y las cuentas desde `settings`, y botón "Copiar" en cada número de cuenta;
- tres pasos: depositar, enviar el comprobante por WhatsApp y esperar la confirmación;
- botones "Enviar comprobante por WhatsApp" (con el mensaje ya armado, como hoy) y "Ver mis citas", y
  el enlace "Hacer otra reserva".

### 6.3 `/mis-citas`
- **Búsqueda** por teléfono, con **"Recordar mi número en este teléfono"** (opcional, `localStorage`).
- **Saludo** con el nombre y el resumen de cuántas citas próximas, paquetes activos y visitas en el
  historial tiene.
- **Próximas citas:**
  - la fecha va en un óvalo (día, número y mes);
  - servicios con su hora y especialista, y el estado (Pendiente / Confirmada);
  - botones "Cómo llegar" y "Cancelar" (regla de 12 h con la RPC actual `cancel_client_appointment`);
  - si faltan menos de 12 h, un aviso para escribir por WhatsApp.
- **Mis paquetes (nuevo):**
  - nombre, servicio y fecha de compra;
  - sesiones en ovalitos, llenos los usados, con "3 de 5 sesiones usadas · te quedan 2";
  - botón "Reservar mi próxima sesión" → `/reservar?paquete=<id de session_packages>`.
- **Historial:** filas compactas con fecha, servicio y estado.

### 6.4 Estilos de paquetes (elegibles en el panel)
- **A · Membresía:** tarjeta chocolate con el logo, como tarjeta de socia. Se inclina y brilla al pasar
  el mouse. Tiene la opción de "Regalar un paquete", que queda apagada hasta que la dueña la quiera.
- **B · Menú con foto (por defecto):** una fila por paquete con foto del servicio en arco, sesiones en
  óvalos, precio y precio por sesión.
- **C · Ahorro:** tarjeta con foto, sello "Ahorras X%", precio por sesión grande y el precio suelto
  tachado.
  - El % sale de `(precio del servicio × sesiones − precio del paquete) / (precio del servicio × sesiones)`.
  - **Si el servicio no tiene precio, ese paquete no muestra sello** (se ve como B).

**En el panel:** Configuración → "Página web" → "Estilo de los paquetes", con tres miniaturas y un aviso
de cuántos paquetes no mostrarán el sello de ahorro. Se guarda en `settings.estilo_paquetes`.

### 6.5 Equipo en la web
- **Columnas nuevas en `staff`:**
  - `mostrar_en_web boolean default false`;
  - `cargo_web text` (ej. "Médico estético y cosmiatra");
  - `especialidades_web text` (ej. "Facial · Medicina estética").
- **En el panel, página Equipo:** "Mostrar en la página web", "Cargo para la web" y "Especialidades
  para la web". La foto usa el `avatar_url` que ya existe.
- **La sección muestra** a quienes tengan `mostrar_en_web = true` y `active = true`. Si nadie la tiene,
  la sección no aparece.

## 7. Cambios en la base

| Cambio | Detalle |
|---|---|
| `settings.estilo_paquetes` | `text not null default 'menu'` con `check (estilo_paquetes in ('membresia','menu','ahorro'))`. `settings` ya es de lectura pública. |
| `staff` | `mostrar_en_web`, `cargo_web`, `especialidades_web` (sección 6.5). |
| `get_client_packages(p_phone text)` | `SECURITY DEFINER`, `search_path` fijo, ejecutable por anon. Busca a la clienta por teléfono con la misma clave de 10 dígitos de `telefono_clave`. Devuelve id, nombre del paquete, servicio, sesiones totales y usadas, fecha de compra y estado. Devuelve los paquetes `active` y los `completed` de los últimos 90 días (estos se muestran como terminados). |

Cada cambio se guarda como `vscode/supabase/migration_*.sql`, igual que los anteriores.

## 8. Arquitectura

- **Carpeta nueva `src/site/`** para la web de la clienta, separada del panel:
  - `SiteLayout.tsx`: contenedor `.site` con el tema, barra, menú, WhatsApp y pie. Lo usan
    `LandingPage`, `BookingPage` y `ClientPortal`.
  - `theme/`: `tokens.css` (paleta y variables de los dos temas, textura y tipografía) y `useSiteTema.ts`
    (lee, guarda y aplica el tema; marrón por defecto).
  - `header/`: `SiteHeader.tsx`, `MenuButton.tsx`, `SiteMenu.tsx` y `useScrollSpy.ts`.
  - `landing/`: una pieza por sección (Hero, TrustStrip, Services, Catalog, Packages con sus 3 estilos,
    About, Philosophy, Team, Testimonials, CtaBand, Contact, Footer).
  - `ui/`: piezas compartidas: `Reveal` (aparecer al bajar), `CenteredSlider` (uno a la vez con
    puntitos), `Collapse` (despliegue con altura animada), `Arch`, `SessionPills`, `Seal`.
  - `booking/` y `portal/`: la interfaz nueva de `/reservar` y `/mis-citas`. `Booking.tsx` se divide:
    la lógica de disponibilidad se mueve a un hook (`useBooking`) sin cambiar su comportamiento, y la
    interfaz se arma con piezas nuevas.
- **Datos:**
  - `src/data/servicesMenu.ts` suma `familia`, `imagen` y `descripcion` por categoría;
  - `settingsStore` suma `estilo_paquetes`;
  - la regla de precios y la de % de ahorro van en funciones puras con pruebas.
- **CSS:**
  - un `.css` por componente (patrón actual) con variables del tema;
  - media queries en los cortes de la sección 3.8;
  - la página se desplaza con la ventana normal: la barra es `position: fixed` y las secciones usan
    `scroll-margin-top`.
- **Lo que se retira** al terminar: los componentes viejos de la landing (`Hero`, `Services`,
  `Packages`, `About`, `Mission`, `Testimonials`, `Footer` y `Navbar` públicos) y sus `.css`. Antes se
  confirma que el panel no los usa.
- **Accesibilidad:** navegación por teclado completa, foco visible, `aria-*` en despliegues y menú,
  textos alternativos en fotos y contraste AA.
- **Rendimiento:** imágenes con `loading="lazy"` salvo la portada, tamaños fijos para no saltar y
  `preconnect` de fuentes.

## 9. Contenido pendiente de la dueña

El diseño funciona sin esto, con los comportamientos indicados:

| Falta | Qué pasa mientras |
|---|---|
| Precios de servicios no médicos (hoy RD$ 0 en el panel) | Se muestra "RD$ —"; el estilo Ahorro no pone sello |
| Equipo real (nombres, cargos, fotos) | La sección solo muestra a quien se marque en el panel; si nadie, no aparece |
| Testimonios reales o enlace a reseñas de Google | Se muestran los actuales como ejemplo, en `src/config/testimonios.ts`; si la lista queda vacía, la sección no aparece |
| Fotos de servicios sin texto | Se usan los recortes de los flyers |
| Origen de las fotos con blazer | No se usan |

## 10. Pruebas

- **Funciones puras con `npm test`** (el runner `node --test` que ya agregó el PR #6):
  - generación de semanas y del mes;
  - límites de 90 días, domingos y días pasados;
  - agrupación del catálogo por familia;
  - formato de precios ("RD$ —");
  - % de ahorro, y caso sin precio;
  - resumen de la visita con horas encadenadas.
- **`npm run build`** pasa, y `tsc` sin errores nuevos respecto a la línea base.
- **Revisión visual** en 360, 390, 430, 820, 1180, 1280 y 1440, en los dos temas, con la lista de la
  sección 3.8.
- **Prueba real en el teléfono y el iPad de Louis:** `vite --host` en su WiFi antes de abrir el PR.
- **Reserva completa en local:** servicio suelto, varios servicios con dos especialistas, paquete,
  día bloqueado, hora que se ocupa en el último momento (23P01) y confirmación con depósito.

## 11. Orden de construcción (para el plan)

1. **Base:** tema (tokens, fuentes, `useSiteTema`), `SiteLayout`, barra, botón y menú, WhatsApp, pie,
   logo y fotos optimizadas.
2. **Página principal:** secciones 1–3 y 5–11.
3. **Paquetes:** los 3 estilos, la migración de `settings` y la tarjeta "Página web" del panel.
4. **Equipo:** la migración de `staff`, los campos en la página Equipo y la sección de la landing.
5. **`/reservar`:** separar la lógica en `useBooking`, la interfaz de 3 pasos, el calendario, el
   resumen y la barra, y la confirmación.
6. **`/mis-citas`:** la interfaz nueva, `get_client_packages` y "Mis paquetes".
7. **Calidad:** revisión en todos los anchos, prueba en el teléfono y el iPad de Louis, y PR.
