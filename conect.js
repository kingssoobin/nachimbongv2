// conect.js - Nachimbong native bridge wrapper (corregido, expone initBT/resetDevice)
(function(){
  if(window.NachimbongConnect && window.NachimbongConnect._installed) return;
  function getStatusEl(){ return document.getElementById('status') || { innerText: '' }; }
  function safeSetStatus(msg){ try{ const el = getStatusEl(); el.innerText = msg; }catch(e){ console.warn('setStatus failed', e); } }
  function log(){ try{ console.log.apply(console, ['[NachimbongConnect]'].concat(Array.from(arguments))); }catch(e){} }

  const C = {};

  // initBT: trigger native pairing via bridge or webkit
  function _initBT_body(){
    safeSetStatus('Conectando Nachimbong...');
    try{
      if(window.bridge && typeof window.bridge.blePairingStart === 'function'){
        window.bridge.blePairingStart(''); safeSetStatus('Emparejando...');
        log('Called bridge.blePairingStart');
        return true;
      } else if(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.blePairingStart){
        window.webkit.messageHandlers.blePairingStart.postMessage(''); safeSetStatus('Emparejando (iOS)...');
        log('Called webkit.blePairingStart');
        return true;
      } else {
        safeSetStatus('⚠️ Bridge no disponible (solo funciona en la app).');
        log('Bridge not available for pairing');
        return false;
      }
    }catch(e){
      safeSetStatus('Error BT: ' + (e && e.message));
      console.error('initBT error', e);
      return false;
    }
  }

  // resetDevice body
  function _resetDevice_body(){
    safeSetStatus('Reiniciando Nachimbong...');
    try{
      const resetCmd = '8110,-';
      if(window.bridge && typeof window.bridge.bleSendCmdList === 'function'){
        window.bridge.bleSendCmdList(resetCmd);
        setTimeout(()=>{ try{ window.bridge.bleDisconnect(''); }catch(e){}; setTimeout(_initBT_body,2000); }, 500);
        safeSetStatus('Reiniciando... reconectando en 2s');
        return true;
      } else if(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bleSendCmdList){
        window.webkit.messageHandlers.bleSendCmdList.postMessage(resetCmd);
        setTimeout(()=>{ try{ window.webkit.messageHandlers.bleDisconnect?.postMessage(''); }catch(e){}; setTimeout(_initBT_body,2000); }, 500);
        safeSetStatus('Reiniciando... reconectando en 2s');
        return true;
      } else {
        safeSetStatus('⚠️ Bridge no disponible (no se puede reiniciar).');
        return false;
      }
    }catch(e){
      safeSetStatus('Error al reiniciar: ' + (e && e.message));
      console.error('resetDevice error', e);
      return false;
    }
  }

  // Expose as methods on C
  C.initBT = function(){ return _initBT_body(); };
  C.resetDevice = function(){ return _resetDevice_body(); };

  // low-level single command sender
  C.sendCmd = function(cmd){
    try{
      if(window.bridge && typeof window.bridge.bleSendCmdList === 'function'){
        window.bridge.bleSendCmdList(cmd); return true; }
      if(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bleSendCmdList){
        window.webkit.messageHandlers.bleSendCmdList.postMessage(cmd); return true; }
      log('No native bridge to send cmd', cmd && cmd.slice(0,80));
    }catch(e){ console.error('sendCmd error', e); }
    return false;
  };

  // sendOledChunks: robustly send 16 chunks + final commit
  C.sendOledChunks = async function(oledBytes, opts){
    opts = opts || {};
    const perChunkDelay = typeof opts.perChunkDelay === 'number' ? opts.perChunkDelay : 150;
    const perFinalDelay = typeof opts.perFinalDelay === 'number' ? opts.perFinalDelay : 200;
    if(!oledBytes || typeof oledBytes.slice !== 'function'){
      console.error('sendOledChunks: invalid oledBytes'); safeSetStatus('Error: datos inválidos'); return false;
    }
    try{
      for(let part=0; part<16; part++){
        const chunk = oledBytes.slice(part * 128, (part+1) * 128);
        const hexData = Array.from(chunk).map(b => b.toString(16).padStart(2,'0')).join('');
        const cmd = `810F00000000${part.toString(16).padStart(2,'0')}${hexData},-`;
        try{
          if(window.bridge && typeof window.bridge.bleSendCmdList === 'function'){
            window.bridge.bleSendCmdList(cmd);
          } else if(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bleSendCmdList){
            window.webkit.messageHandlers.bleSendCmdList.postMessage(cmd);
          } else {
            console.warn('No bridge while sending chunk', part);
            safeSetStatus('Bridge no disponible');
            return false;
          }
          try{ const el = document.getElementById('status'); if(el) el.innerText = `Enviando: ${Math.round(((part+1)/16)*100)}%`; }catch(e){}
          await new Promise(r => setTimeout(r, perChunkDelay));
        }catch(e){
          safeSetStatus('⚠️ Error en parte ' + (part+1)); console.error('Error sending part', part+1, e); return false;
        }
      }
      // final commit
      C.sendCmd('8110,-');
      await new Promise(r => setTimeout(r, perFinalDelay));
      safeSetStatus('✅ ¡Enviado correctamente!');
      return true;
    }catch(err){
      console.error('sendOledChunks error', err); safeSetStatus('Error de transferencia'); return false;
    }
  };

  // helper: wait for bridge to appear (optional)
  C.waitForBridge = function(timeoutMs){
    return new Promise((resolve) => {
      if(window.bridge || (window.webkit && window.webkit.messageHandlers)) return resolve(true);
      const start = Date.now();
      const iv = setInterval(()=>{
        if(window.bridge || (window.webkit && window.webkit.messageHandlers)){ clearInterval(iv); return resolve(true); }
        if(Date.now()-start > (timeoutMs || 3000)){ clearInterval(iv); return resolve(false); }
      }, 150);
    });
  };

  C._installed = true;
  window.NachimbongConnect = C;
  log('NachimbongConnect installed - corrected');
})();