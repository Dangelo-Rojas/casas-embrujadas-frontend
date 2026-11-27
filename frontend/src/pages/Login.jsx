import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import CampoFormulario from '../components/CampoFormulario';
import { useAuth } from '../context/AuthContext';
import { validarLogin, esFormularioValido } from '../utils/validaciones';

const datosIniciales = { correo: '', contrasena: '' };

// EP3: el login ahora es real. Primero se validan los datos en el navegador (igual que en la EP2)
// y luego se envían al backend (POST /api/auth/login), que responde con el token JWT
export default function Login() {
  const [datos, setDatos] = useState(datosIniciales);
  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState('');
  const [enviando, setEnviando] = useState(false);

  const { iniciarSesion } = useAuth();
  const navegar = useNavigate();
  const ubicacion = useLocation();

  function handleChange(e) {
    setDatos({ ...datos, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const nuevosErrores = validarLogin(datos);
    setErrores(nuevosErrores);
    setErrorServidor('');
    if (!esFormularioValido(nuevosErrores)) return;

    setEnviando(true);
    try {
      const usuario = await iniciarSesion(datos.correo, datos.contrasena);
      // vuelve a la página que pidió el login (ej: el carrito); si no, el admin va a su panel
      const destino = ubicacion.state?.desde ?? (usuario.rol === 'ADMIN' ? '/admin' : '/');
      navegar(destino, { replace: true });
    } catch (error) {
      setErrorServidor(error.message); // ej: "Correo o contraseña incorrectos"
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card shadow-sm p-4">
            <h1 className="h3 mb-4 text-center">Iniciar sesión 🕯️</h1>

            {ubicacion.state?.desde && !errorServidor && (
              <div className="alert alert-info py-2 small">Inicia sesión para continuar.</div>
            )}
            {errorServidor && <div className="alert alert-danger">{errorServidor}</div>}

            <form onSubmit={handleSubmit} noValidate>
              <CampoFormulario etiqueta="Correo" nombre="correo" tipo="email"
                valor={datos.correo} onChange={handleChange} error={errores.correo} />
              <CampoFormulario etiqueta="Contraseña" nombre="contrasena" tipo="password"
                valor={datos.contrasena} onChange={handleChange} error={errores.contrasena} />
              <button type="submit" className="btn btn-warning w-100 mt-3" disabled={enviando}>
                {enviando ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p className="text-center mt-3 mb-0">
              ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
