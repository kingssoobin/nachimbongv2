// app.js - Nachimbong OLED Studio (modificado para botones Bangchan/Wolfchan)
(function(){
  // Canvas y utilidades
  const canvas = document.getElementById('canvas');
  if(!canvas) {
    console.warn('canvas no encontrado');
    return;
  }
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const statusEl = document.getElementById('status') || { innerText: '' };

  // util hex->bytes
  function hexToBytes(hex) {
    const clean = String(hex||'').replace(/[^0-9a-fA-F]/g,'');
    const len = Math.floor(clean.length/2);
    const out = new Uint8Array(len);
    for(let i=0;i<len;i++) out[i] = parseInt(clean.substr(i*2,2),16);
    return out;
  }

  // Dibuja un frame hex en el canvas (espera 2048 bytes -> 128x128 monochrome)
  function drawHexFrameToCanvas(hex) {
    const bytes = hexToBytes(hex);
    const img = ctx.createImageData(128,128);
    for(let i=0;i<2048;i++){
      const b = bytes[i]||0;
      for(let bit=0;bit<8;bit++){
        const px = i*8 + bit;
        const col = (b >> bit) & 1 ? 255 : 0;
        const idx = px*4;
        img.data[idx] = col; img.data[idx+1]=col; img.data[idx+2]=col; img.data[idx+3]=255;
      }
    }
    ctx.putImageData(img,0,0);
  }

  // find frames helper
  function findAnimationFrames(sourceName){
    const lookup = {
      bangchan: ['BANGCHAN_ANIMATIONS','BANGCHAN','MIS_ANIMATIONS','bangchanAnimations'],
      wolfchan: ['WOLFCHAN_ANIMATIONS','wolfchanAnimations','MIS_DISENOS_WOLFCHAN']
    }[sourceName] || ['BANGCHAN_ANIMATIONS','WOLFCHAN_ANIMATIONS','MIS_ANIMATIONS','MIS_DISENOS_WOLFCHAN'];

    for(const ns of lookup){
      const obj = window[ns];
      if(!obj) continue;
      // si hay propiedad principal
      for(const k of Object.keys(obj)){
        if(k==='__names') continue;
        if(Array.isArray(obj[k]) && obj[k].length) return obj[k];
      }
      // si el objeto es directamente un array
      if(Array.isArray(obj) && obj.length) return obj;
    }
    return null;
  }

  // Envío usando protocolo Bangchan (16 partes de 128 bytes + commit)
  async function transferWithProtocol(framesHexArray, opts){
    opts = opts||{}; const perChunkDelay = opts.perChunkDelay||80; const perFinalDelay = opts.perFinalDelay||180;
    if(!Array.isArray(framesHexArray) || framesHexArray.length===0) throw new Error('No frames');

    // helper sendCmd
    function sendCmd(cmd){
      try{
        if(window.NachimbongConnect && typeof window.NachimbongConnect.sendCmd === 'function'){
          window.NachimbongConnect.sendCmd(cmd);
          return true;
        }
        if(window.bridge && typeof window.bridge.bleSendCmdList === 'function'){
          window.bridge.bleSendCmdList(cmd);
          return true;
        }
        if(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bleSendCmdList){
          window.webkit.messageHandlers.bleSendCmdList.postMessage(cmd);
          return true;
        }
      }catch(e){console.warn('sendCmd failed',e)}
      return false;
    }

    // If NachimbongSender exists, prefer it
    if(window.NachimbongSender && typeof window.NachimbongSender.transferSingleOpenAllFrames === 'function'){
      return window.NachimbongSender.transferSingleOpenAllFrames(framesHexArray, { perChunkDelay, perFinalDelay });
    }

    for(let fidx=0; fidx<framesHexArray.length; fidx++){
      const hex = String(framesHexArray[fidx]||'').replace(/[^0-9a-fA-F]/g,'');
      // warn if length unexpected
      if(hex.length < 4096) console.warn('frame length < 4096 hex chars:', hex.length);
      for(let part=0; part<16; part++){
        const partHex = part.toString(16).padStart(2,'0');
        const slice = hex.substr(part*256, 256) || ''.padEnd(256,'0');
        const cmd = `810F00000000${partHex}${slice},-`;
        const ok = sendCmd(cmd);
        if(!ok) throw new Error('No bridge to send chunk');
        await new Promise(r=>setTimeout(r, perChunkDelay));
      }
      // commit
      sendCmd('8110,-');
      statusEl.innerText = `Frame ${fidx+1}/${framesHexArray.length} enviado`;
      await new Promise(r=>setTimeout(r, perFinalDelay));
    }

    statusEl.innerText = 'Transferencia completada';
    return true;
  }

  // UI buttons creation (no duplicados)
  function ensureButtons(){
    let ctr = document.getElementById('nachimbong_controls');
    if(!ctr){ ctr = document.createElement('div'); ctr.id='nachimbong_controls'; ctr.style.display='flex'; ctr.style.flexDirection='column'; ctr.style.gap='8px'; const host = document.querySelector('.send-card') || document.body; host.appendChild(ctr); }

    if(!document.getElementById('send_bangchan_btn')){
      const b = document.createElement('button'); b.id='send_bangchan_btn'; b.className='btn-sec'; b.innerText='Enviar Bangchan (Protocolo)'; b.onclick = async ()=>{
        try{ b.disabled=true; const frames = findAnimationFrames('bangchan'); if(!frames) return alert('No se encontraron animaciones Bangchan'); await transferWithProtocol(frames); alert('Bangchan enviado'); }catch(e){console.error(e); alert('Error: '+e.message);}finally{b.disabled=false;}
      }; ctr.appendChild(b);
    }

    if(!document.getElementById('send_wolfchan_btn')){
      const w = document.createElement('button'); w.id='send_wolfchan_btn'; w.className='btn-sec'; w.innerText='Enviar Wolfchan MEXA (Protocolo Bangchan)'; w.onclick = async ()=>{
        try{ w.disabled=true; const frames = findAnimationFrames('wolfchan'); if(!frames) return alert('No se encontraron animaciones Wolfchan'); await transferWithProtocol(frames); alert('Wolfchan enviado'); }catch(e){console.error(e); alert('Error: '+e.message);}finally{w.disabled=false;}
      }; ctr.appendChild(w);
    }
  }

  // expose helpers globalmente
  window.transferWithProtocol = transferWithProtocol;
  window.sendWolfchanProtocol = async ()=>{ const frames = findAnimationFrames('wolfchan'); if(!frames) return alert('No frames'); await transferWithProtocol(frames); };
  window.sendBangchanProtocol = async ()=>{ const frames = findAnimationFrames('bangchan'); if(!frames) return alert('No frames'); await transferWithProtocol(frames); };

  // Load first available frame on DOM ready
  document.addEventListener('DOMContentLoaded', ()=>{
    ensureButtons();
    // try draw first available frame
    const f = findAnimationFrames('wolfchan') || findAnimationFrames('bangchan');
    if(f && f.length) try{ drawHexFrameToCanvas(f[0]); }catch(e){}
  });

})();
