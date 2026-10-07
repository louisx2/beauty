// Historial anterior de una clienta (Clientas → Historial): lo que se le hizo antes de usar el sistema
// (libreta, otro programa). Se anota a mano y se puede editar o borrar. Puro: se prueba con node --test.

export interface EntradaHistorial {
  id: string;
  clientId: string;
  /** AAAA-MM-DD; null si no se sabe la fecha */
  fecha: string | null;
  servicio: string;
  especialista: string | null;
  notas: string | null;
  creado: string;
}

/** Fila de la tabla `client_history`. */
export interface FilaHistorial {
  id: string;
  client_id: string;
  date: string | null;
  service: string;
  employee: string | null;
  notes: string | null;
  created_at: string;
}

/** Lo que se escribe en la tabla al agregar o editar. */
export type CambiosHistorial = Pick<FilaHistorial, 'date' | 'service' | 'employee' | 'notes'>;

export interface FormHistorial { fecha: string; servicio: string; especialista: string; notas: string }
export type ErroresHistorial = Partial<Record<keyof FormHistorial, string>>;

export const FORM_HISTORIAL_VACIO: FormHistorial = { fecha: '', servicio: '', especialista: '', notas: '' };

export function deFila(r: FilaHistorial): EntradaHistorial {
  return {
    id: r.id,
    clientId: r.client_id,
    fecha: r.date,
    servicio: r.service,
    especialista: r.employee,
    notas: r.notes,
    creado: r.created_at,
  };
}

/** Lo más reciente primero. Lo que no tiene fecha va al final; entre iguales, lo último que se anotó primero. */
export function ordenarHistorial(lista: EntradaHistorial[]): EntradaHistorial[] {
  return [...lista].sort((a, b) => {
    if (a.fecha !== b.fecha) {
      if (!a.fecha) return 1;
      if (!b.fecha) return -1;
      return b.fecha.localeCompare(a.fecha);
    }
    return b.creado.localeCompare(a.creado);
  });
}

/** El servicio es obligatorio. La fecha puede quedar vacía, pero no puede ser después de hoy: es historial. */
export function validarHistorial(form: FormHistorial, hoy: string): ErroresHistorial {
  const errores: ErroresHistorial = {};
  if (!form.servicio.trim()) errores.servicio = 'Escribe el servicio que se hizo';
  if (form.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(form.fecha)) errores.fecha = 'Fecha inválida';
  else if (form.fecha > hoy) errores.fecha = 'La fecha no puede ser después de hoy';
  return errores;
}

/** Sin espacios de más y con null en lo que quedó vacío. */
export function cambiosDeForm(form: FormHistorial): CambiosHistorial {
  return {
    date: form.fecha || null,
    service: form.servicio.trim().replace(/\s+/g, ' '),
    employee: form.especialista.trim() || null,
    notes: form.notas.trim() || null,
  };
}

export function formDeEntrada(e: EntradaHistorial): FormHistorial {
  return { fecha: e.fecha ?? '', servicio: e.servicio, especialista: e.especialista ?? '', notas: e.notas ?? '' };
}
