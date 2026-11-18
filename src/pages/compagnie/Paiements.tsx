import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Info } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Carte, Champ, Dialogue, Squelette } from '@/components/ui';

/** Modes de paiement : opérateurs acceptés et numéros qui reçoivent l'argent des clients. */

const OPERATEURS = [
  { id: 2, nom: 'MVola', initiales: 'MV', prefixes: ['034', '038'] },
  { id: 1, nom: 'Orange Money', initiales: 'OM', prefixes: ['032', '037'] },
  { id: 3, nom: 'Airtel Money', initiales: 'AM', prefixes: ['033'] },
];
type Mode = { actif: boolean; numero: string; titulaire: string };

function erreurNumero(o: (typeof OPERATEURS)[number], numero: string) {
  const n = numero.replace(/\s/g, '');
  if (!n) return undefined;
  if (n.length !== 10) return 'Le numéro doit avoir 10 chiffres.';
  if (!o.prefixes.some((p) => n.startsWith(p))) return `Un numéro ${o.nom} commence par ${o.prefixes.join(' ou ')}.`;
  return undefined;
}

export default function Paiements() {
  const queryClient = useQueryClient();
  const vide = () => Object.fromEntries(OPERATEURS.map((o) => [o.id, { actif: false, numero: '', titulaire: '' }])) as Record<number, Mode>;
  const [modes, setModes] = useState<Record<number, Mode>>(vide);
  const [initial, setInitial] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);

  const compagnie = useQuery({ queryKey: ['ma-compagnie'], queryFn: async () => (await obtenir('/api/adminCompagnie/ma-compagnie')).data });
  useEffect(() => {
    const acceptes: any[] = compagnie.data?.modes_paiement_acceptes || [];
    if (!compagnie.data) return;
    const suivant = Object.fromEntries(
      OPERATEURS.map((o) => {
        const m = acceptes.find((a) => Number(a.id) === o.id);
        return [o.id, { actif: !!m, numero: m?.numero || '', titulaire: m?.titulaire || '' }];
      })
    ) as Record<number, Mode>;
    setModes(suivant);
    setInitial(JSON.stringify(suivant));
  }, [compagnie.data]);

  const maj = (id: number, champ: Partial<Mode>) => setModes((m) => ({ ...m, [id]: { ...m[id], ...champ } }));
  const actifs = OPERATEURS.filter((o) => modes[o.id]?.actif);
  const modifie = JSON.stringify(modes) !== initial;

  const enregistrer = async () => {
    for (const o of actifs) {
      const m = modes[o.id];
      if (!m.numero.trim() || !m.titulaire.trim()) return setMessage({ titre: 'Informations manquantes', texte: `Indiquez le numéro et le titulaire du compte ${o.nom}.` });
      const e = erreurNumero(o, m.numero);
      if (e) return setMessage({ titre: 'Numéro invalide', texte: e });
    }
    setEnvoi(true);
    try {
      await api.put('/api/adminCompagnie/update-paiements', {
        modes_paiement: actifs.map((o) => ({ id: o.id, numero: modes[o.id].numero.replace(/\s/g, ''), titulaire: modes[o.id].titulaire.trim() })),
      });
      setInitial(JSON.stringify(modes));
      queryClient.invalidateQueries({ queryKey: ['ma-compagnie'] });
      setMessage({ titre: 'Modes de paiement enregistrés', texte: 'Vos clients voient maintenant ces moyens de paiement.' });
    } catch (e) {
      setMessage({ titre: 'Enregistrement impossible', texte: messageErreur(e) });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 sm:px-7 sm:py-6">
      <div className="flex gap-3 rounded-carte border border-ocean-100 bg-ocean-50 p-4 text-ocean-800">
        <Info className="mt-0.5 h-5 w-5 flex-none" aria-hidden />
        <p className="m-0 text-[14px] font-semibold leading-relaxed">Cochez les opérateurs que vous acceptez et indiquez le numéro qui reçoit l’argent des clients, avec le nom du titulaire du compte.</p>
      </div>
      {compagnie.isLoading ? (
        [0, 1, 2].map((i) => <Squelette key={i} className="h-32" />)
      ) : (
        OPERATEURS.map((o) => {
          const m = modes[o.id];
          return (
            <Carte key={o.id} className={`flex flex-col gap-4 p-5 ${m.actif ? 'border-ocean-800 ring-2 ring-ocean-50' : ''}`}>
              <label className="flex cursor-pointer items-center gap-3">
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-ocean-50 text-[14px] font-extrabold text-ocean-800">{o.initiales}</span>
                <span className="flex-1">
                  <b className="block text-[16px]">{o.nom}</b>
                  <span className="text-[13px] font-semibold text-encre-douce">{m.actif ? 'Accepté' : 'Non accepté'}</span>
                </span>
                <input type="checkbox" checked={m.actif} onChange={(e) => maj(o.id, { actif: e.target.checked })} className="h-6 w-6 accent-ocean-800" aria-label={`Accepter ${o.nom}`} />
              </label>
              {m.actif && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Champ libelle="Numéro qui reçoit l’argent" type="tel" inputMode="numeric" value={m.numero} placeholder={`${o.prefixes[0]} 00 000 00`} erreur={erreurNumero(o, m.numero)} onChange={(e) => maj(o.id, { numero: e.target.value })} />
                  <Champ libelle="Nom du titulaire du compte" value={m.titulaire} onChange={(e) => maj(o.id, { titulaire: e.target.value })} />
                </div>
              )}
            </Carte>
          );
        })
      )}
      <div className="flex justify-end">
        <Bouton icone={Check} onClick={enregistrer} chargement={envoi} disabled={!modifie}>
          Enregistrer
        </Bouton>
      </div>
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
    </div>
  );
}
