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
];

/** Deja todas las tablas vacías (el esquema lo crea tests/setup/globalSetup.js). */
async function limpiarBaseDatos() {
  for (const tabla of TABLAS) {
    await sequelize.query(`DELETE FROM \`${tabla}\``);
  }
}

module.exports = { limpiarBaseDatos };
