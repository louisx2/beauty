import { indiceDestacado, type EstiloPaquetes, type PaquetePublico } from './paquetes';
import PaquetesMenu from './PaquetesMenu';
import PaquetesMembresia from './PaquetesMembresia';
import PaquetesAhorro from './PaquetesAhorro';
import { useRevela } from '../ui/useRevela';
import './Packages.css';

const PASOS = [
  { n: '01', t: 'Elige tu paquete', d: 'Según el tratamiento y las sesiones que tu piel necesita.' },
  { n: '02', t: 'Reserva en línea', d: 'Agenda tu primera sesión y las siguientes cuando te quede mejor.' },
  { n: '03', t: 'Sigue tu avance', d: 'En Mis citas ves cuántas sesiones llevas y cuántas te quedan.' },
];

/** Paquetes en el estilo elegido en el panel (spec §6.4) y la franja "Cómo funciona" (spec §5.4). */
export default function Packages({ paquetes, estilo }: { paquetes: PaquetePublico[]; estilo: EstiloPaquetes }) {
  const cabeza = useRevela<HTMLDivElement>();
  const lista = useRevela<HTMLDivElement>();
  const pasos = useRevela<HTMLOListElement>();
  const destacado = indiceDestacado(paquetes.length);

  return (
    <section className="s-sec s-pkg" id="s-paquetes" data-spy="" data-estilo={estilo}>
      <div className="s-wrap">
        <div className="s-sec-head s-sec-head--centro s-rv" ref={cabeza}>
          <p className="s-eyebrow">Paquetes con sesiones</p>
          <h2 className="s-display s-h2">Ahorra con nuestros <em>paquetes</em></h2>
          <p className="s-lead">Compra tu paquete de sesiones y obtén resultados duraderos a un precio especial.</p>
        </div>

        <div className="s-rv" ref={lista}>
          {estilo === 'membresia' && <PaquetesMembresia paquetes={paquetes} destacado={destacado} />}
          {estilo === 'ahorro' && <PaquetesAhorro paquetes={paquetes} destacado={destacado} />}
          {estilo === 'menu' && <PaquetesMenu paquetes={paquetes} destacado={destacado} />}
        </div>

        <ol className="s-how s-rv" ref={pasos}>
          {PASOS.map((s) => (
            <li key={s.n} className="s-how-paso">
              <b aria-hidden="true">{s.n}</b>
              <div><h4>{s.t}</h4><p>{s.d}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
