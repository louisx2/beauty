import { test } from 'node:test';
import assert from 'node:assert/strict';
import { idDeHash } from '../src/site/header/navegacion.ts';

test('ids nuevos pasan tal cual', () => {
  assert.equal(idDeHash('#s-contacto'), 's-contacto');
});

test('los nombres del sitio anterior llevan a la sección nueva', () => {
  assert.equal(idDeHash('#paquetes'), 's-paquetes');
  assert.equal(idDeHash('#hero'), 's-inicio');
  assert.equal(idDeHash('#contacto'), 's-contacto');
});

test('un hash mal formado no rompe', () => {
  assert.equal(idDeHash('#%'), null);
});
