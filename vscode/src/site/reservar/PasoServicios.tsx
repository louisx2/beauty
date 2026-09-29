import { useId, useMemo, useState } from 'react';
import { servicesMenu, type FamiliaId } from '../../data/servicesMenu';
import { FAMILIAS } from '../landing/catalogo';
import { iniciales } from '../landing/equipo';
import SesionesOvalos from '../ui/SesionesOvalos';
import { quienPuede, type Especialista } from './disponibilidad';
import { filtrarServicios, type ServicioReserva } from './servicios';
import type { PaqueteBase, Pick, TipoReserva } from './useBooking';
import './PasoServicios.css';

export interface PasoServiciosProps {
  tipo: TipoReserva;
  onTipo: (tipo: TipoReserva) => void;
  servicios: ServicioReserva[];
  staff: Especialista[];
  /** solo los servicios elegidos de verdad (con serviceId) */
  picks: Pick[];
  onAlternar: (serviceId: string) => void;
  onEspecialista: (serviceId: string, staffId: string) => void;
  paquetes: PaqueteBase[];
  paqueteId: string;
  onPaquete: (packageId: string) => void;
  especialistaPaquete: string;
  onEspecialistaPaquete: (staffId: string) => void;
  /** especialidad que viene del catálogo (?categoria=); null si no vino */
  categoriaInicial: string | null;
  cargando: boolean;
}

const nombreFamilia = (f: FamiliaId) => FAMILIAS.find((x) => x.id === f)?.corto ?? '';

/** Paso 1 (spec §6.1): servicios con buscador y familias, o "Tengo un paquete"; con quién en cada uno. */
export default function PasoServicios(p: PasoServiciosProps) {
  const [texto, setTexto] = useState('');
  const [familia, setFamilia] = useState<FamiliaId | 'todas'>(
    () => servicesMenu.find((c) => c.id === p.categoriaInicial)?.familia ?? 'todas',
  );
  const [categoria, setCategoria] = useState<string | null>(p.categoriaInicial);
  const idBuscar = useId();
  const grupoTipo = useId();
  const grupoPaquete = useId();
  const lista = useMemo(
    () => filtrarServicios(p.servicios, { texto, familia, categoria }),
    [p.servicios, texto, familia, categoria],
  );
  const tituloCategoria = categoria ? servicesMenu.find((c) => c.id === categoria)?.title : null;
  const paquete = p.paquetes.find((x) => x.id === p.paqueteId);

  return (
    <>
      <fieldset className="s-seg">
        <legend className="s-sr">Qué vas a reservar</legend>
        <label>
          <input type="radio" name={grupoTipo} checked={p.tipo === 'service'} onChange={() => p.onTipo('service')} />
          <span>Servicios</span>
        </label>
        <label>
          <input type="radio" name={grupoTipo} checked={p.tipo === 'package'} onChange={() => p.onTipo('package')} />
          <span>Tengo un paquete</span>
        </label>
      </fieldset>

      {p.tipo === 'service' ? (
        <>
          {p.picks.length > 0 && (
            <ul className="s-picks">
              {p.picks.map((pick) => {
                const s = p.servicios.find((x) => x.id === pick.serviceId);
                if (!s) return null;
                return (
                  <li key={s.id} className="s-pick">
                    <div className="s-pick-top">
                      <b>{s.nombre}</b>
                      <span>{s.duracion} min</span>
                      <button type="button" onClick={() => p.onAlternar(s.id)} aria-label={`Quitar ${s.nombre}`}>×</button>
                    </div>
                    <Quien servicio={s.nombre} opciones={quienPuede(p.staff, s.id)} elegida={pick.staffId}
                      onElegir={(staffId) => p.onEspecialista(s.id, staffId)} />
                  </li>
                );
              })}
            </ul>
          )}

          <label className="s-buscar" htmlFor={idBuscar}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <span className="s-sr">Buscar servicio</span>
            <input id={idBuscar} type="search" value={texto} autoComplete="off"
              placeholder="Buscar servicio… (ej. láser, cejas, labios)" onChange={(e) => setTexto(e.target.value)} />
          </label>

          <div className="s-fams" role="group" aria-label="Tipo de tratamiento">
            {[{ id: 'todas' as const, corto: 'Todos' }, ...FAMILIAS].map((f) => (
              <button key={f.id} type="button" className={`s-fam ${familia === f.id ? 'is-on' : ''}`}
                aria-pressed={familia === f.id} onClick={() => { setFamilia(f.id); setCategoria(null); }}>
                {f.corto}
              </button>
            ))}
          </div>

          {tituloCategoria && (
            <p className="s-filtro">
              Mostrando <b>{tituloCategoria}</b>
              <button type="button" onClick={() => setCategoria(null)}>Ver todos</button>
            </p>
          )}

          <div className="s-svlist" role="group" aria-label="Servicios">
            {p.cargando ? (
              <p className="s-vacio">Cargando servicios…</p>
            ) : lista.length === 0 ? (
              <p className="s-vacio">No encontramos ese servicio. Prueba con otra palabra o escríbenos por WhatsApp.</p>
            ) : (
              lista.map((s) => {
                const on = p.picks.some((x) => x.serviceId === s.id);
                return (
                  <label key={s.id} className={`s-sv ${on ? 'is-on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => p.onAlternar(s.id)} />
                    <span className="s-sv-ck" aria-hidden="true">✓</span>
                    <span className="s-sv-nm">
                      {s.nombre}
                      {s.familia && <small>{nombreFamilia(s.familia)}</small>}
                    </span>
                    <span className="s-sv-meta">
                      <span className="s-sv-du">{s.duracion} min</span>
                      <span className={`s-sv-pr ${s.conPrecio ? '' : 'is-na'}`}>{s.precio}</span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </>
      ) : (
        <>
          {p.paquetes.length === 0 ? (
            <p className="s-vacio">{p.cargando ? 'Cargando paquetes…' : 'Por ahora no hay paquetes disponibles.'}</p>
          ) : (
            <fieldset className="s-pkgs">
              <legend className="s-sr">Tu paquete</legend>
              {p.paquetes.map((x) => (
                <label key={x.id} className={`s-pkc ${x.id === p.paqueteId ? 'is-on' : ''}`}>
                  <input type="radio" name={grupoPaquete} checked={x.id === p.paqueteId} onChange={() => p.onPaquete(x.id)} />
                  <b>{x.name}</b>
                  <span>
                    {x.services?.name ?? 'Sesión'}
                    {x.services?.duration ? ` · ${x.services.duration} min` : ''}
                  </span>
                  <SesionesOvalos sesiones={x.sessions} />
                </label>
              ))}
            </fieldset>
          )}
          {paquete && (
            <div className="s-pick">
              <div className="s-pick-top">
                <b>Sesión de {paquete.name}</b>
                {paquete.services?.duration ? <span>{paquete.services.duration} min</span> : null}
              </div>
              <Quien servicio={paquete.name} opciones={quienPuede(p.staff, paquete.service_id)}
                elegida={p.especialistaPaquete} onElegir={p.onEspecialistaPaquete} />
            </div>
          )}
          <p className="s-hint">Reserva aquí cada sesión del paquete que ya compraste. La sesión se descuenta al completarla.</p>
        </>
      )}
    </>
  );
}

/** "Con": Cualquiera y las caras de quienes hacen ese servicio. Son radios de verdad, así que el teclado funciona solo. */
function Quien({ servicio, opciones, elegida, onElegir }: {
  servicio: string; opciones: Especialista[]; elegida: string; onElegir: (staffId: string) => void;
}) {
  const grupo = useId();
  return (
    <fieldset className="s-quien">
      <legend>Con<span className="s-sr"> quién: {servicio}</span></legend>
      <div className="s-quien-op">
        <label className={`s-av ${elegida === '' ? 'is-on' : ''}`}>
          <input type="radio" name={grupo} checked={elegida === ''} onChange={() => onElegir('')} />
          <i aria-hidden="true">✦</i>Cualquiera
        </label>
        {opciones.map((m) => (
          <label key={m.id} className={`s-av ${elegida === m.id ? 'is-on' : ''}`}>
            <input type="radio" name={grupo} checked={elegida === m.id} onChange={() => onElegir(m.id)} />
            {m.avatar_url ? <img src={m.avatar_url} alt="" loading="lazy" /> : <i aria-hidden="true">{iniciales(m.name) || 'N'}</i>}
            {m.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
