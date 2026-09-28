import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SECCIONES, seccionActiva } from '../src/site/header/secciones.ts';

const marcas = [
  { id: 's-inicio', top: -900 },
  { id: 's-servicios', top: -100 },
  { id: 's-paquetes', top: 250 },
  { id: 's-nosotros', top: 900 },
];

test('las siete secciones del menú, en orden', () => {
  assert.deepEqual(SECCIONES.map((s) => s.etiqueta), ['Inicio', 'Servicios', 'Paquetes', 'Nosotros', 'Equipo', 'Opiniones', 'Contacto']);
  assert.ok(SECCIONES.every((s) => s.id.startsWith('s-')));
});

test('activa es la última que ya cruzó la línea', () => {
  assert.equal(seccionActiva(marcas, 260), 's-paquetes');
  assert.equal(seccionActiva(marcas, 200), 's-servicios');
});

test('arriba del todo: Inicio aunque nada haya cruzado', () => {
  assert.equal(seccionActiva([{ id: 's-inicio', top: 10 }, { id: 's-servicios', top: 700 }], 5), 's-inicio');
});

test('filosofía reporta Nosotros: dos marcas con el mismo id', () => {
  const m = [...marcas, { id: 's-nosotros', top: 1600 }];
  assert.equal(seccionActiva(m, 1700), 's-nosotros');
});

test('sin secciones en la página: null', () => {
  assert.equal(seccionActiva([], 300), null);
});
