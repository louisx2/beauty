// Pruebas de la regla que decide qué paquete de la clienta descuenta cada
// servicio de una cita completada. Correr con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sesionesADescontar } from '../src/lib/packageMatch.ts';
import type { SaldoPaquete } from '../src/lib/packageMatch.ts';

const LIMPIEZA = 'svc-limpieza-profunda';
const PEELING = 'svc-peeling';

const facial: SaldoPaquete = {
  id: 'cp-facial',
  packageName: 'Paquete Facial Profunda x5',
  serviceId: LIMPIEZA,
  serviceName: 'Limpieza Facial Profunda',
  used: 1,
  total: 5,
};
const peeling: SaldoPaquete = {
  id: 'cp-peeling',
  packageName: 'Paquete Peeling Químico x3',
  serviceId: PEELING,
  serviceName: 'Peeling',
  used: 0,
  total: 3,
};

test('paquete reservado en la web: coincide por el servicio del paquete', () => {
  const lineas = [{ serviceId: LIMPIEZA, serviceName: 'Paquete: Paquete Facial Profunda x5' }];
  assert.deepEqual(sesionesADescontar(lineas, [facial]), ['cp-facial']);
});

test('walk-in que consume paquete: coincide por el nombre del paquete', () => {
  const lineas = [{ serviceId: null, serviceName: 'Paquete: Paquete Facial Profunda x5' }];
  assert.deepEqual(sesionesADescontar(lineas, [facial]), ['cp-facial']);
});

test('sesión agendada desde Paquetes: coincide por el nombre del servicio', () => {
  const lineas = [{ serviceId: null, serviceName: 'limpieza facial profunda ' }];
  assert.deepEqual(sesionesADescontar(lineas, [facial]), ['cp-facial']);
});

test('cita con varios servicios: descuenta un paquete por cada servicio que coincide', () => {
  const lineas = [
    { serviceId: LIMPIEZA, serviceName: 'Limpieza Facial Profunda' },
    { serviceId: PEELING, serviceName: 'Peeling' },
    { serviceId: 'svc-otro', serviceName: 'Maquillaje - Social' },
  ];
  assert.deepEqual(sesionesADescontar(lineas, [facial, peeling]), ['cp-facial', 'cp-peeling']);
});

test('no se pasa del saldo: con una sesión libre, dos servicios iguales descuentan una sola', () => {
  const casiLleno = { ...facial, used: 4 };
  const lineas = [
    { serviceId: LIMPIEZA, serviceName: 'Limpieza Facial Profunda' },
    { serviceId: LIMPIEZA, serviceName: 'Limpieza Facial Profunda' },
  ];
  assert.deepEqual(sesionesADescontar(lineas, [casiLleno]), ['cp-facial']);
});

test('paquete agotado no descuenta', () => {
  const agotado = { ...facial, used: 5 };
  const lineas = [{ serviceId: LIMPIEZA, serviceName: 'Limpieza Facial Profunda' }];
  assert.deepEqual(sesionesADescontar(lineas, [agotado]), []);
});

test('un servicio distinto no descuenta, aunque se llame parecido', () => {
  const lineas = [{ serviceId: 'svc-limpieza-express', serviceName: 'Limpieza Facial Profunda' }];
  assert.deepEqual(sesionesADescontar(lineas, [facial]), []);
});

test('sin paquetes activos no descuenta nada', () => {
  const lineas = [{ serviceId: LIMPIEZA, serviceName: 'Limpieza Facial Profunda' }];
  assert.deepEqual(sesionesADescontar(lineas, []), []);
});
