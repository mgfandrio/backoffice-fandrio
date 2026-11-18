/**
 * Export Excel (.xlsx) du chiffre d'affaires : un onglet par tableau,
 * montants formatés, en-têtes figés et filtrables. ExcelJS est chargé
 * à la demande (gros module, inutile tant qu'on n'exporte pas).
 */

const FORMAT_AR = '#,##0 "Ar"';
const MARINE = 'FF062A4A';

export interface DonneesExport {
  compagnie: string;
  du: string; // AAAA-MM-JJ
  au: string;
  filtres: string; // ex. « Tous les trajets · Guichet et en ligne »
  resume: any; // réponse de /chiffre-affaires
  detail: { ventes: any[]; remboursements: any[] }; // réponse de /chiffre-affaires/ventes
}

const dateFr = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
/** « AAAA-MM-JJ HH:MM » → date Excel (construite en UTC pour qu'Excel affiche l'heure locale telle quelle). */
const dateExcel = (v?: string | null) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(v || '');
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0))) : v || '';
};
const FORMAT_DATE = 'dd/mm/yyyy hh:mm';

export async function exporterChiffreAffaires(d: DonneesExport): Promise<void> {
  const { default: ExcelJS } = await import('exceljs');
  const classeur = new ExcelJS.Workbook();
  classeur.creator = 'FANDRIO';
  classeur.created = new Date();

  /** Onglet tableau : en-tête marine, colonnes typées, ligne de total facultative. */
  const onglet = (nom: string, colonnes: { titre: string; cle: string; largeur: number; ar?: boolean; date?: boolean }[], lignes: any[], total?: Record<string, any>) => {
    const f = classeur.addWorksheet(nom, { views: [{ state: 'frozen', ySplit: 1 }] });
    f.columns = colonnes.map((c) => ({ header: c.titre, key: c.cle, width: c.largeur, style: c.ar ? { numFmt: FORMAT_AR } : c.date ? { numFmt: FORMAT_DATE } : {} }));
    const dates = colonnes.filter((c) => c.date).map((c) => c.cle);
    const entete = f.getRow(1);
    entete.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    entete.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MARINE } };
    entete.height = 22;
    entete.alignment = { vertical: 'middle' };
    lignes.forEach((l) => f.addRow(dates.length ? { ...l, ...Object.fromEntries(dates.map((k) => [k, dateExcel(l[k])])) } : l));
    if (lignes.length) f.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colonnes.length } };
    if (total) {
      const r = f.addRow(total);
      r.font = { bold: true };
      r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF2F9' } };
    }
    return f;
  };

  // ── Résumé ──
  const t = d.resume.totaux;
  const r = d.resume.remboursements;
  const res = classeur.addWorksheet('Résumé');
  res.columns = [{ width: 42 }, { width: 22 }];
  res.addRow([`Chiffre d'affaires — ${d.compagnie}`]).font = { bold: true, size: 15, color: { argb: MARINE } };
  res.addRow([`Du ${dateFr(d.du)} au ${dateFr(d.au)}`]).font = { bold: true };
  res.addRow([d.filtres]);
  res.addRow([`Fichier créé le ${new Date().toLocaleString('fr-FR')}`]).font = { italic: true, color: { argb: 'FF5A6B82' } };
  res.addRow([]);
  const ligne = (libelle: string, valeur: number, gras = false) => {
    const row = res.addRow([libelle, valeur]);
    row.getCell(2).numFmt = FORMAT_AR;
    if (gras) row.font = { bold: true };
    return row;
  };
  ligne('Ventes au guichet', t.guichet);
  ligne('Ventes en ligne', t.en_ligne);
  ligne('Ventes totales', t.brut, true);
  ligne(`Commission FANDRIO (${d.resume.taux_commission} % des ventes en ligne)`, -t.commission);
  const net = ligne('Net pour la compagnie', t.net, true);
  net.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF2F9' } };
  res.addRow([]);
  res.addRow(['Billets vendus', t.billets]);
  res.addRow(['dont au guichet', t.billets_guichet]);
  res.addRow(['dont en ligne', t.billets_en_ligne]);
  res.addRow(['Voyages concernés', t.voyages]);
  res.addRow([]);
  ligne(`Remboursé aux clients (${r.nb} réservation${r.nb > 1 ? 's' : ''})`, r.montant);
  if (r.en_attente_nb) ligne(`Reste à rembourser (${r.en_attente_nb})`, r.en_attente_montant);
  res.addRow(['Les billets remboursés ne sont pas comptés dans les ventes.']).font = { italic: true, color: { argb: 'FF5A6B82' } };

  // ── Ventes (une ligne par réservation) ──
  const v = d.detail.ventes;
  onglet(
    'Ventes',
    [
      { titre: 'Date de vente', cle: 'date', largeur: 17, date: true },
      { titre: 'N° billet', cle: 'billet', largeur: 20 },
      { titre: 'Trajet', cle: 'trajet', largeur: 32 },
      { titre: 'Départ du voyage', cle: 'depart', largeur: 17, date: true },
      { titre: 'Canal', cle: 'canal', largeur: 11 },
      { titre: 'Paiement', cle: 'paiement', largeur: 15 },
      { titre: 'Vendeur ou client', cle: 'personne', largeur: 30 },
      { titre: 'Billets', cle: 'billets', largeur: 9 },
      { titre: 'Montant', cle: 'montant', largeur: 15, ar: true },
      { titre: 'Commission', cle: 'commission', largeur: 14, ar: true },
      { titre: 'Net', cle: 'net', largeur: 15, ar: true },
    ],
    v,
    { date: 'Total', billets: v.reduce((s, x) => s + x.billets, 0), montant: v.reduce((s, x) => s + x.montant, 0), commission: v.reduce((s, x) => s + x.commission, 0), net: v.reduce((s, x) => s + x.net, 0) }
  );

  // ── Par trajet ──
  const pt: any[] = d.resume.par_trajet || [];
  onglet(
    'Par trajet',
    [
      { titre: 'Trajet', cle: 'trajet', largeur: 34 },
      { titre: 'Prix du billet', cle: 'tarif', largeur: 15, ar: true },
      { titre: 'Voyages', cle: 'voyages', largeur: 10 },
      { titre: 'Billets', cle: 'billets', largeur: 10 },
      { titre: 'Remplissage (%)', cle: 'remplissage', largeur: 16 },
      { titre: 'Guichet', cle: 'guichet', largeur: 15, ar: true },
      { titre: 'En ligne', cle: 'en_ligne', largeur: 15, ar: true },
      { titre: 'Total', cle: 'total', largeur: 16, ar: true },
    ],
    pt,
    { trajet: 'Total', voyages: pt.reduce((s, x) => s + x.voyages, 0), billets: pt.reduce((s, x) => s + x.billets, 0), guichet: t.guichet, en_ligne: t.en_ligne, total: t.brut }
  );

  // ── Par moyen de paiement ──
  onglet(
    'Paiements',
    [
      { titre: 'Moyen de paiement', cle: 'nom', largeur: 24 },
      { titre: 'Réservations', cle: 'nb', largeur: 14 },
      { titre: 'Montant', cle: 'montant', largeur: 16, ar: true },
    ],
    d.resume.par_paiement || [],
    { nom: 'Total', nb: t.reservations, montant: t.brut }
  );

  // ── Guichet par vendeur ──
  const pv: any[] = d.resume.par_vendeur || [];
  onglet(
    'Guichet par vendeur',
    [
      { titre: 'Vendeur', cle: 'nom', largeur: 30 },
      { titre: 'Billets', cle: 'billets', largeur: 10 },
      { titre: 'Espèces encaissées', cle: 'montant', largeur: 20, ar: true },
    ],
    pv,
    { nom: 'Total guichet', billets: pv.reduce((s, x) => s + x.billets, 0), montant: pv.reduce((s, x) => s + x.montant, 0) }
  );

  // ── Remboursements ──
  const rb = d.detail.remboursements;
  onglet(
    'Remboursements',
    [
      { titre: 'Date du remboursement', cle: 'date', largeur: 20, date: true },
      { titre: 'N° billet', cle: 'billet', largeur: 20 },
      { titre: 'Trajet', cle: 'trajet', largeur: 32 },
      { titre: 'Billets', cle: 'billets', largeur: 9 },
      { titre: 'Montant remboursé', cle: 'montant', largeur: 18, ar: true },
      { titre: 'Référence de la transaction', cle: 'reference', largeur: 28 },
    ],
    rb,
    rb.length ? { date: 'Total', billets: rb.reduce((s, x) => s + x.billets, 0), montant: rb.reduce((s, x) => s + x.montant, 0) } : undefined
  );

  const tampon = await classeur.xlsx.writeBuffer();
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(new Blob([tampon], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  lien.download = `chiffre-affaires_${d.du}_${d.au}.xlsx`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lien.href), 2000);
}
