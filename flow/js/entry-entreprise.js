// Entrée flow — entreprise
(function flowRoleEntry(){
  hideAccessGuardImmediate();
  hideLanding();
  ensureRoleEntryNav();
  installRoleEntryCloseOverlay();

  window.closeUnivAuth = function(){ window.location.href = 'index.html'; };

  window.logout = function(){ window.location.href = 'index.html'; };
  if (location.protocol === 'file:') {
    var page = (location.pathname.split(/[/\\]/).pop() || 'index.html');
    window.location.replace('https://stageflow-9775.onrender.com/' + page + location.search);
    return;
  }
  window.showEntrepriseRegisterForm = function(){
    var m = document.getElementById('companyLoginModal');
    if (m) m.classList.remove('open');
    openRegisterModal();
  };
  if (flowWantsRegister()) {
    openRoleAuthOrHome(openRegisterModal);
  } else {
    openRoleAuthOrHome(openCompanyLoginModal);
  }
  dismissAccessGuard();
  loadCompaniesFromDb().catch(function () {});
})();
