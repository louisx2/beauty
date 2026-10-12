import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarPlus, ChevronLeft, ChevronRight, Package, Plus, X } from 'lucide-react';
import { useAppointmentStore } from '../store/appointmentStore';
import { useAuthStore } from '../store/authStore';
import { useBlockStore } from '../store/blockStore';
import { useServiceStore } from '../store/serviceStore';
import { useStaffStore } from '../store/staffStore';
import { fechaLocal } from '../lib/fechas';
import { format12h } from '../lib/timeFormat';
import { notifyStatusChange } from '../lib/whatsapp';
import { quienPuede, type Elegido, type Horario } from '../site/reservar/disponibilidad';
import {
  etiquetaMes, flechasMes, flechasSemana, lunesDe, mesDeSemana, mesEnCuadricula, semana, sumarDias, sumarMeses,
  type Dia, type MesVisto,
} from '../site/reservar/calendario';
import { duracionTexto, fechaLarga, fechaTitulo, rangoHoras } from '../site/reservar/resumen';
import { cuposDelDia, elegidosDeCita, especialistasDeAgenda, horasDelDia, lineasDelPlan, primerNombre } from '../pages/admin/citas/proximaCita';
import './ProximaCita.css';

const INICIALES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * Agendar la próxima cita ahí mismo (al completar un servicio, o desde "Agendar próxima" en el menú de la cita):
 * lo mismo que se hizo, ya elegido, el calendario con las horas libres de cada día y un toque para agendar.
 */
export default function ProximaCita() {
  const cita = useAppointmentStore((s) => s.completedApptForNextSession);
  const cerrar = useAppointmentStore((s) => s.clearNextSessionPrompt);
  if (!cita) return null;
  return <Ventana key={cita.id} cerrar={cerrar} />;
}

function Ventana({ cerrar }: { cerrar: () => void }) {
  const cita = useAppointmentStore((s) => s.completedApptForNextSession)!;
  const { appointments, addAppointment } = useAppointmentStore();
  const user = useAuthStore((s) => s.user);
  const { staff } = useStaffStore();
  const { services, clientPackages } = useServiceStore();
  const { blocks, fetchBlocks } = useBlockStore();

  // una especialista solo puede agendarse a sí misma (así lo deja la base)
  const soloYo = user?.role === 'specialist' ? user.name : undefined;
  const especialistas = useMemo(() => especialistasDeAgenda(staff, soloYo), [staff, soloYo]);
  const [ahora] = useState(() => {
    const d = new Date();
    return { hoy: fechaLocal(d), minutos: d.getHours() * 60 + d.getMinutes() };
  });

  // hasta que se toque, lo que se hizo (así se completa aunque el equipo o los servicios lleguen después)
  const [propios, setPropios] = useState<Elegido[] | null>(null);
  const deLaCita = useMemo(() => elegidosDeCita(cita, services, especialistas), [cita, services, especialistas]);
  const elegidos = propios ?? deLaCita;
  const [dia, setDia] = useState('');
  const [hora, setHora] = useState('');
  const [notas, setNotas] = useState('');
  const [vista, setVista] = useState<'semana' | 'mes'>('semana');
  const [lunes, setLunes] = useState(() => lunesDe(ahora.hoy));
  const [mes, setMes] = useState<MesVisto>(() => mesDeSemana(lunesDe(ahora.hoy)));
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetchBlocks().catch((e) => console.error('[proxima cita] bloqueos:', e));
  }, [fetchBlocks]);

  const cupos = (iso: string) => cuposDelDia(elegidos, iso, especialistas, appointments, blocks, ahora);
  const horas: Horario[] = useMemo(
    () => (dia ? horasDelDia(elegidos, dia, especialistas, appointments, blocks, ahora) : []),
    [elegidos, dia, especialistas, appointments, blocks, ahora],
  );
  const elegida = horas.find((h) => h.hora === hora && h.plan);
  const duracionTotal = elegidos.reduce((t, e) => t + e.duracion, 0);

  // lo que le queda del paquete de alguno de estos servicios
  const paquetes = clientPackages.filter((p) =>
    p.clientId === cita.client_id && p.status === 'active' && p.usedSessions < p.totalSessions &&
    elegidos.some((e) => e.nombre.trim().toLowerCase() === p.serviceName.trim().toLowerCase()));

  const serviciosParaAgregar = services
    .filter((s) => s.active && !elegidos.some((e) => e.serviceId === s.id) && quienPuede(especialistas, s.id).length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const cambiarElegidos = (lista: Elegido[]) => { setPropios(lista); setHora(''); };
  const agregar = (id: string) => {
    const s = services.find((x) => x.id === id);
    if (s) cambiarElegidos([...elegidos, { serviceId: s.id, staffId: '', nombre: s.name, duracion: s.duration || 45 }]);
  };
  const elegirDia = (iso: string) => {
    setDia(iso);
    setHora('');
    if (vista === 'mes') { setLunes(lunesDe(iso)); setVista('semana'); }
  };

  const flechas = vista === 'semana' ? flechasSemana(lunes, ahora.hoy) : flechasMes(mes, ahora.hoy);
  const mover = (n: -1 | 1) => (vista === 'semana' ? setLunes((l) => sumarDias(l, 7 * n)) : setMes((m) => sumarMeses(m, n)));
  const alternarVista = () => {
    if (vista === 'semana') { setMes(mesDeSemana(lunes)); setVista('mes'); } else { setVista('semana'); }
  };

  const agendar = async () => {
    if (!elegida?.plan) return;
    setGuardando(true);
    try {
      const lineas = lineasDelPlan(elegida.plan, hora, services);
      const nueva = await addAppointment({
        client_id: cita.client_id,
        clientName: cita.clientName,
        clientPhone: cita.clientPhone,
        service: lineas.map((l) => l.serviceName).join(' + '),
        employee: lineas[0].employee,
        date: dia,
        time: hora,
        duration: duracionTotal,
        // la clienta la pidió en persona: queda confirmada
        status: 'confirmed',
        notes: notas.trim(),
        source: 'manual',
        services: lineas,
      });
      if (nueva) {
        toast.success(`Próxima cita de ${cita.clientName}: ${fechaLarga(dia)}, ${format12h(hora)}`);
        notifyStatusChange(nueva, 'confirmed');
        cerrar();
      } else {
        toast.error(useAppointmentStore.getState().lastError === 'conflict'
          ? 'Alguien tomó esa hora hace un momento. Elige otra.'
          : 'No se pudo agendar la cita. Intenta de nuevo.');
      }
    } finally {
      setGuardando(false);
    }
  };

  /** Lo que dice el día: "Cerrado", "Ya pasó", "Lleno" o cuántas horas libres tiene; `n` es null si no se puede elegir. */
  const estadoDia = (d: Dia): { n: number | null; texto: string } => {
    if (d.motivo === 'domingo') return { n: null, texto: 'Cerrado' };
    if (d.motivo) return { n: null, texto: '—' };
    const { libres, total } = cupos(d.iso);
    if (total === 0) return { n: null, texto: 'Ya pasó' };
    return { n: libres, texto: libres === 0 ? 'Lleno' : `${libres} libres` };
  };

  const botonDia = (d: Dia, clase: string, contenido: (e: { n: number | null; texto: string }) => React.ReactNode) => {
    const e = estadoDia(d);
    return (
      <button key={d.iso} type="button"
        className={`${clase} ${d.iso === dia ? 'is-on' : ''} ${d.esHoy ? 'is-hoy' : ''} ${e.n === 0 ? 'is-lleno' : ''}`}
        disabled={!e.n} aria-pressed={d.iso === dia}
        aria-label={`${fechaLarga(d.iso)}${d.esHoy ? ', hoy' : ''}: ${e.n ? `${e.n} horas libres` : e.texto === '—' ? 'no disponible' : e.texto.toLowerCase()}`}
        onClick={() => elegirDia(d.iso)}>
        {contenido(e)}
      </button>
    );
  };

  const manana = horas.filter((h) => h.hora < '12:00');
  const tarde = horas.filter((h) => h.hora >= '12:00');
  const grupo = (titulo: string, lista: Horario[]) => lista.length > 0 && (
    <div className="prox__grupo">
      <span className="prox__grupo-tit">{titulo}</span>
      <div className="prox__horas">
        {lista.map((h) => (
          <button key={h.hora} type="button" className={`prox__hora ${h.hora === hora ? 'is-on' : ''}`}
            disabled={!h.plan} aria-pressed={h.hora === hora} onClick={() => setHora(h.hora)}
            aria-label={h.plan ? `${format12h(h.hora)} con ${h.plan.map((l) => l.staff.name).join(' y ')}` : `${format12h(h.hora)}, ocupada`}>
            {format12h(h.hora)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={cerrar}>
      <div className="modal prox" role="dialog" aria-modal="true" aria-labelledby="prox-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2 id="prox-titulo">Agendar la próxima cita</h2>
            <p className="prox__sub">
              {cita.clientName}
              {cita.status === 'completed' && <> · terminó {cita.service}</>}
            </p>
          </div>
          <button className="modal__close" onClick={cerrar} aria-label="Cerrar"><X size={20} /></button>
        </div>

        <div className="prox__cuerpo">
          {paquetes.map((p) => (
            <p key={p.id} className="prox__paquete">
              <Package size={15} aria-hidden="true" />
              {p.packageName}: le {p.totalSessions - p.usedSessions === 1 ? 'queda 1 sesión' : `quedan ${p.totalSessions - p.usedSessions} sesiones`} de {p.totalSessions}
            </p>
          ))}

          <section className="prox__paso">
            <h3 className="prox__paso-tit">Qué se va a hacer</h3>
            {especialistas.length === 0 ? (
              <p className="prox__aviso">No encontramos tu horario en Equipo. Pídele a recepción que agende la cita.</p>
            ) : (
              <>
                <ul className="prox__servicios">
                  {elegidos.map((e, i) => {
                    const pueden = quienPuede(especialistas, e.serviceId);
                    return (
                      <li key={e.serviceId} className="prox__servicio">
                        <div className="prox__servicio-nom">
                          <b>{e.nombre}</b>
                          <span>{duracionTexto(e.duracion)}</span>
                        </div>
                        <select aria-label={`Quién hace ${e.nombre}`} value={e.staffId}
                          onChange={(ev) => cambiarElegidos(elegidos.map((x, j) => (j === i ? { ...x, staffId: ev.target.value } : x)))}>
                          {pueden.length > 1 && <option value="">Cualquiera disponible</option>}
                          {pueden.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                        {elegidos.length > 1 && (
                          <button type="button" className="prox__quitar" aria-label={`Quitar ${e.nombre}`}
                            onClick={() => cambiarElegidos(elegidos.filter((_, j) => j !== i))}>
                            <X size={15} />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {serviciosParaAgregar.length > 0 && (
                  <label className="prox__agregar">
                    <Plus size={15} aria-hidden="true" />
                    <select value="" onChange={(ev) => agregar(ev.target.value)} aria-label="Agregar otro servicio">
                      <option value="">{elegidos.length === 0 ? 'Elegir servicio' : 'Agregar otro servicio'}</option>
                      {serviciosParaAgregar.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </label>
                )}
              </>
            )}
          </section>

          {elegidos.length > 0 && (
            <section className="prox__paso">
              <div className="prox__cal-h">
                <h3 className="prox__paso-tit">Cuándo</h3>
                <div className="prox__cal-nav">
                  <button type="button" onClick={() => mover(-1)} disabled={!flechas.anterior}
                    aria-label={vista === 'semana' ? 'Semana anterior' : 'Mes anterior'}><ChevronLeft size={18} /></button>
                  <button type="button" className="prox__cal-mes" onClick={alternarVista}>
                    {etiquetaMes(vista === 'semana' ? mesDeSemana(lunes) : mes)}
                    <small>{vista === 'semana' ? 'Ver mes' : 'Ver semana'}</small>
                  </button>
                  <button type="button" onClick={() => mover(1)} disabled={!flechas.siguiente}
                    aria-label={vista === 'semana' ? 'Semana siguiente' : 'Mes siguiente'}><ChevronRight size={18} /></button>
                </div>
              </div>

              {vista === 'semana' ? (
                <div className="prox__semana" role="group" aria-label="Días de la semana">
                  {semana(lunes, ahora.hoy).map((d) => botonDia(d, 'prox__dia', (e) => (
                    <>
                      <small>{d.corto}</small>
                      <b>{d.numero}</b>
                      <em>{e.texto}</em>
                    </>
                  )))}
                </div>
              ) : (
                <div className="prox__mes" role="group" aria-label={etiquetaMes(mes)}>
                  {INICIALES.map((x, i) => <span key={`dow-${i}`} className="prox__mes-dow" aria-hidden="true">{x}</span>)}
                  {mesEnCuadricula(mes, ahora.hoy).map((d, i) => (d ? botonDia(d, 'prox__mdia', (e) => (
                    <>
                      <b>{d.numero}</b>
                      {!!e.n && <i aria-hidden="true">{e.n}</i>}
                    </>
                  )) : <span key={`h-${i}`} />))}
                </div>
              )}

              {!dia ? (
                <p className="prox__ayuda">Elige un día: debajo de cada uno dice cuántas horas libres tiene.</p>
              ) : (
                <div className="prox__dia-horas">
                  <p className="prox__dia-tit">{fechaTitulo(dia)}</p>
                  {horas.every((h) => !h.plan) ? (
                    <p className="prox__aviso">Ese día ya no hay un hueco donde quepa{elegidos.length > 1 ? 'n todos los servicios seguidos' : ''}. Prueba otro.</p>
                  ) : (
                    <>
                      {grupo('Mañana', manana)}
                      {grupo('Tarde', tarde)}
                    </>
                  )}
                </div>
              )}
            </section>
          )}

          {elegida && (
            <label className="modal__field prox__notas">
              <span>Nota (opcional)</span>
              <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej. sesión 4 de 6, traer exámenes…" />
            </label>
          )}
        </div>

        <div className="prox__pie">
          <p className="prox__resumen" aria-live="polite">
            {elegida?.plan ? (
              <>
                <CalendarPlus size={16} aria-hidden="true" />
                <span>
                  <b>{fechaLarga(dia)}, {rangoHoras(hora, duracionTotal)}</b>
                  {' · con '}{[...new Set(elegida.plan.map((l) => primerNombre(l.staff.name)))].join(' y ')}
                </span>
              </>
            ) : 'Elige el día y la hora'}
          </p>
          <div className="prox__botones">
            <button type="button" className="modal__cancel-btn" onClick={cerrar}>Ahora no</button>
            <button type="button" className="modal__submit-btn" disabled={!elegida || guardando} onClick={agendar}>
              {guardando ? 'Agendando…' : 'Agendar cita'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
