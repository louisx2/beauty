import { test } from 'node:test';
import assert from 'node:assert/strict';
import { equipoPublico, iniciales, nombreParaOrdenar, textoONull, type FilaEquipo } from '../src/site/landing/equipo.ts';

const fila = (extra: Partial<FilaEquipo>): FilaEquipo => ({
  id: 'x', name: 'Paola Jiménez', role: 'specialist', active: true, avatar_url: null,
  mostrar_en_web: true, cargo_web: null, especialidades_web: null, ...extra,
});

test('iniciales: primer nombre y último apellido, sin títulos ni paréntesis', () => {
  assert.equal(iniciales('Paola Jiménez'), 'PJ');
  assert.equal(iniciales('Anabel De los Santos'), 'AS');
  assert.equal(iniciales('Dra. Nadieska Soto'), 'NS');
  assert.equal(iniciales('Luisa Méndez (Recepción)'), 'LM');
  assert.equal(iniciales('Louis H.'), 'LH');
  assert.equal(iniciales('ángela ñúñez'), 'ÁÑ');
  assert.equal(iniciales('Carmen'), 'C');
  assert.equal(iniciales('Licda. María Pérez'), 'MP');
});

test('iniciales: si el nombre no deja letras, vacío (la tarjeta pone la N)', () => {
  assert.equal(iniciales('   '), '');
  assert.equal(iniciales('Dra.'), '');
});

test('textoONull: recorta, junta espacios y nunca devuelve ""', () => {
  assert.equal(textoONull('  Facial ·  Medicina estética '), 'Facial · Medicina estética');
  assert.equal(textoONull('   '), null);
  assert.equal(textoONull(''), null);
  assert.equal(textoONull(null), null);
  assert.equal(textoONull(undefined), null);
});

test('equipo: solo quien está marcada para la web y activa, y con nombre', () => {
  const r = equipoPublico([
    fila({ id: 'a', name: 'Ana' }),
    fila({ id: 'b', name: 'Bea', mostrar_en_web: false }),
    fila({ id: 'c', name: 'Cris', active: false }),
    fila({ id: 'd', name: 'Dora', mostrar_en_web: null }),
    fila({ id: 'e', name: '   ' }),
  ]);
  assert.deepEqual(r.map((m) => m.id), ['a']);
});

test('equipo: la administración primero y después por nombre, con los acentos bien ordenados', () => {
  const r = equipoPublico([
    fila({ id: '1', name: 'Paola Jiménez' }),
    fila({ id: '2', name: 'Ángela Ruiz' }),
    fila({ id: '3', name: 'Zoila Pérez', role: 'admin' }),
    fila({ id: '4', name: 'Carmen Rodríguez' }),
  ]);
  assert.deepEqual(r.map((m) => m.nombre), ['Zoila Pérez', 'Ángela Ruiz', 'Carmen Rodríguez', 'Paola Jiménez']);
});

test('equipo: los títulos no cuentan para ordenar ("Dra. Nadieska Soto" va con la N)', () => {
  assert.equal(nombreParaOrdenar('Dra. Nadieska Soto'), 'Nadieska Soto');
  assert.equal(nombreParaOrdenar('Lic. María Díaz'), 'María Díaz');
  assert.equal(nombreParaOrdenar('Dra.'), 'Dra.');
  const r = equipoPublico([
    fila({ id: '1', name: 'Paola Jiménez' }),
    fila({ id: '2', name: 'Dra. Nadieska Soto' }),
    fila({ id: '3', name: 'Carmen Rodríguez' }),
  ]);
  assert.deepEqual(r.map((m) => m.nombre), ['Carmen Rodríguez', 'Dra. Nadieska Soto', 'Paola Jiménez']);
});

test('equipo: textos en blanco quedan en null y una foto en blanco no cuenta', () => {
  const [m] = equipoPublico([fila({
    name: ' Dra. Nadieska Soto ', cargo_web: '  ', especialidades_web: 'Facial · Medicina estética', avatar_url: '',
  })]);
  assert.deepEqual(m, {
    id: 'x', nombre: 'Dra. Nadieska Soto', cargo: null, especialidades: 'Facial · Medicina estética',
    foto: null, iniciales: 'NS',
  });
});

test('equipo: sin filas, nadie', () => {
  assert.deepEqual(equipoPublico([]), []);
});
