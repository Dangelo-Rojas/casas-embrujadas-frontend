import { Link, useParams } from 'react-router-dom';
import { Cargando, MensajeError } from '../components/EstadoCarga';
import { useApi } from '../hooks/useApi';
import { getBlog } from '../services/api';

// Un solo componente para todos los casos (antes eran blog-detalle-1.html y blog-detalle-2.html)
export default function BlogDetalle() {
  const { id } = useParams();
  const { datos: blog, cargando, error, recargar } = useApi(() => getBlog(id), [id]);

  if (cargando) return <Cargando />;
  if (error && error.estado !== 404) {
    return <div className="container py-4"><MensajeError error={error} onReintentar={recargar} /></div>;
  }

  if (!blog) {
    return (
      <div className="container py-5 text-center">
        <h1>Caso no encontrado 👻</h1>
        <Link to="/blogs" className="btn-enlace">Volver a blogs</Link>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/">Home</Link></li>
          <li className="breadcrumb-item"><Link to="/blogs">Blogs</Link></li>
          <li className="breadcrumb-item active" aria-current="page">{blog.titulo}</li>
        </ol>
      </nav>

      {/* ancho máximo para que las líneas de texto no queden demasiado largas */}
      <article className="mx-auto" style={{ maxWidth: '700px' }}>
        <h1 className="mb-3">{blog.titulo}</h1>
        <img src={blog.imagenGrande} alt={blog.titulo} className="img-fluid rounded mb-4" />
        {/* usamos el índice como key porque los párrafos no cambian de orden */}
        {blog.parrafos.map((p, i) => <p key={i}>{p}</p>)}
      </article>
    </div>
  );
}
