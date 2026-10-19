const { Op } = require('sequelize');
const {
  sequelize, Cotizacion, CotizacionItem, CatalogoItem, Ticket, TicketHistorial, Equipo, Cliente,
} = require('../models');
const {
  ValidationError, ForbiddenError, NotFoundError, BusinessRuleError,
} = require('../utils/errors');
const { diasLimiteCotizacion } = require('../config/env');
const {
  aCentavos, calcularTotalCentavos, centavosATexto, diasTranscurridos, estaVencida,
} = require('../utils/cotizaciones');
const { textoOpcional } = require('../utils/texto');
const { opcionesPaginacion, resultadoPaginado } = require('../utils/paginacion');
const MaquinaEstadosTicket = require('./MaquinaEstadosTicket');
const TicketService = require('./TicketService');
const { bus, EVENTOS } = require('./eventos/busEventos');

const { ORIGENES } = MaquinaEstadosTicket;
/** Estados del ticket desde los que se puede cotizar (la primera o una adicional). */
const ESTADOS_COTIZABLES = Object.freeze(['Diagnosticado', 'En_reparacion', 'Esperando_repuesto']);
const MAX_LINEAS = 30;
const MAX_CANTIDAD = 999;

const idValido = (id) => (/^\d+$/.test(String(id)) ? Number(id) : null);
const errorItems = (mensaje) => new ValidationError(mensaje, { errores: { items: mensaje } });

/** Ítems de la cotización con el nombre y tipo del catálogo. */
const INCLUIR_ITEMS = {
  model: CotizacionItem,
  as: 'items',
  include: { model: CatalogoItem, as: 'catalogoItem', attributes: ['id', 'nombre', 'tipo'] },
};

/** Convierte un campo del formulario (texto o lista) en lista. */
const comoLista = (valor) => {
  if (valor === undefined || valor === null || valor === '') return [];
  return Array.isArray(valor) ? valor : [valor];
};

/**
 * Cotizaciones de los tickets: el técnico las arma con ítems del catálogo y
 * el cliente las aprueba o rechaza en el portal (RN-06).
 */
class CotizacionService {
  /**
   * Líneas pedidas en el formulario: catalogo_id[] y cantidad[] en el mismo
   * orden. Un mismo ítem repetido se suma en una sola línea. El precio NUNCA se
   * toma del formulario.
   *
   * @param {{catalogo_id?: string|string[], cantidad?: string|string[]}} datos
   * @returns {Array<{catalogoId: number, cantidad: number}>}
   * @throws {ValidationError}
   */
  static leerLineas(datos = {}) {
    const ids = comoLista(datos.catalogo_id);
    const cantidades = comoLista(datos.cantidad);
    const porItem = new Map();
    ids.forEach((valor, i) => {
      if (!textoOpcional(valor)) return; // fila vacía del formulario
      const catalogoId = idValido(valor);
      const cantidad = Number(cantidades[i]);
      if (!catalogoId) throw errorItems('Uno de los ítems elegidos no es válido.');
      if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_CANTIDAD) {
        throw errorItems(`Cada cantidad debe ser un número entero entre 1 y ${MAX_CANTIDAD}.`);
      }
      porItem.set(catalogoId, (porItem.get(catalogoId) || 0) + cantidad);
    });
    if (!porItem.size) throw errorItems('Agrega al menos un ítem del catálogo.');
    if (porItem.size > MAX_LINEAS) throw errorItems(`Una cotización puede tener como máximo ${MAX_LINEAS} ítems.`);
    return [...porItem].map(([catalogoId, cantidad]) => ({ catalogoId, cantidad }));
  }

  /**
   * Líneas con el precio de referencia ACTUAL del catálogo (solo ítems activos)
   * y el total calculado en el servidor, en centavos.
   *
   * @implements RF-06
   * @returns {Promise<{lineas: Array<{catalogo_id: number, cantidad: number, precio_unitario: string}>, total: string}>}
   * @throws {ValidationError} Si algún ítem no existe o está desactivado.
   */
  static async prepararLineas(datos, transaction) {
    const pedidas = CotizacionService.leerLineas(datos);
    const items = await CatalogoItem.findAll({
      where: { id: pedidas.map((l) => l.catalogoId) },
      attributes: ['id', 'nombre', 'precio_referencia', 'activo'],
      transaction,
    });
    const porId = new Map(items.map((item) => [item.id, item]));
    const lineas = pedidas.map(({ catalogoId, cantidad }) => {
      const item = porId.get(catalogoId);
      if (!item) throw errorItems('Uno de los ítems elegidos ya no existe en el catálogo.');
      if (!item.activo) throw errorItems(`"${item.nombre}" está desactivado en el catálogo y no se puede cotizar.`);
      // Se copia el precio de hoy: si el catálogo cambia después, esta cotización no cambia
      return { catalogo_id: item.id, cantidad, precio_unitario: centavosATexto(aCentavos(item.precio_referencia)) };
    });
    return { lineas, total: centavosATexto(calcularTotalCentavos(lineas)) };
  }

  /**
   * Crea una cotización y pasa el ticket a Esperando_aprobacion, en una
   * transacción. Desde Diagnosticado es la primera cotización; desde
   * En_reparacion o Esperando_repuesto es una cotización adicional.
   * El total que mande el formulario se ignora: se calcula aquí.
   *
   * @implements HU-03, RF-06, RN-02, RN-06, RN-09
   * @param {number|string} ticketId
   * @param {object} datos catalogo_id[], cantidad[]
   * @param {{id: number, rol: string}} usuario Técnico asignado o admin.
   * @returns {Promise<Cotizacion>}
   */
  static async crear(ticketId, datos, usuario) {
    return sequelize.transaction(async (transaction) => {
      const ticket = idValido(ticketId) && await Ticket.findByPk(idValido(ticketId), {
        transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!ticket) throw new NotFoundError('El ticket no existe.');
      TicketService.verificarAcceso(ticket, usuario);
      if (!ESTADOS_COTIZABLES.includes(ticket.estado)) {
        throw new BusinessRuleError(
          'Solo se puede cotizar un ticket Diagnosticado, o en reparación / esperando repuesto si es una cotización adicional.',
        );
      }
      // RN-09: además lo garantiza el índice único uq_cotizaciones_una_pendiente
      const pendientes = await Cotizacion.count({ where: { ticket_id: ticket.id, estado: 'Pendiente' }, transaction });
      if (pendientes) throw new BusinessRuleError('El ticket ya tiene una cotización pendiente. Solo puede haber una a la vez (RN-09).');

      const { lineas, total } = await CotizacionService.prepararLineas(datos, transaction);
      const adicional = ticket.estado !== 'Diagnosticado';
      MaquinaEstadosTicket.validarTransicion(ticket.estado, 'Esperando_aprobacion', { origen: ORIGENES.COTIZACION });

      const ahora = new Date();
      const cotizacion = await Cotizacion.create({
        ticket_id: ticket.id, estado: 'Pendiente', total, fecha: ahora,
      }, { transaction });
      await CotizacionItem.bulkCreate(
        lineas.map((linea) => ({ ...linea, cotizacion_id: cotizacion.id })),
        { transaction, validate: true },
      );

      const anterior = ticket.estado;
      await ticket.update({ estado: 'Esperando_aprobacion' }, { transaction });
      await TicketHistorial.create({
        ticket_id: ticket.id,
        estado_anterior: anterior,
        estado_nuevo: 'Esperando_aprobacion',
        usuario_id: usuario.id,
        comentario: `${adicional ? 'Cotización adicional' : 'Cotización'} enviada al cliente por $${total}.`,
        fecha: ahora,
      }, { transaction });

      bus.emitirAlConfirmar(transaction, EVENTOS.COTIZACION_CREADA, {
        cotizacionId: cotizacion.id, ticketId: ticket.id, folio: ticket.folio, tecnicoId: ticket.tecnico_id, actorId: usuario.id, adicional,
      });
      return cotizacion;
    });
  }

  /**
   * Cambia los ítems de una cotización Pendiente y recalcula el total (con los
   * precios del catálogo al momento de editar).
   *
   * @implements HU-03, RF-06, RN-02
   * @param {number|string} id
   * @param {object} datos catalogo_id[], cantidad[]
   * @param {{id: number, rol: string}} usuario
   * @returns {Promise<Cotizacion>}
   */
  static async editar(id, datos, usuario) {
    return sequelize.transaction(async (transaction) => {
      const cotizacion = idValido(id) && await Cotizacion.findByPk(idValido(id), {
        transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!cotizacion) throw new NotFoundError('La cotización no existe.');
      const ticket = await Ticket.findByPk(cotizacion.ticket_id, { attributes: ['id', 'tecnico_id'], transaction });
      TicketService.verificarAcceso(ticket, usuario);
      if (cotizacion.estado !== 'Pendiente') {
        throw new BusinessRuleError(`La cotización ya fue ${cotizacion.estado.toLowerCase()} por el cliente y no se puede editar.`);
      }

      const { lineas, total } = await CotizacionService.prepararLineas(datos, transaction);
      await CotizacionItem.destroy({ where: { cotizacion_id: cotizacion.id }, transaction });
      await CotizacionItem.bulkCreate(
        lineas.map((linea) => ({ ...linea, cotizacion_id: cotizacion.id })),
        { transaction, validate: true },
      );
      await cotizacion.update({ total }, { transaction, fields: ['total'] });
      return cotizacion;
    });
  }

  /**
   * Respuesta del cliente desde el portal. La fila de la cotización se bloquea:
   * si llegan dos respuestas a la vez (doble clic, dos pestañas), la segunda
   * espera y luego encuentra la cotización ya respondida.
   * - Aprobar: cotización Aprobada y ticket En_reparacion (cumple RN-01).
   * - Rechazar: cotización Rechazada y ticket Cancelado, con motivo opcional.
   * El historial se registra con usuario_id NULL (lo hizo el cliente).
   *
   * @implements HU-05, RF-07, RN-01, RN-06
   * @param {number|string} id
   * @param {'aprobar'|'rechazar'} decision
   * @param {{clienteTicketId: number, motivo?: string}} cliente Sesión del portal.
   * @returns {Promise<{cotizacion: Cotizacion, ticket: Ticket}>}
   */
  static async responder(id, decision, { clienteTicketId, motivo } = {}) {
    if (!['aprobar', 'rechazar'].includes(decision)) throw new ValidationError('Respuesta no válida.');
    return sequelize.transaction(async (transaction) => {
      const cotizacion = idValido(id) && await Cotizacion.findByPk(idValido(id), {
        transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!cotizacion || !clienteTicketId || cotizacion.ticket_id !== clienteTicketId) {
        throw new ForbiddenError('Esta cotización no pertenece a tu ticket.');
      }
      if (cotizacion.estado !== 'Pendiente') {
        throw new BusinessRuleError(`Esta cotización ya fue ${cotizacion.estado.toLowerCase()}. No se puede responder dos veces.`);
      }

      const ticket = await Ticket.findByPk(cotizacion.ticket_id, { transaction, lock: transaction.LOCK.UPDATE });
      const aprobada = decision === 'aprobar';
      const destino = aprobada ? 'En_reparacion' : 'Cancelado';
      MaquinaEstadosTicket.validarTransicion(ticket.estado, destino, { origen: ORIGENES.CLIENTE });

      const motivoLimpio = aprobada ? null : textoOpcional(motivo);
      const ahora = new Date();
      await cotizacion.update({ estado: aprobada ? 'Aprobada' : 'Rechazada' }, { transaction, fields: ['estado'] });
      const anterior = ticket.estado;
      await ticket.update({ estado: destino }, { transaction });
      await TicketHistorial.create({
        ticket_id: ticket.id,
        estado_anterior: anterior,
        estado_nuevo: destino,
        usuario_id: null,
        comentario: (aprobada
          ? 'El cliente aprobó la cotización.'
          : `El cliente rechazó la cotización.${motivoLimpio ? ` Motivo: ${motivoLimpio}` : ''}`).slice(0, 255),
        fecha: ahora,
      }, { transaction });

      bus.emitirAlConfirmar(transaction, EVENTOS.COTIZACION_RESPONDIDA, {
        cotizacionId: cotizacion.id,
        ticketId: ticket.id,
        folio: ticket.folio,
        tecnicoId: ticket.tecnico_id,
        aprobada,
        motivo: motivoLimpio,
        actorId: null,
      });
      return { cotizacion, ticket };
    });
  }

  /**
   * RN-05: true si la cotización sigue Pendiente después de
   * DIAS_LIMITE_COTIZACION días. Solo es un indicador: nunca cancela nada.
   *
   * @implements RN-05
   * @param {{estado: string, fecha: Date}} cotizacion
   * @param {Date} [ahora]
   * @param {number} [dias]
   */
  static estaPendienteDeRespuesta(cotizacion, ahora = new Date(), dias = diasLimiteCotizacion) {
    return Boolean(cotizacion) && cotizacion.estado === 'Pendiente' && estaVencida(cotizacion.fecha, dias, ahora);
  }

  /** Días desde que se envió la cotización (para la alerta RN-05). */
  static diasDesdeEnvio(cotizacion, ahora = new Date()) {
    return diasTranscurridos(cotizacion.fecha, ahora);
  }

  /**
   * Cuántas cotizaciones están "Pendiente de respuesta" (KPI del dashboard admin).
   * @implements RN-05
   */
  static async contarPendientesDeRespuesta(ahora = new Date()) {
    const limite = new Date(ahora.getTime() - diasLimiteCotizacion * 24 * 60 * 60 * 1000);
    return Cotizacion.count({ where: { estado: 'Pendiente', fecha: { [Op.lt]: limite } } });
  }

  /**
   * Cotización con sus ítems y su ticket (para editarla). Verifica RN-02.
   * @throws {NotFoundError|ForbiddenError}
   */
  static async obtenerConItems(id, usuario) {
    const cotizacion = idValido(id) && await Cotizacion.findByPk(idValido(id), {
      include: [
        INCLUIR_ITEMS,
        {
          model: Ticket,
          as: 'ticket',
          attributes: ['id', 'folio', 'estado', 'tecnico_id'],
          include: { model: Equipo, as: 'equipo', include: { model: Cliente, as: 'cliente', attributes: ['id', 'nombre'] } },
        },
      ],
      order: [[{ model: CotizacionItem, as: 'items' }, 'id', 'ASC']],
    });
    if (!cotizacion) throw new NotFoundError('La cotización no existe.');
    if (usuario) TicketService.verificarAcceso(cotizacion.ticket, usuario);
    return cotizacion;
  }

  /**
   * La cotización más reciente del ticket con sus ítems (portal del cliente).
   * @implements HU-05
   * @returns {Promise<Cotizacion|null>}
   */
  static async vigenteDelTicket(ticketId) {
    return Cotizacion.findOne({
      where: { ticket_id: ticketId },
      include: INCLUIR_ITEMS,
      order: [['fecha', 'DESC'], ['id', 'DESC'], [{ model: CotizacionItem, as: 'items' }, 'id', 'ASC']],
    });
  }

  /**
   * Listado paginado de cotizaciones (admin: todas; técnico: las de sus tickets).
   * @param {{estado?: string, vencidas?: boolean, pagina?: number}} filtros
   * @param {{id: number, rol: string}} usuario
   */
  static async listar({ estado = '', vencidas = false, pagina = 1 } = {}, usuario) {
    const where = {};
    if (['Pendiente', 'Aprobada', 'Rechazada'].includes(estado)) where.estado = estado;
    if (vencidas) {
      where.estado = 'Pendiente';
      where.fecha = { [Op.lt]: new Date(Date.now() - diasLimiteCotizacion * 24 * 60 * 60 * 1000) };
    }
    const whereTicket = usuario.rol === 'admin' ? {} : { tecnico_id: usuario.id };
    const resultado = await Cotizacion.findAndCountAll({
      where,
      attributes: ['id', 'estado', 'total', 'fecha', 'ticket_id'],
      include: {
        model: Ticket,
        as: 'ticket',
        where: whereTicket,
        required: true,
        attributes: ['id', 'folio', 'estado', 'tecnico_id'],
        include: { model: Equipo, as: 'equipo', attributes: ['id'], include: { model: Cliente, as: 'cliente', attributes: ['nombre'] } },
      },
      order: [['fecha', 'DESC'], ['id', 'DESC']],
      distinct: true,
      ...opcionesPaginacion(pagina),
    });
    return resultadoPaginado(resultado, pagina);
  }

  /** ¿Puede este usuario generar una cotización para el ticket ahora? (botón del detalle) */
  static puedeCotizar(ticket, usuario) {
    const suyo = usuario.rol === 'admin' || ticket.tecnico_id === usuario.id;
    const pendiente = (ticket.cotizaciones || []).some((c) => c.estado === 'Pendiente');
    return suyo && !pendiente && ESTADOS_COTIZABLES.includes(ticket.estado);
  }
}

CotizacionService.ESTADOS_COTIZABLES = ESTADOS_COTIZABLES;

module.exports = CotizacionService;
