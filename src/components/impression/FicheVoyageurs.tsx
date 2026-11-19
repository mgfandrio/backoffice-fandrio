import { useEffect } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Case, dispositionGrille, dispositionMinibus, GrillePlan } from '@/components/sieges/PlanSieges';

type Voyageur = { nom: string; prenom?: string | null; cin?: string | null; phone?: string | null; siege: string | number; age?: number | null; reservation_numero?: string | null };

/** Données de la fiche voyageurs (liste remise au chauffeur pour les contrôles routiers). */
export interface DonneesFiche {
  compagnie: string;
  trajet: string;
  date: string;
  heure: string;
  vehicule?: string | null;
  chauffeur?: string | null;
  voyageurs: Voyageur[];
  /** Plan de la voiture : codes des sièges et disposition dessinée (sinon disposition standard). */
  plan?: { codes: string[]; grille?: GrillePlan | null } | null;
}

/** Données de la fiche à partir des réponses /voyageurs et /plan-sieges de l'API. */
export function donneesFiche(compagnie: string, voyageurs: any, plan: any, repli: { trajet?: string; date?: string; heure?: string; vehicule?: string | null }): DonneesFiche {
  const v = voyageurs?.voyage || {};
  const voiture = plan?.voiture;
  return {
    compagnie,
    trajet: v.trajet || repli.trajet || '',
    date: v.date || repli.date || '',
    heure: String(v.heure || repli.heure || ''),
    vehicule: voiture ? `${voiture.matricule} (${[voiture.marque, voiture.modele].filter(Boolean).join(' ')})` : repli.vehicule || null,
    chauffeur: voiture?.chauffeur || null,
    voyageurs: voyageurs?.voyageurs || [],
    plan: plan?.plan ? { codes: plan.plan.map((s: any) => String(s.code)), grille: plan.grille || null } : null,
  };
}

const nomComplet = (v: Voyageur) => `${v.prenom || ''} ${v.nom || ''}`.trim();

/** En-tête commun aux deux pages. */
function Entete({ fiche, titre }: { fiche: DonneesFiche; titre: string }) {
  const genere = new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-3">
        <div>
          <b className="block text-[20px]">{fiche.compagnie}</b>
          <span className="block text-[13px] font-semibold">{titre}</span>
          <span className="block text-[11.5px] font-semibold">Document destiné au chauffeur pour les contrôles routiers</span>
        </div>
        <div className="text-right text-[12px] font-semibold">
          <span className="block">FANDRIO</span>
          <span className="block">Éditée le {genere}</span>
        </div>
      </div>
      <div className="my-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
        <span>Trajet : <b>{fiche.trajet}</b></span>
        <span>Départ : <b>{fiche.date} à {fiche.heure.slice(0, 5)}</b></span>
        <span>Véhicule : <b>{fiche.vehicule || '—'}</b></span>
        <span>Chauffeur : <b>{fiche.chauffeur || '—'}</b></span>
        <span>Nombre de voyageurs : <b>{fiche.voyageurs.length}</b></span>
      </div>
    </>
  );
}

/** Page 1 : plan de la voiture vu de dessus, avant en haut, nom du voyageur sur chaque siège. */
function PagePlan({ fiche }: { fiche: DonneesFiche }) {
  const plan = fiche.plan!;
  const rangees: Case[][] = plan.grille && plan.grille.length ? dispositionGrille(plan.grille) : dispositionMinibus([...plan.codes].sort((a, b) => Number(a) - Number(b)));
  const parSiege = new Map(fiche.voyageurs.map((v) => [String(v.siege), v]));
  const colonnes = Math.max(...rangees.map((r) => r.length), 1);
  const occupes = plan.codes.filter((c) => parSiege.has(c)).length;

  return (
    <div className="w-[190mm] bg-white p-[10mm] font-sans text-black">
      <Entete fiche={fiche} titre="Plan de la voiture et voyageurs" />
      <div className="mb-2 flex items-center justify-between text-[12px] font-semibold">
        <span>▲ Avant de la voiture</span>
        <span>{occupes} siège{occupes > 1 ? 's' : ''} occupé{occupes > 1 ? 's' : ''} sur {plan.codes.length}</span>
      </div>
      <table className="w-full border-separate" style={{ borderSpacing: '2mm', tableLayout: 'fixed' }}>
        <tbody>
          {rangees.map((r, i) => (
            <tr key={i}>
              {Array.from({ length: colonnes }).map((_, j) => {
                const c = r[j] || { type: 'vide' };
                if (c.type === 'vide') return <td key={j} />;
                if (c.type === 'chauffeur') {
                  return (
                    <td key={j} className="rounded-md border-2 border-black bg-black p-1.5 align-top text-white" style={{ height: '19mm' }}>
                      <b className="block text-[11px]">CHAUFFEUR</b>
                      <span className="block text-[11px] font-semibold leading-tight">{fiche.chauffeur || '—'}</span>
                    </td>
                  );
                }
                const v = parSiege.get(c.code);
                return (
                  <td key={j} className={`rounded-md border-2 p-1.5 align-top ${v ? 'border-black bg-[#EEEEEE]' : 'border-dashed border-[#999999]'}`} style={{ height: '19mm' }}>
                    <b className="block text-[13px]">{c.code}</b>
                    {v ? (
                      <span className="block break-words text-[10.5px] font-semibold leading-tight">{nomComplet(v)}</span>
                    ) : (
                      <span className="block text-[10px] text-[#777777]">Libre</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-[12px] font-semibold">▼ Arrière de la voiture</div>
      <p className="mt-3 text-[11px]">Sièges grisés : occupés (nom du voyageur). Pointillés : libres. Le détail des voyageurs (CIN, téléphone, âge, billet) est en page suivante.</p>
    </div>
  );
}

/** Page(s) suivante(s) : tableau des voyageurs. */
function PageListe({ fiche }: { fiche: DonneesFiche }) {
  const tries = [...fiche.voyageurs].sort((a, b) => Number(a.siege) - Number(b.siege));
  return (
    <div className="w-[190mm] bg-white p-[10mm] font-sans text-black">
      <Entete fiche={fiche} titre="Fiche voyageurs" />
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr>
            {['N°', 'Nom et prénom', 'CIN', 'Téléphone', 'Siège', 'Âge', 'Billet'].map((t) => (
              <th key={t} className="border border-black bg-[#EEEEEE] px-2 py-1.5 text-left font-bold">{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tries.map((v, i) => (
            <tr key={`${v.reservation_numero}-${v.siege}`} style={{ breakInside: 'avoid' }}>
              <td className="border border-black px-2 py-1.5 text-center">{i + 1}</td>
              <td className="border border-black px-2 py-1.5 font-bold">{nomComplet(v)}</td>
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
  );
}

/** Contenu complet : page du plan (si connu) puis la liste des voyageurs. */
export function FicheContenu({ fiche }: { fiche: DonneesFiche }) {
  return (
    <>
      {fiche.plan && fiche.plan.codes.length > 0 && (
        <>
          <PagePlan fiche={fiche} />
          <div className="html2pdf__page-break" style={{ breakAfter: 'page' }} />
        </>
      )}
      <PageListe fiche={fiche} />
    </>
  );
}

/** Impression A4 par le navigateur. */
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
  return createPortal(
    <div id="zone-impression">
      <FicheContenu fiche={fiche} />
    </div>,
    document.body
  );
}

/**
 * Télécharge la fiche en PDF (A4) : la fiche est dessinée hors de l'écran puis
 * convertie. html2pdf.js est chargé à la demande.
 */
export async function telechargerFichePdf(fiche: DonneesFiche): Promise<void> {
  const { default: html2pdf } = await import('html2pdf.js');
  // Le conteneur extérieur est hors de l'écran ; html2pdf reçoit le contenu
  // intérieur (sinon il recopie aussi le décalage et photographie une page vide).
  const hote = document.createElement('div');
  hote.style.cssText = 'position:fixed;left:-10000px;top:0;';
  const contenu = document.createElement('div');
  contenu.style.cssText = 'width:210mm;background:#fff;';
  hote.appendChild(contenu);
  document.body.appendChild(hote);
  const racine = createRoot(contenu);
  try {
    flushSync(() => racine.render(<FicheContenu fiche={fiche} />));
    const nom = `Fiche_voyageurs_${fiche.trajet}_${fiche.date}`.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '');
    await html2pdf()
      .set({
        margin: 0,
        filename: `${nom}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: 'tr' },
      })
      .from(contenu)
      .save();
  } finally {
    racine.unmount();
    hote.remove();
  }
}
