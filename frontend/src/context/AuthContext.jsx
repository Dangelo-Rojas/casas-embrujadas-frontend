import { createContext, useContext, useEffect, useState } from 'react';
import * as api from '../services/api';
import { leerSesion, guardarSesion, borrarSesion, tokenExpirado } from '../services/sesion';

// Estado global de la SESIÓN (igual idea que CarritoContext, pero para el usuario conectado).
// Lo usan el Navbar (saludo y menú según el rol), el Login, el Registro, el Carrito y las rutas protegidas
const AuthContext = createContext(null);

// Al cargar la página: si el refresh token también venció, la sesión ya no sirve y se descarta
function sesionInicial() {
  const sesion = leerSesion();
  if (sesion && tokenExpirado(sesion.refreshToken, 0)) {
    borrarSesion();
    return null;
  }
  return sesion;
}

export function AuthProvider({ children }) {
  // función sin () para que solo se ejecute en el primer render (igual que en CarritoContext)
  const [sesion, setSesion] = useState(sesionInicial);

  // Escuchamos dos avisos:
  //  - EVENTO_SESION: services/api.js renovó el token o la sesión expiró
  //  - "storage": se inició o cerró sesión en OTRA pestaña del navegador
  useEffect(() => {
    const actualizar = () => setSesion(leerSesion());
    window.addEventListener(api.EVENTO_SESION, actualizar);
    window.addEventListener('storage', actualizar);
    return () => {
      window.removeEventListener(api.EVENTO_SESION, actualizar);
      window.removeEventListener('storage', actualizar);
    };
  }, []);

  // Si al recargar la página el token de acceso ya venció (pasaron más de 30 min),
  // lo renovamos de inmediato con el refresh token, sin pedir la contraseña de nuevo
  useEffect(() => {
    if (sesion && tokenExpirado(sesion.token)) {
      api.renovarSesion(sesion.refreshToken);
    }
  }, [sesion]);

  async function iniciarSesion(correo, contrasena) {
    const respuesta = await api.login(correo, contrasena);
    guardarSesion(respuesta);
    setSesion(leerSesion());
    return respuesta.usuario;
  }

  async function registrarse(datos) {
    const respuesta = await api.registrar(datos);
    guardarSesion(respuesta); // al registrarse queda con la sesión iniciada
    setSesion(leerSesion());
    return respuesta.usuario;
  }

  function cerrarSesion() {
    borrarSesion();
    setSesion(null);
  }

  const usuario = sesion?.usuario ?? null;
  const valor = {
    usuario,
    estaAutenticado: usuario !== null,
    esAdmin: usuario?.rol === 'ADMIN',
    iniciarSesion,
    registrarse,
    cerrarSesion,
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

// (mismo aviso de react-refresh que en CarritoContext: solo afecta la recarga en caliente de Vite)
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
