import { ReactNode } from 'react';
import { CloudOff, LucideIcon, RefreshCw } from 'lucide-react';
import { Bouton } from './Bouton';
import { Carte } from './Carte';

/** Bloc gris animé pendant le chargement. */
export function Squelette({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-carte bg-separateur ${className}`} aria-hidden />;
}

export function Erreur({ message, onReessayer }: { message: string; onReessayer?: () => void }) {
  return (
    <Carte className="flex flex-col items-center gap-2 px-6 py-6 text-center" role="alert">
      <CloudOff className="h-8 w-8 text-danger" aria-hidden />
      <p className="m-0 text-sm font-semibold text-gris">{message}</p>
      {onReessayer && (
        <Bouton variante="secondaire" compact icone={RefreshCw} onClick={onReessayer}>
          Réessayer
        </Bouton>
      )}
    </Carte>
  );
}

export function Vide({ icone: Icone, titre, children }: { icone: LucideIcon; titre: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-8 text-center">
      <Icone className="h-8 w-8 text-gris-clair" aria-hidden />
      <p className="m-0 text-[15px] font-extrabold text-encre">{titre}</p>
      {children && <div className="text-[13px] font-semibold text-gris">{children}</div>}
    </div>
  );
}
