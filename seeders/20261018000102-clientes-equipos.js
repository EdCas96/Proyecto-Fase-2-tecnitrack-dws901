'use strict';

/**
 * Clientes del prototipo y sus equipos.
 */
const CLIENTES = [
  { id: 1, nombre: 'María Elena Hernández', telefono: '7123-4567', correo: 'maria.hernandez@example.com' },
  { id: 2, nombre: 'Carlos Alberto Ramírez', telefono: '7234-8912', correo: 'carlos.ramirez@example.com' },
  { id: 3, nombre: 'Ana Lucía Martínez', telefono: '7345-6720', correo: 'ana.martinez@example.com' },
];

const EQUIPOS = [
  { id: 1, cliente_id: 1, tipo: 'Laptop', marca: 'Dell', modelo: 'Inspiron 15', numero_serie: 'DL-88291' },
  { id: 2, cliente_id: 2, tipo: 'Computadora de escritorio', marca: 'HP', modelo: 'Pavilion TP01', numero_serie: 'HP-55210' },
  { id: 3, cliente_id: 3, tipo: 'Laptop', marca: 'Lenovo', modelo: 'ThinkPad E14', numero_serie: 'LN-73104' },
  { id: 4, cliente_id: 3, tipo: 'Impresora', marca: 'Epson', modelo: 'L3250', numero_serie: 'EP-40218' },
];

module.exports = {
  async up(queryInterface) {
    const fecha = new Date('2026-08-28T09:00:00-06:00');
    const conFechas = (fila) => ({ ...fila, created_at: fecha, updated_at: fecha });

    await queryInterface.bulkInsert('clientes', CLIENTES.map(conFechas));
    await queryInterface.bulkInsert('equipos', EQUIPOS.map(conFechas));
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('equipos', { id: EQUIPOS.map((e) => e.id) });
    await queryInterface.bulkDelete('clientes', { id: CLIENTES.map((c) => c.id) });
  },
};
