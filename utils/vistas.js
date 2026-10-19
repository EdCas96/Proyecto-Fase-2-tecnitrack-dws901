/**
 * Funciones auxiliares disponibles en todas las vistas EJS (app.locals).
 */
const { COLOR_ESTADO, ETIQUETA_ESTADO } = require('./constantes');
const { estaVencida, diasTranscurridos } = require('./cotizaciones');
const { diasLimiteCotizacion } = require('../config/env');

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

/** Solo el admin ve los botones de crear, editar y eliminar (el técnico consulta). */
const esAdmin = (usuario) => Boolean(usuario && usuario.rol === 'admin');

/**
 * Migas de pan que empiezan en el panel del rol:
 * migasDe(usuario, { texto: 'Clientes', url: '/clientes' }, { texto: 'Nuevo cliente' }).
 */
const migasDe = (usuario, ...migas) => [
  esAdmin(usuario) ? { texto: 'Administrador', url: '/admin' } : { texto: 'Técnico', url: '/tecnico' },
  ...migas,
];

/** URL de otra página del listado conservando los filtros (?q=...&tipo=...). */
function urlPagina(rutaBase, filtros = {}, pagina = 1) {
  const parametros = new URLSearchParams();
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') parametros.set(clave, valor);
  });
  if (pagina > 1) parametros.set('pagina', pagina);
  const query = parametros.toString();
  return query ? `${rutaBase}?${query}` : rutaBase;
}

/**
 * Valor de un campo del formulario: primero lo que el usuario escribió (si la
 * validación falló y se regresó al formulario), si no, el del registro.
 */
function valorCampo(datos, registro, campo) {
  if (datos && datos[campo] !== undefined) return datos[campo];
  if (registro && registro[campo] !== undefined && registro[campo] !== null) return registro[campo];
  return '';
}

/** Precio en dólares: 25 -> "$25.00". */
const formatoPrecio = (valor) => `$${Number(valor || 0).toFixed(2)}`;

const ZONA_HORARIA = 'America/El_Salvador';
const FORMATO_FECHA = new Intl.DateTimeFormat('es-SV', {
  timeZone: ZONA_HORARIA, day: '2-digit', month: '2-digit', year: 'numeric',
});
const FORMATO_FECHA_HORA = new Intl.DateTimeFormat('es-SV', {
  timeZone: ZONA_HORARIA, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});

/**
 * Fecha dd/mm/aaaa en hora de El Salvador. Acepta Date o "AAAA-MM-DD"
 * (columnas DATE, como fecha_estimada, que no tienen hora ni zona).
 */
function formatoFecha(valor) {
  if (!valor) return '—';
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [anio, mes, dia] = valor.split('-');
    return `${dia}/${mes}/${anio}`;
  }
  return FORMATO_FECHA.format(new Date(valor));
}

/** Fecha y hora dd/mm/aaaa hh:mm en hora de El Salvador. */
const formatoFechaHora = (valor) => (valor ? FORMATO_FECHA_HORA.format(new Date(valor)) : '—');

/** Descripción corta de un equipo: "Laptop Dell Inspiron 15". */
const descripcionEquipo = (equipo) => (equipo ? `${equipo.tipo} ${equipo.marca} ${equipo.modelo}` : '—');

/**
 * RN-05: la cotización Pendiente enviada en esa fecha ya superó DIAS_LIMITE_COTIZACION
 * (se muestra "Pendiente de respuesta"; nunca se cancela sola).
 */
const pendienteDeRespuesta = (fecha) => Boolean(fecha) && estaVencida(fecha, diasLimiteCotizacion);

/** Días completos transcurridos desde una fecha. */
const diasDesde = (fecha) => diasTranscurridos(fecha);

/** Color del badge del tipo de ítem del catálogo (como en el prototipo). */
const colorTipoCatalogo = (tipo) => (tipo === 'Servicio' ? 'azul' : 'gris');

module.exports = {
  colorEstado,
  etiquetaEstado,
  esRutaActiva,
  menuPorRol,
  etiquetaRol,
  esAdmin,
  migasDe,
  urlPagina,
  valorCampo,
  formatoPrecio,
  formatoFecha,
  formatoFechaHora,
  descripcionEquipo,
  pendienteDeRespuesta,
  diasDesde,
  colorTipoCatalogo,
  MENUS,
};
