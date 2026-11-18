/**
 * Illustration de la page de connexion : crépuscule sur une route de
 * Madagascar et allée de baobabs.
 * SVG pur (aucune image à charger), cadré en « cover ».
 */
export function Paysage({ className = '' }: { className?: string }) {
  // Baobabs : x, échelle, opacité (les plus lointains sont plus clairs)
  const baobabs: [number, number, number][] = [
    [70, 1.25, 1],
    [215, 0.95, 1],
    [330, 0.62, 0.92],
    [405, 0.42, 0.8],
    [618, 0.5, 0.85],
    [700, 0.78, 0.95],
    [790, 1.15, 1],
  ];
  const etoiles = [
    [60, 70, 1.4], [150, 140, 1], [240, 60, 1.2], [330, 120, 0.9], [420, 50, 1.3], [520, 150, 1], [610, 80, 1.1], [720, 40, 1.4], [760, 170, 0.9], [90, 230, 0.8], [470, 230, 0.8], [650, 250, 0.9], [300, 260, 0.7],
  ];

  return (
    <svg viewBox="0 0 860 1000" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden>
      <defs>
        <linearGradient id="pz-ciel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#03162B" />
          <stop offset="0.38" stopColor="#062A4A" />
          <stop offset="0.6" stopColor="#0B4F8A" />
          <stop offset="0.72" stopColor="#4F7FA8" />
          <stop offset="0.8" stopColor="#D99A62" />
          <stop offset="0.86" stopColor="#F4C27F" />
        </linearGradient>
        <radialGradient id="pz-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFE6B3" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#FFC97A" stopOpacity="0.45" />
          <stop offset="1" stopColor="#FFC97A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pz-sol" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#06213A" />
          <stop offset="1" stopColor="#020D1A" />
        </linearGradient>
        <linearGradient id="pz-route" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A4F66" />
          <stop offset="1" stopColor="#0A1B2E" />
        </linearGradient>
        {/* Baobab : tronc massif évasé, couronne de branches courtes */}
        <symbol id="pz-baobab" viewBox="-60 -230 120 230" overflow="visible">
          <path d="M-20 0 C-17 -60 -15 -120 -14 -178 L14 -178 C15 -120 17 -60 20 0 Z" />
          <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="6">
            <path d="M-10 -176 C-22 -190 -34 -196 -48 -198" />
            <path d="M-6 -178 C-12 -196 -16 -210 -26 -222" />
            <path d="M0 -178 C0 -198 2 -214 0 -230" />
            <path d="M6 -178 C14 -196 18 -208 28 -220" />
            <path d="M10 -176 C24 -186 36 -190 50 -196" />
            <path d="M-30 -194 C-36 -204 -40 -210 -44 -216" strokeWidth="4" />
            <path d="M32 -190 C38 -200 44 -206 48 -212" strokeWidth="4" />
          </g>
        </symbol>
      </defs>

      <rect width="860" height="1000" fill="url(#pz-ciel)" />
      {etoiles.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.35 + (i % 3) * 0.2} />
      ))}

      {/* Soleil couchant */}
      <circle cx="520" cy="805" r="230" fill="url(#pz-halo)" />
      <circle cx="520" cy="812" r="58" fill="#FFD996" />

      {/* Nuages étirés */}
      <g fill="#F8D3A0" opacity="0.35">
        <ellipse cx="240" cy="720" rx="190" ry="7" />
        <ellipse cx="660" cy="742" rx="150" ry="5" />
        <ellipse cx="420" cy="690" rx="120" ry="4" />
      </g>

      {/* Collines lointaines */}
      <path d="M0 830 C120 800 220 812 320 822 C420 832 520 806 640 812 C740 818 800 806 860 812 L860 860 L0 860 Z" fill="#123A5E" opacity="0.85" />
      {/* Sol */}
      <path d="M0 848 C200 840 400 846 860 840 L860 1000 L0 1000 Z" fill="url(#pz-sol)" />

      {/* Route en perspective */}
      <path d="M498 846 L512 846 L700 1000 L240 1000 Z" fill="url(#pz-route)" />
      <g fill="#F4C27F" opacity="0.75">
        <path d="M504 860 L506 860 L507 868 L503 868 Z" />
        <path d="M502 884 L507 884 L509 898 L500 898 Z" />
        <path d="M498 922 L509 922 L512 944 L495 944 Z" />
        <path d="M492 972 L513 972 L517 1000 L488 1000 Z" />
      </g>

      {/* Baobabs */}
      {baobabs.map(([x, s, o], i) => (
        <use key={i} href="#pz-baobab" x={x - 60 * s} y={850 - 230 * s} width={120 * s} height={230 * s} fill="#020E1C" color="#020E1C" opacity={o} />
      ))}

    </svg>
  );
}
