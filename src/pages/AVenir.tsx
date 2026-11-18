import { useLocation } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { entreeDe } from '@/navigation/menus';
import { Carte } from '@/components/ui';

/** Écran prévu à une étape suivante : il reste disponible dans l'app mobile en attendant. */
export default function AVenir() {
  const { utilisateur } = useAuth();
  const { pathname } = useLocation();
  const e = entreeDe(utilisateur?.role, pathname);
  return (
    <div className="p-4 sm:p-7">
      <Carte className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ocean-50 text-ocean-800">
          {e ? <e.icone className="h-7 w-7" aria-hidden /> : <Smartphone className="h-7 w-7" aria-hidden />}
        </span>
        <h2 className="m-0 text-xl font-extrabold">{e?.libelle || 'Écran en préparation'}</h2>
        {e?.contenu && <p className="m-0 max-w-md text-sm font-semibold leading-relaxed text-encre-douce">{e.contenu}</p>}
        <p className="m-0 text-[13px] font-semibold text-gris">
          {e?.etape ? `Arrive à l’étape ${e.etape} du back-office.` : 'En préparation.'} En attendant, cette fonction est disponible dans l’application mobile.
        </p>
      </Carte>
    </div>
  );
}
