import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESTILO_POR_DEFECTO, estiloValido, fotoDePaquete, indiceDestacado, nombreCorto, paquetesSinSello, porcentajeAhorro, precioPorSesion } from '../src/site/landing/paquetes.ts';
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

test('ahorro de los tres paquetes del boceto', () => {
  assert.equal(porcentajeAhorro({ precio: 6000, sesiones: 5, precioServicio: 1500 }), 20);
  assert.equal(porcentajeAhorro({ precio: 7500, sesiones: 3, precioServicio: 3000 }), 17);
  assert.equal(porcentajeAhorro({ precio: 9000, sesiones: 6, precioServicio: 1800 }), 17);
});

test('sin sello: servicio sin precio, sin sesiones, sin ahorro o con menos de 1 %', () => {
  assert.equal(porcentajeAhorro({ precio: 6000, sesiones: 5, precioServicio: 0 }), null);
  assert.equal(porcentajeAhorro({ precio: 6000, sesiones: 0, precioServicio: 1500 }), null);
  assert.equal(porcentajeAhorro({ precio: 8000, sesiones: 5, precioServicio: 1500 }), null);
  assert.equal(porcentajeAhorro({ precio: 4990, sesiones: 5, precioServicio: 1000 }), null);
  assert.equal(porcentajeAhorro({ precio: 2985, sesiones: 3, precioServicio: 1000 }), null); // 0.5 %: no llega a 1 %
  assert.equal(porcentajeAhorro({ precio: 0, sesiones: 5, precioServicio: 1500 }), null);    // paquete sin precio
});

test('aviso del panel: cuántos paquetes quedarían sin sello', () => {
  assert.equal(paquetesSinSello([
    { precio: 6000, sesiones: 5, precioServicio: 1500 },
    { precio: 7500, sesiones: 3, precioServicio: 0 },
    { precio: 9000, sesiones: 6, precioServicio: 0 },
  ]), 2);
  assert.equal(paquetesSinSello([]), 0);
});

test('estilo desde la base: uno de los tres o "Menú con foto"', () => {
  assert.equal(ESTILO_POR_DEFECTO, 'menu');
  assert.equal(estiloValido('ahorro'), 'ahorro');
  assert.equal(estiloValido('membresia'), 'membresia');
  assert.equal(estiloValido('rarito'), 'menu');
  assert.equal(estiloValido(null), 'menu');
  assert.equal(estiloValido(undefined), 'menu');
});
