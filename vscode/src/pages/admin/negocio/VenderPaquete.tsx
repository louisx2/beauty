import { useState } from 'react';
import toast from 'react-hot-toast';
import { AlertCircle, CalendarPlus, CheckCircle2, Minus, Plus, X } from 'lucide-react';
import { useServiceStore, type ClientPackage, type PackagePayment } from '../../../store/serviceStore';
import { useClientStore } from '../../../store/clientStore';
import { useAgendarStore } from '../../../store/agendarStore';
import { fechaLocal } from '../../../lib/fechas';
import ElegirClienta, { type ErroresNueva, type NuevaClienta } from '../agendar/ElegirClienta';
import { clientaDe, type ClientaAgenda } from '../agendar/reglas';
import { clientaConTelefono, validarNueva } from '../atender/atender';
import { primerNombre } from '../citas/proximaCita';
import { METODOS_PAGO, errorDelAbono, erroresPaquetePrevio, type ErroresPrevio } from './paquetes';

const rd = (n: number) => `RD$ ${n.toLocaleString('es-DO')}`;

interface Props {
  /** la clienta, si viene de su ficha */
  clienta?: string;
  /** el tipo de paquete, si se tocó "Vender" en uno */
  tipo?: string;
  onCerrar: () => void;
}

/** Vender un paquete: a quién (o una clienta nueva), cuál y cuánto abona ahora. Al terminar ofrece agendar la primera
 *  sesión ahí mismo. El abono queda en su historial de pagos, con la forma de pago.
 *  "Paquete previo": uno que compró antes de usar el sistema. Se registra con su fecha de compra, las sesiones que ya
 *  se tomó, lo que costó y lo que ya pagó (sin abono con la fecha de hoy), y sigue contando desde ahí. */
export default function VenderPaquete({ clienta: clientaInicial, tipo: tipoInicial, onCerrar }: Props) {
  const { packages, sellPackage, addPayment } = useServiceStore();
  const { clients, addClient } = useClientStore();
  const abrirAgendar = useAgendarStore((s) => s.abrir);

  const [clienta, setClienta] = useState<ClientaAgenda | null>(() => {
    const c = clientaInicial ? clients.find((x) => x.id === clientaInicial) : undefined;
    return c ? clientaDe(c) : null;
  });
  const [nueva, setNueva] = useState<NuevaClienta | null>(null);
  const [erroresNueva, setErroresNueva] = useState<ErroresNueva>({});
  const [tipoId, setTipoId] = useState(tipoInicial ?? '');
  const [abono, setAbono] = useState('');
  const [metodo, setMetodo] = useState<PackagePayment['paymentMethod']>('cash');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [vendido, setVendido] = useState<ClientPackage | null>(null);
  // paquete previo
  const [previo, setPrevio] = useState(false);
  const [fecha, setFecha] = useState('');
  const [tomadas, setTomadas] = useState(0);
  const [precio, setPrecio] = useState('');
  const [pagado, setPagado] = useState('');
  const [erroresPrevio, setErroresPrevio] = useState<ErroresPrevio>({});
  const hoy = fechaLocal();

  const tipos = packages.filter((p) => p.active || p.id === tipoInicial);
  const tipo = packages.find((p) => p.id === tipoId);
  const monto = abono.trim() === '' ? 0 : Number(abono);
  const precioPrevio = precio.trim() === '' ? (tipo?.price ?? 0) : Number(precio);
  const pagadoPrevio = pagado.trim() === '' ? 0 : Number(pagado);

  const elegirTipo = (id: string) => {
    setTipoId(id);
    setError(null);
    setTomadas(0);
    setPrecio('');
    setPagado('');
    setErroresPrevio({});
  };
  const cambiarPrevio = (...campos: (keyof ErroresPrevio)[]) =>
    setErroresPrevio((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !campos.includes(k as keyof ErroresPrevio))));

  const vender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienta && !nueva) return setError('Elige la clienta (o créala)');
    if (!tipo) return setError('Elige el paquete');
    if (previo) {
      const errs = erroresPaquetePrevio({ fecha, tomadas, total: tipo.sessions, precio: precioPrevio, pagado: pagadoPrevio }, hoy);
      setErroresPrevio(errs);
      if (Object.keys(errs).length > 0) return;
    } else if (monto > 0) {
      const err = errorDelAbono(monto, tipo.price);
      if (err) return setError(err);
    } else if (monto < 0 || !Number.isFinite(monto)) return setError('Escribe un abono válido');
    if (!clienta && nueva) {
      const errs = validarNueva(nueva.nombre, nueva.telefono);
      setErroresNueva(errs);
      if (Object.keys(errs).length > 0 || clientaConTelefono(clients, nueva.telefono)) return;
    }
    setError(null);
    setGuardando(true);
    try {
      let quien = clienta?.id ? { id: clienta.id, nombre: clienta.nombre } : null;
      if (!quien && nueva) {
        const creada = await addClient({
          name: nueva.nombre.trim(), phone: nueva.telefono, email: null, cedula: null, skin_type: null, allergies: null, notes: null, source: 'manual',
        });
        if (!creada) return; // addClient ya avisó
        quien = { id: creada.id, nombre: creada.name };
        setClienta(clientaDe(creada));
        setNueva(null);
      }
      if (!quien) return;
      const nuevo = await sellPackage(previo ? {
        clientId: quien.id, clientName: quien.nombre, packageId: tipo.id, packageName: tipo.name, serviceName: tipo.serviceName,
        totalSessions: tipo.sessions, usedSessions: tomadas, purchasedAt: fecha, notes: notas.trim(), totalPrice: precioPrevio, amountPaid: pagadoPrevio,
      } : {
        clientId: quien.id, clientName: quien.nombre, packageId: tipo.id, packageName: tipo.name, serviceName: tipo.serviceName,
        totalSessions: tipo.sessions, usedSessions: 0, purchasedAt: fechaLocal(), notes: notas.trim(), totalPrice: tipo.price, amountPaid: 0,
      }, previo);
      if (!nuevo) {
        toast.error(previo ? 'No se pudo registrar el paquete. Intenta de nuevo.' : 'No se pudo vender el paquete. Intenta de nuevo.');
        return;
      }
      if (!previo && monto > 0) {
        const ok = await addPayment({ clientId: quien.id, packageId: nuevo.id, amount: monto, paymentMethod: metodo, notes: 'Abono al comprar' });
        if (!ok) toast.error('El paquete se vendió, pero el abono no se anotó: regístralo en «Pagos y abonos».');
      }
      toast.success(`${tipo.name} ${previo ? 'registrado' : 'vendido'} a ${primerNombre(quien.nombre)}`);
      setVendido(useServiceStore.getState().clientPackages.find((p) => p.id === nuevo.id) ?? nuevo);
    } finally {
      setGuardando(false);
    }
  };

  if (vendido) {
    const quedan = vendido.totalSessions - vendido.usedSessions;
    const debe = vendido.totalPrice - vendido.amountPaid;
    return (
      <div className="modal-overlay" onClick={onCerrar}>
        <div className="modal vender" role="dialog" aria-modal="true" aria-labelledby="vender-tit" onClick={(e) => e.stopPropagation()}>
          <div className="vender__listo">
            <CheckCircle2 size={40} aria-hidden="true" />
            <h2 id="vender-tit">{previo ? 'Listo, registrado' : 'Listo, vendido'}</h2>
            <p>{vendido.packageName} para {vendido.clientName}: {previo
              ? `${vendido.usedSessions} de ${vendido.totalSessions} sesiones tomadas${quedan > 0 ? ` (le ${quedan === 1 ? 'queda 1' : `quedan ${quedan}`})` : ''}`
              : `${vendido.totalSessions} sesiones`}
              {debe > 0 ? `, debe ${rd(debe)}.` : ', pagado completo.'}</p>
            <div className="vender__botones">
              {quedan > 0 ? (
                <>
                  <button type="button" className="modal__cancel-btn" onClick={onCerrar}>Más tarde</button>
                  <button type="button" className="modal__submit-btn" onClick={() => { onCerrar(); abrirAgendar({ modo: 'paquete', paquete: vendido }); }}>
                    <CalendarPlus size={18} aria-hidden="true" /> {previo ? 'Agendar la próxima sesión' : 'Agendar la primera sesión'}
                  </button>
                </>
              ) : (
                <button type="button" className="modal__submit-btn" onClick={onCerrar}>Cerrar</button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal modal--wide vender" role="dialog" aria-modal="true" aria-labelledby="vender-tit" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 id="vender-tit">{previo ? 'Paquete previo' : 'Vender paquete'}</h2>
          <button type="button" className="modal__close" onClick={onCerrar} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <form className="modal__form" onSubmit={vender} noValidate>
          <div className="neg__opciones vender__modo" role="group" aria-label="Qué se registra">
            <button type="button" className={`neg__opcion ${!previo ? 'is-on' : ''}`} aria-pressed={!previo} onClick={() => { setPrevio(false); setError(null); }}>
              Venta nueva
            </button>
            <button type="button" className={`neg__opcion ${previo ? 'is-on' : ''}`} aria-pressed={previo} onClick={() => { setPrevio(true); setError(null); }}>
              Paquete previo
            </button>
          </div>
          {previo && <p className="vender__pista">Para un paquete que compró antes de usar el sistema: con su fecha, las sesiones que ya se tomó y lo que ya pagó.</p>}

          <div className="modal__field">
            <span className="neg__etq">Clienta</span>
            <ElegirClienta clienta={clienta} nueva={nueva} errores={erroresNueva}
              onClienta={(c) => { setClienta(c); setError(null); }} onNueva={setNueva} onErrores={setErroresNueva} />
          </div>

          <fieldset className="modal__field neg__grupo">
            <legend>Paquete</legend>
            {tipos.length === 0 ? (
              <p className="neg__aviso">Todavía no hay tipos de paquete: créalos en «Tipos de paquete».</p>
            ) : (
              <div className="vender__tipos">
                {tipos.map((t) => (
                  <button key={t.id} type="button" className={`vender__tipo ${tipoId === t.id ? 'is-on' : ''}`} aria-pressed={tipoId === t.id}
                    onClick={() => elegirTipo(t.id)}>
                    <b>{t.name}</b>
                    <span>{t.sessions} sesiones · {rd(t.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          {tipo && previo && (
            <>
              <div className="modal__field">
                <label htmlFor="vender-fecha">Fecha de compra</label>
                <input id="vender-fecha" type="date" max={hoy} value={fecha} className={erroresPrevio.fecha ? 'input--error' : ''}
                  onChange={(e) => { setFecha(e.target.value); cambiarPrevio('fecha'); }} />
                {erroresPrevio.fecha && <span className="field-error"><AlertCircle size={12} /> {erroresPrevio.fecha}</span>}
              </div>
              <fieldset className="modal__field neg__grupo">
                <legend>Sesiones tomadas</legend>
                <div className="evend__contador">
                  <button type="button" className="neg__icono" onClick={() => { setTomadas(Math.max(0, tomadas - 1)); cambiarPrevio('tomadas'); }}
                    disabled={tomadas <= 0} aria-label="Una menos">
                    <Minus size={18} />
                  </button>
                  <output aria-live="polite"><b>{tomadas}</b> de {tipo.sessions}</output>
                  <button type="button" className="neg__icono" onClick={() => { setTomadas(Math.min(tipo.sessions, tomadas + 1)); cambiarPrevio('tomadas'); }}
                    disabled={tomadas >= tipo.sessions} aria-label="Una más">
                    <Plus size={18} />
                  </button>
                </div>
                <div className="paq__puntos evend__puntos" aria-hidden="true">
                  {Array.from({ length: Math.min(tipo.sessions, 50) }, (_, i) => <i key={i} className={i < tomadas ? 'is-hecha' : ''} />)}
                </div>
                {erroresPrevio.tomadas && <span className="field-error"><AlertCircle size={12} /> {erroresPrevio.tomadas}</span>}
              </fieldset>
              <div className="modal__field">
                <label htmlFor="vender-precio">Precio que pagó (RD$)</label>
                <input id="vender-precio" className={`vender__monto ${erroresPrevio.precio ? 'input--error' : ''}`} type="number" inputMode="numeric" min={0}
                  value={precio} placeholder={String(tipo.price)} onChange={(e) => { setPrecio(e.target.value); cambiarPrevio('precio', 'pagado'); }} />
                {erroresPrevio.precio && <span className="field-error"><AlertCircle size={12} /> {erroresPrevio.precio}</span>}
              </div>
              <div className="modal__field">
                <label htmlFor="vender-pagado">Ya pagado (RD$)</label>
                <div className="neg__opciones">
                  <button type="button" className={`neg__opcion ${pagadoPrevio === 0 ? 'is-on' : ''}`} onClick={() => { setPagado(''); cambiarPrevio('pagado'); }}>Nada</button>
                  {precioPrevio > 0 && (
                    <button type="button" className={`neg__opcion ${pagadoPrevio === precioPrevio ? 'is-on' : ''}`}
                      onClick={() => { setPagado(String(precioPrevio)); cambiarPrevio('pagado'); }}>
                      Todo ({rd(precioPrevio)})
                    </button>
                  )}
                  <input id="vender-pagado" className={`vender__monto ${erroresPrevio.pagado ? 'input--error' : ''}`} type="number" inputMode="numeric" min={0}
                    value={pagado} onChange={(e) => { setPagado(e.target.value); cambiarPrevio('pagado'); }} placeholder="Otro monto" />
                </div>
                {erroresPrevio.pagado && <span className="field-error"><AlertCircle size={12} /> {erroresPrevio.pagado}</span>}
              </div>
              <p className="vender__resumen">
                {tomadas} de {tipo.sessions} sesiones tomadas · {tomadas >= tipo.sessions ? 'ya las tomó todas' : `le ${tipo.sessions - tomadas === 1 ? 'queda 1' : `quedan ${tipo.sessions - tomadas}`}`}
                {precioPrevio > 0 && <> · {pagadoPrevio >= precioPrevio ? 'pagado completo' : `debe ${rd(precioPrevio - Math.max(0, pagadoPrevio))}`}</>}
              </p>
            </>
          )}

          {tipo && !previo && (
            <>
              <div className="modal__field">
                <label htmlFor="vender-abono">Abona ahora (RD$)</label>
                <div className="neg__opciones">
                  <button type="button" className={`neg__opcion ${monto === 0 ? 'is-on' : ''}`} onClick={() => setAbono('')}>Nada</button>
                  {tipo.price > 0 && (
                    <>
                      <button type="button" className={`neg__opcion ${monto === Math.round(tipo.price / 2) ? 'is-on' : ''}`}
                        onClick={() => setAbono(String(Math.round(tipo.price / 2)))}>La mitad</button>
                      <button type="button" className={`neg__opcion ${monto === tipo.price ? 'is-on' : ''}`} onClick={() => setAbono(String(tipo.price))}>
                        Todo ({rd(tipo.price)})
                      </button>
                    </>
                  )}
                  <input id="vender-abono" className="vender__monto" type="number" inputMode="numeric" min={0} max={tipo.price}
                    value={abono} onChange={(e) => { setAbono(e.target.value); setError(null); }} placeholder="Otro monto" />
                </div>
              </div>
              {monto > 0 && (
                <fieldset className="modal__field neg__grupo">
                  <legend>Forma de pago</legend>
                  <div className="neg__opciones">
                    {METODOS_PAGO.map(([m, nombre]) => (
                      <button key={m} type="button" className={`neg__opcion ${metodo === m ? 'is-on' : ''}`} aria-pressed={metodo === m} onClick={() => setMetodo(m)}>
                        {nombre}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              <p className="vender__resumen">
                {tipo.sessions} sesiones de {tipo.serviceName} · {rd(Math.round(tipo.price / tipo.sessions))} cada una
                {tipo.price > 0 && <> · {monto >= tipo.price ? 'queda pagado' : `quedará debiendo ${rd(tipo.price - Math.max(0, monto))}`}</>}
              </p>
            </>
          )}

          <div className="modal__field">
            <label htmlFor="vender-notas">Notas <span className="neg__opc">(opcional)</span></label>
            <textarea id="vender-notas" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)}
              placeholder={previo ? 'Ej.: promoción de madres, zonas, lo que acordaron…' : 'Ej.: zona, promoción…'} />
          </div>

          {error && <p className="field-error" role="alert"><AlertCircle size={14} /> {error}</p>}

          <div className="modal__actions">
            <div style={{ flex: 1 }} />
            <button type="button" className="modal__cancel-btn" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="modal__submit-btn" disabled={guardando}>
              {previo ? (guardando ? 'Registrando…' : 'Registrar paquete') : (guardando ? 'Vendiendo…' : 'Vender')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
