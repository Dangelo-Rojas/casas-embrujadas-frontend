// Manejo de la sesión guardada en el navegador.
// La sesión es { token, refreshToken, usuario } y se guarda en localStorage para que
// sobreviva a las recargas de página (F5) y a cerrar la pestaña.
// Medidas de seguridad: el token de acceso dura poco (30 min), se revisa su fecha de expiración
// antes de usarlo, se renueva con el refresh token, y al cerrar sesión o si la renovación falla
// se borra todo. Además el backend vuelve a verificar la firma del token en CADA petición.
const CLAVE = 'sesion';

export function leerSesion() {
  try {
    const sesion = JSON.parse(localStorage.getItem(CLAVE));
    // si lo guardado no tiene la forma esperada (o fue manipulado) lo ignoramos
    return sesion && sesion.token && sesion.refreshToken && sesion.usuario ? sesion : null;
  } catch {
    return null;
  }
}

export function guardarSesion({ token, refreshToken, usuario }) {
  localStorage.setItem(CLAVE, JSON.stringify({ token, refreshToken, usuario }));
}

export function borrarSesion() {
  localStorage.removeItem(CLAVE);
}

// Lee el "payload" (la parte del medio) de un JWT. No verifica la firma: eso lo hace el backend.
// Aquí solo lo usamos para saber cuándo expira el token
export function leerPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

// true si el token ya venció (o vence en menos de "margenSegundos").
// "exp" viene en segundos desde 1970; Date.now() en milisegundos
export function tokenExpirado(token, margenSegundos = 30) {
  const payload = leerPayload(token);
  if (!payload || !payload.exp) return true;
  return payload.exp * 1000 <= Date.now() + margenSegundos * 1000;
}
