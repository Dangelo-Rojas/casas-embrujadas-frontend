import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import Registro from './Registro';
import { AuthProvider } from '../context/AuthContext';
import { renderizar, cambiarValor } from '../test-utils/renderizar';
import { respuestaJson, esperarRespuestas } from '../test-utils/fetchFalso';

// Prueba el formulario completo como lo usaría una persona: escribir, elegir y enviar.
// EP3: las regiones, las comunas y el registro vienen del backend, así que window.fetch se
// reemplaza con un MOCK (spyOn) que responde según la URL, sin necesitar el backend encendido
describe('Página Registro', () => {
  let vista;
  const $ = (selector) => vista.contenedor.querySelector(selector);
  const enviar = () => act(() => $('button[type="submit"]').click());

  const regiones = [
    { id: 1, codigo: 'metropolitana', nombre: 'Región Metropolitana' },
    { id: 3, codigo: 'nuble', nombre: 'Región de Ñuble' },
  ];
  const comunasNuble = [
    { id: 8, nombre: 'Chillán' }, { id: 9, nombre: 'San Carlos' }, { id: 10, nombre: 'Bulnes' },
  ];

  beforeEach(async () => {
    spyOn(Storage.prototype, 'getItem').and.returnValue(null);
    spyOn(Storage.prototype, 'setItem');
    spyOn(window, 'fetch').and.callFake((url, opciones = {}) => {
      if (url.endsWith('/regiones')) return respuestaJson(regiones);
      if (url.endsWith('/regiones/nuble/comunas')) return respuestaJson(comunasNuble);
      if (url.endsWith('/auth/registro') && opciones.method === 'POST') {
        const datos = JSON.parse(opciones.body);
        if (datos.correo === 'repetido@gmail.com') {
          return respuestaJson({ estado: 400, mensaje: 'Ya existe una cuenta con ese correo', campos: null }, 400);
        }
        return respuestaJson({ token: 't', refreshToken: 'r', tipo: 'Bearer', expiraEn: 1800,
          usuario: { id: 5, nombre: datos.nombre, correo: datos.correo, rol: 'CLIENTE' } }, 201);
      }
      return respuestaJson({ mensaje: 'no esperado' }, 500);
    });

    vista = renderizar(<MemoryRouter><AuthProvider><Registro /></AuthProvider></MemoryRouter>);
    await esperarRespuestas(); // carga de regiones
  });
  afterEach(() => vista.desmontar());

  const llenarFormulario = async (correo) => {
    cambiarValor($('#nombre'), 'Dangelo Rojas');
    cambiarValor($('#correo'), correo);
    cambiarValor($('#confirmarCorreo'), correo);
    cambiarValor($('#contrasena'), 'fantasma');
    cambiarValor($('#confirmarContrasena'), 'fantasma');
    cambiarValor($('#region'), 'nuble'); // primero la región, si no la comuna está bloqueada
    await esperarRespuestas();           // llegan las comunas de Ñuble
    cambiarValor($('#comuna'), '8');     // el value es el id de la comuna (Chillán)
  };

  it('al enviar vacío muestra los mensajes de error y no llama al backend', () => {
    enviar();
    // son 5 y no 7: con todo vacío las confirmaciones coinciden ('' === '') y no marcan error
    expect(vista.contenedor.querySelectorAll('.invalid-feedback').length).toBe(5);
    expect($('#nombre').classList).toContain('is-invalid');
    expect(window.fetch).not.toHaveBeenCalledWith(jasmine.stringContaining('/auth/registro'), jasmine.anything());
  });

  it('carga las regiones desde la API y al elegir una pide sus comunas', async () => {
    expect($('#region').options.length).toBe(3); // "Seleccionar" + 2 regiones del mock
    expect($('#comuna').disabled).toBeTrue();

    cambiarValor($('#region'), 'nuble');
    await esperarRespuestas();

    expect(window.fetch).toHaveBeenCalledWith(jasmine.stringContaining('/regiones/nuble/comunas'), jasmine.anything());
    expect($('#comuna').disabled).toBeFalse();
    expect($('#comuna').options.length).toBe(4); // "Seleccione" + 3 comunas de Ñuble
  });

  it('con datos válidos crea la cuenta en el backend, guarda la sesión y limpia el formulario', async () => {
    await llenarFormulario('dangelo@duoc.cl');

    enviar();
    await esperarRespuestas();

    const [, opciones] = window.fetch.calls.mostRecent().args;
    expect(JSON.parse(opciones.body)).toEqual({
      nombre: 'Dangelo Rojas', correo: 'dangelo@duoc.cl', contrasena: 'fantasma', comunaId: 8,
    });
    expect(Storage.prototype.setItem).toHaveBeenCalledWith('sesion', jasmine.stringContaining('"token":"t"'));
    expect($('.alert-success')).not.toBeNull();
    expect($('#nombre').value).toBe('');
  });

  it('si el backend rechaza el registro muestra su mensaje', async () => {
    await llenarFormulario('repetido@gmail.com');

    enviar();
    await esperarRespuestas();

    expect($('.alert-danger').textContent).toContain('Ya existe una cuenta con ese correo');
    expect($('.alert-success')).toBeNull();
  });
});
