import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fechaLocal } from '../src/lib/fechas.ts';

test('de noche sigue siendo el mismo día (no el de la hora universal)', () => {
  // a las 9:30 p. m. en Santo Domingo ya es el día siguiente en UTC
  assert.equal(fechaLocal(new Date(2026, 9, 3, 21, 30)), '2026-10-03');
  assert.equal(fechaLocal(new Date(2026, 9, 3, 23, 59)), '2026-10-03');
});

test('de madrugada también', () => {
  assert.equal(fechaLocal(new Date(2026, 9, 3, 0, 5)), '2026-10-03');
});

test('mes y día con dos cifras', () => {
  assert.equal(fechaLocal(new Date(2026, 0, 9, 12)), '2026-01-09');
});

test('la fecha con hora de la base queda en el día del salón; una fecha sola, igual', async () => {
  const { soloFecha } = await import('../src/lib/fechas.ts');
  assert.equal(soloFecha('2026-09-05'), '2026-09-05');
  // la misma hora vista en el reloj del equipo
  const d = new Date('2026-09-05T14:23:11.123+00:00');
  assert.equal(soloFecha('2026-09-05T14:23:11.123+00:00'), fechaLocal(d));
  assert.equal(soloFecha(null), '');
  assert.equal(soloFecha('no es fecha'), '');
});
