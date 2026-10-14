import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  citasDeClienta, coincide, datosQueFaltan, errorDeTelefono, historialCompleto, iniciales, listaDeClientas, paquetesDeClienta,
  proximasCitas, resumenDeClienta, resumenesPorClienta,
} from '../src/pages/admin/clientes/ficha.ts';
import type { Appointment } from '../src/store/appointmentStore.ts';
import type { Client } from '../src/store/clientStore.ts';
import type { ClientPackage } from '../src/store/serviceStore.ts';
import type { EntradaHistorial } from '../src/lib/historialAnterior.ts';

const HOY = '2026-10-15';

const clienta = (id: string, name: string, phone: string, extra: Partial<Client> = {}): Client =>
  ({ id, name, phone, email: null, cedula: null, skin_type: null, allergies: null, notes: null, source: 'manual', created_at: '2026-01-01', ...extra });

let n = 0;
const cita = (client_id: string | null, date: string, status: Appointment['status'], extra: Partial<Appointment> = {}): Appointment => ({
  id: `a${++n}`, client_id, clientName: 'X', clientPhone: '', service: 'Limpieza facial', employee: 'Ana', date, time: '10:00',
  duration: 60, status, notes: null, source: 'manual', createdAt: '', startedAt: null, services: [], ...extra,
});

test('las citas de la clienta: las de su ficha y las sin ficha con su teléfono', () => {
  const yo = clienta('c1', 'Yokasta', '+1 (829) 555-1074');
  const citas = [
    cita('c1', '2026-09-01', 'completed'),
    cita(null, '2026-09-10', 'completed', { clientPhone: '829-555-1074' }),
    cita(null, '2026-09-11', 'completed', { clientPhone: '809-000-0000' }),
    cita('c2', '2026-09-12', 'completed', { clientPhone: '829-555-1074' }), // es de otra ficha
  ];
  assert.deepEqual(citasDeClienta(citas, yo).map((c) => c.date), ['2026-09-01', '2026-09-10']);
});

test('resumen: visitas, no vino, la última, la próxima y si está en sala', () => {
  const citas = [
    cita('c1', '2026-08-01', 'completed'),
    cita('c1', '2026-09-22', 'completed', { time: '15:00' }),
    cita('c1', '2026-09-01', 'no_show'),
    cita('c1', '2026-10-01', 'cancelled'),
    cita('c1', '2026-10-30', 'pending'),
    cita('c1', '2026-10-20', 'confirmed'),
    cita('c1', '2026-10-10', 'pending'), // ya pasó sin marcar: no es la próxima
    cita('c1', HOY, 'in_progress'),
  ];
  const r = resumenDeClienta(citas, HOY);
  assert.equal(r.visitas, 2);
  assert.equal(r.noVino, 1);
  assert.equal(r.ultima?.date, '2026-09-22');
  assert.equal(r.proxima?.date, '2026-10-20');
  assert.equal(r.enSala?.date, HOY);
  assert.deepEqual(proximasCitas(citas, HOY).map((c) => c.date), ['2026-10-20', '2026-10-30']);
  assert.equal(resumenesPorClienta([...citas, cita(null, HOY, 'pending')], HOY).get('c1')?.visitas, 2);
});

test('buscar sin tildes, por palabras, teléfono, cédula o correo', () => {
  const c = clienta('c1', 'María José Báez', '829-555-1074', { cedula: '001-1234567-8', email: 'maria@correo.com' });
  for (const q of ['maria', 'BAEZ jose', '555-10', '1234567', 'MARIA@correo', '  ']) assert.ok(coincide(c, q), q);
  for (const q of ['mariela', '99']) assert.ok(!coincide(c, q), q);
});

test('la lista: filtros y orden', () => {
  const clientas = [
    clienta('c1', 'Zoila', '1', { created_at: '2026-01-01' }),
    clienta('c2', 'Ana', '2', { created_at: '2026-03-01', allergies: 'Ácido salicílico' }),
    clienta('c3', 'Bea', '3', { created_at: '2026-02-01' }),
  ];
  const citas = [cita('c1', '2026-09-01', 'completed'), cita('c3', '2026-10-01', 'completed'), cita('c3', '2026-10-20', 'confirmed')];
  const res = resumenesPorClienta(citas, HOY);
  const ids = (l: Client[]) => l.map((c) => c.id);
  assert.deepEqual(ids(listaDeClientas(clientas, '', 'todas', 'recientes', res, new Set())), ['c2', 'c3', 'c1']);
  assert.deepEqual(ids(listaDeClientas(clientas, '', 'todas', 'nombre', res, new Set())), ['c2', 'c3', 'c1']);
  // por última visita; sin visitas al final
  assert.deepEqual(ids(listaDeClientas(clientas, '', 'todas', 'visita', res, new Set())), ['c3', 'c1', 'c2']);
  assert.deepEqual(ids(listaDeClientas(clientas, '', 'cita', 'nombre', res, new Set())), ['c3']);
  assert.deepEqual(ids(listaDeClientas(clientas, '', 'paquete', 'nombre', res, new Set(['c1']))), ['c1']);
  assert.deepEqual(ids(listaDeClientas(clientas, '', 'alergia', 'nombre', res, new Set())), ['c2']);
  assert.deepEqual(ids(listaDeClientas(clientas, 'zo', 'todas', 'nombre', res, new Set())), ['c1']);
});

test('sus paquetes: los activos primero, con lo que le queda y lo que falta pagar', () => {
  const p = (id: string, used: number, total: number, precio: number, pagado: number, status: ClientPackage['status'] = 'active', purchasedAt = '2026-05-01'): ClientPackage => ({
    id, clientId: 'c1', clientName: '', packageId: 'x', packageName: id, serviceName: 'Láser', totalSessions: total, usedSessions: used,
    purchasedAt, notes: '', totalPrice: precio, amountPaid: pagado, status,
  });
  const lista = paquetesDeClienta([p('viejo', 6, 6, 9000, 9000, 'completed'), p('nuevo', 4, 6, 9000, 6500), { ...p('otra', 1, 6, 0, 0), clientId: 'c2' }], 'c1');
  assert.deepEqual(lista.map((x) => [x.paquete.id, x.quedan, x.saldo, x.activo]), [['nuevo', 2, 2500, true], ['viejo', 0, 0, false]]);
});

test('el historial completo: lo del sistema y lo de antes, lo más reciente primero; sin fecha al final', () => {
  const antes = (id: string, fecha: string | null): EntradaHistorial => ({ id, clientId: 'c1', fecha, servicio: 'HIFU', especialista: null, notas: null, creado: '' });
  const citas = [cita('c1', '2026-09-22', 'completed'), cita('c1', '2026-10-20', 'confirmed'), cita('c1', HOY, 'in_progress'), cita('c1', '2026-09-01', 'no_show')];
  const h = historialCompleto(citas, [antes('x', null), antes('y', '2025-06-14')], HOY);
  assert.deepEqual(h.map((r) => (r.tipo === 'cita' ? r.cita.date : `antes:${r.entrada.fecha}`)),
    [HOY, '2026-09-22', '2026-09-01', 'antes:2025-06-14', 'antes:null']);
});

test('iniciales', () => {
  assert.equal(iniciales('yokasta  ramírez peña'), 'YR');
  assert.equal(iniciales('Ana'), 'A');
});

test('fichas incompletas: cuántas no tienen teléfono, cumpleaños o dirección', () => {
  const clientas = [
    clienta('c1', 'Zoila', '829-555-1074', { birthday: '1904-03-21', address: 'Calle Duvergé #83' }),
    clienta('c2', 'Ana', ''),
    clienta('c3', 'Bea', '555-10', { address: '   ' }), // un teléfono a medias no sirve para escribirle
  ];
  assert.deepEqual(datosQueFaltan(clientas), { telefono: 2, cumple: 2, direccion: 2 });
  assert.deepEqual(datosQueFaltan([]), { telefono: 0, cumple: 0, direccion: 0 });
});

test('la lista: las que no tienen teléfono, cumpleaños o dirección', () => {
  const clientas = [
    clienta('c1', 'Zoila', '829-555-1074', { birthday: '1990-03-21', address: 'Ocoa' }),
    clienta('c2', 'Ana', '', { address: 'Ocoa' }),
    clienta('c3', 'Bea', '809-555-0000'),
  ];
  const ids = (l: Client[]) => l.map((c) => c.id);
  const res = resumenesPorClienta([], HOY);
  assert.deepEqual(ids(listaDeClientas(clientas, '', 'sin-telefono', 'nombre', res, new Set())), ['c2']);
  assert.deepEqual(ids(listaDeClientas(clientas, '', 'sin-cumple', 'nombre', res, new Set())), ['c2', 'c3']);
  assert.deepEqual(ids(listaDeClientas(clientas, '', 'sin-direccion', 'nombre', res, new Set())), ['c3']);
});

test('el teléfono: obligatorio al crearla; la que llegó sin teléfono se puede editar sin él', () => {
  assert.equal(errorDeTelefono('829-555-1074', null), undefined);
  assert.equal(errorDeTelefono('', null), 'Teléfono de 10 dígitos');
  assert.equal(errorDeTelefono('829-55', null), 'Teléfono de 10 dígitos');
  // ya tenía teléfono: no se le puede borrar
  assert.equal(errorDeTelefono('', '829-555-1074'), 'Teléfono de 10 dígitos');
  // vino del Excel sin teléfono: se guardan sus otros datos aunque siga sin él
  assert.equal(errorDeTelefono('', ''), undefined);
  assert.equal(errorDeTelefono('829-5', ''), 'Teléfono de 10 dígitos');
});
