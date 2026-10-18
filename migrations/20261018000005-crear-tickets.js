'use strict';

/**
 * Tabla tickets: cada ingreso de un equipo al taller.
 * - folio único con formato TT-AAAA-NNNN (RN-03), validado también con CHECK.
 * - tecnico_id nullable: un ticket puede estar "Sin asignar".
 * - RESTRICT en ambas FK: borrar el equipo o el técnico rompería el historial.
 * @implements RF-03, RF-04, RF-05, HU-02, HU-06, RN-03, RN-04
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
    await queryInterface.createTable('tickets', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      folio: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: 'uq_tickets_folio',
      },
      equipo_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'equipos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      tecnico_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      estado: {
        type: Sequelize.ENUM(...ESTADOS),
        allowNull: false,
        defaultValue: 'Recibido',
      },
      diagnostico_inicial: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      fecha_ingreso: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      fecha_entrega: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex('tickets', ['estado'], { name: 'idx_tickets_estado' });
    await queryInterface.addIndex('tickets', ['tecnico_id', 'estado'], { name: 'idx_tickets_tecnico_estado' });

    await queryInterface.sequelize.query(
      "ALTER TABLE tickets ADD CONSTRAINT chk_tickets_folio CHECK (folio REGEXP '^TT-[0-9]{4}-[0-9]{4,}$')",
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE tickets ADD CONSTRAINT chk_tickets_fechas CHECK (fecha_entrega IS NULL OR fecha_entrega >= fecha_ingreso)',
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tickets');
  },
};
