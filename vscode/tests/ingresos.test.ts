import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serviciosConPrecio, ingresosDelMes } from '../src/lib/ingresos.ts';

const catalogo = [
  { name: 'Limpieza facial', price: 2500 },
  { name: 'Depilación Láser - Axilas', price: 1500 },
];

const linea = (serviceName: string, employee: string, price: number) => ({ serviceName, employee, price });

test('cada servicio de la cita lleva su precio guardado', () => {
  const cita = { service: 'x', employee: 'Ana', services: [linea('Limpieza facial', 'Ana', 3000), linea('Depilación Láser - Axilas', 'Carmen', 1200)] };
  assert.deepEqual(serviciosConPrecio(cita, catalogo), [
    { nombre: 'Limpieza facial', empleada: 'Ana', precio: 3000 },
    { nombre: 'Depilación Láser - Axilas', empleada: 'Carmen', precio: 1200 },
  ]);
});

test('sin precio guardado se usa el del catálogo, y 0 si el servicio no está', () => {
  const cita = { service: 'x', employee: 'Ana', services: [linea('Limpieza facial', 'Ana', 0), linea('Servicio viejo', 'Ana', 0)] };
  assert.deepEqual(serviciosConPrecio(cita, catalogo).map((s) => s.precio), [2500, 0]);
});

test('una cita antigua sin líneas cuenta como un solo servicio', () => {
  const cita = { service: 'Depilación Láser - Axilas', employee: 'Carmen', services: [] };
  assert.deepEqual(serviciosConPrecio(cita, catalogo), [{ nombre: 'Depilación Láser - Axilas', empleada: 'Carmen', precio: 1500 }]);
});

test('ingresos del mes: solo las citas completadas de ese mes', () => {
  const cita = (date: string, status: string, price: number) =>
    ({ date, status, service: 'Limpieza facial', employee: 'Ana', services: [linea('Limpieza facial', 'Ana', price)] });
  const citas = [
    cita('2026-10-02', 'completed', 3000),
    cita('2026-10-15', 'completed', 2000),
    cita('2026-10-20', 'confirmed', 9000),
    cita('2026-10-21', 'cancelled', 9000),
    cita('2026-09-30', 'completed', 9000),
  ];
  assert.equal(ingresosDelMes(citas, catalogo, '2026-10'), 5000);
});
