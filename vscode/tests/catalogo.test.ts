import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FAMILIAS, SIN_PRECIO, construirCatalogo, formatoRD, nombreEnTabla, precioDelTexto,
  type EspecialidadVista,
} from '../src/site/landing/catalogo.ts';
import { servicesMenu } from '../src/data/servicesMenu.ts';

const buscar = (cat: EspecialidadVista[], id: string, nombre: string) =>
  cat.find((c) => c.id === id)!.grupos.flatMap((g) => g.servicios).find((s) => s.nombre === nombre)!;

test('formato de precio con comas y sin decimales', () => {
  assert.equal(formatoRD(12000), 'RD$ 12,000');
  assert.equal(formatoRD(950), 'RD$ 950');
  assert.equal(formatoRD(1500.4), 'RD$ 1,500');
});

test('las 16 especialidades en 4 familias, en el orden de la spec', () => {
  const cat = construirCatalogo(servicesMenu, []);
  assert.deepEqual(FAMILIAS.map((f) => f.id), ['facial', 'corporal', 'cejas-maquillaje', 'medicina']);
  assert.deepEqual(cat.map((c) => c.id), [
    'limpieza-facial', 'hidra-lips',
    'depilacion-laser', 'depilacion-cera', 'blanqueamiento-corporal', 'remocion-tatuaje', 'aparatologia',
    'cejas-pestanas', 'maquillaje',
    'toxina-botulinica', 'rellenos', 'bioestimuladores', 'mesoterapia', 'plasma-rico-plaquetas', 'escleroterapia', 'verrugas',
  ]);
});

test('nombre en la tabla: la misma regla del sitio actual', () => {
  assert.equal(nombreEnTabla('depilacion-laser', 'Áreas cortas', 'Axilas'), 'Depilación Láser - Axilas');
  assert.equal(nombreEnTabla('cejas-pestanas', 'Extensiones de pestañas', 'Volumen 2D, 3D, 4D, 5D'), 'Extensiones de Pestañas - Volumen 2D-5D');
  assert.equal(nombreEnTabla('cejas-pestanas', '', 'Laminado de cejas'), 'Laminado de cejas');
  assert.equal(nombreEnTabla('bioestimuladores', '', 'Hilos PDO — RD$12,000 (x10 hilos)'), 'Bioestimulador - Hilos PDO (x10)');
  assert.equal(nombreEnTabla('mesoterapia', '', 'NCTF para ojeras — RD$5,000 / sesión'), 'Mesoterapia NCTF - Ojeras');
  assert.equal(nombreEnTabla('plasma-rico-plaquetas', '', 'Cuero cabelludo — RD$4,500'), 'PRP - Cuero cabelludo');
  assert.equal(nombreEnTabla('verrugas', '', 'Eliminación de verrugas — desde RD$1,000'), 'Eliminación de Verrugas (desde)');
  assert.equal(nombreEnTabla('limpieza-facial', '', 'Peeling'), 'Peeling');
});

test('precio del texto del menú, limpio', () => {
  assert.equal(precioDelTexto('Labios — RD$15,000'), 'RD$ 15,000');
  assert.equal(precioDelTexto('Líneas de expresión — RD$12,000 a 18,000'), 'RD$ 12,000 – 18,000');
  assert.equal(precioDelTexto('Bozo'), null);
});

test('precio: primero la tabla si es mayor que 0, con su duración', () => {
  const cat = construirCatalogo(servicesMenu, [{ name: 'Depilación Láser - Axilas', price: 1500, duration: 15 }]);
  assert.deepEqual(buscar(cat, 'depilacion-laser', 'Axilas'), { nombre: 'Axilas', minutos: 15, precio: 'RD$ 1,500', conPrecio: true });
});

test('precio en 0 en la tabla: usa el texto del menú o "RD$ —"', () => {
  const cat = construirCatalogo(servicesMenu, [
    { name: 'Depilación Láser - Bozo', price: 0, duration: 15 },
    { name: 'Relleno Ácido Hialurónico - Labios', price: 0, duration: 45 },
  ]);
  assert.deepEqual(buscar(cat, 'depilacion-laser', 'Bozo'), { nombre: 'Bozo', minutos: 15, precio: SIN_PRECIO, conPrecio: false });
  assert.equal(buscar(cat, 'rellenos', 'Labios').precio, 'RD$ 15,000');
});

test('rango o "desde" en el menú: el precio de la tabla se muestra como "desde"', () => {
  const cat = construirCatalogo(servicesMenu, [
    { name: 'Toxina Botulínica - Líneas de expresión', price: 12000, duration: 30 },
    { name: 'Eliminación de Verrugas (desde)', price: 1000, duration: 20 },
    { name: 'Relleno Ácido Hialurónico - Nariz', price: 15000, duration: 45 },
  ]);
  assert.equal(buscar(cat, 'toxina-botulinica', 'Líneas de expresión').precio, 'desde RD$ 12,000');
  assert.equal(buscar(cat, 'verrugas', 'Eliminación de verrugas').precio, 'desde RD$ 1,000');
  assert.equal(buscar(cat, 'rellenos', 'Nariz').precio, 'RD$ 15,000');
});

test('sin fila en la tabla no hay duración; el nombre se busca sin importar mayúsculas', () => {
  const cat = construirCatalogo(servicesMenu, [{ name: 'depilación con HILO', price: 0, duration: 20 }]);
  assert.equal(buscar(cat, 'cejas-pestanas', 'Depilación con hilo').minutos, 20);
  assert.equal(buscar(cat, 'cejas-pestanas', 'Lifting de pestañas').minutos, null);
});

test('especialista con iniciales y total de servicios', () => {
  const cat = construirCatalogo(servicesMenu, []);
  const cera = cat.find((c) => c.id === 'depilacion-cera')!;
  assert.equal(cera.especialista.iniciales, 'PJ');
  assert.equal(cera.especialista.miniatura, undefined);
  assert.equal(cera.total, 5);
  const limpieza = cat.find((c) => c.id === 'limpieza-facial')!;
  assert.equal(limpieza.especialista.iniciales, 'NS');
  assert.equal(limpieza.especialista.miniatura, '/fotos/esp-nadieska.jpg');
  assert.equal(limpieza.total, 13);
});
