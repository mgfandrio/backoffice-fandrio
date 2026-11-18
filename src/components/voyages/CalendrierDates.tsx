import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dateISO } from '@/utils/format';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];

/**
 * Calendrier : un clic choisit ou retire un jour (plusieurs jours si `multiple`).
 * Les jours passés ne sont pas cliquables.
 */
export function CalendrierDates({ selection, onChange, multiple = true, max = 20 }: { selection: string[]; onChange: (dates: string[]) => void; multiple?: boolean; max?: number }) {
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  const premier = selection.length ? new Date(`${[...selection].sort()[0]}T00:00:00`) : auj;
  const [mois, setMois] = useState(new Date(premier.getFullYear(), premier.getMonth(), 1));

  const debut = new Date(mois);
  const decalage = (debut.getDay() + 6) % 7; // lundi en premier
  const nbJours = new Date(mois.getFullYear(), mois.getMonth() + 1, 0).getDate();
  const cases: (Date | null)[] = [...Array(decalage).fill(null), ...Array.from({ length: nbJours }, (_, i) => new Date(mois.getFullYear(), mois.getMonth(), i + 1))];
  const moisPasse = mois.getFullYear() < auj.getFullYear() || (mois.getFullYear() === auj.getFullYear() && mois.getMonth() <= auj.getMonth());

  const basculer = (d: Date) => {
    const iso = dateISO(d);
    if (selection.includes(iso)) onChange(selection.filter((x) => x !== iso));
    else if (!multiple) onChange([iso]);
    else if (selection.length < max) onChange([...selection, iso].sort());
  };

  return (
    <div className="rounded-carte border border-ligne bg-white p-3">
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() - 1, 1))}
          disabled={moisPasse}
          aria-label="Mois précédent"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-encre hover:bg-fond disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <b className="flex-1 text-center text-[15px] capitalize">
          {MOIS[mois.getMonth()]} {mois.getFullYear()}
        </b>
        <button type="button" onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() + 1, 1))} aria-label="Mois suivant" className="flex h-9 w-9 items-center justify-center rounded-lg text-encre hover:bg-fond">
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {JOURS.map((j) => (
          <span key={j} className="py-1 text-[11.5px] font-extrabold uppercase text-encre-douce">
            {j}
          </span>
        ))}
        {cases.map((d, i) => {
          if (!d) return <span key={`v${i}`} />;
          const iso = dateISO(d);
          const choisi = selection.includes(iso);
          const passe = d < auj;
          const aujourdhui = iso === dateISO(auj);
          const plein = multiple && !choisi && selection.length >= max;
          return (
            <button
              key={iso}
              type="button"
              disabled={passe || plein}
              aria-pressed={choisi}
              aria-label={d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              onClick={() => basculer(d)}
              className={`h-10 rounded-lg text-[14px] font-bold tabular-nums transition-colors disabled:cursor-not-allowed ${
                choisi ? 'bg-ocean-800 text-white' : passe ? 'text-gris-clair/60' : `text-encre hover:bg-ocean-50 ${aujourdhui ? 'ring-[1.5px] ring-inset ring-ocean-500' : ''}`
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
