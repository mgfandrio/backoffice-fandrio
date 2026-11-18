import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Banknote, CalendarClock, CheckCircle2, CreditCard, Landmark, Percent } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Dialogue, Erreur, Pastille, Selecteur, Squelette, Vide } from '@/components/ui';
import { Kpi, Panneau, Tableau } from '@/components/tableau';
import { ariary, ariaryCourt, pluriel } from '@/utils/format';

/**
 * Portefeuille : commission FANDRIO (5 % des ventes en ligne, rien sur le
 * guichet), collectes à payer en ligne et historique des collectes.
 * Les ventes et le net sont dans « Chiffre d'affaires ».
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
  const p = d?.par_periode?.[periode] || {};
  const c = collecte.data;
  const aPayer: any[] = (c?.collectes || []).filter((x: any) => x.payable);
  const totalAPayer = aPayer.reduce((t: number, x: any) => t + (Number(x.montant_commission) || 0), 0);
  const nbPayees = (c?.collectes || []).filter((x: any) => !x.payable).length;
  const totalPaye = Number(c?.totaux?.total_collecte) || 0;

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
      {(porte.isError || collecte.isError) && <Erreur message={messageErreur(porte.error || collecte.error)} onReessayer={() => { porte.refetch(); collecte.refetch(); }} />}
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

      {/* Indicateurs de commission */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="m-0 text-[18px] font-extrabold">Commission FANDRIO</h2>
        <Selecteur libelle="Période" libelleCache value={periode} onChange={(e) => setPeriode(e.target.value)} className="w-[200px]">
          {Object.entries(PERIODES).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Selecteur>
      </div>
      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <Kpi marine icone={Landmark} libelle="À payer maintenant" valeur={ariary(totalAPayer, false)} unite="Ar" detail={aPayer.length ? pluriel(aPayer.length, 'collecte') + ' en attente' : 'Rien à payer pour le moment'} chargement={collecte.isLoading} />
        <Kpi icone={CalendarClock} libelle="Prochaine collecte" valeur={c?.prochaine_collecte ? ariary(c.prochaine_collecte.montant, false) : '—'} unite={c?.prochaine_collecte ? 'Ar' : undefined} detail={c?.prochaine_collecte ? `Prévue le ${c.prochaine_collecte.date_prevue}` : `Collecte ${c?.config?.frequence === 'hebdomadaire' ? 'chaque semaine' : 'chaque mois'}`} chargement={collecte.isLoading} />
        <Kpi icone={Percent} ton="alerte" libelle={`Commission · ${PERIODES[periode].toLowerCase()}`} valeur={ariary(p.commission, false)} unite="Ar" detail={`${d?.taux_commission ?? c?.config?.taux ?? 5} % des ventes en ligne`} chargement={porte.isLoading} />
        <Kpi icone={CheckCircle2} ton="succes" libelle="Déjà payé à FANDRIO" valeur={ariary(totalPaye, false)} unite="Ar" detail={pluriel(nbPayees, 'collecte réglée', 'collectes réglées')} chargement={collecte.isLoading} />
      </section>

      <Panneau titre="Commission par mois" sousTitre="Les 12 derniers mois (survolez une barre pour le détail)" lien="/compagnie/chiffre-affaires" libelleLien="Voir le chiffre d’affaires">
        {porte.isLoading ? (
          <Squelette className="h-[220px]" />
        ) : (d?.evolution_mensuelle || []).length === 0 ? (
          <Vide icone={Banknote} titre="Pas encore de ventes en ligne" />
        ) : (
          <div className="h-[220px]" role="img" aria-label="Commission FANDRIO par mois">
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
                        <p className="m-0 text-sm font-extrabold tabular-nums">Commission : {ariary(payload[0].payload.commission)}</p>
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="commission" fill="#E4A13A" radius={[5, 5, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panneau>

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

      <p className="m-0 text-[13px] font-semibold text-encre-douce">La commission FANDRIO ne s’applique pas aux ventes au guichet. Vos ventes, votre net et l’export Excel sont dans « Chiffre d’affaires ».</p>
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
    </div>
  );
}
