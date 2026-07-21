// Hashage SHA-256 côté client (mode démo local, aligné sur le backend)
function sortObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  const sorted = {};
  Object.keys(value).sort().forEach(function(key) {
    sorted[key] = sortObject(value[key]);
  });
  return sorted;
}

function canonicalJson(obj) {
  return JSON.stringify(sortObject(obj));
}

async function sha256Hex(input) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(function(b) {
    return b.toString(16).padStart(2, '0');
  }).join('');
}

async function computeLocalSignatureHash(conventionId, role, documentSeed, signatureType, signatureContent) {
  const signedAt = new Date().toISOString();
  return sha256Hex(canonicalJson({
    conventionId: Number(conventionId),
    role: role,
    documentHash: documentSeed,
    signatureType: signatureType,
    signatureContent: signatureContent,
    signedAt: signedAt,
    algorithm: 'SHA-256',
  }));
}

async function computeLocalDocumentSeed(conv) {
  return sha256Hex(canonicalJson({
    reference: conv.reference || ('SF-2026-0' + (conv.id + 46)),
    student_name: conv.etudiant || '',
    entreprise_nom: conv.company || '',
    theme: conv.theme || '',
    periode: conv.periode || '',
    faculte: conv.faculte || '',
    departement: conv.departement || '',
  }));
}

async function computeLocalFinalIntegrityHash(documentHash, sigEntreprise, sigUniversite) {
  if (!documentHash || !sigEntreprise || !sigEntreprise.hash || !sigUniversite || !sigUniversite.hash) {
    return null;
  }
  return sha256Hex(canonicalJson({
    documentHash: documentHash,
    signatures: { entreprise: sigEntreprise.hash, universite: sigUniversite.hash },
    algorithm: 'SHA-256',
  }));
}

async function previewSignatureHash(signatureType, signatureContent) {
  if (!signatureContent) return null;
  return sha256Hex(canonicalJson({
    preview: true,
    signatureType: signatureType,
    signatureContent: signatureContent,
    algorithm: 'SHA-256',
  }));
}
