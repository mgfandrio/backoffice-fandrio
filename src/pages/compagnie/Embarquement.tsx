import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Camera, CheckCheck, CheckCircle2, CircleX, Navigation, ScanLine, Users } from 'lucide-react';
import { api, ErreurApi, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Carte, Dialogue, Erreur, Pastille, Squelette, Vide } from '@/components/ui';
import { LecteurCamera } from '@/components/embarquement/LecteurCamera';
import { dateISO, heure, pluriel } from '@/utils/format';
import { sons } from '@/utils/son';

/**
 * Embarquement (maquette « Web · Compagnie · Embarquement ») : la douchette lit le
 * QR du billet dans le champ toujours actif ; le résultat s'affiche en grand avec un
 * signal sonore. Billet d'un seul voyageur : à bord tout de suite. Plusieurs
 * voyageurs : on décoche les absents, Entrée confirme.
 */

type Ton = 'ok' | 'confirmer' | 'attention' | 'refus';
interface Resultat {
  ton: Ton;
  titre: string;
  detail: string;
  billet?: any; // réponse de l'API (reservation, voyage, voyageurs)
  autreVoyageId?: number;
}
interface Lecture {
  heure: string;
  nom: string;
  libelle: string;
  ton: Ton;
}

const STYLES: Record<Ton, { bloc: string; puce: string; icone: typeof CheckCircle2 }> = {
  ok: { bloc: 'border-succes-vif bg-succes-fond', puce: 'bg-succes-vif', icone: CheckCircle2 },
  confirmer: { bloc: 'border-ocean-800 bg-ocean-50', puce: 'bg-ocean-800', icone: Users },
  attention: { bloc: 'border-alerte-vif bg-alerte-fond', puce: 'bg-alerte-vif', icone: AlertTriangle },
  refus: { bloc: 'border-danger bg-danger-fond', puce: 'bg-danger', icone: CircleX },
};
const TEXTE: Record<Ton, string> = { ok: 'text-succes', confirmer: 'text-ocean-800', attention: 'text-alerte', refus: 'text-danger' };

/** QR collé par la douchette (JSON ou base64) ou numéro de billet tapé à la main. */
function corpsLecture(texte: string): Record<string, string> {
  const t = texte.trim();
  const qr = t.startsWith('{') || (t.length > 40 && /^[A-Za-z0-9+/=\s]+$/.test(t));
  return qr ? { qr_data: t } : { numero: t };
}

function nomVoyageur(v: any) {
  return `${v.prenom || ''} ${v.nom || ''}`.trim();
}

export default function Embarquement() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const champ = useRef<HTMLInputElement>(null);
  const [saisie, setSaisie] = useState('');
  const [focus, setFocus] = useState(true);
  const [verification, setVerification] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [presents, setPresents] = useState<number[]>([]);
  const [historique, setHistorique] = useState<Lecture[]>([]);
  const [camera, setCamera] = useState(false);
  const [filtre, setFiltre] = useState<'tous' | 'a_bord' | 'attente'>('attente');
  const [aBordManuel, setABordManuel] = useState<any>(null);
  const [cloture, setCloture] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);

  // Départs du jour (hors annulés)
  const departs = useQuery({
    queryKey: ['embarquement', 'departs', dateISO()],
    queryFn: async () =>
      ((await obtenir('/api/adminCompagnie/voyage/recupererListeVoyage', { date_debut: dateISO(), date_fin: dateISO(), per_page: 100, sort_field: 'voyage_heure_depart' })).data?.voyages || [])
        .filter((v: any) => Number(v.statut) !== 4)
        .sort((a: any, b: any) => String(a.heure_depart).localeCompare(String(b.heure_depart))) as any[],
    refetchInterval: 60_000,
  });

  // Départ suivi : celui de l'adresse, sinon le plus proche de l'heure actuelle
  const voyageId = useMemo(() => {
    const demande = Number(params.get('voyage'));
    const liste = departs.data || [];
    if (demande && liste.some((v) => v.id === demande)) return demande;
    const maintenant = new Date();
    const minutes = maintenant.getHours() * 60 + maintenant.getMinutes();
    const prochain = liste.find((v) => {
      const [h, m] = String(v.heure_depart).split(':').map(Number);
      return h * 60 + m >= minutes - 120 && v.suivi == null;
    });
    return (prochain || liste[liste.length - 1])?.id as number | undefined;
  }, [params, departs.data]);
  const voyage = (departs.data || []).find((v) => v.id === voyageId);
  const choisirVoyage = (id: number) => {
    setParams({ voyage: String(id) }, { replace: true });
    setResultat(null);
    window.setTimeout(() => champ.current?.focus(), 30);
  };

  const liste = useQuery({
    queryKey: ['embarquement', 'voyageurs', voyageId],
    queryFn: async () => ((await obtenir(`/api/adminCompagnie/reservations/voyages/${voyageId}/voyageurs`)).data?.voyageurs || []) as any[],
    enabled: !!voyageId,
    refetchInterval: 20_000,
  });
  const suivi = useQuery({
    queryKey: ['embarquement', 'suivi', voyageId],
    queryFn: async () => (await obtenir(`/api/adminCompagnie/suivi/${voyageId}`)).data,
    enabled: !!voyageId,
    refetchInterval: 30_000,
  });

  const voyageurs = liste.data || [];
  const aBord = voyageurs.filter((v) => v.embarque).length;
  const affiches = useMemo(
    () =>
      [...voyageurs]
        .filter((v) => (filtre === 'a_bord' ? v.embarque : filtre === 'attente' ? !v.embarque : true))
        .sort((a, b) => Number(a.siege) - Number(b.siege)),
    [voyageurs, filtre]
  );

  const actualiser = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['embarquement'] });
    queryClient.invalidateQueries({ queryKey: ['suivi'] });
  }, [queryClient]);

  // Le champ de lecture garde le curseur
  useEffect(() => {
    if (!camera && !aBordManuel && !cloture && !message) champ.current?.focus();
  }, [camera, aBordManuel, cloture, message, voyageId, resultat]);

  const noter = (nom: string, libelle: string, ton: Ton) =>
    setHistorique((h) => [{ heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), nom, libelle, ton }, ...h].slice(0, 12));

  const embarquer = async (billet: any, ids: number[]) => {
    const resId = billet?.reservation?.res_id;
    if (!resId || ids.length === 0) return;
    setEnvoi(true);
    try {
      const r = await api.post(`/api/adminCompagnie/reservations/${resId}/embarquer`, { voyageurs: ids });
      const noms = (billet.voyageurs || []).filter((v: any) => ids.includes(Number(v.id))).map((v: any) => `${v.nom} (siège ${v.siege})`);
      const restants = Number(r.data?.data?.restants) || 0;
      sons.ok();
      setResultat({
        ton: 'ok',
        titre: ids.length > 1 ? `${ids.length} voyageurs à bord` : 'À bord',
        detail: noms.join(', ') + (restants ? ` · ${pluriel(restants, 'voyageur')} de ce billet pas encore à bord : rescannez le billet à son arrivée.` : ''),
        billet,
      });
      noter(noms.join(', '), 'À bord', 'ok');
      actualiser();
    } catch (e) {
      sons.refus();
      setResultat({ ton: 'refus', titre: 'Embarquement impossible', detail: messageErreur(e) });
    } finally {
      setEnvoi(false);
    }
  };

  const lire = async (texte: string) => {
    const t = texte.trim();
    if (!t || verification || !voyageId) return;
    setVerification(true);
    setResultat(null);
    try {
      const r = await api.post('/api/adminCompagnie/reservations/scanner-qr', corpsLecture(t));
      const reponse = r.data;
      const billet = reponse?.data;
      const titulaire = (billet?.voyageurs || []).map((v: any) => v.nom).join(', ') || billet?.reservation?.res_numero || 'Billet';
      if (reponse?.validation === 'futur' || reponse?.validation === 'passe') {
        sons.attention();
        setResultat({ ton: 'attention', titre: reponse.validation === 'futur' ? 'Billet pour un autre jour' : 'Voyage déjà passé', detail: `${titulaire} · ${billet?.voyage?.trajet} · ${billet?.voyage?.date} à ${heure(billet?.voyage?.heure)}` });
        noter(titulaire, reponse.validation === 'futur' ? 'Autre jour' : 'Voyage passé', 'attention');
        return;
      }
      if (billet?.voyage?.voyage_id !== voyageId) {
        sons.attention();
        const autre = (departs.data || []).some((v) => v.id === billet?.voyage?.voyage_id);
        setResultat({
          ton: 'attention',
          titre: 'Billet d’un autre départ',
          detail: `${titulaire} · billet pour ${billet?.voyage?.trajet} à ${heure(billet?.voyage?.heure)}, pas pour ce départ.`,
          autreVoyageId: autre ? billet?.voyage?.voyage_id : undefined,
        });
        noter(titulaire, 'Autre départ', 'attention');
        return;
      }
      const restants = (billet?.voyageurs || []).filter((v: any) => !v.embarque);
      if (restants.length === 0) {
        sons.attention();
        setResultat({ ton: 'attention', titre: 'Billet déjà utilisé', detail: `${titulaire} : tous les voyageurs de ce billet sont déjà à bord.` });
        noter(titulaire, 'Déjà à bord', 'attention');
        return;
      }
      if (restants.length === 1) {
        await embarquer(billet, [Number(restants[0].id)]);
        return;
      }
      // Plusieurs voyageurs : tous cochés, l'agent décoche les absents
      sons.ok();
      setPresents(restants.map((v: any) => Number(v.id)));
      setResultat({ ton: 'confirmer', titre: `Billet valide · ${restants.length} voyageurs`, detail: 'Décochez les absents, puis appuyez sur Entrée ou sur « Mettre à bord ».', billet });
    } catch (e) {
      sons.refus();
      const m = e instanceof ErreurApi ? e.message : messageErreur(e);
      setResultat({ ton: 'refus', titre: 'Billet refusé', detail: m });
      noter(t.length > 24 ? 'QR code' : t, 'Refusé', 'refus');
    } finally {
      setVerification(false);
    }
  };

  const valider = (e: FormEvent) => {
    e.preventDefault();
    // Entrée sans saisie : confirme le billet à plusieurs voyageurs en attente
    if (!saisie.trim() && resultat?.ton === 'confirmer') {
      embarquer(resultat.billet, presents);
      return;
    }
    const t = saisie;
    setSaisie('');
    lire(t);
  };

  const lireCamera = useCallback(
    (texte: string) => {
      setCamera(false);
      lire(texte);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [voyageId, departs.data, verification]
  );

  const marquerABord = async () => {
    const v = aBordManuel;
    if (!v) return;
    setEnvoi(true);
    try {
      await api.post(`/api/adminCompagnie/reservations/${v.reservation_id}/embarquer`, { voyageurs: [v.voyageur_id] });
      noter(`${nomVoyageur(v)} (siège ${v.siege})`, 'À bord (sans scan)', 'ok');
      setABordManuel(null);
      actualiser();
    } catch (e) {
      setABordManuel(null);
      setMessage({ titre: 'Embarquement impossible', texte: messageErreur(e) });
    } finally {
      setEnvoi(false);
    }
  };

  const cloturer = async () => {
    setEnvoi(true);
    try {
      await api.post(`/api/adminCompagnie/suivi/${voyageId}/cloturer`);
      setCloture(false);
      const reception = suivi.data?.compagnie_reception?.nom;
      setMessage({ titre: 'Voiture en route', texte: reception ? `${reception} a été prévenue et a reçu la liste des voyageurs.` : 'Le voyage est maintenant « En route ». Vous confirmerez son arrivée dans le suivi des voyages.' });
      actualiser();
    } catch (e) {
      setCloture(false);
      setMessage({ titre: 'Embarquement non clôturé', texte: messageErreur(e) });
    } finally {
      setEnvoi(false);
    }
  };

  const s = suivi.data;
  const parti = s?.statut_suivi === 'en_route' || s?.statut_suivi === 'arrive';
  const absents = Math.max(0, (s?.confirmes ?? voyageurs.length) - (s?.embarques ?? aBord));
  const style = resultat ? STYLES[resultat.ton] : null;

  return (
    <div className="flex flex-col gap-4 p-4 sm:px-7 sm:py-6">
      {/* Départ suivi + clôture */}
      <Carte className="flex flex-wrap items-center gap-3 p-4">
        <label className="flex min-w-[260px] flex-1 flex-col gap-1">
          <span className="text-[12.5px] font-bold text-encre-douce">Départ en cours d’embarquement</span>
          <select
            value={voyageId ?? ''}
            onChange={(e) => choisirVoyage(Number(e.target.value))}
            disabled={!departs.data?.length}
            className="h-12 rounded-champ border-[1.5px] border-champ bg-white px-3 text-[15px] font-bold text-encre outline-none focus:border-ocean-800 focus:ring-4 focus:ring-ocean-50"
          >
            {!departs.data?.length && <option value="">Aucun départ aujourd’hui</option>}
            {(departs.data || []).map((v) => (
              <option key={v.id} value={v.id}>
                {heure(v.heure_depart)} · {v.trajet?.province_depart} → {v.trajet?.province_arrivee} · {v.voiture?.matricule}
                {v.suivi === 'en_route' ? ' · parti' : v.suivi === 'arrive' ? ' · arrivé' : ''}
              </option>
            ))}
          </select>
        </label>
        {voyage && (
          <span className="text-[13px] font-semibold text-encre-douce">
            Chauffeur : <b className="text-encre">{voyage.voiture?.chauffeur ? `${voyage.voiture.chauffeur.prenom} ${voyage.voiture.chauffeur.nom}` : 'non affecté'}</b>
            {s?.compagnie_reception && (
              <>
                {' '}
                · Réception : <b className="text-encre">{s.compagnie_reception.nom}</b>
              </>
            )}
          </span>
        )}
        {parti ? (
          <Pastille libelle={s?.statut_suivi === 'arrive' ? 'Voiture arrivée' : 'Voiture en route'} tonalite={s?.statut_suivi === 'arrive' ? 'succes' : 'marine'} />
        ) : (
          <Bouton
            icone={CheckCheck}
            onClick={() => setCloture(true)}
            disabled={!s?.peut_cloturer}
            title={s && !s.peut_cloturer ? 'Possible à partir de 3 h avant l’heure de départ' : undefined}
            className="h-12"
          >
            Clôturer l’embarquement
          </Bouton>
        )}
      </Carte>

      {departs.isLoading ? (
        <Squelette className="h-64" />
      ) : !voyageId ? (
        <Carte>
          <Vide icone={Navigation} titre="Aucun départ aujourd’hui">
            Les départs du jour apparaissent ici pour l’embarquement.
          </Vide>
        </Carte>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          {/* Lecture */}
          <div className="flex min-w-0 flex-col gap-3">
            <form onSubmit={valider}>
              <label className={`flex flex-col gap-2 rounded-carte border-2 bg-white p-4 transition ${focus ? 'border-ocean-800 ring-4 ring-ocean-50' : 'border-champ'}`}>
                <span className={`flex items-center gap-2 text-[13.5px] font-extrabold ${focus ? 'text-ocean-800' : 'text-alerte'}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${focus ? 'bg-succes-vif' : 'bg-alerte-vif'}`} aria-hidden />
                  {verification ? 'Vérification du billet…' : focus ? 'Prêt à lire : scannez un billet' : 'Cliquez ici pour lire un billet'}
                </span>
                <span className="flex items-center gap-3">
                  <ScanLine className="h-8 w-8 flex-none text-ocean-950" aria-hidden />
                  <input
                    ref={champ}
                    value={saisie}
                    onChange={(e) => setSaisie(e.target.value)}
                    onFocus={() => setFocus(true)}
                    onBlur={() => setFocus(false)}
                    placeholder="QR du billet (douchette) ou numéro du billet, puis Entrée"
                    aria-label="Lecture du billet"
                    autoComplete="off"
                    spellCheck={false}
                    className="h-12 min-w-0 flex-1 border-0 bg-transparent text-[18px] font-bold text-encre outline-none placeholder:text-[15px] placeholder:font-semibold placeholder:text-gris-clair"
                  />
                  <Bouton type="submit" compact disabled={!saisie.trim() || verification}>
                    Vérifier
                  </Bouton>
                </span>
              </label>
            </form>

            {/* Résultat */}
            {resultat && style && (
              <div role="status" aria-live="assertive" className={`flex flex-col gap-3 rounded-[18px] border-2 p-5 ${style.bloc}`}>
                <div className="flex items-start gap-4">
                  <span className={`flex h-14 w-14 flex-none items-center justify-center rounded-2xl text-white ${style.puce}`}>
                    <style.icone className="h-8 w-8" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className={`block text-[22px] leading-tight ${TEXTE[resultat.ton]}`}>{resultat.titre}</b>
                    <span className="mt-1 block text-[15px] font-semibold text-encre">{resultat.detail}</span>
                  </span>
                </div>
                {resultat.ton === 'confirmer' && (
                  <>
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                      {(resultat.billet?.voyageurs || [])
                        .filter((v: any) => !v.embarque)
                        .map((v: any) => (
                          <li key={v.id}>
                            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-[15px] font-bold">
                              <input
                                type="checkbox"
                                checked={presents.includes(Number(v.id))}
                                onChange={() => setPresents((p) => (p.includes(Number(v.id)) ? p.filter((x) => x !== Number(v.id)) : [...p, Number(v.id)]))}
                                className="h-5 w-5 accent-ocean-800"
                              />
                              <span className="flex-1">{v.nom}</span>
                              <span className="tabular-nums text-encre-douce">Siège {v.siege}</span>
                            </label>
                          </li>
                        ))}
                    </ul>
                    <Bouton variante="succes" icone={CheckCheck} onClick={() => embarquer(resultat.billet, presents)} disabled={presents.length === 0} chargement={envoi} touche="Entrée" className="h-12">
                      Mettre à bord ({presents.length})
                    </Bouton>
                  </>
                )}
                {resultat.autreVoyageId && (
                  <Bouton variante="secondaire" onClick={() => choisirVoyage(resultat.autreVoyageId!)}>
                    Passer à ce départ
                  </Bouton>
                )}
              </div>
            )}

            {/* Historique */}
            <Carte className="overflow-hidden">
              <h2 className="m-0 border-b border-separateur px-4 py-3 text-[15px] font-extrabold">Dernières lectures</h2>
              {historique.length === 0 ? (
                <p className="m-0 px-4 py-4 text-[14px] font-semibold text-encre-douce">Les billets lus s’afficheront ici.</p>
              ) : (
                <ul className="m-0 list-none p-0">
                  {historique.map((l, i) => (
                    <li key={i} className="flex items-center gap-3 border-b border-separateur px-4 py-2.5 last:border-b-0">
                      <span className="w-12 text-[13px] font-bold tabular-nums text-encre-douce">{l.heure}</span>
                      <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{l.nom}</span>
                      <Pastille libelle={l.libelle} tonalite={l.ton === 'ok' ? 'succes' : l.ton === 'refus' ? 'danger' : 'alerte'} />
                    </li>
                  ))}
                </ul>
              )}
            </Carte>
            <p className="m-0 text-[13px] font-semibold text-encre-douce">
              Pas de douchette ?{' '}
              <button type="button" onClick={() => setCamera(true)} className="inline-flex items-center gap-1 font-extrabold text-ocean-800 underline-offset-2 hover:underline">
                <Camera className="h-4 w-4" aria-hidden />
                Utiliser la caméra de l’ordinateur
              </button>
            </p>
          </div>

          {/* Liste du voyage */}
          <Carte className="flex min-w-0 flex-col overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-separateur p-4">
              <div className="flex items-baseline gap-3">
                <h2 className="m-0 flex-1 text-[16px] font-extrabold">Liste du voyage</h2>
                <b className="text-[24px] tabular-nums">
                  {aBord}
                  <span className="text-[15px] text-encre-douce"> / {voyageurs.length} à bord</span>
                </b>
              </div>
              <span className="block h-2.5 overflow-hidden rounded-full bg-ocean-50">
                <span className="block h-full rounded-full bg-succes-vif transition-all" style={{ width: `${voyageurs.length ? (aBord / voyageurs.length) * 100 : 0}%` }} />
              </span>
              <div role="group" aria-label="Filtrer la liste" className="flex gap-1 rounded-xl bg-fond p-1">
                {(
                  [
                    ['attente', `Pas encore à bord (${voyageurs.length - aBord})`],
                    ['a_bord', `À bord (${aBord})`],
                    ['tous', `Tous (${voyageurs.length})`],
                  ] as const
                ).map(([cle, libelle]) => (
                  <button
                    key={cle}
                    type="button"
                    aria-pressed={filtre === cle}
                    onClick={() => setFiltre(cle)}
                    className={`h-9 flex-1 rounded-[9px] text-[13px] font-bold ${filtre === cle ? 'bg-white text-ocean-950 shadow-sm' : 'text-encre-douce hover:text-encre'}`}
                  >
                    {libelle}
                  </button>
                ))}
              </div>
            </div>
            {liste.isLoading ? (
              <div className="flex flex-col gap-2 p-4">{[0, 1, 2, 3].map((i) => <Squelette key={i} className="h-10" />)}</div>
            ) : liste.isError ? (
              <div className="p-4">
                <Erreur message={messageErreur(liste.error)} onReessayer={() => liste.refetch()} />
              </div>
            ) : affiches.length === 0 ? (
              <Vide icone={Users} titre={filtre === 'attente' && voyageurs.length ? 'Tout le monde est à bord' : 'Aucun voyageur'}>
                {filtre === 'attente' && voyageurs.length ? 'Vous pouvez clôturer l’embarquement.' : 'Les billets confirmés de ce départ apparaissent ici.'}
              </Vide>
            ) : (
              <div className="max-h-[560px] overflow-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 bg-[#F8FAFD]">
                    <tr className="text-[12px] font-extrabold uppercase tracking-wide text-encre-douce">
                      <th className="border-b border-ligne px-4 py-2.5">Siège</th>
                      <th className="border-b border-ligne px-4 py-2.5">Voyageur</th>
                      <th className="border-b border-ligne px-4 py-2.5">Billet</th>
                      <th className="border-b border-ligne px-4 py-2.5">État</th>
                      <th className="border-b border-ligne px-4 py-2.5">
                        <span className="sr-only">Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {affiches.map((v) => (
                      <tr key={`${v.reservation_id}-${v.voyageur_id}`} className="text-[14px] hover:bg-[#F8FAFD]">
                        <td className="border-b border-separateur px-4 py-2.5 text-[15px] font-extrabold tabular-nums">{v.siege}</td>
                        <td className="border-b border-separateur px-4 py-2.5 font-bold">{nomVoyageur(v)}</td>
                        <td className="border-b border-separateur px-4 py-2.5">
                          <span className="block font-semibold tabular-nums text-encre-douce">{v.reservation_numero}</span>
                          <span className="text-[12px] font-semibold text-encre-douce">{v.canal === 'guichet' ? 'Guichet' : 'En ligne'}</span>
                        </td>
                        <td className="border-b border-separateur px-4 py-2.5">
                          <Pastille libelle={v.embarque ? 'À bord' : 'Pas encore'} tonalite={v.embarque ? 'succes' : 'neutre'} />
                        </td>
                        <td className="border-b border-separateur px-4 py-2.5 text-right">
                          {!v.embarque && !parti && (
                            <Bouton variante="secondaire" compact onClick={() => setABordManuel(v)}>
                              Marquer à bord
                            </Bouton>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Carte>
        </div>
      )}

      <LecteurCamera ouvert={camera} onLu={lireCamera} onFermer={() => setCamera(false)} />
      <Dialogue
        ouvert={!!aBordManuel}
        titre="Marquer à bord sans scanner ?"
        confirmer="Marquer à bord"
        chargement={envoi}
        onConfirmer={marquerABord}
        onFermer={() => setABordManuel(null)}
      >
        {aBordManuel && `${nomVoyageur(aBordManuel)}, siège ${aBordManuel.siege}. Vérifiez sa pièce d’identité avant de confirmer.`}
      </Dialogue>
      <Dialogue ouvert={cloture} titre="Clôturer l’embarquement ?" confirmer="Clôturer et partir" chargement={envoi} onConfirmer={cloturer} onFermer={() => setCloture(false)}>
        {s?.embarques ?? aBord} voyageur(s) à bord sur {s?.confirmes ?? voyageurs.length} billet(s) confirmé(s).
        {absents > 0 && ` Les ${absents} absent(s) ne figureront pas sur la liste.`}
        {s?.compagnie_reception ? ` ${s.compagnie_reception.nom} recevra le détail du voyage et la liste des voyageurs.` : ' Aucune compagnie de réception : vous confirmerez vous-même l’arrivée.'} La voiture passera « En route » et la vente sera fermée.
      </Dialogue>
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
    </div>
  );
}
