// ══════════════════════════════════
// SIGNATURE SYSTEM
// ══════════════════════════════════
let currentSignTab = 'draw';
let isDrawing = false;
let lastX = 0, lastY = 0;
let canvasHasContent = false;
let previewHashTimer = null;

function openSignModal() {
  if (state.role === 'etudiant') {
    showToast('ℹ️ La convention est signée uniquement par l\'entreprise et la doyenne (université)');
    return;
  }
  closeOverlay('conventionModal');
  const modal = document.getElementById('signModal');
  modal.style.display = 'flex';
  const convId = state.openConventionId || 1;
  const conv = conventions.find(c=>c.id===convId) || conventions[0];
  const roleNames = { entreprise:`${conv.company} — Représentant entreprise`, universite:'Pr. Soualmia Abderrahmane — Doyenne (Chef de doyennat)' };
  document.getElementById('signModalSub').textContent = `Convention ${conv.reference || ('SF-2026-0' + (conv.id + 46))} · Signataire : ${roleNames[state.role]||''}`;
  currentSignTab = 'draw';
  document.getElementById('signHash').textContent = 'Empreinte numérique : en attente de signature...';
  canvasHasContent = false;
  document.getElementById('signDrawStatus').textContent = '';
  document.getElementById('signTypeInput').value = '';
  document.getElementById('signPreview').textContent = 'Votre signature apparaîtra ici';
  document.getElementById('signPreview').style.fontStyle = 'italic';
  document.getElementById('signPreview').style.color = 'var(--text3)';
  document.querySelectorAll('.sign-tab').forEach((t,i)=>t.classList.toggle('active',i===0));
  document.getElementById('signTabDraw').style.display='block';
  document.getElementById('signTabType').style.display='none';
  setTimeout(initCanvas, 100);
}

function initCanvas() {
  const canvas = document.getElementById('signCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = '#0B1E3D';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  canvas.onmousedown = e => { isDrawing=true; canvasHasContent=true; canvas.classList.add('drawing'); [lastX,lastY]=getPos(canvas,e); document.getElementById('signDrawStatus').textContent=''; };
  canvas.onmousemove = e => { if(!isDrawing) return; const [x,y]=getPos(canvas,e); ctx.beginPath(); ctx.moveTo(lastX,lastY); ctx.lineTo(x,y); ctx.stroke(); [lastX,lastY]=[x,y]; schedulePreviewHash(); };
  canvas.onmouseup = () => { isDrawing=false; canvas.classList.remove('drawing'); };
  canvas.onmouseleave = () => { isDrawing=false; canvas.classList.remove('drawing'); };
  canvas.ontouchstart = e => { e.preventDefault(); isDrawing=true; canvasHasContent=true; canvas.classList.add('drawing'); [lastX,lastY]=getPos(canvas,e.touches[0]); };
  canvas.ontouchmove = e => { e.preventDefault(); if(!isDrawing) return; const [x,y]=getPos(canvas,e.touches[0]); ctx.beginPath(); ctx.moveTo(lastX,lastY); ctx.lineTo(x,y); ctx.stroke(); [lastX,lastY]=[x,y]; schedulePreviewHash(); };
  canvas.ontouchend = () => { isDrawing=false; canvas.classList.remove('drawing'); };
}

function getPos(canvas,e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return [(e.clientX-rect.left)*scaleX, (e.clientY-rect.top)*scaleY];
}

function clearCanvas() {
  const canvas = document.getElementById('signCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  canvasHasContent=false;
  document.getElementById('signHash').textContent='Empreinte numérique : en attente de signature...';
  document.getElementById('signDrawStatus').textContent='';
}

function schedulePreviewHash() {
  if (previewHashTimer) clearTimeout(previewHashTimer);
  previewHashTimer = setTimeout(updateHashPreview, 180);
}

async function updateHashPreview() {
  const hashEl = document.getElementById('signHash');
  if (!hashEl) return;

  let signatureType = currentSignTab;
  let signatureContent = '';
  if (currentSignTab === 'draw') {
    const canvas = document.getElementById('signCanvas');
    if (!canvas || !canvasHasContent) {
      hashEl.textContent = 'Empreinte numérique : en attente de signature...';
      return;
    }
    signatureContent = canvas.toDataURL('image/png');
  } else {
    signatureContent = document.getElementById('signTypeInput').value.trim();
    if (!signatureContent) {
      hashEl.textContent = 'Empreinte numérique : en attente...';
      return;
    }
  }

  try {
    const preview = await previewSignatureHash(signatureType, signatureContent);
    hashEl.textContent = 'Aperçu SHA-256 : ' + preview.slice(0, 16) + '… (empreinte finale calculée à l\'enregistrement)';
  } catch (e) {
    hashEl.textContent = 'Empreinte numérique : calcul en cours...';
  }
}

function switchSignTab(tab, el) {
  currentSignTab = tab;
  document.querySelectorAll('.sign-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('signTabDraw').style.display = tab==='draw'?'block':'none';
  document.getElementById('signTabType').style.display = tab==='type'?'block':'none';
  if(tab==='draw') setTimeout(initCanvas,50);
  else updateHashPreview();
}

function updateSignPreview(val) {
  const p = document.getElementById('signPreview');
  p.textContent = val || 'Votre signature apparaîtra ici';
  p.style.fontStyle = val ? 'italic' : 'italic';
  p.style.color = val ? 'var(--navy)' : 'var(--text3)';
  if(val) updateHashPreview();
  else document.getElementById('signHash').textContent='Empreinte numérique : en attente...';
}

async function confirmSignature() {
  if(currentSignTab==='draw') {
    if(!canvasHasContent) { showToast('✏️ Veuillez dessiner votre signature'); return; }
    const canvas = document.getElementById('signCanvas');
    const dataURL = canvas.toDataURL('image/png');
    await saveSignature('draw', dataURL, null);
  } else {
    const text = document.getElementById('signTypeInput').value.trim();
    if(!text) { showToast('⌨️ Veuillez taper votre nom'); return; }
    await saveSignature('type', null, text);
  }
}

async function saveSignature(type, data, text) {
  const targetConvId = state.openConventionId || 1;
  const conv = conventions.find(c=>c.id===targetConvId);
  if (!conv) return;

  const sigPayload = { type, data, text };

  if (conv.fromDb) {
    conv.signatures = conv.signatures || {};
    conv.signatures[state.role] = sigPayload;
    if(state.role==='entreprise') conv.signed_entreprise = true;
    if(state.role==='universite') conv.signed_univ = true;
    if(conv.signed_entreprise && conv.signed_univ) conv.status = 'signed';

    try {
      const apiResult = await persistConventionState(conv.id);
      const updated = conventions.find(c => c.id === targetConvId);
      const serverSig = updated && updated.signatures ? updated.signatures[state.role] : null;
      const hash = serverSig && serverSig.hash ? serverSig.hash : (apiResult && apiResult.integrity ? apiResult.integrity.signatureHash : null);
      closeSignModal();
      const roleLabel = { entreprise:'Entreprise', universite:'Doyenne (Université)' }[state.role];
      showToast(`🔒 Signature ${roleLabel} certifiée — SHA-256 ${hash ? hash.slice(0,16) + '…' : ''}`);
      setTimeout(()=>{ openConvention(targetConvId); updateSigDisplay(); }, 800);
      return;
    } catch (e) {
      if(state.role==='entreprise') conv.signed_entreprise = false;
      if(state.role==='universite') conv.signed_univ = false;
      delete conv.signatures[state.role];
      showToast('❌ Erreur lors de l\'enregistrement de la signature');
      return;
    }
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-DZ') + ' à ' + now.toLocaleTimeString('fr-DZ',{hour:'2-digit',minute:'2-digit'});
  const signedAt = now.toISOString();
  const documentSeed = conv.documentHash || await computeLocalDocumentSeed(conv);
  const signatureContent = type === 'type' ? String(text || '').trim() : String(data || '');
  const hash = await computeLocalSignatureHash(targetConvId, state.role, documentSeed, type, signatureContent);
  const sigData = { type, data, text, date: dateStr, signedAt, hash, documentHash: documentSeed, algorithm: 'SHA-256' };

  if(targetConvId === 1) state.signatures[state.role] = sigData;
  conv.signatures = conv.signatures || {};
  conv.signatures[state.role] = sigData;
  conv.documentHash = documentSeed;
  if(state.role==='entreprise') conv.signed_entreprise = true;
  if(state.role==='universite') conv.signed_univ = true;
  if(conv.signed_entreprise && conv.signed_univ){
    conv.status = 'signed';
    conv.finalIntegrityHash = await computeLocalFinalIntegrityHash(
      documentSeed,
      conv.signatures.entreprise,
      conv.signatures.universite
    );
  }
  await persistConventionState(conv.id);

  closeSignModal();
  const roleLabel = { entreprise:'Entreprise', universite:'Doyenne (Université)' }[state.role];
  showToast(`🔒 Signature ${roleLabel} certifiée — SHA-256 ${hash.slice(0,16)}…`);

  setTimeout(()=>{
    openConvention(targetConvId);
    updateSigDisplay();
  }, 800);
}

function closeSignModal() { document.getElementById('signModal').style.display='none'; }

function updateSigDisplay() {
  const s = state.signatures;
  const count = [s.entreprise,s.universite].filter(Boolean).length;
  const prog = document.getElementById('sigProgress');
  const cnt = document.getElementById('sigCount');
  if(prog) prog.style.width = (count/3*100)+'%';
  if(cnt) cnt.textContent = count+'/3';
}
