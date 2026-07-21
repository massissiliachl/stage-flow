const crypto = require('crypto');

const HASH_ALGORITHM = 'SHA-256';

function sortObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortObject(value[key]);
  }
  return sorted;
}

function canonicalJson(obj) {
  return JSON.stringify(sortObject(obj));
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

function buildDocumentPayload(row, sig) {
  const parties = sig.parties || {};
  return {
    reference: row.reference || '',
    student_name: row.student_name || '',
    entreprise_nom: row.entreprise_nom || '',
    entreprise_id: row.entreprise_id ? Number(row.entreprise_id) : null,
    theme: row.theme || '',
    periode: row.periode || '',
    faculte: row.faculte || '',
    departement: row.departement || '',
    parties,
  };
}

function computeDocumentHash(row, sig) {
  return sha256Hex(canonicalJson(buildDocumentPayload(row, sig)));
}

function computeSignatureHash({ conventionId, role, documentHash, signatureType, signatureContent, signedAt }) {
  return sha256Hex(
    canonicalJson({
      conventionId: Number(conventionId),
      role,
      documentHash,
      signatureType,
      signatureContent,
      signedAt,
      algorithm: HASH_ALGORITHM,
    })
  );
}

function computeFinalIntegrityHash(documentHash, sigEntreprise, sigUniversite) {
  const entHash = sigEntreprise && sigEntreprise.hash ? sigEntreprise.hash : '';
  const univHash = sigUniversite && sigUniversite.hash ? sigUniversite.hash : '';
  if (!documentHash || !entHash || !univHash) return null;
  return sha256Hex(
    canonicalJson({
      documentHash,
      signatures: { entreprise: entHash, universite: univHash },
      algorithm: HASH_ALGORITHM,
    })
  );
}

function formatDateFr(iso) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('fr-DZ')
    + ' à '
    + d.toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })
  );
}

function buildStoredSignature(conventionId, role, clientSignature, documentHash) {
  const signedAt = new Date().toISOString();
  const signatureType = clientSignature.type === 'type' ? 'type' : 'draw';
  const signatureContent =
    signatureType === 'type'
      ? String(clientSignature.text || '').trim()
      : String(clientSignature.data || '');

  const hash = computeSignatureHash({
    conventionId,
    role,
    documentHash,
    signatureType,
    signatureContent,
    signedAt,
  });

  return {
    type: signatureType,
    data: clientSignature.data || null,
    text: clientSignature.text || null,
    date: formatDateFr(signedAt),
    signedAt,
    hash,
    documentHash,
    algorithm: HASH_ALGORITHM,
  };
}

function verifyConventionIntegrity(row) {
  const sig = typeof row.signatures === 'object'
    ? row.signatures
    : JSON.parse(row.signatures || '{}');

  const expectedDocumentHash = computeDocumentHash(row, sig);
  const storedDocumentHash = row.document_hash || null;
  const documentValid = !storedDocumentHash || storedDocumentHash === expectedDocumentHash;

  const roles = ['entreprise', 'universite'];
  const signatureChecks = {};

  for (const role of roles) {
    const stored = sig[role];
    if (!stored || !stored.hash) {
      signatureChecks[role] = { present: false, valid: null };
      continue;
    }

    const signatureType = stored.type === 'type' ? 'type' : 'draw';
    const signatureContent =
      signatureType === 'type'
        ? String(stored.text || '').trim()
        : String(stored.data || '');

    const expectedHash = computeSignatureHash({
      conventionId: row.id,
      role,
      documentHash: stored.documentHash || expectedDocumentHash,
      signatureType,
      signatureContent,
      signedAt: stored.signedAt,
    });

    signatureChecks[role] = {
      present: true,
      valid: stored.hash === expectedHash,
      hash: stored.hash,
    };
  }

  const expectedFinalHash = computeFinalIntegrityHash(
    expectedDocumentHash,
    sig.entreprise,
    sig.universite
  );
  const storedFinalHash = row.final_integrity_hash || null;
  const finalValid =
    !storedFinalHash || !expectedFinalHash || storedFinalHash === expectedFinalHash;

  const allSignaturesValid = roles.every((role) => {
    const check = signatureChecks[role];
    return !check.present || check.valid;
  });

  return {
    valid: documentValid && allSignaturesValid && finalValid,
    algorithm: HASH_ALGORITHM,
    documentHash: expectedDocumentHash,
    storedDocumentHash,
    documentValid,
    signatureChecks,
    finalIntegrityHash: expectedFinalHash,
    storedFinalIntegrityHash: storedFinalHash,
    finalValid,
    fullySigned: Boolean(row.signed_entreprise && row.signed_universite),
  };
}

module.exports = {
  HASH_ALGORITHM,
  canonicalJson,
  sha256Hex,
  buildDocumentPayload,
  computeDocumentHash,
  computeSignatureHash,
  computeFinalIntegrityHash,
  buildStoredSignature,
  verifyConventionIntegrity,
};
