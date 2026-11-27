// Ayudantes de formato para pedidos (los usan Mis pedidos y el panel de admin)

// color de Bootstrap según el estado del pedido
export const COLOR_ESTADO = { PENDIENTE: 'warning', PAGADO: 'success', CANCELADO: 'secondary' };

// "2026-11-27T10:15:00" -> "27 nov 2026, 10:15"
export function formatFecha(fechaIso) {
  return new Date(fechaIso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });
}
