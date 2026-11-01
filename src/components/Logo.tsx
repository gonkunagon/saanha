import { useId } from "react";

// โลโก้ SAANHA: กล่องพัสดุ + แว่นขยาย (วาดใหม่เป็น SVG จาก logo/*.png ให้คมทุกขนาดและเปลี่ยนสีได้)
// ใช้สีตาม text color ของตัวที่ครอบ (currentColor)
export function LogoMark({ className }: { className?: string }) {
  const maskId = useId();
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
      <mask id={maskId}>
        <rect width="48" height="48" fill="white" />
        <circle cx="32" cy="32" r="10.5" fill="black" />
      </mask>
      <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <g mask={`url(#${maskId})`}>
          <path d="M24 4 42 13v20l-18 9-18-9V13z" />
          <path d="M6 13l18 9 18-9M24 22v20M15 8.5l8 4" />
        </g>
        <circle cx="32" cy="32" r="7" />
        <path d="M37 37l5 5" />
      </g>
    </svg>
  );
}

type Props = {
  className?: string;
  markClassName?: string;
  textClassName?: string;
};

export function Logo({ className = "", markClassName = "text-navy-700", textClassName = "text-slate-900" }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={`h-8 w-8 shrink-0 ${markClassName}`} />
      <span className={`text-xl font-extrabold tracking-tight ${textClassName}`}>SAANHA</span>
    </span>
  );
}
