import { useCallback, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Banknote, FileText, QrCode, Search, Ticket, Users } from 'lucide-react';
import { messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { useAuth } from '@/auth/AuthContext';
import { Bouton, Carte, Dialogue, Erreur, Pastille, Squelette, Vide } from '@/components/ui';
import { Tiroir } from '@/components/ui/Tiroir';
import { Barre, Kpi, Tableau } from '@/components/tableau';
import { DonneesFiche, ImpressionFiche } from '@/components/impression/FicheVoyageurs';
import { ariary, dateISO, heure, nombre, pluriel } from '@/utils/format';

/**
 * Réservations : les billets vendus, voyage par voyage (à venir, en cours, terminés).
 * Détail des billets dans un panneau latéral ; fiche voyageurs imprimable.
 */

type Statut = 1 | 2 | 3;
const ONGLETS: { cle: Statut; libelle: string }[] = [
  { cle: 1, libelle: 'À venir' },
  { cle: 2, libelle: 'En cours' },
  { cle: 3, libelle: 'Terminés' },
];

export default function Reservations() {
  const { utilisateur } = useAuth();
  const [statut, setStatut] = useState<Statut>(1);
  const [recherche, setRecherche] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [fiche, setFiche] = useState<DonneesFiche | null>(null);
  const [preparation, setPreparation] = useState<number | null>(null);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);

  const liste = useInfiniteQuery({
    queryKey: ['reservations', 'voyages', statut],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => (await obtenir('/api/adminCompagnie/reservations/voyages', { statut, page: pageParam, per_page: 50 })).data,
    getNextPageParam: (d: any) => (d?.pagination && d.pagination.current_page < d.pagination.last_page ? d.pagination.current_page + 1 : undefined),
    refetchInterval: 60_000,
  });

  const voyages: any[] = useMemo(() => (liste.data?.pages || []).flatMap((p: any) => p?.voyages || []), [liste.data]);
  const resume = liste.data?.pages?.[0]?.resume;
  const total = liste.data?.pages?.[0]?.pagination?.total ?? voyages.length;
  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return voyages;
    return voyages.filter((v) => `${v.trajet?.province_depart} ${v.trajet?.province_arrivee} ${v.voiture?.matricule} ${v.date}`.toLowerCase().includes(q));
  }, [voyages, recherche]);

  const imprimerFiche = async (v: any) => {
    setPreparation(v.voyage_id);
    try {
      const r = await obtenir(`/api/adminCompagnie/reservations/voyages/${v.voyage_id}/voyageurs`);
      const liste = r?.data?.voyageurs || [];
      if (!liste.length) {
        setMessage({ titre: 'Aucun voyageur', texte: 'Ce voyage ne contient aucun voyageur enregistré.' });
        return;
      }
      setFiche({
        compagnie: utilisateur?.compagnie?.nom || '',
        trajet: r.data.voyage?.trajet || `${v.trajet?.province_depart} → ${v.trajet?.province_arrivee}`,
        date: r.data.voyage?.date || v.date,
        heure: String(r.data.voyage?.heure || v.heure_depart || ''),
        vehicule: v.voiture ? `${v.voiture.matricule} (${[v.voiture.marque, v.voiture.modele].filter(Boolean).join(' ')})` : null,
        chauffeur: null,
        voyageurs: liste,
      });
    } catch (e) {
      setMessage({ titre: 'Fiche indisponible', texte: messageErreur(e) });
    } finally {
      setPreparation(null);
    }
  };
  const finFiche = useCallback(() => setFiche(null), []);

  return (
    <div className="flex flex-col gap-4 p-4 sm:px-7 sm:py-6">
      <section aria-label="Résumé" className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <Kpi marine icone={Banknote} libelle="Revenu des billets" valeur={ariary(resume?.revenu_total, false)} unite="Ar" detail="tous voyages confondus" chargement={liste.isLoading} />
        <Kpi icone={Ticket} libelle="Réservations confirmées" valeur={nombre(resume?.total_reservations)} chargement={liste.isLoading} />
        <Kpi icone={Users} libelle={`Voyages ${ONGLETS.find((o) => o.cle === statut)?.libelle.toLowerCase()} avec des billets`} valeur={nombre(total)} chargement={liste.isLoading} />
      </section>

      <Carte className="flex min-w-0 flex-col overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-separateur p-4">
          <div role="group" aria-label="Voyages" className="flex gap-1 rounded-xl bg-fond p-1">
            {ONGLETS.map((o) => (
              <button
                key={o.cle}
                type="button"
                aria-pressed={statut === o.cle}
                onClick={() => setStatut(o.cle)}
                className={`h-9 rounded-[9px] px-4 text-[13.5px] font-bold ${statut === o.cle ? 'bg-white text-ocean-950 shadow-sm' : 'text-encre-douce hover:text-encre'}`}
              >
                {o.libelle}
              </button>
            ))}
          </div>
          <label className="ml-auto flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl border-[1.5px] border-champ bg-white px-3 sm:max-w-[340px]">
            <Search className="h-4 w-4 text-encre-douce" aria-hidden />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un trajet, un véhicule…"
              aria-label="Rechercher un voyage"
              className="min-w-0 flex-1 border-0 bg-transparent text-[14px] font-semibold text-encre outline-none placeholder:text-gris-clair"
            />
          </label>
        </div>

        {liste.isLoading ? (
          <div className="flex flex-col gap-2 p-4">{[0, 1, 2, 3].map((i) => <Squelette key={i} className="h-12" />)}</div>
        ) : liste.isError ? (
          <div className="p-4">
            <Erreur message={messageErreur(liste.error)} onReessayer={() => liste.refetch()} />
          </div>
        ) : filtres.length === 0 ? (
          <Vide icone={Ticket} titre={recherche ? 'Aucun voyage ne correspond' : 'Aucune réservation'}>
            {recherche ? 'Modifiez la recherche.' : 'Les voyages ayant des billets vendus apparaissent ici.'}
          </Vide>
        ) : (
          <Tableau
            colonnes={[
              { titre: 'Départ' },
              { titre: 'Trajet' },
              { titre: 'Véhicule' },
              { titre: 'Places vendues' },
              { titre: 'Billets', droite: true },
              { titre: 'Revenu', droite: true },
              { titre: 'Actions', cache: true },
            ]}
          >
            {filtres.map((v) => {
              const pris = Number(v.places_reservees) || 0;
              const totalP = Number(v.places_disponibles) || 0;
              return (
                <tr key={v.voyage_id}>
                  <td className="whitespace-nowrap">
                    <b className="block tabular-nums">{heure(v.heure_depart)}</b>
                    <span className="text-[12.5px] font-semibold tabular-nums text-encre-douce">{v.date}</span>
                  </td>
                  <td className="font-bold">
                    {v.trajet?.province_depart} → {v.trajet?.province_arrivee}
                  </td>
                  <td className="whitespace-nowrap font-semibold">{v.voiture?.matricule || '—'}</td>
                  <td className="min-w-[150px]">
                    <span className="flex items-center gap-2.5">
                      <Barre pct={totalP ? (pris / totalP) * 100 : 0} ton={v.est_complet ? 'succes' : 'ocean'} />
                      <b className="min-w-[48px] text-right tabular-nums">
                        {pris}/{totalP}
                      </b>
                    </span>
                  </td>
                  <td className="text-right font-semibold tabular-nums">
                    {v.reservations_count}
                    <span className="block text-[12px] text-encre-douce">{pluriel(Number(v.total_voyageurs) || 0, 'voyageur')}</span>
                  </td>
                  <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(v.revenu_total)}</td>
                  <td>
                    <span className="flex justify-end gap-2">
                      <Bouton variante="secondaire" compact icone={FileText} onClick={() => imprimerFiche(v)} chargement={preparation === v.voyage_id} title="Imprimer la fiche voyageurs (contrôles routiers)">
                        Fiche
                      </Bouton>
                      <Bouton compact onClick={() => setDetail(v)}>
                        Billets
                      </Bouton>
                    </span>
                  </td>
                </tr>
              );
            })}
          </Tableau>
        )}
        {liste.hasNextPage && (
          <div className="border-t border-separateur p-3 text-center">
            <Bouton variante="lien" onClick={() => liste.fetchNextPage()} chargement={liste.isFetchingNextPage}>
              Afficher plus de voyages
            </Bouton>
          </div>
        )}
      </Carte>

      <DetailBillets voyage={detail} onFermer={() => setDetail(null)} onFiche={imprimerFiche} />
      <ImpressionFiche fiche={fiche} onTermine={finFiche} />
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
    </div>
  );
}

/** Billets d'un voyage (panneau latéral). */
function DetailBillets({ voyage, onFermer, onFiche }: { voyage: any; onFermer: () => void; onFiche: (v: any) => void }) {
  const billets = useQuery({
    queryKey: ['reservations', 'billets', voyage?.voyage_id],
    queryFn: async () => (await obtenir(`/api/adminCompagnie/reservations/voyages/${voyage.voyage_id}/billets`)).data,
    enabled: !!voyage,
  });
  const d = billets.data;
  const auj = voyage && voyage.date_raw === dateISO();

  return (
    <Tiroir
      ouvert={!!voyage}
      titre={voyage ? `${voyage.trajet?.province_depart} → ${voyage.trajet?.province_arrivee}` : ''}
      sousTitre={voyage ? `${voyage.date} à ${heure(voyage.heure_depart)} · ${voyage.voiture?.matricule || ''}` : undefined}
      onFermer={onFermer}
      pied={
        voyage && (
          <>
            <Bouton variante="secondaire" icone={FileText} onClick={() => onFiche(voyage)}>
              Fiche voyageurs
            </Bouton>
            {auj && (
              <Bouton icone={QrCode} vers={`/compagnie/embarquement?voyage=${voyage.voyage_id}`}>
                Embarquement
              </Bouton>
            )}
          </>
        )
      }
    >
      {billets.isLoading ? (
        <div className="flex flex-col gap-2">{[0, 1, 2].map((i) => <Squelette key={i} className="h-14" />)}</div>
      ) : billets.isError ? (
        <Erreur message={messageErreur(billets.error)} onReessayer={() => billets.refetch()} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Carte className="p-4">
              <span className="text-[12.5px] font-bold text-encre-douce">Revenu</span>
              <b className="block text-[20px] tabular-nums">{ariary(d?.resume?.revenu_total)}</b>
            </Carte>
            <Carte className="p-4">
              <span className="text-[12.5px] font-bold text-encre-douce">Billets</span>
              <b className="block text-[20px] tabular-nums">{nombre(d?.resume?.total_billets)}</b>
            </Carte>
            <Carte className="p-4">
              <span className="text-[12.5px] font-bold text-encre-douce">Voyageurs</span>
              <b className="block text-[20px] tabular-nums">{nombre(d?.resume?.total_voyageurs)}</b>
            </Carte>
          </div>
          {(d?.resume?.repartition_paiement || []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {d.resume.repartition_paiement.map((p: any) => (
                <span key={p.type} className="rounded-full bg-white px-3 py-1.5 text-[13px] font-bold text-encre ring-1 ring-ligne">
                  {p.type} : {pluriel(p.count, 'billet')} · {ariary(p.montant)}
                </span>
              ))}
            </div>
          )}
          <Carte className="overflow-hidden">
            {(d?.billets || []).length === 0 ? (
              <Vide icone={Ticket} titre="Aucun billet" />
            ) : (
              <Tableau colonnes={[{ titre: 'Billet' }, { titre: 'Client' }, { titre: 'Sièges' }, { titre: 'Paiement' }, { titre: 'Montant', droite: true }]}>
                {d.billets.map((b: any) => (
                  <tr key={b.res_id}>
                    <td className="whitespace-nowrap">
                      <b className="block tabular-nums">{b.res_numero}</b>
                      <span className="text-[12px] font-semibold tabular-nums text-encre-douce">{b.date_reservation}</span>
                    </td>
                    <td>
                      <span className="block font-bold">{b.canal === 'guichet' ? 'Vente au guichet' : b.client ? `${b.client.prenom || ''} ${b.client.nom || ''}`.trim() : '—'}</span>
                      {b.canal !== 'guichet' && b.client?.telephone && <span className="text-[12.5px] font-semibold text-encre-douce">{b.client.telephone}</span>}
                    </td>
                    <td className="font-bold tabular-nums">{(b.sieges || []).join(', ')}</td>
                    <td>
                      <Pastille libelle={b.canal === 'guichet' ? 'Espèces' : b.type_paiement?.nom || '—'} tonalite={b.canal === 'guichet' ? 'neutre' : 'info'} point={false} />
                    </td>
                    <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(b.montant_total)}</td>
                  </tr>
                ))}
              </Tableau>
            )}
          </Carte>
        </div>
      )}
    </Tiroir>
  );
}
