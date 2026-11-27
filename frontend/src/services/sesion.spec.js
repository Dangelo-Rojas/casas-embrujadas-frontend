import { leerSesion, guardarSesion, borrarSesion, leerPayload, tokenExpirado } from './sesion';
import { tokenFalso } from '../test-utils/fetchFalso';

// Lógica de la sesión guardada en el navegador (localStorage reemplazado con spyOn)
describe('Servicio de sesión', () => {
  it('lee una sesión válida y descarta datos corruptos o incompletos', () => {
    const getItem = spyOn(Storage.prototype, 'getItem');

    getItem.and.returnValue('{"token":"a","refreshToken":"b","usuario":{"id":1}}');
    expect(leerSesion().usuario.id).toBe(1);

    getItem.and.returnValue('{"token":"a"}');   // le falta el refresh token y el usuario
    expect(leerSesion()).toBeNull();

    getItem.and.returnValue('{esto no es json');
    expect(leerSesion()).toBeNull();
  });

  it('guarda solo token, refreshToken y usuario, y borra la sesión', () => {
    const setItem = spyOn(Storage.prototype, 'setItem');
    const removeItem = spyOn(Storage.prototype, 'removeItem');

    guardarSesion({ token: 'a', refreshToken: 'b', tipo: 'Bearer', usuario: { id: 1 } });
    expect(setItem).toHaveBeenCalledWith('sesion', '{"token":"a","refreshToken":"b","usuario":{"id":1}}');

    borrarSesion();
    expect(removeItem).toHaveBeenCalledWith('sesion');
  });

  it('lee el payload de un JWT y detecta si está expirado', () => {
    expect(leerPayload(tokenFalso(60)).sub).toBe('x@duoc.cl');
    expect(leerPayload('no-es-un-jwt')).toBeNull();

    expect(tokenExpirado(tokenFalso(600))).toBeFalse();   // vence en 10 minutos
    expect(tokenExpirado(tokenFalso(-10))).toBeTrue();    // venció hace 10 segundos
    expect(tokenExpirado(tokenFalso(20))).toBeTrue();     // vence en 20 s: dentro del margen de 30 s
    expect(tokenExpirado('basura')).toBeTrue();
  });
});
