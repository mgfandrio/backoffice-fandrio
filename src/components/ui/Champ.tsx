import { forwardRef, InputHTMLAttributes, ReactNode, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  libelle: string;
  erreur?: string;
  aide?: ReactNode;
}

/** Champ de saisie avec libellé, aide et message d'erreur (mot de passe : bouton afficher). */
export const Champ = forwardRef<HTMLInputElement, Props>(function Champ({ libelle, erreur, aide, type = 'text', className = '', ...reste }, ref) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const motDePasse = type === 'password';
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[12.5px] font-bold text-encre-douce">
        {libelle}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={motDePasse && visible ? 'text' : type}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={erreur ? `${id}-e` : aide ? `${id}-a` : undefined}
          className={`h-11 w-full rounded-champ border-[1.5px] bg-white px-3 text-sm font-semibold text-encre outline-none transition placeholder:text-gris-clair focus:border-ocean-800 focus:ring-4 focus:ring-ocean-50 ${
            erreur ? 'border-danger' : 'border-champ'
          } ${motDePasse ? 'pr-11' : ''}`}
          {...reste}
        />
        {motDePasse && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-lg text-gris hover:bg-fond"
          >
            {visible ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
          </button>
        )}
      </div>
      {erreur ? (
        <span id={`${id}-e`} className="text-xs font-bold text-danger">
          {erreur}
        </span>
      ) : (
        aide && (
          <span id={`${id}-a`} className="text-xs font-semibold text-gris">
            {aide}
          </span>
        )
      )}
    </div>
  );
});
