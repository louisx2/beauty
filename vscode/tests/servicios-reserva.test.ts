import { test } from 'node:test';
import assert from 'node:assert/strict';
import { servicesMenu } from '../src/data/servicesMenu.ts';
import { SIN_PRECIO } from '../src/site/landing/catalogo.ts';
import {
  filtrarServicios, nombreVisible, serviciosParaReservar, sinTildes, type FilaServicio,
} from '../src/site/reservar/servicios.ts';

const FILAS: FilaServicio[] = [
  { id: '1', name: 'Depilación Láser - Axilas', duration: 15, price: 0 },
  { id: '2', name: 'Limpieza Facial Profunda', duration: 60, price: 0 },
  { id: '3', name: 'Toxina Botulínica - Líneas de expresión', duration: 30, price: 12000 },
  { id: '4', name: 'Diseño de Cejas', duration: 30, price: 600 },
  { id: '5', name: 'Laminado de Cejas', duration: 45, price: 0 },
];
const lista = serviciosParaReservar(servicesMenu, FILAS);
const por = (id: string) => lista.find((s) => s.id === id)!;

test('nombre visible: el guion de la tabla se vuelve un punto medio', () => {
  assert.equal(nombreVisible('Depilación Láser - Axilas'), 'Depilación Láser · Axilas');
  assert.equal(nombreVisible('Hidrafacial'), 'Hidrafacial');
  assert.equal(nombreVisible('Paquete: Paquete Peeling Químico x3'), 'Paquete Peeling Químico x3');
});

test('sin tildes ni mayúsculas, para buscar', () => {
  assert.equal(sinTildes('Depilación LÁSER'), 'depilacion laser');
});

test('cada servicio sabe su familia, su especialidad y su precio', () => {
  assert.deepEqual(
    { familia: por('1').familia, categoria: por('1').categoria, precio: por('1').precio, conPrecio: por('1').conPrecio },
    { familia: 'corporal', categoria: 'depilacion-laser', precio: SIN_PRECIO, conPrecio: false },
  );
  assert.equal(por('3').familia, 'medicina');
  assert.equal(por('3').categoria, 'toxina-botulinica');
  assert.equal(por('3').conPrecio, true);
  assert.match(por('3').precio, /RD\$ 12,000/);
  // lo que no está en el menú de la página: sin familia, con el precio de la tabla
  assert.deepEqual(
    { familia: por('4').familia, categoria: por('4').categoria, precio: por('4').precio },
    { familia: null, categoria: null, precio: 'RD$ 600' },
  );
  assert.equal(por('1').nombre, 'Depilación Láser · Axilas');
  assert.equal(por('1').duracion, 15);
});

test('orden: por familia y como en el menú; lo que no está en el menú va al final', () => {
  assert.deepEqual(lista.map((s) => s.id), ['2', '1', '5', '3', '4']);
});

test('buscador sin tildes y filtros de familia y especialidad', () => {
  const ids = (f: Parameters<typeof filtrarServicios>[1]) => filtrarServicios(lista, f).map((s) => s.id);
  assert.deepEqual(ids({ texto: 'laser', familia: 'todas', categoria: null }), ['1']);
  assert.deepEqual(ids({ texto: 'CEJAS', familia: 'todas', categoria: null }), ['5', '4']);
  assert.deepEqual(ids({ texto: 'laser axilas', familia: 'todas', categoria: null }), ['1']);
  assert.deepEqual(ids({ texto: '', familia: 'medicina', categoria: null }), ['3']);
  // la especialidad que viene del catálogo manda sobre la familia
  assert.deepEqual(ids({ texto: '', familia: 'facial', categoria: 'depilacion-laser' }), ['1']);
  assert.equal(ids({ texto: '  ', familia: 'todas', categoria: null }).length, 5);
});
