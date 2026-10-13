import { useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import { useServiceStore, type Service } from '../../../store/serviceStore';
import { quienPuede, type Elegido, type Especialista } from '../../../site/reservar/disponibilidad';
import { duracionTexto } from '../../../site/reservar/resumen';
import './Ventana.css';

const CATEGORIAS: Record<string, string> = {
  facial: 'Facial', laser: 'Láser', corporal: 'Corporal', belleza: 'Cejas, pestañas y maquillaje', medicina: 'Medicina estética',
};

interface Props {
  elegidos: Elegido[];
  especialistas: Especialista[];
  onCambiar: (lista: Elegido[]) => void;
  /** cada servicio con quién lo hace (al agendar); sin esto, la especialista se elige aparte (Atender ahora) */
  conQuien?: boolean;
  /** al agregar un servicio, quién lo hace si se sabe (el hueco de su columna en Hoy) */
  alAgregar?: (e: Elegido) => Elegido;
}

/** Qué se le va a hacer: los servicios elegidos (con quién los hace) y la lista para agregar otro, por categoría.
 *  Solo se ofrece lo que alguien del equipo sabe hacer. */
export default function ServiciosElegidos({ elegidos, especialistas, onCambiar, conQuien, alAgregar = (e) => e }: Props) {
  const services = useServiceStore((s) => s.services);

  const porCategoria = useMemo(() => {
    const grupos = new Map<string, Service[]>();
    for (const s of services) {
      if (!s.active || elegidos.some((e) => e.serviceId === s.id) || quienPuede(especialistas, s.id).length === 0) continue;
      const g = CATEGORIAS[s.category] ?? 'Otros';
      grupos.set(g, [...(grupos.get(g) ?? []), s]);
    }
    return [...grupos.entries()].map(([g, delGrupo]) => [g, delGrupo.sort((a, b) => a.name.localeCompare(b.name, 'es'))] as const);
  }, [services, elegidos, especialistas]);

  const agregar = (id: string) => {
    const s = services.find((x) => x.id === id);
    if (s) onCambiar([...elegidos, alAgregar({ serviceId: s.id, staffId: '', nombre: s.name, duracion: s.duration || 45 })]);
  };

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
    </>
  );
}
