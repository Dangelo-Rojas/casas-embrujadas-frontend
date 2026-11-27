import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';
import { CarritoProvider } from '../context/CarritoContext';
import { AuthProvider } from '../context/AuthContext';
import { renderizar } from '../test-utils/renderizar';
import { tokenFalso } from '../test-utils/fetchFalso';

// El Navbar necesita el router (por los Link), el AuthProvider (sesión) y el CarritoProvider (contador).
// localStorage se reemplaza con spyOn en cada prueba para controlar qué "hay guardado"
describe('Componente Navbar', () => {
  let vista;
  afterEach(() => vista.desmontar());

  const montar = () => renderizar(
    <MemoryRouter>
      <AuthProvider>
        <CarritoProvider><Navbar /></CarritoProvider>
      </AuthProvider>
    </MemoryRouter>
  );

  // localStorage falso que responde según la clave pedida ('carrito' o 'sesion')
  const guardado = (valores) => {
    spyOn(Storage.prototype, 'getItem').and.callFake((clave) => valores[clave] ?? null);
    spyOn(Storage.prototype, 'setItem');
    spyOn(Storage.prototype, 'removeItem');
  };

  // prueba de integración: el número del carrito pasa por localStorage -> Context -> Navbar
  it('muestra los enlaces y la cantidad del carrito desde el Context', () => {
    guardado({ carrito: '["a","b","c"]' });

    vista = montar();

    const texto = vista.contenedor.textContent;
    expect(texto).toContain('Propiedades');
    expect(texto).toContain('Contacto');
    expect(texto).toContain('Carrito (3)');
    expect(texto).toContain('Iniciar sesión'); // sin sesión
    expect(texto).not.toContain('Panel admin');
  });

  // EP3: con sesión de ADMIN aparece el saludo, Mis pedidos y el Panel admin; con CLIENTE no aparece el panel
  it('cambia según la sesión y el rol del usuario', () => {
    const sesion = (rol) => JSON.stringify({
      token: tokenFalso(600), refreshToken: tokenFalso(6000), usuario: { id: 1, nombre: 'Ana Pérez', rol },
    });

    guardado({ sesion: sesion('ADMIN') });
    vista = montar();
    let texto = vista.contenedor.textContent;
    expect(texto).toContain('Hola, Ana');
    expect(texto).toContain('Panel admin');
    expect(texto).toContain('Mis pedidos');
    expect(texto).not.toContain('Iniciar sesión');
    vista.desmontar();

    Storage.prototype.getItem.and.callFake((clave) => (clave === 'sesion' ? sesion('CLIENTE') : null));
    vista = montar();
    texto = vista.contenedor.textContent;
    expect(texto).toContain('Mis pedidos');
    expect(texto).not.toContain('Panel admin');

    // cerrar sesión borra la sesión guardada y vuelve a mostrar "Iniciar sesión"
    const botonSalir = [...vista.contenedor.querySelectorAll('button')].find((b) => b.textContent === 'Cerrar sesión');
    act(() => botonSalir.click());
    expect(Storage.prototype.removeItem).toHaveBeenCalledWith('sesion');
    expect(vista.contenedor.textContent).toContain('Iniciar sesión');
  });

  it('el botón ☰ abre el menú y al elegir un enlace se cierra', () => {
    guardado({});

    vista = montar();

    const menu = vista.contenedor.querySelector('#menu');
    const botonMenu = vista.contenedor.querySelector('.navbar-toggler');

    expect(menu.classList).not.toContain('show');

    act(() => botonMenu.click());
    expect(menu.classList).toContain('show');
    expect(botonMenu.getAttribute('aria-expanded')).toBe('true');

    act(() => vista.contenedor.querySelector('.nav-link').click());
    expect(menu.classList).not.toContain('show');
  });

  // revisa los 4 casos del useEffect: clic dentro, clic fuera, otra tecla y Escape
  it('se cierra al hacer clic fuera del menú o al presionar Escape', () => {
    guardado({});

    vista = montar();

    const menu = vista.contenedor.querySelector('#menu');
    const botonMenu = vista.contenedor.querySelector('.navbar-toggler');
    const clic = (el) => act(() => el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
    const tecla = (key) => act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key })));

    act(() => botonMenu.click());
    clic(menu);           // clic dentro: sigue abierto
    expect(menu.classList).toContain('show');
    clic(document.body);  // clic fuera: se cierra
    expect(menu.classList).not.toContain('show');

    act(() => botonMenu.click());
    tecla('Enter');       // otra tecla: no pasa nada
    expect(menu.classList).toContain('show');
    tecla('Escape');      // Escape: se cierra
    expect(menu.classList).not.toContain('show');
  });
});
