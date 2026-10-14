import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Package, X, Zap } from 'lucide-react';
import { useAgendarStore } from '../../../store/agendarStore';
import { useAppointmentStore } from '../../../store/appointmentStore';
import { useBlockStore } from '../../../store/blockStore';
import { useClientStore } from '../../../store/clientStore';
import { useServiceStore } from '../../../store/serviceStore';
import { useStaffStore } from '../../../store/staffStore';
import { fechaLocal } from '../../../lib/fechas';
import { format12h } from '../../../lib/timeFormat';
import { quienPuede, minutesToTime, type Elegido } from '../../../site/reservar/disponibilidad';
import { duracionTexto, rangoHoras } from '../../../site/reservar/resumen';
import { especialistasDeAgenda, lineasDelPlan, primerNombre } from '../citas/proximaCita';
import type { ClientaAgenda } from '../agendar/reglas';
import ElegirClienta, { type ErroresNueva, type NuevaClienta } from '../agendar/ElegirClienta';
import ServiciosElegidos from '../agendar/ServiciosElegidos';
import {
  clientaConTelefono, disponibilidadAhora, nuevaLista, paquetesQueUsa, planAhora, validarNueva, type Disponibilidad,
} from './atender';
import '../agendar/Ventana.css';
import './AtenderAhora.css';

const hora12 = (min: number) => format12h(minutesToTime(min));
const minutosDe = (d: Date) => d.getHours() * 60 + d.getMinutes();

function textoDisponibilidad(d: Disponibilidad): string {
  switch (d.tipo) {
    case 'libre': return `Libre hasta las ${hora12(d.hasta)}`;
    case 'ocupada': return `Con ${primerNombre(d.con)}${d.hasta > minutosDe(new Date()) ? ` hasta las ${hora12(d.hasta)}` : ', en curso'}`;
    case 'bloqueada': return `${d.motivo} hasta las ${hora12(d.hasta)}`;
    case 'entra': return `Entra a las ${hora12(d.a)}`;
    case 'termino': return 'Ya terminó su turno';
    case 'no_trabaja': return 'No trabaja hoy';
  }
}

/**
 * Atender ahora: una clienta que llegó sin cita. Se busca su ficha (o se crea, sin duplicarla), se elige qué se le
 * va a hacer y quién está libre en este momento, y la visita empieza de una vez (queda "En curso").
 */
export default function AtenderAhora({ onClose }: { onClose: () => void }) {
  const abrirAgendar = useAgendarStore((s) => s.abrir);
  const { appointments, addAppointment } = useAppointmentStore();
  const { clients, fetchClients, addClient } = useClientStore();
  const { services, clientPackages } = useServiceStore();
  const { staff } = useStaffStore();
  const { blocks, fetchBlocks } = useBlockStore();

  const [reloj, setReloj] = useState(() => new Date());
  const [clienta, setClienta] = useState<ClientaAgenda | null>(null);
  const [nueva, setNueva] = useState<NuevaClienta | null>(null);
  const [erroresNueva, setErroresNueva] = useState<ErroresNueva>({});
  const [elegidos, setElegidos] = useState<Elegido[]>([]);
  const [quien, setQuien] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchBlocks().catch((e) => console.error('[atender] bloqueos:', e));
    const iv = setInterval(() => setReloj(new Date()), 30_000);
    return () => clearInterval(iv);
  }, [fetchClients, fetchBlocks]);

  const hoy = fechaLocal(reloj);
  const minutos = minutosDe(reloj);
  const especialistas = useMemo(() => especialistasDeAgenda(staff), [staff]);
  const paquetes = paquetesQueUsa(clientPackages, clienta?.id ?? null, elegidos);

  // quién la puede atender: las que hacen alguno de los servicios elegidos (todas, si todavía no hay servicio)
  const candidatas = elegidos.length === 0
    ? especialistas
    : especialistas.filter((m) => elegidos.some((e) => quienPuede([m], e.serviceId).length > 0));
  const disponibilidad = new Map(candidatas.map((m) => [m.id, disponibilidadAhora(m, appointments, blocks, hoy, minutos)]));

  // con una especialista elegida, ella hace lo que sabe hacer; lo demás, la que esté libre
  const conQuien = elegidos.map((e) => ({ ...e, staffId: quien && quienPuede(especialistas.filter((m) => m.id === quien), e.serviceId).length ? quien : '' }));
  const plan = planAhora(conQuien, especialistas, appointments, blocks, hoy, minutos);
  const duracion = elegidos.reduce((t, e) => t + e.duracion, 0);
  const clientaLista = !!clienta || (!!nueva && nuevaLista(nueva, clients));


  /** Si ahora no cabe, se agenda para más tarde (la clienta está ahí: queda confirmada) con lo que ya se eligió. */
  const agendarLuego = () => {
    onClose();
    abrirAgendar({
      modo: 'nueva', fecha: hoy, enPersona: true, servicios: conQuien,
      clienta: clienta ?? (nueva ? { id: null, nombre: nueva.nombre, telefono: nueva.telefono } : undefined),
    });
  };

  const empezar = async () => {
    if (nueva) {
      const errs = validarNueva(nueva.nombre, nueva.telefono);
      setErroresNueva(errs);
      if (Object.keys(errs).length > 0 || clientaConTelefono(clients, nueva.telefono)) return;
    }
    // el plan se rehace con la hora de este momento, por si pasó un minuto
    const ahora = new Date();
    const desde = minutosDe(ahora);
    const final = planAhora(conQuien, especialistas, appointments, blocks, fechaLocal(ahora), desde);
    if (!final) { toast.error('Ya no hay quién la atienda ahora. Elige otra especialista o agéndala.'); return; }

    setGuardando(true);
    try {
      let ficha = clienta;
      if (!ficha && nueva) {
        const creada = await addClient({
          name: nueva.nombre.trim(), phone: nueva.telefono, email: null, cedula: null, skin_type: null,
          allergies: null, notes: null, source: 'manual',
        });
        if (!creada) return; // addClient ya avisó del error
        ficha = { id: creada.id, nombre: creada.name, telefono: creada.phone };
      }
      if (!ficha) return;
      const hora = minutesToTime(desde);
      const lineas = lineasDelPlan(final, hora, services);
      const cita = await addAppointment({
        client_id: ficha.id,
        clientName: ficha.nombre,
        clientPhone: ficha.telefono,
        service: lineas.map((l) => l.serviceName).join(' + '),
        employee: lineas[0].employee,
        date: fechaLocal(ahora),
        time: hora,
        duration: duracion,
        status: 'in_progress',
        notes: notas.trim() || 'Llegó sin cita',
        source: 'manual',
        services: lineas,
      });
      if (!cita) {
        toast.error(useAppointmentStore.getState().lastError === 'conflict'
          ? 'Esa especialista acaba de quedar ocupada. Elige otra.'
          : 'No se pudo registrar. Intenta de nuevo.');
        return;
      }
      toast.success(`${ficha.nombre} en sala con ${[...new Set(lineas.map((l) => primerNombre(l.employee)))].join(' y ')}`);
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  const motivoSinPlan = (() => {
    if (elegidos.length === 0 || plan) return null;
    const elegida = quien ? disponibilidad.get(quien) : null;
    if (elegida?.tipo === 'libre') return `${primerNombre(especialistas.find((m) => m.id === quien)!.name)} está libre solo hasta las ${hora12(elegida.hasta)} y esto dura ${duracionTexto(duracion)}.`;
    if (elegida) return `${primerNombre(especialistas.find((m) => m.id === quien)!.name)} no está libre ahora.`;
    return 'Nadie que lo haga está libre el tiempo que dura.';
  })();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal prox at" role="dialog" aria-modal="true" aria-labelledby="at-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2 id="at-titulo">Atender ahora</h2>
            <p className="prox__sub">Llegó sin cita: su servicio empieza de una vez</p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>

        <div className="prox__cuerpo">
          <section className="prox__paso" aria-labelledby="at-clienta">
            <h3 id="at-clienta" className="prox__paso-tit">Clienta</h3>
            <ElegirClienta clienta={clienta} nueva={nueva} errores={erroresNueva}
              onClienta={setClienta} onNueva={setNueva} onErrores={setErroresNueva} />
          </section>

          <section className="prox__paso" aria-labelledby="at-que">
            <h3 id="at-que" className="prox__paso-tit">Qué se le va a hacer</h3>
            <ServiciosElegidos elegidos={elegidos} especialistas={especialistas} onCambiar={setElegidos} />
            {paquetes.map((p) => (
              <p key={p.id} className="prox__paquete">
                <Package size={15} aria-hidden="true" />
                Usa una sesión de {p.packageName} (le {p.totalSessions - p.usedSessions === 1 ? 'queda 1' : `quedan ${p.totalSessions - p.usedSessions}`})
              </p>
            ))}
          </section>

          <section className="prox__paso" aria-labelledby="at-quien">
            <h3 id="at-quien" className="prox__paso-tit">Quién la atiende</h3>
            <div className="at__quienes" role="radiogroup" aria-labelledby="at-quien">
              <button type="button" role="radio" aria-checked={quien === ''} className={`at__quien ${quien === '' ? 'is-on' : ''}`} onClick={() => setQuien('')}>
                <b>La que esté libre</b>
                <span>Se elige sola</span>
              </button>
              {candidatas.map((m) => {
                const d = disponibilidad.get(m.id)!;
                return (
                  <button key={m.id} type="button" role="radio" aria-checked={quien === m.id} disabled={d.tipo !== 'libre'}
                    className={`at__quien at__quien--${d.tipo} ${quien === m.id ? 'is-on' : ''}`} onClick={() => setQuien(m.id)}>
                    <b>{m.name}</b>
                    <span><i aria-hidden="true" />{textoDisponibilidad(d)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {elegidos.length > 0 && (
            <label className="modal__field prox__notas">
              <span>Nota (opcional)</span>
              <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej. viene por recomendación, piel sensible…" />
            </label>
          )}
        </div>

        <div className="prox__pie">
          <p className="prox__resumen" aria-live="polite">
            {plan ? (
              <>
                <Zap size={16} aria-hidden="true" />
                <span>
                  <b>Empieza ya: {rangoHoras(minutesToTime(minutos), duracion)}</b>
                  {' · con '}{[...new Set(plan.map((l) => primerNombre(l.staff.name)))].join(' y ')}
                </span>
              </>
            ) : motivoSinPlan ? (
              <span className="at__sin-plan">
                {motivoSinPlan}{' '}
                <button type="button" className="at__enlace" onClick={agendarLuego}>Agendarla para más tarde</button>
              </span>
            ) : !clientaLista ? 'Elige la clienta y qué se le va a hacer' : 'Elige qué se le va a hacer'}
          </p>
          <div className="prox__botones">
            <button type="button" className="modal__cancel-btn" onClick={onClose}>Cancelar</button>
            <button type="button" className="modal__submit-btn" disabled={!clientaLista || !plan || guardando} onClick={empezar}>
              {guardando ? 'Registrando…' : 'Empezar servicio'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
