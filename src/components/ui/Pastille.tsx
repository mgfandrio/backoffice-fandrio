export type Tonalite = 'succes' | 'alerte' | 'danger' | 'info' | 'neutre' | 'marine';

const TONS: Record<Tonalite, string> = {
  succes: 'bg-succes-fond text-succes',
  alerte: 'bg-alerte-fond text-alerte',
  danger: 'bg-danger-fond text-danger',
  info: 'bg-ocean-50 text-ocean-800',
  neutre: 'bg-neutre-fond text-neutre',
  marine: 'bg-ocean-950 text-white',
};

/** Pastille de statut (même code couleur que l'app mobile). */
export function Pastille({ libelle, tonalite = 'info', point = true }: { libelle: string; tonalite?: Tonalite; point?: boolean }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-bold ${TONS[tonalite]}`}>
      {point && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {libelle}
    </span>
  );
}
