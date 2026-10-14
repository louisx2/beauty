import { useState } from 'react';
import { AlertCircle, AlertTriangle, Cake, FileText, Heart, Mail, MapPin, Phone, Shield, User, X } from 'lucide-react';
import { useClientStore, type Client } from '../../../store/clientStore';
import { capitalizarNombre } from '../../../lib/nombres';
import { fechaLocal } from '../../../lib/fechas';
import { MESES } from '../../../site/reservar/calendario';
import { formatoTelefono, telefonoClave } from '../atender/atender';
import { fechaDeCumple, partesDeCumple } from './cumples';
import { errorDeTelefono } from './ficha';
import '../atender/AtenderAhora.css';
import './EditarClienta.css';

const TIPOS_DE_PIEL = ['Normal', 'Seca', 'Grasa', 'Mixta', 'Sensible'];

/** Cédula dominicana mientras se escribe: 001-0000000-0. */
function formatoCedula(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 10)}-${d.slice(10)}`;
}

interface Form {
  name: string; phone: string; cedula: string; email: string; skin_type: string; allergies: string; notes: string; address: string;
  /** cumpleaños: día, mes y año (opcional) */
  cdia: string; cmes: string; canio: string;
}
type Errores = Partial<Record<keyof Form, string>>;

const deClienta = (c: Client | null): Form => ({
  name: c?.name ?? '', phone: c?.phone ?? '', cedula: c?.cedula ?? '', email: c?.email ?? '',
  skin_type: c?.skin_type ?? '', allergies: c?.allergies ?? '', notes: c?.notes ?? '', address: c?.address ?? '',
  ...(({ dia, mes, anio }) => ({ cdia: dia, cmes: mes, canio: anio }))(partesDeCumple(c?.birthday)),
});

/** `telefonoAntes`: el que tenía la ficha (null si es nueva) */
function validar(f: Form, telefonoAntes: string | null): Errores {
  const e: Errores = {};
  if (f.name.trim().length < 2) e.name = 'Escribe su nombre';
  const tel = errorDeTelefono(f.phone, telefonoAntes);
  if (tel) e.phone = tel;
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Correo no válido';
  if (f.cedula && f.cedula.replace(/\D/g, '').length !== 11) e.cedula = 'Cédula de 11 dígitos';
  const cumple = fechaDeCumple({ dia: f.cdia, mes: f.cmes, anio: f.canio }, fechaLocal());
  if (cumple.error) e.cdia = cumple.error;
  return e;
}

interface Props {
  /** null: clienta nueva */
  clienta: Client | null;
  onCerrar: () => void;
  /** al guardar; con la clienta como quedó */
  onGuardada: (c: Client) => void;
  /** si el teléfono ya es de otra ficha, ir a esa */
  onVerOtra: (c: Client) => void;
}

/** Nueva clienta o sus datos: nombre, teléfono (sin repetir el de otra ficha), dirección, cédula, correo, piel, alergias
 *  y notas. */
export default function EditarClienta({ clienta, onCerrar, onGuardada, onVerOtra }: Props) {
  const { clients, addClient, updateClient } = useClientStore();
  const [form, setForm] = useState<Form>(() => deClienta(clienta));
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);

  const clave = telefonoClave(form.phone);
  const otra = clave.length === 10 ? clients.find((c) => c.id !== clienta?.id && telefonoClave(c.phone) === clave) : undefined;

  const cambiar = (campo: keyof Form, valor: string) => {
    setForm({ ...form, [campo]: valor });
    setErrores({ ...errores, [campo]: undefined });
  };
  // el error del cumpleaños (día, mes o año) se muestra en uno solo
  const cambiarCumple = (campo: 'cdia' | 'cmes' | 'canio', valor: string) => {
    setForm({ ...form, [campo]: valor });
    setErrores({ ...errores, cdia: undefined });
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validar(form, clienta ? clienta.phone : null);
    setErrores(errs);
    if (Object.keys(errs).length > 0 || otra) return;
    setGuardando(true);
    try {
      const datos = {
        name: form.name.trim(),
        phone: form.phone,
        cedula: form.cedula.trim() || null,
        email: form.email.trim() || null,
        skin_type: form.skin_type || null,
        allergies: form.allergies.trim() || null,
        notes: form.notes.trim() || null,
        address: form.address.trim() || null,
        birthday: fechaDeCumple({ dia: form.cdia, mes: form.cmes, anio: form.canio }, fechaLocal()).fecha,
      };
      if (clienta) {
        if (await updateClient(clienta.id, datos)) onGuardada({ ...clienta, ...datos });
      } else {
        const nueva = await addClient({ ...datos, source: 'manual' });
        if (nueva) onGuardada(nueva);
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal edc" role="dialog" aria-modal="true" aria-labelledby="edc-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 id="edc-titulo">{clienta ? 'Datos de la clienta' : 'Nueva clienta'}</h2>
          <button className="modal__close" onClick={onCerrar} aria-label="Cerrar"><X size={20} /></button>
        </div>
        <form onSubmit={guardar} className="modal__form" noValidate>
          <div className="modal__row">
            <div className="modal__field">
              <label htmlFor="edc-nombre"><User size={14} aria-hidden="true" /> Nombre y apellido *</label>
              <input id="edc-nombre" value={form.name} autoFocus={!clienta} autoComplete="off" className={errores.name ? 'input--error' : ''}
                onChange={(e) => cambiar('name', capitalizarNombre(e.target.value))} />
              {errores.name && <span className="field-error"><AlertCircle size={12} /> {errores.name}</span>}
            </div>
            <div className="modal__field">
              <label htmlFor="edc-telefono"><Phone size={14} aria-hidden="true" /> Teléfono{clienta && !clienta.phone ? '' : ' *'}</label>
              <input id="edc-telefono" type="tel" inputMode="tel" placeholder="829-000-0000" maxLength={12} value={form.phone}
                className={errores.phone || otra ? 'input--error' : ''} onChange={(e) => cambiar('phone', formatoTelefono(e.target.value))} />
              {errores.phone && <span className="field-error"><AlertCircle size={12} /> {errores.phone}</span>}
              {!errores.phone && clienta && !form.phone && <span className="edc__pista">Sin teléfono: pídeselo para escribirle y recordarle sus citas.</span>}
            </div>
          </div>
          {otra && (
            <div className="at__aviso">
              <span>Ese teléfono ya es de <b>{otra.name}</b>.</span>
              <button type="button" className="at__cambiar" onClick={() => onVerOtra(otra)}>Ver su ficha</button>
            </div>
          )}

          <div className="modal__field edc__alergias">
            <label htmlFor="edc-alergias"><AlertTriangle size={14} aria-hidden="true" /> Alergias o cuidados</label>
            <textarea id="edc-alergias" rows={2} value={form.allergies} placeholder="Ej. ácido salicílico, lidocaína, embarazo, piel sensible al láser…"
              onChange={(e) => cambiar('allergies', e.target.value)} />
          </div>

          <div className="modal__row">
            <div className="modal__field">
              <label htmlFor="edc-piel"><Heart size={14} aria-hidden="true" /> Tipo de piel</label>
              <select id="edc-piel" value={form.skin_type} onChange={(e) => cambiar('skin_type', e.target.value)}>
                <option value="">Sin anotar</option>
                {TIPOS_DE_PIEL.map((t) => <option key={t} value={t}>{t}</option>)}
                {form.skin_type && !TIPOS_DE_PIEL.includes(form.skin_type) && <option value={form.skin_type}>{form.skin_type}</option>}
              </select>
            </div>
            <div className="modal__field">
              <label htmlFor="edc-cedula"><Shield size={14} aria-hidden="true" /> Cédula</label>
              <input id="edc-cedula" inputMode="numeric" placeholder="001-0000000-0" maxLength={13} value={form.cedula}
                className={errores.cedula ? 'input--error' : ''} onChange={(e) => cambiar('cedula', formatoCedula(e.target.value))} />
              {errores.cedula && <span className="field-error"><AlertCircle size={12} /> {errores.cedula}</span>}
            </div>
          </div>
          <fieldset className="modal__field edc__cumple">
            <legend><Cake size={14} aria-hidden="true" /> Cumpleaños <span>(opcional; el año, si lo quiere dar)</span></legend>
            <div className="edc__cumple-campos">
              <select aria-label="Día" value={form.cdia} className={errores.cdia ? 'input--error' : ''} onChange={(e) => cambiarCumple('cdia', e.target.value)}>
                <option value="">Día</option>
                {Array.from({ length: 31 }, (_, i) => <option key={i} value={String(i + 1)}>{i + 1}</option>)}
              </select>
              <select aria-label="Mes" value={form.cmes} className={errores.cdia ? 'input--error' : ''} onChange={(e) => cambiarCumple('cmes', e.target.value)}>
                <option value="">Mes</option>
                {MESES.map((m, i) => <option key={m} value={String(i + 1)}>{m[0].toUpperCase() + m.slice(1)}</option>)}
              </select>
              <input aria-label="Año (opcional)" inputMode="numeric" maxLength={4} placeholder="Año" value={form.canio}
                className={errores.cdia ? 'input--error' : ''} onChange={(e) => cambiarCumple('canio', e.target.value.replace(/\D/g, ''))} />
            </div>
            {errores.cdia && <span className="field-error"><AlertCircle size={12} /> {errores.cdia}</span>}
          </fieldset>
          <div className="modal__field">
            <label htmlFor="edc-correo"><Mail size={14} aria-hidden="true" /> Correo</label>
            <input id="edc-correo" type="email" inputMode="email" placeholder="correo@ejemplo.com" value={form.email}
              className={errores.email ? 'input--error' : ''} onChange={(e) => cambiar('email', e.target.value.toLowerCase().trim())} />
            {errores.email && <span className="field-error"><AlertCircle size={12} /> {errores.email}</span>}
          </div>
          <div className="modal__field">
            <label htmlFor="edc-direccion"><MapPin size={14} aria-hidden="true" /> Dirección</label>
            <input id="edc-direccion" value={form.address} autoComplete="off" placeholder="Ej. C/ Duvergé #83, Barrio San Antonio"
              onChange={(e) => cambiar('address', e.target.value)} />
          </div>
          <div className="modal__field">
            <label htmlFor="edc-notas"><FileText size={14} aria-hidden="true" /> Notas</label>
            <textarea id="edc-notas" rows={3} value={form.notes} placeholder="Ej. prefiere las tardes, viene por recomendación de…"
              onChange={(e) => cambiar('notes', e.target.value)} />
          </div>

          <div className="modal__actions">
            <div style={{ flex: 1 }} />
            <button type="button" className="modal__cancel-btn" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="modal__submit-btn" disabled={guardando}>
              {guardando ? 'Guardando…' : clienta ? 'Guardar' : 'Crear clienta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
