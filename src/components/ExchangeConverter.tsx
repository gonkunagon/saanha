"use client";

import { useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";

export function ExchangeConverter({ t, rate }: { t: Dictionary["exchange"]; rate: number }) {
  const [cny, setCny] = useState("");

  const thb = (Number(cny) || 0) * rate;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label>
        <span className="mb-1 block text-sm">{t.cny}</span>
        <input
          type="number"
          min={0}
          className="input"
          value={cny}
          onChange={(e) => setCny(e.target.value)}
        />
      </label>
      <div>
        <span className="mb-1 block text-sm">{t.thb}</span>
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-lg font-semibold">
          {thb.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
}
