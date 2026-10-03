import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chocaConAgenda, estaLibre, horariosDelDia, minutesToTime, quienPuede, repartirDesde, timeToMinutes,
  type Agenda, type Elegido, type Especialista,
} from '../src/site/reservar/disponibilidad.ts';

const L_S = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const persona = (id: string, service_ids: string[], role = 'specialist'): Especialista => ({
  id, name: id.toUpperCase(), role, working_days: L_S, working_start: '09:00:00', working_end: '18:00:00', service_ids,
});
const ana = persona('ana', ['s1']);
const bea = persona('bea', ['s2']);
// especialista sin catálogo: puede hacer todo
const sinlista = persona('sinlista', []);
const STAFF = [ana, bea, sinlista];
const agenda = (extra: Partial<Agenda> = {}): Agenda => ({ staff: STAFF, ocupados: {}, bloqueos: [], ...extra });
const JUEVES = '2026-10-01';
const SABADO = '2026-10-03';
const DOMINGO = '2026-10-04';
const limpieza: Elegido = { serviceId: 's1', staffId: '', nombre: 'Limpieza', duracion: 60 };
const cejas: Elegido = { serviceId: 's2', staffId: '', nombre: 'Cejas', duracion: 30 };
const quienes = (plan: ReturnType<typeof repartirDesde>) => plan?.map((l) => `${l.nombre}@${l.staff.id}`) ?? null;
const OTRO_DIA = { hoy: '2026-09-29', minutos: 0 };

test('horas: "09:30" ↔ 570 minutos', () => {
  assert.equal(timeToMinutes('09:30:00'), 570);
  assert.equal(minutesToTime(570), '09:30');
  assert.equal(timeToMinutes(''), 0);
});

test('quién puede: primero su catálogo y después la especialista sin catálogo', () => {
  assert.deepEqual(quienPuede(STAFF, 's1').map((m) => m.id), ['ana', 'sinlista']);
  assert.deepEqual(quienPuede(STAFF, 's9').map((m) => m.id), ['sinlista']);
});

test('quién puede: la administración solo hace lo suyo; sin servicios (soporte) no atiende', () => {
  const anabel = persona('anabel', ['s1', 's3'], 'admin');
  const soporte = persona('soporte', [], 'admin');
  const staff = [ana, anabel, soporte];
  assert.deepEqual(quienPuede(staff, 's1').map((m) => m.id), ['ana', 'anabel']);
  assert.deepEqual(quienPuede(staff, 's3').map((m) => m.id), ['anabel']);
  assert.deepEqual(quienPuede(staff, 's9').map((m) => m.id), []);
});

test('libre: solo en sus días y dentro de su horario', () => {
  assert.equal(estaLibre(ana, 600, 60, DOMINGO, agenda()), false);
  assert.equal(estaLibre(ana, 510, 60, JUEVES, agenda()), false);
  assert.equal(estaLibre(ana, 1050, 60, JUEVES, agenda()), false);
  assert.equal(estaLibre(ana, 1020, 60, JUEVES, agenda()), true);
});

test('libre: una cita ocupa su tramo, pero justo antes y justo después queda libre', () => {
  const a = agenda({ ocupados: { ana: [{ time: '10:00:00', duration: 45 }] } });
  assert.equal(estaLibre(ana, 600, 30, JUEVES, a), false);
  assert.equal(estaLibre(ana, 645, 30, JUEVES, a), true);
  assert.equal(estaLibre(ana, 570, 30, JUEVES, a), true);
  assert.equal(estaLibre(ana, 570, 31, JUEVES, a), false);
});

test('bloqueos: el de otra persona no cuenta; el del salón en su horario y el suyo de todo el día, sí', () => {
  const deBea = { staff_id: 'bea', start_date: JUEVES, end_date: JUEVES, start_time: null, end_time: null };
  const almuerzo = { staff_id: null, start_date: JUEVES, end_date: JUEVES, start_time: '12:00:00', end_time: '13:00:00' };
  const vacaciones = { staff_id: 'ana', start_date: JUEVES, end_date: JUEVES, start_time: null, end_time: null };
  assert.equal(estaLibre(ana, 600, 60, JUEVES, agenda({ bloqueos: [deBea] })), true);
  assert.equal(estaLibre(ana, 750, 30, JUEVES, agenda({ bloqueos: [almuerzo] })), false);
  assert.equal(estaLibre(ana, 780, 30, JUEVES, agenda({ bloqueos: [almuerzo] })), true);
  assert.equal(estaLibre(ana, 600, 60, JUEVES, agenda({ bloqueos: [vacaciones] })), false);
});

test('día bloqueado para todo el salón: ninguna hora libre', () => {
  const feriado = { staff_id: null, start_date: JUEVES, end_date: JUEVES, start_time: null, end_time: null };
  const h = horariosDelDia([limpieza], JUEVES, agenda({ bloqueos: [feriado] }), OTRO_DIA);
  assert.ok(h.length > 0);
  assert.ok(h.every((x) => x.plan === null));
});

test('reparto: dos servicios seguidos con dos especialistas', () => {
  assert.deepEqual(quienes(repartirDesde([limpieza, cejas], 600, JUEVES, agenda())), ['Limpieza@ana', 'Cejas@bea']);
});

test('reparto: si la de su catálogo está ocupada, lo hace la que no tiene catálogo', () => {
  const a = agenda({ ocupados: { ana: [{ time: '10:00:00', duration: 60 }] } });
  assert.deepEqual(quienes(repartirDesde([limpieza, cejas], 600, JUEVES, a)), ['Limpieza@sinlista', 'Cejas@bea']);
});

test('reparto: con una especialista elegida es ella o nada', () => {
  const a = agenda({ ocupados: { ana: [{ time: '10:00:00', duration: 60 }] } });
  assert.equal(repartirDesde([{ ...limpieza, staffId: 'ana' }], 600, JUEVES, a), null);
  assert.deepEqual(quienes(repartirDesde([{ ...limpieza, staffId: 'ana' }], 660, JUEVES, a)), ['Limpieza@ana']);
});

test('horarios: cada media hora de 9:00 a la última que cabe; las ocupadas quedan sin reparto', () => {
  const a = agenda({ ocupados: { ana: [{ time: '10:00:00', duration: 60 }], sinlista: [{ time: '10:00:00', duration: 60 }] } });
  const h = horariosDelDia([limpieza], JUEVES, a, OTRO_DIA);
  assert.equal(h[0].hora, '09:00');
  assert.equal(h.at(-1)?.hora, '17:00');
  assert.equal(h.length, 17);
  const libre = (hora: string) => h.find((x) => x.hora === hora)!.plan !== null;
  assert.equal(libre('09:00'), true);
  assert.equal(libre('09:30'), false);
  assert.equal(libre('10:30'), false);
  assert.equal(libre('11:00'), true);
});

test('horarios: el sábado el salón cierra a las 2:00, aunque ella trabaje hasta las 6:00', () => {
  const h = horariosDelDia([limpieza], SABADO, agenda(), OTRO_DIA);
  assert.equal(h[0].hora, '09:00');
  assert.equal(h.at(-1)?.hora, '13:00');
  assert.ok(h.every((x) => x.plan !== null));
  assert.equal(horariosDelDia([cejas], SABADO, agenda(), OTRO_DIA).at(-1)?.hora, '13:30');
});

test('horarios: el domingo el salón no abre, aunque alguien tenga marcado el domingo', () => {
  const a = agenda({ staff: [{ ...sinlista, working_days: [...L_S, 'domingo'] }] });
  assert.deepEqual(horariosDelDia([limpieza], DOMINGO, a, OTRO_DIA), []);
});

test('horarios: si ella entra a las 8:00, se ofrece desde las 8:00', () => {
  const temprano = { ...ana, working_start: '08:00:00' };
  const h = horariosDelDia([limpieza], JUEVES, agenda({ staff: [temprano] }), OTRO_DIA);
  assert.equal(h[0].hora, '08:00');
  assert.equal(h.at(-1)?.hora, '17:00');
});

test('horarios: hoy no ofrece horas que ya pasaron (con 15 minutos de margen)', () => {
  const h = horariosDelDia([cejas], '2026-09-29', agenda(), { hoy: '2026-09-29', minutos: 650 });
  assert.equal(h[0].hora, '11:30');
});

test('horarios: sin servicios o sin día, nada', () => {
  assert.deepEqual(horariosDelDia([], JUEVES, agenda(), OTRO_DIA), []);
  assert.deepEqual(horariosDelDia([limpieza], '', agenda(), OTRO_DIA), []);
});

test('relectura: avisa si alguien tomó uno de los tramos mientras llenaba el formulario', () => {
  const plan = repartirDesde([limpieza, cejas], 600, JUEVES, agenda())!;
  assert.equal(chocaConAgenda(plan, '10:00', { bea: [{ time: '11:15:00', duration: 30 }] }), true);
  assert.equal(chocaConAgenda(plan, '10:00', { bea: [{ time: '11:30:00', duration: 30 }] }), false);
});
