import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, BarChart3, Banknote, CheckCircle2, Download, Hourglass, Printer, TrendingUp } from 'lucide-react';
import { messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Carte, Dialogue, Erreur, Pastille, Selecteur, Squelette, Vide } from '@/components/ui';
import { Barre, Kpi, Panneau, Tableau } from '@/components/tableau';
import { DonneesRapportPlateforme, ImpressionRapportPlateforme } from '@/components/impression/RapportPlateforme';
import { ariary, ariaryCourt, dateISO, pluriel } from '@/utils/format';
import { bornes, dateFr, libellePeriode, PERIODES, serie } from '@/utils/periodes';
import { etatCompagnie } from '@/utils/systeme';

/**
 * Chiffre d'affaires de la plateforme (admin système) : ventes en ligne des
 * compagnies, commission FANDRIO (5 %), commission encaissée et reste à
 * encaisser, par compagnie et par opérateur ; export Excel et impression.
 * Remplace l'ancien écran « Commissions ».
 */

function Bulle({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-ligne bg-white px-3 py-2 shadow-lg">
      <p className="m-0 text-xs font-bold text-encre-douce">{p.libelle}</p>
      <p className="m-0 text-sm font-extrabold tabular-nums text-encre">Ventes en ligne : {ariary(p.en_ligne)}</p>
      <p className="m-0 text-sm font-extrabold tabular-nums text-alerte">Commission : {ariary(p.commission)}</p>
    </div>
  );
}

const COULEURS_OPERATEURS: Record<string, string> = { MVola: 'succes', 'Orange Money': 'alerte' };

export default function ChiffreAffairesPlateforme() {
  const [periode, setPeriode] = useState('ce_mois');
  const [dates, setDates] = useState(() => bornes('ce_mois'));
  const [compagnie, setCompagnie] = useState('');
  const [exportEnCours, setExportEnCours] = useState(false);
  const [rapport, setRapport] = useState<DonneesRapportPlateforme | null>(null);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);

  const { du, au } = periode === 'dates' ? dates : bornes(periode);
  const datesValides = !!du && !!au && du <= au;
  const params = { du, au, comp_id: compagnie || undefined };

  const listeCies = useQuery({
    queryKey: ['systeme', 'compagnies', 'noms'],
    queryFn: async () => ((await obtenir('/api/admin/compagnies/recupListecompagnie', { per_page: 200 })).data?.compagnies || []) as any[],
  });
  const q = useQuery({
    queryKey: ['systeme', 'chiffre-affaires', params],
    queryFn: async () => (await obtenir('/api/admin/chiffre-affaires', params)).data,
    enabled: datesValides,
    placeholderData: (precedent) => precedent,
  });

  const d = q.data;
  const t = d?.totaux;
  const graph = useMemo(() => (d ? serie(d.par_jour || [], d.periode.du, d.periode.au, ['en_ligne', 'commission']) : { points: [], parMois: false }), [d]);
  const parCompagnie: any[] = d?.par_compagnie || [];
  const operateurs: any[] = d?.par_operateur || [];
  const maxOp = Math.max(1, ...operateurs.map((o) => Number(o.montant)));
  const libelle = libellePeriode(periode, du, au);
  const nomCie = compagnie ? (listeCies.data || []).find((c) => String(c.id) === compagnie)?.nom || 'Une compagnie' : 'Toutes les compagnies';
  const variation = d?.precedent?.variation;

  const exporter = async () => {
    if (!d) return;
    setExportEnCours(true);
    try {
      const detail = (await obtenir('/api/admin/chiffre-affaires/ventes', params)).data;
      const { exporterPlateforme } = await import('@/utils/excelPlateforme');
      await exporterPlateforme({ filtres: nomCie, resume: d, detail });
    } catch (e) {
      setMessage({ titre: 'Téléchargement impossible', texte: messageErreur(e) });
    } finally {
      setExportEnCours(false);
    }
  };
  const finImpression = useCallback(() => setRapport(null), []);

  return (
    <div className="flex flex-col gap-[18px] p-4 sm:px-7 sm:py-6">
      <Carte className="flex flex-wrap items-end gap-3.5 p-4">
        <Selecteur libelle="Période" value={periode} onChange={(e) => { const v = e.target.value; if (v === 'dates') setDates({ du, au }); setPeriode(v); }} className="min-w-[210px] flex-1">
          {Object.entries(PERIODES).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Selecteur>
        {periode === 'dates' && (
          <>
            <label className="flex min-w-[150px] flex-1 flex-col gap-1.5">
              <span className="text-[12.5px] font-bold text-encre-douce">Du</span>
              <input type="date" value={dates.du} max={dates.au} onChange={(e) => setDates({ ...dates, du: e.target.value })} className="h-11 rounded-champ border-[1.5px] border-champ bg-white px-3 text-[14px] font-semibold outline-none focus:border-ocean-800" />
            </label>
            <label className="flex min-w-[150px] flex-1 flex-col gap-1.5">
              <span className="text-[12.5px] font-bold text-encre-douce">Au</span>
              <input type="date" value={dates.au} min={dates.du} max={dateISO()} onChange={(e) => setDates({ ...dates, au: e.target.value })} className="h-11 rounded-champ border-[1.5px] border-champ bg-white px-3 text-[14px] font-semibold outline-none focus:border-ocean-800" />
            </label>
          </>
        )}
        <Selecteur libelle="Compagnie" value={compagnie} onChange={(e) => setCompagnie(e.target.value)} className="min-w-[220px] flex-1">
          <option value="">Toutes les compagnies</option>
          {(listeCies.data || []).map((c) => (
            <option key={c.id} value={c.id}>{c.nom}{c.localisation?.nom ? ` · ${c.localisation.nom}` : ''}</option>
          ))}
        </Selecteur>
        <div className="flex gap-2">
          <Bouton variante="secondaire" icone={Printer} disabled={!d} onClick={() => d && setRapport({ periode: `du ${dateFr(d.periode.du)} au ${dateFr(d.periode.au)}`, filtres: nomCie, resume: d })}>
            Imprimer
          </Bouton>
          <Bouton icone={Download} chargement={exportEnCours} disabled={!d} onClick={exporter}>
            Télécharger en Excel
          </Bouton>
        </div>
      </Carte>

      {!datesValides ? (
        <Carte className="p-4 text-[14px] font-bold text-alerte">Choisissez une date de début avant la date de fin.</Carte>
      ) : q.isError ? (
        <Erreur message={messageErreur(q.error)} onReessayer={() => q.refetch()} />
      ) : (
        <>
          <section className={`grid gap-4 transition-opacity [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] ${q.isFetching ? 'opacity-60' : ''}`}>
            <Kpi
              marine
              icone={TrendingUp}
              libelle={`Commission FANDRIO · ${libelle}`}
              valeur={ariary(t?.commission, false)}
              unite="Ar"
              detail={
                variation == null ? (
                  `${d?.taux_commission ?? 5} % des ventes en ligne`
                ) : (
                  <span className={`inline-flex items-center gap-1 font-bold ${variation >= 0 ? 'text-[#9BE7BE]' : 'text-[#FFB4AC]'}`}>
                    {variation >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {variation >= 0 ? '+' : ''}
                    {String(variation).replace('.', ',')} % par rapport au {dateFr(d.precedent.du)} – {dateFr(d.precedent.au)}
                  </span>
                )
              }
              chargement={!d}
            />
            <Kpi icone={Banknote} libelle="Ventes en ligne" valeur={ariary(t?.en_ligne, false)} unite="Ar" detail={t ? `${pluriel(t.billets_en_ligne, 'billet')} · guichet ${ariary(t.guichet)} (sans commission)` : undefined} chargement={!d} />
            <Kpi icone={CheckCircle2} ton="succes" libelle="Commission encaissée" valeur={ariary(t?.encaisse, false)} unite="Ar" detail={t ? `${pluriel(t.nb_collectes_encaissees, 'collecte payée', 'collectes payées')} sur la période` : undefined} chargement={!d} />
            <Kpi
              icone={Hourglass}
              ton={t?.en_retard ? 'danger' : 'alerte'}
              libelle="Reste à encaisser"
              valeur={ariary(t?.a_encaisser, false)}
              unite="Ar"
              detail={t ? (t.en_retard ? <span className="font-bold text-danger">dont {ariary(t.en_retard)} en retard</span> : 'Aucune collecte en retard') : undefined}
              chargement={!d}
            />
          </section>

          <Panneau
            titre={graph.parMois ? 'Ventes en ligne mois par mois' : 'Ventes en ligne jour par jour'}
            sousTitre="Survolez une barre pour voir le détail"
            droite={
              <span className="flex flex-wrap gap-4 text-[12.5px] font-bold text-encre-douce">
                <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] bg-ocean-300" />Ventes en ligne</span>
                <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] bg-alerte-vif" />Commission</span>
              </span>
            }
          >
            {!d ? (
              <Squelette className="h-[260px]" />
            ) : !t.en_ligne ? (
              <Vide icone={BarChart3} titre="Aucune vente en ligne sur cette période" />
            ) : (
              <div className="h-[260px]" role="img" aria-label="Ventes en ligne et commission sur la période">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={graph.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#EEF2F7" />
                    <XAxis dataKey="libelle" tick={{ fill: '#33445C', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#E3EAF2' }} interval="preserveStartEnd" minTickGap={8} />
                    <YAxis tickFormatter={ariaryCourt} tick={{ fill: '#33445C', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} width={48} />
                    <Tooltip cursor={{ fill: '#EBF2F9' }} content={<Bulle />} />
                    <Bar dataKey="en_ligne" fill="#5FB0F2" radius={[5, 5, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="commission" fill="#E4A13A" radius={[5, 5, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panneau>

          <Panneau titre="Par compagnie" sousTitre="Ventes, commission de la période et ce qui reste à encaisser" lien="/systeme/collectes" libelleLien="Voir les collectes" sansMarge>
            {!d ? (
              <div className="p-5"><Squelette className="h-32" /></div>
            ) : parCompagnie.length === 0 ? (
              <Vide icone={BarChart3} titre="Aucune compagnie" />
            ) : (
              <Tableau colonnes={[{ titre: 'Compagnie' }, { titre: 'Ventes en ligne', droite: true }, { titre: 'Ventes guichet', droite: true }, { titre: 'Commission', droite: true }, { titre: 'À encaisser', droite: true }, { titre: 'État' }, { titre: 'Action', cache: true }]}>
                {parCompagnie.map((c) => {
                  const e = etatCompagnie(c.statut, c.suspendu);
                  return (
                    <tr key={c.comp_id}>
                      <td className="font-bold">{c.nom}</td>
                      <td className="whitespace-nowrap text-right tabular-nums">{ariary(c.en_ligne)}</td>
                      <td className="whitespace-nowrap text-right tabular-nums text-encre-douce">{ariary(c.guichet)}</td>
                      <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(c.commission)}</td>
                      <td className="whitespace-nowrap text-right tabular-nums">
                        {c.a_encaisser ? (
                          <>
                            <b className={c.en_retard ? 'text-danger' : ''}>{ariary(c.a_encaisser)}</b>
                            <span className={`block text-[12px] font-semibold ${c.en_retard ? 'text-danger' : 'text-encre-douce'}`}>{c.en_retard ? `dont ${ariary(c.en_retard)} en retard` : c.echeance ? `avant le ${dateFr(c.echeance)}` : ''}</span>
                          </>
                        ) : (
                          <span className="text-gris-clair">—</span>
                        )}
                      </td>
                      <td><Pastille libelle={e.libelle} tonalite={e.tonalite} /></td>
                      <td className="text-right">
                        <Bouton compact variante="secondaire" vers={`/systeme/compagnies?fiche=${c.comp_id}`}>Ouvrir</Bouton>
                      </td>
                    </tr>
                  );
                })}
                {!compagnie && parCompagnie.length > 1 && (
                  <tr className="!bg-fond font-extrabold">
                    <td>Total</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{ariary(t.en_ligne)}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{ariary(t.guichet)}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{ariary(t.commission)}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{ariary(t.a_encaisser)}</td>
                    <td colSpan={2} />
                  </tr>
                )}
              </Tableau>
            )}
          </Panneau>

          <Panneau titre="Moyens de paiement" sousTitre="Ventes en ligne par opérateur" sansMarge>
            {!d ? (
              <div className="p-5"><Squelette className="h-24" /></div>
            ) : operateurs.length === 0 ? (
              <Vide icone={BarChart3} titre="Aucun paiement en ligne sur cette période" />
            ) : (
              <ul className="m-0 list-none p-0">
                {operateurs.map((o) => {
                  const pct = t.en_ligne ? Math.round((o.montant / t.en_ligne) * 100) : 0;
                  return (
                    <li key={o.nom} className="border-t border-separateur px-5 py-3 first:border-t-0">
                      <span className="flex justify-between gap-2.5 text-[14px]">
                        <b>{o.nom} <span className="font-semibold text-encre-douce">· {pluriel(o.nb, 'paiement')}</span></b>
                        <b className="tabular-nums">{ariary(o.montant)}</b>
                      </span>
                      <span className="mt-1.5 flex items-center gap-2.5">
                        <Barre pct={(o.montant / maxOp) * 100} ton={(COULEURS_OPERATEURS[o.nom] as any) || 'ocean'} />
                        <span className="min-w-[38px] text-right text-[12px] font-bold tabular-nums text-encre-douce">{pct} %</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panneau>
          <p className="m-0 text-[12.5px] font-semibold text-encre-douce">
            L’argent des billets va directement sur le compte de chaque compagnie. FANDRIO perçoit {d?.taux_commission ?? 5} % des ventes en ligne, encaissés par les collectes. {t ? `${pluriel(t.billets_guichet, 'billet')} vendu${t.billets_guichet > 1 ? 's' : ''} au guichet sur la période.` : ''}
          </p>
        </>
      )}

      <ImpressionRapportPlateforme rapport={rapport} onTermine={finImpression} />
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
    </div>
  );
}
