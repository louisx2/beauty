import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useServiceStore, type PackagePayment } from '../../../store/serviceStore';
import { primerNombre } from '../citas/proximaCita';
import { METODOS_PAGO, NOMBRE_METODO, errorDelAbono } from './paquetes';

const rd = (n: number) => `RD$ ${n.toLocaleString('es-DO')}`;
const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' });

interface Props {
  /** el paquete vendido */
  id: string;
  onCerrar: () => void;
}

/** Lo que se ha pagado de un paquete y lo que falta, con su historial; y registrar un abono (cuánto y cómo). */
export default function AbonosPaquete({ id, onCerrar }: Props) {
  const { clientPackages, payments, fetchPayments, addPayment } = useServiceStore();
  const paquete = clientPackages.find((p) => p.id === id);
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState<PackagePayment['paymentMethod']>('cash');
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { fetchPayments(id); }, [id, fetchPayments]);

  if (!paquete) return null;
  const saldo = Math.max(0, paquete.totalPrice - paquete.amountPaid);
  const pagos = payments.filter((p) => p.packageId === id);

  const abonar = async (e: React.FormEvent) => {
    e.preventDefault();
    const cuanto = Number(monto);
    const err = errorDelAbono(cuanto, saldo);
    setError(err);
    if (err) return;
    setGuardando(true);
    const ok = await addPayment({ clientId: paquete.clientId, packageId: id, amount: cuanto, paymentMethod: metodo, notes: nota.trim() });
    setGuardando(false);
    if (!ok) return; // ya avisó
    toast.success(cuanto >= saldo ? `${primerNombre(paquete.clientName)} terminó de pagar` : `Abono de ${rd(cuanto)} anotado`);
    setMonto('');
    setNota('');
  };

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal abonos" role="dialog" aria-modal="true" aria-labelledby="abonos-tit" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2 id="abonos-tit">Pagos y abonos</h2>
            <p className="abonos__sub">{paquete.clientName} · {paquete.packageName}</p>
          </div>
          <button type="button" className="modal__close" onClick={onCerrar} aria-label="Cerrar"><X size={20} /></button>
        </div>

        <div className="modal__form">
          <dl className="abonos__cuentas">
            <div><dt>Precio</dt><dd>{rd(paquete.totalPrice)}</dd></div>
            <div><dt>Pagado</dt><dd>{rd(paquete.amountPaid)}</dd></div>
            <div className={saldo > 0 ? 'is-debe' : 'is-pagado'}><dt>{saldo > 0 ? 'Debe' : 'Saldo'}</dt><dd>{saldo > 0 ? rd(saldo) : 'Pagado'}</dd></div>
          </dl>

          {saldo > 0 ? (
            <form className="abonos__form" onSubmit={abonar} noValidate>
              <div className="modal__field">
                <label htmlFor="abono-monto">Abona (RD$)</label>
                <div className="neg__opciones">
                  <input id="abono-monto" className="vender__monto" type="number" inputMode="numeric" min={1} max={saldo} value={monto}
                    autoFocus onChange={(e) => { setMonto(e.target.value); setError(null); }} placeholder="Monto" />
                  <button type="button" className={`neg__opcion ${Number(monto) === saldo ? 'is-on' : ''}`} onClick={() => { setMonto(String(saldo)); setError(null); }}>
                    Todo lo que debe
                  </button>
                </div>
              </div>
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
              <div className="modal__field">
                <label htmlFor="abono-nota">Nota <span className="neg__opc">(opcional)</span></label>
                <input id="abono-nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Referencia de la transferencia, banco…" />
              </div>
              {error && <p className="field-error" role="alert"><AlertCircle size={14} /> {error}</p>}
              <button type="submit" className="modal__submit-btn" disabled={guardando}>{guardando ? 'Anotando…' : 'Anotar abono'}</button>
            </form>
          ) : (
            <p className="abonos__listo"><CheckCircle2 size={18} aria-hidden="true" /> Este paquete está pagado.</p>
          )}

          <section aria-labelledby="abonos-hist">
            <h3 id="abonos-hist" className="neg__seccion-tit">Historial</h3>
            {pagos.length === 0 ? (
              <p className="abonos__vacio">Todavía no hay abonos anotados{paquete.amountPaid > 0 ? ' (lo pagado al venderlo no quedó en el historial)' : ''}.</p>
            ) : (
              <ul className="abonos__lista">
                {pagos.map((p) => (
                  <li key={p.id}>
                    <span><b>{rd(p.amount)}</b><small>{fecha(p.createdAt)} · {NOMBRE_METODO[p.paymentMethod] ?? p.paymentMethod}</small></span>
                    {p.notes && <em>{p.notes}</em>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
