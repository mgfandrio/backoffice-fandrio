/**
 * Session de l'admin connecté.
 *
 * Gardée dans sessionStorage (et non localStorage) : elle disparaît à la
 * fermeture de l'onglet, ce qui limite les risques sur un poste partagé.
 */

export type Role = 1 | 2 | 3; // 1 client, 2 admin compagnie, 3 admin système

export interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  role: Role;
  compagnie_id: number | null;
  compagnie: { id: number; nom: string; logo: string | null; localisation: string | null } | null;
  statut: number;
  photo: string | null;
  /** Admin compagnie créé par FANDRIO : seul à gérer l'équipe. */
  admin_principal?: boolean;
  /** Mot de passe donné par un autre : à changer avant de continuer. */
  mdp_provisoire?: boolean;
}

const CLE_TOKEN = 'fandrio.token';
const CLE_UTILISATEUR = 'fandrio.utilisateur';
export const EVENEMENT_SESSION = 'fandrio:session';

function lire<T>(cle: string): T | null {
  try {
    const v = sessionStorage.getItem(cle);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

function prevenir(detail: { raison: 'connexion' | 'maj' | 'deconnexion' | 'expiree' }) {
  window.dispatchEvent(new CustomEvent(EVENEMENT_SESSION, { detail }));
}

export const session = {
  token(): string | null {
    return lire<string>(CLE_TOKEN);
  },
  utilisateur(): Utilisateur | null {
    return lire<Utilisateur>(CLE_UTILISATEUR);
  },
  enregistrer(token: string, utilisateur: Utilisateur, raison: 'connexion' | 'maj' = 'connexion') {
    try {
      sessionStorage.setItem(CLE_TOKEN, JSON.stringify(token));
      sessionStorage.setItem(CLE_UTILISATEUR, JSON.stringify(utilisateur));
    } catch {
      /* stockage indisponible (navigation privée stricte) : la session vit en mémoire de la page */
    }
    prevenir({ raison });
  },
  majUtilisateur(modif: Partial<Utilisateur>) {
    const u = this.utilisateur();
    const t = this.token();
    if (u && t) this.enregistrer(t, { ...u, ...modif }, 'maj');
  },
  vider(raison: 'deconnexion' | 'expiree' = 'deconnexion') {
    try {
      sessionStorage.removeItem(CLE_TOKEN);
      sessionStorage.removeItem(CLE_UTILISATEUR);
    } catch {
      /* rien */
    }
    prevenir({ raison });
  },
};
