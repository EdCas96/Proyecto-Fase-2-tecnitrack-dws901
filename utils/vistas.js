/**
 * Funciones auxiliares disponibles en todas las vistas EJS (app.locals).
 */
const { COLOR_ESTADO, ETIQUETA_ESTADO } = require('./constantes');

/** Clase de color del badge de un estado de ticket o cotización. */
const colorEstado = (estado) => COLOR_ESTADO[estado] || 'gris';

/** Texto legible de un estado (Esperando_aprobacion -> Esperando aprobación). */
const etiquetaEstado = (estado) => ETIQUETA_ESTADO[estado] || estado;

/** Opciones del submenú por rol, en el mismo orden que el prototipo de la Fase 1. */
const MENUS = Object.freeze({
  admin: [
    { texto: 'Dashboard', url: '/admin' },
    { texto: 'Clientes', url: '/clientes' },
    { texto: 'Tickets', url: '/tickets' },
    { texto: 'Catálogo', url: '/catalogo' },
    { texto: 'Usuarios', url: '/usuarios' },
    { texto: 'Reportes', url: '/reportes' },
  ],
  tecnico: [
    { texto: 'Mis tickets', url: '/tecnico' },
    { texto: 'Notificaciones', url: '/notificaciones' },
  ],
});

/** Submenú del rol del usuario (vacío si no hay sesión). */
const menuPorRol = (usuario) => (usuario && MENUS[usuario.rol]) || [];

/** Nombre del rol tal como lo muestra la barra superior. */
const etiquetaRol = (usuario) => (usuario.rol === 'admin' ? 'Administrador' : `Técnico · ${usuario.nombre}`);

/** Indica si la ruta actual pertenece a una sección del menú (para marcarla como activa). */
const esRutaActiva = (rutaActual, prefijo) => rutaActual === prefijo
  || (prefijo !== '/' && rutaActual.startsWith(`${prefijo}/`));

module.exports = {
  colorEstado, etiquetaEstado, esRutaActiva, menuPorRol, etiquetaRol, MENUS,
};
