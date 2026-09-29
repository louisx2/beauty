import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SECCIONES, lineaDeSeccion, seccionActiva, seccionesVisibles, seccionesPresentes } from '../src/site/header/secciones.ts';

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

test('al llegar al fondo de la página manda la última sección (Contacto es corta)', () => {
  assert.equal(seccionActiva(marcas, 260, true), 's-nosotros');
});

test('línea de la sección activa: un tercio de la pantalla, o debajo de la barra en pantallas bajas', () => {
  assert.equal(lineaDeSeccion(900, 74), 297);
  assert.equal(lineaDeSeccion(360, 64), 121);
});

test('secciones visibles: solo las que la página tiene; sin lista, todas', () => {
  assert.deepEqual(seccionesVisibles(['s-inicio', 's-contacto']).map((s) => s.id), ['s-inicio', 's-contacto']);
  assert.equal(seccionesVisibles().length, 7);
});

test('secciones presentes: sin paquetes, equipo ni opiniones quedan las 4 fijas', () => {
  assert.deepEqual(
    seccionesPresentes({ paquetes: false, equipo: false, opiniones: false }),
    ['s-inicio', 's-servicios', 's-nosotros', 's-contacto'],
  );
});

test('secciones presentes: Equipo va entre Nosotros y Opiniones, en el orden de la página', () => {
  assert.deepEqual(
    seccionesPresentes({ paquetes: false, equipo: true, opiniones: false }),
    ['s-inicio', 's-servicios', 's-nosotros', 's-equipo', 's-contacto'],
  );
  assert.deepEqual(
    seccionesPresentes({ paquetes: true, equipo: true, opiniones: true }),
    SECCIONES.map((s) => s.id),
  );
});
