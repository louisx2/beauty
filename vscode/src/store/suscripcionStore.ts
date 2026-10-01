import { create } from 'zustand';
import type { CuentaSuscripcion } from '../lib/suscripcion';
import { cargarSuscripcion } from '../lib/suscripcionApi';

/** El estado de la cuenta se pide una vez y se recuerda un rato: el banner no consulta en cada pantalla. */
const VIGENCIA = 15 * 60 * 1000;

interface SuscripcionState {
  cuenta: CuentaSuscripcion | null;
  cargadaEn: number;
  cargando: boolean;
  /** la página Mi suscripción, que ya trae todo, deja aquí la cuenta fresca */
  setCuenta: (c: CuentaSuscripcion) => void;
  cargarCuenta: (forzar?: boolean) => Promise<void>;
}

export const useSuscripcionStore = create<SuscripcionState>()((set, get) => ({
  cuenta: null,
  cargadaEn: 0,
  cargando: false,
  setCuenta: (c) => set({ cuenta: c, cargadaEn: Date.now() }),
  cargarCuenta: async (forzar = false) => {
    const { cargando, cargadaEn } = get();
    if (cargando || (!forzar && Date.now() - cargadaEn < VIGENCIA)) return;
    set({ cargando: true });
    try {
      const d = await cargarSuscripcion();
      set({ cuenta: d.cuenta, cargadaEn: Date.now() });
    } catch {
      // sin conexión o sin permiso: no hay banner, y se vuelve a intentar pasada la vigencia
      set({ cuenta: null, cargadaEn: Date.now() });
    } finally {
      set({ cargando: false });
    }
  },
}));
