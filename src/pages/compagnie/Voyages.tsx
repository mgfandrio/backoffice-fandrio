import { useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Bus, Plus, Search } from 'lucide-react';
import { messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Carte, Erreur, Pastille, Selecteur, Squelette, Vide } from '@/components/ui';
import { Barre, Tableau } from '@/components/tableau';
import { DetailVoyage } from '@/components/voyages/DetailVoyage';
import { FormulaireVoyage } from '@/components/voyages/FormulaireVoyage';
import { dateISO, heure, jourRelatif, pluriel } from '@/utils/format';
import { chauffeurDe, etatVoyage, libelleType, remplissage, trajetDe } from '@/utils/voyage';

/** Voyages par état (programmés, en cours, terminés, annulés) et par période. */

const STATUTS = [
  { v: '1', l: 'Programmés' },
  { v: '2', l: 'En cours' },
  { v: '3', l: 'Terminés' },
  { v: '4', l: 'Annulés' },
];

function bornes(p: string): Record<string, string> {
  const d = new Date();
  if (p === 'jour') return { date_debut: dateISO(d), date_fin: dateISO(d) };
  if (p === 'semaine') {
    const lundi = new Date(d);
    lundi.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const dimanche = new Date(lundi);
    dimanche.setDate(lundi.getDate() + 6);
    return { date_debut: dateISO(lundi), date_fin: dateISO(dimanche) };
  }
  if (p === 'mois') return { date_debut: dateISO(new Date(d.getFullYear(), d.getMonth(), 1)), date_fin: dateISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
  return {};
}

export default function Voyages() {
  const [statut, setStatut] = useState('1');
  const [periode, setPeriode] = useState('tout');
  const [recherche, setRecherche] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [formulaire, setFormulaire] = useState<{ ouvert: boolean; id: number | null }>({ ouvert: false, id: null });

  const params = (s: string, page: number, parPage = 30) => ({
    statut: s,
    ...bornes(periode),
    per_page: parPage,
    page,
    sort_field: 'voyage_date',
    sort_direction: s === '1' || s === '2' ? 'asc' : 'desc',
  });

  const liste = useInfiniteQuery({
    queryKey: ['voyages', 'liste', statut, periode],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => (await obtenir('/api/adminCompagnie/voyage/recupererListeVoyage', params(statut, pageParam))).data,
    getNextPageParam: (d: any) => (d?.pagination && d.pagination.current_page < d.pagination.last_page ? d.pagination.current_page + 1 : undefined),
    refetchInterval: 60_000,
  });
  // Nombre de voyages de chaque état sur la période (pour la liste déroulante)
  const compteurs = useQuery({
    queryKey: ['voyages', 'compteurs', periode],
    queryFn: async () => {
      const r = await Promise.all(STATUTS.map((s) => obtenir('/api/adminCompagnie/voyage/recupererListeVoyage', params(s.v, 1, 1)).catch(() => null)));
      return Object.fromEntries(STATUTS.map((s, i) => [s.v, Number(r[i]?.data?.pagination?.total) || 0])) as Record<string, number>;
    },
  });

  const voyages: any[] = useMemo(() => (liste.data?.pages || []).flatMap((p: any) => p?.voyages || []), [liste.data]);
  const filtres = useMemo(() => {
    const r = recherche.trim().toLowerCase();
    return r ? voyages.filter((v) => [trajetDe(v), v.voiture?.matricule, chauffeurDe(v), v.date].join(' ').toLowerCase().includes(r)) : voyages;
  }, [voyages, recherche]);

  return (
    <div className="flex flex-col gap-4 p-4 sm:px-7 sm:py-6">
      <Carte className="flex flex-wrap items-end gap-3 p-4">
        <Selecteur libelle="État des voyages" value={statut} onChange={(e) => setStatut(e.target.value)} className="min-w-[220px] flex-1">
          {STATUTS.map((s) => (
            <option key={s.v} value={s.v}>
              {s.l}
              {compteurs.data ? ` (${compteurs.data[s.v]})` : ''}
            </option>
          ))}
        </Selecteur>
        <Selecteur libelle="Période" value={periode} onChange={(e) => setPeriode(e.target.value)} className="min-w-[200px] flex-1">
          <option value="tout">Toutes les dates</option>
          <option value="jour">Aujourd’hui</option>
          <option value="semaine">Cette semaine</option>
          <option value="mois">Ce mois</option>
        </Selecteur>
        <label className="flex min-w-[240px] flex-[2] flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-encre-douce">Recherche</span>
          <span className="flex h-11 items-center gap-2 rounded-champ border-[1.5px] border-champ bg-white px-3 focus-within:border-ocean-800">
            <Search className="h-4 w-4 text-encre-douce" aria-hidden />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Trajet, matricule, chauffeur…" className="min-w-0 flex-1 border-0 bg-transparent text-[14px] font-semibold outline-none placeholder:text-gris-clair" />
          </span>
        </label>
        <Bouton icone={Plus} onClick={() => setFormulaire({ ouvert: true, id: null })}>
          Planifier des voyages
        </Bouton>
      </Carte>

      <Carte className="overflow-hidden">
        {liste.isLoading ? (
          <div className="flex flex-col gap-2 p-4">{[0, 1, 2, 3].map((i) => <Squelette key={i} className="h-12" />)}</div>
        ) : liste.isError ? (
          <div className="p-4">
            <Erreur message={messageErreur(liste.error)} onReessayer={() => liste.refetch()} />
          </div>
        ) : filtres.length === 0 ? (
          <Vide icone={Bus} titre={recherche ? 'Aucun voyage ne correspond' : `Aucun voyage ${STATUTS.find((s) => s.v === statut)?.l.toLowerCase()}`}>
            {recherche ? 'Modifiez la recherche.' : 'Changez l’état ou la période, ou planifiez de nouveaux voyages.'}
          </Vide>
        ) : (
          <Tableau colonnes={[{ titre: 'Départ' }, { titre: 'Trajet' }, { titre: 'Véhicule · chauffeur' }, { titre: 'Places vendues' }, { titre: 'État' }, { titre: 'Action', cache: true }]}>
            {filtres.map((v) => {
              const r = remplissage(v);
              const e = etatVoyage(v);
              return (
                <tr key={v.id}>
                  <td className="whitespace-nowrap">
                    <b className="block tabular-nums">{heure(v.heure_depart)}</b>
                    <span className="text-[12.5px] font-semibold text-encre-douce">
                      {jourRelatif(v.date)} · {libelleType(v.type)}
                    </span>
                  </td>
                  <td className="font-bold">{trajetDe(v)}</td>
                  <td>
                    <span className="block font-bold">{v.voiture?.matricule || '—'}</span>
                    <span className={`text-[12.5px] font-semibold ${chauffeurDe(v) ? 'text-encre-douce' : 'text-alerte'}`}>{chauffeurDe(v) || 'Aucun chauffeur'}</span>
                  </td>
                  <td className="min-w-[150px]">
                    <span className="flex items-center gap-2.5">
                      <Barre pct={r.pct} ton={r.complet ? 'succes' : 'ocean'} />
                      <b className="min-w-[48px] text-right tabular-nums">
                        {r.pris}/{r.total}
                      </b>
                    </span>
                  </td>
                  <td>
                    <Pastille libelle={e.libelle} tonalite={e.tonalite} />
                  </td>
                  <td className="text-right">
                    <Bouton variante="secondaire" compact onClick={() => setDetail(v)}>
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
              Afficher plus de voyages
            </Bouton>
          </div>
        )}
        {!liste.isLoading && voyages.length > 0 && (
          <p className="m-0 border-t border-separateur px-4 py-2.5 text-[13px] font-semibold text-encre-douce">
            {pluriel(filtres.length, 'voyage')} affiché{filtres.length > 1 ? 's' : ''}
            {compteurs.data ? ` sur ${compteurs.data[statut]}` : ''}
          </p>
        )}
      </Carte>

      <DetailVoyage voyageId={detail ? Number(detail.id) : null} apercu={detail} onFermer={() => setDetail(null)} onModifier={(id) => setFormulaire({ ouvert: true, id })} />
      <FormulaireVoyage ouvert={formulaire.ouvert} voyageId={formulaire.id} onFermer={() => setFormulaire({ ouvert: false, id: null })} />
    </div>
  );
}
