import * as api from './api';
import { respuestaJson } from '../test-utils/fetchFalso';

// Cliente de la API con window.fetch y localStorage reemplazados por mocks
describe('Cliente de la API', () => {
  const sesionGuardada = { token: 'viejo', refreshToken: 'refresco', usuario: { id: 2, rol: 'CLIENTE' } };

  beforeEach(() => {
    spyOn(Storage.prototype, 'getItem').and.returnValue(JSON.stringify(sesionGuardada));
    spyOn(Storage.prototype, 'setItem');
    spyOn(Storage.prototype, 'removeItem');
  });

  it('adapta la propiedad del backend a la forma que usan los componentes', () => {
    const p = api.adaptarPropiedad({ id: 3, slug: 'faro-ahogado', nombre: 'Faro', precio: 99900000 });
    expect(p.id).toBe('faro-ahogado');     // el id del frontend es el slug
    expect(p.idDb).toBe(3);                // el id real de la base de datos
    expect(p.precio).toBe('$99.900.000');  // texto para mostrar
    expect(p.precioNumero).toBe(99900000);
  });

  it('convierte el carrito en los items que espera POST /api/pedidos', () => {
    expect(api.carritoAItems(['faro', 'cabana', 'faro'])).toEqual([
      { slug: 'faro', cantidad: 2 },
      { slug: 'cabana', cantidad: 1 },
    ]);
  });

  it('envía el token en el header Authorization y transforma la respuesta', async () => {
    spyOn(window, 'fetch').and.returnValue(respuestaJson([{ id: 1, slug: 'a', precio: 1000 }]));

    const lista = await api.getPropiedades();

    const [url, opciones] = window.fetch.calls.mostRecent().args;
    expect(url).toBe(`${api.API_URL}/propiedades`);
    expect(opciones.headers.Authorization).toBe('Bearer viejo');
    expect(lista[0].precio).toBe('$1.000');
  });

  it('convierte las respuestas de error en ApiError con el mensaje del backend', async () => {
    spyOn(window, 'fetch').and.returnValue(
      respuestaJson({ estado: 400, mensaje: 'Datos inválidos', campos: { correo: 'mal' } }, 400));

    await expectAsync(api.enviarContacto({})).toBeRejectedWith(jasmine.objectContaining({
      estado: 400, message: 'Datos inválidos', campos: { correo: 'mal' },
    }));
  });

  it('si el backend no responde avisa que no se pudo conectar', async () => {
    spyOn(window, 'fetch').and.returnValue(Promise.reject(new TypeError('Failed to fetch')));
    await expectAsync(api.getBlogs()).toBeRejectedWith(jasmine.objectContaining({ estado: 0 }));
  });

  // RENOVACIÓN: el primer intento responde 401 (token vencido), se pide un token nuevo
  // a /auth/refresh, se guarda, y la petición original se repite con el token nuevo
  it('renueva el token automáticamente cuando el backend responde 401', async () => {
    const nuevaSesion = { token: 'nuevo', refreshToken: 'refresco2', usuario: sesionGuardada.usuario };
    let llamadasPedidos = 0;
    spyOn(window, 'fetch').and.callFake((url) => {
      if (url.endsWith('/auth/refresh')) return respuestaJson(nuevaSesion);
      llamadasPedidos++;
      return llamadasPedidos === 1 ? respuestaJson({ mensaje: 'El token expiró' }, 401) : respuestaJson([]);
    });
    const evento = jasmine.createSpy('evento');
    window.addEventListener(api.EVENTO_SESION, evento);

    const pedidos = await api.getMisPedidos();

    window.removeEventListener(api.EVENTO_SESION, evento);
    expect(pedidos).toEqual([]);
    expect(llamadasPedidos).toBe(2);
    expect(Storage.prototype.setItem).toHaveBeenCalledWith('sesion', JSON.stringify(nuevaSesion));
    expect(evento).toHaveBeenCalled();
  });

  it('si el refresh token también falla, cierra la sesión', async () => {
    spyOn(window, 'fetch').and.callFake((url) =>
      url.endsWith('/auth/refresh') ? respuestaJson({ mensaje: 'inválido' }, 401) : respuestaJson({ mensaje: 'expiró' }, 401));

    await expectAsync(api.getMisPedidos()).toBeRejectedWith(jasmine.objectContaining({ estado: 401 }));
    expect(Storage.prototype.removeItem).toHaveBeenCalledWith('sesion');
  });
});
