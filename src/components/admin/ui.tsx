// ชิ้นส่วน UI ที่ใช้ซ้ำในหลังบ้าน
import { stageIndex, stageLabelsTh, type ItemStage } from "@/lib/stages";
import { balanceOf, formatMoney, type CurrencyCode } from "@/lib/money";

// ยอดค้างชำระ: แดง = ยังค้าง · เขียว = ชำระครบ · เหลือง = มัดจำเกินยอด
export function BalanceText({ total, deposit, currency }: { total: number | null; deposit: number | null; currency: CurrencyCode }) {
  const balance = balanceOf(total, deposit);
  if (balance == null) return <span className="text-gray-400">-</span>;
  if (balance === 0) return <span className="font-medium text-emerald-700">ชำระครบ</span>;
  if (balance < 0) return <span className="font-medium text-amber-700">มัดจำเกิน {formatMoney(-balance, currency)}</span>;
  return <span className="font-semibold text-brand-700">ค้างชำระ {formatMoney(balance, currency)}</span>;
}

const stageColors = [
  "bg-gray-100 text-gray-700", // ordered
  "bg-pink-100 text-pink-800", // in_production
  "bg-amber-100 text-amber-800", // china_warehouse
  "bg-sky-100 text-sky-800", // loaded
  "bg-sky-100 text-sky-800", // departed
  "bg-indigo-100 text-indigo-800", // customs
  "bg-violet-100 text-violet-800", // thai_warehouse
  "bg-orange-100 text-orange-800", // out_for_delivery
  "bg-emerald-100 text-emerald-800", // delivered
];

export function StageBadge({ stage, suffix }: { stage: ItemStage; suffix?: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${stageColors[stageIndex(stage)]}`}>
      {stageLabelsTh[stage]}
      {suffix}
    </span>
  );
}

export function Card({ title, children, actions }: { title?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm text-gray-600">{label}</span>
      {children}
    </label>
  );
}

export const methodLabel = (m: string) => (m === "truck" ? "ทางรถ" : m === "sea" ? "ทางเรือ" : m);

export function MethodSelect({ name = "method", defaultValue }: { name?: string; defaultValue?: string }) {
  return (
    <select name={name} defaultValue={defaultValue ?? "truck"} className="input">
      <option value="truck">ทางรถ</option>
      <option value="sea">ทางเรือ</option>
    </select>
  );
}
