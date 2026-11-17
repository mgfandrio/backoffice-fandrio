import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Bell, BellOff, Bus, CheckCheck, CircleCheck, CircleX, Clock, Flag, Landmark, Ticket, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir, useNonLues } from '@/api/requetes';
import { useAuth } from '@/auth/AuthContext';
import { Bouton, Carte, Erreur, Squelette, Vide } from '@/components/ui';
import { depuis } from '@/utils/format';

/** Icône et teinte selon le type de notification (mêmes types que l'app mobile). */
function apparence(type: number): { icone: LucideIcon; ton: string } {
  switch (type) {
    case 1:
    case 12:
      return { icone: CircleCheck, ton: 'bg-succes-fond text-succes' };
    case 2:
    case 11:
      return { icone: Clock, ton: 'bg-alerte-fond text-alerte' };
    case 3:
    case 10:
      return { icone: CircleX, ton: 'bg-danger-fond text-danger' };
    case 4:
      return { icone: Ticket, ton: 'bg-ocean-50 text-ocean-800' };
    case 8:
      return { icone: Landmark, ton: 'bg-ocean-50 text-ocean-800' };
    case 13:
      return { icone: Bus, ton: 'bg-ocean-50 text-ocean-800' };
    case 14:
      return { icone: Flag, ton: 'bg-succes-fond text-succes' };
    case 15:
      return { icone: AlertTriangle, ton: 'bg-danger-fond text-danger' };
    case 16:
      return { icone: Clock, ton: 'bg-alerte-fond text-alerte' };
    case 17:
      return { icone: Users, ton: 'bg-neutre-fond text-neutre' };
    default:
      return { icone: Bell, ton: 'bg-neutre-fond text-neutre' };
  }
}

export default function Notifications() {
  const { utilisateur } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filtre, setFiltre] = useState<'toutes' | 'non_lues'>('toutes');
  const { data: nonLues = 0 } = useNonLues();

  const liste = useInfiniteQuery({
    queryKey: ['notifications', 'liste'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => obtenir('/api/notifications', { page: pageParam, per_page: 30 }),
    getNextPageParam: (d: any) => (d?.pagination && d.pagination.current_page < d.pagination.last_page ? d.pagination.current_page + 1 : undefined),
    refetchInterval: 60_000,
  });

  const actualiser = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const lire = useMutation({ mutationFn: (id: number) => api.patch(`/api/notifications/${id}/read`), onSuccess: actualiser });
  const toutLire = useMutation({ mutationFn: () => api.patch('/api/notifications/read-all'), onSuccess: actualiser });

  const toutes: any[] = (liste.data?.pages || []).flatMap((p: any) => p?.notifications || []);
  const affichees = filtre === 'non_lues' ? toutes.filter((n) => Number(n.notif_statut) !== 3) : toutes;

  /** Ouvre l'écran concerné par la notification. */
  const ouvrir = (n: any) => {
    if (Number(n.notif_statut) !== 3) lire.mutate(n.notif_id);
    const type = Number(n.notif_type);
    if (utilisateur?.role === 2) {
      if (type >= 13 && type <= 17) return navigate('/compagnie/suivi');
      if (type === 8) return navigate('/compagnie/portefeuille');
      if (n.res_id) return navigate('/compagnie/reservations');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:px-7 sm:py-6">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Filtrer" className="flex gap-1.5 rounded-xl bg-white p-1 ring-1 ring-ligne">
          {(['toutes', 'non_lues'] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filtre === f}
              onClick={() => setFiltre(f)}
              className={`h-9 rounded-[9px] px-3.5 text-[13px] font-bold ${filtre === f ? 'bg-ocean-800 text-white' : 'text-gris hover:bg-fond'}`}
            >
              {f === 'toutes' ? 'Toutes' : `Non lues${nonLues ? ` (${nonLues})` : ''}`}
            </button>
          ))}
        </div>
        <span className="flex-1" />
        {nonLues > 0 && (
          <Bouton variante="secondaire" compact icone={CheckCheck} onClick={() => toutLire.mutate()} chargement={toutLire.isPending}>
            Tout marquer comme lu
          </Bouton>
        )}
      </div>

      {liste.isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => <Squelette key={i} className="h-20" />)}
        </div>
      ) : liste.isError ? (
        <Erreur message={messageErreur(liste.error)} onReessayer={() => liste.refetch()} />
      ) : affichees.length === 0 ? (
        <Carte>
          <Vide icone={BellOff} titre={filtre === 'non_lues' ? 'Tout est lu' : 'Aucune notification'}>
            {filtre === 'non_lues' ? 'Vous êtes à jour.' : 'Les réservations, paiements, collectes et voitures en route s’afficheront ici.'}
          </Vide>
        </Carte>
      ) : (
        <Carte className="overflow-hidden">
          <ul className="m-0 list-none p-0">
            {affichees.map((n, i) => {
              const a = apparence(Number(n.notif_type));
              const nonLue = Number(n.notif_statut) !== 3;
              return (
                <li key={n.notif_id} className={i ? 'border-t border-separateur' : ''}>
                  <button
                    type="button"
                    onClick={() => ouvrir(n)}
                    className={`flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-[#F8FAFD] ${nonLue ? 'bg-ocean-50/60' : ''}`}
                  >
                    <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${a.ton}`}>
                      <a.icone className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <b className="min-w-0 flex-1 text-sm">{n.notif_titre}</b>
                        <span className="flex-none text-xs font-semibold text-gris">{depuis(n.created_at || n.notif_date_envoi)}</span>
                      </span>
                      <span className="mt-0.5 block text-[13px] font-semibold leading-relaxed text-encre-douce">{n.notif_message}</span>
                    </span>
                    {nonLue && <span className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full bg-ocean-500" aria-label="Non lue" />}
                  </button>
                </li>
              );
            })}
          </ul>
          {liste.hasNextPage && (
            <div className="border-t border-separateur p-3 text-center">
              <Bouton variante="lien" onClick={() => liste.fetchNextPage()} chargement={liste.isFetchingNextPage}>
                Afficher plus
              </Bouton>
            </div>
          )}
        </Carte>
      )}
    </div>
  );
}
