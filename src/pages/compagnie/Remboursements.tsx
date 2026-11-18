import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, RotateCcw, X } from 'lucide-react';
import { api, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Carte, Champ, Dialogue, Erreur, Pastille, Selecteur, Squelette, Vide } from '@/components/ui';
import { Kpi, Tableau } from '@/components/tableau';
import { ariary, nombre } from '@/utils/format';

/**
 * Remboursements : billets payés d'un voyage annulé, ou paiements arrivés trop tard.
 * La compagnie rembourse le client puis marque le remboursement traité (avec la
 * référence du transfert), ou le refuse avec un motif.
 */

export default function Remboursements() {
  const queryClient = useQueryClient();
  const [statut, setStatut] = useState('en_attente');
  const [action, setAction] = useState<{ type: 'traiter' | 'refuser'; r: any } | null>(null);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [motif, setMotif] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ titre: string; texte: string } | null>(null);

  const stats = useQuery({ queryKey: ['remboursements', 'stats'], queryFn: async () => (await obtenir('/api/adminCompagnie/remboursements/statistiques')).data });
  const liste = useQuery({ queryKey: ['remboursements', 'liste', statut], queryFn: async () => ((await obtenir('/api/adminCompagnie/remboursements', { statut, per_page: 100 })).data?.items || []) as any[] });
  const s = stats.data;

  const ouvrir = (type: 'traiter' | 'refuser', r: any) => {
    setReference('');
    setNote('');
    setMotif('');
    setErreur('');
    setAction({ type, r });
  };

  const executer = async () => {
    if (!action) return;
    if (action.type === 'traiter' && !reference.trim()) return setErreur('Indiquez la référence du transfert (numéro de transaction MVola, Orange Money…).');
    if (action.type === 'refuser' && motif.trim().length < 5) return setErreur('Expliquez le motif du refus (au moins 5 caractères) : le client le recevra.');
    setEnvoi(true);
    try {
      if (action.type === 'traiter') await api.post(`/api/adminCompagnie/remboursements/${action.r.res_id}/marquer-traite`, { reference: reference.trim(), ...(note.trim() ? { note: note.trim() } : {}) });
      else await api.post(`/api/adminCompagnie/remboursements/${action.r.res_id}/refuser`, { motif: motif.trim() });
      queryClient.invalidateQueries({ queryKey: ['remboursements'] });
      setMessage({ titre: action.type === 'traiter' ? 'Remboursement enregistré' : 'Remboursement refusé', texte: 'Le client a été prévenu par notification.' });
      setAction(null);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnvoi(false);
    }
  };

  const items = liste.data || [];
  return (
    <div className="flex flex-col gap-4 p-4 sm:px-7 sm:py-6">
      <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <Kpi marine icone={RotateCcw} libelle="À rembourser" valeur={ariary(s?.en_attente?.montant, false)} unite="Ar" detail={`${nombre(s?.en_attente?.nombre)} demande(s) en attente`} chargement={stats.isLoading} />
        <Kpi icone={Check} ton="succes" libelle="Remboursés" valeur={ariary(s?.traites?.montant, false)} unite="Ar" detail={`${nombre(s?.traites?.nombre)} remboursement(s)`} chargement={stats.isLoading} />
        <Kpi icone={X} ton="neutre" libelle="Refusés" valeur={nombre(s?.refuses?.nombre)} detail={ariary(s?.refuses?.montant)} chargement={stats.isLoading} />
      </section>

      <Carte className="flex flex-wrap items-end gap-3 p-4">
        <Selecteur libelle="Afficher" value={statut} onChange={(e) => setStatut(e.target.value)} className="min-w-[260px]">
          <option value="en_attente">À rembourser ({s?.en_attente?.nombre ?? '…'})</option>
          <option value="traites">Remboursés ({s?.traites?.nombre ?? '…'})</option>
          <option value="refuses">Refusés ({s?.refuses?.nombre ?? '…'})</option>
          <option value="tous">Tous</option>
        </Selecteur>
        <p className="m-0 flex-1 text-[13.5px] font-semibold text-encre-douce">Remboursez le client sur son numéro de paiement, puis marquez le remboursement comme fait avec la référence du transfert.</p>
      </Carte>

      <Carte className="overflow-hidden">
        {liste.isLoading ? (
          <div className="flex flex-col gap-2 p-4">{[0, 1, 2].map((i) => <Squelette key={i} className="h-12" />)}</div>
        ) : liste.isError ? (
          <div className="p-4">
            <Erreur message={messageErreur(liste.error)} onReessayer={() => liste.refetch()} />
          </div>
        ) : items.length === 0 ? (
          <Vide icone={RotateCcw} titre={statut === 'en_attente' ? 'Aucun remboursement en attente' : 'Aucun remboursement'} />
        ) : (
          <Tableau colonnes={[{ titre: 'Billet' }, { titre: 'Client' }, { titre: 'Rembourser sur' }, { titre: 'Voyage' }, { titre: 'Raison' }, { titre: 'Montant', droite: true }, { titre: 'État' }, { titre: 'Actions', cache: true }]}>
            {items.map((r) => {
              const st = Number(r.statut);
              return (
                <tr key={r.res_id}>
                  <td className="whitespace-nowrap">
                    <b className="block tabular-nums">{r.res_numero}</b>
                    {r.date_annulation && <span className="text-[12px] font-semibold text-encre-douce">{r.date_annulation}</span>}
                  </td>
                  <td>
                    <span className="block font-bold">{r.client?.nom || '—'}</span>
                    {r.client?.telephone && <span className="text-[12.5px] font-semibold tabular-nums text-encre-douce">{r.client.telephone}</span>}
                  </td>
                  <td>
                    <span className="block font-bold">{r.paiement?.type || '—'}</span>
                    {r.paiement?.numero && <span className="text-[12.5px] font-bold tabular-nums">{r.paiement.numero}</span>}
                  </td>
                  <td>
                    <span className="block whitespace-nowrap font-semibold">{r.voyage?.trajet || '—'}</span>
                    <span className="text-[12.5px] font-semibold tabular-nums text-encre-douce">{r.voyage?.date}</span>
                  </td>
                  <td className="font-semibold">{r.motif === 'voyage_annule' ? 'Voyage annulé' : 'Paiement arrivé trop tard'}</td>
                  <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(r.montant)}</td>
                  <td>
                    {st === 1 ? <Pastille libelle="À rembourser" tonalite="alerte" /> : st === 2 ? <Pastille libelle="Remboursé" tonalite="succes" /> : <Pastille libelle="Refusé" tonalite="neutre" />}
                    {st === 2 && r.reference && <span className="mt-1 block text-[12px] font-semibold text-encre-douce">Réf. {r.reference}</span>}
                    {st === 3 && r.note && <span className="mt-1 block text-[12px] font-semibold text-encre-douce">{r.note}</span>}
                  </td>
                  <td>
                    {st === 1 && (
                      <span className="flex justify-end gap-2">
                        <Bouton compact variante="succes" icone={Check} onClick={() => ouvrir('traiter', r)}>
                          Remboursé
                        </Bouton>
                        <Bouton compact variante="danger" onClick={() => ouvrir('refuser', r)}>
                          Refuser
                        </Bouton>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </Tableau>
        )}
      </Carte>

      <Dialogue
        ouvert={!!action}
        titre={action?.type === 'traiter' ? `Remboursement de ${ariary(action?.r?.montant)} effectué ?` : 'Refuser ce remboursement ?'}
        confirmer={action?.type === 'traiter' ? 'Confirmer le remboursement' : 'Refuser'}
        danger={action?.type === 'refuser'}
        chargement={envoi}
        onConfirmer={executer}
        onFermer={() => setAction(null)}
      >
        {action?.type === 'traiter' ? (
          <div className="flex flex-col gap-3">
            <span>
              À verser à {action.r.client?.nom || 'le client'} sur {action.r.paiement?.type} {action.r.paiement?.numero}.
            </span>
            <Champ libelle="Référence du transfert" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex. MP241118.1234.A56789" autoFocus />
            <Champ libelle="Note (facultatif)" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <span>Le client recevra le motif par notification.</span>
            <Champ libelle="Motif du refus" value={motif} onChange={(e) => setMotif(e.target.value)} autoFocus />
          </div>
        )}
        {erreur && <p className="m-0 mt-2 text-[13px] font-bold text-danger">{erreur}</p>}
      </Dialogue>
      <Dialogue ouvert={!!message} titre={message?.titre || ''} onFermer={() => setMessage(null)}>
        {message?.texte}
      </Dialogue>
    </div>
  );
}
