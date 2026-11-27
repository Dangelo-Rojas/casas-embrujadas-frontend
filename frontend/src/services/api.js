// Cliente de la API REST del backend (Spring Boot).
// TODAS las llamadas HTTP del frontend pasan por aquí, así:
//  - la URL del backend está en un solo lugar (variable VITE_API_URL al desplegar)
//  - el token JWT se agrega solo en el header Authorization
//  - si el token venció, se renueva automáticamente con el refresh token y se repite la petición
//  - los errores llegan siempre con la misma forma (ApiError) para mostrarlos en pantalla
import { leerSesion, guardarSesion, borrarSesion } from './sesion';
import { formatPrecio } from '../utils/carrito';

// Dirección del backend:
//  - si existe VITE_API_URL (en Vercel), se usa esa
//  - en desarrollo (npm run dev) se usa "/api" del mismo servidor de Vite, que lo reenvía al backend (proxy en vite.config.js)
//  - en cualquier otro caso (pruebas, build local) el backend local en http://localhost:8080
const entorno = import.meta.env ?? {};
const BASE = entorno.VITE_API_URL || (entorno.DEV ? '' : 'http://localhost:8080');
export const API_URL = `${BASE}/api`;

// aviso para que el AuthContext se entere cuando la sesión cambia desde aquí (renovación o expiración)
export const EVENTO_SESION = 'sesion-actualizada';

export class ApiError extends Error {
  constructor(estado, mensaje, campos = {}) {
    super(mensaje);
    this.estado = estado;   // código HTTP (0 = no se pudo conectar)
    this.campos = campos;   // errores por campo de las validaciones del backend
  }
}

async function pedir(ruta, { metodo = 'GET', cuerpo, conToken = true } = {}, puedeReintentar = true) {
  const headers = {};
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';

  const sesion = leerSesion();
  if (conToken && sesion) headers.Authorization = `Bearer ${sesion.token}`;

  let respuesta;
  try {
    respuesta = await fetch(API_URL + ruta, {
      method: metodo,
      headers,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa que el backend esté encendido.');
  }

  // 401 con sesión: probablemente el token venció -> lo renovamos UNA vez y repetimos la petición
  if (respuesta.status === 401 && conToken && sesion && puedeReintentar) {
    const renovada = await renovarSesion(sesion.refreshToken);
    if (renovada) return pedir(ruta, { metodo, cuerpo, conToken }, false);
  }

  if (respuesta.status === 204) return null; // 204 No Content (ej: DELETE)

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, datos?.mensaje || 'Ocurrió un error inesperado', datos?.campos || {});
  }
  return datos;
}

// Si varias peticiones fallan a la vez por token vencido, se hace una sola renovación y todas la esperan
let renovacionEnCurso = null;

export function renovarSesion(refreshToken) {
  if (!renovacionEnCurso) {
    renovacionEnCurso = (async () => {
      try {
        const respuesta = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!respuesta.ok) throw new Error('refresh rechazado');
        guardarSesion(await respuesta.json());
        return true;
      } catch {
        // el refresh token también venció o es inválido: se cierra la sesión
        borrarSesion();
        return false;
      } finally {
        window.dispatchEvent(new Event(EVENTO_SESION));
        renovacionEnCurso = null;
      }
    })();
  }
  return renovacionEnCurso;
}

// ---- Adaptadores: dejan los datos del backend con la forma que ya usaban los componentes ----
// En el frontend el "id" de una propiedad es su slug (va en la URL y en el carrito) y el precio
// se muestra como texto "$99.900.000". Guardamos también el id real y el precio como número
export function adaptarPropiedad(p) {
  return { ...p, idDb: p.id, id: p.slug, precioNumero: p.precio, precio: formatPrecio(p.precio) };
}

export function adaptarBlog(b) {
  return { ...b, idDb: b.id, id: b.slug };
}

// el carrito es una lista de slugs repetidos; el backend espera [{ slug, cantidad }]
export function carritoAItems(carrito) {
  const cantidades = {};
  carrito.forEach((slug) => { cantidades[slug] = (cantidades[slug] || 0) + 1; });
  return Object.entries(cantidades).map(([slug, cantidad]) => ({ slug, cantidad }));
}

// ---- Endpoints ----
const lista = (adaptador) => (datos) => datos.map(adaptador);

// Propiedades
export const getPropiedades = () => pedir('/propiedades').then(lista(adaptarPropiedad));
export const getDestacadas = () => pedir('/propiedades/destacadas').then(lista(adaptarPropiedad));
export const getPropiedad = (slug) => pedir(`/propiedades/slug/${encodeURIComponent(slug)}`).then(adaptarPropiedad);

// Blog
export const getBlogs = () => pedir('/blogs').then(lista(adaptarBlog));
export const getBlog = (slug) => pedir(`/blogs/${encodeURIComponent(slug)}`).then(adaptarBlog);

// Regiones y comunas
export const getRegiones = () => pedir('/regiones');
export const getComunas = (codigoRegion) => pedir(`/regiones/${encodeURIComponent(codigoRegion)}/comunas`);

// Autenticación
export const login = (correo, contrasena) =>
  pedir('/auth/login', { metodo: 'POST', cuerpo: { correo, contrasena }, conToken: false });
export const registrar = (datos) =>
  pedir('/auth/registro', { metodo: 'POST', cuerpo: datos, conToken: false });

// Contacto
export const enviarContacto = (mensaje) => pedir('/contacto', { metodo: 'POST', cuerpo: mensaje, conToken: false });

// Pedidos (requieren sesión)
export const crearPedido = (carrito) => pedir('/pedidos', { metodo: 'POST', cuerpo: { items: carritoAItems(carrito) } });
export const getMisPedidos = () => pedir('/pedidos/mis-pedidos');

// ---- Solo ADMIN ----
export const admin = {
  propiedades: () => pedir('/propiedades/todas').then(lista(adaptarPropiedad)),
  crearPropiedad: (datos) => pedir('/propiedades', { metodo: 'POST', cuerpo: datos }),
  actualizarPropiedad: (id, datos) => pedir(`/propiedades/${id}`, { metodo: 'PUT', cuerpo: datos }),
  eliminarPropiedad: (id) => pedir(`/propiedades/${id}`, { metodo: 'DELETE' }),
  pedidos: () => pedir('/pedidos'),
  cambiarEstadoPedido: (id, estado) => pedir(`/pedidos/${id}/estado?valor=${estado}`, { metodo: 'PATCH' }),
  mensajes: () => pedir('/contacto'),
  marcarLeido: (id, leido) => pedir(`/contacto/${id}/leido?valor=${leido}`, { metodo: 'PATCH' }),
  eliminarMensaje: (id) => pedir(`/contacto/${id}`, { metodo: 'DELETE' }),
  usuarios: () => pedir('/usuarios'),
  cambiarRol: (id, rol) => pedir(`/usuarios/${id}/rol?valor=${rol}`, { metodo: 'PATCH' }),
  eliminarUsuario: (id) => pedir(`/usuarios/${id}`, { metodo: 'DELETE' }),
};
