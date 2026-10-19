/**
 * Utilidades de base de datos para las pruebas de integración.
 */
const { sequelize } = require('../../models');

// De hijas a padres, para respetar las llaves foráneas sin desactivarlas
const TABLAS = [
  'notificaciones',
  'cotizacion_items',
  'cotizaciones',
  'ticket_historiales',
  'ticket_fotos',
  'tickets',
  'equipos',
  'clientes',
  'catalogo_items',
  'usuarios',
  'sesiones',
];

/** Deja todas las tablas vacías (el esquema lo crea tests/setup/globalSetup.js). */
async function limpiarBaseDatos() {
  for (const tabla of TABLAS) {
    await sequelize.query(`DELETE FROM \`${tabla}\``);
  }
}

/**
 * Cierra las conexiones abiertas para que Jest termine: la de Sequelize y,
 * si el archivo de pruebas cargó app.js, el pool del almacén de sesiones.
 */
async function cerrarConexiones() {
  await sequelize.close();
  const rutaSesion = require.resolve('../../config/sesion');
  if (require.cache[rutaSesion]) {
    await require.cache[rutaSesion].exports.almacenSesiones.close();
  }
}

module.exports = { limpiarBaseDatos, cerrarConexiones };
