import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Phone, RefreshCw, Search, Trash2, UserCheck, UserX, Users } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Carte, Dialogue, Erreur, Pastille, Selecteur, Squelette, Tiroir, Vide } from '@/components/ui';
import { MotDePasseProvisoire } from '@/components/systeme/MotDePasseProvisoire';
import { Kpi, Tableau } from '@/components/tableau';
import { initiales, nombre } from '@/utils/format';

/** Utilisateurs (clients) : consulter, désactiver, réactiver, supprimer, restaurer. */

const STATUTS: Record<number, { libelle: string; tonalite: 'succes' | 'neutre' | 'danger' }> = {
  1: { libelle: 'Actif', tonalite: 'succes' },
  2: { libelle: 'Désactivé', tonalite: 'neutre' },
  3: { libelle: 'Supprimé', tonalite: 'danger' },
};
const nomDe = (u: any) => `${u?.prenom || ''} ${u?.nom || ''}`.trim() || u?.email || 'Utilisateur';
const dateFr = (d?: string) => String(d || '').slice(0, 10).split('-').reverse().join('/');

export default function Utilisateurs() {
  const [statut, setStatut] = useState('');
  const [saisie, setSaisie] = useState('');
  const [recherche, setRecherche] = useState('');
  const [fiche, setFiche] = useState<any>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setRecherche(saisie.trim()), 400);
    return () => window.clearTimeout(t);
  }, [saisie]);

  const stats = useQuery({ queryKey: ['systeme', 'utilisateurs', 'stats'], queryFn: async () => (await obtenir('/api/admin/utilisateurs/statistiques')).data });
  const liste = useInfiniteQuery({
    queryKey: ['systeme', 'utilisateurs', 'liste', statut, recherche],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => (await obtenir('/api/admin/utilisateurs/recupListeUtilisateur', { page: pageParam, per_page: 50, ...(statut ? { statut } : {}), ...(recherche ? { recherche } : {}) })).data,
    getNextPageParam: (d: any) => (d?.pagination && d.pagination.current_page < d.pagination.last_page ? d.pagination.current_page + 1 : undefined),
  });
  const utilisateurs: any[] = useMemo(() => (liste.data?.pages || []).flatMap((p: any) => p?.utilisateurs || []), [liste.data]);
  const s = stats.data;

  return (
    <div className="flex flex-col gap-4 p-4 sm:px-7 sm:py-6">
      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        <Kpi marine icone={Users} libelle="Utilisateurs" valeur={nombre(s?.total)} detail={`${nombre(s?.nouveaux_ce_mois)} nouveaux ce mois`} chargement={stats.isLoading} />
        <Kpi icone={UserCheck} ton="succes" libelle="Actifs" valeur={nombre(s?.actifs)} chargement={stats.isLoading} />
        <Kpi icone={UserX} ton="neutre" libelle="Désactivés" valeur={nombre(s?.inactifs)} chargement={stats.isLoading} />
        <Kpi icone={Trash2} ton="danger" libelle="Supprimés" valeur={nombre(s?.supprimes)} chargement={stats.isLoading} />
      </section>

      <Carte className="flex flex-wrap items-end gap-3 p-4">
        <Selecteur libelle="Afficher" value={statut} onChange={(e) => setStatut(e.target.value)} className="min-w-[220px] flex-1">
          <option value="">Tous les utilisateurs</option>
          <option value="1">Actifs</option>
          <option value="2">Désactivés</option>
          <option value="3">Supprimés</option>
        </Selecteur>
        <label className="flex min-w-[260px] flex-[2] flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-encre-douce">Recherche</span>
          <span className="flex h-11 items-center gap-2 rounded-champ border-[1.5px] border-champ bg-white px-3 focus-within:border-ocean-800">
            <Search className="h-4 w-4 text-encre-douce" aria-hidden />
            <input value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="Nom, e-mail, téléphone…" className="min-w-0 flex-1 border-0 bg-transparent text-[14px] font-semibold outline-none placeholder:text-gris-clair" />
          </span>
        </label>
      </Carte>

      <Carte className="overflow-hidden">
        {liste.isLoading ? (
          <div className="flex flex-col gap-2 p-4">{[0, 1, 2].map((i) => <Squelette key={i} className="h-12" />)}</div>
        ) : liste.isError ? (
          <div className="p-4">
            <Erreur message={messageErreur(liste.error)} onReessayer={() => liste.refetch()} />
          </div>
        ) : utilisateurs.length === 0 ? (
          <Vide icone={Users} titre={recherche || statut ? 'Aucun utilisateur ne correspond' : 'Aucun utilisateur'} />
        ) : (
          <Tableau colonnes={[{ titre: 'Utilisateur' }, { titre: 'E-mail' }, { titre: 'Téléphone' }, { titre: 'Inscrit le' }, { titre: 'État' }, { titre: 'Action', cache: true }]}>
            {utilisateurs.map((u) => (
              <tr key={u.id}>
                <td>
                  <span className="flex items-center gap-3">
                    {u.photo ? <img src={u.photo} alt="" className="h-9 w-9 rounded-[10px] object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-ocean-50 text-[13px] font-extrabold text-ocean-800">{initiales(nomDe(u))}</span>}
                    <b>{nomDe(u)}</b>
                  </span>
                </td>
                <td className="font-semibold">{u.email}</td>
                <td className="font-semibold tabular-nums">{u.telephone}</td>
                <td className="font-semibold tabular-nums">{dateFr(u.date_creation)}</td>
                <td>
                  <Pastille libelle={STATUTS[Number(u.statut)]?.libelle || '—'} tonalite={STATUTS[Number(u.statut)]?.tonalite || 'neutre'} />
                </td>
                <td className="text-right">
                  <Bouton variante="secondaire" compact onClick={() => setFiche(u)}>
                    Ouvrir
                  </Bouton>
                </td>
              </tr>
            ))}
          </Tableau>
        )}
        {liste.hasNextPage && (
          <div className="border-t border-separateur p-3 text-center">
            <Bouton variante="lien" onClick={() => liste.fetchNextPage()} chargement={liste.isFetchingNextPage}>
              Afficher plus d’utilisateurs
            </Bouton>
          </div>
        )}
      </Carte>

      <FicheUtilisateur utilisateur={fiche} onFermer={() => setFiche(null)} onChange={(u) => setFiche(u)} />
    </div>
  );
}

function FicheUtilisateur({ utilisateur, onFermer, onChange }: { utilisateur: any; onFermer: () => void; onChange: (u: any) => void }) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<null | 'desactiver' | 'activer' | 'restaurer' | 'supprimer'>(null);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);
  const detail = useQuery({ queryKey: ['systeme', 'utilisateur', utilisateur?.id], queryFn: async () => (await obtenir(`/api/admin/utilisateurs/detailUtilisateur/${utilisateur.id}`)).data, enabled: !!utilisateur });
  const st = Number(utilisateur?.statut);
  const nom = nomDe(utilisateur);
  const stats = detail.data?.statistiques;

  const confirmations = {
    desactiver: { titre: 'Désactiver ce compte ?', texte: `${nom} ne pourra plus se connecter. Ses billets restent valables.`, bouton: 'Désactiver', danger: false, nouveau: 2, appel: () => api.patch(`/api/admin/utilisateurs/${utilisateur.id}/desactiver`) },
    activer: { titre: 'Réactiver ce compte ?', texte: `${nom} pourra de nouveau se connecter.`, bouton: 'Réactiver', danger: false, nouveau: 1, appel: () => api.patch(`/api/admin/utilisateurs/${utilisateur.id}/activer`) },
    restaurer: { titre: 'Restaurer ce compte ?', texte: `Le compte de ${nom} sera réactivé.`, bouton: 'Restaurer', danger: false, nouveau: 1, appel: () => api.patch(`/api/admin/utilisateurs/${utilisateur.id}/reactiver`) },
    supprimer: { titre: 'Supprimer ce compte ?', texte: `${nom} ne pourra plus utiliser FANDRIO. Vous pourrez le restaurer plus tard.`, bouton: 'Supprimer', danger: true, nouveau: 3, appel: () => api.delete(`/api/admin/utilisateurs/delete/${utilisateur.id}`) },
  };
  const c = action ? confirmations[action] : null;

  const executer = async () => {
    if (!c) return;
    setEnvoi(true);
    try {
      await c.appel();
      queryClient.invalidateQueries({ queryKey: ['systeme', 'utilisateurs'] });
      onChange({ ...utilisateur, statut: c.nouveau });
    } catch (e) {
      setMessage({ titre: 'Action impossible', texte: messageErreur(e) });
    } finally {
      setEnvoi(false);
      setAction(null);
    }
  };

  return (
    <Tiroir
      ouvert={!!utilisateur}
      titre={nom}
      sousTitre={utilisateur ? `Client · ${STATUTS[st]?.libelle || ''}` : undefined}
      onFermer={onFermer}
      pied={
        utilisateur && (
          <>
            {st === 1 && <MotDePasseProvisoire utilisateurId={utilisateur.id} nom={nom} />}
            {st === 1 && (
              <Bouton variante="secondaire" icone={UserX} onClick={() => setAction('desactiver')}>
                Désactiver le compte
              </Bouton>
            )}
            {st === 2 && (
              <Bouton icone={UserCheck} onClick={() => setAction('activer')}>
                Réactiver le compte
              </Bouton>
            )}
            {st === 3 && (
              <Bouton icone={RefreshCw} onClick={() => setAction('restaurer')}>
                Restaurer le compte
              </Bouton>
            )}
            {st !== 3 && (
              <Bouton variante="danger" icone={Trash2} onClick={() => setAction('supprimer')} className="ml-auto">
                Supprimer le compte
              </Bouton>
            )}
          </>
        )
      }
    >
      {utilisateur && (
        <div className="flex flex-col gap-4">
          <Carte className="grid gap-0 p-0 sm:grid-cols-2">
            {[
              ['E-mail', <a key="m" href={`mailto:${utilisateur.email}`} className="inline-flex items-center gap-1 font-bold no-underline hover:underline"><Mail className="h-4 w-4" aria-hidden />{utilisateur.email}</a>],
              ['Téléphone', <a key="t" href={`tel:${utilisateur.telephone}`} className="inline-flex items-center gap-1 font-bold tabular-nums no-underline hover:underline"><Phone className="h-4 w-4" aria-hidden />{utilisateur.telephone}</a>],
              ['Inscrit le', dateFr(utilisateur.date_creation)],
              ['Date de naissance', utilisateur.date_naissance ? dateFr(utilisateur.date_naissance) : '—'],
            ].map(([l, v], i) => (
              <div key={String(l)} className={`flex flex-col gap-0.5 border-separateur px-4 py-3 ${i < 2 ? 'border-b' : ''} ${i % 2 === 0 ? 'sm:border-r' : ''}`}>
                <span className="text-[12.5px] font-bold text-encre-douce">{l}</span>
                <span className="text-[14px] font-bold">{v}</span>
              </div>
            ))}
          </Carte>
          <h3 className="m-0 text-[15px] font-extrabold">Activité</h3>
          {detail.isLoading ? (
            <Squelette className="h-20" />
          ) : (
            <div className="grid grid-cols-3 overflow-hidden rounded-carte border border-ligne bg-white text-center">
              {[
                ['Réservations', stats?.total_reservations],
                ['Confirmées', stats?.reservations_confirmees],
                ['Annulées', stats?.reservations_annulees],
              ].map(([l, v], i) => (
                <div key={String(l)} className={`py-3 ${i ? 'border-l border-separateur' : ''}`}>
                  <b className="block text-[20px] tabular-nums">{nombre(v as any)}</b>
                  <span className="text-[12.5px] font-bold text-encre-douce">{l}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <Dialogue ouvert={!!action} titre={c?.titre || ''} confirmer={c?.bouton} danger={c?.danger} chargement={envoi} onConfirmer={executer} onFermer={() => setAction(null)}>
        {c?.texte}
      </Dialogue>
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
    </Tiroir>
  );
}
