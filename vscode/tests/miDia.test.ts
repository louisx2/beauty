import { test } from 'node:test';
import assert from 'node:assert/strict';
import { antesDeAtender, enSalaYSiguiente, misLineas, proximosDias, saludo, tiempoTranscurrido } from '../src/pages/specialist/miDia.ts';
import { citasParaRecordar, marcasDeHoy, mensajeRecordatorio, resumenRecordatorios, siguienteParaAvisar } from '../src/pages/admin/hoy/avisos.ts';
import type { Appointment } from '../src/store/appointmentStore.ts';
import type { Client } from '../src/store/clientStore.ts';
import type { EntradaHistorial } from '../src/lib/historialAnterior.ts';
import { vezDelServicio } from '../src/pages/admin/clientes/record.ts';

const HOY = '2026-10-15';
const MANANA = '2026-10-16';

let n = 0;
const cita = (date: string, time: string, lineas: [string, string, number][], status: Appointment['status'] = 'confirmed', extra: Partial<Appointment> = {}): Appointment => ({
  id: `a${++n}`, client_id: 'c1', clientName: 'Yokasta Ramírez', clientPhone: '829-555-1074', service: lineas.map((l) => l[0]).join(' + '),
  employee: lineas[0][1], date, time, duration: lineas.reduce((t, l) => t + l[2], 0), status, notes: null, source: 'manual', createdAt: '',
  startedAt: null,
  services: lineas.map(([serviceName, employee, duration], i) => ({
    serviceId: null, serviceName, employee, duration, price: 0,
    startTime: `${String(Math.floor((Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) + lineas.slice(0, i).reduce((t, l) => t + l[2], 0)) / 60)).padStart(2, '0')}:${String((Number(time.slice(3)) + lineas.slice(0, i).reduce((t, l) => t + l[2], 0)) % 60).padStart(2, '0')}`,
  })),
  ...extra,
});

test('sus líneas: también el segundo servicio de una cita de otra', () => {
  const citas = [
    cita(HOY, '10:00', [['Limpieza facial', 'Anabel De los Santos', 60], ['Diseño de cejas', 'Ana Herrera', 30]]),
    cita(HOY, '09:00', [['Pestañas', 'Ana Herrera', 60]], 'completed'),
    cita(HOY, '15:00', [['Maquillaje', 'ana herrera', 60]], 'cancelled'),
    cita(MANANA, '09:00', [['Pestañas', 'Ana Herrera', 60]]),
  ];
  const mias = misLineas(citas, 'Ana Herrera', HOY);
  assert.deepEqual(mias.map((l) => [l.servicio, l.inicio]), [['Pestañas', 540], ['Diseño de cejas', 660]]);
});

test('en cabina y la que sigue (aunque ya se le haya pasado la hora)', () => {
  const lineas = misLineas([
    cita(HOY, '09:00', [['Pestañas', 'Ana', 60]], 'completed'),
    cita(HOY, '10:00', [['Cejas', 'Ana', 30]], 'in_progress'),
    cita(HOY, '10:30', [['Hidra Lips', 'Ana', 20]], 'pending'),
    cita(HOY, '12:00', [['Facial', 'Ana', 60]], 'confirmed'),
  ], 'Ana', HOY);
  const { enSala, siguiente } = enSalaYSiguiente(lineas);
  assert.equal(enSala?.servicio, 'Cejas');
  assert.equal(siguiente?.servicio, 'Hidra Lips');
  assert.deepEqual(enSalaYSiguiente([]), { enSala: null, siguiente: null });
});

test('antes de atender: su ficha y la última vez que vino', () => {
  const ficha: Client = { id: 'c1', name: 'Yokasta Ramírez', phone: '829-555-1074', email: null, cedula: null, skin_type: 'Grasa', allergies: ' Lidocaína ', notes: 'Prefiere la tarde', source: 'manual', created_at: '' };
  const ahora = cita(HOY, '10:00', [['Láser', 'Anabel', 30]]);
  const citas = [
    ahora,
    cita('2026-09-01', '10:00', [['Láser', 'Anabel', 30]], 'completed', { notes: 'Sesión 2, sin reacción' }),
    cita('2026-08-01', '10:00', [['Láser', 'Anabel', 30]], 'completed'),
    cita('2026-09-20', '10:00', [['Cejas', 'Ana', 30]], 'no_show'),
    cita('2026-11-01', '10:00', [['Láser', 'Anabel', 30]], 'completed'), // después de esta: no cuenta
  ];
  const a = antesDeAtender(ahora, [ficha], citas);
  assert.deepEqual([a.alergias, a.piel, a.notas, a.visitas], ['Lidocaína', 'Grasa', 'Prefiere la tarde', 2]);
  assert.equal(a.ultima?.notes, 'Sesión 2, sin reacción');
  // sin ficha: nada de la ficha, y la última por su teléfono
  const sinFicha = { ...ahora, client_id: null };
  assert.equal(antesDeAtender(sinFicha, [], [sinFicha, { ...citas[1], client_id: null }]).ultima?.date, '2026-09-01');
});

test('antes de atender: también cuenta el historial previo y las de antes sin detalle, y qué vez es cada servicio', () => {
  const ficha: Client = { id: 'c1', name: 'Yokasta Ramírez', phone: '829-555-1074', email: null, cedula: null, skin_type: null, allergies: null, notes: null, source: 'manual', created_at: '', visitas_previas: 3 };
  const ahora = cita(HOY, '10:00', [['Depilación Láser - Axilas', 'Anabel', 15], ['Depilación Láser - Bikini', 'Anabel', 20]]);
  const citas = [ahora, cita('2026-09-01', '10:00', [['Depilación Láser - Axilas', 'Anabel', 15]], 'completed')];
  const previo = (fecha: string | null, servicio: string): EntradaHistorial =>
    ({ id: `h${fecha}${servicio}`, clientId: 'c1', fecha, servicio, especialista: 'Anabel', notas: 'Sin reacción', creado: '' });
  const anteriores = [previo('2025-06-14', 'Depilación Láser - Axilas'), previo(null, 'Depilación Láser - Axilas'), previo(HOY, 'Cejas')];
  const a = antesDeAtender(ahora, [ficha], citas, anteriores);
  // 1 del sistema + 2 del historial (lo de hoy no es "antes") + 3 sin detalle
  assert.equal(a.visitas, 6);
  assert.equal(vezDelServicio(a.record, 'Depilación Láser - Axilas'), 4);
  assert.equal(vezDelServicio(a.record, 'Depilación Láser - Bikini'), 1);
  // la última vez es la del sistema; si la del historial previo es más reciente, se dice esa
  assert.equal(a.ultima?.date, '2026-09-01');
  assert.equal(a.ultimaPrevia, null);
  const soloPrevio = antesDeAtender(ahora, [ficha], [ahora], anteriores);
  assert.equal(soloPrevio.ultima, null);
  assert.equal(soloPrevio.ultimaPrevia?.fecha, '2025-06-14');
});

test('próximos días con citas suyas, sin hoy, en orden', () => {
  const citas = [
    cita('2026-10-20', '10:00', [['Cejas', 'Ana', 30]]),
    cita('2026-10-17', '10:00', [['Cejas', 'Ana', 30]], 'pending'),
    cita('2026-10-17', '09:00', [['Cejas', 'Ana', 30]]),
    cita('2026-10-18', '09:00', [['Cejas', 'Otra', 30]]),
    cita('2026-10-19', '09:00', [['Cejas', 'Ana', 30]], 'cancelled'),
    cita(HOY, '16:00', [['Cejas', 'Ana', 30]]),
  ];
  const d = proximosDias(citas, 'Ana', HOY);
  assert.deepEqual(d.map((x) => [x.fecha, x.lineas.length]), [['2026-10-17', 2], ['2026-10-20', 1]]);
  assert.equal(d[0].lineas[0].inicio, 540);
});

test('tiempo en cabina y saludo', () => {
  const desde = new Date('2026-10-15T10:00:00').toISOString();
  assert.equal(tiempoTranscurrido(desde, new Date('2026-10-15T10:12:30').getTime()), '12 min');
  assert.equal(tiempoTranscurrido(desde, new Date('2026-10-15T11:05:00').getTime()), '1 h 05 min');
  assert.equal(tiempoTranscurrido(null, 0), '');
  assert.deepEqual([saludo(9 * 60), saludo(13 * 60), saludo(19 * 60)], ['Buenos días', 'Buenas tardes', 'Buenas noches']);
});

test('recordatorios: las de mañana en orden de hora; la siguiente, primero las por confirmar; el mensaje; a quién falta', () => {
  const citas = [
    cita(MANANA, '09:00', [['Limpieza facial', 'Ana Herrera', 60]], 'confirmed'),
    cita(MANANA, '11:00', [['Diseño de cejas', 'Dra. Melissa Lara', 30]], 'pending'),
    cita(MANANA, '08:00', [['Cejas', 'Ana Herrera', 30]], 'cancelled'),
    cita(HOY, '15:00', [['Cejas', 'Ana Herrera', 30]], 'pending'),
  ];
  const lista = citasParaRecordar(citas, MANANA);
  assert.deepEqual(lista.map((c) => c.time), ['09:00', '11:00']);
  assert.equal(siguienteParaAvisar(lista, {})?.time, '11:00'); // la por confirmar primero
  assert.equal(siguienteParaAvisar(lista, { [lista[1].id]: { dia: HOY, hora: '15:00' } })?.time, '09:00');
  assert.equal(siguienteParaAvisar(lista, { [lista[0].id]: { dia: HOY, hora: '15:00' }, [lista[1].id]: { dia: HOY, hora: '15:00' } }), null);
  const m = mensajeRecordatorio(lista[1]);
  assert.match(m, /^Hola Yokasta, te recordamos tu cita de mañana viernes 16 de octubre a las 11:00 AM: Diseño de cejas con Dra\. Melissa\./);
  assert.match(m, /¿Nos confirmas que vienes\?/);
  assert.match(mensajeRecordatorio(lista[0]), /con Ana\. ¡Te esperamos!/);
  const marcas = marcasDeHoy({ [lista[0].id]: { dia: HOY, hora: '15:40' }, viejo: { dia: '2026-10-10', hora: '09:00' } }, HOY);
  assert.deepEqual(Object.keys(marcas), [lista[0].id]);
  assert.deepEqual(resumenRecordatorios(lista, marcas), { total: 2, porConfirmar: 1, sinAvisar: 1 });
});
