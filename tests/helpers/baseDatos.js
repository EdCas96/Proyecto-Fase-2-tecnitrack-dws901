/**
 * Utilidades de base de datos para las pruebas de integración.
 */
const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
const { sequelize } = require('../../models');

const DIRECTORIO_SEEDERS = path.resolve(__dirname, '..', '..', 'seeders');

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
 * Vacía la base y carga los datos de los seeders (los mismos de npm run db:seed):
 * usuarios de prueba, clientes, equipos, catálogo, tickets y cotizaciones.
 */
async function sembrarDatos() {
  await limpiarBaseDatos();
  const queryInterface = sequelize.getQueryInterface();
  const archivos = fs.readdirSync(DIRECTORIO_SEEDERS).filter((archivo) => archivo.endsWith('.js')).sort();
  for (const archivo of archivos) {
    await require(path.join(DIRECTORIO_SEEDERS, archivo)).up(queryInterface, Sequelize);
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

module.exports = { limpiarBaseDatos, sembrarDatos, cerrarConexiones };
