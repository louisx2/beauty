import { useState } from 'react';
import toast from 'react-hot-toast';
import { AlertCircle, X } from 'lucide-react';
import { useServiceStore, type SessionPackage } from '../../../store/serviceStore';
import { erroresDelTipo, type ErroresTipo } from './paquetes';

const rd = (n: number) => `RD$ ${n.toLocaleString('es-DO')}`;
const SESIONES = [4, 5, 6, 8, 10];

interface Props {
  /** null: uno nuevo */
  tipo: SessionPackage | null;
  onCerrar: () => void;
}

/** Crear o cambiar un tipo de paquete: de qué servicio, cuántas sesiones y cuánto cuesta (y cuánto sale cada sesión
 *  frente a pagarla suelta). Lo que ya se vendió no cambia. */
export default function EditarTipoPaquete({ tipo, onCerrar }: Props) {
  const { packages, services, addPackage, updatePackage } = useServiceStore();
  const [nombre, setNombre] = useState(tipo?.name ?? '');
  const [servicioId, setServicioId] = useState(tipo?.serviceId ?? '');
  const [sesiones, setSesiones] = useState(String(tipo?.sessions ?? 6));
  const [precio, setPrecio] = useState(tipo ? String(tipo.price) : '');
  const [activo, setActivo] = useState(tipo?.active ?? true);
  const [errores, setErrores] = useState<ErroresTipo>({});
  const [guardando, setGuardando] = useState(false);

  const servicio = services.find((s) => s.id === servicioId);
  const n = Number(sesiones);
  const monto = Number(precio);
  const porSesion = n > 0 && monto > 0 ? Math.round(monto / n) : 0;
  const ahorro = servicio && servicio.price > 0 && porSesion > 0 ? Math.round((1 - porSesion / servicio.price) * 100) : 0;
  // primero los que se hacen por sesiones; los inactivos solo si es el que ya tenía
  const opciones = services
    .filter((s) => s.active || s.id === servicioId)
    .sort((a, b) => Number(b.hasSession) - Number(a.hasSession) || a.name.localeCompare(b.name, 'es'));
  const porSesiones = opciones.filter((s) => s.hasSession);
  const otros = opciones.filter((s) => !s.hasSession);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = erroresDelTipo({ name: nombre, serviceId: servicioId, sessions: n, price: precio.trim() === '' ? NaN : monto }, packages, tipo?.id ?? null);
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;
    setGuardando(true);
    const datos = { name: nombre.trim().replace(/\s+/g, ' '), serviceId: servicioId, serviceName: servicio?.name ?? '', sessions: n, price: monto, active: activo };
    const ok = tipo ? await updatePackage(tipo.id, datos) : await addPackage(datos);
    setGuardando(false);
    if (!ok) return;
    toast.success(tipo ? 'Paquete guardado' : `${datos.name} creado`);
    onCerrar();
  };

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ptipo-tit" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 id="ptipo-tit">{tipo ? 'Editar tipo de paquete' : 'Nuevo tipo de paquete'}</h2>
          <button type="button" className="modal__close" onClick={onCerrar} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <form className="modal__form" onSubmit={guardar} noValidate>
          <div className="modal__field">
            <label htmlFor="ptipo-serv">Servicio</label>
            <select id="ptipo-serv" value={servicioId} className={errores.serviceId ? 'input--error' : ''}
              onChange={(e) => {
                const s = services.find((x) => x.id === e.target.value);
                setServicioId(e.target.value);
                setErrores({ ...errores, serviceId: undefined });
                // un nombre de partida si todavía no tiene
                if (s && !nombre.trim()) setNombre(`${s.name} x${n || 6}`);
              }}>
              <option value="">Elegir servicio</option>
              {porSesiones.length > 0 && <optgroup label="Por sesiones">{porSesiones.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>}
              {otros.length > 0 && <optgroup label={porSesiones.length ? 'Los demás' : 'Servicios'}>{otros.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>}
            </select>
            {errores.serviceId && <span className="field-error"><AlertCircle size={12} /> {errores.serviceId}</span>}
          </div>

          <fieldset className="modal__field neg__grupo">
            <legend>Sesiones</legend>
            <div className="neg__opciones">
              {SESIONES.map((s) => (
                <button key={s} type="button" className={`neg__opcion ${n === s ? 'is-on' : ''}`} aria-pressed={n === s}
                  onClick={() => { setSesiones(String(s)); setErrores({ ...errores, sessions: undefined }); }}>{s}</button>
              ))}
              <input className="vender__monto" type="number" inputMode="numeric" min={2} max={50} value={sesiones} aria-label="Otra cantidad de sesiones"
                onChange={(e) => { setSesiones(e.target.value); setErrores({ ...errores, sessions: undefined }); }} />
            </div>
            {errores.sessions && <span className="field-error"><AlertCircle size={12} /> {errores.sessions}</span>}
          </fieldset>

          <div className="modal__field">
            <label htmlFor="ptipo-precio">Precio del paquete (RD$)</label>
            <input id="ptipo-precio" type="number" inputMode="numeric" min={0} value={precio} placeholder="Ej.: 9000"
              className={errores.price ? 'input--error' : ''} onChange={(e) => { setPrecio(e.target.value); setErrores({ ...errores, price: undefined }); }} />
            {errores.price && <span className="field-error"><AlertCircle size={12} /> {errores.price}</span>}
            {porSesion > 0 && (
              <span className="ptipo__calculo">
                {rd(porSesion)} por sesión{servicio && servicio.price > 0 && (ahorro > 0 ? ` · ahorra ${ahorro} % (suelta cuesta ${rd(servicio.price)})` : ` · suelta cuesta ${rd(servicio.price)}`)}
              </span>
            )}
          </div>

          <div className="modal__field">
            <label htmlFor="ptipo-nombre">Nombre</label>
            <input id="ptipo-nombre" value={nombre} placeholder="Ej.: Láser axilas x6" className={errores.name ? 'input--error' : ''}
              onChange={(e) => { setNombre(e.target.value); setErrores({ ...errores, name: undefined }); }} />
            {errores.name && <span className="field-error"><AlertCircle size={12} /> {errores.name}</span>}
          </div>

          <label className={`neg__casilla ${activo ? 'is-on' : ''}`}>
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
            <span>Se vende<small>{activo ? 'Sale al vender un paquete' : 'No sale al vender; lo ya vendido sigue igual'}</small></span>
          </label>

          {tipo && <p className="evend__nota">A los paquetes ya vendidos no les cambian las sesiones ni el precio.</p>}

          <div className="modal__actions">
            <div style={{ flex: 1 }} />
            <button type="button" className="modal__cancel-btn" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="modal__submit-btn" disabled={guardando}>{guardando ? 'Guardando…' : tipo ? 'Guardar' : 'Crear paquete'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
