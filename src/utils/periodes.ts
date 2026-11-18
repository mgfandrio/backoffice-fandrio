import { dateISO } from './format';

/** Périodes proposées dans les écrans de chiffre d'affaires. */
export const PERIODES: Record<string, string> = {
  ce_mois: 'Ce mois-ci',
  aujourdhui: 'Aujourd’hui',
  hier: 'Hier',
  cette_semaine: 'Cette semaine',
  mois_dernier: 'Le mois dernier',
  douze_mois: 'Les 12 derniers mois',
  cette_annee: 'Cette année',
  dates: 'Choisir les dates…',
};
export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** Bornes (AAAA-MM-JJ) d'une période prédéfinie. */
export function bornes(periode: string): { du: string; au: string } {
  const auj = new Date();
  const j = (d: Date) => dateISO(d);
  switch (periode) {
    case 'aujourdhui':
      return { du: j(auj), au: j(auj) };
    case 'hier': {
      const h = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() - 1);
      return { du: j(h), au: j(h) };
    }
    case 'cette_semaine': {
      const lundi = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() - ((auj.getDay() + 6) % 7));
      return { du: j(lundi), au: j(auj) };
    }
    case 'mois_dernier':
      return { du: j(new Date(auj.getFullYear(), auj.getMonth() - 1, 1)), au: j(new Date(auj.getFullYear(), auj.getMonth(), 0)) };
    case 'douze_mois':
      return { du: j(new Date(auj.getFullYear(), auj.getMonth() - 11, 1)), au: j(auj) };
    case 'cette_annee':
      return { du: j(new Date(auj.getFullYear(), 0, 1)), au: j(auj) };
    default:
      return { du: j(new Date(auj.getFullYear(), auj.getMonth(), 1)), au: j(auj) };
  }
}

/** Libellé court d'une période : « novembre 2026 », « les 12 derniers mois »… */
export function libellePeriode(periode: string, du: string, au: string): string {
  if (periode === 'dates') return `du ${dateFr(du)} au ${dateFr(au)}`;
  if (periode === 'ce_mois') return `${MOIS[new Date().getMonth()]} ${new Date().getFullYear()}`;
  return PERIODES[periode].toLowerCase();
}

export const dateFr = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
const jourCourt = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${Number(d)} ${MOIS_COURTS[Number(m) - 1]}`;
};

/**
 * Série d'un graphique : un point par jour (jours sans vente compris),
 * ou par mois au-delà de 62 jours. `cles` : les montants à reprendre.
 */
export function serie<K extends string>(parJour: any[], du: string, au: string, cles: K[]) {
  type Point = { cle: string; libelle: string } & Record<K, number>;
  const index = new Map(parJour.map((p) => [p.jour, p]));
  const jours: Point[] = [];
  const d = new Date(`${du}T00:00:00`);
  const fin = new Date(`${au}T00:00:00`);
  while (d <= fin) {
    const cle = dateISO(d);
    const p = index.get(cle);
    jours.push({ cle, libelle: jourCourt(cle), ...Object.fromEntries(cles.map((k) => [k, Number(p?.[k] || 0)])) } as Point);
    d.setDate(d.getDate() + 1);
  }
  if (jours.length <= 62) return { points: jours, parMois: false };
  const mois = new Map<string, Point>();
  jours.forEach((x) => {
    const cle = x.cle.slice(0, 7);
    const m = mois.get(cle) || ({ cle, libelle: `${MOIS_COURTS[Number(cle.slice(5, 7)) - 1]} ${cle.slice(2, 4)}`, ...Object.fromEntries(cles.map((k) => [k, 0])) } as Point);
    cles.forEach((k) => ((m as any)[k] += x[k]));
    mois.set(cle, m);
  });
  return { points: [...mois.values()], parMois: true };
}
