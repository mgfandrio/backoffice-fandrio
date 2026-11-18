import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Banknote, Bus, CheckCircle2, Printer, RefreshCw, ArrowLeftRight, Plus } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { useSiegesEnDirect } from '@/api/tempsReel';
import { useAuth } from '@/auth/AuthContext';
import { Bouton, Carte, Champ, Dialogue, Erreur, Squelette, Vide } from '@/components/ui';
import { GrillePlan, LegendePlan, PlanSieges, SiegePlan } from '@/components/sieges/PlanSieges';
import { DonneesTicket, ImpressionTicket } from '@/components/ticket/Ticket';
import { ariary, dateISO, heure, jourRelatif, lireDate, pluriel } from '@/utils/format';

/**
 * Vente au guichet (maquette « Web · Compagnie · Vente au guichet ») :
 * 1. le départ, 2. les sièges, 3. les voyageurs et l'encaissement en espèces.
 * Billet confirmé tout de suite ; ticket imprimé si le voyageur le souhaite.
 */

type Fiche = { nom: string; prenom: string; telephone: string };
type Jour = 'aujourdhui' | 'demain' | 'plus_tard';
const FICHE_VIDE: Fiche = { nom: '', prenom: '', telephone: '' };

function jourDe(v: any): Jour {
  const d = lireDate(v.date);
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  const ecart = d ? Math.round((d.getTime() - auj.getTime()) / 86400000) : 99;
  return ecart <= 0 ? 'aujourdhui' : ecart === 1 ? 'demain' : 'plus_tard';
}

/** Bouton de filtre (destination, date) avec le nombre de départs. */
function Puce({ libelle, nombre, actif, onClick }: { libelle: string; nombre: number; actif: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      disabled={!actif && nombre === 0}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        actif ? 'bg-ocean-800 text-white' : 'border-[1.5px] border-champ bg-white text-encre hover:border-ocean-800'
      }`}
    >
      {libelle}
      <span className={`tabular-nums ${actif ? 'text-white/80' : 'text-encre-douce'}`}>{nombre}</span>
    </button>
  );
}

/** Étape numérotée. */
function TitreEtape({ n, titre, droite }: { n: number; titre: string; droite?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-ocean-950 text-[13px] font-extrabold text-white">{n}</span>
      <h2 className="m-0 flex-1 text-[16px] font-extrabold text-encre">{titre}</h2>
      {droite}
    </div>
  );
}

export default function Guichet() {
  const { utilisateur } = useAuth();
  // Filtres posés dans l'ordre des questions du guichetier : où ? puis quand ?
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [voyage, setVoyage] = useState<any>(null);
  const [sieges, setSieges] = useState<SiegePlan[]>([]);
  const [grille, setGrille] = useState<GrillePlan | null>(null);
  const [chargementPlan, setChargementPlan] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [fiches, setFiches] = useState<Record<string, Fiche>>({});
  const [embarquer, setEmbarquer] = useState(false);
  const [recu, setRecu] = useState('');
  const [erreurs, setErreurs] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [vente, setVente] = useState<any>(null);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);
  const [aImprimer, setAImprimer] = useState<DonneesTicket | null>(null);
  const champsNom = useRef<Record<string, HTMLInputElement | null>>({});

  // Départs ouverts à la vente : aujourd'hui et à venir, programmés ou en cours, actifs, avec des places
  const departs = useQuery({
    queryKey: ['guichet', 'departs'],
    queryFn: async () =>
      ((await obtenir('/api/adminCompagnie/voyage/recupererListeVoyage', { date_debut: dateISO(), per_page: 100, sort_field: 'voyage_date' })).data?.voyages || []) as any[],
    refetchInterval: 60_000,
  });
  const compagnie = useQuery({
    queryKey: ['ma-compagnie'],
    queryFn: async () => (await obtenir('/api/adminCompagnie/ma-compagnie')).data,
    staleTime: 10 * 60_000,
  });

  const ouverts = useMemo(
    () =>
      (departs.data || [])
        .filter((v) => [1, 2].includes(Number(v.statut)) && v.is_active !== false && v.publie !== false && Number(v.places_libres ?? 1) > 0)
        .sort((a, b) => `${a.date} ${a.heure_depart}`.localeCompare(`${b.date} ${b.heure_depart}`)),
    [departs.data]
  );
  // Les deux filtres fonctionnent ensemble ou séparément ; chaque compteur tient compte de l'autre filtre
  const auj = dateISO();
  const demainD = new Date();
  demainD.setDate(demainD.getDate() + 1);
  const demain = dateISO(demainD);
  const destinations = useMemo(() => {
    const m = new Map<string, number>();
    ouverts.forEach((v) => {
      const d = v.trajet?.province_arrivee || '—';
      if (!m.has(d)) m.set(d, 0);
      if (!date || v.date === date) m.set(d, (m.get(d) || 0) + 1);
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [ouverts, date]);
  const pourDestination = useMemo(() => ouverts.filter((v) => !destination || v.trajet?.province_arrivee === destination), [ouverts, destination]);
  const dates = useMemo(() => {
    const m = new Map<string, number>();
    pourDestination.forEach((v) => m.set(v.date, (m.get(v.date) || 0) + 1));
    return m;
  }, [pourDestination]);
  const autresDates = [...dates.keys()].filter((d) => d !== auj && d !== demain).sort();
  const resultats = useMemo(() => pourDestination.filter((v) => !date || v.date === date), [pourDestination, date]);
  const groupes = useMemo(() => {
    const g: { date: string; items: any[] }[] = [];
    resultats.forEach((v) => {
      const dernier = g[g.length - 1];
      if (dernier && dernier.date === v.date) dernier.items.push(v);
      else g.push({ date: v.date, items: [v] });
    });
    return g;
  }, [resultats]);
  const effacerFiltres = () => {
    setDestination('');
    setDate('');
  };

  // Plan des sièges du départ choisi, suivi en direct
  const chargerPlan = useCallback(async (id: number) => {
    try {
      const r = await obtenir(`/api/adminCompagnie/reservations/voyages/${id}/plan-sieges`);
      if (r?.data?.plan) {
        setSieges(r.data.plan);
        setGrille(r.data.grille || null);
      }
    } catch {
      /* le prochain rafraîchissement réessaiera */
    }
  }, []);
  useSiegesEnDirect(
    voyage?.id,
    (code, statut) => setSieges((p) => p.map((s) => (String(s.code) === code ? { ...s, statut } : s))),
    () => voyage?.id && chargerPlan(voyage.id)
  );

  // Un siège choisi vendu entre-temps (en ligne) sort de la sélection
  useEffect(() => {
    if (vente) return;
    const libres = new Set(sieges.filter((s) => s.statut === 'disponible').map((s) => String(s.code)));
    setSelection((sel) => (sel.every((c) => libres.has(c)) ? sel : sel.filter((c) => libres.has(c))));
  }, [sieges, vente]);

  const reinitialiserVente = () => {
    setSelection([]);
    setFiches({});
    setErreurs(false);
    setRecu('');
    setVente(null);
  };

  const choisirVoyage = async (v: any) => {
    if (voyage?.id === v.id && !vente) return;
    setVoyage(v);
    reinitialiserVente();
    setEmbarquer(jourDe(v) === 'aujourdhui');
    setSieges([]);
    setGrille(null);
    setChargementPlan(true);
    await chargerPlan(v.id);
    setChargementPlan(false);
  };

  const basculer = (code: string) => {
    setErreurs(false);
    setSelection((s) => {
      if (s.includes(code)) return s.filter((c) => c !== code);
      // Le curseur va directement au nom du voyageur de ce siège
      window.setTimeout(() => champsNom.current[code]?.focus(), 50);
      return [...s, code].sort((a, b) => Number(a) - Number(b));
    });
  };
  const majFiche = (code: string, champ: keyof Fiche, valeur: string) => setFiches((f) => ({ ...f, [code]: { ...(f[code] || FICHE_VIDE), [champ]: valeur } }));

  const tarif = Number(voyage?.trajet?.tarif) || 0;
  const total = tarif * selection.length;
  const montantRecu = Number(recu.replace(/\s/g, '')) || 0;
  const trajet = voyage ? `${voyage.trajet?.province_depart} → ${voyage.trajet?.province_arrivee}` : '';
  const quand = voyage ? `${jourRelatif(voyage.date)} à ${heure(voyage.heure_depart)}` : '';
  const libres = sieges.filter((s) => s.statut === 'disponible').length;
  const nomsManquants = selection.filter((c) => !(fiches[c]?.nom || '').trim());

  const demanderEncaissement = useCallback(() => {
    if (!voyage || selection.length === 0 || vente) return;
    if (nomsManquants.length) {
      setErreurs(true);
      champsNom.current[nomsManquants[0]]?.focus();
      return;
    }
    setConfirmer(true);
  }, [voyage, selection.length, vente, nomsManquants]);

  // F9 : encaisser
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        demanderEncaissement();
      }
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [demanderEncaissement]);

  const vendre = async () => {
    setEnvoi(true);
    try {
      const r = await api.post('/api/adminCompagnie/reservations/guichet', {
        voyage_id: voyage.id,
        embarquer,
        voyageurs: selection.map((code) => ({
          siege: code,
          nom: fiches[code].nom.trim(),
          prenom: fiches[code].prenom.trim() || undefined,
          telephone: fiches[code].telephone.trim() || undefined,
        })),
      });
      setVente(r.data?.data);
      setConfirmer(false);
      chargerPlan(voyage.id);
      departs.refetch();
    } catch (e) {
      setConfirmer(false);
      const m = messageErreur(e, 'La vente n’a pas été enregistrée.');
      if (/siège/i.test(m)) chargerPlan(voyage.id);
      setMessage({ titre: 'Vente non enregistrée', texte: `${m} Aucun paiement n’a été enregistré.` });
    } finally {
      setEnvoi(false);
    }
  };

  const imprimer = () => {
    if (!vente) return;
    let qr = String(vente.qr_data || '');
    try {
      qr = atob(qr);
    } catch {
      /* déjà en clair */
    }
    const c = compagnie.data;
    setAImprimer({
      compagnie: { nom: c?.nom || utilisateur?.compagnie?.nom || '', telephone: c?.telephone, adresse: c?.adresse },
      numero: vente.res_numero,
      trajet: vente.trajet,
      date: vente.date,
      heure: String(vente.heure || ''),
      vehicule: voyage?.voiture?.matricule,
      voyageurs: (vente.voyageurs || []).map((v: any) => ({ nom: v.nom, siege: String(v.siege) })),
      montant: Number(vente.montant_total) || 0,
      qr,
      guichetier: `${utilisateur?.prenom || ''} ${(utilisateur?.nom || '').charAt(0)}.`.trim(),
      venduLe: new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    });
  };

  const finImpression = useCallback(() => setAImprimer(null), []);

  const autreVente = () => {
    reinitialiserVente();
    if (libres === 0) setVoyage(null);
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:px-7 sm:py-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <p className="m-0 flex-1 text-[14px] font-semibold text-encre-douce">Paiement en espèces. Le billet est confirmé tout de suite ; le ticket imprimé est facultatif.</p>
        <span className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-encre-douce">
          <kbd className="rounded-md border border-champ bg-white px-1.5 py-0.5 text-[11px] font-bold">Tab</kbd> champ suivant
          <kbd className="ml-2 rounded-md border border-champ bg-white px-1.5 py-0.5 text-[11px] font-bold">F9</kbd> encaisser
        </span>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(320px,1fr)_auto_minmax(360px,1.15fr)]">
        {/* 1. Départ */}
        <Carte className="flex flex-col gap-3 p-4">
          <TitreEtape
            n={1}
            titre="Départ"
            droite={
              <button type="button" onClick={() => departs.refetch()} aria-label="Actualiser les départs" title="Actualiser" className="flex h-9 w-9 items-center justify-center rounded-lg text-encre-douce hover:bg-fond">
                <RefreshCw className={`h-4 w-4 ${departs.isFetching ? 'animate-spin' : ''}`} aria-hidden />
              </button>
            }
          />
          {/* Où va le voyageur ? */}
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-extrabold text-encre">Où va le voyageur ?</span>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="h-12 w-full rounded-champ border-[1.5px] border-champ bg-white px-3 text-[15px] font-bold text-encre outline-none focus:border-ocean-800 focus:ring-4 focus:ring-ocean-50"
            >
              <option value="">Toutes les destinations ({date ? ouverts.filter((v) => v.date === date).length : ouverts.length})</option>
              {destinations.map(([d, n]) => (
                <option key={d} value={d} disabled={n === 0 && destination !== d}>
                  {d} ({pluriel(n, 'départ')})
                </option>
              ))}
            </select>
          </label>

          {/* Quel jour ? */}
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-extrabold text-encre">Quel jour ?</span>
            <div role="group" aria-label="Date du départ" className="flex flex-wrap items-center gap-1.5">
              <Puce actif={!date} onClick={() => setDate('')} libelle="Toutes" nombre={pourDestination.length} />
              <Puce actif={date === auj} onClick={() => setDate(date === auj ? '' : auj)} libelle="Aujourd’hui" nombre={dates.get(auj) || 0} />
              <Puce actif={date === demain} onClick={() => setDate(date === demain ? '' : demain)} libelle="Demain" nombre={dates.get(demain) || 0} />
              {autresDates.map((d) => (
                <Puce key={d} actif={date === d} onClick={() => setDate(date === d ? '' : d)} libelle={jourRelatif(d)} nombre={dates.get(d) || 0} />
              ))}
              <label className="inline-flex h-9 items-center gap-1.5 rounded-full border-[1.5px] border-champ bg-white pl-3 pr-1 text-[13px] font-bold text-encre-douce">
                Autre date
                <input
                  type="date"
                  min={auj}
                  value={date && date !== auj && date !== demain && !autresDates.includes(date) ? date : ''}
                  onChange={(e) => setDate(e.target.value)}
                  aria-label="Choisir une autre date"
                  className="h-7 rounded-full border-0 bg-transparent px-1 text-[13px] font-bold text-encre outline-none"
                />
              </label>
            </div>
          </div>

          {(destination || date) && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-ocean-50 px-3 py-2 text-[13px] font-bold text-ocean-950">
              <span>
                {pluriel(resultats.length, 'départ')}
                {destination && ` vers ${destination}`}
                {date && ` · ${jourRelatif(date)}`}
              </span>
              <button type="button" onClick={effacerFiltres} className="font-extrabold text-ocean-800 hover:underline">
                Effacer
              </button>
            </div>
          )}

          {departs.isLoading ? (
            <div className="flex flex-col gap-2">{[0, 1, 2].map((i) => <Squelette key={i} className="h-16" />)}</div>
          ) : departs.isError ? (
            <Erreur message={messageErreur(departs.error)} onReessayer={() => departs.refetch()} />
          ) : resultats.length === 0 ? (
            <Vide icone={Bus} titre={ouverts.length ? 'Aucun départ ne correspond' : 'Aucun départ ouvert à la vente'}>
              {ouverts.length ? (
                <button type="button" onClick={effacerFiltres} className="font-extrabold text-ocean-800 hover:underline">
                  Effacer les filtres
                </button>
              ) : (
                'Seuls les départs publiés et non complets apparaissent ici.'
              )}
            </Vide>
          ) : (
            <div className="flex flex-col gap-3">
              {groupes.map((g) => (
                <div key={g.date} className="flex flex-col gap-2">
                  <span className="text-[12px] font-extrabold uppercase tracking-wide text-encre-douce">
                    {jourRelatif(g.date)} · {pluriel(g.items.length, 'départ')}
                  </span>
                  {g.items.map((v) => {
                    const actif = voyage?.id === v.id;
                    const libresV = Number(v.places_libres) || 0;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        aria-pressed={actif}
                        onClick={() => choisirVoyage(v)}
                        className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors ${actif ? 'border-2 border-ocean-800 bg-ocean-50' : 'border border-ligne bg-white hover:border-ocean-200 hover:bg-[#F8FAFD]'}`}
                      >
                        <b className="w-14 flex-none text-[17px] tabular-nums">{heure(v.heure_depart)}</b>
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-[14px]">
                            {v.trajet?.province_depart} → {v.trajet?.province_arrivee}
                          </b>
                          <span className="block truncate text-[12.5px] font-semibold text-encre-douce">
                            {v.voiture?.matricule} · {ariary(v.trajet?.tarif)}
                          </span>
                        </span>
                        <b className={`whitespace-nowrap text-[13px] tabular-nums ${libresV <= 3 ? 'text-alerte' : 'text-succes'}`}>{pluriel(libresV, 'place libre', 'places libres')}</b>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </Carte>

        {/* 2. Sièges */}
        <Carte className="flex flex-col gap-3 p-4 xl:min-w-[330px]">
          <TitreEtape n={2} titre="Sièges" droite={voyage && <b className="text-[13px] tabular-nums text-encre-douce">{pluriel(selection.length, 'choisi')}</b>} />
          {!voyage ? (
            <p className="m-0 rounded-xl border-[1.5px] border-dashed border-champ px-4 py-8 text-center text-[14px] font-semibold text-encre-douce">Choisissez d’abord un départ.</p>
          ) : chargementPlan ? (
            <Squelette className="mx-auto h-[360px] w-[260px]" />
          ) : (
            <>
              <div className="rounded-xl bg-ocean-50 px-3 py-2 text-center">
                <b className="block text-[14px]">{trajet}</b>
                <span className="text-[12.5px] font-semibold text-encre-douce">
                  {quand} · {voyage.voiture?.matricule} · {pluriel(libres, 'place libre', 'places libres')}
                </span>
              </div>
              <div className="flex justify-center">
                <PlanSieges sieges={sieges} grille={grille} selection={selection} onBasculer={vente ? undefined : basculer} />
              </div>
              <LegendePlan />
            </>
          )}
        </Carte>

        {/* 3. Voyageurs et encaissement, ou vente terminée */}
        <Carte className="flex flex-col gap-4 p-4">
          {vente ? (
            <>
              <div className="flex items-start gap-3 rounded-xl border border-[#BFE3CD] bg-succes-fond p-4 text-succes">
                <CheckCircle2 className="h-7 w-7 flex-none" aria-hidden />
                <span>
                  <b className="block text-[17px]">Vente enregistrée</b>
                  <span className="text-[14px] font-semibold text-encre">
                    {ariary(vente.montant_total)} encaissés · billet n° <b className="tabular-nums">{vente.res_numero}</b>
                  </span>
                </span>
              </div>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {(vente.voyageurs || []).map((v: any) => (
                  <li key={v.siege} className="flex items-center gap-3 rounded-xl border border-separateur px-3 py-2.5">
                    <span className="flex h-9 w-11 items-center justify-center rounded-lg bg-ocean-50 text-[14px] font-extrabold tabular-nums text-ocean-800">{v.siege}</span>
                    <b className="min-w-0 flex-1 truncate text-[14px]">{v.nom}</b>
                    <span className={`text-[12.5px] font-bold ${v.embarque ? 'text-succes' : 'text-encre-douce'}`}>{v.embarque ? 'À bord' : 'Pas encore à bord'}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2">
                <Bouton icone={Printer} onClick={imprimer} className="h-12">
                  Imprimer le ticket
                </Bouton>
                <div className="grid grid-cols-2 gap-2">
                  <Bouton variante="secondaire" icone={Plus} onClick={autreVente}>
                    Nouvelle vente
                  </Bouton>
                  <Bouton
                    variante="secondaire"
                    icone={ArrowLeftRight}
                    onClick={() => {
                      reinitialiserVente();
                      setVoyage(null);
                    }}
                  >
                    Autre départ
                  </Bouton>
                </div>
              </div>
              <p className="m-0 text-[12.5px] font-semibold leading-relaxed text-encre-douce">Sans ticket, le voyageur est embarqué sur présentation de sa pièce d’identité : son nom figure sur la liste du voyage.</p>
            </>
          ) : (
            <>
              <TitreEtape n={3} titre="Voyageurs et encaissement" />
              {selection.length === 0 ? (
                <p className="m-0 rounded-xl border-[1.5px] border-dashed border-champ px-4 py-8 text-center text-[14px] font-semibold text-encre-douce">
                  {voyage ? 'Cliquez sur un ou plusieurs sièges libres.' : 'Choisissez un départ, puis les sièges.'}
                </p>
              ) : (
                <>
                  {erreurs && nomsManquants.length > 0 && (
                    <p role="alert" className="m-0 rounded-xl border border-danger-bord bg-danger-fond px-3 py-2.5 text-[13px] font-bold text-danger">
                      Indiquez le nom du voyageur {nomsManquants.length > 1 ? `des sièges ${nomsManquants.join(', ')}` : `du siège ${nomsManquants[0]}`}.
                    </p>
                  )}
                  <div className="flex flex-col gap-3">
                    {selection.map((code) => {
                      const f = fiches[code] || FICHE_VIDE;
                      return (
                        <fieldset key={code} className="m-0 flex flex-col gap-2.5 rounded-xl border border-separateur bg-[#F8FAFD] p-3">
                          <legend className="px-1 text-[13px] font-extrabold text-ocean-800">Siège {code}</legend>
                          <div className="grid gap-2.5 sm:grid-cols-2">
                            <Champ
                              libelle="Nom *"
                              value={f.nom}
                              ref={(el) => {
                                champsNom.current[code] = el;
                              }}
                              onChange={(e) => majFiche(code, 'nom', e.target.value)}
                              erreur={erreurs && !f.nom.trim() ? 'Obligatoire' : undefined}
                              placeholder="RAKOTO"
                              autoComplete="off"
                            />
                            <Champ libelle="Prénom" value={f.prenom} onChange={(e) => majFiche(code, 'prenom', e.target.value)} placeholder="Jean" autoComplete="off" />
                          </div>
                          <Champ libelle="Téléphone (facultatif)" type="tel" value={f.telephone} onChange={(e) => majFiche(code, 'telephone', e.target.value)} placeholder="034 00 000 00" autoComplete="off" />
                        </fieldset>
                      );
                    })}
                  </div>

                  <label className="flex cursor-pointer items-start gap-2.5 text-[14px] font-bold text-encre">
                    <input type="checkbox" checked={embarquer} onChange={(e) => setEmbarquer(e.target.checked)} className="mt-0.5 h-[18px] w-[18px] accent-ocean-800" />
                    <span>
                      Les voyageurs montent dans la voiture maintenant
                      <span className="block text-[12.5px] font-semibold text-encre-douce">Ils seront marqués « à bord » sans scanner de billet.</span>
                    </span>
                  </label>

                  <div className="flex flex-col gap-3 border-t border-separateur pt-3">
                    <div className="flex items-baseline justify-between tabular-nums">
                      <span className="text-[14px] font-semibold text-encre-douce">
                        {selection.length} × {ariary(tarif)}
                      </span>
                      <b className="text-[24px]">{ariary(total)}</b>
                    </div>
                    <div className="grid grid-cols-2 items-end gap-2.5">
                      <Champ libelle="Montant reçu (Ar)" inputMode="numeric" value={recu} onChange={(e) => setRecu(e.target.value.replace(/[^\d\s]/g, ''))} placeholder={String(total)} />
                      <div className={`flex h-11 items-center justify-between rounded-champ px-3 text-[13px] font-bold ${montantRecu && montantRecu < total ? 'bg-danger-fond text-danger' : 'bg-succes-fond text-succes'}`}>
                        <span>{montantRecu && montantRecu < total ? 'Il manque' : 'À rendre'}</span>
                        <b className="text-[16px] tabular-nums">{ariary(montantRecu ? Math.abs(montantRecu - total) : 0)}</b>
                      </div>
                    </div>
                  </div>

                  <Bouton icone={Banknote} onClick={demanderEncaissement} touche="F9" className="h-12 text-[15px]">
                    Encaisser {ariary(total)}
                  </Bouton>
                </>
              )}
            </>
          )}
        </Carte>
      </div>

      <Dialogue ouvert={confirmer} titre={`Encaisser ${ariary(total)} ?`} confirmer="Encaisser" chargement={envoi} onConfirmer={vendre} onFermer={() => setConfirmer(false)}>
        {pluriel(selection.length, 'place')} (siège{selection.length > 1 ? 's' : ''} {selection.join(', ')}) pour {trajet}, {quand}, payée{selection.length > 1 ? 's' : ''} en espèces.
        <br />
        Le billet sera confirmé immédiatement{embarquer ? ' et les voyageurs marqués à bord' : ''}.
      </Dialogue>
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
      <ImpressionTicket ticket={aImprimer} onTermine={finImpression} />
    </div>
  );
}
