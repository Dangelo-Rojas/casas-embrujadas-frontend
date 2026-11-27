// Ayudantes para probar componentes que llaman a la API sin necesitar el backend encendido.
// En las pruebas reemplazamos window.fetch con un spy (mock) que responde lo que queremos
import { act } from 'react';

// arma una respuesta HTTP falsa con cuerpo JSON y el código de estado indicado
export function respuestaJson(datos, estado = 200) {
  const cuerpo = datos === null ? null : JSON.stringify(datos);
  return Promise.resolve(new Response(cuerpo, { status: estado, headers: { 'Content-Type': 'application/json' } }));
}

// deja que terminen las promesas pendientes (las respuestas del fetch falso) y que React dibuje
export function esperarRespuestas() {
  return act(() => new Promise((resolver) => setTimeout(resolver, 0)));
}

// arma un JWT de mentira con la fecha de expiración indicada (solo nos interesa el payload)
export function tokenFalso(segundosHastaExpirar) {
  const payload = btoa(JSON.stringify({ sub: 'x@duoc.cl', exp: Math.floor(Date.now() / 1000) + segundosHastaExpirar }));
  return `cabecera.${payload}.firma`;
}
