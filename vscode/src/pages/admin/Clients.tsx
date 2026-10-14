import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Package, Plus, Search, Users } from 'lucide-react';
import { useClientStore, type Client } from '../../store/clientStore';
import { useAppointmentStore } from '../../store/appointmentStore';
import { useServiceStore } from '../../store/serviceStore';
import { fechaLocal } from '../../lib/fechas';
import FichaClienta from './clientes/FichaClienta';
import EditarClienta from './clientes/EditarClienta';
import { iniciales, listaDeClientas, resumenesPorClienta, type Filtro, type Orden } from './clientes/ficha';
import './Clients.css';

const FILTROS: [Filtro, string][] = [['todas', 'Todas'], ['cita', 'Con cita'], ['paquete', 'Con paquete'], ['alergia', 'Con alergias']];
const diaCorto = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-DO', { day: 'numeric', month: 'short' });

/**
 * Clientas: la lista y la ficha de cada una. En la tableta acostada (y la computadora) van lado a lado: se toca una y
 * su ficha se abre a la derecha. En el celular y la tableta parada, la ficha ocupa la pantalla y "Clientas" vuelve.
 */
export default function Clients() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { clients, loading, fetchClients } = useClientStore();
  const appointments = useAppointmentStore((s) => s.appointments);
  const clientPackages = useServiceStore((s) => s.clientPackages);

  // desde otra pantalla puede llegar con el nombre ya buscado
  const [texto, setTexto] = useState<string>(() => (location.state as { searchName?: string } | null)?.searchName ?? '');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [orden, setOrden] = useState<Orden>('recientes');
  /** la clienta cuyos datos se editan; 'nueva' para crear una */
  const [editando, setEditando] = useState<Client | 'nueva' | null>(null);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const hoy = fechaLocal();
  const resumenes = useMemo(() => resumenesPorClienta(appointments, hoy), [appointments, hoy]);
  const conPaquete = useMemo(
    () => new Set(clientPackages.filter((p) => p.status === 'active' && p.usedSessions < p.totalSessions).map((p) => p.clientId)),
    [clientPackages],
  );
  const lista = useMemo(
    () => listaDeClientas(clients, texto, filtro, orden, resumenes, conPaquete),
    [clients, texto, filtro, orden, resumenes, conPaquete],
  );
  const elegida = id ? clients.find((c) => c.id === id) : undefined;

  const abrir = (c: Client) => navigate(`/admin/clientes/${c.id}`);
  const volver = () => navigate('/admin/clientes');

  return (
    <div className={`clientas ${id ? 'clientas--con-ficha' : ''}`}>
      <div className="clientas__marco">
        <aside className="clientas__lista" aria-label="Lista de clientas">
          <div className="clientas__cabeza">
            <h1 className="clientas__titulo">Clientas</h1>
            <button type="button" className="ficha__btn ficha__btn--principal" onClick={() => setEditando('nueva')}>
              <Plus size={18} aria-hidden="true" /> Nueva
            </button>
          </div>

          <label className="clientas__buscar">
            <Search size={18} aria-hidden="true" />
            <span className="clientas__oculto">Buscar clienta</span>
            <input type="search" value={texto} placeholder="Nombre, teléfono o cédula" autoComplete="off" onChange={(e) => setTexto(e.target.value)} />
          </label>

          <div className="clientas__chips" role="group" aria-label="Filtrar">
            {FILTROS.map(([f, nombre]) => (
              <button key={f} type="button" aria-pressed={filtro === f} className={filtro === f ? 'is-on' : ''} onClick={() => setFiltro(f)}>
                {nombre}
              </button>
            ))}
          </div>

          <div className="clientas__filtros">
            <p className="clientas__cuenta" aria-live="polite">
              {lista.length === clients.length ? `${clients.length} registradas` : `${lista.length} de ${clients.length}`}
            </p>
            <label className="clientas__orden">
              <span className="clientas__oculto">Ordenar</span>
              <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)}>
                <option value="recientes">Las más nuevas</option>
                <option value="nombre">Por nombre</option>
                <option value="visita">Última visita</option>
              </select>
            </label>
          </div>

          {lista.length === 0 ? (
            <p className="clientas__nada">
              {loading && clients.length === 0 ? 'Cargando…' : texto ? `Ninguna clienta con “${texto.trim()}”.` : 'No hay clientas con ese filtro.'}
            </p>
          ) : (
            <ul className="clientas__filas">
              {lista.map((c) => {
                const r = resumenes.get(c.id);
                const linea = r?.enSala ? 'En sala ahora'
                  : r?.proxima ? `Próxima: ${r.proxima.date === hoy ? 'hoy' : diaCorto(r.proxima.date)}`
                  : r?.ultima ? `Última visita: ${diaCorto(r.ultima.date)}`
                  : 'Sin visitas todavía';
                return (
                  <li key={c.id}>
                    <button type="button" className={`clientas__fila ${c.id === id ? 'is-on' : ''}`} aria-current={c.id === id ? 'true' : undefined} onClick={() => abrir(c)}>
                      <span className="clientas__ini" aria-hidden="true">{iniciales(c.name)}</span>
                      <span className="clientas__fila-txt">
                        <b>{c.name}</b>
                        <span>{c.phone}</span>
                        <small>
                          {linea}
                          {conPaquete.has(c.id) && <span className="clientas__marca"><Package size={12} aria-hidden="true" /> Paquete</span>}
                          {c.allergies?.trim() && <span className="clientas__marca clientas__marca--alerta"><AlertTriangle size={12} aria-hidden="true" /> Alergias</span>}
                        </small>
                      </span>
                      <ChevronRight size={18} aria-hidden="true" className="clientas__flecha" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="clientas__detalle">
          {elegida ? (
            <FichaClienta key={elegida.id} clienta={elegida} onVolver={volver} onEditar={() => setEditando(elegida)} />
          ) : id ? (
            <p className="clientas__nada">{loading || clients.length === 0 ? 'Cargando…' : 'No encontramos esa clienta.'}</p>
          ) : (
            <div className="clientas__elige">
              <Users size={36} aria-hidden="true" />
              <p>Toca una clienta para ver su ficha: sus citas, sus paquetes y todo su historial.</p>
            </div>
          )}
        </section>
      </div>

      {editando && (
        <EditarClienta
          clienta={editando === 'nueva' ? null : editando}
          onCerrar={() => setEditando(null)}
          onGuardada={(c) => { setEditando(null); abrir(c); }}
          onVerOtra={(c) => { setEditando(null); abrir(c); }}
        />
      )}
    </div>
  );
}
