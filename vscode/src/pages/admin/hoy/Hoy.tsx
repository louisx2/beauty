import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, ChevronRight, MessageCircle, Phone, Plus, UserRound, X } from 'lucide-react';
import { useAgendarStore } from '../../../store/agendarStore';
import { useAppointmentStore, type Appointment } from '../../../store/appointmentStore';
import { useBlockStore } from '../../../store/blockStore';
import { useStaffStore } from '../../../store/staffStore';
import { fechaLocal } from '../../../lib/fechas';
import { format12h } from '../../../lib/timeFormat';
import { ETIQUETA_ESTADO } from '../../../lib/estadosCita';
import { EVENTO_ATENDER_AHORA } from '../../../lib/eventosPanel';
import { sumarDias } from '../../../site/reservar/calendario';
import { fechaTitulo } from '../../../site/reservar/resumen';
import MenuAcciones from '../../../components/MenuAcciones';
import SaveClientModal from '../../../components/SaveClientModal';
import { accionPrincipal } from '../citas/acciones';
import { ICONO_PRINCIPAL, useAccionesCita } from '../citas/useAccionesCita';
import {
  aHora, diaDelSalon, enSala, horasTexto, porConfirmar, renglonesDelDia, resumenDe,
  type BloqueCita, type Columna, type Tramo,
} from './dia';
import './Hoy.css';

/** Alto de una hora en la agenda. */
const HORA = 64;
const hora12 = (min: number) => format12h(aHora(min));
const rango = (t: Tramo) => `${hora12(t.inicio)} – ${hora12(t.fin)}`;
const primerNombre = (n: string) => {
  const [a, b] = n.trim().split(/\s+/);
  return /^dra?\.$/i.test(a ?? '') && b ? `${a} ${b}` : a ?? n;
};

/** El enlace de WhatsApp con el número de RD (10 dígitos → 1 delante). */
function enlaceWhatsApp(telefono: string, texto: string): string {
  const d = telefono.replace(/\D/g, '');
  return `https://wa.me/${d.length === 10 ? `1${d}` : d}?text=${encodeURIComponent(texto)}`;
}

function textoConfirmar(c: Appointment, hoy: string): string {
  const cuando = c.date === hoy ? 'hoy' : `mañana ${fechaTitulo(c.date).toLowerCase()}`;
  return `Hola ${c.clientName}, te escribimos de Anadsll Beauty Esthetic para confirmar tu cita de ${cuando} a las ${format12h(c.time)} (${c.service}). ¿Nos confirmas?`;
}

/** Fecha y minutos de ahora; se actualiza cada minuto (la línea de "ahora" y los huecos que ya pasaron). */
function useAhora() {
  const leer = () => { const d = new Date(); return { hoy: fechaLocal(d), minutos: d.getHours() * 60 + d.getMinutes() }; };
  const [ahora, setAhora] = useState(leer);
  useEffect(() => {
    const iv = setInterval(() => setAhora(leer()), 60_000);
    return () => clearInterval(iv);
  }, []);
  return ahora;
}

/**
 * Hoy: el día del salón en una pantalla. La agenda de cada especialista con sus huecos libres (tocar uno agenda
 * ahí), quién está en sala y lo que falta confirmar. Pensada primero para la tableta.
 */
export default function Hoy() {
  const navigate = useNavigate();
  const { appointments, promptNextSession } = useAppointmentStore();
  const abrirAgendar = useAgendarStore((s) => s.abrir);
  const { staff } = useStaffStore();
  const { blocks, fetchBlocks } = useBlockStore();
  const ahora = useAhora();
  const [abierta, setAbierta] = useState<string | null>(null);
  const [guardandoClienta, setGuardandoClienta] = useState<Appointment | null>(null);

  useEffect(() => {
    fetchBlocks().catch((e) => console.error('[hoy] bloqueos:', e));
  }, [fetchBlocks]);

  const hoy = ahora.hoy;
  const manana = sumarDias(hoy, 1);
  const dia = useMemo(() => diaDelSalon(hoy, staff, appointments, blocks, ahora.minutos), [hoy, staff, appointments, blocks, ahora.minutos]);
  const renglones = useMemo(() => renglonesDelDia(dia), [dia]);
  const sala = enSala(appointments, hoy);
  const confirmar = porConfirmar(appointments, hoy, manana);
  const deManana = resumenDe(appointments, manana);
  const totalHoy = resumenDe(appointments, hoy).citas;
  const proxima = appointments
    .filter((c) => c.date === hoy && (c.status === 'pending' || c.status === 'confirmed') && c.time >= aHora(ahora.minutos))
    .sort((a, b) => a.time.localeCompare(b.time))[0];

  const acciones = useAccionesCita({
    editar: (c) => abrirAgendar({ modo: 'editar', cita: c }),
    reprogramar: (c) => abrirAgendar({ modo: 'reprogramar', cita: c }),
    guardarClienta: setGuardandoClienta,
  });
  const cita = abierta ? appointments.find((c) => c.id === abierta) ?? null : null;

  // un hueco libre agenda ahí: ese día, a esa hora y con ella
  const agendarEn = (col: Columna | null, t: Tramo | null) =>
    abrirAgendar({ modo: 'nueva', fecha: hoy, hora: t ? aHora(t.inicio) : undefined, empleada: col?.nombre });
  const pasoSiguiente = (c: Appointment) => {
    const paso = accionPrincipal(c.status);
    if (paso) acciones.avanzar(c, paso);
  };

  const y = (min: number) => ((min - dia.inicio) / 60) * HORA;
  const alto = (t: Tramo) => ((t.fin - t.inicio) / 60) * HORA;
  const horas = Array.from({ length: (dia.fin - dia.inicio) / 60 + 1 }, (_, i) => dia.inicio + i * 60);
  const lineaAhora = ahora.minutos >= dia.inicio && ahora.minutos <= dia.fin;
  const columnasCss = { '--cols': dia.columnas.length, '--alto': `${y(dia.fin)}px` } as CSSProperties;
  // en la cabeza de cada columna, el primer nombre; el completo si dos se llaman igual
  const cortos = dia.columnas.map((c) => primerNombre(c.nombre));
  const nombreCol = (i: number) => (cortos.filter((x) => x === cortos[i]).length > 1 ? dia.columnas[i].nombre : cortos[i]);
  const desdeLas = (c: Appointment) => {
    if (!c.startedAt) return format12h(c.time);
    const d = new Date(c.startedAt);
    return hora12(d.getHours() * 60 + d.getMinutes());
  };

  const bloque = (b: BloqueCita, col: Columna) => {
    const h = Math.max(alto(b), 28);
    return (
      <button key={`${b.cita.id}-${b.inicio}`} type="button"
        className={`hoy__bloque hoy__bloque--${b.cita.status} ${h < 44 ? 'is-corto' : ''}`}
        style={{ top: y(b.inicio), height: h }}
        onClick={() => setAbierta(b.cita.id)}
        aria-label={`${hora12(b.inicio)}, ${b.cita.clientName}, ${b.servicio}, con ${col.nombre}, ${ETIQUETA_ESTADO[b.cita.status]}`}>
        <b>{b.cita.clientName}</b>
        <span>{hora12(b.inicio)} · {b.servicio}</span>
      </button>
    );
  };

  return (
    <div className="hoy">
      <header className="hoy__cabeza">
        <div>
          <h1 className="hoy__titulo">Hoy</h1>
          <p className="hoy__fecha">{fechaTitulo(hoy)} · {totalHoy === 1 ? '1 cita' : `${totalHoy} citas`}</p>
        </div>
        <div className="hoy__botones">
          <button type="button" className="hoy__btn" onClick={() => window.dispatchEvent(new Event(EVENTO_ATENDER_AHORA))}>Atender sin cita</button>
          <button type="button" className="hoy__btn hoy__btn--principal" onClick={() => agendarEn(null, null)}>
            <Plus size={18} aria-hidden="true" /> Agendar cita
          </button>
        </div>
      </header>

      <div className="hoy__cuerpo">
        <aside className="hoy__lado">
          <section className="hoy__tarjeta" aria-labelledby="hoy-sala">
            <h2 id="hoy-sala" className="hoy__tarjeta-tit">En sala ahora</h2>
            {sala.length === 0 ? (
              proxima ? (
                <div className="hoy__sala">
                  <p className="hoy__vacio">Nadie en sala. La próxima:</p>
                  <button type="button" className="hoy__sala-nom" onClick={() => setAbierta(proxima.id)}>
                    <b>{proxima.clientName}</b>
                    <span>{format12h(proxima.time)} · {proxima.service} · con {primerNombre(proxima.employee)}</span>
                  </button>
                  {accionPrincipal(proxima.status) && (
                    <button type="button" className="hoy__btn" onClick={() => pasoSiguiente(proxima)}>
                      {ICONO_PRINCIPAL[accionPrincipal(proxima.status)!.accion]} {accionPrincipal(proxima.status)!.etiqueta}
                    </button>
                  )}
                </div>
              ) : <p className="hoy__vacio">Nadie en sala ahora.</p>
            ) : sala.map((c) => (
              <div key={c.id} className="hoy__sala">
                <button type="button" className="hoy__sala-nom" onClick={() => setAbierta(c.id)}>
                  <b>{c.clientName}</b>
                  <span>{c.service} · con {primerNombre(c.employee)} · desde {desdeLas(c)}</span>
                </button>
                <button type="button" className="hoy__btn hoy__btn--principal" onClick={() => pasoSiguiente(c)}>
                  {ICONO_PRINCIPAL.completar} Completar
                </button>
              </div>
            ))}
          </section>

          <section className="hoy__tarjeta" aria-labelledby="hoy-confirmar">
            <h2 id="hoy-confirmar" className="hoy__tarjeta-tit">Por confirmar{confirmar.length > 0 && ` · ${confirmar.length}`}</h2>
            {confirmar.length === 0 ? <p className="hoy__vacio">Todo confirmado.</p> : (
              <ul className="hoy__confirmar">
                {confirmar.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <button type="button" className="hoy__confirmar-nom" onClick={() => setAbierta(c.id)}>
                      <b>{c.clientName}</b>
                      <span>{c.date === hoy ? '' : 'Mañana, '}{format12h(c.time)} · {c.service}</span>
                    </button>
                    <a className="hoy__icono" href={enlaceWhatsApp(c.clientPhone, textoConfirmar(c, hoy))} target="_blank" rel="noopener noreferrer"
                      aria-label={`Escribirle a ${c.clientName} por WhatsApp`}>
                      <MessageCircle size={18} aria-hidden="true" />
                    </a>
                    <button type="button" className="hoy__btn hoy__btn--chico" onClick={() => pasoSiguiente(c)}>Confirmar</button>
                  </li>
                ))}
              </ul>
            )}
            {confirmar.length > 5 && (
              <button type="button" className="hoy__enlace" onClick={() => navigate('/admin/citas')}>Y {confirmar.length - 5} más en Citas</button>
            )}
          </section>

          <button type="button" className="hoy__manana" onClick={() => navigate(`/admin/citas?fecha=${manana}`)}>
            <span>
              <b>Mañana, {fechaTitulo(manana).toLowerCase()}</b>
              <span>{deManana.citas === 1 ? '1 cita' : `${deManana.citas} citas`}{deManana.porConfirmar > 0 && ` · ${deManana.porConfirmar} por confirmar`}</span>
            </span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </aside>

        <section className="hoy__agenda" aria-label="Agenda de hoy por especialista">
          {dia.columnas.length === 0 ? (
            <p className="hoy__vacio hoy__vacio--agenda">No hay especialistas en Equipo con servicios para atender.</p>
          ) : (
            <>
              <div className="hoy__grilla" style={columnasCss}>
                <div className="hoy__grilla-cabeza">
                  <span />
                  {dia.columnas.map((col, i) => (
                    <div key={col.id} className="hoy__persona">
                      <b>{nombreCol(i)}</b>
                      <span>
                        {!col.trabaja ? 'No trabaja hoy'
                          : `${col.bloques.length === 1 ? '1 cita' : `${col.bloques.length} citas`} · ${col.minutosLibres ? `${horasTexto(col.minutosLibres)} libres` : 'sin huecos'}`}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="hoy__grilla-cuerpo">
                  <div className="hoy__horas" aria-hidden="true">
                    {horas.map((m) => <span key={m} style={{ top: y(m) }}>{hora12(m).replace(':00', '')}</span>)}
                  </div>
                  {dia.columnas.map((col) => (
                    <div key={col.id} className={`hoy__col ${col.trabaja ? '' : 'is-libre-de-turno'}`}>
                      {col.trabaja && col.desde > dia.inicio && <div className="hoy__fuera" style={{ top: 0, height: y(col.desde) }} />}
                      {col.trabaja && col.hasta < dia.fin && <div className="hoy__fuera" style={{ top: y(col.hasta), height: y(dia.fin) - y(col.hasta) }} />}
                      {!col.trabaja && <div className="hoy__fuera" style={{ top: 0, height: y(dia.fin) }} />}
                      {col.bloqueos.map((b, i) => (
                        <div key={`bq-${i}`} className="hoy__bloqueo" style={{ top: y(b.inicio), height: Math.max(alto(b), 24) }}>
                          {b.motivo || 'Bloqueado'}
                        </div>
                      ))}
                      {col.libres.map((t) => (
                        <button key={`l-${t.inicio}`} type="button" className={`hoy__libre ${alto(t) < 44 ? 'is-corto' : ''}`}
                          style={{ top: y(t.inicio) + 2, height: Math.max(alto(t) - 4, 24) }}
                          onClick={() => agendarEn(col, t)}
                          aria-label={`Agendar con ${col.nombre} desde las ${hora12(t.inicio)}; libre hasta las ${hora12(t.fin)}`}>
                          <Plus size={15} aria-hidden="true" />
                          <span>{alto(t) >= 44 ? <>Libre<small>{rango(t)}</small></> : hora12(t.inicio)}</span>
                        </button>
                      ))}
                      {col.bloques.map((b) => bloque(b, col))}
                    </div>
                  ))}
                  {lineaAhora && (
                    <div className="hoy__ahora" style={{ top: y(ahora.minutos) }} aria-hidden="true">
                      <span>{hora12(ahora.minutos)}</span>
                    </div>
                  )}
                </div>
              </div>

              <ol className="hoy__lista">
                {renglones.length === 0 && <li className="hoy__vacio">Hoy no hay citas ni horas libres.</li>}
                {renglones.map((r) => r.tipo === 'cita' ? (
                  <li key={`c-${r.bloque.cita.id}-${r.inicio}`}>
                    <button type="button" className={`hoy__renglon hoy__renglon--${r.bloque.cita.status}`} onClick={() => setAbierta(r.bloque.cita.id)}>
                      <span className="hoy__renglon-hora">{hora12(r.inicio)}</span>
                      <span className="hoy__renglon-txt">
                        <b>{r.bloque.cita.clientName}</b>
                        <span>{r.bloque.servicio} · {primerNombre(r.columna.nombre)} · {ETIQUETA_ESTADO[r.bloque.cita.status]}</span>
                      </span>
                    </button>
                  </li>
                ) : (
                  <li key={`l-${r.columna.id}-${r.inicio}`}>
                    <button type="button" className="hoy__renglon-libre" onClick={() => agendarEn(r.columna, r.tramo)}>
                      <Plus size={16} aria-hidden="true" /> Libre {rango(r.tramo)} con {primerNombre(r.columna.nombre)}
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </div>

      {cita && (
        <div className="modal-overlay" onClick={() => setAbierta(null)}>
          <div className="modal hoy__hoja" role="dialog" aria-modal="true" aria-labelledby="hoy-hoja-tit" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div>
                <h2 id="hoy-hoja-tit">{cita.clientName}</h2>
                <span className={`hoy__estado hoy__estado--${cita.status}`}>{ETIQUETA_ESTADO[cita.status]}</span>
              </div>
              <button className="modal__close" onClick={() => setAbierta(null)} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <div className="hoy__hoja-cuerpo">
              <p className="hoy__hoja-dia">{cita.date === hoy ? 'Hoy' : fechaTitulo(cita.date)}, {format12h(cita.time)}</p>
              <ul className="hoy__hoja-servicios">
                {(cita.services.length > 0 ? cita.services : [{ serviceName: cita.service, employee: cita.employee, startTime: cita.time, duration: cita.duration }]).map((l, i) => (
                  <li key={i}>
                    <b>{l.serviceName}</b>
                    <span>{format12h(l.startTime || cita.time)} · {l.duration} min · con {l.employee}</span>
                  </li>
                ))}
              </ul>
              {cita.notes && <p className="hoy__hoja-nota">{cita.notes}</p>}
              <div className="hoy__hoja-contacto">
                <a className="hoy__btn" href={enlaceWhatsApp(cita.clientPhone, `Hola ${cita.clientName}, te escribimos de Anadsll Beauty Esthetic.`)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={17} aria-hidden="true" /> WhatsApp
                </a>
                <a className="hoy__btn" href={`tel:${cita.clientPhone.replace(/\D/g, '')}`}><Phone size={17} aria-hidden="true" /> Llamar</a>
                {cita.client_id && (
                  <button type="button" className="hoy__btn" onClick={() => navigate('/admin/clientes', { state: { searchName: cita.clientName } })}>
                    <UserRound size={17} aria-hidden="true" /> Ficha
                  </button>
                )}
              </div>
            </div>
            <div className="hoy__hoja-pie">
              <MenuAcciones etiqueta={`Más acciones para la cita de ${cita.clientName}`}
                items={acciones.itemsDe(cita).map((it) => ({ ...it, onSelect: () => { setAbierta(null); it.onSelect(); } }))} />
              {accionPrincipal(cita.status) ? (
                <button type="button" className="hoy__btn hoy__btn--principal"
                  onClick={() => { setAbierta(null); pasoSiguiente(cita); }}>
                  {ICONO_PRINCIPAL[accionPrincipal(cita.status)!.accion]} {accionPrincipal(cita.status)!.etiqueta}
                </button>
              ) : cita.status === 'completed' ? (
                <button type="button" className="hoy__btn hoy__btn--principal" onClick={() => { setAbierta(null); promptNextSession(cita); }}>
                  <CalendarPlus size={18} aria-hidden="true" /> Agendar próxima
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {guardandoClienta && <SaveClientModal appointment={guardandoClienta} onClose={() => setGuardandoClienta(null)} />}
    </div>
  );
}
