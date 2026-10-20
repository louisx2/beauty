import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CalendarPlus, CheckCheck, History, Play, StickyNote } from 'lucide-react';
import { useAgendarStore } from '../../store/agendarStore';
import { useAppointmentStore, type Appointment } from '../../store/appointmentStore';
import { useAuthStore } from '../../store/authStore';
import { useBlockStore } from '../../store/blockStore';
import { useClientStore } from '../../store/clientStore';
import { useClientHistoryStore } from '../../store/clientHistoryStore';
import { useServiceStore } from '../../store/serviceStore';
import { useStaffStore } from '../../store/staffStore';
import { format12h } from '../../lib/timeFormat';
import { notifyStatusChange } from '../../lib/whatsapp';
import { useAhora } from '../../lib/useAhora';
import { fechaTitulo } from '../../site/reservar/resumen';
import { nombreVisible } from '../../site/reservar/servicios';
import { nombreDeLinea, textoVez, vezDelServicio } from '../admin/clientes/record';
import HojaCita from '../admin/citas/HojaCita';
import { primerNombre } from '../admin/citas/proximaCita';
import { aHora, horasTexto, type Tramo } from '../admin/hoy/dia';
import { citasPorDia, cuadriculaDelDia, fechaCorta, type ColumnaAgenda } from '../admin/agenda/reglas';
import { ListaAgenda } from '../admin/agenda/Listas';
import { antesDeAtender, enSalaYSiguiente, misLineas, proximosDias, saludo, tiempoTranscurrido, type LineaMia } from './miDia';
import '../admin/agenda/Agenda.css';
import './SpecialistView.css';

const hora12 = (min: number) => format12h(aHora(min));
const fechaLargaCorta = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-DO', { day: 'numeric', month: 'short' }).replace('.', '');

/**
 * Mi día: lo de la especialista mientras trabaja. Quién está en su cabina (y desde cuándo) y quién sigue, con lo que
 * conviene saber de cada clienta antes de atenderla (alergias, piel, notas y lo que se le hizo la última vez); su día
 * con los huecos libres (tocar uno agenda ahí) y sus próximos días.
 */
export default function SpecialistView() {
  const { appointments, fetchAppointments, updateStatus, updateAppointment } = useAppointmentStore();
  const user = useAuthStore((s) => s.user);
  const { staff } = useStaffStore();
  const { clients, fetchClients } = useClientStore();
  const { porClienta, fetchHistorial } = useClientHistoryStore();
  const catalogo = useServiceStore((s) => s.services);
  const { blocks, fetchBlocks } = useBlockStore();
  const abrirAgendar = useAgendarStore((s) => s.abrir);
  const ahora = useAhora();
  const [abierta, setAbierta] = useState<string | null>(null);
  const [completando, setCompletando] = useState(false);
  const [nota, setNota] = useState('');
  const [ocupada, setOcupada] = useState(false);

  useEffect(() => {
    fetchAppointments();
    fetchClients();
    fetchBlocks().catch((e) => console.error('[mi día] bloqueos:', e));
    // por si la tableta queda abierta todo el día: se refresca cada minuto
    const iv = setInterval(fetchAppointments, 60_000);
    return () => clearInterval(iv);
  }, [fetchAppointments, fetchClients, fetchBlocks]);

  const nombre = user?.name ?? '';
  const yo = staff.find((m) => m.name.trim().toLowerCase() === nombre.trim().toLowerCase());
  const lineas = useMemo(() => misLineas(appointments, nombre, ahora.hoy), [appointments, nombre, ahora.hoy]);
  const { enSala, siguiente } = enSalaYSiguiente(lineas);

  // el historial previo de la que está en cabina y de la que sigue, para contar sus visitas y qué vez es cada servicio
  const idEnSala = enSala?.cita.client_id ?? null;
  const idSiguiente = siguiente?.cita.client_id ?? null;
  useEffect(() => {
    for (const id of [idEnSala, idSiguiente]) {
      if (id) fetchHistorial(id).catch((e) => console.error('[mi día] historial previo:', e));
    }
  }, [idEnSala, idSiguiente, fetchHistorial]);
  const porDia = useMemo(() => citasPorDia(appointments), [appointments]);
  const columna = useMemo(
    () => (yo ? cuadriculaDelDia(ahora.hoy, staff, porDia, blocks, ahora, yo.id).columnas[0] : undefined),
    [yo, ahora, staff, porDia, blocks],
  );
  const proximos = useMemo(() => proximosDias(appointments, nombre, ahora.hoy), [appointments, nombre, ahora.hoy]);
  const citasHoy = new Set(lineas.map((l) => l.cita.id));
  const hechas = new Set(lineas.filter((l) => l.cita.status === 'completed').map((l) => l.cita.id)).size;
  const cita = abierta ? appointments.find((c) => c.id === abierta) ?? null : null;

  const empezar = async (c: Appointment) => {
    setOcupada(true);
    const ok = await updateStatus(c.id, 'in_progress');
    setOcupada(false);
    if (ok) toast.success(`${c.clientName} en tu cabina`);
  };

  const completar = async (c: Appointment) => {
    setOcupada(true);
    try {
      if (nota.trim() && nota.trim() !== (c.notes ?? '').trim()) {
        const notas = c.notes?.trim() ? `${c.notes.trim()}\n${nota.trim()}` : nota.trim();
        await updateAppointment(c.id, { notes: notas });
      }
      // al completar se descuenta la sesión del paquete y se ofrece agendar la próxima (Agendar)
      if (await updateStatus(c.id, 'completed')) {
        notifyStatusChange(c, 'completed');
        setCompletando(false);
        setNota('');
      }
    } finally {
      setOcupada(false);
    }
  };

  const agendarEn = (col: ColumnaAgenda, t: Tramo) =>
    abrirAgendar({ modo: 'nueva', fecha: col.fecha, hora: aHora(t.inicio), empleada: col.empleada ?? undefined });

  /** Lo que conviene saber de la clienta antes de atenderla: con su historial previo, cuántas veces vino y qué vez es
   *  cada servicio suyo de esta cita. */
  const queSaber = (c: Appointment) => {
    const a = antesDeAtender(c, clients, appointments, c.client_id ? porClienta[c.client_id] : [], catalogo);
    // la primera vez que viene, todo es primera vez: no hace falta decirlo por servicio
    const veces = a.visitas === 0 ? [] : [...new Set(servicios(c).map((l) => nombreDeLinea({ serviceId: l.serviceId, serviceName: l.servicio }, catalogo)))];
    return (
      <div className="midia__saber">
        {a.alergias && <p className="midia__alergia"><AlertTriangle size={16} aria-hidden="true" /> Alergias: {a.alergias}</p>}
        <div className="midia__chips">
          {a.piel && <span>Piel {a.piel.toLowerCase()}</span>}
          <span>{a.visitas === 0 ? 'Primera vez' : a.visitas === 1 ? '1 visita antes' : `${a.visitas} visitas antes`}</span>
          {veces.map((nombre) => {
            const vez = vezDelServicio(a.record, nombre);
            return <span key={nombre}>{nombreVisible(nombre)}: {vez === 1 ? 'primera vez' : textoVez(vez)}</span>;
          })}
        </div>
        {a.ultimaPrevia ? (
          <p className="midia__ultima">
            <History size={15} aria-hidden="true" />
            <span>
              Última vez (historial previo), {fechaLargaCorta(a.ultimaPrevia.fecha!)}: {a.ultimaPrevia.servicio}
              {a.ultimaPrevia.especialista && <> con {primerNombre(a.ultimaPrevia.especialista)}</>}
              {a.ultimaPrevia.notas && <em> · “{a.ultimaPrevia.notas}”</em>}
            </span>
          </p>
        ) : a.ultima && (
          <p className="midia__ultima">
            <History size={15} aria-hidden="true" />
            <span>
              Última vez, {fechaLargaCorta(a.ultima.date)}: {a.ultima.service} con {primerNombre(a.ultima.employee)}
              {a.ultima.notes && <em> · “{a.ultima.notes}”</em>}
            </span>
          </p>
        )}
        {a.notas && <p className="midia__nota-ficha"><StickyNote size={15} aria-hidden="true" /> {a.notas}</p>}
        {c.notes && <p className="midia__nota-cita">Nota de la cita: {c.notes}</p>}
      </div>
    );
  };

  const servicios = (c: Appointment) => lineas.filter((l) => l.cita.id === c.id);
  const rango = (ls: LineaMia[]) => `${hora12(ls[0].inicio)} – ${hora12(ls[ls.length - 1].fin)}`;
  const faltan = siguiente ? siguiente.inicio - ahora.minutos : 0;

  return (
    <div className="midia">
      <header className="midia__cabeza">
        <div>
          <h1 className="midia__titulo">{saludo(ahora.minutos)}, {nombre.split(' ')[0]}</h1>
          <p className="midia__sub">
            {fechaTitulo(ahora.hoy)} · {citasHoy.size === 1 ? '1 cita' : `${citasHoy.size} citas`}
            {hechas > 0 && ` · ${hechas} ${hechas === 1 ? 'hecha' : 'hechas'}`}
            {columna?.minutosLibres ? ` · ${horasTexto(columna.minutosLibres)} libres` : ''}
          </p>
        </div>
        <button type="button" className="agenda__btn agenda__btn--principal" onClick={() => abrirAgendar({ modo: 'nueva', fecha: ahora.hoy, empleada: yo?.name })}>
          <CalendarPlus size={18} aria-hidden="true" /> Agendar cita
        </button>
      </header>

      <div className="midia__cuerpo">
        <div className="midia__ahora">
          {enSala && (
            <section className="midia__tarjeta midia__tarjeta--sala" aria-label="En tu cabina">
              <p className="midia__etiqueta">
                <span className="midia__punto" aria-hidden="true" /> En tu cabina
                {enSala.cita.startedAt && <> · {tiempoTranscurrido(enSala.cita.startedAt, Date.now())}</>}
              </p>
              <button type="button" className="midia__quien" onClick={() => setAbierta(enSala.cita.id)}>{enSala.cita.clientName}</button>
              <p className="midia__que">{servicios(enSala.cita).map((l) => l.servicio).join(' + ')} · {rango(servicios(enSala.cita))}</p>
              {queSaber(enSala.cita)}
              {completando ? (
                <div className="midia__completar">
                  <label className="midia__lbl" htmlFor="midia-nota">¿Algo que anotar de esta sesión? (opcional)</label>
                  <textarea id="midia-nota" rows={2} value={nota} autoFocus onChange={(e) => setNota(e.target.value)}
                    placeholder="Ej. sin reacción, usar menos intensidad la próxima…" />
                  <div className="midia__botones">
                    <button type="button" className="agenda__btn" onClick={() => { setCompletando(false); setNota(''); }}>Volver</button>
                    <button type="button" className="agenda__btn agenda__btn--principal" disabled={ocupada} onClick={() => completar(enSala.cita)}>
                      <CheckCheck size={18} aria-hidden="true" /> {ocupada ? 'Guardando…' : 'Completar'}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="agenda__btn agenda__btn--principal midia__principal" onClick={() => setCompletando(true)}>
                  <CheckCheck size={18} aria-hidden="true" /> Terminé: completar
                </button>
              )}
            </section>
          )}

          {siguiente && (
            <section className="midia__tarjeta" aria-label="La que sigue">
              <p className="midia__etiqueta">
                Sigue · {hora12(siguiente.inicio)}
                <em className={faltan <= 0 ? 'is-ya' : faltan <= 15 ? 'is-pronto' : ''}>
                  {faltan > 0 ? ` en ${horasTexto(faltan)}` : faltan === 0 ? ' ahora' : ` hace ${horasTexto(-faltan)}`}
                </em>
              </p>
              <button type="button" className="midia__quien" onClick={() => setAbierta(siguiente.cita.id)}>{siguiente.cita.clientName}</button>
              <p className="midia__que">
                {servicios(siguiente.cita).map((l) => l.servicio).join(' + ')} · {rango(servicios(siguiente.cita))}
                {siguiente.cita.status === 'pending' && <span className="midia__sin-confirmar"> · sin confirmar</span>}
              </p>
              {queSaber(siguiente.cita)}
              <button type="button" className="agenda__btn agenda__btn--principal midia__principal" disabled={!!enSala || ocupada}
                onClick={() => empezar(siguiente.cita)}>
                <Play size={18} aria-hidden="true" /> {enSala ? 'Termina la de tu cabina primero' : 'Llegó: empezar'}
              </button>
            </section>
          )}

          {!enSala && !siguiente && (
            <section className="midia__tarjeta midia__tarjeta--vacia">
              <p>{lineas.length === 0 ? 'Hoy no tienes citas.' : 'Ya no te quedan citas por hoy.'}</p>
              {proximos[0] && <p>La próxima: {fechaCorta(proximos[0].fecha)}, {hora12(proximos[0].lineas[0].inicio)} con {proximos[0].lineas[0].cita.clientName}.</p>}
            </section>
          )}
        </div>

        <div className="midia__lado">
          <section className="midia__seccion" aria-labelledby="midia-dia">
            <h2 id="midia-dia" className="midia__seccion-tit">Mi día</h2>
            {columna ? (
              <ListaAgenda columnas={[columna]} titulos={[{ titulo: 'Hoy', esHoy: true }]} porDia={false} ahora={ahora}
                onCita={(c) => setAbierta(c.id)} onLibre={agendarEn} onAgendarDia={() => {}} />
            ) : (
              <p className="midia__vacio">No encontramos tu horario en Equipo. Pídele a la administración que lo revise.</p>
            )}
          </section>

          {proximos.length > 0 && (
            <section className="midia__seccion" aria-labelledby="midia-proximos">
              <h2 id="midia-proximos" className="midia__seccion-tit">Próximos días</h2>
              <div className="midia__proximos">
                {proximos.map((d) => (
                  <div key={d.fecha} className="midia__proximo">
                    <p className="midia__proximo-dia">{fechaCorta(d.fecha)} · {d.lineas.length === 1 ? '1 cita' : `${d.lineas.length} citas`}</p>
                    <ol className="ag-li">
                      {d.lineas.map((l) => (
                        <li key={`${l.cita.id}-${l.inicio}`}>
                          <button type="button" className={`ag-li__cita ag-li__cita--${l.cita.status}`} onClick={() => setAbierta(l.cita.id)}>
                            <span className="ag-li__hora">{hora12(l.inicio)}</span>
                            <span className="ag-li__txt"><b>{l.cita.clientName}</b><span>{l.servicio}</span></span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {cita && <HojaCita cita={cita} onCerrar={() => setAbierta(null)} />}
    </div>
  );
}
