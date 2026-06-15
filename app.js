// app.js - simplified: two buttons (wolfchan & bangchan) show on canvas and send via bridge
(function(){
  const canvas = document.getElementById('canvas');
  if(!canvas) return console.warn('Canvas no encontrado');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const statusEl = document.getElementById('status') || { innerText: '' };

  function setStatus(t){ try{ statusEl.innerText = t; }catch(e){} }

  function cleanHex(s){ return String(s||'').replace(/[^0-9a-fA-F]/g,''); }
  function hexToBytes(hex){ const h = cleanHex(hex); const out = new Uint8Array(h.length/2); for(let i=0;i<out.length;i++) out[i]=parseInt(h.substr(i*2,2),16); return out; }

  function drawHexFrameToCanvas(hex){
    try{
      const bytes = hexToBytes(hex);
      const img = ctx.createImageData(128,128);
      for(let i=0;i<2048;i++){
        const b = bytes[i] || 0;
        for(let bit=0; bit<8; bit++){
          const px = i*8 + bit;
          const col = ((b >> bit) & 1) ? 255 : 0;
          const idx = px*4;
          img.data[idx]=col; img.data[idx+1]=col; img.data[idx+2]=col; img.data[idx+3]=255;
        }
      }
      ctx.putImageData(img,0,0);
    }catch(e){ console.error('draw error', e); }
  }

  function findFrames(namespace){
    const candidates = {
      wolf: ['WOLFCHAN_ANIMATIONS','MIS_DISENOS_WOLFCHAN','MIS_DISENOS_WOLFCHAN','MIS_ANIMACIONES','WOLFCHAN'],
      bang: ['MIS_ANIMATIONS','MIS_ANIMACIONES','BANGCHAN_ANIMATIONS','BANGCHAN','bangchan_an01']
    };
    const list = (namespace==='wolf') ? candidates.wolf : (namespace==='bang') ? candidates.bang : [...candidates.wolf, ...candidates.bang];
    for(const ns of list){
      const obj = window[ns];
      if(!obj) continue;
      // if object has direct frames under key
      for(const k of Object.keys(obj)){
        if(k==='__names') continue;
        if(Array.isArray(obj[k]) && obj[k].length) return obj[k];
      }
      if(Array.isArray(obj) && obj.length) return obj;
    }
    return null;
  }

  async function transferFrames(frames, opts){
    opts = opts || {};
    const perChunkDelay = opts.perChunkDelay || 80;
    const perFinalDelay = opts.perFinalDelay || 180;
    if(!frames || !frames.length) throw new Error('No frames');

    // Prefer NachimbongSender
    if(window.NachimbongSender && typeof window.NachimbongSender.transferSingleOpenAllFrames === 'function'){
      setStatus('Usando NachimbongSender...');
      return window.NachimbongSender.transferSingleOpenAllFrames(frames, { perChunkDelay, perFinalDelay });
    }

    // Otherwise use NachimbongConnect.sendOledChunks (expects bytes)
    if(window.NachimbongConnect && typeof window.NachimbongConnect.sendOledChunks === 'function'){
      for(let i=0;i<frames.length;i++){
        const bytes = hexToBytes(frames[i]);
        setStatus(`Enviando frame ${i+1}/${frames.length}...`);
        const ok = await window.NachimbongConnect.sendOledChunks(bytes, { perChunkDelay, perFinalDelay });
        if(!ok) throw new Error('Error enviando frame '+(i+1));
      }
      setStatus('Transferencia completada');
      return true;
    }

    // Fallback: build commands and use bridge directly
    function sendCmd(cmd){
      try{
        if(window.NachimbongConnect && typeof window.NachimbongConnect.sendCmd === 'function'){ window.NachimbongConnect.sendCmd(cmd); return true; }
        if(window.bridge && typeof window.bridge.bleSendCmdList === 'function'){ window.bridge.bleSendCmdList(cmd); return true; }
        if(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bleSendCmdList){ window.webkit.messageHandlers.bleSendCmdList.postMessage(cmd); return true; }
      }catch(e){ console.warn('sendCmd failed', e); }
      return false;
    }

    for(let f=0; f<frames.length; f++){
      const hex = cleanHex(frames[f]);
      for(let part=0; part<16; part++){
        const slice = hex.substr(part*256, 256).padEnd(256,'0');
        const cmd = `810F00000000${part.toString(16).padStart(2,'0')}${slice},-`;
        const ok = sendCmd(cmd);
        if(!ok) throw new Error('Bridge no disponible');
        await new Promise(r=>setTimeout(r, perChunkDelay));
      }
      sendCmd('8110,-');
      await new Promise(r=>setTimeout(r, perFinalDelay));
      setStatus(`Frame ${f+1}/${frames.length} enviado`);
    }
    setStatus('Transferencia completada');
    return true;
  }

  // animate frames on canvas (returns controller with stop())
  function animateFrames(frames, ms){
    let idx = 0; let stopped = false; let iv = null;
    const play = ()=>{
      if(stopped) return;
      drawHexFrameToCanvas(frames[idx]);
      idx = (idx+1) % frames.length;
    };
    play();
    iv = setInterval(play, ms||200);
    return {
      stop(){ stopped = true; if(iv) clearInterval(iv); }
    };
  }

  // Combined actions
  async function onWolfclick(){
    try{
      const frames = findFrames('wolf');
      if(!frames) return alert('No se encontraron animaciones Wolfchan');
      // show first frame
      drawHexFrameToCanvas(frames[0]);
      setStatus('Preparando envío Wolfchan...');
      await transferFrames(frames);
      alert('Wolfchan enviado');
    }catch(e){ console.error(e); alert('Error: '+e.message); setStatus('Error: '+(e.message||e)); }
  }

  async function onBangclick(){
    try{
      const frames = findFrames('bang');
      if(!frames) return alert('No se encontraron animaciones Bangchan');
      // animate locally while sending
      const player = animateFrames(frames, 150);
      setStatus('Preparando envío Bangchan...');
      await transferFrames(frames);
      player.stop();
      alert('Bangchan enviado');
    }catch(e){ console.error(e); alert('Error: '+e.message); setStatus('Error: '+(e.message||e)); }
  }

  // hookup buttons
  document.addEventListener('DOMContentLoaded', ()=>{
    const w = document.getElementById('wolfBtn');
    const b = document.getElementById('bangchanBtn');
    const init = document.getElementById('initBTBtn');
    if(w) w.addEventListener('click', onWolfclick);
    if(b) b.addEventListener('click', onBangclick);
    if(init) init.addEventListener('click', ()=>{ if(window.NachimbongConnect && typeof window.NachimbongConnect.initBT === 'function') window.NachimbongConnect.initBT(); else setStatus('Bridge no disponible'); });

    // Draw preview if available
    const preview = findFrames('wolf') || findFrames('bang');
    if(preview && preview.length) try{ drawHexFrameToCanvas(preview[0]); }catch(e){}
  });

  // export for debugging
  window._nachim_debug = { drawHexFrameToCanvas, transferFrames };
})();
