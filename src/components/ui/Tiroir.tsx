import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Panneau latéral (détail d'un élément sans quitter la liste). Fermeture : croix,
 * clic à côté ou touche Échap. Élément <dialog> natif : focus et clavier gérés.
 */
export function Tiroir({ ouvert, titre, sousTitre, onFermer, children, pied }: { ouvert: boolean; titre: string; sousTitre?: string; onFermer: () => void; children: ReactNode; pied?: ReactNode }) {
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
      onClick={(e) => {
        if (e.target === ref.current) onFermer();
      }}
      className="m-0 ml-auto h-full max-h-none w-[min(720px,100vw)] max-w-none border-0 bg-fond p-0 text-encre backdrop:bg-ocean-950/40"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start gap-3 border-b border-ligne bg-white px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="m-0 text-lg font-extrabold">{titre}</h2>
            {sousTitre && <p className="m-0 mt-0.5 text-[13.5px] font-semibold text-encre-douce">{sousTitre}</p>}
          </div>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-encre-douce hover:bg-fond">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {pied && <div className="flex flex-wrap gap-2 border-t border-ligne bg-white px-5 py-3">{pied}</div>}
      </div>
    </dialog>
  );
}
