/**
 * Paginación de listados en la consulta (LIMIT/OFFSET), nunca en memoria (RNF-04).
 */

/** Registros por página en todos los listados. */
const POR_PAGINA = 10;

/** Número de página pedido en la query string (?pagina=3); 1 si no es válido. */
function leerPagina(valor) {
  const pagina = Number.parseInt(valor, 10);
  return Number.isInteger(pagina) && pagina > 0 ? pagina : 1;
}

/** Opciones limit/offset para findAndCountAll. */
function opcionesPaginacion(pagina, porPagina = POR_PAGINA) {
  return { limit: porPagina, offset: (leerPagina(pagina) - 1) * porPagina };
}

/**
 * Resultado de findAndCountAll con los datos que necesita partials/paginacion.ejs.
 * @returns {{registros: Array, total: number, pagina: number, totalPaginas: number, porPagina: number}}
 */
function resultadoPaginado({ count, rows }, pagina, porPagina = POR_PAGINA) {
  return {
    registros: rows,
    total: count,
    pagina: leerPagina(pagina),
    totalPaginas: Math.max(1, Math.ceil(count / porPagina)),
    porPagina,
  };
}

module.exports = {
  POR_PAGINA, leerPagina, opcionesPaginacion, resultadoPaginado,
};
