'use strict';

const bcrypt = require('bcrypt');

/**
 * Usuarios de prueba del prototipo. Contraseña de todos: Tecni2026!
 * Óscar Meléndez está inactivo para demostrar RN-07 / HU-09.
 */
const PASSWORD_PRUEBA = 'Tecni2026!';
const COSTO_BCRYPT = 10;

const USUARIOS = [
  { id: 1, nombre: 'Administrador Principal', correo: 'admin@tecnitrack.com', rol: 'admin', activo: true },
  { id: 2, nombre: 'Luis Fernández', correo: 'luis.fernandez@tecnitrack.com', rol: 'tecnico', activo: true },
  { id: 3, nombre: 'Jorge Pineda', correo: 'jorge.pineda@tecnitrack.com', rol: 'tecnico', activo: true },
  { id: 4, nombre: 'Óscar Meléndez', correo: 'oscar.melendez@tecnitrack.com', rol: 'tecnico', activo: false },
];

module.exports = {
  async up(queryInterface) {
    const ahora = new Date('2026-08-25T08:00:00-06:00');
    const filas = [];
    for (const usuario of USUARIOS) {
      filas.push({
        ...usuario,
        password_hash: await bcrypt.hash(PASSWORD_PRUEBA, COSTO_BCRYPT),
        created_at: ahora,
        updated_at: ahora,
      });
    }
    await queryInterface.bulkInsert('usuarios', filas);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('usuarios', { id: USUARIOS.map((u) => u.id) });
  },
};
