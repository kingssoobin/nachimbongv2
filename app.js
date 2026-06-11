// app.fixed.js
(function(){
  // Safe element getters
  const canvas = document.getElementById('canvas');
  if (!canvas) return console.warn('canvas element not found');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const statusEl = document.getElementById('status') || { innerText: '' };

  // UI state
  let isDrawing = false;
  let selectedFont = 'Arial';
  let numLines = 1;

  // EMOJIS
  const emojiCats = {
    fav:     ['❤','⭐','⚡','🔥','👑','🐺','🌙','✨','🎵','💎','🦋','🌸','💫','🎀','🏆','🌈'],
    faces:   ['😀','😍','🥰','😎','🤩','😭','😤','🥺','😂','🤣','😊','🙃','😏','🤔','😴','👻'],
    nature:  ['🌸','🌺','🌻','🌹','🍀','🌿','🌊','🌋','🌙','☀️','⛅','❄️','🌈','🦋','🐺','🦊'],
    objects: ['💎','🎵','🎶','🎸','🎹','🎤','🎧','🏆','🎯','🎲','🎮','📱','💻','🔮','⚔️','🛸'],
    symbols: ['❤','🧡','💛','💚','💙','💜','🖤','🤍','♥','★','☆','♦','♣','♠','✦','✧']
  };
  let currentCat = 'fav';

  function showEmojiCat(cat, btn){
    currentCat = cat;
    document.querySelectorAll('.emoji-tab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderEmojis();
  }

  function renderEmojis(){
    const grid = document.getElementById('emojiGrid');
    if(!grid) return;
    grid.innerHTML = '';
    (emojiCats[currentCat] || []).forEach(em => {
      const div = document.createElement('div');
      div.className = 'emoji-item';
      div.textContent = em;
      div.onclick = () => loadEmoji(em);
      grid.appendChild(div);
    });
  }

  function loadEmoji(emoji){
    clearCanvas();
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '90px Arial';
    ctx.fillText(emoji, 64, 68);
    saveCanvas();
    statusEl.innerText = 'Emoji cargado: ' + emoji;
  }

  // LINES
  function setLines(n, btn){
    numLines = n;
    document.querySelectorAll('.line-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    const r1 = document.getElementById('row1');
    const r2 = document.getElementById('row2');
    const r3 = document.getElementById('row3');
    if(r1) r1.classList.toggle('hidden', false);
    if(r2) r2.classList.toggle('hidden', n < 2);
    if(r3) r3.classList.toggle('hidden', n < 3);
    const sizeMap = {1:28, 2:22, 3:16};
    const fs = document.getElementById('fontSize');
    if(fs){ fs.value = sizeMap[n] || 24; document.getElementById('sizeVal').innerText = fs.value; }
  }

  // FONTS
  function selectFont(btn){
    document.querySelectorAll('.font-btn').forEach(b => b.classList.remove('active'));
    if(!btn) return;
    btn.classList.add('active');
    selectedFont = btn.dataset.font || 'Arial';
  }

  // TEXT
  function applyText(){
    const lines = [
      document.getElementById('line1')?.value || '',
      document.getElementById('line2')?.value || '',
      document.getElementById('line3')?.value || ''
    ].slice(0, numLines).filter(l => l.length > 0);

    if(lines.length === 0){ statusEl.innerText = '⚠️ Escribe algo primero.'; return; }

    const size = parseInt(document.getElementById('fontSize')?.value || '24', 10);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${size}px ${selectedFont}`;

    const lineHeight = size * 1.25;
    const totalH = lineHeight * lines.length;
    const startY = (128 - totalH) / 2 + lineHeight / 2;

    ctx.clearRect(0,0,128,128);
    for (let i=0;i<lines.length;i++) ctx.fillText(lines[i], 64, startY + i * lineHeight);
    saveCanvas();
    statusEl.innerText = `✅ ${lines.length} línea(s) aplicada(s).`;
  }

  // CANVAS helper
  function getPos(e){
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * (128 / rect.width), y: (clientY - rect.top) * (128 / rect.height) };
  }

  canvas.addEventListener('pointerdown', (e) => { isDrawing = true; draw(e); });
  window.addEventListener('pointerup', () => { if(isDrawing){ isDrawing = false; saveCanvas(); } });
  canvas.addEventListener('pointermove', draw);

  function draw(e){
    if(!isDrawing) return;
    ctx.fillStyle = 'white';
    const pos = getPos(e);
    ctx.beginPath(); ctx.arc(pos.x, pos.y, 3, 0, Math.PI*2); ctx.fill();
  }

  function clearCanvas(){ ctx.fillStyle = 'black'; ctx.fillRect(0,0,128,128); saveCanvas(); }
  function saveCanvas(){ try{ localStorage.setItem('last_oled_img', canvas.toDataURL()); }catch(e){} }

  // BLUETOOTH helpers (no cambios respecto a tu versión)
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

  // TRANSFER to NACHIMBONG: SSD1306 page-byte format (sin cambios)
  async function transferOled(){
    statusEl.innerText = 'Preparando imagen...';
    const imgData = ctx.getImageData(0,0,128,128).data;
    const oledBytes = new Uint8Array(2048);

    for(let y=0;y<128;y++){
      for(let x=0;x<128;x++){
        const idx = (y*128 + x) * 4;
        const bright = imgData[idx];
        if(bright > 128){
          const byteIdx = Math.floor(y/8) * 128 + x;
          oledBytes[byteIdx] |= (1 << (y % 8));
        }
      }
    }

    // send in 16 chunks of 128 bytes via bridge or webkit
    for(let part=0; part<16; part++){
      const chunk = oledBytes.slice(part * 128, (part+1) * 128);
      const hexData = Array.from(chunk).map(b => b.toString(16).padStart(2,'0')).join('');
      const cmd = `810F00000000${part.toString(16).padStart(2,'0')}${hexData},-`;
      try{
        if(window.bridge && typeof window.bridge.bleSendCmdList === 'function') window.bridge.bleSendCmdList(cmd);
        else if(window.webkit?.messageHandlers?.bleSendCmdList) window.webkit.messageHandlers.bleSendCmdList.postMessage(cmd);
        statusEl.innerText = `Enviando: ${Math.round(((part+1)/16)*100)}%`;
        await new Promise(r => setTimeout(r, 150));
      }catch(e){ statusEl.innerText = '⚠️ Error en parte ' + (part+1); console.error(e); return; }
    }
    statusEl.innerText = '✅ ¡Enviado correctamente!';
  }

  // --- Helpers para soportar diseños y animaciones desde MIS_DISENOS / MIS_ANIMATIONS ---
  function padTo2048Bytes(hex) {
    if (!hex) return '00'.repeat(2048);
    const cleaned = String(hex).replace(/[^0-9A-Fa-f]/g,'');
    const needed = 2048*2 - cleaned.length;
    if (needed <= 0) return cleaned.substr(0, 2048*2).toUpperCase();
    return (cleaned + '0'.repeat(needed)).toUpperCase();
  }

  function hexToBytes(hex){
    if(!hex) return new Uint8Array();
    const s = String(hex).replace(/[^0-9A-Fa-f]/g,'');
    const len = Math.floor(s.length/2);
    const out = new Uint8Array(len);
    for(let i=0;i<len;i++) out[i] = parseInt(s.substr(i*2,2), 16);
    return out;
  }

  // Conteo rápido de píxeles encendidos para heurística
  function countLitPixels(bytes, mode){
    const w = 128, h = 128;
    let count = 0;
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        let bit = 0;
        try{
          if(mode === 'standard'){
            const byteIdx = Math.floor(y/8) * w + x;
            bit = (bytes[byteIdx] >> (y % 8)) & 1;
          } else if(mode === 'revbit'){
            const byteIdx = Math.floor(y/8) * w + x;
            bit = (bytes[byteIdx] >> (7 - (y % 8))) & 1;
          } else if(mode === 'transpose'){
            const byteIdx = Math.floor(x/8) * h + y;
            bit = (bytes[byteIdx] >> (x % 8)) & 1;
          } else if(mode === 'invert'){
            const byteIdx = Math.floor(y/8) * w + x;
            bit = ((bytes[byteIdx] >> (y % 8)) & 1) ? 0 : 1;
          }
        }catch(e){ bit = 0; }
        if(bit) count++;
      }
    }
    return count;
  }

  function renderOledBytes(bytes){
    renderOledBytesVariant(bytes, 'standard');
  }

  function renderOledBytesVariant(bytes, mode){
    try{
      const w = 128, h = 128;
      const img = ctx.createImageData(w,h);
      for(let y=0;y<h;y++){
        for(let x=0;x<w;x++){
          let bit = 0;
          try{
            if(mode === 'standard'){
              const byteIdx = Math.floor(y/8) * w + x;
              bit = (bytes[byteIdx] >> (y % 8)) & 1;
            } else if(mode === 'revbit'){
              const byteIdx = Math.floor(y/8) * w + x;
              bit = (bytes[byteIdx] >> (7 - (y % 8))) & 1;
            } else if(mode === 'transpose'){
              const byteIdx = Math.floor(x/8) * h + y;
              bit = (bytes[byteIdx] >> (x % 8)) & 1;
            } else if(mode === 'invert'){
              const byteIdx = Math.floor(y/8) * w + x;
              bit = (bytes[byteIdx] >> (y % 8)) & 1; bit = bit ? 0 : 1;
            } else {
              const byteIdx = Math.floor(y/8) * w + x;
              bit = (bytes[byteIdx] >> (y % 8)) & 1;
            }
          }catch(e){ bit = 0; }
          const i = (y*w + x) * 4; const color = bit ? 255 : 0;
          img.data[i] = img.data[i+1] = img.data[i+2] = color; img.data[i+3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      saveCanvas();
    }catch(e){ console.error('renderOledBytes error', e); statusEl.innerText = 'Error al renderizar diseño'; }
  }

  // --- Robust extraction of frames from MIS_DISENOS and MIS_ANIMATIONS ---
  function getFramesFromMIS_DISENOS(name) {
    if (!window.MIS_DISENOS || !window.MIS_DISENOS[name]) return null;
    const entry = window.MIS_DISENOS[name];

    // Case A: entry is [ frameArr0, frameArr1, ... ] where frameArr is array of chunk-strings
    if (Array.isArray(entry) && entry.length > 0 && Array.isArray(entry[0]) && typeof entry[0][0] === 'string') {
      return entry.map(frameArr => padTo2048Bytes(frameArr.join('')));
    }

    // Case B: legacy single-frame as array of chunk strings: [ chunk0, chunk1, ... ]
    if (Array.isArray(entry) && typeof entry[0] === 'string') {
      // treat as single frame made of chunks
      return [ padTo2048Bytes(entry.join('')) ];
    }

    // Unknown shape
    return null;
  }

  function getFramesFromMIS_ANIMATIONS(name){
    if (!window.MIS_ANIMATIONS || !window.MIS_ANIMATIONS[name]) return null;
    const entry = window.MIS_ANIMATIONS[name];

    // Case A: array of full-hex-frames -> [ "ABC...", "DEF...", ... ]
    if (Array.isArray(entry) && entry.length > 0 && typeof entry[0] === 'string') {
      // If entry[0] looks like chunks concatenated (very long) still fine: pad/truncate to 2048 bytes
      return entry.map(h => padTo2048Bytes(h));
    }

    // Case B: array of frames where each frame is an array of chunk-strings -> [ [chunk0,...], [chunk0,...] ]
    if (Array.isArray(entry) && entry.length > 0 && Array.isArray(entry[0]) && typeof entry[0][0] === 'string') {
      return entry.map(frameArr => padTo2048Bytes(frameArr.join('')));
    }

    // Unknown shape
    return null;
  }

  function getFramesForDesign(name) {
    // Try MIS_ANIMATIONS first (more specific)
    const animFrames = getFramesFromMIS_ANIMATIONS(name);
    if (animFrames && animFrames.length) {
      console.log(`getFramesForDesign: found MIS_ANIMATIONS for ${name}, frames: ${animFrames.length}, hexLen=${String(animFrames[0]).length}`);
      return animFrames;
    }

    // Then MIS_DISENOS
    const disFrames = getFramesFromMIS_DISENOS(name);
    if (disFrames && disFrames.length) {
      console.log(`getFramesForDesign: found MIS_DISENOS for ${name}, frames: ${disFrames.length}, hexLen=${String(disFrames[0]).length}`);
      return disFrames;
    }

    return null;
  }

  // Heurística: prueba varios modos de interpretación de bits y elige el más "razonable"
  function pickBestModeForHex(hex){
    try{
      const bytes = hexToBytes(hex);
      const modes = ['standard','revbit','transpose','invert'];
      const results = modes.map(m => ({ mode: m, lit: countLitPixels(bytes, m) }));
      // prefer lit counts que no sean extremos (ni casi 0 ni casi 16384)
      // score = distancia a rango ideal, prefer lit between 200 and 15000
      results.forEach(r => r.score = Math.abs(r.lit - 4000)); // prefer ~4000 as baseline
      results.sort((a,b)=>a.score - b.score);
      console.log('pickBestModeForHex results', results);
      return results[0].mode;
    }catch(e){
      return 'standard';
    }
  }

  // --- Mejorada: loadDesign soporta varias formas y detecta automáticamente modo de render ---
  let lastFrames = []; // array of hex strings (each padded to 2048 bytes)
  let lastFramesChunks = null;

  function loadDesign(nameOrArray, mode='standard') {
    try {
      let framesHex = [];

      if (Array.isArray(nameOrArray)) {
        for (let nm of nameOrArray) {
          const f = getFramesForDesign(nm);
          if (!f) { statusEl.innerText = 'Diseño no encontrado o formato inválido: ' + nm; return; }
          framesHex.push(...f);
        }
      } else {
        const name = nameOrArray;
        const f = getFramesForDesign(name);
        if (!f) { statusEl.innerText = 'Diseño no encontrado: ' + name; return; }
        framesHex = f;
      }

      if (!framesHex.length) { statusEl.innerText = 'No se obtuvieron frames para el/los diseño(s).'; return; }

      // normalize: ensure each is padded to 2048 bytes hex
      framesHex = framesHex.map(h => padTo2048Bytes(h));

      lastFrames = framesHex;
      lastFramesChunks = null;

      // determine best mode for first frame if user selected 'auto'
      let chosenMode = mode;
      if (mode === 'standard' || mode === 'auto') {
        // if user explicitly chose 'standard' keep it, else 'auto' tries to detect
        if (mode === 'auto') chosenMode = pickBestModeForHex(framesHex[0]);
      }

      // If user passed 'standard' but preview looks bad, try to auto-fix:
      if (mode === 'standard') {
        // compute lit pixels in standard
        const stdCount = countLitPixels(hexToBytes(framesHex[0]), 'standard');
        if (stdCount < 100 || stdCount > 16000) {
          // fallback to auto pick
          chosenMode = pickBestModeForHex(framesHex[0]);
          console.log(`standard mode looked odd (lit=${stdCount}), switching to ${chosenMode}`);
        } else chosenMode = 'standard';
      }

      // render first frame using chosenMode
      const firstHex = lastFrames[0];
      const bytes = hexToBytes(firstHex);
      renderOledBytesVariant(bytes, chosenMode);

      window._lastLoadedDesign = Array.isArray(nameOrArray) ? nameOrArray.join(',') : nameOrArray;
      statusEl.innerText = 'Vista previa: ' + (Array.isArray(nameOrArray) ? ('Animación de: ' + nameOrArray.join(', ')) : nameOrArray) + ' (modo: ' + chosenMode + ', frames: ' + lastFrames.length + ')';
      console.log('loadDesign loaded', window._lastLoadedDesign, 'frames:', lastFrames.length, 'hexLen:', firstHex.length);
    } catch (e) {
      console.error('loadDesign error', e);
      statusEl.innerText = 'Error cargando diseño';
    }
  }

  // Conveniencia para botones: acepta varargs o array
  function loadDesignAsAnimation(...args) {
    const names = (args.length === 1 && Array.isArray(args[0])) ? args[0] : args;
    loadDesign(names, 'standard');
  }

  // expose functions globally used by HTML
  window.showEmojiCat = showEmojiCat;
  window.setLines = setLines;
  window.selectFont = selectFont;
  window.applyText = applyText;
  window.clearCanvas = clearCanvas;
  window.saveCanvas = saveCanvas;
  window.initBT = initBT;
  window.resetDevice = resetDevice;
  window.transferOled = transferOled;
  window.loadDesign = loadDesign;

  // init on DOMContentLoaded
  window.addEventListener('DOMContentLoaded', () => {
    renderEmojis();
    const last = localStorage.getItem('last_oled_img');
    if(last){ const im = new Image(); im.onload = () => ctx.drawImage(im,0,0); im.src = last; } else { clearCanvas(); }

    document.getElementById('applyRenderMode')?.addEventListener('click', () => {
      const sel = document.getElementById('renderMode');
      const mode = sel?.value || 'standard';
      if(window._lastLoadedDesign) loadDesign(window._lastLoadedDesign, mode);
      else statusEl.innerText = 'Primero carga un diseño (ej. Wolfchan Mexa)';
    });

    setTimeout(() => { try{ initBT(); }catch(e){} }, 1000);
  });
})();