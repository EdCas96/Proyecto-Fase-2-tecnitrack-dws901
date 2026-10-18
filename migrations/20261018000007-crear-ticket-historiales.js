'use strict';

/**
 * Tabla ticket_historiales (nueva en la Fase 2, ver docs/CAMBIOS_FASE2.md):
 * registra cada cambio de estado de un ticket.
 * - estado_anterior es NULL en el primer registro (creación del ticket).
 * - usuario_id es NULL cuando el cambio lo provoca el cliente desde el portal.
 * - RESTRICT: el historial nunca debe perderse.
 * @implements RF-04, RF-05, RF-11, HU-06, HU-08, RN-04
 */
const ESTADOS = [
  'Recibido',
  'Diagnosticado',
  'Esperando_aprobacion',
  'En_reparacion',
  'Esperando_repuesto',
  'Listo',
  'Entregado',
  'Cancelado',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ticket_historiales', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      ticket_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'tickets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      estado_anterior: {
        type: Sequelize.ENUM(...ESTADOS),
        allowNull: true,
      },
      estado_nuevo: {
        type: Sequelize.ENUM(...ESTADOS),
        allowNull: false,
      },
      usuario_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      fecha: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Línea de tiempo del ticket y cálculo de tiempos del reporte (HU-08)
    await queryInterface.addIndex('ticket_historiales', ['ticket_id', 'fecha'], {
      name: 'idx_ticket_historiales_ticket_fecha',
    });
    await queryInterface.addIndex('ticket_historiales', ['estado_nuevo', 'fecha'], {
      name: 'idx_ticket_historiales_estado_fecha',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ticket_historiales');
  },
};
