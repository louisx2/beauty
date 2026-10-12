import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buscarClientas, clientaConTelefono, disponibilidadAhora, formatoTelefono, paquetesQueUsa, planAhora, telefonoClave, validarNueva,
} from '../src/pages/admin/atender/atender.ts';
import { especialistasDeAgenda } from '../src/pages/admin/citas/proximaCita.ts';
import type { Appointment } from '../src/store/appointmentStore.ts';
import type { ScheduleBlock } from '../src/store/blockStore.ts';
import type { Client } from '../src/store/clientStore.ts';
import type { ClientPackage } from '../src/store/serviceStore.ts';
import type { StaffMember } from '../src/store/staffStore.ts';

const JUEVES = '2026-10-15';
const h = (hhmm: string) => { const [a, b] = hhmm.split(':').map(Number); return a * 60 + b; };

const clienta = (id: string, name: string, phone: string): Client =>
  ({ id, name, phone, email: null, cedula: null, skin_type: null, allergies: null, notes: null, source: 'manual', created_at: '' });
const CLIENTAS = [
  clienta('c1', 'María Pérez', '829-555-1000'),
  clienta('c2', 'Mariela Báez', '809-555-2222'),
  clienta('c3', 'Ana María Gómez', '849-555-3333'),
  clienta('c4', 'Rosanna Peña', '+1 (829) 555-4444'),
];

const persona = (id: string, name: string, role: StaffMember['role'], serviceIds: string[], extra: Partial<StaffMember> = {}): StaffMember => ({
  id, name, role, phone: '', email: null, commissionPct: 0,
  workingDays: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'], workingStart: '09:00', workingEnd: '18:00',
  serviceIds, active: true, mostrarEnWeb: false, cargoWeb: null, especialidadesWeb: null, createdAt: '', ...extra,
});
const ESP = especialistasDeAgenda([
  persona('anabel', 'Anabel De los Santos', 'admin', ['limpieza', 'cejas']),
  persona('ana', 'Ana Herrera', 'specialist', ['pestanas', 'cejas']),
  persona('melissa', 'Dra. Melissa Lara', 'specialist', ['toxina'], { workingDays: ['martes'] }),
]);
const [ANABEL, ANA, MELISSA] = ESP;

let n = 0;
const cita = (status: Appointment['status'], time: string, servicio: string, empleada: string, minutos: number, clientName = 'Yokasta'): Appointment => ({
  id: `a${++n}`, client_id: null, clientName, clientPhone: '', service: servicio, employee: empleada, date: JUEVES, time,
  duration: minutos, status, notes: null, source: 'manual', createdAt: '', startedAt: null,
  services: [{ serviceId: null, serviceName: servicio, employee: empleada, startTime: time, duration: minutos, price: 0 }],
});
const LIMPIEZA = { serviceId: 'limpieza', staffId: '', nombre: 'Limpieza facial', duracion: 60 };
const CEJAS = { serviceId: 'cejas', staffId: '', nombre: 'Diseño de cejas', duracion: 30 };

test('teléfono mientras se escribe: 829-555-1234, sin el 1 del país', () => {
  assert.equal(formatoTelefono('829'), '829');
  assert.equal(formatoTelefono('8295551'), '829-555-1');
  assert.equal(formatoTelefono('+1 829 555 1234'), '829-555-1234');
});

test('teléfono: los últimos 10 dígitos', () => {
  assert.equal(telefonoClave('+1 (829) 555-4444'), '8295554444');
  assert.equal(telefonoClave('829-555-4444'), '8295554444');
});

test('buscar clienta sin tildes, por palabras o por teléfono; primero las que empiezan así', () => {
  assert.deepEqual(buscarClientas(CLIENTAS, 'maria').map((c) => c.id), ['c1', 'c3']);
  assert.deepEqual(buscarClientas(CLIENTAS, 'mari').map((c) => c.id), ['c1', 'c2', 'c3']);
  assert.deepEqual(buscarClientas(CLIENTAS, 'gomez ana').map((c) => c.id), ['c3']);
  assert.deepEqual(buscarClientas(CLIENTAS, '555-44').map((c) => c.id), ['c4']);
  assert.deepEqual(buscarClientas(CLIENTAS, '  '), []);
});

test('no duplicar: la ficha que ya tiene ese teléfono', () => {
  assert.equal(clientaConTelefono(CLIENTAS, '8295554444')?.id, 'c4');
  assert.equal(clientaConTelefono(CLIENTAS, '829-555'), null);
  assert.equal(clientaConTelefono(CLIENTAS, '8090000000'), null);
});

test('clienta nueva: nombre y teléfono de 10 dígitos', () => {
  assert.deepEqual(validarNueva('', '829'), { nombre: 'Escribe su nombre', telefono: 'Teléfono de 10 dígitos' });
  assert.deepEqual(validarNueva('Laura', '829-555-1234'), {});
});

test('libre hasta su próxima cita; ocupada (con quién) mientras atiende, contando la cita pegada', () => {
  const citas = [
    cita('in_progress', '10:30', 'Láser', 'Anabel De los Santos', 45, 'Yokasta'),
    cita('confirmed', '11:15', 'Cejas', 'Anabel De los Santos', 30, 'Laura'),
    cita('confirmed', '14:00', 'Pestañas', 'Ana Herrera', 60),
  ];
  assert.deepEqual(disponibilidadAhora(ANABEL, citas, [], JUEVES, h('10:50')), { tipo: 'ocupada', hasta: h('11:45'), con: 'Yokasta' });
  assert.deepEqual(disponibilidadAhora(ANA, citas, [], JUEVES, h('10:50')), { tipo: 'libre', hasta: h('14:00') });
  assert.deepEqual(disponibilidadAhora(MELISSA, citas, [], JUEVES, h('10:50')), { tipo: 'no_trabaja' });
  assert.deepEqual(disponibilidadAhora(ANA, [], [], JUEVES, h('8:30')), { tipo: 'entra', a: h('9:00') });
  assert.deepEqual(disponibilidadAhora(ANA, [], [], JUEVES, h('18:00')), { tipo: 'termino' });
  assert.deepEqual(disponibilidadAhora(ANA, [], [], JUEVES, h('16:00')), { tipo: 'libre', hasta: h('18:00') });
});

test('una cita en curso que se pasó de su hora la sigue ocupando', () => {
  const citas = [cita('in_progress', '10:30', 'Láser', 'Anabel De los Santos', 15, 'Yokasta')];
  assert.deepEqual(disponibilidadAhora(ANABEL, citas, [], JUEVES, h('10:50')), { tipo: 'ocupada', hasta: h('10:45'), con: 'Yokasta' });
  assert.equal(planAhora([{ ...CEJAS, staffId: 'anabel' }], ESP, citas, [], JUEVES, h('10:50')), null);
  // con "cualquiera", la otra que hace cejas
  assert.equal(planAhora([CEJAS], ESP, citas, [], JUEVES, h('10:50'))![0].staff.id, 'ana');
});

test('lo completado o cancelado no la ocupa; un bloqueo sí', () => {
  const citas = [cita('completed', '10:30', 'Limpieza', 'Ana Herrera', 60), cita('cancelled', '11:00', 'Cejas', 'Ana Herrera', 30)];
  assert.deepEqual(disponibilidadAhora(ANA, citas, [], JUEVES, h('10:50')), { tipo: 'libre', hasta: h('18:00') });
  const almuerzo: ScheduleBlock = { id: 'b', staffId: 'ana', startDate: JUEVES, endDate: JUEVES, startTime: '12:30', endTime: '13:30', reason: 'Almuerzo', createdAt: '' };
  assert.deepEqual(disponibilidadAhora(ANA, [], [almuerzo], JUEVES, h('12:45')), { tipo: 'bloqueada', hasta: h('13:30'), motivo: 'Almuerzo' });
  assert.deepEqual(disponibilidadAhora(ANA, [], [almuerzo], JUEVES, h('11:00')), { tipo: 'libre', hasta: h('12:30') });
});

test('el plan empieza ya: con "cualquiera" toma a la que está libre; si no cabe entero, no hay plan', () => {
  const citas = [cita('in_progress', '10:30', 'Láser', 'Anabel De los Santos', 45)];
  const plan = planAhora([CEJAS], ESP, citas, [], JUEVES, h('10:50'))!;
  assert.equal(plan[0].staff.id, 'ana');
  // Anabel está ocupada hasta las 11:15: con ella no se puede empezar ahora
  assert.equal(planAhora([{ ...LIMPIEZA, staffId: 'anabel' }], ESP, citas, [], JUEVES, h('10:50')), null);
  // una cita que ya terminó antes de tiempo no estorba
  const terminada = [cita('completed', '10:30', 'Láser', 'Anabel De los Santos', 45)];
  assert.equal(planAhora([{ ...LIMPIEZA, staffId: 'anabel' }], ESP, terminada, [], JUEVES, h('10:50'))![0].staff.id, 'anabel');
  assert.equal(planAhora([], ESP, [], [], JUEVES, h('10:50')), null);
});

test('paquetes de la clienta que cubren lo que se va a hacer', () => {
  const paquete = (id: string, clientId: string, serviceName: string, used: number, status: ClientPackage['status'] = 'active'): ClientPackage => ({
    id, clientId, clientName: '', packageId: 'p', packageName: `Paquete ${serviceName}`, serviceName, totalSessions: 6, usedSessions: used,
    purchasedAt: '', notes: '', totalPrice: 0, amountPaid: 0, status,
  });
  const paquetes = [paquete('p1', 'c1', 'Limpieza facial', 2), paquete('p2', 'c1', 'Láser', 6), paquete('p3', 'c2', 'Limpieza facial', 1)];
  assert.deepEqual(paquetesQueUsa(paquetes, 'c1', [LIMPIEZA]).map((p) => p.id), ['p1']);
  assert.deepEqual(paquetesQueUsa(paquetes, null, [LIMPIEZA]), []);
});
