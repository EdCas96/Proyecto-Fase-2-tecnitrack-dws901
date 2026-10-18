'use strict';

/**
 * Los 6 ítems del catálogo del prototipo.
 */
const ITEMS = [
  { id: 1, nombre: 'Diagnóstico general', tipo: 'Servicio', precio_referencia: 10.0 },
  { id: 2, nombre: 'Limpieza interna y cambio de pasta térmica', tipo: 'Servicio', precio_referencia: 15.0 },
  { id: 3, nombre: 'Instalación de sistema operativo', tipo: 'Servicio', precio_referencia: 20.0 },
  { id: 4, nombre: 'Memoria RAM 8GB DDR4', tipo: 'Repuesto', precio_referencia: 35.0 },
  { id: 5, nombre: 'Disco SSD 480GB', tipo: 'Repuesto', precio_referencia: 55.0 },
  { id: 6, nombre: 'Cartucho de tinta genérico', tipo: 'Repuesto', precio_referencia: 12.0 },
];

module.exports = {
  async up(queryInterface) {
    const fecha = new Date('2026-08-25T08:00:00-06:00');
    await queryInterface.bulkInsert(
      'catalogo_items',
      ITEMS.map((item) => ({ ...item, activo: true, created_at: fecha, updated_at: fecha })),
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('catalogo_items', { id: ITEMS.map((i) => i.id) });
  },
};
