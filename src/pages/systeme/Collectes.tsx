import { useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Landmark } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Carte, Dialogue, Erreur, Pastille, Selecteur, Squelette, Tiroir, Vide } from '@/components/ui';
import { Kpi, Tableau } from '@/components/tableau';
import { ariary, nombre, pluriel } from '@/utils/format';
import { etatCollecte } from '@/utils/systeme';

/** Collectes de commission : à encaisser, en retard, payées ; relancer, confirmer la réception. */
export default function Collectes() {
  const [filtre, setFiltre] = useState('attente');
  const [compagnie, setCompagnie] = useState('');
  const [ouverte, setOuverte] = useState<number | null>(null);

  const cies = useQuery({ queryKey: ['systeme', 'commissions', 'compagnies'], queryFn: async () => ((await obtenir('/api/admin/commissions/compagnies')).data?.compagnies || []) as any[] });
  const liste = useInfiniteQuery({
    queryKey: ['systeme', 'collectes', filtre, compagnie],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      (
        await obtenir('/api/admin/commissions/collectes', {
          page: pageParam,
          per_page: 50,
          ...(filtre === 'payee' ? { statut: 2 } : filtre === 'attente' ? { statut: 1 } : filtre === 'retard' ? { dues: 1 } : {}),
          ...(compagnie ? { comp_id: compagnie } : {}),
        })
      ).data,
    getNextPageParam: (d: any) => (d?.pagination && d.pagination.current_page < d.pagination.last_page ? d.pagination.current_page + 1 : undefined),
  });
  const collectes: any[] = useMemo(() => (liste.data?.pages || []).flatMap((p: any) => p?.collectes || []), [liste.data]);
  const total = liste.data?.pages?.[0]?.pagination?.total ?? collectes.length;
  const montant = collectes.reduce((s, c) => s + Number(c.montant_commission || 0), 0);
  const retards = collectes.filter((c) => etatCollecte(c).cle === 'retard').length;

  return (
    <div className="flex flex-col gap-4 p-4 sm:px-7 sm:py-6">
      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <Kpi marine icone={Landmark} libelle="Montant affiché" valeur={ariary(montant, false)} unite="Ar" detail={pluriel(collectes.length, 'collecte')} chargement={liste.isLoading} />
        <Kpi icone={Landmark} ton={retards ? 'danger' : 'neutre'} libelle="En retard (affichées)" valeur={nombre(retards)} detail="Échéance passée sans paiement : compagnie suspendue" chargement={liste.isLoading} />
      </section>

      <Carte className="flex flex-wrap items-end gap-3 p-4">
        <Selecteur libelle="Afficher" value={filtre} onChange={(e) => setFiltre(e.target.value)} className="min-w-[220px] flex-1">
          <option value="attente">À encaisser</option>
          <option value="retard">En retard (échéance passée)</option>
          <option value="payee">Payées</option>
          <option value="toutes">Toutes</option>
        </Selecteur>
        <Selecteur libelle="Compagnie" value={compagnie} onChange={(e) => setCompagnie(e.target.value)} className="min-w-[220px] flex-1">
          <option value="">Toutes les compagnies</option>
          {(cies.data || []).map((c) => (
            <option key={c.comp_id} value={c.comp_id}>
              {c.comp_nom}
            </option>
          ))}
        </Selecteur>
        <span className="pb-3 text-[13px] font-semibold text-encre-douce">{pluriel(Number(total) || 0, 'collecte')}</span>
      </Carte>

      <Carte className="overflow-hidden">
        {liste.isLoading ? (
          <div className="flex flex-col gap-2 p-4">{[0, 1, 2].map((i) => <Squelette key={i} className="h-12" />)}</div>
        ) : liste.isError ? (
          <div className="p-4">
            <Erreur message={messageErreur(liste.error)} onReessayer={() => liste.refetch()} />
          </div>
        ) : collectes.length === 0 ? (
          <Vide icone={Landmark} titre="Aucune collecte" />
        ) : (
          <Tableau colonnes={[{ titre: 'Compagnie' }, { titre: 'Période' }, { titre: 'Billets', droite: true }, { titre: 'Ventes', droite: true }, { titre: 'Commission', droite: true }, { titre: 'Échéance' }, { titre: 'État' }, { titre: 'Action', cache: true }]}>
            {collectes.map((c) => {
              const e = etatCollecte(c);
              return (
                <tr key={c.coll_id}>
                  <td className="font-bold">{c.comp_nom}</td>
                  <td className="whitespace-nowrap font-semibold tabular-nums">
                    {c.periode_debut} – {c.periode_fin}
                  </td>
                  <td className="text-right font-semibold tabular-nums">{c.nb_billets}</td>
                  <td className="whitespace-nowrap text-right font-semibold tabular-nums">{ariary(c.montant_brut)}</td>
                  <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(c.montant_commission)}</td>
                  <td className="whitespace-nowrap font-semibold tabular-nums">{c.date_prevue}</td>
                  <td>
                    <Pastille libelle={e.libelle} tonalite={e.tonalite} />
                  </td>
                  <td className="text-right">
                    <Bouton variante="secondaire" compact onClick={() => setOuverte(c.coll_id)}>
                      Ouvrir
                    </Bouton>
                  </td>
                </tr>
              );
            })}
          </Tableau>
        )}
        {liste.hasNextPage && (
          <div className="border-t border-separateur p-3 text-center">
            <Bouton variante="lien" onClick={() => liste.fetchNextPage()} chargement={liste.isFetchingNextPage}>
              Afficher plus de collectes
            </Bouton>
          </div>
        )}
      </Carte>

      <DetailCollecte collecteId={ouverte} onFermer={() => setOuverte(null)} />
    </div>
  );
}

/** Fiche d'une collecte : étapes, compagnie, relance, confirmation de la réception. */
export function DetailCollecte({ collecteId, onFermer }: { collecteId: number | null; onFermer: () => void }) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<null | 'confirmer' | 'relancer'>(null);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);
  const q = useQuery({ queryKey: ['systeme', 'collecte', collecteId], queryFn: async () => (await obtenir(`/api/admin/commissions/collectes/${collecteId}`)).data, enabled: !!collecteId });
  const c = q.data;
  const e = c ? etatCollecte(c) : null;

  const executer = async () => {
    setEnvoi(true);
    try {
      const r = await api.post(`/api/admin/commissions/collectes/${collecteId}/${action === 'confirmer' ? 'confirmer' : 'relancer'}`);
      queryClient.invalidateQueries({ queryKey: ['systeme'] });
      setMessage({ titre: action === 'confirmer' ? 'Paiement confirmé' : 'Relance envoyée', texte: r.data?.message || (action === 'confirmer' ? 'La collecte est payée. Si la compagnie était suspendue, ses voyages redeviennent visibles.' : 'La compagnie a reçu une notification de rappel.') });
    } catch (err) {
      setMessage({ titre: 'Action impossible', texte: messageErreur(err) });
    } finally {
      setEnvoi(false);
      setAction(null);
    }
  };

  const Etape = ({ fait, alerte, titre, detail }: { fait?: boolean; alerte?: boolean; titre: string; detail: string }) => (
    <li className="flex gap-3">
      <span className={`mt-1 h-3 w-3 flex-none rounded-full ${alerte ? 'bg-danger' : fait ? 'bg-succes-vif' : 'bg-champ'}`} aria-hidden />
      <span>
        <b className={`block text-[14px] ${alerte ? 'text-danger' : ''}`}>{titre}</b>
        <span className="text-[13px] font-semibold text-encre-douce">{detail}</span>
      </span>
    </li>
  );

  return (
    <Tiroir
      ouvert={!!collecteId}
      titre={c ? `Collecte · ${c.comp_nom || c.compagnie?.nom || ''}` : 'Collecte'}
      sousTitre={c ? `Période du ${c.periode_debut} au ${c.periode_fin}` : undefined}
      onFermer={onFermer}
      pied={
        e &&
        e.cle !== 'payee' && (
          <>
            <Bouton icone={CheckCheck} onClick={() => setAction('confirmer')}>
              Confirmer la réception du paiement
            </Bouton>
            <Bouton variante="secondaire" icone={Bell} onClick={() => setAction('relancer')}>
              Relancer la compagnie
            </Bouton>
          </>
        )
      }
    >
      {q.isLoading || !c ? (
        <Squelette className="h-64" />
      ) : (
        <div className="flex flex-col gap-4">
          <Carte marine className="flex flex-wrap items-end justify-between gap-3 p-5">
            <span>
              <span className="text-[13px] font-bold text-[#DCE8F5]">Commission due</span>
              <b className="block text-[28px] tabular-nums">{ariary(c.montant_commission)}</b>
            </span>
            {e && <Pastille libelle={e.libelle} tonalite={e.cle === 'payee' ? 'succes' : e.cle === 'retard' ? 'danger' : 'alerte'} />}
          </Carte>
          <Carte className="grid gap-0 p-0 sm:grid-cols-2">
            {[
              ['Ventes de la période', ariary(c.montant_brut)],
              ['Billets vendus', nombre(c.nb_billets)],
              ['Taux', `${String(c.taux).replace('.', ',')} %`],
              ['Échéance', c.date_prevue],
            ].map(([l, v], i) => (
              <div key={l} className={`flex flex-col gap-0.5 border-separateur px-4 py-3 ${i < 2 ? 'border-b' : ''} ${i % 2 === 0 ? 'sm:border-r' : ''}`}>
                <span className="text-[12.5px] font-bold text-encre-douce">{l}</span>
                <b className="text-[14px] tabular-nums">{v}</b>
              </div>
            ))}
          </Carte>
          <Carte className="p-4">
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              <Etape fait titre="Collecte calculée" detail={c.created_at ? `${c.created_at} · automatique` : 'Automatique'} />
              <Etape fait titre="Compagnie notifiée" detail={`Échéance le ${c.date_prevue}`} />
              {e?.cle === 'retard' && <Etape alerte titre="Échéance dépassée" detail={`Prévue le ${c.date_prevue} · compagnie suspendue`} />}
              <Etape
                fait={e?.cle === 'payee'}
                titre="Paiement reçu"
                detail={e?.cle === 'payee' ? `${c.date_confirmation || ''}${c.confirme_par ? ` · par ${c.confirme_par.prenom} ${c.confirme_par.nom}` : ''}` : 'En attente'}
              />
            </ol>
          </Carte>
          {c.compagnie && (
            <Carte className="grid gap-0 p-0 sm:grid-cols-2">
              {[
                ['Compagnie', c.compagnie.nom],
                ['Téléphone', c.compagnie.phone || '—'],
                ['E-mail', c.compagnie.email || '—'],
                ['NIF · STAT', [c.compagnie.nif, c.compagnie.stat].filter(Boolean).join(' · ') || '—'],
              ].map(([l, v], i) => (
                <div key={l} className={`flex flex-col gap-0.5 border-separateur px-4 py-3 ${i < 2 ? 'border-b' : ''} ${i % 2 === 0 ? 'sm:border-r' : ''}`}>
                  <span className="text-[12.5px] font-bold text-encre-douce">{l}</span>
                  <b className="text-[14px]">{v}</b>
                </div>
              ))}
            </Carte>
          )}
        </div>
      )}
      <Dialogue
        ouvert={!!action}
        titre={action === 'confirmer' ? `Paiement de ${ariary(c?.montant_commission)} reçu ?` : 'Relancer la compagnie ?'}
        confirmer={action === 'confirmer' ? 'Confirmer la réception' : 'Envoyer la relance'}
        chargement={envoi}
        onConfirmer={executer}
        onFermer={() => setAction(null)}
      >
        {action === 'confirmer' ? 'Confirmez seulement si l’argent est bien arrivé. La collecte passera « payée » et la compagnie sera prévenue.' : 'La compagnie recevra une notification lui rappelant de payer cette commission.'}
      </Dialogue>
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
    </Tiroir>
  );
}
