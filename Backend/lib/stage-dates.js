/**
 * Calcule les dates de début/fin de stage à partir de la durée (ex. "2 mois").
 */

function parseStageDurationMonths(text) {
  const t = String(text || '').toLowerCase();
  const match = t.match(/(\d+)\s*mois/);
  if (match) return Math.min(Math.max(parseInt(match[1], 10), 1), 6);
  if (t.includes('semestre') || t.includes('6')) return 6;
  return 2;
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function computeStageDates(duree, startDate) {
  const start = startDate ? new Date(startDate) : new Date();
  const months = parseStageDurationMonths(duree);
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  return {
    dateDebut: toDateString(start),
    dateFin: toDateString(end),
    durationMonths: months,
  };
}

function isStagePeriodEnded(dateFin) {
  if (!dateFin) return false;
  const end = new Date(String(dateFin).slice(0, 10) + 'T23:59:59');
  return new Date() >= end;
}

module.exports = {
  parseStageDurationMonths,
  computeStageDates,
  isStagePeriodEnded,
};
