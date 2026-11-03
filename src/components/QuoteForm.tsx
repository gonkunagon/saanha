"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { productTypes } from "@/config/rates";

type Status = "idle" | "sending" | "success" | "error";

type Props = { locale: Locale; t: Dictionary["quote"]; cal: Dictionary["calculator"] };

export function QuoteForm({ locale, t, cal }: Props) {
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    // method="post": ถ้ากดก่อน JS โหลดเสร็จ ข้อมูลส่วนตัวจะไม่ไปโผล่ใน URL
    <form onSubmit={onSubmit} method="post" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm">{t.name} *</span>
          <input name="name" required className="input" />
        </label>
        <label>
          <span className="mb-1 block text-sm">{t.phone} *</span>
          <input name="phone" type="tel" required className="input" />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm">{t.lineId}</span>
        <input name="lineId" className="input" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm">{t.product} *</span>
        <textarea name="product" required rows={4} className="input" />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label>
          <span className="mb-1 block text-sm">{t.quantity}</span>
          <input name="quantity" className="input" />
        </label>
        <label>
          <span className="mb-1 block text-sm">{cal.productType}</span>
          <select name="productType" className="input" defaultValue="unsure">
            <option value="unsure">{t.notSure}</option>
            {productTypes.map((p) => (
              <option key={p} value={p}>{cal.types[p]}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-sm">{t.method}</span>
          <select name="method" className="input" defaultValue="unsure">
            <option value="unsure">{t.notSure}</option>
            <option value="truck">{cal.truck}</option>
            <option value="sea">{cal.sea}</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm">{t.message}</span>
        <textarea name="message" rows={3} className="input" />
      </label>
      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input name="consent" type="checkbox" required className="mt-1 h-4 w-4 accent-brand-600" />
        <span>
          {t.consent}{" "}
          <Link href={`/${locale}/privacy`} target="_blank" className="text-brand-600 underline">
            {t.consentLink}
          </Link>
        </span>
      </label>
      <button type="submit" disabled={status === "sending"} className="btn-cta w-full sm:w-auto">
        {status === "sending" ? t.sending : t.submit}
      </button>
      {status === "success" && <p className="text-green-700">{t.success}</p>}
      {status === "error" && <p className="text-brand-600">{t.error}</p>}
    </form>
  );
}
