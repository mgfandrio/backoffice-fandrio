import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bus, LayoutGrid, Pencil, Plus, Power, Search } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Carte, Champ, Dialogue, Erreur, Pastille, Selecteur, Squelette, Tiroir, Vide } from '@/components/ui';
import { Tableau } from '@/components/tableau';
import { LegendePlan, PlanSieges } from '@/components/sieges/PlanSieges';
import { EditeurPlan } from '@/components/flotte/EditeurPlan';
import { pluriel } from '@/utils/format';

/** Véhicules : ajouter, modifier, rendre disponible ou non, plan de sièges. */

const CATEGORIES: Record<string, string> = { classique: 'Classique', vip: 'VIP', premium: 'Premium' };
const nomChauffeur = (c: any) => (c ? `${c.chauff_prenom || ''} ${c.chauff_nom || ''}`.trim() : '');

export default function Vehicules() {
  const [filtre, setFiltre] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [formulaire, setFormulaire] = useState<{ ouvert: boolean; voiture: any | null }>({ ouvert: false, voiture: null });

  const voitures = useQuery({ queryKey: ['voitures', 'liste'], queryFn: async () => ((await obtenir('/api/adminCompagnie/voiture/liste')).data || []) as any[] });
  const liste = voitures.data || [];
  const compte = { dispo: liste.filter((v) => Number(v.voit_statut) === 1).length, indispo: liste.filter((v) => Number(v.voit_statut) !== 1).length };
  const affiches = useMemo(() => {
    const r = recherche.trim().toLowerCase();
    return liste
      .filter((v) => (filtre === 'dispo' ? Number(v.voit_statut) === 1 : filtre === 'indispo' ? Number(v.voit_statut) !== 1 : true))
      .filter((v) => !r || [v.voit_matricule, v.voit_marque, v.voit_modele, nomChauffeur(v.chauffeur)].join(' ').toLowerCase().includes(r))
      .sort((a, b) => String(a.voit_matricule).localeCompare(String(b.voit_matricule)));
  }, [liste, filtre, recherche]);
  // La fiche ouverte suit les données à jour
  const detailAJour = detail ? liste.find((v) => v.voit_id === detail.voit_id) || detail : null;

  return (
    <div className="flex flex-col gap-4 p-4 sm:px-7 sm:py-6">
      <Carte className="flex flex-wrap items-end gap-3 p-4">
        <Selecteur libelle="Afficher" value={filtre} onChange={(e) => setFiltre(e.target.value)} className="min-w-[220px] flex-1">
          <option value="tous">Tous les véhicules ({liste.length})</option>
          <option value="dispo">Disponibles ({compte.dispo})</option>
          <option value="indispo">Indisponibles ({compte.indispo})</option>
        </Selecteur>
        <label className="flex min-w-[240px] flex-[2] flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-encre-douce">Recherche</span>
          <span className="flex h-11 items-center gap-2 rounded-champ border-[1.5px] border-champ bg-white px-3 focus-within:border-ocean-800">
            <Search className="h-4 w-4 text-encre-douce" aria-hidden />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Matricule, marque, chauffeur…" className="min-w-0 flex-1 border-0 bg-transparent text-[14px] font-semibold outline-none placeholder:text-gris-clair" />
          </span>
        </label>
        <Bouton icone={Plus} onClick={() => setFormulaire({ ouvert: true, voiture: null })}>
          Ajouter un véhicule
        </Bouton>
      </Carte>

      <Carte className="overflow-hidden">
        {voitures.isLoading ? (
          <div className="flex flex-col gap-2 p-4">{[0, 1, 2].map((i) => <Squelette key={i} className="h-12" />)}</div>
        ) : voitures.isError ? (
          <div className="p-4">
            <Erreur message={messageErreur(voitures.error)} onReessayer={() => voitures.refetch()} />
          </div>
        ) : affiches.length === 0 ? (
          <Vide icone={Bus} titre={liste.length ? 'Aucun véhicule ne correspond' : 'Aucun véhicule'}>
            {liste.length ? 'Modifiez le filtre ou la recherche.' : 'Ajoutez vos véhicules pour programmer des voyages.'}
          </Vide>
        ) : (
          <Tableau colonnes={[{ titre: 'Véhicule' }, { titre: 'Catégorie' }, { titre: 'Places', droite: true }, { titre: 'Chauffeur attitré' }, { titre: 'État' }, { titre: 'Action', cache: true }]}>
            {affiches.map((v) => (
              <tr key={v.voit_id}>
                <td>
                  <b className="block tabular-nums">{v.voit_matricule}</b>
                  <span className="text-[12.5px] font-semibold text-encre-douce">{[v.voit_marque, v.voit_modele].filter(Boolean).join(' ')}</span>
                </td>
                <td className="font-semibold">{CATEGORIES[v.voit_categorie || 'classique']}</td>
                <td className="text-right font-bold tabular-nums">{v.voit_places}</td>
                <td className={`font-semibold ${v.chauffeur ? '' : 'text-alerte'}`}>{nomChauffeur(v.chauffeur) || 'Aucun chauffeur'}</td>
                <td>{Number(v.voit_statut) === 1 ? <Pastille libelle="Disponible" tonalite="succes" /> : <Pastille libelle="Indisponible" tonalite="neutre" />}</td>
                <td className="text-right">
                  <Bouton variante="secondaire" compact onClick={() => setDetail(v)}>
                    Ouvrir
                  </Bouton>
                </td>
              </tr>
            ))}
          </Tableau>
        )}
      </Carte>

      <DetailVehicule voiture={detailAJour} onFermer={() => setDetail(null)} onModifier={(v) => setFormulaire({ ouvert: true, voiture: v })} />
      <FormulaireVehicule ouvert={formulaire.ouvert} voiture={formulaire.voiture} voitures={liste} onFermer={() => setFormulaire({ ouvert: false, voiture: null })} />
    </div>
  );
}

/** Fiche d'un véhicule : chauffeur, plan de sièges, disponibilité. */
function DetailVehicule({ voiture, onFermer, onModifier }: { voiture: any; onFermer: () => void; onModifier: (v: any) => void }) {
  const queryClient = useQueryClient();
  const [editeur, setEditeur] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);
  const plan = useQuery({
    queryKey: ['voitures', 'plan', voiture?.voit_id],
    queryFn: async () => {
      try {
        return (await obtenir(`/api/adminCompagnie/plans-sieges/voiture/${voiture.voit_id}`)).data;
      } catch {
        return null; // pas encore de plan : disposition standard
      }
    },
    enabled: !!voiture,
  });
  const disponible = Number(voiture?.voit_statut) === 1;
  const grille: string[][] | null = plan.data?.grille || null;
  const nbPlaces = Number(plan.data?.nombre_total_sieges) || Number(voiture?.voit_places) || 0;
  const sieges = useMemo(() => {
    const codes = grille ? grille.flat().filter((c) => c && c !== 'C') : Array.from({ length: nbPlaces }, (_, i) => String(i + 1));
    return codes.map((c) => ({ code: String(c), statut: 'disponible' }));
  }, [grille, nbPlaces]);

  const basculer = async () => {
    setEnvoi(true);
    try {
      await api.put(`/api/adminCompagnie/voiture/modification/${voiture.voit_id}`, { voit_statut: disponible ? 2 : 1 });
      queryClient.invalidateQueries({ queryKey: ['voitures'] });
      setMessage({ titre: 'C’est fait', texte: disponible ? 'Le véhicule est indisponible : il ne sera plus proposé pour de nouveaux voyages.' : 'Le véhicule est de nouveau disponible.' });
    } catch (e) {
      setMessage({ titre: 'Action impossible', texte: messageErreur(e) });
    } finally {
      setEnvoi(false);
      setConfirmer(false);
    }
  };

  return (
    <Tiroir
      ouvert={!!voiture}
      titre={voiture ? `${voiture.voit_matricule} · ${[voiture.voit_marque, voiture.voit_modele].filter(Boolean).join(' ')}` : ''}
      sousTitre={voiture ? `${CATEGORIES[voiture.voit_categorie || 'classique']} · ${pluriel(nbPlaces, 'place')}` : undefined}
      onFermer={onFermer}
      pied={
        voiture && (
          <>
            <Bouton variante="secondaire" icone={Pencil} onClick={() => onModifier(voiture)}>
              Modifier
            </Bouton>
            <Bouton variante="secondaire" icone={LayoutGrid} onClick={() => setEditeur(true)} disabled={plan.isLoading}>
              Modifier le plan
            </Bouton>
            <Bouton variante={disponible ? 'danger' : 'succes'} icone={Power} onClick={() => setConfirmer(true)} className="ml-auto">
              {disponible ? 'Rendre indisponible' : 'Rendre disponible'}
            </Bouton>
          </>
        )
      }
    >
      {voiture && (
        <div className="flex flex-col gap-4">
          <Carte className="grid gap-0 p-0 sm:grid-cols-2">
            {[
              ['État', disponible ? 'Disponible' : 'Indisponible'],
              ['Chauffeur attitré', nomChauffeur(voiture.chauffeur) ? `${nomChauffeur(voiture.chauffeur)} · ${voiture.chauffeur.chauff_phone}` : 'Aucun'],
            ].map(([l, val], i) => (
              <div key={l} className={`flex flex-col gap-0.5 border-separateur px-4 py-3 ${i === 0 ? 'sm:border-r' : ''}`}>
                <span className="text-[12.5px] font-bold text-encre-douce">{l}</span>
                <b className="text-[14px]">{val}</b>
              </div>
            ))}
          </Carte>
          <div className="flex items-baseline justify-between">
            <h3 className="m-0 text-[15px] font-extrabold">Plan de sièges</h3>
            <span className="text-[13px] font-semibold text-encre-douce">{grille ? 'Dessiné par votre compagnie' : 'Disposition standard'}</span>
          </div>
          {plan.isLoading ? (
            <Squelette className="mx-auto h-80 w-64" />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <PlanSieges sieges={sieges} grille={grille} />
              <LegendePlan />
            </div>
          )}
        </div>
      )}
      {voiture && (
        <EditeurPlan
          ouvert={editeur}
          voitureId={voiture.voit_id}
          titre={voiture.voit_matricule}
          grilleInitiale={grille}
          placesActuelles={nbPlaces}
          onFermer={() => setEditeur(false)}
          onEnregistre={() => {
            queryClient.invalidateQueries({ queryKey: ['voitures'] });
            setMessage({ titre: 'Plan enregistré', texte: 'Le nouveau plan de sièges est utilisé pour les ventes en ligne et au guichet.' });
          }}
        />
      )}
      <Dialogue ouvert={confirmer} titre={disponible ? 'Rendre ce véhicule indisponible ?' : 'Rendre ce véhicule disponible ?'} confirmer={disponible ? 'Rendre indisponible' : 'Rendre disponible'} danger={disponible} chargement={envoi} onConfirmer={basculer} onFermer={() => setConfirmer(false)}>
        {disponible ? 'Il ne sera plus proposé pour programmer de nouveaux voyages. Les voyages déjà programmés ne changent pas.' : 'Il pourra de nouveau être choisi pour programmer des voyages.'}
      </Dialogue>
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
    </Tiroir>
  );
}

/** Ajouter ou modifier un véhicule. */
function FormulaireVehicule({ ouvert, voiture, voitures, onFermer }: { ouvert: boolean; voiture: any | null; voitures: any[]; onFermer: () => void }) {
  const queryClient = useQueryClient();
  const edition = !!voiture;
  const [f, setF] = useState({ marque: '', modele: '', matricule: '', places: '16', categorie: 'classique', chauffId: '', statut: '1' });
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ titre: string; texte: string; ok?: boolean } | null>(null);

  const chauffeurs = useQuery({ queryKey: ['chauffeurs', 'liste'], queryFn: async () => ((await obtenir('/api/adminCompagnie/chauffeur/liste')).data || []) as any[], enabled: ouvert });
  const compagnie = useQuery({ queryKey: ['ma-compagnie'], queryFn: async () => (await obtenir('/api/adminCompagnie/ma-compagnie')).data, enabled: ouvert, staleTime: 10 * 60_000 });

  useEffect(() => {
    if (!ouvert) return;
    setErreurs({});
    setF(
      voiture
        ? { marque: voiture.voit_marque || '', modele: voiture.voit_modele || '', matricule: voiture.voit_matricule || '', places: String(voiture.voit_places || ''), categorie: voiture.voit_categorie || 'classique', chauffId: voiture.chauff_id ? String(voiture.chauff_id) : '', statut: Number(voiture.voit_statut) === 1 ? '1' : '2' }
        : { marque: '', modele: '', matricule: '', places: '16', categorie: 'classique', chauffId: '', statut: '1' }
    );
  }, [ouvert, voiture]);

  const vehiculeDe = (id: any) => voitures.find((v) => String(v.chauff_id) === String(id) && v.voit_id !== voiture?.voit_id);
  const choixChauffeurs = (chauffeurs.data || []).filter((c) => Number(c.chauff_statut) === 1 || String(c.chauff_id) === f.chauffId);

  const enregistrer = async () => {
    const e: Record<string, string> = {};
    if (!f.marque.trim()) e.marque = 'Indiquez la marque.';
    if (!f.modele.trim()) e.modele = 'Indiquez le modèle.';
    if (!f.matricule.trim()) e.matricule = 'Indiquez l’immatriculation.';
    const n = Number(f.places);
    if (!n || n < 1 || n > 70) e.places = 'Entre 1 et 70 places.';
    if (!f.chauffId) e.chauffId = 'Choisissez le chauffeur attitré.';
    setErreurs(e);
    if (Object.keys(e).length) return;
    const data = { voit_marque: f.marque.trim(), voit_modele: f.modele.trim(), voit_matricule: f.matricule.trim().toUpperCase(), voit_places: n, voit_statut: Number(f.statut), voit_categorie: f.categorie, chauff_id: Number(f.chauffId) };
    setEnvoi(true);
    try {
      if (edition) await api.put(`/api/adminCompagnie/voiture/modification/${voiture.voit_id}`, data);
      else await api.post('/api/adminCompagnie/voiture/ajout', data);
      queryClient.invalidateQueries({ queryKey: ['voitures'] });
      setMessage({ titre: edition ? 'Véhicule modifié' : 'Véhicule ajouté', texte: edition ? 'Les modifications sont enregistrées.' : 'Un plan de sièges standard a été créé pour ce véhicule. Vous pouvez l’ajuster depuis sa fiche.', ok: true });
    } catch (err) {
      setMessage({ titre: edition ? 'Modification impossible' : 'Ajout impossible', texte: messageErreur(err) });
    } finally {
      setEnvoi(false);
    }
  };

  const c = compagnie.data;
  return (
    <Tiroir
      ouvert={ouvert}
      titre={edition ? 'Modifier le véhicule' : 'Ajouter un véhicule'}
      onFermer={onFermer}
      pied={
        <>
          <Bouton onClick={enregistrer} chargement={envoi} className="flex-1">
            {edition ? 'Enregistrer' : 'Ajouter le véhicule'}
          </Bouton>
          <Bouton variante="secondaire" onClick={onFermer}>
            Annuler
          </Bouton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ libelle="Marque" value={f.marque} erreur={erreurs.marque} placeholder="Mercedes" onChange={(e) => setF({ ...f, marque: e.target.value })} />
          <Champ libelle="Modèle" value={f.modele} erreur={erreurs.modele} placeholder="Sprinter" onChange={(e) => setF({ ...f, modele: e.target.value })} />
          <Champ libelle="Immatriculation" value={f.matricule} erreur={erreurs.matricule} placeholder="1234 TBA" onChange={(e) => setF({ ...f, matricule: e.target.value.toUpperCase() })} />
          <Champ libelle="Nombre de places" inputMode="numeric" value={f.places} erreur={erreurs.places} onChange={(e) => setF({ ...f, places: e.target.value.replace(/\D/g, '').slice(0, 2) })} aide={edition ? 'Pour changer la disposition, utilisez « Modifier le plan ».' : undefined} />
          <Selecteur libelle="Catégorie" value={f.categorie} onChange={(e) => setF({ ...f, categorie: e.target.value })} aide="VIP et Premium : à faire activer par l’administrateur FANDRIO.">
            <option value="classique">Classique</option>
            <option value="vip" disabled={!c?.mode_vip && f.categorie !== 'vip'}>
              VIP{!c?.mode_vip ? ' (non activé)' : ''}
            </option>
            <option value="premium" disabled={!c?.mode_premium && f.categorie !== 'premium'}>
              Premium{!c?.mode_premium ? ' (non activé)' : ''}
            </option>
          </Selecteur>
          <Selecteur libelle="État" value={f.statut} onChange={(e) => setF({ ...f, statut: e.target.value })}>
            <option value="1">Disponible</option>
            <option value="2">Indisponible</option>
          </Selecteur>
        </div>
        <Selecteur libelle="Chauffeur attitré" value={f.chauffId} erreur={erreurs.chauffId} onChange={(e) => setF({ ...f, chauffId: e.target.value })} aide={choixChauffeurs.length === 0 ? 'Ajoutez d’abord un chauffeur actif dans « Chauffeurs ».' : 'Seuls les chauffeurs actifs sont proposés.'}>
          <option value="">Choisir le chauffeur</option>
          {choixChauffeurs.map((ch) => {
            const autre = vehiculeDe(ch.chauff_id);
            return (
              <option key={ch.chauff_id} value={ch.chauff_id}>
                {nomChauffeur(ch)} · permis {ch.chauff_permis}
                {autre ? ` · conduit déjà ${autre.voit_matricule}` : ' · sans véhicule'}
              </option>
            );
          })}
        </Selecteur>
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
