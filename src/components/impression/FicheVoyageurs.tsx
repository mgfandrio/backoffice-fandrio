import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/** Données de la fiche voyageurs (liste remise au chauffeur pour les contrôles routiers). */
export interface DonneesFiche {
  compagnie: string;
  trajet: string;
  date: string;
  heure: string;
  vehicule?: string | null;
  chauffeur?: string | null;
  voyageurs: { nom: string; prenom?: string | null; cin?: string | null; phone?: string | null; siege: string | number; age?: number | null; reservation_numero?: string | null }[];
}

/** Fiche A4 imprimable (même contenu que le PDF de l'app mobile). */
export function ImpressionFiche({ fiche, onTermine }: { fiche: DonneesFiche | null; onTermine: () => void }) {
  useEffect(() => {
    if (!fiche) return;
    const fin = () => onTermine();
    window.addEventListener('afterprint', fin, { once: true });
    const t = window.setTimeout(() => window.print(), 100);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', fin);
    };
  }, [fiche, onTermine]);

  if (!fiche) return null;
  const genere = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const tries = [...fiche.voyageurs].sort((a, b) => Number(a.siege) - Number(b.siege));
  return createPortal(
    <div id="zone-impression">
      <div className="w-[190mm] bg-white p-[10mm] font-sans text-black">
        <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
          <div>
            <b className="block text-[20px]">{fiche.compagnie}</b>
            <span className="block text-[13px] font-semibold">Fiche voyageurs</span>
            <span className="block text-[11.5px] font-semibold">Document destiné au chauffeur pour les contrôles routiers</span>
          </div>
          <div className="text-right text-[12px] font-semibold">
            <span className="block">FANDRIO</span>
            <span className="block">Éditée le {genere}</span>
          </div>
        </div>
        <div className="my-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
          <span>
            Trajet : <b>{fiche.trajet}</b>
          </span>
          <span>
            Départ : <b>{fiche.date} à {fiche.heure.slice(0, 5)}</b>
          </span>
          <span>
            Véhicule : <b>{fiche.vehicule || '—'}</b>
          </span>
          <span>
            Chauffeur : <b>{fiche.chauffeur || '—'}</b>
          </span>
          <span>
            Nombre de voyageurs : <b>{tries.length}</b>
          </span>
        </div>
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr>
              {['N°', 'Nom et prénom', 'CIN', 'Téléphone', 'Siège', 'Âge', 'Billet'].map((t) => (
                <th key={t} className="border border-black bg-[#EEEEEE] px-2 py-1.5 text-left font-bold">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tries.map((v, i) => (
              <tr key={`${v.reservation_numero}-${v.siege}`}>
                <td className="border border-black px-2 py-1.5 text-center">{i + 1}</td>
                <td className="border border-black px-2 py-1.5 font-bold">{`${v.prenom || ''} ${v.nom}`.trim()}</td>
                <td className="border border-black px-2 py-1.5">{v.cin || '—'}</td>
                <td className="border border-black px-2 py-1.5">{v.phone || '—'}</td>
                <td className="border border-black px-2 py-1.5 text-center font-bold">{v.siege}</td>
                <td className="border border-black px-2 py-1.5 text-center">{v.age ? `${v.age} ans` : '—'}</td>
                <td className="border border-black px-2 py-1.5">{v.reservation_numero || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-10 grid grid-cols-2 gap-10 text-[12px] font-semibold">
          <span className="border-t border-black pt-1.5">Signature du chauffeur</span>
          <span className="border-t border-black pt-1.5">Cachet de la compagnie</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
