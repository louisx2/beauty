import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buscarCitas, citasPorDia, cuadriculaDeSemana, cuadriculaDelDia, diasDeSemana, enCarriles, horaDelToque, resumenDelMes,
  tituloDeRango,
} from '../src/pages/admin/agenda/reglas.ts';
import type { Appointment } from '../src/store/appointmentStore.ts';
import type { ScheduleBlock } from '../src/store/blockStore.ts';
import type { StaffMember } from '../src/store/staffStore.ts';

const LUNES = '2026-10-12';
const AHORA = { hoy: '2026-10-15', minutos: 10 * 60 + 50 }; // jueves 10:50

const persona = (id: string, name: string, dias: string[], serviceIds = ['x']): StaffMember => ({
  id, name, role: 'specialist', phone: '', email: null, commissionPct: 0, workingDays: dias, workingStart: '09:00', workingEnd: '18:00',
  serviceIds, active: true, mostrarEnWeb: false, cargoWeb: null, especialidadesWeb: null, createdAt: '',
});
const TODOS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const STAFF = [persona('anabel', 'Anabel De los Santos', TODOS), persona('ana', 'Ana Herrera', TODOS), persona('melissa', 'Dra. Melissa Lara', ['martes', 'jueves'])];

let n = 0;
const cita = (date: string, time: string, empleada: string, minutos: number, status: Appointment['status'] = 'confirmed', clientName = 'María Pérez', service = 'Limpieza facial'): Appointment => ({
  id: `a${++n}`, client_id: 'c1', clientName, clientPhone: '829-555-1000', service, employee: empleada, date, time, duration: minutos, status,
  notes: null, source: 'manual', createdAt: '', startedAt: null,
  services: [{ serviceId: 'x', serviceName: service, employee: empleada, startTime: time, duration: minutos, price: 0 }],
});

test('carriles: las encimadas se reparten el ancho; las sueltas usan todo', () => {
  const b = (inicio: number, fin: number) => ({ inicio, fin });
  const r = enCarriles([b(540, 600), b(570, 630), b(600, 660), b(700, 730)]);
  const de = (i: number) => r.find((x) => x.inicio === i)!;
  assert.deepEqual([de(540).carril, de(570).carril, de(600).carril], [0, 1, 0]);
  assert.equal(de(540).carriles, 2);
  assert.equal(de(600).carriles, 2);
  assert.deepEqual([de(700).carril, de(700).carriles], [0, 1]);
});

test('la semana: de lunes a sábado; el domingo solo si alguien tiene cita', () => {
  assert.equal(diasDeSemana(LUNES, citasPorDia([])).length, 6);
  assert.equal(diasDeSemana(LUNES, citasPorDia([cita('2026-10-18', '10:00', 'Ana Herrera', 60)])).length, 7);
  assert.equal(diasDeSemana(LUNES, citasPorDia([cita('2026-10-18', '10:00', 'Ana Herrera', 60, 'cancelled')])).length, 6);
});

test('semana de una especialista: sus citas, sus huecos (nada en el pasado) y los días que no trabaja', () => {
  const citas = [cita('2026-10-13', '10:00', 'Dra. Melissa Lara', 60), cita('2026-10-15', '14:00', 'Dra. Melissa Lara', 30), cita('2026-10-15', '14:00', 'Ana Herrera', 30)];
  const s = cuadriculaDeSemana(LUNES, STAFF, citasPorDia(citas), [], AHORA, 'melissa');
  const col = (f: string) => s.columnas.find((c) => c.fecha === f)!;
  assert.equal(col('2026-10-12').trabaja, false);
  assert.equal(col('2026-10-13').citas, 1);
  assert.deepEqual(col('2026-10-13').libres, []); // ya pasó
  assert.equal(col('2026-10-15').citas, 1);
  // hoy, desde las 11:00 (lo que ya pasó no), con la cita de las 2 en medio
  assert.deepEqual(col('2026-10-15').libres, [{ inicio: 660, fin: 840 }, { inicio: 870, fin: 1080 }]);
  assert.equal(col('2026-10-15').empleada, 'Dra. Melissa Lara');
});

test('semana de todo el salón: las citas de todas, encimadas lado a lado, y los bloqueos del salón', () => {
  const citas = [cita('2026-10-16', '14:00', 'Dra. Melissa Lara', 30), cita('2026-10-16', '14:00', 'Ana Herrera', 60), cita('2026-10-16', '16:00', 'Ana Herrera', 30, 'cancelled')];
  const feriado: ScheduleBlock = { id: 'f', staffId: null, startDate: '2026-10-17', endDate: '2026-10-17', startTime: null, endTime: null, reason: 'Feriado', createdAt: '' };
  const almuerzo: ScheduleBlock = { id: 'l', staffId: 'ana', startDate: '2026-10-16', endDate: '2026-10-16', startTime: '12:30', endTime: '13:30', reason: 'Almuerzo', createdAt: '' };
  const s = cuadriculaDeSemana(LUNES, STAFF, citasPorDia(citas), [feriado, almuerzo], AHORA, null);
  const vie = s.columnas.find((c) => c.fecha === '2026-10-16')!;
  assert.equal(vie.citas, 2); // la cancelada no ocupa
  assert.deepEqual(vie.bloques.map((b) => b.carriles), [2, 2]);
  assert.deepEqual(vie.bloqueos, []); // el almuerzo de Ana es solo de ella
  assert.equal(vie.empleada, null);
  const sab = s.columnas.find((c) => c.fecha === '2026-10-17')!;
  assert.deepEqual(sab.bloqueos.map((b) => b.motivo), ['Feriado']);
});

test('el día: una columna por especialista, o solo la elegida', () => {
  const citas = [cita('2026-10-16', '10:00', 'Ana Herrera', 60)];
  const d = cuadriculaDelDia('2026-10-16', STAFF, citasPorDia(citas), [], AHORA, null);
  assert.deepEqual(d.columnas.map((c) => c.clave), ['anabel', 'ana', 'melissa']);
  assert.equal(d.columnas[2].trabaja, false); // Melissa no trabaja los viernes
  assert.deepEqual(cuadriculaDelDia('2026-10-16', STAFF, citasPorDia(citas), [], AHORA, 'ana').columnas[0].libres,
    [{ inicio: 540, fin: 600 }, { inicio: 660, fin: 1080 }]);
});

test('el mes: citas, por confirmar y tiempo libre de cada día', () => {
  const citas = [cita('2026-10-16', '10:00', 'Ana Herrera', 60, 'pending'), cita('2026-10-16', '11:00', 'Anabel De los Santos', 60), cita('2026-10-16', '12:00', 'Anabel De los Santos', 60, 'no_show')];
  const mes = resumenDelMes(['2026-10-16', '2026-10-18', '2026-10-14'], STAFF, citasPorDia(citas), [], AHORA, null);
  const vie = mes.get('2026-10-16')!;
  assert.deepEqual([vie.citas, vie.porConfirmar, vie.abierto], [2, 1, true]);
  assert.equal(vie.minutosTrabajo, 2 * 9 * 60); // Anabel y Ana, de 9 a 6
  assert.equal(vie.minutosLibres, 2 * 9 * 60 - 120);
  assert.equal(mes.get('2026-10-18')!.abierto, false); // domingo
  assert.equal(mes.get('2026-10-14')!.minutosLibres, 0); // ya pasó
  assert.equal(resumenDelMes(['2026-10-16'], STAFF, citasPorDia(citas), [], AHORA, 'ana').get('2026-10-16')!.citas, 1);
});

test('buscar citas: las por venir primero, después las pasadas, la más reciente arriba', () => {
  const citas = [
    cita('2026-09-01', '10:00', 'Ana Herrera', 60, 'completed', 'María Pérez'),
    cita('2026-10-01', '10:00', 'Ana Herrera', 60, 'completed', 'María Pérez'),
    cita('2026-10-20', '10:00', 'Ana Herrera', 60, 'confirmed', 'María Pérez'),
    cita('2026-10-16', '10:00', 'Ana Herrera', 60, 'pending', 'María Pérez'),
    cita('2026-10-16', '10:00', 'Ana Herrera', 60, 'pending', 'Laura Méndez', 'Diseño de cejas'),
  ];
  assert.deepEqual(buscarCitas(citas, 'maria perez', AHORA.hoy).map((c) => c.date), ['2026-10-16', '2026-10-20', '2026-10-01', '2026-09-01']);
  assert.deepEqual(buscarCitas(citas, 'cejas', AHORA.hoy).map((c) => c.clientName), ['Laura Méndez']);
  assert.equal(buscarCitas(citas, '555-10', AHORA.hoy).length, 5);
  assert.deepEqual(buscarCitas(citas, ' ', AHORA.hoy), []);
});

test('títulos del rango y el toque en una columna vacía', () => {
  assert.equal(tituloDeRango('dia', '2026-10-15'), 'Jueves 15 de octubre');
  assert.equal(tituloDeRango('semana', LUNES, ['2026-10-12', '2026-10-17']), '12 – 17 de octubre');
  assert.equal(tituloDeRango('semana', '2026-09-28', ['2026-09-28', '2026-10-03']), '28 sep – 3 oct');
  assert.equal(tituloDeRango('mes', '2026-10-15'), 'Octubre 2026');
  assert.equal(horaDelToque(10 * 60 + 47, 9 * 60, 18 * 60), 10 * 60 + 30);
  assert.equal(horaDelToque(8 * 60, 9 * 60, 18 * 60), 9 * 60);
  assert.equal(horaDelToque(18 * 60 - 5, 9 * 60, 18 * 60), 17 * 60 + 30);
});

test('una fecha con hora o rota no rompe la pantalla', async () => {
  const { fechaCorta, diaCorto } = await import('../src/pages/admin/agenda/reglas.ts');
  assert.equal(fechaCorta('2026-10-15T14:23:11.123+00:00'), 'Jue 15 oct');
  assert.equal(fechaCorta('basura'), '');
  assert.equal(diaCorto(''), '');
});
