/**
 * Contador de notificaciones de la barra superior (HU-10): consulta
 * GET /notificaciones/no-leidas cada 30 segundos y lo actualiza sin recargar.
 * Si la sesión venció (401) deja de consultar.
 */
(() => {
  const enlace = document.querySelector('[data-notificaciones]');
  if (!enlace) return;
  const contador = enlace.querySelector('[data-contador]');
  const INTERVALO_MS = 30 * 1000;

  function mostrar(total) {
    contador.textContent = total;
    contador.hidden = total === 0;
    enlace.setAttribute('aria-label', `Notificaciones: ${total} sin leer`);
  }

  let temporizador = null;
  async function actualizar() {
    // No se consulta con la pestaña oculta; se actualiza al volver a ella
    if (document.hidden) return;
    try {
      const respuesta = await fetch('/notificaciones/no-leidas', { headers: { Accept: 'application/json' } });
      if (respuesta.status === 401) {
        clearInterval(temporizador);
        return;
      }
      if (respuesta.ok) mostrar((await respuesta.json()).total);
    } catch {
      // Sin conexión: se intentará en la siguiente vuelta
    }
  }

  temporizador = setInterval(actualizar, INTERVALO_MS);
  document.addEventListener('visibilitychange', actualizar);
})();
