/**
 * Export Excel (.xlsx) des versements aux chauffeurs : un voyage par ligne,
 * avec la voiture, le chauffeur et le pourcentage enregistrés au départ, et
 * qui a réglé quoi et quand. ExcelJS est chargé à la demande.
 */

const FORMAT_AR = '#,##0 "Ar"';
const FORMAT_DATE = 'dd/mm/yyyy hh:mm';
const ETATS: Record<string, string> = { en_vente: 'Pas encore parti', en_attente: 'Parti sous 50 %', a_regler: 'À régler', retard: 'En retard', regle: 'Réglé' };

/** « AAAA-MM-JJ HH:MM » → date Excel (en UTC pour qu'Excel affiche l'heure telle quelle). */
const dateExcel = (v?: string | null) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(v || '');
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0))) : '';
};

export async function exporterVersements(versements: any[], filtres: string): Promise<void> {
  const { default: ExcelJS } = await import('exceljs');
  const classeur = new ExcelJS.Workbook();
  classeur.creator = 'FANDRIO';
  const f = classeur.addWorksheet('Versements', { views: [{ state: 'frozen', ySplit: 1 }] });
  const colonnes = [
    { header: 'Départ', key: 'depart', width: 17, style: { numFmt: FORMAT_DATE } },
    { header: 'Trajet', key: 'trajet', width: 30 },
    { header: 'Voiture', key: 'voiture', width: 13 },
    { header: 'Chauffeur', key: 'chauffeur', width: 24 },
    { header: 'Téléphone', key: 'telephone', width: 14 },
    { header: 'Sièges', key: 'sieges', width: 9 },
    { header: 'Places', key: 'places', width: 9 },
    { header: 'Remplissage (%)', key: 'remplissage', width: 15 },
    { header: 'Ventes', key: 'ventes', width: 15, style: { numFmt: FORMAT_AR } },
    { header: 'Commission FANDRIO', key: 'commission', width: 19, style: { numFmt: FORMAT_AR } },
    { header: 'Taux compagnie (%)', key: 'taux', width: 17 },
    { header: 'Part compagnie', key: 'compagnie', width: 16, style: { numFmt: FORMAT_AR } },
    { header: 'Part chauffeur', key: 'chauffeur_part', width: 16, style: { numFmt: FORMAT_AR } },
    { header: 'État', key: 'etat', width: 15 },
    { header: 'Réglé le', key: 'regle_le', width: 17, style: { numFmt: FORMAT_DATE } },
    { header: 'Réglé par', key: 'regle_par', width: 22 },
    { header: 'Montants figés le', key: 'fige_le', width: 17, style: { numFmt: FORMAT_DATE } },
  ];
  f.columns = colonnes as any;
  const entete = f.getRow(1);
  entete.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  entete.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF062A4A' } };
  entete.height = 22;
  versements.forEach((v) =>
    f.addRow({
      depart: dateExcel(`${v.date} ${v.heure}`),
      trajet: v.trajet.libelle,
      voiture: v.voiture.matricule,
      chauffeur: v.chauffeur.nom || '',
      telephone: v.chauffeur.telephone || '',
      sieges: v.nb_sieges,
      places: v.nb_places,
      remplissage: v.remplissage,
      ventes: v.montant_ventes,
      commission: v.commission_fandrio,
      taux: v.taux_compagnie,
      compagnie: v.part_compagnie,
      chauffeur_part: v.part_chauffeur,
      etat: ETATS[v.etat] || v.etat,
      regle_le: v.regle_le ? dateExcel(v.regle_le) : '',
      regle_par: v.regle_par || '',
      fige_le: v.fige_le ? dateExcel(v.fige_le) : '',
    })
  );
  if (versements.length) {
    f.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colonnes.length } };
    const total = f.addRow({
      depart: 'Total',
      sieges: versements.reduce((s, v) => s + v.nb_sieges, 0),
      ventes: versements.reduce((s, v) => s + v.montant_ventes, 0),
      commission: versements.reduce((s, v) => s + v.commission_fandrio, 0),
      compagnie: versements.reduce((s, v) => s + v.part_compagnie, 0),
      chauffeur_part: versements.reduce((s, v) => s + v.part_chauffeur, 0),
    });
    total.font = { bold: true };
    total.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEBF2F9' } };
  }
  f.addRow([]);
  f.addRow([`Filtres : ${filtres || 'aucun'} · fichier créé le ${new Date().toLocaleString('fr-FR')}`]).font = { italic: true, color: { argb: 'FF5A6B82' } };

  const tampon = await classeur.xlsx.writeBuffer();
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(new Blob([tampon], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  lien.download = `versements-chauffeurs_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lien.href), 2000);
}
