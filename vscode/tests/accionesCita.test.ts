import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accionPrincipal, accionesSecundarias } from '../src/pages/admin/citas/acciones.ts';

test('el botón principal es el paso que sigue según el estado', () => {
  assert.deepEqual(accionPrincipal('pending'), { accion: 'confirmar', etiqueta: 'Confirmar', estado: 'confirmed' });
  assert.deepEqual(accionPrincipal('confirmed'), { accion: 'llego', etiqueta: 'Llegó', estado: 'in_progress' });
  assert.deepEqual(accionPrincipal('in_progress'), { accion: 'completar', etiqueta: 'Completar', estado: 'completed' });
});

test('una cita cerrada no tiene botón principal', () => {
  for (const estado of ['completed', 'cancelled', 'no_show'] as const) {
    assert.equal(accionPrincipal(estado), null, estado);
  }
});

test('más acciones: editar primero y cancelar siempre al final', () => {
  assert.deepEqual(accionesSecundarias('pending', true), ['editar', 'reprogramar', 'cancelar']);
  assert.deepEqual(accionesSecundarias('confirmed', true), ['editar', 'reprogramar', 'no_asistio', 'cancelar']);
});

test('con el servicio ya empezado no se reprograma, pero se puede agendar la próxima o cancelar', () => {
  assert.deepEqual(accionesSecundarias('in_progress', true), ['editar', 'agendar_proxima', 'cancelar']);
});

test('una cita completada se edita o se le agenda la próxima', () => {
  assert.deepEqual(accionesSecundarias('completed', true), ['editar', 'agendar_proxima']);
});

test('una cita cancelada o que no vino solo se puede editar', () => {
  for (const estado of ['cancelled', 'no_show'] as const) {
    assert.deepEqual(accionesSecundarias(estado, true), ['editar'], estado);
  }
});

test('si la clienta no tiene ficha se ofrece guardarla, antes de cancelar', () => {
  assert.deepEqual(accionesSecundarias('confirmed', false), ['editar', 'reprogramar', 'no_asistio', 'guardar_clienta', 'cancelar']);
  assert.deepEqual(accionesSecundarias('completed', false), ['editar', 'agendar_proxima', 'guardar_clienta']);
});
