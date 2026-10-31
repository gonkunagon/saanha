"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Shipment } from "@/lib/tracking";
import { site } from "@/config/site";
import { CheckIcon } from "./icons";

type Status = "idle" | "loading" | "notFound" | "tooMany" | "error";

type Props = { locale: Locale; t: Dictionary["track"]; cal: Dictionary["calculator"] };

// วันที่จากชีต เช่น 2026-10-15 หรือ 2026-10-15 14:30 -> แสดงตามภาษา (ไทยใช้ปี พ.ศ.)
function formatDate(value: string, locale: Locale) {
  const hasTime = value.includes(":");
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(hasTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function TrackingForm({ locale, t, cal }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [shipment, setShipment] = useState<Shipment | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setShipment(null);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.status === 404) return setStatus("notFound");
      if (res.status === 429) return setStatus("tooMany");
      if (!res.ok) return setStatus("error");
      setShipment((await res.json()).shipment);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  const errorText = { notFound: t.notFound, tooMany: t.tooMany, error: t.error } as const;
  const doneCount = shipment ? shipment.stages.filter((s) => s.at).length : 0;
  const current = shipment?.stages.findLast((s) => s.at);
  const methodLabel = shipment?.method === "truck" ? cal.truck : shipment?.method === "sea" ? cal.sea : shipment?.method;

  return (
    <div className="space-y-8">
      <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t.trackingNo}</span>
          <input name="trackingNo" required minLength={3} maxLength={40} autoComplete="off" className="input uppercase" />
          <span className="mt-1 block text-xs text-gray-500">{t.trackingNoHint}</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t.phoneLast4}</span>
          <input
            name="phoneLast4"
            required
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            autoComplete="off"
            className="input tracking-widest"
          />
          <span className="mt-1 block text-xs text-gray-500">{t.phoneHint}</span>
        </label>
        <button type="submit" disabled={status === "loading"} className="btn-primary sm:mb-5">
          {status === "loading" ? t.searching : t.submit}
        </button>
      </form>

      {status in errorText && (
        <p className="rounded-lg bg-brand-50 px-4 py-3 text-brand-700">
          {errorText[status as keyof typeof errorText]}
        </p>
      )}

      {shipment && current && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-5 text-white">
            <p className="text-sm text-brand-100">{t.trackingNo}</p>
            <p className="text-2xl font-bold tracking-wide">{shipment.trackingNo}</p>
            <p className="mt-3 inline-block rounded-full bg-accent-400 px-3 py-1 text-sm font-semibold text-brand-800">
              {t.currentStatus}: {t.stages[current.stage]}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-4 border-b border-gray-100 px-6 py-5 text-sm sm:grid-cols-4">
            {[
              [t.method, methodLabel],
              [t.boxes, shipment.boxes],
              [t.weight, shipment.weightKg],
              [t.cbm, shipment.cbm],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-gray-500">{label}</dt>
                <dd className="mt-0.5 font-semibold">{value || "-"}</dd>
              </div>
            ))}
          </dl>

          <ol className="px-6 py-6">
            {shipment.stages.map((s, i) => {
              const done = Boolean(s.at);
              const isCurrent = s.stage === current.stage;
              const isLast = i === shipment.stages.length - 1;
              return (
                <li key={s.stage} className="relative flex gap-4 pb-6 last:pb-0">
                  {!isLast && (
                    <span
                      className={`absolute top-8 left-[15px] h-[calc(100%-2rem)] w-0.5 ${i < doneCount - 1 ? "bg-brand-500" : "bg-gray-200"}`}
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      done ? "bg-brand-600 text-white" : "border-2 border-gray-200 bg-white text-gray-300"
                    } ${isCurrent ? "ring-4 ring-brand-100" : ""}`}
                  >
                    {done ? <CheckIcon className="h-4 w-4" /> : <span className="text-xs font-semibold">{i + 1}</span>}
                  </span>
                  <div className="pt-1">
                    <p className={`font-medium ${done ? "text-gray-900" : "text-gray-400"} ${isCurrent ? "text-brand-700" : ""}`}>
                      {t.stages[s.stage]}
                    </p>
                    <p className="text-sm text-gray-500">{s.at ? formatDate(s.at, locale) : t.waiting}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          {(shipment.domesticTracking || shipment.note) && (
            <dl className="space-y-3 border-t border-gray-100 px-6 py-5 text-sm">
              {shipment.domesticTracking && (
                <div>
                  <dt className="text-gray-500">{t.domestic}</dt>
                  <dd className="font-semibold">{shipment.domesticTracking}</dd>
                </div>
              )}
              {shipment.note && (
                <div>
                  <dt className="text-gray-500">{t.note}</dt>
                  <dd>{shipment.note}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}

      <p className="text-center text-sm text-gray-600">
        <a href={site.lineUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
          {t.help}
        </a>
      </p>
    </div>
  );
}
