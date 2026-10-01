import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ESTADO_REPORTE, avisoDeCuota, cuentaDesdeJson, cuotasPendientesTexto, dinero, fechaLarga, hoySantoDomingo,
  montoProximaCuota, montoSugerido, validarReporte,
} from '../src/lib/suscripcion.ts';

const base = (extra: Record<string, unknown> = {}) => cuentaDesdeJson({
  estado: 'al_dia', dias: null, mensual: 2300, monto_periodo: 2300, saldo: -2300, cuotas_pendientes: 0,
  debe_desde: null, proximo_cobro: '2026-10-25', por_confirmar: 0, comprobantes_por_confirmar: 0,
  cuentas: [{ nombre: 'Toda la empresa', cuota: 2300, proxima_cuota: '2026-10-25' }],
  ...extra,
});
const ver = (a: ReturnType<typeof avisoDeCuota>) => a && { tono: a.tono, titulo: a.titulo, detalle: a.detalle, ocultable: a.ocultable };

test('montos, fechas y cuotas en texto', () => {
  assert.equal(dinero(2300), 'RD$ 2,300');
  assert.equal(dinero(1150.5), 'RD$ 1,150.50');
  assert.equal(dinero(0), 'RD$ 0');
  assert.equal(fechaLarga('2026-10-05'), '5 de octubre');
  assert.equal(fechaLarga(null), '');
  assert.equal(hoySantoDomingo(new Date('2026-10-01T03:30:00Z')), '2026-09-30');
  assert.equal(cuotasPendientesTexto(1), '1 cuota pendiente');
  assert.equal(cuotasPendientesTexto(2), '2 cuotas pendientes');
});

test('la cuenta desde el json de SellAlleS: números como texto y valores que faltan', () => {
  const c = cuentaDesdeJson({ estado: 'atrasada', saldo: '4600', cuotas_pendientes: '2' });
  assert.equal(c.estado, 'atrasada');
  assert.equal(c.saldo, 4600);
  assert.equal(c.cuotasPendientes, 2);
  assert.equal(c.mensual, 0);
  assert.deepEqual(c.cuentas, []);
  assert.equal(cuentaDesdeJson(null).estado, 'sin_tarifa');
});

test('al día, sin tarifa o sin datos: no hay aviso', () => {
  assert.equal(avisoDeCuota(base()), null);
  assert.equal(avisoDeCuota(base({ estado: 'sin_tarifa' })), null);
  assert.equal(avisoDeCuota(null), null);
});

test('atrasada o nunca pagó: rojo y no se puede cerrar', () => {
  assert.deepEqual(ver(avisoDeCuota(base({ estado: 'atrasada', saldo: 4600, cuotas_pendientes: 2, debe_desde: '2026-09-05' }))), {
    tono: 'rojo', ocultable: false,
    titulo: 'Tienes 2 cuotas pendientes: RD$ 4,600',
    detalle: 'Desde el 5 de septiembre. Transfiere y sube el comprobante en Mi suscripción.',
  });
  assert.equal(avisoDeCuota(base({ estado: 'nunca_pago', saldo: 2300, cuotas_pendientes: 1, debe_desde: '2026-09-25' }))?.tono, 'rojo');
});

test('comprobante en revisión: azul si cubre la deuda; rojo con lo que falta si no', () => {
  const cubre = avisoDeCuota(base({ estado: 'atrasada', saldo: 2300, cuotas_pendientes: 1, debe_desde: '2026-09-25', por_confirmar: 2300, comprobantes_por_confirmar: 1 }));
  assert.deepEqual(ver(cubre), {
    tono: 'azul', ocultable: true,
    titulo: 'Estamos revisando tu comprobante de RD$ 2,300',
    detalle: 'Cuando confirmemos que llegó a la cuenta te llega la factura por correo.',
  });
  assert.equal(cubre?.clave, 'revision:1');
  const parcial = avisoDeCuota(base({ estado: 'atrasada', saldo: 4600, cuotas_pendientes: 2, debe_desde: '2026-09-05', por_confirmar: 2300, comprobantes_por_confirmar: 1 }));
  assert.equal(parcial?.tono, 'rojo');
  assert.equal(parcial?.detalle, 'Recibimos un comprobante de RD$ 2,300 y lo estamos revisando; aún faltarían RD$ 2,300.');
  assert.equal(avisoDeCuota(base({ por_confirmar: 2300, comprobantes_por_confirmar: 1 }))?.tono, 'azul');
});

test('por vencer: ámbar, se puede ocultar por hoy', () => {
  const tres = avisoDeCuota(base({ estado: 'por_vencer', dias: 3 }));
  assert.deepEqual(ver(tres), {
    tono: 'ambar', ocultable: true,
    titulo: 'Tu próxima cuota de RD$ 2,300 vence el 25 de octubre',
    detalle: 'En 3 días. Cuando transfieras, sube el comprobante en Mi suscripción.',
  });
  assert.equal(tres?.clave, 'vence:2026-10-25');
  assert.equal(avisoDeCuota(base({ estado: 'por_vencer', dias: 1 }))?.detalle, 'En 1 día. Cuando transfieras, sube el comprobante en Mi suscripción.');
  const hoy = avisoDeCuota(base({ estado: 'por_vencer', dias: 0 }));
  assert.equal(hoy?.titulo, 'Tu cuota de RD$ 2,300 vence hoy');
  assert.equal(hoy?.detalle, 'Transfiere y sube el comprobante en Mi suscripción.');
});

test('prueba, prueba vencida y cuenta suspendida', () => {
  assert.equal(avisoDeCuota(base({ estado: 'prueba', dias: 10 })), null);
  assert.equal(avisoDeCuota(base({ estado: 'prueba', dias: 2 }))?.titulo, 'Tu prueba termina en 2 días');
  assert.equal(avisoDeCuota(base({ estado: 'prueba', dias: 0 }))?.titulo, 'Tu prueba termina hoy');
  const vencida = avisoDeCuota(base({ estado: 'prueba_vencida', dias: -3 }));
  assert.deepEqual([vencida?.tono, vencida?.ocultable, vencida?.titulo], ['rojo', false, 'Tu período de prueba terminó']);
  assert.equal(avisoDeCuota(base({ estado: 'suspendida' }))?.titulo, 'Tu suscripción está suspendida');
  assert.equal(avisoDeCuota(base({ estado: 'prueba_vencida', dias: -3, por_confirmar: 2300, comprobantes_por_confirmar: 1 }))?.tono, 'azul');
  assert.equal(avisoDeCuota(base({ estado: 'suspendida', por_confirmar: 2300, comprobantes_por_confirmar: 1 }))?.tono, 'rojo');
});

test('monto de la próxima cuota y monto sugerido para pagar', () => {
  assert.equal(montoProximaCuota(base()), 2300);
  assert.equal(montoProximaCuota(base({ cuentas: [
    { nombre: 'Uno', cuota: 1500, proxima_cuota: '2026-10-25' },
    { nombre: 'Dos', cuota: 800, proxima_cuota: '2026-10-25' },
    { nombre: 'Tres', cuota: 900, proxima_cuota: '2026-11-02' },
  ] })), 2300);
  assert.equal(montoProximaCuota(base({ cuentas: [] })), 2300);
  assert.equal(montoSugerido(base({ saldo: 4600 })), 4600);
  assert.equal(montoSugerido(base()), 2300);
});

test('validar el reporte de pago antes de subir nada', () => {
  const ok = { monto: 2300, fecha: '2026-10-05', hoy: '2026-10-05', bancos: 1, bancoId: '', archivo: { tipo: 'image/jpeg', nombre: 'captura.jpg', tamano: 300_000 } };
  assert.deepEqual(validarReporte(ok), {});
  assert.equal(validarReporte({ ...ok, monto: 0 }).monto, 'Escribe un monto mayor que cero.');
  assert.equal(validarReporte({ ...ok, monto: Number.NaN }).monto, 'Escribe un monto mayor que cero.');
  assert.equal(validarReporte({ ...ok, fecha: '' }).fecha, 'Elige la fecha de la transferencia.');
  assert.equal(validarReporte({ ...ok, fecha: '2026-10-06' }).fecha, 'La fecha del pago no puede ser futura.');
  assert.equal(validarReporte({ ...ok, bancos: 2 }).banco, 'Elige la cuenta a la que transferiste.');
  assert.deepEqual(validarReporte({ ...ok, bancos: 2, bancoId: 'b1' }), {});
  assert.equal(validarReporte({ ...ok, archivo: null }).archivo, 'Adjunta el comprobante (foto o PDF).');
  assert.equal(validarReporte({ ...ok, archivo: { tipo: 'text/plain', nombre: 'nota.txt', tamano: 10 } }).archivo, 'El comprobante tiene que ser una foto o un PDF.');
  assert.equal(validarReporte({ ...ok, archivo: { tipo: 'application/pdf', nombre: 'r.pdf', tamano: 11 * 1024 * 1024 } }).archivo, 'El PDF pesa más de 10 MB.');
  // una foto grande se comprime antes de subir; solo una exagerada se rechaza de entrada
  assert.deepEqual(validarReporte({ ...ok, archivo: { tipo: 'image/jpeg', nombre: 'foto.jpg', tamano: 12 * 1024 * 1024 } }), {});
  assert.equal(validarReporte({ ...ok, archivo: { tipo: 'image/jpeg', nombre: 'foto.jpg', tamano: 31 * 1024 * 1024 } }).archivo, 'La foto pesa demasiado. Prueba con una captura de pantalla.');
  // HEIC del iPhone: a veces llega sin tipo, solo con el nombre
  assert.deepEqual(validarReporte({ ...ok, archivo: { tipo: '', nombre: 'IMG_0001.HEIC', tamano: 2_000_000 } }), {});
});

test('estados de los comprobantes en palabras', () => {
  assert.equal(ESTADO_REPORTE.por_confirmar.texto, 'En revisión');
  assert.equal(ESTADO_REPORTE.confirmado.texto, 'Confirmado');
  assert.equal(ESTADO_REPORTE.rechazado.texto, 'Rechazado');
  assert.equal(ESTADO_REPORTE.anulado.texto, 'Retirado');
});
