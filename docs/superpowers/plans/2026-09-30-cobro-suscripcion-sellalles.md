# Cobro mensual del sistema con SellAlleS — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** la dueña del salón paga el sistema (RD$ 2,300 al mes) desde el panel de Anadsll:
- en "Mi suscripción" ve su estado, las cuentas para transferir, sube el comprobante y ve y descarga sus facturas;
- un banner le recuerda el pago.

Louis cobra desde la pantalla de Cobros de SellAlleS, como a cualquier otra empresa.

**Architecture:** el salón es una empresa más en SellAlleS. Hay dos funciones del servidor:
- **`cobro-externo`, en SellAlleS:** se identifica con una clave por empresa, de la que solo se guarda el hash, y usa las mismas reglas de la base que Cobros.
- **`mi-suscripcion`, en Anadsll:** solo deja pasar al rol admin, lee la clave desde Vault y le reenvía cada acción al puente.

La factura la dibuja siempre SellAlleS, con un módulo compartido entre su app Next y su función Deno. El panel de Anadsll tiene una página nueva, un banner y una lógica pura con pruebas.

**Tech Stack:**
- **SellAlleS:** Next 14, Supabase (Postgres 17, Edge Functions en Deno), jsPDF 4.2.1.
- **Anadsll:** React 19, Vite 7, zustand, Supabase JS y `node --test`.

**Spec:** `docs/superpowers/specs/2026-09-30-cobro-suscripcion-sellalles-design.md`. El plan argumenta desde ahí; quien ejecuta lee los dos.

**Los dos repositorios:**

| Repo | Ruta local | Rama | Proyecto Supabase | Herramientas MCP |
|---|---|---|---|---|
| SellAlleS (`louisx2/SellAlleS-WEB`) | `C:/Users/loui-/Desktop/LOUIS/Git/SellAlleS-WEB` | `claude/cobro-externo` | `qwpjclqinruhtxgkrxwr` | `mcp__732a3f20-…__*` (con `project_id`) |
| Anadsll (`louisx2/beauty`, app en `vscode/`) | esta carpeta de trabajo | `claude/cobro-suscripcion` | `lrcbucfaipazjoxtussc` | `mcp__supabase__*` |

## Global Constraints

- **Precio:** RD$ 2,300 al mes, como plan a medida (`subscriptions.custom_monthly_price = 2300`, `billing_cycle = 'monthly'`).
- **Atraso:** solo se avisa, nunca se bloquea nada. El banner rojo no se puede cerrar.
- **La clave de conexión:**
  - nunca va al navegador ni al repo;
  - SellAlleS guarda solo su sha-256 en hex;
  - Anadsll la guarda en **Vault** (secreto `sellalles_clave_cobro`, más `sellalles_url`).

  *Ruling del plan:* la spec dice "secretos del proyecto". Se usa Vault porque el controlador lo puede escribir con el MCP, sin pasar por el panel de Supabase, y la función lo lee con service role.
- **Quién usa "Mi suscripción" en Anadsll:** solo el rol `admin`. Lo comprueba el servidor con `public.staff_role()` en `mi-suscripcion`; recepción y las especialistas reciben 403, y además no ven ni el menú ni el banner.
- **Reglas de negocio:** las mismas que SellAlleS, sin duplicarlas. Reportar y retirar pasan por `_reportar_pago` y `_anular_reporte`, y la cuenta sale de `_cuenta_de_suscripcion`.
- **Comprobantes:**
  - tipos aceptados: jpeg, png, webp, heic, heif y pdf, hasta **10 MB** después de comprimir;
  - las fotos se comprimen a 2000 px de lado mayor, en JPEG de calidad 0.85;
  - la huella sha-256 se saca del archivo **original**.
- **Textos:**
  - montos "RD$ 2,300", con decimales solo si los hay ("RD$ 1,150.50");
  - fechas "5 de octubre", en hora de Santo Domingo (UTC−4 todo el año);
  - todo en español, comentarios y nombres incluidos.
- **Base de datos:**
  - los cambios van solo en migraciones guardadas en el repo y aplicadas por el controlador con el MCP del proyecto que toque;
  - no se cambian datos reales;
  - los datos de prueba usan "Prueba Anadsll (Claude)" y se borran al final.
- **SellAlleS:**
  - la app Next no se tipa con la carpeta `supabase` (`tsconfig` la excluye), pero un archivo de `supabase/functions/_shared/` importado desde `src` sí se compila: no puede usar `Deno` ni imports `npm:`/`jsr:`;
  - comprobaciones: `npm run typecheck`, `npm run lint` y `npm run build`, contra la línea base que anota la Task 1.
- **Anadsll:**
  - el CSS del panel usa su propio prefijo por página (`susc-`, `aviso-susc`); antes de crear un prefijo se busca en todo el CSS (`grep -rn "susc" vscode/src --include=*.css` debe dar vacío);
  - tema oscuro por defecto y claro con `[data-theme="light"]`;
  - **finales de línea:** `src/App.tsx` y `src/pages/AdminLayout.tsx` están en **CRLF** y lo conservan (se cuentan los CR antes y después, y `git diff` solo muestra las líneas cambiadas); los archivos nuevos van en LF;
  - **líneas base:** tsc 39 errores, ninguno en archivos nuevos; `npm test` 115.
- **Caracteres tipográficos** (“ ” · … — ¿ á é í ó ú ñ): se cuentan con un script de node después de escribir y se restauran con `String.fromCharCode` si se pierden.

## Review Focus

- **La dueña reenvía el mismo comprobante** (después de un fallo de red, o dos toques): el segundo se rechaza con "Ese comprobante ya lo enviaste antes." y no queda un reporte duplicado. Lo cubren la regla de la base (Task 2) y la prueba completa (Task 6, Step 4, y Task 12).
- **Una recepcionista o especialista abre `/admin/suscripcion` o llama a la función:** no ve el menú ni el banner, la página la redirige y la función responde 403. Lo cubren las Tasks 7, 10 y 11, y la prueba de la Task 12.
- **SellAlleS no responde o la clave fue revocada:** la página muestra "No pudimos cargar tu suscripción ahora" con "Reintentar", el banner no sale y el resto del panel funciona. Lo cubren la Task 7 (401 o caída se vuelve 503), la Task 9 (el error tipado), la Task 11 (sin banner) y la prueba de la Task 12 con la clave revocada.
- **Archivos difíciles desde el teléfono:**
  - una foto HEIC o una foto enorme se comprime o se acepta;
  - un PDF de más de 10 MB se rechaza **antes** de subir, con un mensaje claro;
  - un archivo de texto se rechaza.

  Lo cubren la Task 8 (pruebas de `validarReporte`) y la Task 9.
- **Atrasada con un comprobante en revisión:**
  - si lo enviado cubre la deuda, el banner sale azul;
  - si no la cubre, sale rojo y dice cuánto faltaría.

  Lo cubre la Task 8 con pruebas.

---

## Parte A — SellAlleS

### Task 1: Rama, dependencias y línea base (la hace el controlador)

- [ ] **Step 1:**
```bash
cd "C:/Users/loui-/Desktop/LOUIS/Git/SellAlleS-WEB"
git switch -c claude/cobro-externo origin/main
npm ci
npm run typecheck 2>&1 | tail -3
npm run lint 2>&1 | tail -3
npm run build 2>&1 | tail -5
```
- [ ] **Step 2:** Anotar en el ledger lo que dan typecheck, lint y build hoy. Esa es la línea base que las Tasks 3 a 5 no deben empeorar.

---

### Task 2: Claves de conexión y reglas compartidas en la base (la hace el controlador con el MCP de SellAlleS)

**Files:**
- Create: `supabase/migrations/20260930150000_cobro_externo.sql` (SellAlleS). Al final se renombra con la versión que registre la base.

- [ ] **Step 1: Comprobar pgcrypto.**
```sql
select extname, extnamespace::regnamespace from pg_extension where extname = 'pgcrypto';
```
Expected: `pgcrypto | extensions`. Si estuviera en otro esquema, se cambia `extensions.` en la migración.

- [ ] **Step 2: Escribir la migración.**
```sql
-- Cobro externo: otro sistema (Anadsll) cobra a SU empresa a través de SellAlleS con una clave de conexión.
--
-- La clave identifica UNA empresa; aquí solo se guarda su sha-256. La usa la Edge Function cobro-externo con
-- service role. Las reglas de "reportar" y "retirar" pasan a funciones internas que reciben la empresa como
-- dato: la app (por la sesión) y el puente (por la clave) usan las mismas validaciones y el mismo disparador
-- de "comprobante recibido".

-- ── Claves ─────────────────────────────────────────────────────────────────
create table public.claves_cobro_externo (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  clave_hash text not null unique,
  etiqueta text not null default 'Conexión externa' check (btrim(etiqueta) <> ''),
  creada_en timestamptz not null default now(),
  ultimo_uso timestamptz,
  revocada_en timestamptz
);

create unique index claves_cobro_externo_una_activa
  on public.claves_cobro_externo (company_id) where revocada_en is null;

comment on table public.claves_cobro_externo is
  'Claves con las que un sistema externo (p. ej. Anadsll) consulta y reporta los pagos de UNA empresa por la Edge Function cobro-externo. Solo se guarda el hash; solo el servidor la lee.';

alter table public.claves_cobro_externo enable row level security;
revoke all on public.claves_cobro_externo from anon, authenticated;
grant select, insert, update, delete on public.claves_cobro_externo to service_role;

create or replace function public.generar_clave_cobro_externo(p_company_id uuid, p_etiqueta text default 'Anadsll')
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_clave text;
begin
  if not public.is_super_admin() then
    raise exception 'Solo el super administrador puede generar claves de conexión.';
  end if;
  if not exists (select 1 from public.companies where id = p_company_id) then
    raise exception 'Empresa no encontrada.';
  end if;
  -- una sola clave activa por empresa: la anterior deja de servir en el acto
  update public.claves_cobro_externo set revocada_en = now()
   where company_id = p_company_id and revocada_en is null;
  v_clave := 'cobro_' || rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
  insert into public.claves_cobro_externo (company_id, clave_hash, etiqueta)
  values (p_company_id, encode(extensions.digest(v_clave, 'sha256'), 'hex'),
          coalesce(nullif(btrim(p_etiqueta), ''), 'Conexión externa'));
  return v_clave;
end;
$$;

revoke all on function public.generar_clave_cobro_externo(uuid, text) from public, anon;
grant execute on function public.generar_clave_cobro_externo(uuid, text) to authenticated;

create or replace function public.revocar_clave_cobro_externo(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Solo el super administrador puede revocar claves de conexión.';
  end if;
  update public.claves_cobro_externo set revocada_en = now()
   where company_id = p_company_id and revocada_en is null;
end;
$$;

revoke all on function public.revocar_clave_cobro_externo(uuid) from public, anon;
grant execute on function public.revocar_clave_cobro_externo(uuid) to authenticated;

create or replace function public.estado_clave_cobro_externo(p_company_id uuid)
returns table (activa boolean, etiqueta text, creada_en timestamptz, ultimo_uso timestamptz)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Solo el super administrador puede ver las claves de conexión.';
  end if;
  return query
    select true, k.etiqueta, k.creada_en, k.ultimo_uso
      from public.claves_cobro_externo k
     where k.company_id = p_company_id and k.revocada_en is null;
end;
$$;

revoke all on function public.estado_clave_cobro_externo(uuid) from public, anon;
grant execute on function public.estado_clave_cobro_externo(uuid) to authenticated;

-- La clave → la empresa. Solo el servidor; anota el último uso.
create or replace function public._empresa_de_clave(p_clave_hash text)
returns table (company_id uuid, etiqueta text)
language sql
volatile
security definer
set search_path to 'public'
as $$
  update public.claves_cobro_externo k
     set ultimo_uso = now()
   where k.clave_hash = p_clave_hash and k.revocada_en is null
  returning k.company_id, k.etiqueta;
$$;

revoke all on function public._empresa_de_clave(text) from public, anon, authenticated;
grant execute on function public._empresa_de_clave(text) to service_role;

-- ── Reportar y retirar: una sola regla ─────────────────────────────────────
create or replace function public._reportar_pago(
  p_company_id uuid,
  p_reportado_por uuid,
  p_reportado_por_nombre text,
  p_amount numeric,
  p_paid_at date,
  p_bank_account_id uuid,
  p_reference text,
  p_notes text,
  p_file_path text,
  p_file_name text,
  p_file_mime text,
  p_file_sha256 text
) returns public.subscription_payment_reports
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_banco text;
  v_row public.subscription_payment_reports%rowtype;
begin
  if p_company_id is null then
    raise exception 'Empresa no encontrada.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto debe ser mayor que cero.';
  end if;
  if p_paid_at is null or p_paid_at > public.company_today(p_company_id) then
    raise exception 'La fecha del pago no puede ser futura.';
  end if;
  if p_file_path is null or split_part(p_file_path, '/', 1) <> p_company_id::text then
    raise exception 'El comprobante no pertenece a esta empresa.';
  end if;
  if not exists (
    select 1 from storage.objects where bucket_id = 'comprobantes-de-pago' and name = p_file_path
  ) then
    raise exception 'No se encontró el comprobante subido. Vuelve a adjuntarlo.';
  end if;
  if nullif(btrim(p_file_sha256), '') is not null and exists (
    select 1 from public.subscription_payment_reports
     where company_id = p_company_id and file_sha256 = p_file_sha256
       and status in ('por_confirmar', 'confirmado')
  ) then
    raise exception 'Ese comprobante ya lo enviaste antes.';
  end if;

  if p_bank_account_id is not null then
    select a.bank || ' · ' || initcap(a.account_type) || ' · ' || a.account_number
      into v_banco
      from public.platform_bank_accounts a where a.id = p_bank_account_id;
    if v_banco is null then
      raise exception 'La cuenta bancaria elegida no existe.';
    end if;
  end if;

  insert into public.subscription_payment_reports (
    company_id, amount, paid_at, bank_account_id, bank_label, reference, notes,
    file_path, file_name, file_mime, file_sha256, reported_by, reported_by_name
  ) values (
    p_company_id, round(p_amount, 2), p_paid_at, p_bank_account_id, v_banco,
    nullif(btrim(p_reference), ''), nullif(btrim(p_notes), ''),
    p_file_path, nullif(btrim(p_file_name), ''), nullif(btrim(p_file_mime), ''),
    nullif(btrim(p_file_sha256), ''),
    p_reportado_por, nullif(btrim(p_reportado_por_nombre), '')
  ) returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public._reportar_pago(uuid, uuid, text, numeric, date, uuid, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public._reportar_pago(uuid, uuid, text, numeric, date, uuid, text, text, text, text, text, text) to service_role;

-- La de la app: misma firma y mismos permisos de antes, ahora como envoltura.
create or replace function public.reportar_pago_de_suscripcion(
  p_amount numeric,
  p_paid_at date,
  p_bank_account_id uuid,
  p_reference text,
  p_notes text,
  p_file_path text,
  p_file_name text,
  p_file_mime text,
  p_file_sha256 text
) returns public.subscription_payment_reports
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_company uuid := public.current_company_id();
begin
  if v_company is null or not public.is_company_admin() then
    raise exception 'Solo el administrador de la empresa puede reportar pagos.';
  end if;
  return public._reportar_pago(
    v_company, auth.uid(), (select name from public.profiles where id = auth.uid()),
    p_amount, p_paid_at, p_bank_account_id, p_reference, p_notes,
    p_file_path, p_file_name, p_file_mime, p_file_sha256);
end;
$$;

create or replace function public._anular_reporte(p_company_id uuid, p_report_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.subscription_payment_reports
     set status = 'anulado', reviewed_at = now()
   where id = p_report_id
     and company_id = p_company_id
     and status = 'por_confirmar';
  if not found then
    raise exception 'Solo se puede retirar un comprobante que todavía está por confirmar.';
  end if;
end;
$$;

revoke all on function public._anular_reporte(uuid, uuid) from public, anon, authenticated;
grant execute on function public._anular_reporte(uuid, uuid) to service_role;

create or replace function public.anular_reporte_de_pago(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_company_admin() then
    raise exception 'Solo el administrador de la empresa puede retirar un comprobante.';
  end if;
  perform public._anular_reporte(public.current_company_id(), p_report_id);
end;
$$;

-- El puente lee la cuenta con service role.
grant execute on function public._cuenta_de_suscripcion(uuid, date) to service_role;
```

- [ ] **Step 3: Aplicarla** con `apply_migration` (`project_id = qwpjclqinruhtxgkrxwr`, `name = cobro_externo`). Después se buscan con `list_migrations` la versión registrada y el archivo se renombra a `<versión>_cobro_externo.sql`, como los demás.

- [ ] **Step 4: Verificar.**
```sql
-- permisos
select p.proname,
       has_function_privilege('authenticated', p.oid, 'execute') auth,
       has_function_privilege('service_role', p.oid, 'execute') servicio,
       has_function_privilege('anon', p.oid, 'execute') anon
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in (
   'generar_clave_cobro_externo','revocar_clave_cobro_externo','estado_clave_cobro_externo','_empresa_de_clave',
   '_reportar_pago','_anular_reporte','reportar_pago_de_suscripcion','anular_reporte_de_pago','_cuenta_de_suscripcion')
 order by 1;
```
Expected:
- las tres de claves: `auth = true`, `anon = false`;
- `_empresa_de_clave`, `_reportar_pago` y `_anular_reporte`: `auth = false`, `servicio = true`;
- las dos envolturas: `auth = true`;
- `_cuenta_de_suscripcion`: `servicio = true`.
```sql
-- las envolturas siguen rechazando a quien no es admin de una empresa
begin; set local role authenticated;
select public.reportar_pago_de_suscripcion(100, current_date, null, null, null, 'x/y.png', 'y.png', 'image/png', null);
rollback;
```
Expected: el error "Solo el administrador de la empresa puede reportar pagos.".
```sql
-- la regla interna valida la carpeta del archivo
select public._reportar_pago(gen_random_uuid(), null, 'prueba', 100, current_date, null, null, null,
       'otra-empresa/archivo.png', 'archivo.png', 'image/png', null);
```
Expected: el error "El comprobante no pertenece a esta empresa.". No inserta nada.

- [ ] **Step 5: Commit** (en SellAlleS)
```bash
git add supabase/migrations/*_cobro_externo.sql
git commit -m "feat(cobros): claves de conexión por empresa y reglas compartidas para reportar y retirar pagos"
```

---

### Task 3: La factura en un módulo compartido (app Next + Edge Function)

**Files (SellAlleS):**
- Create: `supabase/functions/_shared/factura-suscripcion.ts`
- Modify: `src/lib/subscription-invoice.ts`, que queda como una envoltura fina
- Create: `scripts/probar-factura.mts`, una prueba de humo con Node

**Interfaces:**
- **Produces:**
  - Tipos: `MetodoDePago`, `FacturaEmisor`, `FacturaCliente`, `PagoConFactura`, `DocPdf`, `ConstructorPdf`.
  - Funciones de nombres y códigos:
    - `METODO_DE_PAGO: Record<MetodoDePago, string>`;
    - `codigoDeFactura(p: { id: string }): string`;
    - `numeroDeFactura(n: number): string`;
    - `nombreArchivoFactura(p: { id: string }): string`.
  - Funciones de la factura:
    - `crearFactura(JsPDF: ConstructorPdf, p: PagoConFactura): DocPdf` (síncrona; lanza error si el pago no tiene factura);
    - `pagoDesdeFila(r: Record<string, any>): PagoConFactura`, que traduce una fila de `subscription_payments`.
  - Las usa la Task 4 (Deno) y las siguen usando los consumidores de hoy a través de `src/lib/subscription-invoice.ts`.

- [ ] **Step 0: Guardar la factura de hoy, antes de tocar nada.** La spec pide que la factura de un mismo pago salga igual antes y después. El módulo de hoy importa `@/lib/format`, que Node no resuelve, así que se saca una copia temporal en el scratchpad con la ruta cambiada. `facturaEnBase64` ya está exportada y carga jsPDF por su cuenta:
```bash
cd "C:/Users/loui-/Desktop/LOUIS/Git/SellAlleS-WEB"
S="<scratchpad>/factura"; mkdir -p "$S"
sed "s#'@/lib/format'#'$(pwd)/src/lib/format.ts'#" src/lib/subscription-invoice.ts > "$S/antes.mts"
cat > "$S/guardar-antes.mts" <<'EOF'
import { writeFileSync } from 'node:fs';
import { facturaEnBase64 } from './antes.mts';
const pago = {
  id: 'abcdef12-3456-7890-abcd-ef1234567890', companyId: 'x', amount: 2300, paidAt: '2026-10-05', method: 'transfer',
  reference: 'REF123', periodStart: '2026-10-05', periodEnd: '2026-11-04', planName: 'Anadsll',
  createdAt: new Date('2026-10-05T15:00:00Z'), invoiceNumber: 7,
  invoiceIssuer: { legalName: 'SellAlleS', rnc: '131234567', notes: 'Gracias por su pago' },
  invoiceCustomer: { name: 'Anadsll Beauty Esthetic', phone: '8293224014' }, invoiceItbis: 0,
};
writeFileSync(process.argv[2], Buffer.from(await facturaEnBase64(pago as never), 'base64'));
EOF
node "$S/guardar-antes.mts" "$S/antes.pdf" && ls -l "$S/antes.pdf"
```
Si `format.ts` importa algo con `@/`, se hace lo mismo con ese archivo. El pago es el mismo que usa la prueba de humo del Step 3.

- [ ] **Step 1: Escribir el módulo compartido.** `supabase/functions/_shared/factura-suscripcion.ts` lleva **el mismo dibujo, línea por línea**, que `crearFactura` de `src/lib/subscription-invoice.ts`. Solo cambia esto:
  - jsPDF llega como parámetro, para no importarlo; Next y Deno lo importan cada uno a su manera;
  - los tipos son locales y estructurales;
  - los dos formatos (`formatCedulaOrRnc` y `formatPhone`) van copiados.
```ts
// Factura de un pago de suscripción, dibujada desde cero con el texto de jsPDF.
//
// Vive en supabase/functions/_shared para que haya UN solo dibujo: lo usan el panel del super admin y la
// página Mi Suscripción de SellAlleS (src/lib/subscription-invoice.ts) y la Edge Function cobro-externo, que
// le entrega el PDF a Anadsll. Por eso no importa nada: jsPDF llega como parámetro (Next lo carga con
// import('jspdf'), Deno con npm:jspdf) y los tipos son locales. Sin imports de alias ni de Deno.
//
// El PDF sale del pago y de los datos que la base congeló al emitirlo. El texto queda nítido a cualquier
// zoom, se puede copiar, y el archivo pesa unos pocos KB. Como todo sale de la fila, todos llegan a la misma
// factura, hoy o dentro de un año.

export type MetodoDePago = 'transfer' | 'cash' | 'card' | 'other';

export interface FacturaEmisor {
  legalName: string;
  rnc?: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface FacturaCliente {
  name: string;
  rnc?: string;
  address?: string;
  phone?: string;
  email?: string;
}

/** Lo que el dibujo necesita de un pago (SubscriptionPayment de la app cumple esta forma). */
export interface PagoConFactura {
  id: string;
  amount: number;
  paidAt: string;
  method: MetodoDePago;
  reference?: string;
  periodStart?: string;
  periodEnd?: string;
  planName?: string;
  createdAt: Date;
  invoiceNumber?: number;
  invoiceIssuer?: FacturaEmisor;
  invoiceCustomer?: FacturaCliente;
  invoiceItbis: number;
}

/** Lo que se usa de un documento de jsPDF. */
export interface DocPdf {
  internal: { pageSize: { getWidth(): number } };
  setProperties(p: Record<string, string>): unknown;
  setFont(nombre: string, estilo: string): unknown;
  setFontSize(puntos: number): unknown;
  setTextColor(r: number, g: number, b: number): unknown;
  setDrawColor(r: number, g: number, b: number): unknown;
  setFillColor(r: number, g: number, b: number): unknown;
  setLineWidth(ancho: number): unknown;
  line(x1: number, y1: number, x2: number, y2: number): unknown;
  rect(x: number, y: number, w: number, h: number, estilo?: string): unknown;
  roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number, estilo?: string): unknown;
  text(texto: string, x: number, y: number, opciones?: { align?: 'left' | 'center' | 'right' }): unknown;
  splitTextToSize(texto: string, ancho: number): string[];
  save(nombre: string): unknown;
  output(tipo: 'datauristring'): string;
  output(tipo: 'arraybuffer'): ArrayBuffer;
}

export type ConstructorPdf = new (opciones: { unit: 'mm'; format: 'letter' }) => DocPdf;

export const METODO_DE_PAGO: Record<MetodoDePago, string> = {
  transfer: 'Transferencia',
  cash: 'Efectivo',
  card: 'Tarjeta',
  other: 'Otro',
};

/** Lo que ve el cliente: los 8 primeros caracteres del id del pago. El consecutivo de la base no se imprime:
 *  con una tarifa fija, número × tarifa le diría a cualquier cliente cuánto factura SellAlleS. */
export function codigoDeFactura(p: { id: string }): string {
  return p.id.slice(0, 8).toUpperCase();
}

/** Consecutivo interno, 7 -> "000007". Solo para el panel del super admin. */
export function numeroDeFactura(n: number): string {
  return String(n).padStart(6, '0');
}

export function nombreArchivoFactura(p: { id: string }): string {
  return `factura-sellalles-${codigoDeFactura(p)}.pdf`;
}

/** Una fila de subscription_payments (snake_case, montos como texto) → lo que necesita el dibujo.
 *  Misma traducción que rowToSubscriptionPayment de src/lib/supabase/mappers.ts. */
// deno-lint-ignore no-explicit-any
export function pagoDesdeFila(r: Record<string, any>): PagoConFactura {
  return {
    id: r.id,
    amount: Number(r.amount),
    paidAt: r.paid_at,
    method: r.method,
    reference: r.reference ?? undefined,
    periodStart: r.period_start ?? undefined,
    periodEnd: r.period_end ?? undefined,
    planName: r.plan_name ?? undefined,
    createdAt: new Date(r.created_at),
    invoiceNumber: r.invoice_number ?? undefined,
    invoiceIssuer: r.invoice_issuer
      ? {
          legalName: r.invoice_issuer.legal_name ?? 'SellAlleS',
          rnc: r.invoice_issuer.rnc ?? undefined,
          address: r.invoice_issuer.address ?? undefined,
          phone: r.invoice_issuer.phone ?? undefined,
          email: r.invoice_issuer.email ?? undefined,
          notes: r.invoice_issuer.notes ?? undefined,
        }
      : undefined,
    invoiceCustomer: r.invoice_customer
      ? {
          name: r.invoice_customer.name ?? '',
          rnc: r.invoice_customer.rnc ?? undefined,
          address: r.invoice_customer.address ?? undefined,
          phone: r.invoice_customer.phone ?? undefined,
          email: r.invoice_customer.email ?? undefined,
        }
      : undefined,
    invoiceItbis: Number(r.invoice_itbis ?? 0),
  };
}

// Misma regla que formatPhone y formatCedulaOrRnc de src/lib/format.ts (copiadas: este archivo no importa nada).
function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}
function agruparTelefono(valor: string): string {
  const d = soloDigitos(valor).slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean).join('-');
}
function agruparDocumento(valor: string): string {
  const d = soloDigitos(valor).slice(0, 11);
  if (d.length <= 9) return [d.slice(0, 3), d.slice(3, 8), d.slice(8, 9)].filter(Boolean).join('-');
  return [d.slice(0, 3), d.slice(3, 10), d.slice(10, 11)].filter(Boolean).join('-');
}
```
Después de eso, en el mismo archivo, van **copiadas sin cambios** desde `src/lib/subscription-invoice.ts`:
- las funciones `fecha`, `fechaDeEmision`, `dinero`, `documento`, `telefono`, `descripcion` y `periodo`;
- el tipo `Rgb` y la constante `COLOR`.

Hay tres reemplazos:
1. En `documento`, `formatCedulaOrRnc(digitos)` pasa a ser `agruparDocumento(digitos)`.
2. En `telefono`, `formatPhone(valor)` pasa a ser `agruparTelefono(valor)`.
3. `descripcion` y `periodo` reciben un `PagoConFactura` en vez de un `SubscriptionPayment`.

Al final va `crearFactura`, con el **mismo cuerpo** que hoy salvo estas tres líneas:
```ts
export function crearFactura(JsPDF: ConstructorPdf, p: PagoConFactura): DocPdf {
  if (p.invoiceNumber == null) throw new Error('Este pago no tiene factura.');
  // (se borra la línea `const JsPDF = (await import('jspdf')).default;`)
  // Carta y no A4: es el papel que se usa en República Dominicana.
  const doc = new JsPDF({ unit: 'mm', format: 'letter' });
  // … el resto, idéntico, hasta `return doc;`
}
```
Además, `const lineas = doc.splitTextToSize(…) as string[]` puede quedar sin el `as string[]`, porque `DocPdf` ya lo tipa.

- [ ] **Step 2: La envoltura de la app.** `src/lib/subscription-invoice.ts` queda así:
```ts
// La factura de un pago de suscripción. El dibujo vive en supabase/functions/_shared/factura-suscripcion.ts,
// compartido con la Edge Function cobro-externo (Anadsll descarga ahí la misma factura). Aquí solo se carga
// jsPDF en el navegador y se guarda o se pasa a base64.
import type { SubscriptionPayment } from '@/lib/types';
import {
  METODO_DE_PAGO, codigoDeFactura, crearFactura, nombreArchivoFactura, numeroDeFactura, type ConstructorPdf,
} from '../../supabase/functions/_shared/factura-suscripcion';

export { METODO_DE_PAGO, codigoDeFactura, nombreArchivoFactura, numeroDeFactura };

async function documentoDe(p: SubscriptionPayment) {
  const JsPDF = (await import('jspdf')).default as unknown as ConstructorPdf;
  return crearFactura(JsPDF, p);
}

export async function descargarFactura(p: SubscriptionPayment): Promise<void> {
  const doc = await documentoDe(p);
  doc.save(nombreArchivoFactura(p));
}

/** El PDF en base64, sin el prefijo data:, que es como lo espera Resend. */
export async function facturaEnBase64(p: SubscriptionPayment): Promise<string> {
  const doc = await documentoDe(p);
  return doc.output('datauristring').split(',')[1];
}
```
Hay que buscar quién usaba lo que se exportaba antes (`grep -rn "subscription-invoice" src`) y comprobar que todo lo que importan sigue exportado.

- [ ] **Step 3: La prueba de humo.** `scripts/probar-factura.mts`:
```ts
// Prueba de humo de la factura compartida: se dibuja un pago de ejemplo con el módulo de
// supabase/functions/_shared y se revisa el texto del PDF (jsPDF no comprime el texto).
// Uso: node scripts/probar-factura.mts
import assert from 'node:assert/strict';
import {
  codigoDeFactura, crearFactura, nombreArchivoFactura, pagoDesdeFila, type ConstructorPdf,
} from '../supabase/functions/_shared/factura-suscripcion.ts';

const { jsPDF } = await import('jspdf');

const pago = pagoDesdeFila({
  id: 'abcdef12-3456-7890-abcd-ef1234567890',
  amount: '2300',
  paid_at: '2026-10-05',
  method: 'transfer',
  reference: 'REF123',
  period_start: '2026-10-05',
  period_end: '2026-11-04',
  plan_name: 'Anadsll',
  created_at: '2026-10-05T15:00:00Z',
  invoice_number: 7,
  invoice_issuer: { legal_name: 'SellAlleS', rnc: '131234567', notes: 'Gracias por su pago' },
  invoice_customer: { name: 'Anadsll Beauty Esthetic', phone: '8293224014' },
  invoice_itbis: 0,
});

assert.equal(codigoDeFactura(pago), 'ABCDEF12');
assert.equal(nombreArchivoFactura(pago), 'factura-sellalles-ABCDEF12.pdf');

const doc = crearFactura(jsPDF as unknown as ConstructorPdf, pago);
const pdf = Buffer.from(doc.output('datauristring').split(',')[1], 'base64').toString('latin1');
for (const esperado of ['FACTURA', 'No. ABCDEF12', 'Anadsll Beauty Esthetic', 'RD$ 2,300.00', 'PAGADA', '05/10/2026', 'REF123']) {
  assert.ok(pdf.includes(esperado), `falta "${esperado}" en el PDF`);
}
assert.throws(() => crearFactura(jsPDF as unknown as ConstructorPdf, { ...pago, invoiceNumber: undefined }), /no tiene factura/);

// con una ruta, guarda el PDF para compararlo con el de antes del cambio
if (process.argv[2]) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(process.argv[2], Buffer.from(doc.output('arraybuffer')));
}
console.log('factura compartida: ok');
```

- [ ] **Step 4: Comprobaciones**
```bash
S="<scratchpad>/factura"                           # la misma carpeta del Step 0
node scripts/probar-factura.mts "$S/despues.pdf"   # "factura compartida: ok"
# mismo PDF que antes, salvo la fecha de creación y el identificador del archivo
node -e "const f=require('fs');const l=p=>f.readFileSync(p,'latin1').split(/\r?\n/).filter(x=>!/CreationDate|^\/ID |\/ID \[/.test(x)).join('\n');const a=l(process.argv[1]),b=l(process.argv[2]);console.log(a===b?'factura igual que antes':'LA FACTURA CAMBIÓ');process.exit(a===b?0:1)" "$S/antes.pdf" "$S/despues.pdf"
npm run typecheck                        # igual que la línea base
npm run lint                             # igual que la línea base
npm run build                            # pasa
git diff --color-moved=zebra --stat
```
Hay que revisar en el diff que el dibujo se movió **sin cambios**: solo cambian las tres líneas dichas, los dos formatos y los tipos.

Si `node` no tomara el `.ts` importado desde el `.mts`, se corre con `node --experimental-detect-module scripts/probar-factura.mts` y se anota en el reporte.

- [ ] **Step 5: Commit**
```bash
git add supabase/functions/_shared/factura-suscripcion.ts src/lib/subscription-invoice.ts scripts/probar-factura.mts
git commit -m "refactor(cobros): la factura de suscripción en un módulo compartido con las Edge Functions"
```

---

### Task 4: La función `cobro-externo` (la escribe el implementador; la despliega el controlador)

**Files (SellAlleS):**
- Create: `supabase/functions/cobro-externo/index.ts`

**Interfaces:**
- **Consumes:**
  - de la Task 2, las funciones `_empresa_de_clave(p_clave_hash)`, `_cuenta_de_suscripcion(p_company_id)`, `_reportar_pago(…)` y `_anular_reporte(p_company_id, p_report_id)`;
  - de la Task 3, `crearFactura`, `nombreArchivoFactura`, `codigoDeFactura`, `pagoDesdeFila` y `ConstructorPdf`.
- **Produces:** el contrato que usa la Task 7 (`mi-suscripcion` lo reenvía tal cual). Cada llamada es un `POST`, con el encabezado `x-clave-cobro` y un cuerpo JSON `{ accion, … }`:
  - **Respuestas por acción:**
    - `estado` → `{ empresa: { nombre }, cuenta, bancos: BancoSuscripcion[], reportes: ReporteSuscripcion[], pagos: PagoSuscripcion[] }`, donde `cuenta` es el jsonb tal cual. Las formas exactas están en el código;
    - `subida { nombre, mime, tamano }` → `{ path, token, url, apikey }`, donde `url` y `apikey` son los públicos de SellAlleS, para subir con `uploadToSignedUrl`;
    - `reportar { monto, fecha, banco_id, referencia, nota, path, nombre, mime, sha256 }` → `{ reporte: { id } }`;
    - `retirar { reporte_id }` → `{ ok: true }`;
    - `comprobante { reporte_id }` → `{ url }`;
    - `factura { pago_id }` → `application/pdf`, con `Content-Disposition: attachment; filename="factura-sellalles-XXXXXXXX.pdf"`.
  - **Errores:** `401 { error: 'clave' }`, `400 { error: <mensaje en español> }`, `404 { error: 'No encontrado.' }`, `405`.

- [ ] **Step 1: Escribir la función.**
```ts
// Cobro de SellAlleS para un sistema externo: hoy Anadsll, el panel de un salón que es una empresa más aquí.
//
// Se identifica con una clave de conexión (encabezado x-clave-cobro), no con una sesión: la clave apunta a UNA
// empresa y la base guarda solo su sha-256 (claves_cobro_externo, por _empresa_de_clave). Todo lo que se lee o
// se escribe queda filtrado por esa empresa. Las reglas son las mismas de la app: la cuenta sale de
// _cuenta_de_suscripcion y el reporte pasa por _reportar_pago, así que también dispara el correo
// "comprobante recibido" al super admin.
//
// El comprobante no pasa por aquí (un archivo grande no cabe en el cuerpo de la función): 'subida' entrega un
// permiso de subida de un solo uso para comprobantes-de-pago/<empresa>/<uuid>.<ext>, el navegador sube directo
// y después 'reportar' crea el reporte. La factura sí sale de aquí, dibujada con el mismo módulo que la app.
//
// Se despliega con verify_jwt = false: la seguridad es la clave.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { jsPDF } from 'npm:jspdf@4.2.1';
import {
  codigoDeFactura, crearFactura, nombreArchivoFactura, pagoDesdeFila, type ConstructorPdf,
} from '../_shared/factura-suscripcion.ts';

const BUCKET = 'comprobantes-de-pago';
const TAMANO_MAXIMO = 10 * 1024 * 1024;
const EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function json(status: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });
}

async function sha256Hex(texto: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const textoONull = (v: unknown): string | null => {
  const t = typeof v === 'string' ? v.trim() : '';
  return t ? t : null;
};

async function estado(db: SupabaseClient, empresa: string) {
  const [emp, cuenta, bancos, reportes, pagos] = await Promise.all([
    db.from('companies').select('name').eq('id', empresa).single(),
    db.rpc('_cuenta_de_suscripcion', { p_company_id: empresa }),
    db.from('platform_bank_accounts')
      .select('id, bank, account_type, account_number, holder_name, holder_id, currency')
      .eq('is_active', true).order('sort_order').order('created_at'),
    db.from('subscription_payment_reports')
      .select('id, amount, paid_at, bank_label, reference, notes, status, reject_reason, file_name, created_at')
      .eq('company_id', empresa).order('created_at', { ascending: false }).limit(20),
    db.from('subscription_payments')
      .select('id, amount, paid_at, method, reference, period_start, period_end, plan_name, invoice_number')
      .eq('company_id', empresa).order('paid_at', { ascending: false }).order('created_at', { ascending: false }),
  ]);
  const error = emp.error ?? cuenta.error ?? bancos.error ?? reportes.error ?? pagos.error;
  if (error) throw error;
  return {
    empresa: { nombre: emp.data.name as string },
    cuenta: cuenta.data,
    bancos: (bancos.data ?? []).map((b) => ({
      id: b.id,
      banco: b.bank,
      tipo: b.account_type === 'corriente' ? 'corriente' : 'ahorro',
      numero: b.account_number,
      titular: b.holder_name,
      documento: b.holder_id ?? null,
      moneda: b.currency === 'USD' ? 'USD' : 'DOP',
    })),
    reportes: (reportes.data ?? []).map((r) => ({
      id: r.id,
      monto: Number(r.amount),
      fecha: r.paid_at,
      banco: r.bank_label ?? null,
      referencia: r.reference ?? null,
      nota: r.notes ?? null,
      estado: r.status,
      motivo: r.reject_reason ?? null,
      archivo: r.file_name ?? null,
      creado: r.created_at,
    })),
    pagos: (pagos.data ?? []).map((p) => ({
      id: p.id,
      monto: Number(p.amount),
      fecha: p.paid_at,
      metodo: p.method,
      referencia: p.reference ?? null,
      desde: p.period_start ?? null,
      hasta: p.period_end ?? null,
      plan: p.plan_name ?? null,
      codigo: codigoDeFactura(p),
      tieneFactura: p.invoice_number != null,
    })),
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido.' });

  const clave = req.headers.get('x-clave-cobro') ?? '';
  if (!clave.startsWith('cobro_')) return json(401, { error: 'clave' });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: filasClave, error: errorClave } = await db.rpc('_empresa_de_clave', {
    p_clave_hash: await sha256Hex(clave),
  });
  if (errorClave) return json(500, { error: 'No se pudo comprobar la clave.' });
  const conexion = (filasClave ?? [])[0] as { company_id: string; etiqueta: string } | undefined;
  if (!conexion) return json(401, { error: 'clave' });
  const empresa = conexion.company_id;

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await req.json();
  } catch {
    return json(400, { error: 'Cuerpo inválido.' });
  }

  try {
    switch (cuerpo.accion) {
      case 'estado':
        return json(200, await estado(db, empresa));

      case 'subida': {
        const mime = String(cuerpo.mime ?? '');
        const tamano = Number(cuerpo.tamano);
        const ext = EXTENSION[mime];
        if (!ext) return json(400, { error: 'El comprobante tiene que ser una foto o un PDF.' });
        if (!(tamano > 0) || tamano > TAMANO_MAXIMO) {
          return json(400, { error: 'El archivo pesa más de 10 MB. Sube una captura de pantalla o un PDF más liviano.' });
        }
        const path = `${empresa}/${crypto.randomUUID()}.${ext}`;
        const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
        if (error || !data) return json(500, { error: 'No se pudo preparar la subida del comprobante.' });
        return json(200, {
          path: data.path,
          token: data.token,
          url: Deno.env.get('SUPABASE_URL'),
          apikey: Deno.env.get('SUPABASE_ANON_KEY'),
        });
      }

      case 'reportar': {
        const bancoId = cuerpo.banco_id == null || cuerpo.banco_id === '' ? null : String(cuerpo.banco_id);
        if (bancoId && !UUID.test(bancoId)) return json(400, { error: 'La cuenta bancaria elegida no existe.' });
        if (!FECHA.test(String(cuerpo.fecha ?? ''))) return json(400, { error: 'La fecha del pago no es válida.' });
        const { data, error } = await db.rpc('_reportar_pago', {
          p_company_id: empresa,
          p_reportado_por: null,
          p_reportado_por_nombre: conexion.etiqueta,
          p_amount: Number(cuerpo.monto),
          p_paid_at: String(cuerpo.fecha),
          p_bank_account_id: bancoId,
          p_reference: textoONull(cuerpo.referencia),
          p_notes: textoONull(cuerpo.nota),
          p_file_path: String(cuerpo.path ?? ''),
          p_file_name: textoONull(cuerpo.nombre),
          p_file_mime: textoONull(cuerpo.mime),
          p_file_sha256: textoONull(cuerpo.sha256),
        });
        if (error) return json(400, { error: error.message });
        return json(200, { reporte: { id: (data as { id: string }).id } });
      }

      case 'retirar': {
        const id = String(cuerpo.reporte_id ?? '');
        if (!UUID.test(id)) return json(404, { error: 'No encontrado.' });
        const { error } = await db.rpc('_anular_reporte', { p_company_id: empresa, p_report_id: id });
        if (error) return json(400, { error: error.message });
        return json(200, { ok: true });
      }

      case 'comprobante': {
        const id = String(cuerpo.reporte_id ?? '');
        if (!UUID.test(id)) return json(404, { error: 'No encontrado.' });
        const { data: fila } = await db.from('subscription_payment_reports')
          .select('file_path').eq('id', id).eq('company_id', empresa).maybeSingle();
        if (!fila) return json(404, { error: 'No encontrado.' });
        const { data, error } = await db.storage.from(BUCKET).createSignedUrl(fila.file_path, 300);
        if (error || !data) return json(500, { error: 'No se pudo abrir el comprobante.' });
        return json(200, { url: data.signedUrl });
      }

      case 'factura': {
        const id = String(cuerpo.pago_id ?? '');
        if (!UUID.test(id)) return json(404, { error: 'No encontrado.' });
        const { data: fila } = await db.from('subscription_payments')
          .select('*').eq('id', id).eq('company_id', empresa).maybeSingle();
        if (!fila) return json(404, { error: 'No encontrado.' });
        if (fila.invoice_number == null) return json(404, { error: 'Este pago no tiene factura.' });
        const pago = pagoDesdeFila(fila);
        const doc = crearFactura(jsPDF as unknown as ConstructorPdf, pago);
        return new Response(doc.output('arraybuffer'), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${nombreArchivoFactura(pago)}"`,
          },
        });
      }

      default:
        return json(400, { error: 'Acción desconocida.' });
    }
  } catch (e) {
    console.error('cobro-externo:', e);
    return json(500, { error: 'Error interno.' });
  }
});
```

*Ruling del plan:* la spec dice que el reporte del puente queda con `reported_by_name = 'Anadsll · <etiqueta>'`. Como la etiqueta por defecto ya es "Anadsll", eso daría "Anadsll · Anadsll". Se guarda solo la etiqueta, que Louis escribe al generar la clave. Es lo que ve en Cobros y en el correo de "comprobante recibido".

- [ ] **Step 2: Comprobación local.** Sin Deno instalado no hay `deno check`. El implementador revisa los imports, los nombres de las RPC y de los parámetros contra la Task 2, y que el archivo compartido no use nada de Node ni de Deno.

- [ ] **Step 3: Commit**
```bash
git add supabase/functions/cobro-externo/index.ts
git commit -m "feat(cobros): función cobro-externo para que otro sistema consulte y reporte pagos de su empresa"
```

- [ ] **Step 4: Desplegar (lo hace el controlador).**
  1. Se usa `deploy_edge_function` del MCP de SellAlleS, con `project_id = qwpjclqinruhtxgkrxwr`, `name = cobro-externo`, `verify_jwt = false` y los archivos `cobro-externo/index.ts` y `_shared/factura-suscripcion.ts` con `entrypoint_path = cobro-externo/index.ts`.
  2. Si el MCP no acepta rutas con carpetas, se prueba con `index.ts` y `../_shared/factura-suscripcion.ts`.
  3. Si nada funciona, se para y se le consulta a Louis: no se duplica el módulo.
  4. Comprobación:
```bash
curl -s -X POST "https://qwpjclqinruhtxgkrxwr.supabase.co/functions/v1/cobro-externo" -H "Content-Type: application/json" -d '{"accion":"estado"}'
```
Expected: `{"error":"clave"}` con status 401.

---

### Task 5: "Clave de conexión" en la pantalla de Empresas

**Files (SellAlleS):**
- Create: `src/components/admin/clave-cobro-dialog.tsx`
- Modify: `src/components/admin/companies-data-table.tsx`: la prop `onClaveCobro` y la opción del menú
- Modify: `src/app/(app)/admin/empresas/page.tsx`: el estado y el diálogo

**Interfaces:**
- **Consumes** de la Task 2: las RPC `estado_clave_cobro_externo(p_company_id)`, `generar_clave_cobro_externo(p_company_id, p_etiqueta)` y `revocar_clave_cobro_externo(p_company_id)`. El cliente de Supabase de la app no está tipado, así que `rpc()` devuelve `any`.

- [ ] **Step 1: El diálogo.** `src/components/admin/clave-cobro-dialog.tsx`:
```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { Copy, KeyRound, Loader2 } from 'lucide-react';

interface ClaveCobroDialogProps {
  companyId: string | null;
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EstadoClave {
  activa: boolean;
  etiqueta: string | null;
  creadaEn: string | null;
  ultimoUso: string | null;
}

const fechaHora = (s: string | null) =>
  s ? new Date(s).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Santo_Domingo' }) : '—';

// Panel del super admin: la clave con la que un sistema externo (Anadsll) cobra a ESTA empresa por la
// función cobro-externo. Se ve una sola vez al generarla; la base guarda solo su hash.
export function ClaveCobroDialog({ companyId, companyName, open, onOpenChange }: ClaveCobroDialogProps) {
  const { toast } = useToast();
  const [estado, setEstado] = useState<EstadoClave | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [etiqueta, setEtiqueta] = useState('Anadsll');
  const [claveNueva, setClaveNueva] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!companyId) return;
    setCargando(true);
    const { data, error } = await supabase.rpc('estado_clave_cobro_externo', { p_company_id: companyId });
    setCargando(false);
    if (error) {
      toast({ title: 'No se pudo leer la clave', description: error.message, variant: 'destructive' });
      return;
    }
    const f = (data ?? [])[0];
    setEstado(f
      ? { activa: true, etiqueta: f.etiqueta ?? null, creadaEn: f.creada_en ?? null, ultimoUso: f.ultimo_uso ?? null }
      : { activa: false, etiqueta: null, creadaEn: null, ultimoUso: null });
  }, [companyId, toast]);

  useEffect(() => {
    if (open) {
      setClaveNueva(null);
      void cargar();
    }
  }, [open, cargar]);

  const generar = async () => {
    if (!companyId) return;
    setTrabajando(true);
    const { data, error } = await supabase.rpc('generar_clave_cobro_externo', {
      p_company_id: companyId, p_etiqueta: etiqueta,
    });
    setTrabajando(false);
    if (error) {
      toast({ title: 'No se pudo generar la clave', description: error.message, variant: 'destructive' });
      return;
    }
    setClaveNueva(String(data));
    void cargar();
  };

  const revocar = async () => {
    if (!companyId) return;
    setTrabajando(true);
    const { error } = await supabase.rpc('revocar_clave_cobro_externo', { p_company_id: companyId });
    setTrabajando(false);
    if (error) {
      toast({ title: 'No se pudo revocar la clave', description: error.message, variant: 'destructive' });
      return;
    }
    setClaveNueva(null);
    toast({ title: 'Clave revocada', description: 'El sistema que la usaba ya no puede conectarse.' });
    void cargar();
  };

  const copiar = async () => {
    if (!claveNueva) return;
    try {
      await navigator.clipboard.writeText(claveNueva);
      toast({ title: 'Clave copiada' });
    } catch {
      toast({ title: 'No se pudo copiar', description: 'Selecciónala y cópiala a mano.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Clave de conexión</DialogTitle>
          <DialogDescription>
            Con esta clave, otro sistema (por ejemplo Anadsll) ve la cuenta de {companyName}, sube sus comprobantes y
            descarga sus facturas. Se muestra una sola vez.
          </DialogDescription>
        </DialogHeader>

        {cargando ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 text-sm">
              {estado?.activa ? (
                <>
                  <p className="font-medium">Hay una clave activa{estado.etiqueta ? ` (${estado.etiqueta})` : ''}.</p>
                  <p className="text-muted-foreground">Creada: {fechaHora(estado.creadaEn)} · Último uso: {fechaHora(estado.ultimoUso)}</p>
                </>
              ) : (
                <p className="text-muted-foreground">Esta empresa no tiene una clave activa.</p>
              )}
            </div>

            {claveNueva && (
              <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
                <p className="text-sm font-medium">Copia la clave ahora: no se vuelve a mostrar.</p>
                <div className="flex gap-2">
                  <Input readOnly value={claveNueva} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
                  <Button type="button" variant="outline" onClick={copiar} aria-label="Copiar la clave">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="clave-etiqueta">Nombre de la conexión</Label>
              <Input id="clave-etiqueta" value={etiqueta} maxLength={60} onChange={(e) => setEtiqueta(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {estado?.activa && (
            <Button type="button" variant="destructive" onClick={revocar} disabled={trabajando}>Revocar</Button>
          )}
          <Button type="button" onClick={generar} disabled={trabajando || cargando}>
            {trabajando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {estado?.activa ? 'Generar otra (revoca la actual)' : 'Generar clave'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```
Si `@/components/ui/label` no existiera, se usa el `<label>` que usen los otros diálogos de admin. Hay que mirar `company-modules-dialog.tsx` y los imports de la carpeta `ui`.

- [ ] **Step 2: El menú de la tabla.** En `companies-data-table.tsx`:
  1. A `CompaniesDataTableProps` se le suma `onClaveCobro?: (c: Company) => void;`, junto a `onManagePayments`.
  2. La prop se desestructura en la firma del componente, igual que las demás.
  3. `KeyRound` se agrega al import de `lucide-react`.
  4. Justo después del bloque `{onManagePayments && (…)}` del menú de cada empresa, se agrega:
```tsx
                            {onClaveCobro && (
                              <DropdownMenuItem onClick={() => onClaveCobro(c)}>
                                <KeyRound className="mr-2 h-4 w-4" /> Clave de conexión
                              </DropdownMenuItem>
                            )}
```

- [ ] **Step 3: La página de Empresas.** En `src/app/(app)/admin/empresas/page.tsx`:
  1. Se importa `ClaveCobroDialog` desde `@/components/admin/clave-cobro-dialog`.
  2. Junto a `const [modulesFor, setModulesFor] = …` (línea ~93), se agrega `const [claveFor, setClaveFor] = useState<Company | null>(null);`.
  3. En `<CompaniesDataTable …>` se pasa `onClaveCobro={setClaveFor}`.
  4. Justo después de `<CompanyModulesDialog … />`, se agrega:
```tsx
      <ClaveCobroDialog
        companyId={claveFor?.id ?? null}
        companyName={claveFor?.name ?? ''}
        open={claveFor !== null}
        onOpenChange={(o) => { if (!o) setClaveFor(null); }}
      />
```

- [ ] **Step 4: Comprobaciones y commit.**
```bash
npm run typecheck && npm run lint && npm run build
git add src/components/admin/clave-cobro-dialog.tsx src/components/admin/companies-data-table.tsx "src/app/(app)/admin/empresas/page.tsx"
git commit -m "feat(empresas): generar y revocar la clave de conexión de cobro de una empresa"
```
Los tres comandos deben quedar iguales que la línea base, o mejor.

---

### Task 6: Empresa de prueba y prueba del puente (la hace el controlador)

- [ ] **Step 1: Ver qué columnas exige cada tabla.**
```sql
select table_name, column_name, is_nullable, column_default, udt_name
  from information_schema.columns
 where table_schema = 'public' and table_name in ('companies','branches','subscriptions')
   and is_nullable = 'NO' and column_default is null
 order by table_name, ordinal_position;
select enum_range(null::company_status), enum_range(null::subscription_status);
```
Si los tipos enum tienen otro nombre, se buscan en `udt_name`.

- [ ] **Step 2: Crear la empresa de prueba.** Se ajustan las columnas obligatorias que mostró el Step 1:
```sql
with c as (
  insert into public.companies (name, status, created_at, timezone)
  values ('Prueba Anadsll (Claude)', 'active', now() - interval '35 days', 'America/Santo_Domingo')
  returning id
), b as (
  insert into public.branches (company_id, name, is_active, created_at)
  select id, 'Salón', true, now() - interval '35 days' from c returning company_id
), s as (
  insert into public.subscriptions (company_id, plan_id, status, custom_monthly_price, billing_cycle, started_at)
  select id, null, 'active', 2300, 'monthly', now() - interval '35 days' from c returning company_id
)
select id from c;
```
Ya se sabe esto de la base (2026-10-01):
- `companies.status` es `{trial, active, suspended}` y `subscriptions.status` es `{trial, active, past_due, canceled}`;
- `subscriptions` no tiene índice único por empresa;
- `companies` tiene disparadores al insertar (`seed_system_roles`, `companies_prueba_por_defecto`, `trg_before_save_company_is_demo`, …) y `branches` tiene `trg_lock_cuota_mensual_insert`. No se toca `cuota_mensual` de la sucursal.

Después de insertar, se anota qué filas crearon esos disparadores (roles, por ejemplo), para que la limpieza de la Task 12 las borre o compruebe que se van en cascada con la empresa.
- [ ] **Step 3: La clave de prueba.**
  1. Se genera en la terminal sin mostrarla: `node -e "console.log('cobro_' + require('crypto').randomBytes(32).toString('base64url'))"`. Se guarda en una variable de la sesión, nunca en un archivo del repo.
  2. Se inserta el hash:
```sql
insert into public.claves_cobro_externo (company_id, clave_hash, etiqueta)
values ('<id de la empresa>', encode(extensions.digest('<clave>', 'sha256'), 'hex'), 'Anadsll (prueba)');
```
- [ ] **Step 4: Probar el puente con curl.**
  1. `estado`: devuelve el nombre, una cuenta con deuda (`cuenta.estado` en `nunca_pago` o `atrasada`, según cómo cuente `_cuenta_de_suscripcion` 35 días sin pagos), `bancos` y listas vacías de reportes y pagos. Se anota el `saldo` y las `cuotas_pendientes` que da, para la Task 12.
  2. Una clave inventada: 401.
  3. `subida` con `mime: "text/plain"`: 400 "El comprobante tiene que ser una foto o un PDF.".
  4. `subida` con `image/png` y `tamano: 1200`: devuelve `path` y `token`. Después se sube un PNG chico:
```bash
curl -s -X PUT "$URL/storage/v1/object/upload/sign/comprobantes-de-pago/$RUTA?token=$TOKEN" \
  -H "apikey: $APIKEY" -H "Authorization: Bearer $APIKEY" -H "Content-Type: image/png" --data-binary @prueba.png
```
  5. `reportar` con ese path, un sha256 inventado (`"a1…"`, 64 caracteres hex), `monto 2300` y la fecha de hoy:
     - devuelve `{ reporte: { id } }`;
     - a Louis le llega el correo "comprobante recibido". Avisarle antes.
  6. `reportar` otra vez con el mismo sha256: 400 "Ese comprobante ya lo enviaste antes.".
  7. `comprobante` con ese id: un enlace firmado que abre el PNG.
  8. `retirar` con ese id: `{ ok: true }`. Una segunda vez: 400 "Solo se puede retirar un comprobante que todavía está por confirmar.".
  9. `estado` otra vez: el reporte figura como `anulado`.
- [ ] **Step 5: Abrir el PR de SellAlleS.**
  1. `git push -u origin claude/cobro-externo`.
  2. `gh pr create --repo louisx2/SellAlleS-WEB --base main` con el título "Cobro externo: claves de conexión, factura compartida y función cobro-externo".
  3. El cuerpo cuenta qué trae, qué ya está aplicado en la base (migración y función) y cómo se probó, y termina con la línea de Claude Code.
  4. La empresa de prueba **sigue** viva para la Parte B y se borra en la Task 12.

---

## Parte B — Anadsll

### Task 7: La conexión en Vault y la función `mi-suscripcion` (el implementador escribe; el controlador aplica y despliega)

**Files (Anadsll, `vscode/`):**
- Create: `vscode/supabase/migration_conexion_sellalles.sql`
- Create: `vscode/supabase/functions/mi-suscripcion/index.ts`

**Interfaces:**
- **Consumes:**
  - de la Task 4, el contrato de `cobro-externo`;
  - `public.staff_role()`, que ya existe: devuelve el rol de `staff` por el correo del JWT, o null.
- **Produces:** las Tasks 9 a 11 llaman a `POST {VITE_SUPABASE_URL}/functions/v1/mi-suscripcion` con `Authorization: Bearer <sesión>`, `apikey` y el mismo cuerpo `{ accion, … }` que el puente, y reciben la misma respuesta. Además:
  - responde `403 { error: 'no autorizado' }` si quien llama no es admin;
  - responde `503 { error: 'sin conexion' }` si falta la conexión, SellAlleS no responde o la clave es mala;
  - acepta por CORS solo `https://anadsllbeautyesthetic.com` (con o sin `www.`), `localhost` y las IP de la red de la casa (192.168.x.x y 10.x.x.x, para probar desde el teléfono), en cualquier puerto, y expone `Content-Disposition`.

- [ ] **Step 1: La migración.** `vscode/supabase/migration_conexion_sellalles.sql`:
```sql
-- Cobro del sistema (SellAlleS): la dirección del proyecto y la clave de conexión viven en Vault, nunca en el
-- repo ni en el navegador. Solo las lee la función mi-suscripcion con service role.
create or replace function public._conexion_sellalles()
returns table (url text, clave text)
language sql
stable
security definer
set search_path = ''
as $$
  select (select decrypted_secret from vault.decrypted_secrets where name = 'sellalles_url' limit 1),
         (select decrypted_secret from vault.decrypted_secrets where name = 'sellalles_clave_cobro' limit 1)
$$;

revoke all on function public._conexion_sellalles() from public, anon, authenticated;
grant execute on function public._conexion_sellalles() to service_role;
```

- [ ] **Step 2: La función.** `vscode/supabase/functions/mi-suscripcion/index.ts`:
```ts
// Mi suscripción: el panel de Anadsll habla con el cobro de SellAlleS a través de aquí.
//
// Solo deja pasar a la administración del salón (public.staff_role() = 'admin', por el correo de la sesión).
// La dirección de SellAlleS y la clave de conexión salen de Vault (_conexion_sellalles) y nunca llegan al
// navegador. Cada acción se reenvía tal cual a la función cobro-externo de SellAlleS y su respuesta se devuelve
// igual (también el PDF de la factura). Si falta la conexión, SellAlleS no responde o la clave fue revocada, el
// panel recibe 503 "sin conexion": para la dueña es lo mismo, y el resto del panel sigue funcionando.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const ACCIONES = new Set(['estado', 'subida', 'reportar', 'retirar', 'comprobante', 'factura']);

// El panel en su dominio y en desarrollo: localhost, o la red de la casa cuando Louis prueba desde el teléfono
// (el servidor local corre con --host y se abre por la IP de la computadora).
const ORIGENES =
  /^(https:\/\/(www\.)?anadsllbeautyesthetic\.com|http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?)$/;

function corsPara(req: Request): Record<string, string> {
  const origen = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGENES.test(origen) ? origen : 'https://anadsllbeautyesthetic.com',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Expose-Headers': 'content-disposition',
    Vary: 'Origin',
  };
}

Deno.serve(async (req) => {
  const cors = corsPara(req);
  const json = (status: number, cuerpo: unknown) =>
    new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido.' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const usuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: rol, error: errorRol } = await usuario.rpc('staff_role');
  if (errorRol || rol !== 'admin') return json(403, { error: 'no autorizado' });

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await req.json();
  } catch {
    return json(400, { error: 'Cuerpo inválido.' });
  }
  if (!ACCIONES.has(String(cuerpo.accion))) return json(400, { error: 'Acción desconocida.' });

  const servicio = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: filas } = await servicio.rpc('_conexion_sellalles');
  const conexion = (filas ?? [])[0] as { url: string | null; clave: string | null } | undefined;
  if (!conexion?.url || !conexion?.clave) return json(503, { error: 'sin conexion' });

  let respuesta: Response;
  try {
    respuesta = await fetch(`${conexion.url}/functions/v1/cobro-externo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-clave-cobro': conexion.clave },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return json(503, { error: 'sin conexion' });
  }
  if (respuesta.status === 401 || respuesta.status >= 500) {
    console.error('mi-suscripcion: SellAlleS respondió', respuesta.status);
    return json(503, { error: 'sin conexion' });
  }

  const headers = new Headers(cors);
  headers.set('Content-Type', respuesta.headers.get('Content-Type') ?? 'application/json');
  const disposicion = respuesta.headers.get('Content-Disposition');
  if (disposicion) headers.set('Content-Disposition', disposicion);
  return new Response(respuesta.body, { status: respuesta.status, headers });
});
```

- [ ] **Step 3: Commit** (el implementador)
```bash
git add vscode/supabase/migration_conexion_sellalles.sql vscode/supabase/functions/mi-suscripcion/index.ts
git commit -m "feat(suscripcion): función mi-suscripcion y conexión con SellAlleS en Vault"
```

- [ ] **Step 4: Aplicar y desplegar (el controlador, con el MCP de Anadsll).**
  1. `select count(*) from vault.secrets;` debe responder; Vault está activo.
  2. Se aplica la migración: `apply_migration`, con el nombre `conexion_sellalles` y ese SQL.
  3. Se crean los secretos, sin dejar la clave en el ledger:
```sql
select vault.create_secret('https://qwpjclqinruhtxgkrxwr.supabase.co', 'sellalles_url', 'SellAlleS: dirección del proyecto');
select vault.create_secret('<clave de prueba de la Task 6>', 'sellalles_clave_cobro', 'SellAlleS: clave de conexión de cobro');
```
  4. Se despliega con `deploy_edge_function`: `name = mi-suscripcion`, `verify_jwt = true` y el archivo `index.ts`.
  5. Comprobaciones:
```bash
curl -s -o /dev/null -w "%{http_code}" -X POST "https://lrcbucfaipazjoxtussc.supabase.co/functions/v1/mi-suscripcion" -d '{"accion":"estado"}'
```
     - sin sesión debe dar 401;
     - con una sesión de admin, en la Task 12 desde el panel, debe responder el estado de la empresa de prueba.

---

### Task 8: Lógica pura de la suscripción (estado, banner, textos y validación)

**Files (Anadsll):**
- Create: `vscode/src/lib/suscripcion.ts`
- Test: `vscode/tests/suscripcion.test.ts`

**Interfaces:**
- **Produces:**
  - **Tipos:**
    - `EstadoCobro`, `EstadoReporte` y `MetodoPago`;
    - `CuentaSuscripcion`, `BancoSuscripcion`, `ReporteSuscripcion` y `PagoSuscripcion`, con las formas exactas del contrato de la Task 4;
    - `Aviso { tono: 'rojo' | 'ambar' | 'azul'; titulo; detalle; ocultable; clave }`;
    - `ErroresReporte { monto?; fecha?; banco?; archivo? }`.
  - **Funciones:**
    - `cuentaDesdeJson(j: unknown): CuentaSuscripcion`;
    - `montoProximaCuota(c)` y `montoSugerido(c)`;
    - `avisoDeCuota(c: CuentaSuscripcion | null): Aviso | null`;
    - `dinero(n)`, `fechaLarga(iso | null)`, `hoySantoDomingo(ahora: Date)` y `cuotasPendientesTexto(n)`;
    - `validarReporte(d): ErroresReporte`.
  - **Constantes:**
    - `ESTADO_CUENTA: Record<EstadoCobro, { texto; tono: 'ok' | 'ambar' | 'rojo' | 'azul' | 'neutro' }>`;
    - `ESTADO_REPORTE: Record<EstadoReporte, { texto; tono }>` y `METODO_PAGO`;
    - `TIPOS_COMPROBANTE` y `TAMANO_MAXIMO`.

- [ ] **Step 1: Escribir las pruebas.** `vscode/tests/suscripcion.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ESTADO_REPORTE, avisoDeCuota, cuentaDesdeJson, cuotasPendientesTexto, dinero, fechaLarga, hoySantoDomingo,
  montoProximaCuota, montoSugerido, validarReporte,
} from '../src/lib/suscripcion.ts';

const base = (extra: Record<string, unknown> = {}) => cuentaDesdeJson({
  estado: 'al_dia', dias: null, mensual: 2300, monto_periodo: 2300, saldo: -2300, cuotas_pendientes: 0,
  debe_desde: null, proximo_cobro: '2026-10-25', por_confirmar: 0, comprobantes_por_confirmar: 0,
  cuentas: [{ nombre: 'Toda la empresa', cuota: 2300, proxima_cuota: '2026-10-25' }],
  ...extra,
});
const ver = (a: ReturnType<typeof avisoDeCuota>) => a && { tono: a.tono, titulo: a.titulo, detalle: a.detalle, ocultable: a.ocultable };

test('montos, fechas y cuotas en texto', () => {
  assert.equal(dinero(2300), 'RD$ 2,300');
  assert.equal(dinero(1150.5), 'RD$ 1,150.50');
  assert.equal(dinero(0), 'RD$ 0');
  assert.equal(fechaLarga('2026-10-05'), '5 de octubre');
  assert.equal(fechaLarga(null), '');
  assert.equal(hoySantoDomingo(new Date('2026-10-01T03:30:00Z')), '2026-09-30');
  assert.equal(cuotasPendientesTexto(1), '1 cuota pendiente');
  assert.equal(cuotasPendientesTexto(2), '2 cuotas pendientes');
});

test('la cuenta desde el json de SellAlleS: números como texto y valores que faltan', () => {
  const c = cuentaDesdeJson({ estado: 'atrasada', saldo: '4600', cuotas_pendientes: '2' });
  assert.equal(c.estado, 'atrasada');
  assert.equal(c.saldo, 4600);
  assert.equal(c.cuotasPendientes, 2);
  assert.equal(c.mensual, 0);
  assert.deepEqual(c.cuentas, []);
  assert.equal(cuentaDesdeJson(null).estado, 'sin_tarifa');
});

test('al día, sin tarifa o sin datos: no hay aviso', () => {
  assert.equal(avisoDeCuota(base()), null);
  assert.equal(avisoDeCuota(base({ estado: 'sin_tarifa' })), null);
  assert.equal(avisoDeCuota(null), null);
});

test('atrasada o nunca pagó: rojo y no se puede cerrar', () => {
  assert.deepEqual(ver(avisoDeCuota(base({ estado: 'atrasada', saldo: 4600, cuotas_pendientes: 2, debe_desde: '2026-09-05' }))), {
    tono: 'rojo', ocultable: false,
    titulo: 'Tienes 2 cuotas pendientes: RD$ 4,600',
    detalle: 'Desde el 5 de septiembre. Transfiere y sube el comprobante en Mi suscripción.',
  });
  assert.equal(avisoDeCuota(base({ estado: 'nunca_pago', saldo: 2300, cuotas_pendientes: 1, debe_desde: '2026-09-25' }))?.tono, 'rojo');
});

test('comprobante en revisión: azul si cubre la deuda; rojo con lo que falta si no', () => {
  const cubre = avisoDeCuota(base({ estado: 'atrasada', saldo: 2300, cuotas_pendientes: 1, debe_desde: '2026-09-25', por_confirmar: 2300, comprobantes_por_confirmar: 1 }));
  assert.deepEqual(ver(cubre), {
    tono: 'azul', ocultable: true,
    titulo: 'Estamos revisando tu comprobante de RD$ 2,300',
    detalle: 'Cuando confirmemos que llegó a la cuenta te llega la factura por correo.',
  });
  assert.equal(cubre?.clave, 'revision:1');
  const parcial = avisoDeCuota(base({ estado: 'atrasada', saldo: 4600, cuotas_pendientes: 2, debe_desde: '2026-09-05', por_confirmar: 2300, comprobantes_por_confirmar: 1 }));
  assert.equal(parcial?.tono, 'rojo');
  assert.equal(parcial?.detalle, 'Recibimos un comprobante de RD$ 2,300 y lo estamos revisando; aún faltarían RD$ 2,300.');
  assert.equal(avisoDeCuota(base({ por_confirmar: 2300, comprobantes_por_confirmar: 1 }))?.tono, 'azul');
});

test('por vencer: ámbar, se puede ocultar por hoy', () => {
  const tres = avisoDeCuota(base({ estado: 'por_vencer', dias: 3 }));
  assert.deepEqual(ver(tres), {
    tono: 'ambar', ocultable: true,
    titulo: 'Tu próxima cuota de RD$ 2,300 vence el 25 de octubre',
    detalle: 'En 3 días. Cuando transfieras, sube el comprobante en Mi suscripción.',
  });
  assert.equal(tres?.clave, 'vence:2026-10-25');
  assert.equal(avisoDeCuota(base({ estado: 'por_vencer', dias: 1 }))?.detalle, 'En 1 día. Cuando transfieras, sube el comprobante en Mi suscripción.');
  const hoy = avisoDeCuota(base({ estado: 'por_vencer', dias: 0 }));
  assert.equal(hoy?.titulo, 'Tu cuota de RD$ 2,300 vence hoy');
  assert.equal(hoy?.detalle, 'Transfiere y sube el comprobante en Mi suscripción.');
});

test('prueba, prueba vencida y cuenta suspendida', () => {
  assert.equal(avisoDeCuota(base({ estado: 'prueba', dias: 10 })), null);
  assert.equal(avisoDeCuota(base({ estado: 'prueba', dias: 2 }))?.titulo, 'Tu prueba termina en 2 días');
  assert.equal(avisoDeCuota(base({ estado: 'prueba', dias: 0 }))?.titulo, 'Tu prueba termina hoy');
  const vencida = avisoDeCuota(base({ estado: 'prueba_vencida', dias: -3 }));
  assert.deepEqual([vencida?.tono, vencida?.ocultable, vencida?.titulo], ['rojo', false, 'Tu período de prueba terminó']);
  assert.equal(avisoDeCuota(base({ estado: 'suspendida' }))?.titulo, 'Tu suscripción está suspendida');
});

test('monto de la próxima cuota y monto sugerido para pagar', () => {
  assert.equal(montoProximaCuota(base()), 2300);
  assert.equal(montoProximaCuota(base({ cuentas: [
    { nombre: 'Uno', cuota: 1500, proxima_cuota: '2026-10-25' },
    { nombre: 'Dos', cuota: 800, proxima_cuota: '2026-10-25' },
    { nombre: 'Tres', cuota: 900, proxima_cuota: '2026-11-02' },
  ] })), 2300);
  assert.equal(montoProximaCuota(base({ cuentas: [] })), 2300);
  assert.equal(montoSugerido(base({ saldo: 4600 })), 4600);
  assert.equal(montoSugerido(base()), 2300);
});

test('validar el reporte de pago antes de subir nada', () => {
  const ok = { monto: 2300, fecha: '2026-10-05', hoy: '2026-10-05', bancos: 1, bancoId: '', archivo: { tipo: 'image/jpeg', nombre: 'captura.jpg', tamano: 300_000 } };
  assert.deepEqual(validarReporte(ok), {});
  assert.equal(validarReporte({ ...ok, monto: 0 }).monto, 'Escribe un monto mayor que cero.');
  assert.equal(validarReporte({ ...ok, monto: Number.NaN }).monto, 'Escribe un monto mayor que cero.');
  assert.equal(validarReporte({ ...ok, fecha: '' }).fecha, 'Elige la fecha de la transferencia.');
  assert.equal(validarReporte({ ...ok, fecha: '2026-10-06' }).fecha, 'La fecha del pago no puede ser futura.');
  assert.equal(validarReporte({ ...ok, bancos: 2 }).banco, 'Elige la cuenta a la que transferiste.');
  assert.deepEqual(validarReporte({ ...ok, bancos: 2, bancoId: 'b1' }), {});
  assert.equal(validarReporte({ ...ok, archivo: null }).archivo, 'Adjunta el comprobante (foto o PDF).');
  assert.equal(validarReporte({ ...ok, archivo: { tipo: 'text/plain', nombre: 'nota.txt', tamano: 10 } }).archivo, 'El comprobante tiene que ser una foto o un PDF.');
  assert.equal(validarReporte({ ...ok, archivo: { tipo: 'application/pdf', nombre: 'r.pdf', tamano: 11 * 1024 * 1024 } }).archivo, 'El PDF pesa más de 10 MB.');
  // una foto grande se comprime antes de subir; solo una exagerada se rechaza de entrada
  assert.deepEqual(validarReporte({ ...ok, archivo: { tipo: 'image/jpeg', nombre: 'foto.jpg', tamano: 12 * 1024 * 1024 } }), {});
  assert.equal(validarReporte({ ...ok, archivo: { tipo: 'image/jpeg', nombre: 'foto.jpg', tamano: 31 * 1024 * 1024 } }).archivo, 'La foto pesa demasiado. Prueba con una captura de pantalla.');
  // HEIC del iPhone: a veces llega sin tipo, solo con el nombre
  assert.deepEqual(validarReporte({ ...ok, archivo: { tipo: '', nombre: 'IMG_0001.HEIC', tamano: 2_000_000 } }), {});
});

test('estados de los comprobantes en palabras', () => {
  assert.equal(ESTADO_REPORTE.por_confirmar.texto, 'En revisión');
  assert.equal(ESTADO_REPORTE.confirmado.texto, 'Confirmado');
  assert.equal(ESTADO_REPORTE.rechazado.texto, 'Rechazado');
  assert.equal(ESTADO_REPORTE.anulado.texto, 'Retirado');
});
```

- [ ] **Step 2:** Run `cd vscode && npm test`. Expected: FAIL, porque el módulo no existe.

- [ ] **Step 3: Escribir el módulo.** `vscode/src/lib/suscripcion.ts`:
```ts
// Mi suscripción (el pago mensual del sistema, que se cobra en SellAlleS). Lo que se muestra se decide aquí:
// el estado de la cuenta, el aviso del banner (la misma lógica que avisoDeCuota de SellAlleS), los textos y la
// validación del formulario. Puro: se prueba con Node.

export type EstadoCobro =
  | 'atrasada' | 'nunca_pago' | 'prueba_vencida' | 'por_vencer' | 'prueba' | 'al_dia' | 'sin_tarifa' | 'suspendida';
export type EstadoReporte = 'por_confirmar' | 'confirmado' | 'rechazado' | 'anulado';
export type MetodoPago = 'transfer' | 'cash' | 'card' | 'other';

export interface CuentaSuscripcion {
  estado: EstadoCobro;
  /** atraso (negativo) o días para la próxima cuota; en prueba, días para el fin de la prueba */
  dias: number | null;
  mensual: number;
  montoPeriodo: number;
  /** positivo = debe; negativo = saldo a favor */
  saldo: number;
  cuotasPendientes: number;
  debeDesde: string | null;
  proximoCobro: string | null;
  porConfirmar: number;
  comprobantesPorConfirmar: number;
  cuentas: { nombre: string; cuota: number; proximaCuota: string | null }[];
}

export interface BancoSuscripcion {
  id: string; banco: string; tipo: 'ahorro' | 'corriente'; numero: string; titular: string;
  documento: string | null; moneda: 'DOP' | 'USD';
}
export interface ReporteSuscripcion {
  id: string; monto: number; fecha: string; banco: string | null; referencia: string | null; nota: string | null;
  estado: EstadoReporte; motivo: string | null; archivo: string | null; creado: string;
}
export interface PagoSuscripcion {
  id: string; monto: number; fecha: string; metodo: MetodoPago; referencia: string | null; desde: string | null;
  hasta: string | null; plan: string | null; codigo: string; tieneFactura: boolean;
}

const ESTADOS: EstadoCobro[] = ['atrasada', 'nunca_pago', 'prueba_vencida', 'por_vencer', 'prueba', 'al_dia', 'sin_tarifa', 'suspendida'];
const num = (v: unknown, def = 0): number => {
  const n = Number(v);
  return v == null || Number.isNaN(n) ? def : n;
};
const texto = (v: unknown): string | null => (v == null || v === '' ? null : String(v));

/** El jsonb de _cuenta_de_suscripcion (SellAlleS) → lo que usa el panel. */
export function cuentaDesdeJson(j: unknown): CuentaSuscripcion {
  const o = (j && typeof j === 'object' ? j : {}) as Record<string, unknown>;
  const estado = ESTADOS.includes(o.estado as EstadoCobro) ? (o.estado as EstadoCobro) : 'sin_tarifa';
  return {
    estado,
    dias: o.dias == null ? null : num(o.dias),
    mensual: num(o.mensual),
    montoPeriodo: num(o.monto_periodo),
    saldo: num(o.saldo),
    cuotasPendientes: num(o.cuotas_pendientes),
    debeDesde: texto(o.debe_desde),
    proximoCobro: texto(o.proximo_cobro),
    porConfirmar: num(o.por_confirmar),
    comprobantesPorConfirmar: num(o.comprobantes_por_confirmar),
    cuentas: (Array.isArray(o.cuentas) ? o.cuentas : []).map((c: Record<string, unknown>) => ({
      nombre: String(c.nombre ?? ''),
      cuota: num(c.cuota),
      proximaCuota: texto(c.proxima_cuota),
    })),
  };
}

/** Lo que toca en la próxima cuota: las cuotas que vencen ese día (igual que SellAlleS). */
export function montoProximaCuota(c: CuentaSuscripcion): number {
  const delDia = c.cuentas.filter((x) => x.proximaCuota && x.proximaCuota === c.proximoCobro).reduce((a, x) => a + x.cuota, 0);
  return delDia > 0 ? delDia : (c.cuentas[0]?.cuota ?? c.montoPeriodo);
}

/** El monto que se propone al reportar: lo que debe; si no debe, la próxima cuota. */
export function montoSugerido(c: CuentaSuscripcion): number {
  return c.saldo > 0 ? Math.round(c.saldo * 100) / 100 : montoProximaCuota(c);
}

/** "RD$ 2,300" o "RD$ 1,150.50". */
export function dinero(n: number): string {
  const conDecimales = Math.round(n * 100) % 100 !== 0;
  return `RD$ ${n.toLocaleString('en-US', { minimumFractionDigits: conDecimales ? 2 : 0, maximumFractionDigits: 2 })}`;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "2026-10-05" → "5 de octubre", sin pasar por Date (así la zona horaria no corre el día). */
export function fechaLarga(iso: string | null): string {
  if (!iso) return '';
  const [, m, d] = iso.slice(0, 10).split('-').map(Number);
  return m && d ? `${d} de ${MESES[m - 1]}` : '';
}

/** La fecha de hoy en Santo Domingo (UTC−4 todo el año), "AAAA-MM-DD". */
export function hoySantoDomingo(ahora: Date): string {
  return new Date(ahora.getTime() - 4 * 3_600_000).toISOString().slice(0, 10);
}

export function cuotasPendientesTexto(n: number): string {
  return `${n} ${n === 1 ? 'cuota pendiente' : 'cuotas pendientes'}`;
}

export interface Aviso {
  tono: 'rojo' | 'ambar' | 'azul';
  titulo: string;
  detalle: string;
  /** el rojo nunca se puede cerrar; el ámbar y el azul se ocultan por hoy */
  ocultable: boolean;
  /** con la fecha, recuerda que se ocultó hoy este aviso (uno nuevo vuelve a salir) */
  clave: string;
}

/** El banner del panel. Misma lógica que avisoDeCuota de SellAlleS, sin el "solo ventas" (aquí no se bloquea),
 *  más la cuenta suspendida y la prueba que termina. */
export function avisoDeCuota(c: CuentaSuscripcion | null): Aviso | null {
  if (!c) return null;
  const debe = c.estado === 'atrasada' || c.estado === 'nunca_pago';
  const enRevision = c.comprobantesPorConfirmar > 0;

  if (c.estado === 'suspendida') {
    return { tono: 'rojo', ocultable: false, clave: 'suspendida', titulo: 'Tu suscripción está suspendida', detalle: 'Escríbenos para reactivarla.' };
  }
  if (c.estado === 'prueba_vencida') {
    return {
      tono: 'rojo', ocultable: false, clave: 'prueba-vencida', titulo: 'Tu período de prueba terminó',
      detalle: 'Transfiere la primera cuota y sube el comprobante en Mi suscripción.',
    };
  }
  if (enRevision && (!debe || c.porConfirmar + 0.005 >= c.saldo)) {
    return {
      tono: 'azul', ocultable: true, clave: `revision:${c.comprobantesPorConfirmar}`,
      titulo: `Estamos revisando tu comprobante de ${dinero(c.porConfirmar)}`,
      detalle: 'Cuando confirmemos que llegó a la cuenta te llega la factura por correo.',
    };
  }
  if (debe) {
    return {
      tono: 'rojo', ocultable: false, clave: 'debe',
      titulo: `Tienes ${cuotasPendientesTexto(c.cuotasPendientes)}: ${dinero(c.saldo)}`,
      detalle: enRevision
        ? `Recibimos un comprobante de ${dinero(c.porConfirmar)} y lo estamos revisando; aún faltarían ${dinero(c.saldo - c.porConfirmar)}.`
        : `Desde el ${fechaLarga(c.debeDesde)}. Transfiere y sube el comprobante en Mi suscripción.`,
    };
  }
  if (c.estado === 'por_vencer' && c.dias != null) {
    return {
      tono: 'ambar', ocultable: true, clave: `vence:${c.proximoCobro}`,
      titulo: c.dias === 0
        ? `Tu cuota de ${dinero(montoProximaCuota(c))} vence hoy`
        : `Tu próxima cuota de ${dinero(montoProximaCuota(c))} vence el ${fechaLarga(c.proximoCobro)}`,
      detalle: c.dias === 0
        ? 'Transfiere y sube el comprobante en Mi suscripción.'
        : `En ${c.dias} ${c.dias === 1 ? 'día' : 'días'}. Cuando transfieras, sube el comprobante en Mi suscripción.`,
    };
  }
  if (c.estado === 'prueba' && c.dias != null && c.dias <= 7) {
    return {
      tono: 'ambar', ocultable: true, clave: `prueba:${c.dias}`,
      titulo: c.dias <= 0 ? 'Tu prueba termina hoy' : `Tu prueba termina en ${c.dias} ${c.dias === 1 ? 'día' : 'días'}`,
      detalle: 'Para seguir usando el sistema, transfiere la primera cuota y sube el comprobante en Mi suscripción.',
    };
  }
  return null;
}

export const ESTADO_CUENTA: Record<EstadoCobro, { texto: string; tono: 'ok' | 'ambar' | 'rojo' | 'azul' | 'neutro' }> = {
  al_dia: { texto: 'Al día', tono: 'ok' },
  por_vencer: { texto: 'Por vencer', tono: 'ambar' },
  atrasada: { texto: 'Atrasada', tono: 'rojo' },
  nunca_pago: { texto: 'Pendiente de pago', tono: 'rojo' },
  prueba: { texto: 'En prueba', tono: 'azul' },
  prueba_vencida: { texto: 'Prueba vencida', tono: 'rojo' },
  sin_tarifa: { texto: 'Sin tarifa', tono: 'neutro' },
  suspendida: { texto: 'Suspendida', tono: 'rojo' },
};

export const ESTADO_REPORTE: Record<EstadoReporte, { texto: string; tono: 'ambar' | 'ok' | 'rojo' | 'neutro' }> = {
  por_confirmar: { texto: 'En revisión', tono: 'ambar' },
  confirmado: { texto: 'Confirmado', tono: 'ok' },
  rechazado: { texto: 'Rechazado', tono: 'rojo' },
  anulado: { texto: 'Retirado', tono: 'neutro' },
};

export const METODO_PAGO: Record<MetodoPago, string> = {
  transfer: 'Transferencia', cash: 'Efectivo', card: 'Tarjeta', other: 'Otro',
};

/** Lo mismo que acepta el bucket de comprobantes de SellAlleS. */
export const TIPOS_COMPROBANTE = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
export const TAMANO_MAXIMO = 10 * 1024 * 1024;
/** Una foto se comprime antes de subir; de entrada solo se rechaza una exagerada. */
const FOTO_MAXIMA_SIN_COMPRIMIR = 30 * 1024 * 1024;

export interface ErroresReporte { monto?: string; fecha?: string; banco?: string; archivo?: string }

export function validarReporte(d: {
  monto: number; fecha: string; hoy: string; bancos: number; bancoId: string;
  archivo: { tipo: string; nombre: string; tamano: number } | null;
}): ErroresReporte {
  const e: ErroresReporte = {};
  if (!(d.monto > 0)) e.monto = 'Escribe un monto mayor que cero.';
  if (!d.fecha) e.fecha = 'Elige la fecha de la transferencia.';
  else if (d.fecha > d.hoy) e.fecha = 'La fecha del pago no puede ser futura.';
  if (d.bancos > 1 && !d.bancoId) e.banco = 'Elige la cuenta a la que transferiste.';
  if (!d.archivo) {
    e.archivo = 'Adjunta el comprobante (foto o PDF).';
  } else {
    const esPdf = d.archivo.tipo === 'application/pdf' || /\.pdf$/i.test(d.archivo.nombre);
    const esFoto = d.archivo.tipo.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp)$/i.test(d.archivo.nombre);
    if (!esPdf && !esFoto) e.archivo = 'El comprobante tiene que ser una foto o un PDF.';
    else if (esPdf && d.archivo.tamano > TAMANO_MAXIMO) e.archivo = 'El PDF pesa más de 10 MB.';
    else if (esFoto && d.archivo.tamano > FOTO_MAXIMA_SIN_COMPRIMIR) e.archivo = 'La foto pesa demasiado. Prueba con una captura de pantalla.';
  }
  return e;
}
```
`dinero` usa `en-US` para tener siempre `2,300.50`, con coma de miles y punto decimal, como en las facturas. `es-DO` depende del ICU de cada navegador.

- [ ] **Step 4:** Run `cd vscode && npm test`. Expected: PASS con **125** (115 + 10).

- [ ] **Step 5: Commit**
```bash
cd vscode && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"   # 39
git add src/lib/suscripcion.ts tests/suscripcion.test.ts
git commit -m "feat(suscripcion): estado de la cuenta, aviso del banner, textos y validación del pago"
```

---

### Task 9: El cliente de la función y la subida del comprobante

**Files (Anadsll):**
- Create: `vscode/src/lib/suscripcionApi.ts`
- Modify: `vscode/src/lib/fotos.ts`: `reducirFoto` acepta el lado máximo y la calidad
- Create: `vscode/src/store/suscripcionStore.ts`

**Interfaces:**
- **Consumes:** de la Task 8, `cuentaDesdeJson`, los tipos y `TAMANO_MAXIMO`; de la Task 7, el contrato.
- **Produces:**
  - **De `suscripcionApi.ts`:**
    - `class ErrorSuscripcion extends Error { sinConexion: boolean }`;
    - `interface DatosSuscripcion { empresa; cuenta; bancos; reportes; pagos }`;
    - `cargarSuscripcion(): Promise<DatosSuscripcion>`;
    - `reportarPago(d: { monto; fecha; bancoId: string | null; referencia; nota; archivo: File }): Promise<void>`;
    - `retirarReporte(id: string): Promise<void>`;
    - `urlComprobante(id: string): Promise<string>`;
    - `obtenerFactura(pagoId: string): Promise<{ blob: Blob; nombre: string }>`.
  - **El store:** `useSuscripcionStore` con `{ cuenta: CuentaSuscripcion | null; setCuenta(c); cargarCuenta(forzar?: boolean): Promise<void> }`, con una caché de 15 minutos.

- [ ] **Step 1: `reducirFoto` con parámetros.** En `vscode/src/lib/fotos.ts`:
  1. La firma pasa a ser `export async function reducirFoto(archivo: File, maximo = LADO_MAXIMO_FOTO, calidad = 0.82): Promise<File>`.
  2. Dentro, `medidaReducida(bitmap.width, bitmap.height)` pasa a `medidaReducida(bitmap.width, bitmap.height, maximo)` y `lienzo.toBlob(resolver, 'image/jpeg', 0.82)` pasa a `lienzo.toBlob(resolver, 'image/jpeg', calidad)`.
  3. El comentario de la función suma: "(los comprobantes de pago usan 2000 px y 0.85 para que el número de referencia se lea)".

  Los que ya la usan (Equipo) no cambian.

- [ ] **Step 2: El cliente.** `vscode/src/lib/suscripcionApi.ts`:
```ts
// Habla con la función mi-suscripcion (que a su vez habla con el cobro de SellAlleS). Nunca ve la clave de
// conexión. El comprobante se sube directo al almacenamiento de SellAlleS con el permiso de un solo uso que
// entrega el puente; la huella (sha-256) se saca del archivo ORIGINAL, así el mismo comprobante enviado dos
// veces se reconoce aunque se comprima distinto.
import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { reducirFoto } from './fotos';
import {
  TAMANO_MAXIMO, cuentaDesdeJson,
  type BancoSuscripcion, type CuentaSuscripcion, type PagoSuscripcion, type ReporteSuscripcion,
} from './suscripcion';

export class ErrorSuscripcion extends Error {
  readonly sinConexion: boolean;
  constructor(mensaje: string, sinConexion = false) {
    super(mensaje);
    this.sinConexion = sinConexion;
  }
}

export interface DatosSuscripcion {
  empresa: string;
  cuenta: CuentaSuscripcion;
  bancos: BancoSuscripcion[];
  reportes: ReporteSuscripcion[];
  pagos: PagoSuscripcion[];
}

const URL_FUNCION = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mi-suscripcion`;

async function llamar(cuerpo: Record<string, unknown>): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ErrorSuscripcion('Tu sesión terminó. Vuelve a entrar al panel.');
  let r: Response;
  try {
    r = await fetch(URL_FUNCION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorSuscripcion('No pudimos conectar. Revisa tu internet e intenta de nuevo.', true);
  }
  if (r.ok) return r;
  let mensaje = '';
  try { mensaje = String((await r.json())?.error ?? ''); } catch { /* sin cuerpo */ }
  if (r.status === 503 || mensaje === 'sin conexion') throw new ErrorSuscripcion('No pudimos cargar tu suscripción ahora.', true);
  if (r.status === 403 || r.status === 401) throw new ErrorSuscripcion('Solo la administración puede ver la suscripción.');
  throw new ErrorSuscripcion(mensaje || 'Algo salió mal. Intenta de nuevo.');
}

export async function cargarSuscripcion(): Promise<DatosSuscripcion> {
  const j = await (await llamar({ accion: 'estado' })).json();
  return {
    empresa: String(j?.empresa?.nombre ?? ''),
    cuenta: cuentaDesdeJson(j?.cuenta),
    bancos: Array.isArray(j?.bancos) ? j.bancos : [],
    reportes: Array.isArray(j?.reportes) ? j.reportes : [],
    pagos: Array.isArray(j?.pagos) ? j.pagos : [],
  };
}

async function huella(blob: Blob): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function tipoDe(archivo: File): string {
  if (archivo.type) return archivo.type;
  if (/\.pdf$/i.test(archivo.name)) return 'application/pdf';
  if (/\.heic$/i.test(archivo.name)) return 'image/heic';
  if (/\.heif$/i.test(archivo.name)) return 'image/heif';
  return 'image/jpeg';
}

export async function reportarPago(d: {
  monto: number; fecha: string; bancoId: string | null; referencia: string; nota: string; archivo: File;
}): Promise<void> {
  const sha256 = await huella(d.archivo);
  let blob: Blob = d.archivo;
  let mime = tipoDe(d.archivo);
  if (mime !== 'application/pdf') {
    // una foto se achica para que pese poco y el número de referencia se siga leyendo; un HEIC que el
    // navegador no sabe abrir se sube tal cual (SellAlleS lo acepta)
    const reducida = await reducirFoto(d.archivo, 2000, 0.85);
    blob = reducida;
    mime = reducida.type || mime;
  }
  if (blob.size > TAMANO_MAXIMO) {
    throw new ErrorSuscripcion('El archivo pesa más de 10 MB. Sube una captura de pantalla o un PDF más liviano.');
  }

  const permiso = await (await llamar({ accion: 'subida', nombre: d.archivo.name, mime, tamano: blob.size })).json();
  const sellalles = createClient(String(permiso.url), String(permiso.apikey), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await sellalles.storage.from('comprobantes-de-pago')
    .uploadToSignedUrl(String(permiso.path), String(permiso.token), blob, { contentType: mime });
  if (error) throw new ErrorSuscripcion(`No se pudo subir el comprobante: ${error.message}`);

  await llamar({
    accion: 'reportar', monto: d.monto, fecha: d.fecha, banco_id: d.bancoId, referencia: d.referencia,
    nota: d.nota, path: permiso.path, nombre: d.archivo.name, mime, sha256,
  });
}

export async function retirarReporte(id: string): Promise<void> {
  await llamar({ accion: 'retirar', reporte_id: id });
}

export async function urlComprobante(id: string): Promise<string> {
  const j = await (await llamar({ accion: 'comprobante', reporte_id: id })).json();
  return String(j.url);
}

export async function obtenerFactura(pagoId: string): Promise<{ blob: Blob; nombre: string }> {
  const r = await llamar({ accion: 'factura', pago_id: pagoId });
  const nombre = /filename="([^"]+)"/.exec(r.headers.get('Content-Disposition') ?? '')?.[1] ?? 'factura.pdf';
  return { blob: await r.blob(), nombre };
}
```

- [ ] **Step 3: El store del banner.** `vscode/src/store/suscripcionStore.ts`:
```ts
import { create } from 'zustand';
import type { CuentaSuscripcion } from '../lib/suscripcion';
import { cargarSuscripcion } from '../lib/suscripcionApi';

/** El estado de la cuenta se pide una vez y se recuerda un rato: el banner no consulta en cada pantalla. */
const VIGENCIA = 15 * 60 * 1000;

interface SuscripcionState {
  cuenta: CuentaSuscripcion | null;
  cargadaEn: number;
  cargando: boolean;
  /** la página Mi suscripción, que ya trae todo, deja aquí la cuenta fresca */
  setCuenta: (c: CuentaSuscripcion) => void;
  cargarCuenta: (forzar?: boolean) => Promise<void>;
}

export const useSuscripcionStore = create<SuscripcionState>()((set, get) => ({
  cuenta: null,
  cargadaEn: 0,
  cargando: false,
  setCuenta: (c) => set({ cuenta: c, cargadaEn: Date.now() }),
  cargarCuenta: async (forzar = false) => {
    const { cargando, cargadaEn } = get();
    if (cargando || (!forzar && Date.now() - cargadaEn < VIGENCIA)) return;
    set({ cargando: true });
    try {
      const d = await cargarSuscripcion();
      set({ cuenta: d.cuenta, cargadaEn: Date.now() });
    } catch {
      // sin conexión o sin permiso: no hay banner, y se vuelve a intentar pasada la vigencia
      set({ cuenta: null, cargadaEn: Date.now() });
    } finally {
      set({ cargando: false });
    }
  },
}));
```

- [ ] **Step 4: Comprobaciones y commit.**
```bash
cd vscode
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"     # 39
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -E "suscripcion|fotos"   # nada
npm test                                                             # 125
npx eslint src/lib/suscripcionApi.ts src/store/suscripcionStore.ts src/lib/fotos.ts
npm run build
git add src/lib/suscripcionApi.ts src/store/suscripcionStore.ts src/lib/fotos.ts
git commit -m "feat(suscripcion): cliente de mi-suscripcion, subida del comprobante y estado para el banner"
```

---

### Task 10: La página "Mi suscripción"

**Files (Anadsll):**
- Create: `vscode/src/pages/admin/Subscription.tsx`
- Create: `vscode/src/pages/admin/Subscription.css`
- Modify: `vscode/src/App.tsx` (**CRLF**): la ruta `suscripcion`
- Modify: `vscode/src/pages/AdminLayout.tsx` (**CRLF**): la entrada del menú y las redirecciones por rol

**Interfaces:**
- **Consumes:**
  - de la Task 8: `ESTADO_CUENTA`, `ESTADO_REPORTE`, `METODO_PAGO`, `dinero`, `fechaLarga`, `hoySantoDomingo`, `montoSugerido`, `cuotasPendientesTexto`, `validarReporte`, `TIPOS_COMPROBANTE` y `ErroresReporte`;
  - de la Task 9: `ErrorSuscripcion`, `DatosSuscripcion`, `cargarSuscripcion`, `reportarPago`, `retirarReporte`, `urlComprobante`, `obtenerFactura` y `useSuscripcionStore`.

- [ ] **Step 1: La página.** `vscode/src/pages/admin/Subscription.tsx`:
```tsx
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Copy, CreditCard, Download, Eye, FileText, Loader2, RotateCcw, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useSuscripcionStore } from '../../store/suscripcionStore';
import {
  ESTADO_CUENTA, ESTADO_REPORTE, METODO_PAGO, cuotasPendientesTexto, dinero, fechaLarga, hoySantoDomingo,
  montoSugerido, validarReporte, type ErroresReporte,
} from '../../lib/suscripcion';
import {
  ErrorSuscripcion, cargarSuscripcion, obtenerFactura, reportarPago, retirarReporte, urlComprobante,
  type DatosSuscripcion,
} from '../../lib/suscripcionApi';
import './Subscription.css';

const mensajeDe = (e: unknown, def: string) => (e instanceof Error && e.message ? e.message : def);

/** Abre una pestaña en el mismo toque (así el navegador no la bloquea) y la llena cuando llega la dirección. */
function abrirEnPestana(direccion: () => Promise<string>) {
  const pestana = window.open('', '_blank');
  direccion()
    .then((url) => {
      if (pestana) {
        pestana.opener = null;
        pestana.location.href = url;
      } else {
        window.location.href = url;
      }
    })
    .catch((e) => {
      pestana?.close();
      toast.error(mensajeDe(e, 'No se pudo abrir.'));
    });
}

/** Mi suscripción (spec §5.2): estado, cómo pagar, reportar un pago, comprobantes enviados y facturas. */
export default function Subscription() {
  const { user } = useAuthStore();
  const setCuenta = useSuscripcionStore((s) => s.setCuenta);
  const [datos, setDatos] = useState<DatosSuscripcion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const d = await cargarSuscripcion();
      setDatos(d);
      setCuenta(d.cuenta);
    } catch (e) {
      setError(e instanceof ErrorSuscripcion ? e.message : 'No pudimos cargar tu suscripción ahora.');
    } finally {
      setCargando(false);
    }
  }, [setCuenta]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (user && user.role !== 'admin') return <Navigate to="/admin" replace />;

  return (
    <div className="susc">
      <header className="susc__head">
        <h1 className="susc__title"><CreditCard size={26} aria-hidden="true" /> Mi suscripción</h1>
        <p className="susc__subtitle">{datos?.empresa ? `${datos.empresa} · ` : ''}El pago mensual del sistema</p>
      </header>

      {cargando && !datos ? (
        <p className="susc__cargando"><Loader2 className="susc__spin" size={18} aria-hidden="true" /> Cargando tu suscripción…</p>
      ) : error && !datos ? (
        <div className="susc__card susc__error" role="alert">
          <p>{error}</p>
          <button type="button" className="susc__btn" onClick={() => void cargar()}>
            <RotateCcw size={16} aria-hidden="true" /> Reintentar
          </button>
        </div>
      ) : datos ? (
        <>
          <Estado datos={datos} />
          <div className="susc__grid">
            <CuentasBancarias datos={datos} />
            <FormularioReporte datos={datos} onListo={cargar} />
          </div>
          <Comprobantes datos={datos} onCambio={cargar} />
          <Pagos datos={datos} />
        </>
      ) : null}
    </div>
  );
}

function Estado({ datos }: { datos: DatosSuscripcion }) {
  const c = datos.cuenta;
  const e = ESTADO_CUENTA[c.estado];
  return (
    <section className="susc__card" aria-labelledby="susc-estado-t">
      <div className="susc__card-top">
        <h2 id="susc-estado-t" className="susc__card-title">Estado</h2>
        <span className={`susc__badge susc__badge--${e.tono}`}>{e.texto}</span>
      </div>
      <dl className="susc__datos">
        <div><dt>Cuota mensual</dt><dd>{dinero(c.mensual)}</dd></div>
        {c.proximoCobro && <div><dt>Próximo cobro</dt><dd>{fechaLarga(c.proximoCobro)}</dd></div>}
        {c.saldo > 0 && (
          <div>
            <dt>Debes</dt>
            <dd>{dinero(c.saldo)}{c.cuotasPendientes > 0 ? ` (${cuotasPendientesTexto(c.cuotasPendientes)})` : ''}</dd>
          </div>
        )}
        {c.saldo > 0 && c.debeDesde && <div><dt>Desde</dt><dd>{fechaLarga(c.debeDesde)}</dd></div>}
        {c.comprobantesPorConfirmar > 0 && <div><dt>En revisión</dt><dd>{dinero(c.porConfirmar)}</dd></div>}
      </dl>
    </section>
  );
}

function CuentasBancarias({ datos }: { datos: DatosSuscripcion }) {
  const copiar = async (numero: string) => {
    try {
      await navigator.clipboard.writeText(numero);
      toast.success('Número copiado');
    } catch {
      toast.error('No se pudo copiar; cópialo a mano');
    }
  };
  return (
    <section className="susc__card" aria-labelledby="susc-bancos-t">
      <h2 id="susc-bancos-t" className="susc__card-title">Cómo pagar</h2>
      <p className="susc__nota">Transfiere a una de estas cuentas y después sube el comprobante.</p>
      {datos.bancos.length === 0 ? (
        <p className="susc__vacio">Todavía no hay cuentas cargadas. Escríbenos y te pasamos los datos.</p>
      ) : (
        <ul className="susc__bancos">
          {datos.bancos.map((b) => (
            <li key={b.id} className="susc__banco">
              <div className="susc__banco-nombre">
                <b>{b.banco}</b>
                <span>{b.tipo === 'corriente' ? 'Corriente' : 'Ahorro'} · {b.moneda}</span>
              </div>
              <div className="susc__numero">
                <span>{b.numero}</span>
                <button type="button" className="susc__icon-btn" onClick={() => void copiar(b.numero)}
                  aria-label={`Copiar el número de cuenta ${b.numero}`}>
                  <Copy size={16} aria-hidden="true" />
                </button>
              </div>
              <div className="susc__titular">{b.titular}{b.documento ? ` · ${b.documento}` : ''}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FormularioReporte({ datos, onListo }: { datos: DatosSuscripcion; onListo: () => Promise<void> }) {
  const hoy = hoySantoDomingo(new Date());
  const [monto, setMonto] = useState(() => String(montoSugerido(datos.cuenta)));
  const [fecha, setFecha] = useState(hoy);
  const [bancoId, setBancoId] = useState(datos.bancos.length === 1 ? datos.bancos[0].id : '');
  const [referencia, setReferencia] = useState('');
  const [nota, setNota] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errores, setErrores] = useState<ErroresReporte>({});
  const [enviando, setEnviando] = useState(false);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    const errs = validarReporte({
      monto: Number(monto), fecha, hoy, bancos: datos.bancos.length, bancoId,
      archivo: archivo && { tipo: archivo.type, nombre: archivo.name, tamano: archivo.size },
    });
    setErrores(errs);
    if (Object.keys(errs).length || !archivo) return;
    setEnviando(true);
    try {
      await reportarPago({ monto: Number(monto), fecha, bancoId: bancoId || null, referencia, nota, archivo });
      toast.success('Recibimos tu comprobante. Te avisamos cuando lo confirmemos.');
      setReferencia('');
      setNota('');
      setArchivo(null);
      if (inputArchivo.current) inputArchivo.current.value = '';
      await onListo();
    } catch (err) {
      toast.error(mensajeDe(err, 'No se pudo enviar el comprobante.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="susc__card" aria-labelledby="susc-reportar-t">
      <h2 id="susc-reportar-t" className="susc__card-title">Reportar un pago</h2>
      <form className="susc__form" onSubmit={enviar} noValidate>
        <label className="susc__campo">
          <span>Monto (RD$)</span>
          <input type="number" inputMode="decimal" min="0" step="0.01" value={monto}
            onChange={(e) => setMonto(e.target.value)} aria-invalid={errores.monto ? true : undefined}
            aria-describedby={errores.monto ? 'susc-err-monto' : undefined} />
          {errores.monto && <small id="susc-err-monto" className="susc__err" role="alert">{errores.monto}</small>}
        </label>
        <label className="susc__campo">
          <span>Fecha de la transferencia</span>
          <input type="date" max={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)}
            aria-invalid={errores.fecha ? true : undefined} aria-describedby={errores.fecha ? 'susc-err-fecha' : undefined} />
          {errores.fecha && <small id="susc-err-fecha" className="susc__err" role="alert">{errores.fecha}</small>}
        </label>
        {datos.bancos.length > 1 && (
          <label className="susc__campo">
            <span>Cuenta a la que transferiste</span>
            <select value={bancoId} onChange={(e) => setBancoId(e.target.value)}
              aria-invalid={errores.banco ? true : undefined} aria-describedby={errores.banco ? 'susc-err-banco' : undefined}>
              <option value="">Elige la cuenta…</option>
              {datos.bancos.map((b) => <option key={b.id} value={b.id}>{b.banco} · {b.numero}</option>)}
            </select>
            {errores.banco && <small id="susc-err-banco" className="susc__err" role="alert">{errores.banco}</small>}
          </label>
        )}
        <label className="susc__campo">
          <span>Referencia (opcional)</span>
          <input type="text" maxLength={80} value={referencia} onChange={(e) => setReferencia(e.target.value)} />
        </label>
        <label className="susc__campo">
          <span>Nota (opcional)</span>
          <textarea rows={2} maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)} />
        </label>
        <label className="susc__campo">
          <span>Comprobante (foto o PDF)</span>
          <input ref={inputArchivo} type="file" accept="image/*,application/pdf"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            aria-invalid={errores.archivo ? true : undefined} aria-describedby={errores.archivo ? 'susc-err-archivo' : undefined} />
          {errores.archivo && <small id="susc-err-archivo" className="susc__err" role="alert">{errores.archivo}</small>}
        </label>
        <button type="submit" className="susc__btn susc__btn--principal" disabled={enviando}>
          {enviando ? <Loader2 className="susc__spin" size={16} aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}
          {enviando ? 'Enviando…' : 'Enviar comprobante'}
        </button>
      </form>
    </section>
  );
}

function Comprobantes({ datos, onCambio }: { datos: DatosSuscripcion; onCambio: () => Promise<void> }) {
  const [retirando, setRetirando] = useState<string | null>(null);
  if (!datos.reportes.length) return null;

  const retirar = async (id: string) => {
    if (!window.confirm('¿Retirar este comprobante? Podrás enviar otro cuando quieras.')) return;
    setRetirando(id);
    try {
      await retirarReporte(id);
      toast.success('Comprobante retirado');
      await onCambio();
    } catch (e) {
      toast.error(mensajeDe(e, 'No se pudo retirar el comprobante.'));
    } finally {
      setRetirando(null);
    }
  };

  return (
    <section className="susc__card" aria-labelledby="susc-comprobantes-t">
      <h2 id="susc-comprobantes-t" className="susc__card-title">Comprobantes enviados</h2>
      <ul className="susc__lista">
        {datos.reportes.map((r) => {
          const e = ESTADO_REPORTE[r.estado];
          return (
            <li key={r.id} className="susc__fila">
              <div className="susc__fila-datos">
                <b>{dinero(r.monto)}</b>
                <span>{fechaLarga(r.fecha)}{r.banco ? ` · ${r.banco}` : ''}</span>
                {r.estado === 'rechazado' && r.motivo && <span className="susc__motivo">Motivo: {r.motivo}</span>}
              </div>
              <span className={`susc__badge susc__badge--${e.tono}`}>{e.texto}</span>
              <div className="susc__fila-acciones">
                <button type="button" className="susc__btn susc__btn--suave" onClick={() => abrirEnPestana(() => urlComprobante(r.id))}>
                  <Eye size={16} aria-hidden="true" /> Ver comprobante
                </button>
                {r.estado === 'por_confirmar' && (
                  <button type="button" className="susc__btn susc__btn--suave" disabled={retirando === r.id} onClick={() => void retirar(r.id)}>
                    Retirar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Pagos({ datos }: { datos: DatosSuscripcion }) {
  const descargar = async (id: string) => {
    try {
      const { blob, nombre } = await obtenerFactura(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      toast.error(mensajeDe(e, 'No se pudo descargar la factura.'));
    }
  };
  const ver = (id: string) =>
    abrirEnPestana(async () => {
      const url = URL.createObjectURL((await obtenerFactura(id)).blob);
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return url;
    });

  return (
    <section className="susc__card" aria-labelledby="susc-pagos-t">
      <h2 id="susc-pagos-t" className="susc__card-title">Pagos y facturas</h2>
      {datos.pagos.length === 0 ? (
        <p className="susc__vacio">Todavía no hay pagos confirmados.</p>
      ) : (
        <ul className="susc__lista">
          {datos.pagos.map((p) => (
            <li key={p.id} className="susc__fila">
              <div className="susc__fila-datos">
                <b>{dinero(p.monto)}</b>
                <span>{fechaLarga(p.fecha)} · {METODO_PAGO[p.metodo] ?? p.metodo}</span>
                <span><FileText size={14} aria-hidden="true" /> Factura {p.codigo}</span>
              </div>
              {p.tieneFactura && (
                <div className="susc__fila-acciones">
                  <button type="button" className="susc__btn susc__btn--suave" onClick={() => ver(p.id)}>
                    <Eye size={16} aria-hidden="true" /> Ver
                  </button>
                  <button type="button" className="susc__btn susc__btn--suave" onClick={() => void descargar(p.id)}>
                    <Download size={16} aria-hidden="true" /> Descargar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Los estilos.** `vscode/src/pages/admin/Subscription.css`. El tema oscuro es el del panel; el claro va con `[data-theme="light"]`:
```css
/* ── Mi suscripción (pago mensual del sistema) ── */
.susc { display: flex; flex-direction: column; gap: 20px; max-width: 1100px; }
.susc__head { margin-bottom: 4px; }
.susc__title { display: flex; align-items: center; gap: 10px; margin: 0 0 4px; font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 700; color: #fff; }
.susc__subtitle { margin: 0; font-size: 0.9rem; color: rgba(255, 255, 255, 0.55); }
.susc__cargando { display: flex; align-items: center; gap: 8px; color: rgba(255, 255, 255, 0.7); }
.susc__spin { animation: susc-gira 1s linear infinite; }
@keyframes susc-gira { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .susc__spin { animation: none; } }

.susc__grid { display: grid; gap: 20px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 900px) { .susc__grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; } }

.susc__card { padding: 20px; border-radius: 16px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); color: #f5f1ea; min-width: 0; }
.susc__card-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.susc__card-title { margin: 0 0 12px; font-family: 'Outfit', sans-serif; font-size: 1.1rem; font-weight: 600; }
.susc__card-top .susc__card-title { margin: 0; }
.susc__nota, .susc__vacio { margin: 0 0 12px; font-size: 0.9rem; color: rgba(255, 255, 255, 0.65); }

.susc__badge { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 999px; font-size: 0.8rem; font-weight: 600; white-space: nowrap; border: 1px solid currentColor; }
.susc__badge--ok { color: #6ee7b7; }
.susc__badge--ambar { color: #fcd34d; }
.susc__badge--rojo { color: #fca5a5; }
.susc__badge--azul { color: #7dd3fc; }
.susc__badge--neutro { color: rgba(255, 255, 255, 0.65); }

.susc__datos { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); margin: 0; }
.susc__datos dt { font-size: 0.78rem; letter-spacing: 0.04em; text-transform: uppercase; color: rgba(255, 255, 255, 0.55); }
.susc__datos dd { margin: 2px 0 0; font-size: 1.05rem; font-weight: 600; overflow-wrap: anywhere; }

.susc__bancos, .susc__lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.susc__banco { padding: 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06); }
.susc__banco-nombre { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; }
.susc__banco-nombre span, .susc__titular { font-size: 0.85rem; color: rgba(255, 255, 255, 0.65); overflow-wrap: anywhere; }
.susc__numero { display: flex; align-items: center; gap: 8px; margin: 6px 0 2px; font-family: ui-monospace, monospace; font-size: 1rem; overflow-wrap: anywhere; }
.susc__icon-btn { display: grid; place-items: center; min-width: 44px; min-height: 44px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.15); background: transparent; color: inherit; cursor: pointer; }

.susc__form { display: flex; flex-direction: column; gap: 14px; }
.susc__campo { display: flex; flex-direction: column; gap: 6px; font-size: 0.88rem; color: rgba(255, 255, 255, 0.75); }
.susc__campo input, .susc__campo select, .susc__campo textarea { min-height: 44px; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(0, 0, 0, 0.2); color: #fff; font: inherit; font-size: 16px; }
.susc__campo textarea { resize: vertical; }
.susc__campo input[type="file"] { padding: 8px; }
.susc__err { color: #fca5a5; font-weight: 500; }

.susc__btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 16px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.2); background: transparent; color: inherit; font-family: 'Outfit', sans-serif; font-weight: 600; cursor: pointer; }
.susc__btn:disabled { opacity: 0.6; cursor: default; }
.susc__btn--principal { border: 0; background: var(--camel); color: #1f1611; }
.susc__btn--suave { font-size: 0.85rem; }
.susc__error { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
.susc__error p { margin: 0; }

.susc__fila { display: grid; gap: 10px; grid-template-columns: minmax(0, 1fr) auto; align-items: center; padding: 12px; border-radius: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); }
.susc__fila-datos { display: flex; flex-direction: column; gap: 2px; min-width: 0; font-size: 0.88rem; color: rgba(255, 255, 255, 0.7); }
.susc__fila-datos b { font-size: 1rem; color: #fff; }
.susc__fila-datos span { display: inline-flex; align-items: center; gap: 4px; overflow-wrap: anywhere; }
.susc__motivo { color: #fca5a5; }
.susc__fila-acciones { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; }
@media (min-width: 761px) {
  .susc__fila { grid-template-columns: minmax(0, 1fr) auto auto; }
  .susc__fila-acciones { grid-column: auto; }
}

/* tema claro del panel */
[data-theme="light"] .susc__title { color: var(--espresso); }
[data-theme="light"] .susc__subtitle, [data-theme="light"] .susc__cargando { color: var(--muted); }
[data-theme="light"] .susc__card { background: #fff; border-color: rgba(74, 52, 42, 0.1); color: var(--espresso); }
[data-theme="light"] .susc__nota, [data-theme="light"] .susc__vacio,
[data-theme="light"] .susc__datos dt, [data-theme="light"] .susc__banco-nombre span,
[data-theme="light"] .susc__titular, [data-theme="light"] .susc__campo,
[data-theme="light"] .susc__fila-datos { color: #6f5f53; }
[data-theme="light"] .susc__banco, [data-theme="light"] .susc__fila { background: #F5F1EA; border-color: rgba(74, 52, 42, 0.08); }
[data-theme="light"] .susc__fila-datos b { color: var(--espresso); }
[data-theme="light"] .susc__campo input, [data-theme="light"] .susc__campo select,
[data-theme="light"] .susc__campo textarea { background: #fff; border-color: #a8998c; color: var(--espresso); }
[data-theme="light"] .susc__icon-btn, [data-theme="light"] .susc__btn { border-color: rgba(74, 52, 42, 0.3); }
[data-theme="light"] .susc__btn--principal { background: var(--espresso); color: #fff; }
[data-theme="light"] .susc__badge--ok { color: #047857; }
[data-theme="light"] .susc__badge--ambar { color: #92400e; }
[data-theme="light"] .susc__badge--rojo, [data-theme="light"] .susc__err, [data-theme="light"] .susc__motivo { color: #b91c1c; }
[data-theme="light"] .susc__badge--azul { color: #0369a1; }
[data-theme="light"] .susc__badge--neutro { color: #6f5f53; }
```

- [ ] **Step 3: La ruta.** En `vscode/src/App.tsx`, con CRLF:
  1. Junto a los otros `lazy` del panel se agrega `const Subscription = lazy(() => import('./pages/admin/Subscription'));`. Se mira cómo están escritos `Settings` y `Reports` y se copia la misma forma.
  2. Dentro de las rutas de `/admin`, después de `ajustes`, se agrega `<Route path="suscripcion" element={<Suspense fallback={<AdminFallback />}><Subscription /></Suspense>} />`.

- [ ] **Step 4: El menú y las redirecciones.** En `vscode/src/pages/AdminLayout.tsx`, con CRLF:
  1. `CreditCard` se agrega al import de `lucide-react`.
  2. En `navSections`, en la sección `Configuración`, después de Ajustes, se agrega `{ to: '/admin/suscripcion', icon: <CreditCard size={20} />, label: 'Mi suscripción' },`. Esa sección ya solo la ve el admin.
  3. En el efecto de redirecciones, `'/admin/suscripcion'` se suma a la lista `adminOnly` (especialista) y a `receptionistForbidden` (recepción).

- [ ] **Step 5: Comprobaciones y commit.**
```bash
cd vscode
grep -rn "susc" src --include=*.css | grep -v "Subscription.css"     # nada (prefijo libre)
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"      # 39
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -E "Subscription|suscripcion|AdminLayout|App.tsx"   # nada nuevo
npx eslint src/pages/admin/Subscription.tsx
npm test                                                              # 125
npm run build
for f in src/App.tsx src/pages/AdminLayout.tsx; do printf "%s CR=%s LF=%s\n" $f $(tr -cd '\r' < $f | wc -c) $(wc -l < $f); done
git add src/pages/admin/Subscription.tsx src/pages/admin/Subscription.css src/App.tsx src/pages/AdminLayout.tsx
git commit -m "feat(suscripcion): página Mi suscripción en el panel, solo para la administración"
```
Si `AdminLayout.tsx` ya tenía errores de tsc, se compara contra la línea base: no puede sumar ninguno.

---

### Task 11: El banner de pago

**Files (Anadsll):**
- Create: `vscode/src/components/AvisoSuscripcion.tsx`
- Create: `vscode/src/components/AvisoSuscripcion.css`
- Modify: `vscode/src/pages/AdminLayout.tsx` (**CRLF**): el banner arriba del contenido, solo para admin

**Interfaces:**
- **Consumes:** de la Task 8, `avisoDeCuota` y `hoySantoDomingo`; de la Task 9, `useSuscripcionStore`.

- [ ] **Step 1: El componente.** `vscode/src/components/AvisoSuscripcion.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, CalendarClock, Hourglass, X } from 'lucide-react';
import { useSuscripcionStore } from '../store/suscripcionStore';
import { avisoDeCuota, hoySantoDomingo } from '../lib/suscripcion';
import './AvisoSuscripcion.css';

const ICONO = { rojo: AlertTriangle, ambar: CalendarClock, azul: Hourglass } as const;
const claveOculto = (clave: string) => `avisoSuscripcionOculto:${clave}`;

/** El aviso del pago del sistema arriba de cada pantalla del panel (spec §5.3). Solo lo monta AdminLayout para
 *  la administración. El rojo no se cierra; el ámbar y el azul se ocultan por hoy. Si SellAlleS no responde,
 *  no sale nada. */
export default function AvisoSuscripcion() {
  const cuenta = useSuscripcionStore((s) => s.cuenta);
  const cargarCuenta = useSuscripcionStore((s) => s.cargarCuenta);
  const { pathname } = useLocation();
  const [cerrado, setCerrado] = useState<string | null>(null);

  // al abrir el panel y al cambiar de pantalla; la caché del store evita consultar más de una vez cada 15 min
  useEffect(() => {
    void cargarCuenta();
  }, [cargarCuenta, pathname]);

  const aviso = avisoDeCuota(cuenta);
  if (!aviso || cerrado === aviso.clave) return null;

  const hoy = hoySantoDomingo(new Date());
  if (aviso.ocultable) {
    try {
      if (localStorage.getItem(claveOculto(aviso.clave)) === hoy) return null;
    } catch {
      // sin almacenamiento: se muestra, y "ocultar" solo lo cierra ahora
    }
  }

  const ocultar = () => {
    try {
      localStorage.setItem(claveOculto(aviso.clave), hoy);
    } catch {
      // sin almacenamiento
    }
    setCerrado(aviso.clave);
  };

  const Icono = ICONO[aviso.tono];
  return (
    <div className={`aviso-susc aviso-susc--${aviso.tono}`} role="status">
      <Icono className="aviso-susc__icono" size={20} aria-hidden="true" />
      <div className="aviso-susc__texto">
        <p className="aviso-susc__titulo">{aviso.titulo}</p>
        <p className="aviso-susc__detalle">{aviso.detalle}</p>
      </div>
      <div className="aviso-susc__acciones">
        <Link className="aviso-susc__btn" to="/admin/suscripcion">
          {aviso.tono === 'azul' ? 'Ver estado' : 'Pagar / subir comprobante'}
        </Link>
        {aviso.ocultable && (
          <button type="button" className="aviso-susc__cerrar" onClick={ocultar} aria-label="Ocultar por hoy" title="Ocultar por hoy">
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Los estilos.** `vscode/src/components/AvisoSuscripcion.css`:
```css
/* ── Aviso del pago del sistema, arriba del contenido del panel ── */
.aviso-susc { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 20px; padding: 12px 14px; border-radius: 12px; border: 1px solid; }
.aviso-susc__icono { flex-shrink: 0; }
.aviso-susc__texto { flex: 1 1 220px; min-width: 0; }
.aviso-susc__titulo { margin: 0; font-weight: 600; font-size: 0.95rem; overflow-wrap: anywhere; }
.aviso-susc__detalle { margin: 2px 0 0; font-size: 0.85rem; opacity: 0.92; overflow-wrap: anywhere; }
.aviso-susc__acciones { display: flex; align-items: center; gap: 8px; flex: 1 1 100%; }
.aviso-susc__btn { display: inline-flex; flex: 1; align-items: center; justify-content: center; min-height: 44px; padding: 0 14px; border-radius: 10px; font-weight: 600; font-size: 0.88rem; text-decoration: none; color: #fff; }
.aviso-susc__cerrar { display: grid; place-items: center; min-width: 44px; min-height: 44px; border: 0; border-radius: 10px; background: transparent; color: inherit; cursor: pointer; }
@media (min-width: 761px) {
  .aviso-susc__acciones { flex: 0 0 auto; }
  .aviso-susc__btn { flex: 0 0 auto; }
}

/* tema oscuro (el del panel) */
.aviso-susc--rojo { background: rgba(127, 29, 29, 0.35); border-color: rgba(248, 113, 113, 0.5); color: #fee2e2; }
.aviso-susc--rojo .aviso-susc__btn { background: #dc2626; }
.aviso-susc--ambar { background: rgba(120, 53, 15, 0.35); border-color: rgba(251, 191, 36, 0.5); color: #fef3c7; }
.aviso-susc--ambar .aviso-susc__btn { background: #b45309; }
.aviso-susc--azul { background: rgba(12, 74, 110, 0.35); border-color: rgba(56, 189, 248, 0.5); color: #e0f2fe; }
.aviso-susc--azul .aviso-susc__btn { background: #0369a1; }

/* tema claro */
[data-theme="light"] .aviso-susc--rojo { background: #fef2f2; border-color: #fca5a5; color: #7f1d1d; }
[data-theme="light"] .aviso-susc--ambar { background: #fffbeb; border-color: #fcd34d; color: #78350f; }
[data-theme="light"] .aviso-susc--azul { background: #f0f9ff; border-color: #7dd3fc; color: #0c4a6e; }
```

- [ ] **Step 3: En el layout.** En `vscode/src/pages/AdminLayout.tsx`, con CRLF:
  1. Se agrega `import AvisoSuscripcion from '../components/AvisoSuscripcion';`.
  2. Dentro de `<div className="admin__content">`, justo antes de `<Outlet />`, se agrega `{user?.role === 'admin' && <AvisoSuscripcion />}`.

- [ ] **Step 4: Comprobaciones y commit.**
```bash
cd vscode
grep -rn "aviso-susc" src --include=*.css | grep -v "AvisoSuscripcion.css"   # nada
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"            # 39
npx eslint src/components/AvisoSuscripcion.tsx
npm test && npm run build
printf "CR=%s LF=%s\n" $(tr -cd '\r' < src/pages/AdminLayout.tsx | wc -c) $(wc -l < src/pages/AdminLayout.tsx)
git add src/components/AvisoSuscripcion.tsx src/components/AvisoSuscripcion.css src/pages/AdminLayout.tsx
git commit -m "feat(suscripcion): banner de pago en el panel para la administración"
```

---

### Task 12: Prueba completa, limpieza y PRs (la hace el controlador, con Louis)

- [ ] **Step 1: En el navegador del panel local.** Se usa `sitio-rediseno` en el puerto 5181. Louis inicia sesión como admin; Claude no escribe contraseñas.
  1. La empresa de prueba está 35 días sin pagar: el banner sale rojo, "Tienes 2 cuotas pendientes: RD$ 4,600", sin botón de cerrar. Las cuentas exactas las calcula SellAlleS.
  2. "Mi suscripción" muestra:
     - el estado "Pendiente de pago";
     - las cuentas con "Copiar";
     - el formulario con el monto sugerido de RD$ 4,600.
  3. Se reporta con una captura de pantalla (foto): sale el aviso de recibido, el comprobante figura "En revisión" y el banner pasa a azul si cubre la deuda.
  4. Se reporta el mismo archivo otra vez: "Ese comprobante ya lo enviaste antes."
  5. "Ver comprobante" abre el archivo. "Retirar" lo deja como "Retirado".
  6. Se reporta un PDF de una página.
- [ ] **Step 2: En SellAlleS (Louis, en su panel).**
  1. **Antes de confirmar, se le avisa a Louis de dos cosas:**
     - confirmar crea un pago, y el disparador `subscription_payments_emitir_factura` gasta un número del consecutivo interno de facturas (`subscription_invoice_counter`). Ese número no se imprime, pero al borrar el pago de prueba queda un hueco;
     - el recibo por correo va al contacto de cobro de la empresa, y la empresa de prueba no tiene administrador, así que no le llega a nadie.

     Si Louis no quiere gastar el número, se salta la confirmación. "Ver" y "Descargar" quedan sin probar con un pago real; los cubren la prueba de humo de la Task 3 y el curl de `factura`, que da 404 sin pago.
  2. En Cobros, la empresa de prueba muestra los comprobantes. Louis **confirma** el PDF y **rechaza** la foto con un motivo.
  3. De vuelta en Anadsll ("Reintentar" o recargar):
     - el pago aparece con su código de factura;
     - "Ver" y "Descargar" dan el mismo PDF que descarga SellAlleS para ese pago;
     - el rechazado muestra su motivo.
  4. **Los otros estados**, como pide la spec en su §7:
     - si el pago cubrió la deuda, la cuenta queda "Al día" y no hay banner;
     - después el controlador mueve las fechas de la empresa de prueba (`companies.created_at`, `subscriptions.started_at` y la fecha del pago, si hace falta) hasta que `_cuenta_de_suscripcion` dé `por_vencer`. Entonces el banner sale ámbar, "vence el …, en N días";
     - "Ocultar por hoy" lo esconde, y al recargar sigue oculto;
     - con `localStorage.clear()` vuelve a salir.
  5. **En el teléfono de Louis:** abre el panel por la IP de la computadora (el servidor corre con `--host`), ve el banner y la página, y reporta un comprobante con una foto de la cámara o una captura.
- [ ] **Step 3: Permisos y fallas.**
  1. Con un usuario de recepción de prueba no se ve "Mi suscripción" ni el banner. `/admin/suscripcion` redirige. Si Louis no tiene un usuario de recepción a mano, se prueba la función con un JWT de recepción, o queda para su prueba.
  2. Se revoca la clave de prueba con `update claves_cobro_externo set revocada_en = now() …`. La página muestra "No pudimos cargar tu suscripción ahora" con "Reintentar", no hay banner (recargando) y el panel funciona.
- [ ] **Step 4: Medidas.** La página y el banner, con el mismo script de medición de la Fase 7 adaptado al panel:
  - en 360, 390, 430, 820 y 1280, en los dos temas;
  - nada se sale de la pantalla y los botones miden al menos 44 px.
- [ ] **Step 5: Limpiar.**
  1. En SellAlleS se borran los pagos, los reportes, la clave, la sucursal, la suscripción y la empresa de prueba.
  2. Los archivos de `comprobantes-de-pago/<id>/` se borran por SQL si el proyecto lo permite; si no, se anotan las rutas para que Louis los borre desde el panel de Supabase.
  3. En Anadsll se deja el secreto `sellalles_clave_cobro` con un valor vacío (`select vault.update_secret(<id>, '')`) hasta la Entrega: así la función responde "sin conexión" y el banner no sale con datos de prueba.
  4. Se comprueba que quedan 0 filas de la empresa de prueba.
- [ ] **Step 6: PRs.**
  1. El PR de SellAlleS (Task 6) queda listo para fusionar.
  2. Se sube `claude/cobro-suscripcion` y se abre el PR "Cobro mensual del sistema: Mi suscripción y banner de pago" contra `main` de `louisx2/beauty`.
  3. En la descripción va qué hace falta en la Entrega:
     - crear la empresa real, con la dueña como administradora y el plan a medida de RD$ 2,300;
     - generar su clave en SellAlleS;
     - ponerla en Vault (`sellalles_clave_cobro`).
  4. Se anota en el índice de planes del rediseño, en la lista de la Entrega.

## Al terminar

En la fase **Entrega** hay que hacer tres cosas:
- crear la empresa real "Anadsll Beauty Esthetic" en SellAlleS;
- generar su clave desde "Clave de conexión";
- guardarla en el Vault de Anadsll.

Desde ese día corre la primera cuota.
