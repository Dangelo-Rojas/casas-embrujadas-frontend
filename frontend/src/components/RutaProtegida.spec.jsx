import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RutaProtegida from './RutaProtegida';
import { AuthProvider } from '../context/AuthContext';
import { renderizar } from '../test-utils/renderizar';
import { tokenFalso } from '../test-utils/fetchFalso';

// Restricciones de acceso en el frontend según la sesión y el rol
describe('Componente RutaProtegida', () => {
  let vista;
  afterEach(() => vista.desmontar());

  const conSesion = (rol) => {
    const sesion = rol && JSON.stringify({
      token: tokenFalso(600), refreshToken: tokenFalso(6000), usuario: { id: 1, nombre: 'Ana', rol },
    });
    spyOn(Storage.prototype, 'getItem').and.callFake((clave) => (clave === 'sesion' ? sesion : null));
  };

  const montar = () => renderizar(
    <MemoryRouter initialEntries={['/admin']}>
      <AuthProvider>
        <Routes>
          <Route path="/admin" element={<RutaProtegida rol="ADMIN"><p id="panel">Panel secreto</p></RutaProtegida>} />
          <Route path="/login" element={<p id="login">Página de login</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

  it('sin sesión redirige al login', () => {
    conSesion(null);
    vista = montar();
    expect(vista.contenedor.querySelector('#login')).not.toBeNull();
    expect(vista.contenedor.querySelector('#panel')).toBeNull();
  });

  it('con sesión de CLIENTE muestra acceso restringido', () => {
    conSesion('CLIENTE');
    vista = montar();
    expect(vista.contenedor.textContent).toContain('Acceso restringido');
    expect(vista.contenedor.querySelector('#panel')).toBeNull();
  });

  it('con sesión de ADMIN muestra la página', () => {
    conSesion('ADMIN');
    vista = montar();
    expect(vista.contenedor.querySelector('#panel')).not.toBeNull();
  });
});
