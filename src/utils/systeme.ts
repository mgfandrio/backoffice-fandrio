import type { Tonalite } from '@/components/ui';

/** Collecte de commission : 2 = payée ; en attente, ou en retard si l'échéance (JJ/MM/AAAA) est passée. */
export function etatCollecte(c: any): { cle: 'payee' | 'attente' | 'retard'; libelle: string; tonalite: Tonalite } {
  if (Number(c?.statut) === 2) return { cle: 'payee', libelle: 'Payée', tonalite: 'succes' };
  const [j, m, a] = String(c?.date_prevue || '').split('/').map(Number);
  const echeance = a ? new Date(a, m - 1, j) : null;
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  return echeance && echeance < auj ? { cle: 'retard', libelle: 'En retard', tonalite: 'danger' } : { cle: 'attente', libelle: 'À encaisser', tonalite: 'alerte' };
}

/** Compagnie : 1 active, 2 inactive, 3 supprimée ; suspendue = commission impayée. */
export function etatCompagnie(statut: any, suspendu?: boolean): { libelle: string; tonalite: Tonalite } {
  const s = Number(statut);
  if (s === 3) return { libelle: 'Supprimée', tonalite: 'danger' };
  if (s === 2) return { libelle: 'Inactive', tonalite: 'neutre' };
  if (suspendu) return { libelle: 'Suspendue', tonalite: 'danger' };
  return { libelle: 'Active', tonalite: 'succes' };
}

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
/** « 2026-11 » → « nov. 2026 » */
export function libelleMois(m?: string): string {
  const [a, n] = String(m || '').split('-');
  return MOIS_COURTS[Number(n) - 1] ? `${MOIS_COURTS[Number(n) - 1]} ${a}` : '';
}
