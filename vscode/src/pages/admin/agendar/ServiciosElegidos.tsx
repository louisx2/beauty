import { Fragment, useId, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useServiceStore, type Service } from '../../../store/serviceStore';
import { quienPuede, type Elegido, type Especialista } from '../../../site/reservar/disponibilidad';
import { duracionTexto } from '../../../site/reservar/resumen';
import { buscarServicios, categoriaDe } from './agendar';
import './Ventana.css';

interface Props {
  elegidos: Elegido[];
  especialistas: Especialista[];
  onCambiar: (lista: Elegido[]) => void;
  /** cada servicio con quién lo hace (al agendar); sin esto, la especialista se elige aparte (Atender ahora) */
  conQuien?: boolean;
  /** al agregar un servicio, quién lo hace si se sabe (el hueco de su columna en Hoy) */
  alAgregar?: (e: Elegido) => Elegido;
}

/** Qué se le va a hacer: los servicios elegidos (con quién los hace) y una caja para buscar otro y agregarlo.
 *  Solo se ofrece lo que alguien del equipo sabe hacer. */
export default function ServiciosElegidos({ elegidos, especialistas, onCambiar, conQuien, alAgregar = (e) => e }: Props) {
  const services = useServiceStore((s) => s.services);

  const opciones = useMemo(
    () => services.filter((s) => s.active && !elegidos.some((e) => e.serviceId === s.id) && quienPuede(especialistas, s.id).length > 0),
    [services, elegidos, especialistas],
  );

  const agregar = (s: Service) =>
    onCambiar([...elegidos, alAgregar({ serviceId: s.id, staffId: '', nombre: s.name, duracion: s.duration || 45 })]);

  return (
    <>
      {elegidos.length > 0 && (
        <ul className="prox__servicios">
          {elegidos.map((e, i) => {
            const pueden = quienPuede(especialistas, e.serviceId);
            return (
              <li key={`${e.serviceId}-${i}`} className="prox__servicio">
                <div className="prox__servicio-nom"><b>{e.nombre}</b><span>{duracionTexto(e.duracion)}</span></div>
                {conQuien && (
                  <select aria-label={`Quién hace ${e.nombre}`} value={e.staffId}
                    onChange={(ev) => onCambiar(elegidos.map((x, j) => (j === i ? { ...x, staffId: ev.target.value } : x)))}>
                    {pueden.length !== 1 && <option value="">Cualquiera disponible</option>}
                    {pueden.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                )}
                <button type="button" className="prox__quitar" aria-label={`Quitar ${e.nombre}`}
                  onClick={() => onCambiar(elegidos.filter((_, j) => j !== i))}><X size={15} /></button>
              </li>
            );
          })}
        </ul>
      )}
      {opciones.length > 0 && <BuscarServicio opciones={opciones} primero={elegidos.length === 0} onElegir={agregar} />}
    </>
  );
}

const dinero = (n: number) => `RD$ ${n.toLocaleString('es-DO')}`;

/**
 * Caja para buscar un servicio por nombre (sin tildes) o categoría. Al tocarla, sin escribir, se ven todos por
 * categoría para recorrerlos; al escribir, solo los que coinciden. Con el teclado: flechas, Enter y Escape.
 */
function BuscarServicio({ opciones, primero, onElegir }: { opciones: Service[]; primero: boolean; onElegir: (s: Service) => void }) {
  const [texto, setTexto] = useState('');
  const [abierta, setAbierta] = useState(false);
  const [activo, setActivo] = useState(0);
  const caja = useRef<HTMLInputElement>(null);
  const id = useId();
  const lista = useMemo(() => buscarServicios(opciones, texto), [opciones, texto]);
  const enFoco = Math.min(activo, lista.length - 1);

  const elegir = (s: Service) => {
    onElegir(s);
    setTexto('');
    setActivo(0);
    setAbierta(false);
    caja.current?.blur();
  };

  const teclas = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAbierta(true);
      setActivo(Math.min(enFoco + 1, lista.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivo(Math.max(enFoco - 1, 0));
    } else if (e.key === 'Enter' && abierta && lista[enFoco]) {
      e.preventDefault();
      elegir(lista[enFoco]);
    } else if (e.key === 'Escape' && abierta) {
      e.stopPropagation();
      setAbierta(false);
    }
  };

  return (
    <div className="busv">
      <label className={`busv__caja ${abierta ? 'is-abierta' : ''}`}>
        <Search size={17} aria-hidden="true" />
        <span className="busv__oculto">Buscar servicio</span>
        <input
          ref={caja}
          role="combobox"
          aria-expanded={abierta}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          aria-activedescendant={abierta && lista[enFoco] ? `${id}-${lista[enFoco].id}` : undefined}
          value={texto}
          autoComplete="off"
          placeholder={primero ? 'Buscar servicio: cejas, láser, limpieza…' : 'Agregar otro servicio'}
          onChange={(e) => { setTexto(e.target.value); setActivo(0); setAbierta(true); }}
          onFocus={() => setAbierta(true)}
          onBlur={() => setAbierta(false)}
          onKeyDown={teclas}
        />
        {texto && (
          <button type="button" className="busv__borrar" aria-label="Borrar la búsqueda"
            onMouseDown={(e) => e.preventDefault()} onClick={() => { setTexto(''); setActivo(0); caja.current?.focus(); }}>
            <X size={16} />
          </button>
        )}
      </label>

      {abierta && (
        // tocar una opción no le quita el foco a la caja (si no, la lista se cerraría antes de elegir)
        <ul id={`${id}-lista`} role="listbox" aria-label="Servicios" className="busv__lista" onMouseDown={(e) => e.preventDefault()}>
          {lista.length === 0 ? (
            <li className="busv__nada" role="presentation">Ningún servicio con “{texto.trim()}”.</li>
          ) : lista.map((s, i) => (
            <Fragment key={s.id}>
              {!texto.trim() && (i === 0 || categoriaDe(lista[i - 1]) !== categoriaDe(s)) && (
                <li className="busv__grupo" role="presentation">{categoriaDe(s)}</li>
              )}
              <li id={`${id}-${s.id}`} role="option" aria-selected={i === enFoco} className={`busv__opcion ${i === enFoco ? 'is-on' : ''}`}
                onClick={() => elegir(s)} onMouseMove={() => setActivo(i)}>
                <b>{s.name}</b>
                <span>
                  {texto.trim() && `${categoriaDe(s)} · `}{duracionTexto(s.duration || 45)}{s.price > 0 && ` · ${dinero(s.price)}`}
                </span>
              </li>
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}
