import { useState } from 'react';
import { Copy, KeyRound } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { Bouton, Dialogue } from '@/components/ui';

/**
 * Admin système : donne un mot de passe provisoire à un client ou à un admin
 * compagnie qui a perdu le sien. Affiché une seule fois ; la personne choisit
 * son mot de passe personnel à la connexion suivante.
 */
export function MotDePasseProvisoire({ utilisateurId, nom, compact = false }: { utilisateurId: number; nom: string; compact?: boolean }) {
  const [confirmer, setConfirmer] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const creer = async () => {
    setEnvoi(true);
    try {
      const r = await api.post(`/api/admin/utilisateurs/${utilisateurId}/mot-de-passe-provisoire`);
      setCode(r.data?.data?.mot_de_passe_provisoire || null);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoi(false);
      setConfirmer(false);
    }
  };

  return (
    <>
      <Bouton variante="secondaire" compact={compact} icone={KeyRound} onClick={() => setConfirmer(true)}>
        Mot de passe provisoire
      </Bouton>
      <Dialogue ouvert={confirmer} titre={`Nouveau mot de passe pour ${nom} ?`} confirmer="Créer le mot de passe" chargement={envoi} onConfirmer={creer} onFermer={() => setConfirmer(false)}>
        Son mot de passe actuel ne fonctionnera plus. Il devra choisir le sien à sa prochaine connexion, sur le web comme sur mobile. Vérifiez son identité avant de lui communiquer le mot de passe.
      </Dialogue>
      <Dialogue ouvert={!!code} titre={`Mot de passe provisoire de ${nom}`} onFermer={() => setCode(null)}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex-1 rounded-xl border-[1.5px] border-dashed border-succes bg-succes-fond px-4 py-3 text-center text-[24px] font-extrabold tracking-[0.12em] tabular-nums text-ocean-950">{code}</span>
            <Bouton variante="secondaire" icone={Copy} onClick={() => code && navigator.clipboard?.writeText(code)}>
              Copier
            </Bouton>
          </div>
          <p className="m-0 text-[12.5px] font-bold text-alerte">Ce mot de passe ne sera plus affiché ensuite.</p>
        </div>
      </Dialogue>
      <Dialogue ouvert={!!erreur} titre="Action impossible" onFermer={() => setErreur(null)}>
        {erreur}
      </Dialogue>
    </>
  );
}
