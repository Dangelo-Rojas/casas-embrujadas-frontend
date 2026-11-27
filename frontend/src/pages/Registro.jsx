import { useState } from 'react';
import { Link } from 'react-router-dom';
import CampoFormulario from '../components/CampoFormulario';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { getRegiones, getComunas } from '../services/api';
import { validarRegistro, esFormularioValido } from '../utils/validaciones';

const datosIniciales = {
  nombre: '', correo: '', confirmarCorreo: '',
  contrasena: '', confirmarContrasena: '', region: '', comuna: '',
};

// Formulario controlado: lo que se ve en cada input sale del estado "datos",
// y cada tecla que se escribe actualiza ese estado
export default function Registro() {
  const [datos, setDatos] = useState(datosIniciales);
  const [errores, setErrores] = useState({});
  const [exito, setExito] = useState(false);
  const [errorServidor, setErrorServidor] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { registrarse } = useAuth();

  // EP3: regiones y comunas vienen del backend. Las comunas se vuelven a pedir cada vez que cambia
  // la región (por eso [datos.region] va como dependencia); sin región no se pide nada
  const regiones = useApi(getRegiones);
  const comunas = useApi(() => (datos.region ? getComunas(datos.region) : Promise.resolve([])), [datos.region]);

  // Un solo handleChange para todos los campos: usa el "name" del input para saber
  // qué propiedad cambiar. Si se cambia la región, la comuna vuelve a quedar vacía
  // (si no, podría quedar elegida una comuna de otra región)
  function handleChange(e) {
    const { name, value } = e.target;
    setDatos((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'region' ? { comuna: '' } : {}),
    }));
  }

  // Primero se valida en el navegador (respuesta inmediata) y luego se crea la cuenta en el backend
  // (POST /api/auth/registro). El backend vuelve a validar todo: nunca se confía solo en el frontend
  async function handleSubmit(e) {
    e.preventDefault(); // que no recargue la página
    const nuevosErrores = validarRegistro(datos);
    setErrores(nuevosErrores);
    setExito(false);
    setErrorServidor('');
    if (!esFormularioValido(nuevosErrores)) return;

    setEnviando(true);
    try {
      await registrarse({
        nombre: datos.nombre,
        correo: datos.correo,
        contrasena: datos.contrasena,
        comunaId: Number(datos.comuna), // el value del select es el id de la comuna
      });
      setExito(true);
      setDatos(datosIniciales); // limpiamos el formulario
    } catch (error) {
      // ej: "Ya existe una cuenta con ese correo" o errores por campo del backend
      setErrores(error.campos ?? {});
      setErrorServidor(error.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="card shadow-sm p-4">
            <h1 className="h3 mb-4 text-center">Crear cuenta 👻</h1>

            {exito && (
              <div className="alert alert-success">
                ¡Registro exitoso! Bienvenido al más allá. Ya iniciaste sesión: <Link to="/productos" className="alert-link">ver propiedades</Link>
              </div>
            )}
            {errorServidor && <div className="alert alert-danger">{errorServidor}</div>}

            {/* noValidate apaga los avisos propios del navegador, así se ven solo nuestros mensajes */}
            <form onSubmit={handleSubmit} noValidate>
              <CampoFormulario etiqueta="Nombre completo" nombre="nombre"
                valor={datos.nombre} onChange={handleChange} error={errores.nombre} />

              <CampoFormulario etiqueta="Correo" nombre="correo" tipo="email"
                valor={datos.correo} onChange={handleChange} error={errores.correo} />

              <CampoFormulario etiqueta="Confirmar correo" nombre="confirmarCorreo" tipo="email"
                valor={datos.confirmarCorreo} onChange={handleChange} error={errores.confirmarCorreo} />

              <CampoFormulario etiqueta="Contraseña" nombre="contrasena" tipo="password"
                valor={datos.contrasena} onChange={handleChange} error={errores.contrasena} />

              <CampoFormulario etiqueta="Confirmar contraseña" nombre="confirmarContrasena" tipo="password"
                valor={datos.confirmarContrasena} onChange={handleChange} error={errores.confirmarContrasena} />

              {/* región y comuna lado a lado desde tablet; los select no usan CampoFormulario porque llevan <option> */}
              <div className="row">
                <div className="col-12 col-sm-6 mb-3">
                  <label htmlFor="region" className="form-label">Región</label>
                  <select id="region" name="region" value={datos.region} onChange={handleChange}
                    className={`form-select ${errores.region ? 'is-invalid' : ''}`}>
                    <option value="">Seleccionar</option>
                    {(regiones.datos ?? []).map((r) => (
                      <option key={r.codigo} value={r.codigo}>{r.nombre}</option>
                    ))}
                  </select>
                  {regiones.error && <div className="form-text text-danger">{regiones.error.message}</div>}
                  {errores.region && <div className="invalid-feedback">{errores.region}</div>}
                </div>

                <div className="col-12 col-sm-6 mb-3">
                  <label htmlFor="comuna" className="form-label">Comuna</label>
                  {/* queda bloqueado hasta elegir región y solo muestra las comunas de esa región.
                      En la EP1 esto se hacía armando las <option> con innerHTML */}
                  <select id="comuna" name="comuna" value={datos.comuna} onChange={handleChange}
                    disabled={!datos.region}
                    className={`form-select ${errores.comuna ? 'is-invalid' : ''}`}>
                    <option value="">
                      {datos.region ? 'Seleccione' : 'Elija una región'}
                    </option>
                    {(comunas.datos ?? []).map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                  {errores.comuna && <div className="invalid-feedback">{errores.comuna}</div>}
                </div>
              </div>

              <button type="submit" className="btn btn-warning w-100 mt-3" disabled={enviando}>
                {enviando ? 'Creando cuenta...' : 'Registrarse'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
