/**
 * Utilidades de texto compartidas por servicios y validadores.
 */

/** Escapa % y _ para que una búsqueda con LIKE los trate como texto y no como comodines. */
const escaparLike = (texto) => String(texto).replace(/[\\%_]/g, '\\$&');

/** Texto recortado; null si queda vacío (campos opcionales del formulario). */
function textoOpcional(valor) {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim();
  return limpio === '' ? null : limpio;
}

/**
 * Teléfono de El Salvador en formato 0000-0000.
 * Acepta 8 dígitos con o sin guion o espacios; devuelve null si no son 8 dígitos.
 */
function formatearTelefonoSV(valor) {
  const digitos = typeof valor === 'string' ? valor.replace(/[\s-]/g, '') : '';
  return /^\d{8}$/.test(digitos) ? `${digitos.slice(0, 4)}-${digitos.slice(4)}` : null;
}

module.exports = { escaparLike, textoOpcional, formatearTelefonoSV };
