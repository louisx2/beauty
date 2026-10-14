import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle, ArrowLeft, CalendarPlus, ChevronDown, Edit2, History, MessageCircle, Package, Phone, Plus, ShoppingBag, Trash2,
} from 'lucide-react';
import { useAgendarStore } from '../../../store/agendarStore';
import { useAppointmentStore, type Appointment } from '../../../store/appointmentStore';
import { useClientHistoryStore } from '../../../store/clientHistoryStore';
import { useClientStore, type Client } from '../../../store/clientStore';
import { useServiceStore } from '../../../store/serviceStore';
import { fechaLocal } from '../../../lib/fechas';
import { format12h } from '../../../lib/timeFormat';
import { ETIQUETA_ESTADO } from '../../../lib/estadosCita';
import MenuAcciones from '../../../components/MenuAcciones';
import { accionPrincipal } from '../citas/acciones';
import { ICONO_PRINCIPAL, useAccionesCita } from '../citas/useAccionesCita';
import { primerNombre } from '../citas/proximaCita';
import { clientaDe } from '../agendar/reglas';
import HistorialAnterior from './HistorialAnterior';
import {
  citasDeClienta, historialCompleto, iniciales, paquetesDeClienta, proximasCitas, resumenDeClienta, type Renglon,
} from './ficha';
import './Ficha.css';

type Pestana = 'todo' | 'sistema' | 'antes';
const HISTORIAL_VISIBLE = 8;

const dinero = (n: number) => `RD$ ${n.toLocaleString('es-DO')}`;
const fecha = (iso: string, opciones: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-DO', opciones).replace(/[.,]/g, '').replace(' de ', ' ');
const esteAno = String(new Date().getFullYear());
/** "22 sep"; de otro año, "14 jun 2025" */
const fechaCorta = (iso: string) => fecha(iso, iso.startsWith(esteAno) ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
/** "Vie 16 oct" */
const diaCorto = (iso: string) => {
  const t = fecha(iso, { weekday: 'short', day: 'numeric', month: 'short' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

interface Props {
  clienta: Client;
  onVolver: () => void;
  onEditar: () => void;
}

/**
 * La ficha de la clienta: todo lo suyo en un solo lugar. Arriba quién es (con sus alergias a la vista) y lo que se hace
 * con ella: agendar, escribirle, llamarla. Debajo, sus citas por venir, sus paquetes (lo que le queda y lo que falta
 * pagar), sus notas y su historial completo: lo del sistema y lo anotado de antes.
 */
export default function FichaClienta({ clienta, onVolver, onEditar }: Props) {
  const navigate = useNavigate();
  const abrirAgendar = useAgendarStore((s) => s.abrir);
  const { appointments, updateAppointment } = useAppointmentStore();
  const clientPackages = useServiceStore((s) => s.clientPackages);
  const deleteClient = useClientStore((s) => s.deleteClient);
  const { porClienta, fetchHistorial } = useClientHistoryStore();
  const [pestana, setPestana] = useState<Pestana>('todo');
  const [anotarDeAntes, setAnotarDeAntes] = useState(false);
  const [verTerminados, setVerTerminados] = useState(false);
  /** cuántos renglones del historial se ven (los más recientes primero) */
  const [cuantos, setCuantos] = useState(HISTORIAL_VISIBLE);
  const hoy = fechaLocal();

  useEffect(() => {
    fetchHistorial(clienta.id).catch((e) => console.error('[ficha] historial anterior:', e));
  }, [clienta.id, fetchHistorial]);

  const suyas = useMemo(() => citasDeClienta(appointments, clienta), [appointments, clienta]);
  const resumen = useMemo(() => resumenDeClienta(suyas, hoy), [suyas, hoy]);
  const proximas = useMemo(() => proximasCitas(suyas, hoy), [suyas, hoy]);
  const paquetes = useMemo(() => paquetesDeClienta(clientPackages, clienta.id), [clientPackages, clienta.id]);
  const historial = useMemo(() => historialCompleto(suyas, porClienta[clienta.id] ?? [], hoy), [suyas, porClienta, clienta.id, hoy]);
  const activos = paquetes.filter((p) => p.activo);
  const terminados = paquetes.filter((p) => !p.activo);
  const renglones = pestana === 'sistema' ? historial.filter((r) => r.tipo === 'cita') : historial;

  const acciones = useAccionesCita({
    editar: (c) => abrirAgendar({ modo: 'editar', cita: c }),
    reprogramar: (c) => abrirAgendar({ modo: 'reprogramar', cita: c }),
    // una reserva con su teléfono que no quedó enlazada: se enlaza a esta ficha
    guardarClienta: async (c) => {
      if (await updateAppointment(c.id, { client_id: clienta.id })) toast.success(`La cita quedó en la ficha de ${clienta.name}`);
    },
  });

  const telefono = clienta.phone.replace(/\D/g, '').slice(-10);
  const whatsapp = `https://wa.me/1${telefono}?text=${encodeURIComponent(`Hola ${primerNombre(clienta.name)}, te escribimos de Anadsll Beauty Esthetic.`)}`;
  const agendar = () => abrirAgendar({ modo: 'nueva', clienta: clientaDe(clienta) });

  const eliminar = async () => {
    const aviso = suyas.length || paquetes.length
      ? `Tiene ${suyas.length} cita${suyas.length === 1 ? '' : 's'} y ${paquetes.length} paquete${paquetes.length === 1 ? '' : 's'}. `
      : '';
    if (!window.confirm(`¿Eliminar a ${clienta.name}? ${aviso}No se puede deshacer.`)) return;
    if (await deleteClient(clienta.id)) onVolver();
  };

  const cita = (c: Appointment) => {
    const paso = accionPrincipal(c.status);
    return (
      <li key={c.id} className="ficha__cita">
        <div className="ficha__cita-cuando">
          <b>{c.date === hoy ? 'Hoy' : diaCorto(c.date)}</b>
          <span>{format12h(c.time)}</span>
        </div>
        <div className="ficha__cita-que">
          <b>{c.service}</b>
          <span>con {primerNombre(c.employee)} · <em className={`ficha__estado ficha__estado--${c.status}`}>{ETIQUETA_ESTADO[c.status]}</em></span>
        </div>
        <div className="ficha__cita-acciones">
          {paso && (
            <button type="button" className="ficha__btn ficha__btn--chico" onClick={() => acciones.avanzar(c, paso)}>
              {ICONO_PRINCIPAL[paso.accion]} {paso.etiqueta}
            </button>
          )}
          <MenuAcciones etiqueta={`Más acciones para la cita del ${diaCorto(c.date)}`} items={acciones.itemsDe(c)} />
        </div>
      </li>
    );
  };

  const renglon = (r: Renglon) => {
    if (r.tipo === 'antes') {
      const e = r.entrada;
      return (
        <div key={`antes-${e.id}`} className="history-timeline__item">
          <div className="history-timeline__dot ficha__punto-antes" />
          <div className="history-timeline__date">{e.fecha ? fechaCorta(e.fecha) : 'Sin fecha'}</div>
          <div className="history-timeline__details">
            <div className="history-timeline__title-row">
              <h5 className="history-timeline__service">{e.servicio}</h5>
              <span className="timeline-status ficha__de-antes">De antes</span>
            </div>
            {e.especialista && <p className="history-timeline__meta"><span>con <strong>{e.especialista}</strong></span></p>}
            {e.notas && <p className="history-timeline__notes">{e.notas}</p>}
          </div>
        </div>
      );
    }
    const c = r.cita;
    return (
      <div key={c.id} className="history-timeline__item">
        <div className={`history-timeline__dot history-timeline__dot--${c.status}`} />
        <div className="history-timeline__date">{c.date === hoy ? 'Hoy' : fechaCorta(c.date)}</div>
        <div className="history-timeline__details">
          <div className="history-timeline__title-row">
            <h5 className="history-timeline__service">{c.service}</h5>
            <span className={`timeline-status timeline-status--${c.status}`}>{ETIQUETA_ESTADO[c.status]}</span>
          </div>
          <p className="history-timeline__meta">
            <span>con <strong>{c.employee}</strong></span>
            <span>{format12h(c.time)}</span>
          </p>
          {c.notes && <p className="history-timeline__notes">{c.notes}</p>}
        </div>
      </div>
    );
  };

  return (
    <article className="ficha" aria-labelledby="ficha-nombre">
      <button type="button" className="ficha__volver" onClick={onVolver}>
        <ArrowLeft size={18} aria-hidden="true" /> Clientas
      </button>

      <header className="ficha__cabeza">
        <div className="ficha__quien">
          <span className="ficha__ini" aria-hidden="true">{iniciales(clienta.name)}</span>
          <div className="ficha__quien-txt">
            <h2 id="ficha-nombre" className="ficha__nombre">{clienta.name}</h2>
            <p className="ficha__sub">
              {clienta.phone || 'Sin teléfono'} · clienta desde {fecha(clienta.created_at.slice(0, 10), { month: 'long', year: 'numeric' })}
            </p>
            <div className="ficha__chips">
              {clienta.allergies?.trim()
                ? <span className="ficha__chip ficha__chip--alerta"><AlertTriangle size={14} aria-hidden="true" /> Alergias: {clienta.allergies}</span>
                : <span className="ficha__chip">Sin alergias anotadas</span>}
              {clienta.skin_type && <span className="ficha__chip">Piel {clienta.skin_type.toLowerCase()}</span>}
            </div>
          </div>
        </div>
        <div className="ficha__botones">
          <button type="button" className="ficha__btn ficha__btn--principal" onClick={agendar}>
            <CalendarPlus size={18} aria-hidden="true" /> Agendar
          </button>
          {telefono.length === 10 && (
            <>
              <a className="ficha__btn" href={whatsapp} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={18} aria-hidden="true" /> WhatsApp
              </a>
              <a className="ficha__btn ficha__btn--icono" href={`tel:${telefono}`} aria-label={`Llamar a ${clienta.name}`}>
                <Phone size={18} aria-hidden="true" />
              </a>
            </>
          )}
          <button type="button" className="ficha__btn ficha__btn--icono" onClick={onEditar} aria-label="Editar sus datos">
            <Edit2 size={18} aria-hidden="true" />
          </button>
          <MenuAcciones etiqueta={`Más acciones para ${clienta.name}`} items={[
            { id: 'vender', etiqueta: 'Vender paquete', icono: <ShoppingBag size={16} aria-hidden="true" />, onSelect: () => navigate('/admin/paquetes', { state: { vender: clienta.id } }) },
            { id: 'eliminar', etiqueta: 'Eliminar clienta', icono: <Trash2 size={16} aria-hidden="true" />, peligro: true, onSelect: eliminar },
          ]} />
        </div>
      </header>

      <dl className="ficha__numeros">
        <div><dt>Visitas</dt><dd>{resumen.visitas}</dd></div>
        <div><dt>Última</dt><dd>{resumen.ultima ? fechaCorta(resumen.ultima.date) : '—'}</dd></div>
        <div><dt>Próxima</dt><dd>{resumen.proxima ? (resumen.proxima.date === hoy ? `Hoy ${format12h(resumen.proxima.time)}` : diaCorto(resumen.proxima.date)) : '—'}</dd></div>
        <div><dt>No vino</dt><dd className={resumen.noVino > 0 ? 'ficha__ojo' : ''}>{resumen.noVino}</dd></div>
      </dl>

      <div className="ficha__cuerpo">
        <div className="ficha__col">
          {resumen.enSala && (
            <section className="ficha__tarjeta ficha__tarjeta--sala" aria-label="En sala ahora">
              <h3 className="ficha__tit">En sala ahora</h3>
              <ul className="ficha__citas">{cita(resumen.enSala)}</ul>
            </section>
          )}

          <section className="ficha__tarjeta" aria-labelledby="ficha-proximas">
            <h3 id="ficha-proximas" className="ficha__tit">Próximas citas</h3>
            {proximas.length === 0 ? (
              <p className="ficha__vacio">
                No tiene citas por venir.{' '}
                <button type="button" className="ficha__enlace" onClick={agendar}>Agendarle una</button>
              </p>
            ) : (
              <ul className="ficha__citas">{proximas.map(cita)}</ul>
            )}
          </section>

          <section className="ficha__tarjeta" aria-labelledby="ficha-paquetes">
            <h3 id="ficha-paquetes" className="ficha__tit">Paquetes</h3>
            {activos.length === 0 && <p className="ficha__vacio">No tiene paquetes activos.</p>}
            <ul className="ficha__paquetes">
              {[...activos, ...(verTerminados ? terminados : [])].map(({ paquete: p, quedan, saldo, activo }) => (
                <li key={p.id} className={`ficha__paquete ${activo ? '' : 'ficha__paquete--terminado'}`}>
                  <div className="ficha__paquete-cab">
                    <Package size={16} aria-hidden="true" />
                    <b>{p.packageName}</b>
                    {!activo && <span className="ficha__estado ficha__estado--completed">{p.status === 'cancelled' ? 'Cancelado' : 'Terminado'}</span>}
                  </div>
                  <div className="ficha__puntos" aria-hidden="true">
                    {Array.from({ length: p.totalSessions }, (_, i) => <i key={i} className={i < p.usedSessions ? 'is-usada' : ''} />)}
                  </div>
                  <p className="ficha__paquete-txt">
                    Usó {p.usedSessions} de {p.totalSessions}{activo && <> · le {quedan === 1 ? 'queda 1' : `quedan ${quedan}`}</>}
                    {saldo > 0 && <span className="ficha__saldo"> · falta pagar {dinero(saldo)}</span>}
                  </p>
                  {(activo || saldo > 0) && (
                    <div className="ficha__paquete-botones">
                      {activo && (
                        <button type="button" className="ficha__btn ficha__btn--chico" onClick={() => abrirAgendar({ modo: 'paquete', paquete: p })}>
                          <CalendarPlus size={16} aria-hidden="true" /> Agendar sesión
                        </button>
                      )}
                      {saldo > 0 && (
                        <button type="button" className="ficha__btn ficha__btn--chico" onClick={() => navigate('/admin/paquetes', { state: { pagos: p.id } })}>
                          Registrar abono
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {terminados.length > 0 && (
              <button type="button" className="ficha__enlace" aria-expanded={verTerminados} onClick={() => setVerTerminados(!verTerminados)}>
                <ChevronDown size={16} aria-hidden="true" className={verTerminados ? 'ficha__girado' : ''} />
                {verTerminados ? 'Ocultar los terminados' : `Ver los terminados (${terminados.length})`}
              </button>
            )}
          </section>

          <section className="ficha__tarjeta" aria-labelledby="ficha-notas">
            <div className="ficha__tit-fila">
              <h3 id="ficha-notas" className="ficha__tit">Notas y datos</h3>
              <button type="button" className="ficha__enlace" onClick={onEditar}>Editar</button>
            </div>
            <p className={clienta.notes ? 'ficha__notas' : 'ficha__vacio'}>{clienta.notes || 'Sin notas.'}</p>
            <dl className="ficha__datos">
              {clienta.cedula && <div><dt>Cédula</dt><dd>{clienta.cedula}</dd></div>}
              {clienta.email && <div><dt>Correo</dt><dd>{clienta.email}</dd></div>}
              <div><dt>Llegó por</dt><dd>{clienta.source === 'web' ? 'La página web' : 'El salón'}</dd></div>
            </dl>
          </section>
        </div>

        <section className="ficha__tarjeta ficha__historial" aria-labelledby="ficha-historial">
          <div className="ficha__tit-fila">
            <h3 id="ficha-historial" className="ficha__tit"><History size={15} aria-hidden="true" /> Historial</h3>
            <div className="ficha__pestanas" role="tablist" aria-label="Qué mostrar del historial">
              {([['todo', 'Todo'], ['sistema', 'En el sistema'], ['antes', 'De antes']] as const).map(([id, nombre]) => (
                <button key={id} type="button" role="tab" aria-selected={pestana === id} className={pestana === id ? 'is-on' : ''}
                  onClick={() => { setPestana(id); setAnotarDeAntes(false); }}>
                  {nombre}
                </button>
              ))}
            </div>
          </div>

          {pestana === 'antes' ? (
            <HistorialAnterior key={`${clienta.id}-${anotarDeAntes}`} clientId={clienta.id} abrirNueva={anotarDeAntes} />
          ) : (
            <>
              {renglones.length === 0 ? (
                <p className="ficha__vacio">Todavía no hay nada en su historial.</p>
              ) : (
                <div className="history-timeline ficha__linea">{renglones.slice(0, cuantos).map(renglon)}</div>
              )}
              {renglones.length > cuantos && (
                <button type="button" className="ficha__btn ficha__btn--chico ficha__mas" onClick={() => setCuantos(cuantos + 20)}>
                  Ver más ({renglones.length - cuantos})
                </button>
              )}
              <button type="button" className="ficha__enlace" onClick={() => { setPestana('antes'); setAnotarDeAntes(true); }}>
                <Plus size={16} aria-hidden="true" /> Anotar algo de antes (de la libreta u otro sistema)
              </button>
            </>
          )}
        </section>
      </div>
    </article>
  );
}
