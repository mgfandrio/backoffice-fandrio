import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock, FileQuestion, RotateCcw } from 'lucide-react';
import { messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { Bouton, Carte, Erreur, Pastille, Selecteur, Squelette, Vide } from '@/components/ui';
import { Panneau, Tableau } from '@/components/tableau';
import { ariary, pluriel } from '@/utils/format';

/**
 * Contrôle des paiements (admin système) : ce qui demande une vérification.
 * - paiements arrivés trop tard (sièges déjà libérés) : la compagnie doit rembourser ;
 * - voyages annulés : la compagnie doit rembourser ses clients ;
 * - billets en ligne confirmés sans référence de transaction PAPI.
 * Lecture seule : le remboursement est fait par la compagnie.
 */

const CAS: Record<string, { titre: string; detail: string; icone: typeof Clock; ton: 'danger' | 'alerte' | 'info' }> = {
  paiement_tardif: { titre: 'Paiements arrivés trop tard', detail: 'Le client a payé après le délai : ses places étaient libérées. La compagnie doit le rembourser.', icone: Clock, ton: 'danger' },
  voyage_annule: { titre: 'Voyages annulés : clients à rembourser', detail: 'Le voyage a été annulé : la compagnie doit rembourser les clients qui avaient payé.', icone: RotateCcw, ton: 'alerte' },
  sans_reference: { titre: 'Billets confirmés sans référence de paiement', detail: 'Billet en ligne confirmé sans transaction PAPI enregistrée : à vérifier avec la compagnie.', icone: FileQuestion, ton: 'info' },
};
const TONS = {
  danger: 'border-danger-bord bg-danger-fond text-danger',
  alerte: 'border-alerte-bord bg-alerte-fond text-alerte',
  info: 'border-ocean-100 bg-ocean-50 text-ocean-800',
  ok: 'border-[#BFE3CD] bg-succes-fond text-succes',
};

/** « 3 h », « 2 jours » */
const duree = (heures: number) => (heures < 1 ? 'moins d’une heure' : heures < 24 ? `${heures} h` : pluriel(Math.floor(heures / 24), 'jour'));

export default function ControlePaiements() {
  const [filtre, setFiltre] = useState('');
  const [compagnie, setCompagnie] = useState('');
  const q = useQuery({
    queryKey: ['systeme', 'controle-paiements'],
    queryFn: async () => (await obtenir('/api/admin/controle-paiements')).data,
    refetchInterval: 2 * 60_000,
  });
  const d = q.data;
  const cas: any[] = d?.cas || [];
  const compagnies = [...new Map(cas.map((c) => [c.comp_id, c.compagnie])).entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  const affiches = cas.filter((c) => (!filtre || c.cas === filtre) && (!compagnie || String(c.comp_id) === compagnie));
  const seuil = d?.seuil_retard_heures ?? 48;

  if (q.isError) return <div className="p-4 sm:px-7 sm:py-6"><Erreur message={messageErreur(q.error)} onReessayer={() => q.refetch()} /></div>;

  return (
    <div className="flex flex-col gap-[18px] p-4 sm:px-7 sm:py-6">
      {/* Résumé : un bloc par cas */}
      <section className="flex flex-col gap-2.5">
        {q.isLoading
          ? [0, 1, 2].map((i) => <Squelette key={i} className="h-[74px]" />)
          : Object.entries(CAS).map(([cle, c]) => {
              const r = d.resume[cle];
              const Icone = r.nb ? c.icone : CheckCircle2;
              return (
                <div key={cle} className={`flex flex-wrap items-center gap-3.5 rounded-carte border px-4 py-3.5 ${r.nb ? TONS[c.ton] : TONS.ok}`}>
                  <Icone className="h-6 w-6 flex-none" aria-hidden />
                  <b className="min-w-[34px] text-[24px] tabular-nums">{r.nb}</b>
                  <span className="min-w-[240px] flex-1">
                    <b className="block text-[14.5px]">{c.titre}</b>
                    <span className="text-[13px] font-semibold text-encre-douce">
                      {!r.nb
                        ? 'Rien à signaler.'
                        : cle === 'sans_reference'
                          ? `${ariary(r.montant)} · le plus ancien date de ${duree(r.plus_ancien_heures)}`
                          : `${ariary(r.montant)} à rembourser · ${r.en_retard ? `${r.en_retard} en attente depuis plus de ${seuil} h` : `le plus ancien attend depuis ${duree(r.plus_ancien_heures)}`}`}
                    </span>
                  </span>
                  {r.nb > 0 && (
                    <Bouton compact variante="secondaire" onClick={() => setFiltre(cle)}>
                      Voir la liste
                    </Bouton>
                  )}
                </div>
              );
            })}
      </section>

      <Carte className="flex flex-wrap items-end gap-3.5 p-4">
        <Selecteur libelle="Afficher" value={filtre} onChange={(e) => setFiltre(e.target.value)} className="min-w-[260px] flex-1">
          <option value="">Tous les cas ({cas.length})</option>
          {Object.entries(CAS).map(([cle, c]) => (
            <option key={cle} value={cle}>{c.titre} ({d?.resume?.[cle]?.nb ?? 0})</option>
          ))}
        </Selecteur>
        <Selecteur libelle="Compagnie" value={compagnie} onChange={(e) => setCompagnie(e.target.value)} className="min-w-[220px] flex-1">
          <option value="">Toutes les compagnies</option>
          {compagnies.map(([id, nom]) => (
            <option key={id} value={id}>{nom}</option>
          ))}
        </Selecteur>
      </Carte>

      <Panneau titre={filtre ? CAS[filtre].titre : 'Tous les cas à vérifier'} sousTitre={filtre ? CAS[filtre].detail : 'Du plus ancien au plus récent. Le remboursement est fait par la compagnie concernée.'} sansMarge>
        {q.isLoading ? (
          <div className="p-5"><Squelette className="h-32" /></div>
        ) : affiches.length === 0 ? (
          <Vide icone={ClipboardCheck} titre="Rien à vérifier">Tous les paiements sont en ordre.</Vide>
        ) : (
          <Tableau colonnes={[{ titre: 'Cas' }, { titre: 'Compagnie' }, { titre: 'Billet' }, { titre: 'Client' }, { titre: 'Paiement' }, { titre: 'Montant', droite: true }, { titre: 'Depuis', droite: true }]}>
            {affiches.map((c) => {
              const retard = c.cas !== 'sans_reference' && c.heures >= seuil;
              return (
                <tr key={`${c.cas}-${c.res_id}`}>
                  <td>
                    <Pastille libelle={c.cas === 'paiement_tardif' ? 'Paiement tardif' : c.cas === 'voyage_annule' ? 'Voyage annulé' : 'Sans référence'} tonalite={c.cas === 'paiement_tardif' ? 'danger' : c.cas === 'voyage_annule' ? 'alerte' : 'info'} />
                  </td>
                  <td className="font-bold">{c.compagnie}</td>
                  <td>
                    <span className="block font-semibold tabular-nums">{c.billet}</span>
                    <span className="text-[12px] font-semibold text-encre-douce">{c.trajet} · {c.depart}</span>
                  </td>
                  <td>
                    <span className="block font-semibold">{c.client || '—'}</span>
                    <span className="text-[12px] font-semibold tabular-nums text-encre-douce">{c.telephone}</span>
                  </td>
                  <td>
                    <span className="block font-semibold">{c.operateur || '—'}</span>
                    <span className="text-[12px] font-semibold tabular-nums text-encre-douce">{c.reference || 'Aucune référence'}</span>
                  </td>
                  <td className="whitespace-nowrap text-right font-extrabold tabular-nums">{ariary(c.montant)}</td>
                  <td className="whitespace-nowrap text-right">
                    <b className={`inline-flex items-center gap-1 tabular-nums ${retard ? 'text-danger' : ''}`}>
                      {retard && <AlertTriangle className="h-4 w-4" aria-hidden />}
                      {duree(c.heures)}
                    </b>
                  </td>
                </tr>
              );
            })}
          </Tableau>
        )}
      </Panneau>
      <p className="m-0 text-[12.5px] font-semibold text-encre-douce">
        Les paiements reçus par PAPI sans réservation correspondante ne sont pas enregistrés par FANDRIO : ils ne figurent pas dans cette liste.
      </p>
    </div>
  );
}
