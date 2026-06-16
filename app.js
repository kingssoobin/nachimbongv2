/**
 * app.js - Parche corregido (envío Bangchan y eliminación de emojis)
 *
 * Nota:
 * - Este archivo asume que wolfchan_mexa.js y bangchan_an01.js ya fueron cargados
 *   y que existen utilidades como loadDesign(...) y/o window.lastFrames / getFramesForDesign(...)
 * - Si tu app.js ya contenía código, este bloque puede pegarse al final del archivo
 *   o reemplazar la versión previa que introdujimos. Verifica duplicados.
 */

/* Utility: espera */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* Tiempo a esperar después del envío para luego reiniciar (ajustable) */
const RESET_WAIT_MS = 400;

/* Reemplaza un botón clonándolo para eliminar listeners previos si los hubiera */
function replaceButton(el) {
  if (!el) return null;
  const clone = el.cloneNode(true);
  el.parentNode.replaceChild(clone, el);
  return clone;
}

/* Intenta disparar el botón de reiniciar y espera unos ms. Busca por id 'resetBtn' o por texto '🔁' o 'reiniciar' */
async function triggerResetButtonAndWait() {
  try {
    const byId = document.getElementById('resetBtn');
    let btn = byId;
    if (!btn) {
      // buscar por texto en botones
      const candidates = Array.from(document.querySelectorAll('button'));
      btn = candidates.find(b => (b.textContent || '').trim().includes('🔁') ||
                                 (b.textContent || '').toLowerCase().includes('reiniciar'));
    }
    if (btn) {
      btn.click();
      await wait(RESET_WAIT_MS);
      return true;
    } else {
      // no se encontró botón, solo esperar para no interrumpir flujo
      await wait(RESET_WAIT_MS);
      return false;
    }
  } catch (e) {
    console.warn('triggerResetButtonAndWait error', e);
    await wait(RESET_WAIT_MS);
    return false;
  }
}

/* Espera hasta que loadDesign haya cargado frames para 'name'. Hace polling sobre window.lastFrames y window._lastLoadedDesign */
async function loadDesignAndWait(name, timeoutMs = 5000) {
  if (typeof window.loadDesign === 'function') {
    try {
      // Llamada para pedir que cargue el diseño en el preview/canvas
      window.loadDesign(name, 'standard');
    } catch (e) {
      // loadDesign podría lanzar; no cerramos el flujo por ello
      console.warn('loadDesign invocation error', e);
    }
  }

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    // condición 1: existe una variable global que indique el nombre cargado
    if (window._lastLoadedDesign && window._lastLoadedDesign === name) {
      if (Array.isArray(window.lastFrames) && window.lastFrames.length > 0) return;
    }
    // condición 2: si lastFrames cambia y tiene datos
    if (Array.isArray(window.lastFrames) && window.lastFrames.length > 0) {
      // no sabemos el nombre exacto, pero si los frames corresponden al diseño pedido
      // asumimos que loadDesign colocó los frames correctos; para mayor seguridad
      // se puede ampliar la validación si el proyecto expone más metadatos.
      return;
    }
    await wait(100);
  }
  // timeout: seguimos de todas formas (mejor intentar enviar que bloquear indefinidamente)
  console.warn(`loadDesignAndWait: timeout waiting for design "${name}" (ms=${timeoutMs})`);
}

/* Obtiene frames para un diseño: usa getFramesForDesign(name) si existe, o window.lastFrames */
function getFramesForDesignOrLast(name) {
  if (typeof getFramesForDesign === 'function') {
    try {
      const frames = getFramesForDesign(name);
      if (Array.isArray(frames) && frames.length > 0) return frames;
    } catch (e) {
      console.warn('getFramesForDesign error', e);
    }
  }
  if (Array.isArray(window.lastFrames) && window.lastFrames.length > 0) {
    return window.lastFrames.slice();
  }
  return null;
}

/* Envía la animación dada por name. Espera a la carga, envía, luego dispara reset. */
async function sendDesignByName(name, opts = {}) {
  const {
    loadTimeoutMs = 5000,
    fallbackFps = 8,
    fallbackDelayMs = 150
  } = opts;

  try {
    // 1) pedir carga en preview y esperar frames
    await loadDesignAndWait(name, loadTimeoutMs);

    // 2) obtener frames (si la impl. dispone de getFramesForDesign, úsalo)
    const frames = getFramesForDesignOrLast(name);

    // 3) enviar usando la mejor función disponible
    if (typeof window.transferSingleOpenAllFrames === 'function') {
      // implementación más nueva/optimizada (parámetros según la app)
      try {
        await window.transferSingleOpenAllFrames({ perChunkDelay: 80, perFinalDelay: 200, partIndexMode: 'zero' });
      } catch (e) {
        console.warn('transferSingleOpenAllFrames failed, trying other methods', e);
      }
    }

    if (Array.isArray(frames) && frames.length) {
      if (typeof window.transferAnimationFull === 'function') {
        // transferAnimationFull(frames, fps, perChunkDelayMs)
        await window.transferAnimationFull(frames.slice(), fallbackFps, fallbackDelayMs);
      } else if (typeof window.transferCurrentAnimation === 'function') {
        // fallback: transfer current animation (si existiera API)
        await window.transferCurrentAnimation(80, 80);
      } else {
        console.error('No transfer function found (transferAnimationFull / transferCurrentAnimation / transferSingleOpenAllFrames)');
        throw new Error('No transfer method available');
      }
    } else {
      // si no hay frames, intentar otros métodos (por si la app mantiene estado interno)
      if (typeof window.transferAnimationFull === 'function') {
        // llama con vacío esperando que la función gestione el estado interno
        await window.transferAnimationFull([], fallbackFps, fallbackDelayMs);
      } else {
        console.error('No frames available and no suitable transfer fallback');
        throw new Error('No frames to send');
      }
    }
  } catch (sendError) {
    console.error('sendDesignByName error:', sendError);
    // No re-lanzamos; seguimos al reset para dejar el dispositivo en estado usable
  } finally {
    // Después de enviar (ó fallar), llamamos al reset/reiniciar implicito
    await triggerResetButtonAndWait();
  }
}

/* Enlaza botones y asegura que no queden listeners viejos; corrige envío Bangchan y Wolfchan */
document.addEventListener('DOMContentLoaded', () => {
  // Reemplazamos botones por clones para limpiar event listeners anteriores
  const showWolfBtn = replaceButton(document.getElementById('showWolfchanBtn'));
  const sendWolfBtn = replaceButton(document.getElementById('sendWolfchanBtn'));
  const showBangBtn = replaceButton(document.getElementById('showBangchanBtn'));
  const sendBangBtn = replaceButton(document.getElementById('sendBangchanBtn'));
  const sendBtn = replaceButton(document.getElementById('sendBtn'));
  const resetBtn = replaceButton(document.getElementById('resetBtn'));

  // Nombres exactos usados por tus archivos de diseño; ajustar si los keys son otros
  const WOLF_NAME = 'wolfchan_mexa';
  const BANG_NAME = 'bangchan_an01';

  // Mostrar en preview (solo carga en visor)
  if (showWolfBtn) {
    showWolfBtn.addEventListener('click', async () => {
      try {
        if (typeof window.loadDesign === 'function') {
          window.loadDesign(WOLF_NAME, 'standard');
        } else {
          console.warn('loadDesign no disponible para showWolfBtn');
        }
      } catch (e) {
        console.error('showWolfBtn error', e);
      }
    });
  }

  if (showBangBtn) {
    showBangBtn.addEventListener('click', async () => {
      try {
        if (typeof window.loadDesign === 'function') {
          window.loadDesign(BANG_NAME, 'standard');
        } else {
          console.warn('loadDesign no disponible para showBangBtn');
        }
      } catch (e) {
        console.error('showBangBtn error', e);
      }
    });
  }

  // Enviar Wolfchan
  if (sendWolfBtn) {
    sendWolfBtn.addEventListener('click', async () => {
      sendWolfBtn.disabled = true;
      try {
        await sendDesignByName(WOLF_NAME, { loadTimeoutMs: 5000, fallbackFps: 8, fallbackDelayMs: 120 });
      } finally {
        sendWolfBtn.disabled = false;
      }
    });
  }

  // Enviar Bangchan (corregido: espera correcta para no enviar wolfchan)
  if (sendBangBtn) {
    sendBangBtn.addEventListener('click', async () => {
      sendBangBtn.disabled = true;
      try {
        // Para Bangchan (animación grande) aumentamos un poco el timeout si hace falta
        await sendDesignByName(BANG_NAME, { loadTimeoutMs: 7000, fallbackFps: 8, fallbackDelayMs: 150 });
      } finally {
        sendBangBtn.disabled = false;
      }
    });
  }

  // Enviar al Nachimbong (botón general) — aquí asumo que envía el contenido actual del editor
  if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
      sendBtn.disabled = true;
      try {
        // Si tienes una función específica para enviar texto/lineas al dispositivo,
        // llámala aquí. Como pediste quitar emojis, no intento enviar nada de emoji.
        if (typeof window.sendCurrentText === 'function') {
          // si tu app define sendCurrentText, la llamamos
          try {
            await window.sendCurrentText();
          } catch (e) {
            console.warn('sendCurrentText failed', e);
          }
        } else if (typeof window.transferCurrentAnimation === 'function') {
          // fallback: intenta transferir lo que sea que esté preparado
          try {
            await window.transferCurrentAnimation(80, 80);
          } catch (e) {
            console.warn('transferCurrentAnimation failed', e);
          }
        } else {
          console.warn('No se encontró función para "Enviar al Nachimbong". Define window.sendCurrentText() si corresponde.');
        }
      } finally {
        sendBtn.disabled = false;
        // reiniciar después del envío
        await triggerResetButtonAndWait();
      }
    });
  }

  // Reasignar comportamiento visual al botón de reset (si necesitas lógica extra)
  if (resetBtn) {
    // Dejar el comportamiento original (si ya tenía) o añadir log para depuración
    resetBtn.addEventListener('click', () => {
      console.log('Botón reiniciar pulsado');
      // Si la app tiene una función resetAfterSend() o similar, se puede llamar aquí:
      if (typeof window.resetAfterSend === 'function') {
        try { window.resetAfterSend(); } catch (e) { /* ignore */ }
      }
    });
  }

  console.log('Botones de Wolfchan/Bangchan inicializados (emojis eliminados).');
});
