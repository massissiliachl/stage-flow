// Helpers flow — pages rôle sans #landing
function hideLanding() {
  var el = document.getElementById('landing');
  if (el) el.style.display = 'none';
}
function showLanding() {
  var el = document.getElementById('landing');
  if (el) { el.style.display = 'flex'; el.style.flexDirection = 'column'; }
}
function dismissAccessGuard() {
  var guard = document.getElementById('accessGuard');
  if (!guard || guard.style.display === 'none') return;
  guard.style.transition = 'opacity .35s';
  guard.style.opacity = '0';
  setTimeout(function () { guard.style.display = 'none'; }, 350);
}
function flowUserDisplayName(user) {
  if (!user) return '';
  var name = user.name || '';
  var company = user.company || '';
  if (company && name.indexOf(company) === -1) return name + ' — ' + company;
  return name;
}
