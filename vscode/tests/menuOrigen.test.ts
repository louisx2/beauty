import { test } from 'node:test';
import assert from 'node:assert/strict';
import { origenDesdeBoton } from '../src/site/header/menuOrigen.ts';

test('el círculo nace en el centro de las líneas del botón', () => {
  assert.deepEqual(origenDesdeBoton({ right: 340, top: 11, height: 42 }), { x: 319, y: 32 });
});

test('redondea a píxeles enteros', () => {
  assert.deepEqual(origenDesdeBoton({ right: 1254.6, top: 16.2, height: 42 }), { x: 1234, y: 37 });
});
