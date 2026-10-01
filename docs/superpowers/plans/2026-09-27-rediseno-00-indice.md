# Rediseño de la web de la clienta — índice de planes

**Spec:** `docs/superpowers/specs/2026-09-27-rediseno-web-clienta-design.md` (léelo completo antes de
cualquier fase).

**Bocetos de referencia** (aprobados por Louis): `C:/Users/loui-/Desktop/ANABEL/bocetos-rediseno/`.
Abre `indice.html` en el navegador: `land-v4.html` es la página principal, `paq-v1.html` los tres
estilos de paquetes y `citas-v2.html` reservar, confirmación y mis citas. Las fotos ya optimizadas
están en `files/`.

**Material original:** `C:/Users/loui-/Desktop/ANABEL/` (logos oficiales, fotos de la sesión y flyers
de servicios).

**Reglas que valen para todas las fases:**
- Celular primero.
- Anchos de prueba obligatorios: 360, 390, 430, 820, 1180, 1280 y 1440.
- Nada cortado ni saliéndose de la pantalla.
- Al pasar el mouse nunca cambia la letra; solo posición, color u opacidad.
- `prefers-reduced-motion` apaga las animaciones.
- Dentro de `.site` no se usan utilidades de Tailwind: las clases `s-*` sin capa les ganan, y los
  reinicios del sitio van con `:where(.site)` para no pisar las clases de componentes.
- La prueba final de cada fase es en el teléfono y el iPad de Louis, con `vite --host` en su WiFi.

Cada fase es un PR que se puede revisar y fusionar por separado. El plan detallado de cada fase se
escribe al empezarla, con el skill writing-plans, partiendo de la spec, los bocetos y el código que dejó
la fase anterior.

| Fase | Plan | Qué entrega | Terminada cuando |
|---|---|---|---|
| 1 | `2026-09-27-rediseno-fase-1-base.md` | Tema marrón/beige, barra `logo \| secciones \| MENÚ`, menú premium con día/noche, pie, WhatsApp, logo y fotos. Vista previa en `/_diseno` (solo en desarrollo). | La vista previa cumple la lista de verificación del plan en todos los anchos |
| 2 | `2026-09-28-rediseno-fase-2-landing.md` | Página principal nueva (spec §5, sin la sección de equipo), con los paquetes en su estilo por defecto "Menú con foto" para que la página publicada no los pierda, los componentes viejos movidos a `src/legacy/` (no se borran), `/diseno-anterior` y la etiqueta `diseno-anterior` subida antes de fusionar | `/` igual al boceto `land-v4` en todos los anchos y temas; SEO intacto |
| 3 | `2026-09-29-rediseno-fase-3-paquetes.md` | Los otros 2 estilos de paquetes (Membresía y Ahorro), `settings.estilo_paquetes` y la tarjeta "Página web" del panel (spec §6.4) | Cambiar el estilo en el panel cambia la landing; el % de ahorro está probado |
| 4 | `2026-09-29-rediseno-fase-4-equipo.md` | Equipo desde `staff`: columnas nuevas con su `grant select (col) to anon`, campos en la página Equipo, sección en la landing (spec §6.5) y una sola lista de secciones presentes | Marcar a alguien en el panel lo muestra en la web; si no hay nadie, la sección no aparece |
| 5 | `2026-09-29-rediseno-fase-5-reservar.md` | `/reservar` en 3 pasos: lógica en `useBooking` sin cambiar su comportamiento, calendario de semana/mes a 90 días, resumen o barra fija y confirmación (spec §6.1–6.2) | Pasan los 6 casos de reserva de la spec §10 |
| 6 | `2026-09-30-rediseno-fase-6-mis-citas.md` | `/mis-citas` nueva con `get_client_packages` y "Mis paquetes" (spec §6.3) | Búsqueda, cancelación de 12 h y saldo de paquetes funcionan con datos de prueba |
| 7 | `2026-09-30-rediseno-fase-7-calidad.md` | Calidad: los pendientes que dejaron las fases 1–6, revisión completa en los 7 anchos y los dos temas, **el diseño anterior** en sus rutas `/diseno-anterior…` (spec §8) y prueba en los aparatos de Louis | Lista de la spec §3.8 en verde, el diseño viejo abre en sus rutas y Louis aprueba en su teléfono |
| 8 | se escribe al empezar | **Entrega**: datos reales en lugar de los de prueba, usuarios y contraseñas reales, contenido de la dueña y respaldos (lista abajo) | La dueña entra con su usuario, la web muestra su contenido real y no queda ningún dato de prueba |

**Fase Entrega (la última).** Hoy todo en Supabase es de prueba, usuarios incluidos. Lo único posiblemente real son
los precios de los servicios: se confirman con Louis antes de tocar nada. Lista para su plan:
- **Respaldo** completo de la base antes de empezar y al terminar.
- **Borrar los datos de prueba:** clientas, citas y sus servicios, paquetes vendidos (`client_packages`), bloqueos de
  agenda y cualquier otra fila de prueba. Se conservan los servicios con sus precios, el catálogo de paquetes
  (`session_packages`) y la configuración.
- **Usuarios:** crear las cuentas reales (dueña, recepción, especialistas) con sus roles, borrar `admin@anadsll.com` y
  los demás usuarios de prueba, y poner contraseñas nuevas. En Equipo, quién sale en la web, con su cargo y su foto real.
- **Configuración real:** cuentas de banco, monto del depósito, número de WhatsApp del salón y estilo de paquetes.
- **Contenido de la dueña (spec §9):** precios que faltan (hoy RD$ 0), equipo real, testimonios reales o enlace a
  reseñas, fotos de servicios, "Diseño de Cejas" en el menú (`servicesMenu.ts`) y el "Depilación Laser Brasileño"
  repetido (unirlo o desactivarlo).
- **Revisar** que ninguna clienta tenga un número de relleno (809-000-0000): quien lo escriba en Mis citas vería sus
  paquetes.
- **Supabase:** revisar los avisos de seguridad (advisors); las funciones públicas por teléfono son intencionales (spec §7).
- **Cobro del sistema (SellAlleS):**
  1. En SellAlleS, crear la empresa real "Anadsll Beauty Esthetic" con una sucursal, la suscripción a medida de
     RD$ 2,300 al mes (`custom_monthly_price = 2300`, mensual) y la dueña como administradora, con su correo. La
     primera cuota nace ese día.
  2. En Empresas → "Clave de conexión", generar su clave y guardarla en el Vault de Anadsll
     (`select vault.update_secret(<id de sellalles_clave_cobro>, '<clave>')`).
  3. Revocar la clave de prueba y borrar la empresa "Prueba Anadsll (Claude)" si aún existe.
- **Cierre:** etiqueta git de la versión entregada y prueba final con la dueña en su teléfono.

**Cobro mensual del sistema (proyecto aparte):** hecho antes de la Entrega.
- Spec: `docs/superpowers/specs/2026-09-30-cobro-suscripcion-sellalles-design.md`.
- Plan: `docs/superpowers/plans/2026-09-30-cobro-suscripcion-sellalles.md`.
- El salón es una empresa más en SellAlleS (`louisx2/SellAlleS-WEB`), y Louis lo cobra desde su pantalla de Cobros.
- En el panel de Anadsll, la dueña tiene "Mi suscripción": lo que debe, las cuentas, subir el comprobante, sus pagos y
  sus facturas. También ve un banner cuando el pago está por vencer, está atrasado o el comprobante está en revisión.
- Todo viaja a SellAlleS por funciones del servidor (`mi-suscripcion` → `cobro-externo`), con una clave que vive en Vault.
- Hasta la Entrega, `sellalles_clave_cobro` queda vacío: la función responde "sin conexión" y el banner no sale.

**El diseño viejo NO se borra** (pedido de Louis): antes de fusionar la Fase 2, que es la primera
que cambia lo que ve la clienta, se crea y se sube la etiqueta git `diseno-anterior` en `main`. Los
componentes viejos se mueven a `src/legacy/` en lugar de borrarse (spec §8).

**Lo que dejó la Fase 1 para la Fase 2** (de la revisión final):
- `useIrAlHash()` ya lo llama `SiteLayout`; la página principal NO debe llamarlo otra vez.
- `SECCIONES` es fija, pero Equipo (sin nadie marcado para la web) y Opiniones (lista vacía) se ocultan por
  datos: el menú, las secciones de la barra y las pestañas deben filtrar las que no existen en la página.
- Sección activa: en pantallas bajas (celular acostado) la línea debe ser `max(0.33·alto, barra + 57)`, y al
  llegar al fondo de la página se marca la última sección (Contacto es corta y puede no cruzar la línea).
- Destello color lino antes de que cargue el JS en `/`: fondo inicial en `index.html` y `theme-color` por tema.
- Revisar en el teléfono de Louis si el pie del menú se parte en dos filas; si pasa, las áreas táctiles de
  WhatsApp/Instagram se solapan y hay que dar más separación vertical a `.s-menu-info`.

**Lo que dejó la Fase 2 para las Fases 3 y 4** (de la revisión final):
- **`Packages`:** dividirlo en un caparazón (título y "Cómo funciona") más una fila por estilo, todos con
  `PaquetePublico[]`. Para el % de ahorro, `usePaquetesPublicos` debe traer `services(name, price)`.
- **Mover piezas compartidas:**
  - sacar `.s-ovalos` a `ui/SessionPills` (lo usará `/reservar` en la Fase 5);
  - mover `.s-arco`, `.s-h1–3`, `.s-sec`, `.s-rv` y `@keyframes s-subir` de `landing/landing.css` a `ui/`
    o `theme/`, porque otras páginas los necesitarán.
- **Secciones presentes:** una sola lista declarativa que alimente a la vez el menú y la página. Hoy se
  decide en `LandingPage` y en el `return null` de cada sección, y el Equipo (Fase 4) se suma ahí.
- **Accesibilidad:** anunciar el cambio de especialidad en el panel del catálogo (`aria-live`) y llevar
  el foco a la especialidad que abre un destacado.
- **Consola:** `useSiteTema` debe capturar la promesa rechazada de `startViewTransition` cuando la
  pestaña está oculta (`vt.ready.catch(() => {})`).
- **Estilos del sitio:** dentro de `.site`, el scroll a un elemento que está dentro de un despliegue se
  hace con `window.scrollTo` y su `scroll-margin-top`, nunca con `scrollIntoView`, porque este correría
  el recorte interno del despliegue.
- **Enlaces con nombres viejos:** los enlaces del sitio anterior (`/#paquetes`, `/#contacto`, …) se
  traducen en `idDeHash` (`header/navegacion.ts`). Al rediseñar `/reservar` hay que mantener esos alias.

**Lo que dejó la Fase 3** (de la revisión final; no bloquean):
- **Orden de lectura:** en Ahorro, "Más elegido" va antes del título; en Membresía, el nombre del servicio va
  antes del título. Quien navega por encabezados se los salta. Se arregla con el `h3` primero en el DOM y
  `order` en flex.
- **Servicio inactivo:** si un paquete apunta a un servicio inactivo, el panel lo cuenta con sello y la página
  no, porque anon solo ve servicios activos.
- **Detalles:** "Ahorras" del sello está a 9.5 px, como en el boceto. El enlace "Ver los paquetes" muestra el
  estilo guardado, no el recién elegido.
- **Prueba pendiente:** el guardado del estilo desde el panel con sesión de admin la hace Louis antes de
  fusionar.

**Lo que dejó la Fase 4** (de la revisión final; no bloquean):
- **Menú en otras páginas:** `SiteLayout` sin `secciones` lista las 7. Cuando `/reservar` y `/mis-citas` usen
  `SiteLayout` (Fases 5 y 6), su menú ofrecería Equipo o Paquetes aunque la página principal no los tenga. Hay que
  compartir la presencia (un hook o un store con `seccionesPresentes`) o pasar la lista.
- **Nombres con tilde:** Equipo ya usa `capitalizarNombre` (`src/lib/nombres.ts`), pero Citas (`Appointments.tsx`) y
  Clientes (`Clients.tsx`) siguen con el `capitalizeName` viejo, que escribe "RodríGuez". Los nombres ya guardados con
  la mayúscula rota no se corrigen solos.
- **Fotos del equipo:** `reducirFoto` (`src/lib/fotos.ts`) las achica a 800 px en JPEG antes de subirlas. Falta
  comprobar en el iPhone de Louis que una foto vertical no salga girada (EXIF). `imageSmoothingQuality = 'high'` daría
  un achicado más limpio.
- **Carga tardía:** Equipo y Paquetes aparecen cuando llega su consulta. En un teléfono lento, un enlace
  `/#s-contacto` puede quedar corrido (se revisa en la Fase 7).
- **Orden:** el equipo se ordena por el nombre completo, así que "Dra. Nadieska Soto" va en la D.
- **Prueba pendiente:** Louis prueba el panel antes de fusionar. En Equipo:
  - marca a alguien, escribe su cargo y guarda;
  - cambia solo el teléfono y revisa que el cargo no se borre;
  - revisa el tema claro;
  - sube una foto vertical del teléfono.

**Lo que dejó la Fase 5** (de la revisión final; no bloquean):
- **Prueba pendiente en el teléfono y el iPad de Louis.** El panel del navegador no dejó comprobar los desplazamientos.
  Hay que revisar:
  - que la página baje a cada paso ("Continuar", el error de datos y la hora ocupada);
  - que se pueda deslizar la página pasando por encima de la lista de servicios;
  - la barra de abajo con el teclado abierto;
  - el botón del resumen en el iPad acostado (1180 px).
- **Contenido para Louis:**
  - "Diseño de Cejas" (RD$ 600) y el "Depilación Laser Brasileño" repetido no están en el menú de la página, así que salen
    solo en "Todos" y en el buscador. Hay que sumarlos al menú (`servicesMenu.ts`), o unirlos o desactivarlos en el panel.
  - El nombre del servicio de un paquete se guarda como "Paquete: Paquete …". La página ya lo muestra limpio.
- **Cuenta de ejemplo:** si la configuración no carga, la confirmación muestra la cuenta de ejemplo (123456789). Viene de
  antes. Conviene ocultarla usando `cargado` del store.
- **Pendientes chicos:**
  - "Ver semana" desde un mes que empieza viernes o sábado muestra la semana del mes anterior;
  - el día 90, si cae domingo 1 de mes, deja una semana toda apagada;
  - el WhatsApp sigue elevado en la confirmación;
  - `hoy` no cambia si la pestaña queda abierta pasada la medianoche.
- **Para la Fase 6:**
  - `useSeccionesPresentes` (`header/usePresencia.ts`) da el menú fuera de la página principal;
  - `numeroWhatsApp` (`reservar/datos.ts`) normaliza el número para `wa.me`;
  - `/reservar?paquete=<id>` ya abre con el paquete elegido;
  - `--s-warn` y `--s-bad` ya existen en `tokens.css`, y falta `--s-ok`.

**Lo que dejó la Fase 6** (de la revisión final; no bloquean):
- **Prueba pendiente en el teléfono y el iPad de Louis.** El panel del navegador estaba oculto, así que no se vieron capturas ni
  desplazamientos. Hay que revisar:
  - que la página baje a los resultados después de "Ver mis citas";
  - cómo se ven las tarjetas en los dos temas;
  - "Recordar mi número" al cerrar y abrir el navegador.
- **Teléfonos:**
  - Las citas se buscan con todos los dígitos iguales, pero los paquetes usan `telefono_clave` (los últimos 10). La recepción
    guarda el teléfono tal como se escribe (por ejemplo "+1 809…"), y esas citas no aparecen en Mis citas. Hay que pasar
    `get_client_appointments`, `get_client_appointment_services` y `cancel_client_appointment` a `telefono_clave` juntas, o
    normalizar el campo de la recepción.
  - `formatoTelefono` (`reservar/datos.ts`) se queda con los primeros 10 dígitos: pegar "+1 829…" da un número equivocado.
    Hay que quitar el 1 cuando llegan 11 dígitos (afecta también a `/reservar`).
  - **Antes de entregar:** revisar que en los datos reales no haya clientas con un número de relleno (809-000-0000). Quien lo
    escriba vería los paquetes de todas ellas.
- **Paquetes terminados:** la ventana de 90 días busca la última sesión por `service_id`. Las citas guardadas sin servicio no
  cuentan, así que un paquete viejo terminado hace poco puede no salir. Una columna `completed_at` que llene el panel lo
  arreglaría.
- **Detalles:** el historial no muestra el año; una cita "En curso" pasa al historial al llegar su hora; el resumen cuenta las
  canceladas como "visitas"; el botón "Ver mis citas" sube un poco al pasar el mouse mientras busca.

**Lo que dejó la Fase 7** (de la revisión final y de la auditoría; no bloquean):
- **Decisión sobre las zonas táctiles:** a 360 px los días del calendario (semana y mes) miden unos 41 px de ancho. La
  tarjeta no da para 44 sin tocar su borde. Desde 390 px pasan de 44, y la tira de la semana tiene 70 px de alto.
- **Calendario:**
  - "Ver mes" puede abrir el mes actual sin días libres si hoy es domingo y último día del mes (raro);
  - "Ver semana" a veces nombra el mes vecino, cuando los únicos días libres del mes caen en esa semana;
  - un día elegido antes de la medianoche sigue elegido después (al enviar, el aviso de "ya pasó" lo corrige).
- **Mis citas:**
  - el resumen cuenta las canceladas como "visitas";
  - "desde …" de los paquetes no muestra el año;
  - en celular la fecha del historial con año baja a dos líneas.
- **Panel:** el formulario de recepción (ReceptionistDashboard) guarda el teléfono tal como se escribe. Citas y Mis citas ya
  lo encuentran igual, porque se busca por los últimos 10 dígitos.
- **Para la Entrega:** si la fila de `settings` no tiene cuentas de banco, el store inyecta la cuenta de ejemplo 123456789.
  Hay que cargar la cuenta real antes de publicar.
- **Contraste que se revisó a ojo en el teléfono de Louis:** texto claro sobre las fotos de las tarjetas de servicio y
  sobre la banda final de listones.

**Notas de la base de datos** (ver la memoria `roles-y-rls`):
- anon solo lee columnas autorizadas de `staff` y `schedule_blocks`. Toda consulta pública debe nombrar
  sus columnas, y una columna nueva necesita su propio `grant select (col) ... to anon`.
- `settings` es de lectura pública.
- Las migraciones se aplican con el MCP de Supabase y se guardan como
  `vscode/supabase/migration_*.sql`.
