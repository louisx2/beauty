import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarOff, ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react';
import { useAgendarStore } from '../../../store/agendarStore';
import { useAppointmentStore, type Appointment } from '../../../store/appointmentStore';
import { useAuthStore } from '../../../store/authStore';
import { useBlockStore } from '../../../store/blockStore';
import { useStaffStore } from '../../../store/staffStore';
import { atiendeClientas } from '../../../lib/quienAtiende';
import { useAhora } from '../../../lib/useAhora';
import { lunesDe, sumarDias, sumarMeses, type MesVisto } from '../../../site/reservar/calendario';
import SaveClientModal from '../../../components/SaveClientModal';
import ScheduleBlocksModal from '../../../components/ScheduleBlocksModal';
import HojaCita from '../citas/HojaCita';
import { primerNombre } from '../citas/proximaCita';
import { aHora, type Tramo } from '../hoy/dia';
import {
  buscarCitas, citasPorDia, cuadriculaDeSemana, cuadriculaDelDia, diaCorto, diasDeSemana, horaDelToque, resumenDelMes,
  tituloDeRango, type ColumnaAgenda, type DiaDelMes, type Vista,
} from './reglas';
import Cuadricula, { type Titulo } from './Cuadricula';
import { ListaAgenda, ResultadosBusqueda } from './Listas';
import Mes from './Mes';
import './Agenda.css';

const VISTAS: [Vista, string][] = [['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes']];
const GUARDADO = 'anadsll-agenda';

/** Lo que cada equipo recuerda de la agenda (la vista y a quién se mira); si el navegador no deja, se empieza igual. */
function leerGuardado(): { vista?: Vista; especialista?: string | null } {
  try { return JSON.parse(localStorage.getItem(GUARDADO) ?? '{}'); } catch { return {}; }
}
function guardar(datos: { vista: Vista; especialista: string | null }) {
  try { localStorage.setItem(GUARDADO, JSON.stringify(datos)); } catch { /* sin guardar */ }
}

const mesDe = (fecha: string): MesVisto => {
  const [a, m] = fecha.split('-').map(Number);
  return { anio: a, mes: m - 1 };
};
const primeroDelMes = ({ anio, mes }: MesVisto) => `${anio}-${String(mes + 1).padStart(2, '0')}-01`;

/**
 * La agenda del salón: el día (una columna por especialista), la semana (un día por columna) o el mes (cuánto hay
 * y cuánto queda libre cada día), de todo el salón o de una especialista. Tocar un hueco agenda ahí; tocar una cita
 * abre su hoja. Buscar encuentra cualquier cita por clienta, teléfono o servicio. En el celular, en lista.
 */
export default function Agenda() {
  const location = useLocation();
  const navigate = useNavigate();
  const abrirAgendar = useAgendarStore((s) => s.abrir);
  const { appointments, fetchAppointments, autoMarkNoShow } = useAppointmentStore();
  const { staff } = useStaffStore();
  const { blocks, fetchBlocks } = useBlockStore();
  const user = useAuthStore((s) => s.user);
  const ahora = useAhora();

  useEffect(() => {
    fetchAppointments().then(() => autoMarkNoShow());
    fetchBlocks().catch((e) => console.error('[agenda] bloqueos:', e));
  }, [fetchAppointments, autoMarkNoShow, fetchBlocks]);

  const equipo = useMemo(() => staff.filter((m) => m.active && atiendeClientas(m)), [staff]);
  // una especialista solo ve su agenda
  const yo = user?.role === 'specialist' ? equipo.find((m) => m.name.trim().toLowerCase() === user.name.trim().toLowerCase()) : undefined;
  const soloSuya = user?.role === 'specialist';

  const [vista, setVista] = useState<Vista>(() => leerGuardado().vista ?? 'semana');
  const [elegida, setElegida] = useState<string | null>(() => leerGuardado().especialista ?? null);
  const especialista = soloSuya ? yo?.id ?? '—' : elegida && equipo.some((m) => m.id === elegida) ? elegida : null;
  const [fecha, setFecha] = useState(ahora.hoy);
  const [texto, setTexto] = useState('');
  const [abierta, setAbierta] = useState<string | null>(null);
  const [guardandoClienta, setGuardandoClienta] = useState<Appointment | null>(null);
  const [bloqueando, setBloqueando] = useState(false);

  useEffect(() => { guardar({ vista, especialista: elegida }); }, [vista, elegida]);

  // "Mañana" en Hoy abre ese día (?fecha=); una notificación, su cita para editarla (?highlight=); "Su agenda" en
  // Equipo, la semana de esa especialista (?con=)
  const pide = new URLSearchParams(location.search);
  const idPedido = pide.get('highlight');
  const fechaPedida = pide.get('fecha') ?? (idPedido ? appointments.find((a) => a.id === idPedido)?.date : undefined);
  const conPedida = pide.get('con');
  const [visto, setVisto] = useState<string | null>(null);
  if ((fechaPedida || conPedida) && location.search !== visto) {
    setVisto(location.search);
    if (conPedida) {
      setElegida(conPedida);
      setVista('semana');
      setFecha(ahora.hoy);
    }
    if (fechaPedida) {
      setVista('dia');
      setFecha(fechaPedida);
    }
  } else if (!location.search && visto) {
    setVisto(null);
  }
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('highlight');
    if (id) {
      const cita = appointments.find((a) => a.id === id);
      if (!cita && appointments.length === 0) return; // todavía no llegan las citas
      if (cita) abrirAgendar({ modo: 'editar', cita });
    }
    if (id || params.has('fecha') || params.has('con')) navigate('/admin/citas', { replace: true });
  }, [location.search, appointments, navigate, abrirAgendar]);

  const porDia = useMemo(() => citasPorDia(appointments), [appointments]);
  const lunes = lunesDe(fecha);
  const dias = useMemo(() => diasDeSemana(lunes, porDia), [lunes, porDia]);
  // el mes que se ve: su primer día (texto), y de ahí lo demás
  const primero = `${fecha.slice(0, 7)}-01`;

  const datos = useMemo(() => {
    if (vista === 'semana') return cuadriculaDeSemana(lunes, staff, porDia, blocks, ahora, especialista);
    if (vista === 'dia') return cuadriculaDelDia(fecha, staff, porDia, blocks, ahora, especialista);
    return null;
  }, [vista, lunes, fecha, staff, porDia, blocks, ahora, especialista]);

  const resumenMes = useMemo(() => {
    if (vista !== 'mes') return new Map<string, DiaDelMes>();
    const [a, m] = primero.split('-').map(Number);
    const total = new Date(a, m, 0).getDate();
    return resumenDelMes(Array.from({ length: total }, (_, i) => sumarDias(primero, i)), staff, porDia, blocks, ahora, especialista);
  }, [vista, primero, staff, porDia, blocks, ahora, especialista]);

  const encontradas = useMemo(() => {
    const todas = buscarCitas(appointments, texto, ahora.hoy);
    if (!soloSuya) return todas;
    const nombre = (user?.name ?? '').trim().toLowerCase();
    return todas.filter((c) => (c.services.length ? c.services.map((l) => l.employee) : [c.employee]).some((e) => e.trim().toLowerCase() === nombre));
  }, [appointments, texto, ahora.hoy, soloSuya, user?.name]);

  const mes = mesDe(primero);
  const cita = abierta ? appointments.find((c) => c.id === abierta) ?? null : null;

  const mover = (n: -1 | 1) => {
    if (vista === 'dia') setFecha(sumarDias(fecha, n));
    else if (vista === 'semana') setFecha(sumarDias(lunes, 7 * n));
    else setFecha(primeroDelMes(sumarMeses(mes, n)));
  };
  const verDia = (f: string) => { setFecha(f); setVista('dia'); setTexto(''); };
  const nombreDe = (id: string | null) => equipo.find((m) => m.id === id)?.name;

  const agendar = (f?: string, hora?: string, empleada?: string | null) => abrirAgendar({
    modo: 'nueva',
    fecha: f && f >= ahora.hoy ? f : undefined,
    hora,
    empleada: empleada ?? nombreDe(especialista) ?? undefined,
  });
  const enLibre = (col: ColumnaAgenda, t: Tramo) => agendar(col.fecha, aHora(t.inicio), col.empleada);
  const enVacio = (col: ColumnaAgenda, min: number) => agendar(col.fecha, aHora(horaDelToque(min, col.desde, col.hasta)));

  const titulos: Titulo[] = datos
    ? datos.columnas.map((col) => (vista === 'semana'
      ? { titulo: diaCorto(col.fecha), esHoy: col.fecha === ahora.hoy, onTocar: () => verDia(col.fecha) }
      : { titulo: col.empleada ? primerNombre(col.empleada) : 'Sin asignar', esHoy: false }))
    : [];

  const rango = tituloDeRango(vista, vista === 'mes' ? primeroDelMes(mes) : fecha, dias);
  const mirando = especialista ? nombreDe(especialista) : null;
  const cortos = equipo.map((m) => primerNombre(m.name));
  const nombreChip = (i: number) => (cortos.filter((x) => x === cortos[i]).length > 1 ? equipo[i].name : cortos[i]);
  const enEsteRango = vista === 'dia' ? fecha === ahora.hoy
    : vista === 'semana' ? lunes === lunesDe(ahora.hoy)
    : primeroDelMes(mes) === primeroDelMes(mesDe(ahora.hoy));

  return (
    <div className="agenda">
      <header className="agenda__cabeza">
        <div>
          <h1 className="agenda__titulo">{soloSuya ? 'Mi agenda' : 'Agenda'}</h1>
          <p className="agenda__sub">
            {rango}{mirando && !soloSuya ? ` · ${mirando}` : ''}
          </p>
        </div>
        <div className="agenda__botones">
          {!soloSuya && (
            <button type="button" className="agenda__btn" onClick={() => setBloqueando(true)}>
              <CalendarOff size={18} aria-hidden="true" /> Bloquear horario
            </button>
          )}
          <button type="button" className="agenda__btn agenda__btn--principal" onClick={() => agendar(vista === 'dia' ? fecha : undefined)}>
            <Plus size={18} aria-hidden="true" /> Agendar cita
          </button>
        </div>
      </header>

      <div className="agenda__barra">
        <div className="agenda__nav">
          <button type="button" className="agenda__flecha" onClick={() => mover(-1)} aria-label={vista === 'dia' ? 'Día anterior' : vista === 'semana' ? 'Semana anterior' : 'Mes anterior'}>
            <ChevronLeft size={20} />
          </button>
          <button type="button" className={`agenda__hoy ${enEsteRango ? 'is-on' : ''}`} onClick={() => setFecha(ahora.hoy)}>Hoy</button>
          <button type="button" className="agenda__flecha" onClick={() => mover(1)} aria-label={vista === 'dia' ? 'Día siguiente' : vista === 'semana' ? 'Semana siguiente' : 'Mes siguiente'}>
            <ChevronRight size={20} />
          </button>
          <input type="date" className="agenda__fecha" value={fecha} aria-label="Ir a una fecha"
            onChange={(e) => e.target.value && setFecha(e.target.value)} />
        </div>
        <div className="agenda__vistas" role="tablist" aria-label="Ver por">
          {VISTAS.map(([v, nombre]) => (
            <button key={v} type="button" role="tab" aria-selected={vista === v} className={vista === v ? 'is-on' : ''}
              onClick={() => { setVista(v); setTexto(''); }}>{nombre}</button>
          ))}
        </div>
        <label className="agenda__buscar">
          <Search size={18} aria-hidden="true" />
          <span className="agenda__oculto">Buscar una cita</span>
          <input type="search" value={texto} placeholder="Buscar cita: clienta, teléfono o servicio" autoComplete="off" onChange={(e) => setTexto(e.target.value)} />
          {texto && <button type="button" className="agenda__borrar" onClick={() => setTexto('')} aria-label="Borrar la búsqueda"><X size={16} /></button>}
        </label>
      </div>

      {!soloSuya && equipo.length > 1 && !texto && (
        <div className="agenda__personas" role="group" aria-label="De quién">
          <button type="button" aria-pressed={!especialista} className={!especialista ? 'is-on' : ''} onClick={() => setElegida(null)}>Todo el salón</button>
          {equipo.map((m, i) => (
            <button key={m.id} type="button" aria-pressed={especialista === m.id} className={especialista === m.id ? 'is-on' : ''} onClick={() => setElegida(m.id)}>
              {nombreChip(i)}
            </button>
          ))}
        </div>
      )}

      {texto.trim() ? (
        <ResultadosBusqueda citas={encontradas} texto={texto} hoy={ahora.hoy} onCita={(c) => setAbierta(c.id)} />
      ) : vista === 'mes' ? (
        <Mes mes={mes} hoy={ahora.hoy} resumen={resumenMes} onDia={verDia} />
      ) : datos && datos.columnas.length === 0 ? (
        <p className="agenda__vacio">{soloSuya ? 'No encontramos tu horario en Equipo.' : 'No hay especialistas en Equipo con servicios para atender.'}</p>
      ) : datos && (
        <>
          <div className="agenda__grilla">
            <Cuadricula datos={datos} titulos={titulos} ahora={ahora} conEmpleada={vista === 'semana' && !especialista}
              onCita={(c) => setAbierta(c.id)} onLibre={enLibre} onVacio={enVacio} />
          </div>
          <div className="agenda__lista">
            <ListaAgenda columnas={datos.columnas} titulos={titulos} porDia={vista === 'semana'} ahora={ahora}
              onCita={(c) => setAbierta(c.id)} onLibre={enLibre} onAgendarDia={(f) => agendar(f)} />
          </div>
        </>
      )}

      {cita && <HojaCita cita={cita} onCerrar={() => setAbierta(null)} onGuardarClienta={setGuardandoClienta} />}
      {guardandoClienta && <SaveClientModal appointment={guardandoClienta} onClose={() => setGuardandoClienta(null)} />}
      {bloqueando && <ScheduleBlocksModal defaultDate={vista === 'dia' ? fecha : ahora.hoy} onClose={() => setBloqueando(false)} />}
    </div>
  );
}
