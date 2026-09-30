# Rediseño · Fase 7: calidad y pendientes — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dejar lo que ve la clienta listo para entregar. La fase:
- cierra los pendientes que anotaron las fases 1 a 6;
- pasa la revisión de calidad de la spec §3.8 en todas las páginas, en los 7 anchos y los dos temas;
- termina con la prueba de Louis en su teléfono y su iPad.

**Architecture:** son arreglos chicos y separados, agrupados por zona:
- base de datos;
- reserva, en dos tareas: lógica pura y pantallas;
- Mis citas;
- página principal;
- panel.

Después viene una revisión en el navegador con un script de medición (que algo se salga de la pantalla, zonas táctiles, contraste, imágenes). Lo que encuentre se arregla en una tarea propia. La limpieza de datos de prueba y la carga de datos reales **no** van aquí: quedan para la fase final "Entrega" (índice de planes).

**Tech Stack:** React 19 + TypeScript + Vite 7, react-router-dom 7, Supabase JS, CSS plano por componente y
`node --test` (`npm test`).

**Spec:** `docs/superpowers/specs/2026-09-27-rediseno-web-clienta-design.md`. Secciones que usa este plan:
- §3.7 movimiento;
- §3.8 pantallas y reglas de calidad;
- §8 arquitectura: diseño anterior, accesibilidad y rendimiento;
- §10 pruebas;
- §11 paso 7.

**Índice y pendientes:** `docs/superpowers/plans/2026-09-27-rediseno-00-indice.md`, en las notas "Lo que dejó la Fase 1…6".

**De dónde sale cada tarea:**

| Pendiente anotado | Tarea |
|---|---|
| Teléfonos: las citas buscan con todos los dígitos y los paquetes con `telefono_clave`, y la recepción guarda "+1 809…" (Fase 6) | 1 |
| Pegar "+1 829…" da un número equivocado (Fase 6) | 2 |
| "Ver semana" desde un mes que empieza viernes o sábado; día 90 domingo 1; `hoy` no cambia a medianoche (Fase 5) | 2 y 3 |
| La confirmación muestra la cuenta de ejemplo si la configuración no carga; WhatsApp sigue elevado en la confirmación (Fase 5) | 3 |
| El historial no muestra el año; una cita "En curso" pasa al historial al llegar su hora; el botón sube al pasar el mouse mientras busca (Fase 6) | 4 |
| Orden de lectura de las tarjetas de paquetes (Fase 3) | 5 |
| Anunciar el cambio de especialidad del catálogo y llevar el foco a la que abre un destacado; `startViewTransition` sin `catch` (Fase 2) | 5 |
| El equipo se ordena con el título ("Dra." va en la D) (Fase 4) | 5 |
| Destello de color antes de que cargue la app: hoy solo se evita en `/`, y `/reservar` y `/mis-citas` ya usan el sitio nuevo (Fase 1) | 5 |
| Nombres con tilde en Citas y Clientes ("RodríGuez") (Fase 4) | 6 |
| Fotos del equipo: achicado más limpio (Fase 4) | 6 |
| Revisión completa §3.8 y §10, diseño anterior en sus rutas (spec §11.7) | 7 y 8 |
| Prueba en los aparatos de Louis y PR | 9 |

**No entra en esta fase:**
- **Va a la fase Entrega:** contenido de la dueña (precios en RD$ 0, equipo, testimonios, fotos, "Diseño de Cejas" en el menú), números de relleno en los datos, usuarios y contraseñas reales, y borrar los datos de prueba.
- **Idea para más adelante:** la columna `completed_at` para la ventana de 90 días de los paquetes terminados.
- **Se descarta:** mover `.s-arco` y demás piezas de `landing.css` a `ui/`. Solo las usa la página principal.

## Global Constraints

- **Cortes:** celular ≤ 760 px, tableta 761–1100 px y computadora > 1100 px. El CSS se escribe de celular hacia arriba, con `@media (min-width: 761px)` y `@media (min-width: 1101px)`.
- **Anchos de prueba obligatorios:** 360, 390, 430, 820, 1180, 1280 y 1440, en los dos temas (Marrón y Beige).
- **Calidad (spec §3.8):**
  - nada se sale de la pantalla ni se corta;
  - los textos largos bajan de línea o se recortan con "…";
  - los elementos fijos nunca pasan del alto de la ventana y su botón queda visible;
  - WhatsApp no tapa botones de acción;
  - zonas táctiles ≥ 44 px;
  - contraste de texto AA (4.5:1; 3:1 para texto grande de 24 px o más, o de 18.66 px o más en negrita; 3:1 para el borde de un control);
  - nunca se encoge una vista de computadora para que quepa.
- **Movimiento (spec §3.7):** al pasar el mouse nunca cambia la letra, y `prefers-reduced-motion` apaga las animaciones.
- **Accesibilidad (spec §8):** navegación por teclado completa, foco visible, `aria-*` en despliegues y menú, textos alternativos en fotos.
- **Rendimiento (spec §8):**
  - imágenes con `loading="lazy"`, salvo la portada;
  - tamaños fijos (atributos `width`/`height` o `aspect-ratio`) para que la página no salte;
  - `preconnect` de las fuentes.
- **Clases:** prefijo `s-` dentro de `.site`, sin utilidades de Tailwind. Antes de usar un prefijo de clase nuevo, se busca en todo el CSS: `grep -rE "\.s-<prefijo>([^a-zA-Z0-9_-]|-)" vscode/src --include=*.css`. Todo el CSS va en un solo paquete, y en la Fase 6 `s-mc` chocó con la tarjeta Membresía.
- **Código:**
  - comentarios y nombres en español;
  - los módulos puros se prueban con Node e importan con extensión `.ts`;
  - cada archivo conserva sus finales de línea. El repo tiene `core.autocrlf=true`; `App.tsx`, `ClientPortal.tsx`, `BookingPage.tsx`, `database.types.ts`, `MyAppointments.tsx`, `Staff.tsx` y `staffStore.ts` están en CRLF en la copia de trabajo. Antes y después de editar se cuentan los bytes CR, y `git diff` solo debe mostrar las líneas cambiadas.
- **Caracteres tipográficos:** el editor de algunos agentes cambia “ ” · … — ¿ ✓ → y los acentos por ASCII sin avisar. Después de escribir, se cuentan con un script de node. Si se perdió alguno, se restaura con `String.fromCharCode(<código>)`.
- **Base de datos:**
  - las migraciones las aplica el controlador con el MCP de Supabase y se guardan como `vscode/supabase/migration_*.sql`;
  - no se cambian datos sin avisar;
  - los datos de prueba que se creen usan el nombre "Prueba Claude" y se borran al final.
- **Líneas base:**
  - `npx tsc -p tsconfig.app.json --noEmit` da **39 errores**, ninguno en `src/site`;
  - `npm test` da **108**;
  - `npm run build` pasa.

## Review Focus

- **Una clienta que escribe o pega su número con el código del país** ("+1 829-555-0102", "18295550102") en `/reservar` o en `/mis-citas`: el campo queda en "829-555-0102" y la búsqueda funciona. Lo cubre la Task 2 con una prueba.
- **Una cita guardada por recepción como "+1 809…"** aparece en Mis citas al escribir "809…" y se puede cancelar. También el caso contrario. Lo cubre la Task 1, verificado con una cita de prueba.
- **Una pestaña de `/reservar` abierta de un día para otro:** después de la medianoche, ayer queda apagado sin recargar. Lo cubre la Task 2 con una prueba de `msHastaMedianoche`, y la Task 3 con la revisión de `useHoy`.
- **El calendario en el borde de los 90 días:**
  - "Ver mes" y la flecha siguiente nunca abren un mes sin días reservables;
  - "Ver semana" vuelve a una semana nombrada con el mes que se miraba.
  - Lo cubre la Task 2 con pruebas.
- **La configuración no carga:** la confirmación no muestra una cuenta de ejemplo (123456789), sino que pide escribir por WhatsApp. Lo cubre la Task 3; el revisor comprueba el caso `settingsCargados=false`.

---

### Task 0: Rama e índice (la hace el controlador)

- [ ] **Step 1:** La rama `claude/rediseno-fase-7-calidad` sale de `origin/main` (c66c2bf), que ya tiene las Fases 4, 5 y 6. Se sube con `git push -u origin claude/rediseno-fase-7-calidad`: al crearla quedó siguiendo a `origin/main`, y el `-u` la cambia a su propia rama remota.
- [ ] **Step 2:** En el índice, la fila 7 nombra este plan, y se suman la fila 8 "Entrega" y su lista. Va en el mismo commit que el plan.

---

### Task 1: Citas y paquetes buscan con la misma clave de teléfono (la hace el controlador con el MCP de Supabase)

**Files:**
- Create: `vscode/supabase/migration_citas_telefono_clave.sql`

- [ ] **Step 1: Escribir la migración.** Las tres funciones conservan su firma, su `SECURITY DEFINER` y su `search_path`, y `create or replace` mantiene los permisos. Solo cambia cómo se compara el teléfono: se pasa de "todos los dígitos iguales (mínimo 7)" a `telefono_clave`, que usa los últimos 10 dígitos, como ya hace `get_client_packages`.

```sql
-- Mis citas: las citas se buscan con la misma clave de 10 dígitos que los paquetes (telefono_clave). Así una cita
-- guardada como "+1 809-555-0101" (recepción guarda el teléfono tal como se escribe) aparece al escribir
-- "809-555-0101", y al revés. Firma, permisos y regla de 12 h sin cambios.

create or replace function public.get_client_appointments(p_phone text)
returns table(id uuid, client_name text, service text, employee text, date date, "time" time without time zone,
              duration integer, status text, notes text, source text)
language sql stable security definer set search_path = public
as $$
  select a.id, a.client_name, a.service, a.employee, a.date, a."time", a.duration, a.status, a.notes, a.source
  from public.appointments a
  where public.telefono_clave(p_phone) is not null
    and public.telefono_clave(a.client_phone) = public.telefono_clave(p_phone)
  order by a.date desc, a."time" desc
$$;

create or replace function public.get_client_appointment_services(p_phone text)
returns table(appointment_id uuid, servicio text, especialista text, hora time, duracion integer, orden integer)
language sql stable security definer set search_path = public
as $$
  select x.appointment_id, x.service_name, x.employee, x.start_time, x.duration, x.sort_order
  from public.appointment_services x
  join public.appointments a on a.id = x.appointment_id
  where public.telefono_clave(p_phone) is not null
    and public.telefono_clave(a.client_phone) = public.telefono_clave(p_phone)
  order by x.appointment_id, x.sort_order
$$;

create or replace function public.cancel_client_appointment(p_id uuid, p_phone text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_count integer;
begin
  update public.appointments a
  set status = 'cancelled'
  where a.id = p_id
    and public.telefono_clave(p_phone) is not null
    and public.telefono_clave(a.client_phone) = public.telefono_clave(p_phone)
    and a.status in ('pending', 'confirmed')
    and ((a.date::timestamp + a."time") at time zone 'America/Santo_Domingo') > now() + interval '12 hours';
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;
```

- [ ] **Step 2: Aplicarla** con `apply_migration`, con el nombre `citas_telefono_clave`.

- [ ] **Step 3: Verificar con una cita de prueba guardada con "+1".**
```sql
select public.save_appointment(null, null, 'Prueba Claude', '+1 809-000-0000', current_date + 3, '10:00', 'pending', '', 'web',
  jsonb_build_array(jsonb_build_object('service_name', 'Hidrafacial', 'employee', 'Dra. Nadieska Soto', 'duration', 60, 'price', 0)));
begin; set local role anon;
select count(*) from public.get_client_appointments('809-000-0000');            -- 1
select count(*) from public.get_client_appointment_services('8090000000');      -- 1
select count(*) from public.get_client_appointments('809-555-0101');            -- las de María, como antes (≥ 1)
select count(*) from public.get_client_appointments('555-0101');                -- 0: menos de 10 dígitos
rollback;
begin; set local role anon;
select public.cancel_client_appointment((select id from public.appointments where client_name = 'Prueba Claude'), '809-000-0000'); -- true
rollback;
delete from appointment_services where appointment_id in (select id from appointments where client_name = 'Prueba Claude');
delete from appointments where client_name = 'Prueba Claude';
select count(*) from appointments where client_name = 'Prueba Claude';           -- 0
```
Si anon no puede ejecutar la cancelación dentro de la transacción, se ejecuta como `postgres`: la función es `security definer`. El `rollback` deshace la cancelación antes de borrar.

- [ ] **Step 4: Commit**
```bash
git add vscode/supabase/migration_citas_telefono_clave.sql
git commit -m "fix(base): las citas se buscan con la misma clave de teléfono que los paquetes"
```

---

### Task 2: Reserva, la parte pura: teléfono con el 1 del país y bordes del calendario

**Files:**
- Modify: `vscode/src/site/reservar/datos.ts`
- Modify: `vscode/src/site/reservar/calendario.ts`
- Test: `vscode/tests/resumen.test.ts`, `vscode/tests/calendario.test.ts`

**Interfaces:**
- Produces:
  - `formatoTelefono(raw)`: igual que hoy, pero con más de 10 dígitos que empiezan con 1 quita ese 1;
  - `hayReservableEnMes(visto: MesVisto, hoy: string): boolean`;
  - `flechasMes(visto, hoy)`: la flecha `siguiente` solo se habilita si el mes siguiente tiene algún día reservable;
  - `mesAcotado(m: MesVisto, hoy: string): MesVisto`;
  - `lunesParaMes(visto: MesVisto, hoy: string): string`;
  - `msHastaMedianoche(ahora: Date): number`.
  - Las usa la Task 3.

- [ ] **Step 1: Escribir las pruebas.**
  1. En `vscode/tests/resumen.test.ts`, al final:
```ts
test('teléfono con el 1 del país delante: se quita (+1 829…, 1829…)', () => {
  assert.equal(formatoTelefono('+1 829-555-0102'), '829-555-0102');
  assert.equal(formatoTelefono('18295550102'), '829-555-0102');
  // mientras se escribe, con 10 dígitos o menos no se toca
  assert.equal(formatoTelefono('1829555010'), '182-955-5010');
});
```
  2. En `vscode/tests/calendario.test.ts`, el import de las líneas 3–6 queda así:
```ts
import {
  DIAS_MAXIMOS, deIso, diasEntre, etiquetaMes, flechasMes, flechasSemana, hayReservableEnMes, isoLocal, lunesDe,
  lunesParaMes, mesAcotado, mesDeSemana, mesEnCuadricula, motivoNoReservable, msHastaMedianoche, primerDiaReservable,
  semana, sumarDias, sumarMeses,
} from '../src/site/reservar/calendario.ts';
```
  3. Y al final del mismo archivo:
```ts
test('mes: la flecha siguiente no abre un mes sin días reservables (el día 90 es un domingo 1)', () => {
  // desde el lunes 3 de agosto de 2026 el día 90 es el domingo 1 de noviembre
  assert.equal(hayReservableEnMes({ anio: 2026, mes: 10 }, '2026-08-03'), false);
  assert.equal(hayReservableEnMes({ anio: 2026, mes: 9 }, '2026-08-03'), true);
  assert.deepEqual(flechasMes({ anio: 2026, mes: 9 }, '2026-08-03'), { anterior: true, siguiente: false });
});

test('"Ver mes" se queda entre el mes de hoy y el último mes con días reservables', () => {
  assert.deepEqual(mesAcotado({ anio: 2026, mes: 7 }, HOY), { anio: 2026, mes: 8 });
  assert.deepEqual(mesAcotado({ anio: 2026, mes: 9 }, HOY), { anio: 2026, mes: 9 });
  assert.deepEqual(mesAcotado({ anio: 2027, mes: 1 }, HOY), { anio: 2026, mes: 11 });
  assert.deepEqual(mesAcotado({ anio: 2026, mes: 10 }, '2026-08-03'), { anio: 2026, mes: 9 });
});

test('"Ver semana" vuelve a una semana que se nombra con el mes que se miraba', () => {
  assert.equal(lunesParaMes({ anio: 2026, mes: 9 }, HOY), '2026-09-28'); // el jueves 1 de octubre ya es de octubre
  // enero de 2027 empieza viernes: la semana del 1 se nombra diciembre, así que va a la del 4
  assert.equal(lunesParaMes({ anio: 2027, mes: 0 }, '2026-12-15'), '2027-01-04');
  // lo que queda de septiembre cae en una semana que se nombra octubre: se queda ahí, no salta más adelante
  assert.equal(lunesParaMes({ anio: 2026, mes: 8 }, HOY), '2026-09-28');
});

test('milisegundos hasta la medianoche (más 5 segundos de margen)', () => {
  assert.equal(msHastaMedianoche(new Date(2026, 8, 29, 23, 59, 0)), 65_000);
  assert.equal(msHastaMedianoche(new Date(2026, 8, 29, 0, 0, 0)), 86_405_000);
});
```

- [ ] **Step 2: Correrlas y ver que fallan.** Run: `cd vscode && npm test`. Expected: FAIL, porque las funciones nuevas no existen y el teléfono con el 1 sale mal.

- [ ] **Step 3: Implementar.**
  1. En `datos.ts`, `formatoTelefono` queda así:
```ts
/** "8295550102" → "829-555-0102"; nunca más de 10 dígitos. Con más de 10 que empiezan con 1 (el código del país:
 *  "+1 829…", "1829…"), ese 1 se quita. Mientras se escribe, con 10 o menos no se toca nada. */
export function formatoTelefono(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.length > 10 && digits[0] === '1') digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
```
  2. En `calendario.ts`, `flechasMes` queda así:
```ts
/** No se va a un mes ya pasado ni a uno sin días reservables (fuera del límite, o solo un domingo dentro). */
export function flechasMes(visto: MesVisto, hoy: string): Flechas {
  const h = deIso(hoy);
  return {
    anterior: visto.anio * 12 + visto.mes > h.getFullYear() * 12 + h.getMonth(),
    siguiente: hayReservableEnMes(sumarMeses(visto, 1), hoy),
  };
}
```
  3. Y se agrega al final de `calendario.ts`:
```ts
/** Si el mes tiene algún día que se pueda reservar (abierto, desde hoy y dentro del límite). */
export function hayReservableEnMes(visto: MesVisto, hoy: string): boolean {
  return mesEnCuadricula(visto, hoy).some((d) => d !== null && d.motivo === null);
}

/** El mes que abre "Ver mes": nunca antes del de hoy, ni uno sin días reservables al final (p. ej. cuando el día 90 es
 *  un domingo 1). */
export function mesAcotado(m: MesVisto, hoy: string): MesVisto {
  const h = deIso(hoy);
  const desde: MesVisto = { anio: h.getFullYear(), mes: h.getMonth() };
  const n = (x: MesVisto) => x.anio * 12 + x.mes;
  let r = n(m) < n(desde) ? desde : m;
  while (n(r) > n(desde) && !hayReservableEnMes(r, hoy)) r = sumarMeses(r, -1);
  return r;
}

/** La semana que muestra "Ver semana" al volver del mes: la del primer día reservable de ese mes. Si esa semana se
 *  nombra con el mes anterior (su jueves cae antes) y la siguiente sí es del mes, va a la siguiente. */
export function lunesParaMes(visto: MesVisto, hoy: string): string {
  const dia = mesEnCuadricula(visto, hoy).find((d) => d !== null && d.motivo === null)?.iso ?? primerDiaReservable(hoy);
  const lunes = lunesDe(dia);
  const siguiente = sumarDias(lunes, 7);
  const delMes = (l: string) => {
    const m = mesDeSemana(l);
    return m.anio === visto.anio && m.mes === visto.mes;
  };
  return !delMes(lunes) && delMes(siguiente) && flechasSemana(lunes, hoy).siguiente ? siguiente : lunes;
}

/** Cuánto falta para la próxima medianoche local, más 5 s de margen (para cambiar "hoy" sin recargar). */
export function msHastaMedianoche(ahora: Date): number {
  const manana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, 0, 0, 5);
  return manana.getTime() - ahora.getTime();
}
```

- [ ] **Step 4: Correrlas y ver que pasan.** Run: `cd vscode && npm test`. Expected: PASS con **113** (108 + 5). Las pruebas que ya existían para `flechasMes` siguen pasando: octubre tiene días reservables y enero de 2027 no.

- [ ] **Step 5: Tipos y commit**
```bash
cd vscode && npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"   # 39
git add src/site/reservar/datos.ts src/site/reservar/calendario.ts tests/resumen.test.ts tests/calendario.test.ts
git commit -m "fix(reservar): el 1 del país se quita del teléfono y el calendario no abre meses sin días reservables"
```

---

### Task 3: Reserva, las pantallas: "hoy" que cambia solo, cuenta de ejemplo y WhatsApp en la confirmación

**Files:**
- Create: `vscode/src/site/reservar/useHoy.ts`
- Modify: `vscode/src/site/reservar/Reservar.tsx`, `vscode/src/site/reservar/PasoCuando.tsx`, `vscode/src/site/reservar/useBooking.ts`, `vscode/src/site/reservar/Confirmacion.tsx`, `vscode/src/site/reservar/Confirmacion.css`, `vscode/src/site/SiteLayout.css`

**Interfaces:**
- Consumes (Task 2): `isoLocal`, `msHastaMedianoche`, `mesAcotado`, `lunesParaMes` de `./calendario`.
- Produces:
  - `useHoy(): string`;
  - `useBooking()` devuelve además `settingsCargados: boolean`.

- [ ] **Step 1: El hook.** `vscode/src/site/reservar/useHoy.ts`:
```ts
import { useEffect, useState } from 'react';
import { isoLocal, msHastaMedianoche } from './calendario';

/** La fecha de hoy ("AAAA-MM-DD"). Cambia sola a la medianoche y al volver a la pestaña: una pestaña que quedó
 *  abierta de un día para otro no deja reservar ayer. */
export function useHoy(): string {
  const [hoy, setHoy] = useState(() => isoLocal(new Date()));
  useEffect(() => {
    let t = 0;
    const programar = () => {
      t = window.setTimeout(() => { setHoy(isoLocal(new Date())); programar(); }, msHastaMedianoche(new Date()));
    };
    const alVolver = () => { if (document.visibilityState === 'visible') setHoy(isoLocal(new Date())); };
    programar();
    document.addEventListener('visibilitychange', alVolver);
    return () => { window.clearTimeout(t); document.removeEventListener('visibilitychange', alVolver); };
  }, []);
  return hoy;
}
```

- [ ] **Step 2: `Reservar.tsx`.** Se hacen cuatro cambios:
  1. `import { isoLocal } from './calendario';` pasa a `import { useHoy } from './useHoy';`.
  2. `const hoy = useMemo(() => isoLocal(new Date()), []);` pasa a `const hoy = useHoy();`. `useMemo` se sigue usando en otras líneas.
  3. En `<Confirmacion … />`, `cuentas={b.settings.bank_accounts}` pasa a `cuentas={b.settingsCargados ? b.settings.bank_accounts : []}`.
  4. Sobre la línea `if (confirmada) {`, se agrega el comentario `// sin la configuración real no se muestra la cuenta de ejemplo (123456789)`.

- [ ] **Step 3: `useBooking.ts`.** Se hacen dos cambios:
  1. La línea 46 queda `const { settings, fetchSettings, cargado: settingsCargados } = useSettingsStore();`.
  2. En el objeto que devuelve, la línea `settings, sending, …` pasa a `settings, settingsCargados, sending, loadingSlots, success, bookingError, setBookingError, whatsappMsg, confirmada,`.

- [ ] **Step 4: `Confirmacion.tsx` y su CSS.**
  1. En `Confirmacion.tsx`, dentro de `<section className="s-banco" …>`, justo después del `<div className="s-banco-h">…</div>`, se agrega:
```tsx
        {cuentas.length === 0 && (
          <p className="s-banco-sin">Escríbenos por WhatsApp y te pasamos los datos de la cuenta para el depósito.</p>
        )}
```
  2. En `Confirmacion.css`, después de la regla `.s-cuenta > div > span:first-child`, se agrega:
```css
.s-banco-sin{ margin:0; padding-top:14px; border-top:1px solid var(--s-line); font-size:14px; line-height:1.55; color:var(--s-soft) }
```

- [ ] **Step 5: `PasoCuando.tsx`.** Se hacen tres cambios:
  1. El import de `./calendario` queda así:
```ts
import {
  etiquetaMes, flechasMes, flechasSemana, lunesDe, lunesParaMes, mesAcotado, mesDeSemana, mesEnCuadricula,
  primerDiaReservable, semana, sumarDias, sumarMeses,
  type Dia, type MesVisto,
} from './calendario';
```
  2. Se borra el bloque `acotarMes`: su comentario y la función, de "// "Ver mes" nunca abre un mes…" hasta la llave que la cierra.
  3. `alternarVista` queda así:
```ts
  const alternarVista = () => {
    if (vista === 'semana') {
      // "Ver mes" nunca abre un mes que queda fuera de lo reservable (el jueves de la semana puede caer en otro mes)
      setMes(mesAcotado(mesDeSemana(lunes), p.hoy));
      setVista('mes');
    } else {
      // "Ver semana" sigue al mes que se estaba mirando: si la semana no es de ese mes, va a una semana de ese mes
      const deLaSemana = mesDeSemana(lunes);
      if (deLaSemana.anio !== mes.anio || deLaSemana.mes !== mes.mes) setLunes(lunesParaMes(mes, p.hoy));
      setVista('semana');
    }
  };
```

- [ ] **Step 6: WhatsApp en la confirmación.** En `vscode/src/site/SiteLayout.css`, después de `.s-wa.is-elevado{ bottom:92px }` (línea 13), se agrega:
```css
/* en /reservar sube por la barra de abajo; en la confirmación ya no hay barra y vuelve a su lugar */
.site:not(:has(.s-rbar)) .s-wa.is-elevado{ bottom:14px }
@media (min-width: 761px){ .site:not(:has(.s-rbar)) .s-wa.is-elevado{ bottom:20px } }
```

- [ ] **Step 7: Comprobación**
```bash
cd vscode
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"     # 39
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep "src/site"         # nada
npx eslint src/site/reservar/useHoy.ts src/site/reservar/PasoCuando.tsx src/site/reservar/Reservar.tsx src/site/reservar/Confirmacion.tsx
npm test                                                             # 113
npm run build
```

- [ ] **Step 8: Commit**
```bash
git add src/site/reservar/useHoy.ts src/site/reservar/Reservar.tsx src/site/reservar/PasoCuando.tsx src/site/reservar/useBooking.ts src/site/reservar/Confirmacion.tsx src/site/reservar/Confirmacion.css src/site/SiteLayout.css
git commit -m "fix(reservar): hoy cambia a la medianoche, sin cuenta de ejemplo y WhatsApp en su lugar en la confirmación"
```

---

### Task 4: Mis citas: año en el historial, cita en curso arriba y botón quieto mientras busca

**Files:**
- Modify: `vscode/src/site/portal/portal.ts`, `vscode/src/site/portal/MisCitas.css`
- Test: `vscode/tests/portal.test.ts`

**Interfaces:**
- Produces:
  - `fechaCorta(iso: string, anioActual?: number): string` (compatible con lo de hoy);
  - `vistaCitas`: una cita `in_progress` va a próximas mientras no pasen 12 h desde que empezó;
  - `CitaVista.fechaCorta` lleva el año cuando no es el año actual en Santo Domingo.

- [ ] **Step 1: Pruebas.** En `vscode/tests/portal.test.ts`:
  1. La prueba "próximas: activas y por venir…" (líneas 43–46) queda así:
```ts
test('próximas: pendientes y confirmadas por venir, y la que está en curso; historial: lo demás, de la más reciente', () => {
  assert.deepEqual(proximas.map((c) => c.id), ['E', 'B', 'A']);
  assert.deepEqual(historial.map((c) => c.id), ['D', 'C']);
});
```
  2. Y se agrega, después de la prueba "cancelar: justo a las 12 h…":
```ts
test('una cita en curso de hace días (nadie la cerró) va al historial; el historial de otro año lleva el año', () => {
  const r = vistaCitas([
    cita('I', '2026-09-15', '09:00:00', 'in_progress'),
    cita('J', '2025-12-20', '10:00:00', 'completed'),
  ], [], AHORA);
  assert.deepEqual(r.proximas, []);
  assert.deepEqual(r.historial.map((c) => [c.id, c.fechaCorta]), [['I', '15 sep'], ['J', '20 dic 2025']]);
  assert.equal(fechaCorta('2025-12-20', 2026), '20 dic 2025');
  assert.equal(fechaCorta('2026-09-15', 2026), '15 sep');
});
```

- [ ] **Step 2:** Run: `cd vscode && npm test`. Expected: FAIL, porque la cita E todavía va al historial y no hay año.

- [ ] **Step 3: Implementar en `portal.ts`.**
  1. `fechaCorta` queda así, y debajo va la ayuda del año:
```ts
/** "2026-09-15" → "15 sep"; si se pasa el año actual y es otro, "20 dic 2025". */
export function fechaCorta(iso: string, anioActual?: number): string {
  const d = deIso(iso);
  const base = `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
  return anioActual !== undefined && d.getFullYear() !== anioActual ? `${base} ${d.getFullYear()}` : base;
}

/** El año en Santo Domingo en ese instante (UTC-4 todo el año). */
const anioEnSantoDomingo = (ahora: Date) => new Date(ahora.getTime() - 4 * 3_600_000).getUTCFullYear();
```
  2. En `vista`, `fechaCorta: fechaCorta(c.date),` pasa a `fechaCorta: fechaCorta(c.date, anioEnSantoDomingo(ahora)),`.
  3. `vistaCitas` queda así:
```ts
/** Próximas: pendientes y confirmadas por venir, de la más cercana a la más lejana, y la que está en curso (hasta 12 h
 *  después de empezar, por si nadie la cierra). Historial: lo demás, de la más reciente a la más vieja. */
export function vistaCitas(
  citas: FilaCita[], servicios: FilaServicioCita[], ahora: Date,
): { proximas: CitaVista[]; historial: CitaVista[] } {
  const proximas: CitaVista[] = [];
  const historial: CitaVista[] = [];
  for (const c of citas) {
    const v = vista(c, servicios, ahora);
    const faltan = horasHasta(c.date, c.time, ahora);
    const proxima = c.status === 'in_progress' ? faltan > -12 : ACTIVAS.includes(c.status) && faltan > 0;
    (proxima ? proximas : historial).push(v);
  }
  const clave = (v: CitaVista) => `${v.fecha} ${v.hora}`;
  proximas.sort((a, b) => clave(a).localeCompare(clave(b)));
  historial.sort((a, b) => clave(b).localeCompare(clave(a)));
  return { proximas, historial };
}
```

- [ ] **Step 4: El botón quieto mientras busca.** En `MisCitas.css`, la línea `.s-lookup .s-btn[aria-disabled="true"]{ opacity:.6; cursor:default }` queda:
```css
.s-lookup .s-btn[aria-disabled="true"]{ opacity:.6; cursor:default; transform:none; box-shadow:none }
```

- [ ] **Step 5:**
```bash
cd vscode && npm test          # 114
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep "src/site"   # nada
git add src/site/portal/portal.ts src/site/portal/MisCitas.css tests/portal.test.ts
git commit -m "fix(portal): año en el historial, la cita en curso queda arriba y el botón no sube mientras busca"
```

---

### Task 5: Página principal: orden de lectura, catálogo accesible, orden del equipo y sin destello

**Files:**
- Modify: `vscode/src/site/landing/PaquetesAhorro.tsx`, `vscode/src/site/landing/PaquetesMembresia.tsx`, `vscode/src/site/landing/PaquetesMembresia.css`
- Modify: `vscode/src/site/landing/Catalog.tsx`, `vscode/src/site/landing/Catalog.css`
- Modify: `vscode/src/site/theme/useSiteTema.ts`
- Modify: `vscode/src/site/landing/equipo.ts`
- Test: `vscode/tests/equipo.test.ts`
- Modify: `vscode/index.html` (revisar sus finales de línea antes de editar)

**Interfaces:**
- Produces: `nombreParaOrdenar(nombre: string): string` en `equipo.ts`.

- [ ] **Step 1: Prueba del equipo.**
  1. En `vscode/tests/equipo.test.ts`, el import pasa a `import { equipoPublico, iniciales, nombreParaOrdenar, textoONull, type FilaEquipo } from '../src/site/landing/equipo.ts';`.
  2. Se agrega esta prueba:
```ts
test('equipo: los títulos no cuentan para ordenar ("Dra. Nadieska Soto" va con la N)', () => {
  assert.equal(nombreParaOrdenar('Dra. Nadieska Soto'), 'Nadieska Soto');
  assert.equal(nombreParaOrdenar('Lic. María Díaz'), 'María Díaz');
  assert.equal(nombreParaOrdenar('Dra.'), 'Dra.');
  const r = equipoPublico([
    fila({ id: '1', name: 'Paola Jiménez' }),
    fila({ id: '2', name: 'Dra. Nadieska Soto' }),
    fila({ id: '3', name: 'Carmen Rodríguez' }),
  ]);
  assert.deepEqual(r.map((m) => m.nombre), ['Carmen Rodríguez', 'Dra. Nadieska Soto', 'Paola Jiménez']);
});
```
  3. Run `cd vscode && npm test`. Expected: FAIL, porque `nombreParaOrdenar` no existe.

- [ ] **Step 2: `equipo.ts`.**
  1. Después de `iniciales`, se agrega:
```ts
/** El nombre sin los títulos de delante, para ordenar: "Dra. Nadieska Soto" va con la N. Nunca queda vacío. */
export function nombreParaOrdenar(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/);
  let i = 0;
  while (i < palabras.length - 1 && TITULOS.has(palabras[i].replace(/[^\p{L}]/gu, '').toLocaleLowerCase('es'))) i++;
  return palabras.slice(i).join(' ');
}
```
  2. En el `sort` de `equipoPublico`, `a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })` pasa a
     `nombreParaOrdenar(a.nombre).localeCompare(nombreParaOrdenar(b.nombre), 'es', { sensitivity: 'base' })`.
  3. El comentario de `equipoPublico` suma "(sin contar títulos como Dra.)".
  4. Run `npm test`. Expected: **115**.

- [ ] **Step 3: Orden de lectura de las tarjetas de paquetes (Fase 3).** Quien navega por encabezados debe llegar al nombre del paquete antes que a "Más elegido" o al servicio.
  1. `PaquetesAhorro.tsx`: la insignia pasa a `{esDestacado && <span className="s-sc-flag" aria-hidden="true">Más elegido</span>}`, y el título a
     `<h3 className="s-display">{nombreCorto(p.nombre)}{esDestacado && <span className="s-sr"> (el más elegido)</span>}</h3>`.
  2. `PaquetesMembresia.tsx`: la insignia pasa a `{esDestacado && <span className="s-mc-badge" aria-hidden="true">Más elegido</span>}`, y dentro de `.s-mc-mid` el título va primero en el HTML:
```tsx
              <div className="s-mc-mid">
                <h3 className="s-display s-mc-nombre">
                  {nombreCorto(p.nombre)}{esDestacado && <span className="s-sr"> (el más elegido)</span>}
                </h3>
                {p.servicio && <p className="s-mc-svc">{p.servicio}</p>}
              </div>
```
  3. `PaquetesMembresia.css`: a la regla `.s-mc-mid{ … }` se le suma `display:flex; flex-direction:column`, y a `.s-mc-svc{ … }` se le suma `order:-1`. Así el servicio se sigue viendo arriba del nombre.

- [ ] **Step 4: Catálogo accesible (Fase 2), en `Catalog.tsx`.**
  1. Junto a los otros `useState` y `useRef` del componente, se agrega:
```ts
  const [anuncio, setAnuncio] = useState('');
  const tituloPanel = useRef<HTMLHeadingElement>(null);
```
  2. Antes de `const elegirFamilia`, se agrega:
```ts
  // en tableta y computadora el panel cambia sin mover el foco: se anuncia qué especialidad quedó a la vista
  const elegirEspecialidad = (id: string) => {
    onElegir(id);
    const c = catalogo.find((x) => x.id === id);
    if (c) setAnuncio(`${c.titulo}: ${plural(c.total)}`);
  };
```
  3. En los botones `.s-cat-btn`, `onClick={() => onElegir(c.id)}` pasa a `onClick={() => elegirEspecialidad(c.id)}`.
  4. En el efecto de `pedido`, dentro del `setTimeout` y justo después de `window.scrollTo({ top, behavior: … });`, se agrega:
```ts
      // el foco va a la especialidad que se abrió: en celular, su botón; en tableta y computadora, el título del panel
      const foco = movil ? destino.querySelector<HTMLElement>('.s-acc-btn') : tituloPanel.current;
      foco?.focus({ preventScroll: true });
```
  5. El título del panel pasa a `<h4 className="s-display s-cp-tit" tabIndex={-1} ref={tituloPanel}>{actual.titulo}</h4>`.
  6. Justo después del `</div>` que cierra `.s-cat-grid`, se agrega `<p className="s-sr" aria-live="polite">{anuncio}</p>`.
  7. En `Catalog.css`, después de `.s-cp-tit{ … }`, se agrega `.s-cp-tit:focus{ outline:none }`.

- [ ] **Step 5: Tema sin errores en la consola (Fase 2).** En `useSiteTema.ts`, el cuerpo de `setTema` queda así:
```ts
  const setTema = useCallback((t: Tema) => {
    guardarTema(almacen(), t);
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready?: Promise<unknown>; finished?: Promise<unknown> } | undefined;
    };
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (doc.startViewTransition && !reducir) {
      const vt = doc.startViewTransition(() => flushSync(() => setEstado(t)));
      // con la pestaña oculta la transición se cancela y sus promesas se rechazan: el tema ya cambió, no es un error
      vt?.ready?.catch(() => {});
      vt?.finished?.catch(() => {});
    } else {
      setEstado(t);
    }
  }, []);
```

- [ ] **Step 6: Sin destello en `/reservar` y `/mis-citas` (Fase 1).** En `vscode/index.html`, el segundo `<script>` del `<head>` (el que pone el fondo antes de cargar la app) tiene dos cambios:
  1. La condición pasa a `if (location.hostname.indexOf('app.') === 0 || ['/', '/reservar', '/mis-citas'].indexOf(location.pathname) === -1) return;`.
  2. Su comentario pasa a "Páginas nuevas de la clienta (/, /reservar, /mis-citas): el fondo del tema desde el primer instante…". El resto del comentario sigue igual.

  Se conservan los finales de línea del archivo.

- [ ] **Step 7: Comprobación y commit**
```bash
cd vscode
npm test                                                             # 115
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"     # 39
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep "src/site"         # nada
npx eslint src/site/landing/Catalog.tsx src/site/landing/PaquetesAhorro.tsx src/site/landing/PaquetesMembresia.tsx src/site/theme/useSiteTema.ts src/site/landing/equipo.ts
npm run build
git add src/site/landing/PaquetesAhorro.tsx src/site/landing/PaquetesMembresia.tsx src/site/landing/PaquetesMembresia.css src/site/landing/Catalog.tsx src/site/landing/Catalog.css src/site/theme/useSiteTema.ts src/site/landing/equipo.ts tests/equipo.test.ts index.html
git commit -m "fix(landing): orden de lectura de los paquetes, catálogo que se anuncia, equipo sin títulos al ordenar y sin destello"
```

---

### Task 6: Panel: nombres con tilde en Citas y Clientes, y fotos más limpias

**Files:**
- Modify: `vscode/src/pages/admin/Appointments.tsx`, `vscode/src/pages/admin/Clients.tsx`, `vscode/src/lib/fotos.ts`. Se conservan sus finales de línea; antes de editar se cuentan los CR.

- [ ] **Step 1: Citas.** En `Appointments.tsx`:
  1. Se borra la función local `capitalizeName`, que escribe "RodríGuez" porque `\b\w` no reconoce letras con tilde. El comentario `//  Formatters & validators` queda, porque sigue `formatPhone`.
  2. Se agrega `import { capitalizarNombre } from '../../lib/nombres';` junto a los otros imports de `../../lib/`.
  3. `capitalizeName(text)` pasa a `capitalizarNombre(text)`.
- [ ] **Step 2: Clientes.** En `Clients.tsx`:
  1. Se borra la función local `capitalizeName` y su comentario `/** Capitalizes each word… */`.
  2. Se agrega `import { capitalizarNombre } from '../../lib/nombres';`.
  3. `capitalizeName(e.target.value)` pasa a `capitalizarNombre(e.target.value)`.
- [ ] **Step 3: Fotos.** En `fotos.ts`, justo después de `if (!ctx) return archivo;`, se agrega:
```ts
    // achicado de mejor calidad (sin esto algunos navegadores usan el más rápido y la foto sale con dientes)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
```
- [ ] **Step 4: Comprobación y commit**
```bash
cd vscode
grep -rn "capitalizeName" src    # nada
npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -c "error TS"   # 39 (o menos, si alguno de esos errores era de estas líneas)
npm test                                                          # 115
npm run build
git add src/pages/admin/Appointments.tsx src/pages/admin/Clients.tsx src/lib/fotos.ts
git commit -m "fix(panel): nombres con tilde en Citas y Clientes, y fotos del equipo achicadas con mejor calidad"
```

---

### Task 7: Revisión completa en el navegador (la hace el controlador)

**Files:**
- Create: `.superpowers/sdd/2026-09-30-rediseno-fase-7-calidad/auditoria.md` (espacio de trabajo, no va al repo)

- [ ] **Step 1: Preparar.**
  1. Pedir a Louis que muestre el panel del navegador (Ctrl+Shift+B), para poder tomar capturas y desplazar la página. Si no puede, se sigue solo con el script. Las capturas y el desplazamiento quedan entonces para su prueba del Task 9.
  2. Levantar `preview_start {name: "sitio-rediseno"}`.
  3. Crear los datos de prueba de `/mis-citas`: el Step 1 de la Task 7 del plan de la Fase 6 (`2026-09-30-rediseno-fase-6-mis-citas.md`), con la clienta "Prueba Claude", el teléfono 809-000-0000, un paquete y cuatro citas.

- [ ] **Step 2: El script de medición.** Se ejecuta con `javascript_tool` en cada página, ancho y tema, y devuelve JSON:
```js
(() => {
  const W = document.documentElement.clientWidth, H = window.innerHeight;
  const raiz = document.querySelector('.site') || document.body;
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const nombre = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
    (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '');
  const oculto = (el) => el.closest('.s-sr, [aria-hidden="true"], [inert]');
  // 1. se sale de la pantalla (no cuenta lo que está dentro de un contenedor que recorta o se desliza solo)
  const fuera = [];
  raiz.querySelectorAll('*').forEach((el) => {
    if (!visible(el) || oculto(el)) return;
    for (let p = el.parentElement; p && p !== raiz; p = p.parentElement) {
      if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(p).overflowX)) return;
    }
    const r = el.getBoundingClientRect();
    if (r.right > W + 1 || r.left < -1) fuera.push(nombre(el));
  });
  // 2. zonas táctiles de menos de 44 px (botones, enlaces con forma de botón, campos; casillas por su etiqueta)
  const chicos = [];
  raiz.querySelectorAll('button, a.s-btn, input:not([type=hidden]), select, textarea, [role=button], [role=tab]').forEach((el) => {
    if (oculto(el) || el.disabled) return;
    let caja = el;
    if (el.matches('input[type=checkbox], input[type=radio]')) caja = el.closest('label') || el;
    if (!visible(caja)) return;
    const r = caja.getBoundingClientRect();
    if (r.height < 43.5 || r.width < 43.5) chicos.push(`${nombre(caja)} ${Math.round(r.width)}×${Math.round(r.height)}`);
  });
  // 3. contraste AA del texto (sobre foto o textura con imagen se anota aparte para mirarlo a ojo)
  const rgba = (s) => { const m = s.match(/[\d.]+/g); if (!m) return null; const [r, g, b, a = 1] = m.map(Number); return { r, g, b, a }; };
  const mezcla = (t, f) => ({ r: t.r * t.a + f.r * (1 - t.a), g: t.g * t.a + f.g * (1 - t.a), b: t.b * t.a + f.b * (1 - t.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const fondo = (el) => { const capas = []; let conImagen = false;
    for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e);
      if (s.backgroundImage !== 'none') conImagen = true;
      const c = rgba(s.backgroundColor); if (c && c.a > 0) { capas.push(c); if (c.a === 1) break; } }
    let base = capas.length && capas[capas.length - 1].a === 1 ? capas.pop() : { r: 255, g: 255, b: 255, a: 1 };
    for (let i = capas.length - 1; i >= 0; i--) base = mezcla(capas[i], base);
    return { base, conImagen }; };
  const bajos = [], sobreImagen = [];
  raiz.querySelectorAll('*').forEach((el) => {
    if (!visible(el) || oculto(el) || el.closest(':disabled')) return;
    const texto = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!texto) return;
    const s = getComputedStyle(el);
    const { base, conImagen } = fondo(el);
    const fg = mezcla(rgba(s.color), base);
    const L1 = lum(fg), L2 = lum(base);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(s.fontSize), grande = px >= 24 || (px >= 18.66 && Number(s.fontWeight) >= 700);
    if (ratio < (grande ? 3 : 4.5)) (conImagen ? sobreImagen : bajos).push(`${nombre(el)} ${ratio.toFixed(2)} "${el.textContent.trim().slice(0, 30)}"`);
  });
  // 4. imágenes: sin alt, sin tamaño fijo, o sin carga diferida (salvo la portada)
  const imagenes = [];
  raiz.querySelectorAll('img').forEach((img) => {
    if (!img.hasAttribute('alt')) imagenes.push(`sin alt: ${img.src.split('/').pop()}`);
    const conTamano = (img.getAttribute('width') && img.getAttribute('height')) || getComputedStyle(img).aspectRatio !== 'auto'
      || img.closest('.s-arco, [class*="img"], [class*="foto"]');
    if (!conTamano) imagenes.push(`sin tamaño: ${img.src.split('/').pop()}`);
    if (img.loading !== 'lazy' && !img.closest('.s-hero, header, nav, .s-menu')) imagenes.push(`sin lazy: ${img.src.split('/').pop()}`);
  });
  // 5. fijos más altos que la ventana; 6. WhatsApp encima de un botón (en la posición actual de la página)
  const fijosAltos = [], tapados = [];
  raiz.querySelectorAll('*').forEach((el) => { const p = getComputedStyle(el).position;
    if ((p === 'fixed' || p === 'sticky') && visible(el) && el.getBoundingClientRect().height > H + 1) fijosAltos.push(nombre(el)); });
  const wa = document.querySelector('.s-wa');
  if (wa && visible(wa)) { const w = wa.getBoundingClientRect();
    raiz.querySelectorAll('button, a.s-btn').forEach((b) => { if (b === wa || !visible(b) || oculto(b)) return;
      const r = b.getBoundingClientRect();
      if (r.left < w.right && r.right > w.left && r.top < w.bottom && r.bottom > w.top) tapados.push(nombre(b)); }); }
  return JSON.stringify({ W, scrollW: document.documentElement.scrollWidth, fuera: fuera.slice(0, 15), chicos, bajos,
    sobreImagen: sobreImagen.slice(0, 15), imagenes, fijosAltos, tapados });
})()
```
El tema se cambia guardándolo y recargando la página: `localStorage.setItem('anadsll-site-tema', 'claro' | 'oscuro')` y después `location.reload()`. Si se cambiara en vivo, la transición quedaría a medias con el panel oculto y el contraste saldría mal.

- [ ] **Step 3: Recorrer las páginas.** Cada estado se mide en los 7 anchos y los dos temas:
  - `/` con todo cerrado;
  - `/` con una especialidad del catálogo abierta: en celular, el acordeón; en computadora, el panel;
  - `/` con el menú abierto, en 390 y en 1280;
  - `/reservar` al entrar;
  - `/reservar` con un servicio y un día elegidos (las horas a la vista) y con el paso 3 a la vista;
  - `/reservar?paquete=<id de session_packages activo>`;
  - la confirmación: una reserva real con "Prueba Claude", que se borra después, como en la Fase 5;
  - `/mis-citas` vacía;
  - `/mis-citas` con 809-000-0000;
  - `/mis-citas` con 829-111-2222, el número sin citas.

  Además:
  - en cada página, recién cargada: `read_console_messages` con `onlyErrors`, sin errores;
  - `/diseno-anterior`, `/diseno-anterior/reservar` y `/diseno-anterior/mis-citas` abren, tienen `meta[name=robots]` con `noindex` y no dan errores en la consola (spec §8);
  - con teclado: Tab recorre la barra, el menú (el foco queda dentro y vuelve a MENÚ), el catálogo, la reserva y Mis citas, y el foco siempre se ve;
  - en el código (spec §3.7), que al pasar el mouse no cambie la letra y que las animaciones nuevas se apaguen con
    `prefers-reduced-motion`:
```bash
grep -rnE ":hover[^{]*\{[^}]*font-(style|weight|size|family)" vscode/src/site --include=*.css    # nada
grep -rln "animation" vscode/src/site --include=*.css    # cada archivo: su animación la apaga el bloque de reduced-motion de tokens.css
```

- [ ] **Step 4: Anotar** cada hallazgo en `auditoria.md`:
  - página y estado, ancho y tema, categoría (fuera, táctil, contraste, imagen, fijo, tapado, consola, teclado), elemento y valor;
  - los que son falsos positivos, con su razón. Por ejemplo: un enlace dentro de un párrafo (se admite en línea), el texto sobre una foto con capa oscura revisado a ojo, o un elemento decorativo.
- [ ] **Step 5: Borrar los datos de prueba** con el Step 3 de la Task 7 de la Fase 6, más la cita de la confirmación, y comprobar que quedan 0.

---

### Task 8: Arreglar lo que encontró la revisión

**Files:** los que señale `auditoria.md`.

**Interfaces:** ninguna nueva. Se arregla sin cambiar lo que hace cada pieza.

- [ ] **Step 1:** El controlador pasa al implementador la lista de hallazgos reales, sin los falsos positivos. El implementador arregla cada uno con el cambio más chico que lo resuelve, según su categoría:
  - **Se sale de la pantalla:** `min-width:0` en el hijo de un grid o flex, `overflow-wrap:anywhere` en el texto, o `flex-wrap:wrap` en la fila. Nunca `overflow:hidden` en el `body` ni en `.site`.
  - **Zona táctil chica:** `min-height:44px` (y `min-width:44px` si es un ícono), o más `padding`, sin agrandar la letra.
  - **Contraste:** usar los tokens del tema (`--s-text`, `--s-soft`, `--s-accent`, `--s-faint`) según el caso. Un color nuevo solo se agrega como token en los dos temas y con su contraste calculado en los dos.
  - **Imagen:** atributos `width`/`height` con la medida real, o `aspect-ratio` en su CSS; `loading="lazy"` si no es la portada; `alt=""` si es decorativa.
  - **Fijo más alto que la ventana:** `max-height:calc(100dvh - <barra>)` con `overflow:auto`.
  - **WhatsApp tapa un botón:** `padding-bottom` al final de esa página, o el botón en otra posición en ese ancho.
  - **Consola o teclado:** el arreglo puntual que diga el hallazgo.
- [ ] **Step 2:** Por cada zona del código, un commit en español: `fix(<zona>): …`.
- [ ] **Step 3:** Se comprueba lo mismo de siempre: tsc (39, nada en `src/site`), `npm test` (115), eslint en los archivos tocados, `npm run build` y los caracteres.
- [ ] **Step 4:** El controlador vuelve a pasar el script solo en las páginas, anchos y temas de los hallazgos, y anota el resultado en `auditoria.md`.

---

### Task 9: Prueba en los aparatos de Louis, notas y PR

- [ ] **Step 1:**
  1. Levantar el servidor para la WiFi. `sitio-rediseno` ya corre con `--host` en el puerto 5181.
  2. Buscar la IP de la PC con `ipconfig` (la IPv4 del adaptador WiFi) y darle a Louis `http://<ip>:5181`.
  3. Louis revisa en su teléfono y en su iPad, en los dos temas:
     - página principal, menú y catálogo;
     - reservar: que la página baje a cada paso, la lista de servicios, la barra con el teclado abierto y el botón del resumen en el iPad acostado;
     - la confirmación;
     - Mis citas: que baje a los resultados, "Recordar" y cancelar;
     - el panel de Equipo: marcar a alguien, su cargo y una foto vertical del iPhone (que no salga girada).
  4. Lo que encuentre se arregla como en la Task 8.
- [ ] **Step 2:** Notas "Lo que dejó la Fase 7" en el índice. Si quedó algo abierto, se anota ahí; lo que es de datos o de contenido va a la lista de Entrega.
- [ ] **Step 3:** Subir la rama con `git push -u origin claude/rediseno-fase-7-calidad` y abrir el PR "Rediseño fase 7: calidad y pendientes" **contra `main`**. No hay PRs encadenados. Fusionarlo publica.

## Al terminar la Fase 7

Sigue la fase **Entrega**. Su plan se escribe al empezarla, y su lista está en el índice. Cubre:
- borrar los datos de prueba, conservando precios y catálogo;
- los usuarios y las contraseñas reales;
- la configuración real;
- el contenido de la dueña;
- los respaldos;
- la prueba final con la dueña.
