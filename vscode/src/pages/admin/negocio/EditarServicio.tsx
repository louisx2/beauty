import { useState } from 'react';
import toast from 'react-hot-toast';
import { AlertCircle, AlertTriangle, X } from 'lucide-react';
import { useServiceStore, type Service, type ServiceCategory } from '../../../store/serviceStore';
import { useStaffStore } from '../../../store/staffStore';
import { CATEGORIAS } from '../agendar/reglas';
import { ORDEN_CATEGORIAS, cambiosDeEquipo, comoLoHace, conItbis, erroresDelServicio, quienesAtienden, type ErroresServicio } from './catalogo';

const DURACIONES = [15, 30, 45, 60, 90, 120];
const rd = (n: number) => `RD$ ${n.toLocaleString('es-DO')}`;

interface Props {
  /** null: uno nuevo */
  servicio: Service | null;
  /** la categoría que se estaba viendo, para empezar uno nuevo ahí */
  categoria: ServiceCategory | null;
  onCerrar: () => void;
}

/** Crear o cambiar un servicio: nombre, categoría, duración, precio (con o sin ITBIS) y quién lo hace (eso se guarda
 *  en la ficha de cada una del equipo, igual que desde Equipo). */
export default function EditarServicio({ servicio, categoria, onCerrar }: Props) {
  const { services, addService, updateService } = useServiceStore();
  const { staff, updateStaff } = useStaffStore();
  const equipo = quienesAtienden(staff);

  const [nombre, setNombre] = useState(servicio?.name ?? '');
  const [cat, setCat] = useState<ServiceCategory>(servicio?.category ?? categoria ?? 'facial');
  const [duracion, setDuracion] = useState(String(servicio?.duration ?? 60));
  const [precio, setPrecio] = useState(servicio ? String(servicio.price) : '');
  const [itbis, setItbis] = useState(servicio?.taxable ?? false);
  const [descripcion, setDescripcion] = useState(servicio?.description ?? '');
  const [porSesiones, setPorSesiones] = useState(servicio?.hasSession ?? false);
  const [activo, setActivo] = useState(servicio?.active ?? true);
  const [elegidas, setElegidas] = useState<string[]>(() =>
    equipo.filter((m) => comoLoHace(m, servicio?.id ?? null) !== 'no').map((m) => m.id));
  const [errores, setErrores] = useState<ErroresServicio>({});
  const [guardando, setGuardando] = useState(false);

  const minutos = Number(duracion);
  const monto = Number(precio);
  const loHaraAlguien = elegidas.length > 0;

  const marcar = (id: string) => setElegidas((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = erroresDelServicio({ name: nombre, duration: minutos, price: precio.trim() === '' ? 0 : monto }, services, servicio?.id ?? null);
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;
    setGuardando(true);
    const datos = {
      name: nombre.trim().replace(/\s+/g, ' '), category: cat, description: descripcion.trim(), duration: minutos,
      price: precio.trim() === '' ? 0 : monto, taxable: itbis, hasSession: porSesiones, active: activo,
    };
    let id = servicio?.id ?? null;
    if (servicio) {
      if (!(await updateService(servicio.id, datos))) { setGuardando(false); return; }
    } else {
      const nuevo = await addService(datos);
      if (!nuevo) { setGuardando(false); return; }
      id = nuevo.id;
    }
    // quién lo hace: se guarda en la ficha de cada una
    const sinGuardar: string[] = [];
    for (const c of cambiosDeEquipo(id!, staff, elegidas)) {
      try { await updateStaff(c.id, { serviceIds: c.serviceIds }); }
      catch { sinGuardar.push(staff.find((m) => m.id === c.id)?.name ?? ''); }
    }
    setGuardando(false);
    if (sinGuardar.length > 0) {
      toast.error(`El servicio se guardó, pero no se pudo anotar en la ficha de ${sinGuardar.join(', ')}. Hazlo desde Equipo.`);
    } else {
      toast.success(servicio ? 'Servicio guardado' : `${datos.name} creado`);
    }
    onCerrar();
  };

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal modal--wide servf" role="dialog" aria-modal="true" aria-labelledby="servf-tit" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 id="servf-tit">{servicio ? 'Editar servicio' : 'Nuevo servicio'}</h2>
          <button type="button" className="modal__close" onClick={onCerrar} aria-label="Cerrar"><X size={20} /></button>
        </div>

        <form className="modal__form" onSubmit={guardar} noValidate>
          <div className="modal__field">
            <label htmlFor="servf-nombre">Nombre</label>
            <input id="servf-nombre" value={nombre} autoFocus={!servicio} placeholder="Ej.: Depilación Láser - Piernas"
              className={errores.name ? 'input--error' : ''} aria-invalid={!!errores.name}
              onChange={(e) => { setNombre(e.target.value); setErrores({ ...errores, name: undefined }); }} />
            {errores.name && <span className="field-error"><AlertCircle size={12} /> {errores.name}</span>}
          </div>

          <fieldset className="modal__field neg__grupo">
            <legend>Categoría</legend>
            <div className="neg__opciones">
              {ORDEN_CATEGORIAS.map((c) => (
                <button key={c} type="button" className={`neg__opcion ${cat === c ? 'is-on' : ''}`} aria-pressed={cat === c} onClick={() => setCat(c)}>
                  {CATEGORIAS[c]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="modal__field neg__grupo">
            <legend>Duración</legend>
            <div className="neg__opciones">
              {DURACIONES.map((d) => (
                <button key={d} type="button" className={`neg__opcion ${minutos === d ? 'is-on' : ''}`} aria-pressed={minutos === d}
                  onClick={() => { setDuracion(String(d)); setErrores({ ...errores, duration: undefined }); }}>
                  {d < 60 ? `${d} min` : d % 60 ? `${Math.floor(d / 60)} h ${d % 60}` : `${d / 60} h`}
                </button>
              ))}
              <label className="servf__otra">
                <span className="neg__oculto">Otra duración, en minutos</span>
                <input type="number" inputMode="numeric" min={5} max={600} step={5} value={duracion}
                  className={errores.duration ? 'input--error' : ''} aria-invalid={!!errores.duration}
                  onChange={(e) => { setDuracion(e.target.value); setErrores({ ...errores, duration: undefined }); }} />
                <span aria-hidden="true">min</span>
              </label>
            </div>
            {errores.duration && <span className="field-error"><AlertCircle size={12} /> {errores.duration}</span>}
          </fieldset>

          <div className="modal__row">
            <div className="modal__field">
              <label htmlFor="servf-precio">Precio (RD$)</label>
              <input id="servf-precio" type="number" inputMode="numeric" min={0} value={precio} placeholder="Ej.: 2500"
                className={errores.price ? 'input--error' : ''} aria-invalid={!!errores.price}
                onChange={(e) => { setPrecio(e.target.value); setErrores({ ...errores, price: undefined }); }} />
              {errores.price && <span className="field-error"><AlertCircle size={12} /> {errores.price}</span>}
            </div>
            <div className="modal__field">
              <span className="neg__etq">Impuesto</span>
              <label className={`neg__casilla ${itbis ? 'is-on' : ''}`}>
                <input type="checkbox" checked={itbis} onChange={(e) => setItbis(e.target.checked)} />
                <span>Lleva ITBIS (18 %)<small>{itbis && monto > 0 ? `${rd(conItbis(monto))} con ITBIS` : 'Exento'}</small></span>
              </label>
            </div>
          </div>

          <div className="modal__field">
            <label htmlFor="servf-desc">Descripción <span className="neg__opc">(opcional)</span></label>
            <textarea id="servf-desc" rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Lo que conviene saber al ofrecerlo" />
          </div>

          <fieldset className="modal__field neg__grupo">
            <legend>¿Quién lo hace?</legend>
            {equipo.length === 0 ? (
              <p className="neg__aviso">Todavía no hay especialistas en Equipo.</p>
            ) : (
              <div className="neg__casillas">
                {equipo.map((m) => {
                  const como = comoLoHace(m, servicio?.id ?? null);
                  const fija = como === 'todos' || como === 'unico';
                  const on = fija || elegidas.includes(m.id);
                  return (
                    <label key={m.id} className={`neg__casilla ${on ? 'is-on' : ''} ${fija ? 'is-fija' : ''}`}>
                      <input type="checkbox" checked={on} disabled={fija} onChange={() => marcar(m.id)} />
                      <span>
                        {m.name}
                        {como === 'todos' && <small>Hace todos los servicios</small>}
                        {como === 'unico' && <small>Es lo único que hace: se cambia en Equipo</small>}
                        {!fija && m.role === 'admin' && <small>Administración</small>}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            {!loHaraAlguien && activo && (
              <p className="neg__aviso"><AlertTriangle size={16} aria-hidden="true" /> Si nadie lo hace, no se podrá agendar.</p>
            )}
          </fieldset>

          <div className="neg__casillas">
            <label className={`neg__casilla ${activo ? 'is-on' : ''}`}>
              <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
              <span>Activo<small>{activo ? 'Se puede agendar y reservar en la web' : 'No sale para agendar ni en la web'}</small></span>
            </label>
            <label className={`neg__casilla ${porSesiones ? 'is-on' : ''}`}>
              <input type="checkbox" checked={porSesiones} onChange={(e) => setPorSesiones(e.target.checked)} />
              <span>Se hace por sesiones<small>Sale primero al crear un paquete</small></span>
            </label>
          </div>

          <div className="modal__actions">
            <div style={{ flex: 1 }} />
            <button type="button" className="modal__cancel-btn" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="modal__submit-btn" disabled={guardando}>
              {guardando ? 'Guardando…' : servicio ? 'Guardar cambios' : 'Crear servicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
