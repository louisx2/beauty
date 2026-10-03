import { test } from 'node:test';
import assert from 'node:assert/strict';
import { horasDelSalon, horasParaAgendar, textoSinHora, tramoDelSalon } from '../src/lib/horarioSalon.ts';
import { site } from '../src/config/site.ts';

const JUEVES = '2026-10-01';
const SABADO = '2026-10-03';
const DOMINGO = '2026-10-04';
const OTRO_DIA = { hoy: '2026-09-29', minutos: 0 };

test('turnos: de lunes a sábado de 8:00 a 6:00 y el domingo cerrado', () => {
  assert.deepEqual(tramoDelSalon(JUEVES), { abre: 480, ultimoTurno: 1080 });
  assert.deepEqual(tramoDelSalon('2026-10-05'), { abre: 480, ultimoTurno: 1080 });
  assert.deepEqual(tramoDelSalon(SABADO), { abre: 480, ultimoTurno: 1080 });
  assert.equal(tramoDelSalon(DOMINGO), null);
});

test('horario: sin fecha o con una fecha que no existe, nada', () => {
  assert.equal(tramoDelSalon(''), null);
  assert.equal(tramoDelSalon('no-es-fecha'), null);
});

test('horas del panel: cada media hora de 8:00 a 6:00; la de las 6:00 también se ofrece', () => {
  const jueves = horasDelSalon(JUEVES, OTRO_DIA);
  assert.equal(jueves[0], '08:00');
  assert.equal(jueves.at(-1), '18:00');
  assert.equal(jueves.length, 21);
  assert.deepEqual(horasDelSalon(SABADO, OTRO_DIA), jueves);
});

test('horas del panel: el domingo y sin fecha no hay', () => {
  assert.deepEqual(horasDelSalon(DOMINGO, OTRO_DIA), []);
  assert.deepEqual(horasDelSalon('', OTRO_DIA), []);
});

test('horas del panel: hoy solo las que no han pasado', () => {
  // a las 4:40 p. m. quedan 5:00, 5:30 y 6:00
  assert.deepEqual(horasDelSalon(SABADO, { hoy: SABADO, minutos: 1000 }), ['17:00', '17:30', '18:00']);
  // justo a las 5:30 esa ya no se ofrece
  assert.deepEqual(horasDelSalon(SABADO, { hoy: SABADO, minutos: 1050 }), ['18:00']);
  // después de las 6:00, nada
  assert.deepEqual(horasDelSalon(SABADO, { hoy: SABADO, minutos: 1081 }), []);
});

test('lista sin hora elegida: dice si ese día el salón está cerrado', () => {
  assert.equal(textoSinHora(JUEVES), 'Elegir hora');
  assert.equal(textoSinHora(DOMINGO), 'Cerrado ese día');
  assert.equal(textoSinHora(''), 'Elegir hora');
});

test('el texto del horario en la página: de lunes a sábado de 8 a 6', () => {
  assert.deepEqual(site.hours, ['Lun - Sáb: 8:00 AM - 6:00 PM']);
});

test('la hora que ya tiene la cita sale aunque quede fuera del horario, sin repetirse', () => {
  // fechas futuras: no dependen de la hora a la que corre la prueba
  const SABADO_FUTURO = '2030-09-28';
  const DOMINGO_FUTURO = '2030-09-29';
  assert.equal(horasParaAgendar(SABADO_FUTURO, '19:00').at(-1), '19:00');
  assert.equal(horasParaAgendar(SABADO_FUTURO, '09:00').filter((h) => h === '09:00').length, 1);
  assert.deepEqual(horasParaAgendar(SABADO_FUTURO), horasDelSalon(SABADO_FUTURO, OTRO_DIA));
  assert.deepEqual(horasParaAgendar(DOMINGO_FUTURO, '10:00'), ['10:00']);
});
