const {
  Op, fn, col, literal, where: condicion,
} = require('sequelize');
const {
  sequelize, Ticket, Equipo, Cliente, Usuario, TicketFoto, TicketHistorial, Cotizacion, CotizacionItem, CatalogoItem,
} = require('../models');
const {
  ValidationError, ForbiddenError, NotFoundError, BusinessRuleError,
} = require('../utils/errors');
const { ESTADOS_TICKET, ETIQUETA_ESTADO } = require('../utils/constantes');
const { escaparLike, textoOpcional } = require('../utils/texto');
const { opcionesPaginacion, resultadoPaginado } = require('../utils/paginacion');
const { borrarArchivos, MAX_FOTOS } = require('../middlewares/upload');
const traducirError = require('../utils/traducirError');
const MaquinaEstadosTicket = require('./MaquinaEstadosTicket');
const FolioService = require('./FolioService');
const ClienteService = require('./ClienteService');
const EquipoService = require('./EquipoService');
const { bus, EVENTOS } = require('./eventos/busEventos');

const { ORIGENES } = MaquinaEstadosTicket;
const ESTADOS_ABIERTOS = ESTADOS_TICKET.filter((estado) => !MaquinaEstadosTicket.esFinal(estado));
const LARGO_MINIMO_MOTIVO = 5;

const idValido = (id) => (/^\d+$/.test(String(id)) ? Number(id) : null);
const etiqueta = (estado) => ETIQUETA_ESTADO[estado] || estado;

/** Error de validación con el mensaje junto a un campo del formulario. */
const errorCampo = (campo, mensaje) => new ValidationError(mensaje, { errores: { [campo]: mensaje } });

/** Equipo y cliente que se incluyen en listados y detalle. */
const INCLUIR_EQUIPO = {
  model: Equipo,
  as: 'equipo',
  attributes: ['id', 'tipo', 'marca', 'modelo', 'numero_serie', 'cliente_id'],
  include: { model: Cliente, as: 'cliente', attributes: ['id', 'nombre', 'telefono', 'correo'] },
};
const INCLUIR_TECNICO = { model: Usuario, as: 'tecnico', attributes: ['id', 'nombre'] };

/** Fecha de la cotización Pendiente del ticket, si hay (indicador "Pendiente de respuesta", RN-05). */
const PENDIENTE_DESDE = [
  literal("(SELECT MIN(c.fecha) FROM cotizaciones AS c WHERE c.ticket_id = `Ticket`.`id` AND c.estado = 'Pendiente')"),
  'pendienteDesde',
];

/** "AAAA-MM-DD" de hoy en El Salvador, para comparar con fecha_estimada (DATE). */
function hoyEnElSalvador() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' }).format(new Date());
}

/**
 * Tickets: creación, consulta según el rol, flujo de estados y asignación.
 * El técnico solo ve y modifica sus tickets asignados (RN-02); el filtro se
 * aplica aquí, en las consultas, no en las vistas.
 */
class TicketService {
  /**
   * El técnico solo puede trabajar con los tickets asignados a él.
   * @implements RN-02
   * @throws {ForbiddenError}
   */
  static verificarAcceso(ticket, usuario) {
    if (usuario.rol === 'admin') return;
    if (ticket.tecnico_id !== usuario.id) {
      throw new ForbiddenError('Este ticket no está asignado a ti.');
    }
  }

  /**
   * Técnico al que se asigna un ticket nuevo: el técnico que lo crea se lo
   * queda; el admin elige uno activo o lo deja sin asignar.
   */
  static async resolverTecnico(tecnicoId, usuario, transaction) {
    if (usuario.rol !== 'admin') return usuario.id;
    if (!textoOpcional(tecnicoId)) return null;
    const tecnico = idValido(tecnicoId) && await Usuario.findOne({
      where: { id: idValido(tecnicoId), rol: 'tecnico', activo: true }, attributes: ['id'], transaction,
    });
    if (!tecnico) throw errorCampo('tecnico_id', 'Elige un técnico activo o deja el ticket sin asignar.');
    return tecnico.id;
  }

  /** Cliente existente (cliente_id) o nuevo (cliente_nombre, cliente_telefono, cliente_correo). */
  static async resolverCliente(datos, transaction) {
    if (datos.modo_cliente === 'nuevo') {
      try {
        const limpio = ClienteService.limpiarDatos({
          nombre: datos.cliente_nombre, telefono: datos.cliente_telefono, correo: datos.cliente_correo,
        });
        return await Cliente.create(limpio, { transaction });
      } catch (error) {
        throw TicketService.conPrefijo(error, 'cliente_');
      }
    }
    const cliente = idValido(datos.cliente_id)
      && await Cliente.findByPk(idValido(datos.cliente_id), { attributes: ['id'], transaction });
    if (!cliente) throw errorCampo('cliente_id', 'Selecciona un cliente de la lista o registra uno nuevo.');
    return cliente;
  }

  /** Equipo existente del cliente (equipo_id) o nuevo (equipo_tipo, equipo_marca...). */
  static async resolverEquipo(datos, cliente, transaction) {
    if (datos.modo_equipo === 'nuevo' || datos.modo_cliente === 'nuevo') {
      try {
        return await EquipoService.crear(cliente.id, {
          tipo: datos.equipo_tipo,
          marca: datos.equipo_marca,
          modelo: datos.equipo_modelo,
          numero_serie: datos.equipo_numero_serie,
        }, { transaction });
      } catch (error) {
        throw TicketService.conPrefijo(error, 'equipo_');
      }
    }
    const equipo = idValido(datos.equipo_id)
      && await Equipo.findByPk(idValido(datos.equipo_id), { attributes: ['id', 'cliente_id'], transaction });
    if (!equipo || equipo.cliente_id !== cliente.id) {
      throw errorCampo('equipo_id', 'Selecciona un equipo del cliente elegido o registra uno nuevo.');
    }
    return equipo;
  }

  /** Los errores de cliente o equipo nuevos se muestran junto a sus campos (cliente_*, equipo_*). */
  static conPrefijo(error, prefijo) {
    const traducido = traducirError(error) || error;
    if (!(traducido instanceof ValidationError)) return traducido;
    const errores = (traducido.detalles && traducido.detalles.errores) || {};
    return new ValidationError(traducido.message, {
      errores: Object.fromEntries(Object.entries(errores).map(([campo, msg]) => [`${prefijo}${campo}`, msg])),
    });
  }

  /** Fecha estimada opcional, con formato AAAA-MM-DD y no anterior a hoy. */
  static validarFechaEstimada(valor) {
    const fecha = textoOpcional(valor);
    if (!fecha) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(`${fecha}T00:00:00Z`))) {
      throw errorCampo('fecha_estimada', 'La fecha estimada no es válida.');
    }
    if (fecha < hoyEnElSalvador()) {
      throw errorCampo('fecha_estimada', 'La fecha estimada no puede ser anterior a hoy.');
    }
    return fecha;
  }

  /**
   * Crea un ticket en estado Recibido con su folio, la primera entrada del
   * historial y sus fotos, en UNA transacción. El cliente y el equipo pueden
   * ser existentes o registrarse en el mismo formulario. Si algo falla, no
   * queda nada en la base y se borran del disco las fotos subidas.
   *
   * @implements HU-02, RF-03, RN-03
   * @param {object} datos Campos del formulario (ver views/tickets/form.ejs).
   * @param {Array<{filename: string, path: string}>} archivos Fotos de Multer (1 a 5).
   * @param {{id: number, rol: string}} usuario Quien crea el ticket.
   * @returns {Promise<Ticket>}
   */
  static async crear(datos, archivos = [], usuario) {
    try {
      if (!archivos.length) throw errorCampo('fotos', 'Agrega al menos una foto del equipo.');
      if (archivos.length > MAX_FOTOS) throw errorCampo('fotos', `Puedes subir como máximo ${MAX_FOTOS} fotos.`);
      const diagnostico = textoOpcional(datos.diagnostico_inicial);
      const fechaEstimada = TicketService.validarFechaEstimada(datos.fecha_estimada);

      return await sequelize.transaction(async (transaction) => {
        const tecnicoId = await TicketService.resolverTecnico(datos.tecnico_id, usuario, transaction);
        const cliente = await TicketService.resolverCliente(datos, transaction);
        const equipo = await TicketService.resolverEquipo(datos, cliente, transaction);
        const ahora = new Date();

        // El folio se reserva al final, para mantener el bloqueo del contador el menor tiempo posible
        const folio = await FolioService.generar(transaction, ahora);
        const ticket = await Ticket.create({
          folio,
          equipo_id: equipo.id,
          tecnico_id: tecnicoId,
          estado: 'Recibido',
          diagnostico_inicial: diagnostico,
          fecha_ingreso: ahora,
          fecha_estimada: fechaEstimada,
        }, { transaction });

        await TicketHistorial.create({
          ticket_id: ticket.id, estado_anterior: null, estado_nuevo: 'Recibido', usuario_id: usuario.id, fecha: ahora,
        }, { transaction });
        await TicketFoto.bulkCreate(
          archivos.map((archivo) => ({ ticket_id: ticket.id, url_foto: archivo.filename })),
          { transaction, validate: true },
        );
        // El admin asignó el ticket a un técnico: se le avisa cuando la transacción confirma
        if (tecnicoId && tecnicoId !== usuario.id) {
          bus.emitirAlConfirmar(transaction, EVENTOS.TICKET_REASIGNADO, {
            ticketId: ticket.id, folio, tecnicoId, anteriorId: null, actorId: usuario.id,
          });
        }
        return ticket;
      });
    } catch (error) {
      // La transacción ya se revirtió: las fotos no deben quedar huérfanas en el disco
      await borrarArchivos(archivos);
      throw error;
    }
  }

  /**
   * Listado paginado en la consulta, con filtro por estado y búsqueda por folio
   * o nombre del cliente. El técnico solo obtiene sus tickets.
   *
   * @implements RN-02, RF-05, RNF-04
   * @param {{estado?: string, busqueda?: string, pagina?: number}} filtros
   * @param {{id: number, rol: string}} usuario
   */
  static async listar({ estado = '', busqueda = '', pagina = 1 } = {}, usuario) {
    const where = {};
    if (usuario.rol !== 'admin') where.tecnico_id = usuario.id;
    if (estado === 'abiertos') where.estado = { [Op.in]: ESTADOS_ABIERTOS };
    else if (ESTADOS_TICKET.includes(estado)) where.estado = estado;

    const texto = String(busqueda || '').trim();
    if (texto) {
      const patron = `%${escaparLike(texto)}%`;
      where[Op.or] = [
        { folio: { [Op.like]: patron } },
        condicion(col('equipo->cliente.nombre'), { [Op.like]: patron }),
      ];
    }

    const resultado = await Ticket.findAndCountAll({
      where,
      attributes: ['id', 'folio', 'estado', 'fecha_ingreso', 'fecha_estimada', 'tecnico_id', PENDIENTE_DESDE],
      include: [{ ...INCLUIR_EQUIPO, required: true }, INCLUIR_TECNICO],
      order: [['fecha_ingreso', 'DESC'], ['id', 'DESC']],
      distinct: true,
      ...opcionesPaginacion(pagina),
    });
    return resultadoPaginado(resultado, pagina);
  }

  /**
   * Ticket con cliente, equipo, técnico, fotos, historial (en orden) y cotizaciones.
   *
   * @implements HU-06, RF-05, RN-02
   * @param {number|string} id
   * @param {{id: number, rol: string}} usuario
   * @throws {NotFoundError|ForbiddenError}
   */
  static async obtenerDetalle(id, usuario) {
    const ticket = idValido(id) && await Ticket.findByPk(idValido(id), {
      include: [
        INCLUIR_EQUIPO,
        INCLUIR_TECNICO,
        { model: TicketFoto, as: 'fotos', attributes: ['id', 'url_foto'] },
        {
          model: TicketHistorial,
          as: 'historial',
          include: { model: Usuario, as: 'usuario', attributes: ['id', 'nombre'] },
        },
        {
          model: Cotizacion,
          as: 'cotizaciones',
          attributes: ['id', 'estado', 'total', 'fecha'],
          include: {
            model: CotizacionItem,
            as: 'items',
            include: { model: CatalogoItem, as: 'catalogoItem', attributes: ['id', 'nombre', 'tipo'] },
          },
        },
      ],
      order: [
        [{ model: TicketHistorial, as: 'historial' }, 'fecha', 'ASC'],
        [{ model: TicketHistorial, as: 'historial' }, 'id', 'ASC'],
        [{ model: TicketFoto, as: 'fotos' }, 'id', 'ASC'],
        [{ model: Cotizacion, as: 'cotizaciones' }, 'fecha', 'DESC'],
        [{ model: Cotizacion, as: 'cotizaciones' }, 'id', 'DESC'],
        [{ model: Cotizacion, as: 'cotizaciones' }, { model: CotizacionItem, as: 'items' }, 'id', 'ASC'],
      ],
    });
    if (!ticket) throw new NotFoundError('El ticket no existe.');
    TicketService.verificarAcceso(ticket, usuario);
    return ticket;
  }

  /**
   * Cambio de estado manual desde el detalle del ticket, validado con
   * MaquinaEstadosTicket. Registra el historial con el usuario que lo hizo.
   * - En_reparacion exige una cotización Aprobada (RN-01).
   * - Entregado guarda fecha_entrega.
   * - Cancelado: solo el admin, con motivo (se guarda en el historial).
   *
   * @implements HU-06, RN-01, RN-02, RN-04
   * @param {number|string} id
   * @param {string} destino
   * @param {{id: number, rol: string}} usuario
   * @param {{motivo?: string}} [opciones]
   * @returns {Promise<Ticket>}
   */
  static async cambiarEstado(id, destino, usuario, { motivo } = {}) {
    return sequelize.transaction(async (transaction) => {
      // Bloquea la fila: dos cambios simultáneos sobre el mismo ticket se aplican uno tras otro
      const ticket = idValido(id) && await Ticket.findByPk(idValido(id), { transaction, lock: transaction.LOCK.UPDATE });
      if (!ticket) throw new NotFoundError('El ticket no existe.');
      TicketService.verificarAcceso(ticket, usuario);

      const cancelando = destino === 'Cancelado';
      const comentario = textoOpcional(motivo);
      MaquinaEstadosTicket.validarTransicion(ticket.estado, destino, {
        origen: cancelando ? ORIGENES.CANCELACION : ORIGENES.MANUAL,
        rol: usuario.rol,
      });
      if (cancelando && (!comentario || comentario.length < LARGO_MINIMO_MOTIVO)) {
        throw errorCampo('motivo', `Indica el motivo de la cancelación (al menos ${LARGO_MINIMO_MOTIVO} caracteres).`);
      }

      if (MaquinaEstadosTicket.requiereCotizacionAprobada(destino)) {
        const aprobadas = await Cotizacion.count({ where: { ticket_id: ticket.id, estado: 'Aprobada' }, transaction });
        if (!aprobadas) {
          throw new BusinessRuleError('No se puede pasar a «En reparación» sin una cotización aprobada por el cliente (RN-01).');
        }
      }

      const anterior = ticket.estado;
      const ahora = new Date();
      const cambios = { estado: destino };
      if (destino === 'Entregado') cambios.fecha_entrega = ahora;
      await ticket.update(cambios, { transaction });
      await TicketHistorial.create({
        ticket_id: ticket.id,
        estado_anterior: anterior,
        estado_nuevo: destino,
        usuario_id: usuario.id,
        comentario: cancelando ? comentario.slice(0, 255) : null,
        fecha: ahora,
      }, { transaction });

      // Los avisos al técnico los decide NotificacionListener, solo si la transacción confirma
      const evento = {
        ticketId: ticket.id,
        folio: ticket.folio,
        tecnicoId: ticket.tecnico_id,
        anterior,
        nuevo: destino,
        actorId: usuario.id,
        actorRol: usuario.rol,
      };
      if (cancelando) {
        bus.emitirAlConfirmar(transaction, EVENTOS.TICKET_CANCELADO, { ...evento, motivo: comentario });
      } else {
        bus.emitirAlConfirmar(transaction, EVENTOS.TICKET_ESTADO_CAMBIADO, evento);
      }
      return ticket;
    });
  }

  /**
   * Asigna el ticket a otro técnico activo (solo admin). Registra la nota en el
   * historial y emite ticket.reasignado (NotificacionListener avisa al técnico).
   *
   * @implements HU-06, RN-02
   * @param {number|string} id
   * @param {number|string} tecnicoId
   * @param {{id: number, rol: string}} usuario Admin.
   * @returns {Promise<Ticket>}
   */
  static async reasignar(id, tecnicoId, usuario) {
    if (usuario.rol !== 'admin') throw new ForbiddenError('Solo el administrador puede reasignar tickets.');
    return sequelize.transaction(async (transaction) => {
      const ticket = idValido(id) && await Ticket.findByPk(idValido(id), {
        include: INCLUIR_TECNICO, transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!ticket) throw new NotFoundError('El ticket no existe.');
      if (MaquinaEstadosTicket.esFinal(ticket.estado)) {
        throw new BusinessRuleError(`El ticket está «${etiqueta(ticket.estado)}»: ya no se puede reasignar.`);
      }

      const tecnico = idValido(tecnicoId) && await Usuario.findOne({
        where: { id: idValido(tecnicoId), rol: 'tecnico' }, attributes: ['id', 'nombre', 'activo'], transaction,
      });
      if (!tecnico) throw errorCampo('tecnico_id', 'Elige un técnico de la lista.');
      if (!tecnico.activo) throw errorCampo('tecnico_id', `${tecnico.nombre} está desactivado: elige un técnico activo.`);
      if (ticket.tecnico_id === tecnico.id) {
        throw errorCampo('tecnico_id', `El ticket ya está asignado a ${tecnico.nombre}.`);
      }

      const nota = ticket.tecnico
        ? `Reasignado de ${ticket.tecnico.nombre} a ${tecnico.nombre}.`
        : `Asignado a ${tecnico.nombre}.`;
      await ticket.update({ tecnico_id: tecnico.id }, { transaction });
      await TicketHistorial.create({
        ticket_id: ticket.id,
        estado_anterior: ticket.estado,
        estado_nuevo: ticket.estado,
        usuario_id: usuario.id,
        comentario: nota.slice(0, 255),
      }, { transaction });
      bus.emitirAlConfirmar(transaction, EVENTOS.TICKET_REASIGNADO, {
        ticketId: ticket.id,
        folio: ticket.folio,
        tecnicoId: tecnico.id,
        anteriorId: ticket.tecnico ? ticket.tecnico.id : null,
        actorId: usuario.id,
      });
      return ticket;
    });
  }

  /** Historial de tickets (el técnico solo ve los suyos, RN-02). */
  static async historialDonde(where, usuario) {
    const filtro = { ...where };
    if (usuario.rol !== 'admin') filtro.tecnico_id = usuario.id;
    return Ticket.findAll({
      where: filtro,
      attributes: ['id', 'folio', 'estado', 'fecha_ingreso', 'fecha_entrega', 'equipo_id', 'tecnico_id'],
      include: [
        { model: Equipo, as: 'equipo', attributes: ['id', 'tipo', 'marca', 'modelo'] },
        INCLUIR_TECNICO,
      ],
      order: [['fecha_ingreso', 'DESC'], ['id', 'DESC']],
    });
  }

  /**
   * Todos los tickets de los equipos de un cliente.
   * @implements RF-05
   */
  static async listarPorCliente(clienteId, usuario) {
    return TicketService.historialDonde({ '$equipo.cliente_id$': idValido(clienteId) }, usuario);
  }

  /**
   * Todos los tickets de un equipo.
   * @implements RF-05
   */
  static async listarPorEquipo(equipoId, usuario) {
    return TicketService.historialDonde({ equipo_id: idValido(equipoId) }, usuario);
  }

  /**
   * Indicadores del dashboard del admin (como el prototipo) y tickets recientes.
   * @implements HU-08
   */
  static async resumenAdmin() {
    const inicioMes = new Date(`${hoyEnElSalvador().slice(0, 7)}-01T00:00:00-06:00`);
    const [abiertos, esperandoAprobacion, listos, entregadosMes, recientes] = await Promise.all([
      Ticket.count({ where: { estado: { [Op.in]: ESTADOS_ABIERTOS } } }),
      Ticket.count({ where: { estado: 'Esperando_aprobacion' } }),
      Ticket.count({ where: { estado: 'Listo' } }),
      Ticket.count({ where: { estado: 'Entregado', fecha_entrega: { [Op.gte]: inicioMes } } }),
      Ticket.findAll({
        attributes: ['id', 'folio', 'estado', 'fecha_ingreso', PENDIENTE_DESDE],
        include: [INCLUIR_EQUIPO, INCLUIR_TECNICO],
        order: [['fecha_ingreso', 'DESC'], ['id', 'DESC']],
        limit: 5,
      }),
    ]);
    return {
      kpis: {
        abiertos, esperandoAprobacion, listos, entregadosMes,
      },
      recientes,
    };
  }

  /** Conteo de los tickets abiertos del técnico por estado (dashboard del técnico). */
  static async resumenTecnico(usuario) {
    const filas = await Ticket.findAll({
      where: { tecnico_id: usuario.id, estado: { [Op.in]: ESTADOS_ABIERTOS } },
      attributes: ['estado', [fn('COUNT', col('id')), 'total']],
      group: ['estado'],
      raw: true,
    });
    return Object.fromEntries(filas.map(({ estado, total }) => [estado, Number(total)]));
  }

  /** Técnicos activos para asignar o reasignar (admin). */
  static async tecnicosActivos() {
    return Usuario.findAll({
      where: { rol: 'tecnico', activo: true }, attributes: ['id', 'nombre'], order: [['nombre', 'ASC']],
    });
  }
}

TicketService.ESTADOS_ABIERTOS = ESTADOS_ABIERTOS;

module.exports = TicketService;
