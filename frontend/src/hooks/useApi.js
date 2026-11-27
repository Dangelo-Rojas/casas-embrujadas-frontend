import { useEffect, useState } from 'react';

// Hook propio para cargar datos de la API en un componente.
// Devuelve { datos, cargando, error, recargar }.
//   const { datos, cargando, error } = useApi(() => getPropiedad(id), [id]);
// - "deps" funciona igual que en useEffect: si cambian, se vuelve a pedir
// - si el componente se desmonta antes de que llegue la respuesta, la ignoramos (variable "activo")
export function useApi(funcion, deps = []) {
  const [version, setVersion] = useState(0);
  const clave = JSON.stringify([...deps, version]);
  const [resultado, setResultado] = useState({ clave: null, datos: null, error: null });

  useEffect(() => {
    let activo = true;
    funcion()
      .then((datos) => { if (activo) setResultado({ clave, datos, error: null }); })
      .catch((error) => { if (activo) setResultado({ clave, datos: null, error }); });
    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  // mientras la respuesta no corresponda a los parámetros actuales, está cargando
  const cargando = resultado.clave !== clave;
  return {
    datos: cargando ? null : resultado.datos,
    error: cargando ? null : resultado.error,
    cargando,
    recargar: () => setVersion((v) => v + 1),
  };
}
