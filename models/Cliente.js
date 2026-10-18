const { Model, DataTypes } = require('sequelize');
const { REGEX_TELEFONO } = require('../utils/constantes');

/**
 * Dueño de uno o más equipos. No tiene cuenta: consulta sus tickets con folio + teléfono.
 * @implements RF-01, HU-01
 */
class Cliente extends Model {
  static inicializar(sequelize) {
    Cliente.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        nombre: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notNull: { msg: 'El nombre del cliente es obligatorio.' },
            len: { args: [2, 100], msg: 'El nombre debe tener entre 2 y 100 caracteres.' },
          },
        },
        telefono: {
          type: DataTypes.STRING(20),
          allowNull: false,
          set(valor) {
            this.setDataValue('telefono', typeof valor === 'string' ? valor.trim() : valor);
          },
          validate: {
            notNull: { msg: 'El teléfono es obligatorio.' },
            is: { args: REGEX_TELEFONO, msg: 'El teléfono debe tener al menos 8 dígitos (ej. 7123-4567).' },
          },
        },
        correo: {
          type: DataTypes.STRING(120),
          allowNull: true,
          // Un campo vacío del formulario se guarda como NULL
          set(valor) {
            const limpio = typeof valor === 'string' ? valor.trim().toLowerCase() : valor;
            this.setDataValue('correo', limpio === '' ? null : limpio);
          },
          validate: {
            isEmail: { msg: 'El correo no tiene un formato válido.' },
            len: { args: [0, 120], msg: 'El correo no puede superar 120 caracteres.' },
          },
        },
      },
      {
        sequelize,
        modelName: 'Cliente',
        tableName: 'clientes',
      },
    );
    return Cliente;
  }

  static asociar(modelos) {
    Cliente.hasMany(modelos.Equipo, { as: 'equipos', foreignKey: 'cliente_id', onDelete: 'RESTRICT' });
  }
}

module.exports = Cliente;
