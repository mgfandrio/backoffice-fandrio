import { SearchX } from 'lucide-react';
import { accueilDe, useAuth } from '@/auth/AuthContext';
import { Bouton, Carte } from '@/components/ui';

export default function Introuvable() {
  const { utilisateur } = useAuth();
  return (
    <div className="p-4 sm:p-7">
      <Carte className="mx-auto flex max-w-lg flex-col items-center gap-3 px-6 py-10 text-center">
        <SearchX className="h-9 w-9 text-gris-clair" aria-hidden />
        <h2 className="m-0 text-xl font-extrabold">Page introuvable</h2>
        <p className="m-0 text-sm font-semibold text-gris">Cette adresse ne correspond à aucun écran du back-office.</p>
        <Bouton vers={utilisateur ? accueilDe(utilisateur) : '/connexion'}>Retour à l’accueil</Bouton>
      </Carte>
    </div>
  );
}
