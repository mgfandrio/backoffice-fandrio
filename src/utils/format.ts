/** Montant en ariary : « 1 245 000 Ar ». */
export function ariary(n: number | string | null | undefined, avecUnite = true): string {
  const v = Math.round(Number(n) || 0);
  const t = v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return avecUnite ? `${t} Ar` : t;
}

export function nombre(n: number | string | null | undefined): string {
  return ariary(n, false);
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Date locale AAAA-MM-JJ (pour l'API). */
export function dateISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** « Lundi 16 novembre ». */
export function jourLong(d = new Date()): string {
  const j = JOURS[d.getDay()];
  return `${j.charAt(0).toUpperCase()}${j.slice(1)} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

export function nomMois(d = new Date()): string {
  return MOIS[d.getMonth()];
}

/** « 07:30 » depuis « 07:30:00 » ou une date ISO. */
export function heure(v?: string | null): string {
  if (!v) return '';
  if (/^\d{2}:\d{2}/.test(v)) return v.slice(0, 5);
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** « il y a 5 min », « il y a 2 h », « 14 nov. ». */
export function depuis(v?: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  if (min < 24 * 60) return `Il y a ${Math.floor(min / 60)} h`;
  if (min < 7 * 24 * 60) return `Il y a ${Math.floor(min / 1440)} j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/** Date « AAAA-MM-JJ » (heure locale) → Date, ou null. */
export function lireDate(v?: string | null): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** « Aujourd'hui », « Demain » ou « mer. 19 nov. ». */
export function jourRelatif(v?: string | null): string {
  const d = lireDate(v);
  if (!d) return '';
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  const ecart = Math.round((d.getTime() - auj.getTime()) / 86400000);
  if (ecart === 0) return 'Aujourd’hui';
  if (ecart === 1) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Montant abrégé pour les axes de graphique : « 165 k », « 1,2 M ». */
export function ariaryCourt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} k`;
  return String(Math.round(n));
}

export function pluriel(n: number, mot: string, motPluriel?: string): string {
  return `${n} ${n > 1 ? motPluriel || `${mot}s` : mot}`;
}

export function initiales(texte?: string | null): string {
  return (texte || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join('');
}
