import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCarrito } from '../context/CarritoContext';
import { useAuth } from '../context/AuthContext';
import { Cargando, MensajeError } from '../components/EstadoCarga';
import { useApi } from '../hooks/useApi';
import { getPropiedades, crearPedido } from '../services/api';
import { agruparCarrito, calcularTotal, formatPrecio } from '../utils/carrito';

// máximo de unidades por propiedad (la misma regla valida el backend)
const MAXIMO_POR_PROPIEDAD = 3;

export default function Carrito() {
  const { carrito, agregar, quitar, vaciar } = useCarrito();
  const { estaAutenticado } = useAuth();
  const navegar = useNavigate();

  // los precios y datos de cada propiedad vienen de la API; el carrito solo guarda los ids (slugs)
  const catalogo = useApi(getPropiedades);
  const [pedidoConfirmado, setPedidoConfirmado] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [errorCompra, setErrorCompra] = useState(null);

  // el carrito guarda ids repetidos; para la lista los juntamos en una fila por propiedad
  const productos = catalogo.datos ?? [];
  const items = agruparCarrito(carrito, productos);
  const total = calcularTotal(carrito, productos);

  // EP3: finalizar compra crea el pedido en el backend (POST /api/pedidos con el token JWT).
  // Sin sesión se manda al login, y al entrar vuelve al carrito (state.desde)
  async function finalizarCompra() {
    if (!estaAutenticado) {
      navegar('/login', { state: { desde: '/carrito' } });
      return;
    }
    setEnviando(true);
    setErrorCompra(null);
    try {
      const pedido = await crearPedido(carrito);
      vaciar();
      setPedidoConfirmado(pedido);
    } catch (error) {
      setErrorCompra(error);
    } finally {
      setEnviando(false);
    }
  }

  // La página tiene varios estados posibles (compra confirmada, cargando, vacío y con productos).
  // Con returns tempranos queda más claro que anidando ternarios

  if (pedidoConfirmado) {
    return (
      <div className="container py-5 text-center">
        <h1>¡Compra confirmada! 🕯️</h1>
        <p className="mb-1">Pedido N° <strong>{pedidoConfirmado.id}</strong> por <strong>{formatPrecio(pedidoConfirmado.total)}</strong></p>
        <p className="text-secondary mb-4">
          Un agente se comunicará contigo pronto... probablemente a medianoche.
        </p>
        <div className="d-flex justify-content-center flex-wrap gap-4">
          <Link to="/mis-pedidos" className="btn-enlace">Ver mis pedidos</Link>
          <Link to="/productos" className="btn-enlace secundario">Seguir viendo propiedades</Link>
        </div>
      </div>
    );
  }

  if (carrito.length > 0 && catalogo.cargando) return <Cargando texto="Cargando tu carrito..." />;

  if (catalogo.error) {
    return <div className="container py-5"><MensajeError error={catalogo.error} onReintentar={catalogo.recargar} /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="container py-5 text-center">
        <h1>Tu carrito está vacío 🕸️</h1>
        <p className="text-secondary mb-4">Todavía no eliges tu próxima casa embrujada.</p>
        <Link to="/productos" className="btn-enlace">Ver propiedades</Link>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h1 className="mb-4">Tu carrito</h1>

      <div className="row g-4 g-lg-5">
        {/* Lista de propiedades */}
        <div className="col-12 col-lg-8">
          {items.map(({ producto, cantidad, subtotal }) => (
            <div className="item-carrito d-flex align-items-center gap-3" key={producto.id}>
              {/* alt vacío porque el nombre ya aparece al lado */}
              <img src={producto.imagen} alt="" />

              <div className="flex-grow-1">
                <Link to={`/producto/${producto.id}`} className="item-carrito__nombre">
                  {producto.nombre}
                </Link>
                <p className="mb-0 small text-secondary">{producto.precio} c/u</p>
              </div>

              {/* − y + reutilizan quitar/agregar del Context; el total y el contador del navbar se actualizan solos.
                  aria-live hace que un lector de pantalla lea la cantidad nueva */}
              <div className="contador" role="group" aria-label={`Cantidad de ${producto.nombre}`}>
                <button className="contador__boton" onClick={() => quitar(producto.id)} aria-label="Quitar uno">−</button>
                <span className="contador__valor" aria-live="polite">{cantidad}</span>
                <button className="contador__boton" onClick={() => agregar(producto.id)} aria-label="Agregar uno"
                        disabled={cantidad >= MAXIMO_POR_PROPIEDAD}>+</button>
              </div>

              <p className="mb-0 text-end item-carrito__subtotal">{formatPrecio(subtotal)}</p>
            </div>
          ))}

          <button className="btn-enlace chico secundario mt-3" onClick={vaciar}>
            Vaciar carrito
          </button>
        </div>

        {/* Resumen: queda fijo al bajar (position: sticky en .resumen-carrito) */}
        <div className="col-12 col-lg-4">
          <aside className="resumen-carrito">
            <h2 className="h4 mb-3">Resumen</h2>
            <div className="d-flex justify-content-between mb-2">
              <span className="text-secondary">Propiedades</span>
              <span>{carrito.length}</span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span className="text-secondary">Exorcismo</span>
              <span>Incluido</span>
            </div>
            <hr />
            <div className="d-flex justify-content-between align-items-baseline mb-4">
              <span>Total</span>
              <span className="precio-destacado">{formatPrecio(total)}</span>
            </div>

            {errorCompra && <div className="alert alert-danger py-2 small">{errorCompra.message}</div>}

            <button className="btn btn-warning w-100" onClick={finalizarCompra} disabled={enviando}>
              {enviando ? 'Procesando...' : estaAutenticado ? 'Finalizar compra' : 'Inicia sesión para comprar'}
            </button>
            <p className="small text-secondary mt-2 mb-0">El total final lo confirma el servidor con los precios vigentes.</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
