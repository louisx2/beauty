import { test } from 'node:test';
import assert from 'node:assert/strict';
import { horasDelSalon, horasParaAgendar, textoSinHora, tramoDelSalon } from '../src/lib/horarioSalon.ts';
import { site } from '../src/config/site.ts';

const JUEVES = '2026-10-01';
const SABADO = '2026-10-03';
const DOMINGO = '2026-10-04';
const OTRO_DIA = { hoy: '2026-09-29', minutos: 0 };

test('horario: lunes a viernes de 8:00 a 6:00, sábado de 8:00 a 2:00 y domingo cerrado', () => {
  assert.deepEqual(tramoDelSalon(JUEVES), { abre: 480, cierra: 1080 });
  assert.deepEqual(tramoDelSalon('2026-10-05'), { abre: 480, cierra: 1080 });
  assert.deepEqual(tramoDelSalon(SABADO), { abre: 480, cierra: 840 });
  assert.equal(tramoDelSalon(DOMINGO), null);
});

test('horario: sin fecha o con una fecha que no existe, nada', () => {
  assert.equal(tramoDelSalon(''), null);
  assert.equal(tramoDelSalon('no-es-fecha'), null);
});

test('horas del panel: cada media hora desde que abre hasta media hora antes de cerrar', () => {
  const jueves = horasDelSalon(JUEVES, OTRO_DIA);
  assert.equal(jueves[0], '08:00');
  assert.equal(jueves.at(-1), '17:30');
  assert.equal(jueves.length, 20);
  const sabado = horasDelSalon(SABADO, OTRO_DIA);
  assert.equal(sabado[0], '08:00');
  assert.equal(sabado.at(-1), '13:30');
  assert.equal(sabado.length, 12);
});

test('horas del panel: el domingo y sin fecha no hay', () => {
  assert.deepEqual(horasDelSalon(DOMINGO, OTRO_DIA), []);
  assert.deepEqual(horasDelSalon('', OTRO_DIA), []);
});

test('horas del panel: hoy solo las que no han pasado', () => {
  // sábado a las 12:10: quedan 12:30, 1:00 y 1:30
  assert.deepEqual(horasDelSalon(SABADO, { hoy: SABADO, minutos: 730 }), ['12:30', '13:00', '13:30']);
  // justo a las 12:30 esa ya no se ofrece
  assert.deepEqual(horasDelSalon(SABADO, { hoy: SABADO, minutos: 750 }), ['13:00', '13:30']);
  // después del cierre, nada
  assert.deepEqual(horasDelSalon(SABADO, { hoy: SABADO, minutos: 900 }), []);
});

test('lista sin hora elegida: dice si ese día el salón está cerrado', () => {
  assert.equal(textoSinHora(JUEVES), 'Elegir hora');
  assert.equal(textoSinHora(DOMINGO), 'Cerrado ese día');
  assert.equal(textoSinHora(''), 'Elegir hora');
});

test('el texto del horario en la página: lunes a viernes de 8 a 6 y sábado de 8 a 2', () => {
  assert.deepEqual(site.hours, ['Lun - Vie: 8:00 AM - 6:00 PM', 'Sáb: 8:00 AM - 2:00 PM']);
});

test('la hora que ya tiene la cita sale aunque quede fuera del horario, sin repetirse', () => {
  // fechas futuras: no dependen de la hora a la que corre la prueba
  const SABADO_FUTURO = '2030-09-28';
  const DOMINGO_FUTURO = '2030-09-29';
  assert.equal(horasParaAgendar(SABADO_FUTURO, '15:00').at(-1), '15:00');
  assert.equal(horasParaAgendar(SABADO_FUTURO, '09:00').filter((h) => h === '09:00').length, 1);
  assert.deepEqual(horasParaAgendar(SABADO_FUTURO), horasDelSalon(SABADO_FUTURO, OTRO_DIA));
  assert.deepEqual(horasParaAgendar(DOMINGO_FUTURO, '10:00'), ['10:00']);
});
