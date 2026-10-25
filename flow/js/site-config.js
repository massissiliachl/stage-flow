/**
 * URL publique StageFlow (QR code, partage, emails).
 * En local : origine du navigateur ; sinon URL de production Render.
 */
const STAGEFLOW_PUBLIC_URL = (function resolveStageflowPublicUrl() {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const o = window.location.origin;
    if (o && o !== 'null' && !/^file:/i.test(o)) {
      return o.replace(/\/$/, '') + '/';
    }
  }
  return 'https://stageflow-9775.onrender.com/';
})();

function stageflowSiteQrImageSrc() {
  if (typeof STAGEFLOW_QR_DATA_URL === 'string' && STAGEFLOW_QR_DATA_URL.indexOf('data:image') === 0) {
    return STAGEFLOW_QR_DATA_URL;
  }
  return 'assets/stageflow-site-qr.png';
}

/**
 * Injecte le bloc QR (image + lien) dans un conteneur.
 * @param {HTMLElement|string} target
 * @param {{ size?: number, showLabel?: boolean, dark?: boolean }} opts
 */
function renderStageflowSiteQr(target, opts) {
  opts = opts || {};
  const size = opts.size || 140;
  const showLabel = opts.showLabel !== false;
  const dark = !!opts.dark;
  const el = typeof target === 'string' ? document.getElementById(target) : target;
  if (!el) return;
  const url = STAGEFLOW_PUBLIC_URL;
  const esc = function(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  };
  const labelColor = dark ? 'rgba(255,255,255,0.75)' : 'var(--text2)';
  const urlColor = dark ? 'var(--cyan)' : 'var(--cyan2)';
  const bg = dark ? 'rgba(255,255,255,0.95)' : '#fff';
  el.innerHTML =
    '<div class="sf-site-qr" style="display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center">'
    + '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" title="Ouvrir StageFlow">'
    + '<img src="' + stageflowSiteQrImageSrc() + '" alt="QR code — StageFlow" width="' + size + '" height="' + size + '" '
    + 'style="width:' + size + 'px;height:' + size + 'px;border-radius:12px;padding:8px;background:' + bg + ';box-shadow:0 4px 20px rgba(11,30,61,0.12)">'
    + '</a>'
    + (showLabel
      ? '<div style="max-width:220px"><div style="font-size:11px;font-weight:600;color:' + labelColor + ';letter-spacing:.3px">Accéder au site</div>'
        + '<a href="' + esc(url) + '" style="font-size:11px;color:' + urlColor + ';word-break:break-all">' + esc(url) + '</a></div>'
      : '')
    + '</div>';
}
