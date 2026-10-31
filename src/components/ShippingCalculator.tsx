"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import {
  productTypes,
  shippingRates,
  transitDays,
  type ProductType,
  type ShippingMethod,
} from "@/config/rates";

const fmt = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 2 });

export function ShippingCalculator({ t }: { t: Dictionary["calculator"] }) {
  const [productType, setProductType] = useState<ProductType>("general");
  const [method, setMethod] = useState<ShippingMethod>("truck");
  const [weight, setWeight] = useState(0);
  const [w, setW] = useState(0);
  const [l, setL] = useState(0);
  const [h, setH] = useState(0);
  const [boxes, setBoxes] = useState(1);

  const rate = shippingRates[productType][method];
  const cbm = (w * l * h * boxes) / 1_000_000;
  const byWeight = weight * rate.perKg;
  const byVolume = cbm * rate.perCbm;
  const total = Math.max(byWeight, byVolume);

  const num = (set: (n: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(Math.max(0, Number(e.target.value) || 0));

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block font-medium">{t.productType}</span>
          <select
            className="input"
            value={productType}
            onChange={(e) => setProductType(e.target.value as ProductType)}
          >
            {productTypes.map((p) => (
              <option key={p} value={p}>{t.types[p]}</option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="mb-2 font-medium">{t.method}</legend>
          <div className="flex gap-2">
            {(["truck", "sea"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={method === m ? "btn-primary" : "btn-secondary"}
              >
                {t[m]}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="mb-1 block text-sm">{t.weight}</span>
          <input type="number" min={0} className="input" onChange={num(setWeight)} />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label>
            <span className="mb-1 block text-sm">{t.width}</span>
            <input type="number" min={0} className="input" onChange={num(setW)} />
          </label>
          <label>
            <span className="mb-1 block text-sm">{t.length}</span>
            <input type="number" min={0} className="input" onChange={num(setL)} />
          </label>
          <label>
            <span className="mb-1 block text-sm">{t.height}</span>
            <input type="number" min={0} className="input" onChange={num(setH)} />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm">{t.boxes}</span>
          <input type="number" min={1} defaultValue={1} className="input" onChange={num(setBoxes)} />
        </label>
      </div>

      <div className="rounded-xl bg-brand-50 p-6">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt>{t.cbm}</dt><dd>{cbm.toFixed(3)}</dd></div>
          <div className="flex justify-between"><dt>{t.byWeight}</dt><dd>{fmt(byWeight)} {t.baht}</dd></div>
          <div className="flex justify-between"><dt>{t.byVolume}</dt><dd>{fmt(byVolume)} {t.baht}</dd></div>
        </dl>
        <p className="mt-6 text-sm text-gray-600">{t.total}</p>
        <p className="text-3xl font-bold text-brand-700">{fmt(total)} {t.baht}</p>
        <p className="mt-4 text-sm text-gray-600">{t.days}: {transitDays[method]} {t.daysUnit}</p>
      </div>
    </div>
  );
}
