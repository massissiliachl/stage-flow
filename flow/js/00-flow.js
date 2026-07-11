// Helpers flow — pages rôle sans #landing
function hideLanding() {
  var el = document.getElementById('landing');
  if (el) el.style.display = 'none';
}
function showLanding() {
  var el = document.getElementById('landing');
  if (el) { el.style.display = 'flex'; el.style.flexDirection = 'column'; }
}
function flowUserDisplayName(user) {
  if (!user) return '';
  var name = user.name || '';
  var company = user.company || '';
  if (company && name.indexOf(company) === -1) return name + ' — ' + company;
  return name;
}
