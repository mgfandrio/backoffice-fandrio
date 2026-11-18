import { ReactNode, useEffect, useRef } from 'react';
import { Bouton } from './Bouton';

interface Props {
  ouvert: boolean;
  titre: string;
  children?: ReactNode;
  confirmer?: string;
  annuler?: string;
  danger?: boolean;
  chargement?: boolean;
  onConfirmer?: () => void;
  onFermer: () => void;
}

/**
 * Fenêtre de confirmation (élément <dialog> natif : clavier, Échap et focus
 * gérés par le navigateur). Sans `onConfirmer`, un seul bouton « OK ».
 */
export function Dialogue({ ouvert, titre, children, confirmer = 'Confirmer', annuler = 'Annuler', danger, chargement, onConfirmer, onFermer }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ouvert && !d.open) d.showModal();
    if (!ouvert && d.open) d.close();
  }, [ouvert]);

  return (
    <dialog
      ref={ref}
      onClose={onFermer}
      onCancel={(e) => {
        e.preventDefault();
        if (!chargement) onFermer();
      }}
      className="w-[min(440px,calc(100vw-32px))] rounded-[20px] border-0 bg-white p-0 text-encre shadow-2xl backdrop:bg-ocean-950/50"
    >
      <div className="flex flex-col gap-3 p-6">
        <h2 className="m-0 text-lg font-extrabold">{titre}</h2>
        {children && <div className="text-sm font-semibold leading-relaxed text-encre-douce">{children}</div>}
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          {onConfirmer ? (
            <>
              <Bouton variante="secondaire" onClick={onFermer} disabled={chargement}>
                {annuler}
              </Bouton>
              <Bouton variante={danger ? 'danger' : 'principal'} onClick={onConfirmer} chargement={chargement} autoFocus>
                {confirmer}
              </Bouton>
            </>
          ) : (
            <Bouton onClick={onFermer} autoFocus>
              OK
            </Bouton>
          )}
        </div>
      </div>
    </dialog>
  );
}
