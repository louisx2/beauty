import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  claveServicio, contarVisitas, nombreDeLinea, recordDeServicios, vecesEnHistorial, vezDelServicio,
} from '../src/pages/admin/clientes/record.ts';
import { historialCompleto } from '../src/pages/admin/clientes/ficha.ts';
import type { Appointment } from '../src/store/appointmentStore.ts';
import type { EntradaHistorial } from '../src/lib/historialAnterior.ts';

const HOY = '2026-10-20';

let n = 0;
/** Una cita con sus servicios: [nombre, id del catálogo]. */
const cita = (date: string, status: Appointment['status'], servicios: [string, string | null][] = [['Limpieza facial', null]]): Appointment => ({
  id: `a${++n}`, client_id: 'c1', clientName: 'Yokasta', clientPhone: '', service: servicios.map((s) => s[0]).join(' + '), employee: 'Anabel',
  date, time: '10:00', duration: 30, status, notes: null, source: 'manual', createdAt: '', startedAt: null,
  services: servicios.map(([serviceName, serviceId]) => ({ serviceId, serviceName, employee: 'Anabel', startTime: '10:00', duration: 30, price: 0 })),
});
const antes = (fecha: string | null, servicio = 'Depilación Láser - Axilas'): EntradaHistorial =>
  ({ id: `h${++n}`, clientId: 'c1', fecha, servicio, especialista: null, notas: null, creado: '' });

test('la clave del servicio: sin tildes, mayúsculas, guiones ni el "Paquete:" de las reservas', () => {
  assert.equal(claveServicio('Depilación Láser - Axilas'), 'depilacion laser axilas');
  assert.equal(claveServicio('  depilacion  laser · AXILAS '), 'depilacion laser axilas');
  assert.equal(claveServicio('Depilacion Laser Brasileño'), claveServicio('Depilación Láser - Brasileño'));
  assert.equal(claveServicio('Paquete: Láser axilas x6'), 'laser axilas x6');
});

test('visitas: las completadas del sistema, los días del historial previo y las de antes sin detalle', () => {
  const citas = [
    cita('2026-09-01', 'completed'),
    cita('2026-09-22', 'completed'),
    cita('2026-10-01', 'no_show'),
    cita('2026-10-05', 'cancelled'),
    cita('2026-10-30', 'confirmed'),
  ];
  const anteriores = [
    antes('2025-06-14', 'Depilación Láser - Axilas'),
    antes('2025-06-14', 'Depilación Láser - Bikini'), // el mismo día: una sola visita
    antes('2025-07-10'),
    antes('2026-09-01'), // ese día ya hay una cita completada: es la misma visita
    antes(null),
    antes(null), // sin fecha: cada una cuenta
  ];
  assert.deepEqual(contarVisitas(citas, anteriores, 5), { total: 11, enSistema: 2, enHistorial: 4, sinDetalle: 5, ultima: '2026-09-22' });
  assert.deepEqual(contarVisitas([], [], 0), { total: 0, enSistema: 0, enHistorial: 0, sinDetalle: 0, ultima: null });
  // la última puede ser del historial previo, y el número a mano nunca resta
  assert.deepEqual(contarVisitas([], [antes('2026-10-02')], -3), { total: 1, enSistema: 0, enHistorial: 1, sinDetalle: 0, ultima: '2026-10-02' });
});

test('el récord: cuántas veces se hizo cada servicio, el que más arriba', () => {
  const catalogo = [{ id: 's1', name: 'Depilación Láser - Axilas' }, { id: 's2', name: 'Depilación Láser - Brasileño' }];
  const citas = [
    cita('2026-09-01', 'completed', [['Depilación Láser - Axilas', 's1'], ['Depilación Láser - Brasileño', 's2']]),
    cita('2026-09-29', 'completed', [['Láser axilas (nombre viejo)', 's1']]), // se renombró: cuenta con el nombre de hoy
    cita('2026-10-10', 'completed', [['Paquete: Láser axilas x6', 's1']]), // reservada con un paquete desde la web
    cita('2026-10-12', 'no_show', [['Depilación Láser - Axilas', 's1']]),
    cita('2026-10-25', 'confirmed', [['Depilación Láser - Axilas', 's1']]),
    cita('2026-08-01', 'completed'),
  ];
  const anteriores = [antes('2025-06-14', 'depilacion laser - axilas'), antes(null, 'Depilación Láser - Brasileño'), antes('2025-01-01', 'HIFU')];
  assert.deepEqual(recordDeServicios(citas, anteriores, catalogo), [
    { clave: 'depilacion laser axilas', nombre: 'Depilación Láser · Axilas', veces: 4, ultima: '2026-10-10' },
    { clave: 'depilacion laser brasileno', nombre: 'Depilación Láser · Brasileño', veces: 2, ultima: '2026-09-01' },
    { clave: 'limpieza facial', nombre: 'Limpieza facial', veces: 1, ultima: '2026-08-01' },
    { clave: 'hifu', nombre: 'HIFU', veces: 1, ultima: '2025-01-01' },
  ]);
  // sin catálogo cuenta con el nombre de la cita
  assert.equal(recordDeServicios([cita('2026-09-01', 'completed', [['Paquete: Facial x5', null]])], [])[0].nombre, 'Facial x5');
  // el mismo servicio dos veces en una cita es una vez
  assert.equal(recordDeServicios([cita('2026-09-01', 'completed', [['Cejas', null], ['Cejas', null]])], [])[0].veces, 1);
});

test('el historial de un servicio, numerado: la más reciente con la vez más alta', () => {
  const citas = [
    cita('2026-09-22', 'completed', [['Depilación Láser - Axilas', null]]),
    cita('2026-10-01', 'no_show', [['Depilación Láser - Axilas', null]]), // no cuenta
    cita('2026-09-01', 'completed', [['Limpieza facial', null]]), // otro servicio
    cita('2026-08-15', 'completed', [['Depilación Láser - Axilas', null], ['Cejas', null]]),
  ];
  const historial = historialCompleto(citas, [antes(null), antes('2025-06-14')], HOY);
  const fila = vecesEnHistorial(historial, 'depilacion laser axilas')
    .map(({ renglon: r, vez }) => [r.tipo === 'cita' ? r.cita.date : r.entrada.fecha, vez]);
  assert.deepEqual(fila, [['2026-09-22', 4], ['2026-08-15', 3], ['2025-06-14', 2], [null, 1]]);
});

test('qué vez es este servicio: las de antes más esta', () => {
  const record = recordDeServicios([cita('2026-09-01', 'completed', [['Depilación Láser - Axilas', null]])], [antes('2025-06-14')]);
  assert.equal(vezDelServicio(record, 'Depilación Láser - Axilas'), 3);
  assert.equal(vezDelServicio(record, 'Limpieza facial'), 1);
  // la de hoy se reservó con un paquete desde la web: cuenta como el servicio del paquete
  const catalogo = [{ id: 's1', name: 'Depilación Láser - Axilas' }];
  assert.equal(vezDelServicio(record, nombreDeLinea({ serviceId: 's1', serviceName: 'Paquete: Láser axilas x6' }, catalogo)), 3);
  assert.equal(nombreDeLinea({ serviceId: 'otro', serviceName: 'Cejas' }, catalogo), 'Cejas');
});
