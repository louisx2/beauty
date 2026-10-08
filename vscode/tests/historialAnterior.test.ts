import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FORM_HISTORIAL_VACIO, cambiosDeForm, deFila, formDeEntrada, ordenarHistorial, validarHistorial,
  type EntradaHistorial,
} from '../src/lib/historialAnterior.ts';

const entrada = (id: string, fecha: string | null, creado: string): EntradaHistorial =>
  ({ id, clientId: 'c1', fecha, servicio: 'Limpieza facial', especialista: null, notas: null, creado });

test('lo más reciente primero y lo que no tiene fecha al final', () => {
  const lista = [
    entrada('vieja', '2023-05-02', '2026-10-07T10:00:00Z'),
    entrada('sin-fecha', null, '2026-10-07T10:01:00Z'),
    entrada('nueva', '2025-11-20', '2026-10-07T10:02:00Z'),
  ];
  assert.deepEqual(ordenarHistorial(lista).map((e) => e.id), ['nueva', 'vieja', 'sin-fecha']);
});

test('con la misma fecha (o sin fecha), primero lo último que se anotó', () => {
  const lista = [
    entrada('a', '2024-01-10', '2026-10-07T10:00:00Z'),
    entrada('b', '2024-01-10', '2026-10-07T11:00:00Z'),
    entrada('x', null, '2026-10-07T09:00:00Z'),
    entrada('y', null, '2026-10-07T12:00:00Z'),
  ];
  assert.deepEqual(ordenarHistorial(lista).map((e) => e.id), ['b', 'a', 'y', 'x']);
});

test('ordenar no cambia la lista original', () => {
  const lista = [entrada('a', '2023-01-01', 'x'), entrada('b', '2024-01-01', 'x')];
  ordenarHistorial(lista);
  assert.deepEqual(lista.map((e) => e.id), ['a', 'b']);
});

test('el servicio es obligatorio; la fecha puede quedar vacía', () => {
  assert.deepEqual(validarHistorial(FORM_HISTORIAL_VACIO, '2026-10-07'), { servicio: 'Escribe el servicio que se hizo' });
  assert.deepEqual(validarHistorial({ ...FORM_HISTORIAL_VACIO, servicio: '   ' }, '2026-10-07').servicio, 'Escribe el servicio que se hizo');
  assert.deepEqual(validarHistorial({ ...FORM_HISTORIAL_VACIO, servicio: 'Laminado de cejas' }, '2026-10-07'), {});
});

test('la fecha no puede ser después de hoy (hoy sí se puede)', () => {
  const form = { ...FORM_HISTORIAL_VACIO, servicio: 'Depilación láser' };
  assert.equal(validarHistorial({ ...form, fecha: '2026-10-08' }, '2026-10-07').fecha, 'La fecha no puede ser después de hoy');
  assert.deepEqual(validarHistorial({ ...form, fecha: '2026-10-07' }, '2026-10-07'), {});
  assert.deepEqual(validarHistorial({ ...form, fecha: '2019-02-28' }, '2026-10-07'), {});
  assert.equal(validarHistorial({ ...form, fecha: '10/02/2024' }, '2026-10-07').fecha, 'Fecha inválida');
});

test('lo que se guarda va sin espacios de más y con null en lo vacío', () => {
  assert.deepEqual(
    cambiosDeForm({ fecha: '', servicio: '  Limpieza   facial  profunda ', especialista: '   ', notas: '\n' }),
    { date: null, service: 'Limpieza facial profunda', employee: null, notes: null },
  );
  assert.deepEqual(
    cambiosDeForm({ fecha: '2024-03-15', servicio: 'HIFU facial', especialista: ' Anabel ', notas: ' Sesión 2 de 3.\nSin reacción. ' }),
    { date: '2024-03-15', service: 'HIFU facial', employee: 'Anabel', notes: 'Sesión 2 de 3.\nSin reacción.' },
  );
});

test('de la fila de la tabla al formulario de edición, ida y vuelta', () => {
  const e = deFila({
    id: 'h1', client_id: 'c1', date: null, service: 'Tintado de cejas', employee: null, notes: 'Color castaño', created_at: '2026-10-07T10:00:00Z',
  });
  assert.deepEqual(e, {
    id: 'h1', clientId: 'c1', fecha: null, servicio: 'Tintado de cejas', especialista: null, notas: 'Color castaño', creado: '2026-10-07T10:00:00Z',
  });
  const form = formDeEntrada(e);
  assert.deepEqual(form, { fecha: '', servicio: 'Tintado de cejas', especialista: '', notas: 'Color castaño' });
  assert.deepEqual(cambiosDeForm(form), { date: null, service: 'Tintado de cejas', employee: null, notes: 'Color castaño' });
});
