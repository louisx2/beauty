import { useState } from 'react';
import toast from 'react-hot-toast';
import { AlertCircle, CalendarPlus, CheckCircle2, X } from 'lucide-react';
import { useServiceStore, type ClientPackage, type PackagePayment } from '../../../store/serviceStore';
import { useClientStore } from '../../../store/clientStore';
import { useAgendarStore } from '../../../store/agendarStore';
import { fechaLocal } from '../../../lib/fechas';
import ElegirClienta, { type ErroresNueva, type NuevaClienta } from '../agendar/ElegirClienta';
import { clientaDe, type ClientaAgenda } from '../agendar/reglas';
import { clientaConTelefono, validarNueva } from '../atender/atender';
import { primerNombre } from '../citas/proximaCita';
import { METODOS_PAGO, errorDelAbono } from './paquetes';

const rd = (n: number) => `RD$ ${n.toLocaleString('es-DO')}`;

interface Props {
  /** la clienta, si viene de su ficha */
  clienta?: string;
  /** el tipo de paquete, si se tocó "Vender" en uno */
  tipo?: string;
  onCerrar: () => void;
}

/** Vender un paquete: a quién (o una clienta nueva), cuál y cuánto abona ahora. Al terminar ofrece agendar la primera
 *  sesión ahí mismo. El abono queda en su historial de pagos, con la forma de pago. */
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

  const tipos = packages.filter((p) => p.active || p.id === tipoInicial);
  const tipo = packages.find((p) => p.id === tipoId);
  const monto = abono.trim() === '' ? 0 : Number(abono);

  const vender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienta && !nueva) return setError('Elige la clienta (o créala)');
    if (!tipo) return setError('Elige el paquete');
    if (monto > 0) {
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
      const nuevo = await sellPackage({
        clientId: quien.id, clientName: quien.nombre, packageId: tipo.id, packageName: tipo.name, serviceName: tipo.serviceName,
        totalSessions: tipo.sessions, usedSessions: 0, purchasedAt: fechaLocal(), notes: notas.trim(), totalPrice: tipo.price, amountPaid: 0,
      });
      if (!nuevo) {
        toast.error('No se pudo vender el paquete. Intenta de nuevo.');
        return;
      }
      if (monto > 0) {
        const ok = await addPayment({ clientId: quien.id, packageId: nuevo.id, amount: monto, paymentMethod: metodo, notes: 'Abono al comprar' });
        if (!ok) toast.error('El paquete se vendió, pero el abono no se anotó: regístralo en «Pagos y abonos».');
      }
      toast.success(`${tipo.name} vendido a ${primerNombre(quien.nombre)}`);
      setVendido(useServiceStore.getState().clientPackages.find((p) => p.id === nuevo.id) ?? nuevo);
    } finally {
      setGuardando(false);
    }
  };

  if (vendido) {
    return (
      <div className="modal-overlay" onClick={onCerrar}>
        <div className="modal vender" role="dialog" aria-modal="true" aria-labelledby="vender-tit" onClick={(e) => e.stopPropagation()}>
          <div className="vender__listo">
            <CheckCircle2 size={40} aria-hidden="true" />
            <h2 id="vender-tit">Listo, vendido</h2>
            <p>{vendido.packageName} para {vendido.clientName}: {vendido.totalSessions} sesiones
              {vendido.totalPrice - vendido.amountPaid > 0 ? `, debe ${rd(vendido.totalPrice - vendido.amountPaid)}.` : ', pagado completo.'}</p>
            <div className="vender__botones">
              <button type="button" className="modal__cancel-btn" onClick={onCerrar}>Más tarde</button>
              <button type="button" className="modal__submit-btn" onClick={() => { onCerrar(); abrirAgendar({ modo: 'paquete', paquete: vendido }); }}>
                <CalendarPlus size={18} aria-hidden="true" /> Agendar la primera sesión
              </button>
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
          <h2 id="vender-tit">Vender paquete</h2>
          <button type="button" className="modal__close" onClick={onCerrar} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <form className="modal__form" onSubmit={vender} noValidate>
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
                    onClick={() => { setTipoId(t.id); setError(null); }}>
                    <b>{t.name}</b>
                    <span>{t.sessions} sesiones · {rd(t.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          {tipo && (
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
            <textarea id="vender-notas" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej.: zona, promoción…" />
          </div>

          {error && <p className="field-error" role="alert"><AlertCircle size={14} /> {error}</p>}

          <div className="modal__actions">
            <div style={{ flex: 1 }} />
            <button type="button" className="modal__cancel-btn" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="modal__submit-btn" disabled={guardando}>{guardando ? 'Vendiendo…' : 'Vender'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
