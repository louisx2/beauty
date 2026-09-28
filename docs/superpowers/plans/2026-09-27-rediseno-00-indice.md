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
| 2 | se escribe al empezar | Página principal nueva (spec §5, sin la sección de paquetes ni la de equipo), con los componentes viejos movidos a `src/legacy/` (no se borran) y la etiqueta `diseno-anterior` subida antes de fusionar | `/` igual al boceto `land-v4` en todos los anchos y temas; SEO intacto |
| 3 | se escribe al empezar | Paquetes en sus 3 estilos, `settings.estilo_paquetes` y la tarjeta "Página web" del panel (spec §6.4) | Cambiar el estilo en el panel cambia la landing; el % de ahorro está probado |
| 4 | se escribe al empezar | Equipo desde `staff`: columnas nuevas con su `grant select (col) to anon`, campos en la página Equipo y sección en la landing (spec §6.5) | Marcar a alguien en el panel lo muestra en la web; si no hay nadie, la sección no aparece |
| 5 | se escribe al empezar | `/reservar` en 3 pasos: lógica en `useBooking` sin cambiar su comportamiento, calendario de semana/mes a 90 días, resumen o barra fija y confirmación (spec §6.1–6.2) | Pasan los 6 casos de reserva de la spec §10 |
| 6 | se escribe al empezar | `/mis-citas` nueva con `get_client_packages` y "Mis paquetes" (spec §6.3) | Búsqueda, cancelación de 12 h y saldo de paquetes funcionan con datos de prueba |
| 7 | se escribe al empezar | Calidad: revisión completa, **conservar el diseño anterior** en `src/legacy/` con rutas `/diseno-anterior…` (spec §8) y prueba en los aparatos de Louis | Lista de la spec §3.8 en verde, el diseño viejo abre en sus rutas y Louis aprueba en su teléfono |

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

**Notas de la base de datos** (ver la memoria `roles-y-rls`):
- anon solo lee columnas autorizadas de `staff` y `schedule_blocks`. Toda consulta pública debe nombrar
  sus columnas, y una columna nueva necesita su propio `grant select (col) ... to anon`.
- `settings` es de lectura pública.
- Las migraciones se aplican con el MCP de Supabase y se guardan como
  `vscode/supabase/migration_*.sql`.
