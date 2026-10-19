/**
 * Registro simple de cada petición: método, ruta, código de respuesta y tiempo en ms.
 * La ruta se registra sin la query string para no dejar tokens (ej. _csrf) en el log.
 *
 * @param {object} [opciones]
 * @param {Function} [opciones.escribir=console.log] Destino del registro (configurable para las pruebas).
 * @returns {Function} Middleware de Express
 */
function logger({ escribir = console.log } = {}) {
  return (req, res, next) => {
    const inicio = process.hrtime.bigint();

    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
      const ruta = req.originalUrl.split('?')[0];
      escribir(`[HTTP] ${req.method} ${ruta} ${res.statusCode} ${ms.toFixed(1)} ms`);
    });

    next();
  };
}

module.exports = logger;
