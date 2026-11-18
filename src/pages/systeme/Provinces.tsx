import { FormEvent, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Compass, MapPinned, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Carte, Champ, Dialogue, Erreur, Selecteur, Squelette, Tiroir, Vide } from '@/components/ui';
import { Kpi, Tableau } from '@/components/tableau';
import { nombre } from '@/utils/format';

const ORIENTATIONS = ['Nord', 'Sud', 'Est', 'Ouest', 'Centre'];

/** Provinces desservies : liste, ajout, modification, suppression. */
export default function Provinces() {
  const queryClient = useQueryClient();
  const [orientation, setOrientation] = useState('');
  const [recherche, setRecherche] = useState('');
  const [edition, setEdition] = useState<{ id: number | null; nom: string; orientation: string } | null>(null);
  const [aSupprimer, setASupprimer] = useState<any>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);

  const liste = useQuery({ queryKey: ['systeme', 'provinces'], queryFn: async () => ((await obtenir('/api/admin/provinces/recuperListeProvince', { per_page: 200 })).data?.provinces || []) as any[] });
  const affichees = useMemo(() => {
    const r = recherche.trim().toLowerCase();
    return (liste.data || []).filter((p) => (!orientation || p.orientation === orientation) && (!r || String(p.nom).toLowerCase().includes(r)));
  }, [liste.data, orientation, recherche]);
  const parOrientation = useMemo(() => {
    const m: Record<string, number> = {};
    (liste.data || []).forEach((p) => (m[p.orientation] = (m[p.orientation] || 0) + 1));
    return m;
  }, [liste.data]);

  const rafraichir = () => queryClient.invalidateQueries({ queryKey: ['systeme'] });

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault();
    if (!edition) return;
    if (!edition.nom.trim()) return setErreur('Indiquez le nom de la province.');
    setOccupe(true);
    setErreur('');
    try {
      const corps = { pro_nom: edition.nom.trim(), pro_orientation: edition.orientation };
      if (edition.id) await api.put(`/api/admin/provinces/miseAjourProvince/${edition.id}`, corps);
      else await api.post('/api/admin/provinces/ajoutProvince', corps);
      rafraichir();
      setMessage({ titre: 'C’est enregistré', texte: edition.id ? `La province ${corps.pro_nom} est modifiée.` : `La province ${corps.pro_nom} est ajoutée.` });
      setEdition(null);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setOccupe(false);
    }
  };

  const supprimer = async () => {
    setOccupe(true);
    try {
      await api.delete(`/api/admin/provinces/supprimerProvince/${aSupprimer.id}`);
      rafraichir();
      setMessage({ titre: 'Province supprimée', texte: `${aSupprimer.nom} a été retirée.` });
    } catch (err) {
      setMessage({ titre: 'Suppression impossible', texte: messageErreur(err) });
    } finally {
      setOccupe(false);
      setASupprimer(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:px-7 sm:py-6">
      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
        <Kpi marine icone={MapPinned} libelle="Provinces" valeur={nombre((liste.data || []).length)} chargement={liste.isLoading} />
        {ORIENTATIONS.map((o) => (
          <Kpi key={o} icone={Compass} ton="neutre" libelle={o} valeur={nombre(parOrientation[o] || 0)} chargement={liste.isLoading} />
        ))}
      </section>

      <Carte className="flex flex-wrap items-end gap-3 p-4">
        <Selecteur libelle="Orientation" value={orientation} onChange={(e) => setOrientation(e.target.value)} className="min-w-[200px]">
          <option value="">Toutes</option>
          {ORIENTATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </Selecteur>
        <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-encre-douce">Recherche</span>
          <span className="flex h-11 items-center gap-2 rounded-champ border-[1.5px] border-champ bg-white px-3 focus-within:border-ocean-800">
            <Search className="h-4 w-4 text-encre-douce" aria-hidden />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom de la province…" className="min-w-0 flex-1 border-0 bg-transparent text-[14px] font-semibold outline-none placeholder:text-gris-clair" />
          </span>
        </label>
        <Bouton icone={Plus} onClick={() => { setErreur(''); setEdition({ id: null, nom: '', orientation: 'Centre' }); }}>
          Ajouter une province
        </Bouton>
      </Carte>

      <Carte className="overflow-hidden">
        {liste.isLoading ? (
          <div className="flex flex-col gap-2 p-4">{[0, 1, 2].map((i) => <Squelette key={i} className="h-11" />)}</div>
        ) : liste.isError ? (
          <div className="p-4"><Erreur message={messageErreur(liste.error)} onReessayer={() => liste.refetch()} /></div>
        ) : affichees.length === 0 ? (
          <Vide icone={MapPinned} titre={(liste.data || []).length ? 'Aucune province ne correspond' : 'Aucune province'} />
        ) : (
          <Tableau colonnes={[{ titre: 'Province' }, { titre: 'Orientation' }, { titre: 'Ajoutée le' }, { titre: 'Actions', cache: true }]}>
            {affichees.map((p) => (
              <tr key={p.id}>
                <td className="font-bold">{p.nom}</td>
                <td className="font-semibold">{p.orientation}</td>
                <td className="font-semibold tabular-nums text-encre-douce">{p.date_creation ? String(p.date_creation).slice(0, 10).split('-').reverse().join('/') : '—'}</td>
                <td className="whitespace-nowrap text-right">
                  <span className="inline-flex gap-2">
                    <Bouton variante="secondaire" compact icone={Pencil} onClick={() => { setErreur(''); setEdition({ id: p.id, nom: p.nom, orientation: p.orientation }); }}>
                      Modifier
                    </Bouton>
                    <Bouton variante="danger" compact icone={Trash2} onClick={() => setASupprimer(p)}>
                      Supprimer
                    </Bouton>
                  </span>
                </td>
              </tr>
            ))}
          </Tableau>
        )}
      </Carte>

      <Tiroir
        ouvert={!!edition}
        titre={edition?.id ? 'Modifier la province' : 'Ajouter une province'}
        onFermer={() => setEdition(null)}
        pied={
          <>
            <Bouton variante="secondaire" onClick={() => setEdition(null)} disabled={occupe}>Annuler</Bouton>
            <Bouton type="submit" form="form-province" chargement={occupe} className="ml-auto">Enregistrer</Bouton>
          </>
        }
      >
        {edition && (
          <form id="form-province" onSubmit={enregistrer} className="flex flex-col gap-4">
            <Champ libelle="Nom de la province" value={edition.nom} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} placeholder="Ex. : Antsirabe" autoFocus />
            <Selecteur libelle="Orientation" aide="Région de Madagascar où se trouve la province" value={edition.orientation} onChange={(e) => setEdition({ ...edition, orientation: e.target.value })}>
              {ORIENTATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </Selecteur>
            {erreur && <p className="m-0 rounded-champ bg-danger-fond px-3 py-2 text-[13.5px] font-bold text-danger" role="alert">{erreur}</p>}
          </form>
        )}
      </Tiroir>

      <Dialogue ouvert={!!aSupprimer} titre={`Supprimer ${aSupprimer?.nom || ''} ?`} confirmer="Supprimer" danger chargement={occupe} onConfirmer={supprimer} onFermer={() => setASupprimer(null)}>
        Une province utilisée par un trajet ne peut pas être supprimée.
      </Dialogue>
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
    </div>
  );
}
