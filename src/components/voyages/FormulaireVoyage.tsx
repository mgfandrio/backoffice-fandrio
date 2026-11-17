import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Info, Timer, X } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Champ, Dialogue, Selecteur, Squelette, Tiroir } from '@/components/ui';
import { CalendrierDates } from './CalendrierDates';
import { ariary, dateISO, jourRelatif, lireDate, pluriel } from '@/utils/format';
import { dateHeureCourte } from '@/utils/voyage';

/**
 * Planifier un ou plusieurs voyages (dates choisies sur un calendrier) ou modifier
 * un voyage. Mêmes règles que le formulaire de l'app mobile.
 */

type Publication = 'maintenant' | 'plus_tard' | 'programmee';
const MAX_DATES = 20;
const HEURE = /^\d{2}:\d{2}$/;
const CATEGORIES: Record<string, string> = { vip: 'VIP', premium: 'Premium' };

const jourCourt = (iso: string) => lireDate(iso)?.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) || iso;
/** Instant local à partir d'une date AAAA-MM-JJ et d'une heure HH:MM. */
const instant = (iso: string, h: string): Date | null => {
  const d = lireDate(iso);
  if (!d || !HEURE.test(h)) return null;
  d.setHours(Number(h.slice(0, 2)), Number(h.slice(3, 5)));
  return d;
};

export function FormulaireVoyage({ ouvert, voyageId, onFermer, onEnregistre }: { ouvert: boolean; voyageId?: number | null; onFermer: () => void; onEnregistre?: () => void }) {
  const queryClient = useQueryClient();
  const edition = !!voyageId;
  const [trajId, setTrajId] = useState('');
  const [voitId, setVoitId] = useState('');
  const [receptionId, setReceptionId] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  const [heure, setHeure] = useState('');
  const [heureParDate, setHeureParDate] = useState(false);
  const [heures, setHeures] = useState<Record<string, string>>({});
  const [type, setType] = useState('1');
  const [places, setPlaces] = useState('');
  const [publication, setPublication] = useState<Publication>('maintenant');
  const [pubDate, setPubDate] = useState('');
  const [pubHeure, setPubHeure] = useState('08:00');
  const [pubParVoyage, setPubParVoyage] = useState(false);
  const [pubs, setPubs] = useState<Record<string, { date: string; heure: string }>>({});
  const [nonPublieExistant, setNonPublieExistant] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ titre: string; texte: string; ok?: boolean } | null>(null);

  const trajets = useQuery({
    queryKey: ['trajets', 'liste'],
    queryFn: async () => {
      const d = (await obtenir('/api/adminCompagnie/trajet/recupererListeTrajet', { per_page: 200 })).data;
      return ((d?.trajets ?? d) || []) as any[];
    },
    enabled: ouvert,
  });
  const voitures = useQuery({
    queryKey: ['voitures', 'liste'],
    queryFn: async () => ((await obtenir('/api/adminCompagnie/voiture/liste')).data || []) as any[],
    enabled: ouvert,
  });
  const existant = useQuery({
    queryKey: ['voyage', 'detail', voyageId],
    queryFn: async () => (await obtenir(`/api/adminCompagnie/voyage/detailVoyage/${voyageId}`)).data,
    enabled: ouvert && edition,
  });

  // Remise à zéro à l'ouverture, puis reprise du voyage modifié
  useEffect(() => {
    if (!ouvert) return;
    setTrajId('');
    setVoitId('');
    setReceptionId('');
    setDates([]);
    setHeure('');
    setHeureParDate(false);
    setHeures({});
    setType('1');
    setPlaces('');
    setPublication('maintenant');
    setPubDate('');
    setPubHeure('08:00');
    setPubParVoyage(false);
    setPubs({});
    setNonPublieExistant(false);
  }, [ouvert, voyageId]);

  useEffect(() => {
    const v = existant.data;
    if (!ouvert || !edition || !v) return;
    setTrajId(String(v.trajet?.id ?? ''));
    setVoitId(String(v.voiture?.id ?? ''));
    setReceptionId(v.reception?.id ? String(v.reception.id) : '');
    setDates(v.date ? [String(v.date).slice(0, 10)] : []);
    setHeure(String(v.heure_depart || '').slice(0, 5));
    setType(Number(v.type) === 2 ? '2' : '1');
    setPlaces(String(v.places_disponibles ?? ''));
    if (v.publie === false) {
      setNonPublieExistant(true);
      const p = v.publication_prevue ? new Date(v.publication_prevue) : null;
      if (p && !isNaN(p.getTime())) {
        setPublication('programmee');
        setPubDate(dateISO(p));
        setPubHeure(`${String(p.getHours()).padStart(2, '0')}:${String(p.getMinutes()).padStart(2, '0')}`);
      } else setPublication('plus_tard');
    }
  }, [existant.data, ouvert, edition]);

  const trajet = (trajets.data || []).find((t) => String(t.id_trajet) === trajId);
  const categorie = trajet?.categorie || 'classique';
  const compatibles = (voitures.data || []).filter((v) => Number(v.voit_statut) === 1 && (!trajet || (v.voit_categorie || 'classique') === categorie));
  const voiture = (voitures.data || []).find((v) => String(v.voit_id) === voitId);
  const capacite = Number(voiture?.voit_places) || 0;
  const provinceArrivee = Number(trajet?.province_arrivee?.id_province) || 0;
  const nomArrivee = trajet?.province_arrivee?.nom_province || 'la destination';

  const receptions = useQuery({
    queryKey: ['partenaires', 'destination', provinceArrivee],
    queryFn: async () => ((await obtenir(`/api/adminCompagnie/partenaires/destination/${provinceArrivee}`)).data || []) as any[],
    enabled: ouvert && !!provinceArrivee,
  });
  // Garde le choix s'il convient encore ; une seule possibilité est choisie d'office (création)
  useEffect(() => {
    const liste = receptions.data;
    if (!liste) return;
    setReceptionId((actuel) => (liste.some((c) => String(c.id) === actuel) ? actuel : !edition && liste.length === 1 ? String(liste[0].id) : ''));
  }, [receptions.data, edition]);

  const plusieurs = dates.length > 1;
  const nbPlaces = parseInt(places, 10) || 0;
  const reglerPublication = !edition || nonPublieExistant;
  const heuresDistinctes = plusieurs && heureParDate;
  const publicationsDistinctes = plusieurs && pubParVoyage && publication === 'programmee';
  const heureDe = (iso: string) => (heuresDistinctes ? heures[iso] || heure : heure);

  const choisirTrajet = (id: string) => {
    const t = (trajets.data || []).find((x) => String(x.id_trajet) === id);
    if (voiture && (voiture.voit_categorie || 'classique') !== (t?.categorie || 'classique')) setVoitId('');
    setTrajId(id);
  };
  const choisirVoiture = (id: string) => {
    setVoitId(id);
    const cap = Number((voitures.data || []).find((x) => String(x.voit_id) === id)?.voit_places) || 0;
    if (cap && (!places || parseInt(places, 10) > cap)) setPlaces(String(cap));
  };
  const remplirPublications = (joursAvant: number) =>
    setPubs(
      Object.fromEntries(
        dates.map((iso) => {
          const d = lireDate(iso)!;
          d.setDate(d.getDate() - joursAvant);
          const auj = new Date();
          auj.setHours(0, 0, 0, 0);
          return [iso, { date: dateISO(d < auj ? auj : d), heure: '08:00' }];
        })
      )
    );

  const recette = useMemo(() => nbPlaces * (Number(trajet?.tarif) || 0) * Math.max(dates.length, 1), [nbPlaces, trajet, dates.length]);

  const valider = (): string | null => {
    if (!trajId) return 'Choisissez le trajet.';
    if (!voitId) return 'Choisissez le véhicule.';
    if (!dates.length) return edition ? 'Choisissez la date du voyage sur le calendrier.' : 'Choisissez au moins une date sur le calendrier.';
    const sansHeure = dates.find((iso) => !HEURE.test(heureDe(iso)));
    if (sansHeure) return heuresDistinctes ? `Indiquez l'heure de départ du ${jourCourt(sansHeure)}.` : "Indiquez l'heure de départ.";
    if (nbPlaces < 1) return 'Indiquez le nombre de places mises en vente.';
    if (capacite && nbPlaces > capacite) return `Ce véhicule n'a que ${capacite} places.`;
    const maintenant = Date.now();
    for (const iso of dates) if (instant(iso, heureDe(iso))!.getTime() <= maintenant) return `Le départ du ${jourCourt(iso)} est déjà passé.`;
    if (reglerPublication && publication === 'programmee') {
      if (publicationsDistinctes) {
        for (const iso of dates) {
          const p = instant(pubs[iso]?.date || '', pubs[iso]?.heure || '');
          if (!p) return `Indiquez la date et l'heure de publication du voyage du ${jourCourt(iso)}.`;
          if (p.getTime() <= maintenant) return `La publication du voyage du ${jourCourt(iso)} doit être dans le futur.`;
          if (p.getTime() >= instant(iso, heureDe(iso))!.getTime()) return `Le voyage du ${jourCourt(iso)} doit être publié avant son départ.`;
        }
      } else {
        const p = instant(pubDate, pubHeure);
        if (!p) return "Indiquez la date et l'heure de publication.";
        if (p.getTime() <= maintenant) return 'La date de publication doit être dans le futur.';
        const premier = [...dates].sort()[0];
        if (p.getTime() >= instant(premier, heureDe(premier))!.getTime()) return `La publication doit avoir lieu avant le départ du ${jourCourt(premier)}.`;
      }
    }
    return null;
  };

  const enregistrer = async () => {
    const erreur = valider();
    if (erreur) return setMessage({ titre: 'Il manque une information', texte: erreur });
    const base = { traj_id: Number(trajId), voit_id: Number(voitId), voyage_type: Number(type), places_disponibles: nbPlaces, comp_reception: receptionId ? Number(receptionId) : null };
    const pub = instant(pubDate, pubHeure);
    const champsPublication = reglerPublication && !publicationsDistinctes ? { publication, ...(publication === 'programmee' && pub ? { publication_date: pub.toISOString() } : {}) } : {};
    setEnvoi(true);
    try {
      let texte: string;
      if (plusieurs) {
        const r = await api.post('/api/adminCompagnie/voyage/programmerVoyagesMultiples', {
          voyages: dates.map((d) => ({
            ...base,
            voyage_date: d,
            voyage_heure_depart: heureDe(d),
            ...(publicationsDistinctes ? { publication: 'programmee', publication_date: instant(pubs[d].date, pubs[d].heure)!.toISOString() } : {}),
          })),
          ...champsPublication,
        });
        const erreurs: string[] = r.data?.data?.erreurs || [];
        texte = (r.data?.message || `${dates.length} voyages enregistrés.`) + (erreurs.length ? `\n${erreurs.join('\n')}` : '');
      } else {
        const data = { ...base, voyage_date: dates[0], voyage_heure_depart: heure, ...champsPublication };
        const r = edition ? await api.put(`/api/adminCompagnie/voyage/updateVoyage/${voyageId}`, data) : await api.post('/api/adminCompagnie/voyage/programmerVoyage', data);
        texte =
          publication === 'plus_tard' && reglerPublication
            ? 'Ce voyage est planifié mais pas encore publié : les clients ne le voient pas. Publiez-le au moment voulu.'
            : publication === 'programmee' && reglerPublication && pub
              ? `Ce voyage sera publié automatiquement le ${dateHeureCourte(pub)}.`
              : r.data?.message || (edition ? 'Les modifications sont enregistrées.' : 'Le voyage est ouvert aux réservations.');
      }
      queryClient.invalidateQueries({ queryKey: ['voyages'] });
      queryClient.invalidateQueries({ queryKey: ['planning'] });
      queryClient.invalidateQueries({ queryKey: ['voyage'] });
      setMessage({ titre: edition ? 'Voyage modifié' : plusieurs ? 'Voyages enregistrés' : 'Voyage enregistré', texte, ok: true });
    } catch (e) {
      setMessage({ titre: edition ? 'Modification impossible' : 'Planification impossible', texte: messageErreur(e) });
    } finally {
      setEnvoi(false);
    }
  };

  const titreBouton =
    edition && !nonPublieExistant
      ? 'Enregistrer les modifications'
      : publication === 'plus_tard'
        ? plusieurs
          ? `Planifier ${dates.length} voyages`
          : 'Planifier le voyage'
        : publication === 'programmee'
          ? plusieurs
            ? `Programmer ${dates.length} publications`
            : 'Programmer la publication'
          : plusieurs
            ? `Publier ${dates.length} voyages`
            : 'Publier le voyage';

  const chargement = trajets.isLoading || voitures.isLoading || (edition && existant.isLoading);

  return (
    <Tiroir
      ouvert={ouvert}
      titre={edition ? 'Modifier le voyage' : 'Planifier des voyages'}
      sousTitre={edition ? undefined : 'Un ou plusieurs départs, publiés tout de suite ou plus tard'}
      onFermer={onFermer}
      pied={
        <>
          <Bouton onClick={enregistrer} chargement={envoi} disabled={chargement} className="flex-1">
            {titreBouton}
          </Bouton>
          <Bouton variante="secondaire" onClick={onFermer}>
            Annuler
          </Bouton>
        </>
      }
    >
      {chargement ? (
        <div className="flex flex-col gap-3">{[0, 1, 2, 3].map((i) => <Squelette key={i} className="h-14" />)}</div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Trajet, véhicule, réception */}
          <section className="flex flex-col gap-3">
            <Selecteur libelle="Trajet" value={trajId} onChange={(e) => choisirTrajet(e.target.value)}>
              <option value="">Choisir un trajet</option>
              {(trajets.data || [])
                .filter((t) => Number(t.statut) === 1 || String(t.id_trajet) === trajId)
                .map((t) => (
                  <option key={t.id_trajet} value={t.id_trajet}>
                    {t.nom_trajet} · {ariary(t.tarif)}
                    {t.duree_formatee ? ` · ${t.duree_formatee}` : ''}
                    {CATEGORIES[t.categorie] ? ` · ${CATEGORIES[t.categorie]}` : ''}
                  </option>
                ))}
            </Selecteur>
            <Selecteur
              libelle="Véhicule"
              value={voitId}
              onChange={(e) => choisirVoiture(e.target.value)}
              disabled={!trajId}
              aide={!trajId ? 'Choisissez d’abord le trajet.' : compatibles.length === 0 ? `Aucun véhicule ${CATEGORIES[categorie] || 'classique'} actif.` : 'Seuls les véhicules de la même catégorie que le trajet sont proposés.'}
            >
              <option value="">Choisir un véhicule</option>
              {compatibles.map((v) => (
                <option key={v.voit_id} value={v.voit_id}>
                  {v.voit_matricule} · {[v.voit_marque, v.voit_modele].filter(Boolean).join(' ')} · {v.voit_places} places · {v.chauffeur ? `Chauffeur : ${v.chauffeur.chauff_prenom} ${v.chauffeur.chauff_nom}` : 'sans chauffeur'}
                </option>
              ))}
            </Selecteur>
            {trajId &&
              (receptions.isLoading ? (
                <Squelette className="h-14" />
              ) : (receptions.data || []).length === 0 ? (
                <div className="flex gap-2.5 rounded-xl bg-ocean-50 p-3">
                  <Info className="mt-0.5 h-[18px] w-[18px] flex-none text-ocean-800" aria-hidden />
                  <p className="m-0 text-[13px] font-semibold leading-relaxed text-encre-douce">
                    <b className="text-encre">Compagnie de réception : aucune.</b> Aucune de vos compagnies partenaires n’est à {nomArrivee}. Vous suivrez ce voyage vous-même et confirmerez son arrivée.
                  </p>
                </div>
              ) : (
                <Selecteur libelle="Compagnie de réception" value={receptionId} onChange={(e) => setReceptionId(e.target.value)} aide="Elle reçoit la liste des voyageurs au départ de la voiture et confirme l’arrivée.">
                  <option value="">Aucune (vous suivez le voyage vous-même)</option>
                  {(receptions.data || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom} · {c.province?.nom || nomArrivee}
                    </option>
                  ))}
                </Selecteur>
              ))}
          </section>

          {/* Dates */}
          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-[12.5px] font-bold text-encre-douce">{edition ? 'Date du voyage' : 'Dates des voyages (cliquez les jours voulus)'}</span>
              {!edition && (
                <b className="text-[12.5px] tabular-nums text-ocean-800">
                  {dates.length} / {MAX_DATES}
                </b>
              )}
            </div>
            <CalendrierDates selection={dates} onChange={setDates} multiple={!edition} max={MAX_DATES} />
            {dates.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {dates.map((iso) => (
                  <span key={iso} className="inline-flex h-8 items-center gap-1 rounded-full bg-ocean-50 pl-3 pr-1.5 text-[13px] font-bold text-ocean-950">
                    {jourCourt(iso)}
                    {!edition && (
                      <button type="button" onClick={() => setDates((p) => p.filter((x) => x !== iso))} aria-label={`Retirer le ${jourCourt(iso)}`} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-ocean-100">
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
            {plusieurs && <span className="text-[12.5px] font-semibold text-encre-douce">Même trajet, même véhicule et mêmes places pour chaque date.</span>}
          </section>

          {/* Heure, type, places */}
          <section className="flex flex-col gap-3">
            {plusieurs && (
              <Selecteur
                libelle="Heure de départ"
                value={heureParDate ? 'par_date' : 'meme'}
                onChange={(e) => {
                  const parDate = e.target.value === 'par_date';
                  if (parDate) setHeures((h) => Object.fromEntries(dates.map((d) => [d, h[d] || heure])));
                  setHeureParDate(parDate);
                }}
              >
                <option value="meme">La même heure pour toutes les dates</option>
                <option value="par_date">Une heure différente selon la date</option>
              </Selecteur>
            )}
            {heuresDistinctes ? (
              <div className="overflow-hidden rounded-xl border border-ligne bg-white">
                {dates.map((iso, i) => (
                  <label key={iso} className={`flex items-center gap-3 px-3 py-2 ${i ? 'border-t border-separateur' : ''}`}>
                    <span className="flex-1 text-[14px] font-bold">{jourCourt(iso)}</span>
                    <input
                      type="time"
                      value={heures[iso] || ''}
                      onChange={(e) => setHeures((h) => ({ ...h, [iso]: e.target.value }))}
                      aria-label={`Heure de départ du ${jourCourt(iso)}`}
                      className="h-10 rounded-lg border-[1.5px] border-champ px-2 text-[14px] font-bold tabular-nums outline-none focus:border-ocean-800"
                    />
                  </label>
                ))}
              </div>
            ) : (
              <Champ libelle={plusieurs ? 'Heure de départ de chaque voyage' : 'Heure de départ'} type="time" value={heure} onChange={(e) => setHeure(e.target.value)} />
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Selecteur libelle="Type de voyage" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="1">Jour</option>
                <option value="2">Nuit</option>
              </Selecteur>
              <Champ
                libelle={`Places mises en vente${capacite ? ` (sur ${capacite})` : ''}`}
                inputMode="numeric"
                value={places}
                onChange={(e) => setPlaces(e.target.value.replace(/\D/g, '').slice(0, 3))}
                erreur={capacite && nbPlaces > capacite ? `Ce véhicule n'a que ${capacite} places.` : undefined}
                aide="Réduisez si des places sont gardées pour le guichet."
              />
            </div>
            {recette > 0 && (
              <p className="m-0 text-[13px] font-semibold text-encre-douce">
                Recette maximale : <b className="text-encre">{ariary(recette)}</b>
                {plusieurs ? ` pour ${pluriel(dates.length, 'voyage')}` : ''}
              </p>
            )}
          </section>

          {/* Publication */}
          {reglerPublication && (
            <section className="flex flex-col gap-3">
              <Selecteur libelle="Publication" value={publication} onChange={(e) => setPublication(e.target.value as Publication)}>
                <option value="maintenant">Publier maintenant : les clients peuvent réserver tout de suite</option>
                <option value="plus_tard">Plus tard : planifié sans être publié</option>
                <option value="programmee">Programmée : publié automatiquement à une date choisie</option>
              </Selecteur>
              {publication === 'programmee' && plusieurs && (
                <Selecteur libelle="Date de publication" value={pubParVoyage ? 'par_voyage' : 'une_fois'} onChange={(e) => setPubParVoyage(e.target.value === 'par_voyage')}>
                  <option value="une_fois">Tous les voyages publiés en une fois</option>
                  <option value="par_voyage">Une date de publication par voyage</option>
                </Selecteur>
              )}
              {publication === 'programmee' && !publicationsDistinctes && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Champ libelle="Publier le" type="date" min={dateISO()} value={pubDate} onChange={(e) => setPubDate(e.target.value)} />
                  <Champ libelle="À" type="time" value={pubHeure} onChange={(e) => setPubHeure(e.target.value)} />
                </div>
              )}
              {publicationsDistinctes && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-encre-douce">
                    Remplir d’un coup :
                    {[3, 7, 14].map((n) => (
                      <Bouton key={n} variante="secondaire" compact onClick={() => remplirPublications(n)}>
                        {n} jours avant le départ
                      </Bouton>
                    ))}
                  </div>
                  <div className="overflow-hidden rounded-xl border border-ligne bg-white">
                    {dates.map((iso, i) => {
                      const p = pubs[iso] || { date: '', heure: '' };
                      return (
                        <div key={iso} className={`flex flex-wrap items-center gap-2 px-3 py-2.5 ${i ? 'border-t border-separateur' : ''}`}>
                          <span className="min-w-[150px] flex-1 text-[14px] font-bold">
                            Voyage du {jourCourt(iso)}
                            {heureDe(iso) ? ` · ${heureDe(iso)}` : ''}
                          </span>
                          <input
                            type="date"
                            min={dateISO()}
                            value={p.date}
                            onChange={(e) => setPubs((x) => ({ ...x, [iso]: { ...p, date: e.target.value } }))}
                            aria-label={`Date de publication du voyage du ${jourCourt(iso)}`}
                            className="h-10 rounded-lg border-[1.5px] border-champ px-2 text-[13.5px] font-bold outline-none focus:border-ocean-800"
                          />
                          <input
                            type="time"
                            value={p.heure}
                            onChange={(e) => setPubs((x) => ({ ...x, [iso]: { ...p, heure: e.target.value } }))}
                            aria-label={`Heure de publication du voyage du ${jourCourt(iso)}`}
                            className="h-10 rounded-lg border-[1.5px] border-champ px-2 text-[13.5px] font-bold outline-none focus:border-ocean-800"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex gap-2.5 rounded-xl bg-ocean-50 p-3 text-ocean-800">
                {publication === 'maintenant' ? <Eye className="mt-0.5 h-[18px] w-[18px] flex-none" aria-hidden /> : publication === 'plus_tard' ? <EyeOff className="mt-0.5 h-[18px] w-[18px] flex-none" aria-hidden /> : <Timer className="mt-0.5 h-[18px] w-[18px] flex-none" aria-hidden />}
                <p className="m-0 text-[13px] font-semibold leading-relaxed">
                  {publication === 'maintenant'
                    ? `Les clients ${plusieurs ? 'voient ces voyages' : 'voient ce voyage'} et peuvent réserver dès l’enregistrement.`
                    : publication === 'plus_tard'
                      ? `${plusieurs ? 'Ces voyages sont planifiés sans être publiés : ils servent' : 'Ce voyage est planifié sans être publié : il sert'} de prévision, les clients ne ${plusieurs ? 'les' : 'le'} voient pas. Vous pourrez changer la date, l’heure ou le véhicule, puis publier au moment voulu.`
                      : publicationsDistinctes
                        ? 'Chaque voyage reste invisible pour les clients jusqu’à sa propre date de publication, puis est publié automatiquement.'
                        : `${plusieurs ? 'Ces voyages restent invisibles' : 'Ce voyage reste invisible'} pour les clients jusqu’à la date choisie, puis ${plusieurs ? 'sont publiés tous ensemble' : 'est publié'} automatiquement.`}
                </p>
              </div>
            </section>
          )}
          {edition && !nonPublieExistant && <p className="m-0 text-[13px] font-semibold text-encre-douce">Ce voyage est déjà publié : les clients le voient{dates[0] ? ` (départ ${jourRelatif(dates[0]).toLowerCase()})` : ''}.</p>}
        </div>
      )}

      <Dialogue
        ouvert={!!message}
        titre={message?.titre || ''}
        onFermer={() => {
          const ok = message?.ok;
          setMessage(null);
          if (ok) {
            onEnregistre?.();
            onFermer();
          }
        }}
      >
        <span className="whitespace-pre-line">{message?.texte}</span>
      </Dialogue>
    </Tiroir>
  );
}
