
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

    lines.forEach((line, i) => ctx.fillText(line, 64, startY + i * lineHeight));
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

  // BLUETOOTH helpers
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

  // TRANSFER to NACHIMBONG: SSD1306 page-byte format
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

  // DESIGN loading and rendering
  function hexToBytes(hex){
    if(!hex) return new Uint8Array();
    const len = Math.floor(hex.length/2);
    const out = new Uint8Array(len);
    for(let i=0;i<len;i++) out[i] = parseInt(hex.substr(i*2,2), 16);
    return out;
  }

  function renderOledBytes(bytes){
    try{
      const w = 128, h = 128;
      const img = ctx.createImageData(w,h);
      for(let y=0;y<h;y++){
        for(let x=0;x<w;x++){
          const byteIdx = Math.floor(y/8) * w + x;
          const bit = (bytes[byteIdx] >> (y % 8)) & 1;
          const i = (y*w + x) * 4;
          const color = bit ? 255 : 0;
          img.data[i] = img.data[i+1] = img.data[i+2] = color;
          img.data[i+3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      saveCanvas();
    }catch(e){ console.error('renderOledBytes error', e); statusEl.innerText = 'Error al renderizar diseño'; }
  }

  function renderOledBytesVariant(bytes, mode){
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
    ctx.putImageData(img, 0, 0); saveCanvas();
  }

// --- Helpers para soportar diseños y animaciones desde MIS_DISENOS / MIS_ANIMATIONS ---
  function padTo2048Bytes(hex) {
    if (!hex) return '00'.repeat(2048);
    const needed = 2048*2 - hex.length;
    if (needed <= 0) return hex.substr(0, 2048*2);
    return hex + '0'.repeat(needed);
  }

  function getFramesFromMIS_DISENOS(name) {
    // MIS_DISENOS[name] expected shape: [ frame0_arrayOfChunks, frame1_arrayOfChunks, ... ]
    // or old shape: [ arrayOfChunks ] (single frame)
    if (!window.MIS_DISENOS || !window.MIS_DISENOS[name]) return null;
    const entry = window.MIS_DISENOS[name];
    // entry may be an array where each item is an array of chunk-strings (frame)
    // or entry could be [chunks...] (single frame represented as array of chunk-strings).
    // Detect: if entry[0] is an array -> treat each entry as a frame-array
    if (Array.isArray(entry[0]) && entry[0].length > 0 && typeof entry[0][0] === 'string') {
      // entry is [ frameArr0, frameArr1, ... ]
      return entry.map(frameArr => {
        // join chunks -> single hex per frame, padded to 2048 bytes
        const hex = frameArr.join('').toUpperCase();
        return padTo2048Bytes(hex);
      });
    } else if (Array.isArray(entry) && typeof entry[0] === 'string') {
      // legacy single-frame: entry is the chunk list for single frame
      const hex = entry.join('').toUpperCase();
      return [ padTo2048Bytes(hex) ];
    }
    return null;
  }

  function getFramesForDesign(name) {
    // Try MIS_ANIMATIONS first (already exported as long hex per frame)
    if (window.MIS_ANIMATIONS && Array.isArray(window.MIS_ANIMATIONS[name])) {
      return window.MIS_ANIMATIONS[name].map(h => padTo2048Bytes(String(h).toUpperCase()));
    }
    // Then try MIS_DISENOS
    const fromDisenos = getFramesFromMIS_DISENOS(name);
    if (fromDisenos && fromDisenos.length) return fromDisenos;
    return null;
  }

  // --- Mejorada: loadDesign soporta:
  //  - name = 'wolfchan_mexa' (single design)
  //  - name = ['wolfchan_mexa','bangchan_an01'] (array) -> carga ambos como secuencia de frames
  //  - acepta MIS_ANIMATIONS (pre-exported) y MIS_DISENOS (chunk arrays)
  function loadDesign(nameOrArray, mode='standard') {
    try {
      let framesHex = [];

      if (Array.isArray(nameOrArray)) {
        // build framesHex concatenando cada diseño pedido
        for (let nm of nameOrArray) {
          const f = getFramesForDesign(nm);
          if (!f) {
            statusEl.innerText = 'Diseño no encontrado o formato inválido: ' + nm;
            return;
          }
          // push all frames from this design (often single-frame)
          framesHex.push(...f);
        }
      } else {
        const name = nameOrArray;
        const f = getFramesForDesign(name);
        if (!f) {
          statusEl.innerText = 'Diseño no encontrado: ' + name;
          return;
        }
        framesHex = f;
      }

      if (!framesHex.length) {
        statusEl.innerText = 'No se obtuvieron frames para el/los diseño(s).';
        return;
      }

      // keep lastFrames for preview & transfer
      lastFrames = framesHex; // each is a long hex string already padded to 2048 bytes
      lastFramesChunks = null; // we can derive chunks later if needed

      // render first frame (convert to bytes)
      const firstHex = lastFrames[0];
      const bytes = hexToBytes(firstHex);
      renderOledBytesVariant(bytes, mode);

      window._lastLoadedDesign = Array.isArray(nameOrArray) ? nameOrArray.join(',') : nameOrArray;
      statusEl.innerText = 'Vista previa: ' + (Array.isArray(nameOrArray) ? ('Animación de: ' + nameOrArray.join(', ')) : nameOrArray) + ' (modo: ' + mode + ', frames: ' + lastFrames.length + ')';
    } catch (e) {
      console.error('loadDesign error', e);
      statusEl.innerText = 'Error cargando diseño';
    }
  }

  // Conveniencia para botones: acepta varargs o array
  function loadDesignAsAnimation(...args) {
    // caller can pass either multiple string args or a single array
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
