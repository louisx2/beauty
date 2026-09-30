# Cobro mensual del sistema (SaaS) con SellAlleS — documento de diseño

## 1. Por qué

Louis cobra a la dueña del salón el uso de Anadsll, como un servicio mensual (SaaS):
- ella paga **RD$ 2,300 al mes** por transferencia y sube el comprobante;
- Louis ya tiene todo el cobro armado en **SellAlleS**, su otro sistema (repo `louisx2/SellAlleS-WEB`): la cuenta de cada empresa, los comprobantes que confirma o rechaza, las facturas, los correos y el resumen de cada noche;
- en vez de construir otro cobro, **el salón se registra como una empresa más en SellAlleS** y Anadsll se conecta a SellAlleS por un puente.

Se hace **antes de la fase Entrega** del rediseño.

### Cómo se validó

Decisiones de Louis del 2026-09-30, durante la conversación:
- **Atraso:** solo avisar, sin bloquear nada. El banner rojo no se puede cerrar, pero todo sigue funcionando.
- **Correos:** ella también recibe los de SellAlleS (recordatorios, recibo con la factura y aviso de comprobante rechazado).
- **Conexión:** "puente con clave" (opción A), en lugar de un usuario de SellAlleS con contraseña guardada o un cobro propio en Anadsll.
- **Factura:** la arma siempre SellAlleS, con un solo dibujo compartido. Louis todavía está puliendo el formato y no quiere trabajar dos veces.
- **Página:** "similar a SellAlleS": ella ve, abre y descarga sus facturas.
- **Precio:** RD$ 2,300 mensuales.
- **Acceso:** Louis autorizó trabajar en todo lo de SellAlleS, tanto el repo como su proyecto de Supabase.

## 2. Alcance

**Entra:**
- **SellAlleS:**
  - claves de conexión por empresa;
  - funciones internas compartidas para reportar y retirar pagos;
  - el módulo de factura compartido;
  - la función `cobro-externo`;
  - el botón "Clave de conexión" en su pantalla de Empresas.
- **Anadsll:**
  - la función `mi-suscripcion`;
  - la página "Mi suscripción" en el panel;
  - el banner de pago.
- **Pruebas:** con una empresa de prueba en SellAlleS, que se borra al terminar.

**No entra:**
- **Bloquear el panel por atraso.** Si algún día se quiere, será una regla aparte.
- **Pagos con tarjeta o en línea.** Solo transferencia con comprobante.
- **Cambiar la pantalla de Cobros de SellAlleS.** Louis cobra igual que hoy.
- **Crear la empresa real del salón en SellAlleS.** Va en la fase Entrega, así la primera cuota nace ese día (ver §8).

## 3. Arquitectura

SellAlleS (proyecto Supabase `qwpjclqinruhtxgkrxwr`) y Anadsll (proyecto `lrcbucfaipazjoxtussc`) son proyectos separados de la misma cuenta.

```
Panel de Anadsll (sesión de la dueña, rol admin)
   │  página "Mi suscripción" + banner
   ▼
Función de Anadsll: mi-suscripcion (Edge Function)
   │  exige sesión del panel con rol admin
   │  secretos: SELLALLES_URL, SELLALLES_CLAVE_COBRO (nunca van al navegador)
   ▼
Función de SellAlleS: cobro-externo (Edge Function, sin JWT; se identifica con la clave)
   │  la clave → la empresa (SellAlleS guarda solo su hash)
   │  usa las mismas funciones de la base que la pantalla de Cobros
   ▼
Base de SellAlleS: _cuenta_de_suscripcion, platform_bank_accounts,
subscription_payment_reports, subscription_payments (con su factura), bucket comprobantes-de-pago
```

**El recorrido de un pago:**
1. Ella abre "Mi suscripción" y ve cuánto debe y a qué cuenta transferir.
2. Transfiere, llena el formulario y adjunta la foto o el PDF.
3. El navegador sube el archivo directo a SellAlleS con un permiso de subida de un solo uso que le dio el puente.
4. El puente crea el reporte "por confirmar". El disparador que ya existe le manda el correo "comprobante recibido" a Louis.
5. Louis confirma o rechaza en su pantalla de Cobros de SellAlleS.
   - Si confirma, se crea el pago con su factura y a ella le llega el recibo por correo.
   - Si rechaza, a ella le llega el motivo.
6. En "Mi suscripción" aparece el pago con "Ver" y "Descargar" factura, o el reporte rechazado con su motivo.

## 4. SellAlleS

### 4.1 Claves de conexión

- **Tabla nueva `claves_cobro_externo`:** `id`, `company_id` (FK a `companies`, con `on delete cascade`), `clave_hash` (sha-256 en hex, único), `etiqueta` (por ejemplo "Anadsll"), `creada_en`, `ultimo_uso`, `revocada_en`.
  - RLS activada y sin permisos para `anon` ni `authenticated`: solo la usa el servidor (service role).
- **`generar_clave_cobro_externo(p_company_id uuid, p_etiqueta text) returns text`:**
  - solo el super admin;
  - crea una clave aleatoria de 32 bytes en base64url con el prefijo `cobro_`, guarda el hash y devuelve la clave **una sola vez**;
  - si la empresa ya tenía una clave activa, esa queda revocada.
- **`revocar_clave_cobro_externo(p_company_id uuid)`:** solo el super admin.
- **En la pantalla de Empresas**, en el menú de cada empresa, la opción "Clave de conexión":
  - muestra si hay una clave activa y su último uso;
  - tiene "Generar clave" (enseña la clave una vez, con "Copiar" y el aviso de que no se vuelve a ver) y "Revocar".

### 4.2 Una sola regla de negocio

`reportar_pago_de_suscripcion` y `anular_reporte_de_pago` usan la empresa y el usuario de la sesión. Se separan en:
- **`_reportar_pago(p_company_id, p_reportado_por uuid, p_reportado_por_nombre text, …los mismos datos…)`:** tiene las validaciones de hoy, sin cambios:
  - el monto debe ser mayor que 0;
  - la fecha no puede ser futura según `company_today`;
  - el archivo debe ser de la carpeta de la empresa y debe existir;
  - no se acepta un sha-256 repetido que esté por confirmar o confirmado;
  - la cuenta bancaria debe existir.
- **`_anular_reporte(p_company_id, p_report_id)`:** retira un reporte que siga por confirmar.

Las funciones públicas de hoy quedan como envolturas que pasan `current_company_id()` y `auth.uid()`, y así la app de SellAlleS no cambia. Las internas no se exponen a la API. El reporte que llega por el puente queda con `reported_by` nulo y `reported_by_name = 'Anadsll · <etiqueta de la clave>'`.

### 4.3 La factura compartida

- **Dónde queda:** el dibujo de la factura (`src/lib/subscription-invoice.ts`, con jsPDF) y los formatos que usa (`formatCedulaOrRnc`, `formatPhone`) pasan a `supabase/functions/_shared/factura-suscripcion.ts`, sin imports de alias `@/`.
- **Quién lo usa:**
  - la app Next lo importa desde ahí; `src/lib/subscription-invoice.ts` queda reexportándolo para no tocar los que ya lo usan;
  - `cobro-externo` lo usa desde Deno (`npm:jspdf`).
- **Criterio de aceptación:**
  - la factura de un mismo pago sale igual antes y después, con el mismo texto página por página, comparado con jsPDF;
  - `next build` pasa.

### 4.4 La función `cobro-externo`

- **Forma de las llamadas:** se despliega con `verify_jwt = false`. Cada llamada es un `POST` con el encabezado `x-clave-cobro: <clave>` y un cuerpo JSON `{ "accion": …, … }`.
- **Si la clave falta, es mala o está revocada:** responde `401 { error: 'clave' }` y no dice nada más.
- **En cada uso válido:** actualiza `ultimo_uso`.
- **Errores de validación:** responde `400 { error: '<mensaje en español>' }`, con el mismo texto que la base.

| `accion` | Datos | Devuelve |
|---|---|---|
| `estado` | — | `{ empresa: { nombre }, cuenta, bancos, reportes, pagos }` (ver abajo) |
| `subida` | `{ nombre, mime, tamano }` | `{ path, url, token }`: un permiso de subida firmado para `comprobantes-de-pago/<company_id>/<uuid>.<ext>` |
| `reportar` | `{ monto, fecha, banco_id, referencia, nota, path, nombre, mime, sha256 }` | `{ reporte }` (por `_reportar_pago`) |
| `retirar` | `{ reporte_id }` | `{ ok: true }` (por `_anular_reporte`) |
| `comprobante` | `{ reporte_id }` | `{ url }`: enlace firmado de 5 minutos para ver el archivo de ese reporte |
| `factura` | `{ pago_id }` | `application/pdf`, con `Content-Disposition` y el nombre de archivo que ya usa SellAlleS |

**Qué trae `estado`** (solo de esa empresa):
- `cuenta`: el jsonb de `_cuenta_de_suscripcion(company_id)`, tal cual;
- `bancos`: las cuentas activas, con banco, tipo, número, titular, cédula o RNC del titular, y moneda;
- `reportes`: los últimos 20, del más nuevo al más viejo, con `id, amount, paid_at, bank_label, reference, notes, status, reject_reason, file_name, created_at`;
- `pagos`: todos, del más nuevo al más viejo, con `id, amount, paid_at, method, reference, period_start, period_end, plan_name, codigo_factura` (las columnas de `subscription_payments`; `codigo_factura` son los 8 primeros caracteres del id en mayúsculas, como en `codigoDeFactura`).

**Límites y validaciones:**
- `subida` acepta solo los tipos del bucket (jpeg, png, webp, heic, heif, pdf) y hasta 10 MB.
- `comprobante` y `factura` comprueban que el reporte o el pago sean de la empresa de la clave.

### 4.5 Correos

**Lo que ya existe y se aprovecha:**
- **El aviso a Louis de "comprobante recibido"** es un disparador sobre `subscription_payment_reports`: sale solo, también con los reportes que llegan por el puente.
- **Los recordatorios, el recibo con factura y el rechazo** van al contacto de cobro (`_contacto_de_cobro`): el administrador de la empresa en SellAlleS, primero el dueño. Por eso, al crear el salón en SellAlleS, la dueña queda como administradora con su correo, aunque nunca entre.

**Lo que decide Louis:** los recordatorios dependen del interruptor global `platform_settings.avisos_cobro_activos`, que vale para todas las empresas.

## 5. Anadsll

### 5.1 La función `mi-suscripcion`

- **Dónde está:** `vscode/supabase/functions/mi-suscripcion/index.ts`, con `verify_jwt = true`.
- **Quién puede usarla:**
  - lee el usuario de la sesión (`Authorization`) y busca su rol en `staff` por correo, igual que el panel;
  - si no es `admin`, responde `403 { error: 'no autorizado' }`.
- **Qué hace:** reenvía la acción al puente con `x-clave-cobro` y devuelve la respuesta tal cual, incluido el PDF de `factura`.
- **Si faltan los secretos o SellAlleS no responde:** devuelve `503 { error: 'sin conexion' }`.
- **CORS:** acepta las llamadas del panel en su dominio y en `localhost`.
- **Secretos del proyecto de Anadsll:** `SELLALLES_URL` y `SELLALLES_CLAVE_COBRO`.

### 5.2 La página "Mi suscripción"

**Dónde y quién:**
- es la ruta `/admin/suscripcion`, con la entrada "Mi suscripción" en el menú del panel;
- solo la ven los de rol `admin`, y la ruta también lo comprueba;
- usa el estilo del panel (sus CSS y su tema claro u oscuro), no el del sitio de la clienta.

**Qué tiene:**
1. **Estado:**
   - al día, por vencer, atrasada, nunca pagó, en prueba o comprobante en revisión;
   - la cuota mensual y el próximo cobro;
   - si debe: cuánto, cuántas cuotas y desde cuándo.
2. **Cómo pagar:** las cuentas bancarias, cada una con "Copiar". Si falla la copia, dice "Cópialo a mano".
3. **Reportar un pago:**
   - **los datos:** el monto (sugerido: lo que debe; si no debe, la cuota), la fecha de la transferencia (hoy por defecto, nunca futura), la cuenta (obligatoria si hay más de una), la referencia y la nota (opcionales) y el comprobante, en foto o PDF de hasta 10 MB;
   - **las fotos:** se comprimen en el navegador antes de subir;
   - **los pasos al enviar:** se calcula el sha-256, luego se pide `subida`, luego se sube el archivo con el permiso y al final se llama a `reportar`;
   - **los errores:** los de la base se muestran tal cual, por ejemplo "Ese comprobante ya lo enviaste antes".
4. **Comprobantes enviados:** con fecha, monto, cuenta y estado (en revisión, confirmado, rechazado con su motivo, o retirado), "Ver comprobante" y "Retirar" mientras siga en revisión.
5. **Pagos y facturas:** fecha, monto, método y código de factura, con "Ver" (abre el PDF en una pestaña nueva) y "Descargar".

**Qué pasa si algo falla:**
- **si el puente falla:** "No pudimos cargar tu suscripción ahora" con "Reintentar". El resto del panel no se entera;
- **si el envío falla a mitad de camino** (el archivo subió pero el reporte no se creó): se muestra el error y se puede reintentar; la regla del sha-256 evita duplicados.

### 5.3 El banner

Se muestra arriba de todas las pantallas del panel, solo para el rol `admin`. Sigue la misma lógica que `avisoDeCuota` de SellAlleS, llevada a una función pura con pruebas:
- **Azul** si hay comprobantes en revisión y no debe, o si lo que está en revisión cubre la deuda. Dice "Estamos revisando tu comprobante de RD$ X". Se puede ocultar por hoy.
- **Rojo** si está atrasada o nunca pagó. Dice "Tienes N cuotas pendientes: RD$ X, desde el …", y si hay algo en revisión, cuánto faltaría. **No se puede cerrar.**
- **Rojo** también si la prueba venció o la cuenta está suspendida, con "Tu suscripción está suspendida: escríbenos".
- **Ámbar** si faltan 7 días o menos para la próxima cuota ("vence hoy" o "vence el …, en N días"), o si la prueba termina en 7 días o menos. Se puede ocultar por hoy.
- **Nada** si está al día, sin tarifa o en una prueba con más de 7 días.

**El botón:** "Pagar / subir comprobante", o "Ver estado" en azul, lleva a `/admin/suscripcion`.

**Ocultar por hoy:** usa `localStorage`, con la clave del aviso y la fecha. Si no hay almacenamiento, solo se cierra en ese momento.

**Cuándo consulta:** una vez al abrir el panel y luego cada 15 minutos a lo sumo, con caché en memoria. Al reportar o retirar un pago en la página, se vuelve a pedir.

**Si el puente falla:** el banner no se muestra.

### 5.4 Textos y fechas

- **Montos:** "RD$ 2,300", con el formato del panel.
- **Fechas:** "5 de octubre", en hora de Santo Domingo.
- **Estados de los comprobantes:** por_confirmar es "En revisión", confirmado es "Confirmado", rechazado es "Rechazado", anulado es "Retirado".

## 6. Seguridad

- **La clave:**
  - identifica a una sola empresa;
  - SellAlleS guarda solo su hash;
  - vive como secreto en Anadsll y nunca se envía al navegador;
  - si se filtra, Louis la revoca y genera otra.
- **Lo que sale por el puente:** nada de otras empresas, de la plataforma ni de Cobros. Todas las consultas se filtran por el `company_id` de la clave.
- **El navegador de ella:** solo recibe un permiso de subida de un solo uso y enlaces firmados de 5 minutos, siempre de archivos de su empresa.
- **Quién entra en Anadsll:** solo el rol `admin`, comprobado en el servidor. Recepción y las especialistas reciben 403.
- **Qué no se toca:** las políticas RLS de SellAlleS y sus funciones públicas siguen igual. Las funciones internas nuevas no se exponen a `anon` ni a `authenticated`.

## 7. Pruebas

**Automáticas (Node en Anadsll y la herramienta de pruebas de SellAlleS):**
- el aviso del banner según el estado de la cuenta: los casos de la §5.3, incluido "lo que está en revisión cubre la deuda";
- los textos de montos, fechas y estados;
- la validación del formulario: monto, fecha futura, tipo y tamaño del archivo.

**SellAlleS:**
- la factura compartida da el mismo texto que antes;
- `next build` y las pruebas existentes pasan.

**Prueba completa, con una empresa de prueba en SellAlleS con tarifa de RD$ 2,300, una sucursal y una clave:**
- estado al día, por vencer y atrasado (moviendo la fecha de creación de la empresa de prueba);
- reportar con foto y con PDF, y comprobar que le llega el correo "comprobante recibido" a Louis;
- reportar el mismo comprobante dos veces, que debe rechazarse;
- retirar un reporte;
- confirmar desde Cobros, y comprobar que el pago aparece con su factura y que "Ver" y "Descargar" dan el mismo PDF que en SellAlleS;
- rechazar un reporte, y comprobar que se ve el motivo;
- un usuario de recepción, que debe recibir 403 y no ver el menú ni el banner;
- una clave revocada, que debe mostrar "No pudimos cargar…" sin banner;
- revisar la página y el banner en 360, 390, 430, 820 y 1280, en los dos temas del panel.

**Al terminar:** se borran la empresa de prueba, sus reportes, sus pagos, sus archivos y su clave.

## 8. Puesta en marcha

**Ahora (pruebas):** la empresa de prueba y su clave. Los secretos de Anadsll apuntan a esa clave mientras se desarrolla.

**En la fase Entrega:**
1. En SellAlleS se crea la empresa "Anadsll Beauty Esthetic" con:
   - una sucursal;
   - una suscripción de plan a medida de RD$ 2,300 al mes (`custom_monthly_price = 2300`, ciclo mensual);
   - la dueña como administradora, con su correo.

   La primera cuota nace ese día. Si Louis prefiere otro día de cobro, puede dar una prueba que termine el día anterior.
2. Se genera su clave y se reemplaza `SELLALLES_CLAVE_COBRO` en Anadsll.
3. Se revoca la clave de prueba.

## 9. Orden de construcción (para el plan)

1. **SellAlleS:** las claves (tabla, funciones y botón), las funciones internas, la factura compartida y `cobro-externo`, con su PR en `SellAlleS-WEB` y sus migraciones aplicadas en su proyecto.
2. **Anadsll:** `mi-suscripcion`, la lógica pura del banner y los textos con pruebas, la página, el banner y la entrada del menú, con su PR en `beauty`.
3. **Prueba completa** con la empresa de prueba, en la computadora y en el teléfono de Louis.
