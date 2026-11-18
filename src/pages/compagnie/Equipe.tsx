import { FormEvent, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Copy, Info, KeyRound, Plus, Power, Printer, UserMinus, Users } from 'lucide-react';
import { api, champsErreurs, messageErreur } from '@/api/client';
import { obtenir } from '@/api/requetes';
import { useAuth } from '@/auth/AuthContext';
import { Bouton, Carte, Champ, Dialogue, Erreur, Pastille, Squelette, Tiroir, Vide } from '@/components/ui';
import { Panneau, Tableau } from '@/components/tableau';
import { initiales, pluriel } from '@/utils/format';
import { dateFr } from '@/utils/periodes';

/**
 * Équipe de la compagnie : les personnes qui ont accès au back-office.
 * Tout le monde voit la liste ; seul l'admin principal ajoute, désactive,
 * réactive, retire ou redonne un mot de passe (provisoire, affiché une fois).
 */

interface Acces {
  prenom: string;
  nom: string;
  identifiant: string;
  telephone: string;
  motDePasse: string;
}

function etat(m: any) {
  if (m.statut !== 1) return <Pastille libelle="Désactivé" tonalite="neutre" />;
  if (m.mdp_provisoire) return <Pastille libelle="Doit choisir son mot de passe" tonalite="alerte" />;
  return <Pastille libelle="Actif" tonalite="succes" />;
}

/** Fiche d'accès imprimée (ticket 80 mm) remise à la personne. */
function ImpressionAcces({ acces, compagnie, onTermine }: { acces: Acces | null; compagnie: string; onTermine: () => void }) {
  useEffect(() => {
    if (!acces) return;
    const fin = () => onTermine();
    window.addEventListener('afterprint', fin, { once: true });
    const t = window.setTimeout(() => window.print(), 100);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', fin);
    };
  }, [acces, onTermine]);
  if (!acces) return null;
  const ligne = 'flex justify-between gap-2.5 text-[12.5px]';
  const trait = <hr className="m-0 border-0 border-t-[1.5px] border-dashed border-black" />;
  return createPortal(
    <div id="zone-impression">
      <div className="flex w-[72mm] flex-col gap-2.5 bg-white p-[3mm] font-sans text-black">
        <div className="text-center">
          <b className="block text-[19px] tracking-[0.08em]">FANDRIO</b>
          <b className="block text-[14px]">{compagnie}</b>
        </div>
        {trait}
        <div className="text-center text-[11px] font-extrabold tracking-[0.1em]">ACCÈS AU BACK-OFFICE</div>
        <div className="flex flex-col gap-1">
          <div className={ligne}><span>Nom</span><b>{acces.prenom} {acces.nom}</b></div>
          <div className={ligne}><span>Identifiant</span><b>{acces.identifiant}</b></div>
          <div className={ligne}><span>ou téléphone</span><b>{acces.telephone}</b></div>
        </div>
        {trait}
        <div className="text-center">
          <span className="block text-[11.5px]">Mot de passe provisoire</span>
          <b className="block text-[22px] tracking-[0.12em]">{acces.motDePasse}</b>
        </div>
        {trait}
        <span className="text-[11px] leading-snug">À la première connexion, vous choisirez votre mot de passe personnel. Ne le communiquez à personne.</span>
      </div>
    </div>,
    document.body
  );
}

export default function Equipe() {
  const { utilisateur } = useAuth();
  const queryClient = useQueryClient();
  const [ajout, setAjout] = useState(false);
  const [geree, setGeree] = useState<any>(null);
  const [acces, setAcces] = useState<Acces | null>(null);
  const [impression, setImpression] = useState<Acces | null>(null);

  const q = useQuery({ queryKey: ['equipe'], queryFn: async () => (await obtenir('/api/adminCompagnie/equipe')).data });
  const membres: any[] = q.data?.membres || [];
  const principal = !!q.data?.je_suis_principal;
  const actifs = membres.filter((m) => m.statut === 1).length;
  const rafraichir = () => queryClient.invalidateQueries({ queryKey: ['equipe'] });
  const finImpression = useCallback(() => setImpression(null), []);
  const compagnie = utilisateur?.compagnie?.nom || 'Ma compagnie';

  if (q.isError) return <div className="p-4 sm:px-7 sm:py-6"><Erreur message={messageErreur(q.error)} onReessayer={() => q.refetch()} /></div>;

  return (
    <div className="flex max-w-[1100px] flex-col gap-[18px] p-4 sm:px-7 sm:py-6">
      <div className="flex flex-wrap items-start gap-3 rounded-carte border border-ocean-100 bg-ocean-50 px-4 py-3.5 text-[13.5px] font-semibold leading-relaxed text-ocean-950">
        <Info className="mt-0.5 h-5 w-5 flex-none text-ocean-800" aria-hidden />
        <span className="min-w-[240px] flex-1">
          Chaque personne a son propre compte : ses ventes au guichet et sa caisse sont à son nom.{' '}
          {principal ? 'Vous êtes l’admin principal : vous seul pouvez ajouter une personne, la désactiver ou lui redonner un mot de passe.' : 'Seul l’admin principal de la compagnie peut ajouter une personne ou modifier un compte.'}
        </span>
        {principal && (
          <Bouton icone={Plus} onClick={() => setAjout(true)}>
            Ajouter une personne
          </Bouton>
        )}
      </div>

      <Panneau titre="Personnes ayant accès" sousTitre={q.data ? `${pluriel(membres.length, 'personne')} · ${pluriel(actifs, 'active', 'actives')}` : undefined} sansMarge>
        {q.isLoading ? (
          <div className="p-5"><Squelette className="h-32" /></div>
        ) : membres.length === 0 ? (
          <Vide icone={Users} titre="Personne dans l’équipe" />
        ) : (
          <Tableau colonnes={[{ titre: 'Personne' }, { titre: 'Contact' }, { titre: 'Rôle' }, { titre: 'État' }, { titre: 'Action', cache: true }]}>
            {membres.map((m) => (
              <tr key={m.id}>
                <td>
                  <span className="flex items-center gap-3">
                    <span className={`flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] text-[13px] font-extrabold ${m.admin_principal ? 'bg-ocean-950 text-white' : m.statut === 1 ? 'bg-ocean-50 text-ocean-800' : 'bg-neutre-fond text-neutre'}`}>{initiales(`${m.prenom} ${m.nom}`)}</span>
                    <span>
                      <b className={`block ${m.statut === 1 ? '' : 'text-neutre'}`}>{m.prenom} {m.nom}</b>
                      <span className="text-[12px] font-semibold text-encre-douce">{m.c_est_moi ? 'C’est vous' : m.ajoute_le ? `Ajouté le ${dateFr(m.ajoute_le)}` : ''}</span>
                    </span>
                  </span>
                </td>
                <td>
                  <span className="block font-semibold tabular-nums">{m.telephone}</span>
                  <span className="text-[12.5px] font-semibold text-encre-douce">{m.email}</span>
                </td>
                <td>{m.admin_principal ? <Pastille libelle="Admin principal" tonalite="marine" /> : <Pastille libelle="Administrateur" tonalite="info" />}</td>
                <td>{etat(m)}</td>
                <td className="text-right">
                  {principal && !m.admin_principal && (
                    <Bouton compact variante="secondaire" onClick={() => setGeree(m)}>
                      Gérer
                    </Bouton>
                  )}
                </td>
              </tr>
            ))}
          </Tableau>
        )}
      </Panneau>
      <p className="m-0 text-[12.5px] font-semibold text-encre-douce">Pour changer d’admin principal, contactez l’équipe FANDRIO.</p>

      <PanneauAjout
        ouvert={ajout}
        onFermer={() => setAjout(false)}
        onAjoute={(a) => {
          setAjout(false);
          setAcces(a);
          rafraichir();
        }}
      />
      <PanneauGestion
        membre={geree}
        onFermer={() => setGeree(null)}
        onFait={(a) => {
          setGeree(null);
          rafraichir();
          if (a) setAcces(a);
        }}
      />

      {/* Mot de passe provisoire : affiché une seule fois */}
      <Dialogue ouvert={!!acces} titre={acces ? `Accès de ${acces.prenom} ${acces.nom}` : ''} onFermer={() => setAcces(null)}>
        {acces && (
          <div className="flex flex-col gap-3">
            <p className="m-0 flex items-start gap-2 text-[14px] font-semibold">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-succes" aria-hidden />
              Donnez-lui ce mot de passe provisoire. Il devra le changer à sa première connexion, avec son e-mail ({acces.identifiant}) ou son téléphone.
            </p>
            <div className="flex items-center gap-2.5">
              <span className="flex-1 rounded-xl border-[1.5px] border-dashed border-succes bg-succes-fond px-4 py-3 text-center text-[24px] font-extrabold tracking-[0.12em] tabular-nums text-ocean-950">{acces.motDePasse}</span>
              <Bouton variante="secondaire" icone={Copy} onClick={() => navigator.clipboard?.writeText(acces.motDePasse)}>
                Copier
              </Bouton>
            </div>
            <p className="m-0 text-[12.5px] font-bold text-alerte">Ce mot de passe ne sera plus affiché ensuite.</p>
            <Bouton variante="secondaire" icone={Printer} onClick={() => setImpression(acces)}>
              Imprimer la fiche d’accès
            </Bouton>
          </div>
        )}
      </Dialogue>
      <ImpressionAcces acces={impression} compagnie={compagnie} onTermine={finImpression} />
    </div>
  );
}

function PanneauAjout({ ouvert, onFermer, onAjoute }: { ouvert: boolean; onFermer: () => void; onAjoute: (a: Acces) => void }) {
  const vide = { prenom: '', nom: '', telephone: '', email: '' };
  const [f, setF] = useState(vide);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (ouvert) {
      setF(vide);
      setErreurs({});
      setErreur('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert]);

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!f.prenom.trim()) err.prenom = 'Indiquez le prénom.';
    if (!f.nom.trim()) err.nom = 'Indiquez le nom.';
    if (f.telephone.replace(/\D/g, '').length < 9) err.telephone = 'Numéro de téléphone incomplet.';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) err.email = 'Adresse e-mail invalide.';
    setErreurs(err);
    if (Object.keys(err).length) return;
    setEnvoi(true);
    setErreur('');
    try {
      const r = await api.post('/api/adminCompagnie/equipe', { prenom: f.prenom.trim(), nom: f.nom.trim(), telephone: f.telephone.trim(), email: f.email.trim() });
      const m = r.data?.data?.membre;
      onAjoute({ prenom: m.prenom, nom: m.nom, identifiant: m.email, telephone: m.telephone, motDePasse: r.data?.data?.mot_de_passe_provisoire });
    } catch (ex) {
      const c = champsErreurs(ex);
      if (Object.keys(c).length) setErreurs({ prenom: c.prenom || '', nom: c.nom || '', telephone: c.telephone || '', email: c.email || '' });
      else setErreur(messageErreur(ex));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Tiroir
      ouvert={ouvert}
      titre="Ajouter une personne"
      sousTitre="Elle se connectera avec son e-mail ou son téléphone"
      onFermer={onFermer}
      pied={
        <>
          <Bouton variante="secondaire" onClick={onFermer} disabled={envoi}>Annuler</Bouton>
          <Bouton type="submit" form="form-equipe" icone={Plus} chargement={envoi} className="ml-auto">Ajouter</Bouton>
        </>
      }
    >
      <form id="form-equipe" onSubmit={envoyer} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ libelle="Prénom" value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} erreur={erreurs.prenom} autoFocus />
          <Champ libelle="Nom" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} erreur={erreurs.nom} />
        </div>
        <Champ libelle="Téléphone" inputMode="tel" value={f.telephone} onChange={(e) => setF({ ...f, telephone: e.target.value })} erreur={erreurs.telephone} placeholder="Ex. : 034 12 345 67" />
        <Champ libelle="E-mail" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} erreur={erreurs.email} placeholder="Ex. : nom@gmail.com" />
        <Carte className="flex items-start gap-2.5 p-3.5 text-[13px] font-semibold text-encre-douce">
          <KeyRound className="mt-0.5 h-4 w-4 flex-none text-ocean-800" aria-hidden />
          Un mot de passe provisoire sera créé et affiché une seule fois. La personne choisira son propre mot de passe à sa première connexion.
        </Carte>
        {erreur && <p role="alert" className="m-0 rounded-xl bg-danger-fond px-3 py-2 text-[13.5px] font-bold text-danger">{erreur}</p>}
      </form>
    </Tiroir>
  );
}

function PanneauGestion({ membre, onFermer, onFait }: { membre: any; onFermer: () => void; onFait: (a?: Acces) => void }) {
  const [confirmer, setConfirmer] = useState<'mdp' | 'statut' | 'retirer' | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  useEffect(() => {
    setConfirmer(null);
    setErreur('');
  }, [membre]);
  if (!membre) return <Tiroir ouvert={false} titre="" onFermer={onFermer}>{null}</Tiroir>;

  const actif = membre.statut === 1;
  const agir = async () => {
    setEnvoi(true);
    setErreur('');
    try {
      if (confirmer === 'mdp') {
        const r = await api.post(`/api/adminCompagnie/equipe/${membre.id}/mot-de-passe`);
        onFait({ prenom: membre.prenom, nom: membre.nom, identifiant: membre.email, telephone: membre.telephone, motDePasse: r.data?.data?.mot_de_passe_provisoire });
      } else if (confirmer === 'statut') {
        await api.patch(`/api/adminCompagnie/equipe/${membre.id}/${actif ? 'desactiver' : 'reactiver'}`);
        onFait();
      } else if (confirmer === 'retirer') {
        await api.delete(`/api/adminCompagnie/equipe/${membre.id}`);
        onFait();
      }
    } catch (e) {
      setErreur(messageErreur(e));
      setConfirmer(null);
    } finally {
      setEnvoi(false);
    }
  };

  const action = (icone: any, titre: string, detail: string, cle: 'mdp' | 'statut' | 'retirer', danger = false) => {
    const Icone = icone;
    return (
      <button type="button" onClick={() => setConfirmer(cle)} className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition ${danger ? 'border-danger-bord hover:bg-danger-fond' : 'border-ligne hover:bg-ocean-50'}`}>
        <Icone className={`mt-0.5 h-5 w-5 flex-none ${danger ? 'text-danger' : 'text-ocean-800'}`} aria-hidden />
        <span>
          <b className={`block text-[14.5px] ${danger ? 'text-danger' : 'text-encre'}`}>{titre}</b>
          <span className="text-[13px] font-semibold text-encre-douce">{detail}</span>
        </span>
      </button>
    );
  };

  const textes = {
    mdp: { titre: 'Donner un nouveau mot de passe ?', texte: `L’ancien mot de passe de ${membre.prenom} ne fonctionnera plus. Il devra choisir le sien à sa prochaine connexion.`, bouton: 'Créer le mot de passe' },
    statut: actif
      ? { titre: `Désactiver ${membre.prenom} ?`, texte: 'Il ne pourra plus se connecter, sur le web comme sur mobile. Ses ventes et sa caisse restent enregistrées.', bouton: 'Désactiver' }
      : { titre: `Réactiver ${membre.prenom} ?`, texte: 'Il pourra de nouveau se connecter avec son mot de passe.', bouton: 'Réactiver' },
    retirer: { titre: `Retirer ${membre.prenom} de l’équipe ?`, texte: 'Son compte est supprimé : il ne pourra plus se connecter. Ses ventes et sa caisse restent dans l’historique.', bouton: 'Retirer' },
  };
  const t = confirmer ? textes[confirmer] : null;

  return (
    <Tiroir ouvert={!!membre} titre={`${membre.prenom} ${membre.nom}`} sousTitre={`${membre.telephone} · ${membre.email}`} onFermer={onFermer}>
      <div className="flex flex-col gap-3">
        <div>{etat(membre)}</div>
        {action(KeyRound, 'Donner un nouveau mot de passe', 'S’il a oublié le sien : un mot de passe provisoire est créé.', 'mdp')}
        {action(Power, actif ? 'Désactiver le compte' : 'Réactiver le compte', actif ? 'Il ne peut plus se connecter, jusqu’à ce que vous le réactiviez.' : 'Il peut de nouveau se connecter.', 'statut', actif)}
        {action(UserMinus, 'Retirer de l’équipe', 'Pour une personne qui a quitté la compagnie.', 'retirer', true)}
        {erreur && <p role="alert" className="m-0 rounded-xl bg-danger-fond px-3 py-2 text-[13.5px] font-bold text-danger">{erreur}</p>}
      </div>
      <Dialogue ouvert={!!t} titre={t?.titre || ''} confirmer={t?.bouton} danger={confirmer === 'retirer' || (confirmer === 'statut' && actif)} chargement={envoi} onConfirmer={agir} onFermer={() => setConfirmer(null)}>
        {t?.texte}
      </Dialogue>
    </Tiroir>
  );
}
