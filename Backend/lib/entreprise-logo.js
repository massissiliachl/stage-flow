/** Extrait l'URL / data URL du logo depuis la colonne JSONB `logo`. */
function parseEntrepriseLogoUrl(logoRaw) {
  if (!logoRaw) return '';
  let logo = logoRaw;
  if (typeof logo === 'string') {
    try {
      logo = JSON.parse(logo);
    } catch (_) {
      return '';
    }
  }
  if (typeof logo !== 'object' || !logo) return '';
  return logo.imageDataUrl || logo.pngUrl || '';
}

/** Valide une image base64 (PNG, JPEG, WebP) — max ~512 Ko encodé. */
function sanitizeEntrepriseLogoImage(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(s)) return null;
  if (s.length > 700000) return null;
  return s;
}

module.exports = { parseEntrepriseLogoUrl, sanitizeEntrepriseLogoImage };
