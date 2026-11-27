import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Cargando, MensajeError } from '../components/EstadoCarga';
import { useApi } from '../hooks/useApi';
import { admin } from '../services/api';
import { formatPrecio } from '../utils/carrito';
import { COLOR_ESTADO, formatFecha } from '../utils/formato';

// Panel de administración (/admin). Solo entra el rol ADMIN (ver RutaProtegida en App.jsx).
// Además TODOS los endpoints que usa esta página exigen rol ADMIN en el backend:
// si un cliente intentara llamarlos a mano, el backend le respondería 403
const PESTANAS = [
  { clave: 'propiedades', texto: 'Propiedades' },
  { clave: 'pedidos', texto: 'Pedidos' },
  { clave: 'mensajes', texto: 'Mensajes' },
  { clave: 'usuarios', texto: 'Usuarios' },
];

export default function Admin() {
  const [pestana, setPestana] = useState('propiedades');

  return (
    <div className="container py-5">
      <h1 className="mb-4">Panel de administración 🗝️</h1>

      <ul className="nav nav-tabs mb-4" role="tablist">
        {PESTANAS.map((p) => (
          <li className="nav-item" key={p.clave} role="presentation">
            <button type="button" role="tab" aria-selected={pestana === p.clave}
              className={`nav-link ${pestana === p.clave ? 'active' : ''}`}
              onClick={() => setPestana(p.clave)}>
              {p.texto}
            </button>
          </li>
        ))}
      </ul>

      {pestana === 'propiedades' && <AdminPropiedades />}
      {pestana === 'pedidos' && <AdminPedidos />}
      {pestana === 'mensajes' && <AdminMensajes />}
      {pestana === 'usuarios' && <AdminUsuarios />}
    </div>
  );
}

// Ejecuta una acción del admin, recarga la lista al terminar y guarda el error si falla
function useAccion(recargar) {
  const [error, setError] = useState(null);
  async function ejecutar(accion) {
    setError(null);
    try {
      await accion();
      recargar();
    } catch (e) {
      setError(e);
    }
  }
  return { error, ejecutar };
}

// ------------------------------------------------------------------ Propiedades (CRUD)
const formularioVacio = {
  slug: '', nombre: '', ubicacion: '', precio: '', descripcion: '',
  imagen: '/img/', imagenGrande: '/img/', destacada: false, activa: true,
};

// convierte una propiedad (con la forma del frontend) en lo que espera el backend
function aPayload(p) {
  return {
    slug: p.id, nombre: p.nombre, ubicacion: p.ubicacion, precio: p.precioNumero, descripcion: p.descripcion,
    imagen: p.imagen, imagenGrande: p.imagenGrande, imagenes: p.imagenes, destacada: p.destacada, activa: p.activa,
  };
}

function AdminPropiedades() {
  const { datos: propiedades, cargando, error, recargar } = useApi(admin.propiedades);
  const accion = useAccion(recargar);
  const [formulario, setFormulario] = useState(formularioVacio);
  const [editandoId, setEditandoId] = useState(null); // null = creando una nueva
  const [erroresCampos, setErroresCampos] = useState({});
  const [porEliminar, setPorEliminar] = useState(null);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormulario({ ...formulario, [name]: type === 'checkbox' ? checked : value });
  }

  function editar(p) {
    setEditandoId(p.idDb);
    setFormulario({ ...aPayload(p), slug: p.id, precio: String(p.precioNumero) });
    setErroresCampos({});
    window.scrollTo(0, 0);
  }

  function cancelar() {
    setEditandoId(null);
    setFormulario(formularioVacio);
    setErroresCampos({});
  }

  async function guardar(e) {
    e.preventDefault();
    const datos = { ...formulario, precio: Number(formulario.precio) || 0 };
    try {
      if (editandoId) await admin.actualizarPropiedad(editandoId, datos);
      else await admin.crearPropiedad(datos);
      cancelar();
      recargar();
    } catch (err) {
      setErroresCampos({ ...(err.campos ?? {}), general: err.message });
    }
  }

  const campo = (nombre, etiqueta, tipo = 'text') => (
    <div className="col-12 col-md-6 mb-3">
      <label htmlFor={`prop-${nombre}`} className="form-label">{etiqueta}</label>
      <input id={`prop-${nombre}`} name={nombre} type={tipo} value={formulario[nombre]} onChange={handleChange}
        className={`form-control ${erroresCampos[nombre] ? 'is-invalid' : ''}`} />
      {erroresCampos[nombre] && <div className="invalid-feedback">{erroresCampos[nombre]}</div>}
    </div>
  );

  return (
    <>
      <form className="card p-4 mb-4" onSubmit={guardar} noValidate>
        <h2 className="h5 mb-3">{editandoId ? `Editar propiedad #${editandoId}` : 'Nueva propiedad'}</h2>
        {erroresCampos.general && <div className="alert alert-danger py-2">{erroresCampos.general}</div>}
        <div className="row">
          {campo('nombre', 'Nombre')}
          {campo('slug', 'Slug (URL, ej: casa-del-lago)')}
          {campo('ubicacion', 'Ubicación')}
          {campo('precio', 'Precio (CLP)', 'number')}
          {campo('imagen', 'Imagen de la tarjeta')}
          {campo('imagenGrande', 'Imagen grande')}
          <div className="col-12 mb-3">
            <label htmlFor="prop-descripcion" className="form-label">Descripción</label>
            <textarea id="prop-descripcion" name="descripcion" rows="3" value={formulario.descripcion} onChange={handleChange}
              className={`form-control ${erroresCampos.descripcion ? 'is-invalid' : ''}`} />
            {erroresCampos.descripcion && <div className="invalid-feedback">{erroresCampos.descripcion}</div>}
          </div>
          <div className="col-12 mb-3 d-flex gap-4">
            <div className="form-check">
              <input id="prop-destacada" name="destacada" type="checkbox" className="form-check-input"
                checked={formulario.destacada} onChange={handleChange} />
              <label htmlFor="prop-destacada" className="form-check-label">Destacada en el Home</label>
            </div>
            <div className="form-check">
              <input id="prop-activa" name="activa" type="checkbox" className="form-check-input"
                checked={formulario.activa} onChange={handleChange} />
              <label htmlFor="prop-activa" className="form-check-label">Activa (visible en el catálogo)</label>
            </div>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-warning">{editandoId ? 'Guardar cambios' : 'Crear propiedad'}</button>
          {editandoId && <button type="button" className="btn btn-outline-light" onClick={cancelar}>Cancelar</button>}
        </div>
      </form>

      {cargando && <Cargando />}
      {error && <MensajeError error={error} onReintentar={recargar} />}
      {accion.error && <MensajeError error={accion.error} />}

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr><th>#</th><th>Nombre</th><th>Ubicación</th><th className="text-end">Precio</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {(propiedades ?? []).map((p) => (
              <tr key={p.idDb}>
                <td>{p.idDb}</td>
                <td>{p.nombre} {p.destacada && <span className="badge text-bg-warning ms-1">Destacada</span>}</td>
                <td>{p.ubicacion}</td>
                <td className="text-end">{p.precio}</td>
                <td><span className={`badge text-bg-${p.activa ? 'success' : 'secondary'}`}>{p.activa ? 'Activa' : 'Inactiva'}</span></td>
                <td className="text-end text-nowrap">
                  <button type="button" className="btn btn-sm btn-outline-light me-1" onClick={() => editar(p)}>Editar</button>
                  <button type="button" className="btn btn-sm btn-outline-light me-1"
                    onClick={() => accion.ejecutar(() => admin.actualizarPropiedad(p.idDb, { ...aPayload(p), activa: !p.activa }))}>
                    {p.activa ? 'Desactivar' : 'Activar'}
                  </button>
                  {/* confirmación en dos pasos para no borrar por accidente */}
                  {porEliminar === p.idDb ? (
                    <button type="button" className="btn btn-sm btn-danger"
                      onClick={() => { setPorEliminar(null); accion.ejecutar(() => admin.eliminarPropiedad(p.idDb)); }}>
                      ¿Seguro?
                    </button>
                  ) : (
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setPorEliminar(p.idDb)}>Eliminar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ Pedidos
function AdminPedidos() {
  const { datos: pedidos, cargando, error, recargar } = useApi(admin.pedidos);
  const accion = useAccion(recargar);

  return (
    <>
      {cargando && <Cargando />}
      {error && <MensajeError error={error} onReintentar={recargar} />}
      {accion.error && <MensajeError error={accion.error} />}
      {pedidos && pedidos.length === 0 && <p className="text-secondary">No hay pedidos todavía.</p>}

      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr><th>N°</th><th>Fecha</th><th>Cliente</th><th>Detalle</th><th className="text-end">Total</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {(pedidos ?? []).map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td className="text-nowrap">{formatFecha(p.fecha)}</td>
                <td>{p.usuario.nombre}<br /><span className="small text-secondary">{p.usuario.correo}</span></td>
                <td className="small">{p.detalles.map((d) => `${d.propiedad.nombre} × ${d.cantidad}`).join(', ')}</td>
                <td className="text-end">{formatPrecio(p.total)}</td>
                <td>
                  <select className={`form-select form-select-sm border-${COLOR_ESTADO[p.estado]}`} value={p.estado}
                    aria-label={`Estado del pedido ${p.id}`}
                    disabled={p.estado === 'CANCELADO'}
                    onChange={(e) => accion.ejecutar(() => admin.cambiarEstadoPedido(p.id, e.target.value))}>
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="PAGADO">PAGADO</option>
                    <option value="CANCELADO">CANCELADO</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ Mensajes de contacto
function AdminMensajes() {
  const { datos: mensajes, cargando, error, recargar } = useApi(admin.mensajes);
  const accion = useAccion(recargar);

  return (
    <>
      {cargando && <Cargando />}
      {error && <MensajeError error={error} onReintentar={recargar} />}
      {accion.error && <MensajeError error={accion.error} />}
      {mensajes && mensajes.length === 0 && <p className="text-secondary">No hay mensajes.</p>}

      {(mensajes ?? []).map((m) => (
        <div className={`card mb-3 ${m.leido ? 'opacity-75' : 'border-warning'}`} key={m.id}>
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
              <strong>{m.nombre} <span className="fw-normal text-secondary">&lt;{m.correo}&gt;</span></strong>
              <span className="small text-secondary">{formatFecha(m.fecha)}</span>
            </div>
            <p className="mb-3">{m.mensaje}</p>
            <button type="button" className="btn btn-sm btn-outline-light me-2"
              onClick={() => accion.ejecutar(() => admin.marcarLeido(m.id, !m.leido))}>
              {m.leido ? 'Marcar como no leído' : 'Marcar como leído'}
            </button>
            <button type="button" className="btn btn-sm btn-outline-danger"
              onClick={() => accion.ejecutar(() => admin.eliminarMensaje(m.id))}>Eliminar</button>
          </div>
        </div>
      ))}
    </>
  );
}

// ------------------------------------------------------------------ Usuarios
function AdminUsuarios() {
  const { datos: usuarios, cargando, error, recargar } = useApi(admin.usuarios);
  const accion = useAccion(recargar);
  const { usuario: yo } = useAuth();

  return (
    <>
      {cargando && <Cargando />}
      {error && <MensajeError error={error} onReintentar={recargar} />}
      {accion.error && <MensajeError error={accion.error} />}

      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr><th>#</th><th>Nombre</th><th>Correo</th><th>Comuna</th><th>Rol</th><th></th></tr>
          </thead>
          <tbody>
            {(usuarios ?? []).map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.nombre} {u.id === yo.id && <span className="badge text-bg-info ms-1">Tú</span>}</td>
                <td>{u.correo}</td>
                <td>{u.comuna?.nombre}</td>
                <td>
                  {/* un admin no puede cambiarse su propio rol (regla del backend) */}
                  <select className="form-select form-select-sm" value={u.rol} disabled={u.id === yo.id}
                    aria-label={`Rol de ${u.nombre}`}
                    onChange={(e) => accion.ejecutar(() => admin.cambiarRol(u.id, e.target.value))}>
                    <option value="CLIENTE">CLIENTE</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td className="text-end">
                  {u.id !== yo.id && (
                    <button type="button" className="btn btn-sm btn-outline-danger"
                      onClick={() => accion.ejecutar(() => admin.eliminarUsuario(u.id))}>Eliminar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
