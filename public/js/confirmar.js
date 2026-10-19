/**
 * Confirmación antes de eliminar o desactivar: todo formulario con
 * data-confirmar="mensaje" pide confirmación antes de enviarse.
 * (Archivo aparte porque la política de seguridad de helmet bloquea scripts en línea.)
 */
document.addEventListener('submit', (evento) => {
  const mensaje = evento.target.dataset && evento.target.dataset.confirmar;
  if (mensaje && !window.confirm(mensaje)) evento.preventDefault();
});
