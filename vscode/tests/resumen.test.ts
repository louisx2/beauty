import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  duracionTexto, fechaLarga, fechaTitulo, lineasResumen, mensajeWhatsApp, rangoHoras, textoBarra,
} from '../src/site/reservar/resumen.ts';
import { formatoTelefono, numeroWhatsApp, validarDatos } from '../src/site/reservar/datos.ts';
import { repartirDesde, type Elegido, type Especialista } from '../src/site/reservar/disponibilidad.ts';

const L_S = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const persona = (id: string, name: string, service_ids: string[]): Especialista => ({
  id, name, working_days: L_S, working_start: '09:00:00', working_end: '18:00:00', service_ids,
});
const STAFF = [persona('ana', 'Ana', ['s1']), persona('bea', 'Bea', ['s2'])];
const limpieza: Elegido = { serviceId: 's1', staffId: '', nombre: 'Limpieza', duracion: 60 };
const cejas: Elegido = { serviceId: 's2', staffId: 'bea', nombre: 'Cejas', duracion: 30 };
const plan = repartirDesde([limpieza, cejas], 600, '2026-10-01', { staff: STAFF, ocupados: {}, bloqueos: [] })!;

test('fechas en texto: "jueves 1 de octubre" y con mayúscula para títulos', () => {
  assert.equal(fechaLarga('2026-10-01'), 'jueves 1 de octubre');
  assert.equal(fechaTitulo('2026-10-03'), 'Sábado 3 de octubre');
});

test('duración total en horas y minutos', () => {
  assert.equal(duracionTexto(45), '45 min');
  assert.equal(duracionTexto(60), '1 h');
  assert.equal(duracionTexto(105), '1 h 45 min');
  assert.equal(duracionTexto(150), '2 h 30 min');
});

test('resumen sin hora: "Primera disponible" o el nombre de la que eligió', () => {
  assert.deepEqual(lineasResumen([limpieza, cejas], STAFF, null, null), [
    { hora: null, nombre: 'Limpieza', duracion: 60, quien: 'Primera disponible' },
    { hora: null, nombre: 'Cejas', duracion: 30, quien: 'Bea' },
  ]);
});

test('resumen con hora: las horas encadenadas y quién hace cada servicio', () => {
  assert.deepEqual(lineasResumen([limpieza, cejas], STAFF, '10:00', plan), [
    { hora: '10:00 AM', nombre: 'Limpieza', duracion: 60, quien: 'Ana' },
    { hora: '11:00 AM', nombre: 'Cejas', duracion: 30, quien: 'Bea' },
  ]);
});

test('rango de horas de la visita', () => {
  assert.equal(rangoHoras('10:00', 105), '10:00 AM – 11:45 AM');
  assert.equal(rangoHoras('11:30', 60), '11:30 AM – 12:30 PM');
});

test('barra de abajo: cuántos servicios, la hora y el día', () => {
  assert.deepEqual(textoBarra(0, null, null), { titulo: 'Elige un servicio', detalle: 'para empezar' });
  assert.deepEqual(textoBarra(1, null, null), { titulo: '1 servicio', detalle: 'Falta elegir día y hora' });
  assert.deepEqual(textoBarra(2, '2026-10-01', '10:00'), { titulo: '2 servicios · 10:00 AM', detalle: 'jueves 1 de octubre' });
});

test('mensaje de WhatsApp: el mismo texto de siempre', () => {
  assert.equal(
    mensajeWhatsApp({ nombre: 'María', telefono: '829-555-0102', plan, fecha: '2026-10-01', hora: '10:00', notas: '   ' }),
    'Hola, acabo de reservar una cita:\n\n' +
      'Nombre: María\n' +
      'Telefono: 829-555-0102\n' +
      'Servicios:\n- Limpieza con Ana\n- Cejas con Bea\n' +
      'Fecha: 2026-10-01\n' +
      'Hora: 10:00 AM\n' +
      'Notas: Ninguna\n\n' +
      'Adjunto el comprobante de deposito para confirmar mi cita.',
  );
});

test('teléfono: guiones al escribir y nunca más de 10 dígitos', () => {
  assert.equal(formatoTelefono('829'), '829');
  assert.equal(formatoTelefono('8295'), '829-5');
  assert.equal(formatoTelefono('8295550102'), '829-555-0102');
  assert.equal(formatoTelefono('(829) 555-0102 ext 9'), '829-555-0102');
});

test('datos: nombre y los 10 dígitos del WhatsApp', () => {
  assert.deepEqual(validarDatos('', '829'), {
    nombre: 'Escribe tu nombre.',
    telefono: 'Escribe los 10 dígitos de tu WhatsApp.',
  });
  assert.deepEqual(validarDatos('  María ', '829-555-0102'), {});
});

test('número de WhatsApp para wa.me: solo dígitos y con el 1 del país', () => {
  assert.equal(numeroWhatsApp('829-322-4014'), '18293224014');
  assert.equal(numeroWhatsApp('18293224014'), '18293224014');
  assert.equal(numeroWhatsApp('+1 (829) 322-4014'), '18293224014');
});
