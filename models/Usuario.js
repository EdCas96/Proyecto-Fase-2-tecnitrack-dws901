const { Model, DataTypes } = require('sequelize');
const { ROLES } = require('../utils/constantes');

/**
 * Cuenta del personal del taller (admin o técnico).
 * Por defecto NUNCA devuelve password_hash; solo el scope "conPassword" (login) lo incluye.
 * @implements RF-09, RF-10, RN-07, RN-08
 */
class Usuario extends Model {
  static inicializar(sequelize) {
    Usuario.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        nombre: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notNull: { msg: 'El nombre es obligatorio.' },
            len: { args: [2, 100], msg: 'El nombre debe tener entre 2 y 100 caracteres.' },
          },
        },
        correo: {
          type: DataTypes.STRING(120),
          allowNull: false,
          unique: { name: 'uq_usuarios_correo', msg: 'Ya existe un usuario con ese correo.' },
          set(valor) {
            this.setDataValue('correo', typeof valor === 'string' ? valor.trim().toLowerCase() : valor);
          },
          validate: {
            notNull: { msg: 'El correo es obligatorio.' },
            isEmail: { msg: 'El correo no tiene un formato válido.' },
            len: { args: [0, 120], msg: 'El correo no puede superar 120 caracteres.' },
          },
        },
        password_hash: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notNull: { msg: 'La contraseña es obligatoria.' },
            notEmpty: { msg: 'La contraseña es obligatoria.' },
          },
        },
        rol: {
          type: DataTypes.ENUM(...ROLES),
          allowNull: false,
          defaultValue: 'tecnico',
          validate: {
            isIn: { args: [ROLES], msg: `El rol debe ser uno de: ${ROLES.join(', ')}.` },
          },
        },
        activo: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
      },
      {
        sequelize,
        modelName: 'Usuario',
        tableName: 'usuarios',
        // RN-08: el hash no sale en ninguna consulta normal (ni en los include de otras consultas)
        defaultScope: {
          attributes: { exclude: ['password_hash'] },
        },
        scopes: {
          // Solo para AuthService al verificar credenciales
          conPassword: {
            attributes: { include: ['password_hash'] },
          },
        },
      },
    );
    return Usuario;
  }

  static asociar(modelos) {
    Usuario.hasMany(modelos.Ticket, { as: 'ticketsAsignados', foreignKey: 'tecnico_id', onDelete: 'RESTRICT' });
    Usuario.hasMany(modelos.TicketHistorial, { as: 'cambiosDeEstado', foreignKey: 'usuario_id', onDelete: 'RESTRICT' });
    Usuario.hasMany(modelos.Notificacion, { as: 'notificaciones', foreignKey: 'usuario_id', onDelete: 'RESTRICT' });
  }

  /** RN-08: aunque la instancia tenga el hash (ej. recién creada), nunca se serializa. */
  toJSON() {
    const datos = { ...this.get() };
    delete datos.password_hash;
    return datos;
  }
}

module.exports = Usuario;
