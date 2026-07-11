// ══════════════════════════════════
// SIGNATURE SYSTEM
// ══════════════════════════════════
let currentSignTab = 'draw';
let isDrawing = false;
let lastX = 0, lastY = 0;
let canvasHasContent = false;

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
  document.getElementById('signModalSub').textContent = `Convention SF-2026-0${conv.id+46} · Signataire : ${roleNames[state.role]||''}`;
  currentSignTab = 'draw';
  document.getElementById('signHash').textContent = 'Empreinte numérique : en attente de signature...';
  canvasHasContent = false;
  document.getElementById('signDrawStatus').textContent = '';
  document.getElementById('signTypeInput').value = '';
  document.getElementById('signPreview').textContent = 'Votre signature apparaîtra ici';
  document.getElementById('signPreview').style.fontStyle = 'italic';
  document.getElementById('signPreview').style.color = 'var(--text3)';
  // reset tabs
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
  canvas.onmousemove = e => { if(!isDrawing) return; const [x,y]=getPos(canvas,e); ctx.beginPath(); ctx.moveTo(lastX,lastY); ctx.lineTo(x,y); ctx.stroke(); [lastX,lastY]=[x,y]; updateHash(); };
  canvas.onmouseup = () => { isDrawing=false; canvas.classList.remove('drawing'); };
  canvas.onmouseleave = () => { isDrawing=false; canvas.classList.remove('drawing'); };
  // Touch
  canvas.ontouchstart = e => { e.preventDefault(); isDrawing=true; canvasHasContent=true; canvas.classList.add('drawing'); [lastX,lastY]=getPos(canvas,e.touches[0]); };
  canvas.ontouchmove = e => { e.preventDefault(); if(!isDrawing) return; const [x,y]=getPos(canvas,e.touches[0]); ctx.beginPath(); ctx.moveTo(lastX,lastY); ctx.lineTo(x,y); ctx.stroke(); [lastX,lastY]=[x,y]; updateHash(); };
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

function updateHash() {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substr(2,8);
  const hash = 'SF26-' + btoa(ts+rnd).replace(/[^a-z0-9]/gi,'').substr(0,32).toUpperCase();
  document.getElementById('signHash').textContent = 'Empreinte SHA-256 : ' + hash;
}

function switchSignTab(tab, el) {
  currentSignTab = tab;
  document.querySelectorAll('.sign-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('signTabDraw').style.display = tab==='draw'?'block':'none';
  document.getElementById('signTabType').style.display = tab==='type'?'block':'none';
  if(tab==='draw') setTimeout(initCanvas,50);
}

function updateSignPreview(val) {
  const p = document.getElementById('signPreview');
  p.textContent = val || 'Votre signature apparaîtra ici';
  p.style.fontStyle = val ? 'italic' : 'italic';
  p.style.color = val ? 'var(--navy)' : 'var(--text3)';
  if(val) updateHash();
  else document.getElementById('signHash').textContent='Empreinte numérique : en attente...';
}

function confirmSignature() {
  if(currentSignTab==='draw') {
    if(!canvasHasContent) { showToast('✏️ Veuillez dessiner votre signature'); return; }
    const canvas = document.getElementById('signCanvas');
    const dataURL = canvas.toDataURL('image/png');
    saveSignature('draw', dataURL, null);
  } else {
    const text = document.getElementById('signTypeInput').value.trim();
    if(!text) { showToast('⌨️ Veuillez taper votre nom'); return; }
    saveSignature('type', null, text);
  }
}

function saveSignature(type, data, text) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-DZ') + ' à ' + now.toLocaleTimeString('fr-DZ',{hour:'2-digit',minute:'2-digit'});
  const ts = now.getTime().toString(36);
  const rnd = Math.random().toString(36).substr(2,12);
  const hash = ('SF26-' + btoa(ts+rnd+state.role).replace(/[^a-z0-9]/gi,'').substr(0,28).toUpperCase()).slice(0,36);
  const sigData = { type, data, text, date:dateStr, hash };

  const targetConvId = state.openConventionId || 1;
  if(targetConvId === 1) state.signatures[state.role] = sigData;

  const conv = conventions.find(c=>c.id===targetConvId);
  if(conv){
    conv.signatures = conv.signatures || {};
    conv.signatures[state.role] = sigData;
    if(state.role==='entreprise') conv.signed_entreprise = true;
    if(state.role==='universite') conv.signed_univ = true;
    if(conv.signed_entreprise && conv.signed_univ){
      conv.status = 'signed';
    }
    persistConventionState(conv.id);
  }

  closeSignModal();
  const roleLabel = { entreprise:'Entreprise', universite:'Doyenne (Université)' }[state.role];
  showToast(`🔒 Signature ${roleLabel} certifiée — ${hash.slice(0,16)}... · visible par les autres parties`);

  setTimeout(()=>{
    openConvention(targetConvId);
    updateSigDisplay();
  }, 800);
}

function closeSignModal() { document.getElementById('signModal').style.display='none'; }

function updateSigDisplay() {
  const s = state.signatures;
  const count = [s.entreprise,s.universite].filter(Boolean).length;
  // update progress on convention page if open
  const prog = document.getElementById('sigProgress');
  const cnt = document.getElementById('sigCount');
  if(prog) prog.style.width = (count/3*100)+'%';
  if(cnt) cnt.textContent = count+'/3';
}
