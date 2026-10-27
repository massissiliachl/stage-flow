(function () {
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  const onApiHost = window.location.port === '3000' || (window.location.pathname || '').startsWith('/adminflow');
  if (onApiHost) {
    window.ADMIN_API_BASE = window.location.origin;
  } else if (isLocal) {
    window.ADMIN_API_BASE = 'http://127.0.0.1:3000';
  } else {
    window.ADMIN_API_BASE = 'https://stage-flow-6rl5.onrender.com';
  }
})();
