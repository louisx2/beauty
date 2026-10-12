import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  diaDelSalon, enSala, horasTexto, porConfirmar, renglonesDelDia, restar, resumenDe,
} from '../src/pages/admin/hoy/dia.ts';
import type { Appointment } from '../src/store/appointmentStore.ts';
import type { ScheduleBlock } from '../src/store/blockStore.ts';
import type { StaffMember } from '../src/store/staffStore.ts';

const MIERCOLES = '2026-10-14';
const JUEVES = '2026-10-15';
const DOMINGO = '2026-10-18';
const h = (hhmm: string) => { const [a, b] = hhmm.split(':').map(Number); return a * 60 + b; };

const persona = (id: string, name: string, role: StaffMember['role'], serviceIds: string[], extra: Partial<StaffMember> = {}): StaffMember => ({
  id, name, role, phone: '', email: null, commissionPct: 0,
  workingDays: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'], workingStart: '09:00', workingEnd: '18:00',
  serviceIds, active: true, mostrarEnWeb: false, cargoWeb: null, especialidadesWeb: null, createdAt: '', ...extra,
});
const STAFF = [
  persona('anabel', 'Anabel De los Santos', 'admin', ['limpieza']),
  persona('melissa', 'Dra. Melissa Lara', 'specialist', [], { workingDays: ['martes', 'jueves', 'sabado'], workingStart: '10:00', workingEnd: '17:00' }),
  persona('rec', 'Yaneisy', 'receptionist', []),
];

let n = 0;
const cita = (date: string, status: Appointment['status'], lineas: [string, string, string, number][], extra: Partial<Appointment> = {}): Appointment => ({
  id: `a${++n}`, client_id: 'c1', clientName: 'María', clientPhone: '8295550000',
  service: lineas.map((l) => l[1]).join(' + '), employee: lineas[0][2], date, time: lineas[0][0],
  duration: lineas.reduce((t, l) => t + l[3], 0), status, notes: null, source: 'manual', createdAt: '', startedAt: null,
  services: lineas.map(([startTime, serviceName, employee, duration]) => ({ serviceId: null, serviceName, employee, startTime, duration, price: 0 })),
  ...extra,
});

test('restar tramos: lo que queda alrededor de cada cita', () => {
  assert.deepEqual(restar([{ inicio: 540, fin: 1080 }], [{ inicio: 600, fin: 660 }, { inicio: 900, fin: 930 }]),
    [{ inicio: 540, fin: 600 }, { inicio: 660, fin: 900 }, { inicio: 930, fin: 1080 }]);
  assert.deepEqual(restar([{ inicio: 540, fin: 600 }], [{ inicio: 500, fin: 700 }]), []);
});

test('una columna por quien atiende, con sus citas y sus huecos libres', () => {
  const citas = [
    cita(MIERCOLES, 'completed', [['09:00', 'Limpieza facial', 'Anabel De los Santos', 60]]),
    cita(MIERCOLES, 'confirmed', [['14:00', 'Cejas', 'anabel de los santos', 30]]),
    cita(MIERCOLES, 'cancelled', [['11:00', 'Cejas', 'Anabel De los Santos', 30]]),
  ];
  const dia = diaDelSalon(MIERCOLES, STAFF, citas, [], null);
  assert.deepEqual(dia.columnas.map((c) => c.id), ['anabel', 'melissa']);
  const anabel = dia.columnas[0];
  assert.deepEqual(anabel.bloques.map((b) => b.inicio), [h('09:00'), h('14:00')]);
  assert.deepEqual(anabel.libres, [{ inicio: h('10:00'), fin: h('14:00') }, { inicio: h('14:30'), fin: h('18:00') }]);
  assert.equal(anabel.minutosLibres, 4 * 60 + 210);
  // la doctora no trabaja los miércoles
  assert.equal(dia.columnas[1].trabaja, false);
  assert.deepEqual(dia.columnas[1].libres, []);
  assert.deepEqual([dia.inicio, dia.fin], [h('09:00'), h('18:00')]);
});

test('una cita con dos servicios va a la columna de cada especialista, a su hora', () => {
  const dia = diaDelSalon(JUEVES, STAFF, [
    cita(JUEVES, 'confirmed', [['10:00', 'Limpieza facial', 'Anabel De los Santos', 60], ['11:00', 'Toxina', 'Dra. Melissa Lara', 30]]),
  ], [], null);
  assert.deepEqual(dia.columnas[0].bloques.map((b) => [b.servicio, b.inicio, b.fin]), [['Limpieza facial', 600, 660]]);
  assert.deepEqual(dia.columnas[1].bloques.map((b) => [b.servicio, b.inicio, b.fin]), [['Toxina', 660, 690]]);
  assert.deepEqual(dia.columnas[1].libres, [{ inicio: h('10:00'), fin: h('11:00') }, { inicio: h('11:30'), fin: h('17:00') }]);
});

test('hoy, lo que ya pasó no se ofrece como libre (se redondea al cuarto de hora)', () => {
  const dia = diaDelSalon(MIERCOLES, STAFF, [], [], h('10:50'));
  assert.deepEqual(dia.columnas[0].libres, [{ inicio: h('11:00'), fin: h('18:00') }]);
});

test('los bloqueos (de ella o de todo el salón) tapan su hueco y se ven en su columna', () => {
  const bloqueo = (staffId: string | null, startTime: string | null, endTime: string | null, reason: string): ScheduleBlock =>
    ({ id: reason, staffId, startDate: MIERCOLES, endDate: MIERCOLES, startTime, endTime, reason, createdAt: '' });
  const dia = diaDelSalon(MIERCOLES, STAFF, [], [bloqueo('anabel', '12:00', '13:00', 'Almuerzo'), bloqueo('melissa', null, null, 'Vacaciones')], null);
  assert.deepEqual(dia.columnas[0].libres, [{ inicio: h('09:00'), fin: h('12:00') }, { inicio: h('13:00'), fin: h('18:00') }]);
  assert.deepEqual(dia.columnas[0].bloqueos, [{ inicio: h('12:00'), fin: h('13:00'), motivo: 'Almuerzo', todoElDia: false }]);
  const salon = diaDelSalon(MIERCOLES, STAFF, [], [bloqueo(null, null, null, 'Feriado')], null);
  assert.deepEqual(salon.columnas[0].libres, []);
  assert.equal(salon.columnas[0].bloqueos[0].todoElDia, true);
});

test('quien tiene citas pero ya no está en Equipo sale en su propia columna, sin huecos', () => {
  const dia = diaDelSalon(MIERCOLES, STAFF, [cita(MIERCOLES, 'confirmed', [['15:00', 'Pestañas', 'Ex empleada', 60]])], [], null);
  const ex = dia.columnas.find((c) => c.nombre === 'Ex empleada')!;
  assert.equal(ex.trabaja, false);
  assert.equal(ex.bloques.length, 1);
  assert.deepEqual(ex.libres, []);
});

test('el domingo el salón no abre: nadie trabaja', () => {
  const dia = diaDelSalon(DOMINGO, STAFF, [], [], null);
  assert.ok(dia.columnas.every((c) => !c.trabaja && c.libres.length === 0));
  assert.deepEqual([dia.inicio, dia.fin], [h('08:00'), h('18:00')]);
});

test('en sala, por confirmar (hoy y mañana) y el resumen de mañana', () => {
  const citas = [
    cita(MIERCOLES, 'in_progress', [['10:30', 'Láser', 'Anabel De los Santos', 45]]),
    cita(JUEVES, 'pending', [['09:00', 'Cejas', 'Anabel De los Santos', 30]]),
    cita(MIERCOLES, 'pending', [['16:00', 'PRP', 'Dra. Melissa Lara', 45]]),
    cita(MIERCOLES, 'pending', [['14:00', 'Cejas', 'Anabel De los Santos', 30]]),
    cita('2026-10-16', 'pending', [['09:00', 'Cejas', 'Anabel De los Santos', 30]]),
    cita(JUEVES, 'confirmed', [['11:00', 'Facial', 'Anabel De los Santos', 60]]),
    cita(JUEVES, 'cancelled', [['12:00', 'Facial', 'Anabel De los Santos', 60]]),
  ];
  assert.deepEqual(enSala(citas, MIERCOLES).map((c) => c.time), ['10:30']);
  assert.deepEqual(porConfirmar(citas, MIERCOLES, JUEVES).map((c) => `${c.date} ${c.time}`),
    [`${MIERCOLES} 14:00`, `${MIERCOLES} 16:00`, `${JUEVES} 09:00`]);
  assert.deepEqual(resumenDe(citas, JUEVES), { citas: 2, porConfirmar: 1 });
});

test('en el celular: una sola lista en orden de hora, con los huecos de media hora o más', () => {
  const dia = diaDelSalon(MIERCOLES, STAFF, [
    cita(MIERCOLES, 'confirmed', [['09:00', 'Facial', 'Anabel De los Santos', 60]]),
    cita(MIERCOLES, 'confirmed', [['10:15', 'Cejas', 'Anabel De los Santos', 30]]),
  ], [], null);
  assert.deepEqual(renglonesDelDia(dia).map((r) => `${r.tipo} ${r.inicio}`), [
    `cita ${h('09:00')}`, `cita ${h('10:15')}`, `libre ${h('10:45')}`,
  ]);
});

test('horas libres en texto corto', () => {
  assert.equal(horasTexto(45), '45 min');
  assert.equal(horasTexto(300), '5 h');
  assert.equal(horasTexto(345), '5 h 45');
});
