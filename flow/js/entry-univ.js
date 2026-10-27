// Entrée flow — univ
(function flowRoleEntry(){
  hideAccessGuardImmediate();
  hideLanding();
  ensureRoleEntryNav();
  installRoleEntryCloseOverlay();

  window.closeUnivAuth = function(){ window.location.href = 'index.html'; };
  if (location.protocol === 'file:') {
    var page = (location.pathname.split(/[/\\]/).pop() || 'index.html');
    window.location.replace('https://stageflow-9775.onrender.com/' + page + location.search);
    return;
  }
  var isRegister = flowWantsRegister();
  state.authMode = isRegister ? 'register' : 'login';
  document.getElementById('univAuthScreen').style.display = 'flex';
  renderUnivAuth();
  dismissAccessGuard();
})();
