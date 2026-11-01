// ภาพประกอบการขนส่งทางรถและทางเรือ ใช้ในส่วน "เลือกวิธีขนส่ง" หน้าแรก

type Props = { className?: string };

function Sky() {
  return (
    <>
      <rect width="400" height="220" className="fill-sky-100" />
      <circle cx="335" cy="48" r="22" className="fill-accent-300" />
      <g className="fill-white">
        <ellipse cx="80" cy="45" rx="30" ry="11" />
        <ellipse cx="102" cy="38" rx="20" ry="10" />
        <ellipse cx="250" cy="62" rx="24" ry="8" />
      </g>
    </>
  );
}

export function TruckScene({ className }: Props) {
  return (
    <svg viewBox="0 0 400 220" aria-hidden="true" className={className}>
      <Sky />
      {/* เนินเขา */}
      <path d="M0 150 Q70 100 150 140 T300 125 T400 135 V180 H0z" className="fill-emerald-200" />
      <path d="M0 165 Q100 130 210 160 T400 150 V180 H0z" className="fill-emerald-300" />
      {/* ถนน */}
      <rect y="178" width="400" height="42" className="fill-slate-700" />
      <path d="M10 199h30M70 199h30M130 199h30M190 199h30M250 199h30M310 199h30M370 199h30" className="stroke-white" strokeWidth="3" />
      {/* เส้นความเร็ว */}
      <path d="M20 120h40M10 140h50M28 160h32" className="stroke-white" strokeWidth="4" strokeLinecap="round" />
      {/* ตู้สินค้า */}
      <rect x="72" y="95" width="172" height="74" rx="5" className="fill-brand-600" />
      <rect x="72" y="95" width="172" height="10" rx="5" className="fill-brand-700" />
      <text x="158" y="145" textAnchor="middle" className="fill-white" fontSize="26" fontWeight="800" fontFamily="sans-serif">
        SAANHA
      </text>
      {/* หัวรถ */}
      <path d="M248 112h40l26 28v29h-66z" className="fill-brand-700" />
      <path d="M258 120h26l17 19h-43z" className="fill-sky-200" />
      <rect x="306" y="152" width="12" height="7" rx="2" className="fill-accent-400" />
      <rect x="244" y="165" width="78" height="8" rx="3" className="fill-slate-800" />
      {/* ล้อ */}
      {[104, 146, 286].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="176" r="15" className="fill-slate-900" />
          <circle cx={cx} cy="176" r="6" className="fill-slate-300" />
        </g>
      ))}
    </svg>
  );
}

const containerColors = ["fill-brand-500", "fill-accent-400", "fill-sky-600", "fill-emerald-500", "fill-brand-300", "fill-slate-500"];

export function ShipScene({ className }: Props) {
  return (
    <svg viewBox="0 0 400 220" aria-hidden="true" className={className}>
      <Sky />
      {/* ทะเล */}
      <rect y="150" width="400" height="70" className="fill-sky-500" />
      {/* ตู้คอนเทนเนอร์ 2 ชั้น */}
      {[0, 1].map((row) =>
        [0, 1, 2, 3, 4].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={78 + col * 38}
            y={114 - row * 22}
            width="35"
            height="20"
            rx="1.5"
            className={containerColors[(row * 5 + col + row) % containerColors.length]}
          />
        )),
      )}
      {/* สะพานเดินเรือและปล่องควัน */}
      <rect x="276" y="86" width="44" height="48" rx="2" className="fill-white" />
      <path d="M282 96h32M282 108h32" className="stroke-sky-300" strokeWidth="5" />
      <rect x="290" y="64" width="16" height="22" className="fill-brand-600" />
      <rect x="290" y="70" width="16" height="5" className="fill-accent-400" />
      {/* ลำเรือ */}
      <path d="M52 134h300l-28 42H82z" className="fill-brand-700" />
      <path d="M58 143h288" className="stroke-white" strokeWidth="3" />
      {/* คลื่น */}
      <path d="M0 176q20-10 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0V220H0z" className="fill-sky-600" />
      <path d="M20 198q15-7 30 0M150 205q15-7 30 0M290 196q15-7 30 0" className="stroke-sky-200" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
