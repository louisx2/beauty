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
