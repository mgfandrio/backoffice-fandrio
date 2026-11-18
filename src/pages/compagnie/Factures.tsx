import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Receipt, Search } from 'lucide-react';
import { messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Carte, Champ, Erreur, Pastille, Selecteur, Squelette, Vide } from '@/components/ui';
import { Kpi, Tableau } from '@/components/tableau';
import { ariary, nombre } from '@/utils/format';

/** Factures des réservations payées : filtres par dates, moyen de paiement, recherche. */

const MOYENS = [
  { id: '2', l: 'MVola' },
  { id: '1', l: 'Orange Money' },
  { id: '3', l: 'Airtel Money' },
  { id: '4', l: 'Espèces (guichet)' },
];

export default function Factures() {
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');
  const [moyen, setMoyen] = useState('');
  const [saisie, setSaisie] = useState('');
  const [recherche, setRecherche] = useState('');

  // La recherche part 400 ms après la dernière frappe
  useEffect(() => {
    const t = window.setTimeout(() => setRecherche(saisie.trim()), 400);
    return () => window.clearTimeout(t);
  }, [saisie]);

  const params = useMemo(
    () => ({ ...(debut ? { date_debut: debut } : {}), ...(fin ? { date_fin: fin } : {}), ...(moyen ? { type_paie_id: moyen } : {}), ...(recherche ? { search: recherche } : {}) }),
    [debut, fin, moyen, recherche]
  );
  const q = useInfiniteQuery({
    queryKey: ['factures', params],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => (await obtenir('/api/adminCompagnie/reservations/factures', { ...params, page: pageParam, per_page: 30 })).data,
    getNextPageParam: (d: any) => (d?.pagination && d.pagination.current_page < d.pagination.last_page ? d.pagination.current_page + 1 : undefined),
  });
  const factures: any[] = useMemo(() => (q.data?.pages || []).flatMap((p: any) => p?.factures || []), [q.data]);
  const resume = q.data?.pages?.[0]?.resume;
  const filtre = !!(debut || fin || moyen || recherche);

  return (
    <div className="flex flex-col gap-4 p-4 sm:px-7 sm:py-6">
      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <Kpi marine icone={Receipt} libelle={filtre ? 'Montant (filtré)' : 'Montant facturé'} valeur={ariary(resume?.total_montant, false)} unite="Ar" chargement={q.isLoading} />
        <Kpi icone={Receipt} libelle="Factures" valeur={nombre(resume?.total_factures)} chargement={q.isLoading} />
        <Kpi icone={Receipt} libelle="Voyageurs" valeur={nombre(resume?.total_voyageurs)} chargement={q.isLoading} />
      </section>

      <Carte className="grid gap-3 p-4 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <Champ libelle="Du" type="date" value={debut} max={fin || undefined} onChange={(e) => setDebut(e.target.value)} />
        <Champ libelle="Au" type="date" value={fin} min={debut || undefined} onChange={(e) => setFin(e.target.value)} />
        <Selecteur libelle="Moyen de paiement" value={moyen} onChange={(e) => setMoyen(e.target.value)}>
          <option value="">Tous</option>
          {MOYENS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.l}
            </option>
          ))}
        </Selecteur>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-encre-douce">Recherche</span>
          <span className="flex h-11 items-center gap-2 rounded-champ border-[1.5px] border-champ bg-white px-3 focus-within:border-ocean-800">
            <Search className="h-4 w-4 text-encre-douce" aria-hidden />
            <input value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="N° de facture, client…" className="min-w-0 flex-1 border-0 bg-transparent text-[14px] font-semibold outline-none placeholder:text-gris-clair" />
          </span>
        </label>
        {filtre && (
          <div className="flex items-end">
            <Bouton
              variante="lien"
              onClick={() => {
                setDebut('');
                setFin('');
                setMoyen('');
                setSaisie('');
              }}
            >
              Effacer les filtres
            </Bouton>
          </div>
        )}
      </Carte>

      <Carte className="overflow-hidden">
        {q.isLoading ? (
          <div className="flex flex-col gap-2 p-4">{[0, 1, 2].map((i) => <Squelette key={i} className="h-10" />)}</div>
        ) : q.isError ? (
          <div className="p-4">
            <Erreur message={messageErreur(q.error)} onReessayer={() => q.refetch()} />
          </div>
        ) : factures.length === 0 ? (
          <Vide icone={Receipt} titre={filtre ? 'Aucune facture ne correspond' : 'Aucune facture'} />
        ) : (
          <Tableau colonnes={[{ titre: 'Facture' }, { titre: 'Client' }, { titre: 'Trajet' }, { titre: 'Voyage du' }, { titre: 'Voyageurs', droite: true }, { titre: 'Paiement' }, { titre: 'Montant', droite: true }]}>
            {factures.map((f) => (
              <tr key={f.res_id}>
                <td className="whitespace-nowrap">
                  <b className="block tabular-nums">{f.res_numero}</b>
                  <span className="text-[12px] font-semibold tabular-nums text-encre-douce">{f.date}</span>
                </td>
                <td className="font-semibold">{f.canal === 'guichet' ? 'Vente au guichet' : f.client?.nom || '—'}</td>
                <td className="whitespace-nowrap font-semibold">{f.trajet || '—'}</td>
                <td className="whitespace-nowrap font-semibold tabular-nums">{f.voyage_date || '—'}</td>
                <td className="text-right font-semibold tabular-nums">{f.nb_voyageurs}</td>
                <td>
                  <Pastille libelle={f.canal === 'guichet' ? 'Espèces' : f.type_paiement?.nom || f.type_paiement || '—'} tonalite={f.canal === 'guichet' ? 'neutre' : 'info'} point={false} />
                </td>
                <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(f.montant_total)}</td>
              </tr>
            ))}
          </Tableau>
        )}
        {q.hasNextPage && (
          <div className="border-t border-separateur p-3 text-center">
            <Bouton variante="lien" onClick={() => q.fetchNextPage()} chargement={q.isFetchingNextPage}>
              Afficher plus de factures
            </Bouton>
          </div>
        )}
      </Carte>
    </div>
  );
}
