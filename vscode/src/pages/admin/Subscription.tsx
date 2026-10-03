import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Copy, CreditCard, Download, Eye, FileText, Loader2, RotateCcw, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { EVENTO_CAMBIO_SUSCRIPCION, useSuscripcionStore } from '../../store/suscripcionStore';
import {
  ESTADO_CUENTA, ESTADO_REPORTE, METODO_PAGO, cuotasPendientesTexto, dinero, fechaLarga, hoySantoDomingo,
  montoSugerido, proximoCobroVisible, validarReporte, type ErroresReporte,
} from '../../lib/suscripcion';
import {
  ErrorSuscripcion, cargarSuscripcion, obtenerFactura, reportarPago, retirarReporte, urlComprobante,
  type DatosSuscripcion,
} from '../../lib/suscripcionApi';
import { bajarASeccion } from '../../lib/bajarASeccion';
import './Subscription.css';

const mensajeDe = (e: unknown, def: string) => (e instanceof Error && e.message ? e.message : def);

/** Abre una pestaña en el mismo toque (así el navegador no la bloquea) y la llena cuando llega la dirección. */
function abrirEnPestana(direccion: () => Promise<string>) {
  const pestana = window.open('', '_blank');
  direccion()
    .then((url) => {
      if (pestana) {
        pestana.opener = null;
        pestana.location.href = url;
      } else {
        window.location.href = url;
      }
    })
    .catch((e) => {
      pestana?.close();
      toast.error(mensajeDe(e, 'No se pudo abrir.'), { duration: 8000 });
    });
}

/** Mi suscripción (spec §5.2): estado, cómo pagar, reportar un pago, comprobantes enviados y facturas. */
export default function Subscription() {
  const { user } = useAuthStore();
  const setCuenta = useSuscripcionStore((s) => s.setCuenta);
  const [datos, setDatos] = useState<DatosSuscripcion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const d = await cargarSuscripcion();
      setDatos(d);
      setCuenta(d.cuenta);
    } catch (e) {
      setError(e instanceof ErrorSuscripcion ? e.message : 'No pudimos cargar tu suscripción ahora.');
    } finally {
      setCargando(false);
    }
  }, [setCuenta]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Cuando SellAlleS avisa que cambió un comprobante o un pago (Louis confirmó, rechazó, registró un pago…), se
  // vuelve a cargar sin que ella tenga que recargar la página. El aviso lo recibe el banner (AvisoSuscripcion).
  useEffect(() => {
    const alCambiar = () => {
      void cargar();
    };
    window.addEventListener(EVENTO_CAMBIO_SUSCRIPCION, alCambiar);
    return () => window.removeEventListener(EVENTO_CAMBIO_SUSCRIPCION, alCambiar);
  }, [cargar]);

  // Si se llegó desde el banner (#susc-comprobantes o #susc-reportar), se baja a esa sección una vez, cuando ya
  // está dibujada; los refrescos posteriores no vuelven a mover la vista.
  const { hash } = useLocation();
  const bajadoA = useRef('');
  useEffect(() => {
    if (!datos || !hash || bajadoA.current === hash) return;
    if (bajarASeccion(hash.slice(1))) bajadoA.current = hash;
  }, [datos, hash]);

  if (user && user.role !== 'admin') return <Navigate to="/admin" replace />;

  return (
    <div className="susc">
      <header className="susc__head">
        <h1 className="susc__title"><CreditCard size={26} aria-hidden="true" /> Mi suscripción</h1>
        <p className="susc__subtitle">{datos?.empresa ? `${datos.empresa} · ` : ''}El pago mensual del sistema</p>
      </header>

      {cargando && !datos ? (
        <p className="susc__cargando"><Loader2 className="susc__spin" size={18} aria-hidden="true" /> Cargando tu suscripción…</p>
      ) : error && !datos ? (
        <div className="susc__card susc__error" role="alert">
          <p>{error}</p>
          <button type="button" className="susc__btn" onClick={() => void cargar()}>
            <RotateCcw size={16} aria-hidden="true" /> Reintentar
          </button>
        </div>
      ) : datos ? (
        <>
          <Estado datos={datos} />
          <div className="susc__grid">
            <CuentasBancarias datos={datos} />
            <FormularioReporte datos={datos} onListo={cargar} />
          </div>
          <Comprobantes datos={datos} onCambio={cargar} />
          <Pagos datos={datos} />
        </>
      ) : null}
    </div>
  );
}

function Estado({ datos }: { datos: DatosSuscripcion }) {
  const c = datos.cuenta;
  const e = ESTADO_CUENTA[c.estado];
  const proximo = proximoCobroVisible(c);
  return (
    <section className="susc__card" aria-labelledby="susc-estado-t">
      <div className="susc__card-top">
        <h2 id="susc-estado-t" className="susc__card-title">Estado</h2>
        <span className={`susc__badge susc__badge--${e.tono}`}>{e.texto}</span>
      </div>
      <dl className="susc__datos">
        <div><dt>Cuota mensual</dt><dd>{dinero(c.mensual)}</dd></div>
        {proximo && <div><dt>Próximo cobro</dt><dd>{fechaLarga(proximo)}</dd></div>}
        {c.saldo > 0 && (
          <div>
            <dt>Debes</dt>
            <dd>{dinero(c.saldo)}{c.cuotasPendientes > 0 ? ` (${cuotasPendientesTexto(c.cuotasPendientes)})` : ''}</dd>
          </div>
        )}
        {c.saldo > 0 && c.debeDesde && <div><dt>Desde</dt><dd>{fechaLarga(c.debeDesde)}</dd></div>}
        {c.comprobantesPorConfirmar > 0 && <div><dt>En revisión</dt><dd>{dinero(c.porConfirmar)}</dd></div>}
      </dl>
    </section>
  );
}

function CuentasBancarias({ datos }: { datos: DatosSuscripcion }) {
  const copiar = async (numero: string) => {
    try {
      await navigator.clipboard.writeText(numero);
      toast.success('Número copiado');
    } catch {
      toast.error('No se pudo copiar; cópialo a mano', { duration: 8000 });
    }
  };
  return (
    <section className="susc__card" aria-labelledby="susc-bancos-t">
      <h2 id="susc-bancos-t" className="susc__card-title">Cómo pagar</h2>
      <p className="susc__nota">Transfiere a una de estas cuentas y después sube el comprobante.</p>
      {datos.bancos.length === 0 ? (
        <p className="susc__vacio">Todavía no hay cuentas cargadas. Escríbenos y te pasamos los datos.</p>
      ) : (
        <ul className="susc__bancos">
          {datos.bancos.map((b) => (
            <li key={b.id} className="susc__banco">
              <div className="susc__banco-nombre">
                <b>{b.banco}</b>
                <span>{b.tipo === 'corriente' ? 'Corriente' : 'Ahorro'} · {b.moneda}</span>
              </div>
              <div className="susc__numero">
                <span>{b.numero}</span>
                <button type="button" className="susc__icon-btn" onClick={() => void copiar(b.numero)}
                  aria-label={`Copiar el número de cuenta ${b.numero}`}>
                  <Copy size={16} aria-hidden="true" /> Copiar
                </button>
              </div>
              <div className="susc__titular">{b.titular}{b.documento ? ` · ${b.documento}` : ''}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FormularioReporte({ datos, onListo }: { datos: DatosSuscripcion; onListo: () => Promise<void> }) {
  const hoy = hoySantoDomingo(new Date());
  const [monto, setMonto] = useState(() => String(montoSugerido(datos.cuenta)));
  const [fecha, setFecha] = useState(hoy);
  const [bancoId, setBancoId] = useState(datos.bancos.length === 1 ? datos.bancos[0].id : '');
  const [referencia, setReferencia] = useState('');
  const [nota, setNota] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errores, setErrores] = useState<ErroresReporte>({});
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const inputArchivo = useRef<HTMLInputElement>(null);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    const errs = validarReporte({
      monto: Number(monto), fecha, hoy, bancos: datos.bancos.length, bancoId,
      archivo: archivo && { tipo: archivo.type, nombre: archivo.name, tamano: archivo.size },
    });
    setErrores(errs);
    if (Object.keys(errs).length || !archivo) return;
    setEnviando(true);
    setErrorEnvio('');
    try {
      await reportarPago({ monto: Number(monto), fecha, bancoId: bancoId || null, referencia, nota, archivo });
      toast.success('Recibimos tu comprobante. Te avisamos cuando lo confirmemos.');
      setReferencia('');
      setNota('');
      setArchivo(null);
      if (inputArchivo.current) inputArchivo.current.value = '';
      await onListo();
    } catch (err) {
      setErrorEnvio(mensajeDe(err, 'No se pudo enviar el comprobante.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section id="susc-reportar" className="susc__card" aria-labelledby="susc-reportar-t">
      <h2 id="susc-reportar-t" className="susc__card-title">Reportar un pago</h2>
      <form className="susc__form" onSubmit={enviar} noValidate>
        <label className="susc__campo">
          <span>Monto (RD$)</span>
          <input type="number" inputMode="decimal" min="0" step="0.01" value={monto}
            onChange={(e) => setMonto(e.target.value)} aria-invalid={errores.monto ? true : undefined}
            aria-describedby={errores.monto ? 'susc-err-monto' : undefined} />
          {errores.monto && <small id="susc-err-monto" className="susc__err" role="alert">{errores.monto}</small>}
        </label>
        <label className="susc__campo">
          <span>Fecha de la transferencia</span>
          <input type="date" max={hoy} value={fecha} onChange={(e) => setFecha(e.target.value)}
            aria-invalid={errores.fecha ? true : undefined} aria-describedby={errores.fecha ? 'susc-err-fecha' : undefined} />
          {errores.fecha && <small id="susc-err-fecha" className="susc__err" role="alert">{errores.fecha}</small>}
        </label>
        {datos.bancos.length > 1 && (
          <label className="susc__campo">
            <span>Cuenta a la que transferiste</span>
            <select value={bancoId} onChange={(e) => setBancoId(e.target.value)}
              aria-invalid={errores.banco ? true : undefined} aria-describedby={errores.banco ? 'susc-err-banco' : undefined}>
              <option value="">Elige la cuenta…</option>
              {datos.bancos.map((b) => <option key={b.id} value={b.id}>{b.banco} · {b.numero}</option>)}
            </select>
            {errores.banco && <small id="susc-err-banco" className="susc__err" role="alert">{errores.banco}</small>}
          </label>
        )}
        <label className="susc__campo">
          <span>Referencia (opcional)</span>
          <input type="text" maxLength={80} value={referencia} onChange={(e) => setReferencia(e.target.value)} />
        </label>
        <label className="susc__campo">
          <span>Nota (opcional)</span>
          <textarea rows={2} maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)} />
        </label>
        <label className="susc__campo">
          <span>Comprobante (foto o PDF)</span>
          <input ref={inputArchivo} type="file" accept="image/*,application/pdf"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            aria-invalid={errores.archivo ? true : undefined} aria-describedby={errores.archivo ? 'susc-err-archivo' : undefined} />
          {errores.archivo && <small id="susc-err-archivo" className="susc__err" role="alert">{errores.archivo}</small>}
        </label>
        {errorEnvio && <p className="susc__err susc__err--envio" role="alert">{errorEnvio}</p>}
        <button type="submit" className="susc__btn susc__btn--principal" disabled={enviando}>
          {enviando ? <Loader2 className="susc__spin" size={16} aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}
          {enviando ? 'Enviando…' : 'Enviar comprobante'}
        </button>
      </form>
    </section>
  );
}

function Comprobantes({ datos, onCambio }: { datos: DatosSuscripcion; onCambio: () => Promise<void> }) {
  const [retirando, setRetirando] = useState<string | null>(null);
  if (!datos.reportes.length) return null;

  const retirar = async (id: string) => {
    if (!window.confirm('¿Retirar este comprobante? Podrás enviar otro cuando quieras.')) return;
    setRetirando(id);
    try {
      await retirarReporte(id);
      toast.success('Comprobante retirado');
      await onCambio();
    } catch (e) {
      toast.error(mensajeDe(e, 'No se pudo retirar el comprobante.'), { duration: 8000 });
    } finally {
      setRetirando(null);
    }
  };

  return (
    <section id="susc-comprobantes" className="susc__card" aria-labelledby="susc-comprobantes-t">
      <h2 id="susc-comprobantes-t" className="susc__card-title">Comprobantes enviados</h2>
      <ul className="susc__lista">
        {datos.reportes.map((r) => {
          const e = ESTADO_REPORTE[r.estado] ?? { texto: String(r.estado), tono: 'neutro' as const };
          return (
            <li key={r.id} className="susc__fila">
              <div className="susc__fila-datos">
                <b>{dinero(r.monto)}</b>
                <span>{fechaLarga(r.fecha)}{r.banco ? ` · ${r.banco}` : ''}</span>
                {r.estado === 'rechazado' && r.motivo && <span className="susc__motivo">Motivo: {r.motivo}</span>}
              </div>
              <span className={`susc__badge susc__badge--${e.tono}`}>{e.texto}</span>
              <div className="susc__fila-acciones">
                <button type="button" className="susc__btn susc__btn--suave" onClick={() => abrirEnPestana(() => urlComprobante(r.id))}>
                  <Eye size={16} aria-hidden="true" /> Ver comprobante
                </button>
                {r.estado === 'por_confirmar' && (
                  <button type="button" className="susc__btn susc__btn--suave" disabled={retirando === r.id} onClick={() => void retirar(r.id)}>
                    Retirar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Pagos({ datos }: { datos: DatosSuscripcion }) {
  const descargar = async (id: string) => {
    try {
      const { blob, nombre } = await obtenerFactura(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      toast.error(mensajeDe(e, 'No se pudo descargar la factura.'), { duration: 8000 });
    }
  };
  const ver = (id: string) =>
    abrirEnPestana(async () => {
      const url = URL.createObjectURL((await obtenerFactura(id)).blob);
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return url;
    });

  return (
    <section className="susc__card" aria-labelledby="susc-pagos-t">
      <h2 id="susc-pagos-t" className="susc__card-title">Pagos y facturas</h2>
      {datos.pagos.length === 0 ? (
        <p className="susc__vacio">Todavía no hay pagos confirmados.</p>
      ) : (
        <ul className="susc__lista">
          {datos.pagos.map((p) => (
            <li key={p.id} className="susc__fila">
              <div className="susc__fila-datos">
                <b>{dinero(p.monto)}</b>
                <span>{fechaLarga(p.fecha)} · {METODO_PAGO[p.metodo] ?? p.metodo}</span>
                <span><FileText size={14} aria-hidden="true" /> Factura {p.codigo}</span>
              </div>
              {p.tieneFactura && (
                <div className="susc__fila-acciones">
                  <button type="button" className="susc__btn susc__btn--suave" onClick={() => ver(p.id)}>
                    <Eye size={16} aria-hidden="true" /> Ver
                  </button>
                  <button type="button" className="susc__btn susc__btn--suave" onClick={() => void descargar(p.id)}>
                    <Download size={16} aria-hidden="true" /> Descargar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
