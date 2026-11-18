import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ariary } from '@/utils/format';

export interface DonneesRapportPlateforme {
  periode: string;
  filtres: string;
  resume: any;
}

/** Rapport A4 imprimable du chiffre d'affaires de la plateforme. */
export function ImpressionRapportPlateforme({ rapport, onTermine }: { rapport: DonneesRapportPlateforme | null; onTermine: () => void }) {
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
  const t = rapport.resume.totaux;
  const th = 'border-b border-black px-2 py-1.5 text-left text-[11px] font-bold uppercase';
  const td = 'border-b border-gray-300 px-2 py-1.5 text-[12px]';
  const actives = (rapport.resume.par_compagnie || []).filter((c: any) => c.en_ligne + c.guichet > 0 || c.a_encaisser > 0);

  return createPortal(
    <div id="zone-impression">
      <div className="w-[190mm] bg-white p-[10mm] font-sans text-black">
        <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
          <div>
            <b className="block text-[20px]">FANDRIO</b>
            <span className="block text-[14px] font-bold">Chiffre d’affaires de la plateforme {rapport.periode}</span>
            <span className="block text-[11.5px] font-semibold">{rapport.filtres}</span>
          </div>
          <span className="text-right text-[11.5px] font-semibold">Édité le {new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <table className="mt-4 w-full border-collapse text-[13px]">
          <tbody>
            {[
              ['Ventes en ligne', ariary(t.en_ligne)],
              [`Commission FANDRIO (${rapport.resume.taux_commission} %)`, ariary(t.commission), true],
              ['Commission encaissée sur la période', ariary(t.encaisse)],
              ['Reste à encaisser (toutes périodes)', `${ariary(t.a_encaisser)}${t.en_retard ? ` (dont ${ariary(t.en_retard)} en retard)` : ''}`],
              ['Ventes au guichet (pour information)', ariary(t.guichet)],
            ].map(([l, v, g]) => (
              <tr key={String(l)} className={g ? 'font-bold' : ''}>
                <td className="border-b border-gray-300 py-1.5">{l}</td>
                <td className="border-b border-gray-300 py-1.5 text-right tabular-nums">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="mb-1 mt-5 text-[14px] font-bold">Par compagnie</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Compagnie</th>
              <th className={`${th} text-right`}>En ligne</th>
              <th className={`${th} text-right`}>Guichet</th>
              <th className={`${th} text-right`}>Commission</th>
              <th className={`${th} text-right`}>À encaisser</th>
            </tr>
          </thead>
          <tbody>
            {actives.map((c: any) => (
              <tr key={c.comp_id}>
                <td className={td}>{c.nom}{c.suspendu ? ' (suspendue)' : ''}</td>
                <td className={`${td} text-right tabular-nums`}>{ariary(c.en_ligne)}</td>
                <td className={`${td} text-right tabular-nums`}>{ariary(c.guichet)}</td>
                <td className={`${td} text-right font-bold tabular-nums`}>{ariary(c.commission)}</td>
                <td className={`${td} text-right tabular-nums`}>{c.a_encaisser ? ariary(c.a_encaisser) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>,
    document.body
  );
}
