// Entrée flow — univ
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
  if (location.protocol === 'file:') {
    var page = (location.pathname.split(/[/\\]/).pop() || 'index.html');
    window.location.replace('https://stage-flow-6rl5.onrender.com/' + page + location.search);
    return;
  }
  showUnivAuth();
})();
