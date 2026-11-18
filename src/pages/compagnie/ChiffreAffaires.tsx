import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, BarChart3, Download, Info, Printer } from 'lucide-react';
import { messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { useAuth } from '@/auth/AuthContext';
import { Bouton, Carte, Dialogue, Erreur, Selecteur, Squelette, Vide } from '@/components/ui';
import { Barre, Panneau, Tableau } from '@/components/tableau';
import { DonneesRapport, ImpressionRapport } from '@/components/impression/RapportChiffreAffaires';
import { ariary, ariaryCourt, dateISO, initiales, nombre, pluriel } from '@/utils/format';
import { bornes, dateFr, libellePeriode as libelleDePeriode, PERIODES, serie } from '@/utils/periodes';

/**
 * Chiffre d'affaires de la compagnie sur une période au choix :
 * ventes − commission FANDRIO = net, jour par jour, par trajet,
 * par moyen de paiement et par vendeur du guichet ; export Excel et impression.
 */

function Bulle({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-ligne bg-white px-3 py-2 shadow-lg">
      <p className="m-0 text-xs font-bold text-encre-douce">{p.libelle}</p>
      <p className="m-0 text-sm font-extrabold tabular-nums text-encre">Total : {ariary(p.guichet + p.en_ligne)}</p>
      <p className="m-0 text-xs font-semibold tabular-nums text-encre-douce">Guichet : {ariary(p.guichet)}</p>
      <p className="m-0 text-xs font-semibold tabular-nums text-encre-douce">En ligne : {ariary(p.en_ligne)}</p>
    </div>
  );
}

/** Carte d'un terme du calcul « ventes − commission = net ». */
function Terme({ libelle, valeur, detail, couleur = 'text-encre', marine }: { libelle: string; valeur: string; detail?: React.ReactNode; couleur?: string; marine?: boolean }) {
  return (
    <Carte marine={marine} className="min-w-[200px] flex-1 p-[18px]">
      <span className={`text-[12.5px] font-bold ${marine ? 'text-marine-texte' : 'text-encre-douce'}`}>{libelle}</span>
      <div className={`mt-1 text-[26px] font-extrabold tabular-nums ${marine ? 'text-white' : couleur}`}>
        {valeur} <span className={`text-[13px] ${marine ? 'text-marine-texte' : ''}`}>Ar</span>
      </div>
      {detail && <div className={`text-[12.5px] font-semibold ${marine ? 'text-marine-texte' : 'text-encre-douce'}`}>{detail}</div>}
    </Carte>
  );
}

const Signe = ({ s }: { s: string }) => (
  <span aria-hidden className="hidden self-center text-[26px] font-extrabold text-gris-clair md:block">
    {s}
  </span>
);

export default function ChiffreAffaires() {
  const { utilisateur } = useAuth();
  const [periode, setPeriode] = useState('ce_mois');
  const [dates, setDates] = useState(() => bornes('ce_mois'));
  const [trajet, setTrajet] = useState('');
  const [canal, setCanal] = useState('');
  const [export_, setExport] = useState(false);
  const [rapport, setRapport] = useState<DonneesRapport | null>(null);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);

  const { du, au } = periode === 'dates' ? dates : bornes(periode);
  const datesValides = !!du && !!au && du <= au;
  const params = { du, au, traj_id: trajet || undefined, canal: canal || undefined };

  const trajets = useQuery({
    queryKey: ['trajets', 'liste'],
    queryFn: async () => {
      const d = (await obtenir('/api/adminCompagnie/trajet/recupererListeTrajet', { per_page: 200 })).data;
      return ((d?.trajets ?? d) || []) as any[];
    },
  });
  const q = useQuery({
    queryKey: ['chiffre-affaires', params],
    queryFn: async () => (await obtenir('/api/adminCompagnie/chiffre-affaires', params)).data,
    enabled: datesValides,
    placeholderData: (precedent) => precedent,
  });

  const d = q.data;
  const t = d?.totaux;
  const r = d?.remboursements;
  const graph = useMemo(() => (d ? serie(d.par_jour || [], d.periode.du, d.periode.au, ['guichet', 'en_ligne']) : { points: [], parMois: false }), [d]);
  const maxPaiement = Math.max(1, ...((d?.par_paiement || []) as any[]).map((p) => Number(p.montant)));

  const libellePeriode = libelleDePeriode(periode, du, au);
  const libelleFiltres = [
    trajet ? (trajets.data || []).find((x) => String(x.id_trajet) === trajet)?.nom_trajet || 'Un trajet' : 'Tous les trajets',
    canal === 'guichet' ? 'Guichet seulement' : canal === 'en_ligne' ? 'En ligne seulement' : 'Guichet et en ligne',
  ].join(' · ');

  const exporter = async () => {
    if (!d) return;
    setExport(true);
    try {
      const detail = (await obtenir('/api/adminCompagnie/chiffre-affaires/ventes', params)).data;
      const { exporterChiffreAffaires } = await import('@/utils/excelChiffreAffaires');
      await exporterChiffreAffaires({ compagnie: utilisateur?.compagnie?.nom || 'Ma compagnie', du: d.periode.du, au: d.periode.au, filtres: libelleFiltres, resume: d, detail });
    } catch (e) {
      setMessage({ titre: 'Téléchargement impossible', texte: messageErreur(e) });
    } finally {
      setExport(false);
    }
  };
  const finImpression = useCallback(() => setRapport(null), []);

  const variation = d?.precedent?.variation;

  return (
    <div className="flex flex-col gap-[18px] p-4 sm:px-7 sm:py-6">
      {/* Filtres */}
      <Carte className="flex flex-wrap items-end gap-3.5 p-4">
        <Selecteur libelle="Période" value={periode} onChange={(e) => { const v = e.target.value; if (v === 'dates') setDates({ du, au }); setPeriode(v); }} className="min-w-[200px] flex-1">
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
        <Selecteur libelle="Trajet" value={trajet} onChange={(e) => setTrajet(e.target.value)} className="min-w-[220px] flex-1">
          <option value="">Tous les trajets</option>
          {(trajets.data || []).map((x) => (
            <option key={x.id_trajet} value={x.id_trajet}>{x.nom_trajet}</option>
          ))}
        </Selecteur>
        <Selecteur libelle="Canal de vente" value={canal} onChange={(e) => setCanal(e.target.value)} className="min-w-[180px] flex-1">
          <option value="">Guichet et en ligne</option>
          <option value="guichet">Guichet seulement</option>
          <option value="en_ligne">En ligne seulement</option>
        </Selecteur>
        <div className="flex gap-2">
          <Bouton variante="secondaire" icone={Printer} disabled={!d} onClick={() => d && setRapport({ compagnie: utilisateur?.compagnie?.nom || 'Ma compagnie', periode: `du ${dateFr(d.periode.du)} au ${dateFr(d.periode.au)}`, filtres: libelleFiltres, resume: d })}>
            Imprimer
          </Bouton>
          <Bouton icone={Download} chargement={export_} disabled={!d} onClick={exporter}>
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
          {/* Le calcul en une ligne */}
          <section aria-label="Résumé de la période" className={`flex flex-wrap items-stretch gap-3 transition-opacity ${q.isFetching ? 'opacity-60' : ''}`}>
            {!t ? (
              [0, 1, 2].map((i) => <Squelette key={i} className="h-[118px] min-w-[200px] flex-1" />)
            ) : (
              <>
                <Terme
                  libelle={`Ventes · ${libellePeriode}`}
                  valeur={ariary(t.brut, false)}
                  detail={
                    variation == null ? (
                      `Guichet ${ariary(t.guichet)} · En ligne ${ariary(t.en_ligne)}`
                    ) : (
                      <span className={`inline-flex items-center gap-1 font-bold ${variation >= 0 ? 'text-succes' : 'text-danger'}`}>
                        {variation >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        {variation >= 0 ? '+' : ''}
                        {String(variation).replace('.', ',')} % par rapport au {dateFr(d.precedent.du)} – {dateFr(d.precedent.au)}
                      </span>
                    )
                  }
                />
                <Signe s="−" />
                <Terme libelle="Commission FANDRIO" valeur={ariary(t.commission, false)} couleur="text-alerte" detail={`${d.taux_commission} % des ventes en ligne seulement`} />
                <Signe s="=" />
                <Terme marine libelle="Net pour la compagnie" valeur={ariary(t.net, false)} detail={`${pluriel(t.billets, 'billet')} vendus · ${pluriel(t.voyages, 'voyage')}`} />
                <Carte className="flex min-w-[220px] flex-1 flex-col justify-center gap-1 border-dashed p-[18px]">
                  <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-encre-douce">
                    <Info className="h-4 w-4" aria-hidden /> Remboursé aux clients
                  </span>
                  <b className="text-[20px] tabular-nums">{ariary(r.montant)}</b>
                  <span className="text-[12.5px] font-semibold text-encre-douce">{r.nb ? `${pluriel(r.billets, 'billet')} annulé${r.billets > 1 ? 's' : ''}, ` : ''}non compté dans les ventes</span>
                  {r.en_attente_nb > 0 && <span className="text-[12.5px] font-bold text-alerte">Reste à rembourser : {ariary(r.en_attente_montant)} ({r.en_attente_nb})</span>}
                </Carte>
              </>
            )}
          </section>

          {/* Graphique */}
          <Panneau
            titre={graph.parMois ? 'Ventes mois par mois' : 'Ventes jour par jour'}
            sousTitre="Survolez une barre pour voir le détail"
            droite={
              t && (
                <span className="flex flex-wrap gap-4 text-[12.5px] font-bold text-encre-douce">
                  <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] bg-ocean-800" />Guichet · {ariary(t.guichet)}</span>
                  <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] bg-ocean-300" />En ligne · {ariary(t.en_ligne)}</span>
                </span>
              )
            }
          >
            {!d ? (
              <Squelette className="h-[260px]" />
            ) : !t.brut ? (
              <Vide icone={BarChart3} titre="Aucune vente sur cette période" />
            ) : (
              <div className="h-[260px]" role="img" aria-label="Ventes au guichet et en ligne sur la période">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={graph.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#EEF2F7" />
                    <XAxis dataKey="libelle" tick={{ fill: '#33445C', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#E3EAF2' }} interval="preserveStartEnd" minTickGap={8} />
                    <YAxis tickFormatter={ariaryCourt} tick={{ fill: '#33445C', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} width={48} />
                    <Tooltip cursor={{ fill: '#EBF2F9' }} content={<Bulle />} />
                    <Bar dataKey="guichet" stackId="v" fill="#0B4F8A" maxBarSize={30} />
                    <Bar dataKey="en_ligne" stackId="v" fill="#5FB0F2" radius={[5, 5, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panneau>

          {/* Par trajet */}
          <Panneau titre="Par trajet" sousTitre="Quels trajets rapportent le plus" sansMarge>
            {!d ? (
              <div className="p-5"><Squelette className="h-32" /></div>
            ) : !(d.par_trajet || []).length ? (
              <Vide icone={BarChart3} titre="Aucune vente sur cette période" />
            ) : (
              <Tableau colonnes={[{ titre: 'Trajet' }, { titre: 'Voyages', droite: true }, { titre: 'Billets', droite: true }, { titre: 'Remplissage moyen' }, { titre: 'Guichet', droite: true }, { titre: 'En ligne', droite: true }, { titre: 'Total', droite: true }]}>
                {d.par_trajet.map((x: any) => (
                  <tr key={x.traj_id}>
                    <td>
                      <b className="block">{x.trajet}</b>
                      <span className="text-[12px] font-semibold text-encre-douce">{ariary(x.tarif)} le billet</span>
                    </td>
                    <td className="text-right tabular-nums">{nombre(x.voyages)}</td>
                    <td className="text-right tabular-nums">{nombre(x.billets)}</td>
                    <td className="min-w-[160px]">
                      {x.remplissage == null ? '—' : (
                        <span className="flex items-center gap-2.5">
                          <Barre pct={x.remplissage} ton={x.remplissage >= 80 ? 'succes' : x.remplissage < 60 ? 'alerte' : 'ocean'} />
                          <b className="min-w-[40px] text-right tabular-nums">{x.remplissage} %</b>
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-right tabular-nums">{ariary(x.guichet)}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{ariary(x.en_ligne)}</td>
                    <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(x.total)}</td>
                  </tr>
                ))}
                <tr className="bg-fond font-extrabold">
                  <td>Total</td>
                  <td className="text-right tabular-nums">{nombre(d.par_trajet.reduce((s: number, x: any) => s + x.voyages, 0))}</td>
                  <td className="text-right tabular-nums">{nombre(t.billets)}</td>
                  <td />
                  <td className="whitespace-nowrap text-right tabular-nums">{ariary(t.guichet)}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{ariary(t.en_ligne)}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{ariary(t.brut)}</td>
                </tr>
              </Tableau>
            )}
          </Panneau>

          <div className="grid gap-[18px] xl:grid-cols-2">
            {/* Moyens de paiement */}
            <Panneau titre="Comment vos clients ont payé" sousTitre="Espèces au guichet, Mobile Money en ligne" sansMarge>
              {!d ? (
                <div className="p-5"><Squelette className="h-32" /></div>
              ) : !(d.par_paiement || []).length ? (
                <Vide icone={BarChart3} titre="Aucun paiement sur cette période" />
              ) : (
                <ul className="m-0 list-none p-0">
                  {d.par_paiement.map((p: any) => {
                    const pct = t.brut ? Math.round((p.montant / t.brut) * 100) : 0;
                    return (
                      <li key={p.nom} className="flex items-center gap-3.5 border-t border-separateur px-5 py-3 first:border-t-0">
                        <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-ocean-50 text-[11px] font-extrabold text-ocean-800">{initiales(p.nom)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex justify-between gap-2.5 text-[13.5px]">
                            <b>{p.nom}</b>
                            <b className="tabular-nums">{ariary(p.montant)}</b>
                          </span>
                          <span className="mt-1.5 flex items-center gap-2.5">
                            <Barre pct={(p.montant / maxPaiement) * 100} />
                            <span className="min-w-[38px] text-right text-[12px] font-bold tabular-nums text-encre-douce">{pct} %</span>
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panneau>

            {/* Par vendeur */}
            <Panneau titre="Ventes au guichet par vendeur" sousTitre="Espèces encaissées par chaque personne du guichet" sansMarge>
              {!d ? (
                <div className="p-5"><Squelette className="h-32" /></div>
              ) : !(d.par_vendeur || []).length ? (
                <Vide icone={BarChart3} titre="Aucune vente au guichet sur cette période" />
              ) : (
                <Tableau colonnes={[{ titre: 'Vendeur' }, { titre: 'Billets', droite: true }, { titre: 'Espèces encaissées', droite: true }]}>
                  {d.par_vendeur.map((v: any) => (
                    <tr key={v.util_id}>
                      <td>
                        <span className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-ocean-50 text-[12px] font-extrabold text-ocean-800">{initiales(v.nom)}</span>
                          <b>{v.nom}</b>
                        </span>
                      </td>
                      <td className="text-right tabular-nums">{nombre(v.billets)}</td>
                      <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(v.montant)}</td>
                    </tr>
                  ))}
                  <tr className="bg-fond font-extrabold">
                    <td>Total guichet</td>
                    <td className="text-right tabular-nums">{nombre(t.billets_guichet)}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{ariary(t.guichet)}</td>
                  </tr>
                </Tableau>
              )}
            </Panneau>
          </div>

          <p className="m-0 text-[12.5px] font-semibold text-encre-douce">
            Le fichier Excel reprend chaque vente de la période (date, billet, trajet, canal, moyen de paiement, montant, commission) et chaque remboursement : votre comptable peut l’utiliser tel quel.
          </p>
        </>
      )}

      <ImpressionRapport rapport={rapport} onTermine={finImpression} />
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
    </div>
  );
}
