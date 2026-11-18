import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ariary } from '@/utils/format';

export interface DonneesBon {
  compagnie: string;
  vendeur: string;
  date: string; // AAAA-MM-JJ
  cloture: { attendu: number; compte: number; ecart: number; nb_ventes: number; nb_billets: number; billetage: Record<string, number> | null; note: string | null; par: string | null; le: string };
}

/** Bon de clôture de caisse, ticket 80 mm (même imprimante que les billets). */
export function ImpressionBon({ bon, onTermine }: { bon: DonneesBon | null; onTermine: () => void }) {
  useEffect(() => {
    if (!bon) return;
    const fin = () => onTermine();
    window.addEventListener('afterprint', fin, { once: true });
    const t = window.setTimeout(() => window.print(), 100);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', fin);
    };
  }, [bon, onTermine]);

  if (!bon) return null;
  const c = bon.cloture;
  const ligne = 'flex justify-between gap-2.5 text-[12.5px]';
  const trait = <hr className="m-0 border-0 border-t-[1.5px] border-dashed border-black" />;
  const billets = Object.entries(c.billetage || {}).sort((a, b) => Number(b[0]) - Number(a[0]));

  return createPortal(
    <div id="zone-impression">
      <div className="flex w-[72mm] flex-col gap-2.5 bg-white p-[3mm] font-sans text-black">
        <div className="flex flex-col gap-0.5 text-center">
          <b className="text-[19px] tracking-[0.08em]">FANDRIO</b>
          <b className="text-[14px]">{bon.compagnie}</b>
        </div>
        {trait}
        <div className="text-center text-[11px] font-extrabold tracking-[0.1em]">CLÔTURE DE CAISSE</div>
        <div className="flex flex-col gap-1">
          <div className={ligne}><span>Jour</span><b>{bon.date.split('-').reverse().join('/')}</b></div>
          <div className={ligne}><span>Vendeur</span><b>{bon.vendeur}</b></div>
          <div className={ligne}><span>Ventes</span><b>{c.nb_ventes} ({c.nb_billets} billets)</b></div>
        </div>
        {trait}
        {billets.length > 0 && (
          <>
            <div className="flex flex-col gap-0.5">
              {billets.map(([v, n]) => (
                <div key={v} className={ligne}>
                  <span>{n} × {ariary(Number(v))}</span>
                  <span>{ariary(Number(v) * n)}</span>
                </div>
              ))}
            </div>
            {trait}
          </>
        )}
        <div className="flex flex-col gap-1">
          <div className={ligne}><span>Espèces attendues</span><b>{ariary(c.attendu)}</b></div>
          <div className={ligne}><span>Espèces comptées</span><b>{ariary(c.compte)}</b></div>
          <div className="flex justify-between gap-2.5 text-[14px] font-extrabold">
            <span>Écart</span>
            <span>{c.ecart > 0 ? '+ ' : c.ecart < 0 ? '− ' : ''}{ariary(Math.abs(c.ecart))}</span>
          </div>
          {c.note && <div className="text-[11.5px]">Remarque : {c.note}</div>}
        </div>
        {trait}
        <div className="flex flex-col gap-0.5 text-[11px]">
          <span>Clôturée le {c.le.slice(0, 10).split('-').reverse().join('/')} à {c.le.slice(11, 16)}{c.par ? ` par ${c.par}` : ''}</span>
          <span className="mt-5">Signature du vendeur : ....................</span>
          <span className="mt-4">Signature du responsable : ..............</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
