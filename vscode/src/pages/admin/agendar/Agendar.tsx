import { useEffect, useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { CalendarPlus, ChevronLeft, ChevronRight, Package, Trash2, Undo2, X } from 'lucide-react';
import { useAgendarStore } from '../../../store/agendarStore';
import { useAppointmentStore, type Appointment, type AppointmentLine } from '../../../store/appointmentStore';
import { useAuthStore } from '../../../store/authStore';
import { useBlockStore } from '../../../store/blockStore';
import { useClientStore } from '../../../store/clientStore';
import { useServiceStore } from '../../../store/serviceStore';
import { useStaffStore } from '../../../store/staffStore';
import { fechaLocal } from '../../../lib/fechas';
import { format12h } from '../../../lib/timeFormat';
import { notifyRescheduled, notifyStatusChange } from '../../../lib/whatsapp';
import { timeToMinutes, type Elegido, type Horario } from '../../../site/reservar/disponibilidad';
import {
  etiquetaMes, flechasMes, flechasSemana, lunesDe, lunesParaMes, mesAcotado, mesDeSemana, mesEnCuadricula, semana, sumarDias,
  sumarMeses, type Dia, type MesVisto,
} from '../../../site/reservar/calendario';
import { fechaLarga, fechaTitulo, rangoHoras } from '../../../site/reservar/resumen';
import { cuposDelDia, elegidosDeCita, especialistasDeAgenda, horasDelDia, lineasDelPlan, primerNombre } from '../citas/proximaCita';
import { clientaConTelefono, nuevaLista, paquetesQueUsa, validarNueva } from '../atender/atender';
import {
  conEspecialista, conHoraPedida, elegidosDelPaquete, estadoAlGuardar, planALas, sesionDelPaquete, sinLaCita,
  type ClientaAgenda, type PedidoAgendar,
} from './reglas';
import ElegirClienta, { type ErroresNueva, type NuevaClienta } from './ElegirClienta';
import ServiciosElegidos from './ServiciosElegidos';
import './Ventana.css';
import './Agendar.css';

const INICIALES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const CERRADAS = new Set(['in_progress', 'completed', 'cancelled', 'no_show']);

const TITULO: Record<PedidoAgendar['modo'], string> = {
  nueva: 'Nueva cita', editar: 'Editar cita', reprogramar: 'Reprogramar cita', paquete: 'Agendar sesión', proxima: 'Agendar la próxima cita',
};
const BOTON: Record<PedidoAgendar['modo'], string> = {
  nueva: 'Agendar cita', editar: 'Guardar cambios', reprogramar: 'Mover la cita', paquete: 'Agendar sesión', proxima: 'Agendar cita',
};

const fechaHora = (dia: string, hora: string) => `${fechaLarga(dia)}, ${format12h(hora)}`;

/**
 * Agendar: la misma ventana para dar una cita (por teléfono, en persona, en un hueco de Hoy), cambiarla,
 * reprogramarla, agendar la sesión de un paquete o la próxima al terminar. Siempre con el calendario de las horas
 * libres de verdad (la regla de /reservar): nunca se ofrece una hora en la que no cabe la visita completa.
 */
export default function Agendar() {
  const pedido = useAgendarStore((s) => s.pedido);
  const vez = useAgendarStore((s) => s.vez);
  const cerrar = useAgendarStore((s) => s.cerrar);
  if (!pedido) return null;
  return <Ventana key={vez} pedido={pedido} cerrar={cerrar} />;
}

function Ventana({ pedido, cerrar }: { pedido: PedidoAgendar; cerrar: () => void }) {
  const { appointments, addAppointment, updateAppointment, deleteAppointment } = useAppointmentStore();
  const user = useAuthStore((s) => s.user);
  const { staff } = useStaffStore();
  const { services, packages, clientPackages } = useServiceStore();
  const { clients, fetchClients, addClient } = useClientStore();
  const { blocks, fetchBlocks } = useBlockStore();

  const { modo } = pedido;
  const cita: Appointment | null = 'cita' in pedido ? pedido.cita : null;
  /** la cita ya existe y se cambia (no se crea otra) */
  const cambiando = modo === 'editar' || modo === 'reprogramar';
  // una que ya empezó o se cerró no se mueve de día ni de hora (se le pueden cambiar los servicios o la nota)
  const cuandoFijo = cambiando && !!cita && CERRADAS.has(cita.status);

  // una especialista solo puede agendarse a sí misma (así lo deja la base)
  const soloYo = user?.role === 'specialist' ? user.name : undefined;
  const especialistas = useMemo(() => especialistasDeAgenda(staff, soloYo), [staff, soloYo]);
  const [ahora] = useState(() => {
    const d = new Date();
    return { hoy: fechaLocal(d), minutos: d.getHours() * 60 + d.getMinutes() };
  });
  // la cita que se está moviendo no se estorba a sí misma
  const citas = useMemo(() => sinLaCita(appointments, cambiando ? cita?.id : null), [appointments, cambiando, cita?.id]);

  // ── La clienta ──────────────────────────────────────────────────────────
  const [clienta, setClienta] = useState<ClientaAgenda | null>(() => {
    if (pedido.modo === 'nueva') return pedido.clienta?.id ? pedido.clienta : null;
    if (pedido.modo === 'paquete') return { id: pedido.paquete.clientId, nombre: pedido.paquete.clientName, telefono: '' };
    return { id: pedido.cita.client_id, nombre: pedido.cita.clientName, telefono: pedido.cita.clientPhone };
  });
  // la que llegó sin ficha y se agenda para más tarde: su ficha se crea al agendar
  const [nueva, setNueva] = useState<NuevaClienta | null>(() =>
    (pedido.modo === 'nueva' && pedido.clienta && !pedido.clienta.id ? { nombre: pedido.clienta.nombre, telefono: pedido.clienta.telefono } : null));
  const [erroresNueva, setErroresNueva] = useState<ErroresNueva>({});
  const clientaFija = modo === 'reprogramar' || modo === 'paquete' || modo === 'proxima';
  const ficha = clienta?.id ? clients.find((c) => c.id === clienta.id) : undefined;
  const telefono = clienta?.telefono || ficha?.phone || '';
  const clientaLista = !!clienta || (!!nueva && nuevaLista(nueva, clients));

  // ── Qué se va a hacer ───────────────────────────────────────────────────
  // hasta que se toque, lo que trae el pedido (así se completa aunque los servicios o el equipo lleguen después)
  const [propios, setPropios] = useState<Elegido[] | null>(null);
  const delPedido = useMemo((): Elegido[] => {
    switch (pedido.modo) {
      case 'nueva': return pedido.servicios ?? [];
      case 'paquete': return elegidosDelPaquete(pedido.paquete, packages, services, especialistas, appointments);
      case 'proxima': return elegidosDeCita(pedido.cita, services, especialistas);
      default: return elegidosDeCita(pedido.cita, services, especialistas, true);
    }
  }, [pedido, packages, services, especialistas, appointments]);
  const elegidos = propios ?? delPedido;
  const tocoServicios = propios !== null;
  const duracionTotal = elegidos.reduce((t, e) => t + e.duracion, 0);
  const empleadaPedida = pedido.modo === 'nueva' ? pedido.empleada : undefined;

  // ── Cuándo ──────────────────────────────────────────────────────────────
  // lo que pidió quien abrió la ventana: el hueco de Hoy, o el día y la hora que ya tiene la cita
  const pedida = useMemo(() => {
    if (cita && cambiando) return { dia: cita.date, hora: cita.time };
    if (pedido.modo !== 'nueva' || !pedido.fecha || pedido.fecha < ahora.hoy) return { dia: '', hora: '' };
    const hora = pedido.hora && (pedido.fecha > ahora.hoy || timeToMinutes(pedido.hora) >= ahora.minutos) ? pedido.hora : '';
    return { dia: pedido.fecha, hora };
  }, [cita, cambiando, pedido, ahora]);
  const [dia, setDia] = useState(pedida.dia);
  const [hora, setHora] = useState(pedida.hora);
  const [vista, setVista] = useState<'semana' | 'mes'>('semana');
  const [lunes, setLunes] = useState(() => lunesDe(pedida.dia && pedida.dia >= ahora.hoy ? pedida.dia : ahora.hoy));
  const [mes, setMes] = useState<MesVisto>(() => mesDeSemana(lunes));
  const mismoHorario = !!cita && cambiando && dia === cita.date && hora === cita.time;
  /** al cambiarla sin tocar ni la hora ni los servicios, se guardan solo la clienta y la nota */
  const soloDatos = cambiando && mismoHorario && !tocoServicios;

  const horas: Horario[] = useMemo(() => {
    if (!dia || cuandoFijo || dia < ahora.hoy) return [];
    const lista = horasDelDia(elegidos, dia, especialistas, citas, blocks, ahora);
    return dia === pedida.dia && pedida.hora
      ? conHoraPedida(lista, pedida.hora, planALas(elegidos, dia, pedida.hora, especialistas, citas, blocks))
      : lista;
  }, [elegidos, dia, cuandoFijo, especialistas, citas, blocks, ahora, pedida]);
  const plan = useMemo(() => {
    if (!dia || !hora || elegidos.length === 0) return null;
    if (cuandoFijo) return planALas(elegidos, dia, hora, especialistas, citas, blocks);
    return horas.find((h) => h.hora === hora)?.plan ?? null;
  }, [dia, hora, elegidos, cuandoFijo, especialistas, citas, blocks, horas]);

  // ── Nota ────────────────────────────────────────────────────────────────
  const sesion = pedido.modo === 'paquete' ? sesionDelPaquete(pedido.paquete, appointments, ahora.hoy) : null;
  const [notas, setNotas] = useState(() => {
    if (cita && cambiando) return cita.notes ?? '';
    if (pedido.modo === 'paquete' && sesion) {
      const { totalSessions: total, packageName } = pedido.paquete;
      return sesion.numero <= total ? `Sesión ${sesion.numero} de ${total} · ${packageName}` : packageName;
    }
    return '';
  });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchBlocks().catch((e) => console.error('[agendar] bloqueos:', e));
  }, [fetchClients, fetchBlocks]);

  // los paquetes de la clienta que cubren lo que se va a hacer (al completar la cita se descuenta la sesión)
  const paquetes = pedido.modo === 'paquete' ? [] : paquetesQueUsa(clientPackages, clienta?.id ?? null, elegidos);

  const cambiarElegidos = (lista: Elegido[]) => setPropios(lista);
  const elegirDia = (iso: string) => {
    setDia(iso);
    // al volver al día que tenía, vuelve a su hora; en otro día, se elige de nuevo
    setHora(iso === pedida.dia ? pedida.hora : '');
  };
  const comoEstaba = () => {
    setDia(pedida.dia);
    setHora(pedida.hora);
    setLunes(lunesDe(pedida.dia >= ahora.hoy ? pedida.dia : ahora.hoy));
    setVista('semana');
  };

  const flechas = vista === 'semana' ? flechasSemana(lunes, ahora.hoy) : flechasMes(mes, ahora.hoy);
  const mover = (n: -1 | 1) => (vista === 'semana' ? setLunes((l) => sumarDias(l, 7 * n)) : setMes((m) => sumarMeses(m, n)));
  /** Semana o mes completo. El mes abre en el de la semana que se veía (nunca uno ya pasado); la semana, en la del día
   *  elegido si es de ese mes, o en la primera de ese mes con días libres. */
  const verVista = (v: 'semana' | 'mes') => {
    if (v === vista) return;
    if (v === 'mes') {
      setMes(mesAcotado(mesDeSemana(lunes), ahora.hoy));
    } else {
      const delMes = !!dia && dia >= ahora.hoy && Number(dia.slice(0, 4)) === mes.anio && Number(dia.slice(5, 7)) - 1 === mes.mes;
      setLunes(delMes ? lunesDe(dia) : lunesParaMes(mes, ahora.hoy));
    }
    setVista(v);
  };

  // sin tocar la hora ni los servicios se guarda aunque alguno ya no esté en el catálogo (se queda como estaba)
  const listo = clientaLista && (soloDatos ? modo !== 'reprogramar' : elegidos.length > 0 && !!plan);
  /** servicios de la cita que ya no están en Servicios: se quedan mientras no se cambien los servicios */
  const fueraDelCatalogo = cita && cambiando && !tocoServicios
    ? (cita.services.length > 0 ? cita.services : [{ serviceId: null, serviceName: cita.service }])
      .filter((l) => !elegidos.some((e) => e.serviceId === l.serviceId || e.nombre.trim().toLowerCase() === l.serviceName.trim().toLowerCase()))
      .map((l) => l.serviceName)
    : [];

  const guardar = async () => {
    if (!listo) return;
    if (!clienta && nueva) {
      const errs = validarNueva(nueva.nombre, nueva.telefono);
      setErroresNueva(errs);
      if (Object.keys(errs).length > 0 || clientaConTelefono(clients, nueva.telefono)) return;
    }
    setGuardando(true);
    try {
      let quien = clienta ? { id: clienta.id, nombre: clienta.nombre, telefono } : null;
      if (!quien && nueva) {
        const creada = await addClient({
          name: nueva.nombre.trim(), phone: nueva.telefono, email: null, cedula: null, skin_type: null,
          allergies: null, notes: null, source: 'manual',
        });
        if (!creada) return; // addClient ya avisó del error
        quien = { id: creada.id, nombre: creada.name, telefono: creada.phone };
        setClienta({ ...quien, alergias: null });
        setNueva(null);
      }
      if (!quien) return;
      const datos = { client_id: quien.id, clientName: quien.nombre, clientPhone: quien.telefono, notes: notas.trim() };
      const sinGuardar = (otra: string) => toast.error(useAppointmentStore.getState().lastError === 'conflict'
        ? 'Alguien tomó esa hora hace un momento. Elige otra.'
        : otra);

      if (cita && cambiando && soloDatos) {
        if (await updateAppointment(cita.id, datos)) {
          toast.success('Cita actualizada');
          cerrar();
        } else {
          sinGuardar('No se pudo guardar. Intenta de nuevo.');
        }
        return;
      }

      if (!plan) return;
      let lineas: AppointmentLine[] = lineasDelPlan(plan, hora, services);
      // al cambiarla, lo que ya se cobraba por cada servicio se respeta
      if (cita) {
        lineas = lineas.map((l) => ({ ...l, price: cita.services.find((o) => o.serviceId === l.serviceId)?.price ?? l.price }));
      }
      const resumen = {
        service: lineas.map((l) => l.serviceName).join(' + '),
        employee: lineas[0].employee,
        date: dia,
        time: hora,
        duration: duracionTotal,
        services: lineas,
      };

      if (cita && cambiando) {
        if (await updateAppointment(cita.id, { ...datos, ...resumen })) {
          const movida = dia !== cita.date || hora !== cita.time;
          toast.success(movida ? `Cita de ${quien.nombre} movida al ${fechaHora(dia, hora)}` : 'Cita actualizada');
          if (movida) notifyRescheduled({ ...cita, ...datos, ...resumen });
          cerrar();
        } else {
          sinGuardar('No se pudo guardar. Intenta de nuevo.');
        }
        return;
      }

      const estado = estadoAlGuardar(pedido) ?? 'pending';
      const creada = await addAppointment({ ...datos, ...resumen, status: estado, source: 'manual' });
      if (creada) {
        toast.success(`Cita de ${quien.nombre}: ${fechaHora(dia, hora)}`);
        if (estado === 'confirmed') notifyStatusChange(creada, 'confirmed');
        cerrar();
      } else {
        sinGuardar('No se pudo agendar la cita. Intenta de nuevo.');
      }
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!cita || !window.confirm(`¿Eliminar la cita de ${cita.clientName}? No se puede deshacer.`)) return;
    if (await deleteAppointment(cita.id)) {
      toast.success('Cita eliminada');
      cerrar();
    } else {
      toast.error('No se pudo eliminar. Intenta de nuevo.');
    }
  };

  /** Lo que dice el día: "Cerrado", "Ya pasó", "Lleno" o cuántas horas libres tiene; `n` es null si no se puede elegir. */
  const estadoDia = (d: Dia): { n: number | null; texto: string } => {
    if (d.motivo === 'domingo') return { n: null, texto: 'Cerrado' };
    if (d.motivo) return { n: null, texto: '—' };
    const { libres, total } = cuposDelDia(elegidos, d.iso, especialistas, citas, blocks, ahora);
    if (total === 0) return { n: null, texto: 'Ya pasó' };
    return { n: libres, texto: libres === 0 ? 'Lleno' : `${libres} libres` };
  };

  const botonDia = (d: Dia, clase: string, contenido: (e: { n: number | null; texto: string }) => ReactNode) => {
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

  const grupo = (titulo: string, lista: Horario[]) => lista.length > 0 && (
    <div className="prox__grupo">
      <span className="prox__grupo-tit">{titulo}</span>
      <div className="prox__horas">
        {lista.map((h) => (
          <button key={h.hora} type="button" className={`prox__hora ${h.hora === hora ? 'is-on' : ''} ${cita && dia === cita.date && h.hora === cita.time ? 'is-suya' : ''}`}
            disabled={!h.plan} aria-pressed={h.hora === hora} onClick={() => setHora(h.hora)}
            aria-label={h.plan ? `${format12h(h.hora)} con ${h.plan.map((l) => l.staff.name).join(' y ')}` : `${format12h(h.hora)}, ocupada`}>
            {format12h(h.hora)}
          </button>
        ))}
      </div>
    </div>
  );

  const subtitulo = (() => {
    switch (pedido.modo) {
      case 'nueva': return pedido.enPersona ? 'La pidió en persona: queda confirmada' : 'Por teléfono o en el salón';
      case 'paquete': return `${pedido.paquete.clientName} · ${pedido.paquete.packageName}`;
      case 'proxima': return `${pedido.cita.clientName}${pedido.cita.status === 'completed' ? ` · terminó ${pedido.cita.service}` : ''}`;
      default: return `${pedido.cita.clientName} · ${fechaHora(pedido.cita.date, pedido.cita.time)}`;
    }
  })();

  const conQuienes = plan ? [...new Set(plan.map((l) => primerNombre(l.staff.name)))].join(' y ') : '';
  const resumen = (() => {
    if (soloDatos && cita) {
      return (
        <span>
          <b>{fechaLarga(cita.date)}, {rangoHoras(cita.time, cita.duration)}</b>
          {modo === 'reprogramar' ? ' · elige el nuevo día y la hora' : ' · sin cambiar la hora'}
        </span>
      );
    }
    if (plan) {
      return (
        <span>
          <b>{fechaLarga(dia)}, {rangoHoras(hora, duracionTotal)}</b>
          {' · con '}{conQuienes}
          {cita && cambiando && !mismoHorario && <small className="ag__antes">Antes: {fechaHora(cita.date, cita.time)}</small>}
        </span>
      );
    }
    if (dia && dia < ahora.hoy) return 'Ese día ya pasó: elige el nuevo día y la hora';
    if (dia && hora && elegidos.length > 0) return <span className="ag__no-cabe">A las {format12h(hora)} ya no cabe{elegidos.length > 1 ? 'n todos los servicios' : ''}. Elige otra hora.</span>;
    if (!clientaLista) return 'Elige la clienta, qué se va a hacer y cuándo';
    if (elegidos.length === 0) return 'Elige qué se va a hacer';
    return 'Elige el día y la hora';
  })();

  const manana = horas.filter((h) => h.hora < '12:00');
  const tarde = horas.filter((h) => h.hora >= '12:00');

  return (
    <div className="modal-overlay" onClick={cerrar}>
      <div className="modal prox ag" role="dialog" aria-modal="true" aria-labelledby="ag-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2 id="ag-titulo">{TITULO[modo]}</h2>
            <p className="prox__sub">{subtitulo}</p>
          </div>
          <button className="modal__close" onClick={cerrar} aria-label="Cerrar"><X size={20} /></button>
        </div>

        <div className="prox__cuerpo">
          <div className="ag__cols">
            <div className="ag__col">
              <section className="prox__paso" aria-labelledby="ag-clienta">
                <h3 id="ag-clienta" className="prox__paso-tit">Clienta</h3>
                <ElegirClienta clienta={clienta} nueva={nueva} errores={erroresNueva} fija={clientaFija}
                  onClienta={setClienta} onNueva={setNueva} onErrores={setErroresNueva} />
              </section>

              <section className="prox__paso" aria-labelledby="ag-que">
                <h3 id="ag-que" className="prox__paso-tit">Qué se va a hacer</h3>
                {especialistas.length === 0 ? (
                  <p className="prox__aviso">No encontramos tu horario en Equipo. Pídele a recepción que agende la cita.</p>
                ) : (
                  <ServiciosElegidos elegidos={elegidos} especialistas={especialistas} onCambiar={cambiarElegidos} conQuien
                    alAgregar={(e) => conEspecialista(e, empleadaPedida, especialistas)} />
                )}
                {fueraDelCatalogo.length > 0 && (
                  <p className="prox__aviso">
                    También tiene {fueraDelCatalogo.join(', ')}, que ya no está en Servicios: se queda así si no cambias los servicios.
                  </p>
                )}
                {sesion && pedido.modo === 'paquete' && (
                  <div className="prox__paquete ag__sesion">
                    <Package size={15} aria-hidden="true" />
                    <span>
                      {sesion.numero <= pedido.paquete.totalSessions
                        ? `Sesión ${sesion.numero} de ${pedido.paquete.totalSessions}`
                        : 'Ya tiene agendadas todas las sesiones que le quedan'}
                      {sesion.agendadas.length > 0 && (
                        <small>Ya agendada{sesion.agendadas.length > 1 ? 's' : ''}: {sesion.agendadas.map((c) => (c.status === 'in_progress' ? 'hoy, en curso' : fechaHora(c.date, c.time))).join(' · ')}</small>
                      )}
                    </span>
                  </div>
                )}
                {paquetes.map((p) => (
                  <p key={p.id} className="prox__paquete">
                    <Package size={15} aria-hidden="true" />
                    {p.packageName}: le {p.totalSessions - p.usedSessions === 1 ? 'queda 1 sesión' : `quedan ${p.totalSessions - p.usedSessions} sesiones`} de {p.totalSessions}
                  </p>
                ))}
              </section>

              <label className="modal__field prox__notas ag__nota">
                <span>Nota (opcional)</span>
                <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej. sesión 4 de 6, traer exámenes, piel sensible…" />
              </label>
            </div>

            <div className="ag__col">
              {cuandoFijo && cita ? (
                <section className="prox__paso" aria-labelledby="ag-cuando">
                  <h3 id="ag-cuando" className="prox__paso-tit">Cuándo</h3>
                  <p className="ag__fija">
                    <b>{fechaLarga(cita.date)}, {rangoHoras(cita.time, tocoServicios ? duracionTotal : cita.duration)}</b>
                    <span>{cita.status === 'in_progress' ? 'Está en curso: no se mueve de hora.' : 'Ya pasó: no se mueve de día ni de hora.'}</span>
                  </p>
                </section>
              ) : elegidos.length === 0 ? (
                <section className="prox__paso" aria-labelledby="ag-cuando">
                  <h3 id="ag-cuando" className="prox__paso-tit">Cuándo</h3>
                  <p className="ag__espera">
                    <CalendarPlus size={22} aria-hidden="true" />
                    Elige qué se va a hacer y aquí salen los días y las horas en que cabe completo.
                  </p>
                </section>
              ) : (
                <section className="prox__paso" aria-labelledby="ag-cuando">
                  <div className="prox__cal-h">
                    <h3 id="ag-cuando" className="prox__paso-tit">Cuándo</h3>
                    <div className="prox__vista" role="group" aria-label="Ver el calendario por">
                      <button type="button" className={vista === 'semana' ? 'is-on' : ''} aria-pressed={vista === 'semana'} onClick={() => verVista('semana')}>
                        Semana
                      </button>
                      <button type="button" className={vista === 'mes' ? 'is-on' : ''} aria-pressed={vista === 'mes'} onClick={() => verVista('mes')}>
                        Mes
                      </button>
                    </div>
                  </div>
                  <div className="prox__cal-nav">
                    <button type="button" onClick={() => mover(-1)} disabled={!flechas.anterior}
                      aria-label={vista === 'semana' ? 'Semana anterior' : 'Mes anterior'}><ChevronLeft size={18} /></button>
                    <span className="prox__cal-mes" aria-live="polite">{etiquetaMes(vista === 'semana' ? mesDeSemana(lunes) : mes)}</span>
                    <button type="button" onClick={() => mover(1)} disabled={!flechas.siguiente}
                      aria-label={vista === 'semana' ? 'Semana siguiente' : 'Mes siguiente'}><ChevronRight size={18} /></button>
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
                    <p className="prox__ayuda">{vista === 'semana'
                      ? 'Elige un día: debajo de cada uno dice cuántas horas libres tiene.'
                      : 'Elige un día: el número pequeño es cuántas horas libres tiene.'}</p>
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

                  {cita && cambiando && !mismoHorario && (
                    <button type="button" className="at__enlace ag__volver" onClick={comoEstaba}>
                      <Undo2 size={15} aria-hidden="true" /> Dejarla como estaba ({fechaHora(cita.date, cita.time)})
                    </button>
                  )}
                </section>
              )}
            </div>
          </div>

          {modo === 'editar' && cita && (
            <button type="button" className="ag__eliminar" onClick={eliminar}>
              <Trash2 size={15} aria-hidden="true" /> Eliminar cita
            </button>
          )}
        </div>

        <div className="prox__pie">
          <p className="prox__resumen" aria-live="polite">
            {(plan || soloDatos) && <CalendarPlus size={16} aria-hidden="true" />}
            {resumen}
          </p>
          <div className="prox__botones">
            <button type="button" className="modal__cancel-btn" onClick={cerrar}>{modo === 'proxima' ? 'Ahora no' : 'Cancelar'}</button>
            <button type="button" className="modal__submit-btn" disabled={!listo || guardando} onClick={guardar}>
              {guardando ? 'Guardando…' : BOTON[modo]}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
