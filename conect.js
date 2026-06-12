// conect.js - separated Bluetooth/native bridge logic for Nachimbong
(function(){
  if(window.NachimbongConnect && window.NachimbongConnect._installed) return;
  const C = {};

  // Original initBT (moved from app.js)
  function initBT(){
      statusEl.innerText = 'Conectando Nachimbong...';
      try{
        if(window.bridge && typeof window.bridge.blePairingStart === 'function'){
          window.bridge.blePairingStart(''); statusEl.innerText = 'Emparejando...';
        } else if(window.webkit?.messageHandlers?.blePairingStart){
          window.webkit.messageHandlers.blePairingStart.postMessage(''); statusEl.innerText = 'Emparejando (iOS)...';
        } else {
          statusEl.innerText = '⚠️ Bridge no disponible (solo funciona en la app).';
        }
      }catch(e){ statusEl.innerText = 'Error BT: ' + (e && e.message); }
    }

  // Original resetDevice (moved from app.js)
  function resetDevice(){
      statusEl.innerText = 'Reiniciando Nachimbong...';
      try{
        const resetCmd = '8110,-';
        if(window.bridge) {
          window.bridge.bleSendCmdList(resetCmd);
          setTimeout(()=>{ window.bridge.bleDisconnect(''); setTimeout(initBT,2000); }, 500);
        } else if(window.webkit?.messageHandlers?.bleSendCmdList){
          window.webkit.messageHandlers.bleSendCmdList.postMessage(resetCmd);
          setTimeout(()=>{ window.webkit.messageHandlers.bleDisconnect?.postMessage(''); setTimeout(initBT,2000); }, 500);
        }
        statusEl.innerText = 'Reiniciando... reconectando en 2s';
      }catch(e){ statusEl.innerText = 'Error al reiniciar: ' + (e && e.message); }
    }

  // low-level send for a single command
  C.sendCmd = function(cmd){
    try{
      if(window.bridge && typeof window.bridge.bleSendCmdList === 'function'){ window.bridge.bleSendCmdList(cmd); return true; }
      if(window.webkit?.messageHandlers?.bleSendCmdList){ window.webkit.messageHandlers.bleSendCmdList.postMessage(cmd); return true; }
      console.warn('No native bridge to send cmd:', cmd.slice(0,80));
    }catch(e){ console.error('sendCmd error', e); }
    return false;
  };

  // sendOledChunks: send 16 chunks (oledBytes is Uint8Array or array-like)
  C.sendOledChunks = async function(oledBytes, opts){
    opts = opts || {};
    const perChunkDelay = typeof opts.perChunkDelay === 'number' ? opts.perChunkDelay : 150;
    const perFinalDelay = typeof opts.perFinalDelay === 'number' ? opts.perFinalDelay : 200;
    if(!oledBytes || typeof oledBytes.slice !== 'function'){
      console.error('sendOledChunks: invalid oledBytes'); return false; }
    try{
      for(let part=0; part<16; part++){
        const chunk = oledBytes.slice(part * 128, (part+1) * 128);
        const hexData = Array.from(chunk).map(b => b.toString(16).padStart(2,'0')).join('');
        const cmd = `810F00000000${part.toString(16).padStart(2,'0')}${hexData},-`;
        try{
          if(window.bridge && typeof window.bridge.bleSendCmdList === 'function') window.bridge.bleSendCmdList(cmd);
          else if(window.webkit?.messageHandlers?.bleSendCmdList) window.webkit.messageHandlers.bleSendCmdList.postMessage(cmd);
          try{ const el = document.getElementById('status'); if(el) el.innerText = `Enviando: ${Math.round(((part+1)/16)*100)}%`; }catch(e){}
          await new Promise(r => setTimeout(r, perChunkDelay));
        }catch(e){ console.error('Error sending part', part+1, e); return false; }
      }
      // final commit
      C.sendCmd('8110,-');
      await new Promise(r => setTimeout(r, perFinalDelay));
      return true;
    }catch(err){ console.error('sendOledChunks error', err); return false; }
  };

  C._installed = true;
  window.NachimbongConnect = C;
})();