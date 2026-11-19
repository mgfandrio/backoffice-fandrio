import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { useAuth } from '@/auth/AuthContext';

/** GET qui renvoie le corps JSON (les erreurs sont déjà normalisées par le client). */
export async function obtenir<T = any>(url: string, params?: Record<string, unknown>): Promise<T> {
  const r = await api.get(url, { params });
  return r.data as T;
}

/** Notifications non lues (cloche de la barre du haut), relu chaque minute. */
export function useNonLues() {
  const { utilisateur } = useAuth();
  return useQuery({
    queryKey: ['notifications', 'non-lues'],
    queryFn: async () => Number((await obtenir('/api/notifications/unread-count')).count) || 0,
    enabled: !!utilisateur,
    refetchInterval: 60_000,
  });
}

/** Pastilles du menu de l'admin compagnie : suivi des voyages et rappels de publication. */
export function useCompteursCompagnie() {
  const { utilisateur } = useAuth();
  const actif = utilisateur?.role === 2;
  const suivi = useQuery({
    queryKey: ['suivi', 'compteurs'],
    queryFn: async () => (await obtenir('/api/adminCompagnie/suivi/compteurs')).data as { a_cloturer: number; en_retard: number; en_route_vers_moi: number; total: number },
    enabled: actif,
    refetchInterval: 60_000,
  });
  const planning = useQuery({
    queryKey: ['planning', 'rappels'],
    queryFn: async () => (await obtenir('/api/adminCompagnie/voyage/rappels-publication')).data as { total: number; bientot_publies: any[]; a_publier: any[]; jours: number },
    enabled: actif,
    refetchInterval: 5 * 60_000,
  });
  const versements = useQuery({
    queryKey: ['versements', 'compteur'],
    queryFn: async () => (await obtenir('/api/adminCompagnie/versements/compteur')).data as { retard: number },
    enabled: actif,
    refetchInterval: 5 * 60_000,
  });
  return { suivi, planning, versements };
}

/** Pastille du menu de l'admin système : cas de paiement à vérifier. */
export function useCompteurControle() {
  const { utilisateur } = useAuth();
  return useQuery({
    queryKey: ['systeme', 'controle-paiements'],
    queryFn: async () => (await obtenir('/api/admin/controle-paiements')).data,
    enabled: utilisateur?.role === 3,
    refetchInterval: 2 * 60_000,
  });
}
