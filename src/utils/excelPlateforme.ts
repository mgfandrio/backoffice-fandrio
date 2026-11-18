/**
 * Export Excel (.xlsx) du chiffre d'affaires de la plateforme (admin système) :
 * résumé, par compagnie, ventes en ligne, collectes encaissées, moyens de paiement.
 * ExcelJS est chargé à la demande.
 */

const FORMAT_AR = '#,##0 "Ar"';
const FORMAT_DATE = 'dd/mm/yyyy hh:mm';
const MARINE = 'FF062A4A';

const dateFr = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
/** « AAAA-MM-JJ HH:MM » → date Excel (en UTC pour qu'Excel affiche l'heure telle quelle). */
const dateExcel = (v?: string | null) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(v || '');
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0))) : v || '';
};

export interface DonneesExportPlateforme {
  filtres: string;
  resume: any; // réponse de /admin/chiffre-affaires
  detail: { ventes: any[]; collectes: any[] }; // réponse de /admin/chiffre-affaires/ventes
}

export async function exporterPlateforme(d: DonneesExportPlateforme): Promise<void> {
  const { default: ExcelJS } = await import('exceljs');
  const classeur = new ExcelJS.Workbook();
  classeur.creator = 'FANDRIO';
  classeur.created = new Date();

  const onglet = (nom: string, colonnes: { titre: string; cle: string; largeur: number; ar?: boolean; date?: boolean }[], lignes: any[], total?: Record<string, any>) => {
    const f = classeur.addWorksheet(nom, { views: [{ state: 'frozen', ySplit: 1 }] });
    f.columns = colonnes.map((c) => ({ header: c.titre, key: c.cle, width: c.largeur, style: c.ar ? { numFmt: FORMAT_AR } : c.date ? { numFmt: FORMAT_DATE } : {} }));
    const entete = f.getRow(1);
    entete.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    entete.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MARINE } };
    entete.height = 22;
    entete.alignment = { vertical: 'middle' };
    const dates = colonnes.filter((c) => c.date).map((c) => c.cle);
    lignes.forEach((l) => f.addRow(dates.length ? { ...l, ...Object.fromEntries(dates.map((k) => [k, dateExcel(l[k])])) } : l));
    if (lignes.length) f.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colonnes.length } };
    if (total) {
      const r = f.addRow(total);
      r.font = { bold: true };
      r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF2F9' } };
    }
  };

  // ── Résumé ──
  const t = d.resume.totaux;
  const p = d.resume.periode;
  const res = classeur.addWorksheet('Résumé');
  res.columns = [{ width: 46 }, { width: 22 }];
  res.addRow(['Chiffre d’affaires de la plateforme FANDRIO']).font = { bold: true, size: 15, color: { argb: MARINE } };
  res.addRow([`Du ${dateFr(p.du)} au ${dateFr(p.au)}`]).font = { bold: true };
  res.addRow([d.filtres]);
  res.addRow([`Fichier créé le ${new Date().toLocaleString('fr-FR')}`]).font = { italic: true, color: { argb: 'FF5A6B82' } };
  res.addRow([]);
  const ligne = (libelle: string, valeur: number, gras = false) => {
    const row = res.addRow([libelle, valeur]);
    row.getCell(2).numFmt = FORMAT_AR;
    if (gras) row.font = { bold: true };
  };
  ligne('Ventes en ligne', t.en_ligne);
  ligne(`Commission FANDRIO (${d.resume.taux_commission} % des ventes en ligne)`, t.commission, true);
  ligne('Commission encaissée sur la période (collectes payées)', t.encaisse);
  ligne('Reste à encaisser (toutes périodes)', t.a_encaisser);
  ligne('dont en retard', t.en_retard);
  res.addRow([]);
  ligne('Ventes au guichet (sans commission, pour information)', t.guichet);
  res.addRow(['Billets vendus en ligne', t.billets_en_ligne]);
  res.addRow(['Billets vendus au guichet', t.billets_guichet]);

  // ── Par compagnie ──
  const pc: any[] = d.resume.par_compagnie || [];
  onglet(
    'Par compagnie',
    [
      { titre: 'Compagnie', cle: 'nom', largeur: 28 },
      { titre: 'Ventes en ligne', cle: 'en_ligne', largeur: 18, ar: true },
      { titre: 'Ventes guichet', cle: 'guichet', largeur: 18, ar: true },
      { titre: 'Commission', cle: 'commission', largeur: 16, ar: true },
      { titre: 'À encaisser', cle: 'a_encaisser', largeur: 16, ar: true },
      { titre: 'dont en retard', cle: 'en_retard', largeur: 16, ar: true },
      { titre: 'État', cle: 'etat', largeur: 14 },
    ],
    pc.map((c) => ({ ...c, etat: c.statut === 2 ? 'Inactive' : c.suspendu ? 'Suspendue' : 'Active' })),
    { nom: 'Total', en_ligne: t.en_ligne, guichet: t.guichet, commission: t.commission, a_encaisser: t.a_encaisser, en_retard: t.en_retard }
  );

  // ── Ventes en ligne (une ligne par réservation) ──
  const v = d.detail.ventes;
  onglet(
    'Ventes en ligne',
    [
      { titre: 'Date', cle: 'date', largeur: 17, date: true },
      { titre: 'N° billet', cle: 'billet', largeur: 20 },
      { titre: 'Compagnie', cle: 'compagnie', largeur: 24 },
      { titre: 'Trajet', cle: 'trajet', largeur: 32 },
      { titre: 'Opérateur', cle: 'operateur', largeur: 15 },
      { titre: 'Référence PAPI', cle: 'reference', largeur: 22 },
      { titre: 'Billets', cle: 'billets', largeur: 9 },
      { titre: 'Montant', cle: 'montant', largeur: 15, ar: true },
      { titre: 'Commission', cle: 'commission', largeur: 14, ar: true },
    ],
    v,
    { date: 'Total', billets: v.reduce((s, x) => s + x.billets, 0), montant: v.reduce((s, x) => s + x.montant, 0), commission: v.reduce((s, x) => s + x.commission, 0) }
  );

  // ── Collectes encaissées ──
  const co = d.detail.collectes;
  onglet(
    'Collectes encaissées',
    [
      { titre: 'Payée le', cle: 'payee_le', largeur: 17, date: true },
      { titre: 'Compagnie', cle: 'compagnie', largeur: 24 },
      { titre: 'Période', cle: 'periode', largeur: 26 },
      { titre: 'Ventes de la période', cle: 'ventes', largeur: 20, ar: true },
      { titre: 'Commission', cle: 'commission', largeur: 16, ar: true },
      { titre: 'Mode', cle: 'mode', largeur: 16 },
    ],
    co,
    co.length ? { payee_le: 'Total', ventes: co.reduce((s, x) => s + x.ventes, 0), commission: co.reduce((s, x) => s + x.commission, 0) } : undefined
  );

  // ── Moyens de paiement ──
  onglet(
    'Moyens de paiement',
    [
      { titre: 'Opérateur', cle: 'nom', largeur: 22 },
      { titre: 'Paiements', cle: 'nb', largeur: 12 },
      { titre: 'Montant', cle: 'montant', largeur: 18, ar: true },
    ],
    d.resume.par_operateur || [],
    { nom: 'Total', nb: t.reservations_en_ligne, montant: t.en_ligne }
  );

  const tampon = await classeur.xlsx.writeBuffer();
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(new Blob([tampon], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  lien.download = `fandrio-chiffre-affaires_${p.du}_${p.au}.xlsx`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lien.href), 2000);
}
