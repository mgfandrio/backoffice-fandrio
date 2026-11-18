import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { CameraOff, X } from 'lucide-react';
import { Bouton } from '@/components/ui';

/**
 * Lecture d'un QR code avec la caméra de l'ordinateur (quand il n'y a pas de douchette).
 * Chaque QR lu est transmis une seule fois, puis la caméra se ferme.
 */
export function LecteurCamera({ ouvert, onLu, onFermer }: { ouvert: boolean; onLu: (texte: string) => void; onFermer: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const lu = useRef(false);

  useEffect(() => {
    if (!ouvert || !video.current) return;
    lu.current = false;
    setErreur(null);
    const lecteur = new QrScanner(
      video.current,
      (r) => {
        if (lu.current) return;
        lu.current = true;
        onLu(r.data);
      },
      { highlightScanRegion: true, highlightCodeOutline: true, returnDetailedScanResult: true }
    );
    lecteur.start().catch(() => setErreur("La caméra n'est pas accessible. Autorisez-la dans le navigateur (icône à gauche de l'adresse), ou utilisez la douchette."));
    return () => {
      lecteur.stop();
      lecteur.destroy();
    };
  }, [ouvert, onLu]);

  if (!ouvert) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ocean-950/70 p-4" role="dialog" aria-modal="true" aria-label="Lecture avec la caméra">
      <div className="flex w-full max-w-lg flex-col gap-3 rounded-[20px] bg-white p-5">
        <div className="flex items-center gap-3">
          <h2 className="m-0 flex-1 text-lg font-extrabold">Lire un billet avec la caméra</h2>
          <button type="button" onClick={onFermer} aria-label="Fermer la caméra" className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-fond">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className="m-0 text-[14px] font-semibold text-encre-douce">Présentez le QR code du billet devant la caméra.</p>
        {erreur ? (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-danger-fond p-6 text-center text-danger">
            <CameraOff className="h-8 w-8" aria-hidden />
            <p className="m-0 text-[14px] font-bold">{erreur}</p>
          </div>
        ) : (
          <video ref={video} className="aspect-[4/3] w-full rounded-xl bg-ocean-950 object-cover" muted playsInline />
        )}
        <Bouton variante="secondaire" onClick={onFermer}>
          Fermer
        </Bouton>
      </div>
    </div>
  );
}
