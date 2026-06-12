/* Nachimbong app.js - Fixed sender module
   - Ensures send uses the selected skin (wolfchan/bangchan) explicitly
   - Single-open single-close transfer for all frames
   - Button binding overwritten to call the correct sender
   - Exposes NachimbongSender API on window for manual control
*/
(function(){
  if(window.NachimbongSender && window.NachimbongSender._installed) return;
  const MODULE = {};
  MODULE._installed = true;

  const FRAME_BYTES = 2048;
  const CHUNK_BYTES = 128;
  const CHUNKS_PER_FRAME = FRAME_BYTES / CHUNK_BYTES; // 16

  // Helpers
  function cleanHex(s){ return String(s||'').replace(/[^0-9A-Fa-f]/g,'').toUpperCase(); }
  function padToFrame(hex){ const FRAME_HEX_LEN = FRAME_BYTES*2; const h = cleanHex(hex); if(h.length>=FRAME_HEX_LEN) return h.substr(0,FRAME_HEX_LEN); return h.padEnd(FRAME_HEX_LEN,'0'); }
  function buildChunksFromFrameHex(frameHex){ const padded = padToFrame(frameHex); const CHUNK_HEX_LEN = CHUNK_BYTES*2; const chunks = []; for(let i=0;i<padded.length;i+=CHUNK_HEX_LEN) chunks.push(padded.substr(i,CHUNK_HEX_LEN)); return chunks; }
  function F7(e){ const F = e.toString(16).toUpperCase(); return F.length==1?('0'+F):F; }
  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
  function log(...a){ try{ console.log('[NachimbongSender]', ...a); }catch(e){} }
  function setStatus(msg){ try{ const el=document.getElementById('status'); if(el) el.innerText = msg; }catch(e){} log(msg); }

  // Save originals
  const origPt = (typeof pt === 'function') ? pt : null;
  const origBridge = (window.bridge && typeof window.bridge.bleSendCmdList === 'function') ? window.bridge.bleSendCmdList.bind(window.bridge) : null;
  const origWebkitPost = (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bleSendCmdList && typeof window.webkit.messageHandlers.bleSendCmdList.postMessage === 'function') ? window.webkit.messageHandlers.bleSendCmdList.postMessage.bind(window.webkit.messageHandlers.bleSendCmdList) : null;

  // Internal low-level sender (calls native functions directly, does not alter globals)
  function lowLevelSendDirect(cmd){
    try{
      if(origPt) { try{ origPt(cmd); return true; }catch(e){ log('origPt failed',e);} }
      if(origBridge) { try{ origBridge(cmd); return true; }catch(e){ log('origBridge failed',e);} }
      if(origWebkitPost) { try{ origWebkitPost(cmd); return true; }catch(e){ log('origWebkitPost failed',e);} }
    }catch(e){ log('lowLevelSendDirect exception', e); }
    // As a last fallback, try the current global functions (if they were defined after module load)
    try{ if(typeof pt === 'function'){ pt(cmd); return true; } }catch(e){}
    try{ if(window.bridge && typeof window.bridge.bleSendCmdList === 'function'){ window.bridge.bleSendCmdList(cmd); return true; } }catch(e){}
    try{ if(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bleSendCmdList && typeof window.webkit.messageHandlers.bleSendCmdList.postMessage === 'function'){ window.webkit.messageHandlers.bleSendCmdList.postMessage(cmd); return true; } }catch(e){}
    log('No available low-level sender for cmd:', cmd.slice(0,80));
    return false;
  }

  // Transfer state guard
  window._transferInProgress = window._transferInProgress || false;

  // The core single-open single-close transfer that sends all frames in a single session
  MODULE.transferSingleOpenAllFrames = async function(frames, opts){
    opts = opts || {};
    const perChunkDelay = typeof opts.perChunkDelay === 'number' ? opts.perChunkDelay : 80;
    const perFinalDelay = typeof opts.perFinalDelay === 'number' ? opts.perFinalDelay : 200;
    const partIndexMode = opts.partIndexMode || 'zero'; // 'zero' => 0..15, 'one' => 1..16

    if(!frames || !Array.isArray(frames) || frames.length===0){ setStatus('transfer: no frames provided'); return false; }
    if(window._transferInProgress){ setStatus('transfer: already in progress'); return false; }

    const framesPadded = frames.map(f=>padToFrame(f));
    const numFrames = framesPadded.length;
    const e_hex = (numFrames-1).toString(16).toUpperCase().padStart(4,'0');

    try{
      window._transferInProgress = true;
      setStatus(`transfer: start frames=${numFrames} mode=${partIndexMode}`);

      // OPEN once
      lowLevelSendDirect('8110,-');
      await sleep(150);

      for(let f=0; f<numFrames; f++){
        const F_hex = (f).toString(16).toUpperCase().padStart(4,'0');
        const chunks = buildChunksFromFrameHex(framesPadded[f]);
        setStatus(`transfer: sending frame ${f+1}/${numFrames} (${chunks.length} chunks)`);
        for(let ci=0; ci<chunks.length; ci++){
          const part_val = (partIndexMode === 'one') ? (ci+1) : ci;
          const part_hex = F7(part_val);
          const cmd = `810F${e_hex}${F_hex}${part_hex}${chunks[ci]},-`;
          lowLevelSendDirect(cmd);
          await sleep(perChunkDelay);
        }
      }

      // FINAL commit/close once
      setStatus('transfer: final commit');
      lowLevelSendDirect('8110,-');
      await sleep(perFinalDelay);

      setStatus('transfer: completed');
      return true;
    }catch(err){
      log('transfer error', err);
      setStatus('transfer: error ' + (err && err.message));
      return false;
    }finally{
      window._transferInProgress = false;
    }
  };

  // Send by animation name (explicitly sets lastFrames to avoid stale state)
  MODULE.sendAnimationByName = async function(name, opts){
    opts = opts || {};
    const animations = window.MIS_ANIMATIONS || {};
    if(!animations || !animations[name]){ setStatus('sendAnimationByName: animation not found: '+name); return false; }
    const frames = animations[name].slice();
    // ensure lastFrames is our frames (so other parts reading it see correct data)
    window.lastFrames = frames.slice();
    log('sendAnimationByName: using frames from', name, 'count', frames.length);
    return await MODULE.transferSingleOpenAllFrames(frames, opts);
  };

  // Helper to get available animation names
  MODULE.getAvailableAnimations = function(){ return Object.keys(window.MIS_ANIMATIONS || {}); };

  // Attach send button to selected skin in UI
  MODULE.attachButtons = function(config){
    config = config || {};
    const sendBtnSelector = config.sendBtnSelector || '#sendBtn';
    const skinSelectSelector = config.skinSelectSelector || '#skinSelect';

    const sendBtn = document.querySelector(sendBtnSelector) || document.getElementById('sendBtn');
    const skinSelect = document.querySelector(skinSelectSelector) || document.getElementById('skinSelect');

    if(!sendBtn){ log('attachButtons: sendBtn not found for selector', sendBtnSelector); return; }

    // Replace button with a clone to remove existing listeners/onclick
    const sendBtnParent = sendBtn.parentNode;
    const newBtn = sendBtn.cloneNode(true);
    sendBtnParent.replaceChild(newBtn, sendBtn);

    newBtn.addEventListener('click', async function(ev){
      ev && ev.preventDefault && ev.preventDefault();
      // Determine selected skin name
      let name = null;
      // If a select input exists, use its value
      if(skinSelect && (skinSelect.tagName === 'SELECT' || skinSelect.tagName === 'INPUT')){
        name = skinSelect.value;
      }
      // fallback: data attribute on the send button
      if(!name){ name = newBtn.getAttribute('data-skin') || newBtn.dataset.skin; }
      // fallback: first available animation
      if(!name){ const keys = MODULE.getAvailableAnimations(); if(keys.length>0) name = keys[0]; }
      if(!name){ setStatus('attachButtons: no skin selected and no animations available'); return; }
      setStatus('Button: sending animation '+name);
      await MODULE.sendAnimationByName(name, { perChunkDelay: config.perChunkDelay || 80, perFinalDelay: config.perFinalDelay || 200, partIndexMode: config.partIndexMode || 'zero' });
    }, {passive:false});

    log('attachButtons: bound send button and skin selector', sendBtnSelector, skinSelectSelector);
  };

  // Defensive: prevent accidental multiple opens by neutralizing older send utilities while keeping them functional via NachimbongSender
  // We keep originals but wrap them to check transferInProgress
  function wrapGlobalSendFunctions(){
    // Wrap pt
    if(typeof pt === 'function'){
      const orig = pt;
      window.pt = function(cmd){
        if(window._transferInProgress){ log('blocked external pt call while transfer in progress'); return; }
        return orig.apply(this, arguments);
      };
    }
    // Wrap bridge.bleSendCmdList
    if(window.bridge && typeof window.bridge.bleSendCmdList === 'function'){
      const orig = window.bridge.bleSendCmdList.bind(window.bridge);
      window.bridge.bleSendCmdList = function(cmd){ if(window._transferInProgress){ log('blocked external bridge send while transfer in progress'); return; } return orig(cmd); };
    }
    // Wrap webkit postMessage
    if(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.bleSendCmdList && typeof window.webkit.messageHandlers.bleSendCmdList.postMessage === 'function'){
      const orig = window.webkit.messageHandlers.bleSendCmdList.postMessage.bind(window.webkit.messageHandlers.bleSendCmdList);
      window.webkit.messageHandlers.bleSendCmdList.postMessage = function(cmd){ if(window._transferInProgress){ log('blocked external webkit post while transfer in progress'); return; } return orig(cmd); };
    }
    log('wrapGlobalSendFunctions: applied');
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', function(){
    try{
      // default attach; user can call NachimbongSender.attachButtons with selectors if different
      MODULE.attachButtons({ sendBtnSelector: '#sendBtn', skinSelectSelector: '#skinSelect', perChunkDelay:80, perFinalDelay:200, partIndexMode:'zero' });
      // Wrap global senders to avoid concurrent accidental sends
      wrapGlobalSendFunctions();
      setStatus('NachimbongSender ready');
    }catch(e){ log('init error', e); }
  });

  // Expose
  MODULE._installed = true;
  window.NachimbongSender = MODULE;
})();
