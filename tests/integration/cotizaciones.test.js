/**
 * Cotizaciones y notificaciones (HU-03, HU-05, HU-10; RN-01, RN-05, RN-06, RN-09):
 * creación desde el detalle, total calculado en el servidor, respuesta del
 * cliente en el portal (con bloqueo ante respuestas dobles), cotización
 * adicional, eventos después del commit, notificaciones y el flujo completo.
 *
 * Datos de los seeders que se usan:
 * - TT-2026-0041 (id 6, Luis): Diagnosticado, sin cotización.
 * - TT-2026-0043 (id 8, Luis): cotización 6 Pendiente reciente; José, 7456-1230.
 * - TT-2026-0040 (id 5, Luis): cotización 5 Pendiente de septiembre (RN-05); Ana, 7345-6720.
 * - TT-2026-0037 (id 2, Jorge): En reparación con cotización Aprobada; Ana.
 */
const fs = require('fs');
const {
  Ticket, Cotizacion, CotizacionItem, CatalogoItem, TicketHistorial, Notificacion,
} = require('../../models');
const CotizacionService = require('../../services/CotizacionService');
const NotificacionListener = require('../../services/eventos/NotificacionListener');
const { directorioFotos } = require('../../config/env');
const { sembrarDatos, cerrarConexiones } = require('../helpers/baseDatos');
const {
  USUARIOS, crearAgente, crearAgenteAutenticado, enviarFormulario, entrarAlPortal, obtenerTokenCsrf,
} = require('../helpers/agente');

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);

let admin;
let luis;
let jorge;

beforeAll(async () => {
  await sembrarDatos();
  fs.mkdirSync(directorioFotos, { recursive: true });
  admin = await crearAgenteAutenticado({ correo: USUARIOS.admin.correo });
  luis = await crearAgenteAutenticado({ correo: USUARIOS.luis.correo });
  jorge = await crearAgenteAutenticado({ correo: USUARIOS.jorge.correo });
});
afterAll(async () => {
  fs.rmSync(directorioFotos, { recursive: true, force: true });
  await cerrarConexiones();
});

/** Envía el formulario de nueva cotización (listas paralelas catalogo_id[] y cantidad[]). */
function cotizar(sesion, ticketId, lineas, extra = {}, json = true) {
  return enviarFormulario(sesion.agente, {
    ruta: '/cotizaciones',
    csrfToken: sesion.csrfToken,
    json,
    datos: {
      ticket_id: ticketId, catalogo_id: lineas.map(([id]) => id), cantidad: lineas.map(([, cantidad]) => cantidad), ...extra,
    },
  });
}

/** Cliente con sesión del portal para un ticket. */
async function clientePortal(folio, telefono) {
  const agente = crearAgente();
  await entrarAlPortal(agente, { folio, telefono });
  const csrfToken = await obtenerTokenCsrf(agente);
  return { agente, csrfToken };
}

/** Respuesta del cliente desde el portal. */
function responder(cliente, cotizacionId, decision, datos = {}, json = false) {
  let peticion = cliente.agente.post(`/portal/cotizaciones/${cotizacionId}/${decision}`).type('form');
  if (json) peticion = peticion.set('Accept', 'application/json');
  return peticion.send({ _csrf: cliente.csrfToken, ...datos });
}

/** Ticket Diagnosticado nuevo para un técnico (sobre un equipo de los seeders). */
let contadorFolio = 8000;
function ticketDiagnosticado(tecnicoId = USUARIOS.luis.id, estado = 'Diagnosticado') {
  contadorFolio += 1;
  return Ticket.create({
    folio: `TT-2026-${contadorFolio}`, equipo_id: 3, tecnico_id: tecnicoId, estado, diagnostico_inicial: 'Ticket de prueba para cotizar.',
  });
}

const notificacionesDe = async (usuarioId, ticketId) => {
  await NotificacionListener.esperar();
  return Notificacion.findAll({ where: { usuario_id: usuarioId, ticket_id: ticketId }, order: [['id', 'ASC']] });
};

describe('Detalle del ticket y RN-05', () => {
  test('una cotización Pendiente vencida muestra la alerta ámbar con los días transcurridos', async () => {
    const respuesta = await luis.agente.get('/tickets/5'); // TT-2026-0040, del 12/09/2026

    expect(respuesta.text).toMatch(/<div class="alert alert-confirmacion" role="status">\s*<strong>Pendiente de respuesta:<\/strong> el cliente no ha respondido desde hace \d+ días/);
    expect(respuesta.text).toContain('Memoria RAM 8GB DDR4');
    expect(respuesta.text).toContain('$60.00');
    expect(respuesta.text).toContain('href="/cotizaciones/5/editar"');
    expect(respuesta.text).not.toContain('Generar cotización'); // ya hay una Pendiente (RN-09)
  });

  test('una Pendiente reciente no muestra la alerta', async () => {
    const respuesta = await luis.agente.get('/tickets/8');

    expect(respuesta.text).not.toContain('Pendiente de respuesta:');
  });

  test('el listado y el dashboard admin marcan la cotización vencida y cuentan el KPI', async () => {
    const listado = await admin.agente.get('/tickets?q=0040');
    const dashboard = await admin.agente.get('/admin');

    expect(listado.text).toContain('Pendiente de respuesta</span>');
    expect(dashboard.text).toMatch(/kpi-value">1<\/span>\s*<span class="kpi-label">Cotizaciones pendientes de respuesta/);
    expect((await admin.agente.get('/cotizaciones?vencidas=1')).text).toContain('TT-2026-0040');
  });

  test('un ticket Diagnosticado ofrece "Generar cotización"', async () => {
    const respuesta = await luis.agente.get('/tickets/6');

    expect(respuesta.text).toContain('href="/cotizaciones/nueva?ticket_id=6"');
  });
});

describe('Crear cotizaciones (HU-03, RF-06, RN-06, RN-09)', () => {
  test('pasa el ticket a Esperando aprobación con el total calculado en el servidor (se ignora el del formulario)', async () => {
    const respuesta = await cotizar(luis, 6, [[1, 1], [4, 2]], { total: '0.01', precio_unitario: ['0.01', '0.01'] }, false);

    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.location).toBe('/tickets/6');
    const cotizacion = await Cotizacion.findOne({ where: { ticket_id: 6 }, include: 'items' });
    expect(cotizacion).toMatchObject({ estado: 'Pendiente', total: 80 }); // 10 + 2 x 35
    expect(cotizacion.items.map((i) => [i.catalogo_id, i.cantidad, i.precio_unitario]).sort()).toEqual([[1, 1, 10], [4, 2, 35]]);
    expect((await Ticket.findByPk(6)).estado).toBe('Esperando_aprobacion');
    const ultimo = await TicketHistorial.findOne({ where: { ticket_id: 6 }, order: [['id', 'DESC']] });
    expect(ultimo).toMatchObject({ estado_anterior: 'Diagnosticado', estado_nuevo: 'Esperando_aprobacion', usuario_id: USUARIOS.luis.id });

    const detalle = await luis.agente.get('/tickets/6');
    expect(detalle.text).toContain('Cotización enviada al cliente por $80.00.');
  });

  test('no se puede crear otra si ya hay una Pendiente (RN-09)', async () => {
    const respuesta = await cotizar(luis, 6, [[2, 1]]);

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.mensaje).toBe('El ticket ya tiene una cotización pendiente. Solo puede haber una a la vez (RN-09).');
    expect(await Cotizacion.count({ where: { ticket_id: 6 } })).toBe(1);
  });

  test('un ítem desactivado del catálogo se rechaza y no se crea nada', async () => {
    const ticket = await ticketDiagnosticado();
    await CatalogoItem.update({ activo: false }, { where: { id: 3 } });

    const respuesta = await cotizar(luis, ticket.id, [[1, 1], [3, 1]]);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errores.items).toBe('"Instalación de sistema operativo" está desactivado en el catálogo y no se puede cotizar.');
    expect(await Cotizacion.count({ where: { ticket_id: ticket.id } })).toBe(0);
    expect((await Ticket.findByPk(ticket.id)).estado).toBe('Diagnosticado');
    await CatalogoItem.update({ activo: true }, { where: { id: 3 } });
  });

  test('el formulario solo ofrece ítems activos', async () => {
    const ticket = await ticketDiagnosticado();
    await CatalogoItem.update({ activo: false }, { where: { id: 3 } });

    const formulario = await luis.agente.get(`/cotizaciones/nueva?ticket_id=${ticket.id}`);

    expect(formulario.text).toContain('Diagnóstico general');
    expect(formulario.text).not.toContain('Instalación de sistema operativo');
    await CatalogoItem.update({ activo: true }, { where: { id: 3 } });
  });

  test('un técnico no puede cotizar un ticket ajeno', async () => {
    const ticket = await ticketDiagnosticado(USUARIOS.luis.id);

    const respuesta = await cotizar(jorge, ticket.id, [[1, 1]]);

    expect(respuesta.status).toBe(403);
    expect(await Cotizacion.count({ where: { ticket_id: ticket.id } })).toBe(0);
    expect((await jorge.agente.get(`/cotizaciones/nueva?ticket_id=${ticket.id}`)).status).toBe(403);
  });

  test('no se cotiza un ticket Recibido', async () => {
    const ticket = await ticketDiagnosticado(USUARIOS.luis.id, 'Recibido');

    const respuesta = await cotizar(luis, ticket.id, [[1, 1]]);

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.mensaje).toMatch(/^Solo se puede cotizar un ticket Diagnosticado/);
  });

  test('el precio se copia al cotizar: un cambio posterior del catálogo no altera la cotización', async () => {
    const ticket = await ticketDiagnosticado();
    await cotizar(luis, ticket.id, [[2, 1]]);
    await CatalogoItem.update({ precio_referencia: 99 }, { where: { id: 2 } });

    const cotizacion = await Cotizacion.findOne({ where: { ticket_id: ticket.id }, include: 'items' });

    expect(cotizacion.total).toBe(15);
    expect(cotizacion.items[0].precio_unitario).toBe(15);
    await CatalogoItem.update({ precio_referencia: 15 }, { where: { id: 2 } });
  });

  test('una cotización Pendiente se puede editar y recalcula el total', async () => {
    const ticket = await ticketDiagnosticado();
    await cotizar(luis, ticket.id, [[1, 1]]);
    const cotizacion = await Cotizacion.findOne({ where: { ticket_id: ticket.id } });

    const respuesta = await enviarFormulario(luis.agente, {
      metodo: 'PUT', ruta: `/cotizaciones/${cotizacion.id}`, csrfToken: luis.csrfToken,
      datos: { catalogo_id: ['1', '5'], cantidad: ['1', '2'], total: '1.00' },
    });

    expect(respuesta.status).toBe(303);
    await cotizacion.reload();
    expect(cotizacion.total).toBe(120); // 10 + 2 x 55
    expect(await CotizacionItem.count({ where: { cotizacion_id: cotizacion.id } })).toBe(2);
  });
});

describe('Respuesta del cliente en el portal (HU-05, RN-01, RN-06)', () => {
  test('el portal muestra la cotización Pendiente con sus ítems, el total y los botones', async () => {
    const cliente = await clientePortal('TT-2026-0043', '7456-1230');

    const respuesta = await cliente.agente.get('/portal/ticket');

    expect(respuesta.text).toContain('Disco SSD 480GB');
    expect(respuesta.text).toContain('$65.00');
    expect(respuesta.text).toContain('Aprobar cotización</button>');
    expect(respuesta.text).toContain('Rechazar cotización</button>');
    expect(respuesta.text).toContain('name="motivo"');
  });

  test('el cliente aprueba: cotización Aprobada, ticket En reparación, historial del cliente y aviso al técnico y al admin', async () => {
    const cliente = await clientePortal('TT-2026-0043', '7456-1230');

    const respuesta = await responder(cliente, 6, 'aprobar');

    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.location).toBe('/portal/ticket');
    expect((await Cotizacion.findByPk(6)).estado).toBe('Aprobada');
    expect((await Ticket.findByPk(8)).estado).toBe('En_reparacion');
    const ultimo = await TicketHistorial.findOne({ where: { ticket_id: 8 }, order: [['id', 'DESC']] });
    expect(ultimo).toMatchObject({
      estado_anterior: 'Esperando_aprobacion', estado_nuevo: 'En_reparacion', usuario_id: null, comentario: 'El cliente aprobó la cotización.',
    });
    const [alTecnico] = await notificacionesDe(USUARIOS.luis.id, 8);
    expect(alTecnico).toMatchObject({ tipo: 'cotizacion_respondida', leida: false, mensaje: 'El cliente aprobó la cotización del ticket TT-2026-0043.' });
    expect(await notificacionesDe(USUARIOS.admin.id, 8)).toHaveLength(1);

    const portal = await cliente.agente.get('/portal/ticket');
    expect(portal.text).toContain('Aprobaste la cotización');
    expect(portal.text).toContain('<span class="badge badge-azul badge-lg">En reparación</span>');
    expect(portal.text).not.toContain('Aprobar cotización</button>');
  });

  test('responder dos veces da un error claro y no duplica cambios ni avisos', async () => {
    const cliente = await clientePortal('TT-2026-0043', '7456-1230');
    const historialAntes = await TicketHistorial.count({ where: { ticket_id: 8 } });

    const segunda = await responder(cliente, 6, 'rechazar', {}, true);

    expect(segunda.status).toBe(422);
    expect(segunda.body.mensaje).toBe('Esta cotización ya fue aprobada. No se puede responder dos veces.');
    expect((await Cotizacion.findByPk(6)).estado).toBe('Aprobada');
    expect(await TicketHistorial.count({ where: { ticket_id: 8 } })).toBe(historialAntes);
    expect(await notificacionesDe(USUARIOS.luis.id, 8)).toHaveLength(1);
  });

  test('dos respuestas simultáneas (doble clic): solo una se aplica', async () => {
    const ticket = await ticketDiagnosticado();
    const cotizacion = await CotizacionService.crear(ticket.id, { catalogo_id: ['1'], cantidad: ['1'] }, { id: USUARIOS.luis.id, rol: 'tecnico' });
    const sesion = { clienteTicketId: ticket.id };

    const resultados = await Promise.allSettled([
      CotizacionService.responder(cotizacion.id, 'aprobar', sesion),
      CotizacionService.responder(cotizacion.id, 'aprobar', sesion),
    ]);

    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const [fallida] = resultados.filter((r) => r.status === 'rejected');
    expect(fallida.reason.message).toBe('Esta cotización ya fue aprobada. No se puede responder dos veces.');
    expect(await TicketHistorial.count({ where: { ticket_id: ticket.id, estado_nuevo: 'En_reparacion' } })).toBe(1);
    expect(await notificacionesDe(USUARIOS.luis.id, ticket.id)).toHaveLength(1);
  });

  test('un cliente no puede responder la cotización de otro ticket', async () => {
    // Ana entra con TT-2026-0040 e intenta la cotización de un ticket que no es el suyo
    const otro = await ticketDiagnosticado();
    const ajena = await CotizacionService.crear(otro.id, { catalogo_id: ['1'], cantidad: ['1'] }, { id: USUARIOS.luis.id, rol: 'tecnico' });
    const ana = await clientePortal('TT-2026-0040', '7345-6720');

    const respuesta = await responder(ana, ajena.id, 'aprobar', {}, true);

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.mensaje).toBe('Esta cotización no pertenece a tu ticket.');
    expect((await Cotizacion.findByPk(ajena.id)).estado).toBe('Pendiente');
  });

  test('sin sesión del portal no se puede responder', async () => {
    const anonimo = crearAgente();
    const csrfToken = await obtenerTokenCsrf(anonimo);

    const respuesta = await responder({ agente: anonimo, csrfToken }, 5, 'aprobar');

    expect(respuesta.status).toBe(303);
    expect(respuesta.headers.location).toBe('/portal');
    expect((await Cotizacion.findByPk(5)).estado).toBe('Pendiente');
  });

  test('el cliente rechaza con motivo: cotización Rechazada, ticket Cancelado y avisos con el motivo', async () => {
    const ana = await clientePortal('TT-2026-0040', '7345-6720');

    const respuesta = await responder(ana, 5, 'rechazar', { motivo: 'Prefiero comprar una laptop nueva' });

    expect(respuesta.status).toBe(303);
    expect((await Cotizacion.findByPk(5)).estado).toBe('Rechazada');
    expect((await Ticket.findByPk(5)).estado).toBe('Cancelado');
    const ultimo = await TicketHistorial.findOne({ where: { ticket_id: 5 }, order: [['id', 'DESC']] });
    expect(ultimo).toMatchObject({
      estado_nuevo: 'Cancelado', usuario_id: null, comentario: 'El cliente rechazó la cotización. Motivo: Prefiero comprar una laptop nueva',
    });
    const [alTecnico] = await notificacionesDe(USUARIOS.luis.id, 5);
    expect(alTecnico.mensaje).toBe('El cliente rechazó la cotización del ticket TT-2026-0040. Motivo: Prefiero comprar una laptop nueva');
    expect(await notificacionesDe(USUARIOS.admin.id, 5)).toHaveLength(1);
    expect((await ana.agente.get('/portal/ticket')).text).toContain('Registramos que rechazaste la cotización');
  });
});

describe('Cotización adicional y eventos después del commit', () => {
  test('desde En reparación: el ticket vuelve a Esperando aprobación y el cliente la aprueba', async () => {
    const respuesta = await cotizar(jorge, 2, [[5, 1]]); // TT-2026-0037, de Jorge

    expect(respuesta.status).toBe(303);
    expect((await Ticket.findByPk(2)).estado).toBe('Esperando_aprobacion');
    const ultimo = await TicketHistorial.findOne({ where: { ticket_id: 2 }, order: [['id', 'DESC']] });
    expect(ultimo).toMatchObject({ estado_anterior: 'En_reparacion', estado_nuevo: 'Esperando_aprobacion' });
    expect(ultimo.comentario).toBe('Cotización adicional enviada al cliente por $55.00.');

    const ana = await clientePortal('TT-2026-0037', '7345-6720');
    const adicional = await Cotizacion.findOne({ where: { ticket_id: 2, estado: 'Pendiente' } });
    await responder(ana, adicional.id, 'aprobar');

    expect((await Ticket.findByPk(2)).estado).toBe('En_reparacion');
    expect(await Cotizacion.count({ where: { ticket_id: 2, estado: 'Aprobada' } })).toBe(2);
    const detalle = await jorge.agente.get('/tickets/2');
    expect(detalle.text).toContain('Cotizaciones anteriores');
  });

  test('un error dentro de la transacción no deja cambios ni genera notificaciones', async () => {
    const ticket = await ticketDiagnosticado();
    const cotizacion = await CotizacionService.crear(ticket.id, { catalogo_id: ['1'], cantidad: ['1'] }, { id: USUARIOS.luis.id, rol: 'tecnico' });
    const espia = jest.spyOn(TicketHistorial, 'create').mockRejectedValueOnce(new Error('Falla simulada'));

    await expect(CotizacionService.responder(cotizacion.id, 'aprobar', { clienteTicketId: ticket.id })).rejects.toThrow('Falla simulada');
    espia.mockRestore();

    expect((await Cotizacion.findByPk(cotizacion.id)).estado).toBe('Pendiente');
    expect((await Ticket.findByPk(ticket.id)).estado).toBe('Esperando_aprobacion');
    expect(await notificacionesDe(USUARIOS.luis.id, ticket.id)).toHaveLength(0);
    expect(await notificacionesDe(USUARIOS.admin.id, ticket.id)).toHaveLength(0);
  });

  test('si el admin cambia el estado de un ticket, se avisa al técnico; si lo hace el técnico, no', async () => {
    await enviarFormulario(admin.agente, {
      metodo: 'PATCH', ruta: '/tickets/8/estado', csrfToken: admin.csrfToken, datos: { estado: 'Esperando_repuesto' },
    });
    await enviarFormulario(luis.agente, {
      metodo: 'PATCH', ruta: '/tickets/8/estado', csrfToken: luis.csrfToken, datos: { estado: 'En_reparacion' },
    });

    const avisos = (await notificacionesDe(USUARIOS.luis.id, 8)).filter((n) => n.tipo === 'ticket_estado');
    expect(avisos.map((n) => n.mensaje)).toEqual(['El administrador pasó el ticket TT-2026-0043 a «Esperando repuesto».']);
  });
});

describe('Notificaciones (HU-10, RF-12)', () => {
  test('la barra muestra el contador de no leídas y el dashboard del técnico la alerta de respuestas', async () => {
    const total = await Notificacion.count({ where: { usuario_id: USUARIOS.luis.id, leida: false } });
    const dashboard = await luis.agente.get('/tecnico');

    expect(total).toBeGreaterThan(0);
    expect(dashboard.text).toContain(`<span class="contador-notificaciones" data-contador>${total}</span>`);
    expect(dashboard.text).toMatch(/clientes? respondi(ó|eron)<\/strong> una cotización/);
  });

  test('el endpoint de no leídas devuelve el conteo y marcar como leídas lo actualiza', async () => {
    const total = await Notificacion.count({ where: { usuario_id: USUARIOS.luis.id, leida: false } });
    const consulta = await luis.agente.get('/notificaciones/no-leidas').set('Accept', 'application/json');
    expect(consulta.body).toEqual({ total });

    const una = await Notificacion.findOne({ where: { usuario_id: USUARIOS.luis.id, leida: false } });
    const marcar = await enviarFormulario(luis.agente, {
      metodo: 'PATCH', ruta: `/notificaciones/${una.id}/leida`, csrfToken: luis.csrfToken, json: true,
    });
    expect(marcar.body).toEqual({ id: una.id, leida: true });
    expect((await luis.agente.get('/notificaciones/no-leidas')).body).toEqual({ total: total - 1 });

    await enviarFormulario(luis.agente, { metodo: 'PATCH', ruta: '/notificaciones/leidas', csrfToken: luis.csrfToken });
    expect((await luis.agente.get('/notificaciones/no-leidas')).body).toEqual({ total: 0 });
    expect((await luis.agente.get('/tecnico')).text).not.toContain('una cotización.');
  });

  test('nadie puede marcar ni ver notificaciones de otro usuario', async () => {
    // Un aviso que solo tiene el admin (Jorge tiene otros con el mismo texto de los seeders)
    const deAdmin = await Notificacion.findOne({ where: { usuario_id: USUARIOS.admin.id, ticket_id: 8, leida: false } });

    const respuesta = await enviarFormulario(jorge.agente, {
      metodo: 'PATCH', ruta: `/notificaciones/${deAdmin.id}/leida`, csrfToken: jorge.csrfToken, json: true,
    });

    expect(respuesta.status).toBe(404);
    expect((await Notificacion.findByPk(deAdmin.id)).leida).toBe(false);
    expect((await jorge.agente.get('/notificaciones')).text).not.toContain(deAdmin.mensaje);
  });

  test('sin sesión, el endpoint responde 401', async () => {
    const respuesta = await crearAgente().get('/notificaciones/no-leidas').set('Accept', 'application/json');

    expect(respuesta.status).toBe(401);
  });
});

describe('Flujo completo de punta a punta', () => {
  test('crear ticket -> Diagnosticado -> cotizar -> el cliente aprueba -> En reparación -> Listo -> Entregado', async () => {
    // 1. Luis registra el ticket con un cliente y un equipo nuevos
    let peticion = luis.agente.post(`/tickets?_csrf=${encodeURIComponent(luis.csrfToken)}`);
    const campos = {
      modo_cliente: 'nuevo', cliente_nombre: 'Marta Flores', cliente_telefono: '7888-1234',
      equipo_tipo: 'Laptop', equipo_marca: 'Asus', equipo_modelo: 'X515', equipo_numero_serie: 'AS-E2E-1',
      diagnostico_inicial: 'No enciende después de una caída.',
    };
    Object.entries(campos).forEach(([campo, valor]) => { peticion = peticion.field(campo, valor); });
    const creado = await peticion.attach('fotos', PNG, { filename: 'frente.png', contentType: 'image/png' });
    expect(creado.status).toBe(303);
    const ticketId = Number(creado.headers.location.split('/').pop());
    const { folio } = await Ticket.findByPk(ticketId);

    const cambiar = (estado) => enviarFormulario(luis.agente, {
      metodo: 'PATCH', ruta: `/tickets/${ticketId}/estado`, csrfToken: luis.csrfToken, json: true, datos: { estado },
    });

    // 2. Diagnóstico y 3. cotización
    expect((await cambiar('Diagnosticado')).status).toBe(303);
    expect((await cotizar(luis, ticketId, [[1, 1], [5, 1]])).status).toBe(303);
    // RN-01: no se puede reparar sin la aprobación del cliente
    expect((await cambiar('En_reparacion')).status).toBe(422);

    // 4. El cliente aprueba desde el portal (otra sesión, como una ventana de incógnito)
    const cliente = await clientePortal(folio, '78881234');
    const cotizacion = await Cotizacion.findOne({ where: { ticket_id: ticketId } });
    expect((await responder(cliente, cotizacion.id, 'aprobar')).status).toBe(303);

    // 5. Reparación terminada y entrega
    expect((await cambiar('Listo')).status).toBe(303);
    expect((await cambiar('Entregado')).status).toBe(303);

    const ticket = await Ticket.findByPk(ticketId, { include: 'historial', order: [[{ model: TicketHistorial, as: 'historial' }, 'id', 'ASC']] });
    expect(ticket.estado).toBe('Entregado');
    expect(ticket.fecha_entrega).toBeInstanceOf(Date);
    expect(ticket.historial.map((h) => [h.estado_anterior, h.estado_nuevo, h.usuario_id])).toEqual([
      [null, 'Recibido', USUARIOS.luis.id],
      ['Recibido', 'Diagnosticado', USUARIOS.luis.id],
      ['Diagnosticado', 'Esperando_aprobacion', USUARIOS.luis.id],
      ['Esperando_aprobacion', 'En_reparacion', null],
      ['En_reparacion', 'Listo', USUARIOS.luis.id],
      ['Listo', 'Entregado', USUARIOS.luis.id],
    ]);

    // Notificaciones: la aprobación le llega al técnico y al admin (los cambios del propio técnico no notifican)
    const delTecnico = await notificacionesDe(USUARIOS.luis.id, ticketId);
    expect(delTecnico.map((n) => n.tipo)).toEqual(['cotizacion_respondida']);
    expect(await notificacionesDe(USUARIOS.admin.id, ticketId)).toHaveLength(1);

    // El cliente ve el historial completo y el estado final
    const portal = await cliente.agente.get('/portal/ticket');
    const estados = [...portal.text.matchAll(/<span class="timeline-title">([^<]+)<\/span>/g)].map(([, e]) => e);
    expect(estados).toEqual(['Recibido', 'Diagnosticado', 'Esperando aprobación', 'En reparación', 'Listo', 'Entregado']);
  });
});
