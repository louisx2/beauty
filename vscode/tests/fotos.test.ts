import { test } from 'node:test';
import assert from 'node:assert/strict';
import { medidaReducida } from '../src/lib/fotos.ts';

test('medidaReducida: el lado mayor pasa de 800, escala proporcional', () => {
  assert.deepEqual(medidaReducida(4000, 3000), { ancho: 800, alto: 600 });
  assert.deepEqual(medidaReducida(3000, 4000), { ancho: 600, alto: 800 });
  assert.deepEqual(medidaReducida(801, 400), { ancho: 800, alto: 400 });
  assert.deepEqual(medidaReducida(600, 900), { ancho: 533, alto: 800 });
});

test('medidaReducida: si ya cabe, o la medida no sirve, no cambia', () => {
  assert.deepEqual(medidaReducida(600, 800), { ancho: 600, alto: 800 });
  assert.deepEqual(medidaReducida(800, 800), { ancho: 800, alto: 800 });
  assert.deepEqual(medidaReducida(0, 0), { ancho: 0, alto: 0 });
});
