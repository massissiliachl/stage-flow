// Entrée flow — entreprise
(function flowRoleEntry(){
  hideLanding();
  
  window.closeUnivAuth = function(){ window.location.href = 'index.html'; };
  var _closeOverlay = closeOverlay;
  closeOverlay = function(id){
    if (id === 'studentLoginModal' || id === 'companyLoginModal') {
      _closeOverlay(id);
      if (!state.role) window.location.href = 'index.html';
      return;
    }
    _closeOverlay(id);
  };

  window.logout = function(){ window.location.href = 'index.html'; };
  if (location.protocol === 'file:') {
    var page = (location.pathname.split(/[/\\]/).pop() || 'index.html');
    window.location.replace('https://stageflow-9775.onrender.com/' + page + location.search);
    return;
  }
  window.showEntrepriseRegisterForm = function(){
    _closeOverlay('companyLoginModal');
    openRegisterModal();
  };
  if (new URLSearchParams(window.location.search).get('register')) {
    openRegisterModal();
  } else {
    openCompanyLoginModal();
  }
  dismissAccessGuard();
  loadCompaniesFromDb().catch(function () {});
})();
