import { Link } from 'react-router-dom';
import { Cargando, MensajeError } from '../components/EstadoCarga';
import { useApi } from '../hooks/useApi';
import { getMisPedidos } from '../services/api';
import { formatPrecio } from '../utils/carrito';
import { COLOR_ESTADO, formatFecha } from '../utils/formato';

// Ruta protegida (/mis-pedidos): solo usuarios con sesión. El backend devuelve SOLO los pedidos
// del dueño del token, así que aunque alguien manipule el frontend no puede ver pedidos ajenos
export default function MisPedidos() {
  const { datos: pedidos, cargando, error, recargar } = useApi(getMisPedidos);

  return (
    <div className="container py-5">
      <h1 className="mb-4">Mis pedidos</h1>

      {cargando && <Cargando />}
      {error && <MensajeError error={error} onReintentar={recargar} />}

      {pedidos && pedidos.length === 0 && (
        <div className="text-center py-4">
          <p className="text-secondary">Todavía no tienes pedidos.</p>
          <Link to="/productos" className="btn-enlace">Ver propiedades</Link>
        </div>
      )}

      {(pedidos ?? []).map((pedido) => (
        <div className="card mb-3" key={pedido.id}>
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <span><strong>Pedido N° {pedido.id}</strong> · {formatFecha(pedido.fecha)}</span>
            <span className={`badge text-bg-${COLOR_ESTADO[pedido.estado]}`}>{pedido.estado}</span>
          </div>
          <ul className="list-group list-group-flush">
            {pedido.detalles.map((d) => (
              <li className="list-group-item d-flex justify-content-between" key={d.id}>
                <span>{d.propiedad.nombre} × {d.cantidad}</span>
                <span>{formatPrecio(d.subtotal)}</span>
              </li>
            ))}
          </ul>
          <div className="card-footer text-end">
            Total: <span className="precio-destacado">{formatPrecio(pedido.total)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
