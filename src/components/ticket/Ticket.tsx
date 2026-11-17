import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { ariary } from '@/utils/format';

/** Données d'un ticket de vente au guichet. */
export interface DonneesTicket {
  compagnie: { nom: string; telephone?: string | null; adresse?: string | null };
  numero: string;
  trajet: string;
  date: string; // JJ/MM/AAAA
  heure: string;
  vehicule?: string | null;
  voyageurs: { nom: string; siege: string }[];
  montant: number;
  /** Contenu du QR (JSON du billet, le même que l'app mobile). */
  qr: string;
  guichetier: string;
  venduLe: string;
}

/** Ticket 80 mm, noir et blanc (imprimantes thermiques ou classiques). */
export function Ticket({ t, qrImage }: { t: DonneesTicket; qrImage: string | null }) {
  const ligne = 'flex justify-between gap-2.5 text-[12.5px]';
  const trait = <hr className="m-0 border-0 border-t-[1.5px] border-dashed border-black" />;
  return (
    <div className="flex w-[72mm] flex-col gap-2.5 bg-white p-[3mm] font-sans text-black">
      <div className="flex flex-col gap-0.5 text-center">
        <b className="text-[19px] tracking-[0.08em]">FANDRIO</b>
        <b className="text-[14px]">{t.compagnie.nom}</b>
        {(t.compagnie.adresse || t.compagnie.telephone) && <span className="text-[11.5px] font-semibold">{[t.compagnie.adresse, t.compagnie.telephone].filter(Boolean).join(' · ')}</span>}
      </div>
      {trait}
      <div className="text-center">
        <span className="text-[11px] font-extrabold tracking-[0.1em]">BILLET DE VOYAGE</span>
        <div className="mt-1 text-[16px] font-extrabold leading-snug">{t.trajet}</div>
      </div>
      <div className="flex justify-center gap-5 text-center tabular-nums">
        <span>
          <span className="block text-[11px] font-bold">DATE</span>
          <b className="text-[15px]">{t.date}</b>
        </span>
        <span>
          <span className="block text-[11px] font-bold">DÉPART</span>
          <b className="text-[15px]">{t.heure.slice(0, 5)}</b>
        </span>
      </div>
      {trait}
      <div className="flex flex-col gap-1 tabular-nums">
        {t.voyageurs.map((v) => (
          <div key={v.siege} className={ligne}>
            <span className="font-bold">{v.nom}</span>
            <b>Siège {v.siege}</b>
          </div>
        ))}
        {t.vehicule && (
          <div className={ligne}>
            <span className="font-semibold">Véhicule</span>
            <b>{t.vehicule}</b>
          </div>
        )}
        <div className={ligne}>
          <span className="font-semibold">Billet n°</span>
          <b>{t.numero}</b>
        </div>
      </div>
      <div className="flex justify-center">{qrImage ? <img src={qrImage} alt="QR code du billet" className="h-[42mm] w-[42mm]" /> : <span className="h-[42mm] w-[42mm]" />}</div>
      <span className="text-center text-[11.5px] font-bold">Présentez ce ticket à l’embarquement</span>
      {trait}
      <div className="flex flex-col gap-1 tabular-nums">
        <div className={ligne}>
          <span className="font-semibold">Payé en espèces</span>
          <b>{ariary(t.montant)}</b>
        </div>
        <div className={ligne}>
          <span className="font-semibold">Vendu le</span>
          <b>{t.venduLe}</b>
        </div>
        <div className={ligne}>
          <span className="font-semibold">Guichetier</span>
          <b>{t.guichetier}</b>
        </div>
      </div>
      {trait}
      <span className="text-center text-[11px] font-semibold leading-snug">Billet nominatif. Merci et bon voyage !</span>
    </div>
  );
}

/** Image du QR code (en noir sur blanc, marge minimale). */
export function useQrImage(contenu: string | null) {
  const [image, setImage] = useState<string | null>(null);
  useEffect(() => {
    let actif = true;
    setImage(null);
    if (contenu) {
      QRCode.toDataURL(contenu, { margin: 1, width: 320, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#FFFFFF' } })
        .then((url) => actif && setImage(url))
        .catch(() => actif && setImage(null));
    }
    return () => {
      actif = false;
    };
  }, [contenu]);
  return image;
}

/**
 * Imprime un ticket : il est posé dans une zone réservée à l'impression (hors de
 * l'application, cf. index.css), puis la fenêtre d'impression du navigateur s'ouvre.
 */
export function ImpressionTicket({ ticket, onTermine }: { ticket: DonneesTicket | null; onTermine: () => void }) {
  const qr = useQrImage(ticket?.qr || null);

  useEffect(() => {
    if (!ticket || !qr) return;
    const fin = () => onTermine();
    window.addEventListener('afterprint', fin, { once: true });
    // Laisse l'image du QR se dessiner avant d'ouvrir la fenêtre d'impression
    const t = window.setTimeout(() => window.print(), 150);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', fin);
    };
  }, [ticket, qr, onTermine]);

  if (!ticket) return null;
  return createPortal(
    <div id="zone-impression">
      <Ticket t={ticket} qrImage={qr} />
    </div>,
    document.body
  );
}
