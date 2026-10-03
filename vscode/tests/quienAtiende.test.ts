import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atiendeClientas, puedeHacer } from '../src/lib/quienAtiende.ts';

const especialista = { role: 'specialist', serviceIds: ['laser', 'cejas'] };
const especialistaSinLista = { role: 'specialist', serviceIds: [] };
const duena = { role: 'admin', serviceIds: ['limpieza', 'cejas'] };
const soporte = { role: 'admin', serviceIds: [] };
const recepcion = { role: 'receptionist', serviceIds: [] };

test('atiende: las especialistas y la administración con servicios; recepción y soporte no', () => {
  assert.equal(atiendeClientas(especialista), true);
  assert.equal(atiendeClientas(especialistaSinLista), true);
  assert.equal(atiendeClientas(duena), true);
  assert.equal(atiendeClientas(soporte), false);
  assert.equal(atiendeClientas(recepcion), false);
});

test('puede hacer: cada una lo que tiene marcado', () => {
  assert.equal(puedeHacer(especialista, 'laser'), true);
  assert.equal(puedeHacer(especialista, 'limpieza'), false);
  assert.equal(puedeHacer(duena, 'limpieza'), true);
  assert.equal(puedeHacer(duena, 'laser'), false);
});

test('puede hacer: la especialista sin servicios marcados hace todos; la administración sin servicios, ninguno', () => {
  assert.equal(puedeHacer(especialistaSinLista, 'laser'), true);
  assert.equal(puedeHacer(soporte, 'laser'), false);
  assert.equal(puedeHacer(recepcion, 'laser'), false);
});

test('recepción no atiende aunque le quede un servicio marcado de antes', () => {
  assert.equal(atiendeClientas({ role: 'receptionist', serviceIds: ['laser'] }), false);
  assert.equal(puedeHacer({ role: 'receptionist', serviceIds: ['laser'] }, 'laser'), false);
});
