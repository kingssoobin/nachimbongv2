// app.js — Bridge-only version para WebView native
// - Usa únicamente window.bridge (o window.webkit.messageHandlers)
// - Dos botones: "wolfchan mexa" y "bangchan"
// - Dibuja en canvas y envía la(s) trama(s) al bridge con bleSendCmdList

(function(){
  const statusEl = document.getElementById('status');
  const btnWolf = document.getElementById('btnWolf');
  const btnBang = document.getElementById('btnBang');
  const canvas = document.getElementById('oledCanvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const CANVAS_W = canvas.width;
  const CANVAS_H = canvas.height;

  function logStatus(s){ statusEl.textContent = 'Estado: ' + s; }

  // Detectar bridge (WebView)
  function hasBridge(){
    return !!(window.bridge || (window.webkit && window.webkit.messageHandlers));
  }

  function callBridgeFn(name, payload){
    // Intenta llamar al bridge nativo. Muchas implementaciones toman JSON string.
    return new Promise((resolve, reject) => {
      try{
        if(window.bridge && typeof window.bridge[name] === 'function'){
          // algunas bridges esperan string; otras pueden aceptar objetos. usamos string para compat.
          const arg = (typeof payload === 'undefined') ? undefined : JSON.stringify(payload);
          const res = window.bridge[name](arg);
          // Puede ser sincrono; envolver en Promise
          resolve(res);
          return;
        }
        if(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers[name]){
          window.webkit.messageHandlers[name].postMessage(payload || {});
          resolve(true);
          return;
        }
        reject(new Error('bridge.fn no disponible: ' + name));
      }catch(err){
        reject(err);
      }
    });
  }

  function bridgeSendCmdList(cmds){
    // cmds: array de objetos o strings según lo que quieras enviar al native
    if(!hasBridge()) return Promise.reject(new Error('bridge no disponible'));
    // Intentar llamar bleSendCmdList primero, si no existe, probar bleSkinUpdate o bleSend
    if(window.bridge && typeof window.bridge.bleSendCmdList === 'function'){
      // enviar JSON string (muchas implementaciones lo esperan así)
      return callBridgeFn('bleSendCmdList', { cmds: cmds });
    }
    if(window.bridge && typeof window.bridge.bleSkinUpdate === 'function'){
      return callBridgeFn('bleSkinUpdate', { cmds: cmds });
    }
    // iOS WebKit handler fallback named 'bleSendCmdList'
    if(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bleSendCmdList){
      return callBridgeFn('bleSendCmdList', { cmds: cmds });
    }
    return Promise.reject(new Error('No se encontró método de envío en bridge'));
  }

  // --- Conversión simple de canvas a "chunks" (ejemplo) ---
  // Empaqueta el canvas en filas monocromo: cada byte = 8 píxeles (MSB primero) -> hex string
  function canvasToMonoHexFrames(){
    const img = ctx.getImageData(0,0,CANVAS_W,CANVAS_H);
    const data = img.data;
    const bytes = [];
    for(let y=0; y<CANVAS_H; y++){
      let bitIdx = 0;
      let currentByte = 0;
      for(let x=0; x<CANVAS_W; x++){
        const i = (y * CANVAS_W + x) * 4;
        // luminancia simple
        const r = data[i], g = data[i+1], b = data[i+2];
        const lum = 0.299*r + 0.587*g + 0.114*b;
        const bit = lum > 128 ? 0 : 1; // 1 = pixel encendido (negro)
        currentByte = (currentByte << 1) | bit;
        bitIdx++;
        if(bitIdx === 8){
          bytes.push(currentByte & 0xFF);
          bitIdx = 0;
          currentByte = 0;
        }
      }
      if(bitIdx !== 0){ // rellenar el último byte de la fila
        currentByte = currentByte << (8 - bitIdx);
        bytes.push(currentByte & 0xFF);
        bitIdx = 0;
        currentByte = 0;
      }
    }
    // Convertir a hex string compacta
    const hex = bytes.map(b => b.toString(16).padStart(2,'0')).join('').toUpperCase();
    return hex;
  }

  // Dibuja una imagen (Image object) escalada al canvas manteniendo aspect ratio y centrada
  function drawImageToCanvas(img){
    ctx.clearRect(0,0,CANVAS_W,CANVAS_H);
    // mantener aspect ratio y cubrir el canvas (fit)
    const scale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const dx = Math.round((CANVAS_W - w) / 2);
    const dy = Math.round((CANVAS_H - h) / 2);
    ctx.drawImage(img, dx, dy, w, h);
  }

  // Dibuja un frame desde un hex string donde cada bit representa un pixel (arriba-izquierda a la derecha)
  function drawHexFrame(hex){
    // hex length should be CANVAS_W * CANVAS_H / 8
    const bytes = [];
    for(let i=0;i<hex.length;i+=2){
      bytes.push(parseInt(hex.substr(i,2),16));
    }
    const img = ctx.createImageData(CANVAS_W, CANVAS_H);
    let byteIndex = 0;
    for(let y=0;y<CANVAS_H;y++){
      for(let x=0;x<CANVAS_W;x+=8){
        const b = bytes[byteIndex++] || 0;
        for(let bit=0; bit<8; bit++){
          const px = x + (7 - bit); // asumimos MSB -> pixel izquierdo
          if(px >= CANVAS_W) continue;
          const on = ((b >> bit) & 1) === 1;
          const i = (y * CANVAS_W + px) * 4;
          const color = on ? 0 : 255; // on = negro
          img.data[i] = img.data[i+1] = img.data[i+2] = color;
          img.data[i+3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // Envío del diseño "wolfchan" usando wolfchan_mexa.png o datos desde wolfchan_mexa.js (si están disponibles)
  async function sendWolfchan(){
    try{
      logStatus('Preparando imagen wolfchan...');
      // Preferir si existe un objeto con la información (wolfchan_mexa.js puede exponer MIS_DISENOS.wolfchan_mexaImagePath)
      const img = new Image();
      img.crossOrigin = 'anonymous';
      // Si wolfchan_mexa.js definió MIS_DISENOS.wolfchan_mexaPath o similar, usarlo:
      if(window.MIS_DISENOS && window.MIS_DISENOS.wolfchan_mexa && window.MIS_DISENOS.wolfchan_mexa.src){
        img.src = window.MIS_DISENOS.wolfchan_mexa.src;
      } else {
        // por defecto, buscar archivo wolfchan_mexa.png en la misma carpeta
        img.src = 'wolfchan_mexa.png';
      }
      await new Promise((resolve,reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('No se pudo cargar wolfchan_mexa.png'));
      });
      drawImageToCanvas(img);

      // convertir a hex frame
      const hex = canvasToMonoHexFrames();
      logStatus('Imagen lista — enviando via bridge...');
      // Preparar comandos (este formato es genérico; adapta si tu native espera otro)
      const cmds = [
        { type: 'push_frame', data: hex, meta: { width: CANVAS_W, height: CANVAS_H } }
      ];
      await bridgeSendCmdList(cmds);
      logStatus('Enviado: wolfchan mexa');
    }catch(err){
      console.error(err);
      logStatus('Error: ' + (err.message || err));
      alert('Error en sendWolfchan: ' + (err.message || err));
    }
  }

  // Reproduce animación bangchan (usa frames desde bangchan_an01.js — MIS_ANIMACIONES.bangchan_an01)
  async function sendBangchan(){
    try{
      if(!window.MIS_ANIMACIONES || !window.MIS_ANIMACIONES.bangchan_an01){
        alert('No se encontró la animación bangchan_an01 (asegúrate de cargar bangchan_an01.js)');
        return;
      }
      const framesGroup = window.MIS_ANIMACIONES.bangchan_an01[0];
      if(!framesGroup || framesGroup.length === 0){
        alert('Animación vacía');
        return;
      }
      logStatus('Preparando animación bangchan...');
      // Mostrar la animación en canvas (ráfagas) y enviar cada frame al bridge
      for(let i=0;i<framesGroup.length;i++){
        const hex = framesGroup[i];
        drawHexFrame(hex);
        // preparar comando para cada frame
        const cmds = [{ type:'push_frame', data: hex, meta:{ idx:i, width:CANVAS_W, height:CANVAS_H } }];
        try {
          await bridgeSendCmdList(cmds);
        } catch(err){
          // No interrumpir la reproducción si el bridge falla; loguear y continuar
          console.warn('Error enviando frame', i, err);
          throw err; // opcional: si prefieres detener en la primera falla, lanza
        }
        // pequeña pausa para visualización
        await new Promise(r => setTimeout(r, 120)); // 120ms entre frames (ajusta si quieres)
      }
      logStatus('Animación bangchan enviada');
    }catch(err){
      console.error(err);
      logStatus('Error: ' + (err.message || err));
      alert('Error en sendBangchan: ' + (err.message || err));
    }
  }

  // Inicialización: vincular botones y verificar bridge
  function init(){
    if(!hasBridge()){
      logStatus('bridge no disponible — esto debe correr dentro de la WebView nativa');
      btnWolf.disabled = true;
      btnBang.disabled = true;
      return;
    }
    logStatus('bridge detectado');
    btnWolf.disabled = false;
    btnBang.disabled = false;

    btnWolf.addEventListener('click', sendWolfchan);
    btnBang.addEventListener('click', sendBangchan);
  }

  // Ejecutar init en DOMContentLoaded (por si se carga late)
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
