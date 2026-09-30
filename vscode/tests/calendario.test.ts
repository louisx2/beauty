import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIAS_MAXIMOS, deIso, diasEntre, etiquetaMes, flechasMes, flechasSemana, isoLocal, lunesDe, mesDeSemana,
  mesEnCuadricula, motivoNoReservable, primerDiaReservable, semana, sumarDias, sumarMeses,
} from '../src/site/reservar/calendario.ts';

// "hoy" en las pruebas: martes 29 de septiembre de 2026
const HOY = '2026-09-29';

test('fechas locales: ida y vuelta, y sumar días cruzando de mes', () => {
  assert.equal(isoLocal(deIso('2026-09-29')), '2026-09-29');
  assert.equal(sumarDias('2026-09-29', 3), '2026-10-02');
  assert.equal(sumarDias('2026-10-01', -1), '2026-09-30');
  assert.equal(diasEntre('2026-09-29', '2026-12-28'), 90);
  assert.equal(diasEntre('2026-09-29', '2026-09-28'), -1);
});

test('la semana empieza en lunes, también desde un domingo', () => {
  assert.equal(lunesDe('2026-09-29'), '2026-09-28');
  assert.equal(lunesDe('2026-10-04'), '2026-09-28');
  assert.equal(lunesDe('2026-09-28'), '2026-09-28');
});

test('se reserva desde hoy hasta 90 días; nunca un domingo ni un día pasado', () => {
  assert.equal(DIAS_MAXIMOS, 90);
  assert.equal(motivoNoReservable('2026-09-29', HOY), null);
  assert.equal(motivoNoReservable('2026-09-28', HOY), 'pasado');
  assert.equal(motivoNoReservable('2026-10-04', HOY), 'domingo');
  assert.equal(motivoNoReservable('2026-12-28', HOY), null);
  assert.equal(motivoNoReservable('2026-12-29', HOY), 'lejos');
});

test('el primer día reservable: hoy, o el lunes si hoy es domingo', () => {
  assert.equal(primerDiaReservable('2026-09-29'), '2026-09-29');
  assert.equal(primerDiaReservable('2026-10-04'), '2026-10-05');
});

test('semana: siete días con su nombre corto, número, mes y motivo', () => {
  const s = semana('2026-09-28', HOY);
  assert.equal(s.length, 7);
  assert.deepEqual(s.map((d) => d.corto), ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);
  assert.deepEqual(s.map((d) => d.numero), [28, 29, 30, 1, 2, 3, 4]);
  assert.deepEqual(s.map((d) => d.mes), ['sep', 'sep', 'sep', 'oct', 'oct', 'oct', 'oct']);
  assert.deepEqual(s.map((d) => d.motivo), ['pasado', null, null, null, null, null, 'domingo']);
  assert.deepEqual(s.map((d) => d.esHoy), [false, true, false, false, false, false, false]);
});

test('flechas de semana: no se va al pasado ni más allá de los 90 días', () => {
  assert.deepEqual(flechasSemana('2026-09-28', HOY), { anterior: false, siguiente: true });
  assert.deepEqual(flechasSemana('2026-12-21', HOY), { anterior: true, siguiente: true });
  assert.deepEqual(flechasSemana('2026-12-28', HOY), { anterior: true, siguiente: false });
});

test('mes: cuadrícula que empieza en lunes, con huecos antes del día 1', () => {
  const sep = mesEnCuadricula({ anio: 2026, mes: 8 }, HOY);
  assert.equal(sep.filter((d) => d === null).length, 1); // el 1 de septiembre de 2026 es martes
  assert.equal(sep.length, 31);
  assert.equal(sep[1]?.iso, '2026-09-01');
  const oct = mesEnCuadricula({ anio: 2026, mes: 9 }, HOY);
  assert.equal(oct.filter((d) => d === null).length, 3); // el 1 de octubre es jueves
  assert.equal(oct.at(-1)?.iso, '2026-10-31');
});

test('flechas de mes, nombre del mes y sumar meses cruzando de año', () => {
  assert.deepEqual(flechasMes({ anio: 2026, mes: 8 }, HOY), { anterior: false, siguiente: true });
  assert.deepEqual(flechasMes({ anio: 2026, mes: 11 }, HOY), { anterior: true, siguiente: false });
  assert.equal(etiquetaMes({ anio: 2026, mes: 8 }), 'Septiembre 2026');
  assert.deepEqual(sumarMeses({ anio: 2026, mes: 11 }, 1), { anio: 2027, mes: 0 });
  assert.deepEqual(sumarMeses({ anio: 2027, mes: 0 }, -1), { anio: 2026, mes: 11 });
});

test('el mes que se nombra sobre una semana es el de su jueves', () => {
  assert.deepEqual(mesDeSemana('2026-09-28'), { anio: 2026, mes: 9 });
  assert.deepEqual(mesDeSemana('2026-09-21'), { anio: 2026, mes: 8 });
});
