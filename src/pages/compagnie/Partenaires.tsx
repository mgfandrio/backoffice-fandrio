import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Handshake, Info, Plus, Search } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Carte, Dialogue, Erreur, Pastille, Squelette, Vide } from '@/components/ui';
import { Tableau } from '@/components/tableau';
import { initiales, pluriel } from '@/utils/format';

/**
 * Compagnies partenaires : elles accueillent les voitures de la compagnie à
 * destination (liste des voyageurs au départ, confirmation de l'arrivée).
 * Lien réciproque, actif dès l'ajout ; au moins un partenaire doit rester.
 */
export default function Partenaires() {
  const queryClient = useQueryClient();
  const [saisie, setSaisie] = useState('');
  const [recherche, setRecherche] = useState('');
  const [ajout, setAjout] = useState<any>(null);
  const [retrait, setRetrait] = useState<any>(null);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setRecherche(saisie.trim()), 300);
    return () => window.clearTimeout(t);
  }, [saisie]);

  const partenaires = useQuery({ queryKey: ['partenaires'], queryFn: async () => ((await obtenir('/api/adminCompagnie/partenaires')).data || []) as any[] });
  const disponibles = useQuery({
    queryKey: ['partenaires', 'disponibles', recherche],
    queryFn: async () => ((await obtenir('/api/adminCompagnie/partenaires/disponibles', recherche ? { recherche } : {})).data || []) as any[],
  });
  const liste = partenaires.data || [];

  const ajouter = async () => {
    setEnvoi(true);
    try {
      await api.post('/api/adminCompagnie/partenaires', { comp_id: ajout.id });
      queryClient.invalidateQueries({ queryKey: ['partenaires'] });
      setMessage({ titre: 'Partenaire ajouté', texte: `${ajout.nom} pourra être choisie comme compagnie de réception pour vos voyages vers ${ajout.province?.nom || 'sa province'}. Elle a été prévenue.` });
    } catch (e) {
      setMessage({ titre: 'Partenaire non ajouté', texte: messageErreur(e) });
    } finally {
      setEnvoi(false);
      setAjout(null);
    }
  };
  const retirer = async () => {
    setEnvoi(true);
    try {
      await api.delete(`/api/adminCompagnie/partenaires/${retrait.id}`);
      queryClient.invalidateQueries({ queryKey: ['partenaires'] });
    } catch (e) {
      setMessage({ titre: 'Partenaire non retiré', texte: messageErreur(e) });
    } finally {
      setEnvoi(false);
      setRetrait(null);
    }
  };

  const Logo = ({ c }: { c: any }) =>
    c.logo ? <img src={c.logo} alt="" className="h-9 w-9 rounded-[10px] object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-ocean-50 text-[13px] font-extrabold text-ocean-800">{initiales(c.nom)}</span>;

  return (
    <div className="flex flex-col gap-4 p-4 sm:px-7 sm:py-6">
      <div className="flex gap-3 rounded-carte border border-ocean-100 bg-ocean-50 p-4 text-ocean-800">
        <Info className="mt-0.5 h-5 w-5 flex-none" aria-hidden />
        <p className="m-0 text-[14px] font-semibold leading-relaxed">
          En planifiant un voyage, vous choisissez la compagnie partenaire située dans la province d’arrivée. Au départ de la voiture, elle reçoit le véhicule, le chauffeur et la liste des voyageurs, puis confirme l’arrivée.
        </p>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Carte className="overflow-hidden">
          <div className="border-b border-separateur px-5 py-4">
            <h2 className="m-0 text-base font-extrabold">Mes partenaires</h2>
            <p className="m-0 mt-0.5 text-[13px] font-semibold text-encre-douce">{pluriel(liste.length, 'compagnie')}</p>
          </div>
          {partenaires.isLoading ? (
            <div className="p-4">
              <Squelette className="h-32" />
            </div>
          ) : partenaires.isError ? (
            <div className="p-4">
              <Erreur message={messageErreur(partenaires.error)} onReessayer={() => partenaires.refetch()} />
            </div>
          ) : liste.length === 0 ? (
            <Vide icone={Handshake} titre="Aucune compagnie partenaire">
              Ajoutez au moins une compagnie (colonne de droite) pour suivre vos voitures jusqu’à destination.
            </Vide>
          ) : (
            <Tableau colonnes={[{ titre: 'Compagnie' }, { titre: 'Province' }, { titre: 'Téléphone' }, { titre: 'Action', cache: true }]}>
              {liste.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="flex items-center gap-3">
                      <Logo c={c} />
                      <span>
                        <b className="block">{c.nom}</b>
                        {c.ajoute_par === 'partenaire' && <Pastille libelle="Vous a ajoutée" tonalite="info" point={false} />}
                        {c.ajoute_par === 'admin' && <Pastille libelle="Ajoutée par FANDRIO" tonalite="neutre" point={false} />}
                      </span>
                    </span>
                  </td>
                  <td className="font-semibold">{c.province?.nom || '—'}</td>
                  <td className="font-semibold tabular-nums">{c.telephone || '—'}</td>
                  <td className="text-right">
                    <Bouton
                      variante="danger"
                      compact
                      onClick={() =>
                        liste.length <= 1
                          ? setMessage({ titre: 'Dernier partenaire', texte: 'Votre compagnie doit garder au moins une compagnie partenaire. Ajoutez-en une autre avant de retirer celle-ci.' })
                          : setRetrait(c)
                      }
                    >
                      Retirer
                    </Bouton>
                  </td>
                </tr>
              ))}
            </Tableau>
          )}
        </Carte>

        <Carte className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-separateur px-5 py-4">
            <h2 className="m-0 text-base font-extrabold">Ajouter une compagnie</h2>
            <span className="flex h-11 items-center gap-2 rounded-champ border-[1.5px] border-champ bg-white px-3 focus-within:border-ocean-800">
              <Search className="h-4 w-4 text-encre-douce" aria-hidden />
              <input value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="Nom de la compagnie ou province" aria-label="Rechercher une compagnie" className="min-w-0 flex-1 border-0 bg-transparent text-[14px] font-semibold outline-none placeholder:text-gris-clair" />
            </span>
          </div>
          {disponibles.isLoading ? (
            <div className="p-4">
              <Squelette className="h-32" />
            </div>
          ) : (disponibles.data || []).length === 0 ? (
            <Vide icone={Search} titre={recherche ? 'Aucune compagnie trouvée' : 'Aucune autre compagnie à ajouter'}>
              Seules les compagnies actives sur FANDRIO peuvent être ajoutées.
            </Vide>
          ) : (
            <Tableau colonnes={[{ titre: 'Compagnie' }, { titre: 'Province' }, { titre: 'Action', cache: true }]}>
              {(disponibles.data || []).map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="flex items-center gap-3">
                      <Logo c={c} />
                      <b>{c.nom}</b>
                    </span>
                  </td>
                  <td className="font-semibold">{c.province?.nom || '—'}</td>
                  <td className="text-right">
                    <Bouton compact icone={Plus} onClick={() => setAjout(c)}>
                      Ajouter
                    </Bouton>
                  </td>
                </tr>
              ))}
            </Tableau>
          )}
        </Carte>
      </div>

      <Dialogue ouvert={!!ajout} titre={`Ajouter ${ajout?.nom || ''} ?`} confirmer="Ajouter" chargement={envoi} onConfirmer={ajouter} onFermer={() => setAjout(null)}>
        Le lien est réciproque et actif tout de suite : vous recevrez le suivi de ses voitures vers votre province, et elle celui des vôtres vers la sienne.
      </Dialogue>
      <Dialogue ouvert={!!retrait} titre={`Retirer ${retrait?.nom || ''} ?`} confirmer="Retirer" danger chargement={envoi} onConfirmer={retirer} onFermer={() => setRetrait(null)}>
        Vous ne recevrez plus le suivi de ses voitures et elle ne recevra plus celui des vôtres. Vos voyages pas encore partis vers {retrait?.province?.nom || 'sa province'} n’auront plus de compagnie de réception.
      </Dialogue>
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
    </div>
  );
}
