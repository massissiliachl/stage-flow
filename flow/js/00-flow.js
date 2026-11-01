// Helpers flow — pages rôle sans #landing
function hideLanding() {
  var el = document.getElementById('landing');
  if (el) el.style.display = 'none';
}
function showLanding() {
  var el = document.getElementById('landing');
  if (el) { el.style.display = 'flex'; el.style.flexDirection = 'column'; }
}
function hideAccessGuardImmediate() {
  var guard = document.getElementById('accessGuard');
  if (guard) guard.style.display = 'none';
}
function dismissAccessGuard() {
  hideAccessGuardImmediate();
}

function hideAccessGuardAnimated() {
  var guard = document.getElementById('accessGuard');
  if (!guard) return;
  guard.style.transition = 'opacity .4s';
  guard.style.opacity = '0';
  setTimeout(function() { guard.style.display = 'none'; }, 400);
}

function showAccessGuardError(message) {
  var err = document.getElementById('guardError');
  var input = document.getElementById('guardPassword');
  if (err) err.textContent = message || '❌ Mot de passe incorrect';
  if (input) {
    input.value = '';
    input.style.borderColor = '#FF4D6A';
    setTimeout(function() {
      if (err) err.textContent = '';
      input.style.borderColor = 'rgba(255,255,255,0.15)';
    }, 2500);
  }
}

async function checkSiteAccess() {
  var input = document.getElementById('guardPassword');
  var val = input ? input.value : '';
  if (!val) {
    showAccessGuardError('⚠️ Mot de passe requis');
    return;
  }
  try {
    var base = typeof API_BASE !== 'undefined' ? API_BASE : 'https://stage-flow-6rl5.onrender.com';
    var res = await fetch(base + '/api/auth/site/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: val }),
    });
    var data = {};
    try { data = await res.json(); } catch (e) {}
    if (res.ok && data.ok) {
      hideAccessGuardAnimated();
      return;
    }
    showAccessGuardError('❌ ' + (data.error || 'Mot de passe incorrect'));
  } catch (e) {
    showAccessGuardError('❌ Serveur inaccessible — réessayez');
  }
}

async function initSiteAccessGuard() {
  var guard = document.getElementById('accessGuard');
  if (!guard || guard.style.display === 'none') return;
  try {
    var base = typeof API_BASE !== 'undefined' ? API_BASE : 'https://stage-flow-6rl5.onrender.com';
    var res = await fetch(base + '/api/auth/site/status', { headers: { Accept: 'application/json' } });
    var data = await res.json();
    if (res.ok && data.enabled === false) hideAccessGuardImmediate();
  } catch (e) {}
}

/** Liste « comptes démo » université — visible seulement avec ?demo=1 (usage perso). */
function showDemoAuthAccounts() {
  try { return new URLSearchParams(window.location.search).get('demo') === '1'; } catch (e) { return false; }
}

/** Inscription depuis l’accueil (?register=1 ou intent sessionStorage). */
function flowWantsRegister() {
  if (new URLSearchParams(window.location.search).get('register')) return true;
  try {
    if (sessionStorage.getItem('sf_flow_register') === '1') {
      sessionStorage.removeItem('sf_flow_register');
      return true;
    }
  } catch (e) {}
  return false;
}

function flowSetRegisterIntent() {
  try { sessionStorage.setItem('sf_flow_register', '1'); } catch (e) {}
}

/** Fermer login/inscription sans compte → retour accueil (évite écran navy vide). */
function installRoleEntryCloseOverlay() {
  var authOverlays = { studentLoginModal: true, companyLoginModal: true, registerModal: true };
  var _closeOverlay = closeOverlay;
  closeOverlay = function (id) {
    _closeOverlay(id);
    if (authOverlays[id] && !state.role) window.location.href = 'index.html';
  };
}

function ensureRoleEntryNav() {
  if (document.getElementById('roleEntryNav')) return;
  if (!document.documentElement.classList.contains('role-direct-entry')) return;
  var nav = document.createElement('div');
  nav.id = 'roleEntryNav';
  nav.setAttribute('style', 'position:fixed;top:0;left:0;right:0;z-index:150;padding:14px 22px;background:#0B1E3D;border-bottom:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;align-items:center;font-family:DM Sans,sans-serif');
  nav.innerHTML = '<a href="index.html" style="color:rgba(255,255,255,.85);text-decoration:none;font-size:14px">← Retour à l\'accueil</a><span style="font-family:Syne,sans-serif;font-weight:800;color:#fff;font-size:15px">Stage<span style="color:#00D4FF">Flow</span></span>';
  document.body.prepend(nav);
}

function openRoleAuthOrHome(openFn) {
  try { openFn(); } catch (e) { console.error(e); }
  requestAnimationFrame(function () {
    var hasOpen = document.querySelector('.modal-overlay.open');
    var univ = document.getElementById('univAuthScreen');
    var univOpen = univ && getComputedStyle(univ).display !== 'none';
    if (!hasOpen && !univOpen && !state.role) {
      try { openFn(); } catch (e2) { console.error(e2); }
    }
    hasOpen = document.querySelector('.modal-overlay.open');
    univOpen = univ && getComputedStyle(univ).display !== 'none';
    if (!hasOpen && !univOpen && !state.role) window.location.href = 'index.html';
  });
}
function flowUserDisplayName(user) {
  if (!user) return '';
  var name = user.name || '';
  var company = user.company || '';
  if (company && name.indexOf(company) === -1) return name + ' — ' + company;
  return name;
}
