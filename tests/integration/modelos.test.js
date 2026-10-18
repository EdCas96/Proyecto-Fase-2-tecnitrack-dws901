const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');
const {
  sequelize, Usuario, Cliente, Equipo, CatalogoItem, Ticket, TicketFoto,
  TicketHistorial, Cotizacion, CotizacionItem, Notificacion,
} = require('../../models');
const { limpiarBaseDatos } = require('../helpers/baseDatos');
const {
  HASH_FALSO, crearUsuario, crearCliente, crearEquipo, crearCatalogoItem, crearTicket, crearCotizacion,
} = require('../helpers/fabricas');

/** Devuelve los mensajes de validación de Sequelize de una promesa rechazada. */
async function mensajesDeError(promesa) {
  try {
    await promesa;
  } catch (error) {
    if (error instanceof ValidationError) return error.errors.map((e) => e.message);
    throw error;
  }
  throw new Error('Se esperaba un error de validación y la operación se completó.');
}

beforeEach(async () => {
  await limpiarBaseDatos();
});

afterAll(async () => {
  await sequelize.close();
});

describe('Registros válidos', () => {
  test('crea un usuario con valores por defecto (activo, correo en minúsculas)', async () => {
    const usuario = await Usuario.create({
      nombre: 'Luis Fernández', correo: '  Luis.Fernandez@TecniTrack.com ', password_hash: HASH_FALSO,
    });

    expect(usuario.id).toBeDefined();
    expect(usuario.rol).toBe('tecnico');
    expect(usuario.activo).toBe(true);
    expect(usuario.correo).toBe('luis.fernandez@tecnitrack.com');
  });

  test('crea cliente, equipo y ticket; el ticket inicia en Recibido con fecha de ingreso', async () => {
    const cliente = await Cliente.create({ nombre: 'María Elena Hernández', telefono: '7123-4567', correo: '' });
    const equipo = await Equipo.create({
      cliente_id: cliente.id, tipo: 'Laptop', marca: 'Dell', modelo: 'Inspiron 15', numero_serie: 'DL-88291',
    });
    const ticket = await Ticket.create({
      folio: 'TT-2026-0042', equipo_id: equipo.id, diagnostico_inicial: 'La batería no carga.',
    });

    await ticket.reload();

    expect(cliente.correo).toBeNull();
    expect(ticket.estado).toBe('Recibido');
    expect(ticket.tecnico_id).toBeNull();
    expect(ticket.fecha_ingreso).toBeInstanceOf(Date);
    expect(ticket.created_at ?? ticket.createdAt).toBeInstanceOf(Date);
  });

  test('crea una cotización Pendiente con sus ítems y calcula el subtotal', async () => {
    const item = await crearCatalogoItem({ nombre: 'Memoria RAM 8GB DDR4', tipo: 'Repuesto', precio_referencia: 35 });
    const cotizacion = await crearCotizacion({ total: 70 });
    const linea = await CotizacionItem.create({
      cotizacion_id: cotizacion.id, catalogo_id: item.id, cantidad: 2, precio_unitario: 35,
    });

    expect(cotizacion.estado).toBe('Pendiente');
    expect(linea.subtotal).toBe(70);
  });

  test('crea notificación no leída por defecto', async () => {
    const tecnico = await crearUsuario();
    const ticket = await crearTicket({ tecnico_id: tecnico.id });
    const notificacion = await Notificacion.create({
      ticket_id: ticket.id, usuario_id: tecnico.id, mensaje: 'El cliente aprobó la cotización.',
    });

    expect(notificacion.leida).toBe(false);
  });
});

describe('Validaciones del modelo (mensajes en español)', () => {
  test('rechaza un correo de usuario mal formado', async () => {
    const mensajes = await mensajesDeError(crearUsuario({ correo: 'correo-sin-arroba' }));
    expect(mensajes).toContain('El correo no tiene un formato válido.');
  });

  test('rechaza un correo de cliente mal formado', async () => {
    const mensajes = await mensajesDeError(crearCliente({ correo: 'maria@' }));
    expect(mensajes).toContain('El correo no tiene un formato válido.');
  });

  test('rechaza un teléfono inválido', async () => {
    const mensajes = await mensajesDeError(crearCliente({ telefono: '123' }));
    expect(mensajes[0]).toMatch(/teléfono/);
  });

  test('rechaza un precio de catálogo negativo', async () => {
    const mensajes = await mensajesDeError(crearCatalogoItem({ precio_referencia: -5 }));
    expect(mensajes).toContain('El precio no puede ser negativo.');
  });

  test('rechaza precio unitario negativo y cantidad 0 en un ítem de cotización', async () => {
    const item = await crearCatalogoItem();
    const cotizacion = await crearCotizacion();
    const mensajes = await mensajesDeError(
      CotizacionItem.create({ cotizacion_id: cotizacion.id, catalogo_id: item.id, cantidad: 0, precio_unitario: -1 }),
    );

    expect(mensajes).toEqual(expect.arrayContaining([
      'La cantidad debe ser al menos 1.',
      'El precio unitario no puede ser negativo.',
    ]));
  });

  test('rechaza un total de cotización negativo', async () => {
    const mensajes = await mensajesDeError(crearCotizacion({ total: -10 }));
    expect(mensajes).toContain('El total no puede ser negativo.');
  });

  test('rechaza valores fuera de los enums (rol, tipo, estado)', async () => {
    expect(await mensajesDeError(crearUsuario({ rol: 'cliente' }))).toContain('El rol debe ser uno de: admin, tecnico.');
    expect(await mensajesDeError(crearCatalogoItem({ tipo: 'Otro' }))).toContain('El tipo debe ser Servicio o Repuesto.');
    expect(await mensajesDeError(crearTicket({ estado: 'Perdido' }))).toContain('El estado del ticket no es válido.');
  });

  test('rechaza un folio con formato distinto de TT-AAAA-NNNN', async () => {
    const mensajes = await mensajesDeError(crearTicket({ folio: 'TK-0001' }));
    expect(mensajes).toContain('El folio debe tener el formato TT-AAAA-NNNN (ej. TT-2026-0042).');
  });

  test('rechaza campos obligatorios vacíos', async () => {
    const mensajes = await mensajesDeError(Ticket.create({}));
    expect(mensajes).toEqual(expect.arrayContaining([
      'El folio es obligatorio.',
      'El ticket debe estar asociado a un equipo.',
      'El diagnóstico inicial es obligatorio.',
    ]));
  });

  test('rechaza una fecha de entrega anterior a la de ingreso', async () => {
    const mensajes = await mensajesDeError(crearTicket({
      fecha_ingreso: new Date('2026-09-10T10:00:00-06:00'),
      fecha_entrega: new Date('2026-09-01T10:00:00-06:00'),
    }));
    expect(mensajes).toContain('La fecha de entrega no puede ser anterior a la fecha de ingreso.');
  });
});

describe('Índices únicos', () => {
  test('rechaza un folio duplicado', async () => {
    await crearTicket({ folio: 'TT-2026-0001' });

    const error = await crearTicket({ folio: 'TT-2026-0001' }).catch((e) => e);
    expect(error).toBeInstanceOf(UniqueConstraintError);
    expect(error.errors[0].message).toBe('Ya existe un ticket con ese folio.');
  });

  test('rechaza un correo de usuario duplicado (sin importar mayúsculas)', async () => {
    await crearUsuario({ correo: 'jorge.pineda@tecnitrack.com' });

    const error = await crearUsuario({ correo: 'Jorge.Pineda@tecnitrack.com' }).catch((e) => e);
    expect(error).toBeInstanceOf(UniqueConstraintError);
    expect(error.errors[0].message).toBe('Ya existe un usuario con ese correo.');
  });

  test('rechaza un número de serie duplicado, pero permite varios equipos sin número de serie', async () => {
    await crearEquipo({ numero_serie: 'HP-55210' });
    await expect(crearEquipo({ numero_serie: 'HP-55210' })).rejects.toBeInstanceOf(UniqueConstraintError);

    await crearEquipo({ numero_serie: null });
    await expect(crearEquipo({ numero_serie: '' })).resolves.toBeDefined();
  });
});

describe('Restricciones a nivel de base de datos (sin pasar por las validaciones de Sequelize)', () => {
  test('CHECK impide un precio negativo en catalogo_items', async () => {
    await expect(sequelize.query(
      "INSERT INTO catalogo_items (nombre, tipo, precio_referencia) VALUES ('Prueba', 'Servicio', -1)",
    )).rejects.toThrow(/chk_catalogo_items_precio/);
  });

  test('CHECK impide cantidad 0 y precio unitario negativo en cotizacion_items', async () => {
    const item = await crearCatalogoItem();
    const cotizacion = await crearCotizacion();

    await expect(sequelize.query(
      `INSERT INTO cotizacion_items (cotizacion_id, catalogo_id, cantidad, precio_unitario) VALUES (${cotizacion.id}, ${item.id}, 0, 5)`,
    )).rejects.toThrow(/chk_cotizacion_items_cantidad/);
    await expect(sequelize.query(
      `INSERT INTO cotizacion_items (cotizacion_id, catalogo_id, cantidad, precio_unitario) VALUES (${cotizacion.id}, ${item.id}, 1, -5)`,
    )).rejects.toThrow(/chk_cotizacion_items_precio/);
  });

  test('CHECK impide un folio con formato inválido aunque se omita la validación del modelo', async () => {
    const equipo = await crearEquipo();
    await expect(
      Ticket.create({ folio: 'TK-0001', equipo_id: equipo.id, diagnostico_inicial: 'Prueba.' }, { validate: false }),
    ).rejects.toThrow(/chk_tickets_folio/);
  });

  test('ENUM rechaza un estado inexistente', async () => {
    const ticket = await crearTicket();
    await expect(sequelize.query(`UPDATE tickets SET estado = 'Perdido' WHERE id = ${ticket.id}`)).rejects.toThrow();
  });

  test('NOT NULL rechaza un ticket sin diagnóstico', async () => {
    const equipo = await crearEquipo();
    await expect(sequelize.query(
      `INSERT INTO tickets (folio, equipo_id) VALUES ('TT-2026-9999', ${equipo.id})`,
    )).rejects.toThrow(/diagnostico_inicial/);
  });

  test('valores por defecto de la BD: estado Recibido y fecha_ingreso actual', async () => {
    const equipo = await crearEquipo();
    await sequelize.query(
      `INSERT INTO tickets (folio, equipo_id, diagnostico_inicial) VALUES ('TT-2026-9998', ${equipo.id}, 'Prueba.')`,
    );
    const [[fila]] = await sequelize.query("SELECT estado, fecha_ingreso FROM tickets WHERE folio = 'TT-2026-9998'");

    expect(fila.estado).toBe('Recibido');
    expect(fila.fecha_ingreso).not.toBeNull();
  });

  test('RN-09: solo una cotización Pendiente por ticket, pero se permiten varias en otros estados', async () => {
    const ticket = await crearTicket();
    await crearCotizacion({ ticket_id: ticket.id, estado: 'Rechazada' });
    await crearCotizacion({ ticket_id: ticket.id, estado: 'Pendiente' });

    await expect(crearCotizacion({ ticket_id: ticket.id, estado: 'Pendiente' })).rejects.toBeInstanceOf(UniqueConstraintError);
    await expect(crearCotizacion({ ticket_id: ticket.id, estado: 'Rechazada' })).resolves.toBeDefined();

    // Otro ticket sí puede tener su propia cotización Pendiente
    await expect(crearCotizacion({ estado: 'Pendiente' })).resolves.toBeDefined();
  });
});

describe('Asociaciones', () => {
  test('un ticket devuelve su equipo, cliente, técnico, fotos, historial, cotizaciones e ítems', async () => {
    const tecnico = await crearUsuario({ nombre: 'Jorge Pineda' });
    const cliente = await crearCliente({ nombre: 'Ana Lucía Martínez' });
    const equipo = await crearEquipo({ cliente_id: cliente.id, tipo: 'Impresora', marca: 'Epson', modelo: 'L3250' });
    const ticket = await crearTicket({ equipo_id: equipo.id, tecnico_id: tecnico.id });
    await TicketFoto.create({ ticket_id: ticket.id, url_foto: '/img/equipo-placeholder-1.svg' });
    await TicketHistorial.create({ ticket_id: ticket.id, estado_anterior: null, estado_nuevo: 'Recibido', usuario_id: tecnico.id });
    const item = await crearCatalogoItem({ nombre: 'Cartucho de tinta genérico', tipo: 'Repuesto', precio_referencia: 12 });
    const cotizacion = await crearCotizacion({ ticket_id: ticket.id, total: 12 });
    await CotizacionItem.create({ cotizacion_id: cotizacion.id, catalogo_id: item.id, cantidad: 1, precio_unitario: 12 });

    const encontrado = await Ticket.findByPk(ticket.id, {
      include: [
        { association: 'equipo', include: ['cliente'] },
        'tecnico',
        'fotos',
        { association: 'historial', include: ['usuario'] },
        { association: 'cotizaciones', include: [{ association: 'items', include: ['catalogoItem'] }] },
      ],
    });

    expect(encontrado.equipo.marca).toBe('Epson');
    expect(encontrado.equipo.cliente.nombre).toBe('Ana Lucía Martínez');
    expect(encontrado.tecnico.nombre).toBe('Jorge Pineda');
    expect(encontrado.fotos).toHaveLength(1);
    expect(encontrado.historial[0].estado_nuevo).toBe('Recibido');
    expect(encontrado.historial[0].usuario.id).toBe(tecnico.id);
    expect(encontrado.cotizaciones[0].items[0].catalogoItem.nombre).toBe('Cartucho de tinta genérico');
  });

  test('un cliente devuelve sus equipos y un equipo sus tickets (RF-05)', async () => {
    const cliente = await crearCliente();
    const equipo1 = await crearEquipo({ cliente_id: cliente.id });
    await crearEquipo({ cliente_id: cliente.id });
    await crearTicket({ equipo_id: equipo1.id });
    await crearTicket({ equipo_id: equipo1.id });

    const conEquipos = await Cliente.findByPk(cliente.id, { include: [{ association: 'equipos', include: ['tickets'] }] });

    expect(conEquipos.equipos).toHaveLength(2);
    const equipo = conEquipos.equipos.find((e) => e.id === equipo1.id);
    expect(equipo.tickets).toHaveLength(2);
  });

  test('un técnico devuelve sus tickets asignados y sus notificaciones', async () => {
    const tecnico = await crearUsuario();
    const ticket = await crearTicket({ tecnico_id: tecnico.id });
    await crearTicket();
    await Notificacion.create({ ticket_id: ticket.id, usuario_id: tecnico.id, mensaje: 'Aviso de prueba' });

    const conRelaciones = await Usuario.findByPk(tecnico.id, { include: ['ticketsAsignados', 'notificaciones'] });

    expect(conRelaciones.ticketsAsignados).toHaveLength(1);
    expect(conRelaciones.notificaciones[0].mensaje).toBe('Aviso de prueba');
  });
});

describe('RN-08: password_hash nunca aparece en consultas normales', () => {
  test('findByPk y findAll no traen password_hash', async () => {
    const creado = await crearUsuario();

    const porId = await Usuario.findByPk(creado.id);
    const todos = await Usuario.findAll();

    expect(porId.get('password_hash')).toBeUndefined();
    expect(todos[0].get('password_hash')).toBeUndefined();
  });

  test('tampoco aparece al incluir al técnico desde un ticket', async () => {
    const tecnico = await crearUsuario();
    const ticket = await crearTicket({ tecnico_id: tecnico.id });

    const encontrado = await Ticket.findByPk(ticket.id, { include: ['tecnico'] });

    expect(encontrado.tecnico.get('password_hash')).toBeUndefined();
  });

  test('toJSON no lo expone ni en una instancia recién creada', async () => {
    const creado = await crearUsuario();
    expect(creado.toJSON()).not.toHaveProperty('password_hash');
  });

  test('el scope conPassword (solo para login) sí lo incluye', async () => {
    const creado = await crearUsuario();

    const conPassword = await Usuario.scope('conPassword').findOne({ where: { correo: creado.correo } });

    expect(conPassword.get('password_hash')).toBe(HASH_FALSO);
  });
});

describe('Integridad referencial', () => {
  test('impide borrar un cliente que tiene equipos', async () => {
    const cliente = await crearCliente();
    await crearEquipo({ cliente_id: cliente.id });

    await expect(cliente.destroy()).rejects.toBeInstanceOf(ForeignKeyConstraintError);
    expect(await Cliente.findByPk(cliente.id)).not.toBeNull();
  });

  test('permite borrar un cliente sin equipos', async () => {
    const cliente = await crearCliente();
    await cliente.destroy();
    expect(await Cliente.findByPk(cliente.id)).toBeNull();
  });

  test('impide borrar un ticket que tiene historial (RESTRICT)', async () => {
    const ticket = await crearTicket();
    await TicketHistorial.create({ ticket_id: ticket.id, estado_nuevo: 'Recibido' });

    await expect(ticket.destroy()).rejects.toBeInstanceOf(ForeignKeyConstraintError);
  });

  test('impide crear un equipo con un cliente inexistente', async () => {
    await expect(Equipo.create({
      cliente_id: 999999, tipo: 'Laptop', marca: 'Dell', modelo: 'X',
    })).rejects.toBeInstanceOf(ForeignKeyConstraintError);
  });

  test('impide borrar un ítem del catálogo usado en una cotización', async () => {
    const item = await crearCatalogoItem();
    const cotizacion = await crearCotizacion();
    await CotizacionItem.create({ cotizacion_id: cotizacion.id, catalogo_id: item.id, cantidad: 1, precio_unitario: 10 });

    await expect(item.destroy()).rejects.toBeInstanceOf(ForeignKeyConstraintError);
  });

  test('CASCADE: al borrar una cotización se borran sus ítems', async () => {
    const item = await crearCatalogoItem();
    const cotizacion = await crearCotizacion();
    await CotizacionItem.create({ cotizacion_id: cotizacion.id, catalogo_id: item.id, cantidad: 1, precio_unitario: 10 });

    await cotizacion.destroy();

    expect(await CotizacionItem.count({ where: { cotizacion_id: cotizacion.id } })).toBe(0);
  });

  test('CASCADE: al borrar un ticket sin historial se borran sus fotos', async () => {
    const ticket = await crearTicket();
    await TicketFoto.create({ ticket_id: ticket.id, url_foto: '/img/equipo-placeholder-1.svg' });

    await ticket.destroy();

    expect(await TicketFoto.count({ where: { ticket_id: ticket.id } })).toBe(0);
  });
});
