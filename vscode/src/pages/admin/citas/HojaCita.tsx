import { useNavigate } from 'react-router-dom';
import { CalendarPlus, MessageCircle, Phone, UserRound, X } from 'lucide-react';
import { useAgendarStore } from '../../../store/agendarStore';
import { useAppointmentStore, type Appointment } from '../../../store/appointmentStore';
import { fechaLocal } from '../../../lib/fechas';
import { format12h } from '../../../lib/timeFormat';
import { ETIQUETA_ESTADO } from '../../../lib/estadosCita';
import { enlaceLlamar, enlaceWhatsApp } from '../../../lib/enlaces';
import { fechaTitulo } from '../../../site/reservar/resumen';
import MenuAcciones from '../../../components/MenuAcciones';
import { accionPrincipal } from './acciones';
import { ICONO_PRINCIPAL, useAccionesCita } from './useAccionesCita';
import './HojaCita.css';

interface Props {
  cita: Appointment;
  onCerrar: () => void;
  /** "Guardar clienta" para una cita sin ficha */
  onGuardarClienta?: (cita: Appointment) => void;
}

/**
 * La hoja de una cita (en Hoy y en la Agenda): cuándo, qué servicios y con quién, la nota, escribirle o llamarla, su
 * ficha, el paso que sigue (Confirmar, Llegó, Completar, o agendar la próxima) y el resto en "⋯".
 */
export default function HojaCita({ cita, onCerrar, onGuardarClienta = () => {} }: Props) {
  const navigate = useNavigate();
  const abrirAgendar = useAgendarStore((s) => s.abrir);
  const promptNextSession = useAppointmentStore((s) => s.promptNextSession);
  const acciones = useAccionesCita({
    editar: (c) => abrirAgendar({ modo: 'editar', cita: c }),
    reprogramar: (c) => abrirAgendar({ modo: 'reprogramar', cita: c }),
    guardarClienta: onGuardarClienta,
  });
  const paso = accionPrincipal(cita.status);
  const lineas = cita.services.length > 0
    ? cita.services
    : [{ serviceName: cita.service, employee: cita.employee, startTime: cita.time, duration: cita.duration }];
  // cada acción cierra la hoja antes (la ventana que abra queda arriba)
  const yCerrar = (f: () => void) => () => { onCerrar(); f(); };

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal hoja" role="dialog" aria-modal="true" aria-labelledby="hoja-tit" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2 id="hoja-tit">{cita.clientName}</h2>
            <span className={`estado estado--${cita.status}`}>{ETIQUETA_ESTADO[cita.status]}</span>
          </div>
          <button className="modal__close" onClick={onCerrar} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <div className="hoja__cuerpo">
          <p className="hoja__dia">{cita.date === fechaLocal() ? 'Hoy' : fechaTitulo(cita.date)}, {format12h(cita.time)}</p>
          <ul className="hoja__servicios">
            {lineas.map((l, i) => (
              <li key={i}>
                <b>{l.serviceName}</b>
                <span>{format12h(l.startTime || cita.time)} · {l.duration} min · con {l.employee}</span>
              </li>
            ))}
          </ul>
          {cita.notes && <p className="hoja__nota">{cita.notes}</p>}
          <div className="hoja__contacto">
            <a className="hoja__btn" href={enlaceWhatsApp(cita.clientPhone, `Hola ${cita.clientName}, te escribimos de Anadsll Beauty Esthetic.`)} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={17} aria-hidden="true" /> WhatsApp
            </a>
            <a className="hoja__btn" href={enlaceLlamar(cita.clientPhone)}><Phone size={17} aria-hidden="true" /> Llamar</a>
            {cita.client_id && (
              <button type="button" className="hoja__btn" onClick={yCerrar(() => navigate(`/admin/clientes/${cita.client_id}`))}>
                <UserRound size={17} aria-hidden="true" /> Ficha
              </button>
            )}
          </div>
        </div>
        <div className="hoja__pie">
          <MenuAcciones etiqueta={`Más acciones para la cita de ${cita.clientName}`}
            items={acciones.itemsDe(cita).map((it) => ({ ...it, onSelect: yCerrar(it.onSelect) }))} />
          {paso ? (
            <button type="button" className="hoja__btn hoja__btn--principal" onClick={yCerrar(() => acciones.avanzar(cita, paso))}>
              {ICONO_PRINCIPAL[paso.accion]} {paso.etiqueta}
            </button>
          ) : cita.status === 'completed' ? (
            <button type="button" className="hoja__btn hoja__btn--principal" onClick={yCerrar(() => promptNextSession(cita))}>
              <CalendarPlus size={18} aria-hidden="true" /> Agendar próxima
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
