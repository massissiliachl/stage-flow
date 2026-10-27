// Entrée flow — etudiant
(function flowRoleEntry(){
  hideAccessGuardImmediate();
  hideLanding();
  ensureRoleEntryNav();
  installRoleEntryCloseOverlay();

  window.closeUnivAuth = function(){ window.location.href = 'index.html'; };

  window.logout = function(){ window.location.href = 'index.html'; };
  window.showStudentRegisterForm = function(){
    openStudentRegisterModal();
  };
  if (location.protocol === 'file:') {
    var page = (location.pathname.split(/[/\\]/).pop() || 'index.html');
    window.location.replace('https://stageflow-9775.onrender.com/' + page + location.search);
    return;
  }
  function openAuthEntry() {
    if (flowWantsRegister()) {
      openRoleAuthOrHome(openStudentRegisterModal);
    } else {
      openRoleAuthOrHome(openStudentLoginModal);
    }
    dismissAccessGuard();
  }

  openAuthEntry();
  loadCompaniesFromDb().catch(function () {});
})();
