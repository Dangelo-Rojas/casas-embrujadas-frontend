// Mensajes reutilizables mientras se espera a la API o cuando falla
export function Cargando({ texto = 'Invocando datos...' }) {
  return (
    <div className="text-center py-5" role="status">
      <div className="spinner-border text-warning mb-2" aria-hidden="true"></div>
      <p className="text-secondary mb-0">{texto}</p>
    </div>
  );
}

export function MensajeError({ error, onReintentar }) {
  return (
    <div className="alert alert-danger d-flex justify-content-between align-items-center my-4" role="alert">
      <span>{error?.message || 'Ocurrió un error inesperado'}</span>
      {onReintentar && (
        <button type="button" className="btn btn-sm btn-outline-light" onClick={onReintentar}>Reintentar</button>
      )}
    </div>
  );
}
