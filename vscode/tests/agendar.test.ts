import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buscarServicios, conEspecialista, conHoraPedida, elegidosDelPaquete, estadoAlGuardar, planALas, sesionDelPaquete, sinLaCita,
} from '../src/pages/admin/agendar/reglas.ts';
import { elegidosDeCita, especialistasDeAgenda, horasDelDia } from '../src/pages/admin/citas/proximaCita.ts';
import type { Appointment } from '../src/store/appointmentStore.ts';
import type { ClientPackage, Service, SessionPackage } from '../src/store/serviceStore.ts';
import type { StaffMember } from '../src/store/staffStore.ts';

const JUEVES = '2026-10-15';
const AHORA = { hoy: '2026-10-13', minutos: 10 * 60 };

const persona = (id: string, name: string, serviceIds: string[]): StaffMember => ({
  id, name, role: 'specialist', phone: '', email: null, commissionPct: 0,
  workingDays: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'], workingStart: '09:00', workingEnd: '18:00',
  serviceIds, active: true, mostrarEnWeb: false, cargoWeb: null, especialidadesWeb: null, createdAt: '',
});
const ESP = especialistasDeAgenda([
  persona('anabel', 'Anabel De los Santos', ['limpieza', 'cejas']),
  persona('ana', 'Ana Herrera', ['limpieza', 'pestanas']),
]);

const servicio = (id: string, name: string, duration: number): Service =>
  ({ id, name, category: 'facial', description: '', duration, price: 1500, taxable: false, hasSession: true, active: true });
const SERVICIOS = [servicio('limpieza', 'Limpieza facial', 60), servicio('cejas', 'Diseño de cejas', 30), servicio('pestanas', 'Pestañas', 90)];

let n = 0;
const cita = (extra: Partial<Appointment> & { lineas?: [string, string, string, number][] }): Appointment => {
  const { lineas = [['limpieza', 'Limpieza facial', 'Ana Herrera', 60]], ...resto } = extra;
  const time = resto.time ?? '10:00';
  return {
    id: `a${++n}`, client_id: 'c1', clientName: 'Yokasta', clientPhone: '829-555-1000', service: lineas.map((l) => l[1]).join(' + '),
    employee: lineas[0][2], date: JUEVES, time, duration: lineas.reduce((t, l) => t + l[3], 0), status: 'confirmed', notes: null,
    source: 'manual', createdAt: '', startedAt: null,
    services: lineas.map(([serviceId, serviceName, employee, duration]) => ({ serviceId, serviceName, employee, startTime: time, duration, price: 0 })),
    ...resto,
  };
};

const paquete = (extra: Partial<ClientPackage> = {}): ClientPackage => ({
  id: 'p1', clientId: 'c1', clientName: 'Yokasta', packageId: 'tipo1', packageName: 'Limpieza x6', serviceName: 'Limpieza facial',
  totalSessions: 6, usedSessions: 2, purchasedAt: '', notes: '', totalPrice: 0, amountPaid: 0, status: 'active', ...extra,
});
const TIPOS: SessionPackage[] = [{ id: 'tipo1', name: 'Limpieza x6', serviceId: 'limpieza', serviceName: 'Limpieza facial', sessions: 6, price: 0, active: true }];

test('el estado al guardar: en persona confirmada, por teléfono por confirmar; al cambiarla no se toca', () => {
  assert.equal(estadoAlGuardar({ modo: 'nueva' }), 'pending');
  assert.equal(estadoAlGuardar({ modo: 'nueva', enPersona: true }), 'confirmed');
  assert.equal(estadoAlGuardar({ modo: 'proxima', cita: cita({}) }), 'confirmed');
  assert.equal(estadoAlGuardar({ modo: 'paquete', paquete: paquete() }), 'pending');
  assert.equal(estadoAlGuardar({ modo: 'reprogramar', cita: cita({}) }), null);
});

test('al cambiar una cita se queda con lo que duraba; la próxima, con lo del catálogo', () => {
  const larga = cita({ lineas: [['limpieza', 'Limpieza facial', 'Ana Herrera', 75]] });
  assert.equal(elegidosDeCita(larga, SERVICIOS, ESP, true)[0].duracion, 75);
  assert.equal(elegidosDeCita(larga, SERVICIOS, ESP)[0].duracion, 60);
  assert.equal(elegidosDeCita(larga, SERVICIOS, ESP, true)[0].staffId, 'ana');
});

test('al moverla, su propio hueco cuenta como libre', () => {
  const suya = cita({ time: '10:00' });
  const elegidos = elegidosDeCita(suya, SERVICIOS, ESP, true);
  // con Ana pedida y la cita en su agenda, a las 10:00 no cabe; sin ella, sí
  assert.equal(planALas(elegidos, JUEVES, '10:00', ESP, [suya], []), null);
  assert.equal(planALas(elegidos, JUEVES, '10:00', ESP, sinLaCita([suya], suya.id), [])![0].staff.id, 'ana');
  const horas = horasDelDia(elegidos, JUEVES, ESP, sinLaCita([suya], suya.id), [], AHORA);
  assert.ok(horas.find((h) => h.hora === '10:00')?.plan);
});

test('la sesión del paquete: las usadas, más las agendadas, más esta', () => {
  const citas = [
    cita({ date: '2026-10-20', status: 'confirmed' }),
    cita({ date: '2026-10-27', status: 'pending', lineas: [['limpieza', 'Paquete: Limpieza facial', 'Ana Herrera', 60]] }),
    cita({ date: '2026-10-01', status: 'completed' }), // ya pasó: está en las usadas
    cita({ date: '2026-10-22', status: 'cancelled' }),
    cita({ date: '2026-10-22', lineas: [['cejas', 'Diseño de cejas', 'Anabel De los Santos', 30]] }),
    cita({ date: '2026-10-22', client_id: 'otra' }),
    cita({ date: '2026-10-13', status: 'in_progress' }), // la de hoy, en curso: se descuenta al completarla
  ];
  const s = sesionDelPaquete(paquete(), citas, AHORA.hoy);
  assert.equal(s.numero, 6);
  assert.deepEqual(s.agendadas.map((c) => c.date), ['2026-10-13', '2026-10-20', '2026-10-27']);
  // 4 usadas + 3 por descontar de 6: ya tiene todas
  assert.equal(sesionDelPaquete(paquete({ usedSessions: 4 }), citas, AHORA.hoy).numero, 8);
});

test('el paquete trae su servicio, con la especialista de la última sesión si todavía lo hace', () => {
  const citas = [
    cita({ date: '2026-09-01', status: 'completed', lineas: [['limpieza', 'Limpieza facial', 'Ana Herrera', 60]] }),
    cita({ date: '2026-10-01', status: 'completed', lineas: [['limpieza', 'Limpieza facial', 'Anabel De los Santos', 60]] }),
    cita({ date: '2026-10-20', status: 'confirmed', lineas: [['limpieza', 'Limpieza facial', 'Ana Herrera', 60]] }),
  ];
  assert.deepEqual(elegidosDelPaquete(paquete(), TIPOS, SERVICIOS, ESP, citas),
    [{ serviceId: 'limpieza', staffId: 'anabel', nombre: 'Limpieza facial', duracion: 60 }]);
  // sin historial, "cualquiera"; sin el tipo, por el nombre del servicio
  assert.equal(elegidosDelPaquete(paquete({ packageId: 'x' }), TIPOS, SERVICIOS, ESP, [])[0].staffId, '');
  assert.deepEqual(elegidosDelPaquete(paquete({ packageId: 'x', serviceName: 'Masaje' }), TIPOS, SERVICIOS, ESP, []), []);
});

test('el hueco de su columna en Hoy: ella hace lo que sabe hacer', () => {
  const cejas = { serviceId: 'cejas', staffId: '', nombre: 'Diseño de cejas', duracion: 30 };
  assert.equal(conEspecialista(cejas, 'Anabel De los Santos', ESP).staffId, 'anabel');
  assert.equal(conEspecialista(cejas, 'Ana Herrera', ESP).staffId, '');
  assert.equal(conEspecialista({ ...cejas, staffId: 'x' }, 'Anabel De los Santos', ESP).staffId, 'x');
});

test('la hora pedida que no cae en la media hora entra en su lugar', () => {
  const horas = [{ hora: '10:30', plan: null }, { hora: '11:00', plan: null }];
  assert.deepEqual(conHoraPedida(horas, '10:45', []).map((h) => h.hora), ['10:30', '10:45', '11:00']);
  assert.equal(conHoraPedida(horas, '11:00', []), horas);
  assert.equal(conHoraPedida(horas, '', []), horas);
});

test('buscar servicio: sin tildes, por palabras, por categoría; primero los que empiezan así', () => {
  const lista = [
    { name: 'Depilación Láser - Axilas', category: 'laser' as const },
    { name: 'Depilación Láser - Piernas', category: 'laser' as const },
    { name: 'Diseño de cejas', category: 'belleza' as const },
    { name: 'Laminado de cejas', category: 'belleza' as const },
    { name: 'Cejas en henna', category: 'belleza' as const },
    { name: 'Lifting de pestañas', category: 'belleza' as const },
    { name: 'Toxina Botulínica', category: 'medicina' as const },
  ];
  const nombres = (q: string) => buscarServicios(lista, q).map((s) => s.name);
  assert.deepEqual(nombres('cejas'), ['Cejas en henna', 'Diseño de cejas', 'Laminado de cejas']);
  assert.deepEqual(nombres('laser axilas'), ['Depilación Láser - Axilas']);
  assert.deepEqual(nombres('PESTANAS'), ['Lifting de pestañas']);
  assert.deepEqual(nombres('medicina'), ['Toxina Botulínica']);
  assert.deepEqual(nombres('masaje'), []);
  // sin texto: todos, por categoría y nombre
  assert.deepEqual(nombres('  ').slice(0, 3), ['Cejas en henna', 'Diseño de cejas', 'Laminado de cejas']);
  assert.equal(nombres('').length, lista.length);
});
