/**
 * Rutas: Usuarios — montadas en /usuarios (routes/index.js).
 *
 * HU-09, RF-09, RN-07, RN-08 (solo admin):
 *   GET    /usuarios                listado con rol y estado
 *   GET    /usuarios/nuevo          formulario de nuevo técnico
 *   POST   /usuarios                crea (contraseña temporal con bcrypt)
 *   GET    /usuarios/:id/editar     formulario de edición
 *   PUT    /usuarios/:id            actualiza nombre y correo
 *   PATCH  /usuarios/:id/activo     activa o desactiva (activo=true|false)
 *   GET    /usuarios/:id/password   formulario para restablecer la contraseña
 *   PUT    /usuarios/:id/password   restablece la contraseña
 *   DELETE /usuarios/:id            elimina (solo cuentas sin historial)
 *
 * Acceso: solo admin.
 */
const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const validar = require('../middlewares/validar');
const { requireAuth, checkRole } = require('../middlewares/auth');
const { reglasDatosUsuario, reglasNuevoTecnico, reglasPassword } = require('../validators/usuarioValidators');
const UsuariosController = require('../controllers/usuariosController');

const router = Router();

router.use(requireAuth, checkRole('admin'));

router.get('/', asyncHandler(UsuariosController.listar));
router.get('/nuevo', UsuariosController.nuevo);
router.post('/', validar(reglasNuevoTecnico), asyncHandler(UsuariosController.crear));
router.get('/:id/editar', asyncHandler(UsuariosController.editar));
router.put('/:id', validar(reglasDatosUsuario), asyncHandler(UsuariosController.actualizar));
router.patch('/:id/activo', asyncHandler(UsuariosController.cambiarEstado));
router.get('/:id/password', asyncHandler(UsuariosController.formularioPassword));
router.put('/:id/password', validar(reglasPassword), asyncHandler(UsuariosController.restablecerPassword));
router.delete('/:id', asyncHandler(UsuariosController.eliminar));

module.exports = router;
