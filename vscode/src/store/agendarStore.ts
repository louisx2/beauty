import { create } from 'zustand';
import type { PedidoAgendar } from '../pages/admin/agendar/reglas';

/** La ventana Agendar es una sola para todo el panel (vive en AdminLayout): cualquier pantalla la abre con lo que
 *  ya sabe (la clienta, el día, el hueco, la cita a mover, el paquete). */
interface AgendarState {
  pedido: PedidoAgendar | null;
  /** cuenta las veces que se abrió: cada pedido nuevo empieza la ventana de cero */
  vez: number;
  abrir: (pedido: PedidoAgendar) => void;
  cerrar: () => void;
}

export const useAgendarStore = create<AgendarState>()((set) => ({
  pedido: null,
  vez: 0,
  abrir: (pedido) => set((s) => ({ pedido, vez: s.vez + 1 })),
  cerrar: () => set({ pedido: null }),
}));
