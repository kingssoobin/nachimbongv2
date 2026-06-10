// ---------- envío al dispositivo ----------
$('#connectBtn').addEventListener('click', async ()=>{
  const st = $('#bleStatus');

  // PRIORIDAD 1: APK Modificado (Android Bridge detectado en el original)
  if (window.bridge && typeof window.bridge.blePairingStart === 'function') {
    try {
      window.bridge.blePairingStart();
      setStatus(st, 'Conectando via APK Nativo...', 'ok');
      return;
    } catch(e) { 
      setStatus(st, 'Error Bridge: ' + e.message, 'err'); 
    }
  }

  // PRIORIDAD 2: Web Bluetooth (Solo funciona en Chrome Desktop, no en el Lightstick directamente)
  if(!navigator.bluetooth){ setStatus(st,'Este navegador no soporta Web Bluetooth.','err'); return; }
  try {
    setStatus(st,'Solicitando dispositivo BLE…');
    const svc = $('#svcUuid').value.trim();
    const dev = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [svc]
    });
    setStatus(st,'Conectando a ' + (dev.name||dev.id) + '…');
    const gatt = await dev.gatt.connect();
    const service = await gatt.getPrimaryService(svc);
    const chr = await service.getCharacteristic($('#chrUuid').value.trim());
    state.bleDev = dev; state.bleChr = chr;
    setStatus(st,'Conectado: ' + (dev.name||dev.id),'ok');
    dev.addEventListener('gattserverdisconnected', ()=>{
      state.bleChr = null;
      setStatus(st,'Desconectado (se reconectará al enviar)','err');
    });
  } catch(e){ setStatus(st,'Error: '+e.message,'err'); }
});

$('#sendBtn').addEventListener('click', async ()=>{
  const st = $('#bleStatus');
  if(!state.procFrames.length){ setStatus(st,'Nada que enviar.','err'); return; }
  
  const packed = state.procFrames.map(packFrame);
  const hexFrames = packed.map(bytesToHex);

  // PRIORIDAD 1: APK Modificado (El formato que espera el Lightstick V2)
  if(window.bridge && typeof window.bridge.bleSendCmdList === 'function'){
    try {
      // El lightstick espera un JSON con la lista de comandos HEX
      // Adaptamos el formato al esperado por el bridge oficial
      const payload = JSON.stringify({
        width: state.W,
        height: state.H,
        frames: hexFrames
      });
      window.bridge.bleSendCmdList(payload);
      setStatus(st,'Enviado al Lightstick via APK ✓','ok');
      return;
    } catch(e) { 
      setStatus(st,'Error Bridge: '+e.message,'err'); 
    }
  }

  // PRIORIDAD 2: Web Bluetooth Fallback
  if(!state.bleDev){ setStatus(st,'Conecta primero o usa el APK modificado.','err'); return; }
  const chunk = parseInt($('#chunkSize').value)||20;
  let total = 0; packed.forEach(p=>total+=p.length);
  const buf = new Uint8Array(total); let off=0;
  for(const p of packed){ buf.set(p,off); off+=p.length; }
  
  try {
    if(!state.bleDev.gatt.connected){
      setStatus(st,'Reconectando…');
      const gatt = await state.bleDev.gatt.connect();
      const svc = $('#svcUuid').value.trim();
      const service = await gatt.getPrimaryService(svc);
      state.bleChr = await service.getCharacteristic($('#chrUuid').value.trim());
    }
    
    for(let i=0; i<buf.length; i+=chunk){
      const slice = buf.slice(i, Math.min(i+chunk, buf.length));
      if(state.bleChr.writeValueWithoutResponse) await state.bleChr.writeValueWithoutResponse(slice);
      else await state.bleChr.writeValue(slice);
      setStatus(st, `Enviando… ${Math.round((i+slice.length)*100/buf.length)}%`);
    }
    setStatus(st,'Transferencia completada ✓','ok');
  } catch(e){ setStatus(st,'Error al enviar: '+e.message,'err'); }
});

// ---------- arrancar con un placeholder ----------
(function bootstrap(){
  const W=state.W,H=state.H;
  const c=document.createElement('canvas'); c.width=W; c.height=H;
  const cx=c.getContext('2d');
  cx.fillStyle='#000'; cx.fillRect(0,0,W,H);
  cx.fillStyle='#fff'; cx.font='bold 14px sans-serif'; cx.textAlign='center';
  cx.fillText('STRAY KIDS', W/2, H/2-2);
  cx.fillText('V2 OLED', W/2, H/2+12);
  state.rawFrames = [cx.getImageData(0,0,W,H)];
  reprocess();
})();