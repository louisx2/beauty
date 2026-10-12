import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  agendaDelDia, cuposDelDia, elegidosDeCita, especialistasDeAgenda, horasDelDia, lineasDelPlan, primerNombre,
} from '../src/pages/admin/citas/proximaCita.ts';
import type { Appointment } from '../src/store/appointmentStore.ts';
import type { ScheduleBlock } from '../src/store/blockStore.ts';
import type { Service } from '../src/store/serviceStore.ts';
import type { StaffMember } from '../src/store/staffStore.ts';

const MIERCOLES = '2026-10-14';
const DOMINGO = '2026-10-18';
const ANTES = { hoy: '2026-10-12', minutos: 600 };

const persona = (id: string, name: string, role: StaffMember['role'], serviceIds: string[], extra: Partial<StaffMember> = {}): StaffMember => ({
  id, name, role, phone: '', email: null, commissionPct: 0,
  workingDays: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'], workingStart: '09:00', workingEnd: '18:00',
  serviceIds, active: true, mostrarEnWeb: false, cargoWeb: null, especialidadesWeb: null, createdAt: '', ...extra,
});
const STAFF = [
  persona('anabel', 'Anabel De los Santos', 'admin', ['limpieza', 'cejas']),
  persona('ana', 'Ana Herrera', 'specialist', ['pestanas']),
  persona('rec', 'Yaneisy', 'receptionist', []),
  persona('soporte', 'Soporte', 'admin', []),
  persona('vieja', 'Ex empleada', 'specialist', [], { active: false }),
];
const SERVICIOS: Service[] = [
  { id: 'limpieza', name: 'Limpieza facial profunda', category: 'facial', description: '', duration: 60, price: 2500, taxable: false, hasSession: false, active: true },
  { id: 'cejas', name: 'Diseño de cejas', category: 'belleza', description: '', duration: 30, price: 600, taxable: false, hasSession: false, active: true },
  { id: 'pestanas', name: 'Lifting de pestañas', category: 'belleza', description: '', duration: 60, price: 1500, taxable: false, hasSession: false, active: true },
];

let n = 0;
const cita = (date: string, status: Appointment['status'], lineas: [string, string, string, number][]): Appointment => ({
  id: `a${++n}`, client_id: 'c1', clientName: 'María', clientPhone: '8295550000',
  service: lineas.map((l) => l[1]).join(' + '), employee: lineas[0][2], date, time: lineas[0][0],
  duration: lineas.reduce((t, l) => t + l[3], 0), status, notes: null, source: 'manual', createdAt: '', startedAt: null,
  services: lineas.map(([startTime, serviceName, employee, duration]) => ({ serviceId: null, serviceName, employee, startTime, duration, price: 0 })),
});

test('atienden las que hacen servicios: ni recepción, ni la cuenta de soporte, ni quien ya no está', () => {
  assert.deepEqual(especialistasDeAgenda(STAFF).map((m) => m.id), ['anabel', 'ana']);
  // una especialista solo se agenda a sí misma
  assert.deepEqual(especialistasDeAgenda(STAFF, '  ana herrera ').map((m) => m.id), ['ana']);
});

test('la agenda del día toma cada servicio con su especialista y su hora, y deja libre lo cancelado', () => {
  const esp = especialistasDeAgenda(STAFF);
  const citas = [
    cita(MIERCOLES, 'confirmed', [['10:00', 'Limpieza facial profunda', 'Anabel De los Santos', 60], ['11:00', 'Lifting de pestañas', 'ana herrera', 60]]),
    cita(MIERCOLES, 'cancelled', [['15:00', 'Diseño de cejas', 'Anabel De los Santos', 30]]),
    cita(MIERCOLES, 'no_show', [['16:00', 'Diseño de cejas', 'Anabel De los Santos', 30]]),
    cita('2026-10-15', 'pending', [['09:00', 'Diseño de cejas', 'Anabel De los Santos', 30]]),
  ];
  const agenda = agendaDelDia(MIERCOLES, esp, citas, []);
  assert.deepEqual(agenda.ocupados, {
    anabel: [{ time: '10:00', duration: 60 }],
    ana: [{ time: '11:00', duration: 60 }],
  });
});

test('los bloqueos que tocan el día entran; los de otros días no', () => {
  const bloqueo = (id: string, startDate: string, endDate: string): ScheduleBlock =>
    ({ id, staffId: 'ana', startDate, endDate, startTime: null, endTime: null, reason: '', createdAt: '' });
  const agenda = agendaDelDia(MIERCOLES, especialistasDeAgenda(STAFF), [], [
    bloqueo('vacaciones', '2026-10-13', '2026-10-16'), bloqueo('otra semana', '2026-10-20', '2026-10-21'),
  ]);
  assert.deepEqual(agenda.bloqueos, [{ staff_id: 'ana', start_date: '2026-10-13', end_date: '2026-10-16', start_time: null, end_time: null }]);
});

test('se vuelve a agendar lo mismo, con la misma especialista si todavía lo hace', () => {
  const esp = especialistasDeAgenda(STAFF);
  const hecha = cita(MIERCOLES, 'completed', [['10:00', 'Limpieza facial profunda', 'Anabel De los Santos', 60], ['11:00', 'Lifting de pestañas', 'Anabel De los Santos', 60]]);
  assert.deepEqual(elegidosDeCita(hecha, SERVICIOS, esp), [
    { serviceId: 'limpieza', staffId: 'anabel', nombre: 'Limpieza facial profunda', duracion: 60 },
    // Anabel no tiene pestañas en su lista: queda "cualquiera disponible"
    { serviceId: 'pestanas', staffId: '', nombre: 'Lifting de pestañas', duracion: 60 },
  ]);
});

test('un servicio que ya no está en el catálogo no se ofrece', () => {
  const hecha = cita(MIERCOLES, 'completed', [['10:00', 'HIFU facial', 'Anabel De los Santos', 45]]);
  assert.deepEqual(elegidosDeCita(hecha, SERVICIOS, especialistasDeAgenda(STAFF)), []);
});

test('horas del día: lo ocupado no se ofrece y el servicio tiene que caber entero', () => {
  const esp = especialistasDeAgenda(STAFF);
  const citas = [cita(MIERCOLES, 'confirmed', [['10:00', 'Lifting de pestañas', 'Ana Herrera', 60]])];
  const elegidos = [{ serviceId: 'pestanas', staffId: 'ana', nombre: 'Lifting de pestañas', duracion: 60 }];
  const horas = horasDelDia(elegidos, MIERCOLES, esp, citas, [], ANTES);
  const libre = (h: string) => horas.find((x) => x.hora === h)?.plan !== null;
  assert.equal(libre('09:00'), true); // termina justo a las 10:00
  assert.equal(libre('09:30'), false);
  assert.equal(libre('10:00'), false);
  assert.equal(libre('10:30'), false);
  assert.equal(libre('11:00'), true);
  assert.equal(horas.find((x) => x.hora === '11:00')!.plan![0].staff.name, 'Ana Herrera');
  assert.deepEqual(cuposDelDia(elegidos, MIERCOLES, esp, citas, [], ANTES), { libres: horas.length - 3, total: horas.length });
});

test('el domingo el salón no abre, y hoy pasada la última hora ya no hay nada que ofrecer (no es "lleno")', () => {
  const elegidos = [{ serviceId: 'cejas', staffId: '', nombre: 'Diseño de cejas', duracion: 30 }];
  const esp = especialistasDeAgenda(STAFF);
  assert.deepEqual(cuposDelDia(elegidos, DOMINGO, esp, [], [], ANTES), { libres: 0, total: 0 });
  assert.deepEqual(cuposDelDia(elegidos, MIERCOLES, esp, [], [], { hoy: MIERCOLES, minutos: 19 * 60 }), { libres: 0, total: 0 });
});

test('primer nombre para el resumen, con el título de la doctora', () => {
  assert.equal(primerNombre('Anabel De los Santos'), 'Anabel');
  assert.equal(primerNombre('Dra. Melissa Lara'), 'Dra. Melissa');
  assert.equal(primerNombre(' Ana  Herrera '), 'Ana');
});

test('lo que se guarda: un servicio detrás del otro, con su especialista y su precio', () => {
  const [anabel, ana] = especialistasDeAgenda(STAFF);
  const plan = [
    { serviceId: 'cejas', nombre: 'Diseño de cejas', duracion: 30, staff: anabel },
    { serviceId: 'pestanas', nombre: 'Lifting de pestañas', duracion: 60, staff: ana },
  ];
  assert.deepEqual(lineasDelPlan(plan, '09:30', SERVICIOS), [
    { serviceId: 'cejas', serviceName: 'Diseño de cejas', employee: 'Anabel De los Santos', startTime: '09:30', duration: 30, price: 600 },
    { serviceId: 'pestanas', serviceName: 'Lifting de pestañas', employee: 'Ana Herrera', startTime: '10:00', duration: 60, price: 1500 },
  ]);
});
