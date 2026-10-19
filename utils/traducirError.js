/**
 * Convierte errores de librerías (Sequelize, csrf-csrf, body-parser) en errores
 * propios de utils/errors con mensajes claros en español. Lo usa el manejador
 * central (middlewares/errorHandler.js); los errores que no reconoce los deja
 * pasar para que se respondan como 500 genérico.
 */
const {
  ValidationError: SequelizeValidationError,
  UniqueConstraintError,
  ForeignKeyConstraintError,
  DatabaseError,
} = require('sequelize');
const {
  AppError, ValidationError, ForbiddenError, BusinessRuleError,
} = require('./errors');

/** Nombres legibles de las columnas que pueden aparecer en un error de base de datos. */
const CAMPOS = {
  correo: 'correo',
  folio: 'folio',
  numero_serie: 'número de serie',
  nombre: 'nombre',
  telefono: 'teléfono',
  cliente_id: 'cliente',
  equipo_id: 'equipo',
  tecnico_id: 'técnico',
  ticket_id: 'ticket',
  cotizacion_id: 'cotización',
  catalogo_id: 'ítem del catálogo',
  usuario_id: 'usuario',
};

/** Tablas en singular, para los mensajes de llaves foráneas. */
const TABLAS = {
  usuarios: 'el usuario',
  clientes: 'el cliente',
  equipos: 'el equipo',
  catalogo_items: 'el ítem del catálogo',
  tickets: 'el ticket',
  cotizaciones: 'la cotización',
};

/** Índices únicos que solo existen en la base (no están declarados en un modelo). */
const INDICES_UNICOS = {
  uq_cotizaciones_una_pendiente: () => new BusinessRuleError(
    'El ticket ya tiene una cotización pendiente. Solo puede haber una a la vez (RN-09).',
  ),
};

/** Restricciones CHECK de las migraciones. */
const RESTRICCIONES_CHECK = {
  chk_catalogo_items_precio: 'El precio de referencia no puede ser negativo.',
  chk_tickets_folio: 'El folio debe tener el formato TT-AAAA-NNNN (ej. TT-2026-0042).',
  chk_tickets_fechas: 'La fecha de entrega no puede ser anterior a la fecha de ingreso.',
  chk_cotizaciones_total: 'El total de la cotización no puede ser negativo.',
  chk_cotizacion_items_cantidad: 'La cantidad debe ser al menos 1.',
  chk_cotizacion_items_precio: 'El precio unitario no puede ser negativo.',
};

// Códigos de error de MySQL/MariaDB (err.parent.errno)
const ER_ROW_IS_REFERENCED = 1451; // borrar un padre que tiene hijos
const ER_NO_REFERENCED_ROW = 1452; // insertar un hijo cuyo padre no existe
const ER_BAD_NULL = 1048;
const ER_DATA_TRUNCATED = 1265; // ej. valor fuera de un ENUM en modo estricto
const ER_DATA_TOO_LONG = 1406;
const ER_CHECK_MARIADB = 4025;
const ER_CHECK_MYSQL = 3819;

const nombreCampo = (columna) => CAMPOS[columna] || columna;

/** Toma los errores por campo de un error de Sequelize: { campo: mensaje }. */
function erroresPorCampo(lista = []) {
  return lista.reduce((acumulado, { path, message }) => {
    if (path && !acumulado[path]) acumulado[path] = message;
    return acumulado;
  }, {});
}

function traducirUnico(err) {
  const [primero] = err.errors || [];
  const indice = primero && primero.path;
  if (INDICES_UNICOS[indice]) return INDICES_UNICOS[indice]();

  // Los únicos de los modelos traen su propio mensaje en español (unique.msg);
  // los demás traen el genérico "<campo> must be unique" de Sequelize.
  const mensajePropio = primero && !/must be unique$/.test(primero.message) ? primero.message : null;
  const mensaje = mensajePropio || `Ya existe un registro con ese ${nombreCampo(indice)}.`;
  return new ValidationError(mensaje, { errores: indice ? { [indice]: mensaje } : {} });
}

function traducirLlaveForanea(err) {
  const errno = err.parent && err.parent.errno;
  if (errno === ER_ROW_IS_REFERENCED) {
    return new BusinessRuleError('No se puede eliminar el registro porque tiene otros registros asociados.');
  }
  const [campo] = Array.isArray(err.fields) ? err.fields : Object.keys(err.fields || {});
  const referido = TABLAS[err.table] || `el ${nombreCampo(campo)}`;
  const mensaje = `${referido.charAt(0).toUpperCase()}${referido.slice(1)} indicado no existe.`;
  if (errno === ER_NO_REFERENCED_ROW) {
    return new ValidationError(mensaje, { errores: campo ? { [campo]: mensaje } : {} });
  }
  return new BusinessRuleError('La operación no respeta las relaciones entre los registros.');
}

function traducirBaseDatos(err) {
  const { errno, sqlMessage = '' } = err.parent || {};
  if (errno === ER_CHECK_MARIADB || errno === ER_CHECK_MYSQL) {
    const [, restriccion] = sqlMessage.match(/constraint [`'"]?(\w+)/i) || [];
    return new ValidationError(RESTRICCIONES_CHECK[restriccion] || 'Algún valor no cumple las reglas de los datos.');
  }
  if ([ER_BAD_NULL, ER_DATA_TRUNCATED, ER_DATA_TOO_LONG].includes(errno)) {
    const [, columna] = sqlMessage.match(/column [`'"]?(\w+)/i) || [];
    const campo = columna ? ` en el campo ${nombreCampo(columna)}` : '';
    return new ValidationError(`Hay un valor faltante, inválido o demasiado largo${campo}.`);
  }
  return null;
}

/**
 * @param {Error} err Error original.
 * @returns {AppError|null} Error propio equivalente, o null si no se reconoce.
 */
function traducirError(err) {
  if (err instanceof AppError) return err;

  // UniqueConstraintError hereda de ValidationError de Sequelize: va primero
  if (err instanceof UniqueConstraintError) return traducirUnico(err);
  if (err instanceof SequelizeValidationError) {
    const errores = erroresPorCampo(err.errors);
    const [primero] = Object.values(errores);
    return new ValidationError(primero || 'Los datos enviados no son válidos.', { errores });
  }
  if (err instanceof ForeignKeyConstraintError) return traducirLlaveForanea(err);
  if (err instanceof DatabaseError) return traducirBaseDatos(err);

  // csrf-csrf
  if (err && err.code === 'EBADCSRFTOKEN') {
    return new ForbiddenError(
      'El formulario expiró o no es válido. Recarga la página e inténtalo de nuevo.',
    );
  }

  // body-parser (express.json / express.urlencoded)
  if (err && err.type === 'entity.too.large') {
    return new AppError('El contenido enviado supera el tamaño permitido.', 413);
  }
  if (err && err.type === 'entity.parse.failed') {
    return new ValidationError('El contenido enviado no tiene un formato válido.');
  }

  return null;
}

module.exports = traducirError;
