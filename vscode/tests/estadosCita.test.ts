import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ETIQUETA_ESTADO } from '../src/lib/estadosCita.ts';

test('cada estado de cita tiene un solo nombre en todo el panel', () => {
  assert.deepEqual(ETIQUETA_ESTADO, {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    in_progress: 'En curso',
    completed: 'Completada',
    cancelled: 'Cancelada',
    no_show: 'No asistió',
  });
});
