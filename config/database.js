/**
 * Instancia única de Sequelize compartida por toda la aplicación.
 */
const { Sequelize } = require('sequelize');
const { entorno } = require('./env');
const configuraciones = require('./config');

const config = configuraciones[entorno];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

module.exports = sequelize;
