import { formatoTelefono, type ErroresDatos } from './datos';
import './PasoDatos.css';

export interface PasoDatosProps {
  nombre: string;
  telefono: string;
  notas: string;
  errores: ErroresDatos;
  onCambio: (campo: 'name' | 'phone' | 'notes', valor: string) => void;
}

/** Paso 3 (spec §6.1): nombre, WhatsApp y notas. Reservar usa los ids para llevar el foco al campo con error. */
export default function PasoDatos({ nombre, telefono, notas, errores, onCambio }: PasoDatosProps) {
  const descTelefono = ['r-telefono-nota', errores.telefono ? 'r-telefono-error' : ''].filter(Boolean).join(' ');
  return (
    <div className="s-campos">
      <div className="s-campo">
        <label htmlFor="r-nombre">Nombre completo</label>
        <input id="r-nombre" type="text" autoComplete="name" value={nombre}
          aria-invalid={errores.nombre ? true : undefined}
          aria-describedby={errores.nombre ? 'r-nombre-error' : undefined}
          onChange={(e) => onCambio('name', e.target.value)} />
        {errores.nombre && <small id="r-nombre-error" className="s-campo-error">{errores.nombre}</small>}
      </div>
      <div className="s-campo">
        <label htmlFor="r-telefono">Teléfono (WhatsApp)</label>
        <input id="r-telefono" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="829-000-0000"
          value={telefono} aria-invalid={errores.telefono ? true : undefined} aria-describedby={descTelefono}
          onChange={(e) => onCambio('phone', formatoTelefono(e.target.value))} />
        <small id="r-telefono-nota">Con este número verás tus citas en “Mis citas”.</small>
        {errores.telefono && <small id="r-telefono-error" className="s-campo-error">{errores.telefono}</small>}
      </div>
      <div className="s-campo s-campo--full">
        <label htmlFor="r-notas">Notas para tu especialista (opcional)</label>
        <textarea id="r-notas" rows={3} value={notas}
          placeholder="Alergias, si es tu primera vez, algo que debamos saber…"
          onChange={(e) => onCambio('notes', e.target.value)} />
      </div>
    </div>
  );
}
