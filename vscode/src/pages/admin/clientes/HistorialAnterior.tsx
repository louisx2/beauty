import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertCircle, Calendar, Edit2, FileText, History, Plus, Sparkles, Trash2, User } from 'lucide-react';
import { useClientHistoryStore } from '../../../store/clientHistoryStore';
import { useServiceStore } from '../../../store/serviceStore';
import { useStaffStore } from '../../../store/staffStore';
import { atiendeClientas } from '../../../lib/quienAtiende';
import { fechaLocal } from '../../../lib/fechas';
import {
  FORM_HISTORIAL_VACIO, cambiosDeForm, formDeEntrada, ordenarHistorial, validarHistorial,
  type EntradaHistorial, type ErroresHistorial, type FormHistorial,
} from '../../../lib/historialAnterior';
import './HistorialAnterior.css';

const NUEVA = 'nueva';
const LISTA_SERVICIOS = 'hist-ant-servicios';
const LISTA_ESPECIALISTAS = 'hist-ant-especialistas';

function fechaVisible(fecha: string | null): string {
  if (!fecha) return 'Sin fecha';
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface FormularioProps {
  inicial: FormHistorial;
  guardando: boolean;
  onGuardar: (form: FormHistorial) => void;
  onCancelar: () => void;
}

function Formulario({ inicial, guardando, onGuardar, onCancelar }: FormularioProps) {
  const [form, setForm] = useState(inicial);
  const [errores, setErrores] = useState<ErroresHistorial>({});
  const hoy = fechaLocal();

  const cambiar = (campo: keyof FormHistorial, valor: string) => {
    setForm({ ...form, [campo]: valor });
    setErrores({ ...errores, [campo]: undefined });
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validarHistorial(form, hoy);
    if (Object.keys(errs).length > 0) {
      setErrores(errs);
      return;
    }
    onGuardar(form);
  };

  return (
    <form className="hist-ant__form" onSubmit={enviar} noValidate>
      <div className="modal__field">
        <label><Sparkles size={14} /> Servicio *</label>
        <input
          type="text"
          list={LISTA_SERVICIOS}
          placeholder="Ej. Limpieza facial profunda"
          value={form.servicio}
          onChange={(e) => cambiar('servicio', e.target.value)}
          className={errores.servicio ? 'input--error' : ''}
          autoFocus
        />
        {errores.servicio && <span className="field-error"><AlertCircle size={12} /> {errores.servicio}</span>}
      </div>
      <div className="modal__row">
        <div className="modal__field">
          <label><Calendar size={14} /> Fecha</label>
          <input
            type="date"
            max={hoy}
            value={form.fecha}
            onChange={(e) => cambiar('fecha', e.target.value)}
            className={errores.fecha ? 'input--error' : ''}
          />
          {errores.fecha && <span className="field-error"><AlertCircle size={12} /> {errores.fecha}</span>}
        </div>
        <div className="modal__field">
          <label><User size={14} /> Especialista</label>
          <input
            type="text"
            list={LISTA_ESPECIALISTAS}
            placeholder="Quién lo hizo"
            value={form.especialista}
            onChange={(e) => cambiar('especialista', e.target.value)}
          />
        </div>
      </div>
      <div className="modal__field">
        <label><FileText size={14} /> Notas</label>
        <textarea
          rows={2}
          placeholder="Productos, reacciones, sesión 2 de 6…"
          value={form.notas}
          onChange={(e) => cambiar('notas', e.target.value)}
        />
      </div>
      <div className="hist-ant__form-acciones">
        <button type="button" className="modal__cancel-btn" onClick={onCancelar} disabled={guardando}>Cancelar</button>
        <button type="submit" className="modal__submit-btn" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

/**
 * Historial anterior de la clienta, dentro de Clientas → Historial: lo que se le hizo antes de usar el sistema
 * (libreta, otro programa). Se agrega, se edita y se borra aquí mismo.
 */
export default function HistorialAnterior({ clientId }: { clientId: string }) {
  const { porClienta, fetchHistorial, addEntrada, updateEntrada, deleteEntrada } = useClientHistoryStore();
  const services = useServiceStore((s) => s.services);
  const staff = useStaffStore((s) => s.staff);
  const [falloCarga, setFalloCarga] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetchHistorial(clientId).catch((err) => {
      console.error(err);
      setFalloCarga(true);
      toast.error('No se pudo cargar el historial anterior');
    });
  }, [clientId, fetchHistorial]);

  const entradas = porClienta[clientId];
  const lista = useMemo(() => ordenarHistorial(entradas ?? []), [entradas]);

  // sugerencias para escribir igual que en el sistema; se puede escribir cualquier otra cosa
  const nombresServicios = useMemo(
    () => [...new Set(services.map((s) => s.name))].sort((a, b) => a.localeCompare(b, 'es')),
    [services],
  );
  const nombresEspecialistas = useMemo(
    () => staff.filter((m) => m.active && atiendeClientas(m)).map((m) => m.name),
    [staff],
  );

  const guardar = async (form: FormHistorial, entrada: EntradaHistorial | null) => {
    setGuardando(true);
    try {
      const cambios = cambiosDeForm(form);
      if (entrada) {
        await updateEntrada(entrada, cambios);
        toast.success('Historial actualizado');
      } else {
        await addEntrada(clientId, cambios);
        toast.success('Agregado al historial anterior');
      }
      setEditando(null);
    } catch (err) {
      console.error(err);
      toast.error('No se pudo guardar el historial');
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (entrada: EntradaHistorial) => {
    if (!window.confirm(`¿Borrar "${entrada.servicio}" (${fechaVisible(entrada.fecha)}) del historial anterior?`)) return;
    try {
      await deleteEntrada(entrada);
      toast.success('Borrado del historial');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo borrar');
    }
  };

  return (
    <div className="client-history-modal__section-block hist-ant">
      <h4 className="section-title">
        <History size={14} /> Historial anterior
        {editando !== NUEVA && (
          <button type="button" className="hist-ant__agregar" onClick={() => setEditando(NUEVA)}>
            <Plus size={14} /> Agregar
          </button>
        )}
      </h4>

      <datalist id={LISTA_SERVICIOS}>
        {nombresServicios.map((n) => <option key={n} value={n} />)}
      </datalist>
      <datalist id={LISTA_ESPECIALISTAS}>
        {nombresEspecialistas.map((n) => <option key={n} value={n} />)}
      </datalist>

      {editando === NUEVA && (
        <Formulario
          inicial={FORM_HISTORIAL_VACIO}
          guardando={guardando}
          onGuardar={(f) => guardar(f, null)}
          onCancelar={() => setEditando(null)}
        />
      )}

      {entradas === undefined ? (
        <p className="empty-text">{falloCarga ? 'No se pudo cargar el historial anterior.' : 'Cargando…'}</p>
      ) : lista.length === 0 ? (
        editando !== NUEVA && (
          <p className="empty-text">
            Todavía no tiene historial anterior. Toca "Agregar" para anotar lo que se le hizo antes de usar el sistema.
          </p>
        )
      ) : (
        <div className="history-timeline">
          {lista.map((e) => (
            <div key={e.id} className="history-timeline__item">
              <div className="history-timeline__dot hist-ant__dot" />
              <div className="history-timeline__date">{fechaVisible(e.fecha)}</div>
              {editando === e.id ? (
                <Formulario
                  inicial={formDeEntrada(e)}
                  guardando={guardando}
                  onGuardar={(f) => guardar(f, e)}
                  onCancelar={() => setEditando(null)}
                />
              ) : (
                <div className="history-timeline__details">
                  <div className="history-timeline__title-row">
                    <h5 className="history-timeline__service">{e.servicio}</h5>
                    <div className="hist-ant__acciones">
                      <button type="button" onClick={() => setEditando(e.id)} title="Editar" aria-label={`Editar ${e.servicio}`}>
                        <Edit2 size={13} />
                      </button>
                      <button type="button" className="hist-ant__borrar" onClick={() => borrar(e)} title="Borrar" aria-label={`Borrar ${e.servicio}`}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {e.especialista && (
                    <p className="history-timeline__meta"><span>Especialista: <strong>{e.especialista}</strong></span></p>
                  )}
                  {e.notas && <p className="history-timeline__notes hist-ant__notas">Nota: {e.notas}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
