import { useState } from 'react';
import { MONOGRAMA } from '../brand';
import { useRevela } from '../ui/useRevela';
import type { MiembroPublico } from './equipo';
import './Team.css';

/** Nuestro equipo: retratos en arco con nombre, cargo y especialidades, sin carrusel (spec §5.7 y §6.5). */
export default function Team({ miembros }: { miembros: MiembroPublico[] }) {
  const cabeza = useRevela<HTMLDivElement>();
  const grilla = useRevela<HTMLUListElement>();
  return (
    <section className="s-sec s-team" id="s-equipo" data-spy="">
      <div className="s-wrap">
        <div className="s-sec-head s-rv" ref={cabeza}>
          <div>
            <p className="s-eyebrow">Nuestro equipo</p>
            <h2 className="s-display s-h2">Manos <em>expertas</em> que te cuidan</h2>
          </div>
          <p className="s-lead">Cada tratamiento lo realiza una especialista formada en su área. Al reservar, puedes elegir con quién.</p>
        </div>
        <ul className="s-team-grid s-rv" ref={grilla}>
          {miembros.map((m) => <Miembro key={m.id} m={m} />)}
        </ul>
      </div>
    </section>
  );
}

function Miembro({ m }: { m: MiembroPublico }) {
  // si la foto no carga (borrada del almacenamiento), van las iniciales en vez del ícono roto
  const [fotoRota, setFotoRota] = useState(false);
  const foto = fotoRota ? null : m.foto;
  return (
    <li className="s-tm">
      <div className={foto ? 's-arco s-tm-arco' : 's-arco s-tm-arco is-ph'}>
        {foto ? (
          // el nombre va justo debajo: la foto no repite nada al lector de pantalla
          <img src={foto} alt="" loading="lazy" decoding="async" onError={() => setFotoRota(true)} />
        ) : m.iniciales ? (
          <span className="s-tm-ini" aria-hidden="true">{m.iniciales}</span>
        ) : (
          <img src={MONOGRAMA} alt="" width={497} height={839} loading="lazy" />
        )}
      </div>
      <h3 className="s-display s-tm-nombre">{m.nombre}</h3>
      {m.cargo && <p className="s-tm-cargo">{m.cargo}</p>}
      {m.especialidades && <p className="s-tm-tags">{m.especialidades}</p>}
    </li>
  );
}
