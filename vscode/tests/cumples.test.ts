import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANIO_SIN_SABER, cumpleDe, cumpleanosProximos, fechaDeCumple, mensajeCumple, partesDeCumple, textoCumple,
} from '../src/pages/admin/clientes/cumples.ts';
import type { Client } from '../src/store/clientStore.ts';

const HOY = '2026-10-15';
const clienta = (id: string, name: string, birthday: string | null): Client => ({
  id, name, phone: '829-555-1000', email: null, cedula: null, skin_type: null, allergies: null, notes: null, source: 'manual',
  created_at: '', birthday,
});

test('el formulario: día y mes obligatorios juntos, el año opcional, fechas que existen', () => {
  assert.deepEqual(fechaDeCumple({ dia: '', mes: '', anio: '' }, HOY), { fecha: null });
  assert.deepEqual(fechaDeCumple({ dia: '15', mes: '10', anio: '1990' }, HOY), { fecha: '1990-10-15' });
  assert.deepEqual(fechaDeCumple({ dia: '29', mes: '2', anio: '' }, HOY), { fecha: `${ANIO_SIN_SABER}-02-29` });
  assert.equal(fechaDeCumple({ dia: '15', mes: '', anio: '' }, HOY).error, 'Elige el día y el mes');
  assert.equal(fechaDeCumple({ dia: '31', mes: '4', anio: '' }, HOY).error, 'Abril no tiene 31 días');
  assert.equal(fechaDeCumple({ dia: '29', mes: '2', anio: '2001' }, HOY).error, 'Febrero no tiene 29 días');
  assert.equal(fechaDeCumple({ dia: '1', mes: '1', anio: '1850' }, HOY).error, 'El año va de 1900 a 2026');
  assert.equal(fechaDeCumple({ dia: '1', mes: '12', anio: '2026' }, HOY).error, 'Esa fecha todavía no llega');
  assert.deepEqual(partesDeCumple('1990-10-05'), { dia: '5', mes: '10', anio: '1990' });
  assert.deepEqual(partesDeCumple(`${ANIO_SIN_SABER}-03-08`), { dia: '8', mes: '3', anio: '' });
  assert.deepEqual(partesDeCumple(null), { dia: '', mes: '', anio: '' });
});

test('cómo se lee: sin año, sin edad; con año, los que tiene o los que va a cumplir', () => {
  assert.deepEqual(cumpleDe(`${ANIO_SIN_SABER}-03-08`), { dia: 8, mes: 3, anio: null });
  assert.equal(cumpleDe('basura'), null);
  assert.equal(textoCumple(`${ANIO_SIN_SABER}-03-08`, HOY), '8 de marzo');
  assert.equal(textoCumple('1990-10-15', HOY), '15 de octubre · tiene 36 años'); // hoy cumple
  assert.equal(textoCumple('1990-12-01', HOY), '1 de diciembre · cumple 36');
  assert.equal(textoCumple(null, HOY), '');
});

test('quién cumple esta semana: hoy primero, sin año también, y a fin de año las de enero', () => {
  const lista = [
    clienta('a', 'Zoila', '1990-10-15'),
    clienta('b', 'Ana', `${ANIO_SIN_SABER}-10-15`),
    clienta('c', 'Bea', '1985-10-20'),
    clienta('d', 'Carla', '1992-10-23'), // a 8 días: no entra
    clienta('e', 'Dalia', '1980-10-14'), // fue ayer: no entra
    clienta('f', 'Sin dato', null),
  ];
  assert.deepEqual(cumpleanosProximos(lista, HOY).map((x) => [x.clienta.name, x.enDias, x.cumple]), [
    ['Ana', 0, null], ['Zoila', 0, 36], ['Bea', 5, 41],
  ]);
  const fin = cumpleanosProximos([clienta('g', 'Enero', '2000-01-02')], '2026-12-30');
  assert.deepEqual(fin.map((x) => [x.fecha, x.enDias, x.cumple]), [['2027-01-02', 3, 27]]);
  // el 29 de febrero se celebra el 28 cuando el año no es bisiesto
  assert.equal(cumpleanosProximos([clienta('h', 'Bisiesta', '2000-02-29')], '2027-02-26')[0].fecha, '2027-02-28');
});

test('el mensaje de felicitación: con su primer nombre y sin emojis', () => {
  const m = mensajeCumple({ name: 'Yokasta Ramírez' });
  assert.match(m, /^¡Feliz cumpleaños, Yokasta!/);
  assert.doesNotMatch(m, /\p{Extended_Pictographic}/u);
});

test('en Clientas, "Cumplen este mes": las del mes por el día de su cumpleaños', async () => {
  const { listaDeClientas } = await import('../src/pages/admin/clientes/ficha.ts');
  const lista = [
    clienta('a', 'Zoila', '1990-10-25'),
    clienta('b', 'Ana', `${ANIO_SIN_SABER}-10-03`),
    clienta('c', 'Bea', '1985-11-03'),
    clienta('d', 'Sin dato', null),
  ];
  assert.deepEqual(listaDeClientas(lista, '', 'cumple', 'nombre', new Map(), new Set(), HOY).map((c) => c.name), ['Ana', 'Zoila']);
});
