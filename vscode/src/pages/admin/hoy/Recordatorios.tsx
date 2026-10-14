import { useState } from 'react';
import toast from 'react-hot-toast';
import { Check, CheckCircle2, MessageCircle, X } from 'lucide-react';
import { useAppointmentStore, type Appointment } from '../../../store/appointmentStore';
import { useAgendarStore } from '../../../store/agendarStore';
import { format12h } from '../../../lib/timeFormat';
import { ETIQUETA_ESTADO } from '../../../lib/estadosCita';
import { destinoWhatsApp, enlaceWhatsApp, modoWhatsApp } from '../../../lib/enlaces';
import ElegirWhatsApp from '../../../components/ElegirWhatsApp';
import { fechaTitulo } from '../../../site/reservar/resumen';
import MenuAcciones from '../../../components/MenuAcciones';
import { primerNombre } from '../citas/proximaCita';
import { useAccionesCita } from '../citas/useAccionesCita';
import { mensajeRecordatorio, resumenRecordatorios, siguienteParaAvisar, type Marcas } from './avisos';
import './Recordatorios.css';

interface Props {
  manana: string;
  citas: Appointment[];
  marcas: Marcas;
  onMarcar: (id: string) => void;
  onCerrar: () => void;
}

/**
 * Recordatorios de mañana: cada cita con su mensaje listo para WhatsApp (primero las que faltan por confirmar). Al
 * tocar "Recordar" se abre WhatsApp y queda anotado que ya se le escribió; "Confirmó" la deja confirmada.
 */
export default function Recordatorios({ manana, citas, marcas, onMarcar, onCerrar }: Props) {
  const updateStatus = useAppointmentStore((s) => s.updateStatus);
  const abrirAgendar = useAgendarStore((s) => s.abrir);
  const acciones = useAccionesCita({
    editar: (c) => abrirAgendar({ modo: 'editar', cita: c }),
    reprogramar: (c) => abrirAgendar({ modo: 'reprogramar', cita: c }),
    guardarClienta: () => {},
  });
  const [modo, setModo] = useState(modoWhatsApp);
  const r = resumenRecordatorios(citas, marcas);
  const siguiente = siguienteParaAvisar(citas, marcas);

  const confirmo = async (c: Appointment) => {
    if (await updateStatus(c.id, 'confirmed')) toast.success(`${primerNombre(c.clientName)} confirmó`);
  };

  const recordar = (c: Appointment, texto: string, clase: string) => (
    <a className={clase} href={enlaceWhatsApp(c.clientPhone, mensajeRecordatorio(c), modo)} target={destinoWhatsApp(modo)} rel="noopener noreferrer"
      onClick={() => onMarcar(c.id)} aria-label={`${texto} a ${c.clientName} por WhatsApp`}>
      <MessageCircle size={17} aria-hidden="true" /> {texto}
    </a>
  );

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal recor" role="dialog" aria-modal="true" aria-labelledby="recor-tit" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <h2 id="recor-tit">Recordatorios de mañana</h2>
            <p className="recor__sub">{fechaTitulo(manana)} · {r.total === 1 ? '1 cita' : `${r.total} citas`}</p>
          </div>
          <button className="modal__close" onClick={onCerrar} aria-label="Cerrar"><X size={20} /></button>
        </div>

        <div className="recor__cuerpo">
          {citas.length === 0 ? (
            <p className="recor__vacio">Mañana no hay citas por recordar.</p>
          ) : (
            <>
              <div className="recor__avance" aria-live="polite">
                <span><b>{r.total - r.sinAvisar}</b> de {r.total} avisadas</span>
                <span><b>{r.porConfirmar}</b> por confirmar</span>
                <i aria-hidden="true"><i style={{ width: `${Math.round(((r.total - r.sinAvisar) / r.total) * 100)}%` }} /></i>
              </div>

              {siguiente ? (
                <div className="recor__siguiente">
                  <span>
                    <small>Sigue</small>
                    <b>{siguiente.clientName}</b>
                    <span>{format12h(siguiente.time)} · {siguiente.service}</span>
                  </span>
                  {recordar(siguiente, 'Recordarle', 'hoy__btn hoy__btn--principal')}
                </div>
              ) : (
                <p className="recor__listo"><CheckCircle2 size={18} aria-hidden="true" /> Ya se les escribió a todas.</p>
              )}

              <ul className="recor__lista">
                {citas.map((c) => {
                  const marca = marcas[c.id];
                  return (
                    <li key={c.id} className={`recor__fila ${marca ? 'is-avisada' : ''}`}>
                      <span className="recor__hora">{format12h(c.time)}</span>
                      <span className="recor__quien">
                        <b>{c.clientName}</b>
                        <span>{c.service} · con {primerNombre(c.employee)}</span>
                        <span className="recor__estado">
                          <em className={`estado estado--${c.status}`}>{ETIQUETA_ESTADO[c.status]}</em>
                          {marca && <small><Check size={13} aria-hidden="true" /> Avisada a las {format12h(marca.hora)}</small>}
                        </span>
                      </span>
                      <span className="recor__acciones">
                        {recordar(c, marca ? 'Otra vez' : 'Recordar', 'hoy__btn hoy__btn--chico')}
                        {c.status === 'pending' && (
                          <button type="button" className="hoy__btn hoy__btn--chico" onClick={() => confirmo(c)}>Confirmó</button>
                        )}
                        <MenuAcciones etiqueta={`Más acciones para la cita de ${c.clientName}`}
                          items={acciones.itemsDe(c).map((it) => ({ ...it, onSelect: () => { onCerrar(); it.onSelect(); } }))} />
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="recor__nota">Se anota en este equipo a quién ya se le escribió hoy.</p>
              <ElegirWhatsApp modo={modo} onCambio={setModo} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
