import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, Package, Plus, Search, UserPlus, X, Zap } from 'lucide-react';
import { useAppointmentStore } from '../../../store/appointmentStore';
import { useBlockStore } from '../../../store/blockStore';
import { useClientStore, type Client } from '../../../store/clientStore';
import { useServiceStore } from '../../../store/serviceStore';
import { useStaffStore } from '../../../store/staffStore';
import { fechaLocal } from '../../../lib/fechas';
import { format12h } from '../../../lib/timeFormat';
import { capitalizarNombre } from '../../../lib/nombres';
import { quienPuede, minutesToTime, type Elegido } from '../../../site/reservar/disponibilidad';
import { duracionTexto, rangoHoras } from '../../../site/reservar/resumen';
import { especialistasDeAgenda, lineasDelPlan, primerNombre } from '../citas/proximaCita';
import {
  buscarClientas, clientaConTelefono, disponibilidadAhora, formatoTelefono, paquetesQueUsa, planAhora, validarNueva,
  type Disponibilidad,
} from './atender';
import '../../../components/ProximaCita.css';
import './AtenderAhora.css';

const CATEGORIAS: Record<string, string> = {
  facial: 'Facial', laser: 'Láser', corporal: 'Corporal', belleza: 'Cejas, pestañas y maquillaje', medicina: 'Medicina estética',
};

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
  const navigate = useNavigate();
  const { appointments, addAppointment } = useAppointmentStore();
  const { clients, fetchClients, addClient } = useClientStore();
  const { services, clientPackages } = useServiceStore();
  const { staff } = useStaffStore();
  const { blocks, fetchBlocks } = useBlockStore();

  const [reloj, setReloj] = useState(() => new Date());
  const [busqueda, setBusqueda] = useState('');
  const [clienta, setClienta] = useState<Client | null>(null);
  const [nueva, setNueva] = useState<{ nombre: string; telefono: string } | null>(null);
  const [erroresNueva, setErroresNueva] = useState<{ nombre?: string; telefono?: string }>({});
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
  const resultados = useMemo(() => buscarClientas(clients, busqueda), [clients, busqueda]);
  const duplicada = nueva ? clientaConTelefono(clients, nueva.telefono) : null;
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
  const clientaLista = !!clienta || (!!nueva && Object.keys(validarNueva(nueva.nombre, nueva.telefono)).length === 0 && !duplicada);

  const porCategoria = useMemo(() => {
    const grupos = new Map<string, typeof services>();
    for (const s of services) {
      if (!s.active || elegidos.some((e) => e.serviceId === s.id) || quienPuede(especialistas, s.id).length === 0) continue;
      const g = CATEGORIAS[s.category] ?? 'Otros';
      grupos.set(g, [...(grupos.get(g) ?? []), s]);
    }
    return [...grupos.entries()].map(([g, delGrupo]) => [g, delGrupo.sort((a, b) => a.name.localeCompare(b.name, 'es'))] as const);
  }, [services, elegidos, especialistas]);

  const elegirClienta = (c: Client) => { setClienta(c); setNueva(null); setBusqueda(''); };
  const empezarNueva = () => {
    const soloDigitos = busqueda.replace(/\D/g, '');
    setNueva(soloDigitos.length >= 7
      ? { nombre: '', telefono: formatoTelefono(soloDigitos) }
      : { nombre: capitalizarNombre(busqueda.trim()), telefono: '' });
    setErroresNueva({});
    setBusqueda('');
  };
  const agregar = (id: string) => {
    const s = services.find((x) => x.id === id);
    if (s) setElegidos([...elegidos, { serviceId: s.id, staffId: '', nombre: s.name, duracion: s.duration || 45 }]);
  };

  /** Si ahora no cabe, se agenda para más tarde con su nombre y teléfono ya puestos. */
  const agendarLuego = () => {
    const q = new URLSearchParams({ nueva: '1', fecha: hoy });
    const nombre = clienta?.name ?? nueva?.nombre ?? '';
    const telefono = clienta?.phone ?? nueva?.telefono ?? '';
    if (nombre) q.set('nombre', nombre);
    if (telefono) q.set('telefono', telefono);
    if (clienta) q.set('clienta', clienta.id);
    onClose();
    navigate(`/admin/citas?${q}`);
  };

  const empezar = async () => {
    if (nueva) {
      const errs = validarNueva(nueva.nombre, nueva.telefono);
      setErroresNueva(errs);
      if (Object.keys(errs).length > 0 || duplicada) return;
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
        ficha = await addClient({
          name: nueva.nombre.trim(), phone: nueva.telefono, email: null, cedula: null, skin_type: null,
          allergies: null, notes: null, source: 'manual',
        });
        if (!ficha) return; // addClient ya avisó del error
      }
      if (!ficha) return;
      const hora = minutesToTime(desde);
      const lineas = lineasDelPlan(final, hora, services);
      const cita = await addAppointment({
        client_id: ficha.id,
        clientName: ficha.name,
        clientPhone: ficha.phone,
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
      toast.success(`${ficha.name} en sala con ${[...new Set(lineas.map((l) => primerNombre(l.employee)))].join(' y ')}`);
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
            {clienta ? (
              <div className="at__ficha">
                <span className="at__ini" aria-hidden="true">{clienta.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}</span>
                <div className="at__ficha-txt">
                  <b>{clienta.name}</b>
                  <span>{clienta.phone}</span>
                  {clienta.allergies && <span className="at__alergia"><AlertTriangle size={14} aria-hidden="true" /> Alergias: {clienta.allergies}</span>}
                </div>
                <button type="button" className="at__cambiar" onClick={() => setClienta(null)}>Cambiar</button>
              </div>
            ) : nueva ? (
              <div className="at__nueva">
                <div className="modal__row">
                  <label className="modal__field">
                    <span className="at__lbl">Nombre</span>
                    <input value={nueva.nombre} autoFocus={!nueva.nombre} placeholder="Nombre y apellido"
                      className={erroresNueva.nombre ? 'input--error' : ''}
                      onChange={(e) => { setNueva({ ...nueva, nombre: capitalizarNombre(e.target.value) }); setErroresNueva({ ...erroresNueva, nombre: undefined }); }} />
                    {erroresNueva.nombre && <span className="field-error">{erroresNueva.nombre}</span>}
                  </label>
                  <label className="modal__field">
                    <span className="at__lbl">Teléfono</span>
                    <input type="tel" inputMode="tel" value={nueva.telefono} autoFocus={!!nueva.nombre} placeholder="829-000-0000" maxLength={12}
                      className={erroresNueva.telefono ? 'input--error' : ''}
                      onChange={(e) => { setNueva({ ...nueva, telefono: formatoTelefono(e.target.value) }); setErroresNueva({ ...erroresNueva, telefono: undefined }); }} />
                    {erroresNueva.telefono && <span className="field-error">{erroresNueva.telefono}</span>}
                  </label>
                </div>
                {duplicada && (
                  <div className="at__aviso">
                    <span>Ese teléfono ya es de <b>{duplicada.name}</b>.</span>
                    <button type="button" className="at__cambiar" onClick={() => elegirClienta(duplicada)}>Usar su ficha</button>
                  </div>
                )}
                <button type="button" className="at__enlace" onClick={() => setNueva(null)}>Buscar una clienta registrada</button>
              </div>
            ) : (
              <div className="at__buscar">
                <label className="at__buscador">
                  <Search size={18} aria-hidden="true" />
                  <span className="at__oculto">Buscar clienta por nombre o teléfono</span>
                  <input value={busqueda} autoFocus placeholder="Nombre o teléfono" onChange={(e) => setBusqueda(e.target.value)} />
                </label>
                {resultados.length > 0 && (
                  <ul className="at__resultados">
                    {resultados.map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => elegirClienta(c)}>
                          <b>{c.name}</b>
                          <span>{c.phone}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" className="at__nueva-btn" onClick={empezarNueva}>
                  <UserPlus size={17} aria-hidden="true" />
                  {busqueda.trim() && !/^\d[\d\s-]*$/.test(busqueda.trim()) ? `Clienta nueva: “${capitalizarNombre(busqueda.trim())}”` : 'Clienta nueva'}
                </button>
              </div>
            )}
          </section>

          <section className="prox__paso" aria-labelledby="at-que">
            <h3 id="at-que" className="prox__paso-tit">Qué se le va a hacer</h3>
            {elegidos.length > 0 && (
              <ul className="prox__servicios">
                {elegidos.map((e, i) => (
                  <li key={e.serviceId} className="prox__servicio">
                    <div className="prox__servicio-nom"><b>{e.nombre}</b><span>{duracionTexto(e.duracion)}</span></div>
                    <button type="button" className="prox__quitar" aria-label={`Quitar ${e.nombre}`}
                      onClick={() => setElegidos(elegidos.filter((_, j) => j !== i))}><X size={15} /></button>
                  </li>
                ))}
              </ul>
            )}
            {paquetes.map((p) => (
              <p key={p.id} className="prox__paquete">
                <Package size={15} aria-hidden="true" />
                Usa una sesión de {p.packageName} (le {p.totalSessions - p.usedSessions === 1 ? 'queda 1' : `quedan ${p.totalSessions - p.usedSessions}`})
              </p>
            ))}
            {porCategoria.length > 0 && (
              <label className="prox__agregar">
                <Plus size={15} aria-hidden="true" />
                <select value="" onChange={(ev) => agregar(ev.target.value)} aria-label="Agregar servicio">
                  <option value="">{elegidos.length === 0 ? 'Elegir servicio' : 'Agregar otro servicio'}</option>
                  {porCategoria.map(([g, delGrupo]) => (
                    <optgroup key={g} label={g}>
                      {delGrupo.map((s) => <option key={s.id} value={s.id}>{s.name} · {duracionTexto(s.duration || 45)}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
            )}
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
