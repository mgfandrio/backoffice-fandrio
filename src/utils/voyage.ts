import type { Tonalite } from '@/components/ui';

/**
 * États d'un voyage, mêmes règles et mêmes libellés que l'app mobile
 * (app-fandrio/app/utils/voyageStatut.ts).
 * voyage_statut : 1 programmé, 2 en cours, 3 terminé, 4 annulé.
 * is_active false = en pause ; publie false = planifié mais non publié.
 */

export function statutValeur(v: any): number {
  return Number(v?.statut ?? v?.voyage_statut ?? 1);
}

export function estNonPublie(v: any): boolean {
  return statutValeur(v) === 1 && (v?.publie === false || v?.voyage_publie === false);
}

export function publicationPrevue(v: any): Date | null {
  const t = v?.publication_prevue;
  if (!estNonPublie(v) || !t) return null;
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

export function estEnPause(v: any): boolean {
  const s = statutValeur(v);
  return (s === 1 || s === 2) && v?.is_active === false && !estNonPublie(v);
}

export function remplissage(v: any) {
  const total = Number(v?.places_disponibles) || 0;
  const pris = Number(v?.places_reservees) || 0;
  return { total, pris, complet: total > 0 && pris >= total, pct: total > 0 ? Math.min((pris / total) * 100, 100) : 0 };
}

export function etatVoyage(v: any): { libelle: string; tonalite: Tonalite } {
  const s = statutValeur(v);
  if (v?.suivi === 'en_route') return { libelle: 'En route', tonalite: 'marine' };
  if (v?.suivi === 'arrive') return { libelle: 'Arrivé', tonalite: 'succes' };
  if (s === 4) return { libelle: 'Annulé', tonalite: 'danger' };
  if (s === 3) return { libelle: 'Terminé', tonalite: 'neutre' };
  if (estNonPublie(v)) return { libelle: publicationPrevue(v) ? 'Publication programmée' : 'Non publié', tonalite: 'neutre' };
  if (estEnPause(v)) return { libelle: 'En pause', tonalite: 'alerte' };
  if (s === 2) return { libelle: 'En cours', tonalite: 'alerte' };
  if (remplissage(v).complet) return { libelle: 'Complet', tonalite: 'succes' };
  return { libelle: 'Programmé', tonalite: 'info' };
}

export const libelleType = (t: any) => (Number(t) === 2 ? 'Nuit' : 'Jour');

export const trajetDe = (v: any) => `${v?.trajet?.province_depart || 'Départ'} → ${v?.trajet?.province_arrivee || 'Arrivée'}`;

export const chauffeurDe = (v: any) => {
  const c = v?.voiture?.chauffeur;
  return c ? `${c.prenom || ''} ${c.nom || ''}`.trim() : '';
};

/** « 14 nov. à 08:00 » */
export function dateHeureCourte(d: Date): string {
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
