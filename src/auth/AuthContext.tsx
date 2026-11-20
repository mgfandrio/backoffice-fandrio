import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ErreurApi } from '@/api/client';
import { EVENEMENT_SESSION, session, Utilisateur } from './session';

interface ContexteAuth {
  utilisateur: Utilisateur | null;
  /** La dernière session a expiré (message sur l'écran de connexion). */
  expiree: boolean;
  connecter: (identifiant: string, motDePasse: string) => Promise<Utilisateur>;
  deconnecter: () => Promise<void>;
}

const Contexte = createContext<ContexteAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(() => session.utilisateur());
  const [expiree, setExpiree] = useState(false);

  // Session modifiée ailleurs (jeton renouvelé, expiration, profil mis à jour)
  useEffect(() => {
    const ecoute = (e: Event) => {
      const raison = (e as CustomEvent).detail?.raison;
      setUtilisateur(session.utilisateur());
      if (raison === 'expiree') {
        setExpiree(true);
        queryClient.clear();
      }
    };
    window.addEventListener(EVENEMENT_SESSION, ecoute);
    return () => window.removeEventListener(EVENEMENT_SESSION, ecoute);
  }, [queryClient]);

  const connecter = useCallback(async (identifiant: string, motDePasse: string) => {
    const r = await api.post('/api/connexion', { identifiant: identifiant.trim(), motDePasse });
    const token: string | undefined = r.data?.token;
    const u: Utilisateur | undefined = r.data?.utilisateur;
    if (!r.data?.statut || !token || !u) throw new ErreurApi(r.data?.message || 'Identifiant ou mot de passe incorrect.');
    if (u.role !== 2 && u.role !== 3) {
      // Compte client : on ferme aussitôt la session ouverte côté API
      await api.post('/api/deconnexion', {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
      throw new ErreurApi("Cet espace est réservé aux administrateurs. Les voyageurs utilisent l'application mobile FANDRIO.");
    }
    queryClient.clear();
    session.enregistrer(token, u);
    setExpiree(false);
    return u;
  }, [queryClient]);

  const deconnecter = useCallback(async () => {
    await api.post('/api/deconnexion').catch(() => undefined);
    session.vider('deconnexion');
    queryClient.clear();
  }, [queryClient]);

  const valeur = useMemo(() => ({ utilisateur, expiree, connecter, deconnecter }), [utilisateur, expiree, connecter, deconnecter]);
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useAuth(): ContexteAuth {
  const c = useContext(Contexte);
  if (!c) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return c;
}

/** Page d'accueil d'un rôle. */
export function accueilDe(u: Utilisateur | null): string {
  return u?.role === 3 ? '/systeme' : '/compagnie';
}
