import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { useCompteurControle, useCompteursCompagnie } from '@/api/requetes';
import { menuDe } from '@/navigation/menus';
import { initiales } from '@/utils/format';
import logoFandrio from '@/assets/logo-fandrio.png';

/** Menu latéral bleu marine, selon le rôle (maquette « Back-office web »). */
export function Menu({ onNaviguer, onDeconnexion }: { onNaviguer?: () => void; onDeconnexion: () => void }) {
  const { utilisateur } = useAuth();
  const { suivi, planning, versements } = useCompteursCompagnie();
  const controle = useCompteurControle();
  const compteurs = { suivi: suivi.data?.total || 0, planning: planning.data?.total || 0, controle: controle.data?.total || 0, versements: versements.data?.retard || 0 };
  const sections = menuDe(utilisateur?.role);
  const nom = `${utilisateur?.prenom || ''} ${utilisateur?.nom || ''}`.trim();
  const sousTitre = utilisateur?.role === 3 ? 'Administration' : utilisateur?.compagnie?.nom || 'Ma compagnie';

  return (
    <div className="flex h-full flex-col gap-1 bg-ocean-950 px-3.5 py-[18px] text-white">
      <div className="flex items-center gap-2.5 px-2 pb-4 pt-1">
        {utilisateur?.compagnie?.logo ? (
          <img src={utilisateur.compagnie.logo} alt="" className="h-[38px] w-[38px] rounded-[11px] bg-white object-cover" />
        ) : (
          <img src={logoFandrio} alt="" className="h-[38px] w-[38px]" />
        )}
        <span className="min-w-0">
          <b className="block text-base tracking-wide">FANDRIO</b>
          <span className="block truncate text-xs font-semibold text-marine-texte">{sousTitre}</span>
        </span>
      </div>

      <nav aria-label="Menu principal" className="flex flex-col gap-0.5 overflow-y-auto">
        {sections.map((s) => (
          <div key={s.titre} className="flex flex-col gap-0.5">
            <span className="px-3 pb-1.5 pt-3.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-marine-section">{s.titre}</span>
            {s.entrees.map((e) => {
              const n = e.compteur ? compteurs[e.compteur] : 0;
              return (
                <NavLink
                  key={e.chemin}
                  to={e.chemin}
                  end={e.chemin === '/compagnie' || e.chemin === '/systeme'}
                  onClick={onNaviguer}
                  className={({ isActive }) =>
                    `flex min-h-10 items-center gap-[11px] rounded-[11px] px-3 py-2 text-[13.5px] transition-colors ${
                      isActive ? 'bg-ocean-800 font-extrabold text-white' : 'font-semibold text-marine-menu hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <e.icone className="h-[19px] w-[19px] flex-none" aria-hidden />
                  <span className="min-w-0 leading-tight">{e.libelle}</span>
                  {n > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-alerte-vif px-1.5 text-[11px] font-extrabold text-[#2B1700]" aria-label={`${n} à traiter`}>
                      {n}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto pt-4">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/5 p-2.5">
          <NavLink to="/profil" onClick={onNaviguer} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-white no-underline hover:text-white" aria-label="Mon profil">
            {utilisateur?.photo ? (
              <img src={utilisateur.photo} alt="" className="h-[34px] w-[34px] flex-none rounded-[10px] object-cover" />
            ) : (
              <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-ocean-800 text-[13px] font-extrabold">{initiales(nom)}</span>
            )}
            <span className="min-w-0">
              <b className="block truncate text-[13px]">{nom || 'Administrateur'}</b>
              <span className="block text-[11.5px] font-semibold text-marine-texte">{utilisateur?.role === 3 ? 'Admin système' : 'Admin compagnie'}</span>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={onDeconnexion}
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] text-marine-menu hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px]" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
