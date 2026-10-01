// Mi suscripción (el pago mensual del sistema, que se cobra en SellAlleS). Lo que se muestra se decide aquí:
// el estado de la cuenta, el aviso del banner (la misma lógica que avisoDeCuota de SellAlleS), los textos y la
// validación del formulario. Puro: se prueba con Node.

export type EstadoCobro =
  | 'atrasada' | 'nunca_pago' | 'prueba_vencida' | 'por_vencer' | 'prueba' | 'al_dia' | 'sin_tarifa' | 'suspendida';
export type EstadoReporte = 'por_confirmar' | 'confirmado' | 'rechazado' | 'anulado';
export type MetodoPago = 'transfer' | 'cash' | 'card' | 'other';

export interface CuentaSuscripcion {
  estado: EstadoCobro;
  /** atraso (negativo) o días para la próxima cuota; en prueba, días para el fin de la prueba */
  dias: number | null;
  mensual: number;
  montoPeriodo: number;
  /** positivo = debe; negativo = saldo a favor */
  saldo: number;
  cuotasPendientes: number;
  debeDesde: string | null;
  proximoCobro: string | null;
  porConfirmar: number;
  comprobantesPorConfirmar: number;
  cuentas: { nombre: string; cuota: number; proximaCuota: string | null }[];
}

export interface BancoSuscripcion {
  id: string; banco: string; tipo: 'ahorro' | 'corriente'; numero: string; titular: string;
  documento: string | null; moneda: 'DOP' | 'USD';
}
export interface ReporteSuscripcion {
  id: string; monto: number; fecha: string; banco: string | null; referencia: string | null; nota: string | null;
  estado: EstadoReporte; motivo: string | null; archivo: string | null; creado: string;
}
export interface PagoSuscripcion {
  id: string; monto: number; fecha: string; metodo: MetodoPago; referencia: string | null; desde: string | null;
  hasta: string | null; plan: string | null; codigo: string; tieneFactura: boolean;
}

const ESTADOS: EstadoCobro[] = ['atrasada', 'nunca_pago', 'prueba_vencida', 'por_vencer', 'prueba', 'al_dia', 'sin_tarifa', 'suspendida'];
const num = (v: unknown, def = 0): number => {
  const n = Number(v);
  return v == null || Number.isNaN(n) ? def : n;
};
const texto = (v: unknown): string | null => (v == null || v === '' ? null : String(v));

/** El jsonb de _cuenta_de_suscripcion (SellAlleS) → lo que usa el panel. */
export function cuentaDesdeJson(j: unknown): CuentaSuscripcion {
  const o = (j && typeof j === 'object' ? j : {}) as Record<string, unknown>;
  const estado = ESTADOS.includes(o.estado as EstadoCobro) ? (o.estado as EstadoCobro) : 'sin_tarifa';
  return {
    estado,
    dias: o.dias == null ? null : num(o.dias),
    mensual: num(o.mensual),
    montoPeriodo: num(o.monto_periodo),
    saldo: num(o.saldo),
    cuotasPendientes: num(o.cuotas_pendientes),
    debeDesde: texto(o.debe_desde),
    proximoCobro: texto(o.proximo_cobro),
    porConfirmar: num(o.por_confirmar),
    comprobantesPorConfirmar: num(o.comprobantes_por_confirmar),
    cuentas: (Array.isArray(o.cuentas) ? o.cuentas : []).map((c: Record<string, unknown>) => ({
      nombre: String(c.nombre ?? ''),
      cuota: num(c.cuota),
      proximaCuota: texto(c.proxima_cuota),
    })),
  };
}

/** Lo que toca en la próxima cuota: las cuotas que vencen ese día (igual que SellAlleS). */
export function montoProximaCuota(c: CuentaSuscripcion): number {
  const delDia = c.cuentas.filter((x) => x.proximaCuota && x.proximaCuota === c.proximoCobro).reduce((a, x) => a + x.cuota, 0);
  return delDia > 0 ? delDia : (c.cuentas[0]?.cuota ?? c.montoPeriodo);
}

/** La fecha que se muestra como "Próximo cobro". Mientras debe, el proximo_cobro de SellAlleS es la cuota
 *  impaga más vieja (una fecha pasada): ahí lo que viene es la próxima cuota de las cuentas (la más cercana). */
export function proximoCobroVisible(c: CuentaSuscripcion): string | null {
  if (c.estado === 'atrasada' || c.estado === 'nunca_pago') {
    const proximas = c.cuentas.map((x) => x.proximaCuota).filter((f): f is string => !!f).sort();
    if (proximas.length > 0) return proximas[0];
  }
  return c.proximoCobro;
}

/** El monto que se propone al reportar: lo que debe; si no debe, la próxima cuota. */
export function montoSugerido(c: CuentaSuscripcion): number {
  return c.saldo > 0 ? Math.round(c.saldo * 100) / 100 : montoProximaCuota(c);
}

/** "RD$ 2,300" o "RD$ 1,150.50". */
export function dinero(n: number): string {
  const conDecimales = Math.round(n * 100) % 100 !== 0;
  return `RD$ ${n.toLocaleString('en-US', { minimumFractionDigits: conDecimales ? 2 : 0, maximumFractionDigits: 2 })}`;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "2026-10-05" → "5 de octubre", sin pasar por Date (así la zona horaria no corre el día). */
export function fechaLarga(iso: string | null): string {
  if (!iso) return '';
  const [, m, d] = iso.slice(0, 10).split('-').map(Number);
  return m && d ? `${d} de ${MESES[m - 1]}` : '';
}

/** La fecha de hoy en Santo Domingo (UTC−4 todo el año), "AAAA-MM-DD". */
export function hoySantoDomingo(ahora: Date): string {
  return new Date(ahora.getTime() - 4 * 3_600_000).toISOString().slice(0, 10);
}

export function cuotasPendientesTexto(n: number): string {
  return `${n} ${n === 1 ? 'cuota pendiente' : 'cuotas pendientes'}`;
}

export interface Aviso {
  tono: 'rojo' | 'ambar' | 'azul';
  titulo: string;
  detalle: string;
  /** el rojo nunca se puede cerrar; el ámbar y el azul se ocultan por hoy */
  ocultable: boolean;
  /** con la fecha, recuerda que se ocultó hoy este aviso (uno nuevo vuelve a salir) */
  clave: string;
}

/** El banner del panel. Misma lógica que avisoDeCuota de SellAlleS, sin el "solo ventas" (aquí no se bloquea),
 *  más la cuenta suspendida y la prueba que termina. */
export function avisoDeCuota(c: CuentaSuscripcion | null): Aviso | null {
  if (!c) return null;
  const debe = c.estado === 'atrasada' || c.estado === 'nunca_pago';
  const enRevision = c.comprobantesPorConfirmar > 0;

  if (c.estado === 'suspendida') {
    return { tono: 'rojo', ocultable: false, clave: 'suspendida', titulo: 'Tu suscripción está suspendida', detalle: 'Escríbenos para reactivarla.' };
  }
  if (enRevision && (!debe || c.porConfirmar + 0.005 >= c.saldo)) {
    return {
      tono: 'azul', ocultable: true, clave: `revision:${c.comprobantesPorConfirmar}`,
      titulo: `Estamos revisando tu comprobante de ${dinero(c.porConfirmar)}`,
      detalle: 'Cuando confirmemos que llegó a la cuenta te llega la factura por correo.',
    };
  }
  if (c.estado === 'prueba_vencida') {
    return {
      tono: 'rojo', ocultable: false, clave: 'prueba-vencida', titulo: 'Tu período de prueba terminó',
      detalle: 'Transfiere la primera cuota y sube el comprobante en Mi suscripción.',
    };
  }
  if (debe) {
    return {
      tono: 'rojo', ocultable: false, clave: 'debe',
      titulo: `Tienes ${cuotasPendientesTexto(c.cuotasPendientes)}: ${dinero(c.saldo)}`,
      detalle: enRevision
        ? `Recibimos un comprobante de ${dinero(c.porConfirmar)} y lo estamos revisando; aún faltarían ${dinero(c.saldo - c.porConfirmar)}.`
        : `Desde el ${fechaLarga(c.debeDesde)}. Transfiere y sube el comprobante en Mi suscripción.`,
    };
  }
  if (c.estado === 'por_vencer' && c.dias != null) {
    return {
      tono: 'ambar', ocultable: true, clave: `vence:${c.proximoCobro}`,
      titulo: c.dias === 0
        ? `Tu cuota de ${dinero(montoProximaCuota(c))} vence hoy`
        : `Tu próxima cuota de ${dinero(montoProximaCuota(c))} vence el ${fechaLarga(c.proximoCobro)}`,
      detalle: c.dias === 0
        ? 'Transfiere y sube el comprobante en Mi suscripción.'
        : `En ${c.dias} ${c.dias === 1 ? 'día' : 'días'}. Cuando transfieras, sube el comprobante en Mi suscripción.`,
    };
  }
  if (c.estado === 'prueba' && c.dias != null && c.dias <= 7) {
    return {
      tono: 'ambar', ocultable: true, clave: `prueba:${c.dias}`,
      titulo: c.dias <= 0 ? 'Tu prueba termina hoy' : `Tu prueba termina en ${c.dias} ${c.dias === 1 ? 'día' : 'días'}`,
      detalle: 'Para seguir usando el sistema, transfiere la primera cuota y sube el comprobante en Mi suscripción.',
    };
  }
  return null;
}

export const ESTADO_CUENTA: Record<EstadoCobro, { texto: string; tono: 'ok' | 'ambar' | 'rojo' | 'azul' | 'neutro' }> = {
  al_dia: { texto: 'Al día', tono: 'ok' },
  por_vencer: { texto: 'Por vencer', tono: 'ambar' },
  atrasada: { texto: 'Atrasada', tono: 'rojo' },
  nunca_pago: { texto: 'Pendiente de pago', tono: 'rojo' },
  prueba: { texto: 'En prueba', tono: 'azul' },
  prueba_vencida: { texto: 'Prueba vencida', tono: 'rojo' },
  sin_tarifa: { texto: 'Sin tarifa', tono: 'neutro' },
  suspendida: { texto: 'Suspendida', tono: 'rojo' },
};

export const ESTADO_REPORTE: Record<EstadoReporte, { texto: string; tono: 'ambar' | 'ok' | 'rojo' | 'neutro' }> = {
  por_confirmar: { texto: 'En revisión', tono: 'ambar' },
  confirmado: { texto: 'Confirmado', tono: 'ok' },
  rechazado: { texto: 'Rechazado', tono: 'rojo' },
  anulado: { texto: 'Retirado', tono: 'neutro' },
};

export const METODO_PAGO: Record<MetodoPago, string> = {
  transfer: 'Transferencia', cash: 'Efectivo', card: 'Tarjeta', other: 'Otro',
};

/** Lo mismo que acepta el bucket de comprobantes de SellAlleS. */
export const TIPOS_COMPROBANTE = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
export const TAMANO_MAXIMO = 10 * 1024 * 1024;
/** Una foto se comprime antes de subir; de entrada solo se rechaza una exagerada. */
const FOTO_MAXIMA_SIN_COMPRIMIR = 30 * 1024 * 1024;

export interface ErroresReporte { monto?: string; fecha?: string; banco?: string; archivo?: string }

export function validarReporte(d: {
  monto: number; fecha: string; hoy: string; bancos: number; bancoId: string;
  archivo: { tipo: string; nombre: string; tamano: number } | null;
}): ErroresReporte {
  const e: ErroresReporte = {};
  if (!(d.monto > 0)) e.monto = 'Escribe un monto mayor que cero.';
  if (!d.fecha) e.fecha = 'Elige la fecha de la transferencia.';
  else if (d.fecha > d.hoy) e.fecha = 'La fecha del pago no puede ser futura.';
  if (d.bancos > 1 && !d.bancoId) e.banco = 'Elige la cuenta a la que transferiste.';
  if (!d.archivo) {
    e.archivo = 'Adjunta el comprobante (foto o PDF).';
  } else {
    const esPdf = d.archivo.tipo === 'application/pdf' || /\.pdf$/i.test(d.archivo.nombre);
    const esFoto = d.archivo.tipo.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp)$/i.test(d.archivo.nombre);
    if (!esPdf && !esFoto) e.archivo = 'El comprobante tiene que ser una foto o un PDF.';
    else if (esPdf && d.archivo.tamano > TAMANO_MAXIMO) e.archivo = 'El PDF pesa más de 10 MB.';
    else if (esFoto && d.archivo.tamano > FOTO_MAXIMA_SIN_COMPRIMIR) e.archivo = 'La foto pesa demasiado. Prueba con una captura de pantalla.';
  }
  return e;
}
