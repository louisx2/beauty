import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fotoDePaquete, indiceDestacado, nombreCorto, precioPorSesion } from '../src/site/landing/paquetes.ts';
import { FOTOS } from '../src/site/brand.ts';

test('nombre corto sin "Paquete" ni "x5"', () => {
  assert.equal(nombreCorto('Paquete Facial Profunda x5'), 'Facial Profunda');
  assert.equal(nombreCorto('Paquete de Láser Axilas x 6'), 'Láser Axilas');
  assert.equal(nombreCorto('Glow'), 'Glow');
  assert.equal(nombreCorto('Paquete'), 'Paquete');
});

test('precio por sesión redondeado y sin dividir entre 0', () => {
  assert.equal(precioPorSesion(7500, 3), 2500);
  assert.equal(precioPorSesion(1000, 3), 333);
  assert.equal(precioPorSesion(1000, 0), null);
});

test('"Más elegido": el del medio cuando hay 3 o más', () => {
  assert.equal(indiceDestacado(3), 1);
  assert.equal(indiceDestacado(4), 2);
  assert.equal(indiceDestacado(2), -1);
  assert.equal(indiceDestacado(0), -1);
});

test('foto según el nombre del paquete y, si no dice nada, según su servicio', () => {
  assert.equal(fotoDePaquete('Paquete Peeling Químico x3', 'Peeling'), FOTOS.anabelGuantes);
  assert.equal(fotoDePaquete('Paquete Microdermoabrasión x6', 'Limpieza Facial Express / Hidratación'), FOTOS.servicio.aparatologia);
  assert.equal(fotoDePaquete('Paquete Glow x4', 'Limpieza Facial Profunda'), FOTOS.servicio.limpieza);
  assert.equal(fotoDePaquete('Hidra Lips x3', null), FOTOS.servicio.lips);
  assert.equal(fotoDePaquete('Paquete especial', null), null);
});
