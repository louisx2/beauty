import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  estadoCita, fechaCorta, horasHasta, primerNombre, telefonoCompleto, textoResumen, vistaCitas, vistaPaquetes,
  type FilaCita, type FilaPaqueteCliente, type FilaServicioCita,
} from '../src/site/portal/portal.ts';

// "ahora" en las pruebas: martes 29 de septiembre de 2026, 10:00 de la mañana en Santo Domingo (UTC-4 todo el año),
// con el desfase escrito: las pruebas no dependen de la zona horaria de la máquina
const AHORA = new Date('2026-09-29T10:00:00-04:00');
const cita = (id: string, date: string, time: string, status: string, service = 'Hidrafacial', employee = 'Dra. Nadieska Soto'): FilaCita => ({
  id, client_name: 'María Altagracia Gómez', service, employee, date, time, duration: 60, status, notes: null, source: 'web',
});
const CITAS: FilaCita[] = [
  cita('A', '2026-10-03', '10:00:00', 'pending', 'Depilación Láser - Axilas', 'Carmen Rodríguez'),
  cita('B', '2026-09-29', '16:00:00', 'confirmed'),
  cita('C', '2026-09-15', '09:00:00', 'completed'),
  cita('D', '2026-10-10', '11:00:00', 'cancelled'),
  cita('E', '2026-09-29', '09:30:00', 'in_progress'),
];
const SERVICIOS: FilaServicioCita[] = [
  { appointment_id: 'A', servicio: 'Depilación Cera - Bozo', especialista: 'Paola Jiménez', hora: '10:15:00', duracion: 10, orden: 1 },
  { appointment_id: 'A', servicio: 'Depilación Láser - Axilas', especialista: 'Carmen Rodríguez', hora: '10:00:00', duracion: 15, orden: 0 },
];
const { proximas, historial } = vistaCitas(CITAS, SERVICIOS, AHORA);
const por = (id: string) => [...proximas, ...historial].find((c) => c.id === id)!;

test('estados: texto y tono', () => {
  assert.deepEqual(estadoCita('pending'), { texto: 'Pendiente', tono: 'warn' });
  assert.deepEqual(estadoCita('confirmed'), { texto: 'Confirmada', tono: 'ok' });
  assert.deepEqual(estadoCita('cancelled'), { texto: 'Cancelada', tono: 'bad' });
  assert.deepEqual(estadoCita('no_show'), { texto: 'No asistió', tono: 'bad' });
  assert.deepEqual(estadoCita('completed'), { texto: 'Completada', tono: 'mute' });
  assert.deepEqual(estadoCita('otro'), { texto: 'otro', tono: 'mute' });
});

test('horas que faltan y fecha corta', () => {
  assert.equal(horasHasta('2026-09-29', '16:00:00', AHORA), 6);
  assert.equal(horasHasta('2026-09-29', '09:30:00', AHORA), -0.5);
  assert.equal(fechaCorta('2026-09-15'), '15 sep');
});

test('próximas: activas y por venir, de la más cercana; historial: lo demás, de la más reciente', () => {
  assert.deepEqual(proximas.map((c) => c.id), ['B', 'A']);
  assert.deepEqual(historial.map((c) => c.id), ['D', 'E', 'C']);
});

test('cada servicio de la cita con su hora y su especialista, en orden', () => {
  assert.deepEqual(por('A').lineas, [
    { hora: '10:00 AM', nombre: 'Depilación Láser · Axilas', quien: 'Carmen Rodríguez' },
    { hora: '10:15 AM', nombre: 'Depilación Cera · Bozo', quien: 'Paola Jiménez' },
  ]);
  assert.equal(por('A').titulo, 'Depilación Láser · Axilas + Depilación Cera · Bozo');
  assert.deepEqual(por('A').ovalo, { dia: 'Sáb', numero: 3, mes: 'Oct' });
  // sin servicios en la otra lista, la cita se muestra con lo que trae
  assert.deepEqual(por('B').lineas, [{ hora: '4:00 PM', nombre: 'Hidrafacial', quien: 'Dra. Nadieska Soto' }]);
});

test('cancelar: solo pendiente o confirmada y con más de 12 h; con menos, aviso de WhatsApp', () => {
  assert.equal(por('A').cancelable, true);
  assert.equal(por('A').menosDe12h, false);
  assert.equal(por('B').cancelable, false);
  assert.equal(por('B').menosDe12h, true);
  assert.equal(por('D').cancelable, false);
  assert.equal(por('D').menosDe12h, false);
  assert.equal(por('D').estado, 'Cancelada');
});

test('cancelar: justo a las 12 h ya no es en línea; una pendiente que ya pasó va al historial sin avisos', () => {
  const casos = vistaCitas([
    cita('F', '2026-09-29', '22:00:00', 'confirmed'), // justo 12 h después de AHORA
    cita('G', '2026-09-29', '08:00:00', 'pending'), // pendiente, pero su hora ya pasó
  ], [], AHORA);
  assert.equal(horasHasta('2026-09-29', '22:00:00', AHORA), 12);
  assert.deepEqual(casos.proximas.map((c) => [c.id, c.cancelable, c.menosDe12h]), [['F', false, true]]);
  assert.deepEqual(casos.historial.map((c) => [c.id, c.cancelable, c.menosDe12h]), [['G', false, false]]);
});

const paquete = (extra: Partial<FilaPaqueteCliente>): FilaPaqueteCliente => ({
  id: 'p', paquete_id: 'sp1', paquete: 'Paquete Facial Profunda x5', servicio: 'Limpieza Facial Profunda',
  sesiones: 5, usadas: 3, comprado: '2026-09-01', estado: 'active', paquete_activo: true, cliente: 'María Altagracia Gómez', ...extra,
});

test('paquetes: sesiones usadas, las que quedan y reservar la próxima', () => {
  const [p] = vistaPaquetes([paquete({})]);
  assert.deepEqual(p, {
    id: 'p', nombre: 'Paquete Facial Profunda x5', servicio: 'Limpieza Facial Profunda', desde: 'desde 1 sep',
    total: 5, usadas: 3, quedan: 2, texto: '3 de 5 sesiones usadas · te quedan 2', terminado: false,
    reservar: '/reservar?paquete=sp1',
  });
  assert.equal(vistaPaquetes([paquete({ usadas: 4 })])[0].texto, '4 de 5 sesiones usadas · te queda 1');
});

test('paquetes terminados, sin sesiones o de un paquete que ya no se vende', () => {
  const [lleno, completo, viejo, raro] = vistaPaquetes([
    paquete({ usadas: 5 }),
    paquete({ estado: 'completed', usadas: 3 }),
    paquete({ paquete_activo: false }),
    paquete({ usadas: 9 }),
  ]);
  assert.deepEqual([lleno.terminado, lleno.reservar, lleno.texto], [true, null, '5 de 5 sesiones usadas · paquete terminado']);
  assert.deepEqual([completo.terminado, completo.reservar, completo.texto], [true, null, '3 de 5 sesiones usadas · paquete terminado']);
  assert.equal(viejo.reservar, '/reservar');
  assert.deepEqual([raro.usadas, raro.quedan], [5, 0]);
});

test('saludo: primer nombre y resumen en singular o plural', () => {
  assert.equal(primerNombre('  María Altagracia Gómez '), 'María');
  assert.equal(primerNombre(''), '');
  assert.equal(textoResumen(2, 1, 3), '2 citas próximas · 1 paquete activo · 3 visitas en tu historial');
  assert.equal(textoResumen(1, 0, 1), '1 cita próxima · 0 paquetes activos · 1 visita en tu historial');
  // paquetes que no se pudieron cargar: no se dice cuántos hay
  assert.equal(textoResumen(2, null, 3), '2 citas próximas · 3 visitas en tu historial');
});

test('teléfono completo: 10 dígitos, escritos como sea', () => {
  assert.equal(telefonoCompleto('809-555-0101'), true);
  assert.equal(telefonoCompleto('809 555 010'), false);
  assert.equal(telefonoCompleto(''), false);
});
