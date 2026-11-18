import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Banknote, CheckCircle2, Lock, Scale } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { useAuth } from '@/auth/AuthContext';
import { Bouton, Carte, Dialogue, Erreur, Pastille, Selecteur, Squelette, Tiroir, Vide } from '@/components/ui';
import { Kpi, Panneau, Tableau } from '@/components/tableau';
import { DonneesBon, ImpressionBon } from '@/components/impression/BonCloture';
import { ariary, dateISO, jourLong, lireDate, nombre, pluriel } from '@/utils/format';

/**
 * Caisse du guichet : espèces encaissées par chaque vendeur sur une journée,
 * clôture du soir (comptage billet par billet ou total direct, écart, remarque)
 * et bon de clôture imprimé. Une vente après la clôture rend la caisse « à reclôturer ».
 */

const hier = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateISO(d);
};

/** Écart signé, lisible : « 0 Ar », « − 5 000 Ar », « + 2 000 Ar ». */
const libelleEcart = (e: number) => (e > 0 ? `+ ${ariary(e)}` : e < 0 ? `− ${ariary(-e)}` : ariary(0));
const couleurEcart = (e: number) => (e < 0 ? 'text-danger' : e > 0 ? 'text-alerte' : 'text-succes');

function EtatCaisse({ c }: { c: any }) {
  if (!c.cloture) return <Pastille libelle="Ouverte" tonalite="alerte" />;
  if (c.a_recloturer) return <Pastille libelle="À reclôturer" tonalite="danger" />;
  return <Pastille libelle={`Clôturée à ${c.cloture.le.slice(11, 16)}`} tonalite="succes" />;
}

export default function Caisse() {
  const { utilisateur } = useAuth();
  const queryClient = useQueryClient();
  const [jour, setJour] = useState('aujourdhui');
  const [dateLibre, setDateLibre] = useState(hier());
  const [vendeur, setVendeur] = useState('');
  const [aCloturer, setACloturer] = useState<any>(null);
  const [bon, setBon] = useState<DonneesBon | null>(null);

  const date = jour === 'aujourdhui' ? dateISO() : jour === 'hier' ? hier() : dateLibre;
  const q = useQuery({
    queryKey: ['caisse', date],
    queryFn: async () => (await obtenir('/api/adminCompagnie/caisse', { date })).data,
    enabled: !!date,
    refetchInterval: jour === 'aujourdhui' ? 60_000 : false,
  });
  const d = q.data;
  const caisses: any[] = d?.caisses || [];
  const t = d?.totaux;

  // Vendeur dont on affiche les ventes : celui choisi, sinon la première caisse à clôturer
  const vendeurAffiche = useMemo(() => {
    if (vendeur) return caisses.find((c) => String(c.vendeur_id) === vendeur) || null;
    return caisses.find((c) => !c.cloture || c.a_recloturer) || caisses[0] || null;
  }, [caisses, vendeur]);
  const affichees = vendeur ? caisses.filter((c) => String(c.vendeur_id) === vendeur) : caisses;

  const ventes = useQuery({
    queryKey: ['caisse', 'ventes', date, vendeurAffiche?.vendeur_id],
    queryFn: async () => ((await obtenir('/api/adminCompagnie/caisse/ventes', { date, vendeur_id: vendeurAffiche.vendeur_id })).data?.ventes || []) as any[],
    enabled: !!vendeurAffiche,
  });

  const ouvertes = caisses.filter((c) => !c.cloture || c.a_recloturer);
  const finImpression = useCallback(() => setBon(null), []);
  const libelleJour = (() => {
    const dt = lireDate(date);
    return dt ? jourLong(dt) : date;
  })();

  return (
    <div className="flex flex-col gap-[18px] p-4 sm:px-7 sm:py-6">
      <Carte className="flex flex-wrap items-end gap-3.5 p-4">
        <Selecteur libelle="Jour" value={jour} onChange={(e) => { setJour(e.target.value); setVendeur(''); }} className="min-w-[220px] flex-1">
          <option value="aujourdhui">Aujourd’hui</option>
          <option value="hier">Hier</option>
          <option value="date">Choisir une date…</option>
        </Selecteur>
        {jour === 'date' && (
          <label className="flex min-w-[170px] flex-1 flex-col gap-1.5">
            <span className="text-[12.5px] font-bold text-encre-douce">Date</span>
            <input type="date" value={dateLibre} max={dateISO()} onChange={(e) => { setDateLibre(e.target.value); setVendeur(''); }} className="h-11 rounded-champ border-[1.5px] border-champ bg-white px-3 text-[14px] font-semibold outline-none focus:border-ocean-800" />
          </label>
        )}
        <Selecteur libelle="Vendeur" value={vendeur} onChange={(e) => setVendeur(e.target.value)} className="min-w-[220px] flex-1">
          <option value="">Tous les vendeurs</option>
          {caisses.map((c) => (
            <option key={c.vendeur_id} value={c.vendeur_id}>{c.vendeur}</option>
          ))}
        </Selecteur>
      </Carte>

      {q.isError ? (
        <Erreur message={messageErreur(q.error)} onReessayer={() => q.refetch()} />
      ) : (
        <>
          <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            <Kpi marine icone={Banknote} libelle={`Espèces attendues · ${jour === 'aujourdhui' ? 'aujourd’hui' : libelleJour.toLowerCase()}`} valeur={ariary(t?.attendu, false)} unite="Ar" detail={t ? `${pluriel(t.nb_billets, 'billet')} · ${pluriel(t.nb_ventes, 'vente')}` : undefined} chargement={q.isLoading} />
            <Kpi
              icone={Lock}
              ton={t && t.nb_cloturees < t.nb_caisses ? 'alerte' : 'succes'}
              libelle="Caisses clôturées"
              valeur={t ? `${t.nb_cloturees} sur ${t.nb_caisses}` : '…'}
              detail={ouvertes.length ? `À clôturer : ${ouvertes.map((c) => c.vendeur).join(', ')}` : t?.nb_caisses ? 'Toutes les caisses sont clôturées' : 'Aucune vente au guichet'}
              chargement={q.isLoading}
            />
            <Kpi
              icone={Scale}
              ton={!t || t.ecart === 0 ? 'neutre' : t.ecart < 0 ? 'danger' : 'alerte'}
              libelle="Écart des caisses clôturées"
              valeur={t ? libelleEcart(t.ecart) : '…'}
              detail={!t ? undefined : t.ecart < 0 ? 'Il manque de l’argent' : t.ecart > 0 ? 'Il y a plus d’argent que prévu' : 'Aucun écart'}
              chargement={q.isLoading}
            />
          </section>

          <Panneau titre="Caisses du jour" sousTitre="Une caisse par vendeur : ce qu’il a vendu, et ce qu’il a compté le soir" sansMarge>
            {q.isLoading ? (
              <div className="p-5"><Squelette className="h-28" /></div>
            ) : caisses.length === 0 ? (
              <Vide icone={Banknote} titre="Aucune vente au guichet ce jour-là">Les caisses apparaissent dès la première vente au guichet.</Vide>
            ) : (
              <Tableau colonnes={[{ titre: 'Vendeur' }, { titre: 'Billets', droite: true }, { titre: 'Attendu', droite: true }, { titre: 'Compté', droite: true }, { titre: 'Écart', droite: true }, { titre: 'État' }, { titre: 'Action', cache: true }]}>
                {affichees.map((c) => (
                  <tr key={c.vendeur_id} className={vendeurAffiche?.vendeur_id === c.vendeur_id ? '!bg-ocean-50' : ''}>
                    <td>
                      <button type="button" onClick={() => setVendeur(String(c.vendeur_id))} className="border-0 bg-transparent p-0 text-left font-bold text-encre hover:text-ocean-800 hover:underline">
                        {c.vendeur}
                      </button>
                      <span className="block text-[12px] font-semibold text-encre-douce">{pluriel(c.nb_ventes, 'vente')}</span>
                    </td>
                    <td className="text-right tabular-nums">{nombre(c.nb_billets)}</td>
                    <td className="whitespace-nowrap text-right font-semibold tabular-nums">{ariary(c.attendu)}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{c.cloture ? ariary(c.cloture.compte) : <span className="text-gris-clair">—</span>}</td>
                    <td className="text-right">
                      {c.cloture ? (
                        <>
                          <b className={`whitespace-nowrap tabular-nums ${couleurEcart(c.cloture.ecart)}`}>{libelleEcart(c.cloture.ecart)}</b>
                          {c.cloture.note && <span className="block max-w-[220px] truncate text-[12px] font-semibold text-encre-douce" title={c.cloture.note}>« {c.cloture.note} »</span>}
                        </>
                      ) : (
                        <span className="text-gris-clair">—</span>
                      )}
                    </td>
                    <td>
                      <EtatCaisse c={c} />
                      {c.a_recloturer && <span className="block text-[12px] font-semibold text-danger">Ventes après la clôture</span>}
                    </td>
                    <td className="whitespace-nowrap text-right">
                      {!c.cloture || c.a_recloturer ? (
                        <Bouton compact icone={Lock} onClick={() => setACloturer(c)}>
                          {c.a_recloturer ? 'Reclôturer' : 'Clôturer la caisse'}
                        </Bouton>
                      ) : (
                        <Bouton
                          compact
                          variante="secondaire"
                          onClick={() => setBon({ compagnie: utilisateur?.compagnie?.nom || 'Ma compagnie', vendeur: c.vendeur, date: d.date, cloture: c.cloture })}
                        >
                          Réimprimer le bon
                        </Bouton>
                      )}
                    </td>
                  </tr>
                ))}
                {!vendeur && caisses.length > 1 && (
                  <tr className="!bg-fond font-extrabold">
                    <td>Total</td>
                    <td className="text-right tabular-nums">{nombre(t.nb_billets)}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{ariary(t.attendu)}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{ariary(t.compte)}</td>
                    <td className={`whitespace-nowrap text-right tabular-nums ${couleurEcart(t.ecart)}`}>{libelleEcart(t.ecart)}</td>
                    <td colSpan={2} />
                  </tr>
                )}
              </Tableau>
            )}
          </Panneau>

          {vendeurAffiche && (
            <Panneau titre={`Ventes de ${vendeurAffiche.vendeur}`} sousTitre={`${pluriel(vendeurAffiche.nb_ventes, 'vente')} · ${pluriel(vendeurAffiche.nb_billets, 'billet')} · ${ariary(vendeurAffiche.attendu)} en espèces`} sansMarge>
              {ventes.isLoading ? (
                <div className="p-5"><Squelette className="h-24" /></div>
              ) : (
                <Tableau colonnes={[{ titre: 'Heure' }, { titre: 'Billet' }, { titre: 'Trajet' }, { titre: 'Départ' }, { titre: 'Places', droite: true }, { titre: 'Montant', droite: true }]}>
                  {(ventes.data || []).map((v) => (
                    <tr key={v.billet}>
                      <td className="font-bold tabular-nums">{v.heure}</td>
                      <td className="tabular-nums">
                        {v.billet}
                        {v.annule && <span className="ml-2"><Pastille libelle="Voyage annulé" tonalite="neutre" point={false} /></span>}
                      </td>
                      <td>{v.trajet}</td>
                      <td className="tabular-nums text-encre-douce">{v.depart}</td>
                      <td className="text-right tabular-nums">{v.places}</td>
                      <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(v.montant)}</td>
                    </tr>
                  ))}
                </Tableau>
              )}
            </Panneau>
          )}

          <Panneau titre="Jours précédents" sousTitre="Les clôtures des 14 derniers jours, pour repérer les écarts qui se répètent" sansMarge>
            {q.isLoading ? (
              <div className="p-5"><Squelette className="h-24" /></div>
            ) : (d?.historique || []).length === 0 ? (
              <Vide icone={Banknote} titre="Aucune vente au guichet ces 14 derniers jours" />
            ) : (
              <Tableau colonnes={[{ titre: 'Jour' }, { titre: 'Attendu', droite: true }, { titre: 'Compté', droite: true }, { titre: 'Écart', droite: true }, { titre: 'Caisses' }, { titre: 'Action', cache: true }]}>
                {d.historique.map((h: any) => {
                  const toutes = h.nb_cloturees === h.nb_caisses;
                  const dt = lireDate(h.date);
                  return (
                    <tr key={h.date}>
                      <td className="font-bold">{dt ? jourLong(dt) : h.date}</td>
                      <td className="whitespace-nowrap text-right tabular-nums">{ariary(h.attendu)}</td>
                      <td className="whitespace-nowrap text-right tabular-nums">{ariary(h.compte)}</td>
                      <td className={`whitespace-nowrap text-right font-extrabold tabular-nums ${couleurEcart(h.ecart)}`}>{libelleEcart(h.ecart)}</td>
                      <td>
                        {toutes ? (
                          <Pastille libelle={`${h.nb_cloturees} sur ${h.nb_caisses} clôturées`} tonalite="succes" />
                        ) : (
                          <Pastille libelle={`${h.nb_cloturees} sur ${h.nb_caisses} clôturées`} tonalite="danger" />
                        )}
                      </td>
                      <td className="text-right">
                        <Bouton compact variante="secondaire" onClick={() => { setJour('date'); setDateLibre(h.date); setVendeur(''); }}>
                          Voir
                        </Bouton>
                      </td>
                    </tr>
                  );
                })}
              </Tableau>
            )}
          </Panneau>
        </>
      )}

      <PanneauCloture
        caisse={aCloturer}
        date={date}
        billets={d?.billets || [20000, 10000, 5000, 2000, 1000, 500, 200, 100]}
        onFermer={() => setACloturer(null)}
        onCloturee={(r, imprimer) => {
          setACloturer(null);
          queryClient.invalidateQueries({ queryKey: ['caisse'] });
          if (imprimer) setBon({ compagnie: utilisateur?.compagnie?.nom || 'Ma compagnie', vendeur: r.vendeur, date: r.date, cloture: r.cloture });
        }}
      />
      <ImpressionBon bon={bon} onTermine={finImpression} />
    </div>
  );
}

/** Panneau latéral de clôture : comptage billet par billet (ou total direct), écart, remarque. */
function PanneauCloture({ caisse, date, billets, onFermer, onCloturee }: { caisse: any; date: string; billets: number[]; onFermer: () => void; onCloturee: (r: any, imprimer: boolean) => void }) {
  const [comptage, setComptage] = useState<Record<string, string>>({});
  const [totalDirect, setTotalDirect] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [imprimer, setImprimer] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [confirmer, setConfirmer] = useState(false);

  useEffect(() => {
    if (!caisse) return;
    setComptage({});
    setTotalDirect(null);
    setNote(caisse.cloture?.note || '');
    setErreur('');
    setConfirmer(false);
  }, [caisse]);

  const totalComptage = billets.reduce((s, b) => s + b * (parseInt(comptage[b] || '0', 10) || 0), 0);
  const total = totalDirect !== null ? Number(totalDirect.replace(/\s/g, '')) || 0 : totalComptage;
  const saisi = totalDirect !== null ? totalDirect.trim() !== '' : Object.values(comptage).some((v) => v.trim() !== '');
  const attendu = Number(caisse?.attendu || 0);
  const ecart = total - attendu;

  const envoyer = async () => {
    if (!saisi) return setErreur('Comptez l’argent de la caisse avant de clôturer.');
    if (ecart !== 0 && note.trim().length < 3) return setErreur('Il y a un écart : expliquez-le en quelques mots dans la remarque.');
    setEnvoi(true);
    setErreur('');
    try {
      const billetage = totalDirect === null ? Object.fromEntries(Object.entries(comptage).filter(([, v]) => parseInt(v, 10) > 0).map(([k, v]) => [k, parseInt(v, 10)])) : null;
      const r = await api.post('/api/adminCompagnie/caisse/cloturer', { date, vendeur_id: caisse.vendeur_id, compte: total, billetage, note: note.trim() || null });
      onCloturee(r.data?.data, imprimer);
    } catch (e) {
      setErreur(messageErreur(e));
      setConfirmer(false);
    } finally {
      setEnvoi(false);
    }
  };

  const dt = lireDate(date);
  return (
    <Tiroir
      ouvert={!!caisse}
      titre={caisse?.a_recloturer ? 'Reclôturer la caisse' : 'Clôturer la caisse'}
      sousTitre={caisse ? `${caisse.vendeur} · ${dt ? jourLong(dt).toLowerCase() : date} · ${pluriel(caisse.nb_ventes, 'vente')}` : undefined}
      onFermer={onFermer}
      pied={
        <>
          <Bouton variante="secondaire" onClick={onFermer} disabled={envoi}>Annuler</Bouton>
          <Bouton icone={Lock} className="ml-auto" chargement={envoi} onClick={() => (ecart !== 0 && saisi ? setConfirmer(true) : envoyer())}>
            {imprimer ? 'Clôturer et imprimer le bon' : 'Clôturer la caisse'}
          </Bouton>
        </>
      }
    >
      {caisse && (
        <div className="flex flex-col gap-4">
          {caisse.a_recloturer && (
            <p className="m-0 flex items-start gap-2 rounded-xl border border-danger-bord bg-danger-fond p-3 text-[13.5px] font-bold text-danger">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
              Des ventes ont été faites après la première clôture : recomptez toute la caisse.
            </p>
          )}
          <div className="flex items-baseline justify-between rounded-2xl bg-ocean-50 px-4 py-3.5">
            <span className="text-[14px] font-bold text-ocean-950">Espèces attendues</span>
            <b className="text-[22px] tabular-nums text-ocean-950">{ariary(attendu)}</b>
          </div>

          <div>
            <b className="block text-[14px]">Comptez les billets et les pièces</b>
            <span className="text-[12.5px] font-semibold text-encre-douce">Saisissez le nombre de chaque billet : le total se calcule tout seul.</span>
            <div className={`mt-2 flex flex-col ${totalDirect !== null ? 'opacity-50' : ''}`}>
              {billets.map((b) => (
                <label key={b} className="grid grid-cols-[100px_1fr_120px] items-center gap-2.5 border-b border-dashed border-ligne py-1.5 text-[14px]">
                  <b className="tabular-nums">{ariary(b)}</b>
                  <input
                    inputMode="numeric"
                    value={comptage[b] || ''}
                    onChange={(e) => { setTotalDirect(null); setComptage({ ...comptage, [b]: e.target.value.replace(/\D/g, '').slice(0, 5) }); }}
                    aria-label={`Nombre de billets de ${ariary(b)}`}
                    placeholder="0"
                    className="h-[38px] w-full rounded-[10px] border-[1.5px] border-champ px-2.5 text-center text-[15px] font-extrabold tabular-nums outline-none focus:border-ocean-800"
                  />
                  <span className="text-right font-bold tabular-nums text-encre-douce">{comptage[b] ? ariary(b * (parseInt(comptage[b], 10) || 0)) : '—'}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-bold text-encre-douce">Ou tapez directement le total compté</span>
            <input
              inputMode="numeric"
              value={totalDirect ?? ''}
              onChange={(e) => setTotalDirect(e.target.value.replace(/[^\d\s]/g, '') || null)}
              placeholder="Ex. : 245 000"
              className="h-11 rounded-champ border-[1.5px] border-champ bg-white px-3 text-[15px] font-extrabold tabular-nums outline-none focus:border-ocean-800"
            />
          </label>

          <div className="flex items-baseline justify-between rounded-2xl border-[1.5px] border-ligne px-4 py-3.5">
            <span className="text-[14px] font-bold">Total compté</span>
            <b className="text-[22px] tabular-nums">{ariary(total)}</b>
          </div>
          {saisi && (
            <div className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 text-[14px] font-extrabold ${ecart === 0 ? 'bg-succes-fond text-succes' : ecart < 0 ? 'bg-danger-fond text-danger' : 'bg-alerte-fond text-alerte'}`}>
              {ecart === 0 ? <CheckCircle2 className="h-5 w-5" aria-hidden /> : <AlertTriangle className="h-5 w-5" aria-hidden />}
              {ecart === 0 ? 'La caisse est juste : aucun écart.' : ecart < 0 ? `Il manque ${ariary(-ecart)}.` : `Il y a ${ariary(ecart)} de trop.`}
            </div>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-bold text-encre-douce">Remarque {saisi && ecart !== 0 ? '(obligatoire : il y a un écart)' : '(facultative)'}</span>
            <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} placeholder="Ex. : erreur de rendu de monnaie" className="h-11 rounded-champ border-[1.5px] border-champ bg-white px-3 text-[14px] font-semibold outline-none focus:border-ocean-800" />
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-[14px] font-bold">
            <input type="checkbox" checked={imprimer} onChange={(e) => setImprimer(e.target.checked)} className="h-5 w-5 accent-ocean-800" />
            Imprimer le bon de clôture (ticket 80 mm)
          </label>
          {erreur && <p role="alert" className="m-0 rounded-xl bg-danger-fond px-3 py-2 text-[13.5px] font-bold text-danger">{erreur}</p>}
        </div>
      )}
      <Dialogue
        ouvert={confirmer}
        titre="Clôturer avec un écart ?"
        confirmer="Clôturer quand même"
        danger={ecart < 0}
        chargement={envoi}
        onConfirmer={envoyer}
        onFermer={() => setConfirmer(false)}
      >
        {ecart < 0 ? `Il manque ${ariary(-ecart)} dans la caisse.` : `Il y a ${ariary(ecart)} de trop dans la caisse.`} L’écart sera enregistré avec votre remarque.
      </Dialogue>
    </Tiroir>
  );
}
