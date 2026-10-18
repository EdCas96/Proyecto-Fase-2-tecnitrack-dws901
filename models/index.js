/**
 * Registra todos los modelos sobre la instancia única de Sequelize y define sus asociaciones.
 * Uso: const { Ticket, Cliente, sequelize } = require('../models');
 */
const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');

const clases = [
  require('./Usuario'),
  require('./Cliente'),
  require('./Equipo'),
  require('./CatalogoItem'),
  require('./Ticket'),
  require('./TicketFoto'),
  require('./TicketHistorial'),
  require('./Cotizacion'),
  require('./CotizacionItem'),
  require('./Notificacion'),
];

const modelos = {};
for (const Clase of clases) {
  modelos[Clase.name] = Clase.inicializar(sequelize);
}
for (const Clase of clases) {
  Clase.asociar(modelos);
}

module.exports = { ...modelos, sequelize, Sequelize };
