import { useId } from "react";
import type { ItemStage } from "@/lib/stages";

// ภาพเคลื่อนไหวประจำสถานะ (หน้าติดตามพัสดุ) — SVG + CSS ล้วน ไม่มีไฟล์รูป ไม่มีไลบรารี
// ขั้น "ออกจากจีน" เลือกรถ / เรือ ตามวิธีขนส่ง · ผู้ใช้ที่ตั้งค่าลดภาพเคลื่อนไหว ภาพจะนิ่ง

const R = "#b91c1c"; // brand-600
const RL = "#fde8eb";
const INK = "#2b2d31";
const G = "#e9eaec";
const G2 = "#c9ccd1";
const Y = "#f5b301";
const B = "#3d8fd1";
const GR = "#1f9d6a";
const BOX = "#e3a65a";
const BOX_EDGE = "#8a5a1f";
const BOX_TAPE = "#f3d39f";

const css = `
.ss .o{transform-box:fill-box;transform-origin:center}
.ss .pop{animation:ss-pop 3s ease-out infinite}
.ss .draw{stroke-dasharray:40;animation:ss-draw 3s ease-out infinite}
.ss .ln{transform-box:fill-box;transform-origin:left;animation:ss-line 3s ease-out infinite}
.ss .ln2{animation-delay:.2s}.ss .ln3{animation-delay:.4s}
.ss .spin{animation:ss-spin 3s linear infinite}
.ss .spin-f{animation:ss-spin .5s linear infinite}
.ss .puff{animation:ss-puff 1.8s ease-out infinite}
.ss .puff2{animation-delay:.9s}
.ss .win{animation:ss-win 1.2s infinite}.ss .win2{animation-delay:.4s}.ss .win3{animation-delay:.8s}
.ss .fill{transform-box:fill-box;transform-origin:left;animation:ss-fill 3.5s ease-in-out infinite}
.ss .drop{animation:ss-drop 2.6s ease-in infinite}
.ss .slide{animation:ss-slide 2.8s ease-out infinite}.ss .slide2{animation-delay:.3s}.ss .slide3{animation-delay:.6s}
.ss .cloud{animation:ss-cloud 6s linear infinite}
.ss .road{stroke-dasharray:14 18;animation:ss-road .5s linear infinite}
.ss .bump{animation:ss-bump .3s ease-in-out infinite}
.ss .bob{transform-box:fill-box;transform-origin:center;animation:ss-bob 2.6s ease-in-out infinite}
.ss .wave1{animation:ss-wave 1.6s linear infinite}.ss .wave2{animation:ss-wave 1.1s linear infinite}
.ss .scan{animation:ss-scan 2.4s ease-in-out infinite}
.ss .blink{animation:ss-blink 2.4s infinite}
.ss .deliver{animation:ss-deliver 3s ease-out infinite}
.ss .shine{animation:ss-shine 1.3s infinite}
@keyframes ss-pop{0%,15%{transform:scale(0)}30%{transform:scale(1.15)}40%,85%{transform:scale(1)}100%{transform:scale(0)}}
@keyframes ss-draw{0%,30%{stroke-dashoffset:40}50%,85%{stroke-dashoffset:0}100%{stroke-dashoffset:40}}
@keyframes ss-line{0%{transform:scaleX(0)}40%,100%{transform:scaleX(1)}}
@keyframes ss-spin{to{transform:rotate(360deg)}}
@keyframes ss-puff{0%{opacity:.7;transform:translate(0,0) scale(.5)}100%{opacity:0;transform:translate(-14px,-22px) scale(1.6)}}
@keyframes ss-win{0%,100%{fill:#ffe9a8}50%{fill:#ffd24d}}
@keyframes ss-fill{0%{transform:scaleX(.05)}80%,100%{transform:scaleX(1)}}
@keyframes ss-drop{0%{transform:translateY(-70px);opacity:0}15%{opacity:1}45%{transform:translateY(0)}52%{transform:translateY(-8px)}60%,85%{transform:translateY(0);opacity:1}100%{transform:translateY(0);opacity:0}}
@keyframes ss-slide{0%{transform:translateX(-80px);opacity:0}20%{opacity:1}55%,85%{transform:translateX(0);opacity:1}100%{opacity:0}}
@keyframes ss-cloud{from{transform:translateX(60px)}to{transform:translateX(-60px)}}
@keyframes ss-road{to{stroke-dashoffset:-32}}
@keyframes ss-bump{50%{transform:translateY(-2px)}}
@keyframes ss-bob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(4px) rotate(2deg)}}
@keyframes ss-wave{to{transform:translateX(-40px)}}
@keyframes ss-scan{0%,100%{transform:translate(-26px,-8px)}50%{transform:translate(26px,8px)}}
@keyframes ss-blink{0%,40%{opacity:0}50%,90%{opacity:1}100%{opacity:0}}
@keyframes ss-deliver{0%{transform:translateX(-120px)}55%,100%{transform:translateX(0)}}
@keyframes ss-shine{0%,100%{opacity:.4}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.ss *{animation:none!important}}
`;

const Parcel = ({ x, y, w = 26, h = 22 }: { x: number; y: number; w?: number; h?: number }) => (
  <>
    <rect x={x} y={y} width={w} height={h} rx="2" fill={BOX} stroke={BOX_EDGE} strokeWidth="2" />
    <rect x={x + w / 2 - 4} y={y} width="8" height={Math.min(10, h / 2)} fill={BOX_TAPE} />
  </>
);

const Warehouse = ({ label }: { label: string }) => (
  <>
    <path d="M60 128V70l60-30 60 30v58z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
    <text x="120" y="66" textAnchor="middle" fontSize="11" fontWeight="800" fill={R}>{label}</text>
    <rect x="92" y="84" width="56" height="44" fill={G} stroke={INK} strokeWidth="2" />
  </>
);

const Check = ({ cx, cy, r, color = R }: { cx: number; cy: number; r: number; color?: string }) => (
  <>
    <circle className="o pop" cx={cx} cy={cy} r={r} fill={color} />
    <path
      className="draw"
      d={`M${cx - r * 0.45} ${cy}l${r * 0.3} ${r * 0.3} ${r * 0.6}-${r * 0.6}`}
      fill="none"
      stroke="#fff"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>
);

function Scene({ stage, sea, clipId }: { stage: ItemStage; sea: boolean; clipId: string }) {
  switch (stage) {
    case "ordered":
      return (
        <>
          <rect x="86" y="30" width="68" height="92" rx="8" fill="#fff" stroke={INK} strokeWidth="3" />
          <rect x="104" y="23" width="32" height="14" rx="4" fill={R} />
          <g fill={G2}>
            <rect className="ln" x="98" y="52" width="44" height="6" rx="3" />
            <rect className="ln ln2" x="98" y="66" width="34" height="6" rx="3" />
            <rect className="ln ln3" x="98" y="80" width="40" height="6" rx="3" />
          </g>
          <Check cx={152} cy={110} r={20} />
        </>
      );
    case "in_production":
      return (
        <>
          <rect x="148" y="30" width="12" height="38" fill={INK} />
          <circle className="o puff" cx="154" cy="26" r="6" fill={G2} />
          <circle className="o puff puff2" cx="154" cy="26" r="6" fill={G2} />
          <path d="M70 112V74l25-16v16l25-16v16l25-16v54z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <rect x="145" y="68" width="25" height="44" fill="#fff" stroke={INK} strokeWidth="3" />
          <rect className="win" fill="#ffe9a8" x="80" y="84" width="14" height="10" rx="1" />
          <rect className="win win2" fill="#ffe9a8" x="100" y="84" width="14" height="10" rx="1" />
          <rect className="win win3" fill="#ffe9a8" x="120" y="84" width="14" height="10" rx="1" />
          <rect x="152" y="92" width="11" height="20" fill={R} />
          <circle className="o spin" cx="157" cy="80" r="5" fill="none" stroke={Y} strokeWidth="3" strokeDasharray="3 2.5" />
          <rect x="70" y="120" width="100" height="10" rx="5" fill="#fff" stroke={INK} strokeWidth="2" />
          <rect className="fill" x="72" y="122" width="96" height="6" rx="3" fill={R} />
        </>
      );
    case "china_warehouse":
      return (
        <>
          <Warehouse label="CN" />
          <g className="drop"><Parcel x={104} y={100} w={32} h={26} /></g>
        </>
      );
    case "loaded":
      return (
        <>
          <rect x="96" y="60" width="100" height="60" rx="3" fill={R} />
          <g stroke="#000" strokeOpacity=".15" strokeWidth="2">
            {[110, 124, 138, 152, 166, 180].map((x) => (
              <line key={x} x1={x} y1="64" x2={x} y2="116" />
            ))}
          </g>
          <rect x="100" y="64" width="40" height="52" fill="#7e0a1c" />
          <g className="slide"><Parcel x={106} y={90} /></g>
          <g className="slide slide2"><Parcel x={108} y={68} w={22} h={20} /></g>
          <line x1="40" y1="122" x2="200" y2="122" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case "departed":
      return sea ? (
        <>
          <g className="bob">
            <rect x="78" y="74" width="22" height="14" fill={B} />
            <rect x="101" y="74" width="22" height="14" fill={Y} />
            <rect x="124" y="74" width="22" height="14" fill={R} />
            <rect x="90" y="60" width="22" height="14" fill={R} />
            <rect x="113" y="60" width="22" height="14" fill={GR} />
            <rect x="150" y="58" width="18" height="30" fill="#fff" stroke={INK} strokeWidth="2" />
            <rect x="154" y="63" width="10" height="5" fill={B} />
            <path d="M64 88h120l-12 22H78z" fill={R} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          </g>
          <g clipPath={`url(#${clipId})`}>
            <g className="wave1">
              <path d="M40 112q10-6 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0V150H40z" fill={B} opacity=".85" />
            </g>
            <g className="wave2">
              <path d="M30 122q10-6 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0V150H30z" fill="#2a6fae" />
            </g>
          </g>
        </>
      ) : (
        <>
          <g className="cloud">
            <ellipse cx="120" cy="38" rx="18" ry="7" fill="#fff" />
            <ellipse cx="130" cy="33" rx="10" ry="7" fill="#fff" />
          </g>
          <line x1="40" y1="128" x2="200" y2="128" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <line className="road" x1="40" y1="136" x2="200" y2="136" stroke={G2} strokeWidth="3" />
          <g className="bump">
            <rect x="62" y="70" width="84" height="46" rx="4" fill={R} />
            <text x="104" y="98" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">SAANHA</text>
            <path d="M150 82h22q5 0 8 5l8 12v17h-38z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
            <path d="M158 88h12l7 10h-19z" fill="#9fd3f2" />
            {[82, 170].map((cx) => (
              <g key={cx} className="o spin-f">
                <circle cx={cx} cy="120" r="9" fill={INK} />
                <rect x={cx - 2} y="113" width="4" height="14" fill="#888" />
              </g>
            ))}
          </g>
          <circle className="o puff" cx="56" cy="110" r="5" fill={G2} />
        </>
      );
    case "customs":
      return (
        <>
          <rect x="88" y="66" width="64" height="54" rx="3" fill={BOX} stroke={BOX_EDGE} strokeWidth="3" />
          <rect x="112" y="66" width="16" height="18" fill={BOX_TAPE} />
          <g className="scan">
            <circle cx="120" cy="86" r="18" fill="#fff" fillOpacity=".55" stroke={INK} strokeWidth="4" />
            <line x1="133" y1="99" x2="146" y2="112" stroke={INK} strokeWidth="7" strokeLinecap="round" />
          </g>
          <g className="blink">
            <circle cx="158" cy="56" r="13" fill={GR} />
            <path d="M152 56l4 4 8-8" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          </g>
        </>
      );
    case "thai_warehouse":
      return (
        <>
          <Warehouse label="TH" />
          <g className="slide"><Parcel x={98} y={106} w={22} h={20} /></g>
          <g className="slide slide2"><Parcel x={122} y={106} w={22} h={20} /></g>
          <g className="slide slide3"><Parcel x={110} y={88} w={22} h={18} /></g>
        </>
      );
    case "out_for_delivery":
      return (
        <>
          <path d="M150 128V88l22-18 22 18v40z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <rect x="166" y="104" width="12" height="24" fill={R} />
          <line x1="40" y1="128" x2="200" y2="128" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <g className="deliver">
            <g className="bump">
              <rect x="66" y="88" width="48" height="30" rx="4" fill={R} />
              <path d="M114 96h14l8 10v12h-22z" fill="#fff" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
              <rect x="76" y="96" width="16" height="12" rx="1" fill={BOX} />
              <circle cx="80" cy="121" r="7" fill={INK} />
              <circle cx="124" cy="121" r="7" fill={INK} />
            </g>
          </g>
        </>
      );
    case "delivered":
      return (
        <>
          <path d="M78 128V82l38-30 38 30v46z" fill="#fff" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <rect x="106" y="98" width="20" height="30" fill={R} />
          <Parcel x={132} y={110} w={22} h={18} />
          <Check cx={160} cy={58} r={20} color={GR} />
          <g className="shine" fill={Y}>
            <circle cx="70" cy="50" r="3" />
            <circle cx="186" cy="92" r="3" />
            <circle cx="84" cy="36" r="2" />
          </g>
        </>
      );
  }
}

export function StageScene({ stage, method, label }: { stage: ItemStage; method: string; label: string }) {
  const clipId = `ss-clip-${useId().replace(/:/g, "")}`;
  return (
    <figure className="mb-5 rounded-xl bg-gray-50 px-4 pt-3 pb-4 text-center">
      <style href="stage-scene" precedence="default">{css}</style>
      <svg viewBox="0 0 240 150" className="ss mx-auto block h-auto w-full max-w-xs" role="img" aria-label={label}>
        <defs>
          <clipPath id={clipId}>
            <circle cx="120" cy="78" r="62" />
          </clipPath>
        </defs>
        <circle cx="120" cy="78" r="62" fill={stage === "delivered" ? "#e3f5ec" : RL} />
        <Scene stage={stage} sea={method === "sea"} clipId={clipId} />
      </svg>
      <figcaption className="mt-1 font-semibold text-brand-700">{label}</figcaption>
    </figure>
  );
}
