import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cambiosDeEquipo, catalogoAgrupado, comoLoHace, conItbis, erroresDelServicio, quienLoHace, usoDeServicios,
} from '../src/pages/admin/negocio/catalogo.ts';
import {
  catalogoDePaquetes, errorDelAbono, erroresDelTipo, filtrarPaquetes, paquetesVendidos, resumenPaquetes,
} from '../src/pages/admin/negocio/paquetes.ts';
import { hoyDe, mesDe } from '../src/pages/admin/negocio/equipo.ts';
import {
  mejoresClientas, moverPeriodo, origenDeCitas, porCategoria, porEspecialista, porHora, rangoDe, resumenDelPeriodo,
  serviciosMasHechos, tituloPeriodo, variacion,
} from '../src/pages/admin/negocio/reportes.ts';
import type { Appointment } from '../src/store/appointmentStore.ts';
import type { ClientPackage, Service, SessionPackage } from '../src/store/serviceStore.ts';
import type { StaffMember } from '../src/store/staffStore.ts';

const HOY = '2026-10-15'; // jueves

const servicio = (id: string, name: string, category: Service['category'], price: number, active = true): Service =>
  ({ id, name, category, description: '', duration: 60, price, taxable: false, hasSession: false, active });
const CATALOGO = [
  servicio('limpieza', 'Limpieza facial', 'facial', 2000),
  servicio('cejas', 'Diseño de cejas', 'belleza', 800),
  servicio('axilas', 'Depilación Láser - Axilas', 'laser', 1500),
  servicio('botox', 'Toxina Botulínica', 'medicina', 9000),
  servicio('viejo', 'Masaje reductor', 'corporal', 1800, false),
];

const persona = (id: string, name: string, role: StaffMember['role'], serviceIds: string[], extra: Partial<StaffMember> = {}): StaffMember => ({
  id, name, role, phone: '', email: null, commissionPct: 10, workingDays: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
  workingStart: '09:00', workingEnd: '18:00', serviceIds, active: true, mostrarEnWeb: false, cargoWeb: null, especialidadesWeb: null,
  createdAt: '', ...extra,
});
const ANA = persona('ana', 'Ana Herrera', 'specialist', ['limpieza', 'cejas']);
const ANABEL = persona('anabel', 'Anabel De los Santos', 'specialist', []);
const SOLO = persona('solo', 'Melissa Lara', 'specialist', ['botox']);
const DUENA = persona('duena', 'Dueña', 'admin', []);
const RECEPCION = persona('rec', 'Recepción', 'receptionist', []);
const EQUIPO = [ANA, ANABEL, SOLO, DUENA, RECEPCION];

let n = 0;
const cita = (date: string, time: string, lineas: [string | null, string, string, number][], status: Appointment['status'] = 'completed', extra: Partial<Appointment> = {}): Appointment => ({
  id: `c${++n}`, client_id: 'yoka', clientName: 'Yokasta Ramírez', clientPhone: '829-555-1074', service: lineas.map((l) => l[1]).join(' + '),
  employee: lineas[0][2], date, time, duration: 60, status, notes: null, source: 'manual', createdAt: '', startedAt: null,
  services: lineas.map(([serviceId, serviceName, employee, price]) => ({ serviceId, serviceName, employee, startTime: time, duration: 60, price })),
  ...extra,
});

test('servicios por categoría, sin tildes y sin los inactivos (si no se piden)', () => {
  const g = catalogoAgrupado(CATALOGO, '', 'todas', false);
  assert.deepEqual(g.map((x) => x.categoria), ['facial', 'laser', 'belleza', 'medicina']);
  assert.equal(catalogoAgrupado(CATALOGO, '', 'todas', true).length, 5);
  assert.deepEqual(catalogoAgrupado(CATALOGO, 'laser', 'todas', false).flatMap((x) => x.servicios.map((s) => s.id)), ['axilas']);
  assert.deepEqual(catalogoAgrupado(CATALOGO, '', 'medicina', false).map((x) => x.titulo), ['Medicina estética']);
});

test('quién lo hace: la que hace todos y la que solo hace este no se tocan desde aquí', () => {
  assert.equal(comoLoHace(ANABEL, 'cejas'), 'todos');
  assert.equal(comoLoHace(SOLO, 'botox'), 'unico');
  assert.equal(comoLoHace(ANA, 'cejas'), 'si');
  assert.equal(comoLoHace(ANA, 'botox'), 'no');
  assert.equal(comoLoHace(DUENA, 'cejas'), 'no');
  assert.equal(comoLoHace(ANA, null), 'no');
  assert.deepEqual(quienLoHace('cejas', EQUIPO).map((m) => m.id), ['ana', 'anabel']);
  // marcar a la dueña y quitar a Ana; a Anabel (hace todos) y a Melissa (solo botox) no se les cambia nada
  assert.deepEqual(cambiosDeEquipo('cejas', EQUIPO, ['duena']), [
    { id: 'ana', serviceIds: ['limpieza'] },
    { id: 'duena', serviceIds: ['cejas'] },
  ]);
  assert.deepEqual(cambiosDeEquipo('botox', EQUIPO, []), []);
  assert.deepEqual(cambiosDeEquipo('cejas', EQUIPO, ['ana']), []);
});

test('cuánto se usa: lo hecho en 30 días y lo agendado, por id o por nombre', () => {
  const citas = [
    cita('2026-10-01', '10:00', [['cejas', 'Diseño de cejas', 'Ana Herrera', 800], [null, 'Limpieza Facial', 'Ana Herrera', 0]]),
    cita('2026-08-01', '10:00', [['cejas', 'Diseño de cejas', 'Ana Herrera', 800]]), // hace más de 30 días
    cita('2026-10-20', '10:00', [['cejas', 'Diseño de cejas', 'Ana Herrera', 800]], 'confirmed'),
    cita('2026-10-20', '11:00', [['cejas', 'Diseño de cejas', 'Ana Herrera', 800]], 'cancelled'),
    { ...cita('2026-10-10', '10:00', [[null, 'x', 'Ana Herrera', 0]]), services: [], service: 'Toxina botulínica' },
  ];
  const uso = usoDeServicios(citas, CATALOGO, HOY);
  assert.deepEqual(uso.get('cejas'), { hechos: 1, agendados: 1 });
  assert.deepEqual(uso.get('limpieza'), { hechos: 1, agendados: 0 });
  assert.deepEqual(uso.get('botox'), { hechos: 1, agendados: 0 });
});

test('al guardar un servicio: nombre sin repetir, duración y precio', () => {
  const bien = { name: 'Peeling', duration: 45, price: 2500 };
  assert.deepEqual(erroresDelServicio(bien, CATALOGO, null), {});
  assert.equal(erroresDelServicio({ ...bien, name: '  diseno  de CEJAS ' }, CATALOGO, null).name, 'Ya hay un servicio con ese nombre');
  assert.deepEqual(erroresDelServicio({ ...bien, name: 'Diseño de cejas' }, CATALOGO, 'cejas'), {});
  assert.deepEqual(Object.keys(erroresDelServicio({ name: ' ', duration: 2, price: -1 }, CATALOGO, null)), ['name', 'duration', 'price']);
  assert.equal(conItbis(1000), 1180);
});

const vendido = (id: string, extra: Partial<ClientPackage> = {}): ClientPackage => ({
  id, clientId: 'yoka', clientName: 'Yokasta Ramírez', packageId: 'tipo1', packageName: 'Limpieza x6', serviceName: 'Limpieza facial',
  totalSessions: 6, usedSessions: 2, purchasedAt: '2026-09-01', notes: '', totalPrice: 9000, amountPaid: 9000, status: 'active', ...extra,
});

test('paquetes vendidos: primero los que hay que agendar, lo que debe y la próxima sesión', () => {
  const lista = paquetesVendidos([
    vendido('agendado', { clientName: 'Ana' }),
    vendido('sinCita', { clientId: 'otra', clientName: 'Zoila', amountPaid: 5000 }),
    vendido('hecho', { usedSessions: 6, purchasedAt: '2026-05-01' }),
    vendido('ultima', { clientId: 'otra2', clientName: 'Bea', usedSessions: 5 }),
    vendido('cancelado', { status: 'cancelled', amountPaid: 0 }),
  ], [cita('2026-10-20', '10:00', [['limpieza', 'Limpieza facial', 'Ana Herrera', 0]], 'confirmed')], HOY);
  assert.deepEqual(lista.map((v) => v.paquete.id), ['ultima', 'sinCita', 'agendado', 'cancelado', 'hecho']);
  const agendado = lista.find((v) => v.paquete.id === 'agendado')!;
  assert.equal(agendado.proxima?.date, '2026-10-20');
  assert.equal(agendado.quedan, 4);
  assert.equal(lista.find((v) => v.paquete.id === 'sinCita')!.saldo, 4000);
  assert.deepEqual(lista.map((v) => v.estado), ['ultima', 'activo', 'activo', 'cancelado', 'completado']);

  assert.deepEqual(filtrarPaquetes(lista, 'sinAgendar', '').map((v) => v.paquete.id), ['ultima', 'sinCita']);
  assert.deepEqual(filtrarPaquetes(lista, 'conSaldo', '').map((v) => v.paquete.id), ['sinCita']); // el cancelado no se cobra
  assert.deepEqual(filtrarPaquetes(lista, 'completados', '').map((v) => v.paquete.id), ['hecho']);
  assert.deepEqual(filtrarPaquetes(lista, 'todos', 'zoila LIMPIEZA').map((v) => v.paquete.id), ['sinCita']);
  assert.deepEqual(resumenPaquetes(lista), { activos: 3, sinAgendar: 2, conSaldo: 1, porCobrar: 4000, completados: 1 });
});

test('catálogo de paquetes: por sesión, ahorro y cuántos se vendieron', () => {
  const tipos: SessionPackage[] = [
    { id: 'tipo1', name: 'Limpieza x6', serviceId: 'limpieza', serviceName: 'Limpieza facial', sessions: 6, price: 9000, active: true },
    { id: 'tipo2', name: 'Axilas x5', serviceId: 'axilas', serviceName: 'Axilas', sessions: 5, price: 8000, active: true },
    { id: 'tipo0', name: 'Antiguo', serviceId: 'nada', serviceName: '', sessions: 4, price: 4000, active: false },
  ];
  const c = catalogoDePaquetes(tipos, CATALOGO, [vendido('a'), vendido('b', { usedSessions: 6 })]);
  assert.deepEqual(c.map((t) => [t.tipo.id, t.porSesion, t.ahorro, t.vendidos, t.activos]), [
    ['tipo2', 1600, null, 0, 0], // sale más caro que suelto: no se ahorra
    ['tipo1', 1500, 25, 2, 1],
    ['tipo0', 1000, null, 0, 0],
  ]);
});

test('abonos y tipos de paquete: lo que se revisa', () => {
  assert.equal(errorDelAbono(0, 4000), 'Escribe cuánto abona');
  assert.match(errorDelAbono(5000, 4000)!, /No puede pasar de lo que debe/);
  assert.equal(errorDelAbono(4000, 4000), null);
  const tipos: SessionPackage[] = [{ id: 't', name: 'Láser x5', serviceId: 'axilas', serviceName: '', sessions: 5, price: 1, active: true }];
  assert.deepEqual(erroresDelTipo({ name: 'laser x5', serviceId: '', sessions: 1, price: -2 }, tipos, null), {
    name: 'Ya hay un paquete con ese nombre', serviceId: 'Elige el servicio', sessions: 'Entre 2 y 50 sesiones', price: 'Escribe un precio válido',
  });
  assert.deepEqual(erroresDelTipo({ name: 'Láser x5', serviceId: 'axilas', sessions: 5, price: 0 }, tipos, 't'), {});
});

test('el periodo: rango, moverse y su título', () => {
  assert.deepEqual(rangoDe('semana', HOY), { desde: '2026-10-12', hasta: '2026-10-18' });
  assert.deepEqual(rangoDe('mes', '2026-02-10'), { desde: '2026-02-01', hasta: '2026-02-28' });
  assert.deepEqual(rangoDe('anio', HOY), { desde: '2026-01-01', hasta: '2026-12-31' });
  assert.equal(moverPeriodo('mes', '2026-01-20', -1), '2025-12-01');
  assert.equal(moverPeriodo('mes', '2026-12-05', 1), '2027-01-01');
  assert.equal(moverPeriodo('semana', HOY, -1), '2026-10-05');
  assert.equal(moverPeriodo('dia', HOY, 1), '2026-10-16');
  assert.equal(moverPeriodo('anio', HOY, -1), '2025-01-01');
  assert.equal(tituloPeriodo('dia', HOY), 'Jueves 15 de octubre de 2026');
  assert.equal(tituloPeriodo('semana', HOY), '12 – 18 de octubre de 2026');
  assert.equal(tituloPeriodo('semana', '2026-10-01'), '28 sep – 4 oct 2026');
  assert.equal(tituloPeriodo('mes', HOY), 'Octubre de 2026');
  assert.equal(tituloPeriodo('anio', HOY), '2026');
});

test('el resumen del periodo: cobrado, ticket, quiénes volvieron; y para una especialista, solo lo suyo', () => {
  const citas = [
    cita('2026-10-02', '10:00', [['limpieza', 'Limpieza facial', 'Ana Herrera', 0], ['cejas', 'Diseño de cejas', 'Anabel De los Santos', 900]]),
    cita('2026-10-05', '15:00', [['axilas', 'Depilación Láser - Axilas', 'Anabel De los Santos', 1500]], 'completed', { client_id: 'nueva', clientName: 'Nueva' }),
    cita('2026-10-06', '11:00', [['cejas', 'Diseño de cejas', 'Ana Herrera', 800]], 'no_show', { client_id: 'otra' }),
    cita('2026-10-07', '11:00', [['cejas', 'Diseño de cejas', 'Ana Herrera', 800]], 'cancelled'),
    cita('2026-09-10', '10:00', [['cejas', 'Diseño de cejas', 'Ana Herrera', 800]]), // ya había venido antes
    cita('2026-10-09', '10:30', [[null, 'Toxina Botulínica', 'Melissa Lara', 0]], 'completed', { source: 'online', client_id: null, clientPhone: '809 555 0000', clientName: 'Sin ficha' }),
  ];
  const r = rangoDe('mes', HOY);
  assert.deepEqual(resumenDelPeriodo(citas, CATALOGO, r), {
    completadas: 3, noVino: 1, canceladas: 1, ingresos: 2000 + 900 + 1500 + 9000, ticket: Math.round(13400 / 3),
    atendidas: 3, primeraVez: 2, volvieron: 1,
  });
  const deAna = resumenDelPeriodo(citas, CATALOGO, r, 'ana herrera');
  assert.deepEqual([deAna.completadas, deAna.ingresos, deAna.noVino, deAna.canceladas], [1, 2000, 1, 1]);

  const rend = porEspecialista(citas, CATALOGO, EQUIPO, r);
  assert.deepEqual(rend.map((x) => [x.miembro.id, x.citas, x.ingresos, x.comision]), [
    ['solo', 1, 9000, 900], ['anabel', 2, 2400, 240], ['ana', 1, 2000, 200],
  ]);
  assert.deepEqual(porCategoria(citas, CATALOGO, r).map((p) => [p.nombre, p.cantidad, p.monto]), [
    ['Medicina estética', 1, 9000], ['Facial', 1, 2000], ['Láser', 1, 1500], ['Cejas, pestañas y maquillaje', 1, 900],
  ]);
  assert.deepEqual(serviciosMasHechos(citas, CATALOGO, r, null, 1).map((p) => p.nombre), ['Toxina Botulínica']);
  // la cita de dos servicios cuenta entera para la clienta
  assert.deepEqual(mejoresClientas(citas, CATALOGO, r).map((p) => [p.nombre, p.cantidad, p.monto]), [
    ['Sin ficha', 1, 9000], ['Yokasta Ramírez', 1, 2900], ['Nueva', 1, 1500],
  ]);
  const horas = porHora(citas, CATALOGO, r);
  assert.equal(horas[0].hora, 9);
  assert.equal(horas.at(-1)!.hora, 18);
  assert.equal(horas.find((h) => h.hora === 10)!.cantidad, 3);
  assert.deepEqual(origenDeCitas(citas, r), { enLinea: 1, enSalon: 2 });
  assert.equal(variacion(120, 100), 20);
  assert.equal(variacion(5, 0), null);
});

test('equipo: qué hace hoy y cómo va su mes', () => {
  const citas = [
    cita(HOY, '09:00', [['cejas', 'Diseño de cejas', 'Ana Herrera', 800]], 'in_progress'),
    cita(HOY, '11:00', [['limpieza', 'Limpieza facial', 'Ana Herrera', 2000]], 'pending'),
    cita(HOY, '12:00', [['limpieza', 'Limpieza facial', 'Ana Herrera', 2000]], 'cancelled'),
    cita('2026-10-02', '10:00', [['limpieza', 'Limpieza facial', 'Ana Herrera', 2000]]),
    cita('2026-10-30', '10:00', [['cejas', 'Diseño de cejas', 'Ana Herrera', 800]], 'confirmed'),
  ];
  const h = hoyDe(ANA, citas, HOY);
  assert.deepEqual([h.trabaja, h.servicios, h.enCabina?.servicio, h.siguiente?.servicio], [true, 2, 'Diseño de cejas', 'Limpieza facial']);
  assert.equal(hoyDe({ ...ANA, workingDays: ['lunes'] }, citas, HOY).trabaja, false);
  assert.deepEqual(mesDe(ANA, citas, CATALOGO, HOY), { atendidas: 1, ingresos: 2000, comision: 200, proximos: 2 });
});
