import { useMemo, useState } from 'react';
import { AlertTriangle, Search, UserPlus } from 'lucide-react';
import { useClientStore, type Client } from '../../../store/clientStore';
import { capitalizarNombre } from '../../../lib/nombres';
import { buscarClientas, clientaConTelefono, formatoTelefono } from '../atender/atender';
import { clientaDe, type ClientaAgenda } from './reglas';
import '../atender/AtenderAhora.css';

export interface NuevaClienta { nombre: string; telefono: string }
export type ErroresNueva = { nombre?: string; telefono?: string };

const iniciales = (nombre: string) => nombre.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

interface Props {
  clienta: ClientaAgenda | null;
  nueva: NuevaClienta | null;
  errores: ErroresNueva;
  /** la cita ya es de ella (moverla, su paquete, la próxima): no se cambia */
  fija?: boolean;
  onClienta: (c: ClientaAgenda | null) => void;
  onNueva: (n: NuevaClienta | null) => void;
  onErrores: (e: ErroresNueva) => void;
}

/**
 * La clienta de la cita: buscarla por nombre o teléfono, o crearla sin duplicar (si el teléfono ya es de otra ficha,
 * se ofrece usar esa). Con la clienta elegida se ven sus alergias. La usan Agendar y Atender ahora.
 */
export default function ElegirClienta({ clienta, nueva, errores, fija, onClienta, onNueva, onErrores }: Props) {
  const clients = useClientStore((s) => s.clients);
  const [busqueda, setBusqueda] = useState('');
  const resultados = useMemo(() => buscarClientas(clients, busqueda), [clients, busqueda]);
  const duplicada = nueva ? clientaConTelefono(clients, nueva.telefono) : null;

  const elegir = (c: Client) => { onClienta(clientaDe(c)); onNueva(null); setBusqueda(''); };
  const empezarNueva = () => {
    const soloDigitos = busqueda.replace(/\D/g, '');
    onNueva(soloDigitos.length >= 7
      ? { nombre: '', telefono: formatoTelefono(soloDigitos) }
      : { nombre: capitalizarNombre(busqueda.trim()), telefono: '' });
    onErrores({});
    setBusqueda('');
  };

  if (clienta) {
    // las alergias, de la ficha al día
    const ficha = clienta.id ? clients.find((c) => c.id === clienta.id) : undefined;
    const alergias = ficha?.allergies ?? clienta.alergias;
    const telefono = clienta.telefono || ficha?.phone;
    return (
      <div className="at__ficha">
        <span className="at__ini" aria-hidden="true">{iniciales(clienta.nombre)}</span>
        <div className="at__ficha-txt">
          <b>{clienta.nombre}</b>
          <span>{telefono || 'Sin teléfono'}{!clienta.id && ' · sin ficha'}</span>
          {alergias && <span className="at__alergia"><AlertTriangle size={14} aria-hidden="true" /> Alergias: {alergias}</span>}
        </div>
        {!fija && <button type="button" className="at__cambiar" onClick={() => onClienta(null)}>Cambiar</button>}
      </div>
    );
  }

  if (nueva) {
    return (
      <div className="at__nueva">
        <div className="modal__row">
          <label className="modal__field">
            <span className="at__lbl">Nombre</span>
            <input value={nueva.nombre} autoFocus={!nueva.nombre} placeholder="Nombre y apellido" autoComplete="off"
              className={errores.nombre ? 'input--error' : ''}
              onChange={(e) => { onNueva({ ...nueva, nombre: capitalizarNombre(e.target.value) }); onErrores({ ...errores, nombre: undefined }); }} />
            {errores.nombre && <span className="field-error">{errores.nombre}</span>}
          </label>
          <label className="modal__field">
            <span className="at__lbl">Teléfono</span>
            <input type="tel" inputMode="tel" value={nueva.telefono} autoFocus={!!nueva.nombre} placeholder="829-000-0000" maxLength={12}
              className={errores.telefono ? 'input--error' : ''}
              onChange={(e) => { onNueva({ ...nueva, telefono: formatoTelefono(e.target.value) }); onErrores({ ...errores, telefono: undefined }); }} />
            {errores.telefono && <span className="field-error">{errores.telefono}</span>}
          </label>
        </div>
        {duplicada && (
          <div className="at__aviso">
            <span>Ese teléfono ya es de <b>{duplicada.name}</b>.</span>
            <button type="button" className="at__cambiar" onClick={() => elegir(duplicada)}>Usar su ficha</button>
          </div>
        )}
        <button type="button" className="at__enlace" onClick={() => onNueva(null)}>Buscar una clienta registrada</button>
      </div>
    );
  }

  return (
    <div className="at__buscar">
      <label className="at__buscador">
        <Search size={18} aria-hidden="true" />
        <span className="at__oculto">Buscar clienta por nombre o teléfono</span>
        <input value={busqueda} autoFocus placeholder="Nombre o teléfono" autoComplete="off" onChange={(e) => setBusqueda(e.target.value)} />
      </label>
      {resultados.length > 0 && (
        <ul className="at__resultados">
          {resultados.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => elegir(c)}>
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
  );
}
