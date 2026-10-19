/**
 * Tickets (HU-02, HU-04, HU-06; RN-01 a RN-04): creación con fotos en una
 * transacción, folios simultáneos, permisos del técnico, flujo de estados,
 * cancelación, reasignación, fotos protegidas y portal del cliente.
 */
const fs = require('fs');
const { Op } = require('sequelize');
const path = require('path');
const {
  Ticket, TicketHistorial, TicketFoto, Cliente, Notificacion, Cotizacion,
} = require('../../models');
const TicketService = require('../../services/TicketService');
const NotificacionListener = require('../../services/eventos/NotificacionListener');
const { directorioFotos } = require('../../config/env');
const { sembrarDatos, cerrarConexiones } = require('../helpers/baseDatos');
const {
  USUARIOS, TICKET_PORTAL, crearAgente, crearAgenteAutenticado, enviarFormulario, entrarAlPortal, obtenerTokenCsrf,
} = require('../helpers/agente');

/** PNG mínimo: la subida verifica la firma de los primeros bytes. */
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const MANANA = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' })
  .format(new Date(Date.now() + 24 * 60 * 60 * 1000));

let admin;
let luis;
let jorge;

/** Archivos que hay en la carpeta de fotos de pruebas. */
const fotosEnDisco = () => (fs.existsSync(directorioFotos) ? fs.readdirSync(directorioFotos) : []);

/**
 * Envía el formulario multipart de nuevo ticket como lo hace el navegador
 * (token CSRF en la query string).
 */
function crearTicketHttp(sesion, datos, fotos = [['equipo.png', PNG, 'image/png']], json = true) {
  let peticion = sesion.agente.post(`/tickets?_csrf=${encodeURIComponent(sesion.csrfToken)}`);
  if (json) peticion = peticion.set('Accept', 'application/json');
  Object.entries(datos).forEach(([campo, valor]) => { peticion = peticion.field(campo, String(valor)); });
  fotos.forEach(([nombre, contenido, tipo]) => {
    peticion = peticion.attach('fotos', contenido, { filename: nombre, contentType: tipo });
  });
  return peticion;
}

const DATOS_BASICOS = {
  modo_cliente: 'existente', cliente_id: 3, modo_equipo: 'existente', equipo_id: 3,
  diagnostico_inicial: 'La pantalla parpadea al abrir la tapa.',
};

beforeAll(async () => {
  await sembrarDatos();
  fs.rmSync(directorioFotos, { recursive: true, force: true });
  fs.mkdirSync(directorioFotos, { recursive: true });
  admin = await crearAgenteAutenticado({ correo: USUARIOS.admin.correo });
  luis = await crearAgenteAutenticado({ correo: USUARIOS.luis.correo });
  jorge = await crearAgenteAutenticado({ correo: USUARIOS.jorge.correo });
});
afterAll(async () => {
  fs.rmSync(directorioFotos, { recursive: true, force: true });
  await cerrarConexiones();
});

const cambiarEstado = (sesion, ticketId, datos) => enviarFormulario(sesion.agente, {
  metodo: 'PATCH', ruta: `/tickets/${ticketId}/estado`, csrfToken: sesion.csrfToken, json: true, datos,
});

describe('Dashboards', () => {
  test('el admin ve los KPIs del prototipo y los tickets recientes', async () => {
    const respuesta = await admin.agente.get('/admin');

    // Seeders: 6 abiertos, 2 esperando aprobación (una vencida, RN-05), 1 listo
    expect(respuesta.text).toMatch(/kpi-value">6<\/span>\s*<span class="kpi-label">Tickets abiertos/);
    expect(respuesta.text).toMatch(/kpi-value">2<\/span>\s*<span class="kpi-label">Esperando aprobación/);
    expect(respuesta.text).toMatch(/kpi-value">1<\/span>\s*<span class="kpi-label">Cotizaciones pendientes de respuesta/);
    expect(respuesta.text).toMatch(/kpi-value">1<\/span>\s*<span class="kpi-label">Listos para entregar/);
    // Las entregas de TT-2026-0044 y 0045 se siembran "hace unas horas": se cuentan según el inicio del mes actual
    const inicioMes = new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador' }).format(new Date()).slice(0, 7)}-01T00:00:00-06:00`);
    const entregadosMes = await Ticket.count({ where: { estado: 'Entregado', fecha_entrega: { [Op.gte]: inicioMes } } });
    expect(respuesta.text).toMatch(new RegExp(`kpi-value">${entregadosMes}</span>\\s*<span class="kpi-label">Entregados este mes`));
    expect(respuesta.text).toContain('TT-2026-0042');
  });

  test('el técnico ve solo sus tickets abiertos y el botón "Nuevo ticket"', async () => {
    const respuesta = await luis.agente.get('/tecnico');

    expect(respuesta.text).toContain('href="/tickets/nuevo"');
    expect(respuesta.text).toContain('TT-2026-0040');
    expect(respuesta.text).toContain('TT-2026-0041');
    expect(respuesta.text).not.toContain('TT-2026-0037'); // de Jorge
    expect(respuesta.text).not.toContain('TT-2026-0035'); // entregado
  });
});

describe('Crear tickets (HU-02, RF-03, RN-03)', () => {
  test('el técnico crea un ticket con fotos: folio correlativo, Recibido, historial inicial y asignado a él', async () => {
    const antes = fotosEnDisco().length;
    const respuesta = await crearTicketHttp(luis, { ...DATOS_BASICOS, fecha_estimada: MANANA }, [
      ['frente.png', PNG, 'image/png'],
      ['lateral.png', PNG, 'image/png'],
    ], false);

    expect(respuesta.status).toBe(303);
    const ticket = await Ticket.findOne({ where: { folio: 'TT-2026-0046' }, include: ['historial', 'fotos'] });
    expect(respuesta.headers.location).toBe(`/tickets/${ticket.id}`);
    expect(ticket).toMatchObject({ estado: 'Recibido', tecnico_id: USUARIOS.luis.id, equipo_id: 3, fecha_estimada: MANANA });
    expect(ticket.historial).toHaveLength(1);
    expect(ticket.historial[0]).toMatchObject({ estado_anterior: null, estado_nuevo: 'Recibido', usuario_id: USUARIOS.luis.id });
    expect(ticket.fotos).toHaveLength(2);
    expect(fotosEnDisco().length).toBe(antes + 2);
    ticket.fotos.forEach((foto) => expect(fotosEnDisco()).toContain(foto.url_foto));

    const detalle = await luis.agente.get(respuesta.headers.location);
    expect(detalle.text).toContain('Ticket TT-2026-0046 creado en estado «Recibido».');
  });

  test('el admin registra cliente y equipo nuevos en el mismo formulario y asigna un técnico (que recibe aviso)', async () => {
    const respuesta = await crearTicketHttp(admin, {
      modo_cliente: 'nuevo', cliente_nombre: 'Rosa Idalia Gómez', cliente_telefono: '74561230', cliente_correo: '',
      equipo_tipo: 'Laptop', equipo_marca: 'Acer', equipo_modelo: 'Aspire 5', equipo_numero_serie: 'AC-5001',
      diagnostico_inicial: 'No carga la batería.', tecnico_id: USUARIOS.jorge.id,
    });

    expect(respuesta.status).toBe(303);
    const cliente = await Cliente.findOne({ where: { nombre: 'Rosa Idalia Gómez' }, include: 'equipos' });
    expect(cliente.telefono).toBe('7456-1230');
    expect(cliente.equipos[0].numero_serie).toBe('AC-5001');
    const ticket = await Ticket.findOne({ where: { equipo_id: cliente.equipos[0].id } });
    expect(ticket.tecnico_id).toBe(USUARIOS.jorge.id);
    await NotificacionListener.esperar();
    expect(await Notificacion.count({ where: { ticket_id: ticket.id, usuario_id: USUARIOS.jorge.id } })).toBe(1);
  });

  test('el admin puede dejar el ticket sin asignar', async () => {
    const respuesta = await crearTicketHttp(admin, { ...DATOS_BASICOS, equipo_id: 4, tecnico_id: '' });

    expect(respuesta.status).toBe(303);
    const id = Number(respuesta.headers.location.split('/').pop());
    expect((await Ticket.findByPk(id)).tecnico_id).toBeNull();
  });

  test('el técnico no puede asignar el ticket a otro: se le asigna a él', async () => {
    const respuesta = await crearTicketHttp(luis, { ...DATOS_BASICOS, tecnico_id: USUARIOS.jorge.id });

    const id = Number(respuesta.headers.location.split('/').pop());
    expect((await Ticket.findByPk(id)).tecnico_id).toBe(USUARIOS.luis.id);
  });

  test('exige al menos una foto', async () => {
    const total = await Ticket.count();
    const respuesta = await crearTicketHttp(luis, DATOS_BASICOS, []);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores).toEqual({ fotos: 'Agrega al menos una foto del equipo.' });
    expect(await Ticket.count()).toBe(total);
  });

  test('rechaza un archivo que no es foto y no deja archivos en el disco', async () => {
    const antes = fotosEnDisco().length;
    const respuesta = await crearTicketHttp(luis, DATOS_BASICOS, [
      ['equipo.png', PNG, 'image/png'],
      ['notas.txt', Buffer.from('hola'), 'text/plain'],
    ]);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores.fotos).toBe('Solo se permiten fotos JPG, PNG o WEBP.');
    expect(fotosEnDisco().length).toBe(antes);
  });

  test('si falla la validación después de subir las fotos, se borran del disco', async () => {
    const antes = fotosEnDisco().length;
    const respuesta = await crearTicketHttp(luis, { ...DATOS_BASICOS, diagnostico_inicial: '' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores.diagnostico_inicial).toBe('Describe el problema reportado por el cliente.');
    expect(fotosEnDisco().length).toBe(antes);
  });

  test('rollback: si el equipo nuevo falla, no queda el cliente nuevo ni el ticket ni fotos huérfanas', async () => {
    const tickets = await Ticket.count();
    const antes = fotosEnDisco().length;
    const respuesta = await crearTicketHttp(admin, {
      modo_cliente: 'nuevo', cliente_nombre: 'Cliente Revertido', cliente_telefono: '7999-0000',
      // DL-88291 ya existe: el cliente se inserta dentro de la transacción y luego falla el equipo
      equipo_tipo: 'Laptop', equipo_marca: 'Dell', equipo_modelo: 'Latitude', equipo_numero_serie: 'DL-88291',
      diagnostico_inicial: 'No enciende.',
    }, [['a.png', PNG, 'image/png'], ['b.png', PNG, 'image/png']]);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores).toEqual({ equipo_numero_serie: 'Ya existe un equipo con ese número de serie.' });
    expect(await Cliente.count({ where: { nombre: 'Cliente Revertido' } })).toBe(0);
    expect(await Ticket.count()).toBe(tickets);
    expect(fotosEnDisco().length).toBe(antes);
  });

  test('el equipo debe pertenecer al cliente elegido', async () => {
    const respuesta = await crearTicketHttp(luis, { ...DATOS_BASICOS, equipo_id: 1 });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores).toEqual({ equipo_id: 'Selecciona un equipo del cliente elegido o registra uno nuevo.' });
  });

  test('la fecha estimada no puede ser anterior a hoy', async () => {
    const respuesta = await crearTicketHttp(luis, { ...DATOS_BASICOS, fecha_estimada: '2020-01-01' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores.fecha_estimada).toBe('La fecha estimada no puede ser anterior a hoy.');
  });

  test('5 creaciones simultáneas producen folios distintos y consecutivos', async () => {
    const [{ maximo }] = await Ticket.sequelize.query(
      "SELECT MAX(CAST(SUBSTRING(folio, 9) AS UNSIGNED)) AS maximo FROM tickets WHERE folio LIKE 'TT-2026-%'",
      { type: 'SELECT' },
    );
    const archivos = Array.from({ length: 5 }, (_, i) => {
      const nombre = `simultanea-${i}.png`;
      fs.writeFileSync(path.join(directorioFotos, nombre), PNG);
      return { filename: nombre, path: path.join(directorioFotos, nombre) };
    });

    const tickets = await Promise.all(archivos.map((archivo) => TicketService.crear(
      { ...DATOS_BASICOS, diagnostico_inicial: 'Creación simultánea.' },
      [archivo],
      { id: USUARIOS.luis.id, rol: 'tecnico' },
    )));

    const numeros = tickets.map((t) => Number(t.folio.slice(8))).sort((a, b) => a - b);
    expect(new Set(tickets.map((t) => t.folio)).size).toBe(5);
    expect(numeros).toEqual([1, 2, 3, 4, 5].map((n) => Number(maximo) + n));
  });
});

describe('Listado y detalle (RN-02, RF-05)', () => {
  test('el técnico solo ve sus tickets; el filtro se aplica en el servicio', async () => {
    const { registros, total } = await TicketService.listar({ pagina: 1 }, { id: USUARIOS.jorge.id, rol: 'tecnico' });

    expect(total).toBeGreaterThan(0);
    registros.forEach((ticket) => expect(ticket.tecnico_id).toBe(USUARIOS.jorge.id));
  });

  test('en el listado HTML el técnico no ve tickets de otros', async () => {
    const respuesta = await luis.agente.get('/tickets');

    expect(respuesta.text).toContain('TT-2026-0040');
    expect(respuesta.text).not.toContain('TT-2026-0037');
    expect(respuesta.text).not.toContain('TT-2026-0038');
  });

  test('el admin filtra por estado y busca por folio o nombre del cliente', async () => {
    const porEstado = await admin.agente.get('/tickets?estado=Cancelado');
    const porFolio = await admin.agente.get('/tickets?q=0039');
    const porCliente = await admin.agente.get('/tickets?q=carlos');

    // Se revisan las celdas de la tabla (el placeholder del buscador también menciona un folio)
    const celda = (folio) => `<td>${folio}</td>`;
    expect(porEstado.text).toContain(celda('TT-2026-0038'));
    expect(porEstado.text).not.toContain(celda('TT-2026-0040'));
    expect(porFolio.text).toContain(celda('TT-2026-0039'));
    expect(porFolio.text).not.toContain(celda('TT-2026-0040'));
    expect(porCliente.text).toContain(celda('TT-2026-0038'));
    expect(porCliente.text).toContain(celda('TT-2026-0041'));
    expect(porCliente.text).not.toContain(celda('TT-2026-0040'));
  });

  test('el técnico recibe 403 en el detalle de un ticket que no es suyo', async () => {
    const respuesta = await luis.agente.get('/tickets/2');

    expect(respuesta.status).toBe(403);
    expect(respuesta.text).toContain('Este ticket no está asignado a ti.');
  });

  test('el detalle muestra cliente, equipo, cotización, historial en orden y fotos protegidas', async () => {
    const respuesta = await jorge.agente.get('/tickets/2');

    expect(respuesta.status).toBe(200);
    expect(respuesta.text).toContain('Ana Lucía Martínez');
    expect(respuesta.text).toContain('EP-40218');
    expect(respuesta.text).toContain('$45.00');
    const orden = ['Recibido', 'Diagnosticado', 'Esperando aprobación', 'En reparación']
      .map((estado) => respuesta.text.indexOf(`<span class="timeline-title">${estado}</span>`));
    expect(orden.every((posicion, i) => posicion > 0 && (i === 0 || posicion > orden[i - 1]))).toBe(true);
    expect(respuesta.text).toMatch(/<img class="photo-thumb" src="\/fotos\/\d+"/);
    expect(respuesta.text).not.toContain('/uploads/');
  });

  test('solo se habilitan los botones de las transiciones válidas; el resto se ve deshabilitado', async () => {
    const respuesta = await jorge.agente.get('/tickets/2'); // En reparación

    expect(respuesta.text).toContain('Pasar a &#34;Esperando repuesto&#34;');
    expect(respuesta.text).toContain('Pasar a &#34;Listo&#34;');
    expect(respuesta.text).toMatch(/<button type="button" class="btn btn-secondary" disabled[^>]*>Entregado<\/button>/);
    expect(respuesta.text).toMatch(/<button type="button" class="btn btn-secondary" disabled[^>]*>Esperando aprobación<\/button>/);
    expect(respuesta.text).not.toContain('Cancelar ticket'); // solo admin
  });

  test('el detalle del cliente y del equipo muestran su historial de tickets', async () => {
    const cliente = await admin.agente.get('/clientes/1');
    const equipo = await admin.agente.get('/equipos/1');
    const clienteParaLuis = await luis.agente.get('/clientes/1');

    for (const folio of ['TT-2026-0035', 'TT-2026-0039', 'TT-2026-0042']) {
      expect(cliente.text).toContain(folio);
      expect(equipo.text).toContain(folio);
    }
    // Luis solo tiene asignado TT-2026-0035 de ese cliente (RN-02)
    expect(clienteParaLuis.text).toContain('TT-2026-0035');
    expect(clienteParaLuis.text).not.toContain('TT-2026-0039');
  });
});

describe('Flujo de estados (HU-06, RN-01, RN-04)', () => {
  test('Recibido -> Diagnosticado registra el historial con el usuario', async () => {
    const ticket = await Ticket.findOne({ where: { folio: 'TT-2026-0046' } });

    const respuesta = await cambiarEstado(luis, ticket.id, { estado: 'Diagnosticado' });

    expect(respuesta.status).toBe(303);
    await ticket.reload();
    expect(ticket.estado).toBe('Diagnosticado');
    const ultimo = await TicketHistorial.findOne({ where: { ticket_id: ticket.id }, order: [['id', 'DESC']] });
    expect(ultimo).toMatchObject({ estado_anterior: 'Recibido', estado_nuevo: 'Diagnosticado', usuario_id: USUARIOS.luis.id });
  });

  test('una transición que salta estados se rechaza con 422', async () => {
    const respuesta = await cambiarEstado(luis, 6, { estado: 'Listo' }); // TT-2026-0041, Diagnosticado

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.mensaje).toMatch(/No se puede pasar de «Diagnosticado» a «Listo»/);
    expect((await Ticket.findByPk(6)).estado).toBe('Diagnosticado');
  });

  test('Esperando aprobación no se alcanza a mano: llega al crear una cotización (paso 7)', async () => {
    const respuesta = await cambiarEstado(luis, 6, { estado: 'Esperando_aprobacion' });

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.mensaje).toBe('El ticket pasa a «Esperando aprobación» automáticamente al crear una cotización.');
  });

  test('de Esperando aprobación solo sale con la respuesta del cliente', async () => {
    const respuesta = await cambiarEstado(luis, 5, { estado: 'En_reparacion' }); // TT-2026-0040

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.mensaje).toMatch(/Solo el cliente puede sacar el ticket/);
  });

  test('el técnico no puede cambiar el estado de un ticket ajeno', async () => {
    const respuesta = await cambiarEstado(luis, 2, { estado: 'Listo' });

    expect(respuesta.status).toBe(403);
    expect((await Ticket.findByPk(2)).estado).toBe('En_reparacion');
  });

  test('RN-01: no se puede volver a En reparación sin una cotización Aprobada', async () => {
    const equipo = await Ticket.findByPk(6);
    const ticket = await Ticket.create({
      folio: 'TT-2026-0900', equipo_id: equipo.equipo_id, tecnico_id: USUARIOS.luis.id,
      estado: 'Esperando_repuesto', diagnostico_inicial: 'Ticket de prueba sin cotización.',
    });

    const respuesta = await cambiarEstado(luis, ticket.id, { estado: 'En_reparacion' });

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.mensaje).toBe('No se puede pasar a «En reparación» sin una cotización aprobada por el cliente (RN-01).');
    expect((await Ticket.findByPk(ticket.id)).estado).toBe('Esperando_repuesto');
  });

  test('En reparación <-> Esperando repuesto con cotización aprobada', async () => {
    expect(await Cotizacion.count({ where: { ticket_id: 2, estado: 'Aprobada' } })).toBe(1);

    expect((await cambiarEstado(jorge, 2, { estado: 'Esperando_repuesto' })).status).toBe(303);
    expect((await cambiarEstado(jorge, 2, { estado: 'En_reparacion' })).status).toBe(303);
    expect((await Ticket.findByPk(2)).estado).toBe('En_reparacion');
  });

  test('Listo -> Entregado guarda fecha_entrega', async () => {
    expect((await Ticket.findByPk(4)).fecha_entrega).toBeNull(); // TT-2026-0039, Listo

    const respuesta = await cambiarEstado(jorge, 4, { estado: 'Entregado' });

    expect(respuesta.status).toBe(303);
    const ticket = await Ticket.findByPk(4);
    expect(ticket.estado).toBe('Entregado');
    expect(ticket.fecha_entrega).toBeInstanceOf(Date);
    expect(Date.now() - ticket.fecha_entrega.getTime()).toBeLessThan(60 * 1000);
  });
});

describe('Cancelación (solo admin, con motivo)', () => {
  test('el técnico no puede cancelar', async () => {
    const respuesta = await cambiarEstado(luis, 6, { estado: 'Cancelado', motivo: 'El cliente ya no quiere la reparación.' });

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.mensaje).toBe('Solo el administrador puede cancelar un ticket.');
  });

  test('el admin debe indicar un motivo', async () => {
    const respuesta = await cambiarEstado(admin, 6, { estado: 'Cancelado', motivo: '' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores.motivo).toMatch(/Indica el motivo/);
    expect((await Ticket.findByPk(6)).estado).toBe('Diagnosticado');
  });

  test('con motivo, el admin cancela: queda en el historial y se avisa al técnico', async () => {
    const motivo = 'El cliente retiró el equipo sin reparar.';
    const respuesta = await cambiarEstado(admin, 6, { estado: 'Cancelado', motivo });

    expect(respuesta.status).toBe(303);
    expect((await Ticket.findByPk(6)).estado).toBe('Cancelado');
    const ultimo = await TicketHistorial.findOne({ where: { ticket_id: 6 }, order: [['id', 'DESC']] });
    expect(ultimo).toMatchObject({
      estado_anterior: 'Diagnosticado', estado_nuevo: 'Cancelado', usuario_id: USUARIOS.admin.id, comentario: motivo,
    });
    await NotificacionListener.esperar();
    expect(await Notificacion.count({ where: { ticket_id: 6, usuario_id: USUARIOS.luis.id } })).toBe(1);
  });

  test('no se cancela un ticket Entregado', async () => {
    const respuesta = await cambiarEstado(admin, 1, { estado: 'Cancelado', motivo: 'Prueba de cancelación.' });

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.mensaje).toBe('El ticket está «Entregado» y ya no puede cambiar de estado.');
  });
});

describe('Reasignación (solo admin, a técnicos activos)', () => {
  const reasignar = (sesion, ticketId, tecnicoId) => enviarFormulario(sesion.agente, {
    metodo: 'PATCH', ruta: `/tickets/${ticketId}/tecnico`, csrfToken: sesion.csrfToken, json: true, datos: { tecnico_id: tecnicoId },
  });

  test('no se puede asignar a un técnico desactivado', async () => {
    const respuesta = await reasignar(admin, 7, USUARIOS.oscarInactivo.id);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores.tecnico_id).toBe('Óscar Meléndez está desactivado: elige un técnico activo.');
    expect((await Ticket.findByPk(7)).tecnico_id).toBeNull();
  });

  test('asigna a un técnico activo, lo registra en el historial y le envía una notificación', async () => {
    const respuesta = await reasignar(admin, 7, USUARIOS.luis.id); // TT-2026-0042, sin asignar

    expect(respuesta.status).toBe(303);
    expect((await Ticket.findByPk(7)).tecnico_id).toBe(USUARIOS.luis.id);
    const ultimo = await TicketHistorial.findOne({ where: { ticket_id: 7 }, order: [['id', 'DESC']] });
    expect(ultimo).toMatchObject({ estado_anterior: 'Recibido', estado_nuevo: 'Recibido', comentario: 'Asignado a Luis Fernández.' });
    await NotificacionListener.esperar();
    const aviso = await Notificacion.findOne({ where: { ticket_id: 7, usuario_id: USUARIOS.luis.id } });
    expect(aviso).toMatchObject({ mensaje: 'Se te asignó el ticket TT-2026-0042.', leida: false });
    // El técnico nuevo ya ve el ticket
    expect((await luis.agente.get('/tickets/7')).status).toBe(200);
  });

  test('al reasignar de un técnico a otro, la nota indica ambos', async () => {
    await reasignar(admin, 7, USUARIOS.jorge.id);

    const ultimo = await TicketHistorial.findOne({ where: { ticket_id: 7 }, order: [['id', 'DESC']] });
    expect(ultimo.comentario).toBe('Reasignado de Luis Fernández a Jorge Pineda.');
    expect((await luis.agente.get('/tickets/7')).status).toBe(403);
  });

  test('el técnico no puede reasignar', async () => {
    const respuesta = await reasignar(jorge, 7, USUARIOS.luis.id);

    expect(respuesta.status).toBe(403);
    expect((await Ticket.findByPk(7)).tecnico_id).toBe(USUARIOS.jorge.id);
  });
});

describe('Fotos protegidas', () => {
  let foto;

  beforeAll(async () => {
    const ticket = await Ticket.findOne({ where: { folio: 'TT-2026-0046' } });
    foto = await TicketFoto.findOne({ where: { ticket_id: ticket.id } });
  });

  test('no son archivos públicos: no hay URL estática para ellas', async () => {
    const respuesta = await crearAgente().get(`/uploads/tickets/${foto.url_foto}`);

    expect(respuesta.status).toBe(404);
  });

  test('el admin y el técnico asignado sí pueden verlas', async () => {
    const delAdmin = await admin.agente.get(`/fotos/${foto.id}`);
    const delTecnico = await luis.agente.get(`/fotos/${foto.id}`);

    expect(delAdmin.status).toBe(200);
    expect(delAdmin.headers['content-type']).toBe('image/png');
    expect(delAdmin.headers['cache-control']).toBe('private, no-store');
    expect(delTecnico.status).toBe(200);
  });

  test('otro técnico, un visitante sin sesión o el cliente de otro ticket reciben 403', async () => {
    const otroTecnico = await jorge.agente.get(`/fotos/${foto.id}`);
    const anonimo = await crearAgente().get(`/fotos/${foto.id}`);
    const clienteAjeno = crearAgente();
    await entrarAlPortal(clienteAjeno, { folio: 'TT-2026-0035', telefono: '7123-4567' });

    expect(otroTecnico.status).toBe(403);
    expect(anonimo.status).toBe(403);
    expect((await clienteAjeno.get(`/fotos/${foto.id}`)).status).toBe(403);
  });

  test('el cliente con la sesión de ese ticket sí puede verla', async () => {
    const ticket = await Ticket.findByPk(foto.ticket_id, { include: { association: 'equipo', include: ['cliente'] } });
    const cliente = crearAgente();
    await entrarAlPortal(cliente, { folio: ticket.folio, telefono: ticket.equipo.cliente.telefono });

    expect((await cliente.get(`/fotos/${foto.id}`)).status).toBe(200);
  });

  test('una foto que no existe responde 404', async () => {
    expect((await admin.agente.get('/fotos/999999')).status).toBe(404);
  });
});

describe('Portal del cliente (HU-04)', () => {
  test('muestra el estado, la fecha estimada y el historial del ticket correcto', async () => {
    const cliente = crearAgente();
    await entrarAlPortal(cliente);

    const respuesta = await cliente.get('/portal/ticket');

    expect(respuesta.text).toContain(`Ticket ${TICKET_PORTAL.folio} · Ana Lucía Martínez`);
    expect(respuesta.text).toContain('Fecha estimada de entrega</span><span class="detail-value">18/09/2026');
    const historial = [...respuesta.text.matchAll(/<span class="timeline-title">([^<]+)<\/span>/g)].map(([, e]) => e);
    expect(historial).toEqual(['Recibido', 'Diagnosticado', 'Esperando aprobación']);
    expect(respuesta.text).not.toContain('TT-2026-0037');
  });

  test('el historial del portal no muestra las reasignaciones internas ni comentarios', async () => {
    const ticket = await Ticket.findByPk(7, { include: { association: 'equipo', include: ['cliente'] } });
    const cliente = crearAgente();
    await entrarAlPortal(cliente, { folio: ticket.folio, telefono: ticket.equipo.cliente.telefono });
    await obtenerTokenCsrf(cliente);

    const respuesta = await cliente.get('/portal/ticket');

    const historial = [...respuesta.text.matchAll(/<span class="timeline-title">([^<]+)<\/span>/g)].map(([, e]) => e);
    expect(historial).toEqual(['Recibido']);
    expect(respuesta.text).not.toContain('Reasignado');
    expect(respuesta.text).not.toContain('Jorge Pineda');
  });
});
