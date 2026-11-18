import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ariary, nombre } from '@/utils/format';

export interface DonneesRapport {
  compagnie: string;
  periode: string; // « du 01/11/2026 au 18/11/2026 »
  filtres: string;
  resume: any;
}

/** Rapport A4 imprimable du chiffre d'affaires (résumé et tableaux). */
export function ImpressionRapport({ rapport, onTermine }: { rapport: DonneesRapport | null; onTermine: () => void }) {
  useEffect(() => {
    if (!rapport) return;
    const fin = () => onTermine();
    window.addEventListener('afterprint', fin, { once: true });
    const t = window.setTimeout(() => window.print(), 100);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', fin);
    };
  }, [rapport, onTermine]);

  if (!rapport) return null;
  const { totaux: t, remboursements: r, taux_commission } = rapport.resume;
  const th = 'border-b border-black px-2 py-1.5 text-left text-[11px] font-bold uppercase';
  const td = 'border-b border-gray-300 px-2 py-1.5 text-[12px]';

  return createPortal(
    <div id="zone-impression">
      <div className="w-[190mm] bg-white p-[10mm] font-sans text-black">
        <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
          <div>
            <b className="block text-[20px]">{rapport.compagnie}</b>
            <span className="block text-[14px] font-bold">Chiffre d’affaires {rapport.periode}</span>
            <span className="block text-[11.5px] font-semibold">{rapport.filtres}</span>
          </div>
          <div className="text-right text-[11.5px] font-semibold">
            <span className="block">FANDRIO</span>
            <span className="block">Édité le {new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        <table className="mt-4 w-full border-collapse text-[13px]">
          <tbody>
            {[
              ['Ventes au guichet', ariary(t.guichet)],
              ['Ventes en ligne', ariary(t.en_ligne)],
              ['Ventes totales', ariary(t.brut), true],
              [`Commission FANDRIO (${taux_commission} % des ventes en ligne)`, `− ${ariary(t.commission)}`],
              ['Net pour la compagnie', ariary(t.net), true],
            ].map(([l, v, g]) => (
              <tr key={String(l)} className={g ? 'font-bold' : ''}>
                <td className="border-b border-gray-300 py-1.5">{l}</td>
                <td className="border-b border-gray-300 py-1.5 text-right tabular-nums">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11.5px]">
          {nombre(t.billets)} billets vendus ({nombre(t.billets_guichet)} au guichet, {nombre(t.billets_en_ligne)} en ligne) sur {nombre(t.voyages)} voyages. Remboursé aux clients : {ariary(r.montant)} ({r.nb}), non compté dans les ventes.
        </p>

        <h2 className="mb-1 mt-5 text-[14px] font-bold">Par trajet</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Trajet</th>
              <th className={`${th} text-right`}>Voyages</th>
              <th className={`${th} text-right`}>Billets</th>
              <th className={`${th} text-right`}>Guichet</th>
              <th className={`${th} text-right`}>En ligne</th>
              <th className={`${th} text-right`}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(rapport.resume.par_trajet || []).map((x: any) => (
              <tr key={x.traj_id}>
                <td className={td}>{x.trajet}</td>
                <td className={`${td} text-right tabular-nums`}>{x.voyages}</td>
                <td className={`${td} text-right tabular-nums`}>{x.billets}</td>
                <td className={`${td} text-right tabular-nums`}>{ariary(x.guichet)}</td>
                <td className={`${td} text-right tabular-nums`}>{ariary(x.en_ligne)}</td>
                <td className={`${td} text-right font-bold tabular-nums`}>{ariary(x.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5 grid grid-cols-2 gap-6">
          <div>
            <h2 className="mb-1 text-[14px] font-bold">Moyens de paiement</h2>
            <table className="w-full border-collapse">
              <tbody>
                {(rapport.resume.par_paiement || []).map((x: any) => (
                  <tr key={x.nom}>
                    <td className={td}>{x.nom}</td>
                    <td className={`${td} text-right tabular-nums`}>{ariary(x.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h2 className="mb-1 text-[14px] font-bold">Guichet par vendeur</h2>
            <table className="w-full border-collapse">
              <tbody>
                {(rapport.resume.par_vendeur || []).map((x: any) => (
                  <tr key={x.util_id}>
                    <td className={td}>{x.nom}</td>
                    <td className={`${td} text-right tabular-nums`}>{x.billets} billets</td>
                    <td className={`${td} text-right tabular-nums`}>{ariary(x.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
