import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Phone, Plus, Power, Search, Trash2, Users } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Carte, Champ, Dialogue, Erreur, Pastille, Selecteur, Squelette, Tiroir, Vide } from '@/components/ui';
import { Tableau } from '@/components/tableau';
import { initiales, pluriel } from '@/utils/format';

/** Chauffeurs de la compagnie : ajouter, modifier, activer ou désactiver, supprimer. */

const nomDe = (c: any) => `${c.chauff_prenom || ''} ${c.chauff_nom || ''}`.trim();

export default function Chauffeurs() {
  const queryClient = useQueryClient();
  const [filtre, setFiltre] = useState('actuels');
  const [recherche, setRecherche] = useState('');
  const [formulaire, setFormulaire] = useState<{ ouvert: boolean; chauffeur: any | null }>({ ouvert: false, chauffeur: null });
  const [action, setAction] = useState<{ type: 'etat' | 'supprimer'; c: any } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);

  const chauffeurs = useQuery({ queryKey: ['chauffeurs', 'liste'], queryFn: async () => ((await obtenir('/api/adminCompagnie/chauffeur/liste')).data || []) as any[] });
  const voitures = useQuery({ queryKey: ['voitures', 'liste'], queryFn: async () => ((await obtenir('/api/adminCompagnie/voiture/liste')).data || []) as any[] });
  const vehiculeDe = (id: any) => (voitures.data || []).find((v) => String(v.chauff_id) === String(id));

  const liste = chauffeurs.data || [];
  const compte = { actifs: liste.filter((c) => Number(c.chauff_statut) === 1).length, inactifs: liste.filter((c) => Number(c.chauff_statut) === 2).length, supprimes: liste.filter((c) => Number(c.chauff_statut) === 3).length };
  const affiches = useMemo(() => {
    const r = recherche.trim().toLowerCase();
    return liste
      .filter((c) => {
        const s = Number(c.chauff_statut);
        if (filtre === 'actuels' && s === 3) return false;
        if (filtre === 'actifs' && s !== 1) return false;
        if (filtre === 'inactifs' && s !== 2) return false;
        if (filtre === 'supprimes' && s !== 3) return false;
        return !r || [nomDe(c), c.chauff_cin, c.chauff_phone].join(' ').toLowerCase().includes(r);
      })
      .sort((a, b) => nomDe(a).localeCompare(nomDe(b)));
  }, [liste, filtre, recherche]);

  const executer = async () => {
    if (!action) return;
    setEnvoi(true);
    try {
      const { c } = action;
      const r =
        action.type === 'etat'
          ? await api.put(`/api/adminCompagnie/chauffeur/changement_etat/${c.chauff_id}`, { chauff_statut: Number(c.chauff_statut) === 1 ? 2 : 1 })
          : await api.put(`/api/adminCompagnie/chauffeur/suppression/${c.chauff_id}`);
      setMessage({ titre: 'C’est fait', texte: action.type === 'etat' ? r.data?.message || 'État modifié.' : `${nomDe(c)} est supprimé de la liste des chauffeurs.` });
      queryClient.invalidateQueries({ queryKey: ['chauffeurs'] });
    } catch (e) {
      setMessage({ titre: 'Action impossible', texte: messageErreur(e) });
    } finally {
      setEnvoi(false);
      setAction(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:px-7 sm:py-6">
      <Carte className="flex flex-wrap items-end gap-3 p-4">
        <Selecteur libelle="Afficher" value={filtre} onChange={(e) => setFiltre(e.target.value)} className="min-w-[220px] flex-1">
          <option value="actuels">Tous les chauffeurs ({compte.actifs + compte.inactifs})</option>
          <option value="actifs">Actifs ({compte.actifs})</option>
          <option value="inactifs">Inactifs ({compte.inactifs})</option>
          <option value="supprimes">Supprimés ({compte.supprimes})</option>
        </Selecteur>
        <label className="flex min-w-[240px] flex-[2] flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-encre-douce">Recherche</span>
          <span className="flex h-11 items-center gap-2 rounded-champ border-[1.5px] border-champ bg-white px-3 focus-within:border-ocean-800">
            <Search className="h-4 w-4 text-encre-douce" aria-hidden />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom, CIN, téléphone…" className="min-w-0 flex-1 border-0 bg-transparent text-[14px] font-semibold outline-none placeholder:text-gris-clair" />
          </span>
        </label>
        <Bouton icone={Plus} onClick={() => setFormulaire({ ouvert: true, chauffeur: null })}>
          Ajouter un chauffeur
        </Bouton>
      </Carte>

      <Carte className="overflow-hidden">
        {chauffeurs.isLoading ? (
          <div className="flex flex-col gap-2 p-4">{[0, 1, 2].map((i) => <Squelette key={i} className="h-12" />)}</div>
        ) : chauffeurs.isError ? (
          <div className="p-4">
            <Erreur message={messageErreur(chauffeurs.error)} onReessayer={() => chauffeurs.refetch()} />
          </div>
        ) : affiches.length === 0 ? (
          <Vide icone={Users} titre={liste.length ? 'Aucun chauffeur ne correspond' : 'Aucun chauffeur'}>
            {liste.length ? 'Modifiez le filtre ou la recherche.' : 'Ajoutez vos chauffeurs pour les attribuer à vos véhicules.'}
          </Vide>
        ) : (
          <Tableau colonnes={[{ titre: 'Chauffeur' }, { titre: 'CIN' }, { titre: 'Permis' }, { titre: 'Téléphone' }, { titre: 'Véhicule attitré' }, { titre: 'État' }, { titre: 'Actions', cache: true }]}>
            {affiches.map((c) => {
              const s = Number(c.chauff_statut);
              const v = vehiculeDe(c.chauff_id);
              return (
                <tr key={c.chauff_id}>
                  <td>
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-ocean-50 text-[13px] font-extrabold text-ocean-800">{initiales(nomDe(c))}</span>
                      <span>
                        <b className="block">{nomDe(c)}</b>
                        <span className="text-[12.5px] font-semibold text-encre-douce">{c.chauff_age} ans</span>
                      </span>
                    </span>
                  </td>
                  <td className="font-semibold tabular-nums">{c.chauff_cin}</td>
                  <td className="font-bold">{c.chauff_permis}</td>
                  <td>
                    <a href={`tel:${String(c.chauff_phone).replace(/\s+/g, '')}`} className="inline-flex items-center gap-1 font-bold tabular-nums no-underline hover:underline">
                      <Phone className="h-3.5 w-3.5" aria-hidden />
                      {c.chauff_phone}
                    </a>
                  </td>
                  <td className={`font-semibold ${v ? '' : 'text-encre-douce'}`}>{v ? v.voit_matricule : 'Aucun'}</td>
                  <td>{s === 1 ? <Pastille libelle="Actif" tonalite="succes" /> : s === 2 ? <Pastille libelle="Inactif" tonalite="neutre" /> : <Pastille libelle="Supprimé" tonalite="danger" />}</td>
                  <td>
                    {s !== 3 && (
                      <span className="flex justify-end gap-2">
                        <Bouton variante="secondaire" compact icone={Pencil} onClick={() => setFormulaire({ ouvert: true, chauffeur: c })}>
                          Modifier
                        </Bouton>
                        <Bouton variante="secondaire" compact icone={Power} onClick={() => setAction({ type: 'etat', c })}>
                          {s === 1 ? 'Désactiver' : 'Activer'}
                        </Bouton>
                        <Bouton variante="danger" compact icone={Trash2} onClick={() => setAction({ type: 'supprimer', c })} aria-label={`Supprimer ${nomDe(c)}`}>
                          <span className="sr-only">Supprimer</span>
                        </Bouton>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </Tableau>
        )}
        {!chauffeurs.isLoading && liste.length > 0 && (
          <p className="m-0 border-t border-separateur px-4 py-2.5 text-[13px] font-semibold text-encre-douce">
            {pluriel(compte.actifs, 'chauffeur actif', 'chauffeurs actifs')} sur {compte.actifs + compte.inactifs}
          </p>
        )}
      </Carte>

      <FormulaireChauffeur ouvert={formulaire.ouvert} chauffeur={formulaire.chauffeur} onFermer={() => setFormulaire({ ouvert: false, chauffeur: null })} />
      <Dialogue
        ouvert={!!action}
        titre={action?.type === 'supprimer' ? `Supprimer ${action ? nomDe(action.c) : ''} ?` : Number(action?.c?.chauff_statut) === 1 ? 'Désactiver ce chauffeur ?' : 'Activer ce chauffeur ?'}
        confirmer={action?.type === 'supprimer' ? 'Supprimer' : Number(action?.c?.chauff_statut) === 1 ? 'Désactiver' : 'Activer'}
        danger={action?.type === 'supprimer'}
        chargement={envoi}
        onConfirmer={executer}
        onFermer={() => setAction(null)}
      >
        {action?.type === 'supprimer'
          ? 'Il ne pourra plus être attribué à un véhicule. Son historique est conservé.'
          : Number(action?.c?.chauff_statut) === 1
            ? 'Il ne pourra plus être attribué à un nouveau véhicule tant qu’il est inactif.'
            : 'Il pourra de nouveau être attribué à un véhicule.'}
      </Dialogue>
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
    </div>
  );
}

/** Ajouter ou modifier un chauffeur. */
function FormulaireChauffeur({ ouvert, chauffeur, onFermer }: { ouvert: boolean; chauffeur: any | null; onFermer: () => void }) {
  const queryClient = useQueryClient();
  const edition = !!chauffeur;
  const [f, setF] = useState({ prenom: '', nom: '', cin: '', age: '', telephone: '', permis: 'D', actif: '1' });
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ titre: string; texte: string; ok?: boolean } | null>(null);

  useEffect(() => {
    if (!ouvert) return;
    setErreurs({});
    setF(
      chauffeur
        ? { prenom: chauffeur.chauff_prenom || '', nom: chauffeur.chauff_nom || '', cin: chauffeur.chauff_cin || '', age: String(chauffeur.chauff_age || ''), telephone: chauffeur.chauff_phone || '', permis: chauffeur.chauff_permis || 'D', actif: Number(chauffeur.chauff_statut) === 2 ? '2' : '1' }
        : { prenom: '', nom: '', cin: '', age: '', telephone: '', permis: 'D', actif: '1' }
    );
  }, [ouvert, chauffeur]);

  const enregistrer = async () => {
    const e: Record<string, string> = {};
    if (!f.prenom.trim()) e.prenom = 'Indiquez le prénom.';
    if (!f.nom.trim()) e.nom = 'Indiquez le nom.';
    if (!f.cin.trim()) e.cin = 'Indiquez le numéro de CIN.';
    if (!f.age || Number(f.age) < 18) e.age = 'Le chauffeur doit avoir au moins 18 ans.';
    if (!f.telephone.trim()) e.telephone = 'Indiquez le téléphone.';
    setErreurs(e);
    if (Object.keys(e).length) return;
    const data: any = { chauff_prenom: f.prenom.trim(), chauff_nom: f.nom.trim(), chauff_age: Number(f.age), chauff_permis: f.permis, chauff_phone: f.telephone.trim(), chauff_statut: Number(f.actif) };
    // En modification, le CIN n'est envoyé que s'il change (il doit rester unique)
    if (!edition || f.cin.trim() !== chauffeur.chauff_cin) data.chauff_cin = f.cin.trim();
    setEnvoi(true);
    try {
      if (edition) await api.put(`/api/adminCompagnie/chauffeur/modification/${chauffeur.chauff_id}`, data);
      else await api.post('/api/adminCompagnie/chauffeur/ajout', data);
      queryClient.invalidateQueries({ queryKey: ['chauffeurs'] });
      setMessage({ titre: edition ? 'Chauffeur modifié' : 'Chauffeur ajouté', texte: edition ? 'Les modifications sont enregistrées.' : 'Vous pouvez maintenant l’attribuer à un véhicule.', ok: true });
    } catch (err) {
      setMessage({ titre: edition ? 'Modification impossible' : 'Ajout impossible', texte: messageErreur(err) });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Tiroir
      ouvert={ouvert}
      titre={edition ? 'Modifier le chauffeur' : 'Ajouter un chauffeur'}
      onFermer={onFermer}
      pied={
        <>
          <Bouton onClick={enregistrer} chargement={envoi} className="flex-1">
            {edition ? 'Enregistrer' : 'Ajouter le chauffeur'}
          </Bouton>
          <Bouton variante="secondaire" onClick={onFermer}>
            Annuler
          </Bouton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Champ libelle="Prénom" value={f.prenom} erreur={erreurs.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} />
          <Champ libelle="Nom" value={f.nom} erreur={erreurs.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} />
          <Champ libelle="N° CIN" value={f.cin} erreur={erreurs.cin} inputMode="numeric" placeholder="101 211 345 678" onChange={(e) => setF({ ...f, cin: e.target.value })} />
          <Champ libelle="Âge" value={f.age} erreur={erreurs.age} inputMode="numeric" onChange={(e) => setF({ ...f, age: e.target.value.replace(/\D/g, '').slice(0, 2) })} />
          <Champ libelle="Téléphone" type="tel" value={f.telephone} erreur={erreurs.telephone} placeholder="034 12 345 67" onChange={(e) => setF({ ...f, telephone: e.target.value })} />
          <Selecteur libelle="Catégorie de permis" value={f.permis} onChange={(e) => setF({ ...f, permis: e.target.value })}>
            {['A', 'B', 'C', 'D'].map((p) => (
              <option key={p} value={p}>
                Permis {p}
              </option>
            ))}
          </Selecteur>
        </div>
        <Selecteur libelle="État" value={f.actif} onChange={(e) => setF({ ...f, actif: e.target.value })} aide="Seul un chauffeur actif peut être attribué à un véhicule.">
          <option value="1">Actif</option>
          <option value="2">Inactif</option>
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
