// Entrée flow — etudiant
(function flowRoleEntry(){
  var guard = document.getElementById('accessGuard');
  if (guard) guard.style.display = 'none';
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
  window.showStudentRegisterForm = function(){
    openStudentRegisterModal();
  };
  if (location.protocol === 'file:') {
    var page = (location.pathname.split(/[/\\]/).pop() || 'index.html');
    window.location.replace('https://stageflow-9775.onrender.com/' + page + location.search);
    return;
  }
  loadCompaniesFromDb().finally(function(){
    if (new URLSearchParams(window.location.search).get('register')) {
      openStudentRegisterModal();
    } else {
      openStudentLoginModal();
    }
  });
})();
