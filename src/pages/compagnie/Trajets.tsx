import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPinned, Pencil, Plus, Power, Search } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Carte, Champ, Dialogue, Erreur, Pastille, Selecteur, Squelette, Tiroir, Vide } from '@/components/ui';
import { Tableau } from '@/components/tableau';
import { ariary } from '@/utils/format';

/** Trajets : créer, modifier, activer ou désactiver. Départ = ville de la compagnie. */

const CATEGORIES: Record<string, string> = { classique: 'Classique', vip: 'VIP', premium: 'Premium' };

/** « 23:00:00 » → « 23 h », « 08:30:00 » → « 8 h 30 ». */
function duree(d?: string | null): string {
  const [h, m] = String(d || '').split(':').map((x) => parseInt(x, 10));
  if (!h && !m) return '—';
  return `${h || 0} h${m ? ` ${String(m).padStart(2, '0')}` : ''}`;
}

export default function Trajets() {
  const queryClient = useQueryClient();
  const [filtre, setFiltre] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const [formulaire, setFormulaire] = useState<{ ouvert: boolean; trajet: any | null }>({ ouvert: false, trajet: null });
  const [bascule, setBascule] = useState<any>(null);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);

  const trajets = useQuery({
    queryKey: ['trajets', 'liste'],
    queryFn: async () => {
      const d = (await obtenir('/api/adminCompagnie/trajet/recupererListeTrajet', { per_page: 200 })).data;
      return ((d?.trajets ?? d) || []) as any[];
    },
  });
  const liste = trajets.data || [];
  const affiches = useMemo(() => {
    const r = recherche.trim().toLowerCase();
    return liste
      .filter((t) => (filtre === 'actifs' ? Number(t.statut) === 1 : filtre === 'inactifs' ? Number(t.statut) !== 1 : true))
      .filter((t) => !r || [t.nom_trajet, t.province_depart?.nom_province, t.province_arrivee?.nom_province].join(' ').toLowerCase().includes(r))
      .sort((a, b) => String(a.nom_trajet).localeCompare(String(b.nom_trajet)));
  }, [liste, filtre, recherche]);
  const actifs = liste.filter((t) => Number(t.statut) === 1).length;

  const basculer = async () => {
    setEnvoi(true);
    try {
      const actif = Number(bascule.statut) === 1;
      await api.patch(`/api/adminCompagnie/trajet/${bascule.id_trajet}/statut`, { statut: actif ? 2 : 1 });
      queryClient.invalidateQueries({ queryKey: ['trajets'] });
      setMessage({ titre: 'C’est fait', texte: actif ? 'Le trajet est désactivé : il ne sera plus proposé pour de nouveaux voyages.' : 'Le trajet est de nouveau actif.' });
    } catch (e) {
      setMessage({ titre: 'Action impossible', texte: messageErreur(e) });
    } finally {
      setEnvoi(false);
      setBascule(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:px-7 sm:py-6">
      <Carte className="flex flex-wrap items-end gap-3 p-4">
        <Selecteur libelle="Afficher" value={filtre} onChange={(e) => setFiltre(e.target.value)} className="min-w-[220px] flex-1">
          <option value="tous">Tous les trajets ({liste.length})</option>
          <option value="actifs">Actifs ({actifs})</option>
          <option value="inactifs">Inactifs ({liste.length - actifs})</option>
        </Selecteur>
        <label className="flex min-w-[240px] flex-[2] flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-encre-douce">Recherche</span>
          <span className="flex h-11 items-center gap-2 rounded-champ border-[1.5px] border-champ bg-white px-3 focus-within:border-ocean-800">
            <Search className="h-4 w-4 text-encre-douce" aria-hidden />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Ville, nom du trajet…" className="min-w-0 flex-1 border-0 bg-transparent text-[14px] font-semibold outline-none placeholder:text-gris-clair" />
          </span>
        </label>
        <Bouton icone={Plus} onClick={() => setFormulaire({ ouvert: true, trajet: null })}>
          Nouveau trajet
        </Bouton>
      </Carte>

      <Carte className="overflow-hidden">
        {trajets.isLoading ? (
          <div className="flex flex-col gap-2 p-4">{[0, 1, 2].map((i) => <Squelette key={i} className="h-12" />)}</div>
        ) : trajets.isError ? (
          <div className="p-4">
            <Erreur message={messageErreur(trajets.error)} onReessayer={() => trajets.refetch()} />
          </div>
        ) : affiches.length === 0 ? (
          <Vide icone={MapPinned} titre={liste.length ? 'Aucun trajet ne correspond' : 'Aucun trajet'}>
            {liste.length ? 'Modifiez le filtre ou la recherche.' : 'Créez vos trajets pour pouvoir planifier des voyages.'}
          </Vide>
        ) : (
          <Tableau colonnes={[{ titre: 'Trajet' }, { titre: 'Distance', droite: true }, { titre: 'Durée', droite: true }, { titre: 'Tarif', droite: true }, { titre: 'Catégorie' }, { titre: 'Voyages à venir', droite: true }, { titre: 'État' }, { titre: 'Actions', cache: true }]}>
            {affiches.map((t) => {
              const actif = Number(t.statut) === 1;
              return (
                <tr key={t.id_trajet}>
                  <td>
                    <b className="block">
                      {t.province_depart?.nom_province} → {t.province_arrivee?.nom_province}
                    </b>
                    <span className="text-[12.5px] font-semibold text-encre-douce">{t.nom_trajet}</span>
                  </td>
                  <td className="text-right font-semibold tabular-nums">{t.distance_km ? `${t.distance_km} km` : '—'}</td>
                  <td className="text-right font-semibold tabular-nums">{duree(t.duree)}</td>
                  <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(t.tarif)}</td>
                  <td className="font-semibold">{CATEGORIES[t.categorie || 'classique']}</td>
                  <td className="text-right font-semibold tabular-nums">{t.statistiques?.voyages_futurs ?? '—'}</td>
                  <td>{actif ? <Pastille libelle="Actif" tonalite="succes" /> : <Pastille libelle="Inactif" tonalite="neutre" />}</td>
                  <td>
                    <span className="flex justify-end gap-2">
                      <Bouton variante="secondaire" compact icone={Pencil} onClick={() => setFormulaire({ ouvert: true, trajet: t })}>
                        Modifier
                      </Bouton>
                      <Bouton variante="secondaire" compact icone={Power} onClick={() => setBascule(t)}>
                        {actif ? 'Désactiver' : 'Activer'}
                      </Bouton>
                    </span>
                  </td>
                </tr>
              );
            })}
          </Tableau>
        )}
      </Carte>

      <FormulaireTrajet ouvert={formulaire.ouvert} trajet={formulaire.trajet} onFermer={() => setFormulaire({ ouvert: false, trajet: null })} />
      <Dialogue ouvert={!!bascule} titre={Number(bascule?.statut) === 1 ? 'Désactiver ce trajet ?' : 'Activer ce trajet ?'} confirmer={Number(bascule?.statut) === 1 ? 'Désactiver' : 'Activer'} chargement={envoi} onConfirmer={basculer} onFermer={() => setBascule(null)}>
        {Number(bascule?.statut) === 1 ? 'Il ne sera plus proposé pour planifier de nouveaux voyages. Les voyages déjà programmés ne changent pas.' : 'Il pourra de nouveau être choisi pour planifier des voyages.'}
      </Dialogue>
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
    </div>
  );
}

/** Créer ou modifier un trajet. */
function FormulaireTrajet({ ouvert, trajet, onFermer }: { ouvert: boolean; trajet: any | null; onFermer: () => void }) {
  const queryClient = useQueryClient();
  const edition = !!trajet;
  const [f, setF] = useState({ depart: '', arrivee: '', nom: '', km: '', heures: '', minutes: '', tarif: '', categorie: 'classique' });
  const [nomTouche, setNomTouche] = useState(false);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ titre: string; texte: string; ok?: boolean } | null>(null);

  const provinces = useQuery({ queryKey: ['provinces'], queryFn: async () => ((await obtenir('/api/adminCompagnie/provinces/recuperListeProvince', { per_page: 200 })).data?.provinces || []) as any[], enabled: ouvert, staleTime: 10 * 60_000 });
  const compagnie = useQuery({ queryKey: ['ma-compagnie'], queryFn: async () => (await obtenir('/api/adminCompagnie/ma-compagnie')).data, enabled: ouvert, staleTime: 10 * 60_000 });
  const c = compagnie.data;

  useEffect(() => {
    if (!ouvert) return;
    setErreurs({});
    if (trajet) {
      const [h, m] = String(trajet.duree || '').split(':');
      setF({
        depart: String(trajet.province_depart?.id_province ?? ''),
        arrivee: String(trajet.province_arrivee?.id_province ?? ''),
        nom: trajet.nom_trajet || '',
        km: trajet.distance_km ? String(trajet.distance_km) : '',
        heures: h ? String(parseInt(h, 10)) : '',
        minutes: m ? String(parseInt(m, 10)) : '',
        tarif: trajet.tarif ? String(Math.round(Number(trajet.tarif))) : '',
        categorie: trajet.categorie || 'classique',
      });
      setNomTouche(true);
    } else {
      setF({ depart: '', arrivee: '', nom: '', km: '', heures: '', minutes: '', tarif: '', categorie: 'classique' });
      setNomTouche(false);
    }
  }, [ouvert, trajet]);

  // Le départ est la ville de la compagnie (création)
  useEffect(() => {
    if (ouvert && !edition && c?.localisation?.id) setF((x) => ({ ...x, depart: String(c.localisation.id) }));
  }, [ouvert, edition, c?.localisation?.id]);

  const nomProvince = (id: string) => (provinces.data || []).find((p) => String(p.id) === id)?.nom || (c?.localisation && String(c.localisation.id) === id ? c.localisation.nom : '');
  // Nom proposé tant que l'utilisateur ne l'a pas changé
  useEffect(() => {
    if (!nomTouche && f.depart && f.arrivee && nomProvince(f.depart) && nomProvince(f.arrivee)) setF((x) => ({ ...x, nom: `${nomProvince(x.depart)} – ${nomProvince(x.arrivee)}` }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.depart, f.arrivee, nomTouche, provinces.data]);

  const desservies: string[] = (c?.provinces_desservies || []).map((p: any) => String(p.id));
  const arrivees = (provinces.data || []).filter((p) => String(p.id) !== f.depart && (desservies.length === 0 || desservies.includes(String(p.id))));
  const departVerrouille = !edition && !!c?.localisation?.id;

  const enregistrer = async () => {
    const e: Record<string, string> = {};
    if (!f.depart) e.depart = 'Choisissez la province de départ.';
    if (!f.arrivee) e.arrivee = 'Choisissez la province d’arrivée.';
    if (!f.nom.trim()) e.nom = 'Indiquez le nom affiché aux clients.';
    if (!Number(f.tarif)) e.tarif = 'Indiquez le tarif par place.';
    if (!Number(f.km)) e.km = 'Indiquez la distance.';
    if (!Number(f.heures) && !Number(f.minutes)) e.duree = 'Indiquez la durée du trajet : elle sert à prévoir l’arrivée des voitures.';
    setErreurs(e);
    if (Object.keys(e).length) return;
    const data = {
      traj_nom: f.nom.trim(),
      pro_depart: Number(f.depart),
      pro_arrivee: Number(f.arrivee),
      traj_tarif: Number(f.tarif),
      traj_km: Number(f.km),
      traj_duree: `${String(Number(f.heures) || 0).padStart(2, '0')}:${String(Number(f.minutes) || 0).padStart(2, '0')}`,
      traj_categorie: f.categorie,
    };
    setEnvoi(true);
    try {
      if (edition) await api.put(`/api/adminCompagnie/trajet/updateTrajet/${trajet.id_trajet}`, data);
      else await api.post('/api/adminCompagnie/trajet/creerTrajet', data);
      queryClient.invalidateQueries({ queryKey: ['trajets'] });
      setMessage({ titre: edition ? 'Trajet modifié' : 'Trajet créé', texte: edition ? 'Les modifications sont enregistrées.' : 'Vous pouvez maintenant planifier des voyages sur ce trajet.', ok: true });
    } catch (err) {
      setMessage({ titre: edition ? 'Modification impossible' : 'Création impossible', texte: messageErreur(err) });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Tiroir
      ouvert={ouvert}
      titre={edition ? 'Modifier le trajet' : 'Nouveau trajet'}
      onFermer={onFermer}
      pied={
        <>
          <Bouton onClick={enregistrer} chargement={envoi} className="flex-1">
            {edition ? 'Enregistrer' : 'Créer le trajet'}
          </Bouton>
          <Bouton variante="secondaire" onClick={onFermer}>
            Annuler
          </Bouton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Selecteur libelle="Province de départ" value={f.depart} erreur={erreurs.depart} disabled={departVerrouille} onChange={(e) => setF({ ...f, depart: e.target.value })} aide={departVerrouille ? 'La ville de votre compagnie.' : undefined}>
            <option value="">Choisir</option>
            {(provinces.data || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </Selecteur>
          <Selecteur libelle="Province d’arrivée" value={f.arrivee} erreur={erreurs.arrivee} onChange={(e) => setF({ ...f, arrivee: e.target.value })} aide={desservies.length ? 'Parmi les provinces desservies par votre compagnie.' : undefined}>
            <option value="">Choisir</option>
            {arrivees.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </Selecteur>
        </div>
        <Champ
          libelle="Nom affiché aux clients"
          value={f.nom}
          erreur={erreurs.nom}
          onChange={(e) => {
            setNomTouche(true);
            setF({ ...f, nom: e.target.value });
          }}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Champ libelle="Distance (km)" inputMode="numeric" value={f.km} erreur={erreurs.km} placeholder="930" onChange={(e) => setF({ ...f, km: e.target.value.replace(/\D/g, '').slice(0, 5) })} />
          <Champ libelle="Durée : heures" inputMode="numeric" value={f.heures} erreur={erreurs.duree} placeholder="18" onChange={(e) => setF({ ...f, heures: e.target.value.replace(/\D/g, '').slice(0, 2) })} />
          <Champ libelle="et minutes" inputMode="numeric" value={f.minutes} placeholder="00" onChange={(e) => setF({ ...f, minutes: e.target.value.replace(/\D/g, '').slice(0, 2) })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ libelle="Tarif par place (Ar)" inputMode="numeric" value={f.tarif} erreur={erreurs.tarif} placeholder="55000" onChange={(e) => setF({ ...f, tarif: e.target.value.replace(/\D/g, '').slice(0, 8) })} />
          <Selecteur libelle="Catégorie" value={f.categorie} onChange={(e) => setF({ ...f, categorie: e.target.value })} aide="VIP et Premium : à faire activer par l’administrateur FANDRIO.">
            <option value="classique">Classique</option>
            <option value="vip" disabled={!c?.mode_vip && f.categorie !== 'vip'}>
              VIP{!c?.mode_vip ? ' (non activé)' : ''}
            </option>
            <option value="premium" disabled={!c?.mode_premium && f.categorie !== 'premium'}>
              Premium{!c?.mode_premium ? ' (non activé)' : ''}
            </option>
          </Selecteur>
        </div>
      </div>
      <Dialogue
        ouvert={!!message}
        titre={message?.titre || ''}
        onFermer={() => {
          const ok = message?.ok;
          setMessage(null);
          if (ok) onFermer();
        }}
      >
        {message?.texte}
      </Dialogue>
    </Tiroir>
  );
}
