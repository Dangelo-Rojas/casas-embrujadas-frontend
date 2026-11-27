import { useState } from 'react';
import CampoFormulario from '../components/CampoFormulario';
import { validarContacto, esFormularioValido } from '../utils/validaciones';
import { enviarContacto } from '../services/api';

const datosIniciales = { nombre: '', correo: '', mensaje: '' };

export default function Contacto() {
  const [datos, setDatos] = useState(datosIniciales);
  const [errores, setErrores] = useState({});
  const [exito, setExito] = useState(false);
  const [errorServidor, setErrorServidor] = useState('');
  const [enviando, setEnviando] = useState(false);

  function handleChange(e) {
    setDatos({ ...datos, [e.target.name]: e.target.value });
  }

  // EP3: el mensaje se guarda en el backend (POST /api/contacto) y el admin lo ve en su panel.
  // Se valida primero aquí para no enviar algo que sabemos que está mal, y el backend vuelve a validar
  async function handleSubmit(e) {
    e.preventDefault();
    const nuevosErrores = validarContacto(datos);
    setErrores(nuevosErrores);
    setExito(false);
    setErrorServidor('');
    if (!esFormularioValido(nuevosErrores)) return;

    setEnviando(true);
    try {
      await enviarContacto(datos);
      setExito(true);
      setDatos(datosIniciales);
    } catch (error) {
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
          <h1 className="mb-4 text-center">Contáctanos</h1>

          {exito && <div className="alert alert-success">Tu mensaje llegó al más allá (y también a nosotros).</div>}
          {errorServidor && <div className="alert alert-danger">{errorServidor}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <CampoFormulario etiqueta="Nombre completo" nombre="nombre"
              valor={datos.nombre} onChange={handleChange} error={errores.nombre} />
            <CampoFormulario etiqueta="Correo electrónico" nombre="correo" tipo="email"
              valor={datos.correo} onChange={handleChange} error={errores.correo} />

            {/* el textarea va aparte porque CampoFormulario solo hace <input> */}
            <div className="mb-3">
              <label htmlFor="mensaje" className="form-label">Mensaje</label>
              <textarea id="mensaje" name="mensaje" rows="5" maxLength="500"
                value={datos.mensaje} onChange={handleChange}
                className={`form-control ${errores.mensaje ? 'is-invalid' : ''}`}
                placeholder="Cuéntanos en qué te podemos ayudar..." />
              {errores.mensaje && <div className="invalid-feedback">{errores.mensaje}</div>}
              {/* contador de caracteres, se actualiza con cada letra porque sale del estado */}
              <div className="form-text text-end">{datos.mensaje.length}/500</div>
            </div>

            <button type="submit" className="btn btn-warning w-100 mt-3" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar mensaje'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
