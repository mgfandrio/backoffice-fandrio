import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Banknote, Landmark, PieChart as IconeCamembert, Ticket, TrendingUp } from 'lucide-react';
import { messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Carte, Erreur, Pastille, Selecteur, Squelette, Vide } from '@/components/ui';
import { Barre, Kpi, Panneau, Tableau } from '@/components/tableau';
import { ariary, ariaryCourt, nombre, pluriel } from '@/utils/format';
import { etatCompagnie, libelleMois } from '@/utils/systeme';

const PERIODES: Record<string, string> = {
  aujourdhui: 'Aujourd’hui',
  cette_semaine: 'Cette semaine',
  ce_mois: 'Ce mois-ci',
  cette_annee: 'Cette année',
  tout: 'Depuis le début',
};

function Bulle({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-ligne bg-white px-3 py-2 shadow-lg">
      <p className="m-0 text-xs font-bold text-encre-douce">{libelleMois(label)}</p>
      <p className="m-0 text-sm font-extrabold tabular-nums text-encre">Commission : {ariary(p.commission)}</p>
      <p className="m-0 text-xs font-semibold tabular-nums text-encre-douce">Ventes : {ariary(p.brut)}</p>
      <p className="m-0 text-xs font-semibold tabular-nums text-encre-douce">{pluriel(p.billets, 'billet')} vendus en ligne</p>
    </div>
  );
}

/** Commissions FANDRIO : chiffres par période, évolution, meilleures compagnies, opérateurs. */
export default function Commissions() {
  const [periode, setPeriode] = useState('ce_mois');
  const q = useQuery({ queryKey: ['systeme', 'commissions', 'dashboard'], queryFn: async () => (await obtenir('/api/admin/commissions/dashboard')).data });
  const cies = useQuery({ queryKey: ['systeme', 'commissions', 'compagnies'], queryFn: async () => ((await obtenir('/api/admin/commissions/compagnies')).data?.compagnies || []) as any[] });

  if (q.isError) return <div className="p-4 sm:px-7 sm:py-6"><Erreur message={messageErreur(q.error)} onReessayer={() => q.refetch()} /></div>;

  const d = q.data;
  const charge = q.isLoading;
  const p = periode === 'tout' ? { brut: d?.totaux?.brut, commission: d?.totaux?.commission, billets: d?.totaux?.total_billets, reservations: d?.totaux?.nb_reservations } : d?.par_periode?.[periode];
  const evolution: any[] = d?.evolution_mensuelle || [];
  const top: any[] = d?.top_compagnies || [];
  const ops: any[] = d?.repartition_operateur || [];
  const maxTop = Math.max(1, ...top.map((t) => Number(t.commission)));
  const totalOps = ops.reduce((s, o) => s + Number(o.brut), 0) || 1;
  const listeCies = [...(cies.data || [])].sort((a, b) => Number(b.commission) - Number(a.commission));

  return (
    <div className="flex flex-col gap-5 p-4 sm:px-7 sm:py-6">
      <Carte className="flex flex-wrap items-end gap-4 p-4">
        <Selecteur libelle="Période" value={periode} onChange={(e) => setPeriode(e.target.value)} className="min-w-[220px]">
          {Object.entries(PERIODES).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Selecteur>
        <p className="m-0 flex-1 text-[13.5px] font-semibold text-encre-douce">
          FANDRIO prélève <b className="text-encre">{d ? `${d.taux_commission} %` : '…'}</b> sur chaque billet vendu en ligne. Les ventes au guichet ne sont pas concernées.
        </p>
      </Carte>

      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        <Kpi marine icone={TrendingUp} libelle={`Commission · ${PERIODES[periode]}`} valeur={ariary(p?.commission, false)} unite="Ar" chargement={charge} />
        <Kpi icone={Banknote} libelle="Ventes en ligne" valeur={ariary(p?.brut, false)} unite="Ar" detail={pluriel(Number(p?.reservations || 0), 'réservation')} chargement={charge} />
        <Kpi icone={Ticket} ton="succes" libelle="Billets vendus en ligne" valeur={nombre(p?.billets)} chargement={charge} />
        <Kpi icone={Landmark} ton={d?.collectes_en_attente ? 'alerte' : 'neutre'} libelle="Commission encaissée" valeur={ariary(d?.commissions_statut?.payee, false)} unite="Ar" detail={`${ariary(d?.commissions_statut?.facturee)} en cours de collecte`} chargement={charge} />
      </section>

      <Panneau titre="Évolution sur 12 mois" sousTitre="Commission FANDRIO par mois (survolez une barre pour le détail)">
        {charge ? (
          <Squelette className="h-[280px]" />
        ) : evolution.length === 0 ? (
          <Vide icone={IconeCamembert} titre="Pas encore de ventes en ligne" />
        ) : (
          <div className="h-[280px]" role="img" aria-label="Commissions mois par mois">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolution} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#EEF2F7" />
                <XAxis dataKey="mois" tickFormatter={libelleMois} tick={{ fill: '#33445C', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#E3EAF2' }} />
                <YAxis tickFormatter={ariaryCourt} tick={{ fill: '#33445C', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} width={48} />
                <Tooltip cursor={{ fill: '#EBF2F9' }} content={<Bulle />} />
                <Bar dataKey="commission" fill="#0B4F8A" radius={[5, 5, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panneau>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panneau titre="Meilleures compagnies" sousTitre="Classées par commission, depuis le début" sansMarge>
          {charge ? (
            <div className="p-5"><Squelette className="h-40" /></div>
          ) : top.length === 0 ? (
            <Vide icone={IconeCamembert} titre="Aucune vente en ligne" />
          ) : (
            <Tableau colonnes={[{ titre: 'Compagnie' }, { titre: 'Billets', droite: true }, { titre: 'Commission', droite: true }]}>
              {top.map((t) => (
                <tr key={t.comp_id}>
                  <td className="min-w-[180px]">
                    <b className="mb-1.5 block">{t.comp_nom}</b>
                    <Barre pct={(Number(t.commission) / maxTop) * 100} />
                  </td>
                  <td className="text-right font-semibold tabular-nums">{nombre(t.billets)}</td>
                  <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(t.commission)}</td>
                </tr>
              ))}
            </Tableau>
          )}
        </Panneau>

        <Panneau titre="Moyens de paiement" sousTitre="Ventes en ligne par opérateur, depuis le début" sansMarge>
          {charge ? (
            <div className="p-5"><Squelette className="h-40" /></div>
          ) : ops.length === 0 ? (
            <Vide icone={IconeCamembert} titre="Aucun paiement en ligne" />
          ) : (
            <Tableau colonnes={[{ titre: 'Opérateur' }, { titre: 'Paiements', droite: true }, { titre: 'Ventes', droite: true }]}>
              {ops.map((o) => {
                const pct = Math.round((Number(o.brut) / totalOps) * 100);
                return (
                  <tr key={o.type_id ?? o.operateur}>
                    <td className="min-w-[180px]">
                      <b className="mb-1.5 block">{o.operateur} <span className="font-semibold text-encre-douce">· {pct} %</span></b>
                      <Barre pct={pct} ton="succes" />
                    </td>
                    <td className="text-right font-semibold tabular-nums">{nombre(o.nb)}</td>
                    <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(o.brut)}</td>
                  </tr>
                );
              })}
            </Tableau>
          )}
        </Panneau>
      </div>

      <Panneau titre="Commission par compagnie" sousTitre="Toutes les compagnies, depuis le début" lien="/systeme/collectes" libelleLien="Voir les collectes" sansMarge>
        {cies.isLoading ? (
          <div className="p-5"><Squelette className="h-40" /></div>
        ) : listeCies.length === 0 ? (
          <Vide icone={IconeCamembert} titre="Aucune compagnie" />
        ) : (
          <Tableau colonnes={[{ titre: 'Compagnie' }, { titre: 'Collecte' }, { titre: 'Billets', droite: true }, { titre: 'Ventes', droite: true }, { titre: 'Commission', droite: true }, { titre: 'État' }]}>
            {listeCies.map((c) => {
              const e = etatCompagnie(c.comp_statut, c.suspendu);
              return (
                <tr key={c.comp_id}>
                  <td className="font-bold">{c.comp_nom}</td>
                  <td className="font-semibold">{c.frequence_collecte === 'hebdomadaire' ? 'Hebdomadaire' : 'Mensuelle'}</td>
                  <td className="text-right font-semibold tabular-nums">{nombre(c.billets)}</td>
                  <td className="whitespace-nowrap text-right font-semibold tabular-nums">{ariary(c.brut)}</td>
                  <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(c.commission)}</td>
                  <td><Pastille libelle={e.libelle} tonalite={e.tonalite} /></td>
                </tr>
              );
            })}
          </Tableau>
        )}
      </Panneau>
    </div>
  );
}
