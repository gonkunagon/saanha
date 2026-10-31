// ภาพประกอบหน้าแรก: เส้นทางขนส่งจากจีน (หมุดแดง) มาไทย (หมุดเทา) ทางรถและทางเรือ
// ไม่มีตัวหนังสือในภาพ จึงใช้ได้ทั้งสองภาษา

export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 360" fill="none" aria-hidden="true" className={className}>
      <circle cx="240" cy="180" r="160" className="fill-brand-50" />

      {/* เส้นทาง */}
      <path
        d="M120 120 C200 110 230 250 360 250"
        className="stroke-brand-500"
        strokeWidth="3"
        strokeDasharray="8 9"
        strokeLinecap="round"
      />

      {/* เหรียญหยวน */}
      <g transform="translate(196 72)">
        <circle r="17" className="fill-white stroke-brand-500" strokeWidth="2.5" />
        <path
          d="M-6 -8l6 8 6-8M0 0v10M-5 1h10M-5 5h10"
          className="stroke-brand-600"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* หมุดต้นทาง (จีน) */}
      <g transform="translate(120 122)">
        <path d="M0 0C-10-12-18-22-18-32A18 18 0 1 1 18-32C18-22 10-12 0 0Z" className="fill-brand-600" />
        <circle cy="-32" r="7" fill="white" />
      </g>

      {/* หมุดปลายทาง (ไทย) */}
      <g transform="translate(360 252)">
        <path d="M0 0C-10-12-18-22-18-32A18 18 0 1 1 18-32C18-22 10-12 0 0Z" className="fill-gray-700" />
        <circle cy="-32" r="7" fill="white" />
      </g>

      {/* รถบรรทุกบนเส้นทาง */}
      <g transform="translate(194 160)">
        <rect width="34" height="24" rx="3" className="fill-white stroke-brand-500" strokeWidth="2.5" />
        <path d="M34 8h10l8 8v8H34z" className="fill-brand-100 stroke-brand-500" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="10" cy="27" r="4.5" className="fill-gray-700" />
        <circle cx="43" cy="27" r="4.5" className="fill-gray-700" />
      </g>

      {/* เรือขนตู้คอนเทนเนอร์ */}
      <g transform="translate(96 246)">
        <rect x="12" y="2" width="15" height="14" rx="1.5" className="fill-brand-100 stroke-brand-500" strokeWidth="2" />
        <rect x="29" y="2" width="15" height="14" rx="1.5" className="fill-white stroke-brand-500" strokeWidth="2" />
        <rect x="46" y="2" width="15" height="14" rx="1.5" className="fill-brand-100 stroke-brand-500" strokeWidth="2" />
        <path d="M0 18h74l-10 16H10z" className="fill-brand-600" />
      </g>
      <path
        d="M86 290q10-7 20 0t20 0 20 0 20 0 20 0"
        className="stroke-brand-500"
        strokeOpacity="0.45"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* กล่องพัสดุที่ปลายทาง */}
      <g className="fill-white stroke-brand-500" strokeWidth="2.5" strokeLinejoin="round">
        <rect x="390" y="256" width="32" height="30" rx="2" />
        <rect x="424" y="256" width="32" height="30" rx="2" />
        <rect x="407" y="224" width="32" height="30" rx="2" />
      </g>
      <path d="M406 256v10M440 256v10M423 224v10" className="stroke-brand-500" strokeWidth="2.5" strokeLinecap="round" />

      {/* จุดตกแต่ง */}
      <circle cx="78" cy="168" r="4" className="fill-brand-100" />
      <circle cx="402" cy="122" r="6" className="fill-brand-100" />
      <circle cx="300" cy="96" r="3" className="fill-brand-500" fillOpacity="0.4" />
    </svg>
  );
}
