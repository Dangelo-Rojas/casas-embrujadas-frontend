import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Envuelve las páginas que necesitan sesión (y opcionalmente un rol):
//   <RutaProtegida><MisPedidos /></RutaProtegida>            -> cualquier usuario con sesión
//   <RutaProtegida rol="ADMIN"><Admin /></RutaProtegida>     -> solo administradores
// Sin sesión: redirige al login recordando a dónde quería ir (state.desde) para volver después.
// Con sesión pero sin el rol: muestra "acceso restringido" (como el 403 del backend).
// OJO: esto es para la experiencia de usuario; la seguridad real la pone el backend,
// que rechaza cualquier petición sin el token y el rol correctos
export default function RutaProtegida({ rol, children }) {
  const { estaAutenticado, usuario } = useAuth();
  const ubicacion = useLocation();

  if (!estaAutenticado) {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  }

  if (rol && usuario.rol !== rol) {
    return (
      <div className="container py-5 text-center">
        <h1>Acceso restringido 🔒</h1>
        <p className="text-secondary mb-4">Esta sección es solo para administradores. Ni los fantasmas pasan por aquí.</p>
        <Link to="/" className="btn-enlace">Volver al inicio</Link>
      </div>
    );
  }

  return children;
}
