const { Model, DataTypes } = require('sequelize');
const { TIPOS_EQUIPO } = require('../utils/constantes');

/**
 * Equipo de un cliente (laptop, computadora de escritorio, impresora...).
 * @implements RF-02, RF-05, HU-01
 */
class Equipo extends Model {
  static inicializar(sequelize) {
    Equipo.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        cliente_id: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          validate: { notNull: { msg: 'El equipo debe pertenecer a un cliente.' } },
        },
        tipo: {
          type: DataTypes.ENUM(...TIPOS_EQUIPO),
          allowNull: false,
          validate: {
            notNull: { msg: 'El tipo de equipo es obligatorio.' },
            isIn: { args: [TIPOS_EQUIPO], msg: `El tipo debe ser uno de: ${TIPOS_EQUIPO.join(', ')}.` },
          },
        },
        marca: {
          type: DataTypes.STRING(60),
          allowNull: false,
          validate: {
            notNull: { msg: 'La marca es obligatoria.' },
            len: { args: [1, 60], msg: 'La marca debe tener entre 1 y 60 caracteres.' },
          },
        },
        modelo: {
          type: DataTypes.STRING(80),
          allowNull: false,
          validate: {
            notNull: { msg: 'El modelo es obligatorio.' },
            len: { args: [1, 80], msg: 'El modelo debe tener entre 1 y 80 caracteres.' },
          },
        },
        numero_serie: {
          type: DataTypes.STRING(80),
          allowNull: true,
          unique: { name: 'uq_equipos_numero_serie', msg: 'Ya existe un equipo con ese número de serie.' },
          set(valor) {
            const limpio = typeof valor === 'string' ? valor.trim() : valor;
            this.setDataValue('numero_serie', limpio === '' ? null : limpio);
          },
          validate: {
            len: { args: [1, 80], msg: 'El número de serie no puede superar 80 caracteres.' },
          },
        },
      },
      {
        sequelize,
        modelName: 'Equipo',
        tableName: 'equipos',
      },
    );
    return Equipo;
  }

  static asociar(modelos) {
    Equipo.belongsTo(modelos.Cliente, { as: 'cliente', foreignKey: 'cliente_id', onDelete: 'RESTRICT' });
    Equipo.hasMany(modelos.Ticket, { as: 'tickets', foreignKey: 'equipo_id', onDelete: 'RESTRICT' });
  }
}

module.exports = Equipo;
