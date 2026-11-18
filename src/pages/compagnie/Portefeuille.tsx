import { useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Banknote, CalendarClock, CreditCard, Landmark, Percent, Store, Wallet } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Dialogue, Erreur, Pastille, Selecteur, Squelette, Vide } from '@/components/ui';
import { Kpi, Panneau, Tableau } from '@/components/tableau';
import { ariary, ariaryCourt, nomMois, pluriel } from '@/utils/format';

/**
 * Portefeuille : argent encaissé, commission FANDRIO (5 % des ventes en ligne,
 * rien sur le guichet), collectes à payer en ligne, historique des opérations.
 */

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const libelleMois = (m?: string) => {
  const [a, n] = String(m || '').split('-');
  return MOIS_COURTS[Number(n) - 1] ? `${MOIS_COURTS[Number(n) - 1]} ${a}` : '';
};
const PERIODES: Record<string, string> = { aujourdhui: 'Aujourd’hui', cette_semaine: 'Cette semaine', ce_mois: 'Ce mois', cette_annee: 'Cette année' };

export default function Portefeuille() {
  const [periode, setPeriode] = useState('ce_mois');
  const [paiement, setPaiement] = useState<number | null>(null);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);

  const porte = useInfiniteQuery({
    queryKey: ['portefeuille'],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => (await obtenir('/api/adminCompagnie/reservations/portefeuille', { page: pageParam, per_page: 25 })).data,
    getNextPageParam: (d: any) => (d?.pagination && d.pagination.current_page < d.pagination.last_page ? d.pagination.current_page + 1 : undefined),
  });
  const collecte = useQuery({ queryKey: ['ma-collecte'], queryFn: async () => (await obtenir('/api/adminCompagnie/reservations/ma-collecte')).data });

  const d = porte.data?.pages?.[0];
  const transactions: any[] = useMemo(() => (porte.data?.pages || []).flatMap((p: any) => p?.transactions || []), [porte.data]);
  const p = d?.par_periode?.[periode] || {};
  const c = collecte.data;
  const aPayer: any[] = (c?.collectes || []).filter((x: any) => x.payable);
  const operateurs: any[] = d?.repartition_operateur || [];
  const maxOp = Math.max(...operateurs.map((o) => Number(o.brut) || 0), 1);

  const payer = async (coll: any) => {
    setPaiement(coll.coll_id);
    try {
      const r = await api.post(`/api/adminCompagnie/commissions/collectes/${coll.coll_id}/payer`);
      const url = r.data?.data?.payment_url;
      if (url) {
        window.open(url, '_blank', 'noopener');
        setMessage({ titre: 'Paiement ouvert dans un nouvel onglet', texte: 'Terminez le paiement sur la page qui vient de s’ouvrir. La collecte passera « payée » dès que le paiement sera confirmé.' });
      } else setMessage({ titre: 'Paiement indisponible', texte: r.data?.message || 'Impossible d’ouvrir le paiement pour le moment.' });
    } catch (e) {
      setMessage({ titre: 'Paiement indisponible', texte: messageErreur(e) });
    } finally {
      setPaiement(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:px-7 sm:py-6">
      {/* Collecte à payer */}
      {c?.suspendu && (
        <div role="alert" className="flex items-start gap-3 rounded-carte border border-danger-bord bg-danger-fond p-4 text-danger">
          <AlertTriangle className="h-6 w-6 flex-none" aria-hidden />
          <p className="m-0 text-[14px] font-bold leading-relaxed">Votre compagnie est suspendue pour commission impayée : vos voyages sont cachés aux clients. Payez la collecte en attente pour les rendre de nouveau visibles.</p>
        </div>
      )}
      {aPayer.map((coll) => (
        <div key={coll.coll_id} className={`flex flex-wrap items-center gap-4 rounded-carte border p-4 ${coll.en_retard ? 'border-danger-bord bg-danger-fond' : 'border-alerte-bord bg-alerte-fond'}`}>
          <Landmark className={`h-7 w-7 flex-none ${coll.en_retard ? 'text-danger' : 'text-alerte'}`} aria-hidden />
          <span className="min-w-[220px] flex-1">
            <b className={`block text-[15px] ${coll.en_retard ? 'text-danger' : 'text-alerte'}`}>
              Commission à payer : {ariary(coll.montant_commission)}
              {coll.en_retard ? ' · en retard' : ''}
            </b>
            <span className="text-[13.5px] font-semibold text-encre-douce">
              Période du {coll.periode_debut} au {coll.periode_fin} · {pluriel(Number(coll.nb_billets) || 0, 'billet')} · à payer avant le {coll.date_prevue}
            </span>
          </span>
          <Bouton icone={CreditCard} onClick={() => payer(coll)} chargement={paiement === coll.coll_id}>
            Payer en ligne
          </Bouton>
        </div>
      ))}

      {/* Indicateurs */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="m-0 text-[18px] font-extrabold">Encaissements · {PERIODES[periode]}</h2>
        <Selecteur libelle="Période" libelleCache value={periode} onChange={(e) => setPeriode(e.target.value)} className="w-[200px]">
          {Object.entries(PERIODES).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Selecteur>
      </div>
      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <Kpi marine icone={Wallet} libelle="Net pour la compagnie" valeur={ariary(p.net, false)} unite="Ar" detail={`Ventes ${ariary(p.brut)} − commission ${ariary(p.commission)}`} chargement={porte.isLoading} />
        <Kpi icone={Banknote} libelle="Ventes encaissées" valeur={ariary(p.brut, false)} unite="Ar" detail={pluriel(Number(p.billets) || 0, 'billet')} chargement={porte.isLoading} />
        <Kpi icone={Store} libelle="Dont ventes au guichet" valeur={ariary(p.guichet, false)} unite="Ar" detail="Sans commission FANDRIO" chargement={porte.isLoading} />
        <Kpi icone={Percent} ton="alerte" libelle="Commission FANDRIO" valeur={ariary(p.commission, false)} unite="Ar" detail={`${d?.taux_commission ?? c?.config?.taux ?? 5} % des ventes en ligne`} chargement={porte.isLoading} />
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panneau titre="Ventes et part nette par mois" sousTitre="Les 12 derniers mois" className="xl:col-span-2">
          {porte.isLoading ? (
            <Squelette className="h-[240px]" />
          ) : (d?.evolution_mensuelle || []).length === 0 ? (
            <Vide icone={Banknote} titre="Pas encore de ventes" />
          ) : (
            <div className="h-[240px]" role="img" aria-label="Ventes et part nette par mois">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.evolution_mensuelle} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EEF2F7" />
                  <XAxis dataKey="mois" tickFormatter={libelleMois} tick={{ fill: '#33445C', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#E3EAF2' }} />
                  <YAxis tickFormatter={ariaryCourt} tick={{ fill: '#33445C', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} width={48} />
                  <Tooltip
                    cursor={{ fill: '#EBF2F9' }}
                    content={({ active, payload, label }: any) =>
                      active && payload?.length ? (
                        <div className="rounded-xl border border-ligne bg-white px-3 py-2 shadow-lg">
                          <p className="m-0 text-xs font-bold text-encre-douce">{libelleMois(label)}</p>
                          <p className="m-0 text-sm font-extrabold tabular-nums">Ventes : {ariary(payload[0].payload.brut)}</p>
                          <p className="m-0 text-sm font-extrabold tabular-nums text-succes">Net : {ariary(payload[0].payload.net)}</p>
                          <p className="m-0 text-xs font-semibold tabular-nums text-encre-douce">Commission : {ariary(payload[0].payload.commission)}</p>
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="brut" fill="#B9D1EA" radius={[5, 5, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="net" fill="#0B4F8A" radius={[5, 5, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panneau>
        <Panneau titre="Par moyen de paiement" sousTitre="Depuis le début">
          {operateurs.length === 0 ? (
            <Vide icone={CreditCard} titre="Aucun paiement" />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
              {operateurs.map((o) => (
                <li key={o.operateur} className="flex flex-col gap-1.5">
                  <span className="flex justify-between text-[14px]">
                    <b>{o.operateur}</b>
                    <b className="tabular-nums">{ariary(o.brut)}</b>
                  </span>
                  <span className="block h-2 overflow-hidden rounded-full bg-ocean-50">
                    <span className="block h-full rounded-full bg-ocean-800" style={{ width: `${(Number(o.brut) / maxOp) * 100}%` }} />
                  </span>
                  <span className="text-[12.5px] font-semibold text-encre-douce">
                    Net {ariary(o.net)} · commission {ariary(o.commission)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panneau>
      </div>

      {/* Collectes */}
      <Panneau
        titre="Collectes de commission"
        sousTitre={c ? `Collecte ${c.config?.frequence === 'hebdomadaire' ? 'chaque semaine' : 'chaque mois'}${c.prochaine_collecte ? ` · prochaine le ${c.prochaine_collecte.date_prevue} (${ariary(c.prochaine_collecte.montant)})` : ''}` : undefined}
        sansMarge
      >
        {collecte.isLoading ? (
          <div className="p-5">
            <Squelette className="h-24" />
          </div>
        ) : (c?.collectes || []).length === 0 ? (
          <Vide icone={CalendarClock} titre="Aucune collecte pour le moment">
            La commission est calculée sur les ventes en ligne de chaque période.
          </Vide>
        ) : (
          <Tableau colonnes={[{ titre: 'Période' }, { titre: 'Billets', droite: true }, { titre: 'Ventes', droite: true }, { titre: 'Commission', droite: true }, { titre: 'Échéance' }, { titre: 'État' }]}>
            {c.collectes.map((x: any) => (
              <tr key={x.coll_id}>
                <td className="whitespace-nowrap font-semibold tabular-nums">
                  {x.periode_debut} – {x.periode_fin}
                </td>
                <td className="text-right font-semibold tabular-nums">{x.nb_billets}</td>
                <td className="whitespace-nowrap text-right font-semibold tabular-nums">{ariary(x.montant_brut)}</td>
                <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(x.montant_commission)}</td>
                <td className="whitespace-nowrap font-semibold tabular-nums">{x.date_prevue}</td>
                <td>{x.payable ? <Pastille libelle={x.en_retard ? 'En retard' : 'À payer'} tonalite={x.en_retard ? 'danger' : 'alerte'} /> : <Pastille libelle={x.statut_label || 'Payée'} tonalite="succes" />}</td>
              </tr>
            ))}
          </Tableau>
        )}
      </Panneau>

      {/* Opérations */}
      <Panneau titre="Opérations" sousTitre={d?.pagination ? `${pluriel(Number(d.pagination.total) || 0, 'vente')} payée${Number(d.pagination.total) > 1 ? 's' : ''}` : undefined} sansMarge>
        {porte.isLoading ? (
          <div className="flex flex-col gap-2 p-5">{[0, 1, 2].map((i) => <Squelette key={i} className="h-10" />)}</div>
        ) : porte.isError ? (
          <div className="p-5">
            <Erreur message={messageErreur(porte.error)} onReessayer={() => porte.refetch()} />
          </div>
        ) : transactions.length === 0 ? (
          <Vide icone={Wallet} titre="Aucune opération" />
        ) : (
          <Tableau colonnes={[{ titre: 'Date' }, { titre: 'Billet' }, { titre: 'Client' }, { titre: 'Trajet' }, { titre: 'Paiement' }, { titre: 'Ventes', droite: true }, { titre: 'Commission', droite: true }, { titre: 'Net', droite: true }]}>
            {transactions.map((t) => (
              <tr key={t.res_id}>
                <td className="whitespace-nowrap font-semibold tabular-nums text-encre-douce">{t.date}</td>
                <td className="whitespace-nowrap font-bold tabular-nums">{t.res_numero}</td>
                <td className="font-semibold">{t.client || '—'}</td>
                <td className="whitespace-nowrap font-semibold">{t.trajet || '—'}</td>
                <td>
                  <Pastille libelle={t.canal === 'guichet' ? 'Espèces' : t.operateur} tonalite={t.canal === 'guichet' ? 'neutre' : 'info'} point={false} />
                </td>
                <td className="whitespace-nowrap text-right font-semibold tabular-nums">{ariary(t.brut)}</td>
                <td className="whitespace-nowrap text-right font-semibold tabular-nums text-encre-douce">{t.commission ? `− ${ariary(t.commission)}` : '—'}</td>
                <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(t.net)}</td>
              </tr>
            ))}
          </Tableau>
        )}
        {porte.hasNextPage && (
          <div className="border-t border-separateur p-3 text-center">
            <Bouton variante="lien" onClick={() => porte.fetchNextPage()} chargement={porte.isFetchingNextPage}>
              Afficher plus d’opérations
            </Bouton>
          </div>
        )}
      </Panneau>

      <p className="m-0 text-[13px] font-semibold text-encre-douce">Mois en cours : {nomMois()}. La commission FANDRIO ne s’applique pas aux ventes au guichet.</p>
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
    </div>
  );
}
