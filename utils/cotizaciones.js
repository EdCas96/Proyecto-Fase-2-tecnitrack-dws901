/**
 * Cálculos de cotizaciones sin base de datos (se prueban como unidad).
 *
 * Los montos se calculan en CENTAVOS enteros: con decimales binarios,
 * 3 x 0.10 da 0.30000000000000004 y 0.1 + 0.2 da 0.30000000000000004.
 */

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** "12.50" o 12.5 -> 1250. */
const aCentavos = (valor) => Math.round(Number(valor) * 100);

/** 1250 -> "12.50" (formato de las columnas DECIMAL(10,2)). */
const centavosATexto = (centavos) => (centavos / 100).toFixed(2);

/**
 * Total de las líneas de una cotización, en centavos.
 * @param {Array<{cantidad: number|string, precio_unitario: number|string}>} lineas
 * @returns {number}
 */
const calcularTotalCentavos = (lineas) => lineas
  .reduce((total, { cantidad, precio_unitario: precio }) => total + Number(cantidad) * aCentavos(precio), 0);

/** Días completos desde la fecha de la cotización. */
const diasTranscurridos = (fecha, ahora = new Date()) => Math.floor((ahora - new Date(fecha)) / MS_POR_DIA);

/**
 * RN-05: una cotización Pendiente con más de "dias" días se muestra como
 * "Pendiente de respuesta". Es solo un indicador: nunca se cancela sola.
 */
const estaVencida = (fecha, dias, ahora = new Date()) => (ahora - new Date(fecha)) > dias * MS_POR_DIA;

module.exports = {
  aCentavos, centavosATexto, calcularTotalCentavos, diasTranscurridos, estaVencida,
};
