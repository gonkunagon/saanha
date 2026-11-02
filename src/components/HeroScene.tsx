// ภาพพื้นหลังหน้าแรก: ท่าเรือยามพระอาทิตย์ตก — เรือตู้คอนเทนเนอร์ ปั้นจั่น เครื่องบิน และรถบรรทุก SAANHA บนถนนที่มีแสงไฟวิ่ง
// วาดเป็น SVG เต็มความกว้าง (slice) ชิดขวาล่าง เพื่อให้มือถือยังเห็นรถบรรทุก

const deckRows = [
  { y: 498, colors: ["#7f1d1d", "#1e3a8a", "#92400e", "#9f1239", "#134e4a", "#7f1d1d", "#1e3a8a", "#92400e", "#9f1239", "#134e4a"] },
  { y: 477, colors: ["#1e3a8a", "#9f1239", "#134e4a", "#7f1d1d", "#92400e", "#1e3a8a", "#7f1d1d", "#134e4a"] },
  { y: 456, colors: ["#92400e", "#7f1d1d", "#1e3a8a", "#9f1239", "#7f1d1d"] },
];

function Crane({ x, boomTo, top, opacity = 1 }: { x: number; boomTo: number; top: number; opacity?: number }) {
  return (
    <g stroke="#1e1b4b" strokeLinecap="round" opacity={opacity}>
      <path d={`M${x} 562V${top}M${x + 64} 562V${top}M${x} ${top + 70}h64M${x} ${top + 140}h64`} strokeWidth="9" />
      <path d={`M${x} ${top + 70}l64 70M${x + 64} ${top + 70}l-64 70`} strokeWidth="4" />
      <path d={`M${boomTo} ${top}H${x + 110}`} strokeWidth="10" />
      <path d={`M${x + 32} ${top - 60}V${top}M${x + 32} ${top - 60}L${boomTo + 40} ${top}M${x + 32} ${top - 60}L${x + 110} ${top}`} strokeWidth="3" />
      <rect x={boomTo + 60} y={top + 4} width="26" height="18" fill="#1e1b4b" stroke="none" />
    </g>
  );
}

export function HeroScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1600 700" preserveAspectRatio="xMaxYMax slice" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1033" />
          <stop offset="0.35" stopColor="#312e81" />
          <stop offset="0.58" stopColor="#be185d" />
          <stop offset="0.74" stopColor="#f97316" />
          <stop offset="0.82" stopColor="#fde68a" />
        </linearGradient>
        <radialGradient id="hs-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fffbeb" />
          <stop offset="0.15" stopColor="#fde68a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hs-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a5f3fc" stopOpacity="0" />
          <stop offset="0.5" stopColor="#e0f2fe" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hs-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fb923c" />
          <stop offset="1" stopColor="#4c1d95" />
        </linearGradient>
        <linearGradient id="hs-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#334155" />
          <stop offset="1" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="hs-trailer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f87171" />
          <stop offset="0.25" stopColor="#dc2626" />
          <stop offset="1" stopColor="#7f1d1d" />
        </linearGradient>
        <linearGradient id="hs-rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fdba74" stopOpacity="0.7" />
          <stop offset="0.12" stopColor="#fdba74" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hs-cab" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b5bdb" />
          <stop offset="1" stopColor="#172554" />
        </linearGradient>
        <linearGradient id="hs-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f9a8d4" />
          <stop offset="0.5" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="hs-trail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset="0.6" stopColor="white" stopOpacity="1" />
          <stop offset="1" stopColor="white" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="hs-contrail" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="white" stopOpacity="0.8" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <filter id="hs-glow" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="hs-soft" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <mask id="hs-trail-mask">
          <rect width="1600" height="700" fill="url(#hs-trail)" />
        </mask>
      </defs>

      {/* ท้องฟ้า แสงอาทิตย์ ลำแสง */}
      <rect width="1600" height="700" fill="url(#hs-sky)" />
      <circle cx="1040" cy="540" r="380" fill="url(#hs-sun)" />
      <g fill="url(#hs-beam)">
        <polygon points="0,40 1500,520 1500,540 0,90" />
        <polygon points="0,170 1300,560 1300,572 0,200" />
        <polygon points="200,0 1600,430 1600,450 260,0" />
      </g>

      {/* เมฆ: ด้านล่างรับแสงส้ม ด้านบนชมพู */}
      <g filter="url(#hs-soft)">
        {[
          [900, 150, 170], [1180, 230, 140], [1420, 120, 120], [620, 260, 150], [1330, 330, 180], [780, 360, 120],
        ].map(([cx, cy, rx]) => (
          <g key={`${cx}-${cy}`}>
            <ellipse cx={cx} cy={cy} rx={rx} ry={rx / 9} fill="#f472b6" fillOpacity="0.55" />
            <ellipse cx={cx + 20} cy={cy + 8} rx={rx * 0.7} ry={rx / 14} fill="#fb923c" fillOpacity="0.7" />
            <ellipse cx={cx - rx * 0.4} cy={cy - 9} rx={rx * 0.45} ry={rx / 12} fill="#c084fc" fillOpacity="0.45" />
          </g>
        ))}
      </g>

      {/* เครื่องบิน */}
      <g transform="translate(1290 150) rotate(-14)">
        <rect x="-420" y="-2" width="350" height="4" fill="url(#hs-contrail)" />
        <ellipse rx="64" ry="8" fill="#0f172a" />
        <path d="M-6 -2L-30 -46H-15L22 -2zM-6 2L-34 44H-19L22 2zM-52 -2L-66 -26H-57L-42 -2z" fill="#0f172a" />
      </g>

      {/* ทะเล */}
      <rect y="545" width="1600" height="60" fill="url(#hs-water)" />
      <path d="M980 560h120M960 572h160M1000 584h90" stroke="#fde68a" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" />

      {/* ปั้นจั่น */}
      <Crane x={1010} boomTo={720} top={330} opacity={0.75} />
      <Crane x={880} boomTo={560} top={300} />

      {/* ลานตู้ */}
      <g fill="#1e1b4b">
        <rect x="1110" y="508" width="120" height="54" />
        <rect x="1130" y="486" width="80" height="22" />
        <rect x="1240" y="520" width="140" height="42" />
      </g>
      <path d="M1110 508h120M1130 486h80M1240 520h140" stroke="#fdba74" strokeOpacity="0.6" strokeWidth="2" />

      {/* เรือตู้คอนเทนเนอร์ */}
      <g>
        {deckRows.map((row, r) =>
          row.colors.map((color, i) => (
            <g key={`${r}-${i}`}>
              <rect x={420 + r * 20 + i * 38} y={row.y} width="36" height="20" fill={color} />
              <rect x={420 + r * 20 + i * 38} y={row.y} width="36" height="2.5" fill="#fdba74" fillOpacity="0.7" />
            </g>
          )),
        )}
        <path d="M820 518V430h56v88z" fill="#e2e8f0" />
        <path d="M820 430h56v6h-56z" fill="#fdba74" />
        {[444, 462, 480, 498].map((y) => (
          <path key={y} d={`M828 ${y}h40`} stroke="#fde68a" strokeWidth="5" strokeDasharray="6 4" />
        ))}
        <rect x="836" y="404" width="22" height="26" fill="#b91c1c" />
        <path d="M360 516H912L890 584H420Q384 556 360 516Z" fill="#1e3a8a" />
        <path d="M368 530H906" stroke="#fdba74" strokeOpacity="0.5" strokeWidth="2" />
        <path d="M384 556H898" stroke="#dc2626" strokeWidth="7" />
      </g>

      {/* ท่าเรือ เสาไฟ */}
      <rect y="580" width="1600" height="26" fill="#1c1917" />
      {[180, 560, 940].map((x) => (
        <g key={x}>
          <path d={`M${x} 590V450h26`} stroke="#0f172a" strokeWidth="5" fill="none" />
          <circle cx={x + 28} cy="454" r="14" fill="#fde68a" filter="url(#hs-glow)" />
          <circle cx={x + 28} cy="454" r="4" fill="#fffbeb" />
        </g>
      ))}

      {/* ถนนและแสงไฟวิ่ง */}
      <path d="M0 606H1600V700H0z" fill="url(#hs-road)" />
      <path d="M0 610H1600" stroke="#fdba74" strokeOpacity="0.5" strokeWidth="3" />
      <g mask="url(#hs-trail-mask)" fill="none" strokeLinecap="round">
        <path d="M0 668C400 648 900 636 1600 640" stroke="#ef4444" strokeWidth="8" filter="url(#hs-glow)" />
        <path d="M0 668C400 648 900 636 1600 640" stroke="#fecaca" strokeWidth="2" />
        <path d="M0 690C500 672 1000 664 1600 668" stroke="#f59e0b" strokeWidth="8" filter="url(#hs-glow)" />
        <path d="M0 690C500 672 1000 664 1600 668" stroke="#fef3c7" strokeWidth="2" />
        <path d="M0 640C300 628 800 622 1600 626" stroke="#22d3ee" strokeWidth="6" filter="url(#hs-glow)" />
        <path d="M0 640C300 628 800 622 1600 626" stroke="#cffafe" strokeWidth="1.5" />
      </g>
      <path d="M40 684h70M180 682h70M320 680h70M460 678h70M600 676h70M740 675h70M880 674h70" stroke="white" strokeOpacity="0.7" strokeWidth="4" />

      {/* รถบรรทุก SAANHA */}
      <ellipse cx="1300" cy="668" rx="260" ry="14" fill="#000" fillOpacity="0.55" filter="url(#hs-glow)" />
      <ellipse cx="1300" cy="676" rx="200" ry="10" fill="#dc2626" fillOpacity="0.35" filter="url(#hs-glow)" />
      <g>
        <rect x="1060" y="452" width="340" height="150" rx="4" fill="url(#hs-trailer)" />
        {Array.from({ length: 16 }, (_, i) => (
          <path key={i} d={`M${1078 + i * 20} 460v134`} stroke="#450a0a" strokeOpacity="0.25" strokeWidth="3" />
        ))}
        <rect x="1060" y="452" width="340" height="150" rx="4" fill="url(#hs-rim)" />
        <rect x="1060" y="452" width="340" height="6" rx="3" fill="#fecaca" fillOpacity="0.8" />
        <text x="1230" y="548" textAnchor="middle" fill="white" fontSize="62" fontWeight="800" letterSpacing="3">
          SAANHA
        </text>
        <path d="M1130 566h200" stroke="white" strokeOpacity="0.85" strokeWidth="4" strokeLinecap="round" />

        <path d="M1404 616V488h76l48 56v72z" fill="url(#hs-cab)" />
        <path d="M1416 500h58l40 46h-98z" fill="url(#hs-glass)" />
        <path d="M1404 562h124" stroke="#fdba74" strokeOpacity="0.5" strokeWidth="2" />
        <circle cx="1522" cy="596" r="18" fill="#fde68a" filter="url(#hs-glow)" />
        <rect x="1514" y="588" width="16" height="12" rx="3" fill="#fffbeb" />

        <rect x="1050" y="600" width="490" height="14" rx="4" fill="#0f172a" />
        {[1110, 1170, 1340, 1484].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="630" r="27" fill="#020617" />
            <circle cx={cx} cy="630" r="12" fill="#94a3b8" />
            <circle cx={cx} cy="630" r="4" fill="#0f172a" />
          </g>
        ))}
      </g>
    </svg>
  );
}
